import { usePersonalFinanceService } from "$lib/services/personalFinanceService.svelte";
import { useBwaService, calculateTaxEstimate } from "$lib/services/bwaService.svelte";
import { pb } from "$lib/services/pocketbase";

export interface UnifiedMonthData {
    month: string;
    monthShort: string;
    monthIndex: number;
    year: number;
    isHistorical: boolean;
    // BWA
    bwaRevenue: number;
    bwaExpenses: number;
    bwaProfit: number;
    bwaTaxes: number;
    bwaNetAfterTaxes: number;
    // Haushaltsbuch (Privat)
    personalIncome: number;
    personalContracts: number;
    personalVariableExpenses: number;
    personalTotalExpenses: number;
    personalBalance: number;
    // Konsolidiertes Gesamtergebnis
    totalNetIncome: number;      // bwaNetAfterTaxes + personalIncome
    totalCashflow: number;       // totalNetIncome - personalTotalExpenses
    cumulativeBalance: number;   // Rollierender Saldo
    // KI Spekulations-Metadaten
    keyDrivers?: string;
    confidenceScore?: number;
}

export function useUnifiedFinanceForecastService() {
    const personalFinance = usePersonalFinanceService();
    const bwa = useBwaService();

    let selectedYear = $state(new Date().getFullYear());
    let forecastScenario = $state<'realistic' | 'optimistic' | 'pessimistic' | 'ai_speculative'>('realistic');
    let targetUserId = $state<string | undefined>(pb.authStore.model?.id);

    // KI Gemini 3.8 Spekulation State
    let isGeneratingAi = $state(false);
    let aiSpeculationData = $state<any | null>(null);
    let aiModelUsed = $state<string>('');
    let aiError = $state<string | null>(null);
    let savedAt = $state<string | null>(null);

    const getStorageKey = () => `orgaflow_ai_forecast_${targetUserId || pb.authStore.model?.id || 'global'}_${selectedYear}`;

    function saveToStorage() {
        if (typeof localStorage === 'undefined' || !aiSpeculationData) return;
        try {
            const nowIso = new Date().toISOString();
            savedAt = nowIso;
            const payload = {
                data: aiSpeculationData,
                model: aiModelUsed,
                scenario: forecastScenario,
                savedAt: nowIso
            };
            localStorage.setItem(getStorageKey(), JSON.stringify(payload));
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('orgaflow-forecast-saved', { detail: { year: selectedYear } }));
            }
        } catch (e) {
            console.warn('[AI Forecast] Konnte Prognose nicht im Speicher ablegen:', e);
        }
    }

    function loadFromStorage(): boolean {
        if (typeof localStorage === 'undefined') return false;
        try {
            const raw = localStorage.getItem(getStorageKey());
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && parsed.data) {
                    aiSpeculationData = parsed.data;
                    aiModelUsed = parsed.model || 'gemini-3.8-flash';
                    forecastScenario = parsed.scenario || 'ai_speculative';
                    savedAt = parsed.savedAt || null;
                    return true;
                }
            }
        } catch (e) {
            console.warn('[AI Forecast] Fehler beim Laden der gespeicherten Prognose:', e);
        }
        return false;
    }

    // Synchronisiere Ziel-Benutzer
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

    // Ruft die Zukunftsspekulation mit Gemini 3.8 Flash ab
    async function generateAiForecast(forceRefresh = false) {
        isGeneratingAi = true;
        aiError = null;
        try {
            // Reale Monatsdaten zur Analyse an Gemini übermitteln
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

            // Private Vertragskosten
            let monthlyContractCosts = 0;
            personalFinance.contracts.forEach(c => {
                const amt = Number(c.amount) || 0;
                if (c.interval === 'monthly') monthlyContractCosts += amt;
                else if (c.interval === 'quarterly') monthlyContractCosts += amt / 3;
                else if (c.interval === 'yearly') monthlyContractCosts += amt / 12;
            });

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

            // 1. Primär Microservice ansteuern (unter Berücksichtigung von Port 3000 bzw. Proxy /api/emails/...)
            const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || !window.location.hostname.includes('ihre-seniorenassistenz.com'));
            const primaryUrl = isLocal 
                ? 'http://localhost:3000/api/ai/forecast-speculation' 
                : '/api/emails/ai/forecast-speculation';

            let res: Response | null = null;
            try {
                res = await fetch(primaryUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            } catch (err) {
                console.warn(`[AI Forecast] Primärer Endpunkt ${primaryUrl} fehlgeschlagen, versuche Fallback:`, err);
            }

            // 2. Sekundär Fallback (SvelteKit Route oder alternativer Pfad)
            if (!res || !res.ok) {
                const fallbackUrl = isLocal 
                    ? '/api/emails/ai/forecast-speculation'
                    : 'https://ihre-seniorenassistenz.com/api/emails/ai/forecast-speculation';
                try {
                    res = await fetch(fallbackUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                } catch (fallbackErr) {
                    console.warn(`[AI Forecast] Fallback-Endpunkt ${fallbackUrl} ebenfalls fehlgeschlagen:`, fallbackErr);
                }
            }

            if (!res || !res.ok) {
                const errData = res ? await res.json().catch(() => ({})) : {};
                throw new Error(errData.error || (res ? `HTTP ${res.status}` : 'Netzwerkfehler'));
            }

            const jsonRes = await res.json();
            if (jsonRes.data) {
                aiSpeculationData = jsonRes.data;
                aiModelUsed = jsonRes.model || 'gemini-3.8-flash';
                forecastScenario = 'ai_speculative'; // Automatisch auf das KI-Szenario wechseln
                saveToStorage(); // Dauerhaft im Speicher sichern!
            }
        } catch (err: any) {
            aiError = err.message || 'Fehler bei der KI-Zukunftsspekulation.';
            console.error('[AI Forecast Error]:', err);
        } finally {
            isGeneratingAi = false;
        }
    }

    // Konsolidierte 12-Monats-Historie + 12-Monats-Zukunftsprognose
    let timeline = $derived.by(() => {
        const scenarioMultiplier = forecastScenario === 'optimistic' ? 1.15 : (forecastScenario === 'pessimistic' ? 0.85 : 1.0);
        const result: UnifiedMonthData[] = [];
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth(); // 0..11

        // 1. Reale BWA- und Haushaltsbuch-Monate des gewählten Jahres
        const bwaMonths = bwa.stats.monthly; // 12 Monate
        const personalMonths = personalFinance.monthlyBreakdown; // 12 Monate

        // Durchschnittliche Werte für Prognose ermitteln
        let sumBwaRev = 0;
        let sumBwaExp = 0;
        let countRealMonths = 0;

        let sumPersonalInc = 0;
        let sumPersonalVarExp = 0;

        // Monatliche Fixkosten aus Verträgen
        let monthlyContractCosts = 0;
        personalFinance.contracts.forEach(c => {
            const amt = Number(c.amount) || 0;
            if (c.interval === 'monthly') monthlyContractCosts += amt;
            else if (c.interval === 'quarterly') monthlyContractCosts += amt / 3;
            else if (c.interval === 'yearly') monthlyContractCosts += amt / 12;
        });

        // 1. Historische / aktuelle Monate des Jahres aufbauen
        const maxMonthIdx = selectedYear < currentYear ? 11 : (selectedYear === currentYear ? currentMonth : -1);

        let runningCumulative = 0;

        for (let i = 0; i <= maxMonthIdx; i++) {
            const d = new Date(selectedYear, i, 1);
            const bM = bwaMonths[i] || { revenue: 0, appExpenses: 0, compExpenses: 0, umsatzsteuer: 0, vorsteuer: 0 };
            const pM = personalMonths[i] || { income: 0, expense: 0, contractExpenses: 0, variableExpenses: 0, personalIncome: 0 };

            const bwaRev = bM.revenue || 0;
            const bwaExp = (bM.appExpenses || 0) + (bM.compExpenses || 0);
            const bwaProfit = bwaRev - bwaExp;

            // Steuerabzug berechnen
            const taxEst = calculateTaxEstimate(bwaProfit, 'monthly', bM.umsatzsteuer || 0, bM.vorsteuer || 0, 0);
            const bwaTaxes = Math.max(0, taxEst.totalTaxes + Math.max(0, taxEst.ustZahllast));
            const bwaNet = bwaProfit - bwaTaxes;

            // Persönliche Einnahmen (ohne Kundenrechnungen, falls bereits in BWA)
            const pIncome = pM.income || 0;
            const pContracts = pM.contractExpenses || monthlyContractCosts;
            const pVarExp = pM.variableExpenses || (pM.expense - pContracts);
            const pTotalExp = pM.expense || (pContracts + pVarExp);
            const pBalance = pIncome - pTotalExp;

            const totalNet = bwaNet + pIncome;
            const cashflow = totalNet - pTotalExp;
            runningCumulative += cashflow;

            if (bwaRev > 0 || bwaExp > 0 || pTotalExp > 0) {
                sumBwaRev += bwaRev;
                sumBwaExp += bwaExp;
                sumPersonalInc += pIncome;
                sumPersonalVarExp += pVarExp;
                countRealMonths++;
            }

            result.push({
                month: d.toLocaleString('de-DE', { month: 'long', year: 'numeric' }),
                monthShort: d.toLocaleString('de-DE', { month: 'short' }),
                monthIndex: i,
                year: selectedYear,
                isHistorical: true,
                bwaRevenue: bwaRev,
                bwaExpenses: bwaExp,
                bwaProfit,
                bwaTaxes,
                bwaNetAfterTaxes: bwaNet,
                personalIncome: pIncome,
                personalContracts: pContracts,
                personalVariableExpenses: pVarExp,
                personalTotalExpenses: pTotalExp,
                personalBalance: pBalance,
                totalNetIncome: totalNet,
                totalCashflow: cashflow,
                cumulativeBalance: runningCumulative
            });
        }

        // 2. Rollierende 12-Monats-Zukunftsprognose anschließen
        const avgBwaRev = countRealMonths > 0 ? (sumBwaRev / countRealMonths) : (bwa.stats.totals.revenue / 12 || 5000);
        const avgBwaExp = countRealMonths > 0 ? (sumBwaExp / countRealMonths) : (bwa.stats.totals.compExpenses / 12 || 1000);
        const avgPersonalInc = countRealMonths > 0 ? (sumPersonalInc / countRealMonths) : 0;
        const avgPersonalVarExp = countRealMonths > 0 ? (sumPersonalVarExp / countRealMonths) : 1200;

        const startForecastOffset = maxMonthIdx + 1;
        const countForecast = 12;

        for (let j = 0; j < countForecast; j++) {
            const absMonth = startForecastOffset + j;
            const forecastMonthIndex = absMonth % 12;
            const forecastYear = selectedYear + Math.floor(absMonth / 12);
            const d = new Date(forecastYear, forecastMonthIndex, 1);

            // Prüfen, ob für diesen Zukunftsmonat präzise Spekulationsdaten von Gemini 3.8 vorliegen
            const aiMonth = (forecastScenario === 'ai_speculative' && aiSpeculationData?.forecast_months) 
                ? aiSpeculationData.forecast_months[j]
                : null;

            let projBwaRev = avgBwaRev * scenarioMultiplier;
            let projBwaExp = avgBwaExp;
            let projBwaProfit = projBwaRev - projBwaExp;
            let projTaxes = 0;
            let projBwaNet = 0;
            let projPersonalInc = avgPersonalInc;
            let projContracts = monthlyContractCosts;
            let projVarExp = avgPersonalVarExp;
            let projTotalExp = projContracts + projVarExp;
            let totalNet = 0;
            let cashflow = 0;
            let keyDrivers = '';
            let confidenceScore = 85;

            if (aiMonth) {
                // Präzise Gemini 3.8 Flash Berechnungen verwenden
                projBwaRev = Number(aiMonth.bwaRevenue) || projBwaRev;
                projBwaExp = Number(aiMonth.bwaExpenses) || projBwaExp;
                projBwaProfit = Number(aiMonth.bwaProfit) || (projBwaRev - projBwaExp);
                projTaxes = Number(aiMonth.bwaTaxes) || 0;
                projBwaNet = Number(aiMonth.bwaNetAfterTaxes) || (projBwaProfit - projTaxes);
                projPersonalInc = Number(aiMonth.personalIncome) || 0;
                projContracts = Number(aiMonth.personalContracts) || monthlyContractCosts;
                projVarExp = Number(aiMonth.personalVariableExpenses) || avgPersonalVarExp;
                projTotalExp = Number(aiMonth.personalTotalExpenses) || (projContracts + projVarExp);
                totalNet = Number(aiMonth.totalNetIncome) || (projBwaNet + projPersonalInc);
                cashflow = Number(aiMonth.totalCashflow) || (totalNet - projTotalExp);
                keyDrivers = aiMonth.key_drivers || '';
                confidenceScore = Number(aiMonth.confidence_score) || 90;
            } else {
                const taxEst = calculateTaxEstimate(projBwaProfit, 'monthly', projBwaRev * 0.19, projBwaExp * 0.19, 0);
                projTaxes = Math.max(0, taxEst.totalTaxes + Math.max(0, taxEst.ustZahllast));
                projBwaNet = projBwaProfit - projTaxes;
                totalNet = projBwaNet + projPersonalInc;
                cashflow = totalNet - projTotalExp;
            }

            runningCumulative += cashflow;

            result.push({
                month: d.toLocaleString('de-DE', { month: 'long', year: 'numeric' }),
                monthShort: d.toLocaleString('de-DE', { month: 'short' }),
                monthIndex: forecastMonthIndex,
                year: forecastYear,
                isHistorical: false,
                bwaRevenue: projBwaRev,
                bwaExpenses: projBwaExp,
                bwaProfit: projBwaProfit,
                bwaTaxes: projTaxes,
                bwaNetAfterTaxes: projBwaNet,
                personalIncome: projPersonalInc,
                personalContracts: projContracts,
                personalVariableExpenses: projVarExp,
                personalTotalExpenses: projTotalExp,
                personalBalance: projPersonalInc - projTotalExp,
                totalNetIncome: totalNet,
                totalCashflow: cashflow,
                cumulativeBalance: runningCumulative,
                keyDrivers,
                confidenceScore
            });
        }

        return result;
    });

    // Aggregierte Gesamtstatistiken
    let summaryStats = $derived.by(() => {
        let totalRev = 0;
        let totalBwaExp = 0;
        let totalProfit = 0;
        let totalTaxes = 0;
        let totalBwaNet = 0;
        let totalPersonalInc = 0;
        let totalPersonalExp = 0;
        let totalCashflow = 0;

        timeline.forEach(m => {
            totalRev += m.bwaRevenue;
            totalBwaExp += m.bwaExpenses;
            totalProfit += m.bwaProfit;
            totalTaxes += m.bwaTaxes;
            totalBwaNet += m.bwaNetAfterTaxes;
            totalPersonalInc += m.personalIncome;
            totalPersonalExp += m.personalTotalExpenses;
            totalCashflow += m.totalCashflow;
        });

        const monthsCount = timeline.length || 1;
        const avgMonthlyCashflow = totalCashflow / monthsCount;
        const savingsRate = (totalBwaNet + totalPersonalInc) > 0 
            ? (totalCashflow / (totalBwaNet + totalPersonalInc)) * 100 
            : 0;

        return {
            totalRev,
            totalBwaExp,
            totalProfit,
            totalTaxes,
            totalBwaNet,
            totalPersonalInc,
            totalPersonalExp,
            totalCashflow,
            avgMonthlyCashflow,
            savingsRate,
            finalCumulativeBalance: timeline[timeline.length - 1]?.cumulativeBalance || 0
        };
    });

    return {
        get selectedYear() { return selectedYear; }, 
        set selectedYear(v) { 
            selectedYear = v; 
            loadFromStorage();
        },
        get forecastScenario() { return forecastScenario; }, set forecastScenario(v) { forecastScenario = v; },
        get targetUserId() { return targetUserId; },
        get timeline() { return timeline; },
        get summaryStats() { return summaryStats; },
        get personalFinance() { return personalFinance; },
        get bwa() { return bwa; },
        // KI Gemini 3.8 Flash Spekulation
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
