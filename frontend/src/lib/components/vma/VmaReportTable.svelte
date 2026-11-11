<script lang="ts">
    import { CalendarDays, Loader2, Sparkles, History } from "lucide-svelte";
    import type { TravelReport, VmaTotals } from "./vmaTypes";
    import { formatDuration, getMonthName } from "./vmaCalculationService";
    import VmaReportRow from "./VmaReportRow.svelte";

    let {
        travelReports = [],
        totals,
        isLoading = false,
        isCalculating = false,
        userAddress = null,
        selectedMonth,
        selectedYear,
        viewMode,
        allSavedReportsCount = 0,
        onGenerate,
        onShowHistory,
        onToggleMeal
    }: {
        travelReports: TravelReport[];
        totals: VmaTotals;
        isLoading: boolean;
        isCalculating: boolean;
        userAddress: string | null;
        selectedMonth: number;
        selectedYear: number;
        viewMode: 'monthly' | 'yearly';
        allSavedReportsCount: number;
        onGenerate: () => void;
        onShowHistory: () => void;
        onToggleMeal: (key: string, meal: 'breakfast' | 'lunch' | 'dinner') => void;
    } = $props();
</script>

<div class="bg-white dark:bg-slate-900 border border-neutral-200/80 dark:border-slate-800 rounded-2xl shadow-2xs overflow-hidden">
    {#if isLoading}
        <div class="p-16 text-center text-neutral-400 dark:text-slate-500 space-y-3">
            <Loader2 class="w-8 h-8 animate-spin mx-auto text-indigo-600 dark:text-indigo-400" />
            <p class="text-sm font-semibold">Lade Abrechnung aus PocketBase...</p>
        </div>
    {:else if travelReports.length === 0}
        <div class="p-10 sm:p-14 text-center max-w-lg mx-auto space-y-4">
            <div class="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto shadow-xs">
                <CalendarDays class="w-7 h-7" />
            </div>
            <div class="space-y-1">
                <h3 class="text-base sm:text-lg font-black text-neutral-900 dark:text-slate-100">
                    Keine Abrechnung für {viewMode === 'monthly' ? getMonthName(selectedMonth, selectedYear) : ''} {selectedYear} geladen
                </h3>
                <p class="text-xs text-neutral-500 dark:text-slate-400 leading-relaxed">
                    Ermitteln Sie jetzt automatisch alle Termine, Einsatzzeiten, Google Routes Fahrstrecken und Belege für diesen Zeitraum.
                </p>
            </div>
            <div class="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button 
                    type="button" 
                    onclick={onGenerate} 
                    disabled={isCalculating}
                    class="h-11 min-h-[44px] px-5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                    <Sparkles class="w-4 h-4 text-amber-300" /> 
                    <span>VMA & Reisekosten berechnen</span>
                </button>
                {#if allSavedReportsCount > 0}
                    <button 
                        type="button"
                        onclick={onShowHistory}
                        class="h-11 min-h-[44px] px-4 bg-neutral-100 hover:bg-neutral-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-neutral-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                        <History class="w-4 h-4" />
                        <span>Archiv ({allSavedReportsCount})</span>
                    </button>
                {/if}
            </div>
        </div>
    {:else}
        <!-- Tabelle ohne internen vertikalen Scrollbalken (Zero Inner Scroll) -->
        <div class="overflow-x-auto custom-scrollbar">
            <table class="w-full text-left border-collapse text-xs min-w-[850px] tabular-nums">
                <thead>
                    <tr class="bg-slate-100/90 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold uppercase tracking-wider text-[11px]">
                        <th class="py-3 px-3 sm:px-3.5">Datum</th>
                        <th class="py-3 px-3 sm:px-3.5">Reisezeit</th>
                        <th class="py-3 px-3 sm:px-3.5">Pflichtangaben: Zweck & Route</th>
                        <th class="py-3 px-3 sm:px-3.5 text-right">Abwesenheit</th>
                        <th class="py-3 px-3 sm:px-3.5 text-right">1. Fahrtkosten</th>
                        <th class="py-3 px-3 sm:px-3.5 text-center">2. VMA & Kürzung</th>
                        <th class="py-3 px-3 sm:px-3.5 text-right">3. Übernachtung</th>
                        <th class="py-3 px-3 sm:px-3.5 text-right">4. Nebenkosten</th>
                        <th class="py-3 px-3 sm:px-3.5 text-right font-black text-slate-900 dark:text-slate-100">Tagessumme</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-slate-900">
                    {#each travelReports as report (report.key)}
                        <VmaReportRow {report} {userAddress} {onToggleMeal} />
                    {/each}
                </tbody>
                <tfoot>
                    <tr class="bg-slate-100/95 dark:bg-slate-800/95 border-t-2 border-slate-300 dark:border-slate-700 font-bold text-xs text-slate-900 dark:text-slate-100">
                        <td colspan="3" class="py-3.5 px-3 sm:px-3.5 uppercase tracking-wider">
                            Gesamtergebnis ({travelReports.length} Reisetage):
                        </td>
                        <td class="py-3.5 px-3 sm:px-3.5 text-right">{formatDuration(totals.absence)}</td>
                        <td class="py-3.5 px-3 sm:px-3.5 text-right text-indigo-900 dark:text-indigo-200 font-bold">{totals.travel.toFixed(2).replace('.', ',')} €</td>
                        <td class="py-3.5 px-3 sm:px-3.5 text-center text-emerald-600 dark:text-emerald-400 font-black">{totals.vma.toFixed(2).replace('.', ',')} €</td>
                        <td class="py-3.5 px-3 sm:px-3.5 text-right">{totals.accommodation.toFixed(2).replace('.', ',')} €</td>
                        <td class="py-3.5 px-3 sm:px-3.5 text-right">{totals.incidental.toFixed(2).replace('.', ',')} €</td>
                        <td class="py-3.5 px-3 sm:px-3.5 text-right text-indigo-700 dark:text-indigo-400 font-black text-sm">{totals.total.toFixed(2).replace('.', ',')} €</td>
                    </tr>
                </tfoot>
            </table>
        </div>
    {/if}
</div>
