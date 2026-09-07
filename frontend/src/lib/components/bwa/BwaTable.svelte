<script lang="ts">
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import { calculateTaxEstimate } from "$lib/services/bwaService.svelte";
    let { currentBWA, ytdBWA, viewMode, selectedMonth, selectedQuarter, selectedYear, selectedCompanyId = "all" } = $props<any>();
    function formatCurrency(val: number) { return (val || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' }); }

    let curTax = $derived(calculateTaxEstimate(currentBWA?.vorlaeufigesErgebnis || 0, viewMode, currentBWA?.umsatzsteuer || 0, currentBWA?.vorsteuer || 0, currentBWA?.operatingTaxes || 0));
    let ytdTax = $derived(calculateTaxEstimate(ytdBWA?.vorlaeufigesErgebnis || 0, 'yearly', ytdBWA?.umsatzsteuer || 0, ytdBWA?.vorsteuer || 0, ytdBWA?.operatingTaxes || 0));

    let periodText = $derived(viewMode === 'monthly' ? `Monat ${selectedMonth} / ${selectedYear}` : (viewMode === 'quarterly' ? `Q${selectedQuarter} / ${selectedYear}` : `Geschäftsjahr ${selectedYear}`));
    let ytdText = $derived(viewMode === 'monthly' ? `Januar - ${new Date(2000, selectedMonth - 1, 1).toLocaleString('de-DE', { month: 'long' })} ${selectedYear}` : (viewMode === 'quarterly' ? `Januar - ${new Date(2000, selectedQuarter * 3 - 1, 1).toLocaleString('de-DE', { month: 'long' })} ${selectedYear}` : `Januar - Dezember ${selectedYear}`));

    let openInvoices = $derived.by(() => {
        if (!orgaStore.invoices?.data) return [];
        
        const targetYear = Number(selectedYear);
        const targetMonth = Number(selectedMonth);
        const targetQuarter = Number(selectedQuarter);

        return orgaStore.invoices.data.filter((inv: any) => {
            if (['Abgeschlossen', 'Storniert', 'Abgelehnt', 'Entwurf'].includes(inv.status)) return false;
            if (!inv.issue_date) return false;
            
            const d = new Date(inv.issue_date);
            if (d.getFullYear() !== targetYear) return false;
            
            if (selectedCompanyId !== "all") {
                const cId = inv.company || inv.expand?.company?.id;
                let matchesCompany = true;
                if (Array.isArray(cId)) matchesCompany = cId.includes(selectedCompanyId);
                else if (typeof cId === 'string') matchesCompany = cId.includes(selectedCompanyId);
                else matchesCompany = false;
                if (!matchesCompany) return false;
            }
            
            if (viewMode === 'monthly') return d.getMonth() + 1 === targetMonth;
            if (viewMode === 'quarterly') return Math.ceil((d.getMonth() + 1) / 3) === targetQuarter;
            return true;
        });
    });
</script>

<table class="w-full text-left text-sm whitespace-nowrap border-collapse min-w-[700px] tabular-nums">
    <thead class="text-xs text-slate-700 dark:text-slate-200 bg-slate-100/95 dark:bg-slate-800/95 uppercase font-bold border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10 print:static">
        <tr>
            <th class="px-6 py-4">Bezeichnung</th>
            <th class="px-6 py-4 text-right">{periodText}</th>
            <th class="px-6 py-4 text-right">Gesamterlöse<br><span class="text-[10px] font-semibold text-slate-500 dark:text-slate-400">in %</span></th>
            <th class="px-6 py-4 text-right">Gesamtkosten<br><span class="text-[10px] font-semibold text-slate-500 dark:text-slate-400">in %</span></th>
            <th class="px-6 py-4 text-right">{ytdText}</th>
            <th class="px-6 py-4 text-right">Gesamterlöse<br><span class="text-[10px] font-semibold text-slate-500 dark:text-slate-400">in %</span></th>
            <th class="px-6 py-4 text-right">Gesamtkosten<br><span class="text-[10px] font-semibold text-slate-500 dark:text-slate-400">in %</span></th>
        </tr>
    </thead>
    <tbody class="divide-y divide-slate-100 dark:divide-slate-800/80">
        {@render lexNeutral("Betriebseinnahmen", 0, 0, false, true)}
        {@render lexEinnahme("Erlöse aus betrieblicher Tätigkeit (Tatsächlich geflossen)", currentBWA.erloeseBetrieb, currentBWA.summeErloese, ytdBWA.erloeseBetrieb, ytdBWA.summeErloese)}
        <tr class="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors text-xs text-slate-700 dark:text-slate-300 font-medium border-b border-slate-100 dark:border-slate-800">
            <td class="px-6 py-1.5 pl-14 text-amber-800 dark:text-amber-300 font-semibold">↳ Informativ: Noch offene Forderungen</td>
            <td class="px-6 py-1.5 text-right font-bold text-amber-700 dark:text-amber-300">{formatCurrency(currentBWA.revenueOpen)}</td><td class="px-6 py-1.5 text-center text-slate-400">-</td><td class="px-6 py-1.5 text-center text-slate-400">-</td>
            <td class="px-6 py-1.5 text-right font-bold text-amber-700 dark:text-amber-300">{formatCurrency(ytdBWA.revenueOpen)}</td><td class="px-6 py-1.5 text-center text-slate-400">-</td><td class="px-6 py-1.5 text-center text-slate-400">-</td>
        </tr>
        {#each openInvoices as inv}
            <tr class="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors text-xs text-slate-700 dark:text-slate-300 font-medium border-b border-slate-50 dark:border-slate-800/60">
                <td class="px-6 py-1.5 pl-20">
                    <div class="flex items-center gap-1.5">
                        <span class="text-slate-800 dark:text-slate-200 font-bold">{inv.invoice_nr || 'RE-Unbekannt'}</span>
                        {#if inv.expand?.client}
                            {@const c = Array.isArray(inv.expand.client) ? inv.expand.client[0] : inv.expand.client}
                            <span class="text-slate-600 dark:text-slate-300 truncate max-w-48">- {c.name_first} {c.name_last}</span>
                            {#if (c.status || '').toLowerCase() === 'verstorben'}
                                <span class="px-1.5 py-0.5 text-xs font-bold bg-slate-800 text-slate-100 rounded-md shrink-0 whitespace-nowrap">Verstorben 🕊️</span>
                            {/if}
                        {/if}
                    </div>
                </td>
                <td class="px-6 py-1.5 text-right font-semibold text-slate-700 dark:text-slate-300">{formatCurrency(inv.brutto || 0)}</td>
                <td class="px-6 py-1.5 text-center text-slate-400">-</td><td class="px-6 py-1.5 text-center text-slate-400">-</td>
                <td class="px-6 py-1.5 text-right text-slate-400">-</td><td class="px-6 py-1.5 text-center text-slate-400">-</td><td class="px-6 py-1.5 text-center text-slate-400">-</td>
            </tr>
        {/each}
        {@render lexEinnahme("Sonstige Erlöse", currentBWA.erloeseSonstige, currentBWA.summeErloese, ytdBWA.erloeseSonstige, ytdBWA.summeErloese)}
        {@render lexEinnahme("Summe der Erlöse (Gesamtleistung)", currentBWA.summeErloese, currentBWA.summeErloese, ytdBWA.summeErloese, ytdBWA.summeErloese, true)}

        {@render lexNeutral("Betriebsausgaben", 0, 0, false, true)}
        {@render lexKosten("Materialeinsatz / Auslagen für Klienten", currentBWA.warenMaterial, currentBWA.summeErloese, ytdBWA.warenMaterial, ytdBWA.summeErloese)}
        {@render lexKosten("Fremdleistungen", currentBWA.fremdleistungen, currentBWA.summeErloese, ytdBWA.fremdleistungen, ytdBWA.summeErloese)}
        
        <tr class="font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-950 dark:text-indigo-200 border-t border-indigo-200 dark:border-indigo-800 text-sm"><td class="px-6 py-3 pl-10">Rohertrag</td><td class="px-6 py-3 text-right font-black">{formatCurrency(currentBWA.rohertrag)}</td><td class="px-6 py-3 text-right text-indigo-700 dark:text-indigo-300 text-xs font-semibold">{currentBWA.summeErloese ? (currentBWA.rohertrag / currentBWA.summeErloese * 100).toFixed(2).replace('.', ',') + ' %' : '-'}</td><td class="px-6 py-3 text-center text-slate-400">-</td><td class="px-6 py-3 text-right font-black">{formatCurrency(ytdBWA.rohertrag)}</td><td class="px-6 py-3 text-right text-indigo-700 dark:text-indigo-300 text-xs font-semibold">{ytdBWA.summeErloese ? (ytdBWA.rohertrag / ytdBWA.summeErloese * 100).toFixed(2).replace('.', ',') + ' %' : '-'}</td><td class="px-6 py-3 text-center text-slate-400">-</td></tr>

        {@render lexNeutral("Betriebskosten", 0, 0, false, true)}
        {@render lexKosten("Personalkosten", currentBWA.personalkosten, currentBWA.summeErloese, ytdBWA.personalkosten, ytdBWA.summeErloese)}
        {@render lexKosten("Raumkosten / Miete", currentBWA.raumkosten, currentBWA.summeErloese, ytdBWA.raumkosten, ytdBWA.summeErloese)}
        {@render lexKosten("Betriebl. Steuern & Versicherungen", currentBWA.steuernVersicherungen, currentBWA.summeErloese, ytdBWA.steuernVersicherungen, ytdBWA.summeErloese)}
        {@render lexKosten("Fahrzeugkosten", currentBWA.fahrzeugkosten, currentBWA.summeErloese, ytdBWA.fahrzeugkosten, ytdBWA.summeErloese)}
        {@render lexKosten("Werbe- und Reisekosten", currentBWA.werbeReisekosten, currentBWA.summeErloese, ytdBWA.werbeReisekosten, ytdBWA.summeErloese)}
        {@render lexKosten("Instandhaltung und Werkzeuge", currentBWA.instandhaltung, currentBWA.summeErloese, ytdBWA.instandhaltung, ytdBWA.summeErloese)}
        {@render lexKosten("Software, IT & Sonstige Kosten", currentBWA.verschiedeneKosten, currentBWA.summeErloese, ytdBWA.verschiedeneKosten, ytdBWA.summeErloese)}
        {@render lexKosten("Summe der Betriebskosten", currentBWA.summeBetriebskosten, currentBWA.summeErloese, ytdBWA.summeBetriebskosten, ytdBWA.summeErloese, true)}
        
        <tr class="font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-950 dark:text-purple-200 border-t border-purple-200 dark:border-purple-800 text-sm"><td class="px-6 py-3 pl-10">EBITDA (Ergebnis vor Zinsen, Steuern, Abschreibungen)</td><td class="px-6 py-3 text-right font-black">{formatCurrency(currentBWA.ebitda)}</td><td class="px-6 py-3 text-right text-purple-700 dark:text-purple-300 text-xs font-semibold">{currentBWA.summeErloese ? (currentBWA.ebitda / currentBWA.summeErloese * 100).toFixed(2).replace('.', ',') + ' %' : '-'}</td><td class="px-6 py-3 text-center text-slate-400">-</td><td class="px-6 py-3 text-right font-black">{formatCurrency(ytdBWA.ebitda)}</td><td class="px-6 py-3 text-right text-purple-700 dark:text-purple-300 text-xs font-semibold">{ytdBWA.summeErloese ? (ytdBWA.ebitda / ytdBWA.summeErloese * 100).toFixed(2).replace('.', ',') + ' %' : '-'}</td><td class="px-6 py-3 text-center text-slate-400">-</td></tr>

        {@render lexNeutral("Abschreibungen", 0, 0, false, true)}
        {@render lexKosten("Abschreibungen", currentBWA.abschreibungen, currentBWA.summeErloese, ytdBWA.abschreibungen, ytdBWA.summeErloese)}

        <tr class="font-black bg-emerald-50 dark:bg-emerald-950/60 text-emerald-950 dark:text-emerald-200 border-t-4 border-emerald-200 dark:border-emerald-800 text-base"><td class="px-6 py-4">Vorläufiges betriebliches Ergebnis (EBIT / Gewinn)</td><td class="px-6 py-4 text-right font-black">{formatCurrency(currentBWA.vorlaeufigesErgebnis)}</td><td class="px-6 py-4 text-right text-emerald-700 dark:text-emerald-300 text-xs font-semibold">{currentBWA.summeErloese ? (currentBWA.vorlaeufigesErgebnis / currentBWA.summeErloese * 100).toFixed(2).replace('.', ',') + ' %' : '-'}</td><td class="px-6 py-4 text-center text-slate-400">-</td><td class="px-6 py-4 text-right font-black">{formatCurrency(ytdBWA.vorlaeufigesErgebnis)}</td><td class="px-6 py-4 text-right text-emerald-700 dark:text-emerald-300 text-xs font-semibold">{ytdBWA.summeErloese ? (ytdBWA.vorlaeufigesErgebnis / ytdBWA.summeErloese * 100).toFixed(2).replace('.', ',') + ' %' : '-'}</td><td class="px-6 py-4 text-center text-slate-400">-</td></tr>

        {@render lexNeutral("Informativ: Errechnete Steuern", 0, 0, false, true)}
        {@render lexKosten("Gewerbesteuer (GewSt geschätzt)", curTax.gewerbesteuer, currentBWA.summeErloese, ytdTax.gewerbesteuer, ytdBWA.summeErloese)}
        {@render lexKosten("Einkommensteuer (ESt geschätzt)", curTax.einkommensteuer, currentBWA.summeErloese, ytdTax.einkommensteuer, ytdBWA.summeErloese)}
        {#if curTax.soli > 0 || ytdTax.soli > 0}
            {@render lexKosten("Solidaritätszuschlag", curTax.soli, currentBWA.summeErloese, ytdTax.soli, ytdBWA.summeErloese)}
        {/if}
        {@render lexKosten("Geschätzte Steuerrücklage gesamt", curTax.totalTaxes, currentBWA.summeErloese, ytdTax.totalTaxes, ytdBWA.summeErloese, true)}
        
        <tr class="font-black bg-slate-900 dark:bg-slate-950 text-white border-t-2 border-slate-800 text-base">
            <td class="px-6 py-3.5 pl-6">Reingewinn (nach geschätzten Ertragssteuern)</td>
            <td class="px-6 py-3.5 text-right font-black {curTax.netAfterTaxes >= 0 ? 'text-emerald-400' : 'text-rose-400'}">{formatCurrency(curTax.netAfterTaxes)}</td>
            <td class="px-6 py-3.5 text-right text-slate-300 text-xs font-semibold">{currentBWA.summeErloese ? (curTax.netAfterTaxes / currentBWA.summeErloese * 100).toFixed(2).replace('.', ',') + ' %' : '-'}</td>
            <td class="px-6 py-3.5 text-center text-slate-500">-</td>
            <td class="px-6 py-3.5 text-right font-black {ytdTax.netAfterTaxes >= 0 ? 'text-emerald-400' : 'text-rose-400'}">{formatCurrency(ytdTax.netAfterTaxes)}</td>
            <td class="px-6 py-3.5 text-right text-slate-300 text-xs font-semibold">{ytdBWA.summeErloese ? (ytdTax.netAfterTaxes / ytdBWA.summeErloese * 100).toFixed(2).replace('.', ',') + ' %' : '-'}</td>
            <td class="px-6 py-3.5 text-center text-slate-500">-</td>
        </tr>

        {@render lexNeutral("Informativ: Umsatzsteuer & Vorsteuer (UStVA)", 0, 0, false, true)}
        {@render lexNeutral("Vereinnahmte Umsatzsteuer (Kunden)", currentBWA.umsatzsteuer, ytdBWA.umsatzsteuer)}
        {@render lexNeutral("Gezahlte Vorsteuer (Lieferanten)", currentBWA.vorsteuer, ytdBWA.vorsteuer)}
        {@render lexNeutral("Netto USt-Zahllast an Finanzamt", curTax.ustZahllast, ytdTax.ustZahllast, true)}

        <tr class="font-black bg-slate-800 dark:bg-slate-900 text-white border-t border-slate-700 text-sm">
            <td class="px-6 py-3 pl-6">Reale Finanzamt-Abgaben gesamt (Ertrag + USt)</td>
            <td class="px-6 py-3 text-right font-black text-rose-300">{formatCurrency(curTax.gesamteAbgaben)}</td>
            <td class="px-6 py-3 text-center text-slate-400">-</td>
            <td class="px-6 py-3 text-center text-slate-400">-</td>
            <td class="px-6 py-3 text-right font-black text-rose-300">{formatCurrency(ytdTax.gesamteAbgaben)}</td>
            <td class="px-6 py-3 text-center text-slate-400">-</td>
            <td class="px-6 py-3 text-center text-slate-400">-</td>
        </tr>
    </tbody>
</table>

{#snippet lexEinnahme(label: string, curVal: number, curSum: number, ytdVal: number, ytdSum: number, isSum = false)}{@const curPct = curSum ? (curVal / curSum * 100) : 0}{@const ytdPct = ytdSum ? (ytdVal / ytdSum * 100) : 0}<tr class="{isSum ? 'font-bold bg-slate-100 dark:bg-slate-800/90 border-t border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100' : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/50'} transition-colors"><td class="px-6 py-2.5 {isSum ? 'text-slate-900 dark:text-slate-100 font-bold' : 'text-slate-800 dark:text-slate-200 font-medium pl-10'}">{label}</td><td class="px-6 py-2.5 text-right {isSum ? 'font-black text-slate-900 dark:text-slate-100' : 'font-semibold text-slate-800 dark:text-slate-200'}">{formatCurrency(curVal)}</td><td class="px-6 py-2.5 text-right text-slate-600 dark:text-slate-300 text-xs font-semibold">{curSum && curVal ? curPct.toFixed(2).replace('.', ',') + ' %' : '-'}</td><td class="px-6 py-2.5 text-center text-slate-400">-</td><td class="px-6 py-2.5 text-right {isSum ? 'font-black text-slate-900 dark:text-slate-100' : 'font-semibold text-slate-800 dark:text-slate-200'}">{formatCurrency(ytdVal)}</td><td class="px-6 py-2.5 text-right text-slate-600 dark:text-slate-300 text-xs font-semibold">{ytdSum && ytdVal ? ytdPct.toFixed(2).replace('.', ',') + ' %' : '-'}</td><td class="px-6 py-2.5 text-center text-slate-400">-</td></tr>{/snippet}
{#snippet lexKosten(label: string, curVal: number, curSum: number, ytdVal: number, ytdSum: number, isSum = false)}{@const curPct = curSum ? (curVal / curSum * 100) : 0}{@const ytdPct = ytdSum ? (ytdVal / ytdSum * 100) : 0}<tr class="{isSum ? 'font-bold bg-slate-100 dark:bg-slate-800/90 border-t border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100' : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/50'} transition-colors"><td class="px-6 py-2.5 {isSum ? 'text-slate-900 dark:text-slate-100 font-bold' : 'text-slate-800 dark:text-slate-200 font-medium pl-10'}">{label}</td><td class="px-6 py-2.5 text-right {isSum ? 'font-black text-slate-900 dark:text-slate-100' : 'font-semibold text-slate-800 dark:text-slate-200'}">{formatCurrency(curVal)}</td><td class="px-6 py-2.5 text-center text-slate-400">-</td><td class="px-6 py-2.5 text-right text-slate-600 dark:text-slate-300 text-xs font-semibold">{curSum && curVal ? curPct.toFixed(2).replace('.', ',') + ' %' : '-'}</td><td class="px-6 py-2.5 text-right {isSum ? 'font-black text-slate-900 dark:text-slate-100' : 'font-semibold text-slate-800 dark:text-slate-200'}">{formatCurrency(ytdVal)}</td><td class="px-6 py-2.5 text-center text-slate-400">-</td><td class="px-6 py-2.5 text-right text-slate-600 dark:text-slate-300 text-xs font-semibold">{ytdSum && ytdVal ? ytdPct.toFixed(2).replace('.', ',') + ' %' : '-'}</td></tr>{/snippet}
{#snippet lexNeutral(label: string, curVal: number, ytdVal: number, isSum = false, isHeader = false)}<tr class="{isHeader ? 'font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-950 dark:text-indigo-200 border-y border-indigo-200 dark:border-indigo-800' : (isSum ? 'font-black bg-slate-100 dark:bg-slate-800/90 border-y border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100' : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/50')} transition-colors"><td class="px-6 py-2.5 {isHeader ? 'text-indigo-950 dark:text-indigo-200 font-bold' : (isSum ? 'text-slate-900 dark:text-slate-100 font-black' : 'text-slate-800 dark:text-slate-200 font-medium')}">{label}</td><td class="px-6 py-2.5 text-right {isSum ? 'font-black text-slate-900 dark:text-slate-100' : 'font-semibold text-slate-800 dark:text-slate-200'}">{isHeader ? '' : formatCurrency(curVal)}</td><td class="px-6 py-2.5 text-center text-slate-400">-</td><td class="px-6 py-2.5 text-center text-slate-400">-</td><td class="px-6 py-2.5 text-right {isSum ? 'font-black text-slate-900 dark:text-slate-100' : 'font-semibold text-slate-800 dark:text-slate-200'}">{isHeader ? '' : formatCurrency(ytdVal)}</td><td class="px-6 py-2.5 text-center text-slate-400">-</td><td class="px-6 py-2.5 text-center text-slate-400">-</td></tr>{/snippet}