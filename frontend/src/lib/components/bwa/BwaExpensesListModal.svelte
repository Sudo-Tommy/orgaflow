<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    let { companyExpenses, onDeleteExpense, onNewExpense, onBookInstallment } = $props<any>();
    
    let dialog: HTMLDialogElement | undefined = $state();
    export function showModal() { dialog?.showModal(); }
    export function close() { dialog?.close(); }
</script>

<dialog bind:this={dialog} class="zero-inner-scroll-modal p-0 bg-transparent backdrop:bg-black/50 backdrop:backdrop-blur-sm w-full max-w-3xl mx-auto my-auto rounded-3xl print:hidden" onclick={(e) => { if (e.target === dialog) close(); }}>
    <div class="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-4 sm:p-6 w-full flex flex-col relative shadow-2xl">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 shrink-0 pr-12 gap-3">
            <h2 class="text-base sm:text-xl md:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
                <span class="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/40 flex items-center justify-center shadow-inner text-base sm:text-xl shrink-0">🧾</span> 
                Betriebsausgaben
            </h2>
            <button onclick={() => { close(); onNewExpense(); }} class="orga-button-primary min-h-[44px] py-2 px-4 text-xs sm:text-sm flex items-center justify-center gap-2 shadow-rose-600/20 bg-rose-600 hover:bg-rose-700 text-white shrink-0 self-start sm:self-auto">
                + Ausgabe erfassen
            </button>
        </div>
        <button aria-label="Schließen" onclick={close} class="absolute top-4 sm:top-6 right-4 sm:right-6 w-10 h-10 min-h-[44px] min-w-[44px] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full flex items-center justify-center transition-colors">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        
        <div class="w-full overflow-x-auto custom-scrollbar orga-table-container touch-pan-x">
            <table class="w-full text-left border-collapse min-w-[600px] tabular-nums text-sm">
                <thead class="bg-slate-100/95 dark:bg-slate-800/95 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10 text-xs uppercase tracking-wider"><tr><th class="p-3.5 sm:p-4 font-bold text-slate-800 dark:text-slate-100">Datum</th><th class="p-3.5 sm:p-4 font-bold text-slate-800 dark:text-slate-100">Kategorie</th><th class="p-3.5 sm:p-4 font-bold text-slate-800 dark:text-slate-100">Geschäft / Zweck</th><th class="p-3.5 sm:p-4 font-bold text-slate-800 dark:text-slate-100 text-right">Betrag (Brutto)</th><th class="p-3.5 sm:p-4 font-bold text-slate-800 dark:text-slate-100 text-center">Beleg</th><th class="p-3.5 sm:p-4 font-bold text-slate-800 dark:text-slate-100 text-right w-20"></th></tr></thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-slate-900">
                    {#each companyExpenses as exp}
                        <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors group">
                            <td class="p-3.5 sm:p-4 text-slate-700 dark:text-slate-200 font-semibold text-sm">{new Date(exp.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
                            <td class="p-3.5 sm:p-4"><span class="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs">{exp.category}</span></td>
                            <td class="p-3.5 sm:p-4"><p class="font-bold text-slate-900 dark:text-slate-100">{exp.supplier || 'Unbekannt'}</p><p class="text-xs text-slate-500 dark:text-slate-400 font-medium truncate max-w-48 mt-0.5">{exp.title}</p></td>
                            <td class="p-3.5 sm:p-4 text-right">
                                <p class="text-rose-600 dark:text-rose-400 font-black text-sm sm:text-base">{exp.amount.toFixed(2).replace('.', ',')} €</p>
                                {#if exp.is_installment && exp.installment_current > 0}
                                    <p class="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">Rate {exp.installment_current} / {exp.installment_total_count}{#if exp.installment_total_amount > 0} (Gesamt: {exp.installment_total_amount.toFixed(2).replace('.',',')} €){/if}</p>
                                {:else if exp.tax_sum}
                                    <p class="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">inkl. {exp.tax_sum.toFixed(2).replace('.', ',')} € MwSt</p>
                                {/if}
                            </td>
                            <td class="p-3.5 sm:p-4 text-center">
                                {#if exp.receipt}<a href={pb.files.getURL(exp, exp.receipt)} target="_blank" class="p-2 text-xl hover:scale-110 transition-transform inline-block" title="Beleg ansehen">🧾</a>{:else}<span class="text-slate-400 dark:text-slate-600">-</span>{/if}
                            </td>
                            <td class="p-3.5 sm:p-4 text-right">
                                <div class="flex items-center justify-end gap-1">
                                    {#if exp.is_installment && exp.installment_current < exp.installment_total_count}<button onclick={() => onBookInstallment(exp)} class="px-2.5 py-1.5 text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-600 hover:text-white rounded-lg transition-colors shadow-2xs border border-emerald-200 dark:border-emerald-800" title="Nächste Rate buchen">Zahlen</button>{/if}
                                    <button onclick={() => onDeleteExpense(exp.id)} class="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors" title="Löschen">✕</button>
                                </div>
                            </td>
                        </tr>
                    {/each}
                    {#if companyExpenses.length === 0}<tr><td colspan="6" class="p-10 text-center text-slate-400 dark:text-slate-500 font-medium italic">Keine Betriebsausgaben in diesem Zeitraum erfasst.</td></tr>{/if}
                </tbody>
            </table>
        </div>
    </div>
</dialog>