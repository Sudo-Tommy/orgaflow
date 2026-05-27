<script lang="ts">
    let { forecastStats, forecastScenario = $bindable() } = $props<any>();
    
    let dialog: HTMLDialogElement | undefined = $state();
    export function showModal() { dialog?.showModal(); }
    export function close() { dialog?.close(); }
    
    function formatCurrency(val: number) { return (val || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' }); }
</script>

<dialog bind:this={dialog} class="p-0 bg-transparent backdrop:bg-black/50 backdrop:backdrop-blur-sm w-full max-w-4xl mx-auto my-auto rounded-3xl print:hidden" onclick={(e) => { if (e.target === dialog) close(); }}>
    <div class="bg-white rounded-3xl p-6 md:p-8 w-full max-h-[90vh] flex flex-col relative shadow-2xl overflow-hidden">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between mb-6 shrink-0 pr-12 gap-4">
            <h2 class="text-xl sm:text-2xl font-bold text-neutral-900 flex items-center gap-3"><span class="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shadow-inner text-xl shrink-0">🔮</span> Finanzprognose</h2>
            <div class="flex bg-neutral-100 p-1 rounded-lg border border-neutral-200 shadow-inner shrink-0 self-start sm:self-auto w-full sm:w-auto">
                <button onclick={() => forecastScenario = 'pessimistic'} class="flex-1 sm:flex-none px-3 py-1.5 text-xs font-bold rounded-md transition-colors {forecastScenario === 'pessimistic' ? 'bg-white shadow-sm text-purple-600' : 'text-neutral-500 hover:text-neutral-700'}">Pessimistisch</button>
                <button onclick={() => forecastScenario = 'realistic'} class="flex-1 sm:flex-none px-3 py-1.5 text-xs font-bold rounded-md transition-colors {forecastScenario === 'realistic' ? 'bg-white shadow-sm text-purple-600' : 'text-neutral-500 hover:text-neutral-700'}">Realistisch</button>
                <button onclick={() => forecastScenario = 'optimistic'} class="flex-1 sm:flex-none px-3 py-1.5 text-xs font-bold rounded-md transition-colors {forecastScenario === 'optimistic' ? 'bg-white shadow-sm text-purple-600' : 'text-neutral-500 hover:text-neutral-700'}">Optimistisch</button>
            </div>
        </div>
        <button aria-label="Schließen" onclick={close} class="absolute top-6 right-6 w-10 h-10 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-full flex items-center justify-center transition-colors"><svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
        <p class="text-sm text-neutral-500 mb-4 shrink-0">Basiert auf den erfassten, wiederkehrenden Betriebsausgaben für die nächsten 12 Monate.</p>
        
        {#if forecastStats && forecastStats.length > 0}
            {@const multiplier = forecastScenario === 'optimistic' ? 1.15 : (forecastScenario === 'pessimistic' ? 0.85 : 1)}
            {@const maxVal = Math.max(...forecastStats.map((m: any) => Math.abs((m.revenue * multiplier) - m.expenses)), 1)}
            <div class="w-full h-48 sm:h-64 flex gap-2 items-end overflow-x-auto custom-scrollbar pb-6 shrink-0 mb-6 border-b border-neutral-100 mt-2">
                {#each forecastStats as m}
                    {@const rev = m.revenue * multiplier}
                    {@const val = rev - m.expenses}
                    <div class="flex flex-col items-center gap-2 shrink-0 group/bar flex-1 h-full justify-end">
                        <div class="w-full h-full flex items-end justify-center relative">
                            <div class="w-full rounded-t-md transition-all group-hover/bar:bg-indigo-500 {val >= 0 ? 'bg-indigo-400' : 'bg-rose-400'}" style="height: {Math.max(0, Math.abs(val) / maxVal * 100)}%;"></div>
                            <div class="absolute -top-10 bg-neutral-900 text-white text-xs font-bold px-2.5 py-1.5 rounded opacity-0 group-hover/bar:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-10 shadow-lg">
                                {formatCurrency(val)}
                            </div>
                        </div>
                        <span class="text-[10px] font-bold text-neutral-500 rotate-45 origin-left mt-4">{m.month.split(' ')[0]}</span>
                    </div>
                {/each}
            </div>
        {/if}

        <div class="flex-1 overflow-y-auto custom-scrollbar border border-neutral-100 rounded-2xl">
            <table class="w-full text-left border-collapse min-w-150">
                <thead class="bg-neutral-50/80 border-b border-neutral-200 sticky top-0 z-10"><tr><th class="p-4 font-bold text-neutral-800">Monat</th><th class="p-4 font-bold text-neutral-800 text-right">Progn. Umsatz</th><th class="p-4 font-bold text-neutral-800 text-right">Progn. Ausgaben</th><th class="p-4 font-bold text-emerald-700 text-right bg-emerald-50/30">Progn. Gewinn</th></tr></thead>
                <tbody class="divide-y divide-neutral-50">
                    {#if forecastStats && forecastStats.length > 0}
                        {@const multiplier = forecastScenario === 'optimistic' ? 1.15 : (forecastScenario === 'pessimistic' ? 0.85 : 1)}
                        {#each forecastStats as m}
                            {@const rev = m.revenue * multiplier}
                            {@const val = rev - m.expenses}
                            <tr class="hover:bg-neutral-50/50 transition-colors">
                                <td class="p-4 font-semibold text-neutral-900">{m.month}</td>
                                <td class="p-4 text-indigo-600 font-medium text-right">{rev > 0 ? formatCurrency(rev) : '-'}</td>
                                <td class="p-4 text-rose-500 font-medium text-right">{m.expenses > 0 ? formatCurrency(m.expenses) : '-'}</td>
                                <td class="p-4 {val >= 0 ? 'text-emerald-700' : 'text-rose-700'} font-bold text-right bg-emerald-50/10">{val !== 0 ? formatCurrency(val) : '-'}</td>
                            </tr>
                        {/each}
                    {/if}
                </tbody>
            </table>
        </div>
    </div>
</dialog>