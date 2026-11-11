<script lang="ts">
    import { CheckCircle2, Search } from "lucide-svelte";

    interface Props {
        unsettledCount: number;
        filterStatus: "all" | "ready" | "incomplete";
        incompleteCount: number;
        hasSearchOrFilter: boolean;
        onSelectIncomplete: () => void;
        onResetFilter: () => void;
    }

    let {
        unsettledCount,
        filterStatus,
        incompleteCount,
        hasSearchOrFilter,
        onSelectIncomplete,
        onResetFilter
    }: Props = $props();
</script>

<div class="flex flex-col items-center justify-center py-16 sm:py-24 text-center animate-enter px-4">
    <div class="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-100 dark:border-cyan-900/50 flex items-center justify-center mb-4 shadow-inner">
        {#if unsettledCount === 0}
            <CheckCircle2 class="w-8 h-8 sm:w-10 sm:h-10 text-emerald-500" />
        {:else}
            <Search class="w-8 h-8 sm:w-10 sm:h-10 text-cyan-500" />
        {/if}
    </div>
    <p class="font-black text-lg sm:text-xl text-slate-900 dark:text-slate-100 mb-2">
        {unsettledCount === 0 ? 'Alles abgerechnet!' : (filterStatus === 'ready' ? 'Keine abrechnungsbereiten Termine' : 'Keine Treffer')}
    </p>
    <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-xs">
        {unsettledCount === 0
            ? 'Es gibt aktuell keine offenen Termine mehr.'
            : (filterStatus === 'ready' && incompleteCount > 0
                ? `Es gibt noch ${incompleteCount} Termine unter 'Prüfen', die nachbereitet werden müssen.`
                : 'Passen Sie den Suchbegriff oder den Filter an.')}
    </p>
    {#if filterStatus === 'ready' && incompleteCount > 0}
        <button 
            type="button" 
            onclick={onSelectIncomplete} 
            class="mt-5 min-h-11 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-sm touch-manipulation"
        >
            ⚠️ {incompleteCount} unfertige Termine prüfen
        </button>
    {:else if hasSearchOrFilter}
        <button 
            type="button" 
            onclick={onResetFilter} 
            class="mt-5 min-h-11 px-5 py-2.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl transition-colors cursor-pointer touch-manipulation"
        >
            Filter zurücksetzen
        </button>
    {/if}
</div>
