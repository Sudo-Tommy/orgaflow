import { pb } from '$lib/services/pocketbase';
import { orgaStore } from '$lib/stores/orgaStore.svelte';
import { toastStore } from '$lib/services/toastService.svelte';
import { 
    syncSettlementPaymentToAccounting, 
    syncWriteOffToAccounting 
} from '$lib/services/invoiceAccountingService';
import type { InvoiceRecord, InvoiceAdjustmentActionType, InvoiceStatus } from '$lib/types/orgaTypes';
import { 
    extractRelationArray,
    type SettlePaymentParams,
    type SettleDisputeParams,
    type SettleBillClientParams,
    type SettleWriteOffParams
} from '$lib/services/invoiceSettlementHelpers';
import {
    fetchInvoiceAppointments,
    computeFifoAllocation,
    applyAppointmentUpdates
} from '$lib/services/invoiceSettlementPartialHelper';

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

        await pb.collection('invoices').update(invoiceId, payload);
        await this.logAdjustment(invoiceId, 'full_payment', totalGross, 0, referenceNr, notes);
        await syncSettlementPaymentToAccounting(invoice, totalGross, paymentDate);
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

        await pb.collection('invoices').update(invoiceId, payload);
        await this.logAdjustment(invoiceId, 'dispute', receivedAmount, differenceAmount, referenceNr, notes);

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

        if (receivedAmount > 0) {
            await syncSettlementPaymentToAccounting(invoice, receivedAmount, paymentDate);
        }

        this.updateLocalInvoiceStore(invoiceId, payload);
        toastStore.success(`Teilzahlung verbucht. Mahnstopp für Rechnung ${invoice.invoice_nr || ''} aktiviert.`);
    },

    /**
     * 3. Schritt 2: Option 2 – Privat an Klienten weiterberechnen (FIFO-Hinterlegung am Termin)
     */
    async settleBillClientPrivat(params: SettleBillClientParams): Promise<{ newInvoiceId: string; clientId: string }> {
        const { invoice, receivedAmount, differenceAmount, paymentDate, referenceNr, notes } = params;
        const invoiceId = invoice.id;
        const totalGross = Number(invoice.brutto) || (receivedAmount + differenceAmount);

        // 1. Zugehörige Termine laden & FIFO Aufteilung berechnen
        const apps = await fetchInvoiceAppointments(invoice);
        const updates = computeFifoAllocation(apps, totalGross, receivedAmount, invoice);

        // 2. Termine in PocketBase und Store mit remaining_amount & parent_invoice aktualisieren
        if (updates.length > 0) {
            await applyAppointmentUpdates(updates, invoice);
        }

        // 3. Ursprüngliche Kassenrechnung abschließen
        const originalPayload: Partial<InvoiceRecord> = {
            status: 'Abgeschlossen' as InvoiceStatus,
            paid_amount: receivedAmount,
            remaining_amount: 0,
            dispute_hold: false,
            paid_at: paymentDate,
            notes: [
                invoice.notes,
                `Kassenkürzung: ${differenceAmount.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })} per FIFO an Termine übertragen.`,
                referenceNr ? `Bescheid-Az.: ${referenceNr}` : '',
                notes ? `Vermerk: ${notes}` : ''
            ].filter(Boolean).join('\n')
        };
        await pb.collection('invoices').update(invoiceId, originalPayload);

        // 4. Log Adjustment
        await this.logAdjustment(invoiceId, 'bill_client_privat', receivedAmount, differenceAmount, referenceNr, notes);

        // 5. Accounting sync für erhaltenen Teilbetrag
        if (receivedAmount > 0) {
            await syncSettlementPaymentToAccounting(invoice, receivedAmount, paymentDate);
        }

        // 6. Update local Store
        this.updateLocalInvoiceStore(invoiceId, originalPayload);

        const clientArr = extractRelationArray(invoice.client, invoice.expand?.client);
        const firstClientId = clientArr[0] || '';

        toastStore.success(`Kassenrechnung abgeschlossen. Restbetrag (${differenceAmount.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}) steht als offene Teilforderung für die nächste Privatrechnung bereit.`);
        return { newInvoiceId: '', clientId: firstClientId };
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

        await pb.collection('invoices').update(invoiceId, payload);
        await this.logAdjustment(invoiceId, 'write_off', receivedAmount, differenceAmount, referenceNr, finalReason);

        if (receivedAmount > 0) {
            await syncSettlementPaymentToAccounting(invoice, receivedAmount, paymentDate);
        }

        if (differenceAmount > 0) {
            await syncWriteOffToAccounting(invoice, differenceAmount, finalReason, paymentDate);
        }

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
