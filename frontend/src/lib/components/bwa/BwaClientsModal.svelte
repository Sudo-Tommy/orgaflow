<script lang="ts">
    let { clientStats } = $props<any>();
    
    let dialog: HTMLDialogElement | undefined = $state();
    export function showModal() { dialog?.showModal(); }
    export function close() { dialog?.close(); }
</script>

<dialog bind:this={dialog} class="zero-inner-scroll-modal p-0 bg-transparent backdrop:bg-black/60 backdrop:backdrop-blur-sm w-full max-w-3xl mx-auto my-auto rounded-3xl print:hidden" onclick={(e) => { if (e.target === dialog) close(); }}>
    <div class="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-6 w-full flex flex-col relative shadow-2xl border border-neutral-100 dark:border-slate-800">
        <div class="flex items-center justify-between mb-4 sm:mb-6 shrink-0 pr-10">
            <h2 class="text-base sm:text-xl md:text-2xl font-bold text-neutral-900 dark:text-white flex items-center gap-2.5">
                <span class="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-inner text-base sm:text-xl shrink-0">🏆</span> 
                Klienten-Ranking
            </h2>
        </div>
        <button aria-label="Schließen" onclick={close} class="absolute top-4 sm:top-6 right-4 sm:right-6 w-9 h-9 sm:w-10 sm:h-10 bg-neutral-100 dark:bg-slate-800 hover:bg-neutral-200 dark:hover:bg-slate-700 text-neutral-600 dark:text-slate-300 rounded-full flex items-center justify-center transition-colors cursor-pointer touch-manipulation active:scale-90">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        
        <div class="w-full overflow-x-auto custom-scrollbar orga-table-container touch-pan-x border border-neutral-100 dark:border-slate-800 rounded-2xl">
            <table class="w-full text-left border-collapse min-w-[500px] tabular-nums text-sm">
                <thead class="bg-slate-100/95 dark:bg-slate-800/95 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10 text-xs uppercase tracking-wider"><tr><th class="p-3.5 sm:p-4 font-bold text-slate-800 dark:text-slate-100 w-16">Platz</th><th class="p-3.5 sm:p-4 font-bold text-slate-800 dark:text-slate-100">Klient</th><th class="p-3.5 sm:p-4 font-bold text-slate-800 dark:text-slate-100 text-right">Termine</th><th class="p-3.5 sm:p-4 font-bold text-slate-800 dark:text-slate-100 text-right">Betreuungszeit</th><th class="p-3.5 sm:p-4 font-bold text-indigo-700 dark:text-indigo-400 text-right">Umsatz generiert</th></tr></thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-slate-900">
                    {#each clientStats as c, i}
                        <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                            <td class="p-3.5 sm:p-4 font-black text-slate-400 dark:text-slate-500">#{i + 1}</td><td class="p-3.5 sm:p-4 font-bold text-slate-900 dark:text-slate-100">{c.name}</td><td class="p-3.5 sm:p-4 text-slate-700 dark:text-slate-200 text-right font-semibold">{c.appts}</td><td class="p-3.5 sm:p-4 text-slate-700 dark:text-slate-200 text-right font-semibold">{c.hours.toFixed(1).replace('.', ',')} h</td><td class="p-3.5 sm:p-4 text-indigo-700 dark:text-indigo-400 font-black text-right">{c.revenue.toFixed(2).replace('.', ',')} €</td>
                        </tr>
                    {/each}
                    {#if clientStats.length === 0}<tr><td colspan="5" class="p-10 text-center text-slate-400 dark:text-slate-500 font-medium italic">Keine abgerechneten Klienten in diesem Zeitraum.</td></tr>{/if}
                </tbody>
            </table>
        </div>
    </div>
</dialog>