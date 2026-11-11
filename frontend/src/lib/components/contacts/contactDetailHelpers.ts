import type { ClientRecord, ContactRecord, ContactType } from "$lib/types/orgaTypes";
import { toastStore } from "$lib/services/toastService.svelte";

export * from "./contactVCardExport";
export * from "./contactConversionService";
export { classifyPhoneNumber, analyzeClientPhones, type ClassifiedPhone, type ClientPhoneAnalysis } from "$lib/utils/phoneUtils";

export interface ContactTypeConfig {
    key: ContactType | 'unassigned';
    label: string;
    shortLabel: string;
    icon: string;
    badgeClass: string;
    description: string;
}

/**
 * Liest Notiztext und gespeicherten Kontakttyp abwärtskompatibel aus dem notes-Feld
 */
export function parseContactNotes(raw: any): { text: string; contact_type?: ContactType } {
    if (!raw) return { text: "" };
    if (typeof raw === 'object' && raw !== null) {
        return {
            text: typeof raw.text === 'string' ? raw.text : (typeof raw.notes === 'string' ? raw.notes : ""),
            contact_type: raw.contact_type
        };
    }
    if (typeof raw === 'string') {
        try {
            const parsed = JSON.parse(raw);
            if (typeof parsed === 'object' && parsed !== null) {
                return {
                    text: typeof parsed.text === 'string' ? parsed.text : (typeof parsed.notes === 'string' ? parsed.notes : (typeof parsed === 'string' ? parsed : "")),
                    contact_type: parsed.contact_type
                };
            }
            if (typeof parsed === 'string') {
                return { text: parsed };
            }
        } catch {
            return { text: raw };
        }
    }
    return { text: String(raw) };
}

/**
 * Ermittelt den Kontakttyp (Betreuer/Pflege vs. Angehörige vs. Sonstige)
 */
export function getContactType(contact: Partial<ContactRecord>, clients?: ClientRecord[]): ContactType | 'unassigned' {
    if (contact.contact_type && ['caregiver', 'relative', 'other'].includes(contact.contact_type)) {
        return contact.contact_type;
    }
    const parsed = parseContactNotes(contact.notes);
    if (parsed.contact_type && ['caregiver', 'relative', 'other'].includes(parsed.contact_type)) {
        return parsed.contact_type;
    }
    if (contact.id && clients && clients.length > 0) {
        const isCaregiver = clients.some(c => c.caregiver === contact.id);
        if (isCaregiver) return 'caregiver';
    }
    return 'unassigned';
}

/**
 * Liefert Label, Icon und Farbklassen nach dem OrgaFlow-Designsystem
 */
export function getContactTypeConfig(type: ContactType | 'unassigned'): ContactTypeConfig {
    switch (type) {
        case 'caregiver':
            return {
                key: 'caregiver',
                label: 'Betreuer / Pflegekraft',
                shortLabel: 'Betreuer/Pflege',
                icon: '🩺',
                badgeClass: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800',
                description: 'Gesetzliche Betreuung, Bezugspflege, Pflegedienst'
            };
        case 'relative':
            return {
                key: 'relative',
                label: 'Angehörige / Bezugsperson',
                shortLabel: 'Angehörige/r',
                icon: '👥',
                badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800',
                description: 'Partner/in, Tochter, Sohn, Familie, Vertrauensperson'
            };
        case 'other':
            return {
                key: 'other',
                label: 'Sonstiger Kontakt',
                shortLabel: 'Sonstiges',
                icon: '🏢',
                badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800',
                description: 'Arztpraxis, Fachstelle, Amt, Pflegestützpunkt'
            };
        case 'unassigned':
        default:
            return {
                key: 'unassigned',
                label: 'Nicht zugeordnet',
                shortLabel: 'Nicht zugeordnet',
                icon: '❓',
                badgeClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
                description: 'Kategorie noch nicht festgelegt'
            };
    }
}

export interface AddressLines {
    line1: string;
    line2: string;
}

export function getInitials(firstName?: string, lastName?: string, fallback = "?"): string {
    const first = firstName?.charAt(0) || fallback.charAt(0) || "?";
    const last = lastName?.charAt(0) || "";
    return `${first}${last}`.toUpperCase();
}

export function formatFullName(firstName?: string, lastName?: string, salutation?: string): string {
    const prefix = salutation && salutation !== "Keine Angabe" ? salutation : "";
    return [prefix, firstName, lastName].filter(Boolean).join(" ").trim();
}

export function getFormattedAddress(
    street?: string,
    housenr?: string,
    zip?: string,
    city?: string
): AddressLines | null {
    const line1 = [street?.trim(), housenr?.trim()].filter(Boolean).join(" ");
    const line2 = [zip?.trim(), city?.trim()].filter(Boolean).join(" ");

    if (!line1 && !line2) return null;
    return { line1, line2 };
}

export function buildGoogleMapsUrl(name: string, address: AddressLines): string {
    const query = [name.trim(), address.line1, address.line2].filter(Boolean).join(", ");
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function getClientSubtitle(client?: ClientRecord | null): string {
    if (!client) return "";
    return [client.street?.trim(), client.city?.trim()].filter(Boolean).join(" ");
}

export function resolveRecords<T extends { id: string }>(ids: string[], map: Map<string, T>): T[] {
    if (!ids?.length) return [];
    return ids.map((id) => map.get(id)).filter((item): item is T => item !== undefined);
}

export function formatWhatsAppUrl(phone?: string): string {
    if (!phone) return "";
    let clean = phone.replace(/[^0-9+]/g, "");
    if (clean.startsWith("00")) {
        clean = clean.substring(2);
    } else if (clean.startsWith("+")) {
        clean = clean.substring(1);
    } else if (clean.startsWith("0")) {
        clean = "49" + clean.substring(1);
    }
    return clean ? `https://wa.me/${clean}` : "";
}

export async function copyToClipboard(text?: string | null, label = "Text"): Promise<boolean> {
    if (!text) return false;
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
        } else {
            const textArea = document.createElement("textarea");
            textArea.value = text;
            textArea.style.position = "fixed";
            textArea.style.left = "-999999px";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            document.execCommand("copy");
            textArea.remove();
        }
        toastStore.success(`${label} in die Zwischenablage kopiert`);
        return true;
    } catch (err) {
        console.error("Fehler beim Kopieren:", err);
        toastStore.error(`Konnte ${label} nicht kopieren`);
        return false;
    }
}
