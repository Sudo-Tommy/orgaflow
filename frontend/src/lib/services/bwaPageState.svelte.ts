import { orgaStore } from "$lib/stores/orgaStore.svelte";
import { calculateTaxEstimate, type useBwaService } from "$lib/services/bwaService.svelte";
import { toastStore } from "$lib/services/toastService.svelte";
import { calculateVmaLumpSums, mapToBWA, type BWAData } from "./bwaCalculationHelpers";

export type { BWAData };

export function useBwaPageState(bwa: ReturnType<typeof useBwaService>) {
    let viewMode = $state<'monthly' | 'quarterly' | 'yearly'>('monthly');
    let selectedMonth = $state(new Date().getMonth() + 1);
    let selectedQuarter = $state(Math.ceil((new Date().getMonth() + 1) / 3));
    let activeTab = $state<'dashboard' | 'vma'>('dashboard');
    let forecastScenario = $state<'realistic' | 'optimistic' | 'pessimistic'>('realistic');
    let activeExplanation = $state<string | null>(null);

    let vmaCurrentMonth = $state(0);
    let vmaForSelectedPeriod = $state(0);
    let vmaYtd = $state(0);
    let isUpdatingVma = $state(false);
    let lastVmaUpdate = $state<string | null>(null);

    function updateVma(silent = false) {
        isUpdatingVma = true;
        try {
            const now = new Date();
            const curApps = (orgaStore.appointments?.data || []).filter((app: any) => {
                if (!app.appointment) return false;
                const d = new Date(app.appointment);
                return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            });
            vmaCurrentMonth = calculateVmaLumpSums(curApps);

            const periodApps = (orgaStore.appointments?.data || []).filter((app: any) => {
                if (!app.appointment) return false;
                const d = new Date(app.appointment);
                if (d.getFullYear() !== bwa.selectedYear) return false;
                if (viewMode === 'monthly') return d.getMonth() + 1 === selectedMonth;
                if (viewMode === 'quarterly') return Math.ceil((d.getMonth() + 1) / 3) === selectedQuarter;
                return true;
            });
            vmaForSelectedPeriod = calculateVmaLumpSums(periodApps);

            const endM = viewMode === 'monthly' ? selectedMonth - 1 : (viewMode === 'quarterly' ? selectedQuarter * 3 - 1 : 11);
            const ytdApps = (orgaStore.appointments?.data || []).filter((app: any) => {
                if (!app.appointment) return false;
                const d = new Date(app.appointment);
                return d.getFullYear() === bwa.selectedYear && d.getMonth() <= endM;
            });
            vmaYtd = calculateVmaLumpSums(ytdApps);

            lastVmaUpdate = `Stand: ${new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr`;
            if (!silent) toastStore.success("Reisekosten (VMA) erfolgreich berechnet.");
        } catch {
            if (!silent) toastStore.error("Fehler bei der Reisekostenberechnung.");
        } finally {
            isUpdatingVma = false;
        }
    }

    let currentUnbilled = $derived.by(() => {
        let sum = 0;
        (orgaStore.appointments?.data || []).forEach((app: any) => {
            if (!app.appointment || app.settled || app.description?.includes('[BLOCK]') || app.status === 'abgesagt') return;
            const d = new Date(app.appointment);
            if (d.getFullYear() !== bwa.selectedYear) return;
            if (viewMode === 'monthly' && d.getMonth() + 1 !== selectedMonth) return;
            if (viewMode === 'quarterly' && Math.ceil((d.getMonth() + 1) / 3) !== selectedQuarter) return;

            const cId = Array.isArray(app.client) ? app.client[0] : app.client;
            const clientObj = orgaStore.clients?.data?.find((c: any) => c.id === cId);
            if (!clientObj) return;

            let hours = 0;
            if (app.expand?.time_record) {
                app.expand.time_record.forEach((tr: any) => {
                    if (tr.start && tr.end) {
                        const diff = new Date(tr.end).getTime() - new Date(tr.start).getTime();
                        if (diff > 0) hours += diff / 3600000;
                    }
                });
            }
            let km = 0; let driveLump = 0;
            if (app.expand?.drive_record) {
                app.expand.drive_record.forEach((dr: any) => { km += (dr.km || 0); driveLump += (dr.lump_sum || 0); });
            }
            let exp = 0;
            if (app.expand?.expenditures) app.expand.expenditures.forEach((ex: any) => exp += (ex.sum || 0));

            sum += (hours * (clientObj.hourly_wage ?? 40)) + (km * (clientObj.km_rate ?? 0.3)) + driveLump + exp;
        });
        return sum;
    });

    let currentBWA = $derived.by(() => {
        let rev = 0, appExp = 0, compExp = 0, ust = 0, vst = 0, revPaid = 0, revOpen = 0;
        let cats: Record<string, number> = {};
        if (viewMode === 'monthly') {
            const m = bwa.stats.monthly[selectedMonth - 1];
            if (m) { rev = m.revenue; appExp = m.appExpenses; compExp = m.compExpenses; ust = m.umsatzsteuer; vst = m.vorsteuer; cats = m.categories; revPaid = m.revenuePaid || 0; revOpen = m.revenueOpen || 0; }
        } else if (viewMode === 'quarterly') {
            const start = (selectedQuarter - 1) * 3;
            for (let i = start; i < start + 3; i++) {
                const m = bwa.stats.monthly[i];
                if (m) { rev += m.revenue; appExp += m.appExpenses; compExp += m.compExpenses; ust += m.umsatzsteuer; vst += m.vorsteuer; revPaid += (m.revenuePaid || 0); revOpen += (m.revenueOpen || 0); for (const [k, v] of Object.entries(m.categories)) cats[k] = (cats[k] || 0) + v; }
            }
        } else {
            rev = bwa.stats.totals.revenue; appExp = bwa.stats.totals.appExpenses; compExp = bwa.stats.totals.compExpenses;
            ust = bwa.stats.totals.umsatzsteuer; vst = bwa.stats.totals.vorsteuer; cats = bwa.stats.totals.categories; revPaid = bwa.stats.totals.revenuePaid || 0; revOpen = bwa.stats.totals.revenueOpen || 0;
        }
        const mapped = mapToBWA(rev, appExp, compExp, cats, ust, vst, vmaForSelectedPeriod);
        mapped.revenuePaid = revPaid; mapped.revenueOpen = revOpen;
        return mapped;
    });

    let ytdBWA = $derived.by(() => {
        let rev = 0, appExp = 0, compExp = 0, ust = 0, vst = 0, revPaid = 0, revOpen = 0;
        let cats: Record<string, number> = {};
        const endMonth = viewMode === 'monthly' ? selectedMonth - 1 : (viewMode === 'quarterly' ? selectedQuarter * 3 - 1 : 11);
        for (let i = 0; i <= endMonth; i++) {
            const m = bwa.stats.monthly[i];
            if (!m) continue;
            rev += m.revenue; appExp += m.appExpenses; compExp += m.compExpenses;
            ust += m.umsatzsteuer; vst += m.vorsteuer; revPaid += (m.revenuePaid || 0); revOpen += (m.revenueOpen || 0);
            for (const [k, v] of Object.entries(m.categories)) cats[k] = (cats[k] || 0) + v;
        }
        const mapped = mapToBWA(rev, appExp, compExp, cats, ust, vst, vmaYtd);
        mapped.revenuePaid = revPaid; mapped.revenueOpen = revOpen;
        return mapped;
    });

    let previousBWA = $derived.by(() => {
        let prevRev = 0, prevExp = 0, hasPrev = false;
        if (viewMode === 'monthly' && selectedMonth > 1) {
            const m = bwa.stats.monthly[selectedMonth - 2];
            if (m) { prevRev = m.revenue; prevExp = m.compExpenses + m.appExpenses; hasPrev = true; }
        } else if (viewMode === 'quarterly' && selectedQuarter > 1) {
            const start = (selectedQuarter - 2) * 3;
            for (let i = start; i < start + 3; i++) {
                const m = bwa.stats.monthly[i];
                if (m) { prevRev += m.revenue; prevExp += (m.compExpenses + m.appExpenses); hasPrev = true; }
            }
        }
        return { revenue: prevRev, expenses: prevExp, grossProfit: prevRev, ebitda: prevRev - prevExp, netIncome: prevRev - prevExp, hasPrev };
    });

    let currentTotalExp = $derived(currentBWA.materialCosts + currentBWA.personnelCosts + currentBWA.roomCosts + currentBWA.operatingTaxes + currentBWA.otherOperatingExpenses);
    let currentTaxEstimate = $derived(calculateTaxEstimate(currentBWA.netIncome, viewMode, currentBWA.umsatzsteuer, currentBWA.vorsteuer, currentBWA.operatingTaxes));

    let financialHealth = $derived.by(() => {
        const net = currentBWA.netIncome;
        const rev = currentBWA.revenue;
        const margin = rev > 0 ? (net / rev) * 100 : 0;
        if (net > 0 && margin >= 15) {
            return {
                status: 'green' as const, label: 'Betrieb profitabel & stabil',
                desc: `Hervorragende Rendite von ${margin.toFixed(1)}%. Rücklagen für Steuern sind gedeckt.`,
                tip: 'Tipp: Verbleibende freie Liquidität kann für Investitionen oder Privatentnahmen genutzt werden.'
            };
        } else if (net >= 0) {
            return {
                status: 'yellow' as const, label: 'Ausgeglichen mit Beobachtungsbedarf',
                desc: `Knappe Marge von ${margin.toFixed(1)}%. Bitte Ausgaben und offene Rechnungen im Auge behalten.`,
                tip: currentBWA.revenueOpen > 0 ? `Tipp: ${currentBWA.revenueOpen.toFixed(0)} € offene Rechnungen zügig anmahnen!` : 'Tipp: Laufende Fixkosten prüfen.'
            };
        }
        return {
            status: 'red' as const, label: 'Verlustperiode – Handlung empfohlen',
            desc: `Aktueller Verlust von ${Math.abs(net).toFixed(0)} € in dieser Periode.`,
            tip: 'Tipp: Keine Einkommensteuer fällig, aber Liquidität durch beschleunigte Rechnungsstellung sichern.'
        };
    });

    return {
        get viewMode() { return viewMode; }, set viewMode(v) { viewMode = v; },
        get selectedMonth() { return selectedMonth; }, set selectedMonth(v) { selectedMonth = v; },
        get selectedQuarter() { return selectedQuarter; }, set selectedQuarter(v) { selectedQuarter = v; },
        get activeTab() { return activeTab; }, set activeTab(v) { activeTab = v; },
        get forecastScenario() { return forecastScenario; }, set forecastScenario(v) { forecastScenario = v; },
        get activeExplanation() { return activeExplanation; }, set activeExplanation(v) { activeExplanation = v; },
        get vmaCurrentMonth() { return vmaCurrentMonth; },
        get vmaForSelectedPeriod() { return vmaForSelectedPeriod; },
        get vmaYtd() { return vmaYtd; },
        get isUpdatingVma() { return isUpdatingVma; },
        get lastVmaUpdate() { return lastVmaUpdate; },
        get currentUnbilled() { return currentUnbilled; },
        get currentBWA() { return currentBWA; },
        get ytdBWA() { return ytdBWA; },
        get previousBWA() { return previousBWA; },
        get currentTotalExp() { return currentTotalExp; },
        get currentTaxEstimate() { return currentTaxEstimate; },
        get financialHealth() { return financialHealth; },
        updateVma,
        formatCurrency: (val: number) => (val || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' }),
        formatPercent: (curr: number, prev: number) => {
            if (!prev) return '0,0%';
            const diff = ((curr - prev) / Math.abs(prev)) * 100;
            return (diff > 0 ? '+' : '') + diff.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';
        },
        getTrendColor: (curr: number, prev: number, invert = false) => {
            if (!prev) return 'text-neutral-500';
            const diff = curr - prev;
            if (diff === 0) return 'text-neutral-500';
            const pos = invert ? diff < 0 : diff > 0;
            return pos ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400';
        }
    };
}
