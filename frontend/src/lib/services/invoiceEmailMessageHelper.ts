import { pb } from "$lib/services/pocketbase";
import { toastStore } from "$lib/services/toastService.svelte";

export function getClientFromInvoice(invoice: any, orgaStore: any) {
    if (Array.isArray(invoice?.expand?.client)) return invoice.expand.client[0];
    if (invoice?.expand?.client) return invoice.expand.client;
    if (invoice?.client) {
        const cId = Array.isArray(invoice.client) ? invoice.client[0] : invoice.client;
        return orgaStore.clients?.data?.find((c: any) => c.id === cId);
    }
    return null;
}

export function generateEmailSalutation(selectedContactRefs: any[], emailTo: string, invoice: any, orgaStore: any): string {
    if (selectedContactRefs.length === 1) {
        return selectedContactRefs[0].salutation;
    } else if (selectedContactRefs.length === 2) {
        return `${selectedContactRefs[0].salutation.replace(',', '')},\n${selectedContactRefs[1].salutation.replace(',', '').toLowerCase()},`;
    } else if (selectedContactRefs.length >= 3 || emailTo.split(',').filter(Boolean).length > 1) {
        return "Sehr geehrte Damen und Herren,";
    }
    const client = getClientFromInvoice(invoice, orgaStore);
    if (client?.salutation === 'Herr') return `Sehr geehrter Herr ${client.name_last},`;
    if (client?.salutation === 'Frau') return `Sehr geehrte Frau ${client.name_last},`;
    return `Guten Tag ${client?.name_first || ''} ${client?.name_last || ''},`.trim();
}

export function generateEmailDefaultBody(
    selectedContactRefs: any[],
    emailTo: string,
    invoice: any,
    invoices: any[],
    isMahnungMode: boolean,
    orgaStore: any,
    mahnungLevel: number = 1,
    dunningFee: number = 0
): string {
    const newSalutation = generateEmailSalutation(selectedContactRefs, emailTo, invoice, orgaStore);
    const isClientOnly = selectedContactRefs.length > 0 ? selectedContactRefs.every(c => c.isClient) : false;
    const client = getClientFromInvoice(invoice, orgaStore);
    const clientName = `${client?.name_first || ''} ${client?.name_last || ''}`.trim();
    const baseContext = (!isClientOnly && clientName) ? ` für ${clientName}` : '';

    if (isMahnungMode) {
        const invNr = invoices.map(i => i.invoice_nr).filter(Boolean).join(', ') || '–';
        const totalAmount = invoices.reduce((sum, i) => sum + (Number(i.remaining_amount) || Number(i.brutto) || 0), 0);
        const totalFormatted = totalAmount > 0 ? `${totalAmount.toFixed(2).replace('.', ',')} €` : '';
        const feeFormatted = dunningFee > 0 ? `${dunningFee.toFixed(2).replace('.', ',')} €` : '';
        const finalSum = (totalAmount + (dunningFee || 0)).toFixed(2).replace('.', ',') + ' €';

        let feeNote = '';
        if (dunningFee > 0) {
            feeNote = `\n\nOffener Rechnungsbetrag: ${totalFormatted}\nMahngebühr: ${feeFormatted}\nGesamtforderung: ${finalSum}`;
        } else if (totalFormatted) {
            feeNote = `\n\nOffener Rechnungsbetrag: ${totalFormatted}`;
        }

        const dateInDays = (days: number) => {
            const d = new Date();
            d.setDate(d.getDate() + days);
            return d.toLocaleDateString('de-DE');
        };

        if (mahnungLevel === 1) {
            return `${newSalutation}\n\nbezugnehmend auf unsere Rechnung ${invNr}${baseContext} möchten wir Sie freundlich daran erinnern, dass die Begleichung der Rechnung noch aussteht.${feeNote}\n\nBitte überweisen Sie den fälligen Betrag in den nächsten Tagen.\n\nSollte sich Ihre Zahlung mit dieser Erinnerung überschnitten haben, betrachten Sie dieses Schreiben bitte als gegenstandslos.\n\nMit freundlichen Grüßen\nIhre Seniorenassistenz`;
        } else if (mahnungLevel === 2) {
            return `${newSalutation}\n\ntrotz unserer bisherigen Zahlungserinnerung konnten wir bisher keinen Zahlungseingang für die Rechnung ${invNr}${baseContext} feststellen.${feeNote}\n\nWir fordern Sie hiermit höflich, aber bestimmt auf, den Gesamtbetrag bis spätestens ${dateInDays(7)} auf unser angegebenes Bankkonto zu überweisen.\n\nBei Rückfragen stehen wir Ihnen jederzeit gern zur Verfügung.\n\nMit freundlichen Grüßen\nIhre Seniorenassistenz`;
        } else {
            return `${newSalutation}\n\ndies ist die 3. und letzte Mahnung zur Rechnung ${invNr}${baseContext}.${feeNote}\n\nBitte überweisen Sie den Betrag unverzüglich bis zum ${dateInDays(5)}.\n\nSollte bis zu dieser Frist kein Zahlungseingang verbucht sein, müssen wir die Angelegenheit ohne weitere Ankündigung an unser Inkassounternehmen übergeben. Hierdurch entstehen für Sie erhebliche weitere Kosten.\n\nMit freundlichen Grüßen\nIhre Seniorenassistenz`;
        }
    }
    return `${newSalutation}\n\nanbei erhalten Sie die Dokumente bzw. Abrechnung${baseContext} als PDF im Anhang.\n\nBei Rückfragen stehen wir Ihnen jederzeit gern zur Verfügung.\n\nMit freundlichen Grüßen\nIhre Seniorenassistenz`;
}

export function generateEmailDefaultSubject(invoices: any[], isMahnungMode: boolean, mahnungLevel: number): string {
    const defaultRef = invoices.map(i => i.invoice_nr).filter(Boolean).join(', ') || 'Neu';
    if (isMahnungMode) {
        if (mahnungLevel === 1) return `1. Zahlungserinnerung: Rechnung ${defaultRef}`;
        if (mahnungLevel === 2) return `2. Mahnung: Rechnung ${defaultRef}`;
        return `3. Letzte Mahnung (Dringend): Rechnung ${defaultRef}`;
    }
    return invoices.length > 1 ? `Ihre Rechnungen / Dokumente` : `Rechnung ${defaultRef}`;
}

export async function saveAppointmentReportToDb(id: string, reportText: string) {
    try {
        await pb.collection('appointments').update(id, { report: reportText });
        toastStore.success("Bericht in Datenbank gespeichert.");
    } catch {
        toastStore.error("Fehler beim Speichern.");
    }
}
