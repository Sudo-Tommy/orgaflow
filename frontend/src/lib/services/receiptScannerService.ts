import { pb } from "./pocketbase";
import { getMicroserviceHost } from "$lib/services/apiConfig";
import { recognizeTextOnDevice } from "$lib/services/ocr/ocrEngine";
import { parseDocumentOcrText } from "$lib/services/ocr/receiptParser";

export interface ReceiptScanResult {
    croppedFile: File;
    previewUrl: string;
    detectedTitle?: string;
    detectedAmount?: number;
    detectedSupplier?: string;
}

export async function processReceiptCanvas(
    sourceCanvas: HTMLCanvasElement,
    existingTitle = "",
    existingSum: number | "" = ""
): Promise<ReceiptScanResult | null> {
    const compCanvas = document.createElement('canvas');
    const MAX_SIZE = 1600;
    let cWidth = sourceCanvas.width;
    let cHeight = sourceCanvas.height;
    if (cWidth > cHeight && cWidth > MAX_SIZE) {
        cHeight *= MAX_SIZE / cWidth;
        cWidth = MAX_SIZE;
    } else if (cHeight > MAX_SIZE) {
        cWidth *= MAX_SIZE / cHeight;
        cHeight = MAX_SIZE;
    }
    compCanvas.width = cWidth;
    compCanvas.height = cHeight;
    compCanvas.getContext('2d')?.drawImage(sourceCanvas, 0, 0, cWidth, cHeight);

    const dataUrl = compCanvas.toDataURL('image/jpeg', 0.85);
    const base64 = dataUrl.split(',')[1];

    // 1. Offline-OCR direkt auf dem Gerät (schnell & ohne Netz)
    const localOcr = await recognizeTextOnDevice({ dataUrl });
    const parsedLocal = localOcr?.text ? parseDocumentOcrText(localOcr.text) : null;

    let cropBounds = [0, 0, 1000, 1000];
    let aiData: any = null;

    const isOnline = typeof navigator === 'undefined' || navigator.onLine;
    const needsAi = isOnline && (!parsedLocal || parsedLocal.confidence < 0.8);

    if (needsAi) {
        try {
            const microserviceUrl = getMicroserviceHost();
            const res = await fetch(`${microserviceUrl}/api/emails/ai/receipt`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${pb.authStore.token}`
                },
                body: JSON.stringify({ imageBase64: base64, mimeType: 'image/jpeg' })
            });

            if (res.ok) {
                aiData = await res.json();
                if (Array.isArray(aiData?.box_2d) && aiData.box_2d.length === 4) {
                    cropBounds = aiData.box_2d;
                }
            }
        } catch (aiErr) {
            console.warn("KI-Analyse nicht erreichbar, nutze lokale Texterkennung:", aiErr);
        }
    }

    let [ymin, xmin, ymax, xmax] = cropBounds;
    ymin = Math.max(0, Math.min(1000, Number(ymin) || 0));
    xmin = Math.max(0, Math.min(1000, Number(xmin) || 0));
    ymax = Math.max(0, Math.min(1000, Number(ymax) || 1000));
    xmax = Math.max(0, Math.min(1000, Number(xmax) || 1000));

    if ((xmax - xmin) / 1000 >= 0.98 && (ymax - ymin) / 1000 >= 0.98) {
        xmin = 50; xmax = 950; ymin = 50; ymax = 950;
    }

    const padX = cWidth * 0.015;
    const padY = cHeight * 0.015;
    const sx = Math.max(0, (xmin / 1000) * cWidth - padX);
    const sy = Math.max(0, (ymin / 1000) * cHeight - padY);
    const sw = Math.min(cWidth - sx, ((xmax - xmin) / 1000) * cWidth + padX * 2);
    const sh = Math.min(cHeight - sy, ((ymax - ymin) / 1000) * cHeight + padY * 2);

    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = sw;
    cropCanvas.height = sh;
    const cropCtx = cropCanvas.getContext('2d');
    if (!cropCtx) return null;

    cropCtx.drawImage(compCanvas, sx, sy, sw, sh, 0, 0, sw, sh);
    const blob = await new Promise<Blob | null>((resolve) => cropCanvas.toBlob(resolve, 'image/jpeg', 0.88));
    if (!blob) return null;

    const croppedFile = new File([blob], `beleg_scan_${Date.now()}.jpg`, { type: 'image/jpeg' });
    const previewUrl = URL.createObjectURL(croppedFile);

    const supplier = aiData?.supplier || parsedLocal?.supplier;
    const rawTitle = aiData?.title || parsedLocal?.supplier;
    const rawAmount = aiData?.amount !== undefined ? parseFloat(aiData.amount) : parsedLocal?.amount;

    let detectedTitle: string | undefined;
    if (!existingTitle.trim()) {
        if (aiData?.title && supplier && aiData.title !== supplier) detectedTitle = `${supplier}: ${aiData.title}`;
        else if (rawTitle) detectedTitle = rawTitle;
    }

    const detectedAmount = (existingSum === "" || existingSum === 0) && rawAmount && !isNaN(rawAmount)
        ? rawAmount
        : undefined;

    return {
        croppedFile,
        previewUrl,
        detectedTitle,
        detectedAmount,
        detectedSupplier: supplier
    };
}
