<script lang="ts">
    import { onMount, untrack } from "svelte";
    import { goto } from "$app/navigation";
    import { pb } from "$lib/services/pocketbase";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import { rbacService } from "$lib/services/rbacService.svelte";
    import { confirmStore } from "$lib/services/confirmService.svelte";
    import { toastStore } from "$lib/services/toastService.svelte";
    import { useBwaService } from "$lib/services/bwaService.svelte";
    import { useBwaPageState } from "$lib/services/bwaPageState.svelte";
    import { lexofficeService } from "$lib/services/lexofficeService.svelte";

    import BwaHeaderBar from "$lib/components/bwa/BwaHeaderBar.svelte";
    import BwaKpiOverview from "$lib/components/bwa/BwaKpiOverview.svelte";
    import BwaCashflowBalance from "$lib/components/bwa/BwaCashflowBalance.svelte";
    import BwaForecastSection from "$lib/components/bwa/BwaForecastSection.svelte";
    import BwaTaxForecastWidget from "$lib/components/bwa/BwaTaxForecastWidget.svelte";
    import BwaActivityGrid from "$lib/components/bwa/BwaActivityGrid.svelte";
    import BwaTable from "$lib/components/bwa/BwaTable.svelte";
    import VmaManager from "$lib/components/vma/VmaManager.svelte";

    // Modale
    import BwaDetailModal from "$lib/components/bwa/BwaDetailModal.svelte";
    import BwaForecastModal from "$lib/components/bwa/BwaForecastModal.svelte";
    import BwaClientsModal from "$lib/components/bwa/BwaClientsModal.svelte";
    import BwaTeamModal from "$lib/components/bwa/BwaTeamModal.svelte";
    import BwaExpensesListModal from "$lib/components/bwa/BwaExpensesListModal.svelte";
    import BwaExpenseModal from "$lib/components/bwa/BwaExpenseModal.svelte";
    import AdminUnifiedFinanceModal from "$lib/components/admin/AdminUnifiedFinanceModal.svelte";

    const bwa = useBwaService();
    const pageState = useBwaPageState(bwa);

    let currentUser = $state(pb.authStore.record || pb.authStore.model);
    let isGodMode = $derived(rbacService.isOwner);

    // Berechtigungsprüfung
    $effect(() => {
        if (!rbacService.canAccessFinances) {
            untrack(() => {
                toastStore.warning("Keine Berechtigung für BWA- und Finanzdaten.");
                goto('/dashboard');
            });
        }
    });

    // Automatisches Nachladen der Ausgaben bei Filterwechsel
    $effect(() => {
        const _cid = bwa.selectedCompanyId;
        const _yr = bwa.selectedYear;
        untrack(() => { bwa.loadExpenses(); });
    });

    // Modale Referenzen
    // svelte-ignore non_reactive_update
    let bwaDetailModal: ReturnType<typeof BwaDetailModal>;
    // svelte-ignore non_reactive_update
    let forecastModal: ReturnType<typeof BwaForecastModal>;
    // svelte-ignore non_reactive_update
    let unifiedFinanceModal: ReturnType<typeof AdminUnifiedFinanceModal>;
    // svelte-ignore non_reactive_update
    let clientsModal: ReturnType<typeof BwaClientsModal>;
    // svelte-ignore non_reactive_update
    let teamModal: ReturnType<typeof BwaTeamModal>;
    // svelte-ignore non_reactive_update
    let expensesListModal: ReturnType<typeof BwaExpensesListModal>;
    // svelte-ignore non_reactive_update
    let expenseModal: ReturnType<typeof BwaExpenseModal>;

    let printMode = $state<'management' | 'tax'>('management');

    function openMonthBwa(month: number, year?: number) {
        pageState.selectedMonth = month;
        if (year) bwa.selectedYear = year;
        pageState.viewMode = 'monthly';
        bwaDetailModal?.showModal();
    }

    function handlePrintTrigger(mode: 'management' | 'tax') {
        printMode = mode;
        setTimeout(() => {
            if (typeof window !== 'undefined') window.print();
        }, 150);
    }

    onMount(() => {
        if (typeof localStorage !== 'undefined') {
            const stored = localStorage.getItem('global_company_id');
            if (stored) bwa.selectedCompanyId = stored;
        }
        lexofficeService.autoRefreshOnPageVisit(bwa.selectedCompanyId).catch(() => {});
        setTimeout(() => { pageState.updateVma(true); }, 500);
        if (typeof window !== 'undefined' && window.location.search.includes('newReceipt=1')) {
            setTimeout(() => expenseModal?.showModal(), 250);
        }

        const handleSync = (e: any) => {
            bwa.selectedCompanyId = e.detail;
            lexofficeService.autoRefreshOnPageVisit(e.detail).catch(() => {});
        };
        const handleLexSynced = () => { bwa.loadExpenses(); };
        window.addEventListener('global-company-changed', handleSync);
        window.addEventListener('lexoffice-synced', handleLexSynced);
        return () => {
            window.removeEventListener('global-company-changed', handleSync);
            window.removeEventListener('lexoffice-synced', handleLexSynced);
        };
    });
</script>

<svelte:head>
    <title>Firmenfinanzen &amp; BWA | OrgaFlow</title>
</svelte:head>

<div class="space-y-6">
    <BwaHeaderBar 
        {bwa} 
        {pageState} 
        {isGodMode} 
        onNewExpense={() => expenseModal?.showModal()} 
        onPrint={handlePrintTrigger} 
    />

    {#if orgaStore.invoices?.isLoading || orgaStore.appointments?.isLoading}
        <div class="flex flex-col items-center justify-center py-24 gap-3">
            <div class="w-12 h-12 border-4 border-indigo-200 dark:border-indigo-900 border-t-indigo-600 rounded-full animate-spin"></div>
            <p class="text-sm text-neutral-400 font-semibold">Finanzdaten werden geladen…</p>
        </div>
    {:else}
        {#if pageState.activeTab === 'dashboard'}
            <div class="space-y-6">
                <!-- 1. Verständliche Kennzahlen & Reingewinn-Hero -->
                <BwaKpiOverview {pageState} onOpenDetail={() => bwaDetailModal?.showModal()} />

                <!-- 2. Mittlerer Bereich: Finanz-Balance & Zeitraum/Prognose -->
                <div class="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                    <div class="xl:col-span-5">
                        <BwaCashflowBalance {pageState} onOpenDetail={() => bwaDetailModal?.showModal()} />
                    </div>
                    <div class="xl:col-span-7">
                        <BwaForecastSection 
                            {bwa} 
                            {pageState} 
                            onOpenMonthBwa={openMonthBwa} 
                            onOpenAiForecast={() => unifiedFinanceModal?.open(undefined, bwa.selectedYear)} 
                        />
                    </div>
                </div>

                <!-- 3. Steuer-Prognose Diagramm -->
                <div class="print:hidden">
                    <BwaTaxForecastWidget 
                        {bwa} 
                        bind:selectedMonth={pageState.selectedMonth} 
                        selectedYear={bwa.selectedYear} 
                        viewMode={pageState.viewMode} 
                        currentBWA={pageState.currentBWA} 
                        currentTaxEstimate={pageState.currentTaxEstimate} 
                        onSelectMonth={openMonthBwa} 
                    />
                </div>

                <!-- 4. Aktivitäten & Ausklappbare Detail-BWA -->
                <BwaActivityGrid 
                    {bwa} 
                    {pageState} 
                    onOpenClients={() => clientsModal?.showModal()} 
                    onOpenTeam={() => teamModal?.showModal()} 
                    onOpenExpenses={() => expensesListModal?.showModal()} 
                    onNewExpense={() => expenseModal?.showModal()} 
                    onOpenVmaTab={() => pageState.activeTab = 'vma'} 
                />
            </div>
        {:else}
            <div class="animate-enter"><VmaManager /></div>
        {/if}

        <!-- PRINT VIEW -->
        {#if pageState.activeTab === 'dashboard'}
            <div class="hidden print:block w-full pt-2">
                <div class="flex items-center justify-between border-b-2 border-neutral-800 pb-3 mb-4">
                    <div>
                        <h1 class="text-2xl font-black text-neutral-900 mb-1">
                            {printMode === 'management' ? 'Finanz- und Management-Übersicht' : 'Betriebswirtschaftliche Auswertung (BWA)'}
                        </h1>
                        <p class="text-xs text-neutral-500 font-medium">Zeitraum: {pageState.viewMode === 'monthly' ? `Monat ${pageState.selectedMonth}` : (pageState.viewMode === 'quarterly' ? `Quartal ${pageState.selectedQuarter}` : 'Jahresansicht')} {bwa.selectedYear}</p>
                    </div>
                    <div class="text-right">
                        <p class="text-xs font-bold text-neutral-800">OrgaFlow Finanzwesen</p>
                        <p class="text-[10px] text-neutral-400">Erstellt am {new Date().toLocaleDateString('de-DE')} um {new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr</p>
                    </div>
                </div>
                <BwaTable 
                    currentBWA={pageState.currentBWA} 
                    ytdBWA={pageState.ytdBWA} 
                    viewMode={pageState.viewMode} 
                    selectedMonth={pageState.selectedMonth} 
                    selectedQuarter={pageState.selectedQuarter} 
                    selectedYear={bwa.selectedYear} 
                    selectedCompanyId={bwa.selectedCompanyId} 
                />
            </div>
        {/if}

        <!-- Alle Modale gebündelt -->
        <BwaDetailModal bind:this={bwaDetailModal} currentBWA={pageState.currentBWA} ytdBWA={pageState.ytdBWA} viewMode={pageState.viewMode} selectedMonth={pageState.selectedMonth} selectedQuarter={pageState.selectedQuarter} selectedYear={bwa.selectedYear} selectedCompanyId={bwa.selectedCompanyId} />
        <BwaForecastModal bind:this={forecastModal} forecastStats={bwa.forecastStats} bind:forecastScenario={pageState.forecastScenario} onSelectMonth={openMonthBwa} />
        <AdminUnifiedFinanceModal bind:this={unifiedFinanceModal} />
        <BwaClientsModal bind:this={clientsModal} clientStats={bwa.stats.clientStats} />
        <BwaTeamModal bind:this={teamModal} userStats={bwa.stats.userStats} />
        <BwaExpensesListModal 
            bind:this={expensesListModal} 
            companyExpenses={bwa.companyExpenses} 
            onDeleteExpense={async (id: string) => { if(await confirmStore.ask("Ausgabe wirklich löschen?", "Ausgabe löschen?", "Löschen", "Abbrechen", true)) bwa.deleteExpense(id); }} 
            onNewExpense={() => expenseModal?.showModal()} 
            onBookInstallment={(exp: any) => expenseModal?.bookNextInstallment(exp)} 
        />
        <BwaExpenseModal bind:this={expenseModal} {bwa} {isGodMode} {currentUser} />
    {/if}
</div>
