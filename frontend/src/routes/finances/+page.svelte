<script lang="ts">
    import { onMount } from 'svelte';
    import { usePersonalFinanceService } from '$lib/services/personalFinanceService.svelte';
    import PersonalTransactionModal from '$lib/components/finances/PersonalTransactionModal.svelte';
    import PersonalContractModal from '$lib/components/finances/PersonalContractModal.svelte';
    import { confirmStore } from '$lib/services/confirmService.svelte';
    import { toastStore } from '$lib/services/toastService.svelte';
  import { pb } from '$lib/pocketbase';
   
    const financeService = usePersonalFinanceService();

    let transactionModal: PersonalTransactionModal;
    let contractModal: PersonalContractModal;

    onMount(() => {
        financeService.loadData();
    });

    async function bookContractManually(c: any) {
        const formData = new FormData();
        formData.append('title', `Vertrag: ${c.title}`);
        formData.append('amount', c.amount.toString());
        formData.append('type', c.type || 'expense');
        formData.append('category', 'Vertrag');
        formData.append('date', new Date().toISOString());

        await financeService.addTransaction(formData);
        toastStore.success(`Buchung für '${c.title}' wurde erfolgreich erfasst!`);
    }


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

    function bookNextInstallment(transaction: any) {
        transactionModal?.open(transaction, true);
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

    <div class="orga-card-white p-6 animate-enter delay-200">
        <h3 class="font-bold text-neutral-900 text-lg mb-4">Finanzprognose (Nächste 12 Monate)</h3>
        <p class="text-sm text-neutral-500 mb-6">Diese Prognose basiert auf Ihren erfassten, monatlichen Verträgen.</p>
        {#if financeService.forecast.length > 0}
            {@const maxVal = Math.max(...financeService.forecast.map(f => Math.abs(f.projectedBalance)), 1)}
            <div class="w-full h-64 bg-neutral-50 rounded-xl border border-neutral-200 p-4 flex gap-2 items-end overflow-x-auto custom-scrollbar">
                {#each financeService.forecast as month}
                    <div class="flex flex-col items-center gap-1 shrink-0 w-16 group">
                        <div class="w-full h-full flex items-end">
                            <div title="{month.name}: {month.projectedBalance.toFixed(2)}€" class="w-full rounded-t-lg transition-all group-hover:bg-indigo-400 {month.projectedBalance >= 0 ? 'bg-indigo-300' : 'bg-rose-300'}" style="height: {Math.max(0, Math.abs(month.projectedBalance) / maxVal * 100)}%;"></div>
                        </div>
                        <span class="text-[10px] font-bold text-neutral-500">{month.name.split(' ')[0]}</span>
                    </div>
                {/each}
            </div>
        {/if}
    </div>

    

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        <!-- Linke Spalte: Transaktionen -->
        <div class="orga-card-white overflow-hidden">
            <div class="p-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50 flex-wrap gap-2">
                <h3 class="font-bold text-neutral-900">Letzte Buchungen</h3>
                <div class="flex gap-2">
                    <button onclick={financeService.bookDueContracts} class="orga-button-ghost py-2 px-3 text-xs shadow-sm bg-white" title="Fällige Verträge als Buchung anlegen">Fixkosten buchen</button>
                    <button onclick={() => transactionModal?.open()} class="orga-button-primary py-2 px-4 text-xs shadow-indigo-600/20">+ Buchung</button>
                </div>
            </div>
            <div class="overflow-y-auto custom-scrollbar max-h-125">
                {#if financeService.transactions.length === 0}
                    <p class="p-8 text-center text-neutral-400 italic">Noch keine Buchungen erfasst.</p>
                {:else}
                    <div class="divide-y divide-neutral-50">
                            {#each financeService.transactions as t}
                            <div class="p-4 hover:bg-neutral-50/50 transition-colors group flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div class="flex items-center gap-3 min-w-0">
                                    <span class="w-8 h-8 rounded-full flex items-center justify-center text-lg {t.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'} shrink-0">{t.type === 'income' ? '➕' : '➖'}</span>
                                    <div class="min-w-0">
                                        <p class="font-bold text-neutral-900 truncate">{t.title}</p>
                                        <p class="text-xs text-neutral-500 truncate">{new Date(t.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
                                    </div>
                                </div>
                                <div class="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto mt-1 sm:mt-0 pt-3 sm:pt-0 border-t border-neutral-100 sm:border-t-0">
                                    <div class="text-left sm:text-right shrink-0">
                                        <p class="font-bold {t.type === 'income' ? 'text-emerald-700' : 'text-rose-700'}">{t.amount.toFixed(2).replace('.', ',')} €</p>
                                        {#if t.is_installment}
                                            <p class="text-[10px] text-neutral-500 mt-0.5">
                                                Rate {t.installment_current || 1} / {t.installment_total_count || '?'} 
                                                {#if t.installment_total_amount}
                                                    <br>(Gesamt: {t.installment_total_amount.toFixed(2).replace('.',',')} €)
                                                {/if}
                                            </p>
                                        {/if}
                                    </div>
                                    <div class="flex items-center gap-1 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                        {#if t.receipt}<a href={pb.files.getURL(t, t.receipt)} target="_blank" class="p-1.5 text-lg hover:scale-110 transition-transform inline-block" title="Beleg ansehen">🧾</a>{/if}
                                        {#if t.is_installment && (t.installment_current || 1) < (t.installment_total_count || 999)}
                                            <button onclick={() => bookNextInstallment(t)} class="px-2.5 py-1.5 text-[10px] sm:text-xs font-bold bg-emerald-100 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded-lg transition-colors shadow-sm" title="Nächste Rate buchen">💰 Zahlen</button>
                                        {/if}
                                        <button onclick={() => transactionModal?.open(t)} class="p-1.5 text-neutral-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors" title="Bearbeiten">✎</button>
                                        <button onclick={() => handleDeleteTransaction(t.id)} class="p-1.5 text-neutral-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 transition-colors" title="Löschen">✕</button>
                                    </div>
                                </div>
                            </div>
                            {/each}
                    </div>
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
                    <div class="divide-y divide-neutral-50">
                            {#each financeService.contracts as c}
                            <div class="p-4 hover:bg-neutral-50/50 transition-colors group flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div class="flex items-center gap-3 min-w-0">
                                    <span class="w-8 h-8 rounded-full flex items-center justify-center text-lg bg-blue-50 text-blue-600 shrink-0">📜</span>
                                    <div class="min-w-0">
                                        <p class="font-bold text-neutral-900 truncate">{c.title}</p>
                                        <p class="text-xs text-neutral-500 truncate">{c.partner || 'Unbekannter Partner'}</p>
                                    </div>
                                </div>
                                <div class="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto mt-1 sm:mt-0 pt-3 sm:pt-0 border-t border-neutral-100 sm:border-t-0">
                                    <div class="text-left sm:text-right shrink-0">
                                        <p class="font-bold text-neutral-800">{c.amount.toFixed(2).replace('.', ',')} €</p>
                                        <p class="text-[10px] text-neutral-500 capitalize mt-0.5">{c.interval}</p>
                                    </div>
                                    <div class="flex items-center gap-1 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                        <button onclick={() => bookContractManually(c)} class="px-2.5 py-1.5 text-[10px] sm:text-xs font-bold bg-indigo-100 text-indigo-700 hover:bg-indigo-600 hover:text-white rounded-lg transition-colors shadow-sm" title="Diesen Vertrag jetzt verbuchen">💸 Buchen</button>
                                        {#if c.document}<a href={pb.files.getURL(c, c.document)} target="_blank" class="p-1.5 text-lg hover:scale-110 transition-transform inline-block" title="Dokument ansehen">📄</a>{/if}
                                        <button onclick={() => contractModal?.open(c)} class="p-1.5 text-neutral-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors" title="Bearbeiten">✎</button>
                                        <button onclick={() => handleDeleteContract(c.id)} class="p-1.5 text-neutral-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 transition-colors" title="Löschen">✕</button>
                                    </div>
                                </div>
                            </div>
                            {/each}
                    </div>
                {/if}
            </div>
        </div>
    </div>
{/if}

<PersonalTransactionModal bind:this={transactionModal} onSave={financeService.addTransaction} onUpdate={financeService.updateTransaction} />
<PersonalContractModal bind:this={contractModal} onSave={financeService.addContract} onUpdate={financeService.updateContract} />