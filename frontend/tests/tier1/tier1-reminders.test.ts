/**
 * Unit Tests für lokale Termin-Erinnerungsregeln und native URL-Umschreibung (Etappe 1).
 */
import '../mocks/setup';
import {
    buildReminderNotifications,
    normalizeOffsets,
    formatOffsetLabel,
    hashNotificationId
} from '$lib/services/reminders/reminderRules';
import { rewriteNativeUrl } from '$lib/services/nativeApiShim';
import { registerTest, assert, assertEquals } from '../test-harness';

registerTest('T1-REM-01', 1, 'Reminders: Normalize & Format Offsets', async () => {
    const clean = normalizeOffsets([15, 60, 15, -5, 99999, 1440]);
    assertEquals(JSON.stringify(clean), JSON.stringify([1440, 60, 15]), 'Offsets müssen sortiert und dedupliziert werden');
    assertEquals(formatOffsetLabel(15), '15 Minuten vorher');
    assertEquals(formatOffsetLabel(60), '1 Stunde vorher');
    assertEquals(formatOffsetLabel(1440), '1 Tag vorher');
});

registerTest('T1-REM-02', 1, 'Reminders: Build Appointment, Daily & After-End Notifications', async () => {
    const now = new Date('2026-11-12T06:00:00');
    const apptTime = new Date('2026-11-12T10:00:00').toISOString();
    const blockTime = new Date('2026-11-14T08:00:00').toISOString();

    const planned = buildReminderNotifications({
        now,
        userId: 'u1',
        clients: [{ id: 'c1', name_first: 'Erika', name_last: 'Musterfrau', collectionId: 'clients', collectionName: 'clients', created: '', updated: '' }],
        appointments: [
            { id: 'a1', user: 'u1', client: ['c1'], appointment: apptTime, status: 'geplant', collectionId: 'appointments', collectionName: 'appointments', created: '', updated: '' },
            { id: 'a2', user: 'u2', client: ['c1'], appointment: apptTime, status: 'geplant', collectionId: 'appointments', collectionName: 'appointments', created: '', updated: '' },
            { id: 'a3', user: 'u1', appointment: blockTime, description: '[BLOCK] Urlaub', status: 'geplant', collectionId: 'appointments', collectionName: 'appointments', created: '', updated: '' }
        ],
        prefs: { offsets: [60, 15], dailyTime: '07:00', afterEnd: true, absences: true }
    });

    assertEquals(planned.filter((p) => p.extra.kind === 'appointment').length, 2, 'Nur eigene Termine mit 2 Offsets geplant');
    assertEquals(planned.filter((p) => p.extra.kind === 'after_end').length, 1, 'Nach-Termin-Ende Erinnerung geplant');
    assertEquals(planned.filter((p) => p.extra.kind === 'daily').length, 1, 'Tagesübersicht für Tag mit Termin geplant');
    assertEquals(planned.filter((p) => p.extra.kind === 'absence').length, 1, 'Abwesenheitshinweis am Vorabend geplant');
    assert(hashNotificationId('appt:a1:60') !== hashNotificationId('appt:a1:15'), 'IDs müssen eindeutig sein');
});

registerTest('T1-SHIM-01', 1, 'NativeShim: Relative & Dev URLs auf Produktion umschreiben', async () => {
    assertEquals(rewriteNativeUrl('/api/emails/lexoffice/status'), 'https://www.ihre-seniorenassistenz.com/api/emails/lexoffice/status');
    assertEquals(rewriteNativeUrl('http://localhost:3000/api/emails/send'), 'https://www.ihre-seniorenassistenz.com/api/emails/send');
    assertEquals(rewriteNativeUrl('/assets/logo.png'), '/assets/logo.png');
});
