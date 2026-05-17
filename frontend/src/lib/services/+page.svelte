<script lang="ts">
    import { onMount } from 'svelte';
    import { usePersonalFinanceService } from '$lib/services/personalFinanceService.svelte';
    import PersonalTransactionModal from '$lib/components/finances/PersonalTransactionModal.svelte';
    import PersonalContractModal from '$lib/components/finances/PersonalContractModal.svelte';
    import { confirmStore } from '$lib/services/confirmService.svelte';

    const financeService = usePersonalFinanceService();

    let transactionModal: PersonalTransactionModal;
    let contractModal: PersonalContractModal;

    onMount(() => {
        financeService.loadData();
    });

    async function handleDeleteTransaction(id: string) {
        if (await confirmStore.ask("Möchtest du diese Buchung wirklich löschen?", "Löschen bestätigen", "Löschen", "Abbrechen", true)) {
            await financeService.deleteTransaction(id);
        }
    }

    async function handleDeleteContract(id: string) {
        if (await confirmStore.ask("Möchtest du diesen Vertrag wirklich löschen?", "Löschen bestätigen", "Löschen", "Abbrechen", true)) {
            await financeService.deleteContract(id);
        }
    }
</script>

<div class="orga-page-header animate-enter">
    <div>
        <h1 class="orga-page-title">Mein Haushaltsbuch</h1>
        <p class="orga-page-subtitle">Ihre persönliche Übersicht über Einnahmen, Ausgaben und Verträge.</p>
    </div>
</div>

{#if financeService.isLoading}
    <div class="flex justify-center py-20"><div class="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div></div>
{:else if financeService.error}
    <div class="bg-red-50 text-red-700 p-6 rounded-2xl border border-red-200 font-semibold">
        <h3 class="font-bold text-lg mb-2">Datenbank-Fehler</h3>
        <p>{financeService.error}</p>
        <p class="mt-2 text-sm">Bitte stellen Sie sicher, dass die Tabellen korrekt in PocketBase angelegt wurden und die API-Regeln gesetzt sind.</p>
    </div>
{:else}
    <!-- KPI Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 animate-enter delay-100">
        <div class="orga-card-white p-6 flex items-center gap-5">
            <div class="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl shadow-inner shrink-0">📈</div>
            <div>
                <p class="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Monats-Einnahmen</p>
                <p class="text-2xl font-black text-emerald-700">{financeService.stats.monthlyIncome.toFixed(2).replace('.', ',')} €</p>
            </div>
        </div>
        <div class="orga-card-white p-6 flex items-center gap-5">
            <div class="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center text-2xl shadow-inner shrink-0">📉</div>
            <div>
                <p class="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Monats-Ausgaben</p>
                <p class="text-2xl font-black text-rose-900">{financeService.stats.monthlyExpense.toFixed(2).replace('.', ',')} €</p>
            </div>
        </div>
        <div class="orga-card-white p-6 flex items-center gap-5">
            <div class="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-2xl shadow-inner shrink-0">💰</div>
            <div>
                <p class="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Monats-Bilanz</p>
                <p class="text-2xl font-black {financeService.stats.monthlyBalance >= 0 ? 'text-indigo-950' : 'text-rose-900'}">{financeService.stats.monthlyBalance.toFixed(2).replace('.', ',')} €</p>
            </div>
        </div>
        <div class="orga-card-white p-6 flex items-center gap-5">
            <div class="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-2xl shadow-inner shrink-0">📜</div>
            <div>
                <p class="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Fixkosten (Monat)</p>
                <p class="text-2xl font-black text-neutral-900">{financeService.stats.upcomingExpenses.toFixed(2).replace('.', ',')} €</p>
            </div>
        </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <!-- Linke Spalte: Transaktionen -->
        <div class="orga-card-white overflow-hidden">
            <div class="p-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
                <h3 class="font-bold text-neutral-900">Letzte Buchungen</h3>
                <button onclick={() => transactionModal?.open()} class="orga-button-primary py-2 px-4 text-xs shadow-indigo-600/20">+ Buchung</button>
            </div>
            <div class="overflow-y-auto custom-scrollbar max-h-125">
                {#if financeService.transactions.length === 0}
                    <p class="p-8 text-center text-neutral-400 italic">Noch keine Buchungen erfasst.</p>
                {:else}
                    <table class="w-full text-left border-collapse">
                        <tbody class="divide-y divide-neutral-50">
                            {#each financeService.transactions as t}
                                <tr class="hover:bg-neutral-50/50 transition-colors group">
                                    <td class="p-4">
                                        <div class="flex items-center gap-3">
                                            <span class="w-8 h-8 rounded-full flex items-center justify-center text-lg {t.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}">{t.type === 'income' ? '➕' : '➖'}</span>
                                            <div>
                                                <p class="font-bold text-neutral-900">{t.title}</p>
                                                <p class="text-xs text-neutral-500">{new Date(t.date).toLocaleDateString('de-DE')}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td class="p-4 text-right">
                                        <p class="font-bold {t.type === 'income' ? 'text-emerald-700' : 'text-rose-700'}">{t.amount.toFixed(2).replace('.', ',')} €</p>
                                    </td>
                                    <td class="p-4 text-right w-24">
                                        <div class="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onclick={() => transactionModal?.open(t)} class="p-2 text-neutral-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50" title="Bearbeiten">✎</button>
                                            <button onclick={() => handleDeleteTransaction(t.id)} class="p-2 text-neutral-400 hover:text-rose-500 rounded-lg hover:bg-rose-50" title="Löschen">✕</button>
                                        </div>
                                    </td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                {/if}
            </div>
        </div>

        <!-- Rechte Spalte: Verträge -->
        <div class="orga-card-white overflow-hidden">
            <div class="p-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
                <h3 class="font-bold text-neutral-900">Laufende Verträge</h3>
                <button onclick={() => contractModal?.open()} class="orga-button-primary py-2 px-4 text-xs shadow-indigo-600/20">+ Vertrag</button>
            </div>
            <div class="overflow-y-auto custom-scrollbar max-h-125">
                {#if financeService.contracts.length === 0}
                    <p class="p-8 text-center text-neutral-400 italic">Noch keine Verträge erfasst.</p>
                {:else}
                    <table class="w-full text-left border-collapse">
                        <tbody class="divide-y divide-neutral-50">
                            {#each financeService.contracts as c}
                                <tr class="hover:bg-neutral-50/50 transition-colors group">
                                    <td class="p-4">
                                        <div class="flex items-center gap-3">
                                            <span class="w-8 h-8 rounded-full flex items-center justify-center text-lg bg-blue-50 text-blue-600">📜</span>
                                            <div>
                                                <p class="font-bold text-neutral-900">{c.title}</p>
                                                <p class="text-xs text-neutral-500">{c.partner || 'Unbekannter Partner'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td class="p-4 text-right">
                                        <p class="font-bold text-neutral-800">{c.amount.toFixed(2).replace('.', ',')} €</p>
                                        <p class="text-xs text-neutral-500 capitalize">{c.interval}</p>
                                    </td>
                                    <td class="p-4 text-right w-24">
                                        <div class="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onclick={() => contractModal?.open(c)} class="p-2 text-neutral-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50" title="Bearbeiten">✎</button>
                                            <button onclick={() => handleDeleteContract(c.id)} class="p-2 text-neutral-400 hover:text-rose-500 rounded-lg hover:bg-rose-50" title="Löschen">✕</button>
                                        </div>
                                    </td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                {/if}
            </div>
        </div>
    </div>
{/if}

<PersonalTransactionModal bind:this={transactionModal} onSave={financeService.addTransaction} onUpdate={financeService.updateTransaction} />
<PersonalContractModal bind:this={contractModal} onSave={financeService.addContract} onUpdate={financeService.updateContract} />