<script lang="ts">
    import { formatCurrency } from "./bwaTaxCalculations";

    interface Props {
        kpiMode: 'month' | 'forecast';
        activeMonthName: string;
        activeMonthShort: string;
        activeTax: any;
        forecastSummary: {
            totalTax12M: number;
            avgMonthlyTax: number;
            totalErtrag12M: number;
            totalUst12M: number;
            avgEffectiveRate: number;
        };
        onToggleKpiMode: (mode: 'month' | 'forecast') => void;
    }

    let {
        kpiMode,
        activeMonthName,
        activeMonthShort,
        activeTax,
        forecastSummary,
        onToggleKpiMode
    }: Props = $props();
</script>

<div class="mb-5">
    <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-2">
            <span class="text-xs font-bold text-neutral-700 dark:text-slate-300 flex items-center gap-1.5">
                {#if kpiMode === 'month'}
                    <span>📅</span> Kennzahlen für: <span class="text-amber-600 dark:text-amber-400 font-extrabold">{activeMonthName}</span>
                {:else}
                    <span>🔮</span> Kennzahlen für: <span class="text-indigo-600 dark:text-indigo-400 font-extrabold">12-Monats-Prognose (Zukunft)</span>
                {/if}
            </span>
        </div>

        <div class="flex bg-neutral-100 dark:bg-slate-800 p-0.5 rounded-lg border border-neutral-200/70 dark:border-slate-700 text-[10px] font-bold">
            <button 
                type="button"
                onclick={() => onToggleKpiMode('month')} 
                class="px-2.5 py-1.5 rounded-md transition-all touch-manipulation active:scale-95 cursor-pointer min-h-[36px] flex items-center justify-center {kpiMode === 'month' ? 'bg-white dark:bg-slate-700 shadow-xs text-neutral-900 dark:text-white font-extrabold' : 'text-neutral-500 dark:text-slate-400 hover:text-neutral-800 dark:hover:text-slate-200'}"
                title="Zeigt die Steuern des aktuell ausgewählten Monats"
            >
                Monat {activeMonthShort}
            </button>
            <button 
                type="button"
                onclick={() => onToggleKpiMode('forecast')} 
                class="px-2.5 py-1.5 rounded-md transition-all touch-manipulation active:scale-95 cursor-pointer min-h-[36px] flex items-center justify-center {kpiMode === 'forecast' ? 'bg-white dark:bg-slate-700 shadow-xs text-neutral-900 dark:text-white font-extrabold' : 'text-neutral-500 dark:text-slate-400 hover:text-neutral-800 dark:hover:text-slate-200'}"
                title="Zeigt die Durchschnitts- und Gesamtsummen der 12-Monats-Prognose"
            >
                12M Prognose
            </button>
        </div>
    </div>

    <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
        <!-- 1. Steuerabgabe / Gesamt -->
        <div class="p-3 bg-neutral-50 dark:bg-slate-800/70 rounded-2xl border border-neutral-100 dark:border-slate-800 transition-all">
            <span class="text-[10px] font-bold text-neutral-400 dark:text-slate-400 uppercase tracking-wider block">
                {kpiMode === 'month' ? `Steuerabgabe (${activeMonthShort})` : 'Prognose 12M Gesamt'}
            </span>
            <span class="text-base sm:text-xl font-black text-rose-600 dark:text-rose-400 truncate block mt-0.5">
                {kpiMode === 'month' ? formatCurrency(activeTax.gesamteAbgaben) : formatCurrency(forecastSummary.totalTax12M)}
            </span>
            <span class="text-[9px] text-neutral-400 dark:text-slate-500 font-medium">
                {kpiMode === 'month' ? 'Finanzamt fällig' : 'Finanzamt-Abgaben'}
            </span>
        </div>

        <!-- 2. Monatsrücklage -->
        <div class="p-3 bg-neutral-50 dark:bg-slate-800/70 rounded-2xl border border-neutral-100 dark:border-slate-800 transition-all">
            <span class="text-[10px] font-bold text-neutral-400 dark:text-slate-400 uppercase tracking-wider block">
                {kpiMode === 'month' ? `Monatsrücklage (${activeMonthShort})` : 'Monatsrücklage Ø'}
            </span>
            <span class="text-base sm:text-xl font-black text-amber-600 dark:text-amber-400 truncate block mt-0.5">
                {kpiMode === 'month' ? formatCurrency(activeTax.ertragsteuern) : formatCurrency(forecastSummary.avgMonthlyTax)}
            </span>
            <span class="text-[9px] text-neutral-400 dark:text-slate-500 font-medium">
                {kpiMode === 'month' ? 'ESt + GewSt Rücklage' : 'Empfohlener Puffer'}
            </span>
        </div>

        <!-- 3. Davon USt-Zahllast -->
        <div class="p-3 bg-neutral-50 dark:bg-slate-800/70 rounded-2xl border border-neutral-100 dark:border-slate-800 transition-all">
            <span class="text-[10px] font-bold text-neutral-400 dark:text-slate-400 uppercase tracking-wider block">
                {kpiMode === 'month' ? `Davon USt-Zahllast (${activeMonthShort})` : 'Davon USt-Zahllast'}
            </span>
            <span class="text-base sm:text-xl font-black text-indigo-600 dark:text-indigo-400 truncate block mt-0.5">
                {kpiMode === 'month' ? (activeTax.ustZahllast >= 0 ? formatCurrency(activeTax.ustZahllast) : `+${formatCurrency(Math.abs(activeTax.ustZahllast))} Guthaben`) : formatCurrency(forecastSummary.totalUst12M)}
            </span>
            <span class="text-[9px] text-neutral-400 dark:text-slate-500 font-medium">
                {kpiMode === 'month' ? (activeTax.ustZahllast >= 0 ? 'UStVA Zahllast' : 'Vorsteuerüberhang') : 'UStVA 12 Monate'}
            </span>
        </div>

        <!-- 4. Ertragssteuerquote -->
        <div class="p-3 bg-neutral-50 dark:bg-slate-800/70 rounded-2xl border border-neutral-100 dark:border-slate-800 transition-all">
            <span class="text-[10px] font-bold text-neutral-400 dark:text-slate-400 uppercase tracking-wider block">
                {kpiMode === 'month' ? `Ertragssteuerquote (${activeMonthShort})` : 'Ertragssteuerquote'}
            </span>
            <span class="text-base sm:text-xl font-black text-neutral-800 dark:text-slate-100 truncate block mt-0.5">
                {kpiMode === 'month' ? `~${activeTax.effectiveRate.toFixed(1)}%` : `~${forecastSummary.avgEffectiveRate.toFixed(1)}%`}
            </span>
            <span class="text-[9px] text-neutral-400 dark:text-slate-500 font-medium">
                {kpiMode === 'month' ? 'Auf Vorsteuergewinn' : 'ESt + GewSt auf Gewinn'}
            </span>
        </div>
    </div>
</div>
