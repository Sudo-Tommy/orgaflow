import { orgaStore } from "$lib/stores/orgaStore.svelte";
import {
    escapeRegex,
    cleanPersonName,
    parseAddress,
    parseNameAndSalutation,
    formatRequestTime,
    formatDisplayDate,
    formatContact,
    getClientEmail,
    normalizePhone
} from "./requestParserUtils";

export {
    escapeRegex,
    cleanPersonName,
    parseAddress,
    parseNameAndSalutation,
    formatRequestTime,
    formatDisplayDate,
    formatContact,
    getClientEmail,
    normalizePhone
};

export function resolveAppointmentTiming(req: any) {
    let appDateStr = "";
    let appTimeStr = "";
    if (req.date) {
        const d = new Date(req.date);
        if (!isNaN(d.getTime())) {
            const pad = (n: number) => n.toString().padStart(2, '0');
            appDateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
        }
    }
    if (!appDateStr) {
        const today = new Date();
        const pad = (n: number) => n.toString().padStart(2, '0');
        appDateStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
    }
    if (req.time) {
        const rawTime = String(req.time).trim();
        if (/^\d{1,2}:\d{2}/.test(rawTime)) {
            const m = rawTime.match(/^(\d{1,2}):(\d{2})/);
            if (m) appTimeStr = `${m[1].padStart(2, '0')}:${m[2]}`;
        }
    }
    return { appDateStr, appTimeStr };
}

export function getDetectedClient(req: any) {
    const clientList: any[] = orgaStore.clients?.data || [];
    const directId = Array.isArray(req.client_id) ? req.client_id[0] : req.client_id;
    if (directId) {
        const found = clientList.find(c => c.id === directId);
        if (found) return found;
    }
    const aiTitle = req.ai_summary?.match(/📌\s*Titel:\s*([^\n\r]+)/i)?.[1]?.trim() || '';
    const aiTask = req.ai_summary?.match(/🎯\s*Anliegen:\s*([^\n\r]+)/i)?.[1]?.trim() || '';
    const titleTask = `${aiTitle}\n${aiTask}`;
    if (aiTitle || aiTask) {
        for (const c of clientList) {
            const lName = (c.name_last || '').trim();
            if (lName.length >= 3 && new RegExp(`(?:Herr|Herrn|Frau|Klient|Patient)?\\s*\\b${escapeRegex(lName)}\\b`, 'i').test(titleTask)) return c;
        }
    }
    if (req.email?.includes('@')) {
        const found = clientList.find(c => c.email && c.email.toLowerCase().trim() === req.email.toLowerCase().trim());
        if (found) return found;
    }
    const senderClean = cleanPersonName(req.sender_name || '');
    if (senderClean) {
        const found = clientList.find(c => {
            const f = (c.name_first || '').toLowerCase();
            const l = (c.name_last || '').toLowerCase();
            return senderClean.toLowerCase() === `${f} ${l}`.trim() || senderClean.toLowerCase() === `${l} ${f}`.trim();
        });
        if (found) return found;
    }
    return null;
}

export function extractDoctorOrTargetQuery(req: any): { query: string; cleanKeyword: string; isDoctor: boolean } | null {
    const aiTitle = req.ai_summary?.match(/📌\s*Titel:\s*([^\n\r]+)/i)?.[1]?.trim() || '';
    const aiTask = req.ai_summary?.match(/🎯\s*Anliegen:\s*([^\n\r]+)/i)?.[1]?.trim() || '';
    const fullText = `${aiTitle}\n${aiTask}\n${req.request_text || ''}`;
    const docMatch = fullText.match(/(?:Hausarzt|Hausärztin|Facharzt|Zahnarzt|Praxis|Dr\.\s*med\.?|Dr\.)\s+(?:(?:Fr\.|Frau|Hr\.|Herr)\s+)?(?:Dr\.\s*)?([A-ZÄÖÜ][a-zäöüß]+)/i);
    if (docMatch?.[1]) {
        return { query: docMatch[0].trim(), cleanKeyword: docMatch[1].trim().toLowerCase(), isDoctor: true };
    }
    return null;
}

export function getDetectedContact(req: any, client?: any): any {
    const allContacts: any[] = orgaStore.contacts?.data || [];
    if (!allContacts.length) return null;
    const target = extractDoctorOrTargetQuery(req);
    if (target?.cleanKeyword && target.cleanKeyword.length >= 3) {
        for (const ct of allContacts) {
            const lName = (ct.name_last || '').toLowerCase().trim();
            const comp = (ct.company_name || '').toLowerCase().trim();
            if (lName && lName.includes(target.cleanKeyword)) return ct;
            if (comp && comp.includes(target.cleanKeyword)) return ct;
        }
    }
    return null;
}

export function getDetectedLocation(req: any, client?: any, contact?: any): string {
    const ct = contact || getDetectedContact(req, client);
    if (ct?.street) {
        const addr = `${ct.street} ${ct.housenr || ''}`.trim();
        const city = `${ct.zip || ''} ${ct.city || ''}`.trim();
        return [addr, city].filter(Boolean).join(', ');
    }
    const locMatch = req.ai_summary?.match(/📍\s*Ort:\s*([^\n\r]+)/i)?.[1]?.trim() || '';
    if (locMatch && /telefonisch|intern|online|zoom|videocall/i.test(locMatch)) return '';
    if (locMatch) return locMatch;
    if (req.street && req.zip_city) return `${req.street}, ${req.zip_city}`.trim();
    return '';
}

export function getDetectedExecutionMode(req: any): string {
    const locMatch = req.ai_summary?.match(/📍\s*Ort:\s*([^\n\r]+)/i)?.[1]?.trim();
    return (locMatch && /telefonisch|intern|online|zoom|videocall/i.test(locMatch)) ? locMatch : '';
}

export function detectMissingContactQuery(req: any, client?: any): string | null {
    if (getDetectedContact(req, client)) return null;
    return extractDoctorOrTargetQuery(req)?.query || null;
}

export function resolveLocationAndContact(req: any, client: any) {
    const matchedContact = getDetectedContact(req, client);
    const aiLocation = req.ai_summary?.match(/📍\s*Ort:\s*([^\n\r]+)/i)?.[1]?.trim() || '';
    let addressText = (req.street && req.zip_city) ? `${req.street}, ${req.zip_city}`.trim() : '';
    const rawLoc = aiLocation || addressText;
    const isNonPhysical = /telefonisch|intern|online|zoom|videocall/i.test(rawLoc);

    if (matchedContact) {
        const addrPart = `${matchedContact.street || ''} ${matchedContact.housenr || ''}`.trim();
        const cityPart = `${matchedContact.zip || ''} ${matchedContact.city || ''}`.trim();
        const namePart = matchedContact.company_name?.trim() || `${matchedContact.name_first || ''} ${matchedContact.name_last || ''}`.trim();
        const formatted = [namePart, addrPart, cityPart].filter(Boolean).join(', ');
        return { useClientAddress: false, locationAddress: formatted || rawLoc, contactId: matchedContact.id, executionMode: isNonPhysical ? rawLoc : '' };
    }

    const isBeimKlienten = /beim klienten|zuhause|beim kunden|vor ort/i.test(aiLocation);
    if (isBeimKlienten && client) {
        const fullClientAddr = [`${client.street || ''} ${client.housenr || ''}`.trim(), `${client.zip || ''} ${client.city || ''}`.trim()].filter(Boolean).join(', ');
        return { useClientAddress: true, locationAddress: fullClientAddr, contactId: '', executionMode: isNonPhysical ? rawLoc : '' };
    }

    return { useClientAddress: false, locationAddress: isNonPhysical ? '' : rawLoc, contactId: '', executionMode: isNonPhysical ? rawLoc : '' };
}

export function getLinkedAppointments(req: any): any[] {
    const client = getDetectedClient(req);
    const apps = orgaStore.appointments?.data || [];
    if (!apps.length || !req) return [];
    return apps.filter((a: any) => {
        if (req.id && a.notes && (a.notes.includes(`[ANFRAGE_ID: ${req.id}]`) || a.notes.includes(req.id))) return true;
        if (!client) return false;
        const hasClient = a.client && (Array.isArray(a.client) ? a.client.includes(client.id) : a.client === client.id);
        if (!hasClient || !req.date || !a.appointment) return false;
        return new Date(req.date).toISOString().split('T')[0] === new Date(a.appointment).toISOString().split('T')[0];
    });
}
