/**
 * Tier 2: Document Scanner Service - Boundary & Corner Cases
 * Tests: T2-DOC-01 through T2-DOC-05
 * Line count strictly <= 250 lines (code-minimalism.md).
 */

import '../mocks/setup';
import { resetTestEnvironment } from '../mocks/setup';
import { mockCapacitorBridge } from '../mocks/mockCapacitorBridge';
import { documentScannerService, type ScannedPage } from '$lib/services/documentScannerService';
import { registerTest, assertEquals, assertRejects, assert } from '../test-harness';

const SAMPLE_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const SAMPLE_JPG = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

registerTest('T2-DOC-01', 2, 'DocScanner Corner: User Cancels Photo Capture', async () => {
    resetTestEnvironment();
    mockCapacitorBridge.cameraError = 'User cancelled photos app';

    const page = await documentScannerService.capturePage();
    assertEquals(page, null, 'User cancellation must return null without throwing an exception');
});

registerTest('T2-DOC-02', 2, 'DocScanner Corner: Camera Hardware Permission Denied', async () => {
    resetTestEnvironment();
    mockCapacitorBridge.cameraError = new Error('Permission denied by user');

    await assertRejects(
        async () => { await documentScannerService.capturePage(); },
        'Die Kamera konnte nicht geöffnet werden. Bitte Berechtigungen prüfen.',
        'Permission rejection must throw user-friendly German message'
    );
});

registerTest('T2-DOC-03', 2, 'DocScanner Corner: Empty Page Array for PDF Bundling', async () => {
    resetTestEnvironment();

    await assertRejects(
        async () => { await documentScannerService.bundleToPdf([], 'Dokument'); },
        'Es wurden keine Seiten zum Erstellen des PDFs ausgewählt.',
        'Empty pages array must reject before PDF generation'
    );
});

registerTest('T2-DOC-04', 2, 'DocScanner Corner: Mixed Image Formats & High Page Count', async () => {
    resetTestEnvironment();

    const pngBlob = await (await fetch(SAMPLE_PNG)).blob();
    const jpgBlob = await (await fetch(SAMPLE_JPG)).blob();

    const mixedPages: ScannedPage[] = [
        { dataUrl: SAMPLE_PNG, blob: pngBlob },
        { dataUrl: SAMPLE_JPG, blob: jpgBlob },
        { dataUrl: SAMPLE_PNG, blob: pngBlob },
        { dataUrl: SAMPLE_JPG, blob: jpgBlob },
        { dataUrl: SAMPLE_PNG, blob: pngBlob }
    ];

    const result = await documentScannerService.bundleToPdf(mixedPages, 'Sammelbeleg');
    assertEquals(result.pageCount, 5, 'Must bundle 5 pages accurately');
    assertEquals(result.pages.length, 5, 'Must preserve 5 pages array');
    assert(result.pdfBlob.size > 500, 'Compiled multi-page PDF must have valid size');
});

registerTest('T2-DOC-05', 2, 'DocScanner Corner: Extreme Aspect Ratio Scaling', async () => {
    resetTestEnvironment();

    // 1x1 image scaled to simulate extreme bounding
    const pngBlob = await (await fetch(SAMPLE_PNG)).blob();
    const singlePage: ScannedPage[] = [{ dataUrl: SAMPLE_PNG, blob: pngBlob }];

    const result = await documentScannerService.bundleToPdf(singlePage, 'Kassenbon_Lang');
    assert(result.pdfBlob.size > 100, 'Extreme aspect ratio must be safely scaled without error');
    assertEquals(result.pageCount, 1, 'Must compile to 1 page');
});
