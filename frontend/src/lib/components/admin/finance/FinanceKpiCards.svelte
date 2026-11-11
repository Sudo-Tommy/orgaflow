<script lang="ts">
    import { formatCurrency } from "./financeFormatUtils";

    interface Props {
        summaryStats: {
            totalProfit: number;
            totalRev: number;
            totalTaxes: number;
            totalBwaNet: number;
            totalPersonalExp: number;
            totalCashflow: number;
            savingsRate: number;
            avgMonthlyCashflow: number;
        };
    }

    let { summaryStats }: Props = $props();
</script>

<div class="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5 shrink-0">
    <!-- BWA Betriebsgewinn -->
    <div class="bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800/60 rounded-2xl p-3.5 flex flex-col justify-between">
        <span class="text-[10px] font-bold text-indigo-900/60 dark:text-indigo-300/80 uppercase tracking-wider block truncate">🏢 BWA Betriebsgewinn</span>
        <span class="text-lg sm:text-xl font-black text-indigo-900 dark:text-indigo-200 mt-1 truncate">
            {formatCurrency(summaryStats.totalProfit)}
        </span>
        <span class="text-[10px] text-indigo-700 dark:text-indigo-400 mt-0.5 truncate">Umsatz: {formatCurrency(summaryStats.totalRev)}</span>
    </div>

    <!-- Geschätzte Steuern -->
    <div class="bg-rose-50/60 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-800/60 rounded-2xl p-3.5 flex flex-col justify-between">
        <span class="text-[10px] font-bold text-rose-900/60 dark:text-rose-300/80 uppercase tracking-wider block truncate">🏛️ Steuern & Abgaben</span>
        <span class="text-lg sm:text-xl font-black text-rose-800 dark:text-rose-300 mt-1 truncate">
            -{formatCurrency(summaryStats.totalTaxes)}
        </span>
        <span class="text-[10px] text-rose-700 dark:text-rose-400 mt-0.5 truncate">ESt, GewSt & USt</span>
    </div>

    <!-- BWA Reingewinn Netto -->
    <div class="bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800/60 rounded-2xl p-3.5 flex flex-col justify-between">
        <span class="text-[10px] font-bold text-emerald-900/60 dark:text-emerald-300/80 uppercase tracking-wider block truncate">💶 Gewerbe-Netto</span>
        <span class="text-lg sm:text-xl font-black text-emerald-700 dark:text-emerald-300 mt-1 truncate">
            {formatCurrency(summaryStats.totalBwaNet)}
        </span>
        <span class="text-[10px] text-emerald-700 dark:text-emerald-400 mt-0.5 truncate">Nach allen Steuern</span>
    </div>

    <!-- Private Ausgaben (Haushaltsbuch) -->
    <div class="bg-amber-50/60 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-800/60 rounded-2xl p-3.5 flex flex-col justify-between">
        <span class="text-[10px] font-bold text-amber-900/60 dark:text-amber-300/80 uppercase tracking-wider block truncate">🏠 Private Lebenshaltung</span>
        <span class="text-lg sm:text-xl font-black text-amber-900 dark:text-amber-300 mt-1 truncate">
            -{formatCurrency(summaryStats.totalPersonalExp)}
        </span>
        <span class="text-[10px] text-amber-700 dark:text-amber-400 mt-0.5 truncate">Fixkosten & Haushalt</span>
    </div>

    <!-- Freier Cashflow Gesamt -->
    <div class="bg-neutral-900 dark:bg-slate-800 text-white rounded-2xl p-3.5 flex flex-col justify-between col-span-2 lg:col-span-1 shadow-md border border-neutral-800 dark:border-slate-700">
        <div class="flex items-center justify-between">
            <span class="text-[10px] font-bold text-neutral-400 dark:text-slate-400 uppercase tracking-wider block truncate">💰 Freier Cashflow</span>
            <span class="text-[10px] font-black px-1.5 py-0.5 rounded {summaryStats.savingsRate >= 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}">
                {summaryStats.savingsRate.toFixed(0)}%
            </span>
        </div>
        <span class="text-lg sm:text-xl font-black {summaryStats.totalCashflow >= 0 ? 'text-emerald-400' : 'text-rose-400'} mt-1 truncate">
            {formatCurrency(summaryStats.totalCashflow)}
        </span>
        <span class="text-[10px] text-neutral-400 dark:text-slate-400 mt-0.5 truncate">Ø {formatCurrency(summaryStats.avgMonthlyCashflow)} / Mon.</span>
    </div>
</div>
