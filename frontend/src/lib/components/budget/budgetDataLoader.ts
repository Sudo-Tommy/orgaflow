import { pb } from '$lib/services/pocketbase';
import type {
    BudgetEntry,
    Contract,
    BudgetEntryType,
    PaymentStatus,
    PaymentMethod,
    ContractInterval,
    BudgetEntrySource
} from '$lib/types/budget';

export async function fetchBudgetEntriesAndContracts(
    effectiveUserId: string,
    getEffectiveDate: (entry: BudgetEntry) => string
): Promise<{ entries: BudgetEntry[]; contracts: Contract[] }> {
    const [entriesRes, contractsRes, accountingRes] = await Promise.all([
        pb.collection('personal_transactions').getFullList({
            filter: `user = "${effectiveUserId}"`,
            sort: '-date',
            requestKey: null
        }).then((fallbackList) => {
            return fallbackList
                .filter((pt: any) => pt.status !== 'storniert' && !pt.is_storno)
                .map((pt: any): BudgetEntry => ({
                    id: pt.id,
                    user: pt.user,
                    type: (pt.type || 'expense') as BudgetEntryType,
                    title: pt.title || '',
                    description: pt.description || pt.notes || '',
                    amount: Number(pt.amount) || 0,
                    category: pt.category || 'Sonstiges',
                    payment_status: (pt.payment_status || (pt.status === 'gebucht' ? 'paid' : 'open')) as PaymentStatus,
                    recipient_or_payer: pt.recipient_or_payer || pt.partner || pt.title || 'Unbekannt',
                    payment_method: pt.payment_method || 'bank_transfer',
                    invoice_number: pt.invoice_number || '',
                    invoice_date: pt.invoice_date ? pt.invoice_date.substring(0, 10) : (pt.date ? pt.date.substring(0, 10) : ''),
                    due_date: pt.due_date ? pt.due_date.substring(0, 10) : '',
                    paid_at: pt.paid_at ? pt.paid_at.substring(0, 10) : (pt.status === 'gebucht' && pt.date ? pt.date.substring(0, 10) : ''),
                    contract_id: pt.contract_id || '',
                    receipt_file: pt.receipt || pt.receipt_file || '',
                    is_installment: !!pt.is_installment,
                    installment_current: pt.installment_current ? Number(pt.installment_current) : undefined,
                    installment_total_count: pt.installment_total_count ? Number(pt.installment_total_count) : undefined,
                    installment_total_amount: pt.installment_total_amount ? Number(pt.installment_total_amount) : undefined,
                    source: 'manual' as BudgetEntrySource,
                    is_invoice: false,
                    created: pt.created,
                    updated: pt.updated
                }));
        }).catch((err: unknown) => {
            console.error('[BudgetData] Fehler beim Laden von personal_transactions:', err);
            return [] as BudgetEntry[];
        }),

        pb.collection('personal_contracts').getFullList({
            filter: `user = "${effectiveUserId}"`,
            sort: 'title',
            requestKey: null
        }).then((fallbackContracts) => {
            return fallbackContracts.map((pc: any): Contract => ({
                id: pc.id,
                user: pc.user,
                partner_name: pc.partner || pc.title || 'Unbekannter Partner',
                contract_number: pc.contract_number || '',
                amount: Number(pc.amount) || 0,
                interval: (pc.interval || 'monthly') as ContractInterval,
                next_due_date: pc.next_due_date ? pc.next_due_date.substring(0, 10) : '',
                payment_status: (pc.payment_status || 'open') as 'open' | 'paid',
                category: pc.category || 'Miete & Wohnen',
                auto_book: !!pc.auto_book,
                is_active: pc.is_recurring ?? pc.is_active ?? true,
                description: pc.description || pc.notes || '',
                created: pc.created,
                updated: pc.updated
            }));
        }).catch((err: unknown) => {
            console.error('[BudgetData] Fehler beim Laden von personal_contracts:', err);
            return [] as Contract[];
        }),

        pb.collection('accounting').getFullList({
            filter: `createdby = "${effectiveUserId}"`,
            sort: '-transaction_date',
            requestKey: null
        }).catch(() => [])
    ]);

    const invoiceEntries: BudgetEntry[] = accountingRes
        .filter((a: any) => a.status !== 'Storniert' && a.transaction_type === 'Einnahme')
        .map((a: any): BudgetEntry => {
            const gross = Number(a.amount_gross) || Number(a.amount_net) || 0;
            const net = Number(a.amount_net) || gross;
            const dateStr = a.transaction_date ? a.transaction_date.substring(0, 10) : (a.created ? a.created.substring(0, 10) : '');
            const title = a.title || 'Kundenrechnung';

            let extractedInvoiceNr = '';
            let partner = 'Kunde';
            if (title.includes(' - ')) {
                const parts = title.split(' - ');
                partner = parts.slice(1).join(' - ').trim();
                const match = parts[0].match(/Rechnung\s+([A-Za-z0-9\-_]+)/i);
                if (match) extractedInvoiceNr = match[1];
            } else {
                const match = title.match(/Rechnung\s+([A-Za-z0-9\-_]+)/i);
                if (match) extractedInvoiceNr = match[1];
                partner = a.category || 'Kundenrechnung';
            }

            const receiptFileName = Array.isArray(a.receipt_file) ? a.receipt_file[0] : (a.receipt_file || '');

            return {
                id: a.id,
                user: a.createdby,
                type: 'income' as BudgetEntryType,
                title,
                description: a.notes || 'Automatisch synchronisierte Kundenrechnung',
                amount: gross,
                amount_net: net,
                tax_rate: a.tax_rate || '19',
                category: a.category || 'Kundenrechnung',
                payment_status: (a.status === 'Bezahlt' ? 'paid' : 'open') as PaymentStatus,
                recipient_or_payer: partner,
                payment_method: (a.payment_method === 'Bar' ? 'cash' : 'bank_transfer') as PaymentMethod,
                invoice_number: extractedInvoiceNr,
                invoice_date: dateStr,
                due_date: dateStr,
                paid_at: a.status === 'Bezahlt' ? dateStr : '',
                receipt_file: receiptFileName,
                source: 'accounting' as BudgetEntrySource,
                is_invoice: true,
                created: a.created,
                updated: a.updated
            };
        });

    const merged = [...entriesRes, ...invoiceEntries];
    merged.sort((a, b) => {
        const dateA = new Date(getEffectiveDate(a) || 0).getTime();
        const dateB = new Date(getEffectiveDate(b) || 0).getTime();
        return dateB - dateA;
    });

    return { entries: merged, contracts: contractsRes };
}
