<script lang="ts">
    import type { BudgetEntry } from '$lib/types/budget';
    import { formatDate } from '$lib/types/budget';
    import { AlertTriangle, Zap } from 'lucide-svelte';

    let {
        entry,
        onPayArrearNow
    } = $props<{
        entry: BudgetEntry;
        onPayArrearNow?: (entry: BudgetEntry) => void;
    }>();
</script>

<!-- SPEZIELLER RÜCKSTANDS-BANNER (Wenn Buchung aus Vormonat unbezahlt ist) -->
<div class="mb-3 -mt-1 flex items-center justify-between rounded-xl bg-amber-100/90 px-3 py-1.5 text-xs font-bold text-amber-900 dark:bg-amber-900/60 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
    <div class="flex items-center gap-1.5">
        <AlertTriangle class="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 animate-pulse" />
        <span>
            {#if entry.is_installment}
                ⚠️ Rückstand: Monatsrate nicht überwiesen ({formatDate(entry.invoice_date || entry.due_date)})
            {:else}
                ⚠️ Zahlungsrückstand aus Vormonat
            {/if}
        </span>
    </div>
    {#if onPayArrearNow}
        <button
            type="button"
            onclick={() => onPayArrearNow(entry)}
            class="inline-flex items-center gap-1 rounded-lg bg-amber-600 px-2 py-0.5 text-[11px] font-bold text-white hover:bg-amber-700 active:scale-95 transition-all shadow-xs cursor-pointer"
            title="Bucht die Überweisung mit heutigem Datum als bezahlt"
        >
            <Zap class="h-3 w-3" />
            <span>Jetzt nachholen</span>
        </button>
    {/if}
</div>
