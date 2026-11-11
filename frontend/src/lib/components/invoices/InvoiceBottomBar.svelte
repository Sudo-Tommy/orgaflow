<!-- src/lib/components/invoices/InvoiceBottomBar.svelte -->
<script lang="ts">
    // @ts-ignore
    import { Mail, RefreshCw, Trash2, X } from "lucide-svelte";

    let {
        selectedCount,
        isRefreshing = false,
        onClear,
        onEmail,
        onRegenerate,
        onDelete,
        onNew = () => {}
    }: {
        selectedCount: number;
        isRefreshing?: boolean;
        onClear: () => void;
        onEmail: () => void;
        onRegenerate: () => void;
        onDelete: () => void;
        onNew?: () => void;
    } = $props();
</script>

{#if selectedCount > 0}
    <div class="xl:hidden fixed bottom-[calc(4rem+max(env(safe-area-inset-bottom,0px),0.5rem))] left-3 right-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 p-3 rounded-2xl z-45 shadow-[0_8px_30px_rgb(0,0,0,0.25)] transition-transform duration-300 animate-in slide-in-from-bottom-5">
        <div class="flex items-center gap-3">
            <button aria-label="Auswahl aufheben" onclick={onClear} class="w-14 h-14 min-w-14 flex-none bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl flex items-center justify-center font-bold text-xl active:scale-95 transition-transform border border-slate-200 dark:border-slate-700 focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:outline-none cursor-pointer" title="Auswahl aufheben">
                <X class="w-6 h-6" />
            </button>
            <div class="flex-1 flex gap-2">
                <button aria-label="Rechnungen per Mail senden" onclick={onEmail} class="flex-1 min-h-14 bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 rounded-2xl flex flex-col items-center justify-center py-2 font-bold active:scale-95 transition-transform border border-cyan-200 dark:border-cyan-800 focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:outline-none cursor-pointer"><Mail class="w-5 h-5 mb-1" /><span class="text-[10px] uppercase tracking-wider">Senden</span></button>
                <button aria-label="Layouts neu generieren" onclick={onRegenerate} disabled={isRefreshing} class="flex-1 min-h-14 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 rounded-2xl flex flex-col items-center justify-center py-2 font-bold active:scale-95 transition-transform border border-amber-200 dark:border-amber-800 focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none cursor-pointer {isRefreshing ? 'cursor-wait opacity-80' : ''}"><RefreshCw class="w-5 h-5 mb-1 {isRefreshing ? 'animate-spin' : ''}" /><span class="text-[10px] uppercase tracking-wider">Refresh</span></button>
                <button aria-label="Rechnungen löschen" onclick={onDelete} class="flex-1 min-h-14 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 rounded-2xl flex flex-col items-center justify-center py-2 font-bold active:scale-95 transition-transform border border-rose-200 dark:border-rose-800 focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none cursor-pointer"><Trash2 class="w-5 h-5 mb-1" /><span class="text-[10px] uppercase tracking-wider">Löschen</span></button>
            </div>
        </div>
    </div>
{/if}
