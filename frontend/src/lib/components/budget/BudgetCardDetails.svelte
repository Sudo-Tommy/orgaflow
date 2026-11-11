<script lang="ts">
    import type { BudgetEntry } from '$lib/types/budget';
    import { formatDate, getDueDateInfo } from '$lib/types/budget';
    import {
        CheckCircle2,
        Clock,
        CalendarClock,
        FileText,
        Building2,
        Banknote,
        Wallet,
        CreditCard
    } from 'lucide-svelte';

    let {
        entry,
        isArrear = false,
        dueDateInfo,
        paymentMethodMeta
    } = $props<{
        entry: BudgetEntry;
        isArrear?: boolean;
        dueDateInfo: ReturnType<typeof getDueDateInfo>;
        paymentMethodMeta: {
            label: string;
            icon: string;
        };
    }>();
</script>

<!-- BADGES LEISTE: Status-Badge (Sofort erkennbar) -->
<div class="flex flex-wrap items-center gap-2 pt-0.5">
    {#if entry.payment_status === 'paid'}
        <div
            class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
            title={`Bezahlt am ${formatDate(entry.paid_at || entry.invoice_date)}`}
        >
            <span class="h-2 w-2 rounded-full bg-emerald-500"></span>
            <CheckCircle2 class="h-3.5 w-3.5" />
            <span>Bezahlt am {formatDate(entry.paid_at || entry.invoice_date)}</span>
        </div>
    {:else if entry.payment_status === 'open'}
        <div
            class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold {isArrear || dueDateInfo.isOverdue
                ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800'
                : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'}"
            title={dueDateInfo.label}
        >
            <span
                class="h-2 w-2 rounded-full {isArrear || dueDateInfo.isOverdue ? 'bg-red-500 animate-pulse' : 'bg-amber-500'}"
            ></span>
            <Clock class="h-3.5 w-3.5" />
            <span>
                {#if isArrear}
                    Rückstand ({formatDate(entry.invoice_date || entry.due_date)})
                {:else if entry.due_date}
                    Fällig am {formatDate(entry.due_date)}
                {:else}
                    Fällig (Ohne Frist)
                {/if}
            </span>
        </div>
    {:else}
        <div
            class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800"
        >
            <span class="h-2 w-2 rounded-full bg-sky-500"></span>
            <CalendarClock class="h-3.5 w-3.5" />
            <span>Vorgemerkt</span>
        </div>
    {/if}

    <!-- Zusätzlicher Steuer-Badge falls vorhanden -->
    {#if entry.tax_rate && entry.tax_rate !== '0'}
        <span class="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {entry.tax_rate}% MwSt
        </span>
    {/if}
</div>

<!-- RECHNUNGS- & TRANSAKTIONSDATEN (Kompakte Meta-Leiste) -->
<div
    class="grid grid-cols-1 gap-2 rounded-xl bg-slate-50/80 p-2.5 text-xs text-slate-600 sm:grid-cols-3 dark:bg-slate-800/60 dark:text-slate-300"
>
    <!-- Rechnungsnummer -->
    <div class="flex items-center gap-1.5 min-w-0">
        <FileText class="h-3.5 w-3.5 shrink-0 text-slate-500 dark:text-slate-400" />
        <span class="truncate">
            {#if entry.invoice_number}
                <strong class="font-medium text-slate-800 dark:text-slate-200">Rechnung #{entry.invoice_number}</strong>
            {:else}
                <span class="text-slate-500 dark:text-slate-400">Ohne Beleg</span>
            {/if}
        </span>
    </div>

    <!-- Ausstellungsdatum -->
    <div class="flex items-center gap-1.5 min-w-0">
        <span class="shrink-0 font-medium text-slate-800 dark:text-slate-200">Datum:</span>
        <span class="truncate text-slate-600 dark:text-slate-400">
            {formatDate(entry.invoice_date || entry.created)}
        </span>
    </div>

    <!-- Zahlungsart -->
    <div class="flex items-center gap-1.5 min-w-0">
        {#if entry.payment_method === 'bank_transfer'}
            <Building2 class="h-3.5 w-3.5 shrink-0 text-slate-500 dark:text-slate-400" />
        {:else if entry.payment_method === 'cash'}
            <Banknote class="h-3.5 w-3.5 shrink-0 text-slate-500 dark:text-slate-400" />
        {:else if entry.payment_method === 'paypal'}
            <Wallet class="h-3.5 w-3.5 shrink-0 text-slate-500 dark:text-slate-400" />
        {:else}
            <CreditCard class="h-3.5 w-3.5 shrink-0 text-slate-500 dark:text-slate-400" />
        {/if}
        <span class="truncate font-medium text-slate-700 dark:text-slate-300">
            {paymentMethodMeta.label}
        </span>
    </div>
</div>
