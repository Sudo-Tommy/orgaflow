<script lang="ts">
    let { userStats } = $props<any>();
    
    let dialog: HTMLDialogElement | undefined = $state();
    export function showModal() { dialog?.showModal(); }
    export function close() { dialog?.close(); }
</script>

<dialog bind:this={dialog} class="zero-inner-scroll-modal p-0 bg-transparent backdrop:bg-black/60 backdrop:backdrop-blur-sm w-full max-w-3xl mx-auto my-auto rounded-3xl print:hidden" onclick={(e) => { if (e.target === dialog) close(); }}>
    <div class="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-6 w-full flex flex-col relative shadow-2xl border border-neutral-100 dark:border-slate-800">
        <div class="flex items-center justify-between mb-4 sm:mb-6 shrink-0 pr-10">
            <h2 class="text-base sm:text-xl md:text-2xl font-bold text-neutral-900 dark:text-white flex items-center gap-2.5">
                <span class="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center shadow-inner text-base sm:text-xl shrink-0">👥</span> 
                Team-Performance
            </h2>
        </div>
        <button aria-label="Schließen" onclick={close} class="absolute top-4 sm:top-6 right-4 sm:right-6 w-9 h-9 sm:w-10 sm:h-10 bg-neutral-100 dark:bg-slate-800 hover:bg-neutral-200 dark:hover:bg-slate-700 text-neutral-600 dark:text-slate-300 rounded-full flex items-center justify-center transition-colors cursor-pointer touch-manipulation active:scale-90">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        
        <div class="w-full overflow-x-auto custom-scrollbar orga-table-container touch-pan-x border border-neutral-100 dark:border-slate-800 rounded-2xl">
            <table class="w-full text-left border-collapse min-w-[500px] tabular-nums text-sm">
                <thead class="bg-slate-100/95 dark:bg-slate-800/95 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10 text-xs uppercase tracking-wider"><tr><th class="p-3.5 sm:p-4 font-bold text-slate-800 dark:text-slate-100">Mitarbeiter</th><th class="p-3.5 sm:p-4 font-bold text-slate-800 dark:text-slate-100 text-right">Termine absolviert</th><th class="p-3.5 sm:p-4 font-bold text-slate-800 dark:text-slate-100 text-right">Geleistete Stunden</th><th class="p-3.5 sm:p-4 font-bold text-slate-800 dark:text-slate-100 text-right">Gefahrene Strecke</th></tr></thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-slate-900">
                    {#each userStats as u}
                        <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                            <td class="p-3.5 sm:p-4 font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5"><span class="w-8 h-8 rounded-full bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 flex items-center justify-center text-xs font-bold shrink-0 shadow-inner">{u.name?.charAt(0) || '?'}</span> {u.name || 'Unbekannt'}</td><td class="p-3.5 sm:p-4 text-slate-700 dark:text-slate-200 text-right font-semibold">{u.appts}</td><td class="p-3.5 sm:p-4 text-emerald-600 dark:text-emerald-400 text-right font-black">{u.hours.toFixed(1).replace('.', ',')} h</td><td class="p-3.5 sm:p-4 text-slate-700 dark:text-slate-200 text-right font-semibold">{u.km.toFixed(1).replace('.', ',')} km</td>
                        </tr>
                    {/each}
                    {#if userStats.length === 0}<tr><td colspan="4" class="p-10 text-center text-slate-400 dark:text-slate-500 font-medium italic">Keine Termine im gewählten Zeitraum.</td></tr>{/if}
                </tbody>
            </table>
        </div>
    </div>
</dialog>