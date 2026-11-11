<script lang="ts">
    import { devAgentState } from '$lib/services/devAgentState.svelte';
    import { AlertTriangle, Wrench, X } from 'lucide-svelte';

    let err = $derived(devAgentState.recentError);
</script>

{#if err}
    <div class="mb-3 p-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-200 text-xs shadow-sm animate-in fade-in slide-in-from-top-1">
        <div class="flex items-start justify-between gap-2">
            <div class="flex items-center gap-1.5 font-semibold text-amber-400">
                <AlertTriangle class="w-4 h-4 text-amber-400 shrink-0" />
                <span>Konsolenfehler erkannt</span>
            </div>
            <button 
                type="button" 
                onclick={() => devAgentState.dismissError()}
                class="text-amber-400/60 hover:text-amber-300 transition-colors"
                title="Ausblenden"
            >
                <X class="w-3.5 h-3.5" />
            </button>
        </div>
        <p class="mt-1 line-clamp-2 font-mono text-[11px] text-amber-300/80 break-all">
            {err.message}
        </p>
        <div class="mt-2 flex items-center justify-end gap-2">
            <button
                type="button"
                onclick={() => devAgentState.fixCurrentError()}
                class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-medium transition-all text-[11px]"
            >
                <Wrench class="w-3 h-3" />
                <span>Fehler automatisch beheben</span>
            </button>
        </div>
    </div>
{/if}
