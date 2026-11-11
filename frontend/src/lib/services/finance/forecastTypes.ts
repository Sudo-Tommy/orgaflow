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

export type ForecastScenario = 'realistic' | 'optimistic' | 'pessimistic' | 'ai_speculative';

export interface ForecastSummaryStats {
    totalRev: number;
    totalBwaExp: number;
    totalProfit: number;
    totalTaxes: number;
    totalBwaNet: number;
    totalPersonalInc: number;
    totalPersonalExp: number;
    totalCashflow: number;
    avgMonthlyCashflow: number;
    savingsRate: number;
    finalCumulativeBalance: number;
}
