<script lang="ts">
    let { 
        isOpen = $bindable(false), 
        monthData = null,
        onClose = () => {}
    } = $props<any>();

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

{#if isOpen && monthData}
    <div class="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/65 backdrop-blur-md animate-enter">
        <div class="bg-white dark:bg-slate-900 w-[96vw] max-w-5xl max-h-[92vh] rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-slate-100 flex flex-col overflow-hidden">
            <!-- Modal Header -->
            <div class="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40 shrink-0">
                <div class="flex items-center gap-3">
                    <span class="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xl shadow-inner shrink-0">📅</span>
                    <div>
                        <div class="flex items-center gap-2">
                            <h2 class="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100 leading-tight">
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
                    class="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors shadow-xs border border-slate-200/60 dark:border-slate-700 touch-manipulation active:scale-95"
                    title="Schließen"
                >
                    ✕
                </button>
            </div>

            <!-- Modal Body (Scrollable) -->
            <div class="p-4 sm:p-6 overflow-y-auto custom-scrollbar space-y-6 flex-1">
                <!-- Top KPI Cards -->
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div class="p-3.5 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-2xl border border-emerald-100 dark:border-emerald-900/50">
                        <span class="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">Einnahmen</span>
                        <span class="text-lg sm:text-2xl font-black text-emerald-700 dark:text-emerald-300 truncate block mt-0.5">{formatCurrency(income)}</span>
                        <span class="text-[9px] text-emerald-600/80 dark:text-emerald-400/80 font-medium">Monatszuflüsse</span>
                    </div>
                    <div class="p-3.5 bg-rose-50/60 dark:bg-rose-950/30 rounded-2xl border border-rose-100 dark:border-rose-900/50">
                        <span class="text-[10px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider block">Gesamtausgaben</span>
                        <span class="text-lg sm:text-2xl font-black text-rose-700 dark:text-rose-300 truncate block mt-0.5">{formatCurrency(expense)}</span>
                        <span class="text-[9px] text-rose-600/80 dark:text-rose-400/80 font-medium">Fixkosten & Variabel</span>
                    </div>
                    <div class="p-3.5 bg-indigo-50/60 dark:bg-indigo-950/30 rounded-2xl border border-indigo-100 dark:border-indigo-900/50">
                        <span class="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider block">Haushalts-Saldo</span>
                        <span class="text-lg sm:text-2xl font-black truncate block mt-0.5 {balance >= 0 ? 'text-indigo-900 dark:text-indigo-300' : 'text-rose-700 dark:text-rose-400'}">
                            {formatCurrency(balance)}
                        </span>
                        <span class="text-[9px] text-indigo-600/80 dark:text-indigo-400/80 font-medium">{balance >= 0 ? 'Monatsüberschuss' : 'Monatsdefizit'}</span>
                    </div>
                    <div class="p-3.5 bg-amber-50/60 dark:bg-amber-950/30 rounded-2xl border border-amber-100 dark:border-amber-900/50">
                        <span class="text-[10px] font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider block">Sparquote</span>
                        <span class="text-lg sm:text-2xl font-black truncate block mt-0.5 {savingsRate >= 0 ? 'text-amber-800 dark:text-amber-300' : 'text-rose-700 dark:text-rose-400'}">
                            {savingsRate.toFixed(1).replace('.', ',')} %
                        </span>
                        <span class="text-[9px] text-amber-700/80 dark:text-amber-400/80 font-medium">Vom Gesamteinkommen</span>
                    </div>
                </div>

                <!-- Strukturierte Tabellen-Gegenüberstellung -->
                <div class="orga-table-container">
                    <div class="overflow-x-auto custom-scrollbar">
                        <table class="w-full text-left text-sm min-w-[550px] tabular-nums">
                            <thead class="bg-slate-100/95 dark:bg-slate-800/95 text-slate-700 dark:text-slate-200 font-bold uppercase tracking-wider text-xs border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                    <th class="px-5 py-3.5">Haushalts-Posten / Kategorie</th>
                                    <th class="px-5 py-3.5 text-right">Betrag</th>
                                    <th class="px-5 py-3.5 text-right">Anteil Einnahmen</th>
                                    <th class="px-5 py-3.5 text-right">Typ</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-slate-900">
                                <!-- Einnahmen -->
                                <tr class="bg-emerald-50/50 dark:bg-emerald-950/40 font-bold text-emerald-950 dark:text-emerald-200">
                                    <td class="px-5 py-3 flex items-center gap-2 font-bold">
                                        <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                                        Einnahmen Gesamt
                                    </td>
                                    <td class="px-5 py-3 text-right font-black">{formatCurrency(income)}</td>
                                    <td class="px-5 py-3 text-right font-semibold">100,0 %</td>
                                    <td class="px-5 py-3 text-right text-xs uppercase font-bold text-emerald-600 dark:text-emerald-400">Zufluss</td>
                                </tr>

                                <!-- Fixkosten & Verträge -->
                                <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                                    <td class="px-5 py-3 pl-9 text-slate-800 dark:text-slate-200 font-medium flex items-center gap-2">
                                        <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                        Feste Verträge & Daueraufträge (Fixkosten)
                                    </td>
                                    <td class="px-5 py-3 text-right font-bold text-slate-900 dark:text-slate-100">{formatCurrency(contractExp)}</td>
                                    <td class="px-5 py-3 text-right text-slate-600 dark:text-slate-300 font-medium">{income > 0 ? (contractExp / income * 100).toFixed(1).replace('.', ',') + ' %' : '-'}</td>
                                    <td class="px-5 py-3 text-right text-xs text-amber-700 dark:text-amber-400 font-bold">Fix</td>
                                </tr>

                                <!-- Variable Ausgaben -->
                                <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                                    <td class="px-5 py-3 pl-9 text-slate-800 dark:text-slate-200 font-medium flex items-center gap-2">
                                        <span class="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                                        Variable Lebenshaltung & Einkäufe
                                    </td>
                                    <td class="px-5 py-3 text-right font-bold text-slate-900 dark:text-slate-100">{formatCurrency(variableExp)}</td>
                                    <td class="px-5 py-3 text-right text-slate-600 dark:text-slate-300 font-medium">{income > 0 ? (variableExp / income * 100).toFixed(1).replace('.', ',') + ' %' : '-'}</td>
                                    <td class="px-5 py-3 text-right text-xs text-slate-600 dark:text-slate-400 font-bold">Variabel</td>
                                </tr>

                                <!-- Summe Ausgaben -->
                                <tr class="bg-rose-50/50 dark:bg-rose-950/40 font-bold text-rose-950 dark:text-rose-200 border-t border-rose-100 dark:border-rose-900/60">
                                    <td class="px-5 py-3 flex items-center gap-2 font-bold">
                                        <span class="w-2 h-2 rounded-full bg-rose-500"></span>
                                        Gesamtausgaben
                                    </td>
                                    <td class="px-5 py-3 text-right font-black">{formatCurrency(expense)}</td>
                                    <td class="px-5 py-3 text-right font-semibold">{income > 0 ? (expense / income * 100).toFixed(1).replace('.', ',') + ' %' : '-'}</td>
                                    <td class="px-5 py-3 text-right text-xs uppercase font-bold text-rose-600 dark:text-rose-400">Abfluss</td>
                                </tr>

                                <!-- Hero Saldo Zeile -->
                                <tr class="bg-slate-900 dark:bg-slate-950 text-white font-black text-sm">
                                    <td class="px-5 py-4">Freier Haushaltsüberschuss (Netto-Saldo)</td>
                                    <td class="px-5 py-4 text-right text-base {balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}">{formatCurrency(balance)}</td>
                                    <td class="px-5 py-4 text-right text-slate-300 text-xs font-semibold">{savingsRate.toFixed(1).replace('.', ',')} % Sparquote</td>
                                    <td class="px-5 py-4 text-right text-xs text-indigo-300 uppercase tracking-wider font-bold">Ergebnis</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Einzelbuchungen des Monats -->
                {#if transactions.length > 0}
                    <div>
                        <h4 class="font-bold text-slate-900 dark:text-slate-100 text-sm mb-3 flex items-center gap-2">
                            <span>📝</span> Buchungen dieses Monats ({transactions.length})
                        </h4>
                        <div class="orga-table-container">
                            <div class="overflow-x-auto custom-scrollbar max-h-60">
                                <table class="w-full text-left text-sm min-w-[500px] tabular-nums">
                                    <thead class="bg-slate-100/95 dark:bg-slate-800/95 text-slate-700 dark:text-slate-200 font-bold uppercase tracking-wider text-xs border-b border-slate-200 dark:border-slate-700 sticky top-0">
                                        <tr>
                                            <th class="px-4 py-3">Datum</th>
                                            <th class="px-4 py-3">Titel</th>
                                            <th class="px-4 py-3">Kategorie</th>
                                            <th class="px-4 py-3 text-right">Betrag</th>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-slate-900">
                                        {#each transactions as t}
                                            <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                                                <td class="px-4 py-2.5 text-slate-600 dark:text-slate-300 text-xs font-semibold whitespace-nowrap">{formatDate(t.date)}</td>
                                                <td class="px-4 py-2.5 font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                                    {#if t.source === 'accounting' || t.is_invoice}
                                                        <span class="text-xs font-bold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800 shrink-0">📄 RE</span>
                                                    {/if}
                                                    <span class="truncate">{t.title}</span>
                                                </td>
                                                <td class="px-4 py-2.5">
                                                    <span class="px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
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
            <div class="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 flex items-center justify-between shrink-0">
                <span class="text-xs text-slate-500 dark:text-slate-400 font-medium">OrgaFlow Haushaltsbuch Auswertung</span>
                <button 
                    onclick={close}
                    class="orga-button-primary px-5 py-2 text-xs font-bold rounded-xl shadow-xs transition-all touch-manipulation active:scale-95"
                >
                    Schließen
                </button>
            </div>
        </div>
    </div>
{/if}
