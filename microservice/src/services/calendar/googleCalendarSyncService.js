import { getValidAccessToken, fetchWithRetry } from './googleOAuthService.js';
import { importGoogleEventsToPocketBase } from './googleCalendarImportService.js';

const inFlightSyncs = new Set();
const recentlyUpdatedRecords = new Map();

export function markSelfUpdate(recordId) {
    if (!recordId) return;
    recentlyUpdatedRecords.set(recordId, Date.now());
    if (recentlyUpdatedRecords.size > 2000) recentlyUpdatedRecords.clear();
}

export function isRecentSelfUpdate(recordId) {
    if (!recordId) return false;
    const timestamp = recentlyUpdatedRecords.get(recordId);
    return Boolean(timestamp && (Date.now() - timestamp) < 10000);
}

export async function syncAppointmentToGoogle(appointmentId, userId, pbAdmin) {
    if (!appointmentId || !pbAdmin || isRecentSelfUpdate(appointmentId) || inFlightSyncs.has(appointmentId)) return null;
    inFlightSyncs.add(appointmentId);
    markSelfUpdate(appointmentId);
    try {
        const res = await _executeSyncAppointment(appointmentId, userId, pbAdmin);
        markSelfUpdate(appointmentId);
        return res;
    } finally {
        inFlightSyncs.delete(appointmentId);
    }
}

function parseToValidIso(dateVal) {
    if (!dateVal) return null;
    const str = typeof dateVal === 'string' ? dateVal.trim().replace(' ', 'T') : dateVal;
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d.toISOString();
}

async function _executeSyncAppointment(appointmentId, userId, pbAdmin) {
    const appointment = await pbAdmin.collection('appointments').getOne(appointmentId, {
        expand: 'user,client,time_record', requestKey: null
    }).catch(() => null);
    if (!appointment) return null;

    const targetUserId = userId || appointment.assigned_to || (Array.isArray(appointment.user) ? appointment.user[0] : appointment.user);
    if (!targetUserId) return null;

    const tokenObj = await getValidAccessToken(targetUserId, pbAdmin);
    if (!tokenObj) return null;

    const { accessToken, config } = tokenObj;
    const calendarId = config.calendar_id || 'primary';

    const clients = appointment.expand?.client || [];
    let clientName = '';
    let clientPhone = '';
    if (clients.length > 0) {
        const c = Array.isArray(clients) ? clients[0] : clients;
        clientName = `${c.name_first || ''} ${c.name_last || ''}`.trim();
        clientPhone = c.phone || c.handy || '';
    }

    const isBlocked = appointment.description?.includes('[BLOCK]') || appointment.is_blocked;
    const summary = isBlocked
        ? `[Abwesend] ${appointment.description.replace('[BLOCK]', '').trim() || 'Urlaub / Abwesend'}`
        : (clientName ? `${clientName}: ${appointment.description || 'Einsatz'}` : (appointment.description || 'Termin'));

    let startTimeISO = parseToValidIso(appointment.appointment);
    let endTimeISO = parseToValidIso(appointment.appointment_end);
    const timeRecords = appointment.expand?.time_record || [];
    if (timeRecords.length > 0) {
        const tr = Array.isArray(timeRecords) ? timeRecords[0] : timeRecords;
        if (tr.start) startTimeISO = parseToValidIso(tr.start) || startTimeISO;
        if (tr.end) endTimeISO = parseToValidIso(tr.end) || endTimeISO;
    }
    if (!startTimeISO) return null;

    const startMs = new Date(startTimeISO).getTime();
    const endMs = endTimeISO ? new Date(endTimeISO).getTime() : 0;
    if (!endMs || endMs <= startMs) {
        endTimeISO = new Date(startMs + 60 * 60 * 1000).toISOString();
    }

    const appUrl = process.env.APP_URL || 'https://www.ihre-seniorenassistenz.com';
    const descriptionLines = [
        clientName ? `👤 Klient: ${clientName}` : '',
        clientPhone ? `📞 Telefon: ${clientPhone}` : '',
        appointment.location_address ? `📍 Ort: ${appointment.location_address}` : '',
        appointment.notes ? `📝 Notizen:\n${appointment.notes}` : '',
        '',
        `🔗 In Seniorenassistenz OrgaFlow öffnen: ${appUrl}/appointments?id=${appointment.id}`
    ].filter(Boolean).join('\n');

    let startObj = { dateTime: startTimeISO, timeZone: 'Europe/Berlin' };
    let endObj = { dateTime: endTimeISO, timeZone: 'Europe/Berlin' };

    if (appointment.is_multiday) {
        const sDate = startTimeISO.split('T')[0];
        const eDateObj = new Date(endTimeISO);
        eDateObj.setDate(eDateObj.getDate() + 1);
        startObj = { date: sDate };
        endObj = { date: eDateObj.toISOString().split('T')[0] };
    }

    const eventPayload = {
        summary,
        description: descriptionLines,
        location: appointment.location_address || '',
        start: startObj,
        end: endObj,
        status: 'confirmed',
        transparency: 'opaque',
        extendedProperties: { private: { orgaflow_appointment_id: appointment.id } }
    };
    if (appointment.recurrence_rule) eventPayload.recurrence = [appointment.recurrence_rule];

    try {
        const deterministicGoogleId = 'orga' + Buffer.from(appointment.id).toString('hex');
        const targetGoogleId = appointment.google_event_id || deterministicGoogleId;
        const baseCalUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;
        const headers = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };

        let googleEvent = null;
        const updateRes = await fetchWithRetry(`${baseCalUrl}/${encodeURIComponent(targetGoogleId)}`, {
            method: 'PATCH', headers, body: JSON.stringify(eventPayload)
        });

        if (updateRes.ok) {
            googleEvent = await updateRes.json();
        } else if (updateRes.status === 404 || updateRes.status === 410) {
            const createRes = await fetchWithRetry(baseCalUrl, {
                method: 'POST', headers, body: JSON.stringify({ ...eventPayload, id: deterministicGoogleId })
            });
            if (createRes.ok) {
                googleEvent = await createRes.json();
            } else if (createRes.status === 409) {
                const retryPatch = await fetchWithRetry(`${baseCalUrl}/${encodeURIComponent(deterministicGoogleId)}`, {
                    method: 'PATCH', headers, body: JSON.stringify(eventPayload)
                });
                if (retryPatch.ok) googleEvent = await retryPatch.json();
            }
        }

        if (googleEvent) {
            markSelfUpdate(appointment.id);
            await pbAdmin.collection('appointments').update(appointment.id, {
                google_event_id: googleEvent.id,
                google_event_link: googleEvent.htmlLink || ''
            }, { requestKey: null });
            return googleEvent;
        }
    } catch (err) {
        console.error('[Google Calendar] Ausnahme bei Event-Sync:', err);
    }
    return null;
}

export async function deleteAppointmentFromGoogle(googleEventId, userId, pbAdmin) {
    if (!googleEventId || !userId || !pbAdmin) return;
    const tokenObj = await getValidAccessToken(userId, pbAdmin);
    if (!tokenObj) return;
    const calendarId = tokenObj.config.calendar_id || 'primary';
    await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(googleEventId)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${tokenObj.accessToken}` }
    }).catch(() => {});
}

export async function syncAllUpcomingAppointments(userId, pbAdmin) {
    if (!userId || !pbAdmin) return { synced: 0, total: 0, imported: 0 };
    const tokenObj = await getValidAccessToken(userId, pbAdmin);
    if (!tokenObj) return { synced: 0, total: 0, imported: 0 };

    // 1. Zuerst externe Termine aus Google Kalender nach PocketBase importieren/aktualisieren
    const importStats = await importGoogleEventsToPocketBase(userId, pbAdmin).catch(() => ({ imported: 0, updated: 0 }));

    // 2. Anschließend OrgaFlow-Termine zu Google synchronisieren
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayIso = today.toISOString();

    const appointments = await pbAdmin.collection('appointments').getFullList({
        filter: `(user ~ "${userId}" || assigned_to = "${userId}") && (appointment >= "${todayIso}" || recurrence_rule != "" || is_multiday = true)`,
        sort: 'appointment',
        expand: 'user,client,time_record',
        requestKey: null
    }).catch(() => []);

    let syncedCount = 0;
    for (const app of appointments) {
        try {
            const res = await syncAppointmentToGoogle(app.id, userId, pbAdmin);
            if (res) syncedCount++;
        } catch {}
        await new Promise(r => setTimeout(r, 300));
    }

    if (tokenObj.config?.id) {
        await pbAdmin.collection('user_calendar_configs').update(tokenObj.config.id, {
            last_sync: new Date().toISOString()
        }, { requestKey: null }).catch(() => {});
    }
    return {
        synced: syncedCount + (importStats.imported || 0),
        total: appointments.length,
        imported: importStats.imported || 0
    };
}
