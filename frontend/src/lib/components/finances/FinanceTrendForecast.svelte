<script lang="ts">
    let {
        timelineStats = [],
        forecastScenario = $bindable('realistic'),
        onOpenMonthModal = () => {},
        onOpenCurrentMonthModal = () => {}
    }: {
        timelineStats?: any[];
        forecastScenario?: 'realistic' | 'optimistic' | 'pessimistic';
        onOpenMonthModal?: (m: any) => void;
        onOpenCurrentMonthModal?: () => void;
    } = $props();

    function formatCurrency(val: number) {
        return (val || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
    }

    function formatBarAmount(val: number): string {
        const sign = val > 0 ? '+' : (val < 0 ? '-' : '');
        const absVal = Math.abs(val);
        if (absVal >= 1000) return sign + (absVal / 1000).toFixed(1).replace('.', ',') + 'k';
        return (val > 0 ? '+' : '') + Math.round(val) + ' €';
    }
</script>

<div class="bg-white rounded-2xl sm:rounded-3xl border border-neutral-100 shadow-sm flex flex-col p-4 sm:p-6 group hover:shadow-md transition-shadow justify-between">
    <div>
        <div class="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
            <div class="flex items-center gap-2.5 sm:gap-3">
                <span class="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center text-sm sm:text-base shadow-inner shrink-0">🔮</span>
                <div>
                    <h3 class="font-bold text-neutral-900 text-base sm:text-lg leading-tight">Haushalts-Prognose (12M)</h3>
                    <p class="text-[11px] text-neutral-400 font-medium">Reale Monate & rollierende 12-Monats-Zukunftsprognose</p>
                </div>
            </div>
            <div class="flex items-center gap-1.5 sm:gap-2 self-start sm:self-auto">
                <div class="flex bg-neutral-100 p-0.5 sm:p-1 rounded-xl border border-neutral-200/70 shadow-inner">
                    <button onclick={() => forecastScenario = 'pessimistic'} class="px-2 sm:px-2.5 py-1 text-[10px] sm:text-xs font-bold rounded-lg transition-colors {forecastScenario === 'pessimistic' ? 'bg-white shadow-sm text-purple-600' : 'text-neutral-500 hover:text-neutral-700'}" title="Pessimistisch (-15%)">📉 -15%</button>
                    <button onclick={() => forecastScenario = 'realistic'} class="px-2 sm:px-2.5 py-1 text-[10px] sm:text-xs font-bold rounded-lg transition-colors {forecastScenario === 'realistic' ? 'bg-white shadow-sm text-purple-600' : 'text-neutral-500 hover:text-neutral-700'}" title="Realistisch">⚖️ Real</button>
                    <button onclick={() => forecastScenario = 'optimistic'} class="px-2 sm:px-2.5 py-1 text-[10px] sm:text-xs font-bold rounded-lg transition-colors {forecastScenario === 'optimistic' ? 'bg-white shadow-sm text-purple-600' : 'text-neutral-500 hover:text-neutral-700'}" title="Optimistisch (+15%)">📈 +15%</button>
                </div>
                <button onclick={onOpenCurrentMonthModal} class="w-9 h-9 rounded-xl bg-neutral-50 hover:bg-purple-50 text-neutral-400 hover:text-purple-600 flex items-center justify-center transition-colors" title="Monatsbericht öffnen">
                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                </button>
            </div>
        </div>

        <div class="flex items-center gap-3 text-[10px] font-bold text-neutral-400 mb-2">
            <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-emerald-500"></span> Ist</span>
            <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-indigo-500"></span> Prog</span>
            <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-rose-500"></span> Defizit</span>
            <span class="text-neutral-300 ml-auto hidden sm:inline text-[9px]">💡 Klick = Monatsbericht</span>
        </div>

        {#if timelineStats.length > 0}
            {@const mult = forecastScenario === 'optimistic' ? 1.15 : (forecastScenario === 'pessimistic' ? 0.85 : 1)}
            {@const maxVal = Math.max(...timelineStats.map((f: any) => Math.abs((f.isHistorical ? f.income : (f.income * mult)) - f.expenses)), 1)}
            <div class="w-full h-48 sm:h-52 flex gap-2 items-end overflow-x-auto custom-scrollbar touch-pan-x overscroll-x-contain pb-2 pt-6 flex-1 select-none">
                {#each timelineStats as f}
                    {@const inc = f.isHistorical ? f.income : (f.income * mult)}
                    {@const val = inc - f.expenses}
                    {@const barHeight = Math.max(6, Math.min(100, Math.round((Math.abs(val) / maxVal) * 100)))}
                    <button onclick={() => onOpenMonthModal(f)} class="flex flex-col items-center shrink-0 group/bar flex-1 min-w-[42px] sm:min-w-[48px] h-full justify-end cursor-pointer transition-transform hover:-translate-y-1 active:scale-95 touch-manipulation focus:outline-none" title="{f.month}: Saldo {formatCurrency(val)}">
                        <span class="text-[9px] font-black leading-none mb-1 whitespace-nowrap {val >= 0 ? (f.isHistorical ? 'text-emerald-700' : 'text-indigo-700') : 'text-rose-600'}">
                            {formatBarAmount(val)}
                        </span>
                        <div class="w-full h-32 sm:h-36 flex items-end justify-center relative">
                            <div class="w-full rounded-t-lg transition-all shadow-sm group-hover/bar:brightness-110 {val >= 0 ? (f.isHistorical ? 'bg-emerald-500' : 'bg-indigo-500') : 'bg-rose-400'}" style="height: {barHeight}%;"></div>
                        </div>
                        <div class="flex flex-col items-center mt-1.5 w-full">
                            <span class="text-[10px] font-bold text-neutral-700 group-hover/bar:text-indigo-600 transition-colors truncate text-center">{f.monthShort}</span>
                            <span class="text-[7px] font-bold uppercase px-0.5 rounded {f.isHistorical ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-100 text-indigo-800'}">{f.isHistorical ? 'Ist' : 'Prog'}</span>
                        </div>
                    </button>
                {/each}
            </div>
        {/if}
    </div>
</div>
