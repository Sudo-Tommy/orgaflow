<script lang="ts">
    import type { BudgetEntry } from '$lib/types/budget';
    import { BUDGET_CATEGORIES, PAYMENT_METHOD_METADATA } from '$lib/types/budget';
    import PartnerAutocomplete from './PartnerAutocomplete.svelte';
    import BudgetInstallmentFields from './BudgetInstallmentFields.svelte';
    import BudgetReceiptField from './BudgetReceiptField.svelte';
    import { X, Layers } from 'lucide-svelte';
    import { autoGrow } from '$lib/actions/autoGrow';
    import type { EntryFormState } from './useBudgetActions.svelte';

    let {
        isOpen,
        editingEntry,
        entryForm = $bindable(),
        entryReceiptFile = $bindable(),
        onClose,
        onSave,
        onCalculateInstallmentRate
    } = $props<{
        isOpen: boolean;
        editingEntry: BudgetEntry | null;
        entryForm: EntryFormState;
        entryReceiptFile: File | null;
        onClose: () => void;
        onSave: () => void;
        onCalculateInstallmentRate: (d: 'from_totals' | 'from_amount') => void;
    }>();

    let dialog = $state<HTMLDialogElement | null>(null);

    $effect(() => {
        if (isOpen) {
            dialog?.showModal();
        } else {
            dialog?.close();
        }
    });
</script>

{#if isOpen}
    <dialog
        bind:this={dialog}
        class="zero-inner-scroll-modal fixed inset-0 m-auto w-full max-w-xl bg-transparent p-3 sm:p-6 border-none outline-none backdrop:bg-slate-950/70 backdrop:backdrop-blur-xs animate-enter z-50 overflow-visible"
        onclick={(e) => { if (e.target === dialog) onClose(); }}
        oncancel={(e) => { e.preventDefault(); onClose(); }}
    >
        <div class="relative w-full my-6 sm:my-10 rounded-3xl border border-slate-100 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 overflow-hidden flex flex-col">
            <!-- Modal Kopfzeile -->
            <div class="flex items-center justify-between border-b border-slate-100 px-5 sm:px-6 py-4 dark:border-slate-800 shrink-0">
                <h3 class="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    {#if entryForm.is_installment}
                        <Layers class="h-4.5 w-4.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    {/if}
                    <span class="truncate">{editingEntry ? (editingEntry.source === 'accounting' ? 'Rechnungs-Einnahme bearbeiten' : 'Buchung bearbeiten') : (entryForm.is_installment ? 'Ratenzahlung erfassen' : 'Neue Buchung erfassen')}</span>
                </h3>
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

            <!-- Modal Inhalt / Formular -->
            <form onsubmit={(e) => { e.preventDefault(); onSave(); }} class="p-5 sm:p-6 space-y-4">
                <!-- Typ-Schalter: Einnahme vs Ausgabe -->
                <div class="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
                    <button
                        type="button"
                        onclick={() => (entryForm.type = 'expense')}
                        class="rounded-lg py-2 text-xs font-semibold transition-all {entryForm.type === 'expense' ? 'bg-white text-rose-600 shadow-xs dark:bg-slate-900 dark:text-rose-400' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'}"
                    >
                        Ausgabe
                    </button>
                    <button
                        type="button"
                        onclick={() => (entryForm.type = 'income')}
                        class="rounded-lg py-2 text-xs font-semibold transition-all {entryForm.type === 'income' ? 'bg-white text-emerald-600 shadow-xs dark:bg-slate-900 dark:text-emerald-400' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'}"
                    >
                        Einnahme
                    </button>
                </div>

                <!-- Empfänger / Zahler & Betrag -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <PartnerAutocomplete
                            id="recipient_payer"
                            bind:value={entryForm.recipient_or_payer}
                            label={entryForm.type === 'income' ? 'Zahler / Klient / Kunde *' : 'Empfänger / Händler *'}
                            placeholder="z. B. Max Mustermann, Otto, Vermieter"
                            required={true}
                            entryType={entryForm.type}
                        />
                    </div>
                    <div>
                        <label for="entry_amount" class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                            {entryForm.is_installment ? 'Betrag dieser Rate (EUR) *' : 'Betrag in EUR *'}
                        </label>
                        <input
                            id="entry_amount"
                            type="number"
                            step="0.01"
                            min="0.01"
                            bind:value={entryForm.amount}
                            oninput={() => onCalculateInstallmentRate('from_amount')}
                            required
                            placeholder="0,00"
                            class="orga-input font-bold"
                        />
                    </div>
                </div>

                <!-- Titel / Buchungszweck -->
                <div>
                    <label for="entry_title" class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                        Titel / Buchungszweck *
                    </label>
                    <input
                        id="entry_title"
                        type="text"
                        bind:value={entryForm.title}
                        required
                        placeholder="z. B. Rechnung RE-2026-0042, Waschmaschine Bosch"
                        class="orga-input"
                    />
                </div>

                <!-- SEKTION RATENZAHLUNG -->
                <BudgetInstallmentFields
                    {entryForm}
                    {onCalculateInstallmentRate}
                />

                <!-- Kategorie & Zahlungsart -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label for="entry_category" class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                            Kategorie
                        </label>
                        <select id="entry_category" bind:value={entryForm.category} class="orga-input cursor-pointer">
                            {#each BUDGET_CATEGORIES as cat}
                                <option value={cat.name}>{cat.name}</option>
                            {/each}
                        </select>
                    </div>
                    <div>
                        <label for="entry_payment_method" class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                            Zahlungsmethode
                        </label>
                        <select id="entry_payment_method" bind:value={entryForm.payment_method} class="orga-input cursor-pointer">
                            {#each Object.entries(PAYMENT_METHOD_METADATA) as [pmKey, pmMeta]}
                                <option value={pmKey}>{pmMeta.label}</option>
                            {/each}
                        </select>
                    </div>
                </div>

                <!-- Zahlungsstatus & Datum -->
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                        <label for="entry_status" class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                            Zahlungsstatus
                        </label>
                        <select id="entry_status" bind:value={entryForm.payment_status} class="orga-input cursor-pointer">
                            <option value="paid">Bezahlt</option>
                            <option value="open">Offen / Fällig</option>
                            <option value="scheduled">Geplant / Dauerauftrag</option>
                        </select>
                    </div>
                    <div>
                        <label for="entry_invoice_date" class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                            Rechnungsdatum
                        </label>
                        <input id="entry_invoice_date" type="date" bind:value={entryForm.invoice_date} class="orga-input" />
                    </div>
                    <div>
                        <label for="entry_due_date" class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                            Fälligkeitsdatum
                        </label>
                        <input id="entry_due_date" type="date" bind:value={entryForm.due_date} class="orga-input" />
                    </div>
                </div>

                <!-- Rechnungsnummer & Beleg-Upload -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label for="entry_invoice_nr" class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                            Rechnungs- / Belegnummer
                        </label>
                        <input
                            id="entry_invoice_nr"
                            type="text"
                            bind:value={entryForm.invoice_number}
                            placeholder="z. B. RE-2026-0881"
                            class="orga-input"
                        />
                    </div>
                    <BudgetReceiptField bind:receiptFile={entryReceiptFile} existingReceipt={editingEntry?.receipt_file} />
                </div>

                <!-- Beschreibung / Notizen -->
                <div>
                    <label for="entry_desc" class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                        Notizen / Bemerkungen
                    </label>
                    <textarea
                        id="entry_desc"
                        use:autoGrow
                        bind:value={entryForm.description}
                        rows="2"
                        placeholder="Optionale Details oder Notizen..."
                        class="orga-input resize-none overflow-hidden"
                    ></textarea>
                </div>

                <!-- Aktionsbereich (Footer) -->
                <div class="border-t border-slate-100 dark:border-slate-800 pt-4 flex items-center justify-end gap-3 sticky bottom-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs pb-1 mt-6">
                    <button type="button" onclick={onClose} class="orga-button-ghost">
                        Abbrechen
                    </button>
                    <button type="submit" class="orga-button-primary">
                        {editingEntry ? 'Änderungen speichern' : 'Buchung anlegen'}
                    </button>
                </div>
            </form>
        </div>
    </dialog>
{/if}
