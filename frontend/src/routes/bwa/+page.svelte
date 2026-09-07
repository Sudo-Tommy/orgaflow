<script lang="ts">
    import { useBwaService, calculateTaxEstimate } from "$lib/services/bwaService.svelte";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import { pb } from "$lib/services/pocketbase";
    import { onMount } from "svelte";
    import { confirmStore } from "$lib/services/confirmService.svelte";
    import { toastStore } from "$lib/services/toastService.svelte";
    import BwaKpiCards from "$lib/components/bwa/BwaKpiCards.svelte";
    import { Car } from "lucide-svelte";
    import BwaExpenseStructureWidget from "$lib/components/bwa/BwaExpenseStructureWidget.svelte";
    import BwaForecastWidget from "$lib/components/bwa/BwaForecastWidget.svelte";
    import BwaTopClientsWidget from "$lib/components/bwa/BwaTopClientsWidget.svelte";
    import BwaTeamPerformanceWidget from "$lib/components/bwa/BwaTeamPerformanceWidget.svelte";
    import BwaRecentExpensesWidget from "$lib/components/bwa/BwaRecentExpensesWidget.svelte";
    import BwaTable from "$lib/components/bwa/BwaTable.svelte";
    import BwaDetailModal from "$lib/components/bwa/BwaDetailModal.svelte";
    import BwaForecastModal from "$lib/components/bwa/BwaForecastModal.svelte";
    import BwaClientsModal from "$lib/components/bwa/BwaClientsModal.svelte";
    import BwaTeamModal from "$lib/components/bwa/BwaTeamModal.svelte";
    import BwaExpensesListModal from "$lib/components/bwa/BwaExpensesListModal.svelte";
    import BwaExpenseModal from "$lib/components/bwa/BwaExpenseModal.svelte";
    import BwaTaxForecastWidget from "$lib/components/bwa/BwaTaxForecastWidget.svelte";
    import AdminUnifiedFinanceModal from "$lib/components/admin/AdminUnifiedFinanceModal.svelte";
    import VmaManager from "$lib/components/vma/VmaManager.svelte";
    import { rbacService } from "$lib/services/rbacService.svelte";
    import { goto } from "$app/navigation";

    const bwa = useBwaService();
    
    let currentUser = $state(pb.authStore.record || pb.authStore.model);
    let isGodMode = $derived(rbacService.isOwner);

    $effect(() => {
        if (!rbacService.canAccessFinances) {
            toastStore.warning("Keine Berechtigung für BWA- und Finanzdaten.");
            goto('/dashboard');
        }
    });

    // Automatischer Datenabruf bei Änderung von Jahr oder Firma
    $effect(() => {
        bwa.loadExpenses();
    });

    // View State für detaillierte BWA
    let viewMode = $state<'monthly' | 'quarterly' | 'yearly'>('monthly');
    let selectedMonth = $state(new Date().getMonth() + 1);
    let selectedQuarter = $state(Math.ceil((new Date().getMonth() + 1) / 3));

    let activeTab = $state<'dashboard' | 'vma'>('dashboard');
    
    // Prognose-Szenario
    let forecastScenario = $state<'realistic' | 'optimistic' | 'pessimistic'>('realistic');

    // Unbilled Revenue Calculation (Unbezahlte Leistungen WIP für den gewählten Zeitraum)
    let currentUnbilled = $derived.by(() => {
        let sum = 0;
        
        (orgaStore.appointments?.data || []).forEach((app: any) => {
            if (!app.appointment || app.settled || app.description?.includes('[BLOCK]')) return;
            
            const d = new Date(app.appointment);
            if (d.getFullYear() !== bwa.selectedYear) return;
            if (viewMode === 'monthly' && d.getMonth() + 1 !== selectedMonth) return;
            if (viewMode === 'quarterly' && Math.ceil((d.getMonth() + 1) / 3) !== selectedQuarter) return;
            
            // Check Company Filter
            const uCompId = app.expand?.user?.company;
            let matchesCompany = true;
            if (bwa.selectedCompanyId !== "all") {
                if (Array.isArray(uCompId)) matchesCompany = uCompId.includes(bwa.selectedCompanyId);
                else if (typeof uCompId === 'string') {
                    if (uCompId.startsWith('[')) {
                        try { matchesCompany = JSON.parse(uCompId).includes(bwa.selectedCompanyId); } catch {}
                    } else matchesCompany = uCompId === bwa.selectedCompanyId || uCompId.includes(bwa.selectedCompanyId);
                } else matchesCompany = false;
            }
            if (!matchesCompany) return;

            const cId = Array.isArray(app.client) ? app.client[0] : app.client;
            const clientObj = orgaStore.clients?.data?.find((c:any) => c.id === cId);
            if (!clientObj) return;

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

            const wage = clientObj.hourly_wage ?? 40;
            const kmRate = clientObj.km_rate ?? 0.3;
            sum += (appHours * wage) + (appKm * kmRate) + appDriveLump + appExp;
        });
        return sum;
    });

    // --- VMA / REISEKOSTEN LOGIK ---
    function calculateVmaLumpSums(appointments: any[]) {
        let mileage = 0;
        let perDiem = 0;
        // WICHTIG: Pro Mitarbeiter und Tag gruppieren, damit Zeiten verschiedener Mitarbeiter nicht kollidieren
        const userDays = new Map<string, { start: number, end: number }>();
        
        appointments.forEach(app => {
            if (app.expand?.drive_record) {
                app.expand.drive_record.forEach((dr: any) => mileage += (dr.km || 0) * 0.30);
            }
            if (!app.appointment || app.description?.includes('[BLOCK]')) return;
            
            const uId = app.user || app.expand?.user?.id || 'default_user';
            const dStr = new Date(app.appointment).toISOString().split('T')[0];
            const userDayKey = `${uId}_${dStr}`;

            if (!userDays.has(userDayKey)) userDays.set(userDayKey, { start: Infinity, end: 0 });
            const dayData = userDays.get(userDayKey)!;
            if (app.expand?.time_record) {
                app.expand.time_record.forEach((tr: any) => {
                    if (tr.start) dayData.start = Math.min(dayData.start, new Date(tr.start).getTime());
                    if (tr.end) dayData.end = Math.max(dayData.end, new Date(tr.end).getTime());
                });
            }
        });

        for (const day of userDays.values()) {
            if (day.start !== Infinity && day.end !== 0) {
                const hours = (day.end - day.start) / 3600000;
                if (hours > 8) perDiem += 14;
            }
        }
        return mileage + perDiem;
    }

    // Reisekosten-State: Aktualisierung erfolgt ausschließlich manuell per Klick auf "Aktualisieren"
    let vmaCurrentMonth = $state(0);
    let vmaForSelectedPeriod = $state(0);
    let vmaYtd = $state(0);
    let isUpdatingVma = $state(false);
    let lastVmaUpdate = $state<string | null>(null);

    function updateVma() {
        isUpdatingVma = true;
        try {
            // 1. VMA für aktuellen Kalendermonat
            const now = new Date();
            const targetMonth = now.getMonth();
            const targetYear = now.getFullYear();
            const currentMonthApps = (orgaStore.appointments?.data || []).filter((app: any) => {
                if (!app.appointment) return false;
                const d = new Date(app.appointment);
                if (d.getMonth() !== targetMonth || d.getFullYear() !== targetYear) return false;
                if (bwa.selectedCompanyId !== "all") {
                    const uCompId = app.expand?.user?.company;
                    if (Array.isArray(uCompId)) return uCompId.includes(bwa.selectedCompanyId);
                    return uCompId === bwa.selectedCompanyId;
                }
                return true;
            });
            vmaCurrentMonth = calculateVmaLumpSums(currentMonthApps);

            // 2. VMA für den aktuell ausgewählten BWA-Zeitraum
            const periodApps = (orgaStore.appointments?.data || []).filter((app: any) => {
                if (!app.appointment) return false;
                const d = new Date(app.appointment);
                if (viewMode === 'monthly' && d.getMonth() + 1 !== selectedMonth) return false;
                if (viewMode === 'quarterly' && Math.ceil((d.getMonth() + 1) / 3) !== selectedQuarter) return false;
                if (d.getFullYear() !== bwa.selectedYear) return false;
                
                if (bwa.selectedCompanyId !== "all") {
                    const uCompId = app.expand?.user?.company;
                    if (Array.isArray(uCompId)) return uCompId.includes(bwa.selectedCompanyId);
                    return uCompId === bwa.selectedCompanyId;
                }
                return true;
            });
            vmaForSelectedPeriod = calculateVmaLumpSums(periodApps);

            // 3. YTD VMA
            let endMonth = 11;
            if (viewMode === 'monthly') endMonth = selectedMonth - 1;
            else if (viewMode === 'quarterly') endMonth = selectedQuarter * 3 - 1;
            const ytdApps = (orgaStore.appointments?.data || []).filter((app: any) => {
                if (!app.appointment) return false;
                const d = new Date(app.appointment);
                if (d.getFullYear() !== bwa.selectedYear) return false;
                if (d.getMonth() > endMonth) return false;
                if (bwa.selectedCompanyId !== "all") {
                    const uCompId = app.expand?.user?.company;
                    if (Array.isArray(uCompId)) return uCompId.includes(bwa.selectedCompanyId);
                    return uCompId === bwa.selectedCompanyId;
                }
                return true;
            });
            vmaYtd = calculateVmaLumpSums(ytdApps);

            const timeStr = new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
            lastVmaUpdate = `Stand: ${timeStr} Uhr`;

            if (typeof localStorage !== 'undefined') {
                localStorage.setItem(`bwa_vma_cache_${bwa.selectedYear}_${bwa.selectedCompanyId}`, JSON.stringify({
                    vmaCurrentMonth,
                    vmaForSelectedPeriod,
                    vmaYtd,
                    lastVmaUpdate
                }));
            }
            toastStore.success("Reisekosten erfolgreich aktualisiert.");
        } catch (e) {
            toastStore.error("Fehler beim Aktualisieren der Reisekosten.");
        } finally {
            isUpdatingVma = false;
        }
    }

    // Modals
    // svelte-ignore non_reactive_update
    let bwaDetailModal: ReturnType<typeof BwaDetailModal>;
    // svelte-ignore non_reactive_update
    let forecastModal: ReturnType<typeof BwaForecastModal>;
    // svelte-ignore non_reactive_update
    let unifiedFinanceModal: ReturnType<typeof AdminUnifiedFinanceModal>;
    // svelte-ignore non_reactive_update
    let clientsModal: ReturnType<typeof BwaClientsModal>;
    // svelte-ignore non_reactive_update
    let teamModal: ReturnType<typeof BwaTeamModal>;
    // svelte-ignore non_reactive_update
    let expensesListModal: ReturnType<typeof BwaExpensesListModal>;
    // svelte-ignore non_reactive_update
    let expenseModal: ReturnType<typeof BwaExpenseModal>;

    onMount(() => {
        if (typeof localStorage !== 'undefined') {
            const stored = localStorage.getItem('global_company_id');
            if (stored) bwa.selectedCompanyId = stored;

            const cached = localStorage.getItem(`bwa_vma_cache_${bwa.selectedYear}_${bwa.selectedCompanyId}`);
            if (cached) {
                try {
                    const parsed = JSON.parse(cached);
                    vmaCurrentMonth = parsed.vmaCurrentMonth || 0;
                    vmaForSelectedPeriod = parsed.vmaForSelectedPeriod || 0;
                    vmaYtd = parsed.vmaYtd || 0;
                    lastVmaUpdate = parsed.lastVmaUpdate || null;
                } catch {}
            }
        }
        const handleSync = (e: any) => { bwa.selectedCompanyId = e.detail; };
        window.addEventListener('global-company-changed', handleSync);
        return () => window.removeEventListener('global-company-changed', handleSync);
    });

    // BWA Mapping Logic & Derived Data
    type BWAData = {
        erloeseBetrieb: number; erloeseSonstige: number; summeErloese: number;
        warenMaterial: number; fremdleistungen: number; 
        rohertrag: number;
        personalkosten: number; raumkosten: number;
        steuernVersicherungen: number; fahrzeugkosten: number; werbeReisekosten: number;
        instandhaltung: number; verschiedeneKosten: number; summeBetriebskosten: number;
        abschreibungen: number; 
        vorlaeufigesErgebnis: number;
        umsatzsteuer: number; vorsteuer: number;
        
        // Legacy / KPI Fields
        revenuePaid: number;
        revenueOpen: number;
        revenue: number; grossProfit: number; ebitda: number; netIncome: number; materialCosts: number; personnelCosts: number; roomCosts: number; operatingTaxes: number; otherOperatingExpenses: number;
    };

    function mapToBWA(rev: number, appExp: number, compExp: number, categories: Record<string, number>, ust: number, vst: number, vmaLumpSums: number): BWAData {
        const erloeseBetrieb = rev;
        const erloeseSonstige = 0;
        const summeErloese = erloeseBetrieb + erloeseSonstige;

        const warenMaterial = appExp; 
        const fremdleistungen = 0;
        const rohertrag = summeErloese - warenMaterial - fremdleistungen;

        const personalkosten = categories["Personal"] || 0;
        const raumkosten = categories["Miete / Büro"] || 0;
        const steuernVersicherungen = categories["Steuern & Versicherungen"] || 0; 
        const fahrzeugkosten = categories["Fahrzeuge"] || 0;
        const werbeReisekosten = (categories["Marketing"] || 0) + vmaLumpSums;
        const instandhaltung = categories["Instandhaltung"] || 0;
        const abschreibungen = categories["Abschreibungen"] || 0;

        // Auffangposten: Alle nicht explizit zugeordneten Kategorien fließen in verschiedeneKosten ein
        const explicitKnownSum = (categories["Personal"] || 0) + (categories["Miete / Büro"] || 0) + (categories["Fahrzeuge"] || 0) + (categories["Marketing"] || 0) + (categories["Steuern & Versicherungen"] || 0) + (categories["Instandhaltung"] || 0) + (categories["Abschreibungen"] || 0);
        const totalCompCats = Object.values(categories).reduce((sum, v) => sum + v, 0);
        const unmappedCategories = Math.max(0, totalCompCats - explicitKnownSum);
        const verschiedeneKosten = unmappedCategories;

        const summeBetriebskosten = personalkosten + raumkosten + steuernVersicherungen + fahrzeugkosten + werbeReisekosten + instandhaltung + verschiedeneKosten;

        const ebitda = rohertrag - summeBetriebskosten;
        const vorlaeufigesErgebnis = ebitda - abschreibungen;

        return {
            erloeseBetrieb, erloeseSonstige, summeErloese, 
            warenMaterial, fremdleistungen, 
            rohertrag,
            personalkosten, raumkosten, steuernVersicherungen, fahrzeugkosten, werbeReisekosten, instandhaltung, verschiedeneKosten, summeBetriebskosten,
            ebitda,
            abschreibungen, 
            vorlaeufigesErgebnis,
            umsatzsteuer: ust, vorsteuer: vst,
            revenuePaid: 0,
            revenueOpen: 0,
            revenue: rev, grossProfit: rohertrag, netIncome: vorlaeufigesErgebnis,
            materialCosts: warenMaterial + fremdleistungen, personnelCosts: personalkosten, roomCosts: raumkosten, operatingTaxes: steuernVersicherungen, otherOperatingExpenses: verschiedeneKosten + fahrzeugkosten + werbeReisekosten
        };
    }

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
                if (m) { rev += m.revenue; appExp += m.appExpenses; compExp += m.compExpenses; ust += m.umsatzsteuer; vst += m.vorsteuer; revPaid += (m.revenuePaid || 0); revOpen += (m.revenueOpen || 0); for (const [k,v] of Object.entries(m.categories)) cats[k] = (cats[k] || 0) + v; }
            }
        } else {
            rev = bwa.stats.totals.revenue; appExp = bwa.stats.totals.appExpenses; compExp = bwa.stats.totals.compExpenses;
            ust = bwa.stats.totals.umsatzsteuer; vst = bwa.stats.totals.vorsteuer; cats = bwa.stats.totals.categories; revPaid = bwa.stats.totals.revenuePaid || 0; revOpen = bwa.stats.totals.revenueOpen || 0;
        }
        const mapped = mapToBWA(rev, appExp, compExp, cats, ust, vst, vmaForSelectedPeriod);
        mapped.revenuePaid = revPaid;
        mapped.revenueOpen = revOpen;
        return mapped;
    });

    let ytdBWA = $derived.by(() => {
        let rev = 0, appExp = 0, compExp = 0, ust = 0, vst = 0, revPaid = 0, revOpen = 0;
        let cats: Record<string, number> = {};
        let endMonth = 11;
        if (viewMode === 'monthly') endMonth = selectedMonth - 1;
        else if (viewMode === 'quarterly') endMonth = selectedQuarter * 3 - 1;
        
        for (let i = 0; i <= endMonth; i++) {
            const m = bwa.stats.monthly[i];
            if (!m) continue;
            rev += m.revenue; appExp += m.appExpenses; compExp += m.compExpenses;
            ust += m.umsatzsteuer; vst += m.vorsteuer;
            revPaid += (m.revenuePaid || 0); revOpen += (m.revenueOpen || 0);
            for (const [k, v] of Object.entries(m.categories)) cats[k] = (cats[k] || 0) + v;
        }

        const mapped = mapToBWA(rev, appExp, compExp, cats, ust, vst, vmaYtd);
        mapped.revenuePaid = revPaid;
        mapped.revenueOpen = revOpen;
        return mapped;
    });

    let previousBWA = $derived.by(() => {
        let prevRev = 0;
        let prevExp = 0;
        let hasPrev = false;

        if (viewMode === 'monthly') {
            if (selectedMonth > 1) {
                const m = bwa.stats.monthly[selectedMonth - 2];
                if (m) {
                    prevRev = m.revenue;
                    prevExp = m.compExpenses + m.appExpenses;
                    hasPrev = true;
                }
            }
        } else if (viewMode === 'quarterly') {
            if (selectedQuarter > 1) {
                const start = (selectedQuarter - 2) * 3;
                for (let i = start; i < start + 3; i++) {
                    const m = bwa.stats.monthly[i];
                    if (m) {
                        prevRev += m.revenue;
                        prevExp += (m.compExpenses + m.appExpenses);
                        hasPrev = true;
                    }
                }
            }
        }

        return {
            revenue: prevRev,
            expenses: prevExp,
            grossProfit: prevRev,
            ebitda: prevRev - prevExp,
            netIncome: prevRev - prevExp,
            hasPrev
        };
    });

    let currentTotalExp = $derived(currentBWA.materialCosts + currentBWA.personnelCosts + currentBWA.roomCosts + currentBWA.operatingTaxes + currentBWA.otherOperatingExpenses);
    let currentTaxEstimate = $derived(calculateTaxEstimate(currentBWA.netIncome, viewMode, currentBWA.umsatzsteuer, currentBWA.vorsteuer, currentBWA.operatingTaxes));

    function formatCurrency(val: number) { return (val || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' }); }
    function formatPercent(current: number, prev: number) {
        if (!prev) return '0,0%';
        const diff = ((current - prev) / Math.abs(prev)) * 100;
        return (diff > 0 ? '+' : '') + diff.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';
    }
    function getTrendColor(current: number, prev: number, invert = false) {
        if (!prev) return 'text-neutral-500';
        const diff = current - prev;
        if (diff === 0) return 'text-neutral-500';
        let isPositive = diff > 0;
        if (invert) isPositive = !isPositive;
        return isPositive ? 'text-emerald-600' : 'text-rose-600';
    }
    function formatBarAmount(val: number): string {
        if (Math.abs(val) >= 10000) {
            return (val > 0 ? '+' : '') + (val / 1000).toFixed(1).replace('.', ',') + 'k';
        } else if (Math.abs(val) >= 1000) {
            return (val > 0 ? '+' : '') + (val / 1000).toFixed(1).replace('.', ',') + 'k';
        } else {
            return (val > 0 ? '+' : '') + Math.round(val) + ' €';
        }
    }

    function openMonthBwa(month: number, year?: number) {
        selectedMonth = month;
        if (year) bwa.selectedYear = year;
        viewMode = 'monthly';
        bwaDetailModal?.showModal();
    }

    function handlePrint() {
        if (typeof window !== 'undefined') window.print();
    }
</script>

<div class="orga-page-header animate-enter print:hidden">
    <div class="flex flex-col xl:flex-row xl:items-end justify-between gap-4 w-full">
        <div>
            <h1 class="text-2xl font-black text-neutral-900 tracking-tight flex items-center gap-2"><span>📊</span> Firmenfinanzen & BWA</h1>
            <p class="text-sm text-neutral-500 font-medium mt-1">Smarte Prognosen und detaillierte statistische Auswertungen.</p>
        </div>
        
        <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {#if isGodMode}
                <div class="relative flex items-center bg-white border border-neutral-200/80 hover:border-indigo-200 rounded-xl px-3 py-2 transition-colors cursor-pointer shadow-sm shrink-0">
                    <span class="mr-1.5">🏢</span>
                    <select aria-label="Firma wählen" bind:value={bwa.selectedCompanyId} class="bg-transparent text-xs sm:text-sm font-bold text-neutral-800 outline-none cursor-pointer appearance-none pr-4 max-w-40 truncate">
                        <option value="all">Alle Firmen</option>
                        {#each orgaStore.company?.data || [] as comp}<option value={comp.id}>{comp.city} {comp.name ? `(${comp.name})` : ''}</option>{/each}
                    </select>
                </div>
            {/if}

            <!-- Tab Switcher -->
            <div class="flex bg-neutral-100 p-1 rounded-xl border border-neutral-200/80 shadow-inner shrink-0">
                <button onclick={() => activeTab = 'dashboard'} class="flex-1 sm:flex-none px-4 sm:px-5 py-2 text-xs font-bold rounded-lg transition-all {activeTab === 'dashboard' ? 'bg-white text-indigo-600 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}">BWA Dashboard</button>
                <button onclick={() => activeTab = 'vma'} class="flex-1 sm:flex-none px-4 sm:px-5 py-2 text-xs font-bold rounded-lg transition-all {activeTab === 'vma' ? 'bg-white text-indigo-600 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}">Reisekosten (VMA)</button>
            </div>
        </div>
    </div>
</div>

{#if orgaStore.invoices?.isLoading || orgaStore.appointments?.isLoading}
    <div class="flex justify-center py-20"><div class="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div></div>
{:else}
    <div class="mb-8 print:hidden">
        {#if activeTab === 'dashboard'}
        <!-- KPI Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8 animate-enter delay-100">
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div class="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-neutral-100 shadow-sm flex items-center justify-between hover:border-indigo-200 transition-all hover:shadow-md cursor-pointer group active:scale-[0.98] touch-manipulation" onclick={() => bwaDetailModal?.showModal()}>
                <div class="min-w-0 flex-1 pr-2">
                    <p class="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1 group-hover:text-indigo-500 transition-colors">Umsatz (Geflossen)</p>
                    <p class="text-xl sm:text-2xl font-black text-neutral-900 truncate">{formatCurrency(currentBWA.revenue)}</p>
                    <div class="mt-1 flex items-center gap-1.5 text-xs font-bold">
                        {#if previousBWA.hasPrev}
                            <span class={getTrendColor(currentBWA.revenue, previousBWA.revenue)}>{formatPercent(currentBWA.revenue, previousBWA.revenue)}</span>
                            <span class="text-neutral-300">vs Vorperiode</span>
                        {:else}
                            <span class="text-neutral-400 text-[10px] font-normal">Keine Vorperiode</span>
                        {/if}
                    </div>
                    <div class="mt-2 text-[10px] text-neutral-500 flex flex-col gap-0.5">
                        <span class="text-amber-500 font-semibold truncate" title="Ausstehende Zahlungen">⏳ Zzgl. {formatCurrency(currentBWA.revenueOpen)} offen</span>
                    </div>
                </div>
                <div class="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl sm:text-2xl shadow-inner shrink-0 group-hover:scale-110 transition-transform">💶</div>
            </div>
            
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div class="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-neutral-100 shadow-sm flex items-center justify-between hover:border-rose-200 transition-all hover:shadow-md cursor-pointer group active:scale-[0.98] touch-manipulation" onclick={() => bwaDetailModal?.showModal()}>
                <div class="min-w-0 flex-1 pr-2">
                    <p class="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1 group-hover:text-rose-500 transition-colors">Kosten</p>
                    <p class="text-xl sm:text-2xl font-black text-neutral-900 truncate">{formatCurrency(currentTotalExp)}</p>
                    <div class="mt-1 flex items-center gap-1.5 text-xs font-bold">
                        {#if previousBWA.hasPrev}
                            <span class={getTrendColor(currentTotalExp, previousBWA.expenses, true)}>{formatPercent(currentTotalExp, previousBWA.expenses)}</span>
                            <span class="text-neutral-300">vs Vorperiode</span>
                        {:else}
                            <span class="text-neutral-400 text-[10px] font-normal">Keine Vorperiode</span>
                        {/if}
                    </div>
                </div>
                <div class="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center text-xl sm:text-2xl shadow-inner shrink-0 group-hover:scale-110 transition-transform">📉</div>
            </div>
            
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div class="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-neutral-100 shadow-sm flex items-center justify-between hover:border-purple-200 transition-all hover:shadow-md cursor-pointer group active:scale-[0.98] touch-manipulation" onclick={() => bwaDetailModal?.showModal()}>
                <div class="min-w-0 flex-1 pr-2">
                    <p class="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1 group-hover:text-purple-500 transition-colors">EBITDA</p>
                    <p class="text-xl sm:text-2xl font-black text-neutral-900 truncate">{formatCurrency(currentBWA.ebitda)}</p>
                    <div class="mt-1 flex items-center gap-1.5 text-xs font-bold">
                        {#if previousBWA.hasPrev}
                            <span class={getTrendColor(currentBWA.ebitda, previousBWA.ebitda)}>{formatPercent(currentBWA.ebitda, previousBWA.ebitda)}</span>
                            <span class="text-neutral-300">vs Vorperiode</span>
                        {:else}
                            <span class="text-neutral-400 text-[10px] font-normal">Keine Vorperiode</span>
                        {/if}
                    </div>
                </div>
                <div class="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center text-xl sm:text-2xl shadow-inner shrink-0 group-hover:scale-110 transition-transform">📊</div>
            </div>
            
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div class="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-neutral-100 shadow-sm flex items-center justify-between transition-all hover:shadow-md cursor-pointer group active:scale-[0.98] touch-manipulation {currentBWA.netIncome >= 0 ? 'hover:border-emerald-200' : 'hover:border-rose-200'}" onclick={() => bwaDetailModal?.showModal()}>
                <div class="min-w-0 flex-1 pr-2">
                    <p class="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1 transition-colors {currentBWA.netIncome >= 0 ? 'group-hover:text-emerald-500' : 'group-hover:text-rose-500'}">Gewinn</p>
                    <p class="text-xl sm:text-2xl font-black {currentBWA.netIncome >= 0 ? 'text-emerald-600' : 'text-rose-600'} truncate">{formatCurrency(currentBWA.netIncome)}</p>
                    <div class="mt-1 flex items-center gap-1.5 text-xs font-bold">
                        {#if previousBWA.hasPrev}
                            <span class={getTrendColor(currentBWA.netIncome, previousBWA.netIncome)}>{formatPercent(currentBWA.netIncome, previousBWA.netIncome)}</span>
                            <span class="text-neutral-300">vs Vorperiode</span>
                        {:else}
                            <span class="text-neutral-400 text-[10px] font-normal">Keine Vorperiode</span>
                        {/if}
                    </div>
                </div>
                <div class="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl {currentBWA.netIncome >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'} flex items-center justify-center text-xl sm:text-2xl shadow-inner shrink-0 group-hover:scale-110 transition-transform">📈</div>
            </div>
        </div>

        <!-- Große Abrechnungs- & Zeitraumleiste (Über die gesamte Breite gestreckt) -->
        <div class="bg-white rounded-2xl sm:rounded-3xl border border-neutral-100 shadow-sm p-3.5 sm:p-6 mb-6 sm:mb-8 animate-enter delay-150">
            <!-- Top Row: Ansichts-Umschalter & Jahr & Drucken -->
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 pb-3 sm:pb-4 border-b border-neutral-100">
                <!-- Ansichts-Modus Segmented Control -->
                <div class="flex flex-wrap items-center gap-1 sm:gap-1.5 bg-neutral-100/90 p-1 sm:p-1.5 rounded-2xl shadow-inner w-full md:w-auto">
                    <button 
                        onclick={() => viewMode = 'monthly'} 
                        class="flex-1 md:flex-none px-2.5 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all text-center touch-manipulation active:scale-95 {viewMode === 'monthly' ? 'bg-white text-indigo-600 shadow-sm' : 'text-neutral-500 hover:text-neutral-800'}"
                    >
                        📅 Monatlich
                    </button>
                    <button 
                        onclick={() => viewMode = 'quarterly'} 
                        class="flex-1 md:flex-none px-2.5 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all text-center touch-manipulation active:scale-95 {viewMode === 'quarterly' ? 'bg-white text-indigo-600 shadow-sm' : 'text-neutral-500 hover:text-neutral-800'}"
                    >
                        📊 Quartal
                    </button>
                    <button 
                        onclick={() => viewMode = 'yearly'} 
                        class="flex-1 md:flex-none px-2.5 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all text-center touch-manipulation active:scale-95 {viewMode === 'yearly' ? 'bg-white text-indigo-600 shadow-sm' : 'text-neutral-500 hover:text-neutral-800'}"
                    >
                        📆 Jährlich
                    </button>
                    <button 
                        type="button"
                        onclick={() => unifiedFinanceModal?.open(undefined, bwa.selectedYear)} 
                        class="flex-1 md:flex-none px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all text-center touch-manipulation active:scale-95 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md shadow-purple-500/20 flex items-center justify-center gap-1.5"
                        title="Zukunftsprognose öffnen (BWA, Steuern & Cashflow mit Gemini 3.8 Flash KI-Spekulation)"
                    >
                        <span class="text-sm">🔮</span>
                        <span>Prognose</span>
                        <span class="text-[9px] bg-white/20 text-white px-1.5 py-0.5 rounded-md font-extrabold uppercase tracking-wider">KI</span>
                    </button>
                </div>

                <!-- Rechts: Jahr-Auswahl & Drucken -->
                <div class="flex items-center justify-between md:justify-end gap-2 sm:gap-3 w-full md:w-auto">
                    <!-- Jahr-Steuerung -->
                    <div class="flex items-center bg-neutral-50 border border-neutral-200/70 rounded-2xl p-1 shadow-sm">
                        <button 
                            onclick={() => bwa.selectedYear--} 
                            class="w-8 h-8 rounded-xl flex items-center justify-center text-neutral-500 hover:text-indigo-600 hover:bg-white transition-colors touch-manipulation active:scale-90"
                            title="Vorheriges Jahr"
                        >
                            ◀
                        </button>
                        <select 
                            bind:value={bwa.selectedYear} 
                            aria-label="Geschäftsjahr" 
                            class="bg-transparent text-sm sm:text-base font-black text-neutral-900 px-2 sm:px-3 outline-none cursor-pointer text-center"
                        >
                            {#each bwa.availableYears as year}
                                <option value={year}>{year}</option>
                            {/each}
                        </select>
                        <button 
                            onclick={() => bwa.selectedYear++} 
                            class="w-8 h-8 rounded-xl flex items-center justify-center text-neutral-500 hover:text-indigo-600 hover:bg-white transition-colors touch-manipulation active:scale-90"
                            title="Nächstes Jahr"
                        >
                            ▶
                        </button>
                    </div>

                    <!-- PDF / Drucken -->
                    <button 
                        onclick={handlePrint} 
                        class="px-3 sm:px-4 py-2 sm:py-2.5 bg-neutral-50 hover:bg-indigo-50 border border-neutral-200/70 hover:border-indigo-200 text-neutral-700 hover:text-indigo-600 font-bold text-xs sm:text-sm rounded-2xl shadow-sm transition-all flex items-center gap-1.5 sm:gap-2 touch-manipulation active:scale-95"
                        title="BWA drucken oder als PDF exportieren"
                    >
                        <span>🖨️</span>
                        <span class="hidden sm:inline">Drucken / PDF</span>
                    </button>
                </div>
            </div>

            <!-- Bottom Row: Detail-Auswahl für Monate bzw. Quartale -->
            <div class="pt-3 sm:pt-4">
                {#if viewMode === 'monthly'}
                    <div class="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-1.5 sm:gap-2">
                        {#each Array.from({length: 12}) as _, i}
                            {@const mNum = i + 1}
                            {@const mName = new Date(2000, i, 1).toLocaleString('de-DE', { month: 'short' })}
                            {@const isSelected = selectedMonth === mNum}
                            <button 
                                onclick={() => selectedMonth = mNum}
                                class="min-h-[46px] flex flex-col items-center justify-center rounded-2xl text-xs sm:text-sm font-black transition-all active:scale-95 touch-manipulation {isSelected ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 ring-2 ring-indigo-600 ring-offset-2' : 'bg-neutral-50 hover:bg-indigo-50 text-neutral-700 hover:text-indigo-600 border border-neutral-100'}"
                            >
                                <span>{mName}</span>
                                <span class="text-[9px] font-medium {isSelected ? 'text-indigo-100' : 'text-neutral-400'}">{mNum < 10 ? `0${mNum}` : mNum}</span>
                            </button>
                        {/each}
                    </div>
                {:else if viewMode === 'quarterly'}
                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                        {#each [
                            { q: 1, label: 'Q1', desc: 'Januar – März' },
                            { q: 2, label: 'Q2', desc: 'April – Juni' },
                            { q: 3, label: 'Q3', desc: 'Juli – September' },
                            { q: 4, label: 'Q4', desc: 'Oktober – Dezember' }
                        ] as qItem}
                            {@const isSelected = selectedQuarter === qItem.q}
                            <button 
                                onclick={() => selectedQuarter = qItem.q}
                                class="min-h-[52px] p-2.5 sm:p-3 rounded-2xl flex flex-col sm:flex-row items-center justify-between text-left transition-all active:scale-95 touch-manipulation {isSelected ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 ring-2 ring-indigo-600 ring-offset-2' : 'bg-neutral-50 hover:bg-indigo-50 text-neutral-700 hover:text-indigo-600 border border-neutral-100'}"
                            >
                                <span class="font-black text-sm sm:text-base">{qItem.label}</span>
                                <span class="text-[10px] sm:text-xs font-medium {isSelected ? 'text-indigo-100' : 'text-neutral-400'}">{qItem.desc}</span>
                            </button>
                        {/each}
                    </div>
                {:else}
                    <div class="flex items-center justify-center p-3 bg-neutral-50 rounded-2xl border border-neutral-100 text-neutral-600 text-xs sm:text-sm font-bold text-center">
                        <span>📆 Vollständiges Geschäftsjahr: 01. Januar – 31. Dezember {bwa.selectedYear}</span>
                    </div>
                {/if}
            </div>
        </div>

        <!-- Middle Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 mb-6 sm:mb-8 animate-enter delay-200">
            <!-- Detaillierte Finanz-Balance -->
            <div class="lg:col-span-5 bg-white rounded-3xl border border-neutral-100 shadow-sm flex flex-col p-5 sm:p-6 group hover:shadow-md transition-shadow justify-between">
                <div>
                    <!-- Header -->
                    <div class="flex items-center justify-between mb-4">
                        <div class="flex items-center gap-3">
                            <span class="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-base shadow-inner shrink-0">⚖️</span>
                            <div>
                                <h3 class="font-bold text-neutral-900 text-base sm:text-lg leading-tight">Finanz-Balance</h3>
                                <p class="text-[11px] text-neutral-400 font-medium">Echtzeit-Gegenüberstellung Erlöse vs. Kosten</p>
                            </div>
                        </div>
                        <div class="flex items-center gap-2">
                            {#if currentBWA && currentBWA.revenue > 0}
                                {@const margin = (currentBWA.netIncome / currentBWA.revenue) * 100}
                                <span class="px-2.5 py-1 rounded-xl text-xs font-black {margin >= 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}" title="Umsatzrendite">
                                    {margin >= 0 ? '+' : ''}{margin.toFixed(1)}% Marge
                                </span>
                            {/if}
                            <button onclick={() => bwaDetailModal?.showModal()} class="w-9 h-9 rounded-xl bg-neutral-50 hover:bg-indigo-50 text-neutral-400 hover:text-indigo-600 flex items-center justify-center transition-colors shrink-0" title="Detaillierte BWA öffnen">
                                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                            </button>
                        </div>
                    </div>

                    {#if currentBWA}
                        {@const expTotal = currentBWA.materialCosts + currentBWA.personnelCosts + currentBWA.roomCosts + currentBWA.operatingTaxes + currentBWA.otherOperatingExpenses}
                        {@const totalExpSafe = expTotal || 1}
                        
                        <!-- Vorläufiges Ergebnis Hero Display -->
                        <div class="p-4 rounded-2xl mb-4 border {currentBWA.netIncome >= 0 ? 'bg-emerald-50/50 border-emerald-100/80' : 'bg-rose-50/50 border-rose-100/80'} flex items-center justify-between">
                            <div>
                                <span class="text-[10px] font-bold uppercase tracking-wider block {currentBWA.netIncome >= 0 ? 'text-emerald-700' : 'text-rose-700'}">
                                    Vorläufiges Ergebnis {currentBWA.netIncome >= 0 ? '(Überschuss)' : '(Verlust)'}
                                </span>
                                <span class="text-2xl sm:text-3xl font-black {currentBWA.netIncome >= 0 ? 'text-emerald-600' : 'text-rose-600'}">
                                    {formatCurrency(currentBWA.netIncome)}
                                </span>
                            </div>
                            <div class="text-right text-xs">
                                <span class="text-neutral-400 text-[10px] block font-medium">Deckungsbeitrag</span>
                                <span class="font-bold text-neutral-700">{formatCurrency(currentBWA.grossProfit)}</span>
                            </div>
                        </div>

                        <!-- Umsatz vs. Kosten Balken -->
                        <div class="mb-4">
                            <div class="flex items-center justify-between text-xs font-bold mb-1.5">
                                <span class="text-indigo-600 flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-indigo-500"></span> Umsatz: {formatCurrency(currentBWA.revenue)}</span>
                                <span class="text-rose-600 flex items-center gap-1.5">Kosten: {formatCurrency(expTotal)} <span class="w-2 h-2 rounded-full bg-rose-500"></span></span>
                            </div>
                            <div class="w-full h-3.5 bg-neutral-100 rounded-full overflow-hidden flex shadow-inner">
                                <div class="h-full bg-indigo-500 transition-all duration-1000" style="width: {currentBWA.revenue > 0 ? Math.min(100, (currentBWA.revenue / (Math.max(currentBWA.revenue, expTotal) || 1)) * 100) : 0}%" title="Umsatz"></div>
                                <div class="h-full bg-rose-500 transition-all duration-1000" style="width: {expTotal > 0 ? Math.min(100, (expTotal / (Math.max(currentBWA.revenue, expTotal) || 1)) * 100) : 0}%" title="Kosten"></div>
                            </div>
                        </div>

                        <!-- Errechnete Steuern & Reale Abgaben im Detail -->
                        <div class="space-y-2.5 pt-3 border-t border-neutral-100">
                            <div class="flex items-center justify-between">
                                <span class="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Reale Steuerabgaben (Details)</span>
                                {#if currentTaxEstimate.effectiveRate > 0}
                                    <span class="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100/70">
                                        ~{currentTaxEstimate.effectiveRate.toFixed(1)}% Ertragssteuerquote
                                    </span>
                                {/if}
                            </div>
                            
                            <!-- 1. Ertragssteuern Gruppe -->
                            <div class="bg-neutral-50/60 p-2.5 rounded-xl border border-neutral-100 space-y-1.5">
                                <div class="text-[10px] font-bold text-neutral-400 uppercase flex items-center justify-between">
                                    <span>Ertragssteuern (auf Gewinn)</span>
                                    <span class="font-black text-neutral-700">{formatCurrency(currentTaxEstimate.ertragsteuern)}</span>
                                </div>
                                
                                <!-- Einkommensteuer -->
                                <div class="flex items-center justify-between text-xs">
                                    <span class="text-neutral-600 font-medium flex items-center gap-2">
                                        <span class="w-2 h-2 rounded-full bg-blue-500"></span>
                                        Einkommensteuer (ESt)
                                    </span>
                                    <div class="flex items-center gap-1.5">
                                        {#if currentTaxEstimate.gewStAnrechnung > 0}
                                            <span class="text-[9px] text-emerald-600 font-semibold" title="§ 35 EStG GewSt-Anrechnung">
                                                (-{formatCurrency(currentTaxEstimate.gewStAnrechnung)} §35)
                                            </span>
                                        {/if}
                                        <span class="font-bold text-neutral-900">{formatCurrency(currentTaxEstimate.einkommensteuer)}</span>
                                    </div>
                                </div>

                                <!-- Gewerbesteuer -->
                                <div class="flex items-center justify-between text-xs">
                                    <span class="text-neutral-600 font-medium flex items-center gap-2">
                                        <span class="w-2 h-2 rounded-full bg-purple-500"></span>
                                        Gewerbesteuer (GewSt)
                                    </span>
                                    <div class="flex items-center gap-1.5">
                                        <span class="text-[9px] text-neutral-400" title="Jährlicher Freibetrag 24.500 €">
                                            (FB 24,5k)
                                        </span>
                                        <span class="font-bold text-neutral-900">{formatCurrency(currentTaxEstimate.gewerbesteuer)}</span>
                                    </div>
                                </div>

                                {#if currentTaxEstimate.soli > 0}
                                    <!-- Solidaritätszuschlag -->
                                    <div class="flex items-center justify-between text-xs">
                                        <span class="text-neutral-600 font-medium flex items-center gap-2">
                                            <span class="w-2 h-2 rounded-full bg-indigo-400"></span>
                                            Solidaritätszuschlag
                                        </span>
                                        <span class="font-bold text-neutral-900">{formatCurrency(currentTaxEstimate.soli)}</span>
                                    </div>
                                {/if}
                            </div>

                            <!-- 2. Umsatzsteuer-Zahllast Gruppe (Reale Liquiditätsabgabe an das Finanzamt) -->
                            <div class="bg-neutral-50/60 p-2.5 rounded-xl border border-neutral-100 space-y-1.5">
                                <div class="text-[10px] font-bold text-neutral-400 uppercase flex items-center justify-between">
                                    <span>Umsatzsteuer-Zahllast (UStVA)</span>
                                    <span class="font-black {currentTaxEstimate.ustZahllast >= 0 ? 'text-rose-600' : 'text-emerald-600'}">
                                        {currentTaxEstimate.ustZahllast >= 0 ? formatCurrency(currentTaxEstimate.ustZahllast) : `+${formatCurrency(Math.abs(currentTaxEstimate.ustZahllast))} Erstattung`}
                                    </span>
                                </div>
                                <div class="flex items-center justify-between text-xs text-neutral-500">
                                    <span class="flex items-center gap-1.5">
                                        <span class="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                                        Vereinnahmte USt (Kunden):
                                    </span>
                                    <span class="font-semibold text-neutral-700">{formatCurrency(currentTaxEstimate.umsatzsteuer)}</span>
                                </div>
                                <div class="flex items-center justify-between text-xs text-neutral-500">
                                    <span class="flex items-center gap-1.5">
                                        <span class="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                                        Gezahlte Vorsteuer (Lieferanten):
                                    </span>
                                    <span class="font-semibold text-neutral-700">{formatCurrency(currentTaxEstimate.vorsteuer)}</span>
                                </div>
                            </div>

                            {#if currentTaxEstimate.operatingTaxes > 0}
                                <!-- Betriebliche Steuern -->
                                <div class="flex items-center justify-between text-xs px-1">
                                    <span class="text-neutral-500 font-medium">Betriebliche Steuern (Kfz, Grundsteuer etc.):</span>
                                    <span class="font-bold text-neutral-800">{formatCurrency(currentTaxEstimate.operatingTaxes)}</span>
                                </div>
                            {/if}

                            <!-- Gesamte reale Abgaben an das Finanzamt & Reingewinn -->
                            <div class="p-3 bg-neutral-900 text-white rounded-2xl border border-neutral-800 space-y-2 mt-2">
                                <div class="flex items-center justify-between text-xs">
                                    <span class="text-neutral-400 font-medium">Reale Finanzamt-Abgaben gesamt:</span>
                                    <span class="font-black text-rose-400 text-sm">{formatCurrency(currentTaxEstimate.gesamteAbgaben)}</span>
                                </div>
                                <div class="flex items-center justify-between text-xs border-t border-neutral-800 pt-2">
                                    <div>
                                        <span class="text-[10px] text-neutral-400 uppercase tracking-wider block">Reingewinn (nach Steuern)</span>
                                        <span class="text-base font-black {currentTaxEstimate.netAfterTaxes >= 0 ? 'text-emerald-400' : 'text-rose-400'}">
                                            {formatCurrency(currentTaxEstimate.netAfterTaxes)}
                                        </span>
                                    </div>
                                    <div class="text-right">
                                        <span class="text-[10px] text-neutral-400 uppercase tracking-wider block" title="Cash nach USt-Zahllast und Steuerrücklage">Verbleibende Liquidität</span>
                                        <span class="text-base font-black {currentTaxEstimate.liquiditaetNachAllenAbgaben >= 0 ? 'text-indigo-300' : 'text-rose-400'}">
                                            {formatCurrency(currentTaxEstimate.liquiditaetNachAllenAbgaben)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    {/if}
                </div>

                {#if currentUnbilled > 0}
                    <!-- WIP / Unbilled Revenue InfoBox -->
                    <div class="mt-4 pt-3 border-t border-neutral-100">
                        <div class="flex items-center justify-between bg-amber-50/50 p-2.5 rounded-2xl border border-amber-100/60">
                            <div class="flex items-center gap-2.5">
                                <span class="w-7 h-7 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center text-xs shadow-inner shrink-0">⏳</span>
                                <div>
                                    <span class="text-[11px] font-bold text-amber-900 block leading-tight">Offene Leistung (WIP)</span>
                                    <span class="text-[9px] text-amber-700/80 font-medium">Aus nicht abgerechneten Terminen</span>
                                </div>
                            </div>
                            <span class="text-sm font-black text-amber-600 shrink-0">{formatCurrency(currentUnbilled)}</span>
                        </div>
                    </div>
                {/if}
            </div>
            
            <!-- EBITDA Forecast / Finanzprognose -->
            <div class="lg:col-span-7 bg-white rounded-2xl sm:rounded-3xl border border-neutral-100 shadow-sm flex flex-col p-4 sm:p-6 group hover:shadow-md transition-shadow relative">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2.5 sm:gap-3">
                    <h3 class="font-bold text-neutral-900 flex items-center gap-2.5 sm:gap-3 text-base sm:text-lg">
                        <span class="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-sm sm:text-base shadow-inner shrink-0">🔮</span> 
                        Finanzprognose
                    </h3>
                    <div class="flex items-center gap-2 self-start sm:self-auto">
                        <div class="flex bg-neutral-100 p-1 rounded-xl border border-neutral-200/70 shadow-inner shrink-0">
                            <button onclick={() => forecastScenario = 'pessimistic'} class="px-2 sm:px-2.5 py-1 text-[10px] sm:text-xs font-bold rounded-lg transition-colors touch-manipulation active:scale-95 {forecastScenario === 'pessimistic' ? 'bg-white shadow-sm text-purple-600' : 'text-neutral-500 hover:text-neutral-700'}" title="Pessimistisch (-15%)">📉 -15%</button>
                            <button onclick={() => forecastScenario = 'realistic'} class="px-2 sm:px-2.5 py-1 text-[10px] sm:text-xs font-bold rounded-lg transition-colors touch-manipulation active:scale-95 {forecastScenario === 'realistic' ? 'bg-white shadow-sm text-purple-600' : 'text-neutral-500 hover:text-neutral-700'}" title="Realistisch">⚖️ Real</button>
                            <button onclick={() => forecastScenario = 'optimistic'} class="px-2 sm:px-2.5 py-1 text-[10px] sm:text-xs font-bold rounded-lg transition-colors touch-manipulation active:scale-95 {forecastScenario === 'optimistic' ? 'bg-white shadow-sm text-purple-600' : 'text-neutral-500 hover:text-neutral-700'}" title="Optimistisch (+15%)">📈 +15%</button>
                            <button onclick={() => unifiedFinanceModal?.open(undefined, bwa.selectedYear)} class="px-2 sm:px-2.5 py-1 text-[10px] sm:text-xs font-bold rounded-lg transition-colors touch-manipulation active:scale-95 text-indigo-600 hover:bg-white/80 flex items-center gap-1" title="Vollständige KI-Finanzspekulation öffnen">✨ Gemini 3.8</button>
                        </div>
                        <button onclick={() => unifiedFinanceModal?.open(undefined, bwa.selectedYear)} class="w-9 h-9 rounded-xl bg-neutral-50 hover:bg-purple-50 text-neutral-400 hover:text-purple-600 flex items-center justify-center transition-colors shrink-0 touch-manipulation active:scale-90" title="Detaillierte Gesamt-Finanzprognose öffnen">
                            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                        </button>
                    </div>
                </div>

                <div class="flex items-center gap-3 text-[10px] font-bold text-neutral-400 mb-2">
                    <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-emerald-500"></span> Ist</span>
                    <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-indigo-500"></span> Prog</span>
                    <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-rose-500"></span> Verlust</span>
                    <span class="text-neutral-300 ml-auto hidden sm:inline text-[9px]">💡 Klick = Monats-BWA</span>
                </div>

                {#if bwa.forecastStats.length > 0}
                    {@const multiplier = forecastScenario === 'optimistic' ? 1.15 : (forecastScenario === 'pessimistic' ? 0.85 : 1)}
                    {@const maxVal = Math.max(...bwa.forecastStats.map((f: any) => Math.abs((f.isHistorical ? f.revenue : (f.revenue * multiplier)) - f.expenses)), 1)}
                    
                    <div class="w-full h-44 flex gap-2 items-end overflow-x-auto custom-scrollbar touch-pan-x overscroll-x-contain pb-2 pt-6 flex-1 select-none">
                        {#each bwa.forecastStats as f}
                            {@const rev = f.isHistorical ? f.revenue : (f.revenue * multiplier)}
                            {@const val = rev - f.expenses}
                            {@const isNegative = val < 0}
                            {@const barHeightPct = Math.max(8, Math.min(100, Math.round((Math.abs(val) / maxVal) * 100)))}
                            
                            <button 
                                onclick={() => openMonthBwa(f.monthIndex + 1, f.year)}
                                class="flex flex-col items-center shrink-0 group/bar flex-1 min-w-[42px] sm:min-w-[48px] h-full justify-end cursor-pointer transition-transform hover:-translate-y-1 active:scale-95 touch-manipulation focus:outline-none"
                                title="{f.month}: {f.isHistorical ? 'Ist' : 'Prognose'} {formatCurrency(val)} – Klick für Monats-BWA"
                            >
                                <!-- Zahl klein über dem Balken -->
                                <span class="text-[9px] font-black leading-none mb-1 whitespace-nowrap {isNegative ? 'text-rose-600' : (f.isHistorical ? 'text-emerald-600' : 'text-indigo-600')}">
                                    {formatBarAmount(val)}
                                </span>

                                <!-- Der Balken -->
                                <div class="w-full h-24 sm:h-28 flex items-end justify-center relative">
                                    <div 
                                        class="w-full rounded-t-lg transition-all shadow-sm {isNegative ? 'bg-rose-500 group-hover/bar:bg-rose-600' : (f.isHistorical ? 'bg-emerald-500 group-hover/bar:bg-emerald-600' : 'bg-indigo-500 group-hover/bar:bg-indigo-600')}" 
                                        style="height: {barHeightPct}%;"
                                    ></div>
                                </div>

                                <!-- Monats-Name & Typ -->
                                <div class="flex flex-col items-center mt-1.5 w-full">
                                    <span class="text-[10px] font-bold text-neutral-700 group-hover/bar:text-indigo-600 transition-colors truncate text-center">
                                        {f.monthShort}
                                    </span>
                                    <span class="text-[7px] font-bold uppercase px-0.5 rounded {f.isHistorical ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-100 text-indigo-800'}">
                                        {f.isHistorical ? 'Ist' : 'Prog'}
                                    </span>
                                </div>
                            </button>
                        {/each}
                    </div>
                {/if}
            </div>
        </div>

        <!-- Steuer-Prognose Diagramm (Zusätzliche Komponente) -->
        <div class="mb-6 sm:mb-8 animate-enter delay-250">
            <BwaTaxForecastWidget 
                {bwa} 
                bind:selectedMonth
                selectedYear={bwa.selectedYear}
                {viewMode}
                {currentBWA}
                {currentTaxEstimate}
                onSelectMonth={openMonthBwa} 
            />
        </div>

        <!-- Bottom Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-6 animate-enter delay-300">
        <!-- Card: Klienten Ranking -->
        <div class="bg-white rounded-2xl sm:rounded-3xl border border-neutral-100 shadow-sm flex flex-col p-4 sm:p-5 group hover:shadow-md transition-shadow">
            <div class="flex items-center justify-between mb-3 sm:mb-4">
                <h3 class="font-bold text-neutral-900 flex items-center gap-2.5 sm:gap-3 text-base sm:text-lg"><span class="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-sm sm:text-base shadow-inner shrink-0">🏆</span> Top Klienten</h3>
                <button onclick={() => clientsModal?.showModal()} class="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-neutral-50 hover:bg-amber-50 text-neutral-400 hover:text-amber-600 flex items-center justify-center transition-colors shrink-0 touch-manipulation active:scale-90" title="Gesamtes Ranking ansehen">
                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                </button>
            </div>
            <div class="flex-1 flex flex-col gap-2">
                {#each bwa.stats.clientStats.slice(0, 3) as c, i}
                    <button onclick={() => clientsModal?.showModal()} class="w-full text-left flex items-center justify-between p-2 rounded-xl hover:bg-neutral-50 border border-transparent hover:border-neutral-100 transition-colors touch-manipulation active:scale-[0.98]">
                        <div class="flex items-center gap-2.5 min-w-0 pr-2">
                            <span class="text-xs font-black text-neutral-400 w-4 sm:w-5">#{i+1}</span>
                            <span class="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center text-xs font-bold shrink-0">👤</span>
                            <span class="text-xs sm:text-sm font-bold text-neutral-800 truncate">{c.name}</span>
                        </div>
                        <span class="text-xs sm:text-sm font-bold text-indigo-600 shrink-0">{c.revenue.toFixed(0)} €</span>
                    </button>
                {/each}
                {#if bwa.stats.clientStats.length === 0}
                    <p class="text-xs sm:text-sm text-neutral-400 italic text-center py-4">Keine Daten</p>
                {/if}
            </div>
        </div>

        <!-- Card: Team Performance -->
        <div class="bg-white rounded-2xl sm:rounded-3xl border border-neutral-100 shadow-sm flex flex-col p-4 sm:p-5 group hover:shadow-md transition-shadow">
            <div class="flex items-center justify-between mb-3 sm:mb-4">
                <h3 class="font-bold text-neutral-900 flex items-center gap-2.5 sm:gap-3 text-base sm:text-lg"><span class="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center text-sm sm:text-base shadow-inner shrink-0">👥</span> Team-Leistung</h3>
                <button onclick={() => teamModal?.showModal()} class="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-neutral-50 hover:bg-sky-50 text-neutral-400 hover:text-sky-600 flex items-center justify-center transition-colors shrink-0 touch-manipulation active:scale-90" title="Team Details">
                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                </button>
            </div>
            <div class="flex-1 flex flex-col gap-2">
                {#each bwa.stats.userStats.slice(0, 3) as u, i}
                    <button onclick={() => teamModal?.showModal()} class="w-full text-left flex items-center justify-between p-2 rounded-xl hover:bg-neutral-50 border border-transparent hover:border-neutral-100 transition-colors touch-manipulation active:scale-[0.98]">
                        <div class="flex items-center gap-2.5 min-w-0 pr-2">
                            <span class="w-6 h-6 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center text-xs font-bold shrink-0">{u.name?.charAt(0) || '?'}</span>
                            <span class="text-xs sm:text-sm font-bold text-neutral-800 truncate">{u.name || 'Unbekannt'}</span>
                        </div>
                        <span class="text-xs sm:text-sm font-bold text-emerald-600 shrink-0">{u.hours.toFixed(1).replace('.', ',')} h</span>
                    </button>
                {/each}
                {#if bwa.stats.userStats.length === 0}
                    <p class="text-xs sm:text-sm text-neutral-400 italic text-center py-4">Keine Daten</p>
                {/if}
            </div>
        </div>

        <!-- Card: Ausgaben -->
        <div class="bg-white rounded-2xl sm:rounded-3xl border border-neutral-100 shadow-sm flex flex-col p-4 sm:p-5 group hover:shadow-md transition-shadow">
            <div class="flex items-center justify-between mb-3 sm:mb-4">
                <h3 class="font-bold text-neutral-900 flex items-center gap-2.5 sm:gap-3 text-base sm:text-lg"><span class="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center text-sm sm:text-base shadow-inner shrink-0">🧾</span> Letzte Ausgaben</h3>
                <div class="flex items-center gap-1.5 sm:gap-2">
                    <button onclick={() => expenseModal?.showModal()} class="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center transition-colors font-bold text-lg sm:text-xl shrink-0 touch-manipulation active:scale-90" title="Neue Ausgabe hinzufügen">+</button>
                    <button onclick={() => expensesListModal?.showModal()} class="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-neutral-50 hover:bg-rose-50 text-neutral-400 hover:text-rose-600 flex items-center justify-center transition-colors shrink-0 touch-manipulation active:scale-90" title="Alle Ausgaben ansehen">
                        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                    </button>
                </div>
            </div>
            <div class="flex-1 flex flex-col gap-2">
                {#each bwa.companyExpenses.slice(0, 3) as exp}
                    <button onclick={() => expensesListModal?.showModal()} class="w-full text-left flex items-center justify-between gap-2 p-2 rounded-xl hover:bg-neutral-50 border border-transparent hover:border-neutral-100 transition-colors touch-manipulation active:scale-[0.98]">
                        <div class="flex items-center gap-2.5 min-w-0 pr-2">
                            <span class="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center text-xs font-bold shrink-0">🧾</span>
                            <div class="min-w-0">
                                <p class="text-xs sm:text-sm font-bold text-neutral-800 truncate">{exp.supplier || 'Unbekannt'}</p>
                                <p class="text-[10px] text-neutral-500 truncate">{new Date(exp.date).toLocaleDateString('de-DE')} • {exp.category}</p>
                            </div>
                        </div>
                        <span class="text-xs sm:text-sm font-bold text-rose-600 shrink-0">{exp.amount.toFixed(2).replace('.', ',')} €</span>
                    </button>
                {/each}
                {#if bwa.companyExpenses.length === 0}
                    <p class="text-xs sm:text-sm text-neutral-400 italic text-center py-4">Keine Ausgaben erfasst</p>
                {/if}
            </div>
        </div>

        <!-- Card: Reisekosten VMA (Live-Widget) -->
        <div class="bg-white rounded-2xl sm:rounded-3xl border border-neutral-100 shadow-sm flex flex-col p-4 sm:p-5 group hover:shadow-md transition-shadow">
            <div class="flex items-center justify-between mb-3 sm:mb-4">
                <h3 class="font-bold text-neutral-900 flex items-center gap-2.5 sm:gap-3 text-base sm:text-lg"><span class="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-sm sm:text-base shadow-inner shrink-0">🚗</span> Reisekosten (VMA)</h3>
                <div class="flex items-center gap-1.5">
                    <button onclick={updateVma} disabled={isUpdatingVma} class="w-9 h-9 rounded-full bg-neutral-50 hover:bg-indigo-50 text-neutral-500 hover:text-indigo-600 flex items-center justify-center transition-colors shrink-0 touch-manipulation active:scale-90" title="Reisekosten jetzt aktualisieren">
                        <span class="{isUpdatingVma ? 'animate-spin inline-block' : ''} text-sm">🔄</span>
                    </button>
                    <button onclick={() => activeTab = 'vma'} class="w-9 h-9 rounded-full bg-neutral-50 hover:bg-indigo-50 text-neutral-400 hover:text-indigo-600 flex items-center justify-center transition-colors shrink-0 touch-manipulation active:scale-90" title="Alle Reisekosten ansehen">
                        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                    </button>
                </div>
            </div>
            <div class="flex-1 flex flex-col justify-center items-center text-center p-3 bg-neutral-50 rounded-2xl border border-dashed border-neutral-200">
                <p class="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">{new Date().toLocaleString('de-DE', { month: 'long' })} (Laufend)</p>
                <p class="text-2xl sm:text-3xl font-black text-indigo-600 truncate max-w-full">{formatCurrency(vmaCurrentMonth)}</p>
                <p class="text-[9px] text-neutral-500 font-medium mt-1 leading-tight">Berechnete Pauschalen für Verpflegung & Kilometer.</p>
                <div class="flex flex-wrap items-center justify-center gap-2 mt-3">
                    <button onclick={updateVma} disabled={isUpdatingVma} class="min-h-[38px] px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50 touch-manipulation active:scale-95">
                        <span class="{isUpdatingVma ? 'animate-spin inline-block' : ''}">🔄</span> Aktualisieren
                    </button>
                    {#if vmaCurrentMonth > 0}
                        <button onclick={() => activeTab = 'vma'} class="text-[10px] font-black uppercase text-indigo-500 hover:text-indigo-700 transition-colors p-1.5 touch-manipulation">Details prüfen &rarr;</button>
                    {/if}
                </div>
                {#if lastVmaUpdate}
                    <span class="text-[9px] text-neutral-400 font-semibold mt-2">{lastVmaUpdate}</span>
                {/if}
            </div>
        </div>
    </div>
        {:else}
            <div class="animate-enter"><VmaManager /></div>
        {/if}
    </div>

    <!-- PRINT ONLY BWA -->
    {#if activeTab === 'dashboard'}
    <div class="hidden print:block w-full pt-2">
        <div class="flex items-center justify-between border-b-2 border-neutral-800 pb-3 mb-4">
            <div>
                <h1 class="text-2xl font-black text-neutral-900 mb-1">Betriebswirtschaftliche Auswertung (Basis-BWA / EÜR)</h1>
                <p class="text-xs text-neutral-500 font-medium">Zeitraum: {viewMode === 'monthly' ? `Monat ${selectedMonth}` : (viewMode === 'quarterly' ? `Quartal ${selectedQuarter}` : 'Jahresansicht')} {bwa.selectedYear}</p>
            </div>
            <div class="text-right">
                <p class="text-xs font-bold text-neutral-800">OrgaFlow Finanzwesen</p>
                <p class="text-[10px] text-neutral-400">Erstellt am {new Date().toLocaleDateString('de-DE')} um {new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr</p>
            </div>
        </div>
        <BwaTable {currentBWA} {ytdBWA} {viewMode} {selectedMonth} {selectedQuarter} selectedYear={bwa.selectedYear} selectedCompanyId={bwa.selectedCompanyId} />
    </div>
    {/if}

    <BwaDetailModal bind:this={bwaDetailModal} {currentBWA} {ytdBWA} {viewMode} {selectedMonth} {selectedQuarter} selectedYear={bwa.selectedYear} selectedCompanyId={bwa.selectedCompanyId} />
    <BwaForecastModal bind:this={forecastModal} forecastStats={bwa.forecastStats} bind:forecastScenario onSelectMonth={(m: number, y: number) => openMonthBwa(m, y)} />
    <AdminUnifiedFinanceModal bind:this={unifiedFinanceModal} />
    <BwaClientsModal bind:this={clientsModal} clientStats={bwa.stats.clientStats} />
    <BwaTeamModal bind:this={teamModal} userStats={bwa.stats.userStats} />
    <BwaExpensesListModal 
        bind:this={expensesListModal} 
        companyExpenses={bwa.companyExpenses} 
        onDeleteExpense={async (id: string) => { if(await confirmStore.ask("Ausgabe wirklich löschen?", "Ausgabe löschen?", "Löschen", "Abbrechen", true)) bwa.deleteExpense(id); }} 
        onNewExpense={() => expenseModal?.showModal()} 
        onBookInstallment={(exp: any) => expenseModal?.bookNextInstallment(exp)} 
    />
    <BwaExpenseModal bind:this={expenseModal} {bwa} {isGodMode} {currentUser} />
{/if}
