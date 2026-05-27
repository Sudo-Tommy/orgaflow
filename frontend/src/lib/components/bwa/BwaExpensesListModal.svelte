<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    let { companyExpenses, onDeleteExpense, onNewExpense, onBookInstallment } = $props<any>();
    
    let dialog: HTMLDialogElement | undefined = $state();
    export function showModal() { dialog?.showModal(); }
    export function close() { dialog?.close(); }
</script>

<dialog bind:this={dialog} class="p-0 bg-transparent backdrop:bg-black/50 backdrop:backdrop-blur-sm w-full max-w-6xl mx-auto my-auto rounded-3xl print:hidden" onclick={(e) => { if (e.target === dialog) close(); }}>
    <div class="bg-white rounded-3xl p-6 md:p-8 w-full max-h-[90vh] flex flex-col relative shadow-2xl overflow-hidden">
        <div class="flex items-center justify-between mb-6 shrink-0 pr-12"><h2 class="text-xl sm:text-2xl font-bold text-neutral-900 flex items-center gap-3"><span class="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shadow-inner text-xl">🧾</span> Betriebsausgaben</h2><button onclick={() => { close(); onNewExpense(); }} class="orga-button-primary py-2 px-4 text-xs sm:text-sm flex items-center gap-2 shadow-rose-600/20 bg-rose-600 hover:bg-rose-700 text-white shrink-0">+ Ausgabe erfassen</button></div>
        <button aria-label="Schließen" onclick={close} class="absolute top-6 right-6 w-10 h-10 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-full flex items-center justify-center transition-colors"><svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
        
        <div class="flex-1 overflow-y-auto custom-scrollbar border border-neutral-100 rounded-2xl">
            <table class="w-full text-left border-collapse min-w-150">
                <thead class="bg-neutral-50/80 border-b border-neutral-200 sticky top-0 z-10"><tr><th class="p-4 font-bold text-neutral-800">Datum</th><th class="p-4 font-bold text-neutral-800">Kategorie</th><th class="p-4 font-bold text-neutral-800">Geschäft / Zweck</th><th class="p-4 font-bold text-neutral-800 text-right">Betrag (Brutto)</th><th class="p-4 font-bold text-neutral-800 text-center">Beleg</th><th class="p-4 font-bold text-neutral-800 text-right w-20"></th></tr></thead>
                <tbody class="divide-y divide-neutral-50">
                    {#each companyExpenses as exp}
                        <tr class="hover:bg-neutral-50/50 transition-colors group">
                            <td class="p-4 text-neutral-600 font-medium">{new Date(exp.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
                            <td class="p-4"><span class="px-2.5 py-1 bg-neutral-100 text-neutral-700 text-xs font-bold rounded-lg border border-neutral-200 shadow-sm">{exp.category}</span></td>
                            <td class="p-4"><p class="font-bold text-neutral-900">{exp.supplier || 'Unbekannt'}</p><p class="text-xs text-neutral-500 truncate max-w-48 mt-0.5">{exp.title}</p></td>
                            <td class="p-4 text-right">
                                <p class="text-rose-600 font-bold">{exp.amount.toFixed(2).replace('.', ',')} €</p>
                                {#if exp.is_installment && exp.installment_current > 0}
                                    <p class="text-[10px] text-neutral-400 font-medium mt-0.5">Rate {exp.installment_current} / {exp.installment_total_count}{#if exp.installment_total_amount > 0} (Gesamt: {exp.installment_total_amount.toFixed(2).replace('.',',')} €){/if}</p>
                                {:else if exp.tax_sum}
                                    <p class="text-[10px] text-neutral-400 font-medium mt-0.5">inkl. {exp.tax_sum.toFixed(2).replace('.', ',')} € MwSt</p>
                                {/if}
                            </td>
                            <td class="p-4 text-center">
                                {#if exp.receipt}<a href={pb.files.getURL(exp, exp.receipt)} target="_blank" class="p-2 text-xl hover:scale-110 transition-transform inline-block" title="Beleg ansehen">🧾</a>{:else}<span class="text-neutral-300">-</span>{/if}
                            </td>
                            <td class="p-4 text-right">
                                <div class="flex items-center justify-end gap-1 opacity-100 xl:opacity-0 group-hover:opacity-100 transition-opacity">
                                    {#if exp.is_installment && exp.installment_current < exp.installment_total_count}<button onclick={() => onBookInstallment(exp)} class="px-2.5 py-1.5 text-xs font-bold bg-emerald-100 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded-lg transition-colors shadow-sm" title="Nächste Rate buchen">Zahlen</button>{/if}
                                    <button onclick={() => onDeleteExpense(exp.id)} class="w-8 h-8 flex items-center justify-center text-neutral-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 transition-colors" title="Löschen">✕</button>
                                </div>
                            </td>
                        </tr>
                    {/each}
                    {#if companyExpenses.length === 0}<tr><td colspan="6" class="p-10 text-center text-neutral-400 italic">Keine Betriebsausgaben in diesem Zeitraum erfasst.</td></tr>{/if}
                </tbody>
            </table>
        </div>
    </div>
</dialog>