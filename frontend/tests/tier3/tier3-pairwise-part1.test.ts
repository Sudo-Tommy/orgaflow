/**
 * Tier 3: Pairwise Feature Combinations (Part 1)
 * Tests: T3-INT-01 through T3-INT-05
 * Line count strictly <= 250 lines (code-minimalism.md).
 */

import '../mocks/setup';
import { resetTestEnvironment } from '../mocks/setup';
import { mockCapacitorBridge } from '../mocks/mockCapacitorBridge';
import { createMockCanvas } from '../mocks/mockBrowserGlobals';
import { documentScannerService, type ScannedPage } from '$lib/services/documentScannerService';
import { locationService } from '$lib/services/locationService';
import { biometricService } from '$lib/services/biometricService';
import { backButtonHandler } from '$lib/services/backButtonHandler';
import { activateSignatureSession } from '$lib/services/signatureLifecycle';
import { registerTest, assertEquals, assert, assertDefined } from '../test-harness';

const SAMPLE_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

registerTest('T3-INT-01', 3, 'DocScanner + Location: Receipt Capture with On-Site Geotagging', async () => {
    resetTestEnvironment();
    mockCapacitorBridge.cameraPhotoDataUrl = SAMPLE_PNG;
    mockCapacitorBridge.coords = { latitude: 48.137154, longitude: 11.576124, accuracy: 5 };

    // 1. Capture and bundle receipt
    const page = await documentScannerService.capturePage();
    assertDefined(page);
    const pdf = await documentScannerService.bundleToPdf([page!], 'Bewirtungsbeleg');

    // 2. Capture GPS and reverse-geocode address
    const location = await locationService.getCurrentPosition();

    // Composite payload for expense filing
    const expenseRecord = {
        title: 'Bewirtung Frau Huber',
        receiptDocument: pdf.fileName,
        address: location.address,
        coords: { lat: location.latitude, lon: location.longitude }
    };

    assertEquals(expenseRecord.receiptDocument, pdf.fileName);
    assert(expenseRecord.address!.includes('München'));
});

registerTest('T3-INT-02', 3, 'Signature + Location: Client Appointment Sign-Off with Geocoded Proof', async () => {
    resetTestEnvironment();
    mockCapacitorBridge.coords = { latitude: 52.520008, longitude: 13.404954, accuracy: 10 };

    // 1. Signature capture
    const canvas = createMockCanvas(500, 250);
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(10, 10);
    ctx.lineTo(80, 80);
    ctx.stroke();
    const signatureDataUrl = canvas.toDataURL('image/png');

    // 2. Location acquisition
    const location = await locationService.getCurrentPosition();

    // Composite sign-off payload
    const signOffPayload = {
        clientSignature: signatureDataUrl,
        verifiedAddress: location.address,
        coords: { latitude: location.latitude, longitude: location.longitude },
        timestamp: Date.now()
    };

    assert(signOffPayload.clientSignature.startsWith('data:image/png;base64,'));
    assertDefined(signOffPayload.verifiedAddress);
    assertEquals(signOffPayload.coords.latitude, 52.520008);
});

registerTest('T3-INT-03', 3, 'Signature + Biometrics: App Backgrounding During Open Signature Modal', async () => {
    resetTestEnvironment();
    mockCapacitorBridge.isNative = true;
    mockCapacitorBridge.preferences.set('orga_biometric_lock_enabled', 'true');
    await biometricService.setPin('123456');

    (biometricService as any).initialized = false;
    await biometricService.init();
    biometricService.unlock();
    assertEquals(biometricService.isLockActive, false, 'Initially unlocked');

    // 1. Open signature modal and draw
    const canvas = createMockCanvas();
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(20, 20);
    ctx.lineTo(50, 50);
    ctx.stroke();
    assertEquals(ctx.strokes.length, 4, 'Strokes recorded before backgrounding');

    // 2. Minimize app
    mockCapacitorBridge.notifyApp('appStateChange', { isActive: false });
    assertEquals(biometricService.isLockActive, true, 'Biometric lock screen must activate over modal');

    // 3. Unlock with valid PIN
    const unlocked = await biometricService.verifyPin('123456');
    assertEquals(unlocked, true);
    assertEquals(biometricService.isLockActive, false, 'App restored');
    // Stored strokes on canvas remain intact
    assertEquals(ctx.strokes.length, 4, 'Canvas strokes preserved through lock cycle');
});

registerTest('T3-INT-04', 3, 'DocScanner + Biometrics: Camera App Switch Resume Protection', async () => {
    resetTestEnvironment();
    mockCapacitorBridge.isNative = true;
    mockCapacitorBridge.preferences.set('orga_biometric_lock_enabled', 'true');
    await biometricService.setPin('987654');

    (biometricService as any).initialized = false;
    await biometricService.init();
    biometricService.unlock();

    // Capture photo from camera
    mockCapacitorBridge.cameraPhotoDataUrl = SAMPLE_PNG;
    const page = await documentScannerService.capturePage();
    assertDefined(page);

    // App switches to background after capture
    mockCapacitorBridge.notifyApp('appStateChange', { isActive: false });
    assertEquals(biometricService.isLockActive, true, 'Lock triggered upon resume from camera');

    // Authenticate and bundle
    await biometricService.verifyPin('987654');
    assertEquals(biometricService.isLockActive, false);

    const pdf = await documentScannerService.bundleToPdf([page!], 'Beleg');
    assertEquals(pdf.pageCount, 1);
});

registerTest('T3-INT-05', 3, 'Signature + BackButton + Biometrics: Back-Button Prioritization Under Active Lock', async () => {
    resetTestEnvironment();
    mockCapacitorBridge.isNative = true;
    mockCapacitorBridge.preferences.set('orga_biometric_lock_enabled', 'true');

    // 1. Signature session opens underneath
    let signatureDismissed = false;
    const teardownSignature = activateSignatureSession({
        onClose: () => { signatureDismissed = true; }
    });

    // 2. App locks due to background resume (z-[10000] over z-[9999])
    (biometricService as any).initialized = false;
    await biometricService.init();
    (biometricService as any).isLockedState = true;
    assertEquals(biometricService.isLockActive, true, 'Security lock is active (z-[10000])');

    // 3. User presses hardware back button
    const topHandler = (backButtonHandler as any).handlers[(backButtonHandler as any).handlers.length - 1];
    const handled = topHandler();

    // Must be rejected by signature handler because biometric lock is active
    assertEquals(handled, false, 'Back button must NOT dismiss signature modal while biometric lock is active');
    assertEquals(signatureDismissed, false, 'Signature modal must remain protected under lock');
    assertEquals(biometricService.isLockActive, true, 'Biometric lock remains strictly active');

    teardownSignature();
});
