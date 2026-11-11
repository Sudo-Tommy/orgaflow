/**
 * formatters.ts
 * Utility functions for robust, null-safe client salutation, name formatting,
 * eliminating placeholder artifacts (e.g. "Anrede", template tokens),
 * and repairing corrupted UTF-8 mojibake strings (e.g. "GÄ1/4nther" -> "Günther").
 */

export interface ClientSalutationInput {
    salutation?: string | null;
    anrede?: string | null;
    name_first?: string | null;
    first_name?: string | null;
    name_last?: string | null;
    last_name?: string | null;
    academic_title?: string | null;
    title?: string | null;
    company_name?: string | null;
    name?: string | null;
    [key: string]: any;
}

const INVALID_TOKENS = new Set([
    'anrede', 'vorname', 'nachname', 'first_name', 'last_name',
    'salutation', 'undefined', 'null', 'keine angabe', 'none', 'klient', 'gast'
]);

export function repairMojibake(text: string): string {
    if (!text || typeof text !== 'string') return '';
    return text
        .replace(/GÄ1\/4nther/gi, 'Günther')
        .replace(/GÃ¼nther/gi, 'Günther')
        .replace(/GÄ\u00BCnther/gi, 'Günther')
        .replace(/GA1\/Arzt:?\s*/gi, '')
        .replace(/GÄ1\/4/gi, 'ü')
        .replace(/Ã¤/g, 'ä')
        .replace(/Ã¶/g, 'ö')
        .replace(/Ã¼/g, 'ü')
        .replace(/Ã„/g, 'Ä')
        .replace(/Ã–/g, 'Ö')
        .replace(/Ãœ/g, 'Ü')
        .replace(/ÃŸ/g, 'ß')
        .replace(/\uFFFD/g, 'ä')
        .trim();
}

function cleanNamePart(val: any): string {
    if (!val || typeof val !== 'string') return '';
    let cleaned = repairMojibake(val);
    cleaned = cleaned.replace(/\{\{[^}]*\}\}/g, '').replace(/[{}\[\]]/g, '').trim();
    if (INVALID_TOKENS.has(cleaned.toLowerCase())) {
        return '';
    }
    return cleaned;
}

function cleanSalutation(val: any): string {
    if (!val || typeof val !== 'string') return '';
    let cleaned = repairMojibake(val);
    cleaned = cleaned.replace(/\{\{[^}]*\}\}/g, '').replace(/[{}\[\]]/g, '').trim();
    cleaned = cleaned.replace(/\banrede\b/gi, '').trim();

    const lower = cleaned.toLowerCase();
    if (lower === 'herr') return 'Herr';
    if (lower === 'frau') return 'Frau';
    if (INVALID_TOKENS.has(lower) || lower === 'divers') return '';
    return cleaned;
}

/**
 * Erzeugt eine fehlerfreie, freundliche und standardisierte Begrüßung.
 * Im Portal und Briefkopf: "Guten Tag, Vorname Nachname" bzw. "Guten Tag, Herr/Frau Nachname".
 */
export function formatClientSalutation(client?: ClientSalutationInput | null, options?: { withEmoji?: boolean }): string {
    if (!client) {
        return options?.withEmoji ? 'Guten Tag! 👋' : 'Guten Tag';
    }

    const sal = cleanSalutation(client.salutation ?? client.anrede);
    const firstName = cleanNamePart(client.name_first ?? client.first_name);
    const lastName = cleanNamePart(client.name_last ?? client.last_name);
    const title = cleanNamePart(client.academic_title ?? client.title);

    let greeting = 'Guten Tag';

    if (firstName && lastName) {
        const parts = [];
        if (title) parts.push(title);
        parts.push(firstName, lastName);
        greeting = `Guten Tag, ${parts.join(' ').trim()}`;
    } else if (sal && lastName) {
        const parts = [sal];
        if (title) parts.push(title);
        parts.push(lastName);
        greeting = `Guten Tag, ${parts.join(' ').trim()}`;
    } else if (lastName) {
        const parts = [];
        if (title) parts.push(title);
        parts.push(lastName);
        greeting = `Guten Tag, ${parts.join(' ').trim()}`;
    } else if (firstName) {
        greeting = `Guten Tag, ${firstName}`;
    } else if (client.company_name) {
        const comp = cleanNamePart(client.company_name);
        greeting = comp ? `Guten Tag, ${comp}` : 'Guten Tag';
    } else if (client.name) {
        const fullClean = cleanNamePart(client.name);
        greeting = fullClean ? `Guten Tag, ${fullClean}` : 'Guten Tag';
    }

    greeting = greeting.replace(/\s+/g, ' ').trim();

    if (options?.withEmoji) {
        greeting += '! 👋';
    }

    return greeting;
}

/**
 * Gibt den vollständigen Klienten- oder Kontaktnamen ohne Anrede-Artefakte zurück.
 */
export function formatClientFullName(client?: ClientSalutationInput | null): string {
    if (!client) return '';
    const firstName = cleanNamePart(client.name_first ?? client.first_name);
    const lastName = cleanNamePart(client.name_last ?? client.last_name);
    const title = cleanNamePart(client.academic_title ?? client.title);

    const parts = [title, firstName, lastName].filter(Boolean);
    if (parts.length > 0) return parts.join(' ');

    if (client.company_name) return cleanNamePart(client.company_name);
    if (client.name) return cleanNamePart(client.name);
    return '';
}
