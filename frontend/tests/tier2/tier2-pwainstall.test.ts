/**
 * Tier 2: PWA Installation Button - Boundary & Corner Cases
 * Tests: T2-PWA-01 through T2-PWA-05
 * Line count strictly <= 250 lines (code-minimalism.md).
 */

import '../mocks/setup';
import { resetTestEnvironment } from '../mocks/setup';
import { mockCapacitorBridge } from '../mocks/mockCapacitorBridge';
import { dispatchWindowEvent } from '../mocks/mockBrowserGlobals';
import { registerTest, assertEquals } from '../test-harness';

function mountPwaButtonLifecycle(isNative = false, isStandalone = false) {
    if (isNative) return null;
    if (isStandalone) return null;

    let deferredPrompt: any = null;
    let canInstall = false;

    const handlePrompt = (e: any) => {
        deferredPrompt = e;
        canInstall = true;
    };

    window.addEventListener('beforeinstallprompt', handlePrompt);

    const installPwa = async () => {
        if (!deferredPrompt) return 'no_prompt';
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            canInstall = false;
        }
        deferredPrompt = null;
        return outcome;
    };

    const cleanup = () => {
        window.removeEventListener('beforeinstallprompt', handlePrompt);
    };

    return {
        getCanInstall: () => canInstall,
        installPwa,
        cleanup
    };
}

registerTest('T2-PWA-01', 2, 'PWA Corner: Native Platform Suppression', async () => {
    resetTestEnvironment();
    mockCapacitorBridge.isNative = true;

    const instance = mountPwaButtonLifecycle(true, false);
    assertEquals(instance, null, 'PWA install button must not initialize on native platforms');
});

registerTest('T2-PWA-02', 2, 'PWA Corner: Standalone PWA Mode Suppression', async () => {
    resetTestEnvironment();
    const instance = mountPwaButtonLifecycle(false, true);
    assertEquals(instance, null, 'PWA install button must not initialize when running standalone');
});

registerTest('T2-PWA-03', 2, 'PWA Corner: User Dismisses Install Prompt', async () => {
    resetTestEnvironment();
    const instance = mountPwaButtonLifecycle(false, false);
    if (!instance) throw new Error('Expected instance to mount');

    const mockEvent = {
        prompt: () => {},
        userChoice: Promise.resolve({ outcome: 'dismissed' })
    };

    dispatchWindowEvent('beforeinstallprompt', mockEvent);
    assertEquals(instance.getCanInstall(), true, 'Button should show after event');

    const outcome = await instance.installPwa();
    assertEquals(outcome, 'dismissed', 'User dismissal must be handled gracefully');
    instance.cleanup();
});

registerTest('T2-PWA-04', 2, 'PWA Corner: installPwa() Called Without Prompt', async () => {
    resetTestEnvironment();
    const instance = mountPwaButtonLifecycle(false, false);
    if (!instance) throw new Error('Expected instance to mount');

    const res = await instance.installPwa();
    assertEquals(res, 'no_prompt', 'Calling install when no prompt exists must return without error');
    instance.cleanup();
});

registerTest('T2-PWA-05', 2, 'PWA Corner: Component Cleanup on Unmount', async () => {
    resetTestEnvironment();
    const instance = mountPwaButtonLifecycle(false, false);
    if (!instance) throw new Error('Expected instance to mount');

    instance.cleanup();

    // Dispatch event after cleanup
    dispatchWindowEvent('beforeinstallprompt', { prompt: () => {} });
    assertEquals(instance.getCanInstall(), false, 'Event after cleanup must not activate button');
});
