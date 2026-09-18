// src/lib/types/invoice.ts
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
}

export interface SyncAction {
    id: string;
    action: 'updateStatus' | 'delete';
    payload?: any;
    timestamp: number;
}