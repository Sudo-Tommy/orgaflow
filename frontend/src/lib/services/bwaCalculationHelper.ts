/**
 * bwaCalculationHelper.ts
 * Berechnungs- und Prognosehelfer für BWA (Betriebswirtschaftliche Auswertung).
 * Rechnet aggregierte EÜR-Gewinne, Umsätze, Spesen und KI-Prognosen aus.
 */

export interface BwaMonthItem {
    month: string;
    revenue: number;
    revenuePaid: number;
    revenueOpen: number;
    unbilledRevenue: number;
    appExpenses: number;
    compExpenses: number;
    profit: number;
    categories: Record<string, number>;
    umsatzsteuer: number;
    vorsteuer: number;
}

export function computeBwaStats(
    selectedYear: number,
    selectedCompanyId: string,
    invoices: any[],
    appointments: any[],
    companyExpenses: any[],
    getClientName: (id: string) => string,
    getUserName: (id: string) => string
) {
    const months = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
    const monthly: BwaMonthItem[] = months.map(m => ({
        month: m,
        revenue: 0,
        revenuePaid: 0,
        revenueOpen: 0,
        unbilledRevenue: 0,
        appExpenses: 0,
        compExpenses: 0,
        profit: 0,
        categories: {},
        umsatzsteuer: 0,
        vorsteuer: 0
    }));

    let totals = {
        revenue: 0,
        revenuePaid: 0,
        revenueOpen: 0,
        unbilledRevenue: 0,
        currentTotalUnbilled: 0,
        appExpenses: 0,
        compExpenses: 0,
        profit: 0,
        appointments: 0,
        hours: 0,
        km: 0,
        categories: {} as Record<string, number>,
        umsatzsteuer: 0,
        vorsteuer: 0
    };

    let clientStats: Record<string, { name: string; revenue: number; hours: number; appts: number }> = {};
    let userStats: Record<string, { name: string; hours: number; appts: number; km: number }> = {};

    // Rechnungen (Umsätze) aggregieren
    invoices.forEach((inv: any) => {
        if (inv.status === 'Entwurf' || inv.status === 'Storniert' || inv.status === 'Abgelehnt') return;

        const rev = inv.netto || 0;
        const ust = inv.tax_sum || 0;

        if (inv.status !== 'Abgeschlossen') {
            const dateForOpen = inv.due_date || inv.issue_date;
            if (dateForOpen) {
                const dOpen = new Date(dateForOpen);
                if (dOpen.getFullYear() === selectedYear) {
                    if (selectedCompanyId !== "all" && inv.company !== selectedCompanyId) return;
                    monthly[dOpen.getMonth()].revenueOpen += rev;
                    totals.revenueOpen += rev;
                }
            }
            return;
        }

        const dateToUse = inv.paid_at || inv.issue_date;
        if (!dateToUse) return;
        const d = new Date(dateToUse);

        if (d.getFullYear() === selectedYear) {
            if (selectedCompanyId !== "all" && inv.company !== selectedCompanyId) return;

            const mIdx = d.getMonth();
            monthly[mIdx].revenue += rev;
            monthly[mIdx].umsatzsteuer += ust;
            monthly[mIdx].revenuePaid += rev;

            totals.revenue += rev;
            totals.umsatzsteuer += ust;
            totals.revenuePaid += rev;

            const cId = Array.isArray(inv.client) ? inv.client[0] : inv.client;
            if (cId) {
                if (!clientStats[cId]) clientStats[cId] = { name: getClientName(cId), revenue: 0, hours: 0, appts: 0 };
                clientStats[cId].revenue += rev;
            }
        }
    });

    // Termine aggregieren
    appointments.forEach((app: any) => {
        if (!app.appointment) return;
        const d = new Date(app.appointment);

        const uCompId = app.expand?.user?.company;
        let matchesCompany = true;
        if (selectedCompanyId !== "all") {
            if (Array.isArray(uCompId)) matchesCompany = uCompId.includes(selectedCompanyId);
            else if (typeof uCompId === 'string') {
                if (uCompId.startsWith('[')) {
                    try { matchesCompany = JSON.parse(uCompId).includes(selectedCompanyId); } catch {}
                } else matchesCompany = uCompId === selectedCompanyId || uCompId.includes(selectedCompanyId);
            } else matchesCompany = false;
        }
        if (!matchesCompany) return;

        const cId = Array.isArray(app.client) ? app.client[0] : app.client;

        let appHours = 0;
        if (app.expand?.time_record) {
            app.expand.time_record.forEach((tr: any) => {
                if (tr.start && tr.end) {
                    const diffMs = new Date(tr.end).getTime() - new Date(tr.start).getTime();
                    if (diffMs > 0) appHours += diffMs / 3600000;
                }
            });
        }

        let appKm = 0;
        let appDriveLump = 0;
        if (app.expand?.drive_record) {
            app.expand.drive_record.forEach((dr: any) => {
                appKm += (dr.km || 0);
                appDriveLump += (dr.lump_sum || 0);
            });
        }

        let appExp = 0;
        if (app.expand?.expenditures) app.expand.expenditures.forEach((ex: any) => { appExp += (ex.sum || 0); });

        const isBlockedOrPrivate = (app.description || '').toUpperCase().includes('[BLOCK]') ||
            (app.title || '').toUpperCase().includes('[BLOCK]') ||
            Boolean(app.is_blocked) ||
            app.is_private === true ||
            app.is_private === 'true';

        if (d.getFullYear() === selectedYear && app.status !== 'abgesagt' && !isBlockedOrPrivate) {
            const monthIdx = d.getMonth();
            totals.appointments++;
            totals.hours += appHours;
            totals.km += appKm;
            monthly[monthIdx].appExpenses += appExp;
            totals.appExpenses += appExp;

            if (cId) {
                if (!clientStats[cId]) clientStats[cId] = { name: getClientName(cId), revenue: 0, hours: 0, appts: 0 };
                clientStats[cId].hours += appHours;
                clientStats[cId].appts++;
            }

            const uId = app.user;
            if (uId) {
                if (!userStats[uId]) userStats[uId] = { name: getUserName(uId), hours: 0, appts: 0, km: 0 };
                userStats[uId].hours += appHours;
                userStats[uId].appts++;
                userStats[uId].km += appKm;
            }
        }
    });

    // Betriebsausgaben addieren
    companyExpenses.forEach((exp: any) => {
        const d = new Date(exp.date);
        if (d.getFullYear() === selectedYear) {
            const mIdx = d.getMonth();
            const amt = exp.netto > 0 ? exp.netto : (exp.amount || 0);
            const vst = exp.tax_sum || 0;
            monthly[mIdx].compExpenses += amt;
            monthly[mIdx].vorsteuer += vst;
            totals.compExpenses += amt;
            totals.vorsteuer += vst;

            const cat = exp.category || 'Sonstiges';
            totals.categories[cat] = (totals.categories[cat] || 0) + amt;
            monthly[mIdx].categories[cat] = (monthly[mIdx].categories[cat] || 0) + amt;
        }
    });

    monthly.forEach(m => { m.profit = m.revenue - m.appExpenses - m.compExpenses; });
    totals.profit = totals.revenue - totals.appExpenses - totals.compExpenses;

    return {
        monthly,
        totals,
        clientStats: Object.values(clientStats).sort((a, b) => b.revenue - a.revenue),
        userStats: Object.values(userStats).sort((a, b) => b.hours - a.hours)
    };
}
