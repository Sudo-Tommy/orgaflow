import { orgaStore } from '$lib/stores/orgaStore.svelte';
import type { InvoiceRecord } from '$lib/types/orgaTypes';

export interface SettlePaymentParams {
    invoice: InvoiceRecord;
    receivedAmount: number;
    paymentDate: string; // ISO date string
    referenceNr?: string;
    notes?: string;
}

export interface SettleDisputeParams extends SettlePaymentParams {
    differenceAmount: number;
}

export interface SettleBillClientParams extends SettlePaymentParams {
    differenceAmount: number;
}

export interface SettleWriteOffParams extends SettlePaymentParams {
    differenceAmount: number;
    reason: string;
}

/**
 * Erzeugt eine Privatrechnungsnummer basierend auf der Elternrechnung.
 * Format: "999/2026" → "999/2026-P1", bei mehreren "-P2", "-P3" usw.
 */
export function generatePrivatInvoiceNr(parentNr: string): string {
    const invoices = orgaStore.invoices?.data || [];
    const baseNr = parentNr.replace(/-P\d*$/, '');
    let maxSuffix = 0;

    for (const inv of invoices) {
        const nr = (inv as any).invoice_nr || '';
        if (nr.startsWith(`${baseNr}-P`)) {
            const suffixMatch = nr.match(/-P(\d+)$/);
            const suffixNum = suffixMatch ? parseInt(suffixMatch[1], 10) : 1;
            if (suffixNum > maxSuffix) maxSuffix = suffixNum;
        }
    }
    return `${baseNr}-P${maxSuffix + 1}`;
}

/**
 * Extrahiert Relation-IDs als flaches Array (für Multi-Relation-Felder mit maxSelect: 0).
 * Unterstützt: String, String-Array und expandierte Objekte.
 */
export function extractRelationArray(field: any, expandedField?: any): string[] {
    if (Array.isArray(field)) {
        return field.filter((v: any) => typeof v === 'string' && v.length > 0);
    }
    if (typeof field === 'string' && field.length > 0) {
        return [field];
    }
    // Fallback über expand
    if (expandedField) {
        const expanded = Array.isArray(expandedField) ? expandedField : [expandedField];
        return expanded.map((e: any) => e?.id).filter(Boolean);
    }
    return [];
}
