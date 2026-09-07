<script lang="ts">
    import { useUnifiedFinanceForecastService } from "$lib/services/unifiedFinanceForecastService.svelte";
    import { pb } from "$lib/services/pocketbase";
    import { toastStore } from "$lib/services/toastService.svelte";

    let dialog: HTMLDialogElement | undefined = $state();
    const service = useUnifiedFinanceForecastService();

    export function open(userId?: string, year?: number, autoGenerate = true) {
        if (userId) {
            service.setUserId(userId);
        } else {
            service.setUserId(pb.authStore.model?.id);
        }
        if (year) {
            service.selectedYear = year;
        }
        service.init();
        dialog?.showModal();

        // Wenn noch keine KI-Prognosedaten für diesen Benutzer/dieses Jahr vorliegen: automatisch prognostizieren!
        if (autoGenerate && !service.aiSpeculationData && !service.isGeneratingAi) {
            service.generateAiForecast(false);
        }
    }

    export function close() {
        dialog?.close();
    }

    function formatCurrency(val: number) {
        return (val || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
    }

    function formatBarAmount(val: number): string {
        const sign = val > 0 ? '+' : (val < 0 ? '-' : '');
        const abs = Math.abs(val);
        if (abs >= 10000) {
            return sign + (abs / 1000).toFixed(1).replace('.', ',') + 'k';
        } else if (abs >= 1000) {
            return sign + (abs / 1000).toFixed(1).replace('.', ',') + 'k';
        } else {
            return (val > 0 ? '+' : '') + Math.round(val) + ' €';
        }
    }

    function exportCsv() {
        if (!service.timeline || service.timeline.length === 0) {
            toastStore.info("Keine Prognosedaten zum Exportieren vorhanden.");
            return;
        }

        const headers = [
            "Monat", "Typ", "BWA Umsatz", "BWA Betriebsausgaben", "BWA Betriebsgewinn",
            "BWA Steuern (Est/GewSt/USt)", "BWA Netto nach Steuern",
            "Privat Einnahmen", "Privat Fixkosten", "Privat Var. Kosten", "Privat Ausgaben Gesamt",
            "Privat Saldo", "Konsolidiertes Nettoeinkommen", "Freier Gesamt-Cashflow", "Kumulierter Stand"
        ];

        const rows = service.timeline.map(m => [
            m.month,
            m.isHistorical ? "Reale Ist-Daten" : "Prognose",
            m.bwaRevenue.toFixed(2).replace('.', ','),
            m.bwaExpenses.toFixed(2).replace('.', ','),
            m.bwaProfit.toFixed(2).replace('.', ','),
            m.bwaTaxes.toFixed(2).replace('.', ','),
            m.bwaNetAfterTaxes.toFixed(2).replace('.', ','),
            m.personalIncome.toFixed(2).replace('.', ','),
            m.personalContracts.toFixed(2).replace('.', ','),
            m.personalVariableExpenses.toFixed(2).replace('.', ','),
            m.personalTotalExpenses.toFixed(2).replace('.', ','),
            m.personalBalance.toFixed(2).replace('.', ','),
            m.totalNetIncome.toFixed(2).replace('.', ','),
            m.totalCashflow.toFixed(2).replace('.', ','),
            m.cumulativeBalance.toFixed(2).replace('.', ',')
        ]);

        const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map(r => r.join(";"))].join("\r\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Gesamt_Finanzprognose_${service.selectedYear}_${service.forecastScenario}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toastStore.success("Finanzprognose erfolgreich als CSV exportiert.");
    }
</script>

<dialog 
    bind:this={dialog} 
    class="p-0 bg-transparent backdrop:bg-black/60 backdrop:backdrop-blur-sm w-full max-w-6xl mx-auto my-auto rounded-3xl print:hidden shadow-2xl" 
    onclick={(e) => { if (e.target === dialog) close(); }}
>
    <div class="bg-white rounded-3xl p-4 sm:p-6 md:p-8 w-full max-h-[92vh] flex flex-col relative shadow-2xl overflow-hidden">
        <!-- Header -->
        <div class="flex flex-col md:flex-row md:items-center justify-between mb-5 shrink-0 pr-12 gap-3 border-b border-neutral-100 pb-4">
            <div>
                <div class="flex items-center gap-2 sm:gap-3">
                    <span class="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-indigo-500/20 shadow-md text-xl shrink-0">
                        🔮
                    </span> 
                    <div>
                        <h2 class="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight flex items-center gap-2">
                            <span>Gesamt-Finanzprognose</span>
                            <span class="text-xs font-bold px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 border border-purple-200">
                                BWA + Haushaltsbuch
                            </span>
                        </h2>
                        <div class="flex flex-wrap items-center gap-2 mt-0.5">
                            <p class="text-xs sm:text-sm text-neutral-500">
                                Konsolidierte Gegenüberstellung: Betriebsgewinn, geschätzte Steuern und private Lebenshaltung im rollierenden 12-Monats-Verlauf.
                            </p>
                            {#if service.savedAtFormatted}
                                <span class="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs" title="Prognose ist dauerhaft gespeichert">
                                    <span>💾</span>
                                    <span>Gespeichert ({service.savedAtFormatted})</span>
                                </span>
                            {/if}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Controls: Jahr, Szenario, Export -->
            <div class="flex flex-wrap items-center gap-2 self-start md:self-auto">
                <!-- Szenario-Schalter -->
                <div class="flex bg-neutral-100 p-1 rounded-xl border border-neutral-200/70 shadow-inner">
                    <button 
                        type="button"
                        onclick={() => service.forecastScenario = 'pessimistic'} 
                        class="px-2 py-1 text-xs font-bold rounded-lg transition-colors {service.forecastScenario === 'pessimistic' ? 'bg-white shadow-sm text-purple-600' : 'text-neutral-500 hover:text-neutral-700'}"
                        title="Pessimistisch (-15% BWA-Umsatz)"
                    >
                        📉 -15%
                    </button>
                    <button 
                        type="button"
                        onclick={() => service.forecastScenario = 'realistic'} 
                        class="px-2 py-1 text-xs font-bold rounded-lg transition-colors {service.forecastScenario === 'realistic' ? 'bg-white shadow-sm text-purple-600' : 'text-neutral-500 hover:text-neutral-700'}"
                        title="Realistisch (100%)"
                    >
                        ⚖️ Real
                    </button>
                    <button 
                        type="button"
                        onclick={() => service.forecastScenario = 'optimistic'} 
                        class="px-2 py-1 text-xs font-bold rounded-lg transition-colors {service.forecastScenario === 'optimistic' ? 'bg-white shadow-sm text-purple-600' : 'text-neutral-500 hover:text-neutral-700'}"
                        title="Optimistisch (+15% BWA-Umsatz)"
                    >
                        📈 +15%
                    </button>
                    <button 
                        type="button"
                        onclick={() => service.forecastScenario = 'ai_speculative'} 
                        disabled={!service.aiSpeculationData}
                        class="px-2.5 py-1 text-xs font-bold rounded-lg transition-colors {service.forecastScenario === 'ai_speculative' ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm' : 'text-purple-700 hover:text-purple-900 disabled:opacity-40'}"
                        title={service.aiSpeculationData ? 'Gemini 3.8 Flash KI-Spekulation aktiv' : 'Zuerst per KI berechnen'}
                    >
                        ✨ Gemini 3.8
                    </button>
                </div>

                <!-- Gemini 3.8 Flash Auslöser-Button -->
                <button
                    type="button"
                    onclick={() => service.generateAiForecast(false)}
                    disabled={service.isGeneratingAi}
                    class="orga-button-primary py-1.5 px-3 text-xs bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-sm flex items-center gap-1.5 transition-all disabled:opacity-60"
                    title="Berechne Zukunftsspekulation mit Gemini 3.8 Flash"
                >
                    {#if service.isGeneratingAi}
                        <span class="animate-spin text-xs">⏳</span>
                        <span>Gemini 3.8 rechnet...</span>
                    {:else}
                        <span>✨</span>
                        <span>{service.aiSpeculationData ? 'Mit Gemini 3.8 aktualisieren' : 'Mit Gemini 3.8 berechnen'}</span>
                    {/if}
                </button>

                <!-- CSV Button -->
                <button
                    type="button"
                    onclick={exportCsv}
                    class="orga-button-ghost py-1.5 px-3 text-xs shadow-xs bg-white border border-neutral-200 text-neutral-700 font-bold rounded-xl hover:bg-neutral-50 flex items-center gap-1.5"
                    title="Prognose als CSV herunterladen"
                >
                    <span>📥</span> CSV
                </button>
            </div>
        </div>

        {#if service.aiError}
            <div class="mb-4 bg-rose-50 border border-rose-200 p-3 rounded-xl flex items-center justify-between text-xs text-rose-800 font-medium shrink-0 animate-enter">
                <div class="flex items-center gap-2">
                    <span class="text-base">⚠️</span>
                    <span>{service.aiError}</span>
                </div>
                <button type="button" onclick={() => service.generateAiForecast(true)} class="text-rose-900 font-bold underline hover:no-underline">Erneut versuchen</button>
            </div>
        {/if}

        <!-- Close Button -->
        <button 
            aria-label="Schließen" 
            onclick={close} 
            class="absolute top-4 right-4 sm:top-6 sm:right-6 w-9 h-9 sm:w-10 sm:h-10 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-full flex items-center justify-center transition-colors touch-manipulation active:scale-90"
        >
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <!-- KPI Cards Summary -->
        <div class="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5 shrink-0">
            <!-- BWA Betriebsgewinn -->
            <div class="bg-indigo-50/60 border border-indigo-100 rounded-2xl p-3.5 flex flex-col justify-between">
                <span class="text-[10px] font-bold text-indigo-900/60 uppercase tracking-wider block truncate">🏢 BWA Betriebsgewinn</span>
                <span class="text-lg sm:text-xl font-black text-indigo-900 mt-1 truncate">
                    {formatCurrency(service.summaryStats.totalProfit)}
                </span>
                <span class="text-[10px] text-indigo-700 mt-0.5 truncate">Umsatz: {formatCurrency(service.summaryStats.totalRev)}</span>
            </div>

            <!-- Geschätzte Steuern -->
            <div class="bg-rose-50/60 border border-rose-100 rounded-2xl p-3.5 flex flex-col justify-between">
                <span class="text-[10px] font-bold text-rose-900/60 uppercase tracking-wider block truncate">🏛️ Steuern & Abgaben</span>
                <span class="text-lg sm:text-xl font-black text-rose-800 mt-1 truncate">
                    -{formatCurrency(service.summaryStats.totalTaxes)}
                </span>
                <span class="text-[10px] text-rose-700 mt-0.5 truncate">ESt, GewSt & USt</span>
            </div>

            <!-- BWA Reingewinn Netto -->
            <div class="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-3.5 flex flex-col justify-between">
                <span class="text-[10px] font-bold text-emerald-900/60 uppercase tracking-wider block truncate">💶 Gewerbe-Netto</span>
                <span class="text-lg sm:text-xl font-black text-emerald-700 mt-1 truncate">
                    {formatCurrency(service.summaryStats.totalBwaNet)}
                </span>
                <span class="text-[10px] text-emerald-700 mt-0.5 truncate">Nach allen Steuern</span>
            </div>

            <!-- Private Ausgaben (Haushaltsbuch) -->
            <div class="bg-amber-50/60 border border-amber-100 rounded-2xl p-3.5 flex flex-col justify-between">
                <span class="text-[10px] font-bold text-amber-900/60 uppercase tracking-wider block truncate">🏠 Private Lebenshaltung</span>
                <span class="text-lg sm:text-xl font-black text-amber-900 mt-1 truncate">
                    -{formatCurrency(service.summaryStats.totalPersonalExp)}
                </span>
                <span class="text-[10px] text-amber-700 mt-0.5 truncate">Fixkosten & Haushalt</span>
            </div>

            <!-- Freier Cashflow Gesamt -->
            <div class="bg-neutral-900 text-white rounded-2xl p-3.5 flex flex-col justify-between col-span-2 lg:col-span-1 shadow-md">
                <div class="flex items-center justify-between">
                    <span class="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block truncate">💰 Freier Cashflow</span>
                    <span class="text-[10px] font-black px-1.5 py-0.2 rounded {service.summaryStats.savingsRate >= 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}">
                        {service.summaryStats.savingsRate.toFixed(0)}%
                    </span>
                </div>
                <span class="text-lg sm:text-xl font-black {service.summaryStats.totalCashflow >= 0 ? 'text-emerald-400' : 'text-rose-400'} mt-1 truncate">
                    {formatCurrency(service.summaryStats.totalCashflow)}
                </span>
                <span class="text-[10px] text-neutral-400 mt-0.5 truncate">Ø {formatCurrency(service.summaryStats.avgMonthlyCashflow)} / Mon.</span>
            </div>
        </div>

        {#if service.aiSpeculationData?.strategic_analysis}
            {@const strat = service.aiSpeculationData.strategic_analysis}
            <!-- Gemini 3.8 Flash Strategische Spekulationsanalyse -->
            <div class="mb-5 bg-gradient-to-br from-purple-900/5 via-indigo-900/5 to-white border border-purple-200/80 rounded-2xl p-4 sm:p-5 shrink-0 shadow-xs relative overflow-hidden">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-2.5 border-b border-purple-100">
                    <div class="flex items-center gap-2">
                        <span class="text-lg">🧠</span>
                        <div>
                            <h3 class="text-sm sm:text-base font-black text-purple-950 flex items-center gap-2">
                                <span>{strat.summary_headline || 'Strategische Zukunfts-Spekulation'}</span>
                                <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                                    Gemini 3.8 Flash • {strat.confidence_overall || 90}% Konfidenz
                                </span>
                            </h3>
                            <p class="text-xs text-purple-800/80 mt-0.5 font-medium">
                                Trajektorie: <strong class="text-purple-950 font-bold">{strat.growth_trajectory}</strong> | Saisonalität: {strat.seasonal_patterns}
                            </p>
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <!-- Risiken & Liquiditätswarnungen -->
                    <div class="bg-white/80 border border-purple-100/80 rounded-xl p-3 shadow-2xs">
                        <span class="font-bold text-rose-800 flex items-center gap-1.5 mb-1.5">
                            <span>⚠️</span> Identifizierte Risiken & Steuerpuffer
                        </span>
                        <ul class="space-y-1 text-neutral-700">
                            {#each strat.liquidity_risks || [] as risk}
                                <li class="flex items-start gap-1.5">
                                    <span class="text-rose-500 font-bold">•</span>
                                    <span>{risk}</span>
                                </li>
                            {/each}
                        </ul>
                    </div>

                    <!-- Optimierungs- & Handlungshebel -->
                    <div class="bg-white/80 border border-purple-100/80 rounded-xl p-3 shadow-2xs">
                        <span class="font-bold text-emerald-800 flex items-center gap-1.5 mb-1.5">
                            <span>💡</span> Konkrete Hebel für Gewinn & Cashflow
                        </span>
                        <ul class="space-y-1 text-neutral-700">
                            {#each strat.optimization_tips || [] as tip}
                                <li class="flex items-start gap-1.5">
                                    <span class="text-emerald-600 font-bold">•</span>
                                    <span>{tip}</span>
                                </li>
                            {/each}
                        </ul>
                    </div>
                </div>
            </div>
        {/if}

        <!-- Scrollable Content: Chart & Table -->
        <div class="flex-1 overflow-y-auto custom-scrollbar space-y-5 pr-1">
            <!-- Balkendiagramm: Freier monatlicher Cashflow -->
            <div class="bg-neutral-50/70 border border-neutral-100 rounded-2xl p-4">
                <div class="flex items-center justify-between mb-2">
                    <h4 class="text-xs sm:text-sm font-bold text-neutral-800 flex items-center gap-1.5">
                        <span>📊</span> Monatlicher Gesamt-Cashflow (Ist-Monate & 12M Zukunftsprognose)
                    </h4>
                    <div class="flex items-center gap-3 text-[10px] font-bold text-neutral-500">
                        <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-emerald-500"></span> Ist Überschuss</span>
                        <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-indigo-500"></span> Prognose Überschuss</span>
                        <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-rose-500"></span> Defizit</span>
                    </div>
                </div>

                {#if service.timeline && service.timeline.length > 0}
                    {@const maxVal = Math.max(...service.timeline.map(m => Math.abs(m.totalCashflow)), 1)}
                    <div class="w-full h-44 sm:h-52 flex gap-1.5 sm:gap-2.5 items-end overflow-x-auto custom-scrollbar pb-2 pt-6 select-none">
                        {#each service.timeline as m}
                            {@const val = m.totalCashflow}
                            {@const isNegative = val < 0}
                            {@const barHeightPct = Math.max(8, Math.min(100, Math.round((Math.abs(val) / maxVal) * 100)))}
                            
                            <div 
                                class="flex flex-col items-center shrink-0 group/bar flex-1 min-w-[42px] sm:min-w-[50px] h-full justify-end cursor-pointer transition-transform hover:-translate-y-1"
                                title="{m.month}: Cashflow {formatCurrency(val)} (BWA Netto: {formatCurrency(m.bwaNetAfterTaxes)}, Privat: {formatCurrency(m.personalBalance)})"
                            >
                                <span class="text-[9px] font-black leading-none mb-1 whitespace-nowrap {isNegative ? 'text-rose-600' : (m.isHistorical ? 'text-emerald-700' : 'text-indigo-700')}">
                                    {formatBarAmount(val)}
                                </span>

                                <div class="w-full h-28 sm:h-36 flex items-end justify-center relative">
                                    <div 
                                        class="w-full rounded-t-lg transition-all shadow-xs {isNegative ? 'bg-rose-500' : (m.isHistorical ? 'bg-emerald-500' : 'bg-indigo-500')} group-hover/bar:brightness-110" 
                                        style="height: {barHeightPct}%;"
                                    ></div>
                                </div>

                                <div class="flex flex-col items-center mt-1.5 w-full">
                                    <span class="text-[10px] font-bold text-neutral-800 truncate max-w-full text-center">
                                        {m.monthShort}
                                    </span>
                                    <span class="text-[8px] font-bold uppercase px-1 rounded mt-0.5 {m.isHistorical ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-100 text-indigo-800'}">
                                        {m.isHistorical ? 'Ist' : 'Prog'}
                                    </span>
                                </div>
                            </div>
                        {/each}
                    </div>
                {/if}
            </div>

            <!-- Konsolidierungs-Tabelle -->
            <div class="border border-neutral-200 rounded-2xl overflow-hidden shadow-xs">
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
                            {#each service.timeline as m}
                                {@const isNegative = m.totalCashflow < 0}
                                <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors {m.isHistorical ? '' : (service.forecastScenario === 'ai_speculative' ? 'bg-purple-50/25 dark:bg-purple-950/20' : 'bg-indigo-50/20 dark:bg-indigo-950/20')}">
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
                                            <span class="px-2.5 py-0.5 rounded text-xs font-bold uppercase {m.isHistorical ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60' : (service.forecastScenario === 'ai_speculative' ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60' : 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60')}">
                                                {m.isHistorical ? 'Ist' : (service.forecastScenario === 'ai_speculative' ? 'Gemini 3.8' : 'Prognose')}
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
        </div>

        <!-- Footer -->
        <div class="pt-4 mt-2 border-t border-neutral-100 flex items-center justify-between shrink-0">
            <span class="text-xs text-neutral-400">
                OrgaFlow System-Admin: Konsolidierte Finanzplanung
            </span>
            <button
                type="button"
                onclick={close}
                class="px-5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all touch-manipulation active:scale-95"
            >
                Schließen
            </button>
        </div>
    </div>
</dialog>
