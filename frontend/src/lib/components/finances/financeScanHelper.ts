import { pb } from "$lib/services/pocketbase";

export async function scanAndParseInvoiceFile(file: File): Promise<any> {
    const compressedFile = await new Promise<File>((resolve) => {
        if (!file.type.startsWith('image/')) return resolve(file);
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_SIZE = 1200;
                let width = img.width; let height = img.height;
                if (width > height && width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; }
                else if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; }
                canvas.width = width; canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (ctx) ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob((blob) => {
                    if (blob) resolve(new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", { type: 'image/jpeg' }));
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

    const isLocal = typeof window !== 'undefined' && !window.location.hostname.includes('ihre-seniorenassistenz.com') && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const microserviceUrl = isLocal ? `http://${window.location.hostname}:3000` : '';
    const res = await fetch(`${microserviceUrl}/api/emails/ai/receipt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${pb.authStore.token}` },
        body: JSON.stringify({ imageBase64: base64, mimeType: compressedFile.type })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Fehler bei der Dokumentenanalyse");
    return data;
}

export async function scanReceiptFile(file: File) {
    const data = await scanAndParseInvoiceFile(file);
    return {
        type: 'expense',
        title: data.title ? (data.supplier ? `${data.supplier}: ${data.title}` : data.title) : (data.supplier || 'Rechnungsbuchung'),
        amount: data.amount ? parseFloat(data.amount) : '',
        category: data.category || 'Miete / Büro',
        date: data.date || new Date().toISOString().split('T')[0],
        notes: `Automatisch per Beleg-Scan erfasst.\nAussteller: ${data.supplier || '-'}\nRechnungs-Nr.: ${data.invoice_nr || '-'}\nNetto: ${data.netto || '-'} € | MwSt: ${data.tax_sum || '-'} € (${data.tax_rate || '-'}%)`,
        is_installment: !!data.is_installment,
        installment_current: data.installment_current || '',
        installment_total_count: data.installment_total_count || '',
        installment_total_amount: data.installment_total_amount ? parseFloat(data.installment_total_amount) : '',
        status: 'gebucht'
    };
}
