<script lang="ts">
    let { widgetBWA, currentUnbilled, wipDate, prevWipMonth, nextWipMonth, onOpenDetail } = $props<any>();
    function formatCurrency(val: number) { return (val || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' }); }
</script>

<div class="bg-white rounded-3xl border border-neutral-100 shadow-sm flex flex-col p-6 group hover:shadow-md transition-shadow">
    <div class="flex items-start justify-between mb-4">
        <div>
            <h3 class="font-bold text-neutral-900 flex items-center gap-3 text-lg"><span class="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-base shadow-inner">⚖️</span> Finanz-Balance</h3>
            <div class="flex items-center gap-1.5 mt-3 bg-neutral-50 border border-neutral-200/60 rounded-xl p-1 shadow-sm w-max">
                <button onclick={prevWipMonth} class="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white hover:shadow-sm text-neutral-500 hover:text-indigo-600 font-bold transition-all">◀</button>
                <span class="text-xs font-bold text-neutral-800 w-28 text-center">{wipDate.toLocaleString('de-DE', {month:'long', year:'numeric'})}</span>
                <button onclick={nextWipMonth} class="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white hover:shadow-sm text-neutral-500 hover:text-indigo-600 font-bold transition-all">▶</button>
            </div>
        </div>
        <button onclick={onOpenDetail} class="w-10 h-10 rounded-full bg-neutral-50 hover:bg-indigo-50 text-neutral-400 hover:text-indigo-600 flex items-center justify-center transition-colors shrink-0" title="Detaillierte BWA öffnen">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
        </button>
    </div>
    {#if widgetBWA}
        {@const expTotal = widgetBWA.materialCosts + widgetBWA.personnelCosts + widgetBWA.roomCosts + widgetBWA.operatingTaxes + widgetBWA.otherOperatingExpenses}
        <div class="flex-1 flex flex-col justify-center py-2">
            <div class="flex items-center justify-between mb-2"><span class="text-sm font-bold text-indigo-600">Umsatz: {formatCurrency(widgetBWA.revenue)}</span><span class="text-sm font-bold text-rose-600">Kosten: {formatCurrency(expTotal)}</span></div>
            <div class="w-full h-5 bg-neutral-100 rounded-full mb-4 overflow-hidden flex shadow-inner">
                <div class="h-full bg-emerald-400 transition-all duration-1000" style="width: {widgetBWA.revenue > 0 ? Math.max(0, (widgetBWA.netIncome / widgetBWA.revenue) * 100) : 0}%" title="Gewinn"></div>
                <div class="h-full bg-rose-400 transition-all duration-1000" style="width: {widgetBWA.revenue > 0 ? Math.min(100, (expTotal / widgetBWA.revenue) * 100) : 0}%" title="Ausgaben"></div>
            </div>
            <div class="text-center mt-2"><span class="text-xs font-bold text-neutral-400 uppercase tracking-wider block mb-1">Vorläufiges Ergebnis</span><span class="text-3xl font-black {widgetBWA.netIncome >= 0 ? 'text-emerald-600' : 'text-rose-600'}">{formatCurrency(widgetBWA.netIncome)}</span></div>
            
            <!-- WIP & Offene Forderungen -->
            <div class="mt-5 pt-4 border-t border-neutral-100 flex flex-col gap-4">
                <div class="flex items-start justify-between">
                    <div class="flex items-start gap-3"><span class="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center text-sm shadow-inner shrink-0 mt-1">⏳</span><div class="flex flex-col"><span class="text-xs font-bold text-neutral-600 uppercase tracking-wider mb-1">Unbezahlte Leistung (WIP)</span><span class="text-[10px] text-neutral-400 font-medium leading-snug max-w-56">Erfasste Leistungen aus allen offenen Terminen des Monats.</span></div></div>
                    <div class="text-right shrink-0 mt-1"><span class="text-lg font-black text-amber-600 block leading-none">{formatCurrency(currentUnbilled)}</span></div>
                </div>
                <div class="flex items-start justify-between pt-4 border-t border-neutral-100/50">
                    <div class="flex items-start gap-3"><span class="w-8 h-8 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center text-sm shadow-inner shrink-0 mt-1">📄</span><div class="flex flex-col"><span class="text-xs font-bold text-neutral-600 uppercase tracking-wider mb-1">Noch offene Forderungen</span><span class="text-[10px] text-neutral-400 font-medium leading-snug max-w-56">Gestellte Rechnungen mit Fälligkeit in diesem Monat, die noch offen sind.</span></div></div>
                    <div class="text-right shrink-0 mt-1"><span class="text-lg font-black text-orange-600 block leading-none">{formatCurrency(widgetBWA.revenueOpen)}</span></div>
                </div>
            </div>
        </div>
    {/if}
</div>