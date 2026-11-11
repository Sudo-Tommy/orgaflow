<script lang="ts">
    import { formatCurrency, formatBarAmount } from "./financeFormatUtils";

    interface Props {
        timeline: any[];
    }

    let { timeline }: Props = $props();

    let maxVal = $derived(
        timeline && timeline.length > 0 
            ? Math.max(...timeline.map((m: any) => Math.abs(m.totalCashflow)), 1)
            : 1
    );
</script>

<div class="bg-neutral-50/70 dark:bg-slate-800/50 border border-neutral-100 dark:border-slate-800 rounded-2xl p-4">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
        <h4 class="text-xs sm:text-sm font-bold text-neutral-800 dark:text-slate-200 flex items-center gap-1.5">
            <span>📊</span> Monatlicher Gesamt-Cashflow (Ist-Monate & 12M Zukunftsprognose)
        </h4>
        <div class="flex items-center gap-3 text-[10px] font-bold text-neutral-500 dark:text-slate-400 flex-wrap">
            <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-emerald-500"></span> Ist Überschuss</span>
            <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-indigo-500"></span> Prognose Überschuss</span>
            <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-rose-500"></span> Defizit</span>
        </div>
    </div>

    {#if timeline && timeline.length > 0}
        <div class="w-full h-44 sm:h-52 flex gap-1.5 sm:gap-2.5 items-end overflow-x-auto custom-scrollbar pb-2 pt-6 select-none">
            {#each timeline as m}
                {@const val = m.totalCashflow}
                {@const isNegative = val < 0}
                {@const barHeightPct = Math.max(8, Math.min(100, Math.round((Math.abs(val) / maxVal) * 100)))}
                
                <div 
                    class="flex flex-col items-center shrink-0 group/bar flex-1 min-w-[42px] sm:min-w-[50px] h-full justify-end cursor-pointer transition-transform hover:-translate-y-1 touch-manipulation"
                    title="{m.month}: Cashflow {formatCurrency(val)} (BWA Netto: {formatCurrency(m.bwaNetAfterTaxes)}, Privat: {formatCurrency(m.personalBalance)})"
                >
                    <span class="text-[9px] font-black leading-none mb-1 whitespace-nowrap {isNegative ? 'text-rose-600 dark:text-rose-400' : (m.isHistorical ? 'text-emerald-700 dark:text-emerald-400' : 'text-indigo-700 dark:text-indigo-400')}">
                        {formatBarAmount(val)}
                    </span>

                    <div class="w-full h-28 sm:h-36 flex items-end justify-center relative">
                        <div 
                            class="w-full rounded-t-lg transition-all shadow-xs {isNegative ? 'bg-rose-500' : (m.isHistorical ? 'bg-emerald-500' : 'bg-indigo-500')} group-hover/bar:brightness-110" 
                            style="height: {barHeightPct}%;"
                        ></div>
                    </div>

                    <div class="flex flex-col items-center mt-1.5 w-full">
                        <span class="text-[10px] font-bold text-neutral-800 dark:text-slate-200 truncate max-w-full text-center">
                            {m.monthShort}
                        </span>
                        <span class="text-[8px] font-bold uppercase px-1 rounded mt-0.5 {m.isHistorical ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300' : 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300'}">
                            {m.isHistorical ? 'Ist' : 'Prog'}
                        </span>
                    </div>
                </div>
            {/each}
        </div>
    {/if}
</div>
