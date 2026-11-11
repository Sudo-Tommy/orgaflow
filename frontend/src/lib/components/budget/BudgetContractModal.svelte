<script lang="ts">
    import type { Contract, ContractInterval } from '$lib/types/budget';
    import { BUDGET_CATEGORIES } from '$lib/types/budget';
    import { X } from 'lucide-svelte';
    import type { ContractFormState } from './useBudgetActions.svelte';

    let {
        isOpen,
        editingContract,
        contractForm = $bindable(),
        onClose,
        onSave
    } = $props<{
        isOpen: boolean;
        editingContract: Contract | null;
        contractForm: ContractFormState;
        onClose: () => void;
        onSave: () => void;
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
                    <span class="truncate">{editingContract ? 'Vertrag bearbeiten' : 'Neuen Vertrag / Fixkosten anlegen'}</span>
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
                <!-- Partner & Betrag -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label for="contract_partner" class="orga-label">
                            Vertragspartner / Anbieter *
                        </label>
                        <input
                            id="contract_partner"
                            type="text"
                            bind:value={contractForm.partner_name}
                            required
                            placeholder="z. B. Vodafone, Vermieter, Haftpflicht"
                            class="orga-input"
                        />
                    </div>
                    <div>
                        <label for="contract_amount" class="orga-label">
                            Regelmäßiger Betrag (EUR) *
                        </label>
                        <input
                            id="contract_amount"
                            type="number"
                            step="0.01"
                            bind:value={contractForm.amount}
                            required
                            placeholder="0,00"
                            class="orga-input font-bold"
                        />
                    </div>
                </div>

                <!-- Vertragsnummer & Intervall -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label for="contract_number" class="orga-label">
                            Vertrags- oder Kundennummer
                        </label>
                        <input
                            id="contract_number"
                            type="text"
                            bind:value={contractForm.contract_number}
                            placeholder="z. B. KD-892314-X"
                            class="orga-input"
                        />
                    </div>
                    <div>
                        <label for="contract_interval" class="orga-label">
                            Intervall
                        </label>
                        <select id="contract_interval" bind:value={contractForm.interval} class="orga-input cursor-pointer">
                            <option value="monthly">Monatlich</option>
                            <option value="quarterly">Vierteljährlich</option>
                            <option value="yearly">Jährlich</option>
                        </select>
                    </div>
                </div>

                <!-- Kategorie & Nächster Stichtag -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label for="contract_category" class="orga-label">
                            Kategorie
                        </label>
                        <select id="contract_category" bind:value={contractForm.category} class="orga-input cursor-pointer">
                            {#each BUDGET_CATEGORIES as cat}
                                <option value={cat.name}>{cat.name}</option>
                            {/each}
                        </select>
                    </div>
                    <div>
                        <label for="contract_due" class="orga-label">
                            Nächster Ausführungstag
                        </label>
                        <input
                            id="contract_due"
                            type="date"
                            bind:value={contractForm.next_due_date}
                            required
                            class="orga-input"
                        />
                    </div>
                </div>

                <!-- Status laufender Monat & Automatik -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label for="contract_status" class="orga-label">
                            Status aktueller Zyklus
                        </label>
                        <select id="contract_status" bind:value={contractForm.payment_status} class="orga-input cursor-pointer">
                            <option value="open">Offen für diesen Zyklus</option>
                            <option value="paid">Bereits bezahlt</option>
                        </select>
                    </div>
                    <div class="flex items-center gap-2 pt-2 sm:pt-6">
                        <input
                            id="auto_book"
                            type="checkbox"
                            bind:checked={contractForm.auto_book}
                            class="h-4.5 w-4.5 rounded-lg border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-700 cursor-pointer"
                        />
                        <label for="auto_book" class="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                            Automatisch zum Stichtag verbuchen
                        </label>
                    </div>
                </div>

                <!-- Aktionsbereich (Footer) -->
                <div class="border-t border-slate-100 dark:border-slate-800 pt-4 flex items-center justify-end gap-3 sticky bottom-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs pb-1 mt-6">
                    <button type="button" onclick={onClose} class="orga-button-ghost">
                        Abbrechen
                    </button>
                    <button type="submit" class="orga-button-primary">
                        {editingContract ? 'Änderungen speichern' : 'Vertrag anlegen'}
                    </button>
                </div>
            </form>
        </div>
    </dialog>
{/if}
