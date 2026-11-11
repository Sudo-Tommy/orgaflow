import { pb } from '$lib/services/pocketbase';
import { getMicroserviceHost } from '$lib/services/apiConfig';

export interface ScannedReceiptData {
    title?: string;
    amount?: number;
    date?: string;
    category?: string;
}

export async function processAndScanReceipt(file: File): Promise<{ compressedFile: File; data: ScannedReceiptData }> {
    const compressedFile = await new Promise<File>((resolve) => {
        if (!file.type.startsWith('image/')) return resolve(file);
        const reader = new FileReader();
        reader.onload = (event) => {
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
                const ctx = canvas.getContext('2d');
                if (ctx) ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob((blob) => {
                    if (blob) resolve(new File([blob], file.name.replace(/\.[^/.]+$/, '') + '.jpg', { type: 'image/jpeg' }));
                    else resolve(file);
                }, 'image/jpeg', 0.85);
            };
            img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
    });

    const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(compressedFile);
    });

    const microserviceUrl = getMicroserviceHost();
    const res = await fetch(`${microserviceUrl}/api/emails/ai/receipt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${pb.authStore.token}` },
        body: JSON.stringify({ imageBase64: base64, mimeType: compressedFile.type })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Fehler bei der KI-Analyse');

    const result: ScannedReceiptData = {};
    if (data.title) result.title = data.title;
    if (data.amount) result.amount = parseFloat(data.amount);
    if (data.date) result.date = data.date;
    if (data.category) result.category = data.category;

    return { compressedFile, data: result };
}
