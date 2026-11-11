import { pb } from '$lib/services/pocketbase';

/**
 * Reconcile and synchronize all invoices of a user with the accounting collection.
 */
export async function reconcileUserInvoicesAndAccounting(userId?: string): Promise<{ created: number; updated: number; total: number }> {
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
