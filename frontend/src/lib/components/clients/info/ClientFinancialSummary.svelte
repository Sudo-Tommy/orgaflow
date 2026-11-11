<script lang="ts">
    import { slide } from "svelte/transition";
    import { AlertTriangle } from "lucide-svelte";

    let {
        currentYear,
        careLevel,
        annualMaxVHP,
        annualMaxEntlastung,
        usedGemeinsamerJahresbetrag,
        usedEntlastungsleistungen,
        remainingVHP,
        remainingEntlastung,
        previousYearRemainingBudget,
        totalAvailableBudget,
        hasBudgetWarning,
        warningText,
        onOpenBudget
    }: {
        currentYear: number;
        careLevel: number;
        annualMaxVHP: number;
        annualMaxEntlastung: number;
        usedGemeinsamerJahresbetrag: number;
        usedEntlastungsleistungen: number;
        remainingVHP: number;
        remainingEntlastung: number;
        previousYearRemainingBudget: number;
        totalAvailableBudget: number;
        hasBudgetWarning: boolean;
        warningText: string;
        onOpenBudget: () => void;
    } = $props();
</script>

<div class="mt-6 pt-6 border-t border-neutral-100 dark:border-slate-800/80">
    <div class="p-4 rounded-2xl bg-white dark:bg-slate-800/60 border border-neutral-200/80 dark:border-slate-700/80 border-l-4 border-l-emerald-500 shadow-xs">
        <p class="text-[10px] text-neutral-400 dark:text-slate-400 font-bold uppercase tracking-wider mb-3">Finanz- & Leistungsübersicht ({currentYear})</p>
        <div class="grid grid-cols-1 gap-3 bg-neutral-50/70 dark:bg-slate-900/60 p-4 rounded-xl border border-neutral-200/50 dark:border-slate-800">
            {#if hasBudgetWarning}
                <div transition:slide class="bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 p-3 rounded-xl text-xs font-bold leading-relaxed shadow-xs flex items-start gap-2">
                    <AlertTriangle class="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div><span class="font-black">Achtung:</span> {warningText}</div>
                </div>
            {/if}
            <div class="flex items-center justify-between">
                <p class="text-[11px] text-neutral-500 dark:text-slate-400 font-bold uppercase tracking-wider">Gemeinsamer Jahresbetrag (Rest)</p>
                <p class="text-sm font-black text-neutral-900 dark:text-white">{remainingVHP.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</p>
            </div>
            <div class="pl-2 text-[11px] text-neutral-400 dark:text-slate-500 font-medium">
                ({annualMaxVHP.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })} abzgl. {usedGemeinsamerJahresbetrag.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })} genutzt)
            </div>

            <div class="flex items-center justify-between mt-2 pt-2 border-t border-neutral-200/50 dark:border-slate-800">
                <p class="text-[11px] text-neutral-500 dark:text-slate-400 font-bold uppercase tracking-wider">Entlastungsleistungen (Rest)</p>
                <p class="text-sm font-black text-neutral-900 dark:text-white">{remainingEntlastung.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</p>
            </div>
            <div class="pl-2 text-[11px] text-neutral-400 dark:text-slate-500 font-medium">
                ({annualMaxEntlastung.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })} abzgl. {usedEntlastungsleistungen.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })} genutzt)
            </div>
            {#if previousYearRemainingBudget > 0}
                <div transition:slide class="flex items-center justify-between mt-2 pt-2 border-t border-neutral-200/50 dark:border-slate-800">
                    <p class="text-[11px] text-neutral-500 dark:text-slate-400 font-bold uppercase tracking-wider">Restbudget Vorjahr</p>
                    <p class="text-sm font-black text-neutral-900 dark:text-white">{previousYearRemainingBudget.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</p>
                </div>
            {/if}
            <div class="mt-2 pt-3 border-t border-neutral-300/80 dark:border-slate-700 flex items-center justify-between">
                <div>
                    <p class="text-[10px] text-neutral-400 dark:text-slate-400 font-bold uppercase tracking-wider">Verfügbares Gesamtbudget</p>
                </div>
                <p class="text-lg font-black text-emerald-600 dark:text-emerald-400">{Number(totalAvailableBudget).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</p>
            </div>
        </div>
        <p class="text-[10px] text-neutral-400 dark:text-slate-500 mt-2.5 leading-relaxed">
            Die genutzten Beträge basieren auf abgeschlossenen Rechnungen und offenen Terminen.
            {#if careLevel > 0}
                (Gemeinsamer Jahresbetrag: {annualMaxVHP.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}, Entlastungsleistungen: {annualMaxEntlastung.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })})
            {:else}
                (für diesen Klienten ist kein Pflegegrad hinterlegt).
            {/if}
            Das Restbudget aus dem Vorjahr verfällt am 30.06.
        </p>
        <div class="mt-4 flex justify-end">
            <button
                type="button"
                onclick={onOpenBudget}
                class="orga-button-ghost dark:text-slate-200 dark:border-slate-700 min-h-[44px] py-2 px-4 text-xs font-bold shadow-xs cursor-pointer touch-manipulation"
            >Budget bearbeiten</button>
        </div>
    </div>
</div>
