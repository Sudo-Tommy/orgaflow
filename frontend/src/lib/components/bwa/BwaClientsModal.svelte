<script lang="ts">
    let { clientStats } = $props<any>();
    
    let dialog: HTMLDialogElement | undefined = $state();
    export function showModal() { dialog?.showModal(); }
    export function close() { dialog?.close(); }
</script>

<dialog bind:this={dialog} class="p-0 bg-transparent backdrop:bg-black/50 backdrop:backdrop-blur-sm w-full max-w-5xl mx-auto my-auto rounded-3xl print:hidden" onclick={(e) => { if (e.target === dialog) close(); }}>
    <div class="bg-white rounded-3xl p-6 md:p-8 w-full max-h-[90vh] flex flex-col relative shadow-2xl overflow-hidden">
        <div class="flex items-center justify-between mb-6 shrink-0 pr-12"><h2 class="text-xl sm:text-2xl font-bold text-neutral-900 flex items-center gap-3"><span class="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-inner text-xl">🏆</span> Klienten-Ranking</h2></div>
        <button aria-label="Schließen" onclick={close} class="absolute top-6 right-6 w-10 h-10 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-full flex items-center justify-center transition-colors"><svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
        
        <div class="flex-1 overflow-y-auto custom-scrollbar border border-neutral-100 rounded-2xl">
            <table class="w-full text-left border-collapse min-w-150">
                <thead class="bg-neutral-50/80 border-b border-neutral-200 sticky top-0 z-10"><tr><th class="p-4 font-bold text-neutral-800 w-16">Platz</th><th class="p-4 font-bold text-neutral-800">Klient</th><th class="p-4 font-bold text-neutral-800 text-right">Termine</th><th class="p-4 font-bold text-neutral-800 text-right">Betreuungszeit</th><th class="p-4 font-bold text-indigo-700 text-right">Umsatz generiert</th></tr></thead>
                <tbody class="divide-y divide-neutral-50">
                    {#each clientStats as c, i}
                        <tr class="hover:bg-neutral-50/50 transition-colors">
                            <td class="p-4 font-black text-neutral-400">#{i + 1}</td><td class="p-4 font-bold text-neutral-900">{c.name}</td><td class="p-4 text-neutral-600 text-right font-medium">{c.appts}</td><td class="p-4 text-neutral-600 text-right font-medium">{c.hours.toFixed(1).replace('.', ',')} h</td><td class="p-4 text-indigo-600 font-bold text-right">{c.revenue.toFixed(2).replace('.', ',')} €</td>
                        </tr>
                    {/each}
                    {#if clientStats.length === 0}<tr><td colspan="5" class="p-10 text-center text-neutral-400 italic">Keine abgerechneten Klienten in diesem Zeitraum.</td></tr>{/if}
                </tbody>
            </table>
        </div>
    </div>
</dialog>