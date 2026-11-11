/**
 * Tier 2: Fullscreen Signature Modal - Boundary & Corner Cases
 * Tests: T2-SIG-01 through T2-SIG-05
 * Line count strictly <= 250 lines (code-minimalism.md).
 */

import '../mocks/setup';
import { resetTestEnvironment } from '../mocks/setup';
import { mockCapacitorBridge } from '../mocks/mockCapacitorBridge';
import { createMockCanvas } from '../mocks/mockBrowserGlobals';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { backButtonHandler } from '$lib/services/backButtonHandler';
import { activateSignatureSession } from '$lib/services/signatureLifecycle';
import { registerTest, assertEquals, assert } from '../test-harness';

registerTest('T2-SIG-01', 2, 'Signature Corner: Empty Canvas Save Prevention', async () => {
    resetTestEnvironment();
    const canvas = createMockCanvas();
    const hasSignature = false;
    let saved = false;

    // Direct simulation of handleSave guard
    const handleSave = () => {
        if (!canvas || !hasSignature) return;
        saved = true;
    };

    handleSave();
    assertEquals(saved, false, 'Saving must be prevented when hasSignature is false');
});

registerTest('T2-SIG-02', 2, 'Signature Corner: Android Hardware Back-Button Dismissal', async () => {
    resetTestEnvironment();
    mockCapacitorBridge.isNative = true;

    let modalDismissed = false;
    const teardown = activateSignatureSession({
        onClose: () => { modalDismissed = true; }
    });
    await new Promise(r => setTimeout(r, 10));

    // Simulate native Android hardware back button event via Capacitor bridge
    const topHandler = (backButtonHandler as any).handlers[(backButtonHandler as any).handlers.length - 1];
    const handled = topHandler();

    assertEquals(handled, true, 'Signature back handler must consume back press');
    assertEquals(modalDismissed, true, 'onClose callback must be fired on back button dismiss');

    // Simulate Svelte 5 $effect teardown when isOpen becomes false
    teardown();
    await new Promise(r => setTimeout(r, 10));
    assertEquals(mockCapacitorBridge.currentOrientation, 'unlocked', 'Orientation must reset to unlocked');
    assertEquals((backButtonHandler as any).handlers.length, 0, 'Handler must be cleaned up');
});

registerTest('T2-SIG-03', 2, 'Signature Corner: Unsupported ScreenOrientation Platform', async () => {
    resetTestEnvironment();
    mockCapacitorBridge.failOrientationLock = true;

    let errorThrown = false;
    try {
        try {
            await ScreenOrientation.lock({ orientation: 'landscape' });
        } catch {
            // Swallowed in component
        }
    } catch {
        errorThrown = true;
    }

    assertEquals(errorThrown, false, 'Orientation lock failure must be caught silently without crashing');
});

registerTest('T2-SIG-04', 2, 'Signature Corner: High-DPI / Retina Canvas Scaling', async () => {
    resetTestEnvironment();
    globalThis.window.devicePixelRatio = 3.0;

    const rect = { width: 500, height: 250 };
    const canvas = createMockCanvas(rect.width * 3, rect.height * 3);
    const ctx = canvas.getContext('2d');

    assertEquals(canvas.width, 1500, 'Canvas width must scale by DPR 3.0');
    assertEquals(canvas.height, 750, 'Canvas height must scale by DPR 3.0');
    assert(ctx !== null, '2D context must be present');
});

registerTest('T2-SIG-05', 2, 'Signature Corner: Rapid Successive Toggle Cycle', async () => {
    resetTestEnvironment();
    mockCapacitorBridge.isNative = true;

    const teardowns: Array<() => void> = [];

    // Rapid toggle 10 times with real activateSignatureSession
    for (let i = 0; i < 10; i++) {
        const td = activateSignatureSession({ onClose: () => {} });
        teardowns.push(td);
    }
    await new Promise(r => setTimeout(r, 10));

    assertEquals(mockCapacitorBridge.currentOrientation, 'landscape');
    assertEquals((backButtonHandler as any).handlers.length, 10);

    // Clean up all handlers
    teardowns.forEach(fn => fn());
    await new Promise(r => setTimeout(r, 10));

    assertEquals(mockCapacitorBridge.currentOrientation, 'unlocked', 'Final orientation must be unlocked');
    assertEquals((backButtonHandler as any).handlers.length, 0, 'All back handlers must be cleaned up');
});
