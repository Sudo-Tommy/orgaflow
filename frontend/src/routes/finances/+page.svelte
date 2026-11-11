<script lang="ts">
    import { onMount } from "svelte";
    import { rbacService } from "$lib/services/rbacService.svelte";
    import { toastStore } from "$lib/services/toastService.svelte";
    import { goto } from "$app/navigation";
    import BudgetOverview from "$lib/components/budget/BudgetOverview.svelte";
    import PersonalTransactionModal from "$lib/components/finances/PersonalTransactionModal.svelte";
    import PersonalContractModal from "$lib/components/finances/PersonalContractModal.svelte";
    import PersonalMonthDetailModal from "$lib/components/finances/PersonalMonthDetailModal.svelte";
    import FinancePageHeader from "$lib/components/finances/FinancePageHeader.svelte";
    import FinanceKpiCards from "$lib/components/finances/FinanceKpiCards.svelte";
    import FinancePeriodSelector from "$lib/components/finances/FinancePeriodSelector.svelte";
    import FinanceBalanceCard from "$lib/components/finances/FinanceBalanceCard.svelte";
    import FinanceTrendForecast from "$lib/components/finances/FinanceTrendForecast.svelte";
    import FinanceTransactionsSection from "$lib/components/finances/FinanceTransactionsSection.svelte";
    import FinanceContractsSection from "$lib/components/finances/FinanceContractsSection.svelte";
    import { useFinancePageController } from "$lib/components/finances/useFinancePageController.svelte";
    import { scanReceiptFile } from "$lib/components/finances/financeScanHelper";
    import { confirmAndDeleteTransaction, confirmAndDeleteContract, bookContractTransaction, exportTransactionsToCsv } from "$lib/components/finances/financeActionsHelper";
    import { lexofficeService } from "$lib/services/lexofficeService.svelte";

    const isSuperadmin = $derived(rbacService.isOwner);
    const ctrl = useFinancePageController(() => isSuperadmin);
    const { financeService } = ctrl;

    let transactionModal: PersonalTransactionModal;
    let contractModal: PersonalContractModal;
    let isMonthModalOpen = $state(false);
    let selectedMonthForModal = $state<any>(null);
    let isScanning = $state(false);
    let fileInput = $state<HTMLInputElement>();

    $effect(() => {
        if (!rbacService.canAccessFinances) {
            toastStore.warning("Keine Berechtigung für Finanzdaten.");
            goto('/dashboard');
        }
    });

    onMount(() => {
        ctrl.init();
        lexofficeService.autoRefreshOnPageVisit().catch(() => {});
        const handleLexSynced = () => { financeService.loadData(); };
        window.addEventListener('lexoffice-synced', handleLexSynced);
        return () => window.removeEventListener('lexoffice-synced', handleLexSynced);
    });

    function openMonthModal(m: any) { selectedMonthForModal = m; isMonthModalOpen = true; }
    function openCurrentMonthModal() {
        const m = financeService.monthlyBreakdown[financeService.selectedMonth - 1] || {
            monthName: ctrl.periodLabel, year: financeService.selectedYear, ...financeService.periodStats, isHistorical: true
        };
        openMonthModal(m);
    }

    async function handleScan(e: Event) {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;
        isScanning = true;
        try {
            const prefill = await scanReceiptFile(file);
            transactionModal?.open(prefill);
            toastStore.success("Belegdaten erkannt! Bitte prüfen & speichern.");
        } catch (err: any) {
            toastStore.error(err.message || "Fehler beim Belegscan.");
            transactionModal?.open();
        } finally {
            isScanning = false;
            (e.target as HTMLInputElement).value = '';
        }
    }
</script>

<FinancePageHeader {isSuperadmin} users={ctrl.users} bind:selectedUserId={ctrl.selectedUserId} isSyncing={ctrl.isSyncingInvoices} onSync={ctrl.handleSyncInvoices} onUserChange={ctrl.handleUserChange} />

<div class="my-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
    <div class="grid grid-cols-2 sm:inline-flex w-full sm:w-auto rounded-2xl bg-slate-100 p-1 gap-1">
        <button type="button" onclick={() => ctrl.activeTab = 'modern'} class="px-4 py-2 text-xs font-semibold rounded-xl {ctrl.activeTab === 'modern' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600'}">✨ Modern (Cards)</button>
        <button type="button" onclick={() => ctrl.activeTab = 'classic'} class="px-4 py-2 text-xs font-semibold rounded-xl {ctrl.activeTab === 'classic' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600'}">📊 Klassisch (BWA)</button>
    </div>
</div>

{#if ctrl.activeTab === 'modern'}
    <BudgetOverview userId={ctrl.selectedUserId || financeService.activeUserId} bind:selectedYear={financeService.selectedYear} bind:selectedMonth={financeService.selectedMonth} />
{:else if financeService.isLoading}
    <div class="flex justify-center py-20"><div class="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div></div>
{:else}
    <FinanceKpiCards periodStats={financeService.periodStats} contractsCount={financeService.contracts.length} viewMode={financeService.viewMode} selectedMonth={financeService.selectedMonth} />
    <FinancePeriodSelector bind:viewMode={financeService.viewMode} bind:selectedYear={financeService.selectedYear} bind:selectedMonth={financeService.selectedMonth} bind:selectedQuarter={financeService.selectedQuarter} availableYears={financeService.availableYears} onOpenMonthModal={openCurrentMonthModal} />
    <div class="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-6 mb-6 sm:mb-8 animate-enter delay-200">
        <div class="xl:col-span-5"><FinanceBalanceCard periodStats={financeService.periodStats} onOpenMonthModal={openCurrentMonthModal} /></div>
        <div class="xl:col-span-7"><FinanceTrendForecast timelineStats={financeService.timelineStats} bind:forecastScenario={ctrl.forecastScenario} onOpenMonthModal={openMonthModal} onOpenCurrentMonthModal={openCurrentMonthModal} /></div>
    </div>
    <div class="grid grid-cols-1 xl:grid-cols-12 gap-6 sm:gap-8">
        <FinanceTransactionsSection transactions={ctrl.displayedTransactions} bind:showAll={ctrl.showAllTransactions} bind:displayMode={ctrl.transactionDisplayMode} bind:typeFilter={ctrl.transactionTypeFilter} bind:searchQuery={ctrl.transactionSearchQuery} bind:sortBy={ctrl.transactionSortBy} periodLabel={ctrl.periodLabel} {isScanning} onScanClick={() => fileInput?.click()} onExportCsv={() => exportTransactionsToCsv(ctrl.displayedTransactions, ctrl.periodLabel)} onBookDueContracts={financeService.bookDueContracts} onNewTransaction={() => transactionModal?.open()} onStorno={ctrl.handleStorno} onEdit={(t) => transactionModal?.open(t)} onDelete={(id) => confirmAndDeleteTransaction(id, financeService)} onBookNextInstallment={(t) => transactionModal?.open(t, true)} />
        <FinanceContractsSection contracts={financeService.contracts} bind:tileSize={ctrl.contractsTileSize} onAddContract={() => contractModal?.open()} onBookContract={(c) => bookContractTransaction(c, financeService)} onEditContract={(c) => contractModal?.open(c)} onDeleteContract={(id) => confirmAndDeleteContract(id, financeService)} />
    </div>
{/if}

<input type="file" bind:this={fileInput} onchange={handleScan} accept="image/*,application/pdf" class="hidden" />
<PersonalMonthDetailModal bind:isOpen={isMonthModalOpen} monthData={selectedMonthForModal} />
<PersonalTransactionModal bind:this={transactionModal} onSave={financeService.addTransaction} onUpdate={financeService.updateTransaction} />
<PersonalContractModal bind:this={contractModal} onSave={financeService.addContract} onUpdate={financeService.updateContract} />
