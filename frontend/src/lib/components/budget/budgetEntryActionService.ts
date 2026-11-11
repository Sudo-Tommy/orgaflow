import { pb } from '$lib/services/pocketbase';
import { toastStore } from '$lib/services/toastService.svelte';
import { confirmStore } from '$lib/services/confirmService.svelte';
import { formatCurrency, formatDate } from '$lib/types/budget';
import type { BudgetEntry } from '$lib/types/budget';
import type { EntryFormState } from './budgetActionTypes';

export async function executeToggleEntryStatus(entry: BudgetEntry, newStatus: 'paid' | 'open'): Promise<{ success: boolean; paidAt: string }> {
    const todayIso = new Date().toISOString().split('T')[0];
    const updatedPaidAt = newStatus === 'paid' ? todayIso : '';

    try {
        if (entry.source === 'accounting') {
            await pb.collection('accounting').update(entry.id, {
                status: newStatus === 'paid' ? 'Bezahlt' : 'Offen',
                transaction_date: newStatus === 'paid' ? todayIso : (entry.invoice_date || todayIso)
            });
        } else {
            await pb.collection('personal_transactions').update(entry.id, {
                payment_status: newStatus,
                status: newStatus === 'paid' ? 'gebucht' : 'ausstehend',
                date: newStatus === 'paid' ? todayIso : (entry.invoice_date || todayIso),
                paid_at: newStatus === 'paid' ? todayIso : ''
            });
        }

        if (newStatus === 'paid') {
            toastStore.success(`„${entry.title}" als bezahlt markiert.`);
        } else {
            toastStore.info(`„${entry.title}" wieder als offen markiert.`);
        }
        return { success: true, paidAt: updatedPaidAt };
    } catch (err) {
        console.error('Fehler beim Aktualisieren des Status:', err);
        toastStore.error('Status konnte nicht aktualisiert werden.');
        return { success: false, paidAt: entry.paid_at || '' };
    }
}

export async function executeDeleteEntry(entry: BudgetEntry): Promise<boolean> {
    const isInvoice = entry.is_invoice || entry.source === 'accounting';
    const confirmed = await confirmStore.ask(
        `Möchten Sie ${isInvoice ? 'die Rechnungseinnahme' : 'die Buchung'} „${entry.title}" (${formatCurrency(entry.amount)}) wirklich entfernen?`,
        isInvoice ? 'Rechnung entfernen / stornieren' : 'Buchung löschen',
        'Ja, entfernen',
        'Abbrechen',
        true
    );
    if (!confirmed) return false;

    try {
        if (entry.source === 'accounting') {
            await pb.collection('accounting').update(entry.id, {
                status: 'Storniert',
                notes: `${entry.description || ''} [Im Haushaltsbuch storniert]`.trim()
            });
        } else {
            await pb.collection('personal_transactions').delete(entry.id);
        }
        toastStore.success('Eintrag erfolgreich entfernt.');
        return true;
    } catch (err) {
        console.error('Fehler beim Löschen:', err);
        toastStore.error('Eintrag konnte nicht gelöscht werden.');
        return false;
    }
}

export function getReceiptModalData(entry: BudgetEntry): { url: string; title: string } | null {
    if (!entry.receipt_file) return null;
    try {
        const url = (entry as any).collectionId
            ? pb.files.getURL(entry as any, entry.receipt_file)
            : pb.files.getURL({ collectionName: 'personal_transactions', id: entry.id } as any, entry.receipt_file);
        return {
            url,
            title: `Beleg: ${entry.title} (#${entry.invoice_number || 'Ohne Nr.'})`
        };
    } catch {
        toastStore.error('Beleg konnte nicht geöffnet werden.');
        return null;
    }
}

export async function executeSaveEntry(
    form: EntryFormState,
    receiptFile: File | null,
    editingEntry: BudgetEntry | null,
    targetUserId: string
): Promise<{ success: boolean; entry?: BudgetEntry }> {
    if (!form.title.trim() || !form.recipient_or_payer.trim() || form.amount === '' || Number(form.amount) <= 0) {
        toastStore.warning('Bitte füllen Sie alle erforderlichen Buchungsfelder aus.');
        return { success: false };
    }

    if (editingEntry && editingEntry.source === 'accounting') {
        try {
            await pb.collection('accounting').update(editingEntry.id, {
                title: form.title.trim(),
                amount_gross: Number(form.amount),
                category: form.category,
                status: form.payment_status === 'paid' ? 'Bezahlt' : 'Offen',
                payment_method: form.payment_method === 'cash' ? 'Bar' : 'Banküberweisung',
                notes: form.description.trim()
            });
            toastStore.success('Rechnungsbuchung aktualisiert.');
            return {
                success: true,
                entry: {
                    ...editingEntry,
                    title: form.title.trim(),
                    amount: Number(form.amount),
                    category: form.category,
                    payment_status: form.payment_status,
                    payment_method: form.payment_method,
                    description: form.description.trim()
                }
            };
        } catch (err) {
            console.error('Fehler beim Aktualisieren der Rechnungsbuchung:', err);
            toastStore.error('Speichern fehlgeschlagen.');
            return { success: false };
        }
    }

    const formData = new FormData();
    formData.set('user', targetUserId);
    formData.set('type', form.type);
    formData.set('title', form.title.trim() || form.recipient_or_payer.trim() || 'Buchung');
    formData.set('notes', form.description.trim());
    formData.set('description', form.description.trim());
    formData.set('amount', String(form.amount));
    formData.set('category', form.category);
    formData.set('status', form.payment_status === 'paid' ? 'gebucht' : 'ausstehend');
    formData.set('payment_status', form.payment_status);
    formData.set('recipient_or_payer', form.recipient_or_payer.trim());
    formData.set('payment_method', form.payment_method);
    const txDate = form.invoice_date || form.paid_at || form.due_date || new Date().toISOString().substring(0, 10);
    formData.set('date', txDate);
    if (form.invoice_number) formData.set('invoice_number', form.invoice_number.trim());
    if (form.invoice_date) formData.set('invoice_date', form.invoice_date);
    if (form.due_date) formData.set('due_date', form.due_date);
    if (form.paid_at) formData.set('paid_at', form.paid_at);
    if (form.contract_id) formData.set('contract_id', form.contract_id);
    if (receiptFile) {
        formData.set('receipt', receiptFile);
        formData.set('receipt_file', receiptFile);
    }
    formData.set('is_installment', String(form.is_installment));
    if (form.is_installment) {
        if (form.installment_current) formData.set('installment_current', String(form.installment_current));
        if (form.installment_total_count) formData.set('installment_total_count', String(form.installment_total_count));
        if (form.installment_total_amount) formData.set('installment_total_amount', String(form.installment_total_amount));
    }

    try {
        if (editingEntry) {
            const res = await pb.collection('personal_transactions').update(editingEntry.id, formData);
            toastStore.success('Buchung erfolgreich aktualisiert.');
            return {
                success: true,
                entry: {
                    ...editingEntry,
                    title: form.title.trim() || form.recipient_or_payer.trim() || 'Buchung',
                    description: form.description.trim(),
                    amount: Number(form.amount),
                    category: form.category,
                    type: form.type,
                    payment_status: form.payment_status,
                    recipient_or_payer: (res as any).recipient_or_payer || form.recipient_or_payer.trim(),
                    payment_method: form.payment_method,
                    invoice_number: form.invoice_number.trim(),
                    invoice_date: form.invoice_date,
                    due_date: form.due_date,
                    paid_at: form.paid_at,
                    contract_id: form.contract_id,
                    is_installment: form.is_installment,
                    installment_current: form.installment_current ? Number(form.installment_current) : undefined,
                    installment_total_count: form.installment_total_count ? Number(form.installment_total_count) : undefined,
                    installment_total_amount: form.installment_total_amount ? Number(form.installment_total_amount) : undefined,
                    receipt_file: (res as any).receipt || (res as any).receipt_file || editingEntry.receipt_file
                }
            };
        }

        const res = await pb.collection('personal_transactions').create(formData);
        toastStore.success('Neue Buchung angelegt.');
        const newEntry: BudgetEntry = {
            id: res.id,
            user: targetUserId,
            type: form.type,
            title: form.title.trim() || form.recipient_or_payer.trim() || 'Buchung',
            description: form.description.trim(),
            amount: Number(form.amount),
            category: form.category,
            payment_status: form.payment_status,
            recipient_or_payer: (res as any).recipient_or_payer || form.recipient_or_payer.trim(),
            payment_method: form.payment_method,
            invoice_number: form.invoice_number.trim(),
            invoice_date: form.invoice_date,
            due_date: form.due_date,
            paid_at: form.paid_at,
            contract_id: form.contract_id,
            receipt_file: (res as any).receipt || (res as any).receipt_file || '',
            is_installment: form.is_installment,
            installment_current: form.installment_current ? Number(form.installment_current) : undefined,
            installment_total_count: form.installment_total_count ? Number(form.installment_total_count) : undefined,
            installment_total_amount: form.installment_total_amount ? Number(form.installment_total_amount) : undefined,
            source: 'manual',
            is_invoice: false,
            created: res.created,
            updated: res.updated
        };

        if (form.recipient_or_payer.trim()) {
            const partnerName = form.recipient_or_payer.trim();
            pb.collection('budget_partners').getList(1, 1, {
                filter: `name = "${partnerName.replace(/"/g, '')}"`
            }).then(existing => {
                if (existing.totalItems === 0) {
                    pb.collection('budget_partners').create({
                        name: partnerName,
                        type: form.type === 'income' ? 'client' : 'company',
                        user: targetUserId
                    }).catch(() => {});
                }
            }).catch(() => {});
        }

        return { success: true, entry: newEntry };
    } catch (err) {
        console.error('Fehler beim Speichern der Buchung:', err);
        toastStore.error('Speichern fehlgeschlagen.');
        return { success: false };
    }
}
