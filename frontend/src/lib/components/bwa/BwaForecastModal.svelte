<script lang="ts">
    let { forecastStats, forecastScenario = $bindable(), onSelectMonth } = $props<any>();
    
    let dialog: HTMLDialogElement | undefined = $state();
    export function showModal() { dialog?.showModal(); }
    export function close() { dialog?.close(); }
    
    function formatCurrency(val: number) { return (val || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' }); }

    function formatBarAmount(val: number): string {
        if (Math.abs(val) >= 10000) {
            return (val > 0 ? '+' : '') + (val / 1000).toFixed(1).replace('.', ',') + 'k';
        } else if (Math.abs(val) >= 1000) {
            return (val > 0 ? '+' : '') + (val / 1000).toFixed(1).replace('.', ',') + 'k';
        } else {
            return (val > 0 ? '+' : '') + Math.round(val) + ' €';
        }
    }

    function handleBarClick(m: any) {
        if (onSelectMonth && m) {
            onSelectMonth(m.monthIndex + 1, m.year);
            close();
        }
    }
</script>

<dialog bind:this={dialog} class="p-0 bg-transparent backdrop:bg-black/50 backdrop:backdrop-blur-sm w-full max-w-5xl mx-auto my-auto rounded-3xl print:hidden" onclick={(e) => { if (e.target === dialog) close(); }}>
    <div class="bg-white rounded-3xl p-4 sm:p-6 md:p-8 w-full max-h-[90vh] flex flex-col relative shadow-2xl overflow-hidden">
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between mb-4 shrink-0 pr-12 gap-3">
            <div>
                <h2 class="text-xl sm:text-2xl font-black text-neutral-900 flex items-center gap-2 sm:gap-3">
                    <span class="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shadow-inner text-lg sm:text-xl shrink-0">🔮</span> 
                    Finanzprognose & Monatsverlauf
                </h2>
                <p class="text-xs sm:text-sm text-neutral-500 mt-1">Reale Monatsergebnisse (Ist) kombiniert mit künftigen 12-Monats-Prognosen.</p>
            </div>
            
            <!-- Szenarien-Umschalter -->
            <div class="flex bg-neutral-100 p-1 rounded-xl border border-neutral-200/70 shadow-inner shrink-0 self-start sm:self-auto w-full sm:w-auto">
                <button onclick={() => forecastScenario = 'pessimistic'} class="flex-1 sm:flex-none px-3 py-1.5 text-xs font-bold rounded-lg transition-colors {forecastScenario === 'pessimistic' ? 'bg-white shadow-sm text-purple-600' : 'text-neutral-500 hover:text-neutral-700'}">📉 Pessimistisch (-15%)</button>
                <button onclick={() => forecastScenario = 'realistic'} class="flex-1 sm:flex-none px-3 py-1.5 text-xs font-bold rounded-lg transition-colors {forecastScenario === 'realistic' ? 'bg-white shadow-sm text-purple-600' : 'text-neutral-500 hover:text-neutral-700'}">⚖️ Realistisch</button>
                <button onclick={() => forecastScenario = 'optimistic'} class="flex-1 sm:flex-none px-3 py-1.5 text-xs font-bold rounded-lg transition-colors {forecastScenario === 'optimistic' ? 'bg-white shadow-sm text-purple-600' : 'text-neutral-500 hover:text-neutral-700'}">📈 Optimistisch (+15%)</button>
            </div>
        </div>

        <button aria-label="Schließen" onclick={close} class="absolute top-4 right-4 sm:top-6 sm:right-6 w-9 h-9 sm:w-10 sm:h-10 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-full flex items-center justify-center transition-colors">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <!-- Legende & Hinweis -->
        <div class="flex flex-wrap items-center justify-between gap-2 text-[10px] sm:text-xs font-bold text-neutral-500 mb-3 shrink-0 bg-neutral-50 px-3 py-2 rounded-xl border border-neutral-100">
            <div class="flex items-center gap-3">
                <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Ist (Realer Gewinn)</span>
                <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-indigo-500"></span> Prognose (Gewinn)</span>
                <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Negativ (Verlust)</span>
            </div>
            <span class="text-neutral-400 italic">💡 Klick auf einen Monat öffnet direkt dessen Monats-BWA</span>
        </div>
        
        <!-- Balkensystem -->
        {#if forecastStats && forecastStats.length > 0}
            {@const multiplier = forecastScenario === 'optimistic' ? 1.15 : (forecastScenario === 'pessimistic' ? 0.85 : 1)}
            {@const maxVal = Math.max(...forecastStats.map((m: any) => Math.abs((m.isHistorical ? m.revenue : (m.revenue * multiplier)) - m.expenses)), 1)}
            
            <div class="w-full h-56 sm:h-72 flex gap-2 sm:gap-3 items-end overflow-x-auto custom-scrollbar pb-3 pt-6 shrink-0 mb-4 border-b border-neutral-100">
                {#each forecastStats as m}
                    {@const rev = m.isHistorical ? m.revenue : (m.revenue * multiplier)}
                    {@const val = rev - m.expenses}
                    {@const isNegative = val < 0}
                    {@const barHeightPct = Math.max(8, Math.min(100, Math.round((Math.abs(val) / maxVal) * 100)))}
                    
                    <button 
                        onclick={() => handleBarClick(m)}
                        class="flex flex-col items-center shrink-0 group/bar flex-1 min-w-[46px] sm:min-w-[54px] h-full justify-end cursor-pointer transition-transform hover:-translate-y-1 focus:outline-none"
                        title="{m.month}: {m.isHistorical ? 'Reales Ist-Ergebnis' : 'Prognose'} {formatCurrency(val)} – Klick für BWA"
                    >
                        <!-- Zahl über dem Balken -->
                        <span class="text-[9px] sm:text-[10px] font-black leading-none mb-1.5 whitespace-nowrap {isNegative ? 'text-rose-600' : (m.isHistorical ? 'text-emerald-600' : 'text-indigo-600')}">
                            {formatBarAmount(val)}
                        </span>
                        
                        <!-- Der Balken -->
                        <div class="w-full h-36 sm:h-48 flex items-end justify-center relative">
                            <div 
                                class="w-full rounded-t-xl transition-all shadow-sm {isNegative ? 'bg-rose-500 group-hover/bar:bg-rose-600' : (m.isHistorical ? 'bg-emerald-500 group-hover/bar:bg-emerald-600' : 'bg-indigo-500 group-hover/bar:bg-indigo-600')}" 
                                style="height: {barHeightPct}%;"
                            ></div>
                        </div>
                        
                        <!-- Monats-Beschriftung & Badge -->
                        <div class="flex flex-col items-center mt-2 w-full">
                            <span class="text-[10px] sm:text-[11px] font-bold text-neutral-800 group-hover/bar:text-indigo-600 transition-colors truncate max-w-full text-center">
                                {m.monthShort}
                            </span>
                            <span class="text-[8px] sm:text-[9px] font-semibold uppercase px-1 rounded mt-0.5 {m.isHistorical ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-100 text-indigo-800'}">
                                {m.isHistorical ? 'Ist' : 'Prog'}
                            </span>
                        </div>
                    </button>
                {/each}
            </div>
        {/if}

        <!-- Detail-Tabelle -->
        <div class="flex-1 overflow-y-auto custom-scrollbar orga-table-container">
            <table class="w-full text-left border-collapse min-w-160 text-sm tabular-nums">
                <thead class="bg-slate-100/95 dark:bg-slate-800/95 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10 backdrop-blur-sm text-xs uppercase tracking-wider">
                    <tr>
                        <th class="p-3.5 font-bold text-slate-800 dark:text-slate-100">Monat</th>
                        <th class="p-3.5 font-bold text-slate-800 dark:text-slate-100 text-center">Status</th>
                        <th class="p-3.5 font-bold text-slate-800 dark:text-slate-100 text-right">Umsatz</th>
                        <th class="p-3.5 font-bold text-slate-800 dark:text-slate-100 text-right">Ausgaben</th>
                        <th class="p-3.5 font-bold text-slate-800 dark:text-slate-100 text-right">Ergebnis / Gewinn</th>
                        <th class="p-3.5 font-bold text-slate-800 dark:text-slate-100 text-center">Aktion</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-slate-900">
                    {#if forecastStats && forecastStats.length > 0}
                        {@const multiplier = forecastScenario === 'optimistic' ? 1.15 : (forecastScenario === 'pessimistic' ? 0.85 : 1)}
                        {#each forecastStats as m}
                            {@const rev = m.isHistorical ? m.revenue : (m.revenue * multiplier)}
                            {@const val = rev - m.expenses}
                            {@const isNegative = val < 0}
                            <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                                <td class="p-3.5 font-bold text-slate-900 dark:text-slate-100">{m.month}</td>
                                <td class="p-3.5 text-center">
                                    <span class="px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider {m.isHistorical ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60' : 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60'}">
                                        {m.isHistorical ? 'Reale Daten' : 'Prognose'}
                                    </span>
                                </td>
                                <td class="p-3.5 text-indigo-700 dark:text-indigo-400 font-bold text-right">{formatCurrency(rev)}</td>
                                <td class="p-3.5 text-rose-600 dark:text-rose-400 font-bold text-right">{formatCurrency(m.expenses)}</td>
                                <td class="p-3.5 {isNegative ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'} font-black text-right">
                                    {formatCurrency(val)}
                                </td>
                                <td class="p-3.5 text-center">
                                    <button 
                                        onclick={() => handleBarClick(m)}
                                        class="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-600 text-slate-800 dark:text-slate-200 hover:text-white rounded-xl text-xs font-bold transition-all shadow-2xs border border-slate-200 dark:border-slate-700"
                                        title="BWA für diesen Monat öffnen"
                                    >
                                        BWA öffnen &rarr;
                                    </button>
                                </td>
                            </tr>
                        {/each}
                    {/if}
                </tbody>
            </table>
        </div>
    </div>
</dialog>