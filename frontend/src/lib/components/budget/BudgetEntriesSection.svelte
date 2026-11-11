<script lang="ts">
    import { AlertTriangle, FileCheck, Layers, CheckCircle2, DollarSign, RefreshCw, Plus } from 'lucide-svelte';
    import BudgetCard from './BudgetCard.svelte';
    import BudgetArrearsBanner from './BudgetArrearsBanner.svelte';
    import type { BudgetEntry } from '$lib/types/budget';
    import type { BudgetData } from './useBudgetData.svelte';
    import type { BudgetActions } from './useBudgetActions.svelte';

    interface Props {
        data: BudgetData;
        actions: BudgetActions;
        periodLabel: string;
        showArrearsInCurrentView: boolean;
        userId?: string;
        onToggleShowArrears: () => void;
        onNewEntry: () => void;
        onEditEntry: (entry: BudgetEntry) => void;
        onViewReceipt: (entry: BudgetEntry) => void;
        onBookNextInstallment: (entry: BudgetEntry) => void;
        onViewInstallmentPlan: (entry: BudgetEntry) => void;
    }

    let {
        data,
        actions,
        periodLabel,
        showArrearsInCurrentView,
        userId,
        onToggleShowArrears,
        onNewEntry,
        onEditEntry,
        onViewReceipt,
        onBookNextInstallment,
        onViewInstallmentPlan
    }: Props = $props();
</script>

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

    {#if data.arrearsExpenseEntries.length > 0 && data.statusFilter !== 'arrears' && data.timeFilter === 'month'}
        <BudgetArrearsBanner
            arrearsEntries={data.arrearsExpenseEntries}
            arrearsCount={data.totals.arrearsCount}
            arrearsInstallmentsCount={data.totals.arrearsInstallmentsCount}
            showArrears={showArrearsInCurrentView}
            {actions}
            onToggleShowArrears={onToggleShowArrears}
            onEditEntry={onEditEntry}
            onViewReceipt={onViewReceipt}
            onBookNextInstallment={onBookNextInstallment}
            onViewInstallmentPlan={onViewInstallmentPlan}
        />
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
                    class="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 cursor-pointer touch-manipulation"
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
                    class="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-teal-700 active:scale-95 cursor-pointer touch-manipulation"
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
                    onclick={onNewEntry}
                    class="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-700 active:scale-95 cursor-pointer touch-manipulation"
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
                    onclick={onNewEntry}
                    class="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-700 active:scale-95 cursor-pointer touch-manipulation"
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
                    onEdit={onEditEntry}
                    onDelete={actions.handleDeleteEntry.bind(actions)}
                    onViewReceipt={onViewReceipt}
                    onBookNextInstallment={onBookNextInstallment}
                    onPayArrearNow={actions.handlePayArrearNow.bind(actions)}
                    onViewInstallmentPlan={onViewInstallmentPlan}
                />
            {/each}
        </div>
    {/if}
</section>
