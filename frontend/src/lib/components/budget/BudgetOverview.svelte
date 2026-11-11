<script lang="ts">
    import { onDestroy } from 'svelte';
    import { pb } from '$lib/services/pocketbase';
    import { resolveEffectiveUserId } from '$lib/services/personalFinanceService.svelte';

    import { BudgetData } from './useBudgetData.svelte';
    import { BudgetActions } from './useBudgetActions.svelte';
    import { BudgetModalState } from './budgetModalState.svelte';

    import BudgetDashboardHeader from './BudgetDashboardHeader.svelte';
    import BudgetTimeNav from './BudgetTimeNav.svelte';
    import BudgetFilterBar from './BudgetFilterBar.svelte';
    import BudgetContractsSection from './BudgetContractsSection.svelte';
    import BudgetEntriesSection from './BudgetEntriesSection.svelte';
    import BudgetEntryModal from './BudgetEntryModal.svelte';
    import BudgetContractModal from './BudgetContractModal.svelte';
    import BudgetReceiptModal from './BudgetReceiptModal.svelte';
    import BudgetInstallmentModal from './BudgetInstallmentModal.svelte';

    let {
        userId = pb.authStore.model?.id,
        selectedYear = $bindable(new Date().getFullYear()),
        selectedMonth = $bindable(new Date().getMonth() + 1)
    } = $props<{
        userId?: string;
        selectedYear?: number;
        selectedMonth?: number;
    }>();

    const data = new BudgetData(
        () => selectedYear,
        () => selectedMonth
    );
    const actions = new BudgetActions(data);
    const modalState = new BudgetModalState();

    $effect(() => {
        let isCurrent = true;
        resolveEffectiveUserId(userId).then(validId => {
            if (isCurrent && validId) {
                data.effectiveUserId = validId;
                data.load(validId);
                data.setupRealtime(validId);
            }
        });
        return () => { isCurrent = false; };
    });

    onDestroy(() => {
        data.teardownRealtime();
    });

    function goToPrevMonth() {
        data.timeFilter = 'month';
        if (selectedMonth === 1) { selectedMonth = 12; selectedYear--; }
        else { selectedMonth--; }
    }

    function goToNextMonth() {
        data.timeFilter = 'month';
        if (selectedMonth === 12) { selectedMonth = 1; selectedYear++; }
        else { selectedMonth++; }
    }

    function goToCurrentMonth() {
        data.timeFilter = 'month';
        const now = new Date();
        selectedYear = now.getFullYear();
        selectedMonth = now.getMonth() + 1;
    }

    let periodLabel = $derived.by(() => {
        const mName = new Date(selectedYear, selectedMonth - 1, 1).toLocaleString('de-DE', { month: 'long' });
        if (data.timeFilter === 'month' || data.timeFilter === 'this_month') return `${mName} ${selectedYear}`;
        if (data.timeFilter === 'last_month') {
            const prev = new Date(selectedYear, selectedMonth - 2, 1);
            return `${prev.toLocaleString('de-DE', { month: 'long' })} ${prev.getFullYear()}`;
        }
        if (data.timeFilter === 'quarter') return `Q${Math.ceil(selectedMonth / 3)} ${selectedYear}`;
        if (data.timeFilter === 'year') return `Gesamtjahr ${selectedYear}`;
        return 'Gesamter Zeitraum';
    });
</script>

<div class="relative w-full max-w-full overflow-x-hidden space-y-4 sm:space-y-5 pb-24">
    <BudgetDashboardHeader
        totals={data.totals}
        {periodLabel}
        isLoading={data.isLoading}
        isSyncingInvoices={actions.isSyncingInvoices}
        onSyncInvoices={() => actions.handleSyncInvoices(userId ?? '')}
        onNewContract={() => modalState.openNewContractModal(selectedYear, selectedMonth)}
        onNewEntry={() => modalState.openNewEntryModal(selectedYear, selectedMonth)}
        onFilterArrears={() => (data.statusFilter = 'arrears')}
    />

    <BudgetTimeNav
        bind:selectedYear
        bind:selectedMonth
        bind:timeFilter={data.timeFilter}
        availableYears={data.availableYears}
        monthsWithData={data.monthsWithData}
        monthsWithUnpaid={data.monthsWithUnpaid}
        onPrevMonth={goToPrevMonth}
        onNextMonth={goToNextMonth}
        onGoToday={goToCurrentMonth}
        onSetMonth={(mNum) => { data.timeFilter = 'month'; selectedMonth = mNum; }}
    />

    <BudgetFilterBar
        statusFilter={data.statusFilter}
        categoryFilter={data.categoryFilter}
        searchQuery={data.searchQuery}
        totals={data.totals}
        entries={data.entries}
        contracts={data.contracts}
        onStatusFilter={(f) => (data.statusFilter = f)}
        onCategoryFilter={(c) => (data.categoryFilter = c)}
        onSearchQuery={(q) => (data.searchQuery = q)}
    />

    <main class="space-y-6">
        {#if data.statusFilter === 'contracts'}
            <BudgetContractsSection
                contracts={data.filteredContracts}
                {actions}
                {selectedYear}
                {selectedMonth}
                timeFilter={data.timeFilter}
                onNewContract={() => modalState.openNewContractModal(selectedYear, selectedMonth)}
                onEditContract={(c) => modalState.openEditContractModal(c)}
            />
        {:else}
            <BudgetEntriesSection
                {data}
                {actions}
                {periodLabel}
                showArrearsInCurrentView={modalState.showArrearsInCurrentView}
                {userId}
                onToggleShowArrears={() => (modalState.showArrearsInCurrentView = !modalState.showArrearsInCurrentView)}
                onNewEntry={() => modalState.openNewEntryModal(selectedYear, selectedMonth)}
                onEditEntry={(entry) => modalState.openEditEntryModal(entry)}
                onViewReceipt={(entry) => modalState.handleViewReceipt(actions, entry)}
                onBookNextInstallment={(entry) => modalState.handleBookNextInstallment(actions, entry, selectedYear, selectedMonth)}
                onViewInstallmentPlan={(entry) => (modalState.selectedInstallmentPlanKey = data.getInstallmentPlanKey(entry))}
            />
        {/if}
    </main>

    <BudgetEntryModal
        isOpen={modalState.isEntryModalOpen}
        editingEntry={modalState.editingEntry}
        bind:entryForm={modalState.entryForm}
        bind:entryReceiptFile={modalState.entryReceiptFile}
        onClose={() => (modalState.isEntryModalOpen = false)}
        onSave={() => modalState.handleSaveEntry(actions, userId ?? '')}
        onCalculateInstallmentRate={(dir) => modalState.calculateInstallmentRate(dir)}
    />

    <BudgetContractModal
        isOpen={modalState.isContractModalOpen}
        editingContract={modalState.editingContract}
        bind:contractForm={modalState.contractForm}
        onClose={() => (modalState.isContractModalOpen = false)}
        onSave={() => modalState.handleSaveContract(actions, userId ?? '')}
    />

    <BudgetReceiptModal
        isOpen={modalState.isReceiptModalOpen}
        receiptUrl={modalState.selectedReceiptUrl}
        receiptTitle={modalState.selectedReceiptTitle}
        onClose={() => { modalState.isReceiptModalOpen = false; modalState.selectedReceiptUrl = null; }}
    />

    <BudgetInstallmentModal
        planKey={modalState.selectedInstallmentPlanKey}
        entries={data.entries}
        isEntryArrear={data.isEntryArrear.bind(data)}
        onClose={() => (modalState.selectedInstallmentPlanKey = null)}
        onPayArrear={actions.handlePayArrearNow.bind(actions)}
        onBookNextInstallment={(entry) => modalState.handleBookNextInstallment(actions, entry, selectedYear, selectedMonth)}
    />
</div>
