<script lang="ts">
    import { Receipt, Plus, Eye, Edit3, Trash2 } from "lucide-svelte";
    import { pb } from "$lib/services/pocketbase";

    let {
        expenditures = [],
        totalExpenditure = 0,
        onOpenExpenditureModal,
        onOpenPdfPreview,
        onDeleteExpenditure
    }: {
        expenditures: any[];
        totalExpenditure: number;
        onOpenExpenditureModal: (exp?: any) => void;
        onOpenPdfPreview: (url: string, title: string, filename: string) => void;
        onDeleteExpenditure: (id: string) => void;
    } = $props();
</script>

<div class="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-6 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-4">
    <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <div class="flex items-center gap-2">
            <span class="w-7 h-7 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 flex items-center justify-center font-bold text-xs">
                <Receipt class="w-4 h-4" />
            </span>
            <h3 class="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Sonderausgaben & Belege ({expenditures.length})
            </h3>
        </div>
        <button
            type="button"
            onclick={() => onOpenExpenditureModal()}
            class="min-h-11 px-3 text-xs font-bold text-rose-800 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 rounded-xl border border-rose-200 dark:border-rose-800 cursor-pointer flex items-center gap-1.5 transition-colors shadow-2xs touch-manipulation"
        >
            <Plus class="w-4 h-4" />
            <span>Ausgabe erfassen</span>
        </button>
    </div>

    {#if expenditures.length === 0}
        <div class="p-6 text-center text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
            <Receipt class="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p class="text-xs font-semibold">Keine Sonderausgaben für diesen Termin erfasst.</p>
            <p class="text-[11px] text-slate-400 mt-0.5">Hier können Parktickets, Eintrittsgelder, Einkäufe oder Materialauslagen mit Quittung hinterlegt werden.</p>
        </div>
    {:else}
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {#each expenditures as exp (exp.id)}
                <div class="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 flex flex-col justify-between gap-2 shadow-2xs">
                    <div class="flex items-start justify-between gap-2 min-w-0">
                        <div class="min-w-0">
                            <p class="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">{exp.titel || 'Ausgabe'}</p>
                            {#if exp.created}
                                <p class="text-[10px] text-slate-400">{new Date(exp.created).toLocaleDateString('de-DE')}</p>
                            {/if}
                        </div>
                        <span class="font-black text-rose-800 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/70 px-2 py-0.5 rounded-lg text-xs whitespace-nowrap shrink-0">
                            {exp.sum ? exp.sum.toFixed(2).replace('.', ',') : '0,00'} €
                        </span>
                    </div>
                    <div class="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-700">
                        {#if exp.receipt}
                            <button
                                type="button"
                                onclick={() => onOpenPdfPreview(pb.files.getURL(exp, exp.receipt), exp.titel || 'Beleg', exp.receipt)}
                                class="h-8 px-2.5 flex items-center gap-1 text-[11px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-950/80 rounded-lg border border-indigo-300 cursor-pointer touch-manipulation"
                            >
                                <Eye class="w-3.5 h-3.5" />
                                <span>Beleg ansehen</span>
                            </button>
                        {:else}
                            <span class="text-[10px] text-slate-400 italic">Kein Belegbild</span>
                        {/if}
                        <div class="flex items-center gap-1">
                            <button
                                type="button"
                                onclick={() => onOpenExpenditureModal(exp)}
                                class="w-8 h-8 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-indigo-600 bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 cursor-pointer touch-manipulation"
                                title="Bearbeiten"
                                aria-label="Bearbeiten"
                            >
                                <Edit3 class="w-3.5 h-3.5" />
                            </button>
                            <button
                                type="button"
                                onclick={() => onDeleteExpenditure(exp.id)}
                                class="w-8 h-8 flex items-center justify-center text-rose-600 hover:text-rose-700 bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 cursor-pointer touch-manipulation"
                                title="Löschen"
                                aria-label="Löschen"
                            >
                                <Trash2 class="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                </div>
            {/each}
        </div>

        <!-- Gesamtsumme Auslagen -->
        <div class="bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 rounded-2xl p-3 flex justify-between items-center text-xs font-bold text-rose-950 dark:text-rose-200">
            <span class="flex items-center gap-1.5">
                <Receipt class="w-4 h-4 text-rose-600" />
                <span>Gesamte Sonderauslagen:</span>
            </span>
            <span class="text-sm font-black">{totalExpenditure.toFixed(2).replace('.', ',')} €</span>
        </div>
    {/if}
</div>
