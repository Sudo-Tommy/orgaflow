/**
 * useBudgetActions.svelte.ts
 * Kapselt alle CRUD-Aktionen für Buchungen und Verträge im Haushaltsbuch.
 * Erhält eine BudgetData-Instanz als Kontext und mutiert deren State direkt.
 */
import { toastStore } from '$lib/services/toastService.svelte';
import { confirmStore } from '$lib/services/confirmService.svelte';
import { reconcileUserInvoicesAndAccounting } from '$lib/services/invoiceAccountingService';
import { resolveEffectiveUserId } from '$lib/services/personalFinanceService.svelte';
import { formatCurrency, formatDate } from '$lib/types/budget';
import type { BudgetEntry, Contract } from '$lib/types/budget';
import type { BudgetData } from './useBudgetData.svelte';
import type { EntryFormState, ContractFormState } from './budgetActionTypes';
import {
    executeToggleEntryStatus,
    executeDeleteEntry,
    getReceiptModalData,
    executeSaveEntry
} from './budgetEntryActionService';
import {
    executeDeleteContract,
    executeBookContractNow,
    executeSaveContract
} from './budgetContractActionService';

export type { EntryFormState, ContractFormState };

export class BudgetActions {
    #data: BudgetData;
    isSyncingInvoices = $state(false);

    constructor(data: BudgetData) {
        this.#data = data;
    }

    async handleSyncInvoices(userId: string) {
        if (!userId) return;
        this.isSyncingInvoices = true;
        toastStore.info('Prüfe und synchronisiere Kundenrechnungen...');
        try {
            const stats = await reconcileUserInvoicesAndAccounting(userId);
            await this.#data.load(userId);
            if (stats.created === 0 && stats.updated === 0) {
                toastStore.success(`Alle ${stats.total} Rechnungen sind bereits aktuell im Haushaltsbuch.`);
            } else {
                toastStore.success(`Abstimmung abgeschlossen: ${stats.created} neue Rechnungen verbucht, ${stats.updated} aktualisiert.`);
            }
        } catch (err) {
            console.error('Fehler bei Rechnungs-Synchronisation:', err);
            toastStore.error('Fehler beim Abgleich der Rechnungen mit dem Haushaltsbuch.');
        } finally {
            this.isSyncingInvoices = false;
        }
    }

    async handleToggleEntryStatus(entry: BudgetEntry, newStatus: 'paid' | 'open') {
        const prevStatus = entry.payment_status;
        const prevPaidAt = entry.paid_at;
        entry.payment_status = newStatus;
        entry.paid_at = newStatus === 'paid' ? new Date().toISOString().split('T')[0] : '';
        this.#data.entries = [...this.#data.entries];

        const res = await executeToggleEntryStatus(entry, newStatus);
        if (!res.success) {
            entry.payment_status = prevStatus;
            entry.paid_at = prevPaidAt;
            this.#data.entries = [...this.#data.entries];
        } else {
            await this.#data.load(entry.user ?? '');
        }
    }

    async handleToggleContractStatus(contract: Contract, newStatus: 'paid' | 'open') {
        contract.payment_status = newStatus;
        this.#data.contracts = [...this.#data.contracts];
        toastStore.success(`Vertrag „${contract.partner_name}": Status aktualisiert.`);
    }

    async handleBookContractNow(contract: Contract, selectedYear: number, selectedMonth: number, timeFilter: string) {
        const targetUserId = this.#data.effectiveUserId;
        if (!targetUserId) return;

        const newEntry = await executeBookContractNow(contract, targetUserId, selectedYear, selectedMonth, timeFilter);
        if (newEntry) {
            contract.payment_status = 'paid';
            this.#data.contracts = [...this.#data.contracts];
            this.#data.entries = [newEntry, ...this.#data.entries];
        }
    }

    async handlePayArrearNow(entry: BudgetEntry) {
        const todayIso = new Date().toISOString().split('T')[0];
        const confirmed = await confirmStore.ask(
            `Möchten Sie den Rückstand „${entry.title}" (${formatCurrency(entry.amount)}) jetzt als überwiesen verbuchen? Die Wertstellung erfolgt mit heutigem Datum (${formatDate(todayIso)}), sodass die Ausgabe dem aktuellen Cashflow zugeordnet wird.`,
            'Rückstand jetzt begleichen',
            'Ja, als bezahlt buchen',
            'Abbrechen'
        );
        if (!confirmed) return;

        await this.handleToggleEntryStatus(entry, 'paid');
        toastStore.success(`Rückstand für „${entry.title}" beglichen und im aktuellen Monat verbucht!`);
    }

    async handleBookNextInstallment(
        entry: BudgetEntry,
        selectedYear: number,
        selectedMonth: number
    ): Promise<Partial<EntryFormState> | null> {
        const nextRateNr = (Number(entry.installment_current) || 1) + 1;
        const defaultDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;

        if (entry.payment_status === 'open') {
            const markPaid = await confirmStore.ask(
                `Achtung: Rate ${entry.installment_current} von ${entry.installment_total_count || ''} ist noch als OFFEN markiert.\n\nMöchten Sie diese vorherige Rate zuerst als bezahlt markieren, bevor Sie Rate ${nextRateNr} erfassen?`,
                'Vorherige Rate noch unbezahlt',
                'Ja, vorherige Rate als bezahlt buchen',
                'Nein, nur Folge-Rate anlegen'
            );
            if (markPaid) {
                await this.handleToggleEntryStatus(entry, 'paid');
            }
        }

        return {
            type: entry.type,
            title: entry.title,
            description: entry.description || `Folgerate ${nextRateNr} von ${entry.installment_total_count || ''}`,
            amount: entry.amount,
            category: entry.category || 'Sonstiges',
            payment_status: 'paid',
            invoice_number: entry.invoice_number || '',
            invoice_date: defaultDate,
            due_date: defaultDate,
            paid_at: defaultDate,
            recipient_or_payer: entry.recipient_or_payer,
            payment_method: entry.payment_method || 'bank_transfer',
            contract_id: entry.contract_id || '',
            is_installment: true,
            installment_current: nextRateNr,
            installment_total_count: entry.installment_total_count || '',
            installment_total_amount: entry.installment_total_amount || ''
        };
    }

    async handleDeleteEntry(entry: BudgetEntry) {
        const deleted = await executeDeleteEntry(entry);
        if (deleted) {
            this.#data.entries = this.#data.entries.filter((e) => e.id !== entry.id);
        }
    }

    async handleDeleteContract(contract: Contract) {
        const deleted = await executeDeleteContract(contract);
        if (deleted) {
            this.#data.contracts = this.#data.contracts.filter((c) => c.id !== contract.id);
        }
    }

    handleViewReceipt(entry: BudgetEntry): { url: string; title: string } | null {
        return getReceiptModalData(entry);
    }

    async handleSaveEntry(
        form: EntryFormState,
        receiptFile: File | null,
        editingEntry: BudgetEntry | null,
        userId: string
    ): Promise<boolean> {
        const targetUserId = this.#data.effectiveUserId || await resolveEffectiveUserId(userId);
        if (!targetUserId) {
            toastStore.error('Kein gültiger Benutzer gefunden.');
            return false;
        }

        const res = await executeSaveEntry(form, receiptFile, editingEntry, targetUserId);
        if (res.success && res.entry) {
            if (editingEntry) {
                const idx = this.#data.entries.findIndex((e) => e.id === editingEntry.id);
                if (idx !== -1) {
                    this.#data.entries[idx] = res.entry;
                    this.#data.entries = [...this.#data.entries];
                }
            } else {
                this.#data.entries = [res.entry, ...this.#data.entries];
            }
            return true;
        }
        return false;
    }

    async handleSaveContract(
        form: ContractFormState,
        editingContract: Contract | null,
        userId: string
    ): Promise<boolean> {
        const targetUserId = this.#data.effectiveUserId || await resolveEffectiveUserId(userId);
        if (!targetUserId) {
            toastStore.error('Kein gültiger Benutzer gefunden.');
            return false;
        }

        const res = await executeSaveContract(form, editingContract, targetUserId);
        if (res.success && res.contract) {
            if (editingContract) {
                const idx = this.#data.contracts.findIndex((c) => c.id === editingContract.id);
                if (idx !== -1) {
                    this.#data.contracts[idx] = res.contract;
                    this.#data.contracts = [...this.#data.contracts];
                }
            } else {
                this.#data.contracts = [res.contract, ...this.#data.contracts];
            }
            return true;
        }
        return false;
    }
}
