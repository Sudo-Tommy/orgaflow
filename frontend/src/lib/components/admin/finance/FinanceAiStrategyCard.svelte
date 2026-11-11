<script lang="ts">
    interface Props {
        strat: {
            summary_headline?: string;
            confidence_overall?: number;
            growth_trajectory?: string;
            seasonal_patterns?: string;
            liquidity_risks?: string[];
            optimization_tips?: string[];
        };
    }

    let { strat }: Props = $props();
</script>

<div class="mb-5 bg-gradient-to-br from-purple-900/5 via-indigo-900/5 to-white dark:from-purple-950/40 dark:via-slate-900 dark:to-slate-900 border border-purple-200/80 dark:border-purple-850 rounded-2xl p-4 sm:p-5 shrink-0 shadow-xs relative overflow-hidden">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-2.5 border-b border-purple-100 dark:border-purple-900/50">
        <div class="flex items-center gap-2">
            <span class="text-lg">🧠</span>
            <div>
                <h3 class="text-sm sm:text-base font-black text-purple-950 dark:text-purple-200 flex items-center gap-2">
                    <span>{strat.summary_headline || 'Strategische Zukunfts-Spekulation'}</span>
                    <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200 border border-purple-200 dark:border-purple-800">
                        Gemini 3.8 Flash • {strat.confidence_overall || 90}% Konfidenz
                    </span>
                </h3>
                <p class="text-xs text-purple-800/80 dark:text-purple-300/80 mt-0.5 font-medium">
                    Trajektorie: <strong class="text-purple-950 dark:text-purple-100 font-bold">{strat.growth_trajectory}</strong> | Saisonalität: {strat.seasonal_patterns}
                </p>
            </div>
        </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <!-- Risiken & Liquiditätswarnungen -->
        <div class="bg-white/80 dark:bg-slate-800/80 border border-purple-100/80 dark:border-purple-900/60 rounded-xl p-3 shadow-2xs">
            <span class="font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1.5 mb-1.5">
                <span>⚠️</span> Identifizierte Risiken & Steuerpuffer
            </span>
            <ul class="space-y-1 text-neutral-700 dark:text-slate-300">
                {#each strat.liquidity_risks || [] as risk}
                    <li class="flex items-start gap-1.5">
                        <span class="text-rose-500 font-bold">•</span>
                        <span>{risk}</span>
                    </li>
                {/each}
            </ul>
        </div>

        <!-- Optimierungs- & Handlungshebel -->
        <div class="bg-white/80 dark:bg-slate-800/80 border border-purple-100/80 dark:border-purple-900/60 rounded-xl p-3 shadow-2xs">
            <span class="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 mb-1.5">
                <span>💡</span> Konkrete Hebel für Gewinn & Cashflow
            </span>
            <ul class="space-y-1 text-neutral-700 dark:text-slate-300">
                {#each strat.optimization_tips || [] as tip}
                    <li class="flex items-start gap-1.5">
                        <span class="text-emerald-600 font-bold">•</span>
                        <span>{tip}</span>
                    </li>
                {/each}
            </ul>
        </div>
    </div>
</div>
