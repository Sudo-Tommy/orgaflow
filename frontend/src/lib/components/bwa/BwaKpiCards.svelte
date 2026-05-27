<script lang="ts">
    let { currentBWA, previousBWA, onOpenDetail } = $props<any>();

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
</script>

<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8 animate-enter delay-100">
    <button onclick={onOpenDetail} class="text-left bg-white p-5 rounded-3xl border border-neutral-100 shadow-sm flex items-center justify-between hover:border-indigo-200 transition-all hover:shadow-md group">
        <div>
            <p class="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1 group-hover:text-indigo-500 transition-colors">Umsatz (Geflossen)</p>
            <p class="text-2xl font-black text-neutral-900">{formatCurrency(currentBWA.revenue)}</p>
            <div class="mt-1 flex items-center gap-1.5 text-xs font-bold"><span class={getTrendColor(currentBWA.revenue, previousBWA.revenue)}>{formatPercent(currentBWA.revenue, previousBWA.revenue)}</span><span class="text-neutral-300">vs Vorperiode</span></div>
            <div class="mt-2 text-[10px] text-neutral-500 flex flex-col gap-0.5"><span class="text-amber-500 font-semibold" title="Ausstehende Zahlungen">⏳ Zzgl. {formatCurrency(currentBWA.revenueOpen)} noch offen</span></div>
        </div>
        <div class="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-2xl shadow-inner shrink-0 group-hover:scale-110 transition-transform">💶</div>
    </button>
    
    <button onclick={onOpenDetail} class="text-left bg-white p-5 rounded-3xl border border-neutral-100 shadow-sm flex items-center justify-between hover:border-rose-200 transition-all hover:shadow-md group">
        <div>
            <p class="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1 group-hover:text-rose-500 transition-colors">Kosten</p>
            <p class="text-2xl font-black text-neutral-900">{formatCurrency(currentBWA.materialCosts + currentBWA.personnelCosts + currentBWA.roomCosts + currentBWA.operatingTaxes + currentBWA.otherOperatingExpenses)}</p>
            <div class="mt-1 flex items-center gap-1.5 text-xs font-bold"><span class={getTrendColor(currentBWA.grossProfit, previousBWA.grossProfit)}>{formatPercent(currentBWA.grossProfit, previousBWA.grossProfit)}</span><span class="text-neutral-300">vs Vorperiode</span></div>
        </div>
        <div class="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center text-2xl shadow-inner shrink-0 group-hover:scale-110 transition-transform">📉</div>
    </button>
    
    <button onclick={onOpenDetail} class="text-left bg-white p-5 rounded-3xl border border-neutral-100 shadow-sm flex items-center justify-between hover:border-purple-200 transition-all hover:shadow-md group">
        <div>
            <p class="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1 group-hover:text-purple-500 transition-colors">EBITDA</p>
            <p class="text-2xl font-black text-neutral-900">{formatCurrency(currentBWA.ebitda)}</p>
            <div class="mt-1 flex items-center gap-1.5 text-xs font-bold"><span class={getTrendColor(currentBWA.ebitda, previousBWA.ebitda)}>{formatPercent(currentBWA.ebitda, previousBWA.ebitda)}</span><span class="text-neutral-300">vs Vorperiode</span></div>
        </div>
        <div class="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center text-2xl shadow-inner shrink-0 group-hover:scale-110 transition-transform">📊</div>
    </button>
    
    <button onclick={onOpenDetail} class="text-left bg-white p-5 rounded-3xl border border-neutral-100 shadow-sm flex items-center justify-between transition-all hover:shadow-md group {currentBWA.netIncome >= 0 ? 'hover:border-emerald-200' : 'hover:border-rose-200'}">
        <div>
            <p class="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1 transition-colors {currentBWA.netIncome >= 0 ? 'group-hover:text-emerald-500' : 'group-hover:text-rose-500'}">Gewinn</p>
            <p class="text-2xl font-black {currentBWA.netIncome >= 0 ? 'text-emerald-600' : 'text-rose-600'}">{formatCurrency(currentBWA.netIncome)}</p>
            <div class="mt-1 flex items-center gap-1.5 text-xs font-bold"><span class={getTrendColor(currentBWA.netIncome, previousBWA.netIncome)}>{formatPercent(currentBWA.netIncome, previousBWA.netIncome)}</span><span class="text-neutral-300">vs Vorperiode</span></div>
        </div>
        <div class="w-12 h-12 rounded-2xl {currentBWA.netIncome >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'} flex items-center justify-center text-2xl shadow-inner shrink-0 group-hover:scale-110 transition-transform">📈</div>
    </button>
</div>