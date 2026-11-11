<script lang="ts">
    import { BarChart3, Building2, Plus, Printer } from "lucide-svelte";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import LexOfficeSyncButton from "$lib/components/lexoffice/LexOfficeSyncButton.svelte";
    import type { useBwaService } from "$lib/services/bwaService.svelte";
    import type { useBwaPageState } from "$lib/services/bwaPageState.svelte";

    let { bwa, pageState, isGodMode, onNewExpense, onPrint } = $props<{
        bwa: ReturnType<typeof useBwaService>;
        pageState: ReturnType<typeof useBwaPageState>;
        isGodMode: boolean;
        onNewExpense: () => void;
        onPrint: (mode: 'management' | 'tax') => void;
    }>();

    let showPrintMenu = $state(false);

    // Alphabetisch sortierte Firmen nach Stadt / Name gemäß Regel alphabetical-select
    let sortedCompanies = $derived.by(() => {
        const list = [...(orgaStore.company?.data || [])];
        return list.sort((a, b) => {
            const labelA = `${a.city || ''} ${a.name || ''}`.trim();
            const labelB = `${b.city || ''} ${b.name || ''}`.trim();
            return labelA.localeCompare(labelB, 'de', { sensitivity: 'base' });
        });
    });
</script>

<div class="orga-page-header animate-enter print:hidden mb-6">
    <div class="flex flex-col xl:flex-row xl:items-end justify-between gap-4 w-full">
        <div>
            <div class="flex items-center gap-3 mb-1">
                <div class="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                    <BarChart3 class="w-5 h-5 text-white" />
                </div>
                <div>
                    <h1 class="text-2xl font-black text-neutral-900 dark:text-white tracking-tight">Firmenfinanzen &amp; BWA</h1>
                    <p class="text-xs text-neutral-500 font-medium mt-0.5">Betriebswirtschaftliche Kennzahlen, Steuerschätzung &amp; Liquidität verständlich erklärt.</p>
                </div>
            </div>
        </div>
        
        <div class="flex flex-wrap items-center gap-2.5">
            {#if isGodMode}
                <div class="relative flex items-center bg-white dark:bg-slate-800 border border-neutral-200/80 dark:border-slate-700 hover:border-indigo-300 rounded-xl px-3 py-2 transition-colors cursor-pointer shadow-xs shrink-0 gap-2">
                    <Building2 class="w-4 h-4 text-indigo-500 shrink-0" />
                    <select aria-label="Firma wählen" bind:value={bwa.selectedCompanyId} class="bg-transparent text-xs sm:text-sm font-bold text-neutral-800 dark:text-slate-200 outline-none cursor-pointer appearance-none pr-4 max-w-44 truncate">
                        <option value="all">Alle Firmen</option>
                        {#each sortedCompanies as comp}
                            <option value={comp.id}>{comp.city} {comp.name ? `(${comp.name})` : ''}</option>
                        {/each}
                    </select>
                </div>
            {/if}

            <LexOfficeSyncButton companyId={bwa.selectedCompanyId} onSynced={() => bwa.loadExpenses()} />

            <div class="flex bg-neutral-100 dark:bg-slate-800 p-1 rounded-xl border border-neutral-200/80 dark:border-slate-700 shadow-inner shrink-0">
                <button onclick={() => pageState.activeTab = 'dashboard'} class="px-4 py-2 text-xs font-bold rounded-lg transition-all {pageState.activeTab === 'dashboard' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs' : 'text-neutral-500 dark:text-slate-400 hover:text-neutral-800 dark:hover:text-slate-200'}">
                    Finanz-Dashboard
                </button>
                <button onclick={() => pageState.activeTab = 'vma'} class="px-4 py-2 text-xs font-bold rounded-lg transition-all {pageState.activeTab === 'vma' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs' : 'text-neutral-500 dark:text-slate-400 hover:text-neutral-800 dark:hover:text-slate-200'}">
                    Reisekosten (VMA)
                </button>
            </div>

            <button 
                onclick={onNewExpense} 
                class="min-h-[40px] px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 touch-manipulation active:scale-95 shrink-0"
                title="Neue betriebliche Ausgabe erfassen"
            >
                <Plus class="w-4 h-4" />
                <span>Ausgabe erfassen</span>
            </button>

            <div class="relative shrink-0">
                <button 
                    onclick={() => showPrintMenu = !showPrintMenu} 
                    class="min-h-[40px] px-3.5 py-2 bg-neutral-100 dark:bg-slate-800 hover:bg-neutral-200 dark:hover:bg-slate-700 border border-neutral-200/80 dark:border-slate-700 text-neutral-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 touch-manipulation active:scale-95 shadow-xs"
                    title="Bericht drucken oder als PDF speichern"
                >
                    <Printer class="w-4 h-4 text-neutral-600 dark:text-slate-300" />
                    <span class="hidden sm:inline">Drucken / PDF</span>
                </button>
                {#if showPrintMenu}
                    <div class="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-700 rounded-2xl shadow-xl z-50 p-2 space-y-1">
                        <button 
                            onclick={() => { showPrintMenu = false; onPrint('management'); }}
                            class="w-full text-left p-2.5 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors text-xs font-bold text-neutral-800 dark:text-slate-200 flex flex-col gap-0.5"
                        >
                            <span class="text-indigo-600 dark:text-indigo-400">📊 Management-Report (1 Seite)</span>
                            <span class="text-[10px] text-neutral-400 font-normal">Kompakte Übersicht mit Grafiken &amp; Kennzahlen</span>
                        </button>
                        <button 
                            onclick={() => { showPrintMenu = false; onPrint('tax'); }}
                            class="w-full text-left p-2.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-slate-800 transition-colors text-xs font-bold text-neutral-800 dark:text-slate-200 flex flex-col gap-0.5 border-t border-neutral-100 dark:border-slate-800 pt-2"
                        >
                            <span class="text-neutral-700 dark:text-slate-300">📄 BWA für Steuerberater / Bank</span>
                            <span class="text-[10px] text-neutral-400 font-normal">Klassische Kosten- und Erlösstruktur</span>
                        </button>
                    </div>
                {/if}
            </div>
        </div>
    </div>
</div>
