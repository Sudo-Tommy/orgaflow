/**
 * Tier 1: Document Scanner Service - Feature Coverage
 * Tests: T1-DOC-01 through T1-DOC-05
 * Line count strictly <= 250 lines (code-minimalism.md).
 */

import '../mocks/setup';
import { resetTestEnvironment } from '../mocks/setup';
import { mockCapacitorBridge } from '../mocks/mockCapacitorBridge';
import { documentScannerService, type ScannedPage } from '$lib/services/documentScannerService';
import { registerTest, assert, assertEquals, assertDefined, assertMatches } from '../test-harness';

const SAMPLE_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const SAMPLE_JPG = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

registerTest('T1-DOC-01', 1, 'DocScanner: Single Page Capture', async () => {
    resetTestEnvironment();
    mockCapacitorBridge.cameraPhotoDataUrl = SAMPLE_PNG;

    const page = await documentScannerService.capturePage();
    assertDefined(page, 'Expected page to be captured');
    assertEquals(page.dataUrl, SAMPLE_PNG, 'Data URL must match camera photo');
    assertEquals(page.blob.type, 'image/png', 'Blob MIME type must be image/png');
    assert(page.blob.size > 0, 'Blob size must be greater than 0');
});

registerTest('T1-DOC-02', 1, 'DocScanner: Multi-Page PDF Bundling', async () => {
    resetTestEnvironment();

    const pngBlob = await (await fetch(SAMPLE_PNG)).blob();
    const jpgBlob = await (await fetch(SAMPLE_JPG)).blob();

    const pages: ScannedPage[] = [
        { dataUrl: SAMPLE_PNG, blob: pngBlob },
        { dataUrl: SAMPLE_JPG, blob: jpgBlob }
    ];

    const result = await documentScannerService.bundleToPdf(pages, 'Rechnung');
    assertDefined(result, 'Expected PDF bundling result');
    assertEquals(result.pageCount, 2, 'Page count must be 2');
    assertEquals(result.pages.length, 2, 'Preserved pages length must be 2');
    assertEquals(result.pdfBlob.type, 'application/pdf', 'Output must be PDF MIME type');
    assert(result.pdfBlob.size > 100, 'PDF blob must contain compiled bytes');
});

registerTest('T1-DOC-03', 1, 'DocScanner: Custom Document Filename', async () => {
    resetTestEnvironment();
    const pngBlob = await (await fetch(SAMPLE_PNG)).blob();
    const pages: ScannedPage[] = [{ dataUrl: SAMPLE_PNG, blob: pngBlob }];

    const result = await documentScannerService.bundleToPdf(pages, 'Apotheke_Rezept');
    assertMatches(result.fileName, /^Apotheke_Rezept_\d{4}-\d{2}-\d{2}\.pdf$/, 'Filename must include title and ISO date');
});

registerTest('T1-DOC-04', 1, 'DocScanner: Native Camera Availability', async () => {
    resetTestEnvironment();
    mockCapacitorBridge.isNative = true;

    const available = documentScannerService.isCameraAvailable();
    assertEquals(available, true, 'Camera must be reported available on native platform');
});

registerTest('T1-DOC-05', 1, 'DocScanner: Web MediaDevices Fallback', async () => {
    resetTestEnvironment();
    mockCapacitorBridge.isNative = false;

    // Browser environment with mediaDevices
    const available = documentScannerService.isCameraAvailable();
    assertEquals(available, true, 'Camera must be available when getUserMedia exists on web');
});
