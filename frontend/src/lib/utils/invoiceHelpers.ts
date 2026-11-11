import type { InvoicePayload } from "$lib/utils/invoice";
import { orgaStore } from "$lib/stores/orgaStore.svelte";

export function getClient(record: InvoicePayload) {
    const fromExpand = Array.isArray(record.expand?.client) ? record.expand.client[0] : record.expand?.client;
    if (fromExpand) return fromExpand;
    const clientId = Array.isArray(record.client) ? record.client[0] : record.client;
    if (clientId && (orgaStore.clients?.data as any[])) {
        return (orgaStore.clients.data as any[]).find(c => c.id === clientId);
    }
    return undefined;
}

export function getPdfUrl(record: InvoicePayload, index: number, pbInstance: any) {
    if (!record.pdf || (Array.isArray(record.pdf) && record.pdf.length === 0)) return null;
    let url: string | null = null;
    if (Array.isArray(record.pdf)) {
        if (index < record.pdf.length) {
            url = pbInstance.files.getURL(record, record.pdf[index]);
        }
    } else {
        url = index === 0 ? pbInstance.files.getURL(record, record.pdf) : null;
    }
    if (url) {
        const params: string[] = [];
        if (pbInstance?.authStore?.token) {
            params.push('token=' + pbInstance.authStore.token);
        }
        if (record.updated) {
            params.push('v=' + encodeURIComponent(record.updated));
        }
        if (params.length > 0) {
            url += (url.includes('?') ? '&' : '?') + params.join('&');
        }
    }
    return url;
}

export function getStatusClass(status: string) {
    switch (status) {
        case 'Entwurf': 
            return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700';
        case 'Eingereicht': 
            return 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800';
        case 'In Bearbeitung': 
            return 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800';
        case 'Teilweise bezahlt': 
            return 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800';
        case 'Abgeschlossen': 
            return 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800';
        case 'Abgelehnt':
        case 'Storniert': 
            return 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800';
        default: 
            return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700';
    }
}
