import { pb } from "$lib/services/pocketbase";
import { orgaStore } from "$lib/stores/orgaStore.svelte";
import { stampInvoiceAsStorniert } from "$lib/services/invoiceStornoStampService";
import { getClientTemplateId, resolvePreferredTemplateId } from "./documentGeneratorRateHelper";

export function getReplacedBy(inv: any): string | null {
    if (!inv) return null;
    try {
        const meta = typeof inv.table_sum_positions === 'string' ? JSON.parse(inv.table_sum_positions) : (inv.table_sum_positions || {});
        if (meta?.replaced_by_invoice_nr) return meta.replaced_by_invoice_nr;
    } catch {}
    const m = inv.notes?.match(/Ersetzt durch (?:Rechnung )?([^\s\n,]+)/i);
    return m ? m[1] : null;
}

export function buildCorrectionEmailContent(originalNr: string, newNr: string, clientName?: string) {
    const subject = `Korrektur zu Rechnung ${originalNr} - Rechnung ${newNr}`;
    const text = `Guten Tag,\n\nanbei erhalten Sie die korrigierte Fassung zu Ihrer Rechnung ${originalNr} (neue Rechnungsnummer: ${newNr}).\n\nBitte berücksichtigen Sie für Ihre Unterlagen und die Überweisung ausschließlich dieses korrigierte Dokument.\n\nBei Rückfragen stehen wir Ihnen jederzeit gern zur Verfügung.\n\nMit freundlichen Grüßen\nIhre Seniorenassistenz`;
    return { subject, text };
}

export function setupServiceForCorrection(inv: any, service: any) {
    service.reset?.();
    service.isCorrection = true;
    service.originalInvoice = inv;

    const clientId = Array.isArray(inv.client) ? inv.client[0] : (inv.client || inv.expand?.client?.id || '');
    service.selectedClientId = clientId;

    let targetTemplateId = "";
    try {
        const meta = typeof inv.table_sum_positions === 'string' ? JSON.parse(inv.table_sum_positions) : (inv.table_sum_positions || {});
        if (!Array.isArray(meta) && meta?.templateId) targetTemplateId = meta.templateId;
    } catch {}
    if (!targetTemplateId) {
        const clientObj = orgaStore.clients?.data.find((c: any) => c.id === clientId);
        targetTemplateId = resolvePreferredTemplateId(clientObj, orgaStore.invoices?.data || [], orgaStore.document_templates?.data || []);
    }
    service.selectedTemplateId = targetTemplateId || (orgaStore.document_templates?.data.find((t: any) => (t.type || '').toLowerCase() === 'rechnung')?.id || '');

    const appIds = Array.isArray(inv.appointments) ? inv.appointments : (inv.appointments ? [inv.appointments] : []);
    service.selectedAppointmentIds = appIds.map((a: any) => (typeof a === 'string' ? a : a?.id)).filter(Boolean);
    service.showBilledAppointments = true;

    // Werte 1:1 von der alten Rechnung übernehmen (Regel A8)
    service.hourlyWage = inv.hourly_wage ?? 40;
    service.kmRate = inv.travel_expanses_rate ?? 0.3;
    service.taxRate = inv.tax_rate != null ? String(inv.tax_rate) : "0";

    const origDate = inv.issue_date ? new Date(inv.issue_date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
    service.includeCorrectionNotice = true;
    service.correctionNotice = `Korrektur zu Rechnung ${inv.invoice_nr || ''}${origDate ? ` vom ${origDate}` : ''}`;

    service.step = 3;
}

export async function finalizeOriginalInvoiceCancellation(originalId: string, newInvoiceNr: string, newInvoiceId?: string) {
    if (!originalId) return;
    try {
        const orig: any = orgaStore.invoices?.data.find((i: any) => i.id === originalId) || await pb.collection('invoices').getOne(originalId);
        if (!orig) return;
        const origNotes = (orig.notes || '').trim();
        const replacementNote = `Storniert - Ersetzt durch Rechnung ${newInvoiceNr}`;
        const newNotes = origNotes ? `${origNotes}\n${replacementNote}` : replacementNote;

        let origMeta: any = {};
        try {
            const p = typeof orig.table_sum_positions === 'string' ? JSON.parse(orig.table_sum_positions) : (orig.table_sum_positions || {});
            if (!Array.isArray(p)) origMeta = p;
        } catch {}
        origMeta.replaced_by_invoice_nr = newInvoiceNr;
        if (newInvoiceId) origMeta.replaced_by_invoice_id = newInvoiceId;

        await pb.collection('invoices').update(originalId, {
            status: 'Storniert',
            notes: newNotes,
            table_sum_positions: JSON.stringify(origMeta)
        });

        await stampInvoiceAsStorniert(originalId);

        const local = orgaStore.invoices?.data.find((i: any) => i.id === originalId);
        if (local) {
            local.status = 'Storniert';
            local.notes = newNotes;
            local.table_sum_positions = origMeta;
            (local as any).replaced_by_invoice_nr = newInvoiceNr;
        }
    } catch (e) {
        console.error("[finalizeOriginalInvoiceCancellation] Fehler beim Stornieren der Alt-Rechnung:", e);
    }
}
