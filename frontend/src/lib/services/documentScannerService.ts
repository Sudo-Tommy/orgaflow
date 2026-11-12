import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { PDFDocument } from 'pdf-lib';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { recognizeTextOnDevice } from '$lib/services/ocr/ocrEngine';
import { parseDocumentOcrText, type ParsedDocumentOcr } from '$lib/services/ocr/receiptParser';

export interface ScannedPage {
    dataUrl: string;
    blob: Blob;
    cachePath?: string;
}

export interface DocumentScanResult {
    pdfBlob: Blob;
    fileName: string;
    pageCount: number;
    pages: ScannedPage[];
    ocrText?: string;
    parsedOcr?: ParsedDocumentOcr;
}

interface MlKitScannerPlugin {
    scanDocument(options?: { pageLimit?: number; allowGallery?: boolean }): Promise<{
        cancelled: boolean;
        pages?: { cachePath: string; mimeType: string }[];
        pdfCachePath?: string;
        pageCount?: number;
    }>;
}

const MlKitScanner = registerPlugin<MlKitScannerPlugin>('MlKitScanner');

function base64ToBlob(b64: string, mime: string): Blob {
    const clean = b64.includes(',') ? b64.split(',')[1] : b64;
    const bin = atob(clean);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: mime });
}

class DocumentScannerService {
    /**
     * Erfasst ein einzelnes Foto über die Gerätekamera oder Fotomediathek.
     */
    async capturePage(): Promise<ScannedPage | null> {
        try {
            const photo = await Camera.getPhoto({
                quality: 85,
                allowEditing: false,
                resultType: CameraResultType.DataUrl,
                source: CameraSource.Camera,
                promptLabelHeader: 'Beleg fotografieren',
                promptLabelPhoto: 'Aus Galerie wählen',
                promptLabelPicture: 'Foto aufnehmen'
            });

            if (!photo.dataUrl) return null;
            const response = await fetch(photo.dataUrl);
            const blob = await response.blob();
            return { dataUrl: photo.dataUrl, blob };
        } catch (error: any) {
            if (error?.message?.includes('User cancelled') || error === 'User cancelled photos app') {
                return null;
            }
            console.error('Kamerafehler beim Belegscan:', error);
            throw new Error('Die Kamera konnte nicht geöffnet werden. Bitte Berechtigungen prüfen.');
        }
    }

    /**
     * Startet auf Android den Google ML Kit Dokumentenscanner (Kantenerkennung, Entzerrung, Mehrseitig, PDF + Offline-OCR).
     * Rückfall auf Camera-Plugin falls ML Kit nicht verfügbar ist.
     */
    async scanSmartDocument(options?: { pageLimit?: number; allowGallery?: boolean; documentTitle?: string }): Promise<DocumentScanResult | null> {
        const title = options?.documentTitle || 'Beleg';
        if (Capacitor.isNativePlatform()) {
            try {
                const res = await MlKitScanner.scanDocument({
                    pageLimit: options?.pageLimit ?? 15,
                    allowGallery: options?.allowGallery ?? true
                });
                if (res?.cancelled) return null;

                const pages: ScannedPage[] = [];
                for (const p of res.pages || []) {
                    const fileRead = await Filesystem.readFile({ path: p.cachePath, directory: Directory.Cache });
                    if (typeof fileRead.data === 'string') {
                        const mime = p.mimeType || 'image/jpeg';
                        pages.push({
                            dataUrl: `data:${mime};base64,${fileRead.data}`,
                            blob: base64ToBlob(fileRead.data, mime),
                            cachePath: p.cachePath
                        });
                    }
                }

                let pdfBlob: Blob | null = null;
                if (res.pdfCachePath) {
                    const pdfRead = await Filesystem.readFile({ path: res.pdfCachePath, directory: Directory.Cache });
                    if (typeof pdfRead.data === 'string') {
                        pdfBlob = base64ToBlob(pdfRead.data, 'application/pdf');
                    }
                }

                if (!pdfBlob && pages.length > 0) {
                    const bundled = await this.bundleToPdf(pages, title);
                    pdfBlob = bundled.pdfBlob;
                }
                if (!pdfBlob) return null;

                const ocrTextParts: string[] = [];
                for (const pg of pages.slice(0, 3)) {
                    const ocr = await recognizeTextOnDevice({ cachePath: pg.cachePath, dataUrl: pg.dataUrl });
                    if (ocr?.text) ocrTextParts.push(ocr.text);
                }
                const combinedText = ocrTextParts.join('\n').trim();
                const parsedOcr = combinedText ? parseDocumentOcrText(combinedText) : undefined;
                const dateStr = new Date().toISOString().slice(0, 10);

                return {
                    pdfBlob,
                    fileName: `${title}_${dateStr}.pdf`,
                    pageCount: res.pageCount || pages.length || 1,
                    pages,
                    ocrText: combinedText || undefined,
                    parsedOcr
                };
            } catch (e) {
                console.warn('ML Kit Dokumentenscanner nicht verfügbar, nutze Standardkamera:', e);
            }
        }

        const single = await this.capturePage();
        if (!single) return null;
        return this.bundleToPdf([single], title);
    }

    /**
     * Bündelt mehrere aufgenommene Seiten in ein einheitliches, schlankes PDF-Dokument.
     */
    async bundleToPdf(pages: ScannedPage[], documentTitle = 'Beleg'): Promise<DocumentScanResult> {
        if (!pages || pages.length === 0) {
            throw new Error('Es wurden keine Seiten zum Erstellen des PDFs ausgewählt.');
        }

        const pdfDoc = await PDFDocument.create();
        for (const page of pages) {
            const imageBytes = await page.blob.arrayBuffer();
            const embeddedImage = page.blob.type === 'image/png'
                ? await pdfDoc.embedPng(imageBytes)
                : await pdfDoc.embedJpg(imageBytes);

            const { width, height } = embeddedImage.scale(1);
            const a4Width = 595.28;
            const a4Height = 841.89;
            const scaleFactor = Math.min(a4Width / width, a4Height / height, 1);
            const scaledWidth = width * scaleFactor;
            const scaledHeight = height * scaleFactor;

            const pdfPage = pdfDoc.addPage([a4Width, a4Height]);
            pdfPage.drawImage(embeddedImage, {
                x: (a4Width - scaledWidth) / 2,
                y: (a4Height - scaledHeight) / 2,
                width: scaledWidth,
                height: scaledHeight
            });
        }

        const pdfBytes = await pdfDoc.save();
        const pdfBlob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
        const dateStr = new Date().toISOString().slice(0, 10);

        return {
            pdfBlob,
            fileName: `${documentTitle}_${dateStr}.pdf`,
            pageCount: pages.length,
            pages
        };
    }

    isCameraAvailable(): boolean {
        if (Capacitor.isNativePlatform()) return true;
        return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
    }
}

export const documentScannerService = new DocumentScannerService();
