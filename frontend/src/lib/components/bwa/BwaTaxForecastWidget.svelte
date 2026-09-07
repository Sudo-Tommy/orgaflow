<script lang="ts">
    import { calculateTaxEstimate } from "$lib/services/bwaService.svelte";

    let { 
        bwa, 
        selectedMonth = $bindable(new Date().getMonth() + 1),
        selectedYear = new Date().getFullYear(),
        viewMode = 'monthly',
        currentBWA = null,
        currentTaxEstimate = null,
        onSelectMonth 
    } = $props<any>();

    let taxScenario = $state<'realistic' | 'pessimistic' | 'optimistic'>('realistic');
    let taxFilter = $state<'all' | 'ertrag' | 'ust'>('all');
    let selectedMonthDetail = $state<any | null>(null);
    let kpiMode = $state<'month' | 'forecast'>('month');

    // Wenn sich selectedMonth von außen ändert (z.B. über die Monatsleiste oben), synchronisieren
    $effect(() => {
        if (selectedMonth && selectedMonthDetail && (selectedMonthDetail.monthIndex + 1 !== selectedMonth || selectedMonthDetail.year !== selectedYear)) {
            selectedMonthDetail = null;
        }
    });

    function formatCurrency(val: number) {
        return (val || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
    }

    function formatBarAmount(val: number): string {
        if (Math.abs(val) >= 10000) {
            return (val / 1000).toFixed(1).replace('.', ',') + 'k';
        } else if (Math.abs(val) >= 1000) {
            return (val / 1000).toFixed(1).replace('.', ',') + 'k';
        } else {
            return Math.round(val) + ' €';
        }
    }

    // Historische USt- und Vorsteuer-Quoten ermitteln
    let vatRatios = $derived.by(() => {
        const rev = bwa?.stats?.totals?.revenue || 0;
        const ust = bwa?.stats?.totals?.umsatzsteuer || 0;
        const exp = bwa?.stats?.totals?.compExpenses || 0;
        const vst = bwa?.stats?.totals?.vorsteuer || 0;

        const ustRate = rev > 0 ? (ust / rev) : 0.19;
        const vstRate = exp > 0 ? (vst / exp) : 0.19;

        return { ustRate, vstRate };
    });

    // Timeline mit detaillierter Steuerberechnung pro Monat
    let taxTimeline = $derived.by(() => {
        if (!bwa?.forecastStats) return [];
        const mult = taxScenario === 'optimistic' ? 1.15 : (taxScenario === 'pessimistic' ? 0.85 : 1);

        return bwa.forecastStats.map((m: any) => {
            const rev = m.isHistorical ? m.revenue : (m.revenue * mult);
            const exp = m.expenses;
            const profit = rev - exp;

            let ust = 0;
            let vst = 0;

            if (m.isHistorical) {
                const histM = bwa.stats?.monthly?.[m.monthIndex];
                ust = histM?.umsatzsteuer || 0;
                vst = histM?.vorsteuer || 0;
            } else {
                ust = rev * vatRatios.ustRate;
                vst = exp * vatRatios.vstRate;
            }

            const tax = calculateTaxEstimate(profit, 'monthly', ust, vst, 0);

            // Je nach Filter den darzustellenden Gesamtwert für den Balken ermitteln
            let barVal = 0;
            if (taxFilter === 'all') {
                barVal = tax.gesamteAbgaben;
            } else if (taxFilter === 'ertrag') {
                barVal = tax.ertragsteuern;
            } else {
                barVal = Math.max(0, tax.ustZahllast);
            }

            return {
                ...m,
                rev,
                exp,
                profit,
                tax,
                barVal
            };
        });
    });

    // Aktiver Monat für die KPIs
    let activeMonthName = $derived.by(() => {
        if (selectedMonthDetail) return selectedMonthDetail.month;
        const d = new Date(selectedYear, selectedMonth - 1, 1);
        return d.toLocaleString('de-DE', { month: 'long', year: 'numeric' });
    });

    let activeMonthShort = $derived.by(() => {
        if (selectedMonthDetail) return selectedMonthDetail.monthShort;
        const d = new Date(selectedYear, selectedMonth - 1, 1);
        return d.toLocaleString('de-DE', { month: 'short' });
    });

    let activeTax = $derived.by(() => {
        if (selectedMonthDetail) return selectedMonthDetail.tax;
        const targetItem = taxTimeline.find((t: any) => t.monthIndex === (selectedMonth - 1) && t.year === selectedYear);
        if (targetItem) return targetItem.tax;
        if (currentTaxEstimate) return currentTaxEstimate;
        return calculateTaxEstimate(0, 'monthly', 0, 0, 0);
    });

    // KPI-Kennzahlen für die nächsten 12 Zukunftsmonate (12M Aggregat)
    let forecastSummary = $derived.by(() => {
        const futureMonths = taxTimeline.filter((t: any) => !t.isHistorical);
        if (futureMonths.length === 0) {
            return {
                totalTax12M: 0,
                avgMonthlyTax: 0,
                totalErtrag12M: 0,
                totalUst12M: 0,
                avgEffectiveRate: 0
            };
        }

        const totalTax12M = futureMonths.reduce((sum: number, m: any) => sum + m.tax.gesamteAbgaben, 0);
        const totalErtrag12M = futureMonths.reduce((sum: number, m: any) => sum + m.tax.ertragsteuern, 0);
        const totalUst12M = futureMonths.reduce((sum: number, m: any) => sum + Math.max(0, m.tax.ustZahllast), 0);
        const totalProfit12M = futureMonths.reduce((sum: number, m: any) => sum + Math.max(0, m.profit), 0);

        const avgMonthlyTax = totalTax12M / futureMonths.length;
        const avgEffectiveRate = totalProfit12M > 0 ? (totalErtrag12M / totalProfit12M) * 100 : 0;

        return {
            totalTax12M,
            avgMonthlyTax,
            totalErtrag12M,
            totalUst12M,
            avgEffectiveRate
        };
    });

    function handleBarClick(item: any) {
        selectedMonthDetail = item;
        selectedMonth = item.monthIndex + 1;
        kpiMode = 'month';
    }
</script>

<div class="bg-white rounded-2xl sm:rounded-3xl border border-neutral-100 shadow-sm p-4 sm:p-6 group hover:shadow-md transition-shadow relative">
    <!-- Header: Titel & Steuerung -->
    <div class="flex flex-col lg:flex-row lg:items-center justify-between pb-4 mb-4 border-b border-neutral-100 gap-3">
        <div>
            <div class="flex items-center gap-2.5 sm:gap-3">
                <span class="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-base sm:text-xl shadow-inner shrink-0">🏛️</span>
                <div>
                    <h3 class="font-bold text-neutral-900 text-base sm:text-lg leading-tight">Steuer-Prognose & Liquiditätsabgaben</h3>
                    <p class="text-xs text-neutral-400 font-medium mt-0.5">Vorausschau der anfallenden Steuerzahlungen an das Finanzamt (ESt, GewSt & UStVA).</p>
                </div>
            </div>
        </div>

        <div class="flex flex-wrap items-center gap-2 self-start lg:self-auto">
            <!-- Steuer-Filter (Alle / Ertrag / USt) -->
            <div class="flex bg-neutral-100 p-1 rounded-xl border border-neutral-200/70 shadow-inner">
                <button 
                    onclick={() => taxFilter = 'all'} 
                    class="px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-bold rounded-lg transition-all touch-manipulation active:scale-95 {taxFilter === 'all' ? 'bg-white shadow-sm text-neutral-900' : 'text-neutral-500 hover:text-neutral-800'}"
                >
                    Alle Steuern
                </button>
                <button 
                    onclick={() => taxFilter = 'ertrag'} 
                    class="px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-bold rounded-lg transition-all touch-manipulation active:scale-95 {taxFilter === 'ertrag' ? 'bg-white shadow-sm text-amber-600' : 'text-neutral-500 hover:text-neutral-800'}"
                >
                    Ertragssteuern
                </button>
                <button 
                    onclick={() => taxFilter = 'ust'} 
                    class="px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-bold rounded-lg transition-all touch-manipulation active:scale-95 {taxFilter === 'ust' ? 'bg-white shadow-sm text-indigo-600' : 'text-neutral-500 hover:text-neutral-800'}"
                >
                    USt-Zahllast
                </button>
            </div>

            <!-- Szenario-Wähler -->
            <div class="flex bg-neutral-100 p-1 rounded-xl border border-neutral-200/70 shadow-inner">
                <button 
                    onclick={() => taxScenario = 'pessimistic'} 
                    class="px-2 py-1.5 text-[10px] sm:text-xs font-bold rounded-lg transition-all touch-manipulation active:scale-95 {taxScenario === 'pessimistic' ? 'bg-white shadow-sm text-amber-600' : 'text-neutral-500 hover:text-neutral-700'}" 
                    title="Pessimistisches Szenario (-15% Umsatz)"
                >
                    📉 -15%
                </button>
                <button 
                    onclick={() => taxScenario = 'realistic'} 
                    class="px-2 py-1.5 text-[10px] sm:text-xs font-bold rounded-lg transition-all touch-manipulation active:scale-95 {taxScenario === 'realistic' ? 'bg-white shadow-sm text-amber-600' : 'text-neutral-500 hover:text-neutral-700'}" 
                    title="Realistisches Szenario"
                >
                    ⚖️ Real
                </button>
                <button 
                    onclick={() => taxScenario = 'optimistic'} 
                    class="px-2 py-1.5 text-[10px] sm:text-xs font-bold rounded-lg transition-all touch-manipulation active:scale-95 {taxScenario === 'optimistic' ? 'bg-white shadow-sm text-amber-600' : 'text-neutral-500 hover:text-neutral-700'}" 
                    title="Optimistisches Szenario (+15% Umsatz)"
                >
                    📈 +15%
                </button>
            </div>
        </div>
    </div>

    <!-- KPI Cockpit: Dynamisch für den ausgewählten Monat oder 12M Prognose -->
    <div class="mb-5">
        <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-2">
                <span class="text-xs font-bold text-neutral-700 flex items-center gap-1.5">
                    {#if kpiMode === 'month'}
                        <span>📅</span> Kennzahlen für: <span class="text-amber-600 font-extrabold">{activeMonthName}</span>
                    {:else}
                        <span>🔮</span> Kennzahlen für: <span class="text-indigo-600 font-extrabold">12-Monats-Prognose (Zukunft)</span>
                    {/if}
                </span>
            </div>

            <!-- Umschalter Monat vs 12M Prognose -->
            <div class="flex bg-neutral-100 p-0.5 rounded-lg border border-neutral-200/70 text-[10px] font-bold">
                <button 
                    onclick={() => { kpiMode = 'month'; }} 
                    class="px-2.5 py-1 rounded-md transition-all touch-manipulation active:scale-95 {kpiMode === 'month' ? 'bg-white shadow-xs text-neutral-900 font-extrabold' : 'text-neutral-500 hover:text-neutral-800'}"
                    title="Zeigt die Steuern des aktuell ausgewählten Monats"
                >
                    Monat {activeMonthShort}
                </button>
                <button 
                    onclick={() => { kpiMode = 'forecast'; }} 
                    class="px-2.5 py-1 rounded-md transition-all touch-manipulation active:scale-95 {kpiMode === 'forecast' ? 'bg-white shadow-xs text-neutral-900 font-extrabold' : 'text-neutral-500 hover:text-neutral-800'}"
                    title="Zeigt die Durchschnitts- und Gesamtsummen der 12-Monats-Prognose"
                >
                    12M Prognose
                </button>
            </div>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
            <!-- 1. Steuerabgabe / Gesamt -->
            <div class="p-3 bg-neutral-50 rounded-2xl border border-neutral-100 transition-all">
                <span class="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                    {kpiMode === 'month' ? `Steuerabgabe (${activeMonthShort})` : 'Prognose 12M Gesamt'}
                </span>
                <span class="text-base sm:text-xl font-black text-rose-600 truncate block mt-0.5">
                    {kpiMode === 'month' ? formatCurrency(activeTax.gesamteAbgaben) : formatCurrency(forecastSummary.totalTax12M)}
                </span>
                <span class="text-[9px] text-neutral-400 font-medium">
                    {kpiMode === 'month' ? 'Finanzamt fällig' : 'Finanzamt-Abgaben'}
                </span>
            </div>

            <!-- 2. Monatsrücklage -->
            <div class="p-3 bg-neutral-50 rounded-2xl border border-neutral-100 transition-all">
                <span class="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                    {kpiMode === 'month' ? `Monatsrücklage (${activeMonthShort})` : 'Monatsrücklage Ø'}
                </span>
                <span class="text-base sm:text-xl font-black text-amber-600 truncate block mt-0.5">
                    {kpiMode === 'month' ? formatCurrency(activeTax.ertragsteuern) : formatCurrency(forecastSummary.avgMonthlyTax)}
                </span>
                <span class="text-[9px] text-neutral-400 font-medium">
                    {kpiMode === 'month' ? 'ESt + GewSt Rücklage' : 'Empfohlener Puffer'}
                </span>
            </div>

            <!-- 3. Davon USt-Zahllast -->
            <div class="p-3 bg-neutral-50 rounded-2xl border border-neutral-100 transition-all">
                <span class="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                    {kpiMode === 'month' ? `Davon USt-Zahllast (${activeMonthShort})` : 'Davon USt-Zahllast'}
                </span>
                <span class="text-base sm:text-xl font-black text-indigo-600 truncate block mt-0.5">
                    {kpiMode === 'month' ? (activeTax.ustZahllast >= 0 ? formatCurrency(activeTax.ustZahllast) : `+${formatCurrency(Math.abs(activeTax.ustZahllast))} Guthaben`) : formatCurrency(forecastSummary.totalUst12M)}
                </span>
                <span class="text-[9px] text-neutral-400 font-medium">
                    {kpiMode === 'month' ? (activeTax.ustZahllast >= 0 ? 'UStVA Zahllast' : 'Vorsteuerüberhang') : 'UStVA 12 Monate'}
                </span>
            </div>

            <!-- 4. Ertragssteuerquote -->
            <div class="p-3 bg-neutral-50 rounded-2xl border border-neutral-100 transition-all">
                <span class="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                    {kpiMode === 'month' ? `Ertragssteuerquote (${activeMonthShort})` : 'Ertragssteuerquote'}
                </span>
                <span class="text-base sm:text-xl font-black text-neutral-800 truncate block mt-0.5">
                    {kpiMode === 'month' ? `~${activeTax.effectiveRate.toFixed(1)}%` : `~${forecastSummary.avgEffectiveRate.toFixed(1)}%`}
                </span>
                <span class="text-[9px] text-neutral-400 font-medium">
                    {kpiMode === 'month' ? 'Auf Vorsteuergewinn' : 'ESt + GewSt auf Gewinn'}
                </span>
            </div>
        </div>
    </div>

    <!-- Legende -->
    <div class="flex flex-wrap items-center justify-between gap-2 text-[10px] font-bold text-neutral-400 mb-3 px-1">
        <div class="flex items-center gap-3">
            <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Einkommensteuer</span>
            <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-purple-500"></span> Gewerbesteuer</span>
            <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-indigo-500"></span> USt-Zahllast</span>
            {#if taxFilter === 'all'}
                <span class="flex items-center gap-1.5 text-neutral-500">(Gestapelte Balken)</span>
            {/if}
        </div>
        <span class="text-neutral-400 text-[9px] hidden sm:inline">💡 Klick auf einen Balken wählt den Monat aus</span>
    </div>

    <!-- Diagramm: Balkensystem -->
    {#if taxTimeline.length > 0}
        {@const maxVal = Math.max(...taxTimeline.map((t: any) => t.barVal || 0), 1)}

        <div class="w-full h-48 sm:h-52 flex gap-2 items-end overflow-x-auto custom-scrollbar touch-pan-x overscroll-x-contain pb-2 pt-6 select-none border-b border-neutral-100">
            {#each taxTimeline as item}
                {@const tax = item.tax}
                {@const totalVal = item.barVal}
                {@const barHeightPct = Math.max(6, Math.min(100, Math.round((totalVal / maxVal) * 100)))}
                {@const isSelected = (selectedMonthDetail?.month === item.month) || (!selectedMonthDetail && item.monthIndex === (selectedMonth - 1) && item.year === selectedYear)}

                <!-- Segmente der gestapelten Steuerbalken berechnen -->
                {@const estPct = totalVal > 0 ? (tax.einkommensteuer / totalVal) * 100 : 0}
                {@const gewStPct = totalVal > 0 ? (tax.gewerbesteuer / totalVal) * 100 : 0}
                {@const ustPct = totalVal > 0 ? (Math.max(0, tax.ustZahllast) / totalVal) * 100 : 0}

                <button 
                    onclick={() => handleBarClick(item)}
                    class="flex flex-col items-center shrink-0 group/bar flex-1 min-w-[44px] sm:min-w-[50px] h-full justify-end cursor-pointer transition-transform hover:-translate-y-1 active:scale-95 touch-manipulation focus:outline-none {isSelected ? 'scale-105' : ''}"
                    title="{item.month}: {item.isHistorical ? 'Ist' : 'Prognose'} Steuerabgaben {formatCurrency(totalVal)}"
                >
                    <!-- Zahl klein über dem Balken -->
                    <span class="text-[9px] font-black leading-none mb-1 whitespace-nowrap {isSelected ? 'text-amber-600 scale-110 font-extrabold' : 'text-neutral-700'}">
                        {formatBarAmount(totalVal)}
                    </span>

                    <!-- Der gestapelte Balken -->
                    <div class="w-full h-28 sm:h-32 flex items-end justify-center relative">
                        <div 
                            class="w-full rounded-t-lg transition-all shadow-sm overflow-hidden flex flex-col justify-end {isSelected ? 'ring-2 ring-amber-500 ring-offset-2' : ''}" 
                            style="height: {barHeightPct}%;"
                        >
                            {#if taxFilter === 'all'}
                                <!-- Gestapelt: USt (oben) -> GewSt (mitte) -> ESt (unten) -->
                                {#if ustPct > 0}
                                    <div class="w-full bg-indigo-500 transition-all" style="height: {ustPct}%;" title="USt: {formatCurrency(tax.ustZahllast)}"></div>
                                {/if}
                                {#if gewStPct > 0}
                                    <div class="w-full bg-purple-500 transition-all" style="height: {gewStPct}%;" title="GewSt: {formatCurrency(tax.gewerbesteuer)}"></div>
                                {/if}
                                {#if estPct > 0}
                                    <div class="w-full bg-blue-500 transition-all" style="height: {estPct}%;" title="ESt: {formatCurrency(tax.einkommensteuer)}"></div>
                                {/if}
                                {#if totalVal === 0}
                                    <div class="w-full h-1 bg-neutral-200"></div>
                                {/if}
                            {:else if taxFilter === 'ertrag'}
                                <div class="w-full h-full bg-amber-500 group-hover/bar:bg-amber-600 transition-all"></div>
                            {:else}
                                <div class="w-full h-full bg-indigo-500 group-hover/bar:bg-indigo-600 transition-all"></div>
                            {/if}
                        </div>
                    </div>

                    <!-- Monats-Name & Typ -->
                    <div class="flex flex-col items-center mt-1.5 w-full">
                        <span class="text-[10px] font-bold {isSelected ? 'text-amber-600 font-extrabold' : 'text-neutral-700'} group-hover/bar:text-amber-600 transition-colors truncate text-center">
                            {item.monthShort}
                        </span>
                        <span class="text-[7px] font-bold uppercase px-0.5 rounded {item.isHistorical ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">
                            {item.isHistorical ? 'Ist' : 'Prog'}
                        </span>
                    </div>
                </button>
            {/each}
        </div>
    {/if}

    <!-- Ausgewählter Monats-Detail-Drawer / Popover -->
    {#if selectedMonthDetail}
        {@const dTax = selectedMonthDetail.tax}
        <div class="mt-4 p-4 bg-neutral-50/90 rounded-2xl border border-neutral-200/80 animate-enter relative">
            <button 
                onclick={() => selectedMonthDetail = null} 
                class="absolute top-3 right-3 w-7 h-7 bg-white hover:bg-neutral-200 text-neutral-500 rounded-full flex items-center justify-center text-xs shadow-sm transition-colors"
                title="Schließen"
            >
                ✕
            </button>

            <div class="flex flex-col sm:flex-row sm:items-center justify-between mb-3 pr-8 gap-2">
                <div>
                    <h4 class="font-black text-neutral-900 text-sm sm:text-base flex items-center gap-2">
                        <span>📅</span> Steuer-Detail: {selectedMonthDetail.month}
                        <span class="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded {selectedMonthDetail.isHistorical ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">
                            {selectedMonthDetail.isHistorical ? 'Reale Ist-Daten' : `Prognose (${taxScenario})`}
                        </span>
                    </h4>
                    <p class="text-[11px] text-neutral-500 mt-0.5">Basis: Vorläufiger Gewinn {formatCurrency(selectedMonthDetail.profit)} bei {formatCurrency(selectedMonthDetail.rev)} Erlösen.</p>
                </div>
                {#if onSelectMonth}
                    <button 
                        onclick={() => onSelectMonth(selectedMonthDetail.monthIndex + 1, selectedMonthDetail.year)} 
                        class="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold rounded-xl shadow-sm transition-all self-start sm:self-auto touch-manipulation active:scale-95"
                    >
                        BWA {selectedMonthDetail.monthShort} ansehen &rarr;
                    </button>
                {/if}
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                <!-- Ertragssteuern Box -->
                <div class="bg-white p-3 rounded-xl border border-neutral-100 space-y-1">
                    <span class="text-[10px] font-bold text-neutral-400 uppercase block">1. Ertragssteuern</span>
                    <div class="flex justify-between">
                        <span class="text-neutral-600">Einkommensteuer:</span>
                        <span class="font-bold text-neutral-900">{formatCurrency(dTax.einkommensteuer)}</span>
                    </div>
                    {#if dTax.gewStAnrechnung > 0}
                        <div class="flex justify-between text-[10px] text-emerald-600">
                            <span>§ 35 GewSt-Abzug:</span>
                            <span>-{formatCurrency(dTax.gewStAnrechnung)}</span>
                        </div>
                    {/if}
                    <div class="flex justify-between">
                        <span class="text-neutral-600">Gewerbesteuer:</span>
                        <span class="font-bold text-neutral-900">{formatCurrency(dTax.gewerbesteuer)}</span>
                    </div>
                    {#if dTax.soli > 0}
                        <div class="flex justify-between">
                            <span class="text-neutral-600">Solidaritätszuschlag:</span>
                            <span class="font-bold text-neutral-900">{formatCurrency(dTax.soli)}</span>
                        </div>
                    {/if}
                    <div class="flex justify-between border-t border-neutral-100 pt-1 font-bold">
                        <span class="text-neutral-800">Ertragssteuern:</span>
                        <span class="text-amber-600">{formatCurrency(dTax.ertragsteuern)}</span>
                    </div>
                </div>

                <!-- UStVA Box -->
                <div class="bg-white p-3 rounded-xl border border-neutral-100 space-y-1">
                    <span class="text-[10px] font-bold text-neutral-400 uppercase block">2. USt-Zahllast (UStVA)</span>
                    <div class="flex justify-between">
                        <span class="text-neutral-600">Vereinnahmte USt:</span>
                        <span class="font-semibold text-neutral-900">{formatCurrency(dTax.umsatzsteuer)}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-neutral-600">Abziehbare Vorsteuer:</span>
                        <span class="font-semibold text-neutral-900">{formatCurrency(dTax.vorsteuer)}</span>
                    </div>
                    <div class="flex justify-between border-t border-neutral-100 pt-1 font-bold">
                        <span class="text-neutral-800">USt-Zahllast:</span>
                        <span class="{dTax.ustZahllast >= 0 ? 'text-indigo-600' : 'text-emerald-600'}">
                            {dTax.ustZahllast >= 0 ? formatCurrency(dTax.ustZahllast) : `+${formatCurrency(Math.abs(dTax.ustZahllast))} Erstattung`}
                        </span>
                    </div>
                </div>

                <!-- Gesamtabgabe Box -->
                <div class="bg-neutral-900 text-white p-3 rounded-xl border border-neutral-800 flex flex-col justify-between">
                    <div>
                        <span class="text-[10px] font-bold text-neutral-400 uppercase block">3. Abgaben & Netto</span>
                        <div class="flex justify-between mt-1 text-xs">
                            <span class="text-neutral-300">Finanzamt gesamt:</span>
                            <span class="font-black text-rose-400 text-sm">{formatCurrency(dTax.gesamteAbgaben)}</span>
                        </div>
                    </div>
                    <div class="border-t border-neutral-800 pt-1.5 mt-1.5 flex justify-between text-xs">
                        <span class="text-neutral-300">Freie Liquidität:</span>
                        <span class="font-black {dTax.liquiditaetNachAllenAbgaben >= 0 ? 'text-emerald-400' : 'text-rose-400'}">
                            {formatCurrency(dTax.liquiditaetNachAllenAbgaben)}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    {/if}
</div>
