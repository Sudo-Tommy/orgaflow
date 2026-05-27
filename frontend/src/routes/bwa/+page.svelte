<script lang="ts">
    import { useBwaService } from "$lib/services/bwaService.svelte";
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
    import VmaManager from "$lib/components/vma/VmaManager.svelte";

    const bwa = useBwaService();
    
    let currentUser = $state(pb.authStore.record || pb.authStore.model);
    let isGodMode = $derived(pb.authStore.isSuperuser || currentUser?.role === 'superadmin');

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

    // State für Finanz-Balance Widget
    let wipDate = $derived(new Date(bwa.selectedYear, selectedMonth - 1, 1));
    
    function prevWipMonth() {
        let m = selectedMonth - 1;
        let y = bwa.selectedYear;
        if (m === 0) { m = 12; y--; }
        bwa.selectedYear = y;
        selectedMonth = m;
        viewMode = 'monthly';
    }
    
    function nextWipMonth() {
        let m = selectedMonth + 1;
        let y = bwa.selectedYear;
        if (m === 13) { m = 1; y++; }
        bwa.selectedYear = y;
        selectedMonth = m;
        viewMode = 'monthly';
    }

    // Unbilled Revenue Calculation (Unbezahlte Leistungen WIP)
    let currentUnbilled = $derived.by(() => {
        let sum = 0;
        const targetMonth = wipDate.getMonth();
        const targetYear = wipDate.getFullYear();
        
        (orgaStore.appointments?.data || []).forEach((app: any) => {
            if (!app.appointment || app.settled || app.description?.includes('[BLOCK]')) return;
            
            const d = new Date(app.appointment);
            if (d.getMonth() !== targetMonth || d.getFullYear() !== targetYear) return;
            
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

    // --- VMA / REISEKOSTEN ABGLEICH LOGIK ---
    function calculateVmaLumpSums(appointments: any[]) {
        let mileage = 0;
        let perDiem = 0;
        const days = new Map<string, { start: number, end: number }>();
        
        appointments.forEach(app => {
            if (app.expand?.drive_record) {
                app.expand.drive_record.forEach((dr: any) => mileage += (dr.km || 0) * 0.30);
            }
            if (!app.appointment || app.description?.includes('[BLOCK]')) return;
            const dStr = new Date(app.appointment).toISOString().split('T')[0];
            if (!days.has(dStr)) days.set(dStr, { start: Infinity, end: 0 });
            const dayData = days.get(dStr)!;
            if (app.expand?.time_record) {
                app.expand.time_record.forEach((tr: any) => {
                    if (tr.start) dayData.start = Math.min(dayData.start, new Date(tr.start).getTime());
                    if (tr.end) dayData.end = Math.max(dayData.end, new Date(tr.end).getTime());
                });
            }
        });

        for (const day of days.values()) {
            if (day.start !== Infinity && day.end !== 0) {
                const hours = (day.end - day.start) / 3600000;
                if (hours > 8) perDiem += 14;
            }
        }
        return mileage + perDiem;
    }

    // Live-Berechnung der Reisekosten für das Widget (Aktueller Kalendermonat)
    let vmaCurrentMonth = $derived.by(() => {
        const now = new Date();
        const targetMonth = now.getMonth();
        const targetYear = now.getFullYear();
        const apps = (orgaStore.appointments?.data || []).filter((app: any) => {
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
        return calculateVmaLumpSums(apps);
    });

    // Reisekosten für den aktuell gewählten BWA-Zeitraum
    let vmaForSelectedPeriod = $derived.by(() => {
        const apps = (orgaStore.appointments?.data || []).filter((app: any) => {
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
        return calculateVmaLumpSums(apps);
    });


    // Modals
    // svelte-ignore non_reactive_update
    let bwaDetailModal: ReturnType<typeof BwaDetailModal>;
    // svelte-ignore non_reactive_update
    let forecastModal: ReturnType<typeof BwaForecastModal>;
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
        const steuernVersicherungen = 0; 
        const fahrzeugkosten = categories["Fahrzeuge"] || 0;
        const werbeReisekosten = (categories["Marketing"] || 0) + vmaLumpSums;
        const instandhaltung = 0;
        const abschreibungen = 0;
        const verschiedeneKosten = (categories["Sonstiges"] || 0) + (categories["Software / IT"] || 0);

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
            revenuePaid: 0, // Will be populated by derived logic if available in stats
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

        // YTD VMA Summe berechnen
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

        const mapped = mapToBWA(rev, appExp, compExp, cats, ust, vst, calculateVmaLumpSums(ytdApps));
        mapped.revenuePaid = revPaid;
        mapped.revenueOpen = revOpen;
        return mapped;
    });

    let previousBWA = $derived.by(() => {
        // Minimaler Fallback für "vs Vorperiode" in den kleinen Cards
        let prevRev = currentBWA.revenue * 0.9;
        let prevExp = (currentBWA.materialCosts + currentBWA.personnelCosts + currentBWA.roomCosts + currentBWA.operatingTaxes + currentBWA.otherOperatingExpenses) * 0.9;
        if (viewMode === 'monthly' && selectedMonth > 1) {
            const m = bwa.stats.monthly[selectedMonth - 2];
            if (m) { prevRev = m.revenue; prevExp = m.compExpenses + m.appExpenses; }
        } else if (viewMode === 'quarterly' && selectedQuarter > 1) {
            prevRev = 0; prevExp = 0;
            const start = (selectedQuarter - 2) * 3;
            for (let i = start; i < start + 3; i++) {
                const m = bwa.stats.monthly[i];
                if (m) { prevRev += m.revenue; prevExp += m.compExpenses + m.appExpenses; }
            }
        }
        return { revenue: prevRev, grossProfit: prevRev, ebitda: prevRev - prevExp, netIncome: prevRev - prevExp };
    });

    let widgetBWA = $derived.by(() => {
        let rev = 0, revPaid = 0, revOpen = 0, appExp = 0, compExp = 0, ust = 0, vst = 0;
        let cats: Record<string, number> = {};
        if (wipDate.getFullYear() === bwa.selectedYear) {
            const m = bwa.stats.monthly[wipDate.getMonth()];
            if (m) { 
                rev = m.revenue; revPaid = m.revenuePaid; revOpen = m.revenueOpen; 
                appExp = m.appExpenses; compExp = m.compExpenses; 
                ust = m.umsatzsteuer; vst = m.vorsteuer; cats = m.categories; 
            }
        }
        const mapped = mapToBWA(rev, appExp, compExp, cats, ust, vst, vmaForSelectedPeriod);
        mapped.revenuePaid = revPaid;
        mapped.revenueOpen = revOpen;
        return mapped;
    });

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
    function handlePrint() { window.print(); }

</script>

<div class="orga-page-header animate-enter print:hidden">
    <div class="flex flex-col xl:flex-row xl:items-end justify-between gap-4 w-full">
        <div>
            <h1 class="text-2xl font-black text-neutral-900 tracking-tight flex items-center gap-2"><span>📊</span> Firmenfinanzen & BWA</h1>
            <p class="text-sm text-neutral-500 font-medium mt-1">Smarte Prognosen und detaillierte statistische Auswertungen.</p>
        </div>
        
        <div class="flex flex-col sm:flex-row items-center gap-3">
            <!-- Tab Switcher -->
            <div class="flex bg-neutral-100 p-1 rounded-xl border border-neutral-200 shadow-inner">
                <button onclick={() => activeTab = 'dashboard'} class="px-5 py-2 text-xs font-bold rounded-lg transition-all {activeTab === 'dashboard' ? 'bg-white text-indigo-600 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}">BWA Dashboard</button>
                <button onclick={() => activeTab = 'vma'} class="px-5 py-2 text-xs font-bold rounded-lg transition-all {activeTab === 'vma' ? 'bg-white text-indigo-600 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}">Reisekosten (VMA)</button>
            </div>

            {#if activeTab === 'dashboard'}
            <div class="flex flex-wrap items-center gap-2 bg-white p-1.5 rounded-2xl border border-neutral-200 shadow-sm shrink-0 animate-enter">
                {#if isGodMode}
                    <div class="relative flex items-center bg-neutral-50 hover:bg-neutral-100 rounded-xl px-2 py-1.5 transition-colors cursor-pointer border border-transparent hover:border-neutral-200">
                        <span class="mr-1">🏢</span>
                        <select aria-label="Firma wählen" bind:value={bwa.selectedCompanyId} class="bg-transparent text-sm font-bold text-neutral-800 outline-none cursor-pointer appearance-none pr-4 max-w-32 truncate">
                            <option value="all">Alle Firmen</option>
                            {#each orgaStore.company?.data || [] as comp}<option value={comp.id}>{comp.city} {comp.name ? `(${comp.name})` : ''}</option>{/each}
                        </select>
                    </div>
                {/if}
                <div class="relative flex items-center bg-neutral-50 hover:bg-neutral-100 rounded-xl px-2 py-1.5 transition-colors cursor-pointer border border-transparent hover:border-neutral-200">
                    <span class="mr-1">️</span>
                    <select bind:value={viewMode} aria-label="Ansicht" class="bg-transparent text-sm font-bold text-neutral-800 outline-none cursor-pointer appearance-none pr-4">
                        <option value="monthly">Monatlich</option>
                        <option value="quarterly">Quartalsweise</option>
                        <option value="yearly">Jährlich</option>
                    </select>
                </div>
                {#if viewMode === 'monthly'}
                    <div class="relative flex items-center bg-neutral-50 hover:bg-neutral-100 rounded-xl px-2 py-1.5 transition-colors cursor-pointer border border-transparent hover:border-neutral-200">
                        <span class="mr-1">📅</span>
                        <select bind:value={selectedMonth} aria-label="Monat" class="bg-transparent text-sm font-bold text-neutral-800 outline-none cursor-pointer appearance-none pr-4">
                            {#each Array.from({length: 12}) as _, i}<option value={i+1}>{new Date(2000, i, 1).toLocaleString('de-DE', { month: 'short' })}</option>{/each}
                        </select>
                    </div>
                {:else if viewMode === 'quarterly'}
                    <div class="relative flex items-center bg-neutral-50 hover:bg-neutral-100 rounded-xl px-2 py-1.5 transition-colors cursor-pointer border border-transparent hover:border-neutral-200">
                        <span class="mr-1">📅</span>
                        <select bind:value={selectedQuarter} aria-label="Quartal" class="bg-transparent text-sm font-bold text-neutral-800 outline-none cursor-pointer appearance-none pr-4">
                            <option value={1}>Q1 (Jan - Mär)</option>
                            <option value={2}>Q2 (Apr - Jun)</option>
                            <option value={3}>Q3 (Jul - Sep)</option>
                            <option value={4}>Q4 (Okt - Dez)</option>
                        </select>
                    </div>
                {/if}
                <div class="relative flex items-center bg-neutral-50 hover:bg-neutral-100 rounded-xl px-2 py-1.5 transition-colors cursor-pointer border border-transparent hover:border-neutral-200">
                    <span class="mr-1">📆</span>
                    <select aria-label="Jahr wählen" bind:value={bwa.selectedYear} class="bg-transparent text-sm font-bold text-neutral-800 outline-none cursor-pointer appearance-none pr-4">
                        {#each bwa.availableYears as year}<option value={year}>{year}</option>{/each}
                    </select>
                </div>
                <button onclick={handlePrint} class="w-9 h-9 flex items-center justify-center bg-neutral-50 text-neutral-600 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 transition-colors" title="Drucken / Als PDF exportieren">
                    🖨️
                </button>
            </div>
            {/if}
        </div>
        </div>
</div>

{#if orgaStore.invoices?.isLoading || orgaStore.appointments?.isLoading}
    <div class="flex justify-center py-20"><div class="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div></div>
{:else}
    <div class="mb-8 print:hidden">
        {#if activeTab === 'dashboard'}
        <!-- KPI Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8 animate-enter delay-100">
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div class="bg-white p-5 rounded-3xl border border-neutral-100 shadow-sm flex items-center justify-between hover:border-indigo-200 transition-all hover:shadow-md cursor-pointer group" onclick={() => bwaDetailModal?.showModal()}>
                <div>
                    <p class="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1 group-hover:text-indigo-500 transition-colors">Umsatz (Geflossen)</p>
                    <p class="text-2xl font-black text-neutral-900">{formatCurrency(currentBWA.revenue)}</p>
                    <div class="mt-1 flex items-center gap-1.5 text-xs font-bold">
                    <span class={getTrendColor(currentBWA.revenue, previousBWA.revenue)}>{formatPercent(currentBWA.revenue, previousBWA.revenue)}</span>
                        <span class="text-neutral-300">vs Vorperiode</span>
                    </div>
                    <div class="mt-2 text-[10px] text-neutral-500 flex flex-col gap-0.5">
                        <span class="text-amber-500 font-semibold" title="Ausstehende Zahlungen">⏳ Zzgl. {formatCurrency(currentBWA.revenueOpen)} noch offen</span>
                    </div>
                </div>
                <div class="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-2xl shadow-inner shrink-0 group-hover:scale-110 transition-transform">💶</div>
            </div>
            
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div class="bg-white p-5 rounded-3xl border border-neutral-100 shadow-sm flex items-center justify-between hover:border-rose-200 transition-all hover:shadow-md cursor-pointer group" onclick={() => bwaDetailModal?.showModal()}>
                <div>
                    <p class="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1 group-hover:text-rose-500 transition-colors">Kosten</p>
                    <p class="text-2xl font-black text-neutral-900">{formatCurrency(currentBWA.materialCosts + currentBWA.personnelCosts + currentBWA.roomCosts + currentBWA.operatingTaxes + currentBWA.otherOperatingExpenses)}</p>
                    <div class="mt-1 flex items-center gap-1.5 text-xs font-bold">
                    <span class={getTrendColor(currentBWA.grossProfit, previousBWA.grossProfit)}>{formatPercent(currentBWA.grossProfit, previousBWA.grossProfit)}</span>
                        <span class="text-neutral-300">vs Vorperiode</span>
                    </div>
                </div>
                <div class="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center text-2xl shadow-inner shrink-0 group-hover:scale-110 transition-transform">📉</div>
            </div>
            
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div class="bg-white p-5 rounded-3xl border border-neutral-100 shadow-sm flex items-center justify-between hover:border-purple-200 transition-all hover:shadow-md cursor-pointer group" onclick={() => bwaDetailModal?.showModal()}>
                <div>
                    <p class="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1 group-hover:text-purple-500 transition-colors">EBITDA</p>
                    <p class="text-2xl font-black text-neutral-900">{formatCurrency(currentBWA.ebitda)}</p>
                    <div class="mt-1 flex items-center gap-1.5 text-xs font-bold">
                    <span class={getTrendColor(currentBWA.ebitda, previousBWA.ebitda)}>{formatPercent(currentBWA.ebitda, previousBWA.ebitda)}</span>
                        <span class="text-neutral-300">vs Vorperiode</span>
                    </div>
                </div>
                <div class="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center text-2xl shadow-inner shrink-0 group-hover:scale-110 transition-transform">📊</div>
            </div>
            
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div class="bg-white p-5 rounded-3xl border border-neutral-100 shadow-sm flex items-center justify-between transition-all hover:shadow-md cursor-pointer group {currentBWA.netIncome >= 0 ? 'hover:border-emerald-200' : 'hover:border-rose-200'}" onclick={() => bwaDetailModal?.showModal()}>
                <div>
                    <p class="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1 transition-colors {currentBWA.netIncome >= 0 ? 'group-hover:text-emerald-500' : 'group-hover:text-rose-500'}">Gewinn</p>
                    <p class="text-2xl font-black {currentBWA.netIncome >= 0 ? 'text-emerald-600' : 'text-rose-600'}">{formatCurrency(currentBWA.netIncome)}</p>
                    <div class="mt-1 flex items-center gap-1.5 text-xs font-bold">
                    <span class={getTrendColor(currentBWA.netIncome, previousBWA.netIncome)}>{formatPercent(currentBWA.netIncome, previousBWA.netIncome)}</span>
                        <span class="text-neutral-300">vs Vorperiode</span>
                    </div>
                </div>
                <div class="w-12 h-12 rounded-2xl {currentBWA.netIncome >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'} flex items-center justify-center text-2xl shadow-inner shrink-0 group-hover:scale-110 transition-transform">📈</div>
            </div>
        </div>

        <!-- Middle Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8 animate-enter delay-200">
            <!-- BWA Snapshot -->
            <div class="bg-white rounded-3xl border border-neutral-100 shadow-sm flex flex-col p-6 group hover:shadow-md transition-shadow">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="font-bold text-neutral-900 flex items-center gap-3 text-lg"><span class="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-base shadow-inner">⚖️</span> Finanz-Balance</h3>
                    <button onclick={() => bwaDetailModal?.showModal()} class="w-10 h-10 rounded-full bg-neutral-50 hover:bg-indigo-50 text-neutral-400 hover:text-indigo-600 flex items-center justify-center transition-colors shrink-0" title="Detaillierte BWA öffnen">
                        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                    </button>
                </div>
                {#if currentBWA}
                    {@const expTotal = currentBWA.materialCosts + currentBWA.personnelCosts + currentBWA.roomCosts + currentBWA.operatingTaxes + currentBWA.otherOperatingExpenses}
                    <div class="flex-1 flex flex-col justify-center py-2">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-sm font-bold text-indigo-600">Umsatz: {formatCurrency(currentBWA.revenue)}</span>
                        <span class="text-sm font-bold text-rose-600">Kosten: {formatCurrency(expTotal)}</span>
                    </div>
                    <div class="w-full h-5 bg-neutral-100 rounded-full mb-4 overflow-hidden flex shadow-inner">
                        <div class="h-full bg-emerald-400 transition-all duration-1000" style="width: {currentBWA.revenue > 0 ? Math.max(0, (currentBWA.netIncome / currentBWA.revenue) * 100) : 0}%" title="Gewinn"></div>
                        <div class="h-full bg-rose-400 transition-all duration-1000" style="width: {currentBWA.revenue > 0 ? Math.min(100, (expTotal / currentBWA.revenue) * 100) : 0}%" title="Ausgaben"></div>
                    </div>
                    <div class="text-center mt-2">
                        <span class="text-xs font-bold text-neutral-400 uppercase tracking-wider block mb-1">Vorläufiges Ergebnis</span>
                        <span class="text-3xl font-black {currentBWA.netIncome >= 0 ? 'text-emerald-600' : 'text-rose-600'}">{formatCurrency(currentBWA.netIncome)}</span>
                    </div>
                    
                    <!-- WIP / Unbilled Revenue InfoBox -->
                    <div class="mt-5 pt-4 border-t border-neutral-100">
                        <div class="flex items-start justify-between">
                            <div class="flex items-start gap-3">
                                <span class="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center text-sm shadow-inner shrink-0 mt-0.5">⏳</span>
                                <div class="flex flex-col">
                                    <span class="text-xs font-bold text-neutral-600 uppercase tracking-wider mb-1">Unbezahlte Leistung (WIP)</span>
                                    <span class="text-[10px] text-neutral-400 font-medium leading-snug max-w-56">Berechnung: Erfasste Zeiten, Fahrten und Auslagen aus offenen Terminen des gewählten Monats.</span>
                                </div>
                            </div>
                            <div class="text-right shrink-0 mt-0.5 flex flex-col items-end">
                                <span class="text-lg font-black text-amber-600 block leading-none">{formatCurrency(currentUnbilled)}</span>
                                <div class="flex items-center gap-1 mt-1.5 bg-amber-50 border border-amber-100/50 rounded-md p-0.5 shadow-sm">
                                    <button onclick={prevWipMonth} class="w-5 h-5 flex items-center justify-center rounded hover:bg-amber-100 text-amber-700 font-bold transition-colors">◀</button>
                                    <span class="text-[10px] font-bold text-amber-900 w-14 text-center">{wipDate.toLocaleString('de-DE', {month:'short', year:'2-digit'})}</span>
                                    <button onclick={nextWipMonth} class="w-5 h-5 flex items-center justify-center rounded hover:bg-amber-100 text-amber-700 font-bold transition-colors">▶</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    </div>
                {/if}
            </div>

            <!-- Expense Structure -->
            <div class="bg-white rounded-3xl border border-neutral-100 shadow-sm flex flex-col p-6 group hover:shadow-md transition-shadow">
                <h3 class="font-bold text-neutral-900 flex items-center gap-3 text-lg mb-6"><span class="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center text-base shadow-inner">📉</span> Aufwandsstruktur</h3>
                {#if currentBWA}
                    {@const totalExpenses = currentBWA.materialCosts + currentBWA.personnelCosts + currentBWA.roomCosts + currentBWA.operatingTaxes + currentBWA.otherOperatingExpenses || 1}
                    <div class="space-y-5 flex-1 flex flex-col justify-center">
                    <div>
                        <div class="flex justify-between text-xs font-bold mb-1.5">
                            <span class="text-neutral-600">Material / Fremdl.</span>
                            <span class="text-neutral-900">{((currentBWA.materialCosts / totalExpenses) * 100).toFixed(1)}%</span>
                        </div>
                        <div class="w-full bg-neutral-100 rounded-full h-2 shadow-inner">
                            <div class="bg-amber-400 h-2 rounded-full transition-all duration-1000" style="width: {(currentBWA.materialCosts / totalExpenses) * 100}%"></div>
                        </div>
                    </div>
                    <div>
                        <div class="flex justify-between text-xs font-bold mb-1.5">
                            <span class="text-neutral-600">Personalkosten</span>
                            <span class="text-neutral-900">{((currentBWA.personnelCosts / totalExpenses) * 100).toFixed(1)}%</span>
                        </div>
                        <div class="w-full bg-neutral-100 rounded-full h-2 shadow-inner">
                            <div class="bg-rose-400 h-2 rounded-full transition-all duration-1000" style="width: {(currentBWA.personnelCosts / totalExpenses) * 100}%"></div>
                        </div>
                    </div>
                    <div>
                        <div class="flex justify-between text-xs font-bold mb-1.5">
                            <span class="text-neutral-600">Raum & Sonstiges</span>
                            <span class="text-neutral-900">{(((currentBWA.roomCosts + currentBWA.otherOperatingExpenses + currentBWA.operatingTaxes) / totalExpenses) * 100).toFixed(1)}%</span>
                        </div>
                        <div class="w-full bg-neutral-100 rounded-full h-2 shadow-inner">
                            <div class="bg-blue-400 h-2 rounded-full transition-all duration-1000" style="width: {(((currentBWA.roomCosts + currentBWA.otherOperatingExpenses + currentBWA.operatingTaxes) / totalExpenses) * 100)}%"></div>
                        </div>
                    </div>
                    </div>
                {/if}
            </div>
            
            <!-- EBITDA Forecast -->
            <div class="bg-white rounded-3xl border border-neutral-100 shadow-sm flex flex-col p-6 group hover:shadow-md transition-shadow relative">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
                    <h3 class="font-bold text-neutral-900 flex items-center gap-3 text-lg"><span class="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-base shadow-inner">🔮</span> Prognose (12M)</h3>
                    <div class="flex items-center gap-2 self-start sm:self-auto">
                        <div class="hidden sm:flex bg-neutral-100 p-1 rounded-lg border border-neutral-200 shadow-inner shrink-0">
                            <button onclick={() => forecastScenario = 'pessimistic'} class="px-2 py-1 text-[10px] font-bold rounded-md transition-colors {forecastScenario === 'pessimistic' ? 'bg-white shadow-sm text-purple-600' : 'text-neutral-500 hover:text-neutral-700'}" title="Pessimistisch (-15%)">📉 Pessim.</button>
                            <button onclick={() => forecastScenario = 'realistic'} class="px-2 py-1 text-[10px] font-bold rounded-md transition-colors {forecastScenario === 'realistic' ? 'bg-white shadow-sm text-purple-600' : 'text-neutral-500 hover:text-neutral-700'}" title="Realistisch">⚖️ Realist.</button>
                            <button onclick={() => forecastScenario = 'optimistic'} class="px-2 py-1 text-[10px] font-bold rounded-md transition-colors {forecastScenario === 'optimistic' ? 'bg-white shadow-sm text-purple-600' : 'text-neutral-500 hover:text-neutral-700'}" title="Optimistisch (+15%)">📈 Optimist.</button>
                        </div>
                        <button onclick={() => forecastModal?.showModal()} class="w-10 h-10 rounded-full bg-neutral-50 hover:bg-purple-50 text-neutral-400 hover:text-purple-600 flex items-center justify-center transition-colors shrink-0" title="Detaillierte Prognose öffnen">
                            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                        </button>
                    </div>
                </div>
                {#if bwa.forecastStats.length > 0}
                    {@const multiplier = forecastScenario === 'optimistic' ? 1.15 : (forecastScenario === 'pessimistic' ? 0.85 : 1)}
                    {@const maxVal = Math.max(...bwa.forecastStats.map(f => Math.abs((f.revenue * multiplier) - f.expenses)), 1)}
                    <div class="w-full h-40 flex gap-2 items-end overflow-x-auto custom-scrollbar pb-2 flex-1">
                        {#each bwa.forecastStats as f}
                            {@const rev = f.revenue * multiplier}
                            {@const val = rev - f.expenses}
                            <div class="flex flex-col items-center gap-2 shrink-0 group/bar flex-1 h-full justify-end">
                                <div class="w-full h-full flex items-end justify-center relative">
                                    <div class="w-full rounded-t-md transition-all group-hover/bar:bg-indigo-500 {val >= 0 ? 'bg-indigo-400' : 'bg-rose-400'}" 
                                         style="height: {Math.max(0, Math.abs(val) / maxVal * 100)}%;">
                                    </div>
                                    <div class="absolute -top-8 bg-neutral-900 text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover/bar:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-10 shadow-lg">
                                        {formatCurrency(val)}
                                    </div>
                                </div>
                                <span class="text-[9px] font-bold text-neutral-500 rotate-45 origin-left mt-2">{f.month.split(' ')[0]}</span>
                            </div>
                        {/each}
                    </div>
                {/if}
            </div>
        </div>

        <!-- Bottom Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6 animate-enter delay-300">
        <!-- Card: Klienten Ranking -->
        <div class="bg-white rounded-3xl border border-neutral-100 shadow-sm flex flex-col p-5 group hover:shadow-md transition-shadow">
            <div class="flex items-center justify-between mb-4">
                <h3 class="font-bold text-neutral-900 flex items-center gap-3 text-lg"><span class="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-base shadow-inner">🏆</span> Top Klienten</h3>
                <button onclick={() => clientsModal?.showModal()} class="w-10 h-10 rounded-full bg-neutral-50 hover:bg-amber-50 text-neutral-400 hover:text-amber-600 flex items-center justify-center transition-colors shrink-0" title="Gesamtes Ranking ansehen">
                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                </button>
            </div>
            <div class="flex-1 flex flex-col gap-2.5">
                {#each bwa.stats.clientStats.slice(0, 3) as c, i}
                    <button onclick={() => clientsModal?.showModal()} class="w-full text-left flex items-center justify-between p-2 rounded-xl hover:bg-neutral-50 border border-transparent hover:border-neutral-100 transition-colors">
                        <div class="flex items-center gap-3 min-w-0">
                            <span class="text-xs font-black text-neutral-400 w-5">#{i+1}</span>
                            <span class="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center text-xs font-bold shrink-0">👤</span>
                            <span class="text-sm font-bold text-neutral-800 truncate">{c.name}</span>
                        </div>
                        <span class="text-sm font-bold text-indigo-600 shrink-0">{c.revenue.toFixed(0)} €</span>
                    </button>
                {/each}
                {#if bwa.stats.clientStats.length === 0}
                    <p class="text-sm text-neutral-400 italic text-center py-4">Keine Daten</p>
                {/if}
            </div>
        </div>

        <!-- Card: Team Performance -->
        <div class="bg-white rounded-3xl border border-neutral-100 shadow-sm flex flex-col p-5 group hover:shadow-md transition-shadow">
            <div class="flex items-center justify-between mb-4">
                <h3 class="font-bold text-neutral-900 flex items-center gap-3 text-lg"><span class="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center text-base shadow-inner">👥</span> Team-Leistung</h3>
                <button onclick={() => teamModal?.showModal()} class="w-10 h-10 rounded-full bg-neutral-50 hover:bg-sky-50 text-neutral-400 hover:text-sky-600 flex items-center justify-center transition-colors shrink-0" title="Team Details">
                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                </button>
            </div>
            <div class="flex-1 flex flex-col gap-2.5">
                {#each bwa.stats.userStats.slice(0, 3) as u, i}
                    <button onclick={() => teamModal?.showModal()} class="w-full text-left flex items-center justify-between p-2 rounded-xl hover:bg-neutral-50 border border-transparent hover:border-neutral-100 transition-colors">
                        <div class="flex items-center gap-3 min-w-0">
                            <span class="w-6 h-6 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center text-xs font-bold shrink-0">{u.name?.charAt(0) || '?'}</span>
                            <span class="text-sm font-bold text-neutral-800 truncate">{u.name || 'Unbekannt'}</span>
                        </div>
                        <span class="text-sm font-bold text-emerald-600 shrink-0">{u.hours.toFixed(1).replace('.', ',')} h</span>
                    </button>
                {/each}
                {#if bwa.stats.userStats.length === 0}
                    <p class="text-sm text-neutral-400 italic text-center py-4">Keine Daten</p>
                {/if}
            </div>
        </div>

        <!-- Card: Ausgaben -->
        <div class="bg-white rounded-3xl border border-neutral-100 shadow-sm flex flex-col p-5 group hover:shadow-md transition-shadow">
            <div class="flex items-center justify-between mb-4">
                <h3 class="font-bold text-neutral-900 flex items-center gap-3 text-lg"><span class="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center text-base shadow-inner">🧾</span> Letzte Ausgaben</h3>
                <div class="flex items-center gap-2">
                    <button onclick={() => expenseModal?.showModal()} class="w-10 h-10 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center transition-colors font-bold text-xl shrink-0" title="Neue Ausgabe hinzufügen">+</button>
                    <button onclick={() => expensesListModal?.showModal()} class="w-10 h-10 rounded-full bg-neutral-50 hover:bg-rose-50 text-neutral-400 hover:text-rose-600 flex items-center justify-center transition-colors shrink-0" title="Alle Ausgaben ansehen">
                        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                    </button>
                </div>
            </div>
            <div class="flex-1 flex flex-col gap-2">
                {#each bwa.companyExpenses.slice(0, 3) as exp}
                    <button onclick={() => expensesListModal?.showModal()} class="w-full text-left flex items-center justify-between gap-3 p-2 rounded-xl hover:bg-neutral-50 border border-transparent hover:border-neutral-100 transition-colors">
                        <div class="flex items-center gap-3 min-w-0">
                            <span class="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center text-xs font-bold shrink-0">🧾</span>
                            <div class="min-w-0">
                            <p class="text-sm font-bold text-neutral-800 truncate">{exp.supplier || 'Unbekannt'}</p>
                            <p class="text-[10px] text-neutral-500 truncate">{new Date(exp.date).toLocaleDateString('de-DE')} • {exp.category}</p>
                        </div>
                        </div>
                        <span class="text-sm font-bold text-rose-600 shrink-0">{exp.amount.toFixed(2).replace('.', ',')} €</span>
                    </button>
                {/each}
                {#if bwa.companyExpenses.length === 0}
                    <p class="text-sm text-neutral-400 italic text-center py-4">Keine Ausgaben erfasst</p>
                {/if}
            </div>
        </div>

        <!-- Card: Reisekosten VMA (Live-Widget) -->
        <div class="bg-white rounded-3xl border border-neutral-100 shadow-sm flex flex-col p-5 group hover:shadow-md transition-shadow">
            <div class="flex items-center justify-between mb-4">
                <h3 class="font-bold text-neutral-900 flex items-center gap-3 text-lg"><span class="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-base shadow-inner">🚗</span> Reisekosten (VMA)</h3>
                <button onclick={() => activeTab = 'vma'} class="w-10 h-10 rounded-full bg-neutral-50 hover:bg-indigo-50 text-neutral-400 hover:text-indigo-600 flex items-center justify-center transition-colors shrink-0" title="Alle Reisekosten ansehen">
                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                </button>
            </div>
            <div class="flex-1 flex flex-col justify-center items-center text-center p-2 bg-neutral-50 rounded-2xl border border-dashed border-neutral-200">
                <p class="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">{new Date().toLocaleString('de-DE', { month: 'long' })} (Laufend)</p>
                <p class="text-3xl font-black text-indigo-600">{formatCurrency(vmaCurrentMonth)}</p>
                <p class="text-[9px] text-neutral-500 font-bold mt-2 leading-tight">Automatisch berechnete Pauschalen für Verpflegung & Kilometer.</p>
                {#if vmaCurrentMonth > 0}
                    <button onclick={() => activeTab = 'vma'} class="mt-4 text-[10px] font-black uppercase text-indigo-500 hover:text-indigo-700 transition-colors">Details prüfen &rarr;</button>
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
    <div class="hidden print:block w-full">
        <h1 class="text-2xl font-black text-neutral-900 mb-2">Betriebswirtschaftliche Auswertung (Basis-BWA / EÜR)</h1>
        <p class="text-neutral-500 mb-6 font-medium">Zeitraum: {viewMode === 'monthly' ? `Monat ${selectedMonth}` : (viewMode === 'quarterly' ? `Quartal ${selectedQuarter}` : 'Jahresansicht')} {bwa.selectedYear}</p>
        <BwaTable {currentBWA} {ytdBWA} {viewMode} {selectedMonth} {selectedQuarter} selectedYear={bwa.selectedYear} selectedCompanyId={bwa.selectedCompanyId} />
    </div>
    {/if}

    <BwaDetailModal bind:this={bwaDetailModal} {currentBWA} {ytdBWA} {viewMode} {selectedMonth} {selectedQuarter} selectedYear={bwa.selectedYear} selectedCompanyId={bwa.selectedCompanyId} />
    <BwaForecastModal bind:this={forecastModal} forecastStats={bwa.forecastStats} bind:forecastScenario />
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
