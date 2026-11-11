<script lang="ts">
    import { AlertTriangle } from 'lucide-svelte';
    import BudgetCard from './BudgetCard.svelte';
    import type { BudgetEntry } from '$lib/types/budget';
    import type { BudgetActions } from './useBudgetActions.svelte';

    interface Props {
        arrearsEntries: BudgetEntry[];
        arrearsCount: number;
        arrearsInstallmentsCount: number;
        showArrears: boolean;
        actions: BudgetActions;
        onToggleShowArrears: () => void;
        onEditEntry: (entry: BudgetEntry) => void;
        onViewReceipt: (entry: BudgetEntry) => void;
        onBookNextInstallment: (entry: BudgetEntry) => void;
        onViewInstallmentPlan: (entry: BudgetEntry) => void;
    }

    let {
        arrearsEntries,
        arrearsCount,
        arrearsInstallmentsCount,
        showArrears,
        actions,
        onToggleShowArrears,
        onEditEntry,
        onViewReceipt,
        onBookNextInstallment,
        onViewInstallmentPlan
    }: Props = $props();
</script>

<div class="rounded-2xl border-2 border-amber-300/90 bg-linear-to-br from-amber-50/90 via-orange-50/70 to-rose-50/80 p-4 sm:p-5 shadow-sm dark:border-amber-700/60 dark:from-amber-950/40 dark:via-orange-950/30 dark:to-rose-950/30 space-y-3">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200/80 pb-3 dark:border-amber-900/60">
        <div class="flex items-start gap-2.5">
            <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-xs">
                <AlertTriangle class="h-5 w-5 animate-pulse" />
            </div>
            <div>
                <h3 class="text-sm sm:text-base font-bold text-amber-950 dark:text-amber-100 flex items-center gap-2">
                    <span>Zahlungsrückstände aus Vormonaten!</span>
                    <span class="rounded-full bg-amber-200 px-2 py-0.5 text-xs font-extrabold text-amber-900 dark:bg-amber-800 dark:text-amber-100">
                        {arrearsCount} Posten
                    </span>
                </h3>
                <p class="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
                    {arrearsInstallmentsCount > 0 ? `${arrearsInstallmentsCount} unbezahlte Rate(n) ` : ''}wurden in Vormonaten noch nicht überwiesen.
                </p>
            </div>
        </div>

        <div class="flex items-center gap-2 self-end sm:self-auto">
            <button
                type="button"
                onclick={onToggleShowArrears}
                class="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-amber-300 bg-white/90 px-3 py-1.5 text-xs font-bold text-amber-900 shadow-2xs hover:bg-white active:scale-95 transition-all dark:border-amber-800 dark:bg-amber-900/50 dark:text-amber-200 cursor-pointer touch-manipulation"
            >
                <span>{showArrears ? 'Rückstände einklappen' : 'Rückstände einblenden'}</span>
            </button>
        </div>
    </div>

    {#if showArrears}
        <div class="grid grid-cols-1 gap-3 lg:grid-cols-2 pt-1">
            {#each arrearsEntries as arrearEntry (arrearEntry.id)}
                <BudgetCard
                    entry={arrearEntry}
                    isArrear={true}
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
</div>
