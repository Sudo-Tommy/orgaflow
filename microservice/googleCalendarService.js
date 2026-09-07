import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import MailComposer from 'nodemailer/lib/mail-composer/index.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../.env') });

/**
 * Google Calendar & Gmail Integration Service for OrgaFlow
 * Handles OAuth 2.0 flow, token refresh, bi-directional live sync
 * with Google Calendar REST API v3, and email sending via Gmail API v1.
 */

const DEFAULT_SCOPES = [
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/gmail.send'
].join(' ');

// --- GLOBALER RATE-LIMITER & QUEUE FÜR GOOGLE APIS ---
// Google Calendar & Gmail erlauben maximal 5 Anfragen/Sekunde pro Nutzer.
// Um Rate-Limits ("rateLimitExceeded" / "userRateLimitExceeded" / 403 / 429) proaktiv und
// 100% zuverlässig zu verhindern, wird JEDE Google API-Anfrage über diese serielle Queue abgewickelt.
// Ein Mindestabstand von 500ms garantiert maximal 2 Anfragen pro Sekunde (deutlich unter Googles Limit).
let lastGoogleApiCallTime = 0;
const MIN_API_GAP_MS = 500;
let googleApiQueue = Promise.resolve();

export function scheduleGoogleApiCall(fn) {
    const scheduled = googleApiQueue.then(async () => {
        const now = Date.now();
        const timeSinceLast = now - lastGoogleApiCallTime;
        if (timeSinceLast < MIN_API_GAP_MS) {
            await new Promise(r => setTimeout(r, MIN_API_GAP_MS - timeSinceLast));
        }
        lastGoogleApiCallTime = Date.now();
        return await fn();
    });

    // Queue intakt halten, auch wenn ein API-Aufruf fehlschlägt
    googleApiQueue = scheduled.catch(() => {});
    return scheduled;
}

/**
 * Hilfsfunktion fuer Anfragen mit seriellem Rate-Limiter und automatischem Backoff
 */
export async function fetchWithRetry(url, options, maxRetries = 3) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        const res = await scheduleGoogleApiCall(() => fetch(url, options));
        if (res.status === 403 || res.status === 429) {
            const clone = res.clone();
            const errData = await clone.json().catch(() => ({}));
            const isRateLimit = 
                errData?.error?.errors?.some(e => e.reason === 'rateLimitExceeded' || e.reason === 'userRateLimitExceeded') ||
                errData?.error?.message?.includes('Rate Limit') ||
                errData?.error?.message?.includes('Quota exceeded') ||
                res.status === 429;

            if (isRateLimit && attempt < maxRetries) {
                const waitMs = (attempt + 1) * 2000;
                await new Promise(r => setTimeout(r, waitMs));
                continue;
            }
        }
        return res;
    }
    return scheduleGoogleApiCall(() => fetch(url, options));
}

/**
 * Ermittelt die aktiven Google API Credentials (Env oder DB-Fallback)
 */
export async function getGoogleCredentials(userId, pbAdmin) {
    let clientId = process.env.GOOGLE_CLIENT_ID || '';
    let clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
    let redirectUri = process.env.GOOGLE_REDIRECT_URI || '';

    // Falls benutzerdefinierte Credentials in user_calendar_configs hinterlegt sind
    if (userId && pbAdmin) {
        try {
            const config = await pbAdmin.collection('user_calendar_configs').getFirstListItem(`user = "${userId}"`);
            if (config.client_id) clientId = config.client_id;
            if (config.client_secret) clientSecret = config.client_secret;
        } catch (e) {}
    }

    // Standard Redirect URI ermitteln:
    // Priorität: GOOGLE_REDIRECT_URI > APP_BASE_URL > localhost-Fallback
    if (!redirectUri) {
        const baseUrl = (process.env.APP_BASE_URL || `http://localhost:${process.env.PORT || 3000}`).replace(/\/$/, '');
        redirectUri = `${baseUrl}/api/google-calendar/callback`;
    }

    return { clientId, clientSecret, redirectUri };
}

/**
 * Erstellt die OAuth2-Authentifizierungs-URL für Google
 */
export async function generateAuthUrl(userId, redirectUrlOverride, pbAdmin) {
    const creds = await getGoogleCredentials(userId, pbAdmin);
    if (!creds.clientId) {
        throw new Error('Google Client-ID ist nicht konfiguriert. Bitte in den Einstellungen oder in der .env hinterlegen.');
    }

    const redirectUri = redirectUrlOverride || creds.redirectUri;
    const statePayload = Buffer.from(JSON.stringify({ userId, timestamp: Date.now() })).toString('base64url');

    const params = new URLSearchParams({
        client_id: creds.clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: DEFAULT_SCOPES,
        access_type: 'offline',
        prompt: 'consent', // Erzwingt Refresh-Token
        state: statePayload
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Verarbeitet den OAuth2-Callback von Google und speichert die Tokens
 */
export async function handleOAuthCallback(code, state, pbAdmin) {
    let stateData = {};
    try {
        stateData = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
    } catch (e) {
        throw new Error('Ungültiger OAuth-State-Parameter.');
    }

    const { userId } = stateData;
    if (!userId) throw new Error('Benutzer-ID fehlt im OAuth-Status.');

    const creds = await getGoogleCredentials(userId, pbAdmin);
    if (!creds.clientId || !creds.clientSecret) {
        throw new Error('Google OAuth Credentials fehlen.');
    }

    // 1. Code gegen Tokens eintauschen
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            code,
            client_id: creds.clientId,
            client_secret: creds.clientSecret,
            redirect_uri: creds.redirectUri,
            grant_type: 'authorization_code'
        })
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || tokenData.error) {
        console.error('[Google OAuth] Token Exchange Error:', tokenData);
        throw new Error(tokenData.error_description || tokenData.error || 'Token-Austausch mit Google fehlgeschlagen.');
    }

    // 2. Google-E-Mail über Userinfo API abrufen
    let googleEmail = '';
    try {
        const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` }
        });
        if (userRes.ok) {
            const userData = await userRes.json();
            googleEmail = userData.email || '';
        }
    } catch (e) {
        console.warn('[Google OAuth] Konnte Google-E-Mail nicht abrufen:', e.message);
    }

    // 3. Konfiguration in PocketBase speichern
    const expiryDate = Date.now() + (tokenData.expires_in * 1000);
    let existingConfig = null;
    try {
        existingConfig = await pbAdmin.collection('user_calendar_configs').getFirstListItem(`user = "${userId}"`);
    } catch (e) {}

    const payload = {
        user: userId,
        google_email: googleEmail || (existingConfig ? existingConfig.google_email : ''),
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || (existingConfig ? existingConfig.refresh_token : ''),
        expiry_date: expiryDate,
        calendar_id: 'primary',
        sync_enabled: true,
        last_sync: new Date().toISOString()
    };

    if (existingConfig) {
        await pbAdmin.collection('user_calendar_configs').update(existingConfig.id, payload);
    } else {
        await pbAdmin.collection('user_calendar_configs').create(payload);
    }

    console.log(`[Google Calendar] Erfolgreich verknüpft für User ${userId} (${googleEmail})`);

    // 4. Initiale Synchronisation zukünftiger Termine starten (im Hintergrund)
    syncAllUpcomingAppointments(userId, pbAdmin).catch(err => {
        console.error('[Google Calendar] Fehler bei initialem Sync:', err);
    });

    return { success: true, googleEmail };
}

/**
 * Gibt ein valides Access-Token zurück (inkl. automatischer Aktualisierung via Refresh-Token)
 */
export async function getValidAccessToken(userId, pbAdmin) {
    if (!userId || !pbAdmin) return null;

    let config = null;
    try {
        config = await pbAdmin.collection('user_calendar_configs').getFirstListItem(`user = "${userId}"`);
    } catch (e) {
        return null;
    }

    if (!config || !config.sync_enabled || !config.refresh_token) {
        return null;
    }

    // Prüfen, ob Access-Token noch mindestens 4 Minuten gültig ist
    const now = Date.now();
    const expiry = Number(config.expiry_date) || 0;
    if (config.access_token && expiry > (now + 4 * 60 * 1000)) {
        return { accessToken: config.access_token, config };
    }

    // Token ist abgelaufen oder läuft bald ab -> Via Refresh Token erneuern
    console.log(`[Google Calendar] Erneuere abgelaufenes Access-Token für User ${userId}...`);
    const creds = await getGoogleCredentials(userId, pbAdmin);

    try {
        const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: creds.clientId,
                client_secret: creds.clientSecret,
                refresh_token: config.refresh_token,
                grant_type: 'refresh_token'
            })
        });

        const refreshData = await refreshRes.json();
        if (!refreshRes.ok || refreshData.error) {
            console.error('[Google Calendar] Token Refresh Error:', refreshData);
            return null;
        }

        const newExpiry = Date.now() + (refreshData.expires_in * 1000);
        const updatePayload = {
            access_token: refreshData.access_token,
            expiry_date: newExpiry
        };
        if (refreshData.refresh_token) {
            updatePayload.refresh_token = refreshData.refresh_token;
        }

        await pbAdmin.collection('user_calendar_configs').update(config.id, updatePayload);
        config.access_token = refreshData.access_token;
        config.expiry_date = newExpiry;

        return { accessToken: refreshData.access_token, config };
    } catch (err) {
        console.error('[Google Calendar] Ausnahme beim Token-Refresh:', err);
        return null;
    }
}

// Globaler Mutex gegen gleichzeitige Doppel-Synchronisation desselben Termins
const inFlightSyncs = new Set();

// Echo-Schutz: Verhindert, dass das eigene PocketBase-Update (Speichern der google_event_id)
// sofort wieder einen redundanten Realtime-Sync-Lauf auslöst
const recentlyUpdatedRecords = new Map();

export function isRecentSelfUpdate(recordId) {
    if (!recordId) return false;
    const timestamp = recentlyUpdatedRecords.get(recordId);
    if (timestamp && (Date.now() - timestamp) < 10000) {
        return true;
    }
    return false;
}

/**
 * Erstellt oder aktualisiert einen Termin im Google Kalender
 */
export async function syncAppointmentToGoogle(appointmentId, userId, pbAdmin) {
    if (!appointmentId || !pbAdmin) return null;

    if (isRecentSelfUpdate(appointmentId)) {
        return null;
    }

    if (inFlightSyncs.has(appointmentId)) {
        return null;
    }
    inFlightSyncs.add(appointmentId);
    recentlyUpdatedRecords.set(appointmentId, Date.now());

    try {
        const res = await _executeSyncAppointment(appointmentId, userId, pbAdmin);
        recentlyUpdatedRecords.set(appointmentId, Date.now());
        return res;
    } finally {
        inFlightSyncs.delete(appointmentId);
    }
}

async function _executeSyncAppointment(appointmentId, userId, pbAdmin) {
    let appointment = null;
    try {
        appointment = await pbAdmin.collection('appointments').getOne(appointmentId, {
            expand: 'user,client,time_record'
        });
    } catch (e) {
        console.warn(`[Google Calendar] Termin ${appointmentId} nicht gefunden.`);
        return null;
    }

    // Ziel-Nutzer ermitteln
    const targetUserId = userId || appointment.user || (appointment.expand?.user?.id);
    if (!targetUserId) return null;

    const tokenObj = await getValidAccessToken(targetUserId, pbAdmin);
    if (!tokenObj) return null; // Google-Sync für diesen Nutzer nicht aktiv

    const { accessToken, config } = tokenObj;
    const calendarId = config.calendar_id || 'primary';

    // Event-Details vorbereiten
    const clients = appointment.expand?.client || [];
    let clientName = '';
    let clientPhone = '';
    if (clients.length > 0) {
        const c = Array.isArray(clients) ? clients[0] : clients;
        clientName = `${c.name_first || ''} ${c.name_last || ''}`.trim();
        clientPhone = c.phone || c.handy || '';
    }

    const isBlocked = appointment.description?.includes('[BLOCK]') || appointment.is_blocked;
    let summary = '';
    if (isBlocked) {
        summary = `[Abwesend] ${appointment.description.replace('[BLOCK]', '').trim() || 'Urlaub / Abwesend'}`;
    } else if (clientName) {
        summary = `${clientName}: ${appointment.description || 'Einsatz'}`;
    } else {
        summary = appointment.description || 'Termin';
    }

    // Hilfsfunktion: Konvertiert Datumsangaben (auch aus PocketBase mit Leerzeichen) sicher in RFC3339-ISO
    function parseToValidIso(dateVal) {
        if (!dateVal) return null;
        const str = typeof dateVal === 'string' ? dateVal.trim().replace(' ', 'T') : dateVal;
        const d = new Date(str);
        return isNaN(d.getTime()) ? null : d.toISOString();
    }

    // Start- und Endzeit ermitteln & validieren
    let startTimeISO = parseToValidIso(appointment.appointment);
    let endTimeISO = null;

    const timeRecords = appointment.expand?.time_record || [];
    if (timeRecords.length > 0) {
        const tr = Array.isArray(timeRecords) ? timeRecords[0] : timeRecords;
        if (tr.start) {
            const parsedStart = parseToValidIso(tr.start);
            if (parsedStart) startTimeISO = parsedStart;
        }
        if (tr.end) {
            const parsedEnd = parseToValidIso(tr.end);
            if (parsedEnd) endTimeISO = parsedEnd;
        }
    }

    if (!startTimeISO) {
        console.warn(`[Google Calendar] Termin ${appointment.id} hat kein gültiges Startdatum.`);
        return null;
    }

    // Sicherstellen, dass Endzeit existiert und strikt nach der Startzeit liegt (Google 400 Bad Request Schutz)
    const startMs = new Date(startTimeISO).getTime();
    let endMs = endTimeISO ? new Date(endTimeISO).getTime() : 0;
    if (!endMs || endMs <= startMs) {
        // Fallback: 1 Stunde Dauer
        endTimeISO = new Date(startMs + 60 * 60 * 1000).toISOString();
    }

    const appUrl = process.env.APP_URL || 'https://www.ihre-seniorenassistenz.com';
    const descriptionLines = [
        clientName ? `👤 Klient: ${clientName}` : '',
        clientPhone ? `📞 Telefon: ${clientPhone}` : '',
        appointment.location_address ? `📍 Ort: ${appointment.location_address}` : '',
        appointment.notes ? `📝 Notizen:\n${appointment.notes}` : '',
        '',
        `🔗 In OrgaFlow öffnen: ${appUrl}/appointments?id=${appointment.id}`
    ].filter(Boolean).join('\n');

    // Start- und Endzeit für Google konfigurieren
    let startObj = { dateTime: startTimeISO, timeZone: 'Europe/Berlin' };
    let endObj = { dateTime: endTimeISO, timeZone: 'Europe/Berlin' };

    // Bei echten Mehrtages-Events (z.B. Urlaub) ganztägige Datums-Syntax für Google Kalender nutzen
    if (appointment.is_multiday) {
        const sDate = startTimeISO.split('T')[0];
        const eDateObj = new Date(endTimeISO);
        // Google erwartet bei ganztägigen Events das exklusive Enddatum (+1 Tag)
        eDateObj.setDate(eDateObj.getDate() + 1);
        const eDate = eDateObj.toISOString().split('T')[0];
        startObj = { date: sDate };
        endObj = { date: eDate };
    }

    // Eindeutige Metadaten zur zuverlässigen Duplikat-Erkennung im Google Kalender
    const eventPayload = {
        summary: summary,
        description: descriptionLines,
        location: appointment.location_address || '',
        start: startObj,
        end: endObj,
        status: 'confirmed',
        transparency: isBlocked ? 'opaque' : 'opaque',
        extendedProperties: {
            private: {
                orgaflow_appointment_id: appointment.id
            }
        }
    };

    // Native Google Calendar Wiederholungsregel (RRULE für Serien- und Wochenendsperren)
    if (appointment.recurrence_rule) {
        eventPayload.recurrence = [appointment.recurrence_rule];
    }

    let googleEvent = null;

    try {
        // Berechne deterministische Google-Event-ID (Basis: Hex-codierte PocketBase-ID, strikt base32hex konform)
        const deterministicGoogleId = 'orga' + Buffer.from(appointment.id).toString('hex');
        
        // Priorität: bereits in DB hinterlegte Google-ID, sonst deterministische ID
        const targetGoogleId = appointment.google_event_id || deterministicGoogleId;

        // --- SCHRITT A: Update existierendes Event versuchen (idempotenter PATCH) ---
        const updateRes = await fetchWithRetry(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(targetGoogleId)}`, {
            method: 'PATCH',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(eventPayload)
        });

        if (updateRes.ok) {
            googleEvent = await updateRes.json();
            console.log(`[Google Calendar] Event aktualisiert: ${targetGoogleId}`);
        } else if (updateRes.status === 404 || updateRes.status === 410) {
            // Event existiert noch nicht in Google -> mit fester ID neu anlegen
            const createPayload = { ...eventPayload, id: deterministicGoogleId };
            const createRes = await fetchWithRetry(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(createPayload)
            });

            if (createRes.ok) {
                googleEvent = await createRes.json();
                console.log(`[Google Calendar] Neues Event erstellt: ${googleEvent.id}`);
            } else if (createRes.status === 409) {
                // 409 Conflict: Event wurde zeitgleich bereits angelegt -> PATCH ausführen
                console.log(`[Google Calendar] Event existiert bereits (409). Führe Update durch...`);
                const retryPatch = await fetchWithRetry(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(deterministicGoogleId)}`, {
                    method: 'PATCH',
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(eventPayload)
                });
                if (retryPatch.ok) {
                    googleEvent = await retryPatch.json();
                }
            } else {
                const errData = await createRes.json();
                console.error('[Google Calendar] Fehler bei Event-Erstellung:', JSON.stringify(errData, null, 2));
            }
        } else {
            const errData = await updateRes.json();
            console.error('[Google Calendar] Fehler beim Event-Update:', JSON.stringify(errData, null, 2));
        }

        if (googleEvent) {
            // Eigene Änderung vermerken, damit der PocketBase Realtime-Listener keinen Echo-Loop startet
            recentlyUpdatedRecords.set(appointment.id, Date.now());
            if (recentlyUpdatedRecords.size > 2000) recentlyUpdatedRecords.clear();

            await pbAdmin.collection('appointments').update(appointment.id, {
                google_event_id: googleEvent.id,
                google_event_link: googleEvent.htmlLink || ''
            });
            return googleEvent;
        }
    } catch (err) {
        console.error('[Google Calendar] Ausnahme bei Event-Sync:', err);
    }

    return null;
}

/**
 * Löscht einen Termin aus Google Kalender
 */
export async function deleteAppointmentFromGoogle(googleEventId, userId, pbAdmin) {
    if (!googleEventId || !userId || !pbAdmin) return;

    const tokenObj = await getValidAccessToken(userId, pbAdmin);
    if (!tokenObj) return;

    const { accessToken, config } = tokenObj;
    const calendarId = config.calendar_id || 'primary';

    try {
        const delRes = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(googleEventId)}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        if (delRes.ok || delRes.status === 404 || delRes.status === 410) {
            console.log(`[Google Calendar] Event ${googleEventId} erfolgreich aus Google gelöscht.`);
        } else {
            console.warn(`[Google Calendar] Konnte Event ${googleEventId} nicht löschen (Status: ${delRes.status})`);
        }
    } catch (err) {
        console.error('[Google Calendar] Fehler beim Löschen des Google-Events:', err);
    }
}

/**
 * Führt einen Komplettabgleich aller zukünftigen Termine für einen Nutzer durch
 */
export async function syncAllUpcomingAppointments(userId, pbAdmin) {
    if (!userId || !pbAdmin) return { synced: 0, total: 0 };

    const tokenObj = await getValidAccessToken(userId, pbAdmin);
    if (!tokenObj) return { synced: 0, total: 0 };

    // Termine ab heute 00:00 Uhr
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayIso = today.toISOString();

    console.log(`[Google Calendar] Starte Komplett-Sync für User ${userId} ab ${todayIso}...`);

    let appointments = [];
    try {
        appointments = await pbAdmin.collection('appointments').getFullList({
            filter: `user = "${userId}" && (appointment >= "${todayIso}" || recurrence_rule != "" || is_multiday = true)`,
            sort: 'appointment',
            expand: 'user,client,time_record'
        });
    } catch (e) {
        console.error('[Google Calendar] Konnte Termine für Sync nicht laden:', e);
        return { synced: 0, total: 0 };
    }

    let syncedCount = 0;
    for (const app of appointments) {
        try {
            const res = await syncAppointmentToGoogle(app.id, userId, pbAdmin);
            if (res) syncedCount++;
        } catch (e) {
            console.warn(`[Google Calendar] Fehler bei Termin ${app.id}:`, e.message);
        }
        // Proaktive Pause (500ms) zwischen Terminen für einen gleichmäßigen und ratenlimit-freien Ablauf
        await new Promise(r => setTimeout(r, 500));
    }

    // Letzten Sync-Zeitstempel festhalten
    try {
        const config = await pbAdmin.collection('user_calendar_configs').getFirstListItem(`user = "${userId}"`);
        if (config) {
            await pbAdmin.collection('user_calendar_configs').update(config.id, {
                last_sync: new Date().toISOString()
            });
        }
    } catch (e) {}

    console.log(`[Google Calendar] Komplett-Sync beendet: ${syncedCount}/${appointments.length} Termine synchronisiert.`);
    return { synced: syncedCount, total: appointments.length };
}

/**
 * Trennt die Google-Verknüpfung für einen Benutzer
 */
export async function disconnectGoogleCalendar(userId, pbAdmin) {
    if (!userId || !pbAdmin) return { success: false };

    try {
        const config = await pbAdmin.collection('user_calendar_configs').getFirstListItem(`user = "${userId}"`);
        if (!config) return { success: true };

        // Optional: Token bei Google widerrufen
        if (config.access_token) {
            try {
                await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(config.access_token)}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
                });
            } catch (e) {}
        }

        await pbAdmin.collection('user_calendar_configs').delete(config.id);
        console.log(`[Google Calendar] Verknüpfung für User ${userId} getrennt.`);
        return { success: true };
    } catch (err) {
        console.error('[Google Calendar] Fehler beim Trennen:', err);
        return { success: false, error: err.message };
    }
}

/**
 * Ruft externe Google-Kalender-Termine für einen bestimmten Zeitraum ab (Nur-Lese-Ansicht)
 * Filtert Termine heraus, die bereits aus OrgaFlow stammen, um Duplikate zu vermeiden.
 */
export async function fetchExternalGoogleEvents(userId, pbAdmin, timeMin, timeMax) {
    if (!userId || !pbAdmin) return [];

    const tokenObj = await getValidAccessToken(userId, pbAdmin);
    if (!tokenObj) return [];

    const { accessToken, config } = tokenObj;
    const calendarId = config.calendar_id || 'primary';

    // Standardzeitraum falls nicht angegeben: heute - 15 Tage bis heute + 45 Tage
    const startIso = timeMin || new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString();
    const endIso = timeMax || new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString();

    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?timeMin=${encodeURIComponent(startIso)}&timeMax=${encodeURIComponent(endIso)}&singleEvents=true&orderBy=startTime&maxResults=250`;

    try {
        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        if (!res.ok) {
            console.warn(`[Google Calendar] Konnte externe Events nicht laden (Status: ${res.status})`);
            return [];
        }

        const data = await res.json();
        const items = data.items || [];

        // Filtere alle Termine heraus, die bereits in OrgaFlow existieren
        const externalEvents = items.filter(item => {
            if (item.id?.startsWith('orga')) return false;
            if (item.extendedProperties?.private?.orgaflow_appointment_id) return false;
            if (item.description?.includes('In OrgaFlow öffnen:')) return false;
            return true;
        }).map(item => ({
            id: `google_${item.id}`,
            google_id: item.id,
            title: item.summary || 'Privater Termin (Google)',
            description: item.summary || 'Privater Termin (Google)',
            location_address: item.location || '',
            notes: item.description || '',
            appointment: item.start?.dateTime || (item.start?.date ? `${item.start.date}T09:00:00.000Z` : new Date().toISOString()),
            is_google: true,
            is_private: true,
            is_blocked: true,
            htmlLink: item.htmlLink || '',
            expand: {
                time_record: [{
                    start: item.start?.dateTime || (item.start?.date ? `${item.start.date}T09:00:00.000Z` : new Date().toISOString()),
                    end: item.end?.dateTime || (item.end?.date ? `${item.end.date}T10:00:00.000Z` : new Date().toISOString())
                }]
            }
        }));

        return externalEvents;
    } catch (err) {
        console.error('[Google Calendar] Fehler beim Abrufen externer Termine:', err);
        return [];
    }
}

/**
 * Versendet eine E-Mail direkt über die Google Mail (Gmail) REST API via OAuth2
 */
export async function sendEmailViaGmailOAuth2({ userId, to, cc, bcc, subject, text, html, attachments, pbAdmin, fromName }) {
    const auth = await getValidAccessToken(userId, pbAdmin);
    if (!auth) {
        throw new Error('Kein verknüpftes Google-Konto gefunden oder Token abgelaufen. Bitte verknüpfen Sie Ihr Google-Konto.');
    }

    const senderEmail = auth.config.google_email;
    if (!senderEmail) {
        throw new Error('Google-E-Mail-Adresse des Kontos konnte nicht ermittelt werden.');
    }

    const displayName = fromName || process.env.SMTP_FROM_NAME || 'Ihre Seniorenassistenz';
    const formattedFrom = `"${displayName}" <${senderEmail}>`;

    const formattedAttachments = (attachments || []).map(att => ({
        filename: att.filename,
        content: att.content,
        encoding: att.encoding || 'base64'
    }));

    const mail = new MailComposer({
        from: formattedFrom,
        to,
        cc: cc || undefined,
        bcc: bcc || undefined,
        subject,
        text,
        html,
        attachments: formattedAttachments
    });

    const compiledMessage = await new Promise((resolve, reject) => {
        mail.compile().build((err, message) => {
            if (err) reject(err);
            else resolve(message);
        });
    });

    const raw = compiledMessage.toString('base64url');

    const response = await fetchWithRetry('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${auth.accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ raw })
    });

    const data = await response.json();
    if (!response.ok) {
        console.error('[Gmail API Error]', data);
        throw new Error(data.error?.message || 'Fehler beim Senden über die Gmail API.');
    }

    return {
        success: true,
        messageId: data.id,
        threadId: data.threadId,
        provider: 'gmail-oauth2',
        from: formattedFrom
    };
}
