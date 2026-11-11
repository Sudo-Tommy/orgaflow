<script lang="ts">
    import { calculateTaxEstimate } from "$lib/services/bwaService.svelte";
    import {
        formatCurrency,
        formatBarAmount,
        calculateVatRatios,
        buildTaxTimeline,
        buildForecastSummary
    } from "./bwaTaxCalculations";
    import BwaTaxKpiCards from "./BwaTaxKpiCards.svelte";
    import BwaTaxDetailDrawer from "./BwaTaxDetailDrawer.svelte";

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

    $effect(() => {
        if (selectedMonth && selectedMonthDetail && (selectedMonthDetail.monthIndex + 1 !== selectedMonth || selectedMonthDetail.year !== selectedYear)) {
            selectedMonthDetail = null;
        }
    });

    const vatRatios = $derived.by(() => calculateVatRatios(bwa));

    const taxTimeline = $derived.by(() => 
        buildTaxTimeline(bwa, taxScenario, taxFilter, vatRatios)
    );

    const activeMonthName = $derived.by(() => {
        if (selectedMonthDetail) return selectedMonthDetail.month;
        const d = new Date(selectedYear, selectedMonth - 1, 1);
        return d.toLocaleString('de-DE', { month: 'long', year: 'numeric' });
    });

    const activeMonthShort = $derived.by(() => {
        if (selectedMonthDetail) return selectedMonthDetail.monthShort;
        const d = new Date(selectedYear, selectedMonth - 1, 1);
        return d.toLocaleString('de-DE', { month: 'short' });
    });

    const activeTax = $derived.by(() => {
        if (selectedMonthDetail) return selectedMonthDetail.tax;
        const targetItem = taxTimeline.find((t: any) => t.monthIndex === (selectedMonth - 1) && t.year === selectedYear);
        if (targetItem) return targetItem.tax;
        if (currentTaxEstimate) return currentTaxEstimate;
        return calculateTaxEstimate(0, 'monthly', 0, 0, 0);
    });

    const forecastSummary = $derived.by(() => buildForecastSummary(taxTimeline));

    function handleBarClick(item: any) {
        selectedMonthDetail = item;
        selectedMonth = item.monthIndex + 1;
        kpiMode = 'month';
    }
</script>

<div class="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-neutral-100 dark:border-slate-800 shadow-sm p-4 sm:p-6 group hover:shadow-md transition-shadow relative">
    <!-- Header: Titel & Steuerung -->
    <div class="flex flex-col lg:flex-row lg:items-center justify-between pb-4 mb-4 border-b border-neutral-100 dark:border-slate-800 gap-3">
        <div>
            <div class="flex items-center gap-2.5 sm:gap-3">
                <span class="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center text-base sm:text-xl shadow-inner shrink-0">🏛️</span>
                <div>
                    <h3 class="font-bold text-neutral-900 dark:text-white text-base sm:text-lg leading-tight">Steuer-Prognose & Liquiditätsabgaben</h3>
                    <p class="text-xs text-neutral-400 dark:text-slate-400 font-medium mt-0.5">Vorausschau der anfallenden Steuerzahlungen an das Finanzamt (ESt, GewSt & UStVA).</p>
                </div>
            </div>
        </div>

        <div class="flex flex-wrap items-center gap-2 self-start lg:self-auto">
            <!-- Steuer-Filter (Alle / Ertrag / USt) -->
            <div class="flex bg-neutral-100 dark:bg-slate-800 p-1 rounded-xl border border-neutral-200/70 dark:border-slate-700 shadow-inner">
                <button 
                    type="button"
                    onclick={() => taxFilter = 'all'} 
                    class="px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-bold rounded-lg transition-all touch-manipulation active:scale-95 cursor-pointer min-h-[36px] flex items-center justify-center {taxFilter === 'all' ? 'bg-white dark:bg-slate-700 shadow-sm text-neutral-900 dark:text-white' : 'text-neutral-500 dark:text-slate-400 hover:text-neutral-800 dark:hover:text-slate-200'}"
                >
                    Alle Steuern
                </button>
                <button 
                    type="button"
                    onclick={() => taxFilter = 'ertrag'} 
                    class="px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-bold rounded-lg transition-all touch-manipulation active:scale-95 cursor-pointer min-h-[36px] flex items-center justify-center {taxFilter === 'ertrag' ? 'bg-white dark:bg-slate-700 shadow-sm text-amber-600 dark:text-amber-300' : 'text-neutral-500 dark:text-slate-400 hover:text-neutral-800 dark:hover:text-slate-200'}"
                >
                    Ertragssteuern
                </button>
                <button 
                    type="button"
                    onclick={() => taxFilter = 'ust'} 
                    class="px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-bold rounded-lg transition-all touch-manipulation active:scale-95 cursor-pointer min-h-[36px] flex items-center justify-center {taxFilter === 'ust' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-300' : 'text-neutral-500 dark:text-slate-400 hover:text-neutral-800 dark:hover:text-slate-200'}"
                >
                    USt-Zahllast
                </button>
            </div>

            <!-- Szenario-Wähler -->
            <div class="flex bg-neutral-100 dark:bg-slate-800 p-1 rounded-xl border border-neutral-200/70 dark:border-slate-700 shadow-inner">
                <button 
                    type="button"
                    onclick={() => taxScenario = 'pessimistic'} 
                    class="px-2 py-1.5 text-[10px] sm:text-xs font-bold rounded-lg transition-all touch-manipulation active:scale-95 cursor-pointer min-h-[36px] flex items-center justify-center {taxScenario === 'pessimistic' ? 'bg-white dark:bg-slate-700 shadow-sm text-amber-600 dark:text-amber-300' : 'text-neutral-500 dark:text-slate-400 hover:text-neutral-700 dark:hover:text-slate-200'}" 
                    title="Pessimistisches Szenario (-15% Umsatz)"
                >
                    📉 -15%
                </button>
                <button 
                    type="button"
                    onclick={() => taxScenario = 'realistic'} 
                    class="px-2 py-1.5 text-[10px] sm:text-xs font-bold rounded-lg transition-all touch-manipulation active:scale-95 cursor-pointer min-h-[36px] flex items-center justify-center {taxScenario === 'realistic' ? 'bg-white dark:bg-slate-700 shadow-sm text-amber-600 dark:text-amber-300' : 'text-neutral-500 dark:text-slate-400 hover:text-neutral-700 dark:hover:text-slate-200'}" 
                    title="Realistisches Szenario"
                >
                    ⚖️ Real
                </button>
                <button 
                    type="button"
                    onclick={() => taxScenario = 'optimistic'} 
                    class="px-2 py-1.5 text-[10px] sm:text-xs font-bold rounded-lg transition-all touch-manipulation active:scale-95 cursor-pointer min-h-[36px] flex items-center justify-center {taxScenario === 'optimistic' ? 'bg-white dark:bg-slate-700 shadow-sm text-amber-600 dark:text-amber-300' : 'text-neutral-500 dark:text-slate-400 hover:text-neutral-700 dark:hover:text-slate-200'}" 
                    title="Optimistisches Szenario (+15% Umsatz)"
                >
                    📈 +15%
                </button>
            </div>
        </div>
    </div>

    <!-- KPI Cockpit -->
    <BwaTaxKpiCards
        {kpiMode}
        {activeMonthName}
        {activeMonthShort}
        {activeTax}
        {forecastSummary}
        onToggleKpiMode={(m) => kpiMode = m}
    />

    <!-- Legende -->
    <div class="flex flex-wrap items-center justify-between gap-2 text-[10px] font-bold text-neutral-400 dark:text-slate-400 mb-3 px-1">
        <div class="flex items-center gap-3">
            <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Einkommensteuer</span>
            <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-purple-500"></span> Gewerbesteuer</span>
            <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-indigo-500"></span> USt-Zahllast</span>
            {#if taxFilter === 'all'}
                <span class="flex items-center gap-1.5 text-neutral-500 dark:text-slate-500">(Gestapelte Balken)</span>
            {/if}
        </div>
        <span class="text-neutral-400 dark:text-slate-500 text-[9px] hidden sm:inline">💡 Klick auf einen Balken wählt den Monat aus</span>
    </div>

    <!-- Diagramm: Balkensystem -->
    {#if taxTimeline.length > 0}
        {@const maxVal = Math.max(...taxTimeline.map((t: any) => t.barVal || 0), 1)}

        <div class="w-full h-48 sm:h-52 flex gap-2 items-end overflow-x-auto custom-scrollbar touch-pan-x overscroll-x-contain pb-2 pt-6 select-none border-b border-neutral-100 dark:border-slate-800">
            {#each taxTimeline as item (item.month + item.year)}
                {@const tax = item.tax}
                {@const totalVal = item.barVal}
                {@const barHeightPct = Math.max(6, Math.min(100, Math.round((totalVal / maxVal) * 100)))}
                {@const isSelected = (selectedMonthDetail?.month === item.month) || (!selectedMonthDetail && item.monthIndex === (selectedMonth - 1) && item.year === selectedYear)}
                {@const estPct = totalVal > 0 ? (tax.einkommensteuer / totalVal) * 100 : 0}
                {@const gewStPct = totalVal > 0 ? (tax.gewerbesteuer / totalVal) * 100 : 0}
                {@const ustPct = totalVal > 0 ? (Math.max(0, tax.ustZahllast) / totalVal) * 100 : 0}

                <button 
                    type="button"
                    onclick={() => handleBarClick(item)}
                    class="flex flex-col items-center shrink-0 group/bar flex-1 min-w-[44px] sm:min-w-[50px] h-full justify-end cursor-pointer transition-transform hover:-translate-y-1 active:scale-95 touch-manipulation focus:outline-none {isSelected ? 'scale-105' : ''}"
                    title="{item.month}: {item.isHistorical ? 'Ist' : 'Prognose'} Steuerabgaben {formatCurrency(totalVal)}"
                >
                    <span class="text-[9px] font-black leading-none mb-1 whitespace-nowrap {isSelected ? 'text-amber-600 dark:text-amber-400 scale-110 font-extrabold' : 'text-neutral-700 dark:text-slate-300'}">
                        {formatBarAmount(totalVal)}
                    </span>

                    <div class="w-full h-28 sm:h-32 flex items-end justify-center relative">
                        <div 
                            class="w-full rounded-t-lg transition-all shadow-sm overflow-hidden flex flex-col justify-end {isSelected ? 'ring-2 ring-amber-500 ring-offset-2 dark:ring-offset-slate-900' : ''}" 
                            style="height: {barHeightPct}%;"
                        >
                            {#if taxFilter === 'all'}
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
                                    <div class="w-full h-1 bg-neutral-200 dark:bg-slate-700"></div>
                                {/if}
                            {:else if taxFilter === 'ertrag'}
                                <div class="w-full h-full bg-amber-500 group-hover/bar:bg-amber-600 transition-all"></div>
                            {:else}
                                <div class="w-full h-full bg-indigo-500 group-hover/bar:bg-indigo-600 transition-all"></div>
                            {/if}
                        </div>
                    </div>

                    <div class="flex flex-col items-center mt-1.5 w-full">
                        <span class="text-[10px] font-bold {isSelected ? 'text-amber-600 dark:text-amber-400 font-extrabold' : 'text-neutral-700 dark:text-slate-300'} group-hover/bar:text-amber-600 transition-colors truncate text-center">
                            {item.monthShort}
                        </span>
                        <span class="text-[7px] font-bold uppercase px-0.5 rounded {item.isHistorical ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300' : 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300'}">
                            {item.isHistorical ? 'Ist' : 'Prog'}
                        </span>
                    </div>
                </button>
            {/each}
        </div>
    {/if}

    <!-- Ausgewählter Monats-Detail-Drawer -->
    <BwaTaxDetailDrawer
        {selectedMonthDetail}
        {taxScenario}
        {onSelectMonth}
        onClose={() => selectedMonthDetail = null}
    />
</div>
