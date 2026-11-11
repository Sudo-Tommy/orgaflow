/**
 * useBudgetData.svelte.ts
 * Kapselt Datenladung, Realtime-Subscriptions, Filterlogik und KPI-Berechnungen
 * für das Haushaltsbuch als Svelte-5-Rune-Klasse.
 */
import { pb } from '$lib/services/pocketbase';
import { toastStore } from '$lib/services/toastService.svelte';
import { resolveEffectiveUserId } from '$lib/services/personalFinanceService.svelte';
import type {
    BudgetEntry,
    Contract,
    BudgetStatusFilter,
    BudgetTimeFilter,
    BudgetTotals
} from '$lib/types/budget';
import { fetchBudgetEntriesAndContracts } from './budgetDataLoader';
import { calculateBudgetTotals } from './budgetTotalsCalculator';
import {
    getEffectiveEntryDate,
    matchesTimeFilter,
    getPeriodStartDate,
    isEntryArrear,
    getInstallmentPlanKey
} from './budgetDateHelpers';

export class BudgetData {
    entries = $state<BudgetEntry[]>([]);
    contracts = $state<Contract[]>([]);
    effectiveUserId = $state<string>('');
    isLoading = $state(false);

    statusFilter = $state<BudgetStatusFilter>('all');
    timeFilter = $state<BudgetTimeFilter>('month');
    categoryFilter = $state<string>('all');
    searchQuery = $state<string>('');

    selectedYear: number;
    selectedMonth: number;
    #isSubscribed = false;

    constructor(selectedYear: () => number, selectedMonth: () => number) {
        this.selectedYear = $derived(selectedYear()) as unknown as number;
        this.selectedMonth = $derived(selectedMonth()) as unknown as number;
    }

    getEffectiveEntryDate(entry: BudgetEntry): string {
        return getEffectiveEntryDate(entry);
    }

    matchesTimeFilter(dateStr?: string | null): boolean {
        return matchesTimeFilter(this.timeFilter, this.selectedYear, this.selectedMonth, dateStr);
    }

    get periodStartDate(): Date {
        return getPeriodStartDate(this.timeFilter, this.selectedYear, this.selectedMonth);
    }

    isEntryArrear(entry: BudgetEntry): boolean {
        return isEntryArrear(entry, this.periodStartDate);
    }

    getInstallmentPlanKey(entry: BudgetEntry): string {
        return getInstallmentPlanKey(entry);
    }

    arrearsExpenseEntries = $derived.by(() =>
        this.entries.filter((e) => e.type === 'expense' && this.isEntryArrear(e))
    );

    arrearsIncomeEntries = $derived.by(() =>
        this.entries.filter((e) => e.type === 'income' && this.isEntryArrear(e))
    );

    filteredEntries = $derived.by(() =>
        this.entries.filter((entry) => {
            if (this.statusFilter === 'arrears') {
                if (entry.type !== 'expense' || !this.isEntryArrear(entry)) return false;
                if (this.categoryFilter !== 'all' && entry.category !== this.categoryFilter) return false;
                if (this.searchQuery.trim()) {
                    const q = this.searchQuery.toLowerCase().trim();
                    if (!entry.title?.toLowerCase().includes(q)
                        && !entry.recipient_or_payer?.toLowerCase().includes(q)
                        && !entry.invoice_number?.toLowerCase().includes(q)
                        && !entry.category?.toLowerCase().includes(q)) return false;
                }
                return true;
            }

            if (this.statusFilter === 'contracts') return false;
            if (this.statusFilter === 'invoices' && !entry.is_invoice && entry.source !== 'accounting') return false;
            if (this.statusFilter === 'installments' && !entry.is_installment) return false;
            if (this.statusFilter === 'open' && entry.payment_status !== 'open') return false;
            if (this.statusFilter === 'paid' && entry.payment_status !== 'paid') return false;

            const relevantDate = this.getEffectiveEntryDate(entry);
            if (!this.matchesTimeFilter(relevantDate)) return false;
            if (this.categoryFilter !== 'all' && entry.category !== this.categoryFilter) return false;

            if (this.searchQuery.trim()) {
                const q = this.searchQuery.toLowerCase().trim();
                if (!entry.title?.toLowerCase().includes(q)
                    && !entry.recipient_or_payer?.toLowerCase().includes(q)
                    && !entry.invoice_number?.toLowerCase().includes(q)
                    && !entry.category?.toLowerCase().includes(q)) return false;
            }
            return true;
        })
    );

    filteredContracts = $derived.by(() =>
        this.contracts.filter((contract) => {
            if (this.statusFilter !== 'all' && this.statusFilter !== 'contracts') {
                if (this.statusFilter === 'open' && contract.payment_status !== 'open') return false;
                if (this.statusFilter === 'paid' && contract.payment_status !== 'paid') return false;
                if (this.statusFilter === 'installments' || this.statusFilter === 'invoices') return false;
            }
            if (this.categoryFilter !== 'all' && contract.category !== this.categoryFilter) return false;
            if (this.searchQuery.trim()) {
                const q = this.searchQuery.toLowerCase().trim();
                if (!contract.partner_name?.toLowerCase().includes(q)
                    && !contract.contract_number?.toLowerCase().includes(q)
                    && !contract.category?.toLowerCase().includes(q)) return false;
            }
            return true;
        })
    );

    monthsWithData = $derived.by(() => {
        const set = new Set<number>();
        for (const entry of this.entries) {
            const dStr = this.getEffectiveEntryDate(entry);
            if (!dStr) continue;
            const d = new Date(dStr);
            if (d.getFullYear() === this.selectedYear) set.add(d.getMonth() + 1);
        }
        return set;
    });

    monthsWithUnpaid = $derived.by(() => {
        const set = new Set<number>();
        for (const entry of this.entries) {
            if (entry.payment_status !== 'open') continue;
            const dStr = entry.invoice_date || entry.due_date || entry.created;
            if (!dStr) continue;
            const d = new Date(dStr);
            if (!isNaN(d.getTime()) && d.getFullYear() === this.selectedYear) set.add(d.getMonth() + 1);
        }
        return set;
    });

    availableYears = $derived.by(() => {
        const years = new Set<number>();
        years.add(new Date().getFullYear());
        years.add(this.selectedYear);
        for (const entry of this.entries) {
            const dStr = this.getEffectiveEntryDate(entry);
            if (dStr) {
                const y = new Date(dStr).getFullYear();
                if (!isNaN(y)) years.add(y);
            }
        }
        for (const contract of this.contracts) {
            if (contract.next_due_date) {
                const y = new Date(contract.next_due_date).getFullYear();
                if (!isNaN(y)) years.add(y);
            }
        }
        return Array.from(years).sort((a, b) => b - a);
    });

    totals = $derived.by((): BudgetTotals => {
        return calculateBudgetTotals(
            this.entries,
            this.contracts,
            this.arrearsExpenseEntries,
            this.arrearsIncomeEntries,
            (d) => this.matchesTimeFilter(d),
            (e) => this.getEffectiveEntryDate(e),
            (e) => this.getInstallmentPlanKey(e)
        );
    });

    async load(userId: string) {
        if (!this.effectiveUserId) {
            this.effectiveUserId = await resolveEffectiveUserId(userId);
        }
        if (!this.effectiveUserId) return;

        this.isLoading = true;
        try {
            const { entries, contracts } = await fetchBudgetEntriesAndContracts(
                this.effectiveUserId,
                (e) => this.getEffectiveEntryDate(e)
            );
            this.entries = entries;
            this.contracts = contracts;
        } catch (err) {
            console.error('[BudgetData] Fehler beim Laden der Budget-Daten:', err);
            toastStore.error('Fehler beim Abrufen der Finanzdaten.');
        } finally {
            this.isLoading = false;
        }
    }

    setupRealtime(userId: string) {
        if (this.#isSubscribed || typeof window === 'undefined') return;
        this.#isSubscribed = true;
        const handleRealtimeChange = () => this.load(userId);
        try {
            pb.collection('personal_transactions').subscribe('*', handleRealtimeChange).catch(() => {});
            pb.collection('personal_contracts').subscribe('*', handleRealtimeChange).catch(() => {});
            pb.collection('accounting').subscribe('*', handleRealtimeChange).catch(() => {});
        } catch (err) {
            console.warn('[BudgetData] Realtime subscription init error:', err);
        }
    }

    teardownRealtime() {
        if (!this.#isSubscribed) return;
        try {
            pb.collection('personal_transactions').unsubscribe('*');
            pb.collection('personal_contracts').unsubscribe('*');
            pb.collection('accounting').unsubscribe('*');
        } catch {}
        this.#isSubscribed = false;
    }
}
