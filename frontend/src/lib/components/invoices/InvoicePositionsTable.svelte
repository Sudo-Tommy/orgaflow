<script lang="ts">
    interface Props {
        positions?: any[];
        netto?: number;
        taxRate?: number | string;
        taxSum?: number;
        brutto?: number;
    }

    let { positions = [], netto = 0, taxRate = 0, taxSum = 0, brutto = 0 }: Props = $props();

    function formatCurrency(amount: number | null | undefined) {
        return (amount || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
    }
</script>

<div class="orga-card-white p-4 sm:p-6">
    <h3 class="text-base font-bold text-slate-900 dark:text-slate-100 mb-4">Rechnungspositionen</h3>
    <div class="overflow-x-auto custom-scrollbar orga-table-container">
        <table class="w-full text-left min-w-150 tabular-nums">
            <thead class="bg-slate-100/90 dark:bg-slate-800/90 border-b-2 border-slate-200 dark:border-slate-700">
                <tr>
                    <th class="p-3 text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider w-12">Pos.</th>
                    <th class="p-3 text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">Datum</th>
                    <th class="p-3 text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">Beschreibung</th>
                    <th class="p-3 text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider text-right">Menge</th>
                    <th class="p-3 text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider text-right">Einzelpreis</th>
                    <th class="p-3 text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider text-right">Gesamt</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-slate-900">
                {#each positions as pos, i}
                    <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td class="p-3 text-sm font-mono text-slate-500 dark:text-slate-400">{pos.pos || i + 1}</td>
                        <td class="p-3 text-sm font-semibold text-slate-900 dark:text-slate-100">{pos.date}</td>
                        <td class="p-3 text-sm font-medium text-slate-800 dark:text-slate-200">{pos.title}</td>
                        <td class="p-3 text-sm font-medium text-slate-800 dark:text-slate-200 text-right">{pos.duration}</td>
                        <td class="p-3 text-sm font-medium text-slate-800 dark:text-slate-200 text-right">{pos.price}</td>
                        <td class="p-3 text-sm font-bold text-slate-900 dark:text-slate-100 text-right">{formatCurrency(pos.total)}</td>
                    </tr>
                {/each}
            </tbody>
            <tfoot class="font-bold bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-700">
                <tr><td colspan="5" class="pt-4 pr-4 pb-1 text-right text-sm text-slate-600 dark:text-slate-300">Netto</td><td class="pt-4 pr-4 pb-1 text-right text-sm text-slate-900 dark:text-slate-100">{formatCurrency(netto)}</td></tr>
                <tr><td colspan="5" class="px-4 pb-1 text-right text-sm text-slate-600 dark:text-slate-300">zzgl. {taxRate}% USt.</td><td class="px-4 pb-1 text-right text-sm text-slate-900 dark:text-slate-100">{formatCurrency(taxSum)}</td></tr>
                <tr class="text-base font-black text-violet-900 dark:text-violet-200 bg-violet-50 dark:bg-violet-950/60"><td colspan="5" class="p-4 text-right">Gesamtbetrag (Brutto)</td><td class="p-4 text-right text-lg text-violet-700 dark:text-violet-300">{formatCurrency(brutto)}</td></tr>
            </tfoot>
        </table>
    </div>
</div>
