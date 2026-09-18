import { pb } from '$lib/services/pocketbase';
import type { InvoicePayload } from '$lib/utils/invoice';
import { toastStore } from '$lib/services/toastService.svelte';

/**
 * Service to synchronize invoice payments and cancellations with the accounting / Haushaltsbuch collection.
 */
export async function syncInvoicePaymentToAccounting(invoice: any, paidAtDate: string | null): Promise<void> {
    try {
        if (!invoice || !invoice.id) return;

        const effectiveDate = paidAtDate 
            ? new Date(paidAtDate).toISOString() 
            : (invoice.paid_at && typeof invoice.paid_at === 'string' ? new Date(invoice.paid_at).toISOString() : new Date().toISOString());

        // Extract client name if available
        let clientName = '';
        if (invoice.expand?.client) {
            const client = Array.isArray(invoice.expand.client) ? invoice.expand.client[0] : invoice.expand.client;
            if (client) {
                clientName = `${client.name_first || ''} ${client.name_last || ''}`.trim();
            }
        }

        const invoiceNr = invoice.invoice_nr || 'Unbekannt';
        const title = clientName ? `Rechnung ${invoiceNr} - ${clientName}` : `Rechnung ${invoiceNr}`;

        const grossAmount = Number(invoice.brutto) || 0;
        const netAmount = Number(invoice.netto) || (grossAmount - (Number(invoice.tax_sum) || 0));
        const taxSum = Number(invoice.tax_sum) || (grossAmount - netAmount);

        // Determine tax rate string ('0', '7', '19')
        let taxRate = '0';
        if (netAmount > 0 && taxSum > 0) {
            const calculatedRate = Math.round((taxSum / netAmount) * 100);
            if (calculatedRate >= 18 && calculatedRate <= 20) {
                taxRate = '19';
            } else if (calculatedRate >= 6 && calculatedRate <= 8) {
                taxRate = '7';
            }
        }

        const activeUserId = (invoice as any).user || pb.authStore.model?.id;

        // Idempotency check: Search if an accounting record for this invoice already exists
        // Check by invoice id in notes or invoice nr in title
        const existingRecords = await pb.collection('accounting').getFullList({
            filter: `notes ~ "${invoice.id}" || title ~ "${invoiceNr}"`,
            requestKey: null
        }).catch(() => []);

        if (existingRecords.length > 0) {
            const existing = existingRecords[0];
            // If already present, ensure it has the correct payment date and status
            await pb.collection('accounting').update(existing.id, {
                status: 'Bezahlt',
                transaction_date: effectiveDate,
                amount_gross: grossAmount,
                amount_net: netAmount,
                tax_rate: taxRate,
                notes: `Automatisch aktualisiert aus Rechnung ${invoiceNr} (ID: ${invoice.id})`
            });
            toastStore.success(`Einnahme für ${invoiceNr} im Haushaltsbuch aktualisiert.`);
            return;
        }

        // Create new accounting record
        const newRecord = {
            title: title,
            transaction_type: 'Einnahme',
            amount_gross: grossAmount,
            amount_net: netAmount,
            tax_rate: taxRate,
            transaction_date: effectiveDate,
            category: 'Kundenrechnung',
            payment_method: 'Banküberweisung',
            status: 'Bezahlt',
            account_number: '',
            notes: `Automatisch verbucht aus Rechnung ${invoiceNr} (ID: ${invoice.id})`,
            createdby: activeUserId
        };

        await pb.collection('accounting').create(newRecord);
        toastStore.success(`Einnahme (${grossAmount.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}) automatisch im Haushaltsbuch verbucht!`);
    } catch (err: any) {
        console.error("Fehler beim automatischen Verbuchen der Rechnung in 'accounting':", err);
        toastStore.warning("Rechnungsstatus geändert, aber automatische Buchung im Haushaltsbuch konnte nicht gespeichert werden.");
    }
}

/**
 * Synchronize partial or settled payment to accounting with a custom received amount.
 */
export async function syncSettlementPaymentToAccounting(invoice: any, receivedAmount: number, paidAtDate: string | null): Promise<void> {
    try {
        if (!invoice || !invoice.id || receivedAmount <= 0) return;

        const effectiveDate = paidAtDate 
            ? new Date(paidAtDate).toISOString() 
            : (invoice.paid_at && typeof invoice.paid_at === 'string' ? new Date(invoice.paid_at).toISOString() : new Date().toISOString());

        let clientName = '';
        if (invoice.expand?.client) {
            const client = Array.isArray(invoice.expand.client) ? invoice.expand.client[0] : invoice.expand.client;
            if (client) {
                clientName = `${client.name_first || ''} ${client.name_last || ''}`.trim();
            }
        }

        const invoiceNr = invoice.invoice_nr || 'Unbekannt';
        const title = clientName ? `Zahlungseingang ${invoiceNr} - ${clientName}` : `Zahlungseingang ${invoiceNr}`;

        const totalGross = Number(invoice.brutto) || 0;
        const totalNet = Number(invoice.netto) || totalGross;
        const ratio = totalGross > 0 ? receivedAmount / totalGross : 1;
        const netAmount = Math.round(totalNet * ratio * 100) / 100;
        const taxRate = invoice.tax_rate ? String(invoice.tax_rate) : '0';
        const activeUserId = (invoice as any).user || pb.authStore.model?.id;

        const existingRecords = await pb.collection('accounting').getFullList({
            filter: `notes ~ "${invoice.id}" && transaction_type = "Einnahme"`,
            requestKey: null
        }).catch(() => []);

        if (existingRecords.length > 0) {
            const existing = existingRecords[0];
            await pb.collection('accounting').update(existing.id, {
                status: 'Bezahlt',
                transaction_date: effectiveDate,
                amount_gross: receivedAmount,
                amount_net: netAmount,
                notes: `Teil-/Zahlungseingang zu Rechnung ${invoiceNr} (ID: ${invoice.id})`
            });
            toastStore.success(`Zahlungseingang (${receivedAmount.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}) im Haushaltsbuch aktualisiert.`);
            return;
        }

        await pb.collection('accounting').create({
            title,
            transaction_type: 'Einnahme',
            amount_gross: receivedAmount,
            amount_net: netAmount,
            tax_rate: taxRate,
            transaction_date: effectiveDate,
            category: 'Kundenrechnung',
            payment_method: 'Banküberweisung',
            status: 'Bezahlt',
            account_number: '',
            notes: `Zahlungseingang zu Rechnung ${invoiceNr} (ID: ${invoice.id})`,
            createdby: activeUserId
        });

        toastStore.success(`Zahlungseingang (${receivedAmount.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}) im Haushaltsbuch erfasst!`);
    } catch (err: any) {
        console.error("Fehler beim Verbuchen des Zahlungseingangs in 'accounting':", err);
    }
}

/**
 * Synchronize a write-off / Kassenkürzung as a correction expense in accounting.
 */
export async function syncWriteOffToAccounting(invoice: any, writeOffAmount: number, reason: string, paidAtDate: string | null): Promise<void> {
    try {
        if (!invoice || !invoice.id || writeOffAmount <= 0) return;

        const effectiveDate = paidAtDate 
            ? new Date(paidAtDate).toISOString() 
            : new Date().toISOString();

        const invoiceNr = invoice.invoice_nr || 'Unbekannt';
        const title = `Kassenkürzung / Ausbuchung - Rechnung ${invoiceNr}`;
        const activeUserId = (invoice as any).user || pb.authStore.model?.id;

        await pb.collection('accounting').create({
            title,
            transaction_type: 'Ausgabe',
            amount_gross: writeOffAmount,
            amount_net: writeOffAmount,
            tax_rate: '0',
            transaction_date: effectiveDate,
            category: 'Kassenkürzung / Ausbuchung',
            payment_method: 'Banküberweisung',
            status: 'Bezahlt',
            account_number: '',
            notes: `Ausbuchung zu Rechnung ${invoiceNr} (ID: ${invoice.id}). Grund: ${reason || 'Kürzung durch Kostenträger akzeptiert'}`,
            createdby: activeUserId
        });

        toastStore.info(`Kürzungsbetrag (${writeOffAmount.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}) als Verlustausbuchung erfasst.`);
    } catch (err: any) {
        console.error("Fehler beim Erfassen der Verlustausbuchung in 'accounting':", err);
    }
}

/**
 * Synchronize cancellation of an invoice to the accounting record.
 */
export async function syncInvoiceCancellationToAccounting(invoiceId: string, invoiceNr?: string): Promise<void> {
    try {
        if (!invoiceId) return;

        const safeNr = invoiceNr || 'Unbekannt';
        const filterStr = invoiceNr 
            ? `notes ~ "${invoiceId}" || title ~ "${invoiceNr}"`
            : `notes ~ "${invoiceId}"`;

        const existingRecords = await pb.collection('accounting').getFullList({
            filter: filterStr,
            requestKey: null
        }).catch(() => []);

        for (const record of existingRecords) {
            await pb.collection('accounting').update(record.id, {
                status: 'Storniert',
                notes: `${record.notes || ''} [Storniert wegen Storno der Rechnung ${safeNr}]`.trim()
            });
        }

        if (existingRecords.length > 0) {
            toastStore.info(`Buchung im Haushaltsbuch für Rechnung ${safeNr} wurde storniert.`);
        }
    } catch (err: any) {
        console.error("Fehler beim Stornieren der Buchung in 'accounting':", err);
    }
}

/**
 * Reconcile and synchronize all invoices of a user with the accounting collection.
 */
export async function reconcileUserInvoicesAndAccounting(userId?: string): Promise<{ created: number, updated: number, total: number }> {
    const stats = { created: 0, updated: 0, total: 0 };
    try {
        const targetUserId = userId || pb.authStore.model?.id;
        if (!targetUserId) return stats;

        // 1. Fetch all invoices for user (or all accessible)
        const filterStr = targetUserId ? `user = "${targetUserId}"` : '';
        const invoices = await pb.collection('invoices').getFullList({
            filter: filterStr,
            expand: 'client,company',
            sort: '-issue_date',
            requestKey: null
        }).catch(err => {
            console.error("Fehler beim Laden der Rechnungen:", err);
            return [];
        });

        // 2. Fetch existing accounting entries for user
        const accountingEntries = await pb.collection('accounting').getFullList({
            filter: targetUserId ? `createdby = "${targetUserId}"` : '',
            requestKey: null
        }).catch(() => []);

        stats.total = invoices.length;

        for (const invoice of invoices) {
            const invoiceNr = invoice.invoice_nr || 'Unbekannt';
            
            const matchedEntry = accountingEntries.find(a => 
                (a.notes && a.notes.includes(invoice.id)) || 
                (a.title && a.title.includes(invoiceNr))
            );

            if (invoice.status === 'Abgeschlossen') {
                const effectiveDate = invoice.paid_at 
                    ? new Date(invoice.paid_at).toISOString() 
                    : (invoice.issue_date ? new Date(invoice.issue_date).toISOString() : new Date().toISOString());

                let clientName = '';
                if (invoice.expand?.client) {
                    const client = Array.isArray(invoice.expand.client) ? invoice.expand.client[0] : invoice.expand.client;
                    if (client) {
                        clientName = `${client.name_first || ''} ${client.name_last || ''}`.trim();
                    }
                }
                const title = clientName ? `Rechnung ${invoiceNr} - ${clientName}` : `Rechnung ${invoiceNr}`;
                const grossAmount = Number(invoice.paid_amount || invoice.brutto) || 0;
                const netAmount = Number(invoice.netto) || (grossAmount - (Number(invoice.tax_sum) || 0));
                const taxSum = Number(invoice.tax_sum) || (grossAmount - netAmount);

                let taxRate = '0';
                if (netAmount > 0 && taxSum > 0) {
                    const calcRate = Math.round((taxSum / netAmount) * 100);
                    if (calcRate >= 18 && calcRate <= 20) taxRate = '19';
                    else if (calcRate >= 6 && calcRate <= 8) taxRate = '7';
                }

                if (matchedEntry) {
                    const needsUpdate = matchedEntry.status !== 'Bezahlt' || 
                        Math.abs((Number(matchedEntry.amount_gross) || 0) - grossAmount) > 0.01;

                    if (needsUpdate) {
                        await pb.collection('accounting').update(matchedEntry.id, {
                            status: 'Bezahlt',
                            amount_gross: grossAmount,
                            amount_net: netAmount,
                            tax_rate: taxRate,
                            transaction_date: effectiveDate,
                            notes: `Automatisch synchronisiert aus Rechnung ${invoiceNr} (ID: ${invoice.id})`
                        });
                        stats.updated++;
                    }
                } else {
                    await pb.collection('accounting').create({
                        title,
                        transaction_type: 'Einnahme',
                        amount_gross: grossAmount,
                        amount_net: netAmount,
                        tax_rate: taxRate,
                        transaction_date: effectiveDate,
                        category: 'Kundenrechnung',
                        payment_method: 'Banküberweisung',
                        status: 'Bezahlt',
                        notes: `Automatisch verbucht aus Rechnung ${invoiceNr} (ID: ${invoice.id})`,
                        createdby: targetUserId
                    });
                    stats.created++;
                }
            } else if (invoice.status === 'Storniert' && matchedEntry && matchedEntry.status !== 'Storniert') {
                await pb.collection('accounting').update(matchedEntry.id, {
                    status: 'Storniert',
                    notes: `${matchedEntry.notes || ''} [Storniert bei Rechnungs-Abstimmung]`.trim()
                });
                stats.updated++;
            }
        }

        return stats;
    } catch (err: any) {
        console.error("Fehler beim Abgleich der Rechnungen mit dem Haushaltsbuch:", err);
        throw err;
    }
}
