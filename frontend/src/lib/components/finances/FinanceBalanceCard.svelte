<script lang="ts">
    let {
        periodStats,
        maxBalanceVal = 1,
        onOpenMonthModal = () => {}
    }: {
        periodStats: any;
        maxBalanceVal?: number;
        onOpenMonthModal?: () => void;
    } = $props();

    function formatCurrency(val: number) {
        return (val || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
    }
</script>

<div class="bg-white rounded-2xl sm:rounded-3xl border border-neutral-100 shadow-sm flex flex-col p-4 sm:p-6 group hover:shadow-md transition-shadow justify-between">
    <div>
        <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-3">
                <span class="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-base shadow-inner shrink-0">⚖️</span>
                <div>
                    <h3 class="font-bold text-neutral-900 text-base sm:text-lg leading-tight">Haushalts-Balance</h3>
                    <p class="text-[11px] text-neutral-400 font-medium">Echtzeit-Gegenüberstellung Einnahmen vs. Ausgaben</p>
                </div>
            </div>
            <div class="flex items-center gap-2">
                {#if periodStats.income > 0}
                    <span class="px-2.5 py-1 rounded-xl text-xs font-black {periodStats.savingsRate >= 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}">
                        {periodStats.savingsRate >= 0 ? '+' : ''}{periodStats.savingsRate.toFixed(1)}% Sparquote
                    </span>
                {/if}
                <button onclick={onOpenMonthModal} class="w-9 h-9 rounded-xl bg-neutral-50 hover:bg-indigo-50 text-neutral-400 hover:text-indigo-600 flex items-center justify-center transition-colors" title="Monatsbericht öffnen">
                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                </button>
            </div>
        </div>

        <div class="p-4 rounded-2xl mb-4 border {periodStats.balance >= 0 ? 'bg-emerald-50/50 border-emerald-100/80' : 'bg-rose-50/50 border-rose-100/80'} flex items-center justify-between">
            <div>
                <span class="text-[10px] font-bold uppercase tracking-wider block {periodStats.balance >= 0 ? 'text-emerald-700' : 'text-rose-700'}">
                    Haushalts-Saldo {periodStats.balance >= 0 ? '(Überschuss)' : '(Defizit)'}
                </span>
                <span class="text-2xl sm:text-3xl font-black {periodStats.balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}">
                    {formatCurrency(periodStats.balance)}
                </span>
            </div>
            <div class="text-right text-xs">
                <span class="text-neutral-400 text-[10px] block font-medium">Gesamteinnahmen</span>
                <span class="font-bold text-neutral-700">{formatCurrency(periodStats.income)}</span>
            </div>
        </div>

        <div class="mb-4">
            <div class="flex items-center justify-between text-xs font-bold mb-1.5">
                <span class="text-emerald-600 flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-emerald-500"></span> Einnahmen: {formatCurrency(periodStats.income)}</span>
                <span class="text-rose-600 flex items-center gap-1.5">Ausgaben: {formatCurrency(periodStats.expense)} <span class="w-2 h-2 rounded-full bg-rose-500"></span></span>
            </div>
            <div class="w-full h-3.5 bg-neutral-100 rounded-full overflow-hidden flex shadow-inner">
                <div class="h-full bg-emerald-500 transition-all duration-1000" style="width: {periodStats.income > 0 ? Math.min(100, (periodStats.income / maxBalanceVal) * 100) : 0}%"></div>
                <div class="h-full bg-rose-500 transition-all duration-1000" style="width: {periodStats.expense > 0 ? Math.min(100, (periodStats.expense / maxBalanceVal) * 100) : 0}%"></div>
            </div>
        </div>

        <div class="space-y-2.5 pt-3 border-t border-neutral-100">
            <span class="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Kosten- & Ausgabenstruktur</span>
            <div class="flex items-center justify-between text-xs">
                <span class="text-neutral-600 font-medium flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-amber-500"></span> Feste Verträge & Fixkosten</span>
                <div class="flex items-center gap-2">
                    <span class="text-neutral-400 text-[10px]">({periodStats.income > 0 ? ((periodStats.contractExpenses / periodStats.income) * 100).toFixed(0) : 0}%)</span>
                    <span class="font-bold text-neutral-900">{formatCurrency(periodStats.contractExpenses)}</span>
                </div>
            </div>
            <div class="flex items-center justify-between text-xs">
                <span class="text-neutral-600 font-medium flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-rose-400"></span> Variable Ausgaben</span>
                <div class="flex items-center gap-2">
                    <span class="text-neutral-400 text-[10px]">({periodStats.income > 0 ? ((periodStats.variableExpenses / periodStats.income) * 100).toFixed(0) : 0}%)</span>
                    <span class="font-bold text-neutral-900">{formatCurrency(periodStats.variableExpenses)}</span>
                </div>
            </div>
            <div class="p-3 bg-neutral-900 text-white rounded-2xl border border-neutral-800 flex items-center justify-between text-xs mt-2">
                <div>
                    <span class="text-[10px] font-bold text-neutral-400 block uppercase">Freier Haushaltsüberschuss</span>
                    <span class="text-base font-black {periodStats.balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}">{formatCurrency(periodStats.balance)}</span>
                </div>
                <div class="text-right">
                    <span class="text-[10px] font-bold text-neutral-400 block uppercase">Verfügbare Sparquote</span>
                    <span class="text-base font-black {periodStats.savingsRate >= 0 ? 'text-indigo-300' : 'text-rose-400'}">{periodStats.savingsRate.toFixed(1).replace('.', ',')} %</span>
                </div>
            </div>
        </div>
    </div>
</div>
