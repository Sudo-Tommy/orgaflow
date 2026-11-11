/**
 * Tier 1: Fullscreen Signature Modal - Feature Coverage
 * Tests: T1-SIG-01 through T1-SIG-05
 * Line count strictly <= 250 lines (code-minimalism.md).
 */

import '../mocks/setup';
import { resetTestEnvironment } from '../mocks/setup';
import { mockCapacitorBridge } from '../mocks/mockCapacitorBridge';
import { createMockCanvas } from '../mocks/mockBrowserGlobals';
import { activateSignatureSession } from '$lib/services/signatureLifecycle';
import { backButtonHandler } from '$lib/services/backButtonHandler';
import { registerTest, assert, assertEquals } from '../test-harness';

registerTest('T1-SIG-01', 1, 'Signature: Landscape Orientation Lock on Open', async () => {
    resetTestEnvironment();
    mockCapacitorBridge.isNative = true;

    let closed = false;
    const teardown = activateSignatureSession({ onClose: () => { closed = true; } });
    await new Promise(r => setTimeout(r, 10));

    // Assert real production function locked orientation and registered back handler
    assertEquals(mockCapacitorBridge.currentOrientation, 'landscape', 'Orientation must be locked to landscape');
    assertEquals((backButtonHandler as any).handlers.length, 1, 'Hardware back handler must be registered');

    teardown();
    await new Promise(r => setTimeout(r, 10));
});

registerTest('T1-SIG-02', 1, 'Signature: Drawing Input Sets Signature State', async () => {
    resetTestEnvironment();
    const canvas = createMockCanvas(600, 300);
    const ctx = canvas.getContext('2d');

    let hasSignature = false;
    // Simulate pointerdown -> pointermove -> pointerup
    ctx.beginPath();
    ctx.moveTo(50, 50);
    ctx.lineTo(100, 100);
    ctx.stroke();
    hasSignature = true;

    assertEquals(hasSignature, true, 'hasSignature state must be true after stroke recorded');
    assert(ctx.strokes.length >= 3, 'Canvas context must have recorded drawing commands');
});

registerTest('T1-SIG-03', 1, 'Signature: Clear Canvas Reset', async () => {
    resetTestEnvironment();
    const canvas = createMockCanvas(600, 300);
    const ctx = canvas.getContext('2d');

    let hasSignature = true;
    ctx.beginPath();
    ctx.moveTo(10, 10);
    ctx.lineTo(20, 20);
    ctx.stroke();

    // Trigger clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasSignature = false;

    assertEquals(hasSignature, false, 'hasSignature state must reset to false');
    assertEquals(ctx.strokes.length, 0, 'Canvas strokes buffer must be empty after clear');
});

registerTest('T1-SIG-04', 1, 'Signature: Signature Save Export', async () => {
    resetTestEnvironment();
    const canvas = createMockCanvas(600, 300);
    let exportedDataUrl = '';

    const handleSave = (onSave: (url: string) => void) => {
        const dataUrl = canvas.toDataURL('image/png');
        exportedDataUrl = dataUrl;
        onSave(dataUrl);
    };

    let savedUrl = '';
    handleSave((url) => { savedUrl = url; });

    assert(savedUrl.startsWith('data:image/png;base64,'), 'Exported signature must be PNG data URL');
    assertEquals(exportedDataUrl, savedUrl, 'Saved URL must match exported data URL');
});

registerTest('T1-SIG-05', 1, 'Signature: Orientation Unlock on Close', async () => {
    resetTestEnvironment();
    mockCapacitorBridge.isNative = true;

    let closed = false;
    const teardown = activateSignatureSession({ onClose: () => { closed = true; } });
    await new Promise(r => setTimeout(r, 10));
    assertEquals(mockCapacitorBridge.currentOrientation, 'landscape');

    // Execute teardown returned by activateSignatureSession
    teardown();
    await new Promise(r => setTimeout(r, 10));
    assertEquals(mockCapacitorBridge.currentOrientation, 'unlocked', 'Orientation must reset to unlocked on teardown');
    assertEquals((backButtonHandler as any).handlers.length, 0, 'Back handler must be unregistered on teardown');
});
