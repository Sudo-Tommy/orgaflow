import { pb } from "$lib/services/pocketbase";
import { usePersonalFinanceService, resolveEffectiveUserId } from "$lib/services/personalFinanceService.svelte";
import { confirmStore } from "$lib/services/confirmService.svelte";
import { toastStore } from "$lib/services/toastService.svelte";
import { reconcileUserInvoicesAndAccounting } from "$lib/services/invoiceAccountingService";

export function useFinancePageController(getIsSuperadmin: () => boolean) {
    const financeService = usePersonalFinanceService();
    let activeTab = $state<'modern' | 'classic'>('modern');
    let users = $state<any[]>([]);
    let selectedUserId = $state('');
    let isSyncingInvoices = $state(false);
    let showAllTransactions = $state(false);
    let transactionDisplayMode = $state<'grid' | 'table'>('grid');
    let forecastScenario = $state<'realistic' | 'optimistic' | 'pessimistic'>('realistic');
    let contractsTileSize = $state(33.33);

    let transactionTypeFilter = $state<'all' | 'income' | 'expense' | 'invoice' | 'contract'>('all');
    let transactionSearchQuery = $state('');
    let transactionSortBy = $state<'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'>('date_desc');

    let periodLabel = $derived.by(() => {
        if (financeService.viewMode === 'monthly') {
            const d = new Date(financeService.selectedYear, financeService.selectedMonth - 1, 1);
            return `${d.toLocaleString('de-DE', { month: 'long' })} ${financeService.selectedYear}`;
        }
        return financeService.viewMode === 'quarterly' ? `Q${financeService.selectedQuarter} ${financeService.selectedYear}` : `Gesamtjahr ${financeService.selectedYear}`;
    });

    let displayedTransactions = $derived.by(() => {
        let list = [...(showAllTransactions ? financeService.transactions : financeService.periodStats.transactions)];
        if (transactionTypeFilter === 'income') list = list.filter(t => t.type === 'income');
        else if (transactionTypeFilter === 'expense') list = list.filter(t => t.type === 'expense');
        else if (transactionTypeFilter === 'invoice') list = list.filter(t => t.source === 'accounting' || t.is_invoice);
        else if (transactionTypeFilter === 'contract') list = list.filter(t => t.category?.toLowerCase().includes('vertrag') || t.title?.toLowerCase().includes('vertrag:'));

        if (transactionSearchQuery.trim()) {
            const q = transactionSearchQuery.toLowerCase().trim();
            list = list.filter(t => (t.title?.toLowerCase().includes(q)) || (t.category?.toLowerCase().includes(q)) || String(t.amount || '').includes(q));
        }

        return list.sort((a, b) => {
            if (transactionSortBy === 'date_desc') return new Date(b.date).getTime() - new Date(a.date).getTime();
            if (transactionSortBy === 'date_asc') return new Date(a.date).getTime() - new Date(b.date).getTime();
            if (transactionSortBy === 'amount_desc') return (Number(b.amount) || 0) - (Number(a.amount) || 0);
            return (Number(a.amount) || 0) - (Number(b.amount) || 0);
        });
    });

    async function init() {
        const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('orgaflow_finances_user') || '' : '';
        if (getIsSuperadmin()) {
            try { users = await pb.collection("users").getFullList({ sort: "name_first,name_last,username" }); } catch {}
            selectedUserId = saved && users.some(u => u.id === saved) ? saved : (await resolveEffectiveUserId(financeService.activeUserId) || users[0]?.id || '');
        } else {
            selectedUserId = pb.authStore.model?.id || '';
        }
        financeService.setUserId(selectedUserId);
        await financeService.loadData();
    }

    function handleUserChange(newId: string) {
        selectedUserId = newId;
        financeService.setUserId(newId);
        try { localStorage.setItem('orgaflow_finances_user', newId); } catch {}
    }

    async function handleSyncInvoices() {
        isSyncingInvoices = true;
        toastStore.info("Prüfe und synchronisiere Rechnungen...");
        try {
            const stats = await reconcileUserInvoicesAndAccounting(selectedUserId || financeService.activeUserId);
            await financeService.loadData();
            toastStore.success(`Abstimmung fertig: ${stats.created} neu, ${stats.updated} aktualisiert.`);
        } catch {
            toastStore.error("Fehler beim Abgleich der Rechnungen.");
        } finally {
            isSyncingInvoices = false;
        }
    }

    async function handleStorno(transaction: any) {
        if (await confirmStore.ask(`Buchung "${transaction.title}" stornieren?`, "Stornieren?", "Ja", "Abbrechen", true)) {
            await financeService.stornoTransaction(transaction.id, "Manuelle Stornierung im Haushaltsbuch");
        }
    }

    return {
        financeService,
        get activeTab() { return activeTab; }, set activeTab(v) { activeTab = v; },
        get users() { return users; },
        get selectedUserId() { return selectedUserId; }, set selectedUserId(v) { selectedUserId = v; },
        get isSyncingInvoices() { return isSyncingInvoices; },
        get showAllTransactions() { return showAllTransactions; }, set showAllTransactions(v) { showAllTransactions = v; },
        get transactionDisplayMode() { return transactionDisplayMode; }, set transactionDisplayMode(v) { transactionDisplayMode = v; },
        get forecastScenario() { return forecastScenario; }, set forecastScenario(v) { forecastScenario = v; },
        get contractsTileSize() { return contractsTileSize; }, set contractsTileSize(v) { contractsTileSize = v; },
        get transactionTypeFilter() { return transactionTypeFilter; }, set transactionTypeFilter(v) { transactionTypeFilter = v; },
        get transactionSearchQuery() { return transactionSearchQuery; }, set transactionSearchQuery(v) { transactionSearchQuery = v; },
        get transactionSortBy() { return transactionSortBy; }, set transactionSortBy(v) { transactionSortBy = v; },
        get periodLabel() { return periodLabel; },
        get displayedTransactions() { return displayedTransactions; },
        init, handleUserChange, handleSyncInvoices, handleStorno
    };
}
