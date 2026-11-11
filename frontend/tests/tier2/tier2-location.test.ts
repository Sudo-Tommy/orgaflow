/**
 * Tier 2: Location Service - Boundary & Corner Cases
 * Tests: T2-LOC-01 through T2-LOC-05
 * Line count strictly <= 250 lines (code-minimalism.md).
 */

import '../mocks/setup';
import { resetTestEnvironment } from '../mocks/setup';
import { mockCapacitorBridge } from '../mocks/mockCapacitorBridge';
import { setNominatimMock } from '../mocks/mockBrowserGlobals';
import { locationService } from '$lib/services/locationService';
import { registerTest, assertEquals, assertRejects, assertDefined } from '../test-harness';

registerTest('T2-LOC-01', 2, 'Location Corner: OS Location Permission Denied', async () => {
    resetTestEnvironment();
    mockCapacitorBridge.locationPermission = 'denied';

    await assertRejects(
        async () => { await locationService.getCurrentPosition(); },
        'Der Standortzugriff wurde abgelehnt. Bitte in den Geräteeinstellungen aktivieren.',
        'Permission rejection must throw user-friendly error'
    );
});

registerTest('T2-LOC-02', 2, 'Location Corner: GPS Hardware Acquisition Timeout', async () => {
    resetTestEnvironment();
    mockCapacitorBridge.locationError = { code: 3, message: 'Timeout expired after 10000ms' };

    await assertRejects(
        async () => { await locationService.getCurrentPosition(); },
        'Standort-Signal zu schwach. Bitte kurz warten oder ins Freie treten.',
        'GPS acquisition timeout must throw user-friendly guidance'
    );
});

registerTest('T2-LOC-03', 2, 'Location Corner: Offline During Reverse Geocode', async () => {
    resetTestEnvironment();
    mockCapacitorBridge.coords = { latitude: 50.110924, longitude: 8.682127, accuracy: 8 };
    (globalThis.navigator as any).onLine = false;

    const pos = await locationService.getCurrentPosition();
    assertDefined(pos, 'Coordinates must still be acquired when offline');
    assertEquals(pos.latitude, 50.110924, 'Latitude must be preserved');
    assertEquals(pos.address, undefined, 'Address should be omitted gracefully when offline');
});

registerTest('T2-LOC-04', 2, 'Location Corner: Geocoding Server Error (HTTP 500)', async () => {
    resetTestEnvironment();
    setNominatimMock(() => ({ status: 500, body: 'Internal Server Error' }));

    const address = await locationService.reverseGeocode(53.551086, 9.993682);
    assertEquals(address, null, 'Server error in reverse geocoding must return null without throwing');
});

registerTest('T2-LOC-05', 2, 'Location Corner: Extreme Coordinates & Boundary Numbers', async () => {
    resetTestEnvironment();
    mockCapacitorBridge.coords = { latitude: -90.0, longitude: 0.0, accuracy: 1 };

    const pos = await locationService.getCurrentPosition();
    assertEquals(pos.latitude, -90.0, 'Extreme latitude boundary must be handled correctly');
    assertEquals(pos.longitude, 0.0, 'Zero longitude must be handled correctly');
});
