import { pb } from "$lib/services/pocketbase";

export interface NormalizedContactRelation {
    relation: string;
    is_primary: boolean;
    is_careperson: boolean;
    has_power_of_attorney: boolean;
    notes?: string;
}

export type ContactRoleRelation = NormalizedContactRelation;

export interface MissingSignaturePrompt {
    contactId: string;
    contact: any;
    role: 'careperson' | 'inheritor' | 'both';
    label: string;
}

export function getNormalizedContactRelation(client: any, contactId: string): NormalizedContactRelation {
    const raw = client?.contact_relations?.[contactId];
    const cgIds = Array.isArray(client?.caregiver) ? client.caregiver : (client?.caregiver ? [client.caregiver] : []);
    const inhIds = Array.isArray(client?.inheritor) ? client.inheritor : (client?.inheritor ? [client.inheritor] : []);

    if (typeof raw === 'string') {
        const lower = raw.toLowerCase();
        return {
            relation: raw || 'Angehörige/r',
            is_primary: false,
            is_careperson: lower.includes('pflegeperson') || cgIds.includes(contactId),
            has_power_of_attorney: lower.includes('betreuer') || lower.includes('bevollm') || lower.includes('vertretung') || lower.includes('erbe') || inhIds.includes(contactId),
            notes: ''
        };
    }

    const relText = String(raw?.relation || 'Angehörige/r');
    const lower = relText.toLowerCase();
    return {
        relation: relText,
        is_primary: Boolean(raw?.is_primary),
        is_careperson: Boolean(raw?.is_careperson || lower.includes('pflegeperson') || cgIds.includes(contactId)),
        has_power_of_attorney: Boolean(raw?.has_power_of_attorney || lower.includes('betreuer') || lower.includes('bevollm') || lower.includes('vertretung') || lower.includes('erbe') || inhIds.includes(contactId)),
        notes: String(raw?.notes || '')
    };
}

export function getClientLinkedContacts(client: any, allContacts: any[] = []): any[] {
    if (!client) return [];
    const expanded = Array.isArray(client.expand?.contacts)
        ? client.expand.contacts
        : (client.expand?.contacts ? [client.expand.contacts] : []);
    const ids = Array.isArray(client.contacts) ? client.contacts : (client.contacts ? [client.contacts] : []);
    if (allContacts.length > 0) {
        return allContacts.filter((c: any) => ids.includes(c.id));
    }
    return expanded;
}

export function resolveClientCarepersonContact(client: any, contactsList: any[] = []): any | null {
    if (!client) return null;
    const contacts = contactsList.length > 0 ? contactsList : getClientLinkedContacts(client);
    for (const c of contacts) {
        const rel = getNormalizedContactRelation(client, c.id);
        if (rel.is_careperson) return c;
    }
    const expCg = Array.isArray(client.expand?.caregiver) ? client.expand.caregiver[0] : client.expand?.caregiver;
    return expCg?.id ? expCg : null;
}

export function resolveClientInheritorContact(client: any, contactsList: any[] = []): any | null {
    if (!client) return null;
    const contacts = contactsList.length > 0 ? contactsList : getClientLinkedContacts(client);
    for (const c of contacts) {
        const rel = getNormalizedContactRelation(client, c.id);
        if (rel.has_power_of_attorney) return c;
    }
    const expInh = Array.isArray(client.expand?.inheritor) ? client.expand.inheritor[0] : client.expand?.inheritor;
    return expInh?.id ? expInh : null;
}

export function hasContactSignature(contact: any): boolean {
    if (!contact) return false;
    return Boolean(contact.sign && String(contact.sign).trim().length > 0);
}

export function getContactSignatureUrl(contact: any, _pb?: any): string {
    if (!hasContactSignature(contact)) return '';
    let url = pb.files.getURL(contact, contact.sign);
    if (url && pb.authStore.token && !url.startsWith('data:')) {
        url += (url.includes('?') ? '&' : '?') + 'token=' + pb.authStore.token;
    }
    return url;
}

/**
 * Liefert fehlende Unterschrifts-Aufforderungen für verknüpfte Kontakte.
 * Wenn derselbe Kontakt sowohl Pflegeperson als auch Vertretung ist, wird nur EIN kombinierter Button zurückgegeben.
 */
export function getMissingSignaturePrompts(client: any, contacts: any[] = []): MissingSignaturePrompt[] {
    if (!client) return [];
    const cpContact = resolveClientCarepersonContact(client, contacts);
    const inhContact = resolveClientInheritorContact(client, contacts);

    const cpMissing = Boolean(cpContact && !hasContactSignature(cpContact));
    const inhMissing = Boolean(inhContact && !hasContactSignature(inhContact));

    if (cpMissing && inhMissing && cpContact.id === inhContact.id) {
        return [{
            contactId: cpContact.id,
            contact: cpContact,
            role: 'both',
            label: 'Unterschrift erfassen'
        }];
    }

    const prompts: MissingSignaturePrompt[] = [];
    if (cpMissing) {
        prompts.push({
            contactId: cpContact.id,
            contact: cpContact,
            role: 'careperson',
            label: 'Unterschrift Pflegeperson erfassen'
        });
    }
    if (inhMissing) {
        prompts.push({
            contactId: inhContact.id,
            contact: inhContact,
            role: 'inheritor',
            label: 'Unterschrift Vertretung erfassen'
        });
    }
    return prompts;
}

/**
 * Berechnet aktualisierte caregiver- und inheritor-Listen aus contact_relations.
 */
export function buildRoleRelationFields(
    contactIdsOrMap: string[] | Record<string, any>,
    relationsMapArg?: Record<string, any>
) {
    const relationsMap = Array.isArray(contactIdsOrMap) ? (relationsMapArg || {}) : contactIdsOrMap;
    const contactIds = Array.isArray(contactIdsOrMap) ? contactIdsOrMap : Object.keys(relationsMap);
    const caregivers: string[] = [];
    const inheritors: string[] = [];

    for (const cid of contactIds) {
        const r = relationsMap[cid];
        const rText = String(typeof r === 'string' ? r : (r?.relation || '')).toLowerCase();
        const isCp = Boolean(r?.is_careperson || rText.includes('pflegeperson'));
        const isInh = Boolean(r?.has_power_of_attorney || rText.includes('betreuer') || rText.includes('bevollm') || rText.includes('vertretung') || rText.includes('erbe'));
        if (isCp) caregivers.push(cid);
        if (isInh) inheritors.push(cid);
    }

    return {
        caregiver: caregivers[0] || null,
        inheritor: inheritors
    };
}
