import { pb } from "$lib/services/pocketbase";
import { orgaStore } from "$lib/stores/orgaStore.svelte";
import { toastStore } from "$lib/services/toastService.svelte";
import { confirmStore } from "$lib/services/confirmService.svelte";
import { getPdfUrl } from "$lib/utils/invoiceHelpers";
import { syncInvoicePaymentToAccounting, syncInvoiceCancellationToAccounting } from "$lib/services/invoiceAccountingService";
import { stampInvoiceAsStorniert } from "$lib/services/invoiceStornoStampService";
import type { InvoicePayload, SyncAction } from "$lib/utils/invoice";

export function useInvoicePageController(getFilteredInvoices: () => InvoicePayload[]) {
    let selectedInvoiceIds = $state<string[]>([]);
    let syncQueue = $state<SyncAction[]>([]);
    let activeMobileInvoice = $state<InvoicePayload | null>(null);

    const selectedInvoices = $derived(
        (orgaStore.invoices?.data || []).filter((inv: any) => selectedInvoiceIds.includes(inv.id))
    );

    function toggleSelection(id: string) {
        selectedInvoiceIds = selectedInvoiceIds.includes(id)
            ? selectedInvoiceIds.filter(i => i !== id)
            : [...selectedInvoiceIds, id];
    }

    function toggleAll() {
        const filtered = getFilteredInvoices();
        selectedInvoiceIds = selectedInvoiceIds.length === filtered.length && filtered.length > 0
            ? []
            : filtered.map(i => i.id);
    }

    async function performStatusUpdate(id: string, newStatus: string, paidAtDate: string | null) {
        const payload: any = { status: newStatus, paid_at: newStatus === 'Abgeschlossen' ? paidAtDate : null };
        const invStore = orgaStore.invoices;
        if (invStore) {
            const idx = invStore.data.findIndex((i: any) => i.id === id);
            if (idx !== -1) {
                invStore.data[idx].status = newStatus as any;
                invStore.data[idx].paid_at = payload.paid_at;
            }
        }
        try {
            await pb.collection('invoices').update(id, payload);
            toastStore.success("Status erfolgreich aktualisiert.");
            const target = invStore?.data.find((i: any) => i.id === id);
            if (target) {
                if (newStatus === 'Abgeschlossen') {
                    await syncInvoicePaymentToAccounting(target, paidAtDate);
                } else if (newStatus === 'Storniert') {
                    await syncInvoiceCancellationToAccounting(id, target.invoice_nr);
                    const stampRes = await stampInvoiceAsStorniert(id);
                    if (stampRes.success) {
                        toastStore.success("Rechnungs-PDF wurde mit Storno-Stempel versehen.");
                    }
                }
            }
        } catch (err) {
            toastStore.info("Offline: Status-Änderung in der Sync-Queue gespeichert.");
            syncQueue.push({ id, action: 'updateStatus', payload, timestamp: Date.now() });
        }
    }

    async function cancelInvoice(id: string, onOpenGenerator: (templateId: string, clientId: string, invoiceId: string) => void) {
        const inv = orgaStore.invoices?.data.find((i: any) => i.id === id);
        if (!inv || !await confirmStore.ask("Rechnung wirklich stornieren?", "Stornieren?", "Ja", "Abbrechen", true)) return;
        await performStatusUpdate(id, 'Storniert', null);
        const tpl = orgaStore.document_templates?.data.find((t: any) => t.name?.toLowerCase().includes('storno') || t.type?.toLowerCase().includes('storno'));
        if (tpl) onOpenGenerator(tpl.id, (Array.isArray(inv.client) ? inv.client[0] : inv.client) || '', inv.id || '');
    }

    async function deleteInvoice(id: string) {
        if (!await confirmStore.ask("Rechnung unwiderruflich löschen?", "Löschen?", "Löschen", "Abbrechen", true)) return;
        if (orgaStore.invoices) {
            const idx = orgaStore.invoices.data.findIndex((i: any) => i.id === id);
            if (idx !== -1) orgaStore.invoices.data.splice(idx, 1);
        }
        try {
            await pb.collection('invoices').delete(id);
            toastStore.info("Rechnung gelöscht.");
        } catch {
            syncQueue.push({ id, action: 'delete', timestamp: Date.now() });
        }
    }

    async function deleteSelected() {
        if (!selectedInvoiceIds.length || !await confirmStore.ask(`${selectedInvoiceIds.length} Rechnungen löschen?`, "Löschen?", "Löschen", "Abbrechen", true)) return;
        const ids = [...selectedInvoiceIds];
        selectedInvoiceIds = [];
        if (orgaStore.invoices) orgaStore.invoices.data = orgaStore.invoices.data.filter((i: any) => !ids.includes(i.id));
        try {
            for (let i = 0; i < ids.length; i += 20) await Promise.all(ids.slice(i, i + 20).map(id => pb.collection('invoices').delete(id)));
            toastStore.success(`${ids.length} Rechnungen gelöscht.`);
        } catch {
            ids.forEach(id => syncQueue.push({ id, action: 'delete', timestamp: Date.now() }));
        }
    }

    return {
        get selectedInvoiceIds() { return selectedInvoiceIds; },
        set selectedInvoiceIds(v) { selectedInvoiceIds = v; },
        get selectedInvoices() { return selectedInvoices; },
        get activeMobileInvoice() { return activeMobileInvoice; },
        set activeMobileInvoice(v) { activeMobileInvoice = v; },
        toggleSelection, toggleAll, performStatusUpdate, cancelInvoice, deleteInvoice, deleteSelected
    };
}
