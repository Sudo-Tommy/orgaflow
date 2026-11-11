<script lang="ts">
    import { triggerHaptic } from '$lib/services/hapticFeedback';

    interface Props {
        onAppendDigit: (digit: string) => void;
        onDeleteDigit: () => void;
        onSubmit: () => void;
        disabled?: boolean;
    }

    let { onAppendDigit, onDeleteDigit, onSubmit, disabled = false }: Props = $props();

    function handleDigit(digit: string) {
        triggerHaptic('tap');
        onAppendDigit(digit);
    }

    function handleDelete() {
        triggerHaptic('tap');
        onDeleteDigit();
    }
</script>

<div class="mt-3 p-3 bg-neutral-50 dark:bg-slate-800 rounded-2xl border border-neutral-200 dark:border-slate-700 animate-enter grid grid-cols-3 gap-2 sm:gap-3">
    {#each ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as num}
        <button 
            type="button" 
            onclick={() => handleDigit(num)}
            class="h-13 sm:h-14 bg-white dark:bg-slate-700 border border-neutral-200 dark:border-slate-600 rounded-xl text-xl sm:text-2xl font-black font-mono text-neutral-800 dark:text-white hover:bg-neutral-100 dark:hover:bg-slate-600 hover:border-neutral-300 active:scale-95 transition-all shadow-sm flex items-center justify-center cursor-pointer min-h-[44px] min-w-[44px] touch-manipulation">
            {num}
        </button>
    {/each}
    <button 
        type="button" 
        onclick={handleDelete}
        class="h-13 sm:h-14 bg-neutral-200/70 dark:bg-slate-600 border border-neutral-300 dark:border-slate-500 rounded-xl text-lg font-bold text-neutral-700 dark:text-slate-200 hover:bg-neutral-300 dark:hover:bg-slate-500 active:scale-95 transition-all flex items-center justify-center cursor-pointer min-h-[44px] min-w-[44px] touch-manipulation"
        title="Letzte Ziffer löschen">
        ⌫
    </button>
    <button 
        type="button" 
        onclick={() => handleDigit('0')}
        class="h-13 sm:h-14 bg-white dark:bg-slate-700 border border-neutral-200 dark:border-slate-600 rounded-xl text-xl sm:text-2xl font-black font-mono text-neutral-800 dark:text-white hover:bg-neutral-100 dark:hover:bg-slate-600 hover:border-neutral-300 active:scale-95 transition-all shadow-sm flex items-center justify-center cursor-pointer min-h-[44px] min-w-[44px] touch-manipulation">
        0
    </button>
    <button 
        type="button" 
        onclick={onSubmit}
        {disabled}
        class="h-13 sm:h-14 bg-emerald-600 text-white rounded-xl text-sm font-black hover:bg-emerald-700 active:scale-95 transition-all shadow-sm flex items-center justify-center cursor-pointer min-h-[44px] min-w-[44px] touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed">
        ✓ OK
    </button>
</div>
