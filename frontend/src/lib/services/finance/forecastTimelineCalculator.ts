import { calculateTaxEstimate } from "$lib/services/bwaService.svelte";
import type { UnifiedMonthData, ForecastScenario, ForecastSummaryStats } from "./forecastTypes";

export function calculateMonthlyContractCosts(contracts: any[]): number {
    let monthlyContractCosts = 0;
    (contracts || []).forEach(c => {
        const amt = Number(c.amount) || 0;
        if (c.interval === 'monthly') monthlyContractCosts += amt;
        else if (c.interval === 'quarterly') monthlyContractCosts += amt / 3;
        else if (c.interval === 'yearly') monthlyContractCosts += amt / 12;
    });
    return monthlyContractCosts;
}

export function computeForecastTimeline(
    selectedYear: number,
    forecastScenario: ForecastScenario,
    bwaMonths: any[],
    personalMonths: any[],
    contracts: any[],
    aiSpeculationData: any,
    fallbackBwaTotals?: { revenue: number; compExpenses: number }
): UnifiedMonthData[] {
    const scenarioMultiplier = forecastScenario === 'optimistic' ? 1.15 : (forecastScenario === 'pessimistic' ? 0.85 : 1.0);
    const result: UnifiedMonthData[] = [];
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    let sumBwaRev = 0;
    let sumBwaExp = 0;
    let countRealMonths = 0;
    let sumPersonalInc = 0;
    let sumPersonalVarExp = 0;

    const monthlyContractCosts = calculateMonthlyContractCosts(contracts);
    const maxMonthIdx = selectedYear < currentYear ? 11 : (selectedYear === currentYear ? currentMonth : -1);
    let runningCumulative = 0;

    // 1. Historische / aktuelle Monate des Jahres
    for (let i = 0; i <= maxMonthIdx; i++) {
        const d = new Date(selectedYear, i, 1);
        const bM = bwaMonths[i] || { revenue: 0, appExpenses: 0, compExpenses: 0, umsatzsteuer: 0, vorsteuer: 0 };
        const pM = personalMonths[i] || { income: 0, expense: 0, contractExpenses: 0, variableExpenses: 0, personalIncome: 0 };

        const bwaRev = bM.revenue || 0;
        const bwaExp = (bM.appExpenses || 0) + (bM.compExpenses || 0);
        const bwaProfit = bwaRev - bwaExp;

        const taxEst = calculateTaxEstimate(bwaProfit, 'monthly', bM.umsatzsteuer || 0, bM.vorsteuer || 0, 0);
        const bwaTaxes = Math.max(0, taxEst.totalTaxes + Math.max(0, taxEst.ustZahllast));
        const bwaNet = bwaProfit - bwaTaxes;

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

    // 2. Rollierende 12-Monats-Zukunftsprognose
    const avgBwaRev = countRealMonths > 0 ? (sumBwaRev / countRealMonths) : (fallbackBwaTotals?.revenue ? fallbackBwaTotals.revenue / 12 : 5000);
    const avgBwaExp = countRealMonths > 0 ? (sumBwaExp / countRealMonths) : (fallbackBwaTotals?.compExpenses ? fallbackBwaTotals.compExpenses / 12 : 1000);
    const avgPersonalInc = countRealMonths > 0 ? (sumPersonalInc / countRealMonths) : 0;
    const avgPersonalVarExp = countRealMonths > 0 ? (sumPersonalVarExp / countRealMonths) : 1200;

    const startForecastOffset = maxMonthIdx + 1;
    const countForecast = 12;

    for (let j = 0; j < countForecast; j++) {
        const absMonth = startForecastOffset + j;
        const forecastMonthIndex = absMonth % 12;
        const forecastYear = selectedYear + Math.floor(absMonth / 12);
        const d = new Date(forecastYear, forecastMonthIndex, 1);

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
}

export function calculateSummaryStats(timeline: UnifiedMonthData[]): ForecastSummaryStats {
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
}
