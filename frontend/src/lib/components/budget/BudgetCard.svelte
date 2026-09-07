<script lang="ts">
    import type { BudgetEntry } from '$lib/types/budget';
    import {
        formatCurrency,
        formatDate,
        getDueDateInfo,
        getInstallmentProgress,
        PAYMENT_STATUS_METADATA,
        PAYMENT_METHOD_METADATA,
        BUDGET_CATEGORIES
    } from '$lib/types/budget';
    import {
        CheckCircle2,
        Clock,
        CalendarClock,
        FileText,
        ExternalLink,
        Pencil,
        Trash2,
        Building2,
        CreditCard,
        Banknote,
        Wallet,
        Tag,
        ArrowUpRight,
        ArrowDownLeft,
        Repeat,
        RotateCcw,
        Layers,
        PlusCircle,
        Percent,
        Check,
        FileCheck,
        Sparkles,
        AlertTriangle,
        Zap,
        ListTree
    } from 'lucide-svelte';

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

    // Zahlungsstatus-Metadaten mit sicherer Typ-Indexierung
    let statusMeta = $derived(
        PAYMENT_STATUS_METADATA[entry.payment_status as keyof typeof PAYMENT_STATUS_METADATA] || PAYMENT_STATUS_METADATA.open
    );

    // Fälligkeits-Informationen
    let dueDateInfo = $derived(getDueDateInfo(entry.due_date));

    // Zahlungsart-Metadaten mit sicherer Typ-Indexierung
    let paymentMethodMeta = $derived(
        PAYMENT_METHOD_METADATA[entry.payment_method as keyof typeof PAYMENT_METHOD_METADATA] || { label: 'Unbekannt', icon: 'CreditCard' }
    );

    // Ratenzahlungs-Fortschritt & Details
    let installmentInfo = $derived(entry.is_installment ? getInstallmentProgress(entry) : null);

    // Schnelle 1-Tap Aktion für Bezahlstatus
    function handleToggleStatusClick() {
        if (!onToggleStatus) return;
        if (entry.payment_status === 'paid') {
            onToggleStatus(entry, 'open');
        } else {
            onToggleStatus(entry, 'paid');
        }
    }
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
        <div class="mb-3 -mt-1 flex items-center justify-between rounded-xl bg-amber-100/90 px-3 py-1.5 text-xs font-bold text-amber-900 dark:bg-amber-900/60 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
            <div class="flex items-center gap-1.5">
                <AlertTriangle class="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 animate-pulse" />
                <span>
                    {#if entry.is_installment}
                        ⚠️ Rückstand: Monatsrate nicht überwiesen ({formatDate(entry.invoice_date || entry.due_date)})
                    {:else}
                        ⚠️ Zahlungsrückstand aus Vormonat
                    {/if}
                </span>
            </div>
            {#if onPayArrearNow}
                <button
                    type="button"
                    onclick={() => onPayArrearNow(entry)}
                    class="inline-flex items-center gap-1 rounded-lg bg-amber-600 px-2 py-0.5 text-[11px] font-bold text-white hover:bg-amber-700 active:scale-95 transition-all shadow-xs cursor-pointer"
                    title="Bucht die Überweisung mit heutigem Datum als bezahlt"
                >
                    <Zap class="h-3 w-3" />
                    <span>Jetzt nachholen</span>
                </button>
            {/if}
        </div>
    {/if}

    <!-- OBERER BEREICH: Empfänger/Zahler, Betrag & Kategorie -->
    <div class="space-y-3 pl-1.5">
        <div class="flex items-start justify-between gap-3">
            <div class="min-w-0 flex-1">
                <!-- Empfänger / Zahler (fett hervorgehoben) -->
                <div class="flex flex-wrap items-center gap-2">
                    <h3 class="truncate text-base font-bold text-slate-900 sm:text-lg dark:text-slate-100" title={entry.recipient_or_payer}>
                        {entry.recipient_or_payer || 'Unbekannter Partner'}
                    </h3>

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
                <p class="mt-0.5 truncate text-sm font-medium text-slate-600 dark:text-slate-400" title={entry.title}>
                    {entry.title}
                </p>
                {#if entry.description && entry.description !== entry.title}
                    <p class="mt-0.5 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                        {entry.description}
                    </p>
                {/if}
            </div>

            <!-- Betrag & Buchungstyp (Eindeutig farblich kodiert) -->
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

        <!-- RATENZAHLUNG FORTSCHRITTS-WIDGET (falls aktiv) -->
        {#if installmentInfo}
            <div class="rounded-xl border {isArrear || (entry.payment_status === 'open' && dueDateInfo.isOverdue) ? 'border-amber-300 bg-amber-50/70 dark:border-amber-800 dark:bg-amber-950/40' : 'border-indigo-100 bg-indigo-50/50 dark:border-indigo-900/50 dark:bg-indigo-950/30'} p-2.5">
                <div class="flex items-center justify-between text-xs font-semibold text-indigo-900 dark:text-indigo-200">
                    <div class="flex items-center gap-1.5">
                        <Layers class="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                        <span>{installmentInfo.label}</span>
                        {#if installmentInfo.isFinished}
                            <span class="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 font-bold ml-1">
                                <Check class="h-3 w-3 stroke-[3]" /> Abbezahlt
                            </span>
                        {:else if entry.payment_status === 'open' && dueDateInfo.isOverdue}
                            <span class="inline-flex items-center gap-0.5 text-amber-700 dark:text-amber-400 font-bold ml-1">
                                <AlertTriangle class="h-3 w-3" /> Nicht überwiesen
                            </span>
                        {/if}
                    </div>

                    <div class="flex items-center gap-2">
                        {#if onViewInstallmentPlan}
                            <button
                                type="button"
                                onclick={() => onViewInstallmentPlan(entry)}
                                class="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 hover:underline cursor-pointer"
                                title="Vollständigen Ratenplan und Zahlungsverlauf ansehen"
                            >
                                <ListTree class="h-3 w-3" />
                                <span>Ratenplan</span>
                            </button>
                        {/if}
                        <span>{installmentInfo.percentage}%</span>
                    </div>
                </div>

                <!-- Fortschrittsbalken -->
                <div class="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-indigo-100 dark:bg-indigo-900/60">
                    <div
                        class="h-full rounded-full transition-all duration-300 {installmentInfo.isFinished
                            ? 'bg-emerald-500'
                            : isArrear
                            ? 'bg-amber-500'
                            : 'bg-indigo-600 dark:bg-indigo-500'}"
                        style="width: {installmentInfo.percentage}%;"
                    ></div>
                </div>

                <!-- Detail-Zahlen: Gesamtsumme & Restbetrag -->
                <div class="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                    <span>
                        Gesamtsumme: <strong class="text-slate-800 dark:text-slate-100">{formatCurrency(installmentInfo.totalAmount)}</strong>
                    </span>
                    {#if !installmentInfo.isFinished}
                        <span>
                            Noch <strong class="text-indigo-700 dark:text-indigo-300">{installmentInfo.remainingCount} {installmentInfo.remainingCount === 1 ? 'Rate' : 'Raten'}</strong> (Rest: {formatCurrency(installmentInfo.remainingAmount)})
                        </span>
                    {/if}
                </div>
            </div>
        {/if}

        <!-- BADGES LEISTE: Status & Kategorie -->
        <div class="flex flex-wrap items-center gap-2 pt-0.5">
            <!-- Status-Badge (Sofort erkennbar) -->
            {#if entry.payment_status === 'paid'}
                <div
                    class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold {statusMeta.badgeClass}"
                    title={`Bezahlt am ${formatDate(entry.paid_at || entry.invoice_date)}`}
                >
                    <span class="h-2 w-2 rounded-full {statusMeta.dotClass}"></span>
                    <CheckCircle2 class="h-3.5 w-3.5" />
                    <span>Bezahlt am {formatDate(entry.paid_at || entry.invoice_date)}</span>
                </div>
            {:else if entry.payment_status === 'open'}
                <div
                    class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold {isArrear || dueDateInfo.isOverdue
                        ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800'
                        : statusMeta.badgeClass}"
                    title={dueDateInfo.label}
                >
                    <span
                        class="h-2 w-2 rounded-full {isArrear || dueDateInfo.isOverdue ? 'bg-red-500 animate-pulse' : statusMeta.dotClass}"
                    ></span>
                    <Clock class="h-3.5 w-3.5" />
                    <span>
                        {#if isArrear}
                            Rückstand ({formatDate(entry.invoice_date || entry.due_date)})
                        {:else if entry.due_date}
                            {dueDateInfo.label}
                        {:else}
                            Fällig (Ohne Frist)
                        {/if}
                    </span>
                </div>
            {:else}
                <div
                    class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold {statusMeta.badgeClass}"
                >
                    <span class="h-2 w-2 rounded-full {statusMeta.dotClass}"></span>
                    <CalendarClock class="h-3.5 w-3.5" />
                    <span>Vorgemerkt / Dauerauftrag</span>
                </div>
            {/if}

            <!-- Kategorie-Badge mit Icon -->
            <div
                class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium {categoryMeta.color}"
            >
                <Tag class="h-3 w-3" />
                <span>{categoryMeta.name}</span>
            </div>

            <!-- Zusätzlicher Steuer-Badge falls bei Rechnung vorhanden -->
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
                        <strong class="font-medium text-slate-800 dark:text-slate-200">Rechnung:</strong> #{entry.invoice_number}
                    {:else}
                        <span class="text-slate-500 dark:text-slate-400">Ohne Beleg-Nr.</span>
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
    </div>

    <!-- UNTERER BEREICH / DAUMENZONE: Schnellaktionen per 1-Tap (min 44x44 px Touch-Target) -->
    <div class="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 pl-1.5 dark:border-slate-800">
        <!-- 1-Tap Hauptaktion: Zahlungsstatus umschalten, Rückstand nachholen oder Folge-Rate erfassen -->
        <div class="flex flex-wrap items-center gap-2 flex-1 sm:flex-initial">
            {#if entry.payment_status === 'paid'}
                <button
                    type="button"
                    onclick={handleToggleStatusClick}
                    class="inline-flex min-h-[44px] min-w-[44px] w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-2xs hover:bg-slate-50 active:scale-95 transition-all dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                    title="Zurücksetzen auf Offen"
                >
                    <RotateCcw class="h-4 w-4 text-slate-500" />
                    <span>Als offen markieren</span>
                </button>
            {:else if isArrear && onPayArrearNow}
                <button
                    type="button"
                    onclick={() => onPayArrearNow(entry)}
                    class="inline-flex min-h-[44px] min-w-[44px] w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-amber-700 active:scale-95 transition-all dark:bg-amber-600 dark:hover:bg-amber-500 cursor-pointer"
                    title="Jetzt überweisen und mit heutigem Wertstellungsdatum verbuchen"
                >
                    <Zap class="h-4 w-4" />
                    <span>Jetzt im aktuellen Monat nachholen</span>
                </button>
            {:else}
                <button
                    type="button"
                    onclick={handleToggleStatusClick}
                    class="inline-flex min-h-[44px] min-w-[44px] w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-emerald-700 active:scale-95 transition-all dark:bg-emerald-600 dark:hover:bg-emerald-500 cursor-pointer"
                    title="Setzt Zahlungsstatus auf Bezahlt und speichert heutiges Datum"
                >
                    <CheckCircle2 class="h-4 w-4" />
                    <span>Als bezahlt markieren</span>
                </button>
            {/if}

            <!-- 1-Tap Schnellaktion: Nächste Rate verbuchen (bei Ratenzahlungen) -->
            {#if entry.is_installment && installmentInfo && !installmentInfo.isFinished && onBookNextInstallment}
                <button
                    type="button"
                    onclick={() => onBookNextInstallment(entry)}
                    class="inline-flex min-h-[44px] min-w-[44px] w-full sm:w-auto items-center justify-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs sm:text-sm font-semibold text-indigo-700 shadow-2xs hover:bg-indigo-100 active:scale-95 transition-all dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300 dark:hover:bg-indigo-900/60 cursor-pointer"
                    title="Erstellt die nächste Monatsrate (Rate {installmentInfo.current + 1} von {installmentInfo.totalCount})"
                >
                    <PlusCircle class="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Nächste Rate buchen</span>
                </button>
            {/if}
        </div>

        <!-- Sekundäraktionen: Beleg öffnen, Bearbeiten, Löschen -->
        <div class="flex items-center gap-1 sm:gap-1.5 self-end">
            <!-- Beleg ansehen / öffnen -->
            {#if entry.receipt_file}
                <button
                    type="button"
                    onclick={() => onViewReceipt && onViewReceipt(entry)}
                    class="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 active:scale-95 transition-all dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                    title="Beleg / PDF anzeigen"
                >
                    <FileText class="h-4 w-4 text-indigo-600 dark:text-indigo-400 mr-1.5" />
                    <span class="hidden sm:inline">Beleg</span>
                    <ExternalLink class="h-3 w-3 text-slate-400" />
                </button>
            {/if}

            <!-- Bearbeiten -->
            {#if onEdit && entry.source !== 'accounting'}
                <button
                    type="button"
                    onclick={() => onEdit(entry)}
                    class="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 active:scale-95 transition-all dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-pointer"
                    aria-label="Buchung bearbeiten"
                    title="Buchung bearbeiten"
                >
                    <Pencil class="h-4 w-4" />
                </button>
            {/if}

            <!-- Löschen -->
            {#if onDelete}
                <button
                    type="button"
                    onclick={() => onDelete(entry)}
                    class="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 active:scale-95 transition-all dark:text-slate-500 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 cursor-pointer"
                    aria-label="Buchung löschen"
                    title={entry.source === 'accounting' ? 'Rechnungseingang aus Haushaltsbuch entfernen' : 'Buchung löschen'}
                >
                    <Trash2 class="h-4 w-4" />
                </button>
            {/if}
        </div>
    </div>
</div>
