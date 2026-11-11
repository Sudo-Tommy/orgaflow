<script lang="ts">
    import { pb } from "$lib/services/pocketbase";

    let {
        transactions = [],
        onStorno = () => {},
        onEdit = () => {},
        onDelete = () => {}
    }: {
        transactions?: any[];
        onStorno?: (t: any) => void;
        onEdit?: (t: any) => void;
        onDelete?: (id: string) => void;
    } = $props();

    function formatCurrency(val: number) {
        return (val || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
    }
</script>

<div class="overflow-x-auto orga-table-container custom-scrollbar">
    <table class="w-full text-left text-sm border-collapse">
        <thead class="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200 text-xs uppercase tracking-wider">
            <tr>
                <th class="py-3 px-4">Datum</th>
                <th class="py-3 px-4">Typ</th>
                <th class="py-3 px-4">Titel</th>
                <th class="py-3 px-4">Kategorie</th>
                <th class="py-3 px-4 text-right">Betrag</th>
                <th class="py-3 px-4 text-right">Aktionen</th>
            </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 bg-white">
            {#each transactions as t}
                {@const isStorno = t.is_storno || t.status === 'storniert'}
                <tr class="hover:bg-slate-50 transition-colors {isStorno ? 'bg-amber-50/50 text-slate-400' : ''}">
                    <td class="py-3 px-4 whitespace-nowrap font-semibold text-slate-700 tabular-nums">
                        {new Date(t.date).toLocaleDateString("de-DE")}
                    </td>
                    <td class="py-3 px-4 whitespace-nowrap">
                        {#if isStorno}
                            <span class="px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">Storno</span>
                        {:else if t.source === 'accounting' || t.is_invoice}
                            <span class="px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200">📄 Rechnung</span>
                        {:else}
                            <span class="px-2 py-0.5 rounded text-xs font-bold {t.type === 'income' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}">
                                {t.type === 'income' ? 'Einnahme' : 'Ausgabe'}
                            </span>
                        {/if}
                    </td>
                    <td class="py-3 px-4 font-bold text-slate-900 max-w-[220px] truncate {isStorno ? 'line-through text-slate-400' : ''}">
                        <span class="block truncate">{t.title}</span>
                        {#if isStorno && t.storno_reason}
                            <span class="block text-xs text-amber-700 font-medium">({t.storno_reason})</span>
                        {:else if t.source === 'accounting'}
                            <span class="block text-xs text-slate-500 font-normal">{t.payment_method || 'Banküberweisung'} • {t.status || 'Bezahlt'}</span>
                        {/if}
                    </td>
                    <td class="py-3 px-4 text-slate-700 font-medium whitespace-nowrap">{t.category || 'Sonstiges'}</td>
                    <td class="py-3 px-4 text-right font-black whitespace-nowrap tabular-nums text-sm {isStorno ? 'line-through text-slate-400' : t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}">
                        {formatCurrency(Number(t.amount) || 0)}
                    </td>
                    <td class="py-3 px-4 text-right whitespace-nowrap">
                        <div class="inline-flex items-center gap-1 justify-end">
                            {#if t.receipt}
                                <a href={pb.files.getURL(t, t.receipt)} target="_blank" class="p-1.5 text-sm hover:bg-slate-100 rounded-lg text-slate-600" title="Beleg">🧾</a>
                            {/if}
                            {#if t.source !== 'accounting' && !isStorno}
                                <button onclick={() => onStorno(t)} class="p-1.5 text-sm text-amber-600 hover:bg-amber-50 rounded-lg" title="Stornieren">🚫</button>
                                <button onclick={() => onEdit(t)} class="p-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg" title="Bearbeiten">✎</button>
                                <button onclick={() => onDelete(t.id)} class="p-1.5 text-sm text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg" title="Löschen">✕</button>
                            {/if}
                        </div>
                    </td>
                </tr>
            {/each}
        </tbody>
    </table>
</div>
