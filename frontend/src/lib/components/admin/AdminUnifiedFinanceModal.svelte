<script lang="ts">
    import { useUnifiedFinanceForecastService } from "$lib/services/unifiedFinanceForecastService.svelte";
    import { pb } from "$lib/services/pocketbase";
    import { exportFinanceCsv } from "./finance/financeFormatUtils";
    import FinanceKpiCards from "./finance/FinanceKpiCards.svelte";
    import FinanceAiStrategyCard from "./finance/FinanceAiStrategyCard.svelte";
    import FinanceCashflowChart from "./finance/FinanceCashflowChart.svelte";
    import FinanceConsolidationTable from "./finance/FinanceConsolidationTable.svelte";

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

        if (autoGenerate && !service.aiSpeculationData && !service.isGeneratingAi) {
            service.generateAiForecast(false);
        }
    }

    export function close() {
        dialog?.close();
    }

    function handleCsvExport() {
        exportFinanceCsv(service.timeline, service.selectedYear, service.forecastScenario);
    }
</script>

<dialog 
    bind:this={dialog} 
    class="zero-inner-scroll-modal p-0 bg-transparent backdrop:bg-black/60 backdrop:backdrop-blur-sm w-full max-w-3xl mx-auto my-auto rounded-3xl print:hidden shadow-2xl" 
    onclick={(e) => { if (e.target === dialog) close(); }}
>
    <div class="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 w-full h-auto flex flex-col relative shadow-2xl border border-neutral-100 dark:border-slate-800">
        <!-- Header -->
        <div class="flex flex-col md:flex-row md:items-center justify-between mb-4 shrink-0 pr-12 gap-3 border-b border-neutral-100 dark:border-slate-800 pb-3.5">
            <div>
                <div class="flex items-center gap-2 sm:gap-3">
                    <span class="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-indigo-500/20 shadow-md text-xl shrink-0">
                        🔮
                    </span> 
                    <div>
                        <h2 class="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white tracking-tight flex items-center gap-2">
                            <span>Gesamt-Finanzprognose</span>
                            <span class="text-xs font-bold px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                BWA + Haushaltsbuch
                            </span>
                        </h2>
                        <div class="flex flex-wrap items-center gap-2 mt-0.5">
                            <p class="text-xs sm:text-sm text-neutral-500 dark:text-slate-400">
                                Konsolidierte Gegenüberstellung: Betriebsgewinn, Steuern und private Lebenshaltung im 12M-Verlauf.
                            </p>
                            {#if service.savedAtFormatted}
                                <span class="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-2xs" title="Prognose ist dauerhaft gespeichert">
                                    <span>💾</span>
                                    <span>Gespeichert ({service.savedAtFormatted})</span>
                                </span>
                            {/if}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Controls: Szenario, AI & CSV -->
            <div class="flex flex-wrap items-center gap-2 self-start md:self-auto">
                <!-- Szenario-Schalter -->
                <div class="flex bg-neutral-100 dark:bg-slate-800 p-1 rounded-xl border border-neutral-200/70 dark:border-slate-700 shadow-inner">
                    <button 
                        type="button"
                        onclick={() => service.forecastScenario = 'pessimistic'} 
                        class="px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer min-h-[36px] touch-manipulation {service.forecastScenario === 'pessimistic' ? 'bg-white dark:bg-slate-700 shadow-sm text-purple-600 dark:text-purple-300' : 'text-neutral-500 dark:text-slate-400 hover:text-neutral-700 dark:hover:text-white'}"
                        title="Pessimistisch (-15% BWA-Umsatz)"
                    >
                        📉 -15%
                    </button>
                    <button 
                        type="button"
                        onclick={() => service.forecastScenario = 'realistic'} 
                        class="px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer min-h-[36px] touch-manipulation {service.forecastScenario === 'realistic' ? 'bg-white dark:bg-slate-700 shadow-sm text-purple-600 dark:text-purple-300' : 'text-neutral-500 dark:text-slate-400 hover:text-neutral-700 dark:hover:text-white'}"
                        title="Realistisch (100%)"
                    >
                        ⚖️ Real
                    </button>
                    <button 
                        type="button"
                        onclick={() => service.forecastScenario = 'optimistic'} 
                        class="px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer min-h-[36px] touch-manipulation {service.forecastScenario === 'optimistic' ? 'bg-white dark:bg-slate-700 shadow-sm text-purple-600 dark:text-purple-300' : 'text-neutral-500 dark:text-slate-400 hover:text-neutral-700 dark:hover:text-white'}"
                        title="Optimistisch (+15% BWA-Umsatz)"
                    >
                        📈 +15%
                    </button>
                    <button 
                        type="button"
                        onclick={() => service.forecastScenario = 'ai_speculative'} 
                        disabled={!service.aiSpeculationData}
                        class="px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer min-h-[36px] touch-manipulation {service.forecastScenario === 'ai_speculative' ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm' : 'text-purple-700 dark:text-purple-300 hover:text-purple-900 dark:hover:text-white disabled:opacity-40'}"
                        title={service.aiSpeculationData ? 'Gemini 3.8 Flash KI-Spekulation aktiv' : 'Zuerst per KI berechnen'}
                    >
                        ✨ Gemini 3.8
                    </button>
                </div>

                <!-- Gemini Auslöser -->
                <button
                    type="button"
                    onclick={() => service.generateAiForecast(false)}
                    disabled={service.isGeneratingAi}
                    class="orga-button-primary py-2 px-3 text-xs bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-sm flex items-center gap-1.5 transition-all disabled:opacity-60 cursor-pointer min-h-[44px] touch-manipulation"
                    title="Berechne Zukunftsspekulation mit Gemini 3.8 Flash"
                >
                    {#if service.isGeneratingAi}
                        <span class="animate-spin text-xs">⏳</span>
                        <span>Gemini rechnet...</span>
                    {:else}
                        <span>✨</span>
                        <span>{service.aiSpeculationData ? 'Mit KI aktualisieren' : 'Mit KI berechnen'}</span>
                    {/if}
                </button>

                <!-- CSV Button -->
                <button
                    type="button"
                    onclick={handleCsvExport}
                    class="orga-button-ghost py-2 px-3 text-xs shadow-xs bg-white dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 text-neutral-700 dark:text-slate-200 font-bold rounded-xl hover:bg-neutral-50 dark:hover:bg-slate-700 flex items-center gap-1.5 cursor-pointer min-h-[44px] touch-manipulation"
                    title="Prognose als CSV herunterladen"
                >
                    <span>📥</span> CSV
                </button>
            </div>
        </div>

        {#if service.aiError}
            <div class="mb-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 p-3 rounded-xl flex items-center justify-between text-xs text-rose-800 dark:text-rose-300 font-medium shrink-0 animate-enter">
                <div class="flex items-center gap-2">
                    <span class="text-base">⚠️</span>
                    <span>{service.aiError}</span>
                </div>
                <button type="button" onclick={() => service.generateAiForecast(true)} class="text-rose-900 dark:text-rose-200 font-bold underline hover:no-underline cursor-pointer">Erneut versuchen</button>
            </div>
        {/if}

        <!-- Close Button -->
        <button 
            type="button"
            aria-label="Schließen" 
            onclick={close} 
            class="absolute top-4 right-4 sm:top-6 sm:right-6 w-11 h-11 min-w-[44px] min-h-[44px] bg-neutral-100 dark:bg-slate-800 hover:bg-neutral-200 dark:hover:bg-slate-700 text-neutral-600 dark:text-slate-300 rounded-full flex items-center justify-center transition-colors touch-manipulation cursor-pointer active:scale-90"
        >
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <!-- KPI Cards Summary -->
        <FinanceKpiCards summaryStats={service.summaryStats} />

        <!-- Gemini 3.8 Flash Strategische Spekulationsanalyse -->
        {#if service.aiSpeculationData?.strategic_analysis}
            <FinanceAiStrategyCard strat={service.aiSpeculationData.strategic_analysis} />
        {/if}

        <!-- Scrollable Content: Chart & Table -->
        <div class="flex-1 overflow-y-auto custom-scrollbar space-y-5 pr-1">
            <FinanceCashflowChart timeline={service.timeline} />
            <FinanceConsolidationTable timeline={service.timeline} forecastScenario={service.forecastScenario} />
        </div>

        <!-- Footer -->
        <div class="pt-4 mt-2 border-t border-neutral-100 dark:border-slate-800 flex items-center justify-between shrink-0">
            <span class="text-xs text-neutral-400 dark:text-slate-500">
                OrgaFlow System-Admin: Konsolidierte Finanzplanung
            </span>
            <button
                type="button"
                onclick={close}
                class="px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all touch-manipulation cursor-pointer active:scale-95 min-h-[44px]"
            >
                Schließen
            </button>
        </div>
    </div>
</dialog>
