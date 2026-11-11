import { pb } from "$lib/services/pocketbase";
import { orgaStore } from "$lib/stores/orgaStore.svelte";
import { toastStore } from "$lib/services/toastService.svelte";
import { confirmStore } from "$lib/services/confirmService.svelte";
import { hapticFeedback } from "$lib/services/hapticFeedback";
import { MICROSERVICE_URL } from "$lib/services/emailService";
import type { ClientRecord, Salutation } from "$lib/types/orgaTypes";

export interface AdmissionFormData {
    salutation: Salutation;
    name_first: string;
    name_last: string;
    birthdate: string;
    marital_status: string;
    nationality: string;
    street: string;
    housenr: string;
    zip: string;
    city: string;
    phone: string;
    handy: string;
    email: string;
    level_of_care: string;
    insurance: string;
    insurance_nr: string;
    notes: string;
    // Betreuer / Pflegeperson
    has_caregiver: boolean;
    caregiver_name_first: string;
    caregiver_name_last: string;
    caregiver_relation: string;
    caregiver_phone: string;
    caregiver_email: string;
    caregiver_street: string;
    caregiver_housenr: string;
    caregiver_zip: string;
    caregiver_city: string;
    caregiver_has_power_of_attorney: boolean;
    caregiver_notes: string;
    sendConfirmationEmail: boolean;
}

export function parseAdmissionData(client: any): AdmissionFormData {
    const notesRaw = client?.notes || '';
    let cleanedNotes = notesRaw.replace(/⚠️ NEUAUFNAHME-ANFRAGE:\s*/i, '');
    let matchedIns = '';
    const insMatch = cleanedNotes.match(/\[NEUE_KRANKENKASSE:\s*({.*?})\]/);
    if (insMatch) {
        try {
            const insData = JSON.parse(insMatch[1]);
            matchedIns = insData.name || '';
        } catch {}
        cleanedNotes = cleanedNotes.replace(/\[NEUE_KRANKENKASSE:\s*{.*?}\]\n?/g, '');
    }

    const info = client?.inheritor_info || {};
    const caregiverName = client?.inheritor_name || '';
    let cgFirst = '', cgLast = '';
    if (caregiverName) {
        const parts = caregiverName.trim().split(/\s+/);
        cgFirst = parts.slice(0, -1).join(' ');
        cgLast = parts.slice(-1).join('');
    }

    const currentIns = Array.isArray(client?.insurance) ? client.insurance[0] : (client?.insurance || '');

    return {
        salutation: client?.salutation || 'Keine Angabe',
        name_first: client?.name_first || '',
        name_last: client?.name_last || '',
        birthdate: client?.birthdate ? client.birthdate.split('T')[0].split(' ')[0] : '',
        marital_status: client?.marital_status || '',
        nationality: client?.nationality || '',
        street: client?.street || '',
        housenr: client?.housenr || '',
        zip: client?.zip || '',
        city: client?.city || '',
        phone: client?.phone || '',
        handy: client?.handy || '',
        email: client?.email || '',
        level_of_care: client?.level_of_care || '',
        insurance: currentIns,
        insurance_nr: client?.insurance_nr || '',
        notes: cleanedNotes.trim(),
        has_caregiver: !!(caregiverName || client?.caregiver),
        caregiver_name_first: cgFirst,
        caregiver_name_last: cgLast,
        caregiver_relation: client?.inheritor_relation || 'Gesetzlicher Betreuer',
        caregiver_phone: client?.inheritor_phone || '',
        caregiver_email: client?.inheritor_email || '',
        caregiver_street: info.street || '',
        caregiver_housenr: info.housenr || '',
        caregiver_zip: info.zip || '',
        caregiver_city: info.city || '',
        caregiver_has_power_of_attorney: !!client?.inheritor_has_power_of_attorney,
        caregiver_notes: client?.inheritor_notes || '',
        sendConfirmationEmail: !!(client?.email || client?.inheritor_email)
    };
}

export function findAdmissionDuplicates(name_first: string, name_last: string, insurance_nr: string, currentId: string) {
    const list = ((orgaStore.clients?.data || []) as ClientRecord[]).filter(c => c.id !== currentId);
    const fName = name_first.trim().toLowerCase();
    const lName = name_last.trim().toLowerCase();
    const insNr = insurance_nr.trim().toLowerCase();

    const nameMatch = list.find(c => (c.name_first || '').trim().toLowerCase() === fName && (c.name_last || '').trim().toLowerCase() === lName);
    const insMatch = insNr ? list.find(c => (c.insurance_nr || '').trim().toLowerCase() === insNr) : null;
    return { nameMatch, insMatch };
}

export async function saveAdmissionReview(clientId: string, form: AdmissionFormData, client: any): Promise<any> {
    if (!form.name_first.trim() || !form.name_last.trim()) {
        throw new Error("Bitte Vor- und Nachname des Klienten angeben.");
    }

    const dup = findAdmissionDuplicates(form.name_first, form.name_last, form.insurance_nr, clientId);
    if (dup.nameMatch) {
        const ok = await confirmStore.ask(
            `Ein Klient mit dem Namen „${form.name_first} ${form.name_last}“ existiert bereits im System. Möchten Sie die Aufnahme trotzdem durchführen?`,
            "Mögliches Klienten-Duplikat", "Trotzdem aufnehmen", "Abbrechen", true
        );
        if (!ok) return null;
    }

    let caregiverContactId: string | null = client.caregiver || null;
    if (form.has_caregiver && (form.caregiver_name_first.trim() || form.caregiver_name_last.trim())) {
        try {
            const contactPayload = {
                salutation: 'Keine Angabe',
                name_first: form.caregiver_name_first.trim(),
                name_last: form.caregiver_name_last.trim(),
                phone: form.caregiver_phone.trim(),
                email: form.caregiver_email.trim(),
                street: form.caregiver_street.trim(),
                housenr: form.caregiver_housenr.trim(),
                zip: form.caregiver_zip.trim(),
                city: form.caregiver_city.trim(),
                notes: JSON.stringify({
                    contact_type: 'caregiver',
                    relation: form.caregiver_relation,
                    has_power_of_attorney: form.caregiver_has_power_of_attorney,
                    notes: form.caregiver_notes
                })
            };
            if (caregiverContactId) {
                await pb.collection('contacts').update(caregiverContactId, contactPayload);
            } else {
                const created = await pb.collection('contacts').create(contactPayload);
                caregiverContactId = created.id;
            }
        } catch (err: any) {
            console.warn("Betreuer-Kontakt konnte nicht gespeichert werden:", err);
        }
    }

    const payload: any = {
        salutation: form.salutation,
        name_first: form.name_first.trim(),
        name_last: form.name_last.trim(),
        birthdate: form.birthdate ? `${form.birthdate} 12:00:00.000Z` : '',
        marital_status: form.marital_status,
        nationality: form.nationality,
        street: form.street.trim(),
        housenr: form.housenr.trim(),
        zip: form.zip.trim(),
        city: form.city.trim(),
        phone: form.phone.trim(),
        handy: form.handy.trim(),
        email: form.email.trim(),
        level_of_care: form.level_of_care,
        insurance: form.insurance ? [form.insurance] : [],
        insurance_nr: form.insurance_nr.trim(),
        notes: form.notes.trim(),
        status: 'Aktiv'
    };

    let contacts = Array.isArray(client.contacts) ? [...client.contacts] : (client.contacts ? [client.contacts] : []);
    const relations = { ...(client.contact_relations || {}) };
    if (caregiverContactId) {
        payload.caregiver = caregiverContactId;
        if (!contacts.includes(caregiverContactId)) contacts.push(caregiverContactId);
        relations[caregiverContactId] = form.caregiver_relation || 'Gesetzlicher Betreuer';
        payload.contacts = contacts;
        payload.contact_relations = relations;
    }

    const updated = await pb.collection('clients').update(clientId, payload, {
        expand: 'insurance,contacts,caregiver,retirement_homes',
        requestKey: null
    });

    if (orgaStore.clients) await orgaStore.clients.init();
    if (orgaStore.contacts) await orgaStore.contacts.init();

    if (form.sendConfirmationEmail && (form.email || form.caregiver_email)) {
        try {
            await fetch(`${MICROSERVICE_URL}/email/send-admission-confirmation`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${pb.authStore.token}` },
                body: JSON.stringify({ clientId, email: form.email || form.caregiver_email, clientName: `${form.name_first} ${form.name_last}` })
            }).catch(() => {});
        } catch {}
    }

    hapticFeedback.success();
    toastStore.success(`Klient „${form.name_first} ${form.name_last}“ erfolgreich aufgenommen ✓`);
    return updated;
}

