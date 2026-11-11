<script lang="ts">
    import { CheckCheck } from "lucide-svelte";

    interface Props {
        selectedCount: number;
        readyCount: number;
        incompleteCount: number;
        selectedHours: number;
        isProcessing: boolean;
        onMarkSelectedSettled: () => void;
        onClose: () => void;
    }

    let {
        selectedCount,
        readyCount,
        incompleteCount,
        selectedHours,
        isProcessing,
        onMarkSelectedSettled,
        onClose
    }: Props = $props();
</script>

<div class="p-3.5 sm:p-5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-3 pb-[max(env(safe-area-inset-bottom,0px),0.875rem)] w-full mt-auto shrink-0 rounded-b-3xl">
    <div class="text-xs font-semibold text-slate-500 dark:text-slate-400 text-center sm:text-left truncate min-w-0">
        {#if selectedCount > 0}
            <span class="text-cyan-700 dark:text-cyan-400 font-bold">{selectedCount}</span> Termine gewählt ({selectedHours.toFixed(1)} h)
        {:else}
            <span class="text-emerald-600 dark:text-emerald-400 font-bold">{readyCount}</span> bereit zur Abrechnung ({incompleteCount} prüfen)
        {/if}
    </div>
    <div class="flex items-center gap-2 w-full sm:w-auto">
        {#if selectedCount > 0}
            <button
                type="button"
                onclick={onMarkSelectedSettled}
                disabled={isProcessing}
                class="w-full sm:w-auto min-h-11 px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 text-white text-xs font-black rounded-xl transition-all active:scale-95 cursor-pointer shadow-md shadow-cyan-500/20 flex items-center justify-center gap-1.5 touch-manipulation"
            >
                <CheckCheck class="w-4 h-4" />
                <span>{selectedCount} abrechnen</span>
            </button>
        {/if}
        <button
            type="button"
            onclick={onClose}
            class="w-full sm:w-auto min-h-11 px-6 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-black rounded-xl transition-all active:scale-95 cursor-pointer touch-manipulation"
        >
            Schließen
        </button>
    </div>
</div>
