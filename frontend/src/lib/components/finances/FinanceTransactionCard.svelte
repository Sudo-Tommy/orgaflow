<script lang="ts">
    import { pb } from "$lib/services/pocketbase";

    let {
        transaction: t,
        onStorno = () => {},
        onEdit = () => {},
        onDelete = () => {},
        onBookNextInstallment = () => {}
    }: {
        transaction: any;
        onStorno?: (t: any) => void;
        onEdit?: (t: any) => void;
        onDelete?: (id: string) => void;
        onBookNextInstallment?: (t: any) => void;
    } = $props();

    const isStorno = $derived(t.is_storno || t.status === 'storniert');
    function formatCurrency(val: number) {
        return (val || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
    }
</script>

<div class="rounded-xl p-3.5 sm:p-4 border transition-all flex flex-col gap-3 relative overflow-hidden shadow-xs hover:shadow-md {isStorno ? 'bg-amber-50/60 border-dashed border-amber-300 opacity-80' : t.type === 'income' ? 'bg-emerald-50/70 border-emerald-200' : 'bg-rose-50/70 border-rose-200'}">
    <div class="flex items-start justify-between gap-2">
        <div class="flex items-center gap-2 min-w-0 flex-1">
            {#if isStorno}
                <span class="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-200 text-amber-900 shrink-0">GoBD Storno</span>
            {:else if t.source === 'accounting' || t.is_invoice}
                <span class="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200 shrink-0">📄 Rechnung</span>
            {:else}
                <span class="px-2 py-0.5 rounded text-[11px] font-bold {t.type === 'income' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'} shrink-0">
                    {t.type === "income" ? "Einnahme" : "Ausgabe"}
                </span>
            {/if}
            <div class="min-w-0 flex-1">
                <p class="font-bold text-neutral-900 truncate text-sm {isStorno ? 'line-through text-neutral-500' : ''}" title={t.title}>{t.title}</p>
                <p class="text-xs text-neutral-500 truncate">{t.category || 'Sonstiges'} • {new Date(t.date).toLocaleDateString("de-DE")}</p>
            </div>
        </div>
        <div class="text-right shrink-0">
            <p class="font-black text-sm sm:text-base {isStorno ? 'line-through text-neutral-400' : t.type === 'income' ? 'text-emerald-700' : 'text-rose-700'}">{formatCurrency(Number(t.amount) || 0)}</p>
            {#if isStorno && t.storno_reason}
                <span class="text-[10px] text-amber-800 block truncate max-w-[120px]" title={t.storno_reason}>{t.storno_reason}</span>
            {/if}
        </div>
    </div>

    {#if t.is_installment}
        <div class="bg-white/80 p-2 rounded-lg text-xs text-neutral-600 flex justify-between items-center border border-white/60">
            <span>Rate {t.installment_current || 1} / {t.installment_total_count || "?"}</span>
            {#if t.installment_total_amount}<span class="font-semibold">{formatCurrency(t.installment_total_amount)}</span>{/if}
        </div>
    {/if}

    <div class="flex items-center justify-between mt-auto pt-2.5 border-t border-neutral-200/60 gap-2">
        <div class="flex items-center gap-1.5">
            {#if t.receipt}
                <a href={pb.files.getURL(t, t.receipt)} target="_blank" class="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center text-sm hover:scale-105 transition-transform bg-white rounded-lg border border-neutral-200 shadow-xs" title="Beleg ansehen">🧾</a>
            {/if}
        </div>
        <div class="flex items-center gap-1">
            {#if t.is_installment && (t.installment_current || 1) < (t.installment_total_count || 999) && !isStorno}
                <button onclick={() => onBookNextInstallment(t)} class="px-2 py-1 min-h-[34px] text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white rounded-lg transition-colors">💰 Zahlen</button>
            {/if}
            {#if t.source !== 'accounting' && !isStorno}
                <button onclick={() => onStorno(t)} class="p-1.5 text-amber-600 hover:bg-amber-100 rounded-lg" title="Stornieren">🚫</button>
                <button onclick={() => onEdit(t)} class="p-1.5 text-neutral-600 hover:text-indigo-600 rounded-lg" title="Bearbeiten">✎</button>
                <button onclick={() => onDelete(t.id)} class="p-1.5 text-neutral-500 hover:text-rose-600 rounded-lg" title="Löschen">✕</button>
            {/if}
        </div>
    </div>
</div>
