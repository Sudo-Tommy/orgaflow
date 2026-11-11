import { getValidAccessToken } from './googleOAuthService.js';
import { markSelfUpdate, isRecentSelfUpdate } from './googleCalendarSyncService.js';

function matchClientFromText(summary, clients) {
    if (!summary || !clients?.length) return { client: null, cleanTitle: summary || 'Termin' };
    const norm = summary.toLowerCase().trim();

    for (const c of clients) {
        const first = (c.name_first || '').trim();
        const last = (c.name_last || '').trim();
        if (!first && !last) continue;

        const full1 = `${first} ${last}`.trim().toLowerCase();
        const full2 = `${last} ${first}`.trim().toLowerCase();
        const full3 = `${last}, ${first}`.trim().toLowerCase();

        if ((full1 && norm.includes(full1)) || (full2 && norm.includes(full2)) || (full3 && norm.includes(full3))) {
            let cleanTitle = summary;
            if (summary.includes(':')) {
                const afterColon = summary.split(':').slice(1).join(':').trim();
                if (afterColon) cleanTitle = afterColon;
            }
            return { client: c, cleanTitle: cleanTitle || summary };
        }
    }

    return { client: null, cleanTitle: summary };
}

function buildClientAddress(client) {
    if (!client) return '';
    const streetPart = `${client.street || ''} ${client.housenr || ''}`.trim();
    const cityPart = `${client.zip || ''} ${client.city || ''}`.trim();
    return [streetPart, cityPart].filter(Boolean).join(', ');
}

function parseGoogleEventTimes(item) {
    const isAllDay = Boolean(item.start?.date && !item.start?.dateTime);
    let startStr = item.start?.dateTime;
    let endStr = item.end?.dateTime;
    let isMultiday = false;

    if (isAllDay) {
        startStr = `${item.start.date}T08:00:00.000Z`;
        const sDate = new Date(item.start.date);
        const eDate = item.end?.date ? new Date(item.end.date) : new Date(sDate.getTime() + 86400000);
        const diffDays = Math.round((eDate.getTime() - sDate.getTime()) / 86400000);
        if (diffDays > 1) {
            isMultiday = true;
            const inclusiveEnd = new Date(eDate.getTime() - 86400000);
            endStr = `${inclusiveEnd.toISOString().split('T')[0]}T18:00:00.000Z`;
        } else {
            endStr = `${item.start.date}T18:00:00.000Z`;
        }
    } else {
        startStr = startStr ? new Date(startStr).toISOString() : new Date().toISOString();
        endStr = endStr ? new Date(endStr).toISOString() : new Date(new Date(startStr).getTime() + 3600000).toISOString();
        if (new Date(startStr).toDateString() !== new Date(endStr).toDateString()) {
            isMultiday = true;
        }
    }
    return { startStr, endStr, isMultiday };
}

export async function importGoogleEventsToPocketBase(userId, pbAdmin, timeMin, timeMax) {
    if (!userId || !pbAdmin) return { imported: 0, updated: 0 };

    const startIso = timeMin || new Date(Date.now() - 30 * 86400000).toISOString();
    const endIso = timeMax || new Date(Date.now() + 90 * 86400000).toISOString();

    let targetUserIds = [];
    if (userId === 'all') {
        const configs = await pbAdmin.collection('user_calendar_configs').getFullList({
            filter: 'refresh_token != "" || access_token != ""',
            requestKey: null
        }).catch(() => []);
        targetUserIds = configs.map(c => c.user).filter(Boolean);
    } else {
        targetUserIds = [userId];
    }
    if (targetUserIds.length === 0) return { imported: 0, updated: 0 };

    const [clients, existingApps] = await Promise.all([
        pbAdmin.collection('clients').getFullList({ requestKey: null }).catch(() => []),
        pbAdmin.collection('appointments').getFullList({
            filter: 'google_event_id != ""',
            expand: 'time_record',
            requestKey: null
        }).catch(() => [])
    ]);

    const byGoogleId = new Map();
    const byAppId = new Map();
    for (const app of existingApps) {
        if (app.google_event_id) byGoogleId.set(app.google_event_id, app);
        byAppId.set(app.id, app);
    }

    let importedCount = 0;
    let updatedCount = 0;

    for (const uId of targetUserIds) {
        const tokenObj = await getValidAccessToken(uId, pbAdmin);
        if (!tokenObj) continue;

        const { accessToken, config } = tokenObj;
        const calendarId = config.calendar_id || 'primary';
        const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?timeMin=${encodeURIComponent(startIso)}&timeMax=${encodeURIComponent(endIso)}&singleEvents=true&orderBy=startTime&maxResults=500`;

        try {
            const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
            if (!res.ok) continue;

            const data = await res.json();
            const items = data.items || [];

            for (const item of items) {
                if (!item.id || item.status === 'cancelled') continue;

                const linkedOrgaId = item.extendedProperties?.private?.orgaflow_appointment_id;
                const existing = byGoogleId.get(item.id) || (linkedOrgaId ? byAppId.get(linkedOrgaId) : null);
                const { startStr, endStr, isMultiday } = parseGoogleEventTimes(item);

                if (existing) {
                    if (isRecentSelfUpdate(existing.id) || existing.settled || existing.status === 'beendet') continue;

                    const oldStart = existing.appointment ? new Date(existing.appointment).getTime() : 0;
                    const newStart = new Date(startStr).getTime();
                    const oldEnd = existing.appointment_end ? new Date(existing.appointment_end).getTime() : 0;
                    const newEnd = new Date(endStr).getTime();

                    if (Math.abs(oldStart - newStart) > 60000 || (oldEnd && Math.abs(oldEnd - newEnd) > 60000)) {
                        markSelfUpdate(existing.id);
                        await pbAdmin.collection('appointments').update(existing.id, {
                            appointment: startStr,
                            appointment_end: endStr,
                            is_multiday: isMultiday
                        }, { requestKey: null }).catch(() => {});

                        const trs = existing.expand?.time_record || [];
                        const firstTr = Array.isArray(trs) ? trs[0] : trs;
                        if (firstTr?.id) {
                            await pbAdmin.collection('time_records').update(firstTr.id, {
                                start: startStr,
                                end: endStr
                            }, { requestKey: null }).catch(() => {});
                        }
                        updatedCount++;
                    }
                    continue;
                }

                // Falls Event ursprünglich aus OrgaFlow stammte, dort aber gelöscht wurde: nicht erneut anlegen
                if (item.id.startsWith('orga') || linkedOrgaId || item.description?.includes('In Seniorenassistenz OrgaFlow öffnen:')) {
                    continue;
                }

                const rawSummary = (item.summary || 'Termin (Google Kalender)').trim();
                const { client: matchedClient, cleanTitle } = matchClientFromText(rawSummary, clients);
                const clientAddress = buildClientAddress(matchedClient);
                const resolvedAddress = clientAddress || (item.location || '').trim();

                let trId = null;
                try {
                    const tr = await pbAdmin.collection('time_records').create({
                        start: startStr,
                        end: endStr
                    }, { requestKey: null });
                    trId = tr.id;
                } catch {}

                try {
                    const created = await pbAdmin.collection('appointments').create({
                        appointment: startStr,
                        appointment_end: endStr,
                        description: cleanTitle,
                        notes: (item.description || '').trim(),
                        location_address: resolvedAddress,
                        user: uId,
                        assigned_to: uId,
                        client: matchedClient ? [matchedClient.id] : [],
                        time_record: trId ? [trId] : [],
                        status: 'geplant',
                        is_private: false,
                        is_visible: false,
                        is_multiday: isMultiday,
                        google_event_id: item.id,
                        google_event_link: item.htmlLink || ''
                    }, { requestKey: null });

                    markSelfUpdate(created.id);
                    byGoogleId.set(item.id, created);
                    importedCount++;
                } catch (createErr) {
                    console.warn('[Google Import] Fehler beim Anlegen des Termins:', createErr.message);
                }
            }
        } catch (err) {
            console.error(`[Google Import] Fehler für User ${uId}:`, err.message);
        }
    }

    return { imported: importedCount, updated: updatedCount };
}

