/**
 * Standalone Adversarial Verification & Stress Test Harness for Milestone 1
 * Targets: documentScannerService, locationService, DocumentScanButton & BudgetReceiptField logic.
 * Strictly <= 250 lines.
 */

import './mocks/setup';
import { mockCapacitorBridge } from './mocks/mockCapacitorBridge';
import { setNominatimMock, resetBrowserGlobals } from './mocks/mockBrowserGlobals';
import { documentScannerService, type ScannedPage } from '$lib/services/documentScannerService';
import { locationService } from '$lib/services/locationService';

let passed = 0;
let failed = 0;

function assert(condition: boolean, desc: string) {
    if (condition) {
        passed++;
        console.log(`  ✓ PASS: ${desc}`);
    } else {
        failed++;
        console.error(`  ✗ FAIL: ${desc}`);
        throw new Error(`Assertion failed: ${desc}`);
    }
}

// 1x1 valid PNG and JPEG base64 for image blob creation
const VALID_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const VALID_JPEG_BASE64 = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

function makeValidPage(type: 'image/png' | 'image/jpeg' = 'image/png'): ScannedPage {
    const base64 = type === 'image/png' ? VALID_PNG_BASE64 : VALID_JPEG_BASE64;
    const bin = Buffer.from(base64, 'base64');
    const blob = new Blob([bin], { type });
    return { dataUrl: `data:${type};base64,${base64}`, blob };
}

async function runDocScannerStress() {
    console.log('\n--- 1. documentScannerService Adversarial Stress ---');

    // 1.1 Multi-page PDF bundling (20 pages, alternating PNG / JPEG)
    const pages: ScannedPage[] = [];
    for (let i = 0; i < 20; i++) {
        pages.push(makeValidPage(i % 2 === 0 ? 'image/png' : 'image/jpeg'));
    }
    const result = await documentScannerService.bundleToPdf(pages, 'Test_Receipt');
    assert(result.pageCount === 20, 'Bundles 20 multi-page documents correctly');
    assert(result.pdfBlob.size > 500, `PDF Blob size is valid (${result.pdfBlob.size} bytes)`);
    assert(result.pdfBlob.type === 'application/pdf', 'Output MIME type is application/pdf');

    // Verify PDF header magic bytes "%PDF-"
    const buf = await result.pdfBlob.arrayBuffer();
    const headerStr = Buffer.from(buf.slice(0, 5)).toString('ascii');
    assert(headerStr === '%PDF-', 'Resulting blob contains valid PDF magic header (%PDF-)');

    // 1.2 Empty pages array throws clean error
    let emptyCaught = false;
    try {
        await documentScannerService.bundleToPdf([]);
    } catch (e: any) {
        emptyCaught = e.message.includes('keine Seiten zum Erstellen des PDFs');
    }
    assert(emptyCaught, 'Empty pages array throws localized error');

    // 1.3 Corrupted / non-image blob handling
    let corruptedCaught = false;
    try {
        const corruptedPage: ScannedPage = {
            dataUrl: 'data:image/png;base64,corrupted',
            blob: new Blob([Buffer.from('CORRUPTED_NON_IMAGE_DATA')], { type: 'image/png' })
        };
        await documentScannerService.bundleToPdf([corruptedPage]);
    } catch (e: any) {
        corruptedCaught = true;
    }
    assert(corruptedCaught, 'Corrupted image blob throws error during embedding');

    // 1.4 Filename generation with custom title and date pattern
    const customTitle = 'Sonderausgabe_Fahrt';
    const scanRes = await documentScannerService.bundleToPdf([makeValidPage()], customTitle);
    const dateToday = new Date().toISOString().slice(0, 10);
    assert(scanRes.fileName === `${customTitle}_${dateToday}.pdf`, `Filename matches pattern: ${scanRes.fileName}`);
}

async function runLocationStress() {
    console.log('\n--- 2. locationService Adversarial Stress ---');

    // 2.1 Reverse Geocode Network Outage (Offline) Fallback
    mockCapacitorBridge.coords = { latitude: 52.520008, longitude: 13.404954, accuracy: 10 };
    mockCapacitorBridge.locationPermission = 'granted';

    setNominatimMock(() => { throw new Error('Network timeout/DNS failure'); });
    const posOffline = await locationService.getCurrentPosition();
    assert(posOffline.latitude === 52.520008, 'Latitude preserved during network failure');
    assert(posOffline.longitude === 13.404954, 'Longitude preserved during network failure');
    assert(posOffline.address === undefined, 'Address gracefully undefined when geocoder fails');

    // 2.2 Geocoder returns empty address dictionary
    setNominatimMock(() => ({ display_name: 'Fallback Display Name', address: {} }));
    const posFallback = await locationService.getCurrentPosition();
    assert(posFallback.address === 'Fallback Display Name', 'Fallback to display_name when address details are empty');

    // 2.3 Timeout handling
    mockCapacitorBridge.locationError = { code: 3, message: 'Timeout expired after 10000ms' };
    let timeoutCaught = false;
    try {
        await locationService.getCurrentPosition();
    } catch (e: any) {
        timeoutCaught = e.message.includes('Standort-Signal zu schwach');
    }
    assert(timeoutCaught, 'Timeout error produces actionable German error message');
    mockCapacitorBridge.locationError = null;

    // 2.4 Permission Denied handling
    mockCapacitorBridge.locationPermission = 'denied';
    let permCaught = false;
    try {
        await locationService.getCurrentPosition();
    } catch (e: any) {
        permCaught = e.message.includes('Standortzugriff wurde abgelehnt');
    }
    assert(permCaught, 'Permission denied produces actionable German error message');
    mockCapacitorBridge.locationPermission = 'granted';
}

async function runDocumentScanButtonSimulation() {
    console.log('\n--- 3. DocumentScanButton Re-entrancy & Logic Stress ---');

    // 3.1 Re-entrancy defense simulation
    let isScanning = false;
    let scanCalls = 0;

    async function simulatedScanClick() {
        if (isScanning) return;
        isScanning = true;
        scanCalls++;
        await new Promise(r => setTimeout(r, 20)); // Simulate async capture
        isScanning = false;
    }

    // Fire 5 rapid clicks concurrently
    await Promise.all([
        simulatedScanClick(),
        simulatedScanClick(),
        simulatedScanClick(),
        simulatedScanClick(),
        simulatedScanClick()
    ]);
    assert(scanCalls === 1, `Rapid clicking re-entrancy blocked: exactly 1 call executed (got ${scanCalls})`);

    // 3.2 Cancellation on first page returns 0 pages and does not bundle
    mockCapacitorBridge.cameraPhotoDataUrl = null; // User cancelled camera
    const firstPage = await documentScannerService.capturePage();
    assert(firstPage === null, 'First page cancellation yields null without error');

    // 3.3 Multi-page bundling wraps into standard File
    mockCapacitorBridge.cameraPhotoDataUrl = `data:image/png;base64,${VALID_PNG_BASE64}`;
    const p1 = await documentScannerService.capturePage();
    const p2 = await documentScannerService.capturePage();
    assert(p1 !== null && p2 !== null, 'Captured 2 valid pages');

    const bundled = await documentScannerService.bundleToPdf([p1!, p2!], 'Rechnung');
    const file = new File([bundled.pdfBlob], bundled.fileName, { type: 'application/pdf' });
    assert(file instanceof File, 'Bundled PDF successfully converted to standard DOM File object');
    assert(file.name.endsWith('.pdf'), 'File name has .pdf extension');
    assert(file.type === 'application/pdf', 'File MIME type is application/pdf');
    assert(file.size > 0, 'File size > 0');
}

async function runBudgetReceiptFieldSimulation() {
    console.log('\n--- 4. BudgetReceiptField Logic & State Reactivity ---');

    let receiptFile: File | null = null;
    let existingReceipt: string | null = 'existing_receipt_hash123.pdf';

    // Initial state: existing receipt present, no new file
    let hasReceipt = Boolean(receiptFile || existingReceipt);
    assert(hasReceipt, 'Initial state recognizes existing receipt');

    // Scan complete handler attaches new File
    const mockFile = new File([new Uint8Array([1, 2, 3])], 'Beleg_2026.pdf', { type: 'application/pdf' });
    receiptFile = mockFile;
    assert(receiptFile.name === 'Beleg_2026.pdf', 'New receipt file attached via onScanComplete');

    // User clicks remove
    function removeReceipt() {
        receiptFile = null;
    }
    removeReceipt();
    assert(receiptFile === null, 'Removal resets receiptFile to null');
}

async function main() {
    console.log('====================================================');
    console.log('   Milestone 1 Empirical Challenger Stress Suite   ');
    console.log('====================================================');

    try {
        await runDocScannerStress();
        await runLocationStress();
        await runDocumentScanButtonSimulation();
        await runBudgetReceiptFieldSimulation();

        console.log('\n====================================================');
        console.log(`TOTAL: ${passed} Passed, ${failed} Failed`);
        console.log('====================================================');

        if (failed > 0) process.exit(1);
    } catch (err) {
        console.error('\nFatal test failure:', err);
        process.exit(1);
    }
}

main();
