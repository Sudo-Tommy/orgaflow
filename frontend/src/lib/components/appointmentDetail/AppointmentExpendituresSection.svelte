<script lang="ts">
    import { Banknote, Eye, Edit3, Trash2 } from "lucide-svelte";
    import { pb } from "$lib/services/pocketbase";

    interface Props {
        expenditures: any[];
        totalExpenditure: number;
        onOpenExpenditureModal: (exp?: any) => void;
        onOpenPdfPreview: (url: string, title: string, filename: string) => void;
        onDeleteExpenditure: (id: string) => void;
    }

    let { expenditures, totalExpenditure, onOpenExpenditureModal, onOpenPdfPreview, onDeleteExpenditure }: Props = $props();
</script>

<div class="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-neutral-200/90 dark:border-slate-800 shadow-xs flex flex-col justify-between">
    <div>
        <div class="flex items-center justify-between mb-3 border-b border-neutral-100 dark:border-slate-800 pb-2">
            <h3 class="text-xs font-bold text-neutral-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><Banknote class="w-4 h-4 text-rose-600" /> Sonderausgaben</h3>
            <button type="button" onclick={() => onOpenExpenditureModal()} class="min-h-9 px-3 text-xs font-bold text-rose-800 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 rounded-xl border border-rose-200 dark:border-rose-800 cursor-pointer">+ Ausgabe</button>
        </div>

        {#if expenditures.length === 0}
            <p class="text-center text-xs text-neutral-400 py-4">Keine Sonderausgaben hinterlegt.</p>
        {:else}
            <div class="space-y-2 mb-3">
                {#each expenditures as exp (exp.id)}
                    <div class="p-2.5 rounded-xl border border-neutral-200 dark:border-slate-800 bg-neutral-50 dark:bg-slate-800/60 text-xs flex flex-col gap-1.5 shadow-2xs">
                        <div class="flex items-start justify-between gap-2 min-w-0">
                            <p class="font-bold text-neutral-800 dark:text-slate-200 truncate">{exp.titel || 'Ausgabe'}</p>
                            <span class="font-black text-rose-800 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/70 px-2 py-0.5 rounded-lg text-xs whitespace-nowrap">{exp.sum ? exp.sum.toFixed(2).replace('.', ',') : '0,00'} €</span>
                        </div>
                        <div class="flex items-center justify-between gap-2 pt-1.5 border-t border-neutral-200/60 dark:border-slate-700">
                            {#if exp.receipt}
                                <button type="button" onclick={() => onOpenPdfPreview(pb.files.getURL(exp, exp.receipt), exp.titel || 'Beleg', exp.receipt)} class="h-6 px-2 flex items-center gap-1 text-[11px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-950/80 rounded border border-indigo-300 cursor-pointer"><Eye class="w-3 h-3" /> Beleg</button>
                            {:else}
                                <span class="text-[10px] text-neutral-400 italic">Kein Beleg</span>
                            {/if}
                            <div class="flex items-center gap-1 ml-auto">
                                <button type="button" onclick={() => onOpenExpenditureModal(exp)} class="p-1 bg-white dark:bg-slate-700 rounded border border-neutral-200 cursor-pointer"><Edit3 class="w-3 h-3" /></button>
                                <button type="button" onclick={() => onDeleteExpenditure(exp.id)} class="p-1 bg-white dark:bg-slate-700 rounded border border-neutral-200 text-rose-600 cursor-pointer"><Trash2 class="w-3 h-3" /></button>
                            </div>
                        </div>
                    </div>
                {/each}
            </div>
        {/if}
    </div>

    {#if expenditures.length > 0}
        <div class="bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 rounded-xl p-2.5 flex justify-between items-center text-xs font-bold text-rose-950 dark:text-rose-200 mt-2">
            <span>Gesamte Auslagen:</span><span class="text-sm font-black">{totalExpenditure.toFixed(2).replace('.', ',')} €</span>
        </div>
    {/if}
</div>
