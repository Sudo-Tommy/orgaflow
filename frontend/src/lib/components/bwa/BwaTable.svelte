<script lang="ts">
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    let { currentBWA, ytdBWA, viewMode, selectedMonth, selectedQuarter, selectedYear, selectedCompanyId = "all" } = $props<any>();
    function formatCurrency(val: number) { return (val || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' }); }

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

<table class="w-full text-left text-sm whitespace-nowrap border-collapse">
    <thead class="text-[10px] text-neutral-500 bg-neutral-50/90 uppercase font-bold border-b border-neutral-200 sticky top-0 z-10 print:static">
        <tr>
            <th class="px-6 py-4">Bezeichnung</th>
            <th class="px-6 py-4 text-right">{periodText}</th>
            <th class="px-6 py-4 text-right">Gesamterlöse<br><span class="text-[9px] font-medium opacity-70">in %</span></th>
            <th class="px-6 py-4 text-right">Gesamtkosten<br><span class="text-[9px] font-medium opacity-70">in %</span></th>
            <th class="px-6 py-4 text-right">{ytdText}</th>
            <th class="px-6 py-4 text-right">Gesamterlöse<br><span class="text-[9px] font-medium opacity-70">in %</span></th>
            <th class="px-6 py-4 text-right">Gesamtkosten<br><span class="text-[9px] font-medium opacity-70">in %</span></th>
        </tr>
    </thead>
    <tbody class="divide-y divide-neutral-100">
        {@render lexNeutral("Betriebseinnahmen", 0, 0, false, true)}
        {@render lexEinnahme("Erlöse aus betrieblicher Tätigkeit (Tatsächlich geflossen)", currentBWA.erloeseBetrieb, currentBWA.summeErloese, ytdBWA.erloeseBetrieb, ytdBWA.summeErloese)}
        <tr class="hover:bg-neutral-50/50 transition-colors text-[11px] text-neutral-500 font-medium border-b border-neutral-100">
            <td class="px-6 py-1 pl-14 text-amber-700/70">↳ Informativ: Noch offene Forderungen</td>
            <td class="px-6 py-1 text-right text-amber-600">{formatCurrency(currentBWA.revenueOpen)}</td><td class="px-6 py-1 text-center">-</td><td class="px-6 py-1 text-center">-</td>
            <td class="px-6 py-1 text-right text-amber-600">{formatCurrency(ytdBWA.revenueOpen)}</td><td class="px-6 py-1 text-center">-</td><td class="px-6 py-1 text-center">-</td>
        </tr>
        {#each openInvoices as inv}
            <tr class="hover:bg-neutral-50/80 transition-colors text-[10px] text-neutral-400 font-medium border-b border-neutral-50">
                <td class="px-6 py-1 pl-20">
                    <div class="flex items-center gap-1.5">
                        <span class="text-neutral-500 font-bold">{inv.invoice_nr || 'RE-Unbekannt'}</span>
                        {#if inv.expand?.client}
                            {@const c = Array.isArray(inv.expand.client) ? inv.expand.client[0] : inv.expand.client}
                            <span class="opacity-70 truncate max-w-48">- {c.name_first} {c.name_last}</span>
                            {#if (c.status || '').toLowerCase() === 'verstorben'}
                                <span class="px-1.5 py-px text-[9px] font-bold bg-neutral-800 text-neutral-100 rounded-md shrink-0 whitespace-nowrap">Verstorben 🕊️</span>
                            {/if}
                        {/if}
                    </div>
                </td>
                <td class="px-6 py-1 text-right text-neutral-500">{formatCurrency(inv.brutto || 0)}</td>
                <td class="px-6 py-1 text-center">-</td><td class="px-6 py-1 text-center">-</td>
                <td class="px-6 py-1 text-right">-</td><td class="px-6 py-1 text-center">-</td><td class="px-6 py-1 text-center">-</td>
            </tr>
        {/each}
        {@render lexEinnahme("Sonstige Erlöse", currentBWA.erloeseSonstige, currentBWA.summeErloese, ytdBWA.erloeseSonstige, ytdBWA.summeErloese)}
        {@render lexEinnahme("Summe der Erlöse (Gesamtleistung)", currentBWA.summeErloese, currentBWA.summeErloese, ytdBWA.summeErloese, ytdBWA.summeErloese, true)}

        {@render lexNeutral("Betriebsausgaben", 0, 0, false, true)}
        {@render lexKosten("Materialeinsatz / Auslagen für Klienten", currentBWA.warenMaterial, currentBWA.summeErloese, ytdBWA.warenMaterial, ytdBWA.summeErloese)}
        {@render lexKosten("Fremdleistungen", currentBWA.fremdleistungen, currentBWA.summeErloese, ytdBWA.fremdleistungen, ytdBWA.summeErloese)}
        
        <tr class="font-bold bg-indigo-50 text-indigo-900 border-t border-indigo-200 text-sm"><td class="px-6 py-3 pl-10">Rohertrag</td><td class="px-6 py-3 text-right">{formatCurrency(currentBWA.rohertrag)}</td><td class="px-6 py-3 text-right text-indigo-500 text-xs">{currentBWA.summeErloese ? (currentBWA.rohertrag / currentBWA.summeErloese * 100).toFixed(2).replace('.', ',') + ' %' : '-'}</td><td class="px-6 py-3 text-center text-neutral-400">-</td><td class="px-6 py-3 text-right">{formatCurrency(ytdBWA.rohertrag)}</td><td class="px-6 py-3 text-right text-indigo-500 text-xs">{ytdBWA.summeErloese ? (ytdBWA.rohertrag / ytdBWA.summeErloese * 100).toFixed(2).replace('.', ',') + ' %' : '-'}</td><td class="px-6 py-3 text-center text-neutral-400">-</td></tr>

        {@render lexNeutral("Betriebskosten", 0, 0, false, true)}
        {@render lexKosten("Personalkosten", currentBWA.personalkosten, currentBWA.summeErloese, ytdBWA.personalkosten, ytdBWA.summeErloese)}
        {@render lexKosten("Raumkosten / Miete", currentBWA.raumkosten, currentBWA.summeErloese, ytdBWA.raumkosten, ytdBWA.summeErloese)}
        {@render lexKosten("Betriebl. Steuern & Versicherungen", currentBWA.steuernVersicherungen, currentBWA.summeErloese, ytdBWA.steuernVersicherungen, ytdBWA.summeErloese)}
        {@render lexKosten("Fahrzeugkosten", currentBWA.fahrzeugkosten, currentBWA.summeErloese, ytdBWA.fahrzeugkosten, ytdBWA.summeErloese)}
        {@render lexKosten("Werbe- und Reisekosten", currentBWA.werbeReisekosten, currentBWA.summeErloese, ytdBWA.werbeReisekosten, ytdBWA.summeErloese)}
        {@render lexKosten("Instandhaltung und Werkzeuge", currentBWA.instandhaltung, currentBWA.summeErloese, ytdBWA.instandhaltung, ytdBWA.summeErloese)}
        {@render lexKosten("Software, IT & Sonstige Kosten", currentBWA.verschiedeneKosten, currentBWA.summeErloese, ytdBWA.verschiedeneKosten, ytdBWA.summeErloese)}
        {@render lexKosten("Summe der Betriebskosten", currentBWA.summeBetriebskosten, currentBWA.summeErloese, ytdBWA.summeBetriebskosten, ytdBWA.summeErloese, true)}
        
        <tr class="font-bold bg-purple-50 text-purple-900 border-t border-purple-200 text-sm"><td class="px-6 py-3 pl-10">EBITDA (Ergebnis vor Zinsen, Steuern, Abschreibungen)</td><td class="px-6 py-3 text-right">{formatCurrency(currentBWA.ebitda)}</td><td class="px-6 py-3 text-right text-purple-500 text-xs">{currentBWA.summeErloese ? (currentBWA.ebitda / currentBWA.summeErloese * 100).toFixed(2).replace('.', ',') + ' %' : '-'}</td><td class="px-6 py-3 text-center text-neutral-400">-</td><td class="px-6 py-3 text-right">{formatCurrency(ytdBWA.ebitda)}</td><td class="px-6 py-3 text-right text-purple-500 text-xs">{ytdBWA.summeErloese ? (ytdBWA.ebitda / ytdBWA.summeErloese * 100).toFixed(2).replace('.', ',') + ' %' : '-'}</td><td class="px-6 py-3 text-center text-neutral-400">-</td></tr>

        {@render lexNeutral("Abschreibungen", 0, 0, false, true)}
        {@render lexKosten("Abschreibungen", currentBWA.abschreibungen, currentBWA.summeErloese, ytdBWA.abschreibungen, ytdBWA.summeErloese)}

        <tr class="font-black bg-emerald-50 text-emerald-900 border-t-4 border-emerald-200 text-base"><td class="px-6 py-4">Vorläufiges betriebliches Ergebnis (EBIT / Gewinn)</td><td class="px-6 py-4 text-right">{formatCurrency(currentBWA.vorlaeufigesErgebnis)}</td><td class="px-6 py-4 text-right text-emerald-600 text-xs">{currentBWA.summeErloese ? (currentBWA.vorlaeufigesErgebnis / currentBWA.summeErloese * 100).toFixed(2).replace('.', ',') + ' %' : '-'}</td><td class="px-6 py-4 text-center text-neutral-400">-</td><td class="px-6 py-4 text-right">{formatCurrency(ytdBWA.vorlaeufigesErgebnis)}</td><td class="px-6 py-4 text-right text-emerald-600 text-xs">{ytdBWA.summeErloese ? (ytdBWA.vorlaeufigesErgebnis / ytdBWA.summeErloese * 100).toFixed(2).replace('.', ',') + ' %' : '-'}</td><td class="px-6 py-4 text-center text-neutral-400">-</td></tr>

        {@render lexNeutral("Informativ: Steuern", 0, 0, false, true)}
        {@render lexNeutral("Vereinnahmte Umsatzsteuer", currentBWA.umsatzsteuer, ytdBWA.umsatzsteuer)}
        {@render lexNeutral("Gezahlte Vorsteuer", currentBWA.vorsteuer, ytdBWA.vorsteuer)}
    </tbody>
</table>

{#snippet lexEinnahme(label: string, curVal: number, curSum: number, ytdVal: number, ytdSum: number, isSum = false)}{@const curPct = curSum ? (curVal / curSum * 100) : 0}{@const ytdPct = ytdSum ? (ytdVal / ytdSum * 100) : 0}<tr class="{isSum ? 'font-bold bg-neutral-50 border-t border-neutral-200' : 'hover:bg-neutral-50/50'} transition-colors"><td class="px-6 py-2 {isSum ? 'text-neutral-900' : 'text-neutral-700 pl-10'}">{label}</td><td class="px-6 py-2 text-right {isSum ? 'font-bold' : ''}">{formatCurrency(curVal)}</td><td class="px-6 py-2 text-right text-neutral-500 text-xs">{curSum && curVal ? curPct.toFixed(2).replace('.', ',') + ' %' : '-'}</td><td class="px-6 py-2 text-center text-neutral-400">-</td><td class="px-6 py-2 text-right {isSum ? 'font-bold' : ''}">{formatCurrency(ytdVal)}</td><td class="px-6 py-2 text-right text-neutral-500 text-xs">{ytdSum && ytdVal ? ytdPct.toFixed(2).replace('.', ',') + ' %' : '-'}</td><td class="px-6 py-2 text-center text-neutral-400">-</td></tr>{/snippet}
{#snippet lexKosten(label: string, curVal: number, curSum: number, ytdVal: number, ytdSum: number, isSum = false)}{@const curPct = curSum ? (curVal / curSum * 100) : 0}{@const ytdPct = ytdSum ? (ytdVal / ytdSum * 100) : 0}<tr class="{isSum ? 'font-bold bg-neutral-50 border-t border-neutral-200' : 'hover:bg-neutral-50/50'} transition-colors"><td class="px-6 py-2 {isSum ? 'text-neutral-900' : 'text-neutral-700 pl-10'}">{label}</td><td class="px-6 py-2 text-right {isSum ? 'font-bold' : ''}">{formatCurrency(curVal)}</td><td class="px-6 py-2 text-center text-neutral-400">-</td><td class="px-6 py-2 text-right text-neutral-500 text-xs">{curSum && curVal ? curPct.toFixed(2).replace('.', ',') + ' %' : '-'}</td><td class="px-6 py-2 text-right {isSum ? 'font-bold' : ''}">{formatCurrency(ytdVal)}</td><td class="px-6 py-2 text-center text-neutral-400">-</td><td class="px-6 py-2 text-right text-neutral-500 text-xs">{ytdSum && ytdVal ? ytdPct.toFixed(2).replace('.', ',') + ' %' : '-'}</td></tr>{/snippet}
{#snippet lexNeutral(label: string, curVal: number, ytdVal: number, isSum = false, isHeader = false)}<tr class="{isHeader ? 'font-bold bg-indigo-50/50 text-indigo-900 border-y border-indigo-100' : (isSum ? 'font-black bg-neutral-100 border-y border-neutral-200' : 'hover:bg-neutral-50/50')} transition-colors"><td class="px-6 py-2 {isHeader ? 'text-indigo-900' : (isSum ? 'text-neutral-900' : 'text-neutral-700')}">{label}</td><td class="px-6 py-2 text-right {isSum ? 'font-black' : ''}">{isHeader ? '' : formatCurrency(curVal)}</td><td class="px-6 py-2 text-center text-neutral-400">-</td><td class="px-6 py-2 text-center text-neutral-400">-</td><td class="px-6 py-2 text-right {isSum ? 'font-black' : ''}">{isHeader ? '' : formatCurrency(ytdVal)}</td><td class="px-6 py-2 text-center text-neutral-400">-</td><td class="px-6 py-2 text-center text-neutral-400">-</td></tr>{/snippet}