<script lang="ts">
    import { Search } from "lucide-svelte";
    import { triggerHaptic } from "$lib/services/hapticFeedback";

    interface Props {
        invoiceSearchQuery: string;
        selectedStatusFilter: 'all' | 'open' | 'paid';
        showUnpaidFirst: boolean;
        totalCount: number;
        openCount: number;
        paidCount: number;
    }

    let {
        invoiceSearchQuery = $bindable(),
        selectedStatusFilter = $bindable(),
        showUnpaidFirst = $bindable(),
        totalCount,
        openCount,
        paidCount
    }: Props = $props();
</script>

<div class="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-neutral-100 dark:border-slate-800 shadow-xl space-y-4">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <!-- Suchfeld -->
        <div class="relative flex-1">
            <Search class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 dark:text-slate-400 pointer-events-none" />
            <input
                type="search"
                id="portal-invoice-search-filter"
                name="portal_invoice_search_filter"
                autocomplete="off"
                bind:value={invoiceSearchQuery}
                placeholder="Nach Rechnungsnummer, Datum oder Betrag suchen..."
                class="orga-input-clear py-2.5 pl-10 pr-9 text-xs sm:text-sm bg-neutral-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 text-neutral-900 dark:text-slate-100 transition-colors w-full rounded-2xl border border-neutral-200 dark:border-slate-700 min-h-[44px]"
            />
            {#if invoiceSearchQuery}
                <button
                    type="button"
                    onclick={() => { triggerHaptic('tap'); invoiceSearchQuery = ""; }}
                    class="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-neutral-200 dark:bg-slate-700 hover:bg-neutral-300 dark:hover:bg-slate-600 text-neutral-600 dark:text-slate-300 flex items-center justify-center text-xs font-bold transition-colors cursor-pointer touch-manipulation"
                    title="Suche leeren"
                >
                    ✕
                </button>
            {/if}
        </div>

        <!-- Status Filter-Pills -->
        <div class="flex items-center gap-1.5 bg-neutral-100 dark:bg-slate-800 p-1 rounded-2xl shrink-0 self-start sm:self-center">
            <button
                type="button"
                onclick={() => { triggerHaptic('tap'); selectedStatusFilter = 'all'; }}
                class="px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer min-h-[36px] touch-manipulation {selectedStatusFilter === 'all' ? 'bg-white dark:bg-slate-700 text-neutral-900 dark:text-white shadow-2xs' : 'text-neutral-500 dark:text-slate-400 hover:text-neutral-900 dark:hover:text-white'}"
            >
                Alle ({totalCount})
            </button>
            <button
                type="button"
                onclick={() => { triggerHaptic('tap'); selectedStatusFilter = 'open'; }}
                class="px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer min-h-[36px] touch-manipulation {selectedStatusFilter === 'open' ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-400 shadow-2xs' : 'text-neutral-500 dark:text-slate-400 hover:text-neutral-900 dark:hover:text-white'}"
            >
                Offen ({openCount})
            </button>
            <button
                type="button"
                onclick={() => { triggerHaptic('tap'); selectedStatusFilter = 'paid'; }}
                class="px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer min-h-[36px] touch-manipulation {selectedStatusFilter === 'paid' ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-400 shadow-2xs' : 'text-neutral-500 dark:text-slate-400 hover:text-neutral-900 dark:hover:text-white'}"
            >
                Bezahlt ({paidCount})
            </button>
        </div>

        <!-- Sortierung: Offene zuerst -->
        {#if totalCount > 0}
            <label class="flex items-center gap-2 text-xs font-bold text-neutral-600 dark:text-slate-300 cursor-pointer bg-neutral-50 dark:bg-slate-800 hover:bg-neutral-100 dark:hover:bg-slate-700 px-3 py-2 rounded-xl transition-colors border border-neutral-200 dark:border-slate-700 shrink-0 min-h-[44px] touch-manipulation">
                <input type="checkbox" bind:checked={showUnpaidFirst} class="w-4 h-4 text-brand-600 rounded border-neutral-300 focus:ring-brand-500" />
                Offene zuerst
            </label>
        {/if}
    </div>
</div>
