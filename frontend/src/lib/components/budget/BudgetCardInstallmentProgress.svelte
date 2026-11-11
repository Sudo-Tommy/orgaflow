<script lang="ts">
    import type { BudgetEntry, getInstallmentProgress } from '$lib/types/budget';
    import { formatCurrency } from '$lib/types/budget';
    import { Layers, Check, AlertTriangle, ListTree } from 'lucide-svelte';

    let {
        entry,
        installmentInfo,
        isArrear = false,
        isOverdue = false,
        onViewInstallmentPlan
    } = $props<{
        entry: BudgetEntry;
        installmentInfo: NonNullable<ReturnType<typeof getInstallmentProgress>>;
        isArrear?: boolean;
        isOverdue?: boolean;
        onViewInstallmentPlan?: (entry: BudgetEntry) => void;
    }>();
</script>

<!-- RATENZAHLUNG FORTSCHRITTS-WIDGET (falls aktiv) -->
<div class="rounded-xl border {isArrear || (entry.payment_status === 'open' && isOverdue) ? 'border-amber-300 bg-amber-50/70 dark:border-amber-800 dark:bg-amber-950/40' : 'border-indigo-100 bg-indigo-50/50 dark:border-indigo-900/50 dark:bg-indigo-950/30'} p-2.5">
    <div class="flex items-center justify-between text-xs font-semibold text-indigo-900 dark:text-indigo-200">
        <div class="flex items-center gap-1.5">
            <Layers class="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>{installmentInfo.label}</span>
            {#if installmentInfo.isFinished}
                <span class="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 font-bold ml-1">
                    <Check class="h-3 w-3 stroke-[3]" /> Abbezahlt
                </span>
            {:else if entry.payment_status === 'open' && isOverdue}
                <span class="inline-flex items-center gap-0.5 text-amber-700 dark:text-amber-400 font-bold ml-1">
                    <AlertTriangle class="h-3 w-3" /> Nicht überwiesen
                </span>
            {/if}
        </div>

        <div class="flex items-center gap-2">
            {#if onViewInstallmentPlan}
                <button
                    type="button"
                    onclick={() => onViewInstallmentPlan(entry)}
                    class="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 hover:underline cursor-pointer"
                    title="Vollständigen Ratenplan und Zahlungsverlauf ansehen"
                >
                    <ListTree class="h-3 w-3" />
                    <span>Ratenplan</span>
                </button>
            {/if}
            <span>{installmentInfo.percentage}%</span>
        </div>
    </div>

    <!-- Fortschrittsbalken -->
    <div class="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-indigo-100 dark:bg-indigo-900/60">
        <div
            class="h-full rounded-full transition-all duration-300 {installmentInfo.isFinished
                ? 'bg-emerald-500'
                : isArrear
                ? 'bg-amber-500'
                : 'bg-indigo-600 dark:bg-indigo-500'}"
            style="width: {installmentInfo.percentage}%;"
        ></div>
    </div>

    <!-- Detail-Zahlen: Gesamtsumme & Restbetrag -->
    <div class="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600 dark:text-slate-300">
        <span>
            Gesamtsumme: <strong class="text-slate-800 dark:text-slate-100">{formatCurrency(installmentInfo.totalAmount)}</strong>
        </span>
        {#if !installmentInfo.isFinished}
            <span>
                Noch <strong class="text-indigo-700 dark:text-indigo-300">{installmentInfo.remainingCount} {installmentInfo.remainingCount === 1 ? 'Rate' : 'Raten'}</strong> (Rest: {formatCurrency(installmentInfo.remainingAmount)})
            </span>
        {/if}
    </div>
</div>
