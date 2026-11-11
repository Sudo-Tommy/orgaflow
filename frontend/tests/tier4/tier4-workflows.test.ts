/**
 * Tier 4: Real-World Application Workflows
 * Tests: T4-E2E-01 through T4-E2E-05
 * Line count strictly <= 250 lines (code-minimalism.md).
 */

import '../mocks/setup';
import { resetTestEnvironment } from '../mocks/setup';
import { mockCapacitorBridge } from '../mocks/mockCapacitorBridge';
import { createMockCanvas, setVersionJsonMock } from '../mocks/mockBrowserGlobals';
import { activateSignatureSession } from '$lib/services/signatureLifecycle';
import { documentScannerService, type ScannedPage } from '$lib/services/documentScannerService';
import { locationService } from '$lib/services/locationService';
import { biometricService } from '$lib/services/biometricService';
import { appUpdateService } from '$lib/services/appUpdateService';
import { registerTest, assertEquals, assert, assertDefined, assertMatches } from '../test-harness';

const SAMPLE_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

class AppUpdateWorkflowSession {
    availableVersion: string | null = null;
    downloadUrl: string = appUpdateService.defaultDownloadUrl;
    isDismissed = false;

    async checkUpdate(localVersion = '1.0.0'): Promise<void> {
        const result = await appUpdateService.checkUpdate({ localVersion });
        if (result.hasUpdate && result.availableVersion) {
            this.availableVersion = result.availableVersion;
            if (result.downloadUrl) this.downloadUrl = result.downloadUrl;
        }
    }

    dismiss(): void {
        this.isDismissed = true;
    }

    shouldDisplayBanner(): boolean {
        return Boolean(this.availableVersion && !this.isDismissed);
    }
}

registerTest('T4-E2E-01', 4, 'Workflow 1: Fahrtenbuch 1-Click GPS Logging', async () => {
    resetTestEnvironment();
    mockCapacitorBridge.coords = { latitude: 48.137154, longitude: 11.576124, accuracy: 4 };

    // Step 1: Caregiver initiates GPS capture in DriveRecordModal
    const pos = await locationService.getCurrentPosition();
    assertDefined(pos.address, 'Address must be resolved');

    // Step 2: Form prefill and submission
    const driveRecord = {
        departureAddress: pos.address,
        departureCoords: { lat: pos.latitude, lon: pos.longitude },
        startOdometer: 14250,
        purpose: 'Einkaufsfahrt & Arztbegleitung Frau Müller',
        timestamp: new Date().toISOString()
    };

    assert(driveRecord.departureAddress.includes('München'), 'Departure address prefilled accurately');
    assertEquals(driveRecord.departureCoords.lat, 48.137154);
    assert(driveRecord.startOdometer > 0);
});

registerTest('T4-E2E-02', 4, 'Workflow 2: Caregiver Client Visit Completion & Sign-off', async () => {
    resetTestEnvironment();
    mockCapacitorBridge.isNative = true;
    mockCapacitorBridge.coords = { latitude: 52.520008, longitude: 13.404954, accuracy: 6 };

    // Step 1: Open FullscreenSignatureModal (activateSignatureSession locks orientation to landscape)
    const teardownSignature = activateSignatureSession({ onClose: () => {} });
    await new Promise(r => setTimeout(r, 10));
    assertEquals(mockCapacitorBridge.currentOrientation, 'landscape');

    // Step 2: Senior signs on touchscreen
    const canvas = createMockCanvas(800, 400);
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(100, 150);
    ctx.lineTo(250, 180);
    ctx.stroke();
    const signatureUrl = canvas.toDataURL('image/png');

    // Step 3: Confirm signature and restore orientation via lifecycle teardown
    teardownSignature();
    await new Promise(r => setTimeout(r, 10));
    assertEquals(mockCapacitorBridge.currentOrientation, 'unlocked');

    // Step 4: 1-click GPS verification stamp of visit location
    const visitLocation = await locationService.getCurrentPosition();

    // Step 5: Complete visit record
    const visitCompletionPayload = {
        appointmentId: 'apt_12345',
        status: 'completed',
        clientSignature: signatureUrl,
        verificationLocation: visitLocation.address,
        completedAt: new Date().toISOString()
    };

    assertEquals(visitCompletionPayload.status, 'completed');
    assert(visitCompletionPayload.clientSignature.startsWith('data:image/png;base64,'));
    assertDefined(visitCompletionPayload.verificationLocation);
});

registerTest('T4-E2E-03', 4, 'Workflow 3: Pharmacy Prescription & Receipt Expense Archiving', async () => {
    resetTestEnvironment();

    // Step 1: Caregiver captures page 1 (Prescription)
    mockCapacitorBridge.cameraPhotoDataUrl = SAMPLE_PNG;
    const page1 = await documentScannerService.capturePage();
    assertDefined(page1);

    // Step 2: Caregiver selects "Weitere Seite erfassen" (Cash register receipt)
    const page2 = await documentScannerService.capturePage();
    assertDefined(page2);

    // Step 3: Bundle into DIN A4 PDF document
    const result = await documentScannerService.bundleToPdf([page1!, page2!], 'Apothekenbeleg');
    assertEquals(result.pageCount, 2);
    assertMatches(result.fileName, /^Apothekenbeleg_\d{4}-\d{2}-\d{2}\.pdf$/);

    // Step 4: Verify generated PDF file ready for storage attachment
    const pdfFile = new File([result.pdfBlob], result.fileName, { type: 'application/pdf' });
    assertEquals(pdfFile.name, result.fileName);
    assertEquals(pdfFile.type, 'application/pdf');
    assert(pdfFile.size > 200);
});

registerTest('T4-E2E-04', 4, 'Workflow 4: Cold Boot Biometric Unlock & App Update Workflow', async () => {
    resetTestEnvironment();
    mockCapacitorBridge.isNative = true;
    mockCapacitorBridge.preferences.set('orga_biometric_lock_enabled', 'true');
    await biometricService.setPin('334455');
    setVersionJsonMock(() => ({ version: '1.2.0', apkUrl: 'https://example.com/orgaflow-1.2.0.apk' }));

    // Step 1: Cold boot into security lock
    (biometricService as any).initialized = false;
    await biometricService.init();
    assertEquals(biometricService.isLockActive, true, 'Lock overlay active on cold boot');

    // Step 2: Caregiver enters 6-digit security PIN
    const unlocked = await biometricService.verifyPin('334455');
    assertEquals(unlocked, true, 'PIN accepted');
    assertEquals(biometricService.isLockActive, false, 'Dashboard unlocked');

    // Step 3: Background update check detects new APK version
    const updateSession = new AppUpdateWorkflowSession();
    await updateSession.checkUpdate('1.0.0');
    assertEquals(updateSession.availableVersion, '1.2.0', 'New version detected');
    assertEquals(updateSession.shouldDisplayBanner(), true, 'Update banner displayed to caregiver');

    // Step 4: Caregiver clicks "Später erinnern" (dismiss update banner)
    updateSession.dismiss();
    assertEquals(updateSession.isDismissed, true, 'Banner state flipped to dismissed');
    assertEquals(updateSession.shouldDisplayBanner(), false, 'Update banner hidden immediately upon dismissal');

    // Step 5: Verify dismissal persists across subsequent update checks in same session
    for (let cycle = 1; cycle <= 3; cycle++) {
        await updateSession.checkUpdate('1.0.0');
        assertEquals(updateSession.availableVersion, '1.2.0', `Check cycle ${cycle} maintains detected version`);
        assertEquals(updateSession.shouldDisplayBanner(), false, `Check cycle ${cycle} must NOT re-show dismissed banner`);
    }

    // Step 6: Verify download trigger initiates system installer
    let launchedUrl = '';
    let launchTarget = '';
    globalThis.window.open = (url: string, target?: string) => {
        launchedUrl = url;
        launchTarget = target || '';
        return null;
    };
    appUpdateService.openDownload(updateSession.downloadUrl);
    assertEquals(launchedUrl, 'https://example.com/orgaflow-1.2.0.apk', 'Direct APK link passed to external launcher');
    assertEquals(launchTarget, '_system', 'Target must be _system');
});

registerTest('T4-E2E-05', 4, 'Workflow 5: Client Master Data Onboarding with Contract Scan', async () => {
    resetTestEnvironment();
    mockCapacitorBridge.coords = { latitude: 48.137154, longitude: 11.576124, accuracy: 5 };

    // Step 1: 1-click GPS captures home address for new senior client
    const location = await locationService.getCurrentPosition();

    // Step 2: Scan 3-page care service agreement
    mockCapacitorBridge.cameraPhotoDataUrl = SAMPLE_PNG;
    const pages: ScannedPage[] = [];
    for (let i = 0; i < 3; i++) {
        const page = await documentScannerService.capturePage();
        pages.push(page!);
    }
    assertEquals(pages.length, 3);
    const contractPdf = await documentScannerService.bundleToPdf(pages, 'Betreuungsvertrag');
    assertEquals(contractPdf.pageCount, 3);

    // Step 3: Complete client record
    const clientRecord = {
        name: 'Anna Schmidt',
        address: location.address,
        coords: { lat: location.latitude, lon: location.longitude },
        contractDocument: {
            fileName: contractPdf.fileName,
            pageCount: contractPdf.pageCount,
            size: contractPdf.pdfBlob.size
        }
    };

    assert(clientRecord.address!.includes('Marienplatz') || clientRecord.address!.includes('München'));
    assertEquals(clientRecord.contractDocument.pageCount, 3);
});
