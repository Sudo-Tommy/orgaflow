/**
 * Tier 1: Location & Reverse Geocoding Service - Feature Coverage
 * Tests: T1-LOC-01 through T1-LOC-05
 * Line count strictly <= 250 lines (code-minimalism.md).
 */

import '../mocks/setup';
import { resetTestEnvironment } from '../mocks/setup';
import { mockCapacitorBridge } from '../mocks/mockCapacitorBridge';
import { locationService } from '$lib/services/locationService';
import { registerTest, assert, assertEquals, assertDefined } from '../test-harness';

registerTest('T1-LOC-01', 1, 'Location: Permission Check & Request', async () => {
    resetTestEnvironment();
    mockCapacitorBridge.locationPermission = 'granted';

    const granted = await locationService.checkOrRequestPermissions();
    assertEquals(granted, true, 'Permission check should return true when granted');
});

registerTest('T1-LOC-02', 1, 'Location: High-Accuracy Position Acquisition', async () => {
    resetTestEnvironment();
    mockCapacitorBridge.coords = { latitude: 48.137154, longitude: 11.576124, accuracy: 5 };

    const pos = await locationService.getCurrentPosition();
    assertDefined(pos, 'Position must be returned');
    assertEquals(pos.latitude, 48.137154, 'Latitude must match');
    assertEquals(pos.longitude, 11.576124, 'Longitude must match');
    assertEquals(pos.accuracy, 5, 'Accuracy must match');
    assert(pos.timestamp > 0, 'Timestamp must be positive integer');
});

registerTest('T1-LOC-03', 1, 'Location: Reverse Geocoding Resolution', async () => {
    resetTestEnvironment();

    const address = await locationService.reverseGeocode(52.520008, 13.404954);
    assertDefined(address, 'Address string must be resolved');
    assert(address.length > 5, 'Address should contain street and city info');
});

registerTest('T1-LOC-04', 1, 'Location: Combined GPS & Address Capture', async () => {
    resetTestEnvironment();
    mockCapacitorBridge.coords = { latitude: 48.137154, longitude: 11.576124, accuracy: 5 };

    const pos = await locationService.getCurrentPosition();
    assertDefined(pos.address, 'Position should include reverse-geocoded address');
    assert(pos.address!.includes('München'), 'Address should resolve to city München');
});

registerTest('T1-LOC-05', 1, 'Location: First-Use Permission Escalation', async () => {
    resetTestEnvironment();
    mockCapacitorBridge.locationPermission = 'prompt';

    const granted = await locationService.checkOrRequestPermissions();
    assertEquals(granted, true, 'Permission escalation from prompt must succeed on request');
    assertEquals(mockCapacitorBridge.locationPermission, 'granted', 'Status must update to granted');
});
