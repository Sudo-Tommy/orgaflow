<script lang="ts">
    let { forecastStats, forecastScenario = $bindable(), onOpenForecast } = $props<any>();
    function formatCurrency(val: number) { return (val || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' }); }
</script>

<div class="bg-white rounded-3xl border border-neutral-100 shadow-sm flex flex-col p-6 group hover:shadow-md transition-shadow relative">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
        <h3 class="font-bold text-neutral-900 flex items-center gap-3 text-lg"><span class="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-base shadow-inner">🔮</span> Prognose (12M)</h3>
        <div class="flex items-center gap-2 self-start sm:self-auto">
            <div class="hidden sm:flex bg-neutral-100 p-1 rounded-lg border border-neutral-200 shadow-inner shrink-0">
                <button onclick={() => forecastScenario = 'pessimistic'} class="px-2 py-1 text-[10px] font-bold rounded-md transition-colors {forecastScenario === 'pessimistic' ? 'bg-white shadow-sm text-purple-600' : 'text-neutral-500 hover:text-neutral-700'}" title="Pessimistisch (-15%)">📉 Pessim.</button>
                <button onclick={() => forecastScenario = 'realistic'} class="px-2 py-1 text-[10px] font-bold rounded-md transition-colors {forecastScenario === 'realistic' ? 'bg-white shadow-sm text-purple-600' : 'text-neutral-500 hover:text-neutral-700'}" title="Realistisch">⚖️ Realist.</button>
                <button onclick={() => forecastScenario = 'optimistic'} class="px-2 py-1 text-[10px] font-bold rounded-md transition-colors {forecastScenario === 'optimistic' ? 'bg-white shadow-sm text-purple-600' : 'text-neutral-500 hover:text-neutral-700'}" title="Optimistisch (+15%)">📈 Optimist.</button>
            </div>
            <button onclick={onOpenForecast} class="w-10 h-10 rounded-full bg-neutral-50 hover:bg-purple-50 text-neutral-400 hover:text-purple-600 flex items-center justify-center transition-colors shrink-0" title="Detaillierte Prognose öffnen"><svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg></button>
        </div>
    </div>
    {#if forecastStats.length > 0}
        {@const multiplier = forecastScenario === 'optimistic' ? 1.15 : (forecastScenario === 'pessimistic' ? 0.85 : 1)}
        {@const maxVal = Math.max(...forecastStats.map((f:any) => Math.abs((f.revenue * multiplier) - f.expenses)), 1)}
        <div class="w-full h-40 flex gap-2 items-end overflow-x-auto custom-scrollbar pb-2 flex-1">
            {#each forecastStats as f}
                {@const rev = f.revenue * multiplier}
                {@const val = rev - f.expenses}
                <div class="flex flex-col items-center gap-2 shrink-0 group/bar flex-1 h-full justify-end">
                    <div class="w-full h-full flex items-end justify-center relative"><div class="w-full rounded-t-md transition-all group-hover/bar:bg-indigo-500 {val >= 0 ? 'bg-indigo-400' : 'bg-rose-400'}" style="height: {Math.max(0, Math.abs(val) / maxVal * 100)}%;"></div><div class="absolute -top-8 bg-neutral-900 text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover/bar:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-10 shadow-lg">{formatCurrency(val)}</div></div>
                    <span class="text-[9px] font-bold text-neutral-500 rotate-45 origin-left mt-2">{f.month.split(' ')[0]}</span>
                </div>
            {/each}
        </div>
    {/if}
</div>