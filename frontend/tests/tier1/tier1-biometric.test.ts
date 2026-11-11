/**
 * Tier 1: Biometric & Security Service - Feature Coverage
 * Tests: T1-BIO-01 through T1-BIO-05
 * Line count strictly <= 250 lines (code-minimalism.md).
 */

import '../mocks/setup';
import { resetTestEnvironment } from '../mocks/setup';
import { mockCapacitorBridge } from '../mocks/mockCapacitorBridge';
import { biometricService } from '$lib/services/biometricService';
import { registerTest, assert, assertEquals } from '../test-harness';

function resetBiometricService(): void {
    (biometricService as any).initialized = false;
    (biometricService as any).isEnabled = false;
    (biometricService as any).isLockedState = false;
}

registerTest('T1-BIO-01', 1, 'Biometrics: Service Initialization', async () => {
    resetTestEnvironment();
    resetBiometricService();
    mockCapacitorBridge.preferences.set('orga_biometric_lock_enabled', 'true');

    await biometricService.init();
    assertEquals(biometricService.isConfigured, true, 'Service should be configured when preference is true');
    assertEquals(biometricService.isLockActive, true, 'Cold boot with lock enabled must activate lock screen');
});

registerTest('T1-BIO-02', 1, 'Biometrics: Secure PIN Hashing & Storage', async () => {
    resetTestEnvironment();
    resetBiometricService();

    await biometricService.setPin('246810');
    const storedHash = mockCapacitorBridge.preferences.get('orga_app_pin_hash');
    assert(!!storedHash, 'Stored PIN hash must not be empty');
    assertEquals(storedHash!.length, 64, 'SHA-256 hash must be 64 hexadecimal characters');
});

registerTest('T1-BIO-03', 1, 'Biometrics: Valid PIN Authentication', async () => {
    resetTestEnvironment();
    resetBiometricService();

    await biometricService.setEnabled(true);
    await biometricService.setPin('246810');
    (biometricService as any).isLockedState = true;

    const success = await biometricService.verifyPin('246810');
    assertEquals(success, true, 'Verification with correct PIN must succeed');
    assertEquals(biometricService.isLockActive, false, 'Successful verification must deactivate lock');
});

registerTest('T1-BIO-04', 1, 'Biometrics: Enable Biometric Lock Mode', async () => {
    resetTestEnvironment();
    resetBiometricService();

    await biometricService.setEnabled(true);
    const pref = mockCapacitorBridge.preferences.get('orga_biometric_lock_enabled');
    assertEquals(pref, 'true', 'Preference must be set to "true"');
});

registerTest('T1-BIO-05', 1, 'Biometrics: App Backgrounding Triggers Lock', async () => {
    resetTestEnvironment();
    resetBiometricService();
    mockCapacitorBridge.isNative = true;

    await biometricService.init();
    await biometricService.setEnabled(true);
    biometricService.unlock();
    assertEquals(biometricService.isLockActive, false, 'App should initially be unlocked');

    // Simulate OS minimizing app to background
    mockCapacitorBridge.notifyApp('appStateChange', { isActive: false });
    assertEquals(biometricService.isLockActive, true, 'App backgrounding must trigger active lock state');
});
