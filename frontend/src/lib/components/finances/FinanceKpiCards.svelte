<script lang="ts">
    let {
        periodStats,
        contractsCount = 0,
        viewMode = 'monthly',
        selectedMonth = 1
    }: {
        periodStats: any;
        contractsCount?: number;
        viewMode?: string;
        selectedMonth?: number;
    } = $props();

    function formatCurrency(val: number) {
        return (val || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
    }
</script>

<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8 animate-enter delay-100">
    <div class="orga-card-white p-4 sm:p-5 flex items-center gap-4 group hover:shadow-md transition-all active:scale-[0.98]">
        <div class="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl shrink-0">📈</div>
        <div class="min-w-0 flex-1">
            <p class="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-0.5 truncate">Einnahmen</p>
            <p class="text-xl sm:text-2xl font-black text-emerald-700 truncate">{formatCurrency(periodStats.income)}</p>
            <div class="flex items-center gap-2 mt-1 text-[11px] text-neutral-500 font-medium">
                <span class="text-emerald-700 font-bold">📄 {formatCurrency(periodStats.invoiceIncome)}</span>
                <span class="text-neutral-300">|</span>
                <span>👤 {formatCurrency(periodStats.personalIncome)}</span>
            </div>
        </div>
    </div>

    <div class="orga-card-white p-4 sm:p-5 flex items-center gap-4 group hover:shadow-md transition-all active:scale-[0.98]">
        <div class="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center text-xl shrink-0">📉</div>
        <div class="min-w-0 flex-1">
            <p class="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-0.5 truncate">Ausgaben</p>
            <p class="text-xl sm:text-2xl font-black text-rose-800 truncate">{formatCurrency(periodStats.expense)}</p>
            <div class="flex items-center gap-2 mt-1 text-[11px] text-neutral-500 font-medium">
                <span class="text-amber-700 font-bold">📜 {formatCurrency(periodStats.contractExpenses)} Fix</span>
                <span class="text-neutral-300">|</span>
                <span class="text-rose-700 font-bold">🛒 {formatCurrency(periodStats.variableExpenses)} Var</span>
            </div>
        </div>
    </div>

    <div class="orga-card-white p-4 sm:p-5 flex items-center gap-4 group hover:shadow-md transition-all active:scale-[0.98]">
        <div class="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl shrink-0">💰</div>
        <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5 mb-0.5">
                <p class="text-xs font-bold text-neutral-400 uppercase tracking-wider truncate">Haushalts-Saldo</p>
                {#if periodStats.income > 0}
                    <span class="text-[10px] font-black px-1.5 py-0.2 rounded {periodStats.savingsRate >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}">
                        {periodStats.savingsRate.toFixed(0)}%
                    </span>
                {/if}
            </div>
            <p class="text-xl sm:text-2xl font-black truncate {periodStats.balance >= 0 ? 'text-indigo-950' : 'text-rose-900'}">
                {formatCurrency(periodStats.balance)}
            </p>
            <p class="text-[11px] font-semibold text-neutral-400 mt-1 truncate">
                {periodStats.balance >= 0 ? 'Sparüberschuss' : 'Monatsdefizit'}
            </p>
        </div>
    </div>

    <div class="orga-card-white p-4 sm:p-5 flex items-center gap-4 group hover:shadow-md transition-all active:scale-[0.98]">
        <div class="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl shrink-0">📜</div>
        <div class="min-w-0 flex-1">
            <p class="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-0.5 truncate">Vertrags-Fixkosten</p>
            <p class="text-xl sm:text-2xl font-black text-amber-800 truncate">{formatCurrency(periodStats.totalMonthlyContracts)}</p>
            <p class="text-[11px] font-semibold text-amber-700 mt-1 truncate">{contractsCount} laufende Verträge</p>
        </div>
    </div>
</div>
