<script lang="ts">
    import type { Contract } from '$lib/types/budget';
    import {
        formatCurrency,
        formatDate,
        getDueDateInfo,
        CONTRACT_INTERVAL_METADATA,
        BUDGET_CATEGORIES
    } from '$lib/types/budget';
    import {
        CheckCircle2,
        Clock,
        FileText,
        Pencil,
        Trash2,
        Calendar,
        Repeat,
        Zap,
        PlusCircle,
        RotateCcw,
        Tag,
        ArrowDownLeft
    } from 'lucide-svelte';

    let {
        contract,
        onBookNow,
        onToggleStatus,
        onEdit,
        onDelete
    } = $props<{
        contract: Contract;
        onBookNow?: (contract: Contract) => void;
        onToggleStatus?: (contract: Contract, newStatus: 'paid' | 'open') => void;
        onEdit?: (contract: Contract) => void;
        onDelete?: (contract: Contract) => void;
    }>();

    // Ermittlung der Kategorie-Metadaten
    let categoryMeta = $derived(
        BUDGET_CATEGORIES.find((c) => c.name.toLowerCase() === (contract.category || '').toLowerCase()) || {
            name: contract.category || 'Sonstiges',
            icon: 'Tag',
            color: 'text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
        }
    );

    // Intervall-Metadaten mit sicherer Typ-Indexierung
    let intervalMeta = $derived(
        CONTRACT_INTERVAL_METADATA[contract.interval as keyof typeof CONTRACT_INTERVAL_METADATA] || { label: 'Monatlich', factorMonthly: 1 }
    );

    // Fälligkeit
    let dueDateInfo = $derived(getDueDateInfo(contract.next_due_date));

    // Umschalten des Status für den aktuellen Zyklus
    function handleToggleStatusClick() {
        if (!onToggleStatus) return;
        const nextStatus = contract.payment_status === 'paid' ? 'open' : 'paid';
        onToggleStatus(contract, nextStatus);
    }
</script>

<div
    class="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/95 dark:hover:border-slate-700 {!contract.is_active ? 'opacity-65 grayscale-25' : ''}"
>
    <!-- Linker Akzentstreifen für laufende Verträge (Lila / Purple) -->
    <div class="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-purple-500 to-indigo-600"></div>

    <!-- OBERER BEREICH: Anbieter/Partner, Betrag & Intervall -->
    <div class="space-y-3 pl-1.5">
        <div class="flex items-start justify-between gap-3">
            <div class="min-w-0 flex-1">
                <!-- Anbieter / Partner (fett hervorgehoben) -->
                <div class="flex items-center gap-2">
                    <h3 class="truncate text-base font-bold text-slate-900 sm:text-lg dark:text-slate-100" title={contract.partner_name}>
                        {contract.partner_name || 'Unbekannter Partner'}
                    </h3>
                    {#if !contract.is_active}
                        <span class="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
                            Pausiert
                        </span>
                    {/if}
                </div>

                <!-- Vertragsnummer & Intervall-Kennzeichnung -->
                <p class="mt-0.5 truncate text-sm font-medium text-slate-600 dark:text-slate-400">
                    <span class="text-slate-500 dark:text-slate-400 font-normal">Vertrags-Nr:</span> {contract.contract_number || 'Keine Nummer angegeben'}
                </p>
                {#if contract.description}
                    <p class="mt-0.5 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                        {contract.description}
                    </p>
                {/if}
            </div>

            <!-- Betrag & Zyklus (Ausgabe / Fixkosten) -->
            <div class="flex flex-col items-end text-right">
                <div class="flex items-center gap-1 text-lg font-bold tracking-tight text-slate-900 sm:text-xl dark:text-slate-100">
                    <ArrowDownLeft class="h-5 w-5 text-rose-500 stroke-[2.5]" />
                    <span>−{formatCurrency(contract.amount)}</span>
                </div>
                <span class="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {intervalMeta.label}
                </span>
            </div>
        </div>

        <!-- BADGES LEISTE: Eigener Status-Pill, Intervall & Kategorie -->
        <div class="flex flex-wrap items-center gap-2 pt-1">
            <!-- Eigener Status-Pill: Aktueller Zyklus bezahlt oder offen -->
            {#if contract.payment_status === 'paid'}
                <div
                    class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                    title="Für die aktuelle Periode bereits bezahlt"
                >
                    <span class="h-2 w-2 rounded-full bg-emerald-500"></span>
                    <CheckCircle2 class="h-3.5 w-3.5" />
                    <span>Diesen Zyklus bezahlt</span>
                </div>
            {:else}
                <div
                    class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold {dueDateInfo.isOverdue
                        ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800'
                        : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'}"
                    title={dueDateInfo.label}
                >
                    <span
                        class="h-2 w-2 rounded-full {dueDateInfo.isOverdue ? 'bg-red-500 animate-pulse' : 'bg-amber-500'}"
                    ></span>
                    <Clock class="h-3.5 w-3.5" />
                    <span>Noch offen für diesen Monat</span>
                </div>
            {/if}

            <!-- Intervall Badge -->
            <div
                class="inline-flex items-center gap-1.5 rounded-full border border-purple-200 bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700 dark:border-purple-800 dark:bg-purple-950/40 dark:text-purple-300"
            >
                <Repeat class="h-3 w-3" />
                <span>{intervalMeta.label}</span>
            </div>

            <!-- Kategorie-Badge mit Icon -->
            <div
                class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium {categoryMeta.color}"
            >
                <Tag class="h-3 w-3" />
                <span>{categoryMeta.name}</span>
            </div>
        </div>

        <!-- METADATEN-LEISTE: Nächster Ausführungstag & Buchungsautomatik -->
        <div
            class="grid grid-cols-1 gap-2 rounded-xl bg-slate-50/80 p-2.5 text-xs text-slate-600 sm:grid-cols-2 dark:bg-slate-800/60 dark:text-slate-300"
        >
            <!-- Nächster Stichtag / Ausführungstag -->
            <div class="flex items-center gap-1.5 min-w-0">
                <Calendar class="h-3.5 w-3.5 shrink-0 text-slate-500 dark:text-slate-400" />
                <span class="truncate">
                    <strong class="font-medium text-slate-800 dark:text-slate-200">Nächster Stichtag:</strong>
                    {formatDate(contract.next_due_date)}
                </span>
            </div>

            <!-- Auto-Book Option -->
            <div class="flex items-center gap-1.5 min-w-0">
                <Zap class="h-3.5 w-3.5 shrink-0 {contract.auto_book ? 'text-amber-500' : 'text-slate-400'}" />
                <span class="truncate font-medium {contract.auto_book ? 'text-amber-700 dark:text-amber-300' : 'text-slate-500 dark:text-slate-400'}">
                    {contract.auto_book ? 'Automatische Buchung aktiv' : 'Manuelle Buchung'}
                </span>
            </div>
        </div>
    </div>

    <!-- UNTERER BEREICH / DAUMENZONE: Schnellaktionen per 1-Tap (min 44x44 px Touch-Target) -->
    <div class="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 pl-1.5 dark:border-slate-800">
        <!-- 1-Tap Hauptaktion: „Jetzt verbuchen“ (überträgt Betrag direkt in Buchungen) -->
        <div class="flex flex-1 sm:flex-initial items-center gap-2">
            {#if onBookNow}
                <button
                    type="button"
                    onclick={() => onBookNow(contract)}
                    class="inline-flex min-h-[44px] min-w-[44px] w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-700 active:scale-95 transition-all dark:bg-indigo-600 dark:hover:bg-indigo-500"
                    title="Überträgt diesen Vertrag als sofortige Ausgabe in die Buchungsliste"
                >
                    <PlusCircle class="h-4 w-4" />
                    <span>Jetzt verbuchen</span>
                </button>
            {/if}

            <!-- Status umschalten -->
            {#if onToggleStatus}
                <button
                    type="button"
                    onclick={handleToggleStatusClick}
                    class="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-slate-200 bg-white p-2 text-slate-700 shadow-2xs hover:bg-slate-50 active:scale-95 transition-all dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    title={contract.payment_status === 'paid' ? 'Als offen markieren' : 'Als bezahlt markieren'}
                    aria-label="Status umschalten"
                >
                    {#if contract.payment_status === 'paid'}
                        <RotateCcw class="h-4 w-4 text-slate-500" />
                    {:else}
                        <CheckCircle2 class="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    {/if}
                </button>
            {/if}
        </div>

        <!-- Sekundäraktionen: Bearbeiten & Löschen -->
        <div class="flex items-center gap-1 sm:gap-1.5 self-end">
            <!-- Bearbeiten -->
            {#if onEdit}
                <button
                    type="button"
                    onclick={() => onEdit(contract)}
                    class="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 active:scale-95 transition-all dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                    aria-label="Vertrag bearbeiten"
                    title="Vertrag bearbeiten"
                >
                    <Pencil class="h-4 w-4" />
                </button>
            {/if}

            <!-- Löschen -->
            {#if onDelete}
                <button
                    type="button"
                    onclick={() => onDelete(contract)}
                    class="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 active:scale-95 transition-all dark:text-slate-500 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                    aria-label="Vertrag löschen"
                    title="Vertrag löschen"
                >
                    <Trash2 class="h-4 w-4" />
                </button>
            {/if}
        </div>
    </div>
</div>
