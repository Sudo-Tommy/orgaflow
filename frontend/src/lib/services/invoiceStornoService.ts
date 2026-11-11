import { pb } from '$lib/services/pocketbase';
import { orgaStore } from '$lib/stores/orgaStore.svelte';
import { stampInvoiceAsStorniert } from './invoiceStornoStampService';
import { lexofficeService } from '$lib/services/lexofficeService.svelte';

export async function executeInvoiceStorno(invoice: any, reason: string, note: string): Promise<string> {
    const year = new Date().getFullYear();
    const originalNr = invoice.invoice_nr || `${Date.now()}`;
    const numPart = originalNr.replace(/^[A-Za-z]+-?(\d{4}-?)?/, '') || String(Math.floor(1000 + Math.random() * 9000));
    const stornoNr = `SR-${year}-${numPart.padStart(4, '0')}`;
    const fullReason = `${reason}${note.trim() ? ': ' + note.trim() : ''}`;

    const invertedPositions = (invoice.table_positions || []).map((pos: any, idx: number) => ({
        ...pos,
        pos: pos.pos || idx + 1,
        duration: pos.duration?.startsWith('-') ? pos.duration : `-${pos.duration}`,
        total: -Math.abs(Number(pos.total) || 0)
    }));

    const stornoPayload: any = {
        invoice_nr: stornoNr,
        cancellation_nr: stornoNr,
        is_cancellation: true,
        reference_invoice_id: invoice.id,
        cancellation_reason: fullReason,
        client: invoice.client,
        company: invoice.company,
        user: invoice.user,
        appointments: invoice.appointments,
        issue_date: new Date().toISOString(),
        due_date: new Date().toISOString(),
        paid_at: new Date().toISOString(),
        status: 'Abgeschlossen',
        tax_rate: invoice.tax_rate || 0,
        netto: -Math.abs(Number(invoice.netto) || 0),
        brutto: -Math.abs(Number(invoice.brutto) || 0),
        tax_sum: -Math.abs(Number(invoice.tax_sum) || 0),
        table_positions: invertedPositions,
        notes: `Stornorechnung zu Rechnung ${originalNr}. Grund: ${fullReason}`
    };

    const createdStorno = await pb.collection('invoices').create(stornoPayload);
    await pb.collection('invoices').update(invoice.id, {
        status: 'Storniert',
        cancellation_nr: stornoNr,
        cancellation_reason: fullReason
    });
    await stampInvoiceAsStorniert(invoice.id);

    lexofficeService.notifyInvoiceAction('storno', {
        invoiceId: invoice.id,
        invoiceData: invoice,
        replacementInvoiceId: createdStorno.id
    });

    if (orgaStore.invoices) {
        const idx = orgaStore.invoices.data.findIndex((i: any) => i.id === invoice.id);
        if (idx !== -1) {
            orgaStore.invoices.data[idx].status = 'Storniert';
            orgaStore.invoices.data[idx].cancellation_nr = stornoNr;
        }
        orgaStore.invoices.data.unshift(createdStorno as any);
    }

    return createdStorno.id;
}
