<script lang="ts">
    import { ChevronLeft, ChevronRight } from "lucide-svelte";
    import { triggerHaptic } from "$lib/services/hapticFeedback";

    let {
        currentPage = 1,
        totalPages = 1,
        totalItems = 0,
        perPage = 50,
        isLoading = false,
        onPageChange
    }: {
        currentPage: number;
        totalPages: number;
        totalItems: number;
        perPage?: number;
        isLoading?: boolean;
        onPageChange: (newPage: number) => void;
    } = $props();

    function goTo(page: number) {
        if (page < 1 || page > totalPages || page === currentPage || isLoading) return;
        triggerHaptic('selection');
        onPageChange(page);
    }
</script>

{#if totalPages > 1}
    <div class="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-xs text-xs">
        <span class="text-slate-500 dark:text-slate-400 font-medium">
            Zeige <strong class="text-slate-800 dark:text-slate-200">{Math.min((currentPage - 1) * perPage + 1, totalItems)}</strong> bis <strong class="text-slate-800 dark:text-slate-200">{Math.min(currentPage * perPage, totalItems)}</strong> von <strong class="text-slate-800 dark:text-slate-200">{totalItems}</strong> Einträgen
        </span>

        <div class="flex items-center gap-1.5">
            <button
                type="button"
                disabled={currentPage <= 1 || isLoading}
                onclick={() => goTo(currentPage - 1)}
                class="min-h-9 min-w-9 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-1 font-bold cursor-pointer transition-colors shadow-2xs"
                title="Vorherige Seite"
            >
                <ChevronLeft class="w-4 h-4" />
                <span class="hidden sm:inline">Zurück</span>
            </button>

            <span class="px-3 py-1 font-bold text-slate-700 dark:text-slate-200 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-900/60 rounded-xl">
                Seite {currentPage} von {totalPages}
            </span>

            <button
                type="button"
                disabled={currentPage >= totalPages || isLoading}
                onclick={() => goTo(currentPage + 1)}
                class="min-h-9 min-w-9 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-1 font-bold cursor-pointer transition-colors shadow-2xs"
                title="Nächste Seite"
            >
                <span class="hidden sm:inline">Weiter</span>
                <ChevronRight class="w-4 h-4" />
            </button>
        </div>
    </div>
{/if}
