<script lang="ts">
    import type { BudgetEntry, getInstallmentProgress } from '$lib/types/budget';
    import {
        RotateCcw,
        Zap,
        CheckCircle2,
        PlusCircle,
        FileText,
        ExternalLink,
        Pencil,
        Trash2
    } from 'lucide-svelte';

    let {
        entry,
        isArrear = false,
        installmentInfo = null,
        onToggleStatus,
        onPayArrearNow,
        onBookNextInstallment,
        onViewReceipt,
        onEdit,
        onDelete
    } = $props<{
        entry: BudgetEntry;
        isArrear?: boolean;
        installmentInfo?: ReturnType<typeof getInstallmentProgress> | null;
        onToggleStatus?: (entry: BudgetEntry, newStatus: 'paid' | 'open') => void;
        onPayArrearNow?: (entry: BudgetEntry) => void;
        onBookNextInstallment?: (entry: BudgetEntry) => void;
        onViewReceipt?: (entry: BudgetEntry) => void;
        onEdit?: (entry: BudgetEntry) => void;
        onDelete?: (entry: BudgetEntry) => void;
    }>();

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

<!-- UNTERER BEREICH / DAUMENZONE: Schnellaktionen per 1-Tap (min 44x44 px Touch-Target) -->
<div class="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 pl-1.5 dark:border-slate-800">
    <!-- 1-Tap Hauptaktion: Zahlungsstatus umschalten („Als bezahlt markieren“) -->
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
                <span>Jetzt nachholen</span>
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
