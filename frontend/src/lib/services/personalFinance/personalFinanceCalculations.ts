import { calculateTimelineStats } from './personalFinanceTimeline';

export { calculateTimelineStats };

export function getAvailableYears(transactions: any[], accountingData: any[]): number[] {
    const years = new Set<number>();
    years.add(new Date().getFullYear());
    transactions.forEach(t => {
        if (t.date) years.add(new Date(t.date).getFullYear());
    });
    accountingData.forEach(a => {
        const d = a.transaction_date || a.created;
        if (d) years.add(new Date(d).getFullYear());
    });
    return Array.from(years).sort((a, b) => b - a);
}

export function calculateMonthlyBreakdown(selectedYear: number, transactions: any[], accountingData: any[]) {
    const months = Array.from({ length: 12 }, (_, i) => {
        const d = new Date(selectedYear, i, 1);
        return {
            monthIndex: i,
            monthName: d.toLocaleString('de-DE', { month: 'long' }),
            monthShort: d.toLocaleString('de-DE', { month: 'short' }),
            year: selectedYear,
            income: 0,
            expense: 0,
            balance: 0,
            contractExpenses: 0,
            variableExpenses: 0,
            categories: {} as Record<string, number>,
            transactions: [] as any[]
        };
    });

    transactions.forEach(t => {
        if (!t.date) return;
        const d = new Date(t.date);
        if (d.getFullYear() !== selectedYear) return;
        const mIdx = d.getMonth();
        const amt = Number(t.amount) || 0;
        const cat = t.category || 'Sonstiges';
        const isStorno = !!t.is_storno || t.status === 'storniert';

        if (!isStorno) {
            if (t.type === 'income') {
                months[mIdx].income += amt;
            } else {
                months[mIdx].expense += amt;
                if (cat.toLowerCase().includes('vertrag') || cat.toLowerCase().includes('abo') || cat.toLowerCase().includes('fix')) {
                    months[mIdx].contractExpenses += amt;
                } else {
                    months[mIdx].variableExpenses += amt;
                }
                months[mIdx].categories[cat] = (months[mIdx].categories[cat] || 0) + amt;
            }
        }
        months[mIdx].transactions.push({ ...t, source: 'personal' });
    });

    accountingData.forEach(a => {
        if (a.status === 'Storniert') return;
        const dStr = a.transaction_date || a.created;
        if (!dStr) return;
        const d = new Date(dStr);
        if (d.getFullYear() !== selectedYear) return;
        const mIdx = d.getMonth();
        const amt = Number(a.amount_gross) || Number(a.amount_net) || 0;
        const amtNet = Number(a.amount_net) || amt;
        const cat = a.category || (a.transaction_type === 'Einnahme' ? 'Kundenrechnung' : 'Geschäftlich');

        if (a.transaction_type === 'Einnahme') {
            months[mIdx].income += amt;
        } else {
            months[mIdx].expense += amt;
            months[mIdx].variableExpenses += amt;
            months[mIdx].categories[cat] = (months[mIdx].categories[cat] || 0) + amt;
        }
        months[mIdx].transactions.push({
            id: a.id,
            title: a.title || 'Rechnungseingang',
            amount: amt,
            amount_net: amtNet,
            tax_rate: a.tax_rate,
            type: a.transaction_type === 'Einnahme' ? 'income' : 'expense',
            category: cat,
            date: dStr,
            source: 'accounting',
            status: a.status || 'Bezahlt',
            payment_method: a.payment_method || 'Banküberweisung',
            notes: a.notes || '',
            is_invoice: (a.category === 'Kundenrechnung' || (a.title && a.title.toLowerCase().includes('rechnung')))
        });
    });

    months.forEach(m => {
        m.balance = m.income - m.expense;
        m.transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    });

    return months;
}

export function calculatePeriodStats(
    viewMode: 'monthly' | 'quarterly' | 'yearly',
    selectedMonth: number,
    selectedQuarter: number,
    monthlyBreakdown: any[],
    contracts: any[]
) {
    let income = 0;
    let expense = 0;
    let contractExpenses = 0;
    let variableExpenses = 0;
    const categories: Record<string, number> = {};
    const periodTransactions: any[] = [];

    let targetMonths: any[] = [];
    if (viewMode === 'monthly') {
        const m = monthlyBreakdown[selectedMonth - 1];
        if (m) targetMonths = [m];
    } else if (viewMode === 'quarterly') {
        const start = (selectedQuarter - 1) * 3;
        targetMonths = monthlyBreakdown.slice(start, start + 3);
    } else {
        targetMonths = monthlyBreakdown;
    }

    targetMonths.forEach(m => {
        income += m.income;
        expense += m.expense;
        contractExpenses += m.contractExpenses;
        variableExpenses += m.variableExpenses;
        for (const [k, v] of Object.entries(m.categories)) {
            categories[k] = (categories[k] || 0) + (v as number);
        }
        periodTransactions.push(...m.transactions);
    });

    periodTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const balance = income - expense;
    const savingsRate = income > 0 ? (balance / income) * 100 : 0;

    let prevIncome = 0;
    let prevExpense = 0;
    let hasPrev = false;

    if (viewMode === 'monthly' && selectedMonth > 1) {
        const pm = monthlyBreakdown[selectedMonth - 2];
        if (pm) { prevIncome = pm.income; prevExpense = pm.expense; hasPrev = true; }
    } else if (viewMode === 'quarterly' && selectedQuarter > 1) {
        const pStart = (selectedQuarter - 2) * 3;
        monthlyBreakdown.slice(pStart, pStart + 3).forEach(pm => {
            prevIncome += pm.income; prevExpense += pm.expense;
        });
        hasPrev = true;
    }

    let totalMonthlyContracts = 0;
    contracts.forEach(c => {
        if (c.is_active === false) return;
        const amt = Number(c.amount) || 0;
        if (c.interval === 'monthly') totalMonthlyContracts += amt;
        else if (c.interval === 'quarterly') totalMonthlyContracts += amt / 3;
        else if (c.interval === 'yearly') totalMonthlyContracts += amt / 12;
    });

    let invoiceIncome = 0;
    let personalIncome = 0;
    let businessExpense = 0;
    let personalExpense = 0;

    periodTransactions.forEach(t => {
        if (t.is_storno || t.status === 'storniert') return;
        const a = Number(t.amount) || 0;
        if (t.type === 'income') {
            if (t.source === 'accounting' || t.is_invoice) invoiceIncome += a;
            else personalIncome += a;
        } else {
            if (t.source === 'accounting') businessExpense += a;
            else personalExpense += a;
        }
    });

    return {
        income, expense, balance, savingsRate, contractExpenses, variableExpenses,
        invoiceIncome, personalIncome, businessExpense, personalExpense,
        categories, transactions: periodTransactions, prevIncome, prevExpense,
        prevBalance: prevIncome - prevExpense, hasPrev, totalMonthlyContracts
    };
}
