<script lang="ts">
    import { Check, Eye, RefreshCw } from "lucide-svelte";
    import type { VmaSettlementRecord } from "$lib/services/vmaSettlementService.svelte";
    import { getMonthName } from "./vmaCalculationService";

    let {
        savedRecord,
        selectedMonth,
        selectedYear,
        viewMode,
        isCalculating = false,
        onUpdateStatus,
        onOpenPdf,
        onRecalculate
    }: {
        savedRecord: VmaSettlementRecord;
        selectedMonth: number;
        selectedYear: number;
        viewMode: 'monthly' | 'yearly';
        isCalculating: boolean;
        onUpdateStatus: (record: VmaSettlementRecord, status: 'entwurf' | 'eingereicht' | 'genehmigt' | 'abgerechnet') => void;
        onOpenPdf: () => void;
        onRecalculate: () => void;
    } = $props();

    function getStatusBadge(status?: string): string {
        switch (status) {
            case 'genehmigt': return 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800';
            case 'abgerechnet': return 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800';
            case 'eingereicht': return 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800';
            case 'entwurf': default: return 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800';
        }
    }

    function getStatusLabel(status?: string): string {
        switch (status) {
            case 'genehmigt': return 'Genehmigt';
            case 'abgerechnet': return 'Abgerechnet';
            case 'eingereicht': return 'Eingereicht';
            case 'entwurf': default: return 'Entwurf';
        }
    }
</script>

<div class="p-3.5 sm:p-4 bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-emerald-900 dark:text-emerald-200 shadow-2xs no-print">
    <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-xl bg-emerald-200 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-200 flex items-center justify-center font-bold text-sm shrink-0">
            <Check class="w-4 h-4" />
        </div>
        <div>
            <div class="flex items-center gap-2 font-bold">
                <span>Abrechnung archiviert: {viewMode === 'monthly' ? getMonthName(selectedMonth, selectedYear) : ''} {selectedYear}</span>
                <span class="px-2 py-0.5 rounded-full text-[11px] {getStatusBadge(savedRecord.status)} border">
                    {getStatusLabel(savedRecord.status)}
                </span>
            </div>
            <p class="text-[11px] text-emerald-700 dark:text-emerald-300 mt-0.5">
                GoBD-konform in PocketBase gesichert am {new Date(savedRecord.updated || savedRecord.created).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })} Uhr.
            </p>
        </div>
    </div>

    <div class="flex items-center gap-2 shrink-0">
        <!-- Status-Schnellwahl -->
        <select 
            value={savedRecord.status || 'entwurf'}
            onchange={(e) => onUpdateStatus(savedRecord, (e.target as HTMLSelectElement).value as any)}
            class="h-11 min-h-[44px] px-3 bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 rounded-xl text-xs font-semibold text-emerald-900 dark:text-slate-200 cursor-pointer shadow-2xs focus:ring-2 focus:ring-emerald-500"
            aria-label="Status der Abrechnung ändern"
        >
            <option value="entwurf">Status: Entwurf</option>
            <option value="eingereicht">Status: Eingereicht</option>
            <option value="genehmigt">Status: Genehmigt</option>
            <option value="abgerechnet">Status: Abgerechnet</option>
        </select>

        <!-- Archiviertes PDF direkt aufrufen -->
        <button 
            type="button" 
            onclick={onOpenPdf}
            class="h-11 min-h-[44px] px-3.5 bg-white dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 rounded-xl font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
        >
            <Eye class="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>PDF öffnen</span>
        </button>

        <!-- Aktualisieren Button -->
        <button 
            type="button" 
            onclick={onRecalculate}
            disabled={isCalculating}
            class="h-11 min-h-[44px] px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50"
            title="Abrechnung neu berechnen und aktualisieren"
        >
            <RefreshCw class="w-4 h-4 {isCalculating ? 'animate-spin' : ''}" />
            <span>Aktualisieren</span>
        </button>
    </div>
</div>
