import {
    getInstallmentProgress,
    CONTRACT_INTERVAL_METADATA
} from '$lib/types/budget';
import type { BudgetEntry, Contract, BudgetTotals } from '$lib/types/budget';

export function calculateBudgetTotals(
    entries: BudgetEntry[],
    contracts: Contract[],
    arrearsExpenseEntries: BudgetEntry[],
    arrearsIncomeEntries: BudgetEntry[],
    matchesTimeFilter: (dateStr?: string | null) => boolean,
    getEffectiveDate: (entry: BudgetEntry) => string,
    getInstallmentPlanKey: (entry: BudgetEntry) => string
): BudgetTotals {
    let totalIncome = 0;
    let invoiceIncome = 0;
    let personalIncome = 0;
    let totalExpense = 0;
    let openPayables = 0;
    let openReceivables = 0;
    let invoicesCount = 0;

    const installmentPlans = new Map<string, { entry: BudgetEntry; maxRate: number }>();

    for (const entry of entries) {
        const relevantDate = getEffectiveDate(entry);
        const inPeriod = matchesTimeFilter(relevantDate);
        const val = Number(entry.amount) || 0;
        const isInv = entry.is_invoice || entry.source === 'accounting';

        if (isInv && inPeriod) invoicesCount++;

        if (inPeriod) {
            if (entry.type === 'income') {
                totalIncome += val;
                if (isInv) invoiceIncome += val;
                else personalIncome += val;
                if (entry.payment_status === 'open') openReceivables += val;
            } else {
                totalExpense += val;
                if (entry.payment_status === 'open') openPayables += val;
            }
        }

        if (entry.is_installment) {
            const planKey = getInstallmentPlanKey(entry);
            const currentRate = Number(entry.installment_current) || 1;
            const existing = installmentPlans.get(planKey);
            if (!existing || currentRate > existing.maxRate) {
                installmentPlans.set(planKey, { entry, maxRate: currentRate });
            }
        }
    }

    let installmentsCount = installmentPlans.size;
    let openInstallmentsTotal = 0;
    for (const { entry } of installmentPlans.values()) {
        const info = getInstallmentProgress(entry);
        if (!info.isFinished) openInstallmentsTotal += info.remainingAmount;
    }

    let fixedCostsMonthly = 0;
    let openFixedCostsMonthly = 0;
    for (const contract of contracts) {
        if (!contract.is_active) continue;
        const factor = CONTRACT_INTERVAL_METADATA[contract.interval]?.factorMonthly || 1;
        const monthlyValue = (Number(contract.amount) || 0) * factor;
        fixedCostsMonthly += monthlyValue;
        if (contract.payment_status === 'open') openFixedCostsMonthly += monthlyValue;
    }

    let arrearsPayables = 0;
    let arrearsReceivables = 0;
    let arrearsInstallmentsCount = 0;
    for (const e of arrearsExpenseEntries) {
        arrearsPayables += Number(e.amount) || 0;
        if (e.is_installment) arrearsInstallmentsCount++;
    }
    for (const e of arrearsIncomeEntries) {
        arrearsReceivables += Number(e.amount) || 0;
    }

    return {
        totalIncome,
        invoiceIncome,
        personalIncome,
        totalExpense,
        balance: totalIncome - totalExpense,
        openPayables,
        openReceivables,
        totalOpen: openPayables,
        fixedCostsMonthly,
        openFixedCostsMonthly,
        openInstallmentsTotal,
        installmentsCount,
        invoicesCount,
        entriesCount: entries.length,
        contractsCount: contracts.length,
        arrearsPayables,
        arrearsReceivables,
        arrearsInstallmentsCount,
        arrearsCount: arrearsExpenseEntries.length
    };
}
