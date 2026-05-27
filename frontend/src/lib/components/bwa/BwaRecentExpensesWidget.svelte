<script lang="ts">
    let { companyExpenses, onOpenExpenses, onNewExpense } = $props<any>();
</script>

<div class="bg-white rounded-3xl border border-neutral-100 shadow-sm flex flex-col p-5 group hover:shadow-md transition-shadow">
    <div class="flex items-center justify-between mb-4">
        <h3 class="font-bold text-neutral-900 flex items-center gap-3 text-lg"><span class="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center text-base shadow-inner">🧾</span> Letzte Ausgaben</h3>
        <div class="flex items-center gap-2">
            <button onclick={onNewExpense} class="w-10 h-10 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center transition-colors font-bold text-xl shrink-0" title="Neue Ausgabe hinzufügen">+</button>
            <button onclick={onOpenExpenses} class="w-10 h-10 rounded-full bg-neutral-50 hover:bg-rose-50 text-neutral-400 hover:text-rose-600 flex items-center justify-center transition-colors shrink-0" title="Alle Ausgaben ansehen"><svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg></button>
        </div>
    </div>
    <div class="flex-1 flex flex-col gap-2">
        {#each companyExpenses.slice(0, 3) as exp}
            <button onclick={onOpenExpenses} class="w-full text-left flex items-center justify-between gap-3 p-2 rounded-xl hover:bg-neutral-50 border border-transparent hover:border-neutral-100 transition-colors">
                <div class="flex items-center gap-3 min-w-0"><span class="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center text-xs font-bold shrink-0">🧾</span><div class="min-w-0"><p class="text-sm font-bold text-neutral-800 truncate">{exp.supplier || 'Unbekannt'}</p><p class="text-[10px] text-neutral-500 truncate">{new Date(exp.date).toLocaleDateString('de-DE')} • {exp.category}</p></div></div>
                <span class="text-sm font-bold text-rose-600 shrink-0">{exp.amount.toFixed(2).replace('.', ',')} €</span>
            </button>
        {/each}
        {#if companyExpenses.length === 0}
            <p class="text-sm text-neutral-400 italic text-center py-4">Keine Ausgaben erfasst</p>
        {/if}
    </div>
</div>