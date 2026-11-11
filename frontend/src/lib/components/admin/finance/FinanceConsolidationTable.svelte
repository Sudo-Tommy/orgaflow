<script lang="ts">
    import { formatCurrency } from "./financeFormatUtils";

    interface Props {
        timeline: any[];
        forecastScenario: string;
    }

    let { timeline, forecastScenario }: Props = $props();
</script>

<div class="border border-neutral-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
    <div class="overflow-x-auto custom-scrollbar">
        <table class="w-full text-left border-collapse min-w-[750px] text-sm tabular-nums">
            <thead class="bg-slate-100/95 dark:bg-slate-800/95 text-slate-700 dark:text-slate-200 font-bold uppercase tracking-wider text-xs border-b border-slate-200 dark:border-slate-700">
                <tr>
                    <th class="p-3.5">Monat</th>
                    <th class="p-3.5 text-center">Status</th>
                    <th class="p-3.5 text-right">BWA Umsatz</th>
                    <th class="p-3.5 text-right">BWA Kosten</th>
                    <th class="p-3.5 text-right">BWA Netto (n. St.)</th>
                    <th class="p-3.5 text-right">Privat Ausgaben</th>
                    <th class="p-3.5 text-right font-black text-slate-900 dark:text-slate-100">Gesamt-Cashflow</th>
                    <th class="p-3.5 text-right font-bold text-slate-700 dark:text-slate-300">Kumuliert</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-slate-900">
                {#each timeline as m}
                    {@const isNegative = m.totalCashflow < 0}
                    <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors {m.isHistorical ? '' : (forecastScenario === 'ai_speculative' ? 'bg-purple-50/25 dark:bg-purple-950/20' : 'bg-indigo-50/20 dark:bg-indigo-950/20')}">
                        <td class="p-3.5 font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                            <div class="flex flex-col">
                                <span>{m.month}</span>
                                {#if m.keyDrivers}
                                    <span class="text-xs text-purple-700 dark:text-purple-300 font-medium truncate max-w-[200px]" title={m.keyDrivers}>
                                        ✨ {m.keyDrivers}
                                    </span>
                                {/if}
                            </div>
                        </td>
                        <td class="p-3.5 text-center whitespace-nowrap">
                            <div class="flex items-center justify-center gap-1.5">
                                <span class="px-2.5 py-0.5 rounded text-xs font-bold uppercase {m.isHistorical ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60' : (forecastScenario === 'ai_speculative' ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60' : 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60')}">
                                    {m.isHistorical ? 'Ist' : (forecastScenario === 'ai_speculative' ? 'Gemini 3.8' : 'Prognose')}
                                </span>
                                {#if !m.isHistorical && m.confidenceScore}
                                    <span class="text-[10px] font-bold text-slate-500 dark:text-slate-400" title="Prognose-Konfidenz">{m.confidenceScore}%</span>
                                {/if}
                            </div>
                        </td>
                        <td class="p-3.5 text-right text-indigo-700 dark:text-indigo-400 font-bold whitespace-nowrap">
                            {formatCurrency(m.bwaRevenue)}
                        </td>
                        <td class="p-3.5 text-right text-rose-600 dark:text-rose-400 font-bold whitespace-nowrap">
                            -{formatCurrency(m.bwaExpenses)}
                        </td>
                        <td class="p-3.5 text-right font-bold text-emerald-700 dark:text-emerald-300 whitespace-nowrap">
                            {formatCurrency(m.bwaNetAfterTaxes)}
                        </td>
                        <td class="p-3.5 text-right text-amber-700 dark:text-amber-300 font-semibold whitespace-nowrap">
                            -{formatCurrency(m.personalTotalExpenses)}
                        </td>
                        <td class="p-3.5 text-right font-black whitespace-nowrap text-sm sm:text-base {isNegative ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}">
                            {m.totalCashflow >= 0 ? '+' : ''}{formatCurrency(m.totalCashflow)}
                        </td>
                        <td class="p-3.5 text-right font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                            {formatCurrency(m.cumulativeBalance)}
                        </td>
                    </tr>
                {/each}
            </tbody>
        </table>
    </div>
</div>
