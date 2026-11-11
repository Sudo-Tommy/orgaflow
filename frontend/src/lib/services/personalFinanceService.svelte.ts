import { pb } from '$lib/services/pocketbase';
import { toastStore } from '$lib/services/toastService.svelte';
import { logAuditEvent } from '$lib/services/auditService';
import { resolveEffectiveUserId } from './personalFinance/personalFinanceUserResolver';
import {
    getAvailableYears,
    calculateMonthlyBreakdown,
    calculatePeriodStats,
    calculateTimelineStats
} from './personalFinance/personalFinanceCalculations';
import { bookDueContracts as executeBookDueContracts } from './personalFinance/personalFinanceContractBooking';

export { resolveEffectiveUserId };

export function usePersonalFinanceService() {
    let transactions = $state<any[]>([]);
    let contracts = $state<any[]>([]);
    let accountingData = $state<any[]>([]);
    let isLoading = $state(false);
    let error = $state<string | null>(null);
    let activeUserId = $state<string | undefined>(
        pb.authStore.model?.collectionName === 'users' ? pb.authStore.model?.id : undefined
    );

    let selectedYear = $state(new Date().getFullYear());
    let selectedMonth = $state(new Date().getMonth() + 1);
    let selectedQuarter = $state(Math.ceil((new Date().getMonth() + 1) / 3));
    let viewMode = $state<'monthly' | 'quarterly' | 'yearly'>('monthly');

    let isSubscribed = false;

    function setupRealtime() {
        if (isSubscribed || typeof window === 'undefined' || !activeUserId) return;
        isSubscribed = true;
        const handleRealtimeChange = () => { loadData(); };
        try {
            pb.collection('personal_transactions').subscribe('*', handleRealtimeChange).catch(() => {});
            pb.collection('personal_contracts').subscribe('*', handleRealtimeChange).catch(() => {});
            pb.collection('accounting').subscribe('*', handleRealtimeChange).catch(() => {});
        } catch (e) {
            console.warn('[PersonalFinanceService] Realtime subscription init error:', e);
        }
    }

    function destroy() {
        if (!isSubscribed) return;
        try {
            pb.collection('personal_transactions').unsubscribe('*');
            pb.collection('personal_contracts').unsubscribe('*');
            pb.collection('accounting').unsubscribe('*');
        } catch {}
        isSubscribed = false;
    }

    function setUserId(id: string | undefined) {
        if (activeUserId !== id) {
            destroy();
            activeUserId = id;
            if (id && typeof localStorage !== 'undefined') {
                try { localStorage.setItem('orgaflow_finances_user', id); } catch {}
            }
            if (id) {
                loadData();
                setupRealtime();
            }
        }
    }

    async function loadData() {
        if (!activeUserId) activeUserId = await resolveEffectiveUserId();
        if (!activeUserId) return;
        setupRealtime();
        isLoading = true;
        error = null;
        try {
            const [transRes, contRes, accRes] = await Promise.all([
                pb.collection('personal_transactions').getFullList({ filter: `user = "${activeUserId}"`, sort: '-date', requestKey: null }).catch(err => {
                    if (err?.isAbort) return [];
                    throw err;
                }),
                pb.collection('personal_contracts').getFullList({ filter: `user = "${activeUserId}"`, sort: 'title', requestKey: null }).catch(err => {
                    if (err?.isAbort) return [];
                    throw err;
                }),
                pb.collection('accounting').getFullList({ filter: `createdby = "${activeUserId}"`, sort: '-transaction_date', requestKey: null }).catch(() => [])
            ]);
            transactions = transRes;
            contracts = contRes;
            accountingData = accRes;
        } catch (e: any) {
            if (e?.isAbort) return;
            error = "Fehler beim Laden der Finanzdaten. Existieren die Tabellen 'personal_transactions' und 'personal_contracts'?";
            console.error(error, e);
            transactions = [];
            contracts = [];
            accountingData = [];
        } finally {
            isLoading = false;
        }
    }

    async function addTransaction(payload: FormData) {
        if (!activeUserId) activeUserId = await resolveEffectiveUserId();
        if (!activeUserId) return;
        payload.set('user', activeUserId);
        const record = await pb.collection('personal_transactions').create(payload);
        await logAuditEvent({
            action: 'CREATE_PERSONAL_TRANSACTION',
            route: '/finances',
            details: { id: record.id, title: payload.get('title'), amount: payload.get('amount'), type: payload.get('type') }
        });
        await loadData();
    }

    async function updateTransaction(id: string, payload: FormData) {
        await pb.collection('personal_transactions').update(id, payload);
        await logAuditEvent({
            action: 'UPDATE_PERSONAL_TRANSACTION',
            route: '/finances',
            details: { id, title: payload.get('title'), amount: payload.get('amount') }
        });
        await loadData();
    }

    async function deleteTransaction(id: string) {
        const existing = transactions.find(t => t.id === id);
        await pb.collection('personal_transactions').delete(id);
        await logAuditEvent({
            action: 'DELETE_PERSONAL_TRANSACTION',
            route: '/finances',
            details: { id, title: existing?.title, amount: existing?.amount }
        });
        await loadData();
    }

    async function stornoTransaction(id: string, reason = "Stornierung durch Benutzer") {
        try {
            const existing = transactions.find(t => t.id === id);
            await pb.collection('personal_transactions').update(id, {
                status: 'storniert',
                is_storno: true,
                storno_reason: reason
            });
            await logAuditEvent({
                action: 'STORNO_PERSONAL_TRANSACTION',
                route: '/finances',
                details: { transactionId: id, title: existing?.title, amount: existing?.amount, reason }
            });
            toastStore.success("Buchung wurde GoBD-konform storniert.");
            await loadData();
        } catch (err: any) {
            console.error("Fehler beim Stornieren:", err);
            toastStore.error(err.message || "Stornierung fehlgeschlagen.");
        }
    }
    
    async function addContract(payload: FormData) {
        if (!activeUserId) activeUserId = await resolveEffectiveUserId();
        if (!activeUserId) return;
        payload.set('user', activeUserId);
        await pb.collection('personal_contracts').create(payload);
        await loadData();
    }

    async function updateContract(id: string, payload: FormData) {
        await pb.collection('personal_contracts').update(id, payload);
        await loadData();
    }

    async function deleteContract(id: string) {
        await pb.collection('personal_contracts').delete(id);
        await loadData();
    }

    async function bookDueContracts() {
        if (!activeUserId) activeUserId = await resolveEffectiveUserId();
        if (!activeUserId) return;
        isLoading = true;
        try {
            await executeBookDueContracts(contracts, activeUserId, loadData);
        } finally {
            isLoading = false;
        }
    }

    let availableYears = $derived(getAvailableYears(transactions, accountingData));
    let monthlyBreakdown = $derived(calculateMonthlyBreakdown(selectedYear, transactions, accountingData));
    let periodStats = $derived(calculatePeriodStats(viewMode, selectedMonth, selectedQuarter, monthlyBreakdown, contracts));
    let timelineStats = $derived(calculateTimelineStats(selectedYear, monthlyBreakdown, contracts));

    let stats = $derived({
        totalIncome: periodStats.income,
        totalExpense: periodStats.expense,
        balance: periodStats.balance,
        monthlyIncome: periodStats.income,
        monthlyExpense: periodStats.expense,
        monthlyBalance: periodStats.balance,
        upcomingExpenses: periodStats.totalMonthlyContracts
    });

    let forecast = $derived.by(() => {
        let runningBalance = periodStats.balance;
        return timelineStats.filter(t => !t.isHistorical).map(t => {
            runningBalance += t.balance;
            return {
                name: `${t.monthShort} ${String(t.year).slice(2)}`,
                net: t.balance,
                projectedBalance: runningBalance
            };
        });
    });

    return {
        get transactions() { return transactions; },
        get contracts() { return contracts; },
        get accountingData() { return accountingData; },
        get isLoading() { return isLoading; },
        get error() { return error; },
        get activeUserId() { return activeUserId; },
        setUserId, loadData, destroy, addTransaction, updateTransaction,
        deleteTransaction, stornoTransaction, addContract, updateContract,
        deleteContract, bookDueContracts,
        get selectedYear() { return selectedYear; }, set selectedYear(v) { selectedYear = v; },
        get selectedMonth() { return selectedMonth; }, set selectedMonth(v) { selectedMonth = v; },
        get selectedQuarter() { return selectedQuarter; }, set selectedQuarter(v) { selectedQuarter = v; },
        get viewMode() { return viewMode; }, set viewMode(v) { viewMode = v; },
        get availableYears() { return availableYears; },
        get monthlyBreakdown() { return monthlyBreakdown; },
        get periodStats() { return periodStats; },
        get timelineStats() { return timelineStats; },
        get stats() { return stats; },
        get forecast() { return forecast; }
    };
}