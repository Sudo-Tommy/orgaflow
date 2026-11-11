import { toastStore } from "$lib/services/toastService.svelte";

export function formatCurrency(val: number): string {
    return (val || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
}

export function formatBarAmount(val: number): string {
    const sign = val > 0 ? '+' : (val < 0 ? '-' : '');
    const abs = Math.abs(val);
    if (abs >= 10000) {
        return sign + (abs / 1000).toFixed(1).replace('.', ',') + 'k';
    } else if (abs >= 1000) {
        return sign + (abs / 1000).toFixed(1).replace('.', ',') + 'k';
    } else {
        return (val > 0 ? '+' : '') + Math.round(val) + ' €';
    }
}

export function exportFinanceCsv(timeline: any[], year: number, scenario: string): void {
    if (!timeline || timeline.length === 0) {
        toastStore.info("Keine Prognosedaten zum Exportieren vorhanden.");
        return;
    }

    const headers = [
        "Monat", "Typ", "BWA Umsatz", "BWA Betriebsausgaben", "BWA Betriebsgewinn",
        "BWA Steuern (Est/GewSt/USt)", "BWA Netto nach Steuern",
        "Privat Einnahmen", "Privat Fixkosten", "Privat Var. Kosten", "Privat Ausgaben Gesamt",
        "Privat Saldo", "Konsolidiertes Nettoeinkommen", "Freier Gesamt-Cashflow", "Kumulierter Stand"
    ];

    const rows = timeline.map(m => [
        m.month,
        m.isHistorical ? "Reale Ist-Daten" : "Prognose",
        m.bwaRevenue.toFixed(2).replace('.', ','),
        m.bwaExpenses.toFixed(2).replace('.', ','),
        m.bwaProfit.toFixed(2).replace('.', ','),
        m.bwaTaxes.toFixed(2).replace('.', ','),
        m.bwaNetAfterTaxes.toFixed(2).replace('.', ','),
        m.personalIncome.toFixed(2).replace('.', ','),
        m.personalContracts.toFixed(2).replace('.', ','),
        m.personalVariableExpenses.toFixed(2).replace('.', ','),
        m.personalTotalExpenses.toFixed(2).replace('.', ','),
        m.personalBalance.toFixed(2).replace('.', ','),
        m.totalNetIncome.toFixed(2).replace('.', ','),
        m.totalCashflow.toFixed(2).replace('.', ','),
        m.cumulativeBalance.toFixed(2).replace('.', ',')
    ]);

    const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map(r => r.join(";"))].join("\r\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Gesamt_Finanzprognose_${year}_${scenario}.csv`);
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, 100);
    toastStore.success("Finanzprognose erfolgreich als CSV exportiert.");
}
