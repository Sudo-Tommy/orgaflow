import { pb } from "$lib/services/pocketbase";
import { orgaStore } from "$lib/stores/orgaStore.svelte";

export function useBwaService() {
    let selectedYear = $state(new Date().getFullYear());
    let selectedCompanyId = $state<string>("all");
    let companyExpenses = $state<any[]>([]);
    let isLoadingExpenses = $state(false);

    let availableYears = $derived.by(() => {
        const years = new Set<number>();
        years.add(new Date().getFullYear()); // Aktuelles Jahr immer anzeigen
        
        (orgaStore.invoices?.data || []).forEach((inv: any) => {
            if (inv.issue_date) years.add(new Date(inv.issue_date).getFullYear());
            if (inv.due_date) years.add(new Date(inv.due_date).getFullYear());
            if (inv.paid_at) years.add(new Date(inv.paid_at).getFullYear());
        });
        (orgaStore.appointments?.data || []).forEach((app: any) => {
            if (app.appointment) years.add(new Date(app.appointment).getFullYear());
        });
        
        return Array.from(years).sort((a, b) => b - a); // Absteigend sortieren
    });

    async function loadExpenses() {
        isLoadingExpenses = true;
        try {
            let filter = "";
            if (selectedCompanyId !== "all") {
                filter = `company = '${selectedCompanyId}'`;
            }
            const res = await pb.collection('company_expenses').getFullList({ filter, sort: '-date' });
            companyExpenses = res;
        } catch(e) {
            // Falls die Tabelle noch nicht in PocketBase existiert, fangen wir das weich ab
            companyExpenses = [];
        } finally {
            isLoadingExpenses = false;
        }
    }

    async function addExpense(payload: FormData | any) {
        await pb.collection('company_expenses').create(payload);
        await loadExpenses();
    }

    async function deleteExpense(id: string) {
        await pb.collection('company_expenses').delete(id);
        await loadExpenses();
    }

    let stats = $derived.by(() => {
        const months = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
        const monthly = months.map(m => ({ month: m, revenue: 0, revenuePaid: 0, revenueOpen: 0, unbilledRevenue: 0, appExpenses: 0, compExpenses: 0, profit: 0, categories: {} as Record<string, number>, umsatzsteuer: 0, vorsteuer: 0 }));
        let totals = { revenue: 0, revenuePaid: 0, revenueOpen: 0, unbilledRevenue: 0, currentTotalUnbilled: 0, appExpenses: 0, compExpenses: 0, profit: 0, appointments: 0, hours: 0, km: 0, categories: {} as Record<string, number>, umsatzsteuer: 0, vorsteuer: 0 };
        
        let clientStats: Record<string, { name: string, revenue: number, hours: number, appts: number }> = {};
        let userStats: Record<string, { name: string, hours: number, appts: number, km: number }> = {};

        // Helfer für Namen
        const getClientName = (id: string) => {
            const c = orgaStore.clients?.data?.find((cl:any) => cl.id === id);
            return c ? `${c.name_first} ${c.name_last}` : 'Unbekannt';
        };
        const getUserName = (id: string) => {
            const u = (orgaStore as any).users?.data?.find((usr:any) => usr.id === id) || { name_first: 'Team', name_last: 'Mitglied' };
            return `${u.name_first} ${u.name_last}`.trim();
        };

        // Rechnungen (Umsätze) aggregieren
        (orgaStore.invoices?.data || []).forEach((inv: any) => {
            if (inv.status === 'Entwurf' || inv.status === 'Storniert' || inv.status === 'Abgelehnt') return;

            const rev = inv.netto || 0;
            const ust = inv.tax_sum || 0;

            // OFFENE Rechnungen (nicht bezahlt) - fließen NICHT in die reale BWA ein!
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
                return; // WICHTIG: Hier abbrechen, damit offene Beträge nicht in den echten Gewinn fließen
            }

            // BEZAHLTE Rechnungen (EÜR - Zuflussprinzip)
            const dateToUse = inv.paid_at || inv.issue_date; // Fallback auf Rechnungsdatum für alte Rechnungen
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

        // Termine aggregieren (Leistungen, Mitarbeiter)
        (orgaStore.appointments?.data || []).forEach((app: any) => {
            if (!app.appointment) return;
            const d = new Date(app.appointment);
            
            // Check Company Filter
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

            // Global Unbilled Revenue (WIP) berechnen, unabhängig vom selektierten Jahr/Monat
            if (!app.settled && !app.description?.includes('[BLOCK]')) {
                const clientObj = orgaStore.clients?.data?.find((c:any) => c.id === cId);
                if (clientObj) {
                    const wage = clientObj.hourly_wage ?? 40;
                    const kmRate = clientObj.km_rate ?? 0.3;
                    const unbilled = (appHours * wage) + (appKm * kmRate) + appDriveLump + appExp;
                    totals.currentTotalUnbilled += unbilled;
                }
            }
            
            if (d.getFullYear() === selectedYear) {
                const monthIdx = d.getMonth();
                totals.appointments++;

                totals.hours += appHours;

                totals.km += appKm;
                
                monthly[monthIdx].appExpenses += appExp;
                totals.appExpenses += appExp;

                // Client Stats
                if (cId) {
                    if (!clientStats[cId]) clientStats[cId] = { name: getClientName(cId), revenue: 0, hours: 0, appts: 0 };
                    clientStats[cId].hours += appHours;
                    clientStats[cId].appts++;
                }

                // User Stats
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

        // Gewinn berechnen (Umsatz - TerminSpesen - Betriebsausgaben)
        monthly.forEach(m => { m.profit = m.revenue - m.appExpenses - m.compExpenses; });
        totals.profit = totals.revenue - totals.appExpenses - totals.compExpenses;

        return {
            monthly,
            totals,
            clientStats: Object.values(clientStats).sort((a,b) => b.revenue - a.revenue),
            userStats: Object.values(userStats).sort((a,b) => b.hours - a.hours)
        };
    });

    let forecastStats = $derived.by(() => {
        const months = [];
        const now = new Date();
        let currentYear = selectedYear;
        let currentMonth = now.getFullYear() === currentYear ? now.getMonth() : -1;

        let recurringMonthly = 0;
        let recurringQuarterly = 0;
        let recurringYearly = 0;
        companyExpenses.filter(e => e.is_recurring).forEach(e => {
            if (e.interval === 'monthly') recurringMonthly += e.amount;
            if (e.interval === 'quarterly') recurringQuarterly += e.amount;
            if (e.interval === 'yearly') recurringYearly += e.amount;
        });

        for (let i = 1; i <= 12; i++) {
            const forecastMonthIndex = (currentMonth + i) % 12;
            const forecastYear = currentYear + Math.floor((currentMonth + i) / 12);
            const monthName = new Date(forecastYear, forecastMonthIndex, 1).toLocaleString('de-DE', { month: 'long', year: 'numeric' });

            let projectedCompExpenses = recurringMonthly;
            if ((forecastMonthIndex + 1) % 3 === 1) projectedCompExpenses += recurringQuarterly;
            if (forecastMonthIndex === 0) projectedCompExpenses += recurringYearly;
            
            const projectedRevenue = 0; // Umsatz ist nicht verlässlich prognostizierbar
            const projectedProfit = projectedRevenue - projectedCompExpenses;

            months.push({ month: monthName, revenue: projectedRevenue, expenses: projectedCompExpenses, profit: projectedProfit });
        }
        return months;
    });

    return {
        get selectedYear() { return selectedYear; }, set selectedYear(v) { selectedYear = v; },
        get selectedCompanyId() { return selectedCompanyId; }, set selectedCompanyId(v) { selectedCompanyId = v; },
        get availableYears() { return availableYears; },
        get stats() { return stats; },
        get companyExpenses() { return companyExpenses; },
        get isLoadingExpenses() { return isLoadingExpenses; },
        get forecastStats() { return forecastStats; },
        loadExpenses,
        addExpense,
        deleteExpense
    };
}