import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { PDFDocument } from 'pdf-lib';
import { Capacitor } from '@capacitor/core';

export interface ScannedPage {
    dataUrl: string;
    blob: Blob;
}

export interface DocumentScanResult {
    pdfBlob: Blob;
    fileName: string;
    pageCount: number;
    pages: ScannedPage[];
}

/**
 * Service für das Erfassen von Belegen und Dokumenten mit der Gerätekamera
 * und automatischer Bündelung in ein kompaktes PDF direkt auf dem Mobilgerät.
 */
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

            // In Blob umwandeln
            const response = await fetch(photo.dataUrl);
            const blob = await response.blob();

            return {
                dataUrl: photo.dataUrl,
                blob
            };
        } catch (error: any) {
            // Abbruch durch Nutzer ist kein Systemfehler
            if (error?.message?.includes('User cancelled') || error === 'User cancelled photos app') {
                return null;
            }
            console.error('Kamerafehler beim Belegscan:', error);
            throw new Error('Die Kamera konnte nicht geöffnet werden. Bitte Berechtigungen prüfen.');
        }
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
            let embeddedImage;

            // Prüfe auf JPEG oder PNG
            if (page.blob.type === 'image/png') {
                embeddedImage = await pdfDoc.embedPng(imageBytes);
            } else {
                embeddedImage = await pdfDoc.embedJpg(imageBytes);
            }

            const { width, height } = embeddedImage.scale(1);
            // DIN A4 Standardabmessungen: 595.28 x 841.89 Punkte
            const a4Width = 595.28;
            const a4Height = 841.89;

            // Skalierung proportional anpassen
            const scaleFactor = Math.min(a4Width / width, a4Height / height, 1);
            const scaledWidth = width * scaleFactor;
            const scaledHeight = height * scaleFactor;

            const pdfPage = pdfDoc.addPage([a4Width, a4Height]);
            const x = (a4Width - scaledWidth) / 2;
            const y = (a4Height - scaledHeight) / 2;

            pdfPage.drawImage(embeddedImage, {
                x,
                y,
                width: scaledWidth,
                height: scaledHeight
            });
        }

        const pdfBytes = await pdfDoc.save();
        const pdfBlob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
        const dateStr = new Date().toISOString().slice(0, 10);
        const fileName = `${documentTitle}_${dateStr}.pdf`;

        return {
            pdfBlob,
            fileName,
            pageCount: pages.length,
            pages
        };
    }

    /**
     * Prüft, ob die Kamera auf dem aktuellen Gerät zur Verfügung steht.
     */
    isCameraAvailable(): boolean {
        if (Capacitor.isNativePlatform()) return true;
        return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
    }
}

export const documentScannerService = new DocumentScannerService();
