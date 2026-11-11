<script lang="ts">
    import { HelpCircle, ChevronDown, ChevronUp } from "lucide-svelte";
    import type { useBwaPageState } from "$lib/services/bwaPageState.svelte";

    let { pageState, onOpenDetail } = $props<{
        pageState: ReturnType<typeof useBwaPageState>;
        onOpenDetail: () => void;
    }>();

    let showTaxDetails = $state(false);
    let bwa = $derived(pageState.currentBWA);
    let tax = $derived(pageState.currentTaxEstimate);
    let expTotal = $derived(pageState.currentTotalExp);
    let margin = $derived(bwa.revenue > 0 ? (bwa.netIncome / bwa.revenue) * 100 : 0);
</script>

<div class="bg-white dark:bg-slate-900 rounded-3xl border border-neutral-100 dark:border-slate-800 shadow-xs p-5 sm:p-6 group hover:shadow-md transition-shadow flex flex-col justify-between">
    <div>
        <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-3">
                <span class="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-base shadow-inner shrink-0">⚖️</span>
                <div>
                    <h3 class="font-bold text-neutral-900 dark:text-white text-base sm:text-lg leading-tight">Finanz-Balance &amp; Steuern</h3>
                    <p class="text-[11px] text-neutral-400 dark:text-slate-400 font-medium">Reale Einnahmen, Kosten &amp; sichere Rücklagen fürs Finanzamt</p>
                </div>
            </div>
            <div class="flex items-center gap-2">
                {#if bwa.revenue > 0}
                    <span class="px-2.5 py-1 rounded-xl text-xs font-black {margin >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-800' : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-100 dark:border-rose-800'}">
                        {margin >= 0 ? '+' : ''}{margin.toFixed(1)}% Marge
                    </span>
                {/if}
            </div>
        </div>

        <!-- Vorläufiges Ergebnis & Rohertrag -->
        <div class="p-4 rounded-2xl mb-4 border {bwa.netIncome >= 0 ? 'bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-100/80 dark:border-emerald-900/50' : 'bg-rose-50/50 dark:bg-rose-950/30 border-rose-100/80 dark:border-rose-900/50'} flex items-center justify-between">
            <div>
                <span class="text-[10px] font-bold uppercase tracking-wider block {bwa.netIncome >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}">
                    Vorläufiger {bwa.netIncome >= 0 ? 'Überschuss' : 'Verlust'} (vor Steuern)
                </span>
                <span class="text-2xl sm:text-3xl font-black {bwa.netIncome >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}">
                    {pageState.formatCurrency(bwa.netIncome)}
                </span>
            </div>
            <div class="text-right">
                <div class="flex items-center justify-end gap-1">
                    <span class="text-neutral-400 dark:text-slate-400 text-[10px] font-medium">Rohertrag</span>
                    <button type="button" onclick={() => pageState.activeExplanation = pageState.activeExplanation === 'rohertrag' ? null : 'rohertrag'} class="text-neutral-400 hover:text-indigo-600 p-0.5 rounded-full" title="Was bedeutet Rohertrag?">
                        <HelpCircle class="w-3.5 h-3.5" />
                    </button>
                </div>
                <span class="font-bold text-neutral-800 dark:text-slate-200">{pageState.formatCurrency(bwa.grossProfit)}</span>
            </div>
        </div>

        {#if pageState.activeExplanation === 'rohertrag'}
            <div class="p-3 mb-3 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-800 rounded-xl text-xs text-indigo-900 dark:text-indigo-200 flex items-start justify-between gap-2 animate-enter">
                <p><strong>Rohertrag:</strong> Das ist dein Umsatz abzüglich direkt verbrauchter Materialien oder Waren. Er zeigt, wie viel Geld für Personal, Miete und Gewinn übrig bleibt.</p>
                <button onclick={() => pageState.activeExplanation = null} class="text-indigo-400 font-bold px-1">✕</button>
            </div>
        {/if}

        <!-- Umsatz vs. Kosten Balken -->
        <div class="mb-4">
            <div class="flex items-center justify-between text-xs font-bold mb-1.5">
                <span class="text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-indigo-500"></span> Umsatz: {pageState.formatCurrency(bwa.revenue)}</span>
                <span class="text-rose-600 dark:text-rose-400 flex items-center gap-1.5">Kosten: {pageState.formatCurrency(expTotal)} <span class="w-2 h-2 rounded-full bg-rose-500"></span></span>
            </div>
            <div class="w-full h-3 bg-neutral-100 dark:bg-slate-800 rounded-full overflow-hidden flex shadow-inner">
                <div class="h-full bg-indigo-500 transition-all duration-700" style="width: {bwa.revenue > 0 ? Math.min(100, (bwa.revenue / (Math.max(bwa.revenue, expTotal) || 1)) * 100) : 0}%"></div>
                <div class="h-full bg-rose-500 transition-all duration-700" style="width: {expTotal > 0 ? Math.min(100, (expTotal / (Math.max(bwa.revenue, expTotal) || 1)) * 100) : 0}%"></div>
            </div>
        </div>

        <!-- Sichere Steuerrücklage Kachel (Laien-Box) -->
        <div class="p-3.5 bg-neutral-50 dark:bg-slate-800/80 rounded-2xl border border-neutral-100 dark:border-slate-800 space-y-2.5">
            <div class="flex items-center justify-between">
                <div>
                    <span class="text-[10px] font-bold text-neutral-400 dark:text-slate-500 uppercase tracking-wider block">Sichere Steuerrücklage</span>
                    <span class="text-lg font-black text-amber-600 dark:text-amber-400">
                        {pageState.formatCurrency(tax.gesamteAbgaben)}
                    </span>
                </div>
                <button 
                    onclick={() => showTaxDetails = !showTaxDetails}
                    class="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 flex items-center gap-1 p-1 rounded-lg"
                >
                    <span>{showTaxDetails ? 'Weniger Details' : 'Steuern aufschlüsseln'}</span>
                    {#if showTaxDetails}<ChevronUp class="w-4 h-4" />{:else}<ChevronDown class="w-4 h-4" />{/if}
                </button>
            </div>

            {#if bwa.netIncome <= 0}
                <div class="p-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl text-[11px] text-amber-800 dark:text-amber-200">
                    ℹ️ <strong>Verlustperiode:</strong> Keine Einkommensteuer oder Gewerbesteuer fällig. Eventuell hast du Anspruch auf eine Vorsteuer-Erstattung ({pageState.formatCurrency(Math.abs(tax.ustZahllast))}).
                </div>
            {/if}

            {#if showTaxDetails}
                <div class="space-y-2 pt-2 border-t border-neutral-200/80 dark:border-slate-700 text-xs animate-enter">
                    <!-- Mehrwertsteuer ans Finanzamt (UStVA) -->
                    <div class="flex items-center justify-between">
                        <span class="text-neutral-600 dark:text-slate-300">Mehrwertsteuer ans Finanzamt (UStVA):</span>
                        <span class="font-bold {tax.ustZahllast >= 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}">
                            {tax.ustZahllast >= 0 ? pageState.formatCurrency(tax.ustZahllast) : `+${pageState.formatCurrency(Math.abs(tax.ustZahllast))} Erstattung`}
                        </span>
                    </div>

                    <!-- Einkommensteuer -->
                    <div class="flex items-center justify-between">
                        <span class="text-neutral-600 dark:text-slate-300">Einkommensteuer (ESt geschätzt):</span>
                        <span class="font-bold text-neutral-800 dark:text-slate-100">{pageState.formatCurrency(tax.einkommensteuer)}</span>
                    </div>

                    <!-- Gewerbesteuer -->
                    <div class="flex items-center justify-between">
                        <span class="text-neutral-600 dark:text-slate-300">Gewerbesteuer (ab 24.500 € Freibetrag):</span>
                        <span class="font-bold text-neutral-800 dark:text-slate-100">{pageState.formatCurrency(tax.gewerbesteuer)}</span>
                    </div>
                </div>
            {/if}
        </div>
    </div>

    <!-- Zukünftiger Umsatz aus offenen Terminen InfoBox -->
    {#if pageState.currentUnbilled > 0}
        <div class="mt-4 pt-3 border-t border-neutral-100 dark:border-slate-800">
            <div class="flex items-center justify-between bg-amber-50/50 dark:bg-amber-950/30 p-2.5 rounded-2xl border border-amber-100/60 dark:border-amber-900/50">
                <div class="flex items-center gap-2.5">
                    <span class="w-7 h-7 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center text-xs shadow-inner shrink-0">⏳</span>
                    <div>
                        <span class="text-[11px] font-bold text-amber-900 dark:text-amber-200 block leading-tight">Zukünftiger Umsatz aus offenen Terminen</span>
                        <span class="text-[9px] text-amber-700/80 dark:text-amber-400 font-medium">Bereits geleistet, noch nicht abgerechnet</span>
                    </div>
                </div>
                <span class="text-sm font-black text-amber-600 dark:text-amber-400 shrink-0">+{pageState.formatCurrency(pageState.currentUnbilled)}</span>
            </div>
        </div>
    {/if}
</div>
