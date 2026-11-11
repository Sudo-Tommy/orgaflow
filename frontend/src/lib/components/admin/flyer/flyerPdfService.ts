import { toastStore } from '$lib/services/toastService.svelte';
import type { Sheet } from './flyerTypes';

export function getMarketingPdfUrl(): string {
    const isLocal = typeof window !== 'undefined' && 
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    return isLocal ? 'http://localhost:3000/api/emails/generate-marketing-pdf' : '/api/emails/generate-marketing-pdf';
}

export async function requestMarketingPdf(payload: any): Promise<Response> {
    const primaryUrl = getMarketingPdfUrl();
    try {
        const res = await fetch(primaryUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (res.ok) return res;
        console.warn(`Primary PDF endpoint ${primaryUrl} returned status ${res.status}, trying fallback...`);
    } catch (e) {
        console.warn(`Primary PDF endpoint ${primaryUrl} failed, trying fallback...`, e);
    }
    return fetch('/api/generate-marketing-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
}

export async function downloadFlyerPdf(sheets: Sheet[]): Promise<void> {
    try {
        const res = await requestMarketingPdf({ format: 'flyer', sheets });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || "Fehler bei der PDF-Generierung.");
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Flyer-Seniorenassistenz-Wickelfalz.pdf';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
        toastStore.success("Flyer-PDF erfolgreich heruntergeladen!");
    } catch (e: any) {
        console.error("Flyer PDF Fehler:", e);
        toastStore.error("PDF-Download des Flyers fehlgeschlagen.");
        throw e;
    }
}

export async function openFlyerPreview(sheets: Sheet[], previewModal: any): Promise<void> {
    try {
        const res = await requestMarketingPdf({ format: 'flyer', sheets });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || "Fehler bei der PDF-Generierung.");
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        previewModal?.open(url, "Flyer 6-Seiter (Wickelfalz)", "Flyer-Seniorenassistenz-Wickelfalz.pdf");
    } catch (e: any) {
        console.error("Flyer Vorschau Fehler:", e);
        toastStore.error("Vorschau konnte nicht geladen werden.");
        throw e;
    }
}

export function printFlyer(): void {
    const styleId = 'dynamic-flyer-print-style';
    let styleEl = document.getElementById(styleId);
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = styleId;
        document.head.appendChild(styleEl);
    }
    styleEl.textContent = `
        @page { size: A4 landscape; margin: 0; }
        @media print {
            body { margin: 0 !important; padding: 0 !important; background: white !important; }
        }
    `;
    window.print();
}
