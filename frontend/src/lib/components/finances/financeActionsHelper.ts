import { confirmStore } from "$lib/services/confirmService.svelte";
import { toastStore } from "$lib/services/toastService.svelte";

export async function confirmAndDeleteTransaction(id: string, financeService: any) {
    if (await confirmStore.ask("Buchung wirklich löschen?", "Löschen", "Ja", "Abbrechen", true)) {
        await financeService.deleteTransaction(id);
    }
}

export async function confirmAndDeleteContract(id: string, financeService: any) {
    if (await confirmStore.ask("Vertrag wirklich löschen?", "Löschen", "Ja", "Abbrechen", true)) {
        await financeService.deleteContract(id);
    }
}

export async function bookContractTransaction(c: any, financeService: any) {
    const fd = new FormData();
    fd.append("title", `Vertrag: ${c.title}`);
    fd.append("amount", c.amount.toString());
    fd.append("type", c.type || "expense");
    fd.append("category", "Vertrag");
    fd.append("date", new Date().toISOString());
    await financeService.addTransaction(fd);
    toastStore.success(`Buchung für '${c.title}' erfasst!`);
}

export function exportTransactionsToCsv(transactions: any[], periodLabel: string) {
    if (transactions.length === 0) return toastStore.info("Keine Buchungen vorhanden.");
    const rows = transactions.map(t => [
        t.date ? new Date(t.date).toLocaleDateString("de-DE") : '',
        t.type === 'income' ? 'Einnahme' : 'Ausgabe',
        `"${(t.title || '').replace(/"/g, '""')}"`,
        (Number(t.amount) || 0).toFixed(2).replace('.', ',')
    ]);
    const csv = "\uFEFFDatum;Typ;Titel;Betrag\r\n" + rows.map(r => r.join(";")).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    a.download = `Haushaltsbuch_${periodLabel.replace(/\s+/g, '_')}.csv`;
    a.click();
}
