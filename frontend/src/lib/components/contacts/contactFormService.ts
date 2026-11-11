import { pb } from "$lib/services/pocketbase";
import { toastStore } from "$lib/services/toastService.svelte";
import { orgaStore } from "$lib/stores/orgaStore.svelte";
import { resolveMatchingInquiriesForContact } from "$lib/services/contactPickerService";
import type { ContactRecord, ClientRecord, RetirementHomeRecord, Salutation, ContactType } from "$lib/types/orgaTypes";
import { parseContactNotes } from "./contactDetailHelpers";
import { syncAllContactRelations } from "./contactRelationSync";

export function toYMD(val: string): string {
    if (!val) return "";
    const match = val.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return `${match[1]}-${match[2]}-${match[3]}`;
    if (val.includes('.')) {
        const parts = val.split(/[. ]/);
        if (parts.length >= 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return val.substring(0, 10);
}

export function safeFormatDate(val: string): string {
    if (!val) return '';
    const clean = val.trim().replace(' ', 'T');
    const d = new Date(clean);
    if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
    }
    const match = val.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return `${match[3]}.${match[2]}.${match[1]}`;
    return val.split(' ')[0];
}

export interface ContactFormFields {
    salutation: Salutation;
    company_name: string;
    name_first: string;
    name_last: string;
    email: string;
    phone: string;
    street: string;
    housenr: string;
    zip: string;
    city: string;
    notes: string;
    birthdate: string;
    portal_pin: string;
    portal_code: string;
    portal_active: boolean;
    contact_type: ContactType | "";
    linkedClients: string[];
    linkedHomes: string[];
    linkedMailingLists: string[];
    documents: string[];
}

export function extractContactInitialState(
    record: ContactRecord | null | undefined,
    clients: ClientRecord[],
    homes: RetirementHomeRecord[]
): ContactFormFields {
    if (!record) {
        return {
            salutation: "Keine Angabe", company_name: "", name_first: "", name_last: "", email: "", phone: "",
            street: "", housenr: "", zip: "", city: "", notes: "", contact_type: "",
            birthdate: "", portal_pin: "", portal_code: "", portal_active: false,
            linkedClients: [], linkedHomes: [], linkedMailingLists: [], documents: []
        };
    }

    const parsed = parseContactNotes(record.notes);
    const parsedType = (record.contact_type as ContactType) || parsed.contact_type || (
        clients.some((c) => c.caregiver === record.id) ? 'caregiver' : ""
    );

    const linkedClients = clients.filter((c) => {
        const cContacts = Array.isArray(c.contacts) ? c.contacts : (c.contacts ? [c.contacts] : []);
        return cContacts.includes(record.id) || c.caregiver === record.id;
    }).map((c) => c.id);

    const linkedHomes = homes.filter((h) => {
        const hContacts = Array.isArray(h.contacts) ? h.contacts : (h.contacts ? [h.contacts] : []);
        return hContacts.includes(record.id);
    }).map((h) => h.id);

    const initialEmail = record.email || "";
    const linkedMailingLists = (clients as (ClientRecord & { mailing_list?: string[] })[]).filter((c) => {
        const ml = Array.isArray(c.mailing_list) ? c.mailing_list : (c.mailing_list ? [c.mailing_list] : []);
        return initialEmail && ml.includes(initialEmail);
    }).map((c) => c.id);

    const docs = Array.isArray(record.documents) ? [...record.documents] : (record.documents ? [record.documents] : []);

    return {
        salutation: (record.salutation as Salutation) || "Keine Angabe",
        company_name: record.company_name || "", name_first: record.name_first || "",
        name_last: record.name_last || "", email: record.email || "", phone: record.phone || "",
        street: record.street || "", housenr: record.housenr || "", zip: record.zip || "", city: record.city || "",
        birthdate: toYMD(record.birthdate || "") || "", portal_pin: (record as any).portal_pin || "",
        portal_code: (record as any).portal_code || "", portal_active: !!((record as any).portal_active),
        notes: parsed.text || "", contact_type: parsedType,
        linkedClients, linkedHomes, linkedMailingLists, documents: docs
    };
}

export interface SubmitContactOptions {
    editId: string | null;
    salutation: Salutation;
    company_name: string;
    name_first: string;
    name_last: string;
    email: string;
    phone: string;
    street: string;
    housenr: string;
    zip: string;
    city: string;
    notes: string;
    contact_type: ContactType | "";
    portal_active: boolean;
    portal_pin: string;
    portal_code: string;
    birthdate: string;
    signatureBlob: Blob | null;
    uploadedFile: File | null;
    signatureMode: "draw" | "upload";
    hasDrawnSignature: boolean;
    deleteExistingSignature: boolean;
    initialLinkedClients: string[];
    linkedClients: string[];
    initialLinkedHomes: string[];
    linkedHomes: string[];
    newDocuments?: File[];
    documentsToDelete?: string[];
    skipToast?: boolean;
}

export async function submitContact(options: SubmitContactOptions): Promise<{ saved: ContactRecord; pin: string; code: string }> {
    const pbFormData = new FormData();
    pbFormData.append('salutation', options.salutation);
    pbFormData.append('company_name', options.company_name.trim());
    pbFormData.append('name_first', options.name_first.trim());
    pbFormData.append('name_last', options.name_last.trim());
    pbFormData.append('email', options.email.trim());
    pbFormData.append('phone', options.phone.trim());
    pbFormData.append('street', options.street.trim());
    pbFormData.append('housenr', options.housenr.trim());
    pbFormData.append('zip', options.zip.trim());
    pbFormData.append('city', options.city.trim());
    pbFormData.append('notes', JSON.stringify({ text: options.notes.trim(), contact_type: options.contact_type }));
    pbFormData.append('contact_type', options.contact_type);
    pbFormData.append('portal_active', String(options.portal_active));

    let pin = options.portal_pin;
    let code = options.portal_code;
    if (options.portal_active) {
        if (!pin) pin = Math.floor(100000 + Math.random() * 900000).toString();
        pbFormData.append('portal_pin', pin);
        if (!code) code = 'sec_' + Array.from(crypto.getRandomValues(new Uint8Array(16))).map(b => b.toString(16).padStart(2, '0')).join('');
        pbFormData.append('portal_code', code);
    }
    if (options.birthdate) pbFormData.append('birthdate', `${options.birthdate.trim()} 12:00:00.000Z`);

    if (options.signatureMode === "upload" && options.uploadedFile) {
        pbFormData.append("sign", options.uploadedFile);
    } else if (options.signatureMode === "draw" && options.hasDrawnSignature && options.signatureBlob) {
        pbFormData.append("sign", options.signatureBlob, "signature.png");
    } else if (options.deleteExistingSignature) {
        pbFormData.append("sign", "");
    }

    if (options.documentsToDelete && options.documentsToDelete.length > 0) {
        for (const doc of options.documentsToDelete) {
            pbFormData.append('documents-', doc);
        }
    }
    if (options.newDocuments && options.newDocuments.length > 0) {
        for (const file of options.newDocuments) {
            pbFormData.append('documents+', file, file.name);
        }
    }

    let saved: ContactRecord;
    if (options.editId) {
        saved = await pb.collection('contacts').update(options.editId, pbFormData) as ContactRecord;
        if (!options.skipToast) toastStore.success(`Kontakt „${saved.name_first || ''} ${saved.name_last || saved.company_name}“ erfolgreich aktualisiert.`);
    } else {
        saved = await pb.collection('contacts').create(pbFormData) as ContactRecord;
        resolveMatchingInquiriesForContact(saved);
        if (!options.skipToast) toastStore.success(`Kontakt „${saved.name_first || ''} ${saved.name_last || saved.company_name}“ erfolgreich angelegt.`);
    }

    if (saved?.id) {
        await syncAllContactRelations(saved.id, options.initialLinkedClients, options.linkedClients, options.initialLinkedHomes, options.linkedHomes);
    }

    return { saved, pin, code };
}

export async function deleteContact(editId: string): Promise<void> {
    await pb.collection('contacts').delete(editId);
    toastStore.success("Kontakt erfolgreich gelöscht.");
    if (orgaStore.contacts) await orgaStore.contacts.init();
}

export async function updateContactPortal(
    editId: string,
    nextActive: boolean,
    pin: string,
    code: string,
    currentRecord: any
): Promise<{ portal_pin: string; portal_code: string }> {
    const updates: any = { portal_active: nextActive };
    let newPin = pin;
    let newCode = code;
    if (nextActive && (!pin || !code)) {
        if (!pin) newPin = Math.floor(100000 + Math.random() * 900000).toString();
        if (!code) newCode = 'sec_' + Array.from(crypto.getRandomValues(new Uint8Array(16))).map(b => b.toString(16).padStart(2, '0')).join('');
        if (newPin) updates.portal_pin = newPin;
        if (newCode) updates.portal_code = newCode;
    }
    const updated = await pb.collection('contacts').update(editId, updates);
    if (currentRecord) {
        currentRecord.portal_active = nextActive;
        if (updates.portal_pin) currentRecord.portal_pin = updated.portal_pin;
        if (updates.portal_code) currentRecord.portal_code = updated.portal_code;
    }
    const storeContact = orgaStore.contacts?.data?.find((c: any) => c.id === editId);
    if (storeContact) {
        storeContact.portal_active = nextActive;
        if (updates.portal_pin) storeContact.portal_pin = updated.portal_pin;
        if (updates.portal_code) storeContact.portal_code = updated.portal_code;
    }
    toastStore.success(nextActive ? "Portal-Zugang für Kontakt freigeschaltet!" : "Portal-Zugang für Kontakt gesperrt.");
    return { portal_pin: newPin, portal_code: newCode };
}
