import { calculateTaxEstimate } from "$lib/services/bwaService.svelte";

export function formatCurrency(val: number): string {
    return (val || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
}

export function formatBarAmount(val: number): string {
    if (Math.abs(val) >= 10000) {
        return (val / 1000).toFixed(1).replace('.', ',') + 'k';
    } else if (Math.abs(val) >= 1000) {
        return (val / 1000).toFixed(1).replace('.', ',') + 'k';
    } else {
        return Math.round(val) + ' €';
    }
}

export function calculateVatRatios(bwa: any): { ustRate: number; vstRate: number } {
    const rev = bwa?.stats?.totals?.revenue || 0;
    const ust = bwa?.stats?.totals?.umsatzsteuer || 0;
    const exp = bwa?.stats?.totals?.compExpenses || 0;
    const vst = bwa?.stats?.totals?.vorsteuer || 0;

    const ustRate = rev > 0 ? (ust / rev) : 0.19;
    const vstRate = exp > 0 ? (vst / exp) : 0.19;

    return { ustRate, vstRate };
}

export function buildTaxTimeline(
    bwa: any,
    taxScenario: 'realistic' | 'pessimistic' | 'optimistic',
    taxFilter: 'all' | 'ertrag' | 'ust',
    vatRatios: { ustRate: number; vstRate: number }
): any[] {
    if (!bwa?.forecastStats) return [];
    const mult = taxScenario === 'optimistic' ? 1.15 : (taxScenario === 'pessimistic' ? 0.85 : 1);

    return bwa.forecastStats.map((m: any) => {
        const rev = m.isHistorical ? m.revenue : (m.revenue * mult);
        const exp = m.expenses;
        const profit = rev - exp;

        let ust = 0;
        let vst = 0;

        if (m.isHistorical) {
            const histM = bwa.stats?.monthly?.[m.monthIndex];
            ust = histM?.umsatzsteuer || 0;
            vst = histM?.vorsteuer || 0;
        } else {
            ust = rev * vatRatios.ustRate;
            vst = exp * vatRatios.vstRate;
        }

        const tax = calculateTaxEstimate(profit, 'monthly', ust, vst, 0);

        let barVal = 0;
        if (taxFilter === 'all') {
            barVal = tax.gesamteAbgaben;
        } else if (taxFilter === 'ertrag') {
            barVal = tax.ertragsteuern;
        } else {
            barVal = Math.max(0, tax.ustZahllast);
        }

        return {
            ...m,
            rev,
            exp,
            profit,
            tax,
            barVal
        };
    });
}

export function buildForecastSummary(taxTimeline: any[]): {
    totalTax12M: number;
    avgMonthlyTax: number;
    totalErtrag12M: number;
    totalUst12M: number;
    avgEffectiveRate: number;
} {
    const futureMonths = taxTimeline.filter((t: any) => !t.isHistorical);
    if (futureMonths.length === 0) {
        return {
            totalTax12M: 0,
            avgMonthlyTax: 0,
            totalErtrag12M: 0,
            totalUst12M: 0,
            avgEffectiveRate: 0
        };
    }

    const totalTax12M = futureMonths.reduce((sum: number, m: any) => sum + m.tax.gesamteAbgaben, 0);
    const totalErtrag12M = futureMonths.reduce((sum: number, m: any) => sum + m.tax.ertragsteuern, 0);
    const totalUst12M = futureMonths.reduce((sum: number, m: any) => sum + Math.max(0, m.tax.ustZahllast), 0);
    const totalProfit12M = futureMonths.reduce((sum: number, m: any) => sum + Math.max(0, m.profit), 0);

    const avgMonthlyTax = totalTax12M / futureMonths.length;
    const avgEffectiveRate = totalProfit12M > 0 ? (totalErtrag12M / totalProfit12M) * 100 : 0;

    return {
        totalTax12M,
        avgMonthlyTax,
        totalErtrag12M,
        totalUst12M,
        avgEffectiveRate
    };
}
