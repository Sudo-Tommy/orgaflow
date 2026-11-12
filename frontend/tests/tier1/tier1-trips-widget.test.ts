/**
 * Unit Tests für Etappe 3: Haversine-Distanz, Geofence-Ankunftserkennung und Widget-Tagestermine.
 */
import '../mocks/setup';
import { haversineDistanceMeters } from '$lib/services/trips/geoUtils';
import { checkGeofenceArrival } from '$lib/services/trips/arrivalWatcher';
import { buildTodayWidgetAppointments } from '$lib/services/widget/widgetSync';
import { registerTest, assert, assertEquals } from '../test-harness';

registerTest('T1-TRIP-01', 1, 'Trips: Haversine Distanz & Geofence-Ankunftshinweis', async () => {
    const distSame = haversineDistanceMeters(52.5200, 13.4050, 52.5205, 13.4055);
    assert(distSame > 40 && distSame < 90, `Erwartete ~65m, erhalten ${distSame}m`);

    const client = {
        id: 'c1',
        name_first: 'Anna',
        name_last: 'Schmidt',
        geo_lat: 52.5200,
        geo_lng: 13.4050,
        geofence_radius: 150
    };

    const hit = checkGeofenceArrival(52.5205, 13.4055, client);
    assertEquals(hit.arrived, true, 'Innerhalb 150 m muss Ankunft erkannt werden');
    assertEquals(hit.clientName, 'Anna Schmidt');

    const miss = checkGeofenceArrival(52.5300, 13.4050, client);
    assertEquals(miss.arrived, false, 'Außerhalb 150 m darf kein Treffer ausgelöst werden');
});

registerTest('T1-WID-01', 1, 'Widget: Heutige Termine sortiert & auf 4 begrenzt', async () => {
    const now = new Date('2026-11-12T08:00:00');
    const items = buildTodayWidgetAppointments(
        [
            { id: '1', user: 'u1', appointment: '2026-11-12T14:00:00', status: 'geplant', description: 'Nachmittag', collectionId: '', collectionName: '', created: '', updated: '' },
            { id: '2', user: 'u1', appointment: '2026-11-12T09:30:00', status: 'geplant', description: 'Morgen', collectionId: '', collectionName: '', created: '', updated: '' },
            { id: '3', user: 'u1', appointment: '2026-11-12T11:00:00', status: 'abgesagt', description: 'Abgesagt', collectionId: '', collectionName: '', created: '', updated: '' },
            { id: '4', user: 'u1', appointment: '2026-11-12T12:00:00', status: 'geplant', description: '[BLOCK] Pause', collectionId: '', collectionName: '', created: '', updated: '' },
            { id: '5', user: 'u1', appointment: '2026-11-13T09:00:00', status: 'geplant', description: 'Morgen Tag', collectionId: '', collectionName: '', created: '', updated: '' }
        ],
        [],
        'u1',
        now
    );

    assertEquals(items.length, 2, 'Nur 2 aktive heutige Termine (ohne abgesagt/[BLOCK]/morgen)');
    assertEquals(items[0].id, '2', 'Frühester Termin zuerst');
    assertEquals(items[1].id, '1');
});
