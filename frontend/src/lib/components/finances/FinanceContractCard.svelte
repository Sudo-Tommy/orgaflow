<script lang="ts">
    import { pb } from "$lib/services/pocketbase";

    let {
        contract: c,
        tileSize = 33.33,
        onBook = () => {},
        onEdit = () => {},
        onDelete = () => {}
    }: {
        contract: any;
        tileSize?: number;
        onBook?: (c: any) => void;
        onEdit?: (c: any) => void;
        onDelete?: (id: string) => void;
    } = $props();

    function formatCurrency(val: number) {
        return (val || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
    }
</script>

<div
    class="responsive-tile {c.type === 'income' ? 'bg-blue-200 border-blue-300' : 'bg-rose-200 border-rose-300'} border rounded-xl p-3.5 sm:p-4 shadow-sm hover:shadow-md transition-all group flex flex-col gap-3 relative overflow-hidden"
    style="width: calc({tileSize}% - 1rem); flex-grow: 1;"
>
    <div class="flex items-start justify-between gap-2">
        <div class="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
            <span class="px-2 py-0.5 rounded-lg text-[11px] font-bold {c.type === 'income' ? 'bg-white text-blue-800' : 'bg-white text-rose-800'} shrink-0 shadow-sm">
                {c.type === "income" ? "Einnahme" : "Ausgabe"}
            </span>
            <div class="min-w-0 flex-1">
                <p class="font-bold text-neutral-900 truncate text-sm sm:text-base" title={c.title}>{c.title}</p>
                <p class="text-xs text-neutral-600 truncate">
                    {c.partner || "Kein Partner"} • {c.interval === "monthly" ? "Monatlich" : c.interval === "quarterly" ? "Quartalsweise" : "Jährlich"}
                </p>
            </div>
        </div>
        <div class="text-right shrink-0">
            <p class="font-black text-base sm:text-lg {c.type === 'income' ? 'text-blue-700' : 'text-rose-700'}">
                {formatCurrency(Number(c.amount) || 0)}
            </p>
        </div>
    </div>

    {#if c.next_due_date}
        <div class="bg-white/80 p-2 rounded-lg text-xs text-neutral-600 flex justify-between items-center border border-white/60 shadow-xs">
            <span>Nächste Fälligkeit: {new Date(c.next_due_date).toLocaleDateString("de-DE")}</span>
        </div>
    {/if}

    <div class="flex items-center justify-between mt-auto pt-2.5 sm:pt-3 border-t border-black/5 gap-2">
        <button onclick={() => onBook(c)} class="px-2.5 sm:px-3 py-1.5 min-h-[34px] text-xs font-bold bg-indigo-100 text-indigo-700 hover:bg-indigo-600 hover:text-white rounded-lg transition-colors shadow-sm flex items-center gap-1">💸 Buchen</button>
        <div class="flex items-center gap-1">
            {#if c.document}
                <a href={pb.files.getURL(c, c.document)} target="_blank" class="p-1.5 min-w-[34px] min-h-[34px] flex items-center justify-center text-base hover:scale-110 transition-transform bg-white/80 rounded-lg shadow-xs" title="Dokument ansehen">📄</a>
            {/if}
            <button onclick={() => onEdit(c)} class="p-1.5 min-w-[34px] min-h-[34px] flex items-center justify-center text-neutral-700 hover:text-indigo-600 rounded-lg bg-white/70 hover:bg-white transition-colors" title="Bearbeiten">✎</button>
            <button onclick={() => onDelete(c.id)} class="p-1.5 min-w-[34px] min-h-[34px] flex items-center justify-center text-neutral-700 hover:text-rose-500 rounded-lg bg-white/70 hover:bg-white transition-colors" title="Löschen">✕</button>
        </div>
    </div>
</div>
