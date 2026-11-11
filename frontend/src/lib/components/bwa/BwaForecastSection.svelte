<script lang="ts">
    import type { useBwaService } from "$lib/services/bwaService.svelte";
    import type { useBwaPageState } from "$lib/services/bwaPageState.svelte";

    let { bwa, pageState, onOpenMonthBwa, onOpenAiForecast } = $props<{
        bwa: ReturnType<typeof useBwaService>;
        pageState: ReturnType<typeof useBwaPageState>;
        onOpenMonthBwa: (month: number, year?: number) => void;
        onOpenAiForecast: () => void;
    }>();

    let multiplier = $derived(
        pageState.forecastScenario === 'optimistic' ? 1.15 : (pageState.forecastScenario === 'pessimistic' ? 0.85 : 1)
    );
    let maxVal = $derived(
        Math.max(...bwa.forecastStats.map((f: any) => Math.abs((f.isHistorical ? f.revenue : (f.revenue * multiplier)) - f.expenses)), 1)
    );
</script>

<div class="space-y-4 mb-6 print:hidden">
    <!-- Zeitraum-Steuerung -->
    <div class="bg-white dark:bg-slate-900 rounded-3xl border border-neutral-100 dark:border-slate-800 shadow-xs p-4 sm:p-5">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-neutral-100 dark:border-slate-800">
            <!-- Ansichts-Modus -->
            <div class="flex items-center gap-1.5 bg-neutral-100 dark:bg-slate-800 p-1 rounded-2xl shadow-inner">
                <button onclick={() => pageState.viewMode = 'monthly'} class="px-4 py-2 rounded-xl text-xs font-bold transition-all {pageState.viewMode === 'monthly' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs' : 'text-neutral-500 hover:text-neutral-800 dark:text-slate-400 dark:hover:text-slate-200'}">
                    📅 Monatlich
                </button>
                <button onclick={() => pageState.viewMode = 'quarterly'} class="px-4 py-2 rounded-xl text-xs font-bold transition-all {pageState.viewMode === 'quarterly' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs' : 'text-neutral-500 hover:text-neutral-800 dark:text-slate-400 dark:hover:text-slate-200'}">
                    📊 Quartal
                </button>
                <button onclick={() => pageState.viewMode = 'yearly'} class="px-4 py-2 rounded-xl text-xs font-bold transition-all {pageState.viewMode === 'yearly' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs' : 'text-neutral-500 hover:text-neutral-800 dark:text-slate-400 dark:hover:text-slate-200'}">
                    📆 Jährlich
                </button>
            </div>

            <!-- Jahr-Steuerung -->
            <div class="flex items-center bg-neutral-50 dark:bg-slate-800 border border-neutral-200/70 dark:border-slate-700 rounded-2xl p-1 shadow-xs">
                <button onclick={() => bwa.selectedYear--} class="w-8 h-8 rounded-xl flex items-center justify-center text-neutral-500 hover:text-indigo-600 hover:bg-white dark:hover:bg-slate-700 transition-colors" title="Vorheriges Jahr">◀</button>
                <select bind:value={bwa.selectedYear} aria-label="Geschäftsjahr" class="bg-transparent text-sm font-black text-neutral-900 dark:text-white px-2 outline-none cursor-pointer">
                    {#each bwa.availableYears as yr}<option value={yr} class="text-neutral-900 dark:text-slate-900">{yr}</option>{/each}
                </select>
                <button onclick={() => bwa.selectedYear++} class="w-8 h-8 rounded-xl flex items-center justify-center text-neutral-500 hover:text-indigo-600 hover:bg-white dark:hover:bg-slate-700 transition-colors" title="Nächstes Jahr">▶</button>
            </div>
        </div>

        <!-- Detail-Buttons für Monate / Quartale -->
        <div class="pt-3">
            {#if pageState.viewMode === 'monthly'}
                <div class="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-1.5 sm:gap-2">
                    {#each Array.from({length: 12}) as _, i}
                        {@const mNum = i + 1}
                        {@const mName = new Date(2000, i, 1).toLocaleString('de-DE', { month: 'short' })}
                        {@const isSel = pageState.selectedMonth === mNum}
                        <button onclick={() => pageState.selectedMonth = mNum} class="min-h-[44px] flex flex-col items-center justify-center rounded-2xl text-xs font-bold transition-all active:scale-95 {isSel ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25 ring-2 ring-indigo-500' : 'bg-neutral-50 dark:bg-slate-800/80 hover:bg-indigo-50 dark:hover:bg-slate-700 text-neutral-700 dark:text-slate-300 border border-neutral-100 dark:border-slate-800'}">
                            <span>{mName}</span>
                            <span class="text-[9px] font-normal {isSel ? 'text-indigo-100' : 'text-neutral-400'}">{mNum < 10 ? `0${mNum}` : mNum}</span>
                        </button>
                    {/each}
                </div>
            {:else if pageState.viewMode === 'quarterly'}
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {#each [{ q: 1, label: 'Q1', desc: 'Jan – Mär' }, { q: 2, label: 'Q2', desc: 'Apr – Jun' }, { q: 3, label: 'Q3', desc: 'Jul – Sep' }, { q: 4, label: 'Q4', desc: 'Okt – Dez' }] as qItem}
                        {@const isSel = pageState.selectedQuarter === qItem.q}
                        <button onclick={() => pageState.selectedQuarter = qItem.q} class="min-h-[48px] p-2.5 rounded-2xl flex items-center justify-between transition-all active:scale-95 {isSel ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25 ring-2 ring-indigo-500' : 'bg-neutral-50 dark:bg-slate-800/80 hover:bg-indigo-50 dark:hover:bg-slate-700 text-neutral-700 dark:text-slate-300 border border-neutral-100 dark:border-slate-800'}">
                            <span class="font-black text-sm">{qItem.label}</span>
                            <span class="text-[10px] {isSel ? 'text-indigo-100' : 'text-neutral-400'}">{qItem.desc}</span>
                        </button>
                    {/each}
                </div>
            {:else}
                <div class="p-3 bg-neutral-50 dark:bg-slate-800/80 rounded-2xl text-xs font-bold text-center text-neutral-600 dark:text-slate-300">
                    📆 Vollständiges Geschäftsjahr {bwa.selectedYear} (01. Januar – 31. Dezember)
                </div>
            {/if}
        </div>
    </div>

    <!-- Zukunftsprognose Diagramm -->
    <div class="bg-white dark:bg-slate-900 rounded-3xl border border-neutral-100 dark:border-slate-800 shadow-xs p-4 sm:p-6 group hover:shadow-md transition-shadow">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
            <div>
                <h3 class="font-bold text-neutral-900 dark:text-white flex items-center gap-2 text-base sm:text-lg">
                    <span class="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center text-sm shadow-inner shrink-0">🔮</span> 
                    Zukunftsprognose &amp; Monatstrend
                </h3>
                <p class="text-[11px] text-neutral-400 dark:text-slate-400">Tatsächliche Ergebnisse (Ist) und kalkulierte Vorausschau für die kommenden Monate</p>
            </div>
            
            <div class="flex items-center gap-1.5 self-start sm:self-auto">
                <div class="flex bg-neutral-100 dark:bg-slate-800 p-1 rounded-xl border border-neutral-200/70 dark:border-slate-700 shadow-inner">
                    <button onclick={() => pageState.forecastScenario = 'pessimistic'} class="px-2.5 py-1 text-xs font-bold rounded-lg transition-colors {pageState.forecastScenario === 'pessimistic' ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-300 shadow-xs' : 'text-neutral-500 dark:text-slate-400'}" title="Pessimistisch (-15%)">📉 -15%</button>
                    <button onclick={() => pageState.forecastScenario = 'realistic'} class="px-2.5 py-1 text-xs font-bold rounded-lg transition-colors {pageState.forecastScenario === 'realistic' ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-300 shadow-xs' : 'text-neutral-500 dark:text-slate-400'}" title="Realistisch">⚖️ Real</button>
                    <button onclick={() => pageState.forecastScenario = 'optimistic'} class="px-2.5 py-1 text-xs font-bold rounded-lg transition-colors {pageState.forecastScenario === 'optimistic' ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-300 shadow-xs' : 'text-neutral-500 dark:text-slate-400'}" title="Optimistisch (+15%)">📈 +15%</button>
                </div>
                <button onclick={onOpenAiForecast} class="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-black rounded-xl shadow-xs transition-all flex items-center gap-1" title="Erweiterte KI-Prognose öffnen">
                    <span>✨ Gemini KI</span>
                </button>
            </div>
        </div>

        {#if bwa.forecastStats.length > 0}
            <div class="w-full h-44 flex gap-2 items-end pb-2 pt-6 overflow-x-hidden">
                {#each bwa.forecastStats as f}
                    {@const rev = f.isHistorical ? f.revenue : (f.revenue * multiplier)}
                    {@const val = rev - f.expenses}
                    {@const isNeg = val < 0}
                    {@const barPct = Math.max(8, Math.min(100, Math.round((Math.abs(val) / maxVal) * 100)))}
                    <button 
                        type="button"
                        onclick={() => onOpenMonthBwa(f.monthIndex + 1, f.year)}
                        class="flex flex-col items-center flex-1 h-full justify-end cursor-pointer group hover:-translate-y-1 transition-transform touch-manipulation focus:outline-none"
                        title="{f.month}: {f.isHistorical ? 'Ist' : 'Prognose'} {pageState.formatCurrency(val)} – Klick für Details"
                    >
                        <span class="text-[9px] font-black mb-1 whitespace-nowrap {isNeg ? 'text-rose-600 dark:text-rose-400' : (f.isHistorical ? 'text-emerald-600 dark:text-emerald-400' : 'text-indigo-600 dark:text-indigo-400')}">
                            {pageState.formatCurrency(val).replace(',00', '')}
                        </span>
                        <div class="w-full h-24 flex items-end justify-center">
                            <div class="w-full rounded-t-lg shadow-xs {isNeg ? 'bg-rose-500' : (f.isHistorical ? 'bg-emerald-500' : 'bg-indigo-500')}" style="height: {barPct}%;"></div>
                        </div>
                        <span class="text-[10px] font-bold text-neutral-700 dark:text-slate-300 mt-1">{f.monthShort}</span>
                        <span class="text-[8px] font-bold uppercase px-1 rounded {f.isHistorical ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300' : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300'}">
                            {f.isHistorical ? 'Ist' : 'Prog'}
                        </span>
                    </button>
                {/each}
            </div>
        {/if}
    </div>
</div>
