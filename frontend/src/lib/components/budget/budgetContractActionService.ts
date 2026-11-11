import { pb } from '$lib/services/pocketbase';
import { toastStore } from '$lib/services/toastService.svelte';
import { confirmStore } from '$lib/services/confirmService.svelte';
import { formatCurrency } from '$lib/types/budget';
import type { Contract, BudgetEntry, ContractInterval } from '$lib/types/budget';
import type { ContractFormState } from './budgetActionTypes';

export async function executeDeleteContract(contract: Contract): Promise<boolean> {
    const confirmed = await confirmStore.ask(
        `Möchten Sie den Vertrag „${contract.partner_name}" (${formatCurrency(contract.amount)}) wirklich löschen?`,
        'Vertrag löschen',
        'Ja, löschen',
        'Abbrechen',
        true
    );
    if (!confirmed) return false;

    try {
        await pb.collection('personal_contracts').delete(contract.id);
        toastStore.success('Vertrag gelöscht.');
        return true;
    } catch (err) {
        console.error('Fehler beim Löschen:', err);
        toastStore.error('Vertrag konnte nicht gelöscht werden.');
        return false;
    }
}

export async function executeBookContractNow(
    contract: Contract,
    targetUserId: string,
    selectedYear: number,
    selectedMonth: number,
    timeFilter: string
): Promise<BudgetEntry | null> {
    const targetDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
    const today = new Date().toISOString().split('T')[0];
    const effectiveDate = (timeFilter === 'month'
        && selectedYear === new Date().getFullYear()
        && selectedMonth === (new Date().getMonth() + 1)) ? today : targetDate;

    try {
        const createdRecord = await pb.collection('personal_transactions').create({
            user: targetUserId,
            type: 'expense',
            title: `Vertrag: ${contract.partner_name}`,
            amount: Number(contract.amount) || 0,
            category: contract.category || 'Miete & Wohnen',
            date: effectiveDate,
            notes: contract.description || `Regelmäßige Buchung (${contract.interval}) #${contract.contract_number || ''}`,
            description: contract.description || `Regelmäßige Buchung (${contract.interval}) #${contract.contract_number || ''}`,
            status: 'gebucht',
            payment_status: 'paid',
            recipient_or_payer: contract.partner_name,
            payment_method: 'bank_transfer',
            paid_at: effectiveDate,
            due_date: effectiveDate,
            invoice_date: effectiveDate,
            contract_id: contract.id
        });

        toastStore.success(`Vertrag „${contract.partner_name}" erfolgreich als Buchung erfasst!`);
        return {
            id: createdRecord.id,
            user: targetUserId,
            type: 'expense',
            title: `Vertrag: ${contract.partner_name}`,
            description: contract.description,
            amount: Number(contract.amount) || 0,
            category: contract.category || 'Miete & Wohnen',
            payment_status: 'paid',
            recipient_or_payer: contract.partner_name,
            payment_method: 'bank_transfer',
            paid_at: effectiveDate,
            invoice_date: effectiveDate,
            due_date: effectiveDate,
            contract_id: contract.id,
            created: new Date().toISOString()
        };
    } catch (err) {
        console.error('Fehler beim Verbuchen des Vertrags:', err);
        toastStore.error('Fehler beim Erstellen der Buchung.');
        return null;
    }
}

export async function executeSaveContract(
    form: ContractFormState,
    editingContract: Contract | null,
    targetUserId: string
): Promise<{ success: boolean; contract?: Contract }> {
    if (!form.partner_name.trim() || form.amount === '' || Number(form.amount) <= 0) {
        toastStore.warning('Bitte füllen Sie alle erforderlichen Vertragsfelder aus.');
        return { success: false };
    }

    const contractPayload = {
        user: targetUserId,
        title: form.partner_name.trim(),
        partner: form.partner_name.trim(),
        contract_number: form.contract_number.trim(),
        amount: Number(form.amount),
        interval: form.interval,
        next_due_date: form.next_due_date ? new Date(form.next_due_date).toISOString() : '',
        category: form.category,
        payment_status: form.payment_status,
        auto_book: form.auto_book,
        notes: form.description.trim(),
        description: form.description.trim(),
        is_recurring: form.is_active
    };

    try {
        if (editingContract) {
            const res = await pb.collection('personal_contracts').update(editingContract.id, contractPayload);
            toastStore.success('Vertrag erfolgreich aktualisiert.');
            return {
                success: true,
                contract: {
                    ...editingContract,
                    partner_name: (res as any).partner || (res as any).title || form.partner_name.trim(),
                    contract_number: (res as any).contract_number || form.contract_number.trim(),
                    amount: Number((res as any).amount) || Number(form.amount),
                    interval: ((res as any).interval || form.interval) as ContractInterval,
                    next_due_date: (res as any).next_due_date ? (res as any).next_due_date.substring(0, 10) : form.next_due_date,
                    payment_status: (res as any).payment_status || form.payment_status,
                    category: (res as any).category || form.category,
                    auto_book: (res as any).auto_book ?? form.auto_book,
                    is_active: form.is_active,
                    description: (res as any).description || (res as any).notes || form.description.trim()
                }
            };
        }

        const res = await pb.collection('personal_contracts').create(contractPayload);
        toastStore.success('Neuer Vertrag angelegt.');
        const newContract: Contract = {
            id: res.id,
            user: targetUserId,
            partner_name: (res as any).partner || (res as any).title || form.partner_name.trim(),
            contract_number: (res as any).contract_number || form.contract_number.trim(),
            amount: Number((res as any).amount) || Number(form.amount),
            interval: ((res as any).interval || form.interval) as ContractInterval,
            next_due_date: (res as any).next_due_date ? (res as any).next_due_date.substring(0, 10) : form.next_due_date,
            payment_status: form.payment_status,
            category: form.category,
            auto_book: form.auto_book,
            is_active: form.is_active,
            description: form.description.trim(),
            created: res.created,
            updated: res.updated
        };

        if (form.partner_name.trim()) {
            const partnerName = form.partner_name.trim();
            pb.collection('budget_partners').getList(1, 1, {
                filter: `name = "${partnerName.replace(/"/g, '')}"`
            }).then(existing => {
                if (existing.totalItems === 0) {
                    pb.collection('budget_partners').create({
                        name: partnerName,
                        type: 'company',
                        user: targetUserId
                    }).catch(() => {});
                }
            }).catch(() => {});
        }

        return { success: true, contract: newContract };
    } catch (err) {
        console.error('Fehler beim Speichern des Vertrags:', err);
        toastStore.error('Speichern des Vertrags fehlgeschlagen.');
        return { success: false };
    }
}
