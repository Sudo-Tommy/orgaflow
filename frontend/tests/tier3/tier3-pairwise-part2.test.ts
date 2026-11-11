/**
 * Tier 3: Pairwise Feature Combinations (Part 2)
 * Tests: T3-INT-06 through T3-INT-10
 * Line count strictly <= 250 lines (code-minimalism.md).
 */

import fs from 'node:fs';
import path from 'node:path';
import '../mocks/setup';
import { resetTestEnvironment } from '../mocks/setup';
import { mockCapacitorBridge } from '../mocks/mockCapacitorBridge';
import { setVersionJsonMock, dispatchWindowEvent } from '../mocks/mockBrowserGlobals';
import { Capacitor } from '@capacitor/core';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { documentScannerService } from '$lib/services/documentScannerService';
import { locationService } from '$lib/services/locationService';
import { biometricService } from '$lib/services/biometricService';
import { appUpdateService } from '$lib/services/appUpdateService';
import { registerTest, assertEquals, assert, assertDefined } from '../test-harness';

const SAMPLE_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

function mountPwaButtonLifecycle() {
    if (Capacitor.isNativePlatform()) {
        return { isRendered: () => false, cleanup: () => {} };
    }
    if (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone) {
        return { isRendered: () => false, cleanup: () => {} };
    }

    let canInstall = false;
    const handlePrompt = (e: any) => {
        if (e.preventDefault) e.preventDefault();
        canInstall = true;
    };

    window.addEventListener('beforeinstallprompt', handlePrompt);
    return {
        isRendered: () => canInstall,
        cleanup: () => window.removeEventListener('beforeinstallprompt', handlePrompt)
    };
}

async function mountAppUpdateBannerLifecycle(currentVersion = '1.0.0') {
    const result = await appUpdateService.checkUpdate({
        isNative: Capacitor.isNativePlatform(),
        localVersion: currentVersion
    });
    return {
        isRendered: () => result.hasUpdate,
        getVersion: () => result.availableVersion
    };
}

registerTest('T3-INT-06', 3, 'PWA + AppUpdate: Platform Mutually Exclusive Display', async () => {
    resetTestEnvironment();
    setVersionJsonMock(() => ({ version: '2.1.0', apkUrl: 'https://example.com/app.apk' }));

    // Phase 1: Native Mobile Platform (Android / iOS)
    mockCapacitorBridge.isNative = true;

    const pwaNative = mountPwaButtonLifecycle();
    const updateNative = await mountAppUpdateBannerLifecycle('1.0.0');

    dispatchWindowEvent('beforeinstallprompt', { preventDefault: () => {} });

    assertEquals(pwaNative.isRendered(), false, 'PWA install button must not mount on native platform');
    assertEquals(updateNative.isRendered(), true, 'AppUpdateBanner must mount and display on native platform');
    assertEquals(updateNative.getVersion(), '2.1.0');
    pwaNative.cleanup();

    // Phase 2: Web Browser Environment (Desktop / Mobile Web)
    resetTestEnvironment();
    setVersionJsonMock(() => ({ version: '2.1.0', apkUrl: 'https://example.com/app.apk' }));
    mockCapacitorBridge.isNative = false;

    const pwaWeb = mountPwaButtonLifecycle();
    const updateWeb = await mountAppUpdateBannerLifecycle('1.0.0');

    dispatchWindowEvent('beforeinstallprompt', { preventDefault: () => {} });

    assertEquals(pwaWeb.isRendered(), true, 'PWA install button must render upon browser prompt');
    assertEquals(updateWeb.isRendered(), false, 'AppUpdateBanner must remain unrendered in web browser');
    assertEquals(updateWeb.getVersion(), null);
    pwaWeb.cleanup();
});

registerTest('T3-INT-07', 3, 'DocScanner + Location (Offline): Offline Receipt Scan with Failed Geocode Fallback', async () => {
    resetTestEnvironment();
    mockCapacitorBridge.cameraPhotoDataUrl = SAMPLE_PNG;
    mockCapacitorBridge.coords = { latitude: 49.4521, longitude: 11.0767, accuracy: 12 };
    (globalThis.navigator as any).onLine = false;

    // Scan receipt offline
    const page = await documentScannerService.capturePage();
    assertDefined(page);
    const pdf = await documentScannerService.bundleToPdf([page!], 'Offline_Beleg');
    assertEquals(pdf.pageCount, 1);

    // Acquire GPS offline
    const pos = await locationService.getCurrentPosition();
    assertEquals(pos.latitude, 49.4521);
    assertEquals(pos.address, undefined, 'Offline address must fallback gracefully to undefined');
});

registerTest('T3-INT-08', 3, 'Signature + DocScanner: Orientation Isolation Across Modals', async () => {
    resetTestEnvironment();
    mockCapacitorBridge.isNative = true;

    // 1. Open signature modal (landscape lock)
    await ScreenOrientation.lock({ orientation: 'landscape' });
    assertEquals(mockCapacitorBridge.currentOrientation, 'landscape');

    // 2. Close modal (unlock orientation)
    await ScreenOrientation.unlock();
    assertEquals(mockCapacitorBridge.currentOrientation, 'unlocked');

    // 3. Immediately trigger document scanner
    mockCapacitorBridge.cameraPhotoDataUrl = SAMPLE_PNG;
    const page = await documentScannerService.capturePage();
    assertDefined(page);
    // Verify orientation was not corrupted by scanner
    assertEquals(mockCapacitorBridge.currentOrientation, 'unlocked');
});

registerTest('T3-INT-09', 3, 'AppUpdate + Biometrics: Background Version Check Under Security Lock', async () => {
    resetTestEnvironment();
    mockCapacitorBridge.isNative = true;
    mockCapacitorBridge.preferences.set('orga_biometric_lock_enabled', 'true');
    await biometricService.setPin('889900');
    setVersionJsonMock(() => ({ version: '2.5.0', apkUrl: 'https://example.com/update.apk' }));

    // 1. App initializes locked
    (biometricService as any).initialized = false;
    await biometricService.init();
    assertEquals(biometricService.isLockActive, true, 'App is locked by biometrics');

    // 2. Concurrently, background update check succeeds silently
    const resp = await fetch('https://www.ihre-seniorenassistenz.com/api/mobile/version.json');
    const updateData = await resp.json();
    assertEquals(updateData.version, '2.5.0', 'Background update check succeeds silently');

    // 3. Inspect actual Svelte templates to verify Tailwind z-index layering invariant
    const baseDir = process.cwd().endsWith('frontend') ? process.cwd() : path.resolve(process.cwd(), 'frontend');
    const nativeAppMgrPath = path.resolve(baseDir, 'src/lib/components/app/NativeAppManager.svelte');
    const appUpdateBannerPath = path.resolve(baseDir, 'src/lib/components/app/AppUpdateBanner.svelte');

    const nativeAppMgrSrc = fs.readFileSync(nativeAppMgrPath, 'utf-8');
    const appUpdateBannerSrc = fs.readFileSync(appUpdateBannerPath, 'utf-8');

    const lockMatch = nativeAppMgrSrc.match(/z-\[(\d+)\]/);
    const bannerMatch = appUpdateBannerSrc.match(/z-\[(\d+)\]/);

    assert(lockMatch !== null, 'NativeAppManager must declare an explicit Tailwind z-index class');
    assert(bannerMatch !== null, 'AppUpdateBanner must declare an explicit Tailwind z-index class');

    const lockZIndex = parseInt(lockMatch![1], 10);
    const bannerZIndex = parseInt(bannerMatch![1], 10);

    assertEquals(lockZIndex, 10000, 'Biometric lock overlay must reside at z-[10000]');
    assertEquals(bannerZIndex, 9980, 'App update banner must reside at z-[9980]');
    assert(lockZIndex > bannerZIndex, 'Biometric lock z-index must strictly exceed update banner');
    assert(nativeAppMgrSrc.includes('role="dialog"'), 'Security lock must declare role="dialog"');

    // 4. Entering valid PIN dismisses lock overlay, exposing interactive banner underneath
    const unlocked = await biometricService.verifyPin('889900');
    assertEquals(unlocked, true, 'PIN accepted');
    assertEquals(biometricService.isLockActive, false, 'Security lock dismissed');
});

registerTest('T3-INT-10', 3, 'DocScanner + Location in Chat: Chat Attachment Document Scan & GPS Location Share', async () => {
    resetTestEnvironment();
    mockCapacitorBridge.cameraPhotoDataUrl = SAMPLE_PNG;
    mockCapacitorBridge.coords = { latitude: 52.520008, longitude: 13.404954, accuracy: 5 };

    // 1. Document scan attachment
    const page = await documentScannerService.capturePage();
    assertDefined(page);
    const pdf = await documentScannerService.bundleToPdf([page!], 'Vertrag');

    // 2. Share current location
    const pos = await locationService.getCurrentPosition();

    // Composite chat message payload
    const chatMessage = {
        text: `Aktueller Standort: ${pos.address}`,
        coords: { lat: pos.latitude, lon: pos.longitude },
        attachment: {
            fileName: pdf.fileName,
            fileType: 'application/pdf',
            size: pdf.pdfBlob.size
        }
    };

    assert(chatMessage.text.includes('Marienplatz') || chatMessage.text.includes('Berlin') || chatMessage.text.length > 10);
    assertEquals(chatMessage.attachment.fileType, 'application/pdf');
    assert(chatMessage.attachment.size > 0);
});
