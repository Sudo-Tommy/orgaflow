/**
 * Tier 2: Biometric & Security Service - Boundary & Corner Cases
 * Tests: T2-BIO-01 through T2-BIO-05
 * Line count strictly <= 250 lines (code-minimalism.md).
 */

import '../mocks/setup';
import { resetTestEnvironment } from '../mocks/setup';
import { mockCapacitorBridge } from '../mocks/mockCapacitorBridge';
import { biometricService } from '$lib/services/biometricService';
import { registerTest, assertEquals } from '../test-harness';

function resetBiometricService(): void {
    (biometricService as any).initialized = false;
    (biometricService as any).isEnabled = false;
    (biometricService as any).isLockedState = false;
}

registerTest('T2-BIO-01', 2, 'Biometrics Corner: Invalid PIN Entry', async () => {
    resetTestEnvironment();
    resetBiometricService();

    await biometricService.setEnabled(true);
    await biometricService.setPin('123456');
    (biometricService as any).isLockedState = true;

    const success = await biometricService.verifyPin('999999');
    assertEquals(success, false, 'Invalid PIN verification must return false');
    assertEquals(biometricService.isLockActive, true, 'App must remain locked upon invalid PIN');
});

registerTest('T2-BIO-02', 2, 'Biometrics Corner: Blank / Empty PIN Entry & Unset Hash Handling', async () => {
    resetTestEnvironment();
    resetBiometricService();

    // 1. When real PIN is set, empty PIN must fail and preserve lock
    await biometricService.setEnabled(true);
    await biometricService.setPin('123456');
    (biometricService as any).isLockedState = true;

    const failedAttempt = await biometricService.verifyPin('');
    assertEquals(failedAttempt, false, 'Empty string PIN must not unlock when real PIN is configured');
    assertEquals(biometricService.isLockActive, true, 'Lock must remain active on invalid PIN');

    // 2. When NO PIN is configured, verification must unlock and synchronize state
    mockCapacitorBridge.preferences.delete('orga_app_pin_hash');
    const unsetUnlock = await biometricService.verifyPin('any');
    assertEquals(unsetUnlock, true, 'Unset PIN hash must allow unlock to prevent lockout');
    assertEquals(biometricService.isLockActive, false, 'isLockActive must be false after unset PIN unlock');
    assertEquals((biometricService as any).isLockedState, false, 'isLockedState must be synchronously reset to false');
});

registerTest('T2-BIO-03', 2, 'Biometrics Corner: Consecutive Failed PIN Attempts', async () => {
    resetTestEnvironment();
    resetBiometricService();

    await biometricService.setEnabled(true);
    await biometricService.setPin('555555');
    (biometricService as any).isLockedState = true;

    // 3 failed attempts
    for (let i = 0; i < 3; i++) {
        const result = await biometricService.verifyPin(`11111${i}`);
        assertEquals(result, false, `Attempt ${i + 1} must fail`);
        assertEquals(biometricService.isLockActive, true, `Attempt ${i + 1} must maintain lock`);
    }
});

registerTest('T2-BIO-04', 2, 'Biometrics Corner: Disabling Biometrics Unlocks App', async () => {
    resetTestEnvironment();
    resetBiometricService();

    await biometricService.setEnabled(true);
    (biometricService as any).isLockedState = true;
    assertEquals(biometricService.isLockActive, true, 'Lock should be active before disabling');

    // Disable biometrics
    await biometricService.setEnabled(false);
    assertEquals(biometricService.isLockActive, false, 'Disabling biometrics must immediately release lock');
    assertEquals(mockCapacitorBridge.preferences.get('orga_biometric_lock_enabled'), 'false');
});

registerTest('T2-BIO-05', 2, 'Biometrics Corner: Spurious App State Change (Foregrounding)', async () => {
    resetTestEnvironment();
    resetBiometricService();
    mockCapacitorBridge.isNative = true;

    await biometricService.init();
    await biometricService.setEnabled(true);
    biometricService.unlock();
    assertEquals(biometricService.isLockActive, false, 'Initial active state must be unlocked');

    // Dispatch foreground event (isActive: true)
    mockCapacitorBridge.notifyApp('appStateChange', { isActive: true });
    assertEquals(biometricService.isLockActive, false, 'Foreground event must not trigger lock state');
});
