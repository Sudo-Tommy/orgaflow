import { getAdminPb } from '../pb.js';
import { deleteAppointmentFromGoogle, syncAppointmentToGoogle, isRecentSelfUpdate } from '../../../googleCalendarService.js';
import { importGoogleEventsToPocketBase } from './googleCalendarImportService.js';

let isSubscribed = false;
let retryTimer = null;
let backgroundSyncTimer = null;

function extractUserId(record) {
    if (!record) return null;
    if (record.assigned_to && typeof record.assigned_to === 'string') return record.assigned_to;
    if (Array.isArray(record.user) && record.user.length > 0) return record.user[0];
    if (typeof record.user === 'string' && record.user.trim()) return record.user;
    return null;
}

export async function initGoogleCalendarRealtime(attempt = 1) {
    if (isSubscribed) return;
    if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
    }

    try {
        const pbAdmin = await getAdminPb();

        try {
            await pbAdmin.collection('appointments').unsubscribe('*');
        } catch {}

        await pbAdmin.collection('appointments').subscribe('*', async (e) => {
            try {
                const targetUser = extractUserId(e.record);
                if (e.action === 'delete') {
                    const eventId = e.record.google_event_id || ('orga' + Buffer.from(e.record.id).toString('hex'));
                    if (eventId && targetUser) {
                        await deleteAppointmentFromGoogle(eventId, targetUser, pbAdmin);
                    }
                } else if ((e.action === 'create' || e.action === 'update') && targetUser && !isRecentSelfUpdate(e.record.id)) {
                    await syncAppointmentToGoogle(e.record.id, targetUser, pbAdmin);
                }
            } catch (err) {
                console.error('[Google Calendar Realtime Sync Error]', err.message);
            }
        }, { requestKey: null });

        isSubscribed = true;
        console.log('📅 Google Calendar Realtime-Synchronisation aktiv.');

        // Initialer Abgleich beim Start + 5-Minuten-Hintergrundintervall
        importGoogleEventsToPocketBase('all', pbAdmin).catch(() => {});
        if (backgroundSyncTimer) clearInterval(backgroundSyncTimer);
        backgroundSyncTimer = setInterval(async () => {
            try {
                const pb = await getAdminPb();
                await importGoogleEventsToPocketBase('all', pb);
            } catch {}
        }, 5 * 60 * 1000);
    } catch (err) {
        isSubscribed = false;
        const delay = Math.min(attempt * 3000, 15000);
        if (attempt <= 5) {
            console.warn(`[Google Calendar Realtime] Versuch ${attempt} fehlgeschlagen – erneuter Versuch in ${delay / 1000}s:`, err.message);
        }
        retryTimer = setTimeout(() => initGoogleCalendarRealtime(attempt + 1), delay);
    }
}
