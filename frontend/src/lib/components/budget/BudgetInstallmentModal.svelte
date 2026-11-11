<script lang="ts">
    import type { BudgetEntry } from '$lib/types/budget';
    import { formatCurrency, formatDate, getInstallmentProgress } from '$lib/types/budget';
    import { X, Layers, Check, AlertTriangle, Plus } from 'lucide-svelte';

    let {
        planKey,
        entries,
        isEntryArrear,
        onClose,
        onPayArrear,
        onBookNextInstallment
    } = $props<{
        planKey: string | null;
        entries: BudgetEntry[];
        isEntryArrear: (e: BudgetEntry) => boolean;
        onClose: () => void;
        onPayArrear: (e: BudgetEntry) => void;
        onBookNextInstallment: (e: BudgetEntry) => void;
    }>();

    let dialog = $state<HTMLDialogElement | null>(null);

    // Alle Raten des ausgewählten Plans
    let planEntries = $derived.by(() => {
        if (!planKey) return [];
        return entries
            .filter((e: BudgetEntry) => e.is_installment && getPlanKey(e) === planKey)
            .sort((a: BudgetEntry, b: BudgetEntry) => (Number(a.installment_current) || 1) - (Number(b.installment_current) || 1));
    });

    let primaryEntry = $derived(planEntries[planEntries.length - 1] || null);

    $effect(() => {
        if (planKey && primaryEntry) {
            dialog?.showModal();
        } else {
            dialog?.close();
        }
    });

    // Identifikationsschlüssel für Ratenpläne
    function getPlanKey(entry: BudgetEntry): string {
        return entry.invoice_number
            ? `inv_${entry.invoice_number.trim().toLowerCase()}`
            : `${entry.recipient_or_payer}_${entry.title}_${entry.installment_total_count || ''}`.trim().toLowerCase();
    }
</script>

{#if planKey && primaryEntry}
    {@const planInfo = getInstallmentProgress(primaryEntry)}
    <dialog
        bind:this={dialog}
        class="zero-inner-scroll-modal fixed inset-0 m-auto w-full max-w-xl bg-transparent p-3 sm:p-6 border-none outline-none backdrop:bg-slate-950/70 backdrop:backdrop-blur-xs animate-enter z-50 overflow-visible"
        onclick={(e) => { if (e.target === dialog) onClose(); }}
        oncancel={(e) => { e.preventDefault(); onClose(); }}
    >
        <div class="relative w-full my-6 sm:my-10 rounded-3xl border border-slate-100 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 overflow-hidden flex flex-col">
            <!-- Modal Kopfzeile -->
            <div class="flex items-center justify-between border-b border-slate-100 px-5 sm:px-6 py-4 dark:border-slate-800 shrink-0">
                <div class="flex items-center gap-2.5 min-w-0">
                    <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400 shrink-0">
                        <Layers class="h-4.5 w-4.5" />
                    </div>
                    <div class="min-w-0">
                        <h3 class="truncate text-base font-bold text-slate-900 dark:text-white">
                            Ratenplan: {primaryEntry.recipient_or_payer}
                        </h3>
                        <p class="truncate text-xs text-slate-500 dark:text-slate-400">
                            {primaryEntry.title} • Gesamtsumme: {formatCurrency(planInfo.totalAmount)}
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    onclick={onClose}
                    aria-label="Schließen"
                    title="Schließen"
                    class="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 flex items-center justify-center transition cursor-pointer shrink-0"
                >
                    <X class="h-4 w-4" />
                </button>
            </div>

            <!-- Inhalt -->
            <div class="p-5 sm:p-6 space-y-4">
                <!-- Übersicht / Fortschritt -->
                <div class="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 dark:border-indigo-900/50 dark:bg-indigo-950/30">
                    <div class="flex items-center justify-between text-xs font-bold text-indigo-900 dark:text-indigo-200">
                        <span>Status: {planInfo.current} von {planInfo.totalCount} Raten erfasst</span>
                        <span>{planInfo.percentage}%</span>
                    </div>
                    <div class="mt-2 h-2 w-full overflow-hidden rounded-full bg-indigo-100 dark:bg-indigo-900/60">
                        <div class="h-full rounded-full {planInfo.isFinished ? 'bg-emerald-500' : 'bg-indigo-600'} transition-all" style="width: {planInfo.percentage}%;"></div>
                    </div>
                    <div class="mt-2 flex flex-wrap items-center justify-between gap-1 text-xs text-slate-600 dark:text-slate-400">
                        <span>Restschuld: <strong class="text-indigo-700 dark:text-indigo-300">{formatCurrency(planInfo.remainingAmount)}</strong></span>
                        <span>{planInfo.remainingCount} Rate(n) noch ausstehend</span>
                    </div>
                </div>

                <!-- Einzelne Raten im Monatsverlauf -->
                <div class="space-y-2">
                    <h4 class="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Ratenübersicht & Zahlungsstatus:</h4>
                    {#each planEntries as rEntry}
                        {@const isPaid = rEntry.payment_status === 'paid'}
                        {@const isOverdue = !isPaid && isEntryArrear(rEntry)}
                        <div class="flex items-center justify-between gap-2 rounded-xl border p-3 text-xs {isPaid ? 'border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-800/40' : isOverdue ? 'border-amber-300 bg-amber-50/80 dark:border-amber-800 dark:bg-amber-950/40' : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'}">
                            <div class="flex items-center gap-2.5 min-w-0">
                                <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-black {isPaid ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : isOverdue ? 'bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-200' : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}">
                                    {rEntry.installment_current || '•'}
                                </span>
                                <div class="min-w-0">
                                    <div class="truncate font-bold text-slate-900 dark:text-slate-100">
                                        Rate {rEntry.installment_current} von {rEntry.installment_total_count} ({formatCurrency(rEntry.amount)})
                                    </div>
                                    <div class="truncate text-[11px] text-slate-500 dark:text-slate-400">
                                        {#if isPaid}
                                            Bezahlt am {formatDate(rEntry.paid_at || rEntry.invoice_date)}
                                        {:else if isOverdue}
                                            <span class="font-bold text-rose-600 dark:text-rose-400">⚠️ Nicht überwiesen ({formatDate(rEntry.invoice_date || rEntry.due_date)})</span>
                                        {:else}
                                            Fällig am {formatDate(rEntry.due_date || rEntry.invoice_date)}
                                        {/if}
                                    </div>
                                </div>
                            </div>

                            <div class="shrink-0">
                                {#if !isPaid}
                                    <button
                                        type="button"
                                        onclick={() => { onPayArrear(rEntry); }}
                                        class="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white transition shadow-sm cursor-pointer"
                                    >
                                        Als bezahlt buchen
                                    </button>
                                {:else}
                                    <span class="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                        <Check class="h-3.5 w-3.5 stroke-[3]" /> Bezahlt
                                    </span>
                                {/if}
                            </div>
                        </div>
                    {/each}
                </div>

                <!-- Footer -->
                <div class="border-t border-slate-100 dark:border-slate-800 pt-4 flex items-center justify-between gap-3 sticky bottom-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs pb-1 mt-6">
                    <button type="button" onclick={onClose} class="orga-button-ghost">
                        Schließen
                    </button>
                    {#if !planInfo.isFinished}
                        <button
                            type="button"
                            onclick={() => { onClose(); onBookNextInstallment(primaryEntry); }}
                            class="orga-button-primary inline-flex items-center gap-1.5"
                        >
                            <Plus class="h-3.5 w-3.5" />
                            <span>Folge-Rate buchen</span>
                        </button>
                    {/if}
                </div>
            </div>
        </div>
    </dialog>
{/if}
