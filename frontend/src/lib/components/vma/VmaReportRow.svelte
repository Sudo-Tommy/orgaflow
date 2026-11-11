<script lang="ts">
    import { ExternalLink, ChevronDown, ChevronUp, AlertTriangle } from "lucide-svelte";
    import type { TravelReport } from "./vmaTypes";
    import { formatDuration, formatTime } from "./vmaCalculationService";

    let {
        report,
        userAddress,
        onToggleMeal
    }: {
        report: TravelReport;
        userAddress: string | null;
        onToggleMeal: (key: string, meal: 'breakfast' | 'lunch' | 'dinner') => void;
    } = $props();

    let isExpanded = $state(false);
</script>

<tr class="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-100 dark:border-slate-800/80">
    <!-- Datum & Aufklapp-Button -->
    <td class="py-3 px-3 sm:px-3.5 whitespace-nowrap">
        <div class="flex items-center gap-1.5">
            <button 
                type="button" 
                onclick={() => isExpanded = !isExpanded}
                class="w-8 h-8 min-w-[32px] min-h-[32px] rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Details ein- oder ausblenden"
                title="Details zur Route & Belegen anzeigen"
            >
                {#if isExpanded}
                    <ChevronUp class="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                {:else}
                    <ChevronDown class="w-4 h-4" />
                {/if}
            </button>
            <div>
                <div class="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm">
                    {report.date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </div>
                <span class="text-[11px] text-slate-400 font-medium">
                    {report.date.toLocaleDateString('de-DE', { weekday: 'short' })}
                </span>
            </div>
        </div>
    </td>

    <!-- Reisezeit mit Plausibilitäts-Warnbadge -->
    <td class="py-3 px-3 sm:px-3.5 whitespace-nowrap text-slate-700 dark:text-slate-300 font-medium text-xs">
        {#if report.departure && report.arrival}
            <div class="flex items-center gap-1">
                <span class="font-semibold">{formatTime(report.departure)}</span>
                <span class="text-slate-400">&rarr;</span>
                <span class="font-semibold">{formatTime(report.arrival)}</span>
            </div>
        {:else if report.departure}
            <span>ab {formatTime(report.departure)}</span>
        {:else if report.arrival}
            <span>bis {formatTime(report.arrival)}</span>
        {:else}
            <span class="text-slate-400">Ganztägig (24h)</span>
        {/if}
        {#if report.hasTimeWarning}
            <div class="inline-flex items-center gap-1 px-1.5 py-0.5 mt-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                <AlertTriangle class="w-3 h-3 shrink-0" />
                <span>{report.timeWarningText || 'Zeiten prüfen'}</span>
            </div>
        {/if}
    </td>

    <!-- Pflichtangaben: Zweck & Route -->
    <td class="py-3 px-3 sm:px-3.5 max-w-[200px] lg:max-w-xs text-xs">
        <div class="font-bold text-slate-900 dark:text-slate-100 truncate" title={report.purpose}>
            {report.purpose}
        </div>
        <div class="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate" title={report.destinationAddress || report.routeFormatted}>
            <span class="truncate">{report.routeFormatted}</span>
            {#if report.destinationAddress}
                <a 
                    href="https://www.google.com/maps/dir/?api=1&origin={encodeURIComponent(userAddress || '')}&destination={encodeURIComponent(report.destinationAddress)}" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    class="w-7 h-7 min-w-[28px] min-h-[28px] inline-flex items-center justify-center text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded transition-colors shrink-0" 
                    title="Route in Google Maps aufrufen"
                >
                    <ExternalLink class="w-3.5 h-3.5" />
                </a>
            {/if}
        </div>
    </td>

    <!-- Abwesenheit & Distanz -->
    <td class="py-3 px-3 sm:px-3.5 text-right whitespace-nowrap text-xs">
        <span class="font-bold text-slate-800 dark:text-slate-100">{formatDuration(report.totalAbsenceHours)}</span>
        {#if report.totalKm > 0}
            <span class="block text-[11px] text-slate-400 font-medium">
                {report.totalKm} km
                {#if report.isGoogleEstimatedKm}
                    <span class="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold ml-0.5">Google</span>
                {/if}
            </span>
        {/if}
    </td>

    <!-- 1. Fahrtkosten -->
    <td class="py-3 px-3 sm:px-3.5 text-right whitespace-nowrap text-xs">
        <span class="font-bold text-slate-900 dark:text-slate-100">
            {report.travelCosts > 0 ? `${report.travelCosts.toFixed(2).replace('.', ',')} €` : '-'}
        </span>
        {#if report.travelCosts > 0}
            <span class="block text-[10px] text-slate-400">
                {#if report.mileageCosts > 0}{report.mileageCosts.toFixed(2).replace('.', ',')} € PKW{/if}
                {#if report.ticketCosts > 0}{report.mileageCosts > 0 ? ' + ' : ''}{report.ticketCosts.toFixed(2).replace('.', ',')} € Ticket{/if}
            </span>
        {/if}
    </td>

    <!-- 2. VMA & F/M/A Touch-Kürzung -->
    <td class="py-3 px-3 sm:px-3.5 whitespace-nowrap text-center text-xs">
        <div class="inline-flex flex-col items-center">
            <div class="flex items-center gap-1.5">
                <span class="font-bold {report.netPerDiem > 0 ? 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 px-2 py-0.5 rounded-full text-xs' : 'text-slate-400'}">
                    {report.netPerDiem > 0 ? `${report.netPerDiem.toFixed(2).replace('.', ',')} €` : '0,00 €'}
                </span>

                <div class="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl no-print border border-slate-200 dark:border-slate-700">
                    <button 
                        type="button" 
                        onclick={() => onToggleMeal(report.key, 'breakfast')}
                        class="w-10 h-10 min-w-[40px] min-h-[40px] rounded-lg text-xs font-black flex items-center justify-center transition-all cursor-pointer {report.meals?.breakfast ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 bg-white/70 dark:bg-slate-700/50'}"
                        title="Frühstück gestellt (-20 % = -5,60 €)"
                        aria-label="Frühstück gestellt"
                    >
                        F
                    </button>
                    <button 
                        type="button" 
                        onclick={() => onToggleMeal(report.key, 'lunch')}
                        class="w-10 h-10 min-w-[40px] min-h-[40px] rounded-lg text-xs font-black flex items-center justify-center transition-all cursor-pointer {report.meals?.lunch ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 bg-white/70 dark:bg-slate-700/50'}"
                        title="Mittagessen gestellt (-40 % = -11,20 €)"
                        aria-label="Mittagessen gestellt"
                    >
                        M
                    </button>
                    <button 
                        type="button" 
                        onclick={() => onToggleMeal(report.key, 'dinner')}
                        class="w-10 h-10 min-w-[40px] min-h-[40px] rounded-lg text-xs font-black flex items-center justify-center transition-all cursor-pointer {report.meals?.dinner ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 bg-white/70 dark:bg-slate-700/50'}"
                        title="Abendessen gestellt (-40 % = -11,20 €)"
                        aria-label="Abendessen gestellt"
                    >
                        A
                    </button>
                </div>
            </div>

            {#if report.deductionText}
                <span class="text-[10px] text-rose-500 dark:text-rose-400 font-medium mt-0.5">
                    {report.deductionText} (Brutto: {report.grossPerDiem?.toFixed(2).replace('.', ',')} €)
                </span>
            {/if}
        </div>
    </td>

    <!-- 3. Übernachtung -->
    <td class="py-3 px-3 sm:px-3.5 text-right whitespace-nowrap text-xs text-slate-800 dark:text-slate-200 font-semibold">
        {report.accommodation > 0 ? `${report.accommodation.toFixed(2).replace('.', ',')} €` : '-'}
    </td>

    <!-- 4. Nebenkosten -->
    <td class="py-3 px-3 sm:px-3.5 text-right whitespace-nowrap text-xs text-slate-800 dark:text-slate-200 font-semibold">
        {report.incidentalCosts > 0 ? `${report.incidentalCosts.toFixed(2).replace('.', ',')} €` : '-'}
        {#if report.incidentalNote}
            <span class="block text-[10px] text-slate-400 font-normal truncate max-w-[100px]" title={report.incidentalNote}>
                {report.incidentalNote}
            </span>
        {/if}
    </td>

    <!-- Tagessumme -->
    <td class="py-3 px-3 sm:px-3.5 text-right whitespace-nowrap font-black text-indigo-700 dark:text-indigo-400 text-xs sm:text-sm">
        {report.dayTotal.toFixed(2).replace('.', ',')} €
    </td>
</tr>

<!-- Aufklappbare Detailzeile für Route & Belege -->
{#if isExpanded}
    <tr class="bg-indigo-50/40 dark:bg-indigo-950/20 border-b border-indigo-100 dark:border-indigo-900/30">
        <td colspan="9" class="p-3 text-xs text-slate-700 dark:text-slate-300">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                    <span class="font-bold text-slate-900 dark:text-slate-100 block mb-0.5">Startadresse:</span>
                    <span class="text-slate-600 dark:text-slate-400">{report.originAddress || 'Betriebssitz / Wohnort nicht hinterlegt'}</span>
                </div>
                <div>
                    <span class="font-bold text-slate-900 dark:text-slate-100 block mb-0.5">Zieladresse:</span>
                    <span class="text-slate-600 dark:text-slate-400">{report.destinationAddress || 'Am Termin hinterlegt'}</span>
                </div>
                <div>
                    <span class="font-bold text-slate-900 dark:text-slate-100 block mb-0.5">Fahrtzeiten & Belege:</span>
                    <span class="text-slate-600 dark:text-slate-400">
                        Hinweg ca. {report.outwardMinutes || 0} Min. &bull; Rückweg ca. {report.returnMinutes || 0} Min.
                        {#if report.incidentalNote}&bull; Belege: {report.incidentalNote}{/if}
                    </span>
                </div>
            </div>
        </td>
    </tr>
{/if}
