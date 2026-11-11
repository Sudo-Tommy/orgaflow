import { pb } from "./pocketbase";
import { getMicroserviceHost } from "$lib/services/apiConfig";

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
    const videoWidth = sourceCanvas.width;
    const videoHeight = sourceCanvas.height;

    // Scale for AI analysis (max 1600px)
    const compCanvas = document.createElement('canvas');
    const MAX_SIZE = 1600;
    let cWidth = videoWidth;
    let cHeight = videoHeight;
    if (cWidth > cHeight && cWidth > MAX_SIZE) {
        cHeight *= MAX_SIZE / cWidth;
        cWidth = MAX_SIZE;
    } else if (cHeight > MAX_SIZE) {
        cWidth *= MAX_SIZE / cHeight;
        cHeight = MAX_SIZE;
    }
    compCanvas.width = cWidth;
    compCanvas.height = cHeight;
    const compCtx = compCanvas.getContext('2d');
    if (compCtx) compCtx.drawImage(sourceCanvas, 0, 0, cWidth, cHeight);

    const base64 = compCanvas.toDataURL('image/jpeg', 0.85).split(',')[1];

    let cropBounds = [0, 0, 1000, 1000];
    let aiData: any = null;

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
        console.warn("KI-Kantenerkennung nicht erreichbar, nutze Standard-Sucherbereich:", aiErr);
    }

    let [ymin, xmin, ymax, xmax] = cropBounds;
    ymin = Math.max(0, Math.min(1000, Number(ymin) || 0));
    xmin = Math.max(0, Math.min(1000, Number(xmin) || 0));
    ymax = Math.max(0, Math.min(1000, Number(ymax) || 1000));
    xmax = Math.max(0, Math.min(1000, Number(xmax) || 1000));

    const widthFrac = (xmax - xmin) / 1000;
    const heightFrac = (ymax - ymin) / 1000;

    if (widthFrac >= 0.98 && heightFrac >= 0.98) {
        xmin = 50;
        xmax = 950;
        ymin = 50;
        ymax = 950;
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

    const scanFileName = `beleg_scan_${Date.now()}.jpg`;
    const croppedFile = new File([blob], scanFileName, { type: 'image/jpeg' });
    const previewUrl = URL.createObjectURL(croppedFile);

    let detectedTitle: string | undefined;
    let detectedAmount: number | undefined;

    if (aiData) {
        if (aiData.title && !existingTitle.trim()) {
            detectedTitle = aiData.supplier ? `${aiData.supplier}: ${aiData.title}` : aiData.title;
        } else if (aiData.supplier && !existingTitle.trim()) {
            detectedTitle = aiData.supplier;
        }
        if (aiData.amount && (existingSum === "" || existingSum === 0)) {
            const parsed = parseFloat(aiData.amount);
            if (!isNaN(parsed)) detectedAmount = parsed;
        }
    }

    return {
        croppedFile,
        previewUrl,
        detectedTitle,
        detectedAmount,
        detectedSupplier: aiData?.supplier
    };
}
