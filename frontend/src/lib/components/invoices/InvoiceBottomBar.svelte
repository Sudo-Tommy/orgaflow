<!-- src/lib/components/invoices/InvoiceBottomBar.svelte -->
<script lang="ts">
    // @ts-ignore
    import { Mail, RefreshCw, Trash2, Plus, X } from "lucide-svelte";

    let {
        selectedCount,
        onClear,
        onEmail,
        onRegenerate,
        onDelete,
        onNew
    }: {
        selectedCount: number;
        onClear: () => void;
        onEmail: () => void;
        onRegenerate: () => void;
        onDelete: () => void;
        onNew: () => void;
    } = $props();
</script>

<div class="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-neutral-200 p-4 z-30 pb-[max(env(safe-area-inset-bottom,0px),1rem)] shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] transition-transform duration-300">
    {#if selectedCount > 0}
        <div class="flex items-center gap-3">
            <button aria-label="Auswahl aufheben" onclick={onClear} class="w-14 h-14 min-w-14 flex-none bg-neutral-100 text-neutral-600 rounded-2xl flex items-center justify-center font-bold text-xl active:scale-95 transition-transform focus-visible:ring-2 focus-visible:ring-neutral-500 focus-visible:outline-none" title="Auswahl aufheben">
                <X class="w-6 h-6" />
            </button>
            <div class="flex-1 flex gap-2">
                <button aria-label="Rechnungen per Mail senden" onclick={onEmail} class="flex-1 min-h-14 bg-blue-50 text-blue-700 rounded-2xl flex flex-col items-center justify-center py-2 font-bold active:scale-95 transition-transform border border-blue-100 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"><Mail class="w-5 h-5 mb-1" /><span class="text-[10px] uppercase tracking-wider">Senden</span></button>
                <button aria-label="Layouts neu generieren" onclick={onRegenerate} class="flex-1 min-h-14 bg-amber-50 text-amber-700 rounded-2xl flex flex-col items-center justify-center py-2 font-bold active:scale-95 transition-transform border border-amber-100 focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none"><RefreshCw class="w-5 h-5 mb-1" /><span class="text-[10px] uppercase tracking-wider">Refresh</span></button>
                <button aria-label="Rechnungen löschen" onclick={onDelete} class="flex-1 min-h-14 bg-rose-50 text-rose-700 rounded-2xl flex flex-col items-center justify-center py-2 font-bold active:scale-95 transition-transform border border-rose-100 focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none"><Trash2 class="w-5 h-5 mb-1" /><span class="text-[10px] uppercase tracking-wider">Löschen</span></button>
            </div>
        </div>
    {:else}
        <button aria-label="Neue Rechnung erstellen" onclick={onNew} class="w-full min-h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl p-4 flex items-center justify-center gap-2 font-bold shadow-lg shadow-indigo-600/30 active:scale-95 transition-all text-base focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none">
            <Plus class="w-5 h-5" /> Neue Rechnung erstellen
        </button>
    {/if}
</div>