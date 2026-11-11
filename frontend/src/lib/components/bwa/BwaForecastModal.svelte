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

<dialog bind:this={dialog} class="zero-inner-scroll-modal p-0 bg-transparent backdrop:bg-black/50 backdrop:backdrop-blur-sm w-full max-w-3xl mx-auto my-auto rounded-3xl print:hidden" onclick={(e) => { if (e.target === dialog) close(); }}>
    <div class="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-4 sm:p-6 w-full flex flex-col relative shadow-2xl">
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between mb-4 shrink-0 pr-12 gap-3">
            <div>
                <h2 class="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2 sm:gap-3">
                    <span class="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-900/40 flex items-center justify-center shadow-inner text-lg sm:text-xl shrink-0">🔮</span> 
                    Finanzprognose & Monatsverlauf
                </h2>
                <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">Reale Monatsergebnisse (Ist) kombiniert mit künftigen 12-Monats-Prognosen.</p>
            </div>
            
            <!-- Szenarien-Umschalter -->
            <div class="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-inner shrink-0 self-start sm:self-auto w-full sm:w-auto">
                <button onclick={() => forecastScenario = 'pessimistic'} class="flex-1 sm:flex-none px-3 py-1.5 min-h-[38px] text-xs font-bold rounded-lg transition-colors {forecastScenario === 'pessimistic' ? 'bg-white dark:bg-slate-900 shadow-sm text-purple-600 dark:text-purple-400' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}">📉 Pessimistisch (-15%)</button>
                <button onclick={() => forecastScenario = 'realistic'} class="flex-1 sm:flex-none px-3 py-1.5 min-h-[38px] text-xs font-bold rounded-lg transition-colors {forecastScenario === 'realistic' ? 'bg-white dark:bg-slate-900 shadow-sm text-purple-600 dark:text-purple-400' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}">⚖️ Realistisch</button>
                <button onclick={() => forecastScenario = 'optimistic'} class="flex-1 sm:flex-none px-3 py-1.5 min-h-[38px] text-xs font-bold rounded-lg transition-colors {forecastScenario === 'optimistic' ? 'bg-white dark:bg-slate-900 shadow-sm text-purple-600 dark:text-purple-400' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}">📈 Optimistisch (+15%)</button>
            </div>
        </div>

        <button aria-label="Schließen" onclick={close} class="absolute top-4 right-4 sm:top-6 sm:right-6 w-10 h-10 min-h-[44px] min-w-[44px] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full flex items-center justify-center transition-colors">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <!-- Legende & Hinweis -->
        <div class="flex flex-wrap items-center justify-between gap-2 text-[10px] sm:text-xs font-bold text-slate-600 dark:text-slate-400 mb-3 shrink-0 bg-slate-50 dark:bg-slate-800/60 px-3 py-2 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
            <div class="flex items-center gap-3">
                <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Ist (Realer Gewinn)</span>
                <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-indigo-500"></span> Prognose (Gewinn)</span>
                <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Negativ (Verlust)</span>
            </div>
            <span class="text-slate-400 dark:text-slate-500 italic">💡 Klick auf einen Monat öffnet direkt dessen Monats-BWA</span>
        </div>

        <!-- Balken-Diagramm -->
        {#if forecastStats && forecastStats.length > 0}
            {@const multiplier = forecastScenario === 'optimistic' ? 1.15 : (forecastScenario === 'pessimistic' ? 0.85 : 1)}
            {@const values = forecastStats.map((m: any) => {
                const rev = m.isHistorical ? m.revenue : (m.revenue * multiplier);
                return rev - m.expenses;
            })}
            {@const maxVal = Math.max(...values.map((v: number) => Math.abs(v)), 1000)}
            
            <div class="grid grid-cols-6 sm:grid-cols-12 gap-1 sm:gap-2 mb-6 p-3 sm:p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shrink-0">
                {#each forecastStats as m, i}
                    {@const rev = m.isHistorical ? m.revenue : (m.revenue * multiplier)}
                    {@const val = rev - m.expenses}
                    {@const isPositive = val >= 0}
                    {@const pct = Math.min(Math.round((Math.abs(val) / maxVal) * 100), 100)}
                    
                    <button 
                        onclick={() => handleBarClick(m)}
                        class="flex flex-col items-center justify-end h-44 sm:h-52 group/bar relative p-1 rounded-xl hover:bg-white dark:hover:bg-slate-700/50 transition-colors focus:outline-none"
                    >
                        <!-- Betrag über dem Balken -->
                        <span class="text-[9px] sm:text-[10px] font-black mb-1.5 {isPositive ? (m.isHistorical ? 'text-emerald-600 dark:text-emerald-400' : 'text-indigo-600 dark:text-indigo-400') : 'text-rose-600 dark:text-rose-400'} truncate max-w-full">
                            {formatBarAmount(val)}
                        </span>
                        
                        <!-- Balken-Track -->
                        <div class="w-full max-w-[28px] bg-slate-200 dark:bg-slate-700/60 rounded-lg flex flex-col justify-end p-0.5 relative h-28 sm:h-32 shadow-inner">
                            <div 
                                class="w-full rounded-md transition-all duration-300 {isPositive ? (m.isHistorical ? 'bg-gradient-to-t from-emerald-600 to-emerald-400' : 'bg-gradient-to-t from-indigo-600 to-indigo-400') : 'bg-gradient-to-t from-rose-600 to-rose-400'}" 
                                style="height: {Math.max(pct, 6)}%;"
                            ></div>
                        </div>
                        
                        <!-- Monats-Beschriftung & Badge -->
                        <div class="flex flex-col items-center mt-2 w-full">
                            <span class="text-[10px] sm:text-[11px] font-bold text-slate-800 dark:text-slate-200 group-hover/bar:text-indigo-600 dark:group-hover/bar:text-indigo-400 transition-colors truncate max-w-full text-center">
                                {m.monthShort}
                            </span>
                            <span class="text-[8px] sm:text-[9px] font-semibold uppercase px-1 rounded mt-0.5 {m.isHistorical ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300' : 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300'}">
                                {m.isHistorical ? 'Ist' : 'Prog'}
                            </span>
                        </div>
                    </button>
                {/each}
            </div>
        {/if}

        <!-- Detail-Tabelle ohne internen vertikalen Scroll -->
        <div class="w-full overflow-x-auto custom-scrollbar orga-table-container">
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