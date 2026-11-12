import { pb } from "$lib/services/pocketbase";
import { orgaStore } from "$lib/stores/orgaStore.svelte";
import { getCachedCollection, setCachedCollection, queueOfflineMutation } from "$lib/services/offlineDb";
import { connectionManager } from "$lib/services/connectionManager.svelte";
import { computeBwaStats } from "./bwaCalculationHelper";
import { calculateTaxEstimate } from "./bwaTaxHelper";

export { calculateTaxEstimate };

export function useBwaService() {
    let selectedYear = $state(new Date().getFullYear());
    let selectedCompanyId = $state<string>("all");
    let companyExpenses = $state<any[]>([]);
    let isLoadingExpenses = $state(false);

    let availableYears = $derived.by(() => {
        const years = new Set<number>();
        years.add(new Date().getFullYear());
        
        (orgaStore.invoices?.data || []).forEach((inv: any) => {
            if (inv.issue_date) years.add(new Date(inv.issue_date).getFullYear());
            if (inv.due_date) years.add(new Date(inv.due_date).getFullYear());
            if (inv.paid_at) years.add(new Date(inv.paid_at).getFullYear());
        });
        (orgaStore.appointments?.data || []).forEach((app: any) => {
            if (app.appointment) years.add(new Date(app.appointment).getFullYear());
        });
        
        return Array.from(years).sort((a, b) => b - a);
    });

    async function loadExpenses() {
        isLoadingExpenses = true;
        try {
            const cached = await getCachedCollection<any>('company_expenses');
            if (cached.length > 0 && companyExpenses.length === 0) companyExpenses = cached;

            let filter = "";
            if (selectedCompanyId !== "all") {
                filter = `company = '${selectedCompanyId}'`;
            }
            const res = await pb.collection('company_expenses').getFullList({ filter, sort: '-date' });
            companyExpenses = res;
            if (selectedCompanyId === "all") await setCachedCollection('company_expenses', res);
        } catch (e) {
            console.warn('[BwaService] Could not load company_expenses:', e);
        } finally {
            isLoadingExpenses = false;
        }
    }

    async function addExpense(payload: FormData | any): Promise<'online' | 'offline'> {
        if (!connectionManager.isOnline) {
            await queueOfflineMutation('company_expenses', 'create', undefined, payload, { label: 'Betriebsausgabe' });
            return 'offline';
        }
        try {
            await pb.collection('company_expenses').create(payload);
            await loadExpenses();
            return 'online';
        } catch (err: any) {
            if (typeof navigator !== 'undefined' && (!navigator.onLine || err?.status === 0)) {
                await queueOfflineMutation('company_expenses', 'create', undefined, payload, { label: 'Betriebsausgabe' });
                return 'offline';
            }
            throw err;
        }
    }

    async function deleteExpense(id: string) {
        await pb.collection('company_expenses').delete(id);
        await loadExpenses();
    }

    let stats = $derived.by(() => {
        const getClientName = (id: string) => {
            const c = orgaStore.clients?.data?.find((cl: any) => cl.id === id);
            return c ? `${c.name_first} ${c.name_last}` : 'Unbekannt';
        };
        const getUserName = (id: string) => {
            const u = (orgaStore as any).users?.data?.find((usr: any) => usr.id === id) || { name_first: 'Team', name_last: 'Mitglied' };
            return `${u.name_first} ${u.name_last}`.trim();
        };

        return computeBwaStats(
            selectedYear,
            selectedCompanyId,
            orgaStore.invoices?.data || [],
            orgaStore.appointments?.data || [],
            companyExpenses,
            getClientName,
            getUserName
        );
    });

    let forecastStats = $derived.by(() => {
        const timeline = [];
        const now = new Date();
        const currentRealYear = now.getFullYear();
        const currentRealMonth = now.getMonth();

        let recurringMonthly = 0;
        let recurringQuarterly = 0;
        let recurringYearly = 0;
        companyExpenses.filter(e => e.is_recurring).forEach(e => {
            if (e.interval === 'monthly') recurringMonthly += e.amount;
            if (e.interval === 'quarterly') recurringQuarterly += e.amount;
            if (e.interval === 'yearly') recurringYearly += e.amount;
        });

        const monthsWithRev = stats.monthly.filter(m => m.revenue > 0);
        const avgMonthlyRev = monthsWithRev.length > 0
            ? monthsWithRev.reduce((sum, m) => sum + m.revenue, 0) / monthsWithRev.length
            : 0;

        const maxRealMonth = selectedYear === currentRealYear ? currentRealMonth : (selectedYear < currentRealYear ? 11 : -1);

        for (let i = 0; i <= maxRealMonth; i++) {
            const m = stats.monthly[i];
            if (m) {
                const totalExp = m.compExpenses + m.appExpenses;
                timeline.push({
                    month: new Date(selectedYear, i, 1).toLocaleString('de-DE', { month: 'long', year: 'numeric' }),
                    monthShort: m.month,
                    monthIndex: i,
                    year: selectedYear,
                    revenue: m.revenue,
                    revenuePaid: m.revenuePaid || 0,
                    revenueOpen: m.revenueOpen || 0,
                    expenses: totalExp,
                    profit: m.revenue - totalExp,
                    isHistorical: true,
                    isAiProjected: false
                });
            }
        }

        const startOffset = selectedYear === currentRealYear ? currentRealMonth + 1 : (selectedYear > currentRealYear ? 0 : 12);
        for (let i = 0; i < 12; i++) {
            const absMonth = startOffset + i;
            const forecastMonthIndex = absMonth % 12;
            const forecastYear = selectedYear + Math.floor(absMonth / 12);
            const d = new Date(forecastYear, forecastMonthIndex, 1);

            let projectedCompExpenses = recurringMonthly;
            if ((forecastMonthIndex + 1) % 3 === 1) projectedCompExpenses += recurringQuarterly;
            if (forecastMonthIndex === 0) projectedCompExpenses += recurringYearly;

            timeline.push({
                month: d.toLocaleString('de-DE', { month: 'long', year: 'numeric' }),
                monthShort: d.toLocaleString('de-DE', { month: 'short' }),
                monthIndex: forecastMonthIndex,
                year: forecastYear,
                revenue: avgMonthlyRev,
                revenuePaid: avgMonthlyRev,
                revenueOpen: 0,
                expenses: projectedCompExpenses,
                profit: avgMonthlyRev - projectedCompExpenses,
                isHistorical: false,
                isAiProjected: false
            });
        }

        return timeline;
    });

    return {
        get selectedYear() { return selectedYear; }, set selectedYear(v) { selectedYear = v; },
        get selectedCompanyId() { return selectedCompanyId; }, set selectedCompanyId(v) { selectedCompanyId = v; },
        get availableYears() { return availableYears; },
        get stats() { return stats; },
        get companyExpenses() { return companyExpenses; },
        get isLoadingExpenses() { return isLoadingExpenses; },
        get forecastStats() { return forecastStats; },
        get timelineStats() { return forecastStats; },
        loadExpenses,
        addExpense,
        deleteExpense
    };
}