import { usePersonalFinanceService } from "$lib/services/personalFinanceService.svelte";
import { useBwaService } from "$lib/services/bwaService.svelte";
import { pb } from "$lib/services/pocketbase";
import type { UnifiedMonthData, ForecastScenario, ForecastSummaryStats } from "./finance/forecastTypes";
import { saveForecastToStorage, loadForecastFromStorage } from "./finance/forecastStorageService";
import { fetchAiForecastSpeculation } from "./finance/forecastAiService";
import {
    computeForecastTimeline,
    calculateSummaryStats,
    calculateMonthlyContractCosts
} from "./finance/forecastTimelineCalculator";

export type { UnifiedMonthData, ForecastScenario, ForecastSummaryStats };

export function useUnifiedFinanceForecastService() {
    const personalFinance = usePersonalFinanceService();
    const bwa = useBwaService();

    let selectedYear = $state(new Date().getFullYear());
    let forecastScenario = $state<ForecastScenario>('realistic');
    let targetUserId = $state<string | undefined>(pb.authStore.model?.id);

    // KI Gemini 3.8 Spekulation State
    let isGeneratingAi = $state(false);
    let aiSpeculationData = $state<any | null>(null);
    let aiModelUsed = $state<string>('');
    let aiError = $state<string | null>(null);
    let savedAt = $state<string | null>(null);

    function saveToStorage() {
        const savedIso = saveForecastToStorage(targetUserId, selectedYear, aiSpeculationData, aiModelUsed, forecastScenario);
        if (savedIso) savedAt = savedIso;
    }

    function loadFromStorage(): boolean {
        const loaded = loadForecastFromStorage(targetUserId, selectedYear);
        if (loaded) {
            aiSpeculationData = loaded.data;
            aiModelUsed = loaded.model;
            forecastScenario = loaded.scenario;
            savedAt = loaded.savedAt;
            return true;
        }
        return false;
    }

    function setUserId(id: string | undefined) {
        targetUserId = id;
        personalFinance.setUserId(id);
        loadFromStorage();
    }

    async function init() {
        loadFromStorage();
        personalFinance.loadData();
        bwa.loadExpenses();
    }

    async function generateAiForecast(forceRefresh = false) {
        isGeneratingAi = true;
        aiError = null;
        try {
            const historicalData = timeline.filter(m => m.isHistorical).map(m => ({
                month: m.month,
                monthIndex: m.monthIndex,
                year: m.year,
                bwaRevenue: m.bwaRevenue,
                bwaExpenses: m.bwaExpenses,
                bwaProfit: m.bwaProfit,
                bwaTaxes: m.bwaTaxes,
                bwaNetAfterTaxes: m.bwaNetAfterTaxes,
                personalIncome: m.personalIncome,
                personalContracts: m.personalContracts,
                personalVariableExpenses: m.personalVariableExpenses,
                personalTotalExpenses: m.personalTotalExpenses,
                totalCashflow: m.totalCashflow
            }));

            const monthlyContractCosts = calculateMonthlyContractCosts(personalFinance.contracts);
            const payload = {
                historical_data: historicalData,
                company_info: {
                    name: "Seniorenassistenz Jenzsch",
                    region: "Halle Saale & Lutherstadt Wittenberg",
                    sector: "Ambulante Seniorenassistenz & Entlastungsleistungen (§ 45b / § 39 SGB XI)"
                },
                monthly_contract_costs: Math.round(monthlyContractCosts),
                force_refresh: forceRefresh
            };

            const result = await fetchAiForecastSpeculation(payload);
            if (result.data) {
                aiSpeculationData = result.data;
                aiModelUsed = result.model;
                forecastScenario = 'ai_speculative';
                saveToStorage();
            }
        } catch (err: any) {
            aiError = err.message || 'Fehler bei der KI-Zukunftsspekulation.';
            console.error('[AI Forecast Error]:', err);
        } finally {
            isGeneratingAi = false;
        }
    }

    let timeline = $derived.by(() => {
        return computeForecastTimeline(
            selectedYear,
            forecastScenario,
            bwa.stats.monthly,
            personalFinance.monthlyBreakdown,
            personalFinance.contracts,
            aiSpeculationData,
            { revenue: bwa.stats.totals.revenue, compExpenses: bwa.stats.totals.compExpenses }
        );
    });

    let summaryStats = $derived.by(() => {
        return calculateSummaryStats(timeline);
    });

    return {
        get selectedYear() { return selectedYear; }, 
        set selectedYear(v) { 
            selectedYear = v; 
            loadFromStorage();
        },
        get forecastScenario() { return forecastScenario; },
        set forecastScenario(v) { forecastScenario = v; },
        get targetUserId() { return targetUserId; },
        get timeline() { return timeline; },
        get summaryStats() { return summaryStats; },
        get personalFinance() { return personalFinance; },
        get bwa() { return bwa; },
        get isGeneratingAi() { return isGeneratingAi; },
        get aiSpeculationData() { return aiSpeculationData; },
        get aiModelUsed() { return aiModelUsed; },
        get aiError() { return aiError; },
        get savedAt() { return savedAt; },
        get savedAtFormatted() {
            if (!savedAt) return '';
            const d = new Date(savedAt);
            return `${d.toLocaleDateString('de-DE')} um ${d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr`;
        },
        generateAiForecast,
        saveToStorage,
        loadFromStorage,
        setUserId,
        init
    };
}
