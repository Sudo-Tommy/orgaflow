<script lang="ts">
    import type { BudgetEntry } from '$lib/types/budget';
    import { formatCurrency } from '$lib/types/budget';
    import {
        Tag,
        FileCheck,
        Layers,
        Repeat,
        ArrowUpRight,
        ArrowDownLeft
    } from 'lucide-svelte';

    let {
        entry,
        categoryMeta
    } = $props<{
        entry: BudgetEntry;
        categoryMeta: {
            name: string;
            icon: string;
            color: string;
        };
    }>();
</script>

<div class="flex items-start justify-between gap-3">
    <div class="min-w-0 flex-1">
        <!-- Empfänger / Zahler (fett hervorgehoben) & Kategorie-Badge mit Icon -->
        <div class="flex flex-wrap items-center gap-2">
            <h3 class="truncate text-base font-bold text-slate-900 sm:text-lg dark:text-slate-100" title={entry.recipient_or_payer}>
                {entry.recipient_or_payer || 'Unbekannter Partner'}
            </h3>

            <!-- Kategorie-Badge mit Icon direkt im Kopfbereich -->
            <div
                class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium {categoryMeta.color}"
            >
                <Tag class="h-3 w-3" />
                <span>{categoryMeta.name}</span>
            </div>

            <!-- Automatische Kundenrechnung Badge -->
            {#if entry.is_invoice || entry.source === 'accounting'}
                <span
                    class="inline-flex items-center gap-1 rounded-md bg-teal-50 px-2 py-0.5 text-xs font-semibold text-teal-700 border border-teal-200 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-800"
                    title="Automatisch synchronisierte Kundenrechnung"
                >
                    <FileCheck class="h-3 w-3" />
                    Rechnungseingang
                </span>
            {/if}

            <!-- Ratenzahlung Badge -->
            {#if entry.is_installment}
                <span
                    class="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 border border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800"
                    title="Ratenkauf / Ratenzahlung"
                >
                    <Layers class="h-3 w-3" />
                    Ratenzahlung
                </span>
            {/if}

            <!-- Vertrag Badge -->
            {#if entry.contract_id}
                <span
                    class="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-0.5 text-xs font-semibold text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800"
                    title="Buchung resultiert aus laufendem Vertrag"
                >
                    <Repeat class="h-3 w-3" />
                    Vertrag
                </span>
            {/if}
        </div>

        <!-- Titel / Verwendungszweck -->
        <p class="mt-1 truncate text-sm font-medium text-slate-600 dark:text-slate-400" title={entry.title}>
            {entry.title}
        </p>
        {#if entry.description && entry.description !== entry.title}
            <p class="mt-0.5 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                {entry.description}
            </p>
        {/if}
    </div>

    <!-- Betrag & Buchungstyp (Groß farblich hervorgehoben: + Grün / − Rot) -->
    <div class="flex flex-col items-end text-right shrink-0">
        <div
            class="flex items-center gap-1 text-lg font-bold tracking-tight sm:text-xl tabular-nums {entry.type === 'income'
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'}"
        >
            {#if entry.type === 'income'}
                <ArrowUpRight class="h-5 w-5 stroke-[2.5]" />
                <span>+{formatCurrency(entry.amount)}</span>
            {:else}
                <ArrowDownLeft class="h-5 w-5 stroke-[2.5]" />
                <span>−{formatCurrency(entry.amount)}</span>
            {/if}
        </div>
        <span class="text-xs font-medium text-slate-500 dark:text-slate-400">
            {#if entry.is_invoice || entry.source === 'accounting'}
                Rechnung
            {:else if entry.type === 'income'}
                Einnahme
            {:else if entry.is_installment}
                Monatsrate
            {:else}
                Ausgabe
            {/if}
        </span>
    </div>
</div>
