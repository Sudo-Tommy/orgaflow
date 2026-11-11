<script lang="ts">
    import { History, Eye, Trash2, FileCheck, FileText, Clock } from "lucide-svelte";
    import type { VmaSettlementRecord } from "$lib/services/vmaSettlementService.svelte";

    let {
        show = $bindable(false),
        allSavedReports = [],
        savedRecordId = null,
        onSelectReport,
        onUpdateStatus,
        onPreviewPdf,
        onDeleteReport
    }: {
        show: boolean;
        allSavedReports: VmaSettlementRecord[];
        savedRecordId: string | null;
        onSelectReport: (record: VmaSettlementRecord) => void;
        onUpdateStatus: (record: VmaSettlementRecord, status: 'entwurf' | 'eingereicht' | 'genehmigt' | 'abgerechnet') => void;
        onPreviewPdf: (record: VmaSettlementRecord) => void;
        onDeleteReport: (id: string) => void;
    } = $props();

    let dialog = $state<HTMLDialogElement>();
    let archiveFilter = $state<'all' | 'entwurf' | 'eingereicht' | 'genehmigt' | 'abgerechnet'>('all');

    $effect(() => {
        if (show && dialog && !dialog.open) {
            dialog.showModal();
        } else if (!show && dialog && dialog.open) {
            dialog.close();
        }
    });

    let filteredReports = $derived.by(() => {
        if (archiveFilter === 'all') return allSavedReports;
        return allSavedReports.filter(r => r.status === archiveFilter);
    });

    function getBadge(status?: string): string {
        switch (status) {
            case 'genehmigt': return 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800';
            case 'abgerechnet': return 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800';
            case 'eingereicht': return 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800';
            case 'entwurf': default: return 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800';
        }
    }

    function getLabel(status?: string): string {
        switch (status) {
            case 'genehmigt': return 'Genehmigt';
            case 'abgerechnet': return 'Abgerechnet';
            case 'eingereicht': return 'Eingereicht';
            case 'entwurf': default: return 'Entwurf';
        }
    }
</script>

<dialog
    bind:this={dialog}
    class="zero-inner-scroll-modal p-0 bg-transparent backdrop:bg-black/60 backdrop:backdrop-blur-xs w-full max-w-3xl mx-auto my-auto rounded-3xl outline-none border-none shadow-2xl"
    onclick={(e) => { if (e.target === dialog) show = false; }}
    oncancel={(e) => { e.preventDefault(); show = false; }}
>
    {#if show}
        <div class="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-3xl w-full h-auto flex flex-col border border-neutral-200 dark:border-slate-800 animate-enter my-auto">
            <!-- Header -->
            <div class="p-4 sm:p-5 border-b border-neutral-100 dark:border-slate-800 flex items-center justify-between gap-3">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-xs">
                        <History class="w-5 h-5" />
                    </div>
                    <div>
                        <h2 class="font-black text-neutral-900 dark:text-slate-100 text-base sm:text-lg">
                            Reisekosten & VMA Archiv (PocketBase)
                        </h2>
                        <p class="text-xs text-neutral-500 dark:text-slate-400">
                            Gespeicherte Monatsabrechnungen und Nachweise
                        </p>
                    </div>
                </div>
                <button 
                    type="button" 
                    onclick={() => show = false}
                    class="w-8 h-8 rounded-full bg-neutral-100 dark:bg-slate-800 hover:bg-neutral-200 dark:hover:bg-slate-700 text-neutral-500 flex items-center justify-center transition-colors cursor-pointer"
                    aria-label="Schließen"
                >
                    ✕
                </button>
            </div>

            <!-- Filter-Reiter -->
            <div class="px-4 py-2.5 bg-neutral-50/60 dark:bg-slate-850/60 border-b border-neutral-100 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto">
                <span class="text-[10px] font-bold text-neutral-400 dark:text-slate-500 uppercase tracking-wider mr-1">Status:</span>
                {#each ['all', 'entwurf', 'eingereicht', 'genehmigt', 'abgerechnet'] as filterKey}
                    <button
                        type="button"
                        onclick={() => archiveFilter = filterKey as any}
                        class="px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap {archiveFilter === filterKey ? 'bg-indigo-600 text-white shadow-xs' : 'text-neutral-600 dark:text-slate-400 hover:bg-neutral-200/60 dark:hover:bg-slate-800'}"
                    >
                        {filterKey === 'all' ? 'Alle' : getLabel(filterKey)}
                    </button>
                {/each}
            </div>

            <!-- Liste der archivierten Berichte -->
            <div class="p-4 sm:p-5 overflow-y-auto max-h-[55vh] space-y-2.5">
                {#if filteredReports.length === 0}
                    <div class="py-12 text-center text-neutral-400 dark:text-slate-500">
                        <FileText class="w-10 h-10 mx-auto opacity-30 mb-2" />
                        <p class="text-xs font-bold">Keine archivierten Abrechnungen in dieser Kategorie vorhanden.</p>
                    </div>
                {:else}
                    {#each filteredReports as rep (rep.id)}
                        {@const isCurrent = rep.id === savedRecordId}
                        <div class="p-3.5 sm:p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 {isCurrent ? 'bg-indigo-50/70 border-indigo-200 dark:bg-indigo-950/30 dark:border-indigo-800' : 'bg-white dark:bg-slate-850/60 border-neutral-100 dark:border-slate-800 hover:border-neutral-200 dark:hover:border-slate-700'}">
                            <div class="min-w-0 flex-1">
                                <div class="flex items-center gap-2 flex-wrap">
                                    <h3 class="font-extrabold text-sm text-neutral-900 dark:text-slate-100">
                                        {rep.month_name || rep.month}
                                    </h3>
                                    <span class="text-[10px] font-bold px-2 py-0.5 rounded-full border {getBadge(rep.status)}">
                                        {getLabel(rep.status)}
                                    </span>
                                    {#if isCurrent}
                                        <span class="text-[9px] font-black uppercase tracking-wider bg-indigo-600 text-white px-1.5 py-0.5 rounded">
                                            Aktuell geladen
                                        </span>
                                    {/if}
                                </div>
                                <div class="flex items-center gap-3 text-xs text-neutral-500 dark:text-slate-400 mt-1 flex-wrap">
                                    <span>👤 {rep.expand?.user?.name_first || 'Mitarbeiter'} {rep.expand?.user?.name_last || ''}</span>
                                    <span>🚗 {rep.total_km || 0} km ({rep.km_allowance || 0} €)</span>
                                    <span>🍽️ VMA: {rep.total_vma || 0} €</span>
                                    <span class="font-extrabold text-neutral-900 dark:text-slate-200">Gesamt: {rep.grand_total || 0} €</span>
                                </div>
                                {#if rep.submitted_at || rep.approved_at}
                                    <p class="text-[10px] text-neutral-400 dark:text-slate-500 mt-1 flex items-center gap-1">
                                        <Clock class="w-3 h-3" />
                                        {#if rep.approved_at}
                                            Genehmigt am {new Date(rep.approved_at).toLocaleDateString('de-DE')}
                                        {:else if rep.submitted_at}
                                            Eingereicht am {new Date(rep.submitted_at).toLocaleDateString('de-DE')}
                                        {/if}
                                    </p>
                                {/if}
                            </div>

                            <!-- Aktions-Buttons -->
                            <div class="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                                <button
                                    type="button"
                                    onclick={() => { onSelectReport(rep); show = false; }}
                                    class="h-9 px-3 bg-neutral-100 hover:bg-neutral-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-neutral-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                                    title="Diesen Bericht laden und bearbeiten"
                                >
                                    <Eye class="w-3.5 h-3.5" />
                                    <span>Laden</span>
                                </button>

                                <button
                                    type="button"
                                    onclick={() => onPreviewPdf(rep)}
                                    class="h-9 px-3 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 border border-indigo-200/60 dark:border-indigo-800/60"
                                    title="PDF Nachweis generieren / ansehen"
                                >
                                    <FileText class="w-3.5 h-3.5" />
                                    <span>PDF</span>
                                </button>

                                <!-- Status umschalten -->
                                {#if rep.status === 'entwurf'}
                                    <button
                                        type="button"
                                        onclick={() => onUpdateStatus(rep, 'eingereicht')}
                                        class="h-9 px-2.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                                        title="Als eingereicht markieren"
                                    >
                                        Einreichen
                                    </button>
                                {:else if rep.status === 'eingereicht'}
                                    <button
                                        type="button"
                                        onclick={() => onUpdateStatus(rep, 'genehmigt')}
                                        class="h-9 px-2.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                                        title="Freigeben / Genehmigen"
                                    >
                                        <FileCheck class="w-3.5 h-3.5" />
                                        <span>Freigeben</span>
                                    </button>
                                {:else if rep.status === 'genehmigt'}
                                    <button
                                        type="button"
                                        onclick={() => onUpdateStatus(rep, 'abgerechnet')}
                                        class="h-9 px-2.5 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                                        title="Als ausgezahlt / abgerechnet verbuchen"
                                    >
                                        Abrechnen
                                    </button>
                                {/if}

                                <button
                                    type="button"
                                    onclick={() => onDeleteReport(rep.id)}
                                    class="h-9 w-9 bg-neutral-100 hover:bg-rose-100 dark:bg-slate-800 dark:hover:bg-rose-950/60 text-neutral-500 hover:text-rose-600 dark:hover:text-rose-400 rounded-xl transition-colors cursor-pointer flex items-center justify-center shrink-0"
                                    title="Abrechnung aus PocketBase löschen"
                                    aria-label="Löschen"
                                >
                                    <Trash2 class="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    {/each}
                {/if}
            </div>

            <!-- Footer -->
            <div class="p-4 border-t border-neutral-100 dark:border-slate-800 bg-neutral-50/80 dark:bg-slate-850 flex justify-end">
                <button 
                    type="button" 
                    onclick={() => show = false}
                    class="h-10 px-5 bg-neutral-200 hover:bg-neutral-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-neutral-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                    Schließen
                </button>
            </div>
        </div>
    {/if}
</dialog>
