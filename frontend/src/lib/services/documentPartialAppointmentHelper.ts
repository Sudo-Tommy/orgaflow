import { orgaStore } from '$lib/stores/orgaStore.svelte';
import { safeString, formatMoney } from './documentInvoiceCalculations';

export interface PartialPositionResult {
    pos: number;
    date: string;
    duration: string;
    title: string;
    price: string;
    total: number;
    itemType: string;
}

export function isPartialAppointment(app: any): boolean {
    return Number(app?.remaining_amount || 0) > 0;
}

export function getParentInvoiceNumber(app: any): string {
    if (app.expand?.parent_invoice?.invoice_nr) {
        return app.expand.parent_invoice.invoice_nr;
    }
    const parentId = typeof app.parent_invoice === 'string' ? app.parent_invoice : app.parent_invoice?.id;
    if (parentId && orgaStore.invoices?.data) {
        const found = orgaStore.invoices.data.find((i: any) => i.id === parentId);
        if (found?.invoice_nr) return found.invoice_nr;
    }
    return '';
}

export function buildPartialAppointmentPosition(app: any, posCounter: number): PartialPositionResult {
    const parentNr = getParentInvoiceNumber(app);
    const parentRef = parentNr ? `aus Rg. ${parentNr}` : 'aus Kassenkürzung';
    const appDate = app.appointment
        ? new Date(app.appointment).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
        : '';
    const desc = app.description || app.title || 'Alltagshilfe';
    const titleDesc = `Restbetrag ${parentRef} (${appDate}): ${desc}`;
    const restAmount = Math.round(Number(app.remaining_amount || 0) * 100) / 100;

    return {
        pos: posCounter,
        date: appDate,
        duration: "1,00",
        title: safeString(titleDesc, 65),
        price: `${formatMoney(restAmount)} €`,
        total: restAmount,
        itemType: 'partial_rest'
    };
}
