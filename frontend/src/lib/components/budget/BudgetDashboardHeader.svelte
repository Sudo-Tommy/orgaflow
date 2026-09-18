<script lang="ts">
    import type { BudgetTotals } from '$lib/types/budget';
    import { formatCurrency } from '$lib/types/budget';
    import {
        TrendingUp,
        TrendingDown,
        Clock,
        AlertTriangle,
        RefreshCw,
        Repeat,
        Plus,
        FileCheck,
        Layers
    } from 'lucide-svelte';

    let {
        totals,
        periodLabel,
        isLoading,
        isSyncingInvoices,
        onSyncInvoices,
        onNewContract,
        onNewEntry,
        onFilterArrears
    } = $props<{
        totals: BudgetTotals;
        periodLabel: string;
        isLoading: boolean;
        isSyncingInvoices: boolean;
        onSyncInvoices: () => void;
        onNewContract: () => void;
        onNewEntry: () => void;
        onFilterArrears: () => void;
    }>();
</script>

<header class="w-full space-y-3 pb-3 border-b border-slate-200/80 dark:border-slate-800">
    <div class="w-full space-y-3">
        <!-- Titel- & Aktionsleiste -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
                <h1 class="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span>Haushaltsbuch & Finanzen</span>
                    {#if isLoading}
                        <span class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent"></span>
                    {/if}
                </h1>
                <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                    Zahlungsströme im Zeitraum: <strong class="font-bold text-indigo-600 dark:text-indigo-400">{periodLabel}</strong>
                </p>
            </div>

            <!-- Haupt-Aktionsbuttons (Mobil daumenergonomisch & umbruchsicher) -->
            <div class="grid grid-cols-3 sm:flex sm:flex-wrap items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
                <!-- Button: Rechnungen abgleichen / synchronisieren -->
                <button
                    type="button"
                    onclick={onSyncInvoices}
                    disabled={isSyncingInvoices || isLoading}
                    class="inline-flex min-h-[42px] sm:min-h-[44px] items-center justify-center gap-1 sm:gap-2 rounded-xl border border-teal-200 bg-teal-50/80 px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-semibold text-teal-800 shadow-2xs hover:bg-teal-100 active:scale-95 transition-all dark:border-teal-800 dark:bg-teal-950/40 dark:text-teal-300 dark:hover:bg-teal-900/60 disabled:opacity-60 cursor-pointer"
                    title="Alle Kundenrechnungen automatisch als Einnahmen abgleichen"
                >
                    <RefreshCw class="h-3.5 sm:h-4 w-3.5 sm:w-4 text-teal-600 dark:text-teal-400 shrink-0 {isSyncingInvoices ? 'animate-spin' : ''}" />
                    <span class="truncate"><span class="hidden md:inline">Rechnungen </span>Sync</span>
                </button>

                <!-- Button: Neuer Vertrag -->
                <button
                    type="button"
                    onclick={onNewContract}
                    class="inline-flex min-h-[42px] sm:min-h-[44px] items-center justify-center gap-1 sm:gap-2 rounded-xl border border-slate-300 bg-white px-2 sm:px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 active:scale-95 transition-all dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                    title="Neuen laufenden Vertrag oder Fixkosten anlegen"
                >
                    <Repeat class="h-3.5 sm:h-4 w-3.5 sm:w-4 text-purple-600 dark:text-purple-400 shrink-0" />
                    <span class="truncate"><span class="hidden md:inline">Neuer </span>Vertrag</span>
                </button>

                <!-- Button: Neue Buchung -->
                <button
                    type="button"
                    onclick={onNewEntry}
                    class="inline-flex min-h-[42px] sm:min-h-[44px] items-center justify-center gap-1 sm:gap-2 rounded-xl bg-indigo-600 px-2.5 sm:px-4 py-1.5 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-indigo-700 active:scale-95 transition-all dark:bg-indigo-600 dark:hover:bg-indigo-500 cursor-pointer"
                    title="Neue Einnahme, Ausgabe oder Ratenzahlung erfassen"
                >
                    <Plus class="h-4 w-4 shrink-0" />
                    <span class="truncate"><span class="hidden md:inline">Neue </span>Buchung</span>
                </button>
            </div>
        </div>

        <!-- KPI-Cards: Auf Mobilgeräten sauber gestapelt / ab Tablet 3 Spalten (verhindert Textkollisionen) -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-2.5 sm:gap-3.5">
            <!-- 1. Einnahmen -->
            <div class="flex flex-col justify-between rounded-2xl border border-emerald-200 bg-emerald-50/80 p-3.5 sm:p-4 shadow-2xs dark:border-emerald-900/50 dark:bg-emerald-950/35">
                <div class="flex items-center justify-between gap-2">
                    <div class="min-w-0">
                        <span class="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                            Einnahmen ({periodLabel})
                        </span>
                        <div class="text-xl sm:text-2xl font-black tabular-nums tracking-tight text-emerald-700 dark:text-emerald-400 mt-0.5">
                            +{formatCurrency(totals.totalIncome)}
                        </div>
                    </div>
                    <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300 shadow-2xs">
                        <TrendingUp class="h-5 w-5 stroke-[2.5]" />
                    </div>
                </div>
                <!-- Transparente Rechnungs-Info -->
                <div class="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-emerald-200/70 pt-2 text-[11px] font-medium text-emerald-900 dark:border-emerald-900/50 dark:text-emerald-200">
                    <span class="inline-flex items-center gap-1 truncate">
                        <FileCheck class="h-3.5 w-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                        Rechnungen: <strong class="font-bold tabular-nums">+{formatCurrency(totals.invoiceIncome)}</strong>
                    </span>
                    {#if totals.personalIncome > 0}
                        <span class="inline-flex items-center gap-1 truncate">
                            • Sonstige: <strong class="font-bold tabular-nums">+{formatCurrency(totals.personalIncome)}</strong>
                        </span>
                    {/if}
                </div>
            </div>

            <!-- 2. Ausgaben gesamt -->
            <div class="flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5 sm:p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-800/60">
                <div class="flex items-center justify-between gap-2">
                    <div class="min-w-0">
                        <span class="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                            Ausgaben gesamt ({periodLabel})
                        </span>
                        <div class="text-xl sm:text-2xl font-black tabular-nums tracking-tight text-slate-900 dark:text-slate-100 mt-0.5">
                            −{formatCurrency(totals.totalExpense)}
                        </div>
                    </div>
                    <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300 shadow-2xs">
                        <TrendingDown class="h-5 w-5 stroke-[2.5]" />
                    </div>
                </div>
                <!-- Saldo- & Sparquoten-Info -->
                <div class="mt-2.5 flex items-center justify-between gap-1 border-t border-slate-200 pt-2 text-[11px] text-slate-600 dark:border-slate-700 dark:text-slate-400">
                    <span class="truncate">Saldo ({totals.totalIncome > 0 ? `${Math.round((totals.balance / totals.totalIncome) * 100)}% Sparquote` : 'Cashflow'}):</span>
                    <strong class="font-bold tabular-nums shrink-0 {totals.balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}">
                        {totals.balance >= 0 ? '+' : ''}{formatCurrency(totals.balance)}
                    </strong>
                </div>
            </div>

            <!-- 3. Noch offen / Verbindlichkeiten -->
            <div class="flex flex-col justify-between rounded-2xl border {totals.arrearsPayables > 0 ? 'border-rose-400 bg-rose-50/90 dark:border-rose-900/80 dark:bg-rose-950/40 shadow-xs' : 'border-amber-300 bg-amber-50/80 dark:border-amber-900/60 dark:bg-amber-950/35 shadow-2xs'} p-3.5 sm:p-4">
                <div class="flex items-center justify-between gap-2">
                    <div class="min-w-0">
                        <span class="text-[11px] sm:text-xs font-bold uppercase tracking-wider {totals.arrearsPayables > 0 ? 'text-rose-800 dark:text-rose-300' : 'text-amber-800 dark:text-amber-300'}">
                            Noch offen ({periodLabel})
                        </span>
                        <div class="text-xl sm:text-2xl font-black tabular-nums tracking-tight {totals.arrearsPayables > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'} mt-0.5">
                            {formatCurrency(totals.totalOpen)}
                        </div>
                    </div>
                    <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl {totals.arrearsPayables > 0 ? 'bg-rose-500/20 text-rose-600 dark:bg-rose-500/25 dark:text-rose-400' : 'bg-amber-500/20 text-amber-600 dark:bg-amber-500/25 dark:text-amber-400'} shadow-2xs">
                        {#if totals.arrearsPayables > 0}
                            <AlertTriangle class="h-5 w-5 stroke-[2.5] animate-pulse" />
                        {:else}
                            <Clock class="h-5 w-5 stroke-[2.5]" />
                        {/if}
                    </div>
                </div>
                <!-- Hinweis & Differenzierung: Verbindlichkeiten vs Forderungen & RÜCKSTAND -->
                <div class="mt-2.5 space-y-1 border-t {totals.arrearsPayables > 0 ? 'border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-300' : 'border-amber-200/80 dark:border-amber-900/50 text-amber-800 dark:text-amber-300'} pt-2 text-[11px]">
                    <div class="flex flex-wrap items-center justify-between gap-1">
                        <span class="truncate">Verbindlichkeiten: <strong>{formatCurrency(totals.openPayables)}</strong></span>
                        {#if totals.openReceivables > 0}
                            <span class="text-emerald-700 dark:text-emerald-300 shrink-0">
                                • Forderungen: <strong>+{formatCurrency(totals.openReceivables)}</strong>
                            </span>
                        {/if}
                    </div>
                    {#if totals.arrearsPayables > 0}
                        <div class="flex flex-wrap items-center justify-between gap-1 font-bold text-rose-700 dark:text-rose-300">
                            <span class="flex items-center gap-1 truncate">
                                <AlertTriangle class="h-3.5 w-3.5 text-rose-600 animate-pulse shrink-0" />
                                <span>+{formatCurrency(totals.arrearsPayables)} Rückstand ({totals.arrearsCount})</span>
                            </span>
                            <button
                                type="button"
                                onclick={onFilterArrears}
                                class="text-[10px] underline hover:text-rose-950 dark:hover:text-rose-100 cursor-pointer ml-auto"
                                title="Zeigt alle unbezahlten Posten aus den Vormonaten an"
                            >
                                Rückstände filtern
                            </button>
                        </div>
                    {/if}
                </div>
            </div>
        </div>

        <!-- Zusammenfassende Info-Leiste für Verträge & Ratenverbindlichkeiten -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 rounded-2xl bg-slate-100/90 p-3 text-xs text-slate-700 dark:bg-slate-800/80 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 shadow-2xs">
            <!-- Verträge Info -->
            <div class="flex flex-wrap items-center justify-between gap-2 sm:border-r sm:border-slate-200 dark:sm:border-slate-700 sm:pr-3">
                <div class="flex items-center gap-1.5 min-w-0">
                    <Repeat class="h-4 w-4 text-purple-600 dark:text-purple-400 shrink-0" />
                    <span class="font-medium">Fixkosten:</span>
                    <strong class="font-bold text-slate-900 dark:text-slate-100 tabular-nums truncate">
                        {formatCurrency(totals.fixedCostsMonthly)} / Mon.
                    </strong>
                </div>
                <div class="flex items-center gap-1.5 shrink-0">
                    <span class="h-2 w-2 rounded-full {totals.openFixedCostsMonthly > 0 ? 'bg-amber-500' : 'bg-emerald-500'}"></span>
                    <span class="text-[11px]">Offen:</span>
                    <strong class="font-bold tabular-nums {totals.openFixedCostsMonthly > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}">
                        {formatCurrency(totals.openFixedCostsMonthly)}
                    </strong>
                </div>
            </div>

            <!-- Ratenzahlungen Info -->
            <div class="flex flex-wrap items-center justify-between gap-2 sm:pl-1">
                <div class="flex items-center gap-1.5 min-w-0">
                    <Layers class="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span class="font-medium">Ratenkäufe:</span>
                    <strong class="font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                        {totals.installmentsCount} {totals.installmentsCount === 1 ? 'Plan' : 'Pläne'}
                    </strong>
                </div>
                <div class="flex items-center gap-1.5 shrink-0">
                    <span class="text-[11px]">Restschuld:</span>
                    <strong class="font-bold text-indigo-700 dark:text-indigo-300 tabular-nums">
                        {formatCurrency(totals.openInstallmentsTotal)}
                    </strong>
                </div>
            </div>
        </div>
    </div>
</header>
