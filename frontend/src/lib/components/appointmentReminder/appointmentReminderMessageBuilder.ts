import { pb } from "$lib/services/pocketbase";
import { orgaStore } from "$lib/stores/orgaStore.svelte";
import { buildPrioritizedContacts } from "$lib/services/contactPickerService";
import { sortAlphabetical } from "$lib/utils/sortHelper";

export interface ReminderInitialState {
    method: 'email' | 'whatsapp';
    recipient: string;
    subject: string;
    appDate: string;
    appTime: string;
    appDesc: string;
    appLocation: string;
    appReport: string;
    includeReport: boolean;
    availableContacts: any[];
    selectedContactRefs: any[];
    message: string;
}

export function buildSalutation(
    selectedContacts: any[],
    recipient: string,
    method: 'email' | 'whatsapp',
    client: any
): string {
    if (selectedContacts.length === 1) {
        return selectedContacts[0].salutation || "Guten Tag,";
    }
    if (selectedContacts.length === 2) {
        const first = (selectedContacts[0].salutation || "Guten Tag").replace(',', '');
        const second = (selectedContacts[1].salutation || "Guten Tag").replace(',', '');
        return `${first},\n${second.charAt(0).toLowerCase() + second.slice(1)},`;
    }
    if (selectedContacts.length >= 3) {
        return "Sehr geehrte Damen und Herren,";
    }
    const emailsCount = recipient.split(',').map(e => e.trim()).filter(Boolean).length;
    if (method === 'email' && emailsCount > 1) {
        return "Sehr geehrte Damen und Herren,";
    }
    const rec = client?.expand?.caregiver || client;
    if (rec?.salutation === 'Herr') return `Sehr geehrter Herr ${rec.name_last || ''},`;
    if (rec?.salutation === 'Frau') return `Sehr geehrte Frau ${rec.name_last || ''},`;
    return `Guten Tag ${rec?.name_first || ''} ${rec?.name_last || ''},`.trim();
}

export function buildReminderMessage(params: {
    selectedContacts: any[];
    recipient: string;
    method: 'email' | 'whatsapp';
    client: any;
    appointment: any;
    appDate: string;
    appTime: string;
    generatedBody?: string | null;
}): string {
    const { selectedContacts, recipient, method, client, appointment, appDate, appTime, generatedBody } = params;
    const salutation = buildSalutation(selectedContacts, recipient, method, client);
    if (generatedBody) {
        return `${salutation}\n\n${generatedBody}`;
    }
    const isClientOnly = selectedContacts.length > 0 ? selectedContacts.every(c => c.isClient) : !client?.expand?.caregiver;
    const clientName = `${client?.name_first || ''} ${client?.name_last || ''}`.trim();
    const isPast = appointment?.appointment && new Date(appointment.appointment) < new Date();
    const baseText = isPast
        ? (isClientOnly ? `hiermit erhalten Sie eine Nachricht zu unserem gemeinsamen Termin vom ${appDate}.` : `hiermit erhalten Sie eine Nachricht zu unserem Termin mit ${clientName} vom ${appDate}.`)
        : (isClientOnly ? `hiermit möchten wir Sie an unseren gemeinsamen Termin am ${appDate} um ${appTime} erinnern.` : `hiermit möchten wir Sie an unseren Termin mit ${clientName} am ${appDate} um ${appTime} erinnern.`);

    return `${salutation}\n\n${baseText}\n\n\n👉 https://www.ihre-seniorenassistenz.com/portal\n\n`;
}

export function getRecipientForMethod(client: any, method: 'email' | 'whatsapp'): string {
    if (method === 'email') {
        let emails: string[] = [];
        if (client?.expand?.caregiver?.email) emails.push(client.expand.caregiver.email);
        else if (client?.email) emails.push(client.email);
        if (client?.mailing_list && Array.isArray(client.mailing_list)) emails = [...emails, ...client.mailing_list];
        return [...new Set(emails)].filter(Boolean).join(", ");
    }
    return client?.expand?.caregiver?.handy || client?.expand?.caregiver?.phone || client?.handy || client?.phone || "";
}

export function toggleContactRecipient(params: {
    method: 'email' | 'whatsapp';
    contact: any;
    isChecked: boolean;
    recipient: string;
    selectedContactRefs: any[];
}): { recipient: string; selectedContactRefs: any[] } {
    const { method, contact, isChecked, recipient, selectedContactRefs } = params;
    const isEmail = method === 'email';
    const contactVal = isEmail ? contact.email : contact.phone;
    if (!contactVal) return { recipient, selectedContactRefs };

    let currentVals = recipient.split(',').map(e => e.trim()).filter(Boolean);
    let updatedRefs = [...selectedContactRefs];

    if (isChecked) {
        if (!currentVals.includes(contactVal)) currentVals.push(contactVal);
        if (!updatedRefs.find(c => (isEmail ? c.email : c.phone) === contactVal)) updatedRefs.push(contact);
    } else {
        currentVals = currentVals.filter(e => e !== contactVal);
        updatedRefs = updatedRefs.filter(c => (isEmail ? c.email : c.phone) !== contactVal);
    }
    return { recipient: currentVals.join(', '), selectedContactRefs: updatedRefs };
}

export async function fetchUpcomingAppointments(clientId: string, excludeAppId: string): Promise<any[]> {
    if (!clientId) return [];
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const nowStr = now.toISOString().split('T')[0] + ' 00:00:00';
    try {
        return await pb.collection('appointments').getFullList({
            filter: `client ~ '${clientId}' && appointment >= '${nowStr}' && id != '${excludeAppId}'`,
            sort: 'appointment',
            requestKey: null
        });
    } catch {
        return [];
    }
}

export function buildInitialReminderState(app: any, cl: any): ReminderInitialState {
    const emailStr = getRecipientForMethod(cl, 'email');
    const phoneStr = getRecipientForMethod(cl, 'whatsapp');
    const method: 'email' | 'whatsapp' = emailStr ? 'email' : (phoneStr ? 'whatsapp' : 'email');
    const recipient = method === 'email' ? emailStr : phoneStr;

    const dateStr = app?.appointment ? new Date(app.appointment).toLocaleDateString('de-DE') : 'Unbekannt';
    const timeStr = app?.appointment ? new Date(app.appointment).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : 'Unbekannt';
    const isPast = app?.appointment && new Date(app.appointment) < new Date();
    const subject = isPast ? `Nachricht zu Ihrem Termin am ${dateStr}` : `Terminerinnerung: ${dateStr}`;
    const appDate = dateStr;
    const appTime = timeStr !== 'Unbekannt' ? `${timeStr} Uhr` : timeStr;
    const appDesc = app?.description || 'Keine weitere Beschreibung';

    let locationStr = "";
    if (app?.expand?.appointment_at?.[0]) {
        const contact = app.expand.appointment_at[0];
        const namePart = [contact.company_name, `${contact.name_first} ${contact.name_last}`.trim()].filter(Boolean).join(' - ');
        const addressPart = `${contact.street || ''} ${contact.housenr || ''}`.trim();
        const cityPart = `${contact.zip || ''} ${contact.city || ''}`.trim();
        locationStr = [namePart, addressPart, cityPart].filter(Boolean).join(', ');
    } else if (app?.location_address) {
        locationStr = app.location_address;
    }

    const appReport = app?.report || "";
    const includeReport = Boolean(appReport);
    const targetClient = cl || app?.expand?.client?.[0] || app?.expand?.client || (app?.client && orgaStore.clients?.data?.find((c: any) => c.id === (Array.isArray(app.client) ? app.client[0] : app.client)));
    const rawContacts = buildPrioritizedContacts(targetClient);
    const availableContacts = sortAlphabetical(rawContacts, (c: any) => c.name || '');

    const selectedContactRefs: any[] = [];
    if (recipient) {
        const isEmail = method === 'email';
        const matched = availableContacts.find((c: any) => (isEmail ? c.email : c.phone) === recipient);
        if (matched) selectedContactRefs.push(matched);
    }

    const message = buildReminderMessage({
        selectedContacts: selectedContactRefs,
        recipient,
        method,
        client: cl,
        appointment: app,
        appDate,
        appTime
    });

    return {
        method,
        recipient,
        subject,
        appDate,
        appTime,
        appDesc,
        appLocation: locationStr,
        appReport,
        includeReport,
        availableContacts,
        selectedContactRefs,
        message
    };
}

export async function generateReminderAiDraft(params: {
    appDate: string;
    appTime: string;
    appDesc: string;
    appLocation: string;
    selectedContactRefs: any[];
    client: any;
}): Promise<string> {
    const { appDate, appTime, appDesc, appLocation, selectedContactRefs, client } = params;
    const isClientOnly = selectedContactRefs.length > 0 ? selectedContactRefs.every(c => c.isClient) : !client?.expand?.caregiver;
    const clientNameStr = client ? `${client.name_first || ''} ${client.name_last || ''}`.trim() : 'unserem Klienten';
    const prompt = `Erinnere freundlich an den Termin am ${appDate} um ${appTime} Uhr bezüglich ${appDesc}. Treffpunkt: ${appLocation || 'Beim Klienten'}. Kontext: ${isClientOnly ? 'Klient' : `Angehöriger/Betreuer für ${clientNameStr}`}.`;

    const microserviceUrl = import.meta.env.DEV ? 'http://localhost:3000' : '';
    const res = await fetch(`${microserviceUrl}/api/emails/ai/transcribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${pb.authStore.token}` },
        body: JSON.stringify({ prompt, inputText: "Generiere die Nachricht basierend auf dem Prompt." })
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || "Server-Fehler");
    return data.text;
}
