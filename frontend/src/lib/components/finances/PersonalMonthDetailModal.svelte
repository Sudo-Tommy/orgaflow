<script lang="ts">
    import { X } from 'lucide-svelte';

    let { 
        isOpen = $bindable(false), 
        monthData = null,
        onClose = () => {}
    } = $props<any>();

    let dialog = $state<HTMLDialogElement>();

    $effect(() => {
        if (isOpen && monthData && dialog && !dialog.open) {
            dialog.showModal();
        } else if ((!isOpen || !monthData) && dialog && dialog.open) {
            dialog.close();
        }
    });

    function formatCurrency(val: number) {
        return (val || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
    }

    function formatDate(dStr: string) {
        if (!dStr) return '-';
        return new Date(dStr).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }

    let income = $derived(monthData?.income || 0);
    let expense = $derived(monthData?.expenses || monthData?.expense || 0);
    let balance = $derived(income - expense);
    let savingsRate = $derived(income > 0 ? (balance / income) * 100 : 0);
    let contractExp = $derived(monthData?.contractExpenses || 0);
    let variableExp = $derived(monthData?.variableExpenses || (expense - contractExp));
    let transactions = $derived(monthData?.transactions || []);

    function close() {
        isOpen = false;
        onClose();
    }
</script>

<dialog
    bind:this={dialog}
    class="zero-inner-scroll-modal p-0 bg-transparent backdrop:bg-slate-900/40 backdrop:backdrop-blur-sm w-full max-w-3xl mx-auto my-auto rounded-3xl outline-none border-none shadow-2xl"
    onclick={(e) => { if (e.target === dialog) close(); }}
    oncancel={(e) => { e.preventDefault(); close(); }}
>
    {#if isOpen && monthData}
        <div class="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-slate-100 animate-enter my-auto">
            <!-- Modal Header -->
            <div class="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between rounded-t-3xl">
                <div class="flex items-center gap-3">
                    <span class="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xl shadow-inner shrink-0">📅</span>
                    <div>
                        <div class="flex items-center gap-2">
                            <h2 class="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
                                Haushaltsbericht: {monthData.month || monthData.monthName}
                            </h2>
                            <span class="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md {monthData.isHistorical ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' : 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'}">
                                {monthData.isHistorical ? 'Reale Ist-Daten' : 'Prognose'}
                            </span>
                        </div>
                        <p class="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">Detaillierte Monatsauswertung aller Einnahmen, Verträge und Ausgaben.</p>
                    </div>
                </div>
                <button 
                    onclick={close}
                    class="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 flex items-center justify-center transition cursor-pointer shrink-0"
                    title="Schließen"
                    aria-label="Schließen"
                >
                    <X class="h-4 w-4" />
                </button>
            </div>

            <!-- Modal Content -->
            <div class="p-4 sm:p-5 space-y-5">
                <!-- KPI Kennzahlen -->
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                    <div class="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-800/60">
                        <span class="text-xs font-bold text-emerald-800 dark:text-emerald-300 block mb-1">Einnahmen</span>
                        <span class="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(income)}</span>
                    </div>
                    <div class="p-4 rounded-2xl bg-rose-50/50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-800/60">
                        <span class="text-xs font-bold text-rose-800 dark:text-rose-300 block mb-1">Gesamtausgaben</span>
                        <span class="text-base sm:text-lg font-black text-rose-600 dark:text-rose-400">{formatCurrency(expense)}</span>
                    </div>
                    <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                        <span class="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Monats-Saldo</span>
                        <span class="text-base sm:text-lg font-black {balance >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-600 dark:text-rose-400'}">
                            {formatCurrency(balance)}
                        </span>
                    </div>
                    <div class="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-800/60">
                        <span class="text-xs font-bold text-indigo-800 dark:text-indigo-300 block mb-1">Sparquote</span>
                        <span class="text-base sm:text-lg font-black text-indigo-600 dark:text-indigo-400">{savingsRate.toFixed(1)} %</span>
                    </div>
                </div>

                <!-- Fixkosten vs Variable Kosten -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="p-4 rounded-2xl bg-slate-50/60 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                        <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
                            <span>📄 Feste Vertragskosten (Fixkosten)</span>
                            <span class="text-slate-700 dark:text-slate-300 font-bold">{formatCurrency(contractExp)}</span>
                        </h3>
                        <p class="text-xs text-slate-500">Miete, Versicherungen, Sparpläne und wiederkehrende Verträge.</p>
                    </div>

                    <div class="p-4 rounded-2xl bg-slate-50/60 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                        <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
                            <span>🛒 Variable Ausgaben</span>
                            <span class="text-slate-700 dark:text-slate-300 font-bold">{formatCurrency(variableExp)}</span>
                        </h3>
                        <p class="text-xs text-slate-500">Lebensmittel, Freizeit, Mobilität und sonstige Konsumausgaben.</p>
                    </div>
                </div>

                <!-- Buchungen in diesem Monat -->
                {#if transactions.length > 0}
                    <div>
                        <h3 class="text-sm font-bold text-slate-900 dark:text-white mb-3">Erfasste Buchungen im Monat ({transactions.length})</h3>
                        <div class="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                            <div class="max-h-60 overflow-y-auto">
                                <table class="w-full text-left text-xs">
                                    <thead class="bg-slate-50 dark:bg-slate-800/80 text-slate-500 font-bold sticky top-0 border-b border-slate-200 dark:border-slate-800">
                                        <tr>
                                            <th class="px-4 py-2.5">Datum</th>
                                            <th class="px-4 py-2.5">Titel / Partner</th>
                                            <th class="px-4 py-2.5">Kategorie</th>
                                            <th class="px-4 py-2.5 text-right">Betrag</th>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                                        {#each transactions as t}
                                            <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                                                <td class="px-4 py-2.5 text-slate-400 font-medium whitespace-nowrap">{formatDate(t.date || t.created)}</td>
                                                <td class="px-4 py-2.5 font-bold text-slate-800 dark:text-slate-200">{t.title || t.partner || 'Buchung'}</td>
                                                <td class="px-4 py-2.5 text-slate-500">
                                                    <span class="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-bold">
                                                        {t.category || 'Sonstiges'}
                                                    </span>
                                                </td>
                                                <td class="px-4 py-2.5 text-right font-black {t.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}">
                                                    {t.type === 'income' ? '+' : '-'}{formatCurrency(Number(t.amount) || 0)}
                                                </td>
                                            </tr>
                                        {/each}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                {/if}
            </div>

            <!-- Modal Footer -->
            <div class="p-5 sm:p-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span class="text-xs text-slate-500 dark:text-slate-400 font-medium">OrgaFlow Haushaltsbuch Auswertung</span>
                <button 
                    onclick={close}
                    class="orga-button-primary"
                >
                    Schließen
                </button>
            </div>
        </div>
    {/if}
</dialog>
