export function calculateTimelineStats(selectedYear: number, monthlyBreakdown: any[], contracts: any[]) {
    const timeline = [];
    const now = new Date();
    const currentRealYear = now.getFullYear();
    const currentRealMonth = now.getMonth();

    let recurringMonthly = 0;
    let recurringQuarterly = 0;
    let recurringYearly = 0;
    contracts.forEach(c => {
        if (c.is_active === false) return;
        const amt = Number(c.amount) || 0;
        if (c.type === 'expense' || !c.type) {
            if (c.interval === 'monthly') recurringMonthly += amt;
            else if (c.interval === 'quarterly') recurringQuarterly += amt;
            else if (c.interval === 'yearly') recurringYearly += amt;
        }
    });

    const monthsWithIncome = monthlyBreakdown.filter(m => m.income > 0);
    const avgIncome = monthsWithIncome.length > 0
        ? monthsWithIncome.reduce((sum, m) => sum + m.income, 0) / monthsWithIncome.length
        : 0;

    const monthsWithVarExp = monthlyBreakdown.filter(m => m.variableExpenses > 0);
    const avgVarExp = monthsWithVarExp.length > 0
        ? monthsWithVarExp.reduce((sum, m) => sum + m.variableExpenses, 0) / monthsWithVarExp.length
        : 0;

    const maxRealMonth = selectedYear === currentRealYear ? currentRealMonth : (selectedYear < currentRealYear ? 11 : -1);

    for (let i = 0; i <= maxRealMonth; i++) {
        const m = monthlyBreakdown[i];
        if (m) {
            timeline.push({
                month: new Date(selectedYear, i, 1).toLocaleString('de-DE', { month: 'long', year: 'numeric' }),
                monthShort: m.monthShort,
                monthIndex: i,
                year: selectedYear,
                income: m.income,
                expenses: m.expense,
                balance: m.balance,
                contractExpenses: m.contractExpenses,
                variableExpenses: m.variableExpenses,
                isHistorical: true
            });
        }
    }

    const startOffset = selectedYear === currentRealYear ? currentRealMonth + 1 : (selectedYear > currentRealYear ? 0 : 12);
    for (let i = 0; i < 12; i++) {
        const absMonth = startOffset + i;
        const forecastMonthIndex = absMonth % 12;
        const forecastYear = selectedYear + Math.floor(absMonth / 12);
        const d = new Date(forecastYear, forecastMonthIndex, 1);

        let projectedFixed = recurringMonthly;
        if ((forecastMonthIndex + 1) % 3 === 1) projectedFixed += recurringQuarterly;
        if (forecastMonthIndex === 0) projectedFixed += recurringYearly;

        const projectedExpenses = projectedFixed + avgVarExp;
        const projectedIncome = avgIncome;

        timeline.push({
            month: d.toLocaleString('de-DE', { month: 'long', year: 'numeric' }),
            monthShort: d.toLocaleString('de-DE', { month: 'short' }),
            monthIndex: forecastMonthIndex,
            year: forecastYear,
            income: projectedIncome,
            expenses: projectedExpenses,
            balance: projectedIncome - projectedExpenses,
            contractExpenses: projectedFixed,
            variableExpenses: avgVarExp,
            isHistorical: false
        });
    }

    return timeline;
}
