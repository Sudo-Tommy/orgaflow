<script lang="ts">
    import { devAgentState } from '$lib/services/devAgentState.svelte';
    import { page } from '$app/stores';
    import { Send, Undo2, Loader2, Image as ImageIcon, Sparkles } from 'lucide-svelte';

    let promptText = $state('');

    function handleKeydown(e: KeyboardEvent) {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            handleSendToIde();
        }
    }

    function handleSendToIde() {
        if (!promptText.trim() || devAgentState.isLoading) return;
        const text = promptText;
        promptText = '';
        devAgentState.sendToIde(text, $page.url.pathname, 'frontend/src/routes' + $page.url.pathname);
    }

    function handleSubmit() {
        if (!promptText.trim() || devAgentState.isLoading) return;
        const text = promptText;
        promptText = '';
        devAgentState.sendPrompt(text, $page.url.pathname, document.title || 'OrgaFlow');
    }
</script>

<div class="pt-2 border-t border-slate-200 dark:border-slate-800">
    <!-- Kontext-Leiste -->
    <div class="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1.5 px-0.5">
        <span class="truncate max-w-[150px] font-mono text-[10px]" title={$page.url.pathname}>
            Route: {$page.url.pathname}
        </span>
        <label class="flex items-center gap-1.5 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200">
            <input 
                type="checkbox" 
                bind:checked={devAgentState.includeVisualContext}
                class="rounded border-slate-300 dark:border-slate-700 text-violet-600 focus:ring-violet-500 w-3 h-3"
            />
            <span class="flex items-center gap-1 text-[10px]">
                <ImageIcon class="w-2.5 h-2.5" />
                <span>DOM</span>
            </span>
        </label>
    </div>

    <!-- Textarea & Aktionen -->
    <div class="relative rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus-within:border-violet-500 focus-within:ring-1 focus-within:ring-violet-500 transition-all shadow-sm">
        <textarea
            bind:value={promptText}
            onkeydown={handleKeydown}
            rows="3"
            placeholder="Beschreibe die Änderung... (Strg+Enter = In IDE)"
            disabled={devAgentState.isLoading}
            class="w-full bg-transparent p-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none resize-none disabled:opacity-50"
        ></textarea>

        <div class="flex items-center justify-between p-1.5 bg-slate-50 dark:bg-slate-950/60 rounded-b-xl border-t border-slate-100 dark:border-slate-800/80 gap-1.5">
            <div>
                {#if devAgentState.lastCheckpointId}
                    <button
                        type="button"
                        onclick={() => devAgentState.rollback()}
                        disabled={devAgentState.isLoading}
                        class="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition-colors disabled:opacity-50"
                        title="Macht die letzten Code-Änderungen rückgängig"
                    >
                        <Undo2 class="w-3 h-3" />
                        <span>Rückgängig</span>
                    </button>
                {/if}
            </div>

            <div class="flex items-center gap-1.5">
                <button
                    type="button"
                    onclick={handleSendToIde}
                    disabled={!promptText.trim() || devAgentState.isLoading}
                    class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-medium text-[11px] shadow-sm transition-all disabled:opacity-40"
                    title="Direkt an den Agenten in Antigravity IDE (Gemini 3.8 / Claude Opus) übergeben"
                >
                    {#if devAgentState.isLoading}
                        <Loader2 class="w-3 h-3 animate-spin" />
                    {:else}
                        <Sparkles class="w-3 h-3 text-violet-200" />
                    {/if}
                    <span>In IDE</span>
                </button>

                <button
                    type="button"
                    onclick={handleSubmit}
                    disabled={!promptText.trim() || devAgentState.isLoading}
                    class="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium text-[11px] transition-all disabled:opacity-40"
                    title="Im Browser-Widget ausführen"
                >
                    <Send class="w-3 h-3" />
                    <span class="hidden sm:inline">Browser</span>
                </button>
            </div>
        </div>
    </div>
</div>
