<script lang="ts">
    import type { BudgetEntry } from '$lib/types/budget';
    import {
        getDueDateInfo,
        getInstallmentProgress,
        PAYMENT_METHOD_METADATA,
        BUDGET_CATEGORIES
    } from '$lib/types/budget';
    import BudgetCardArrearBanner from './BudgetCardArrearBanner.svelte';
    import BudgetCardHeader from './BudgetCardHeader.svelte';
    import BudgetCardInstallmentProgress from './BudgetCardInstallmentProgress.svelte';
    import BudgetCardDetails from './BudgetCardDetails.svelte';
    import BudgetCardActions from './BudgetCardActions.svelte';

    let {
        entry,
        isArrear = false,
        onToggleStatus,
        onEdit,
        onDelete,
        onViewReceipt,
        onBookNextInstallment,
        onPayArrearNow,
        onViewInstallmentPlan
    } = $props<{
        entry: BudgetEntry;
        isArrear?: boolean;
        onToggleStatus?: (entry: BudgetEntry, newStatus: 'paid' | 'open') => void;
        onEdit?: (entry: BudgetEntry) => void;
        onDelete?: (entry: BudgetEntry) => void;
        onViewReceipt?: (entry: BudgetEntry) => void;
        onBookNextInstallment?: (entry: BudgetEntry) => void;
        onPayArrearNow?: (entry: BudgetEntry) => void;
        onViewInstallmentPlan?: (entry: BudgetEntry) => void;
    }>();

    // Ermittlung der Kategorie-Metadaten
    let categoryMeta = $derived(
        BUDGET_CATEGORIES.find((c) => c.name.toLowerCase() === (entry.category || '').toLowerCase()) || {
            name: entry.category || 'Sonstiges',
            icon: 'Tag',
            color: 'text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
        }
    );

    // Fälligkeits-Informationen
    let dueDateInfo = $derived(getDueDateInfo(entry.due_date));

    // Zahlungsart-Metadaten mit sicherer Typ-Indexierung
    let paymentMethodMeta = $derived(
        PAYMENT_METHOD_METADATA[entry.payment_method as keyof typeof PAYMENT_METHOD_METADATA] || { label: 'Unbekannt', icon: 'CreditCard' }
    );

    // Ratenzahlungs-Fortschritt & Details
    let installmentInfo = $derived(entry.is_installment ? getInstallmentProgress(entry) : null);
</script>

<div
    class="group relative flex flex-col justify-between overflow-hidden rounded-2xl border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md {isArrear
        ? 'border-amber-400/90 bg-amber-50/40 dark:border-amber-600/70 dark:bg-amber-950/20 shadow-xs'
        : 'border-slate-200/90 bg-white dark:border-slate-800 dark:bg-slate-900/95 shadow-xs hover:border-slate-300 dark:hover:border-slate-700'} p-4 sm:p-5"
>
    <!-- Linker Akzentstreifen zur schnellen optischen Unterscheidung -->
    <div
        class="absolute left-0 top-0 bottom-0 w-1.5 transition-colors {isArrear
            ? 'bg-gradient-to-b from-amber-500 to-rose-600'
            : entry.is_invoice || entry.source === 'accounting'
            ? 'bg-gradient-to-b from-teal-500 to-emerald-600'
            : entry.is_installment
            ? 'bg-gradient-to-b from-indigo-500 to-purple-600'
            : entry.type === 'income'
            ? 'bg-emerald-500'
            : 'bg-rose-500'}"
    ></div>

    <!-- SPEZIELLER RÜCKSTANDS-BANNER (Wenn Buchung aus Vormonat unbezahlt ist) -->
    {#if isArrear}
        <BudgetCardArrearBanner {entry} {onPayArrearNow} />
    {/if}

    <!-- OBERER BEREICH: Empfänger/Zahler, Betrag & Kategorie -->
    <div class="space-y-3 pl-1.5">
        <BudgetCardHeader {entry} {categoryMeta} />

        <!-- RATENZAHLUNG FORTSCHRITTS-WIDGET (falls aktiv) -->
        {#if installmentInfo}
            <BudgetCardInstallmentProgress
                {entry}
                {installmentInfo}
                {isArrear}
                isOverdue={dueDateInfo.isOverdue}
                {onViewInstallmentPlan}
            />
        {/if}

        <!-- BADGES LEISTE & META-DATEN -->
        <BudgetCardDetails
            {entry}
            {isArrear}
            {dueDateInfo}
            {paymentMethodMeta}
        />
    </div>

    <!-- UNTERER BEREICH / DAUMENZONE: Schnellaktionen per 1-Tap -->
    <BudgetCardActions
        {entry}
        {isArrear}
        {installmentInfo}
        {onToggleStatus}
        {onPayArrearNow}
        {onBookNextInstallment}
        {onViewReceipt}
        {onEdit}
        {onDelete}
    />
</div>
