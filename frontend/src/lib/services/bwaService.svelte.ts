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

    let forecastUpdateTrigger = $state(0);
    if (typeof window !== 'undefined') {
        window.addEventListener('orgaflow-forecast-saved', () => {
            forecastUpdateTrigger++;
        });
    }

    let forecastStats = $derived.by(() => {
        // Reaktiver Trigger für gespeicherte KI-Prognosen
        const _trigger = forecastUpdateTrigger;
        const timeline = [];
        const now = new Date();
        const currentRealYear = now.getFullYear();
        const currentRealMonth = now.getMonth(); // 0..11

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

        // 1. Reale Monate des gewählten Jahres bis zum aktuellen Monat (wenn im aktuellen Jahr) oder alle 12 (wenn vergangenes Jahr)
        const maxRealMonth = selectedYear === currentRealYear ? currentRealMonth : (selectedYear < currentRealYear ? 11 : -1);

        for (let i = 0; i <= maxRealMonth; i++) {
            const m = stats.monthly[i];
            if (m) {
                const totalExp = m.compExpenses + m.appExpenses;
                const profit = m.revenue - totalExp;
                timeline.push({
                    month: new Date(selectedYear, i, 1).toLocaleString('de-DE', { month: 'long', year: 'numeric' }),
                    monthShort: m.month,
                    monthIndex: i,
                    year: selectedYear,
                    revenue: m.revenue,
                    revenuePaid: m.revenuePaid || 0,
                    revenueOpen: m.revenueOpen || 0,
                    expenses: totalExp,
                    profit: profit,
                    isHistorical: true,
                    isAiProjected: false
                });
            }
        }

        // Gespeicherte KI-Prognose für dieses Jahr auslesen
        let aiMonthsMap: Record<number, any> = {};
        if (typeof localStorage !== 'undefined') {
            try {
                const uId = pb.authStore.model?.id || 'global';
                const cached = localStorage.getItem(`orgaflow_ai_forecast_${uId}_${selectedYear}`);
                if (cached) {
                    const parsed = JSON.parse(cached);
                    if (parsed?.data?.forecast_months) {
                        parsed.data.forecast_months.forEach((fm: any, idx: number) => {
                            aiMonthsMap[idx] = fm;
                        });
                    }
                }
            } catch {}
        }

        // 2. Prognosemonate für die nächsten 12 Monate anschließen
        const startOffset = selectedYear === currentRealYear ? currentRealMonth + 1 : (selectedYear > currentRealYear ? 0 : 12);
        const countForecast = 12;

        for (let i = 0; i < countForecast; i++) {
            const absMonth = startOffset + i;
            const forecastMonthIndex = absMonth % 12;
            const forecastYear = selectedYear + Math.floor(absMonth / 12);
            const d = new Date(forecastYear, forecastMonthIndex, 1);
            const monthName = d.toLocaleString('de-DE', { month: 'long', year: 'numeric' });
            const monthShort = d.toLocaleString('de-DE', { month: 'short' });

            let projectedCompExpenses = recurringMonthly;
            if ((forecastMonthIndex + 1) % 3 === 1) projectedCompExpenses += recurringQuarterly;
            if (forecastMonthIndex === 0) projectedCompExpenses += recurringYearly;

            let projectedRevenue = avgMonthlyRev;
            let keyDrivers = '';
            let confidenceScore = 85;

            // Wenn KI-Prognosedaten vorliegen: die präzise spekulierten Werte übernehmen
            const aiMonth = aiMonthsMap[i];
            if (aiMonth) {
                projectedRevenue = Number(aiMonth.bwaRevenue) || projectedRevenue;
                projectedCompExpenses = Number(aiMonth.bwaExpenses) || projectedCompExpenses;
                keyDrivers = aiMonth.key_drivers || '';
                confidenceScore = Number(aiMonth.confidence_score) || 90;
            }

            const projectedProfit = projectedRevenue - projectedCompExpenses;

            timeline.push({
                month: monthName,
                monthShort: monthShort,
                monthIndex: forecastMonthIndex,
                year: forecastYear,
                revenue: projectedRevenue,
                revenuePaid: projectedRevenue,
                revenueOpen: 0,
                expenses: projectedCompExpenses,
                profit: projectedProfit,
                isHistorical: false,
                isAiProjected: !!aiMonth,
                keyDrivers,
                confidenceScore
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

/**
 * Errechnet alle relevanten und realen Steuerabgaben:
 * - Gewerbesteuer (GewSt mit Freibetrag 24.500 €, Messzahl 3,5 %, Hebesatz 400 %)
 * - Einkommensteuer (ESt nach § 32a EStG Einkommensteuertarif)
 * - § 35 EStG Gewerbesteuer-Anrechnung (Ermäßigung bis 4,0-fache des GewSt-Messbetrags)
 * - Solidaritätszuschlag (5,5 % mit bundesweiter Freigrenze)
 * - Umsatzsteuer-Zahllast (Vereinnahmte USt abzüglich abziehbarer Vorsteuer für UStVA)
 * - Betriebliche Steuern (Kfz-Steuer, Grundsteuer etc.)
 * - Reingewinn nach Steuern & verbleibende Netto-Liquidität
 */
export function calculateTaxEstimate(
    profit: number, 
    viewMode: 'monthly' | 'quarterly' | 'yearly' = 'monthly',
    umsatzsteuer: number = 0,
    vorsteuer: number = 0,
    operatingTaxes: number = 0
) {
    const factor = viewMode === 'monthly' ? 12 : (viewMode === 'quarterly' ? 4 : 1);
    const safeProfit = profit || 0;
    const ust = umsatzsteuer || 0;
    const vst = vorsteuer || 0;
    const opTaxes = operatingTaxes || 0;
    const ustZahllast = ust - vst;

    if (safeProfit <= 0) {
        return {
            profit: safeProfit,
            factor,
            gewerbeErtrag: 0,
            gewStFreibetrag: Math.round(24500 / factor),
            gewStMessbetrag: 0,
            gewerbesteuer: 0,
            rawESt: 0,
            gewStAnrechnung: 0,
            einkommensteuer: 0,
            soli: 0,
            totalTaxes: 0,
            ertragsteuern: 0,
            effectiveRate: 0,
            netAfterTaxes: safeProfit,
            umsatzsteuer: ust,
            vorsteuer: vst,
            ustZahllast,
            isUStErstattung: ustZahllast < 0,
            operatingTaxes: opTaxes,
            gesamteAbgaben: Math.max(0, ustZahllast) + opTaxes,
            liquiditaetNachAllenAbgaben: safeProfit - Math.max(0, ustZahllast)
        };
    }

    const annualProfit = safeProfit * factor;

    // 1. Gewerbesteuer: Freibetrag 24.500 € (für Einzelunternehmen / Personengesellschaften), Messzahl 3,5%, Hebesatz 400%
    const gewerbeErtrag = Math.max(0, annualProfit - 24500);
    const annualMessbetrag = gewerbeErtrag * 0.035;
    const annualGewSt = annualMessbetrag * 4.0;
    const gewerbesteuer = Math.round(annualGewSt / factor);

    // 2. Einkommensteuer: Grundfreibetrag ~11.784 €, Einkommensteuertarif (§ 32a EStG)
    let rawAnnualESt = 0;
    const zvE = annualProfit;

    if (zvE <= 11784) {
        rawAnnualESt = 0;
    } else if (zvE <= 17005) {
        const y = (zvE - 11784) / 10000;
        rawAnnualESt = (995.21 * y + 1400) * y;
    } else if (zvE <= 66760) {
        const z = (zvE - 17005) / 10000;
        rawAnnualESt = (208.85 * z + 2397) * z + 1015.51;
    } else if (zvE <= 277825) {
        rawAnnualESt = 0.42 * zvE - 10636.31;
    } else {
        rawAnnualESt = 0.45 * zvE - 18971.06;
    }

    // § 35 EStG: Gewerbesteuer-Anrechnung auf die Einkommensteuer (bis zum 4,0-fachen des Messbetrags)
    const annualGewStAnrechnung = Math.min(rawAnnualESt, annualMessbetrag * 4.0);
    const annualESt = Math.max(0, rawAnnualESt - annualGewStAnrechnung);
    const einkommensteuer = Math.round(annualESt / factor);

    // Solidaritätszuschlag (5,5%, Freigrenze ab ca. 18.130 € ESt)
    const annualSoli = annualESt > 18130 ? (annualESt * 0.055) : 0;
    const soli = Math.round(annualSoli / factor);

    const ertragsteuern = gewerbesteuer + einkommensteuer + soli;
    const effectiveRate = safeProfit > 0 ? (ertragsteuern / safeProfit) * 100 : 0;
    const netAfterTaxes = safeProfit - ertragsteuern;
    const gesamteAbgaben = ertragsteuern + Math.max(0, ustZahllast) + opTaxes;
    const liquiditaetNachAllenAbgaben = safeProfit - ertragsteuern - Math.max(0, ustZahllast);

    return {
        profit: safeProfit,
        factor,
        // Gewerbesteuer
        gewerbeErtrag: Math.round(gewerbeErtrag / factor),
        gewStFreibetrag: Math.round(24500 / factor),
        gewStMessbetrag: Math.round(annualMessbetrag / factor),
        gewerbesteuer,
        // Einkommensteuer
        rawESt: Math.round(rawAnnualESt / factor),
        gewStAnrechnung: Math.round(annualGewStAnrechnung / factor),
        einkommensteuer,
        // Soli
        soli,
        // Summe Ertragssteuern
        totalTaxes: ertragsteuern,
        ertragsteuern,
        effectiveRate,
        netAfterTaxes,
        // Umsatzsteuer & Zahllast
        umsatzsteuer: ust,
        vorsteuer: vst,
        ustZahllast,
        isUStErstattung: ustZahllast < 0,
        operatingTaxes: opTaxes,
        // Gesamte Abgaben & verbleibende Liquidität
        gesamteAbgaben,
        liquiditaetNachAllenAbgaben
    };
}