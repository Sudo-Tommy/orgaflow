<script lang="ts">
    import type { BudgetStatusFilter, BudgetEntry, Contract, BudgetTotals } from '$lib/types/budget';
    import { BUDGET_CATEGORIES } from '$lib/types/budget';
    import {
        Search,
        X,
        Clock,
        CheckCircle2,
        Repeat,
        FileCheck,
        Layers,
        AlertTriangle
    } from 'lucide-svelte';

    let {
        statusFilter,
        categoryFilter,
        searchQuery,
        totals,
        entries,
        contracts,
        onStatusFilter,
        onCategoryFilter,
        onSearchQuery
    } = $props<{
        statusFilter: BudgetStatusFilter;
        categoryFilter: string;
        searchQuery: string;
        totals: BudgetTotals;
        entries: BudgetEntry[];
        contracts: Contract[];
        onStatusFilter: (f: BudgetStatusFilter) => void;
        onCategoryFilter: (c: string) => void;
        onSearchQuery: (q: string) => void;
    }>();
</script>

<div class="space-y-2.5 sm:space-y-3">
    <!-- Suchfeld & Kategorie-Auswahl -->
    <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
        <!-- Suchfeld -->
        <div class="relative flex-1">
            <Search class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
                type="text"
                value={searchQuery}
                oninput={(e) => onSearchQuery((e.target as HTMLInputElement).value)}
                placeholder="Suchen nach Kunde, Empfänger, Rechnungs-Nr., Zweck..."
                class="w-full min-h-[42px] sm:min-h-[44px] rounded-xl border border-slate-300 bg-white pl-10 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 shadow-2xs"
            />
            {#if searchQuery}
                <button
                    type="button"
                    onclick={() => onSearchQuery('')}
                    class="absolute right-2 top-1/2 -translate-y-1/2 min-h-[34px] min-w-[34px] flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    title="Suche zurücksetzen"
                >
                    <X class="h-4 w-4" />
                </button>
            {/if}
        </div>

        <!-- Kategorie-Filter Dropdown -->
        <div class="w-full sm:w-60 shrink-0">
            <select
                value={categoryFilter}
                onchange={(e) => onCategoryFilter((e.target as HTMLSelectElement).value)}
                aria-label="Kategorie filtern"
                class="w-full min-h-[42px] sm:min-h-[44px] rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 cursor-pointer shadow-2xs"
            >
                <option value="all">Alle Kategorien</option>
                {#each BUDGET_CATEGORIES as cat}
                    <option value={cat.name}>{cat.name}</option>
                {/each}
            </select>
        </div>
    </div>

    <!-- STATUS-CHIPS (Horizontales Wischen ohne sichtbare Scrollbar, daumenergonomisch) -->
    <div class="flex items-center gap-1.5 overflow-x-auto py-1 px-1 -mx-1 scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden touch-pan-x">
        <span class="shrink-0 text-xs font-bold text-slate-400 dark:text-slate-500 pr-1">Filter:</span>

        <!-- Filter 1: Alle -->
        <button
            type="button"
            onclick={() => onStatusFilter('all')}
            class="inline-flex min-h-[38px] sm:min-h-[40px] shrink-0 items-center rounded-xl px-3 sm:px-3.5 py-1 text-xs sm:text-sm font-semibold transition-all cursor-pointer {statusFilter === 'all'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'}"
        >
            Alle ({entries.length})
        </button>

        <!-- Filter 2: Nur Offene -->
        <button
            type="button"
            onclick={() => onStatusFilter('open')}
            class="inline-flex min-h-[38px] sm:min-h-[40px] shrink-0 items-center gap-1.5 rounded-xl px-3 sm:px-3.5 py-1 text-xs sm:text-sm font-semibold transition-all cursor-pointer {statusFilter === 'open'
                ? 'bg-amber-600 text-white shadow-2xs'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-900/60'}"
        >
            <Clock class="h-3.5 sm:h-4 w-3.5 sm:w-4" />
            <span>Nur Offene</span>
        </button>

        <!-- Filter 3: Bereits Bezahlt -->
        <button
            type="button"
            onclick={() => onStatusFilter('paid')}
            class="inline-flex min-h-[38px] sm:min-h-[40px] shrink-0 items-center gap-1.5 rounded-xl px-3 sm:px-3.5 py-1 text-xs sm:text-sm font-semibold transition-all cursor-pointer {statusFilter === 'paid'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/60'}"
        >
            <CheckCircle2 class="h-3.5 sm:h-4 w-3.5 sm:w-4" />
            <span>Bereits Bezahlt</span>
        </button>

        <!-- Filter 4: Verträge -->
        <button
            type="button"
            onclick={() => onStatusFilter('contracts')}
            class="inline-flex min-h-[38px] sm:min-h-[40px] shrink-0 items-center gap-1.5 rounded-xl px-3 sm:px-3.5 py-1 text-xs sm:text-sm font-semibold transition-all cursor-pointer {statusFilter === 'contracts'
                ? 'bg-purple-600 text-white shadow-2xs'
                : 'bg-purple-50 text-purple-800 hover:bg-purple-100 dark:bg-purple-950/40 dark:text-purple-300 dark:hover:bg-purple-900/60'}"
        >
            <Repeat class="h-3.5 sm:h-4 w-3.5 sm:w-4" />
            <span>Verträge ({contracts.length})</span>
        </button>

        <!-- Filter 5: Kundenrechnungen -->
        <button
            type="button"
            onclick={() => onStatusFilter('invoices')}
            class="inline-flex min-h-[38px] sm:min-h-[40px] shrink-0 items-center gap-1.5 rounded-xl px-3 sm:px-3.5 py-1 text-xs sm:text-sm font-semibold transition-all cursor-pointer {statusFilter === 'invoices'
                ? 'bg-teal-600 text-white shadow-2xs'
                : 'bg-teal-50 text-teal-800 hover:bg-teal-100 dark:bg-teal-950/40 dark:text-teal-300 dark:hover:bg-teal-900/60'}"
        >
            <FileCheck class="h-3.5 sm:h-4 w-3.5 sm:w-4" />
            <span>Rechnungen ({totals.invoicesCount})</span>
        </button>

        <!-- Filter 6: Ratenzahlungen -->
        <button
            type="button"
            onclick={() => onStatusFilter('installments')}
            class="inline-flex min-h-[38px] sm:min-h-[40px] shrink-0 items-center gap-1.5 rounded-xl px-3 sm:px-3.5 py-1 text-xs sm:text-sm font-semibold transition-all cursor-pointer {statusFilter === 'installments'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-900/60'}"
        >
            <Layers class="h-3.5 sm:h-4 w-3.5 sm:w-4" />
            <span>Raten ({totals.installmentsCount})</span>
        </button>

        <!-- Filter 7: Überfällige Rückstände aus Vormonaten -->
        {#if totals.arrearsCount > 0}
            <button
                type="button"
                onclick={() => onStatusFilter('arrears')}
                class="inline-flex min-h-[38px] sm:min-h-[40px] shrink-0 items-center gap-1.5 rounded-xl px-3 sm:px-3.5 py-1 text-xs sm:text-sm font-bold transition-all cursor-pointer {statusFilter === 'arrears'
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'bg-rose-50 text-rose-800 border border-rose-300 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'}"
                title="Zeigt {totals.arrearsCount} unbezahlte Ausgaben / Raten aus vorherigen Monaten"
            >
                <AlertTriangle class="h-3.5 sm:h-4 w-3.5 sm:w-4 animate-pulse text-rose-600 dark:text-rose-400" />
                <span>⚠️ Rückstände ({totals.arrearsCount})</span>
            </button>
        {/if}
    </div>
</div>
