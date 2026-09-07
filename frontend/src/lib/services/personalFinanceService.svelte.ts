import { pb } from '$lib/services/pocketbase';
import { toastStore } from '$lib/services/toastService.svelte';
import { logAuditEvent } from '$lib/services/auditService';

export function usePersonalFinanceService() {
    let transactions = $state<any[]>([]);
    let contracts = $state<any[]>([]);
    let accountingData = $state<any[]>([]);
    let isLoading = $state(false);
    let error = $state<string | null>(null);
    let activeUserId = $state<string | undefined>(pb.authStore.model?.id);

    // Filter-Zustände für Zeitraumsteuerung
    let selectedYear = $state(new Date().getFullYear());
    let selectedMonth = $state(new Date().getMonth() + 1);
    let selectedQuarter = $state(Math.ceil((new Date().getMonth() + 1) / 3));
    let viewMode = $state<'monthly' | 'quarterly' | 'yearly'>('monthly');

    function setUserId(id: string | undefined) {
        activeUserId = id;
        if (id) loadData();
    }

    async function loadData() {
        if (!activeUserId) return;
        isLoading = true;
        error = null;
        try {
            const [transRes, contRes, accRes] = await Promise.all([
                pb.collection('personal_transactions').getFullList({ filter: `user = "${activeUserId}"`, sort: '-date', requestKey: null }).catch(err => {
                    if (err?.isAbort) return [];
                    throw err;
                }),
                pb.collection('personal_contracts').getFullList({ filter: `user = "${activeUserId}"`, sort: 'title', requestKey: null }).catch(err => {
                    if (err?.isAbort) return [];
                    throw err;
                }),
                pb.collection('accounting').getFullList({ filter: `createdby = "${activeUserId}"`, sort: '-transaction_date', requestKey: null }).catch(() => [])
            ]);
            transactions = transRes;
            contracts = contRes;
            accountingData = accRes;
        } catch (e: any) {
            if (e?.isAbort) return; // Silent return on abort
            error = "Fehler beim Laden der Finanzdaten. Existieren die Tabellen 'personal_transactions' und 'personal_contracts'?";
            console.error(error, e);
            transactions = [];
            contracts = [];
            accountingData = [];
        } finally {
            isLoading = false;
        }
    }

    async function addTransaction(payload: FormData) {
        if (!activeUserId) return;
        payload.append('user', activeUserId);
        const record = await pb.collection('personal_transactions').create(payload);
        await logAuditEvent({
            action: 'CREATE_PERSONAL_TRANSACTION',
            route: '/finances',
            details: { id: record.id, title: payload.get('title'), amount: payload.get('amount'), type: payload.get('type') }
        });
        await loadData();
    }

    async function updateTransaction(id: string, payload: FormData) {
        await pb.collection('personal_transactions').update(id, payload);
        await logAuditEvent({
            action: 'UPDATE_PERSONAL_TRANSACTION',
            route: '/finances',
            details: { id, title: payload.get('title'), amount: payload.get('amount') }
        });
        await loadData();
    }

    async function deleteTransaction(id: string) {
        const existing = transactions.find(t => t.id === id);
        await pb.collection('personal_transactions').delete(id);
        await logAuditEvent({
            action: 'DELETE_PERSONAL_TRANSACTION',
            route: '/finances',
            details: { id, title: existing?.title, amount: existing?.amount }
        });
        await loadData();
    }

    async function stornoTransaction(id: string, reason = "Stornierung durch Benutzer") {
        try {
            const existing = transactions.find(t => t.id === id);
            await pb.collection('personal_transactions').update(id, {
                status: 'storniert',
                is_storno: true,
                storno_reason: reason
            });
            await logAuditEvent({
                action: 'STORNO_PERSONAL_TRANSACTION',
                route: '/finances',
                details: { transactionId: id, title: existing?.title, amount: existing?.amount, reason }
            });
            toastStore.success("Buchung wurde GoBD-konform storniert.");
            await loadData();
        } catch (err: any) {
            console.error("Fehler beim Stornieren:", err);
            toastStore.error(err.message || "Stornierung fehlgeschlagen.");
        }
    }
    
    async function addContract(payload: FormData) {
        if (!activeUserId) return;
        payload.append('user', activeUserId);
        await pb.collection('personal_contracts').create(payload);
        await loadData();
    }

    async function updateContract(id: string, payload: FormData) {
        await pb.collection('personal_contracts').update(id, payload);
        await loadData();
    }

    async function deleteContract(id: string) {
        await pb.collection('personal_contracts').delete(id);
        await loadData();
    }

    async function bookDueContracts() {
        if (!activeUserId) return;
        const today = new Date();
        today.setHours(23, 59, 59, 999); // Ende des heutigen Tages

        const dueContracts = contracts.filter(c => c.next_due_date && new Date(c.next_due_date) <= today);

        if (dueContracts.length === 0) {
            toastStore.info("Keine fälligen Verträge für die automatische Buchung gefunden.");
            return;
        }

        isLoading = true;
        try {
            for (const contract of dueContracts) {
                const transactionPayload = new FormData();
                transactionPayload.append('user', activeUserId);
                transactionPayload.append('title', `Vertrag: ${contract.title}`);
                transactionPayload.append('amount', contract.amount);
                transactionPayload.append('type', contract.type || 'expense');
                transactionPayload.append('category', 'Vertrag');
                transactionPayload.append('date', new Date(contract.next_due_date).toISOString());

                await pb.collection('personal_transactions').create(transactionPayload);

                const currentDueDate = new Date(contract.next_due_date);
                let nextDueDate: Date;
                if (contract.interval === 'monthly') nextDueDate = new Date(currentDueDate.setMonth(currentDueDate.getMonth() + 1));
                else if (contract.interval === 'quarterly') nextDueDate = new Date(currentDueDate.setMonth(currentDueDate.getMonth() + 3));
                else nextDueDate = new Date(currentDueDate.setFullYear(currentDueDate.getFullYear() + 1));
                await pb.collection('personal_contracts').update(contract.id, { next_due_date: nextDueDate.toISOString() });
            }
            toastStore.success(`${dueContracts.length} Vertragsposten wurden automatisch gebucht.`);
            await loadData();
        } catch (e) { console.error("Fehler beim Buchen der Verträge:", e); toastStore.error("Fehler beim Buchen der Verträge."); } finally { isLoading = false; }
    }

    // Verfügbare Jahre ermitteln
    let availableYears = $derived.by(() => {
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
    });

    // 12 Monate des aktuell gewählten Jahres berechnen
    let monthlyBreakdown = $derived.by(() => {
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

        // Persönliche Transaktionen zuordnen
        transactions.forEach(t => {
            if (!t.date) return;
            const d = new Date(t.date);
            if (d.getFullYear() !== selectedYear) return;
            const mIdx = d.getMonth();
            const amt = Number(t.amount) || 0;
            const cat = t.category || 'Sonstiges';
            const isStorno = !!t.is_storno || t.status === 'storniert';

            // Stornierte Buchungen werden rechnerisch neutralisiert (GoBD-konform)
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

        // Geschäftliche Buchhaltung zuordnen (falls vorhanden)
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

        // Saldo berechnen
        months.forEach(m => {
            m.balance = m.income - m.expense;
            m.transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        });

        return months;
    });

    // Statistik für die aktuell gewählte Periode (Monat / Quartal / Jahr)
    let periodStats = $derived.by(() => {
        let income = 0;
        let expense = 0;
        let contractExpenses = 0;
        let variableExpenses = 0;
        let categories: Record<string, number> = {};
        let periodTransactions: any[] = [];

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

        // Vorperiode ermitteln für Vergleich
        let prevIncome = 0;
        let prevExpense = 0;
        let hasPrev = false;

        if (viewMode === 'monthly') {
            if (selectedMonth > 1) {
                const pm = monthlyBreakdown[selectedMonth - 2];
                if (pm) { prevIncome = pm.income; prevExpense = pm.expense; hasPrev = true; }
            }
        } else if (viewMode === 'quarterly') {
            if (selectedQuarter > 1) {
                const pStart = (selectedQuarter - 2) * 3;
                monthlyBreakdown.slice(pStart, pStart + 3).forEach(pm => {
                    prevIncome += pm.income; prevExpense += pm.expense;
                });
                hasPrev = true;
            }
        }

        // Monatliche Fixkosten aus aktiven Verträgen berechnen
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
                if (t.source === 'accounting' || t.is_invoice) {
                    invoiceIncome += a;
                } else {
                    personalIncome += a;
                }
            } else {
                if (t.source === 'accounting') {
                    businessExpense += a;
                } else {
                    personalExpense += a;
                }
            }
        });

        return {
            income,
            expense,
            balance,
            savingsRate,
            contractExpenses,
            variableExpenses,
            invoiceIncome,
            personalIncome,
            businessExpense,
            personalExpense,
            categories,
            transactions: periodTransactions,
            prevIncome,
            prevExpense,
            prevBalance: prevIncome - prevExpense,
            hasPrev,
            totalMonthlyContracts
        };
    });

    // Zeitstrahl für Finanzprognose: Reale Monate des Jahres + 12 Monate Zukunfts-Prognose
    let timelineStats = $derived.by(() => {
        const timeline = [];
        const now = new Date();
        const currentRealYear = now.getFullYear();
        const currentRealMonth = now.getMonth(); // 0..11

        // Vertragskosten pro Monat für Prognose (nur aktive Verträge)
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

        // Historischer Durchschnittsumsatz der Monate mit Einnahmen
        const monthsWithIncome = monthlyBreakdown.filter(m => m.income > 0);
        const avgIncome = monthsWithIncome.length > 0 
            ? monthsWithIncome.reduce((sum, m) => sum + m.income, 0) / monthsWithIncome.length 
            : 0;

        const monthsWithVarExp = monthlyBreakdown.filter(m => m.variableExpenses > 0);
        const avgVarExp = monthsWithVarExp.length > 0
            ? monthsWithVarExp.reduce((sum, m) => sum + m.variableExpenses, 0) / monthsWithVarExp.length
            : 0;

        // 1. Reale Monate des gewählten Jahres bis zum aktuellen Monat
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

        // 2. Prognosemonate für die nächsten 12 Zukunftsmonate anschließen
        const startOffset = selectedYear === currentRealYear ? currentRealMonth + 1 : (selectedYear > currentRealYear ? 0 : 12);
        const countForecast = 12;

        for (let i = 0; i < countForecast; i++) {
            const absMonth = startOffset + i;
            const forecastMonthIndex = absMonth % 12;
            const forecastYear = selectedYear + Math.floor(absMonth / 12);
            const d = new Date(forecastYear, forecastMonthIndex, 1);
            const monthName = d.toLocaleString('de-DE', { month: 'long', year: 'numeric' });
            const monthShort = d.toLocaleString('de-DE', { month: 'short' });

            let projectedFixed = recurringMonthly;
            if ((forecastMonthIndex + 1) % 3 === 1) projectedFixed += recurringQuarterly;
            if (forecastMonthIndex === 0) projectedFixed += recurringYearly;

            const projectedExpenses = projectedFixed + avgVarExp;
            const projectedIncome = avgIncome;
            const projectedBalance = projectedIncome - projectedExpenses;

            timeline.push({
                month: monthName,
                monthShort: monthShort,
                monthIndex: forecastMonthIndex,
                year: forecastYear,
                income: projectedIncome,
                expenses: projectedExpenses,
                balance: projectedBalance,
                contractExpenses: projectedFixed,
                variableExpenses: avgVarExp,
                isHistorical: false
            });
        }

        return timeline;
    });

    // Rückwärtskompatible stats
    let stats = $derived.by(() => {
        return {
            totalIncome: periodStats.income,
            totalExpense: periodStats.expense,
            balance: periodStats.balance,
            monthlyIncome: periodStats.income,
            monthlyExpense: periodStats.expense,
            monthlyBalance: periodStats.balance,
            upcomingExpenses: periodStats.totalMonthlyContracts
        };
    });

    // Rückwärtskompatibles forecast
    let forecast = $derived.by(() => {
        let runningBalance = periodStats.balance;
        return timelineStats.filter(t => !t.isHistorical).map(t => {
            runningBalance += t.balance;
            return {
                name: `${t.monthShort} ${String(t.year).slice(2)}`,
                net: t.balance,
                projectedBalance: runningBalance
            };
        });
    });

    return {
        get transactions() { return transactions; },
        get contracts() { return contracts; },
        get accountingData() { return accountingData; },
        get isLoading() { return isLoading; },
        get error() { return error; },
        get activeUserId() { return activeUserId; },
        setUserId,
        loadData,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        stornoTransaction,
        addContract,
        updateContract,
        deleteContract,
        bookDueContracts,
        // Neue Zeitraum- und Prognose-Features
        get selectedYear() { return selectedYear; }, set selectedYear(v) { selectedYear = v; },
        get selectedMonth() { return selectedMonth; }, set selectedMonth(v) { selectedMonth = v; },
        get selectedQuarter() { return selectedQuarter; }, set selectedQuarter(v) { selectedQuarter = v; },
        get viewMode() { return viewMode; }, set viewMode(v) { viewMode = v; },
        get availableYears() { return availableYears; },
        get monthlyBreakdown() { return monthlyBreakdown; },
        get periodStats() { return periodStats; },
        get timelineStats() { return timelineStats; },
        // Legacy Aliases
        get stats() { return stats; },
        get forecast() { return forecast; }
    };
}