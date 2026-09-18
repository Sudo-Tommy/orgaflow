import { pb } from '$lib/services/pocketbase';
import { orgaStore } from '$lib/stores/orgaStore.svelte';
import { toastStore } from '$lib/services/toastService.svelte';
import { 
    syncSettlementPaymentToAccounting, 
    syncWriteOffToAccounting 
} from '$lib/services/invoiceAccountingService';
import type { InvoiceRecord, InvoiceAdjustmentActionType, InvoiceStatus } from '$lib/types/orgaTypes';

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
 * Service to execute the 2-step settlement workflow for invoices
 */
export const invoiceSettlementService = {
    /**
     * 1. Vollständige Bezahlung
     */
    async settleFullPayment(params: SettlePaymentParams): Promise<void> {
        const { invoice, receivedAmount, paymentDate, referenceNr, notes } = params;
        const invoiceId = invoice.id;
        const totalGross = Number(invoice.brutto) || receivedAmount;

        const payload: Partial<InvoiceRecord> = {
            status: 'Abgeschlossen' as InvoiceStatus,
            paid_amount: totalGross,
            remaining_amount: 0,
            write_off_amount: 0,
            dispute_hold: false,
            paid_at: paymentDate
        };

        // 1. Update Invoice in PocketBase
        await pb.collection('invoices').update(invoiceId, payload);

        // 2. Log Adjustment in invoice_adjustments
        await this.logAdjustment(invoiceId, 'full_payment', totalGross, 0, referenceNr, notes);

        // 3. Accounting sync
        await syncSettlementPaymentToAccounting(invoice, totalGross, paymentDate);

        // 4. Update local Store
        this.updateLocalInvoiceStore(invoiceId, payload);

        toastStore.success(`Rechnung ${invoice.invoice_nr || ''} als vollständig bezahlt verbucht.`);
    },

    /**
     * 2. Schritt 2: Option 1 – Widerspruch einlegen (Kürzung unberechtigt)
     */
    async settleDispute(params: SettleDisputeParams): Promise<void> {
        const { invoice, receivedAmount, differenceAmount, paymentDate, referenceNr, notes } = params;
        const invoiceId = invoice.id;

        const payload: Partial<InvoiceRecord> = {
            status: 'Teilweise bezahlt' as InvoiceStatus,
            paid_amount: receivedAmount,
            remaining_amount: differenceAmount,
            dispute_hold: true,
            paid_at: paymentDate
        };

        // 1. Update Invoice
        await pb.collection('invoices').update(invoiceId, payload);

        // 2. Log Adjustment
        await this.logAdjustment(invoiceId, 'dispute', receivedAmount, differenceAmount, referenceNr, notes);

        // 3. Create 14-day task for dispute resolution
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 14);

        const clientId = Array.isArray(invoice.client) 
            ? invoice.client[0] 
            : (typeof invoice.client === 'string' ? invoice.client : invoice.expand?.client?.id || '');

        const taskPayload = {
            title: `Widerspruch Kassenkürzung - Rg. ${invoice.invoice_nr || invoiceId} (${differenceAmount.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })})`,
            description: [
                `Kürzung durch Kostenträger erhalten. Mahnstopp aktiviert.`,
                referenceNr ? `Aktenzeichen / Bescheid-Nr.: ${referenceNr}` : '',
                `Erhalten: ${receivedAmount.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}`,
                `Kürzungsbetrag / Restforderung: ${differenceAmount.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}`,
                notes ? `Kürzungsbegründung / Vermerk: ${notes}` : '',
                `14-Tage-Frist zur Klärung und Einlegung des Widerspruchs beachten!`
            ].filter(Boolean).join('\n'),
            due_date: dueDate.toISOString(),
            status: 'Offen',
            client: clientId || null,
            related_invoice: invoiceId
        };

        try {
            await pb.collection('tasks').create(taskPayload);
            toastStore.info("Nachforderungs-Aufgabe mit 14-Tage-Frist angelegt.");
        } catch (err) {
            console.error("Fehler beim Erstellen der Fristaufgabe:", err);
        }

        // 4. Sync received revenue to accounting
        if (receivedAmount > 0) {
            await syncSettlementPaymentToAccounting(invoice, receivedAmount, paymentDate);
        }

        // 5. Update local Store
        this.updateLocalInvoiceStore(invoiceId, payload);

        toastStore.success(`Teilzahlung verbucht. Mahnstopp für Rechnung ${invoice.invoice_nr || ''} aktiviert.`);
    },

    /**
     * 3. Schritt 2: Option 2 – Privat an Klienten weiterberechnen
     */
    async settleBillClientPrivat(params: SettleBillClientParams): Promise<{ newInvoiceId: string }> {
        const { invoice, receivedAmount, differenceAmount, paymentDate, referenceNr, notes } = params;
        const invoiceId = invoice.id;

        // 1. Ursprüngliche Kassenrechnung abschließen
        const originalPayload: Partial<InvoiceRecord> = {
            status: 'Abgeschlossen' as InvoiceStatus,
            paid_amount: receivedAmount,
            remaining_amount: 0,
            dispute_hold: false,
            paid_at: paymentDate
        };
        await pb.collection('invoices').update(invoiceId, originalPayload);

        // 2. Log Adjustment
        await this.logAdjustment(invoiceId, 'bill_client_privat', receivedAmount, differenceAmount, referenceNr, notes);

        // 3. Neue Privatrechnung im Entwurf anlegen
        const clientId = Array.isArray(invoice.client) 
            ? invoice.client[0] 
            : (typeof invoice.client === 'string' ? invoice.client : invoice.expand?.client?.id || '');

        const parentNr = invoice.invoice_nr || 'Kasse';
        const newInvoiceNr = `${parentNr}-P`;

        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 14);

        const newInvoicePayload: any = {
            status: 'Entwurf',
            parent_invoice: invoiceId,
            client: clientId || null,
            user: invoice.user || pb.authStore.model?.id,
            company: invoice.company || null,
            invoice_nr: newInvoiceNr,
            issue_date: new Date().toISOString(),
            due_date: dueDate.toISOString(),
            brutto: differenceAmount,
            netto: differenceAmount,
            tax_sum: 0,
            tax_rate: '0',
            notes: `Weiterberechnung Kassenkürzung zu Rechnung ${parentNr}.${referenceNr ? ` Aktenzeichen: ${referenceNr}.` : ''}${notes ? ` Vermerk: ${notes}` : ''}`,
            table_positions: [
                {
                    title: `Kassenkürzung / Eigenanteil zu Rechnung ${parentNr}`,
                    description: `Differenzbetrag / Nicht anerkannte Leistung aus Rechnung ${parentNr}${referenceNr ? ` (Az. ${referenceNr})` : ''}`,
                    quantity: 1,
                    price: differenceAmount,
                    total: differenceAmount
                }
            ]
        };

        const createdRecord = await pb.collection('invoices').create(newInvoicePayload);

        // 4. Accounting sync für Kassenrechnung
        if (receivedAmount > 0) {
            await syncSettlementPaymentToAccounting(invoice, receivedAmount, paymentDate);
        }

        // 5. Update local Store
        this.updateLocalInvoiceStore(invoiceId, originalPayload);
        if (orgaStore.invoices) {
            orgaStore.invoices.data.unshift(createdRecord as any);
        }

        toastStore.success(`Ursprungsrechnung abgeschlossen. Neue Privatrechnung ${newInvoiceNr} im Entwurf erstellt.`);
        return { newInvoiceId: createdRecord.id };
    },

    /**
     * 4. Schritt 2: Option 3 – Als Verlust ausbuchen (Kürzung akzeptieren)
     */
    async settleWriteOff(params: SettleWriteOffParams): Promise<void> {
        const { invoice, receivedAmount, differenceAmount, reason, paymentDate, referenceNr, notes } = params;
        const invoiceId = invoice.id;
        const finalReason = reason || notes || referenceNr || 'Kürzung durch Kostenträger akzeptiert';

        const payload: Partial<InvoiceRecord> = {
            status: 'Abgeschlossen' as InvoiceStatus,
            paid_amount: receivedAmount,
            remaining_amount: 0,
            write_off_amount: differenceAmount,
            write_off_reason: finalReason,
            dispute_hold: false,
            paid_at: paymentDate
        };

        // 1. Update Invoice
        await pb.collection('invoices').update(invoiceId, payload);

        // 2. Log Adjustment
        await this.logAdjustment(invoiceId, 'write_off', receivedAmount, differenceAmount, referenceNr, finalReason);

        // 3. Sync received revenue to accounting
        if (receivedAmount > 0) {
            await syncSettlementPaymentToAccounting(invoice, receivedAmount, paymentDate);
        }

        // 4. Sync write-off correction expense to accounting
        if (differenceAmount > 0) {
            await syncWriteOffToAccounting(invoice, differenceAmount, finalReason, paymentDate);
        }

        // 5. Update local Store
        this.updateLocalInvoiceStore(invoiceId, payload);

        toastStore.success(`Rechnung abgeschlossen. Differenz (${differenceAmount.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}) wurde als Verlust ausgebucht.`);
    },

    /**
     * Revisionssichere Protokollierung in invoice_adjustments
     */
    async logAdjustment(
        invoiceId: string, 
        actionType: InvoiceAdjustmentActionType, 
        receivedAmount: number, 
        differenceAmount: number, 
        referenceNr?: string, 
        notes?: string
    ): Promise<void> {
        try {
            const currentUserId = pb.authStore.model?.id || null;
            await pb.collection('invoice_adjustments').create({
                invoice: invoiceId,
                action_type: actionType,
                received_amount: receivedAmount,
                difference_amount: differenceAmount,
                reference_nr: referenceNr || '',
                notes: notes || '',
                createdby: currentUserId
            });
        } catch (err) {
            console.error("Fehler beim Protokollieren in invoice_adjustments:", err);
        }
    },

    /**
     * Schnelle lokale Store-Aktualisierung für flackerfreie UI
     */
    updateLocalInvoiceStore(id: string, updates: Partial<InvoiceRecord>): void {
        const invStore = orgaStore.invoices;
        if (!invStore) return;
        const idx = invStore.data.findIndex((i: any) => i.id === id);
        if (idx !== -1) {
            invStore.data[idx] = {
                ...invStore.data[idx],
                ...updates
            } as any;
        }
    }
};
