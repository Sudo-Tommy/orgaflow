<!-- src/lib/components/support/AiSupportSuccessView.svelte -->
<script lang="ts">
    import { CheckCircle2, Sparkles, Copy, Check, MessageSquarePlus } from 'lucide-svelte';
    import type { FinalizeResult } from '$lib/services/aiLiveSupportService';

    interface Props {
        finalizeResult: FinalizeResult;
        isDev: boolean;
        onClose: () => void;
        onNewChat?: () => void;
    }

    let { finalizeResult, isDev, onClose, onNewChat }: Props = $props();
    let copiedPrompt = $state(false);

    async function copyPrompt() {
        if (!finalizeResult.antigravityPrompt) return;
        await navigator.clipboard.writeText(finalizeResult.antigravityPrompt);
        copiedPrompt = true;
        setTimeout(() => (copiedPrompt = false), 2000);
    }
</script>

<div class="p-6 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700/80 text-center space-y-4 animate-in fade-in">
    <div class="w-12 h-12 mx-auto rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200 dark:border-emerald-800">
        <CheckCircle2 class="w-6 h-6" />
    </div>
    <div>
        <h3 class="text-base font-black text-slate-900 dark:text-white">Anfrage erfolgreich eingereicht!</h3>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Ticket #{finalizeResult.ticketId} wurde angelegt. Unser Team kümmert sich zeitnah darum.</p>
    </div>
    {#if isDev && finalizeResult.antigravityPrompt}
        <div class="text-left bg-slate-900 text-slate-100 rounded-xl p-3.5 border border-slate-800 space-y-2">
            <div class="flex items-center justify-between">
                <span class="text-[11px] font-bold text-indigo-400 flex items-center gap-1.5">
                    <Sparkles class="w-3.5 h-3.5" /> AntiGravity Prompt
                </span>
                <button
                    type="button"
                    onclick={copyPrompt}
                    class="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1 cursor-pointer transition-colors"
                >
                    {#if copiedPrompt}<Check class="w-3.5 h-3.5" /> Kopiert{:else}<Copy class="w-3.5 h-3.5" /> Kopieren{/if}
                </button>
            </div>
            <pre class="text-[11px] font-mono whitespace-pre-wrap max-h-48 overflow-y-auto text-slate-300 bg-slate-950 p-2.5 rounded-lg border border-slate-800">{finalizeResult.antigravityPrompt}</pre>
        </div>
    {/if}
    <div class="flex items-center justify-center gap-2 pt-2">
        {#if onNewChat}
            <button
                type="button"
                onclick={onNewChat}
                class="px-5 py-2.5 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
            >
                <MessageSquarePlus class="w-4 h-4" />
                <span>Neuer Chat</span>
            </button>
        {/if}
        <button
            type="button"
            onclick={onClose}
            class="px-5 py-2.5 rounded-xl font-bold text-xs bg-slate-200 hover:bg-slate-300 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 cursor-pointer transition-all active:scale-95"
        >
            Schließen
        </button>
    </div>
</div>
