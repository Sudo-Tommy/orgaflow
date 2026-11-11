<script lang="ts">
    import { RefreshCw, CheckCircle2, Send, ArrowLeft } from 'lucide-svelte';

    interface Props {
        categories: string[];
        selectedCategory: string;
        generalComment: string;
        isSubmitting: boolean;
        isSuccess: boolean;
        isMobileView?: boolean;
        onSubmit: () => void;
        onBackToScreenshot?: () => void;
    }

    let {
        categories,
        selectedCategory = $bindable(),
        generalComment = $bindable(),
        isSubmitting,
        isSuccess,
        isMobileView = false,
        onSubmit,
        onBackToScreenshot
    }: Props = $props();
</script>

<div class="flex flex-col justify-between h-full space-y-4 bg-slate-50/70 dark:bg-slate-950/40 p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
    <div class="space-y-3.5">
        <div>
            <span class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Kategorie:</span>
            <div class="grid grid-cols-2 gap-1.5">
                {#each categories as cat}
                    <button
                        type="button"
                        onclick={() => (selectedCategory = cat)}
                        class="min-h-[40px] py-2 px-2.5 rounded-xl text-xs font-bold border transition-all text-left cursor-pointer active:scale-98 {selectedCategory === cat
                            ? 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700 shadow-xs ring-1 ring-indigo-500/30'
                            : 'border-slate-200 dark:border-slate-700/80 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}"
                    >
                        {cat}
                    </button>
                {/each}
            </div>
        </div>

        <div>
            <label for="feedback-comment" class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Was genau klemmt hier?
            </label>
            <textarea
                id="feedback-comment"
                bind:value={generalComment}
                rows="4"
                placeholder="Beschreibe kurz, was nicht funktioniert oder was verbessert werden soll..."
                class="w-full p-3 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium placeholder-slate-400 resize-none"
            ></textarea>
        </div>
    </div>

    <div class="flex flex-col sm:flex-row items-center gap-2 pt-2">
        {#if isMobileView && onBackToScreenshot}
            <button
                type="button"
                onclick={onBackToScreenshot}
                class="w-full sm:w-auto min-h-[44px] py-2.5 px-3.5 rounded-xl text-xs font-bold bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
            >
                <ArrowLeft class="w-4 h-4" />
                <span>Screenshot prüfen</span>
            </button>
        {/if}

        <button
            type="button"
            onclick={onSubmit}
            disabled={isSubmitting || isSuccess}
            class="w-full flex-1 min-h-[44px] py-2.5 px-4 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center gap-2 shadow-lg shadow-rose-600/30 transition-all cursor-pointer active:scale-98 disabled:opacity-60"
        >
            {#if isSubmitting}
                <RefreshCw class="w-4 h-4 animate-spin" />
                <span>Wird gesendet...</span>
            {:else if isSuccess}
                <CheckCircle2 class="w-4 h-4 text-emerald-300" />
                <span>Erfolgreich gemeldet!</span>
            {:else}
                <Send class="w-4 h-4" />
                <span>Meldung jetzt absenden</span>
            {/if}
        </button>
    </div>
</div>
