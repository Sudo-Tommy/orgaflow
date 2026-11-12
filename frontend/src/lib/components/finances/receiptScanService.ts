import { pb } from '$lib/services/pocketbase';
import { getMicroserviceHost } from '$lib/services/apiConfig';
import { recognizeTextOnDevice } from '$lib/services/ocr/ocrEngine';
import { parseDocumentOcrText } from '$lib/services/ocr/receiptParser';

export interface ScannedReceiptData {
    title?: string;
    supplier?: string;
    amount?: number;
    netto?: number;
    tax_rate?: number;
    tax_sum?: number;
    invoice_nr?: string;
    iban?: string;
    date?: string;
    category?: string;
    source?: 'ocr' | 'ai';
}

function compressReceiptImage(file: File): Promise<{ compressedFile: File; dataUrl: string }> {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const rawUrl = String(event.target?.result || '');
            if (!file.type.startsWith('image/')) {
                resolve({ compressedFile: file, dataUrl: rawUrl });
                return;
            }
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_SIZE = 1200;
                let width = img.width;
                let height = img.height;
                if (width > height && width > MAX_SIZE) {
                    height *= MAX_SIZE / width;
                    width = MAX_SIZE;
                } else if (height > MAX_SIZE) {
                    width *= MAX_SIZE / height;
                    height = MAX_SIZE;
                }
                canvas.width = width;
                canvas.height = height;
                canvas.getContext('2d')?.drawImage(img, 0, 0, width, height);
                const outUrl = canvas.toDataURL('image/jpeg', 0.85);
                canvas.toBlob((blob) => {
                    if (blob) {
                        resolve({
                            compressedFile: new File([blob], file.name.replace(/\.[^/.]+$/, '') + '.jpg', { type: 'image/jpeg' }),
                            dataUrl: outUrl
                        });
                    } else {
                        resolve({ compressedFile: file, dataUrl: outUrl });
                    }
                }, 'image/jpeg', 0.85);
            };
            img.src = rawUrl;
        };
        reader.readAsDataURL(file);
    });
}

export async function processAndScanReceipt(file: File): Promise<{ compressedFile: File; data: ScannedReceiptData }> {
    const { compressedFile, dataUrl } = await compressReceiptImage(file);
    const result: ScannedReceiptData = {};

    // 1. Immer zuerst lokale OCR-Erkennung auf dem Gerät probieren
    if (compressedFile.type.startsWith('image/')) {
        const ocr = await recognizeTextOnDevice({ dataUrl });
        if (ocr?.text) {
            const p = parseDocumentOcrText(ocr.text);
            if (p.supplier) { result.supplier = p.supplier; result.title = p.supplier; }
            if (p.amount) result.amount = p.amount;
            if (p.netto) result.netto = p.netto;
            if (p.taxRate) result.tax_rate = p.taxRate;
            if (p.taxSum) result.tax_sum = p.taxSum;
            if (p.invoiceNumber) result.invoice_nr = p.invoiceNumber;
            if (p.iban) result.iban = p.iban;
            if (p.date) result.date = p.date;
            result.source = 'ocr';
            if (p.confidence >= 0.8 || (typeof navigator !== 'undefined' && !navigator.onLine)) {
                return { compressedFile, data: result };
            }
        }
    }

    // 2. Fallback / Verfeinerung per KI (nur wenn online)
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
        return { compressedFile, data: result };
    }

    const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
    const microserviceUrl = getMicroserviceHost();
    const res = await fetch(`${microserviceUrl}/api/emails/ai/receipt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${pb.authStore.token}` },
        body: JSON.stringify({ imageBase64: base64, mimeType: compressedFile.type })
    });

    const data = await res.json();
    if (!res.ok) {
        if (result.amount || result.supplier) return { compressedFile, data: result };
        throw new Error(data.error || 'Beleg konnte nicht gelesen werden.');
    }

    if (data.title) result.title = data.title;
    if (data.supplier) result.supplier = data.supplier;
    if (data.amount) result.amount = parseFloat(data.amount);
    if (data.netto) result.netto = parseFloat(data.netto);
    if (data.tax_rate) result.tax_rate = parseFloat(data.tax_rate);
    if (data.tax_sum) result.tax_sum = parseFloat(data.tax_sum);
    if (data.invoice_nr) result.invoice_nr = data.invoice_nr;
    if (data.date) result.date = data.date;
    if (data.category) result.category = data.category;
    result.source = 'ai';

    return { compressedFile, data: result };
}
