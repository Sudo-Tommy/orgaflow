<script lang="ts">
    import { 
        Car, ChevronLeft, ChevronRight, User, History, Printer, 
        FileText, FileCheck, Loader2, Sparkles, RefreshCw, Check 
    } from "lucide-svelte";
    import { pb } from "$lib/services/pocketbase";
    import { getMonthName } from "./vmaCalculationService";

    let {
        selectedMonth = $bindable(new Date().getMonth() + 1),
        selectedYear = $bindable(new Date().getFullYear()),
        viewMode = $bindable<'monthly' | 'yearly'>('monthly'),
        selectedUserId = $bindable(""),
        usersList = [],
        isSuperAdmin = false,
        savedRecordId = null,
        savedRecordStatus = 'entwurf',
        savedRecordPdfUrl = null,
        reportsCount = 0,
        archiveCount = 0,
        isLoading = false,
        isCalculating = false,
        isGenerating = false,
        onPrevPeriod,
        onNextPeriod,
        onPeriodChange,
        onUserChange,
        onShowHistory,
        onPrint,
        onDownloadPdf,
        onGenerate
    }: {
        selectedMonth: number;
        selectedYear: number;
        viewMode: 'monthly' | 'yearly';
        selectedUserId: string;
        usersList: any[];
        isSuperAdmin: boolean;
        savedRecordId: string | null;
        savedRecordStatus: string;
        savedRecordPdfUrl: string | null;
        reportsCount: number;
        archiveCount: number;
        isLoading: boolean;
        isCalculating: boolean;
        isGenerating: boolean;
        onPrevPeriod: () => void;
        onNextPeriod: () => void;
        onPeriodChange: () => void;
        onUserChange: () => void;
        onShowHistory: () => void;
        onPrint: () => void;
        onDownloadPdf: () => void;
        onGenerate: () => void;
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

<div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-neutral-200/80 dark:border-slate-800 pb-5 no-print">
    <!-- Titel & Status -->
    <div class="flex items-center gap-3">
        <div class="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 shadow-xs">
            <Car class="w-6 h-6" />
        </div>
        <div>
            <div class="flex flex-wrap items-center gap-2">
                <h1 class="text-xl sm:text-2xl md:text-3xl font-black text-neutral-900 dark:text-slate-100 tracking-tight">
                    Reisekosten & VMA
                </h1>
                {#if savedRecordId}
                    <span class="text-xs px-3 py-1 rounded-full font-bold border inline-flex items-center gap-1.5 shadow-2xs {getStatusBadge(savedRecordStatus)}">
                        <Check class="w-3.5 h-3.5" />
                        Archiviert ({getStatusLabel(savedRecordStatus)})
                    </span>
                {/if}
            </div>
            <p class="text-xs sm:text-sm text-neutral-500 dark:text-slate-400 font-medium mt-0.5">
                Die 4 Säulen der Reisekosten (§ 9 Abs. 4a EStG) &bull; PocketBase-Archivierung & Duplikatsprüfung.
            </p>
        </div>
    </div>

    <!-- Steuerung & Aktionen -->
    <div class="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5">
        <!-- Mitarbeiter-Filter für Admins -->
        {#if isSuperAdmin && usersList.length > 0}
            <div class="flex items-center gap-2 bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-xl px-3 h-11 min-h-[44px] shadow-2xs">
                <User class="w-4 h-4 text-neutral-400 shrink-0" />
                <select 
                    bind:value={selectedUserId} 
                    onchange={onUserChange} 
                    class="text-xs font-semibold text-neutral-800 dark:text-slate-200 bg-transparent border-none focus:ring-0 cursor-pointer pr-4"
                    aria-label="Mitarbeiter auswählen"
                >
                    <option value={pb.authStore.model?.id}>Mein Account ({pb.authStore.model?.name_first} {pb.authStore.model?.name_last})</option>
                    {#each usersList as u (u.id)}
                        {#if u.id !== pb.authStore.model?.id}
                            <option value={u.id}>{u.name_first} {u.name_last}</option>
                        {/if}
                    {/each}
                </select>
            </div>
        {/if}

        <!-- Zeitraum Monat / Jahr Umschalter -->
        <div class="flex bg-neutral-100 dark:bg-slate-800 p-1 rounded-xl shadow-inner h-11 min-h-[44px] items-center">
            <button 
                type="button"
                onclick={() => { viewMode = 'monthly'; onPeriodChange(); }}
                class="h-full px-4 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center {viewMode === 'monthly' ? 'bg-white dark:bg-slate-700 shadow-xs text-indigo-600 dark:text-indigo-400' : 'text-neutral-500 dark:text-slate-400 hover:text-neutral-800 dark:hover:text-slate-200'}"
            >
                Monat
            </button>
            <button 
                type="button"
                onclick={() => { viewMode = 'yearly'; onPeriodChange(); }}
                class="h-full px-4 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center {viewMode === 'yearly' ? 'bg-white dark:bg-slate-700 shadow-xs text-indigo-600 dark:text-indigo-400' : 'text-neutral-500 dark:text-slate-400 hover:text-neutral-800 dark:hover:text-slate-200'}"
            >
                Jahr
            </button>
        </div>

        <!-- Monat/Jahr Vor / Zurück -->
        <div class="flex items-center bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-xl p-0.5 shadow-2xs h-11 min-h-[44px]">
            <button 
                type="button" 
                onclick={onPrevPeriod} 
                class="w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center text-neutral-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-neutral-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer" 
                aria-label="Vorheriger Zeitraum"
            >
                <ChevronLeft class="w-5 h-5" />
            </button>
            <span class="px-3 text-center font-bold text-neutral-800 dark:text-slate-200 text-xs sm:text-sm whitespace-nowrap min-w-[120px]">
                {viewMode === 'monthly' ? getMonthName(selectedMonth, selectedYear) : ''} {selectedYear}
            </span>
            <button 
                type="button" 
                onclick={onNextPeriod} 
                class="w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center text-neutral-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-neutral-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer" 
                aria-label="Nächster Zeitraum"
            >
                <ChevronRight class="w-5 h-5" />
            </button>
        </div>

        <!-- Aktions-Buttons -->
        <div class="flex items-center gap-2">
            <!-- Archiv -->
            <button 
                type="button"
                onclick={onShowHistory}
                class="h-11 min-h-[44px] px-3.5 bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 hover:bg-neutral-50 dark:hover:bg-slate-800 text-neutral-700 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                title="Gespeicherte Abrechnungen im Archiv anzeigen"
            >
                <History class="w-4 h-4 text-neutral-500" />
                <span class="hidden sm:inline">Archiv ({archiveCount})</span>
                <span class="sm:hidden">({archiveCount})</span>
            </button>

            <!-- Drucken -->
            <button 
                type="button" 
                onclick={onPrint} 
                disabled={reportsCount === 0} 
                class="h-11 min-h-[44px] px-3 bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 hover:bg-neutral-50 dark:hover:bg-slate-800 text-neutral-700 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer disabled:opacity-50" 
                title="Druckansicht öffnen"
            >
                <Printer class="w-4 h-4 text-neutral-500" />
                <span class="hidden sm:inline">Drucken</span>
            </button>

            <!-- PDF Download / Vorschau -->
            <button 
                type="button" 
                onclick={onDownloadPdf} 
                disabled={isLoading || isGenerating || isCalculating || reportsCount === 0} 
                class="h-11 min-h-[44px] px-3.5 bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 hover:bg-neutral-50 dark:hover:bg-slate-800 text-neutral-700 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer disabled:opacity-50"
                title="Betriebsprüfungssicheres PDF anzeigen"
            >
                {#if isGenerating}
                    <Loader2 class="w-4 h-4 animate-spin text-indigo-600" />
                    <span class="hidden sm:inline">Erstelle PDF...</span>
                {:else if savedRecordPdfUrl}
                    <FileCheck class="w-4 h-4 text-emerald-600" />
                    <span>Archiv-PDF</span>
                {:else}
                    <FileText class="w-4 h-4 text-indigo-600" />
                    <span>PDF-Export</span>
                {/if}
            </button>

            <!-- Haupt-Aktions-Button: Ein-Klick Aktualisierung / Berechnung -->
            <button 
                type="button"
                onclick={onGenerate} 
                disabled={isCalculating || isLoading} 
                class="h-11 min-h-[44px] px-4 sm:px-5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-xs cursor-pointer disabled:opacity-50"
                title="VMA & Reisekosten berechnen und in PocketBase sichern"
            >
                {#if isCalculating}
                    <Loader2 class="w-4 h-4 animate-spin" />
                    <span>Berechne...</span>
                {:else if savedRecordId}
                    <RefreshCw class="w-4 h-4" />
                    <span>Neu berechnen</span>
                {:else}
                    <Sparkles class="w-4 h-4 text-amber-300" />
                    <span>VMA generieren</span>
                {/if}
            </button>
        </div>
    </div>
</div>
