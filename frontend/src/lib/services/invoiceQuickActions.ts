import { pb } from "$lib/services/pocketbase";
import { toastStore } from "$lib/services/toastService.svelte";
import { orgaStore } from "$lib/stores/orgaStore.svelte";

export function isInvoiceOverdue(inv: any): boolean {
    if (!inv || inv.status === 'Abgeschlossen' || inv.status === 'Storniert' || inv.is_cancellation) {
        return false;
    }
    const now = Date.now();
    if (inv.due_date) {
        return new Date(inv.due_date).getTime() < now;
    }
    if (inv.issue_date) {
        const days = Math.floor((now - new Date(inv.issue_date).getTime()) / 86400000);
        return days >= 14;
    }
    return false;
}

export function getInvoiceClientPhone(inv: any): string | null {
    const cl = Array.isArray(inv?.expand?.client) ? inv.expand.client[0] : (inv?.expand?.client || null);
    if (cl) {
        return cl.phone || cl.handy || cl.tel || null;
    }
    if (inv?.client) {
        const cId = Array.isArray(inv.client) ? inv.client[0] : inv.client;
        const localCl = orgaStore.clients?.data?.find((c: any) => c.id === cId);
        if (localCl) return localCl.phone || localCl.handy || localCl.tel || null;
    }
    return null;
}

export async function extendInvoiceDueDate(inv: any, daysToAdd: number): Promise<void> {
    try {
        const baseDate = inv.due_date ? new Date(inv.due_date) : new Date();
        baseDate.setDate(baseDate.getDate() + daysToAdd);
        const newDateStr = baseDate.toISOString().slice(0, 10);

        const currentNotes = inv.notes || '';
        const logNote = `\n[Fristverlängerung] Zahlungsziel um +${daysToAdd} Tage verlängert auf ${baseDate.toLocaleDateString('de-DE')} am ${new Date().toLocaleDateString('de-DE')}`;
        
        await pb.collection('invoices').update(inv.id, {
            due_date: newDateStr,
            notes: (currentNotes + logNote).trim()
        });

        if (orgaStore.invoices) await orgaStore.invoices.init();
        toastStore.success(`Zahlungsziel um ${daysToAdd} Tage verlängert (neu: ${baseDate.toLocaleDateString('de-DE')}) ✓`);
    } catch (e: any) {
        console.error("Fehler beim Verlängern des Zahlungsziels:", e);
        toastStore.error("Frist konnte nicht verlängert werden: " + (e.message || "Unbekannter Fehler"));
    }
}

export async function recordDunningSent(invoices: any[], level: number, dunningFee: number = 0): Promise<void> {
    const nowIso = new Date().toISOString();
    const todayDe = new Date().toLocaleDateString('de-DE');

    for (const inv of invoices) {
        if (!inv?.id) continue;
        try {
            const currentNotes = inv.notes || '';
            const feeText = dunningFee > 0 ? ` (Mahngebühr: ${dunningFee.toFixed(2).replace('.', ',')} €)` : '';
            const logNote = `\n[Mahnwesen] Stufe ${level} versendet am ${todayDe}${feeText}`;

            await pb.collection('invoices').update(inv.id, {
                dunning_level: level,
                last_reminder_date: nowIso,
                notes: (currentNotes + logNote).trim()
            });
        } catch (e) {
            console.warn(`[Mahnwesen] Mahnstatus für ${inv.id} nicht protokolliert:`, e);
        }
    }
    if (orgaStore.invoices) await orgaStore.invoices.init();
}

