// src/lib/utils/invoice.ts
export interface InvoicePayload {
    due_date_override?: boolean;
    paid_at?: string | boolean | null;
    id: string;
    invoice_nr: string;
    status: string;
    issue_date: string;
    due_date?: string;
    brutto: number;
    netto?: number;
    tax_sum?: number;
    client?: string | string[];
    company?: string | string[];
    expand?: {
        client?: any | any[];
        company?: any;
    };
    pdf?: string | string[];
    appointments?: string[] | any;
    is_cancellation?: boolean;
    cancellation_reason?: string;
    cancellation_nr?: string;
    reference_invoice_id?: string;
    dispute_hold?: boolean;
    paid_amount?: number;
    remaining_amount?: number;
    write_off_amount?: number;
    write_off_reason?: string;
    parent_invoice?: string;
    lexoffice_id?: string;
    lexoffice_voucher_status?: string;
    lexoffice_synced_at?: string;
    dunning_level?: number;
    last_reminder_date?: string;
    notes?: string;
    created?: string;
    updated?: string;
}

export interface SyncAction {
    id: string;
    action: 'updateStatus' | 'delete';
    payload?: any;
    timestamp: number;
}

export function getInvoiceTimestamp(inv: any): number {
    const rawDate = inv?.issue_date || inv?.created || '';
    if (!rawDate) return 0;
    const ms = new Date(rawDate).getTime();
    return Number.isNaN(ms) ? 0 : ms;
}

export function compareInvoicesByDateDesc(a: any, b: any): number {
    const diff = getInvoiceTimestamp(b) - getInvoiceTimestamp(a);
    if (diff !== 0) return diff;

    const createdA = a?.created ? new Date(a.created).getTime() : 0;
    const createdB = b?.created ? new Date(b.created).getTime() : 0;
    if (createdB !== createdA) return createdB - createdA;

    return String(b?.invoice_nr ?? '').localeCompare(String(a?.invoice_nr ?? ''), undefined, { numeric: true });
}
