export function escapeRegex(str: string): string {
    return (str || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function cleanPersonName(raw: string): string {
    return (raw || '')
        .replace(/^(herr|frau|herrn|dr\.|prof\.|familie|dr\. med\.)\s+/i, '')
        .replace(/\((.*?)\)/g, '')
        .trim();
}

export function normalizePhone(p: string): string {
    return (p || '').replace(/\D+/g, '').replace(/^49/, '0');
}

export function formatContact(method?: string): string {
    if (!method) return "Nicht angegeben";
    if (method === "email") return "E-Mail";
    if (method === "phone") return "Telefon";
    return method;
}

export function getClientEmail(req: any): string | null {
    if (!req) return null;
    if (req.email && req.email.includes('@')) return req.email.trim();
    const m = req.request_text ? req.request_text.match(/E-Mail:\s*([^\n]+)/) : null;
    if (m && m[1]?.includes('@')) return m[1].trim();
    return null;
}

export function parseAddress(streetRaw: string = '', zipCityRaw: string = '') {
    let streetName = (streetRaw || '').trim();
    let houseNr = '';
    const houseNrMatch = streetName.match(/^(.*?)\s+(\d+[\s\w\-\/]*)$/);
    if (houseNrMatch) {
        streetName = houseNrMatch[1].trim();
        houseNr = houseNrMatch[2].trim();
    }
    let zip = '';
    let city = (zipCityRaw || '').trim();
    const zipMatch = city.match(/^(\d{5})\s+(.*)$/);
    if (zipMatch) {
        zip = zipMatch[1];
        city = zipMatch[2].trim();
    }
    return { streetName, houseNr, zip, city };
}

export function parseNameAndSalutation(rawName: string = '') {
    let salutation: "Herr" | "Frau" | "Divers" | "Keine Angabe" = "Keine Angabe";
    const lowerRaw = rawName.toLowerCase();
    if (lowerRaw.startsWith('frau')) salutation = 'Frau';
    else if (lowerRaw.startsWith('herr')) salutation = 'Herr';

    const cleanName = cleanPersonName(rawName || 'Neuer Klient');
    let firstName = "";
    let lastName = cleanName;

    if (cleanName.includes(',')) {
        const p = cleanName.split(',');
        lastName = p[0].trim();
        firstName = p.slice(1).join(' ').trim();
    } else {
        const p = cleanName.split(' ').filter(Boolean);
        if (p.length === 2) {
            firstName = p[0];
            lastName = p[1];
        } else if (p.length > 2) {
            firstName = p.slice(0, -1).join(' ');
            lastName = p[p.length - 1];
        }
    }
    return { salutation, firstName, lastName };
}

export function formatRequestTime(req: any): string {
    if (!req) return '';
    const rawTime = req.time ? String(req.time).trim() : '';
    if (rawTime) {
        if (/^\d{1,2}:\d{2}/.test(rawTime)) {
            const m = rawTime.match(/^(\d{1,2}):(\d{2})/);
            if (m) return `um ${m[1].padStart(2, '0')}:${m[2]} Uhr`;
        }
        const cleanTime = rawTime.includes(' ') && !rawTime.includes('T') ? rawTime.replace(' ', 'T') : rawTime;
        const d = new Date(cleanTime);
        if (!isNaN(d.getTime())) {
            return `um ${d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr`;
        }
    }
    if (req.request_text) {
        const textMatch = req.request_text.match(/(?:Wunschtermin|Wunschzeit|Wunsch-Uhrzeit|Uhrzeit|um)\s*:?\s*(\d{1,2}:\d{2})/i) || req.request_text.match(/\b(\d{1,2}:\d{2})\s*Uhr\b/i);
        if (textMatch && textMatch[1]) {
            const [th, tm] = textMatch[1].split(':');
            return `um ${th.padStart(2, '0')}:${tm} Uhr`;
        }
    }
    return '';
}

export function formatDisplayDate(dStr?: string): string {
    if (!dStr) return '';
    const d = new Date(dStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
}
