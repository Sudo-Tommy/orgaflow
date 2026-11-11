<script lang="ts">
    import { DollarSign, TrendingDown, BarChart3, TrendingUp, HelpCircle } from "lucide-svelte";
    import type { useBwaPageState } from "$lib/services/bwaPageState.svelte";

    let { pageState, onOpenDetail } = $props<{
        pageState: ReturnType<typeof useBwaPageState>;
        onOpenDetail: () => void;
    }>();

    let bwa = $derived(pageState.currentBWA);
    let prev = $derived(pageState.previousBWA);
    let health = $derived(pageState.financialHealth);
    let tax = $derived(pageState.currentTaxEstimate);
</script>

<div class="space-y-4 mb-6 print:hidden">
    <!-- Top Hero: Reingewinn nach Steuern & Finanzampel (Entnahme & Sicherheit) -->
    <div class="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-3xl p-5 sm:p-6 shadow-md border border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div class="space-y-1.5 flex-1">
            <div class="flex items-center gap-2">
                <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider {health.status === 'green' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : (health.status === 'yellow' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30')}">
                    <span class="w-2 h-2 rounded-full {health.status === 'green' ? 'bg-emerald-400 animate-pulse' : (health.status === 'yellow' ? 'bg-amber-400' : 'bg-rose-400')}"></span>
                    {health.label}
                </span>
                <span class="text-[11px] text-slate-400">Finanz-Ampel</span>
            </div>
            <p class="text-xs sm:text-sm text-slate-300 font-medium">{health.desc}</p>
            <p class="text-[11px] text-indigo-300/90 font-semibold">{health.tip}</p>
        </div>

        <div class="flex items-center gap-4 border-t md:border-t-0 md:border-l border-slate-800/80 pt-3 md:pt-0 md:pl-6 shrink-0 justify-between md:justify-end">
            <div>
                <span class="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Reingewinn (nach Steuern)</span>
                <span class="text-2xl sm:text-3xl font-black {tax.netAfterTaxes >= 0 ? 'text-emerald-400' : 'text-rose-400'}">
                    {pageState.formatCurrency(tax.netAfterTaxes)}
                </span>
            </div>
            <div class="text-right">
                <span class="text-[10px] uppercase font-bold text-slate-400 block tracking-wider" title="Liquidität nach Abzug der Steuerrücklage">Freie Liquidität</span>
                <span class="text-xl sm:text-2xl font-black {tax.liquiditaetNachAllenAbgaben >= 0 ? 'text-indigo-300' : 'text-rose-400'}">
                    {pageState.formatCurrency(tax.liquiditaetNachAllenAbgaben)}
                </span>
            </div>
        </div>
    </div>

    <!-- Die 4 Haupt-Kennzahlen -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <!-- 1. Umsatz -->
        <div role="button" tabindex="0" class="w-full text-left bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-neutral-100 dark:border-slate-800 shadow-xs flex items-center justify-between hover:border-indigo-300 dark:hover:border-indigo-700 transition-all hover:shadow-md cursor-pointer group active:scale-[0.98] relative overflow-hidden" onclick={onOpenDetail} onkeydown={(e) => { if (e.key === 'Enter') onOpenDetail(); }}>
            <div class="absolute inset-y-0 left-0 w-1 bg-indigo-500 rounded-l-3xl"></div>
            <div class="min-w-0 flex-1 pr-2 pl-2">
                <p class="text-[10px] font-bold text-neutral-400 dark:text-slate-500 uppercase tracking-widest mb-1 group-hover:text-indigo-500 transition-colors">Umsatz (Geflossen)</p>
                <p class="text-xl sm:text-2xl font-black text-neutral-900 dark:text-slate-100 truncate">{pageState.formatCurrency(bwa.revenue)}</p>
                <div class="mt-1 flex items-center gap-1.5 text-xs font-bold">
                    {#if prev.hasPrev}
                        <span class={pageState.getTrendColor(bwa.revenue, prev.revenue)}>{pageState.formatPercent(bwa.revenue, prev.revenue)}</span>
                        <span class="text-neutral-400 dark:text-slate-500 font-normal text-[10px]">vs Vorperiode</span>
                    {:else}
                        <span class="text-neutral-400 text-[10px] font-normal">Erste Periode</span>
                    {/if}
                </div>
                {#if pageState.currentUnbilled > 0}
                    <div class="mt-2 text-[10px] text-amber-600 dark:text-amber-400 font-semibold truncate flex items-center gap-1" title="Bereits durchgeführte Termine, die noch nicht abgerechnet wurden">
                        <span>⏳ Zukünftiger Umsatz:</span>
                        <span>+{pageState.formatCurrency(pageState.currentUnbilled)}</span>
                    </div>
                {/if}
            </div>
            <div class="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <DollarSign class="w-5 h-5" />
            </div>
        </div>

        <!-- 2. Kosten -->
        <div role="button" tabindex="0" class="w-full text-left bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-neutral-100 dark:border-slate-800 shadow-xs flex items-center justify-between hover:border-rose-300 dark:hover:border-rose-700 transition-all hover:shadow-md cursor-pointer group active:scale-[0.98] relative overflow-hidden" onclick={onOpenDetail} onkeydown={(e) => { if (e.key === 'Enter') onOpenDetail(); }}>
            <div class="absolute inset-y-0 left-0 w-1 bg-rose-500 rounded-l-3xl"></div>
            <div class="min-w-0 flex-1 pr-2 pl-2">
                <p class="text-[10px] font-bold text-neutral-400 dark:text-slate-500 uppercase tracking-widest mb-1 group-hover:text-rose-500 transition-colors">Betriebskosten</p>
                <p class="text-xl sm:text-2xl font-black text-neutral-900 dark:text-slate-100 truncate">{pageState.formatCurrency(pageState.currentTotalExp)}</p>
                <div class="mt-1 flex items-center gap-1.5 text-xs font-bold">
                    {#if prev.hasPrev}
                        <span class={pageState.getTrendColor(pageState.currentTotalExp, prev.expenses, true)}>{pageState.formatPercent(pageState.currentTotalExp, prev.expenses)}</span>
                        <span class="text-neutral-400 dark:text-slate-500 font-normal text-[10px]">vs Vorperiode</span>
                    {:else}
                        <span class="text-neutral-400 text-[10px] font-normal">Erste Periode</span>
                    {/if}
                </div>
                <p class="mt-2 text-[10px] text-neutral-400 truncate">Miete, Personal, Kfz &amp; Spesen</p>
            </div>
            <div class="w-11 h-11 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <TrendingDown class="w-5 h-5" />
            </div>
        </div>

        <!-- 3. EBITDA mit Info-Button -->
        <div role="button" tabindex="0" class="w-full text-left bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-neutral-100 dark:border-slate-800 shadow-xs flex items-center justify-between hover:border-purple-300 dark:hover:border-purple-700 transition-all hover:shadow-md cursor-pointer group active:scale-[0.98] relative overflow-hidden" onclick={onOpenDetail} onkeydown={(e) => { if (e.key === 'Enter') onOpenDetail(); }}>
            <div class="absolute inset-y-0 left-0 w-1 bg-purple-500 rounded-l-3xl"></div>
            <div class="min-w-0 flex-1 pr-2 pl-2">
                <div class="flex items-center gap-1 mb-1">
                    <p class="text-[10px] font-bold text-neutral-400 dark:text-slate-500 uppercase tracking-widest group-hover:text-purple-500 transition-colors">EBITDA (Operativ)</p>
                    <button type="button" onclick={(e) => { e.stopPropagation(); pageState.activeExplanation = pageState.activeExplanation === 'ebitda' ? null : 'ebitda'; }} class="text-neutral-400 hover:text-purple-600 p-0.5 rounded-full" title="Was bedeutet EBITDA?">
                        <HelpCircle class="w-3.5 h-3.5" />
                    </button>
                </div>
                <p class="text-xl sm:text-2xl font-black text-neutral-900 dark:text-slate-100 truncate">{pageState.formatCurrency(bwa.ebitda)}</p>
                <div class="mt-1 flex items-center gap-1.5 text-xs font-bold">
                    {#if prev.hasPrev}
                        <span class={pageState.getTrendColor(bwa.ebitda, prev.ebitda)}>{pageState.formatPercent(bwa.ebitda, prev.ebitda)}</span>
                        <span class="text-neutral-400 dark:text-slate-500 font-normal text-[10px]">vs Vorperiode</span>
                    {:else}
                        <span class="text-neutral-400 text-[10px] font-normal">Erste Periode</span>
                    {/if}
                </div>
                <p class="mt-2 text-[10px] text-neutral-400 truncate">Gewinn vor Steuern &amp; Abschreibung</p>
            </div>
            <div class="w-11 h-11 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <BarChart3 class="w-5 h-5" />
            </div>
        </div>

        <!-- 4. Vorläufiges Ergebnis / Gewinn -->
        <div role="button" tabindex="0" class="w-full text-left bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-neutral-100 dark:border-slate-800 shadow-xs flex items-center justify-between hover:border-emerald-300 dark:hover:border-emerald-700 transition-all hover:shadow-md cursor-pointer group active:scale-[0.98] relative overflow-hidden" onclick={onOpenDetail} onkeydown={(e) => { if (e.key === 'Enter') onOpenDetail(); }}>
            <div class="absolute inset-y-0 left-0 w-1 {bwa.netIncome >= 0 ? 'bg-emerald-500' : 'bg-rose-500'} rounded-l-3xl"></div>
            <div class="min-w-0 flex-1 pr-2 pl-2">
                <p class="text-[10px] font-bold text-neutral-400 dark:text-slate-500 uppercase tracking-widest mb-1 group-hover:text-emerald-500 transition-colors">
                    {bwa.netIncome >= 0 ? 'Gewinn (Vor Steuern)' : 'Verlust (Vor Steuern)'}
                </p>
                <p class="text-xl sm:text-2xl font-black {bwa.netIncome >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'} truncate">{pageState.formatCurrency(bwa.netIncome)}</p>
                <div class="mt-1 flex items-center gap-1.5 text-xs font-bold">
                    {#if prev.hasPrev}
                        <span class={pageState.getTrendColor(bwa.netIncome, prev.netIncome)}>{pageState.formatPercent(bwa.netIncome, prev.netIncome)}</span>
                        <span class="text-neutral-400 dark:text-slate-500 font-normal text-[10px]">vs Vorperiode</span>
                    {:else}
                        <span class="text-neutral-400 text-[10px] font-normal">Erste Periode</span>
                    {/if}
                </div>
                <p class="mt-2 text-[10px] text-neutral-400 truncate">Grundlage für Einkommensteuer</p>
            </div>
            <div class="w-11 h-11 rounded-2xl {bwa.netIncome >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600' : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600'} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <TrendingUp class="w-5 h-5" />
            </div>
        </div>
    </div>

    {#if pageState.activeExplanation === 'ebitda'}
        <div class="p-4 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-2xl text-xs text-purple-900 dark:text-purple-200 flex items-start justify-between gap-3 animate-enter">
            <div class="space-y-1">
                <span class="font-bold flex items-center gap-1.5">💡 Was bedeutet EBITDA?</span>
                <p>EBITDA steht für das reine Ergebnis aus dem Tagesgeschäft: <strong>Umsatz minus Material- und Betriebskosten</strong>. Zinsen, Steuern und Wertverluste von Geräten (Abschreibungen) sind noch nicht abgezogen. Ein positiver Wert zeigt, dass dein Betrieb im Alltag profitabel arbeitet.</p>
            </div>
            <button onclick={() => pageState.activeExplanation = null} class="text-purple-500 hover:text-purple-700 font-bold px-2 py-1">✕</button>
        </div>
    {/if}
</div>
