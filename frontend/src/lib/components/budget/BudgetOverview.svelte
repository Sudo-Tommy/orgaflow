<script lang="ts">
    import { onDestroy } from 'svelte';
    import { pb } from '$lib/services/pocketbase';
    import { resolveEffectiveUserId } from '$lib/services/personalFinanceService.svelte';
    import type { BudgetEntry, Contract, BudgetEntryType, PaymentStatus, PaymentMethod, ContractInterval } from '$lib/types/budget';

    import { BudgetData } from './useBudgetData.svelte';
    import { BudgetActions } from './useBudgetActions.svelte';
    import type { EntryFormState, ContractFormState } from './useBudgetActions.svelte';

    import BudgetDashboardHeader from './BudgetDashboardHeader.svelte';
    import BudgetTimeNav from './BudgetTimeNav.svelte';
    import BudgetFilterBar from './BudgetFilterBar.svelte';
    import BudgetEntryModal from './BudgetEntryModal.svelte';
    import BudgetContractModal from './BudgetContractModal.svelte';
    import BudgetInstallmentModal from './BudgetInstallmentModal.svelte';
    import BudgetCard from './BudgetCard.svelte';
    import ContractCard from './ContractCard.svelte';
    import {
        AlertTriangle,
        FileCheck,
        Layers,
        CheckCircle2,
        DollarSign,
        Repeat,
        RefreshCw,
        Plus,
        Download,
        X
    } from 'lucide-svelte';

    // Props (inklusive bindbarer Monat- und Jahresauswahl)
    let {
        initialEntries = [],
        initialContracts = [],
        userId = pb.authStore.model?.id,
        selectedYear = $bindable(new Date().getFullYear()),
        selectedMonth = $bindable(new Date().getMonth() + 1)
    } = $props<{
        initialEntries?: BudgetEntry[];
        initialContracts?: Contract[];
        userId?: string;
        selectedYear?: number;
        selectedMonth?: number;
    }>();

    // -------------------------------------------------------------------------
    // COMPOSABLE-INSTANZEN
    // -------------------------------------------------------------------------
    const data = new BudgetData(
        () => selectedYear,
        () => selectedMonth
    );
    const actions = new BudgetActions(data);

    // -------------------------------------------------------------------------
    // MODAL-STATE (Bleibt in der UI-Schicht)
    // -------------------------------------------------------------------------
    let isEntryModalOpen = $state(false);
    let isContractModalOpen = $state(false);
    let isReceiptModalOpen = $state(false);
    let selectedReceiptUrl = $state<string | null>(null);
    let selectedReceiptTitle = $state<string>('');
    let showArrearsInCurrentView = $state(true);
    let selectedInstallmentPlanKey = $state<string | null>(null);

    // Editier-Zustände
    let editingEntry = $state<BudgetEntry | null>(null);
    let editingContract = $state<Contract | null>(null);

    // Formular-State für Buchung
    let entryForm = $state<EntryFormState>({
        type: 'expense' as BudgetEntryType,
        title: '',
        description: '',
        amount: '' as number | '',
        category: 'Sonstiges',
        payment_status: 'open' as PaymentStatus,
        invoice_number: '',
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: '',
        paid_at: '',
        recipient_or_payer: '',
        payment_method: 'bank_transfer' as PaymentMethod,
        contract_id: '',
        is_installment: false,
        installment_current: 1 as number | '',
        installment_total_count: 12 as number | '',
        installment_total_amount: '' as number | ''
    });
    let entryReceiptFile = $state<File | null>(null);

    // Formular-State für Vertrag
    let contractForm = $state<ContractFormState>({
        partner_name: '',
        contract_number: '',
        amount: '' as number | '',
        interval: 'monthly' as ContractInterval,
        next_due_date: new Date().toISOString().split('T')[0],
        payment_status: 'open',
        category: 'Miete & Wohnen',
        auto_book: false,
        is_active: true,
        description: ''
    });

    // -------------------------------------------------------------------------
    // INITIALISIERUNG & REALTIME
    // -------------------------------------------------------------------------
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

    // -------------------------------------------------------------------------
    // MONATSSTEUERUNG
    // -------------------------------------------------------------------------
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

    function setMonth(mNum: number) {
        data.timeFilter = 'month';
        selectedMonth = mNum;
    }

    // -------------------------------------------------------------------------
    // LABELS
    // -------------------------------------------------------------------------
    let periodLabel = $derived.by(() => {
        const mName = new Date(selectedYear, selectedMonth - 1, 1).toLocaleString('de-DE', { month: 'long' });
        if (data.timeFilter === 'month' || data.timeFilter === 'this_month') {
            return `${mName} ${selectedYear}`;
        } else if (data.timeFilter === 'last_month') {
            const prev = new Date(selectedYear, selectedMonth - 2, 1);
            return `${prev.toLocaleString('de-DE', { month: 'long' })} ${prev.getFullYear()}`;
        } else if (data.timeFilter === 'quarter') {
            return `Q${Math.ceil(selectedMonth / 3)} ${selectedYear}`;
        } else if (data.timeFilter === 'year') {
            return `Gesamtjahr ${selectedYear}`;
        }
        return 'Gesamter Zeitraum';
    });

    // -------------------------------------------------------------------------
    // MODAL-ÖFFNER
    // -------------------------------------------------------------------------
    function openNewEntryModal() {
        const defaultDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
        editingEntry = null;
        entryForm = {
            type: 'expense',
            title: '',
            description: '',
            amount: '',
            category: 'Büromaterial',
            payment_status: 'open',
            invoice_number: '',
            invoice_date: defaultDate,
            due_date: '',
            paid_at: '',
            recipient_or_payer: '',
            payment_method: 'bank_transfer',
            contract_id: '',
            is_installment: false,
            installment_current: 1,
            installment_total_count: 12,
            installment_total_amount: ''
        };
        entryReceiptFile = null;
        isEntryModalOpen = true;
    }

    function openEditEntryModal(entry: BudgetEntry) {
        editingEntry = entry;
        entryForm = {
            type: entry.type,
            title: entry.title,
            description: entry.description || '',
            amount: entry.amount,
            category: entry.category || 'Sonstiges',
            payment_status: entry.payment_status,
            invoice_number: entry.invoice_number || '',
            invoice_date: entry.invoice_date ? entry.invoice_date.substring(0, 10) : '',
            due_date: entry.due_date ? entry.due_date.substring(0, 10) : '',
            paid_at: entry.paid_at ? entry.paid_at.substring(0, 10) : '',
            recipient_or_payer: entry.recipient_or_payer || '',
            payment_method: entry.payment_method || 'bank_transfer',
            contract_id: entry.contract_id || '',
            is_installment: !!entry.is_installment,
            installment_current: entry.installment_current ?? 1,
            installment_total_count: entry.installment_total_count ?? 12,
            installment_total_amount: entry.installment_total_amount ?? ''
        };
        entryReceiptFile = null;
        isEntryModalOpen = true;
    }

    function openNewContractModal() {
        const defaultDue = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
        editingContract = null;
        contractForm = {
            partner_name: '',
            contract_number: '',
            amount: '',
            interval: 'monthly',
            next_due_date: defaultDue,
            payment_status: 'open',
            category: 'Miete & Wohnen',
            auto_book: false,
            is_active: true,
            description: ''
        };
        isContractModalOpen = true;
    }

    function openEditContractModal(contract: Contract) {
        editingContract = contract;
        contractForm = {
            partner_name: contract.partner_name,
            contract_number: contract.contract_number || '',
            amount: contract.amount,
            interval: contract.interval,
            next_due_date: contract.next_due_date ? contract.next_due_date.substring(0, 10) : '',
            payment_status: contract.payment_status,
            category: contract.category || 'Miete & Wohnen',
            auto_book: contract.auto_book,
            is_active: contract.is_active,
            description: contract.description || ''
        };
        isContractModalOpen = true;
    }

    // -------------------------------------------------------------------------
    // CALLBACK-WRAPPER (verbinden Actions mit Modal-State)
    // -------------------------------------------------------------------------

    // Automatische Berechnungshilfe für Ratenzahlung
    function calculateInstallmentRate(direction: 'from_totals' | 'from_amount' = 'from_totals') {
        if (!entryForm.is_installment) return;
        const tot = Number(entryForm.installment_total_amount);
        const count = Number(entryForm.installment_total_count);
        const amt = Number(entryForm.amount);
        if (direction === 'from_totals') {
            if (tot > 0 && count > 0) entryForm.amount = parseFloat((tot / count).toFixed(2));
        } else if (direction === 'from_amount') {
            if (amt > 0 && count > 0) entryForm.installment_total_amount = parseFloat((amt * count).toFixed(2));
        }
    }

    async function handleSaveEntry() {
        const ok = await actions.handleSaveEntry(entryForm, entryReceiptFile, editingEntry, userId ?? '');
        if (ok) isEntryModalOpen = false;
    }

    async function handleSaveContract() {
        const ok = await actions.handleSaveContract(contractForm, editingContract, userId ?? '');
        if (ok) isContractModalOpen = false;
    }

    function handleViewReceipt(entry: BudgetEntry) {
        const result = actions.handleViewReceipt(entry);
        if (result) {
            selectedReceiptUrl = result.url;
            selectedReceiptTitle = result.title;
            isReceiptModalOpen = true;
        }
    }

    async function handleBookNextInstallment(entry: BudgetEntry) {
        const prefilled = await actions.handleBookNextInstallment(entry, selectedYear, selectedMonth);
        if (prefilled) {
            editingEntry = null;
            entryForm = { ...entryForm, ...prefilled };
            entryReceiptFile = null;
            isEntryModalOpen = true;
        }
    }

    function openInstallmentPlanModal(entry: BudgetEntry) {
        selectedInstallmentPlanKey = data.getInstallmentPlanKey(entry);
    }
</script>

<div class="relative w-full max-w-full overflow-x-hidden space-y-4 sm:space-y-5 pb-24">
    <!-- ===================================================================== -->
    <!-- 1. FINANZ-DASHBOARD & KENNZAHLEN                                       -->
    <!-- ===================================================================== -->
    <BudgetDashboardHeader
        totals={data.totals}
        {periodLabel}
        isLoading={data.isLoading}
        isSyncingInvoices={actions.isSyncingInvoices}
        onSyncInvoices={() => actions.handleSyncInvoices(userId ?? '')}
        onNewContract={openNewContractModal}
        onNewEntry={openNewEntryModal}
        onFilterArrears={() => (data.statusFilter = 'arrears')}
    />

    <!-- ===================================================================== -->
    <!-- 2. ZEIT- & MONATSSTEUERUNG                                             -->
    <!-- ===================================================================== -->
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
        onSetMonth={setMonth}
    />

    <!-- ===================================================================== -->
    <!-- 3. FILTER- & SORTIERLEISTE                                             -->
    <!-- ===================================================================== -->
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

    <!-- ===================================================================== -->
    <!-- 4. BUCHUNGS- & VERTRAGSLISTE                                           -->
    <!-- ===================================================================== -->
    <main class="space-y-6">
        <!-- FALL A: Reine Vertragsansicht gewählt -->
        {#if data.statusFilter === 'contracts'}
            <section class="space-y-4">
                <div class="flex items-center justify-between">
                    <h2 class="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <Repeat class="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        <span>Laufende Verträge & Fixkosten ({data.filteredContracts.length})</span>
                    </h2>
                </div>

                {#if data.filteredContracts.length === 0}
                    <div class="rounded-2xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
                        <Repeat class="mx-auto h-10 w-10 text-slate-400 mb-2" />
                        <h3 class="text-base font-semibold text-slate-800 dark:text-slate-200">Keine Verträge gefunden</h3>
                        <p class="text-sm text-slate-500 mt-1">Legen Sie Daueraufträge, Versicherungen oder Software-Abos an.</p>
                        <button
                            type="button"
                            onclick={openNewContractModal}
                            class="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-purple-700 active:scale-95 cursor-pointer"
                        >
                            <Plus class="h-4 w-4" />
                            <span>Vertrag anlegen</span>
                        </button>
                    </div>
                {:else}
                    <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        {#each data.filteredContracts as contract (contract.id)}
                            <ContractCard
                                {contract}
                                onBookNow={(c) => actions.handleBookContractNow(c, selectedYear, selectedMonth, data.timeFilter)}
                                onToggleStatus={actions.handleToggleContractStatus.bind(actions)}
                                onEdit={openEditContractModal}
                                onDelete={actions.handleDeleteContract.bind(actions)}
                            />
                        {/each}
                    </div>
                {/if}
            </section>

        {:else}
            <!-- FALL B: Buchungen -->
            <section class="space-y-4">
                <div class="flex items-center justify-between">
                    <h2 class="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        {#if data.statusFilter === 'arrears'}
                            <AlertTriangle class="h-5 w-5 text-rose-600 dark:text-rose-400" />
                            <span>Überfällige Zahlungsrückstände aus Vormonaten ({data.filteredEntries.length})</span>
                        {:else if data.statusFilter === 'invoices'}
                            <FileCheck class="h-5 w-5 text-teal-600 dark:text-teal-400" />
                            <span>Kundenrechnungen & Einnahmen ({data.filteredEntries.length})</span>
                        {:else if data.statusFilter === 'installments'}
                            <Layers class="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                            <span>Laufende Ratenzahlungen & Finanzierungen ({data.filteredEntries.length})</span>
                        {:else}
                            <span>Buchungen für {periodLabel} ({data.filteredEntries.length})</span>
                        {/if}
                    </h2>
                </div>

                <!-- PROMINENTES RÜCKSTANDS-BANNER -->
                {#if data.arrearsExpenseEntries.length > 0 && data.statusFilter !== 'arrears' && data.timeFilter === 'month'}
                    <div class="rounded-2xl border-2 border-amber-300/90 bg-gradient-to-br from-amber-50/90 via-orange-50/70 to-rose-50/80 p-4 sm:p-5 shadow-sm dark:border-amber-700/60 dark:from-amber-950/40 dark:via-orange-950/30 dark:to-rose-950/30 space-y-3">
                        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200/80 pb-3 dark:border-amber-900/60">
                            <div class="flex items-start gap-2.5">
                                <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-xs">
                                    <AlertTriangle class="h-5 w-5 animate-pulse" />
                                </div>
                                <div>
                                    <h3 class="text-sm sm:text-base font-bold text-amber-950 dark:text-amber-100 flex items-center gap-2">
                                        <span>Zahlungsrückstände aus Vormonaten!</span>
                                        <span class="rounded-full bg-amber-200 px-2 py-0.5 text-xs font-extrabold text-amber-900 dark:bg-amber-800 dark:text-amber-100">
                                            {data.totals.arrearsCount} Posten
                                        </span>
                                    </h3>
                                    <p class="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
                                        {data.totals.arrearsInstallmentsCount > 0 ? `${data.totals.arrearsInstallmentsCount} unbezahlte Rate(n) ` : ''}im Gesamtwert von <strong>{import('$lib/types/budget').then(() => '')}</strong>
                                        wurden in Vormonaten nicht überwiesen.
                                    </p>
                                </div>
                            </div>

                            <div class="flex items-center gap-2 self-end sm:self-auto">
                                <button
                                    type="button"
                                    onclick={() => (showArrearsInCurrentView = !showArrearsInCurrentView)}
                                    class="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-amber-300 bg-white/90 px-3 py-1.5 text-xs font-bold text-amber-900 shadow-2xs hover:bg-white active:scale-95 transition-all dark:border-amber-800 dark:bg-amber-900/50 dark:text-amber-200 cursor-pointer"
                                >
                                    <span>{showArrearsInCurrentView ? 'Rückstände einklappen' : 'Rückstände einblenden'}</span>
                                </button>
                            </div>
                        </div>

                        {#if showArrearsInCurrentView}
                            <div class="grid grid-cols-1 gap-3 lg:grid-cols-2 pt-1">
                                {#each data.arrearsExpenseEntries as arrearEntry (arrearEntry.id)}
                                    <BudgetCard
                                        entry={arrearEntry}
                                        isArrear={true}
                                        onToggleStatus={actions.handleToggleEntryStatus.bind(actions)}
                                        onEdit={openEditEntryModal}
                                        onDelete={actions.handleDeleteEntry.bind(actions)}
                                        onViewReceipt={handleViewReceipt}
                                        onBookNextInstallment={handleBookNextInstallment}
                                        onPayArrearNow={actions.handlePayArrearNow.bind(actions)}
                                        onViewInstallmentPlan={openInstallmentPlanModal}
                                    />
                                {/each}
                            </div>
                        {/if}
                    </div>
                {/if}

                {#if data.filteredEntries.length === 0}
                    <div class="rounded-2xl border border-dashed border-slate-300 p-10 text-center dark:border-slate-700">
                        {#if data.statusFilter === 'arrears'}
                            <CheckCircle2 class="mx-auto h-10 w-10 text-emerald-500 mb-2" />
                            <h3 class="text-base font-semibold text-slate-800 dark:text-slate-200">Keine Zahlungsrückstände!</h3>
                            <p class="text-sm text-slate-500 mt-1">Alle Raten und Verbindlichkeiten aus den Vormonaten wurden planmäßig überwiesen.</p>
                            <button
                                type="button"
                                onclick={() => (data.statusFilter = 'all')}
                                class="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 cursor-pointer"
                            >
                                <span>Zurück zu allen Buchungen</span>
                            </button>
                        {:else if data.statusFilter === 'invoices'}
                            <FileCheck class="mx-auto h-10 w-10 text-teal-400 mb-2" />
                            <h3 class="text-base font-semibold text-slate-800 dark:text-slate-200">Keine Rechnungen im Zeitraum {periodLabel}</h3>
                            <p class="text-sm text-slate-500 mt-1">Klicken Sie oben auf „Rechnungen Sync", um abgeschlossene Ausgangsrechnungen abzugleichen, oder wählen Sie einen anderen Monat.</p>
                            <button
                                type="button"
                                onclick={() => actions.handleSyncInvoices(userId ?? '')}
                                class="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-teal-700 active:scale-95 cursor-pointer"
                            >
                                <RefreshCw class="h-4 w-4" />
                                <span>Jetzt Rechnungen abgleichen</span>
                            </button>
                        {:else if data.statusFilter === 'installments'}
                            <Layers class="mx-auto h-10 w-10 text-slate-400 mb-2" />
                            <h3 class="text-base font-semibold text-slate-800 dark:text-slate-200">Keine Ratenzahlungen vorhanden</h3>
                            <p class="text-sm text-slate-500 mt-1">Erfassen Sie eine Buchung und aktivieren Sie das Kontrollkästchen „Ratenzahlung".</p>
                            <button
                                type="button"
                                onclick={openNewEntryModal}
                                class="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-700 active:scale-95 cursor-pointer"
                            >
                                <Plus class="h-4 w-4" />
                                <span>Neue Buchung anlegen</span>
                            </button>
                        {:else}
                            <DollarSign class="mx-auto h-10 w-10 text-slate-400 mb-2" />
                            <h3 class="text-base font-semibold text-slate-800 dark:text-slate-200">Keine Buchungen für {periodLabel}</h3>
                            <p class="text-sm text-slate-500 mt-1">Nutzen Sie die Monatsleiste oben zum Wechseln oder erfassen Sie eine neue Buchung.</p>
                            <button
                                type="button"
                                onclick={openNewEntryModal}
                                class="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-700 active:scale-95 cursor-pointer"
                            >
                                <Plus class="h-4 w-4" />
                                <span>Neue Buchung anlegen</span>
                            </button>
                        {/if}
                    </div>
                {:else}
                    <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        {#each data.filteredEntries as entry (entry.id)}
                            <BudgetCard
                                {entry}
                                isArrear={data.isEntryArrear(entry)}
                                onToggleStatus={actions.handleToggleEntryStatus.bind(actions)}
                                onEdit={openEditEntryModal}
                                onDelete={actions.handleDeleteEntry.bind(actions)}
                                onViewReceipt={handleViewReceipt}
                                onBookNextInstallment={handleBookNextInstallment}
                                onPayArrearNow={actions.handlePayArrearNow.bind(actions)}
                                onViewInstallmentPlan={openInstallmentPlanModal}
                            />
                        {/each}
                    </div>
                {/if}
            </section>
        {/if}
    </main>

    <!-- ===================================================================== -->
    <!-- 5. MODAL: BUCHUNG ERSTELLEN / BEARBEITEN                               -->
    <!-- ===================================================================== -->
    <BudgetEntryModal
        isOpen={isEntryModalOpen}
        {editingEntry}
        bind:entryForm
        bind:entryReceiptFile
        onClose={() => (isEntryModalOpen = false)}
        onSave={handleSaveEntry}
        onCalculateInstallmentRate={calculateInstallmentRate}
    />

    <!-- ===================================================================== -->
    <!-- 6. MODAL: VERTRAG ERSTELLEN / BEARBEITEN                               -->
    <!-- ===================================================================== -->
    <BudgetContractModal
        isOpen={isContractModalOpen}
        {editingContract}
        bind:contractForm
        onClose={() => (isContractModalOpen = false)}
        onSave={handleSaveContract}
    />

    <!-- ===================================================================== -->
    <!-- 7. MODAL: BELEG-VORSCHAU                                               -->
    <!-- ===================================================================== -->
    {#if isReceiptModalOpen && selectedReceiptUrl}
        <div class="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-sm p-3 sm:p-6 flex min-h-full items-center justify-center">
            <div class="relative w-full max-w-3xl my-auto rounded-3xl border border-slate-100 bg-white p-5 sm:p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 overflow-hidden flex flex-col max-h-[92dvh]">
                <div class="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800 shrink-0">
                    <h3 class="truncate text-base font-bold text-slate-900 dark:text-white" title={selectedReceiptTitle}>
                        {selectedReceiptTitle}
                    </h3>
                    <div class="flex items-center gap-2">
                        <a
                            href={selectedReceiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            class="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 flex items-center justify-center transition"
                            title="In neuem Tab öffnen / herunterladen"
                        >
                            <Download class="h-4 w-4" />
                        </a>
                        <button
                            type="button"
                            onclick={() => { isReceiptModalOpen = false; selectedReceiptUrl = null; }}
                            aria-label="Schließen"
                            title="Schließen"
                            class="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 flex items-center justify-center transition cursor-pointer"
                        >
                            <X class="h-4 w-4" />
                        </button>
                    </div>
                </div>

                <div class="mt-4 rounded-2xl bg-slate-100 p-2 dark:bg-slate-950 flex items-center justify-center flex-1 overflow-hidden min-h-0">
                    {#if selectedReceiptUrl.toLowerCase().includes('.pdf')}
                        <iframe
                            src={selectedReceiptUrl}
                            class="h-[60vh] max-h-full w-full rounded-xl border-0"
                            title="PDF Beleg-Vorschau"
                        ></iframe>
                    {:else}
                        <img
                            src={selectedReceiptUrl}
                            alt="Beleg-Vorschau"
                            class="max-h-[60vh] max-w-full rounded-xl object-contain shadow-md"
                        />
                    {/if}
                </div>
            </div>
        </div>
    {/if}

    <!-- ===================================================================== -->
    <!-- 8. MODAL: RATENPLAN-INSPEKTOR                                          -->
    <!-- ===================================================================== -->
    <BudgetInstallmentModal
        planKey={selectedInstallmentPlanKey}
        entries={data.entries}
        isEntryArrear={data.isEntryArrear.bind(data)}
        onClose={() => (selectedInstallmentPlanKey = null)}
        onPayArrear={actions.handlePayArrearNow.bind(actions)}
        onBookNextInstallment={handleBookNextInstallment}
    />
</div>
