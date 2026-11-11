<script lang="ts">
    import { formatCurrency } from "./bwaTaxCalculations";

    interface Props {
        selectedMonthDetail: any;
        taxScenario: string;
        onSelectMonth?: (month: number, year: number) => void;
        onClose: () => void;
    }

    let {
        selectedMonthDetail,
        taxScenario,
        onSelectMonth,
        onClose
    }: Props = $props();

    const dTax = $derived(selectedMonthDetail?.tax);
</script>

{#if selectedMonthDetail && dTax}
    <div class="mt-4 p-4 bg-neutral-50/90 dark:bg-slate-800/90 rounded-2xl border border-neutral-200/80 dark:border-slate-700 animate-enter relative">
        <button 
            type="button"
            onclick={onClose} 
            class="absolute top-3 right-3 w-8 h-8 bg-white dark:bg-slate-700 hover:bg-neutral-200 dark:hover:bg-slate-600 text-neutral-500 dark:text-slate-300 rounded-full flex items-center justify-center text-xs shadow-sm transition-colors cursor-pointer min-h-[44px] min-w-[44px] touch-manipulation"
            title="Schließen"
        >
            ✕
        </button>

        <div class="flex flex-col sm:flex-row sm:items-center justify-between mb-3 pr-10 gap-2">
            <div>
                <h4 class="font-black text-neutral-900 dark:text-white text-sm sm:text-base flex items-center gap-2">
                    <span>📅</span> Steuer-Detail: {selectedMonthDetail.month}
                    <span class="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded {selectedMonthDetail.isHistorical ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300' : 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300'}">
                        {selectedMonthDetail.isHistorical ? 'Reale Ist-Daten' : `Prognose (${taxScenario})`}
                    </span>
                </h4>
                <p class="text-[11px] text-neutral-500 dark:text-slate-400 mt-0.5">Basis: Vorläufiger Gewinn {formatCurrency(selectedMonthDetail.profit)} bei {formatCurrency(selectedMonthDetail.rev)} Erlösen.</p>
            </div>
            {#if onSelectMonth}
                <button 
                    type="button"
                    onclick={() => onSelectMonth(selectedMonthDetail.monthIndex + 1, selectedMonthDetail.year)} 
                    class="px-3.5 py-2 bg-neutral-900 dark:bg-indigo-600 hover:bg-neutral-800 dark:hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-sm transition-all self-start sm:self-auto touch-manipulation active:scale-95 cursor-pointer min-h-[44px]"
                >
                    BWA {selectedMonthDetail.monthShort} ansehen &rarr;
                </button>
            {/if}
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
            <!-- 1. Ertragssteuern Box -->
            <div class="bg-white dark:bg-slate-900 p-3 rounded-xl border border-neutral-100 dark:border-slate-800 space-y-1">
                <span class="text-[10px] font-bold text-neutral-400 dark:text-slate-400 uppercase block">1. Ertragssteuern</span>
                <div class="flex justify-between">
                    <span class="text-neutral-600 dark:text-slate-300">Einkommensteuer:</span>
                    <span class="font-bold text-neutral-900 dark:text-white">{formatCurrency(dTax.einkommensteuer)}</span>
                </div>
                {#if dTax.gewStAnrechnung > 0}
                    <div class="flex justify-between text-[10px] text-emerald-600 dark:text-emerald-400">
                        <span>§ 35 GewSt-Abzug:</span>
                        <span>-{formatCurrency(dTax.gewStAnrechnung)}</span>
                    </div>
                {/if}
                <div class="flex justify-between">
                    <span class="text-neutral-600 dark:text-slate-300">Gewerbesteuer:</span>
                    <span class="font-bold text-neutral-900 dark:text-white">{formatCurrency(dTax.gewerbesteuer)}</span>
                </div>
                {#if dTax.soli > 0}
                    <div class="flex justify-between">
                        <span class="text-neutral-600 dark:text-slate-300">Solidaritätszuschlag:</span>
                        <span class="font-bold text-neutral-900 dark:text-white">{formatCurrency(dTax.soli)}</span>
                    </div>
                {/if}
                <div class="flex justify-between border-t border-neutral-100 dark:border-slate-800 pt-1 font-bold">
                    <span class="text-neutral-800 dark:text-slate-200">Ertragssteuern:</span>
                    <span class="text-amber-600 dark:text-amber-400">{formatCurrency(dTax.ertragsteuern)}</span>
                </div>
            </div>

            <!-- 2. UStVA Box -->
            <div class="bg-white dark:bg-slate-900 p-3 rounded-xl border border-neutral-100 dark:border-slate-800 space-y-1">
                <span class="text-[10px] font-bold text-neutral-400 dark:text-slate-400 uppercase block">2. USt-Zahllast (UStVA)</span>
                <div class="flex justify-between">
                    <span class="text-neutral-600 dark:text-slate-300">Vereinnahmte USt:</span>
                    <span class="font-semibold text-neutral-900 dark:text-white">{formatCurrency(dTax.umsatzsteuer)}</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-neutral-600 dark:text-slate-300">Abziehbare Vorsteuer:</span>
                    <span class="font-semibold text-neutral-900 dark:text-white">{formatCurrency(dTax.vorsteuer)}</span>
                </div>
                <div class="flex justify-between border-t border-neutral-100 dark:border-slate-800 pt-1 font-bold">
                    <span class="text-neutral-800 dark:text-slate-200">USt-Zahllast:</span>
                    <span class="{dTax.ustZahllast >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-emerald-600 dark:text-emerald-400'}">
                        {dTax.ustZahllast >= 0 ? formatCurrency(dTax.ustZahllast) : `+${formatCurrency(Math.abs(dTax.ustZahllast))} Erstattung`}
                    </span>
                </div>
            </div>

            <!-- 3. Gesamtabgabe Box -->
            <div class="bg-neutral-900 dark:bg-slate-950 text-white p-3 rounded-xl border border-neutral-800 dark:border-slate-800 flex flex-col justify-between">
                <div>
                    <span class="text-[10px] font-bold text-neutral-400 uppercase block">3. Abgaben & Netto</span>
                    <div class="flex justify-between mt-1 text-xs">
                        <span class="text-neutral-300">Finanzamt gesamt:</span>
                        <span class="font-black text-rose-400 text-sm">{formatCurrency(dTax.gesamteAbgaben)}</span>
                    </div>
                </div>
                <div class="border-t border-neutral-800 pt-1.5 mt-1.5 flex justify-between text-xs">
                    <span class="text-neutral-300">Freie Liquidität:</span>
                    <span class="font-black {dTax.liquiditaetNachAllenAbgaben >= 0 ? 'text-emerald-400' : 'text-rose-400'}">
                        {formatCurrency(dTax.liquiditaetNachAllenAbgaben)}
                    </span>
                </div>
            </div>
        </div>
    </div>
{/if}
