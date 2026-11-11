/**
 * Hilfsfunktionen für die Erfassung und Aufbereitung von Unterschriften
 */

export interface TrimmedSignatureResult {
    blob: Blob | null;
    dataUrl: string;
}

/**
 * Schneidet transparente Ränder um die Unterschrift automatisch ab
 * und liefert einen sauberen, zugeschnittenen PNG-Blob und Data-URL.
 */
export async function trimSignatureCanvas(
    sourceCanvas: HTMLCanvasElement,
    padding = 24
): Promise<TrimmedSignatureResult | null> {
    const ctx = sourceCanvas.getContext('2d');
    if (!ctx) return null;

    const width = sourceCanvas.width;
    const height = sourceCanvas.height;
    if (width === 0 || height === 0) return null;

    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const alphaIndex = (y * width + x) * 4 + 3;
            const alpha = data[alphaIndex];
            // Schwellwert für Striche
            if (alpha > 15) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }

    // Keine Striche gefunden
    if (maxX === -1 || maxY === -1) {
        return null;
    }

    // Begrenzungen mit Padding berechnen
    const cropX = Math.max(0, minX - padding);
    const cropY = Math.max(0, minY - padding);
    const cropW = Math.min(width - cropX, maxX - minX + padding * 2);
    const cropH = Math.min(height - cropY, maxY - minY + padding * 2);

    if (cropW <= 0 || cropH <= 0) return null;

    const trimmedCanvas = document.createElement('canvas');
    trimmedCanvas.width = cropW;
    trimmedCanvas.height = cropH;

    const trimmedCtx = trimmedCanvas.getContext('2d');
    if (!trimmedCtx) return null;

    trimmedCtx.drawImage(
        sourceCanvas,
        cropX, cropY, cropW, cropH,
        0, 0, cropW, cropH
    );

    const dataUrl = trimmedCanvas.toDataURL('image/png');
    const blob = await new Promise<Blob | null>((resolve) => {
        trimmedCanvas.toBlob(resolve, 'image/png');
    });

    return { blob, dataUrl };
}

/**
 * Überträgt den Inhalt eines Canvas skaliert auf ein anderes
 */
export function scaleCanvasContent(
    sourceCanvas: HTMLCanvasElement,
    targetCanvas: HTMLCanvasElement
): void {
    const targetCtx = targetCanvas.getContext('2d');
    if (!targetCtx || sourceCanvas.width === 0 || sourceCanvas.height === 0) return;
    targetCtx.drawImage(
        sourceCanvas,
        0, 0, sourceCanvas.width, sourceCanvas.height,
        0, 0, targetCanvas.width, targetCanvas.height
    );
}
