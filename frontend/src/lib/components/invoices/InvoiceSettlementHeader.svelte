<script lang="ts">
    import { X } from "lucide-svelte";

    interface Props {
        invoiceNr?: string;
        clientName?: string;
        isSubmitting: boolean;
        onClose: () => void;
    }

    let { invoiceNr, clientName, isSubmitting, onClose }: Props = $props();
</script>

<div class="p-6 bg-gradient-to-r from-violet-500/10 via-cyan-500/5 to-transparent border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-4 rounded-t-3xl">
    <div class="flex items-center gap-3.5">
        <div class="w-11 h-11 rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-center text-xl shrink-0">
            💶
        </div>
        <div>
            <div class="flex items-center gap-2 mb-1">
                <span class="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-700 dark:text-violet-400 border border-violet-500/20">
                    Zahlungsabwicklung
                </span>
                <span class="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Nr. {invoiceNr || 'Unbekannt'}
                </span>
            </div>
            <h2 class="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                Bescheidausgleich &amp; Kürzungsmanagement
            </h2>
            {#if clientName}
                <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Klient: <span class="font-medium text-slate-800 dark:text-slate-200">{clientName}</span>
                </p>
            {/if}
        </div>
    </div>
    <button 
        type="button" 
        onclick={onClose} 
        disabled={isSubmitting}
        aria-label="Schließen" 
        class="min-w-[44px] min-h-[44px] rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors flex items-center justify-center shrink-0 disabled:opacity-50 touch-manipulation cursor-pointer"
    >
        <X class="w-4 h-4" />
    </button>
</div>
