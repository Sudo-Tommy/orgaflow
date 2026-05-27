// src/lib/utils/invoiceHelpers.ts
import type { InvoicePayload } from "$lib/utils/invoice";

export function getClient(record: InvoicePayload) {
    return Array.isArray(record.expand?.client) ? record.expand.client[0] : record.expand?.client;
}

export function getPdfUrl(record: InvoicePayload, index: number, pbInstance: any) {
    if (!record.pdf || record.pdf.length === 0) return null;
    if (Array.isArray(record.pdf)) {
        if (index < record.pdf.length) {
            return pbInstance.files.getURL(record, record.pdf[index]);
        }
        return null;
    }
    return index === 0 ? pbInstance.files.getURL(record, record.pdf) : null;
}

export function getStatusClass(status: string) {
    switch (status) {
        case 'Entwurf': return 'bg-neutral-100 text-neutral-600 border border-neutral-200';
        case 'Eingereicht': return 'bg-blue-100 text-blue-700 border border-blue-200';
        case 'In Bearbeitung': return 'bg-amber-100 text-amber-700 border border-amber-200';
        case 'Abgeschlossen': return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
        case 'Abgelehnt':
        case 'Storniert': return 'bg-rose-100 text-rose-700 border border-rose-200';
        default: return 'bg-neutral-100 text-neutral-600 border border-neutral-200';
    }
}