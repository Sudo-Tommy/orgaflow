// src/lib/types/invoice.ts
export interface InvoicePayload {
    due_date_override: boolean;
    paid_at: boolean;
    id: string;
    invoice_nr: string;
    status: string;
    issue_date: string;
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
}

export interface SyncAction {
    id: string;
    action: 'updateStatus' | 'delete';
    payload?: any;
    timestamp: number;
}