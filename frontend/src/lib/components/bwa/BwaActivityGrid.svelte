<script lang="ts">
    import { ChevronDown, ChevronUp, RefreshCw } from "lucide-svelte";
    import type { useBwaService } from "$lib/services/bwaService.svelte";
    import type { useBwaPageState } from "$lib/services/bwaPageState.svelte";
    import BwaTable from "$lib/components/bwa/BwaTable.svelte";

    let { bwa, pageState, onOpenClients, onOpenTeam, onOpenExpenses, onNewExpense, onOpenVmaTab } = $props<{
        bwa: ReturnType<typeof useBwaService>;
        pageState: ReturnType<typeof useBwaPageState>;
        onOpenClients: () => void;
        onOpenTeam: () => void;
        onOpenExpenses: () => void;
        onNewExpense: () => void;
        onOpenVmaTab: () => void;
    }>();

    let showAdvisorTable = $state(false);
</script>

<div class="space-y-6 print:hidden">
    <!-- 4 Aktivitäts-Karten -->
    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <!-- 1. Top Klienten -->
        <div class="bg-white dark:bg-slate-900 rounded-3xl border border-neutral-100 dark:border-slate-800 shadow-xs p-4 sm:p-5 flex flex-col justify-between">
            <div class="flex items-center justify-between mb-3">
                <h3 class="font-bold text-neutral-900 dark:text-white flex items-center gap-2 text-sm sm:text-base">
                    <span class="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center text-sm shadow-inner shrink-0">🏆</span> 
                    Top Klienten
                </h3>
                <button onclick={onOpenClients} class="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline">Alle anzeigen</button>
            </div>
            <div class="space-y-1.5 flex-1">
                {#each bwa.stats.clientStats.slice(0, 3) as c, i}
                    <button onclick={onOpenClients} class="w-full text-left flex items-center justify-between p-1.5 rounded-xl hover:bg-neutral-50 dark:hover:bg-slate-800/70 transition-colors">
                        <span class="text-xs font-bold text-neutral-700 dark:text-slate-300 truncate">#{i+1} {c.name}</span>
                        <span class="text-xs font-black text-indigo-600 dark:text-indigo-400 shrink-0">{c.revenue.toFixed(0)} €</span>
                    </button>
                {/each}
                {#if bwa.stats.clientStats.length === 0}
                    <p class="text-xs text-neutral-400 text-center py-2">Keine Klienten erfasst</p>
                {/if}
            </div>
        </div>

        <!-- 2. Team-Leistung -->
        <div class="bg-white dark:bg-slate-900 rounded-3xl border border-neutral-100 dark:border-slate-800 shadow-xs p-4 sm:p-5 flex flex-col justify-between">
            <div class="flex items-center justify-between mb-3">
                <h3 class="font-bold text-neutral-900 dark:text-white flex items-center gap-2 text-sm sm:text-base">
                    <span class="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 flex items-center justify-center text-sm shadow-inner shrink-0">👥</span> 
                    Team-Stunden
                </h3>
                <button onclick={onOpenTeam} class="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline">Details</button>
            </div>
            <div class="space-y-1.5 flex-1">
                {#each bwa.stats.userStats.slice(0, 3) as u}
                    <button onclick={onOpenTeam} class="w-full text-left flex items-center justify-between p-1.5 rounded-xl hover:bg-neutral-50 dark:hover:bg-slate-800/70 transition-colors">
                        <span class="text-xs font-bold text-neutral-700 dark:text-slate-300 truncate">{u.name || 'Unbekannt'}</span>
                        <span class="text-xs font-black text-emerald-600 dark:text-emerald-400 shrink-0">{u.hours.toFixed(1).replace('.', ',')} h</span>
                    </button>
                {/each}
                {#if bwa.stats.userStats.length === 0}
                    <p class="text-xs text-neutral-400 text-center py-2">Keine Stunden erfasst</p>
                {/if}
            </div>
        </div>

        <!-- 3. Letzte Ausgaben -->
        <div class="bg-white dark:bg-slate-900 rounded-3xl border border-neutral-100 dark:border-slate-800 shadow-xs p-4 sm:p-5 flex flex-col justify-between">
            <div class="flex items-center justify-between mb-3">
                <h3 class="font-bold text-neutral-900 dark:text-white flex items-center gap-2 text-sm sm:text-base">
                    <span class="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center text-sm shadow-inner shrink-0">🧾</span> 
                    Ausgaben
                </h3>
                <div class="flex items-center gap-1.5">
                    <button onclick={onNewExpense} class="w-6 h-6 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 font-black text-sm flex items-center justify-center hover:bg-rose-100" title="Neue Ausgabe">+</button>
                    <button onclick={onOpenExpenses} class="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline">Alle</button>
                </div>
            </div>
            <div class="space-y-1.5 flex-1">
                {#each bwa.companyExpenses.slice(0, 3) as exp}
                    <button onclick={onOpenExpenses} class="w-full text-left flex items-center justify-between p-1.5 rounded-xl hover:bg-neutral-50 dark:hover:bg-slate-800/70 transition-colors">
                        <span class="text-xs font-bold text-neutral-700 dark:text-slate-300 truncate">{exp.supplier || 'Unbekannt'}</span>
                        <span class="text-xs font-black text-rose-600 dark:text-rose-400 shrink-0">{exp.amount.toFixed(2).replace('.', ',')} €</span>
                    </button>
                {/each}
                {#if bwa.companyExpenses.length === 0}
                    <p class="text-xs text-neutral-400 text-center py-2">Keine Ausgaben erfasst</p>
                {/if}
            </div>
        </div>

        <!-- 4. Reisekosten VMA (Live-Widget) -->
        <div class="bg-white dark:bg-slate-900 rounded-3xl border border-neutral-100 dark:border-slate-800 shadow-xs p-4 sm:p-5 flex flex-col justify-between">
            <div class="flex items-center justify-between mb-2">
                <h3 class="font-bold text-neutral-900 dark:text-white flex items-center gap-2 text-sm sm:text-base">
                    <span class="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center text-sm shadow-inner shrink-0">🚗</span> 
                    Reisekosten (VMA)
                </h3>
                <button onclick={() => pageState.updateVma(false)} disabled={pageState.isUpdatingVma} class="w-7 h-7 rounded-lg hover:bg-neutral-100 dark:hover:bg-slate-800 flex items-center justify-center text-neutral-500 hover:text-indigo-600" title="Jetzt aktualisieren">
                    <RefreshCw class="w-3.5 h-3.5 {pageState.isUpdatingVma ? 'animate-spin text-indigo-600' : ''}" />
                </button>
            </div>
            <div class="text-center py-2">
                <span class="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 block">{pageState.formatCurrency(pageState.vmaCurrentMonth)}</span>
                <span class="text-[10px] text-neutral-400 block">{pageState.lastVmaUpdate || 'Automatisch berechnet'}</span>
            </div>
            <button onclick={onOpenVmaTab} class="w-full py-1.5 bg-neutral-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-xl transition-colors text-center">
                Spesen &amp; Kilometer prüfen &rarr;
            </button>
        </div>
    </div>

    <!-- Ausklappbare BWA-Tabelle für den Steuerberater -->
    <div class="bg-white dark:bg-slate-900 rounded-3xl border border-neutral-100 dark:border-slate-800 shadow-xs overflow-hidden">
        <button 
            type="button"
            onclick={() => showAdvisorTable = !showAdvisorTable}
            class="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-neutral-50 dark:hover:bg-slate-800/50 transition-colors"
        >
            <div class="flex items-center gap-3">
                <span class="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center text-sm shadow-inner">📄</span>
                <div>
                    <h3 class="font-bold text-neutral-900 dark:text-white text-sm sm:text-base">Detaillierte BWA-Tabelle (für Steuerberater &amp; Bank)</h3>
                    <p class="text-[11px] text-neutral-400">Vollständige Kontenstruktur nach SKR-Logik, Erlösen, Vorsteuer &amp; Betriebsausgaben</p>
                </div>
            </div>
            <div class="flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                <span>{showAdvisorTable ? 'Tabelle einklappen' : 'Tabelle anzeigen'}</span>
                {#if showAdvisorTable}<ChevronUp class="w-4 h-4" />{:else}<ChevronDown class="w-4 h-4" />{/if}
            </div>
        </button>

        {#if showAdvisorTable}
            <div class="border-t border-neutral-100 dark:border-slate-800 overflow-x-auto p-4 animate-enter">
                <BwaTable 
                    currentBWA={pageState.currentBWA} 
                    ytdBWA={pageState.ytdBWA} 
                    viewMode={pageState.viewMode} 
                    selectedMonth={pageState.selectedMonth} 
                    selectedQuarter={pageState.selectedQuarter} 
                    selectedYear={bwa.selectedYear} 
                    selectedCompanyId={bwa.selectedCompanyId} 
                />
            </div>
        {/if}
    </div>
</div>
