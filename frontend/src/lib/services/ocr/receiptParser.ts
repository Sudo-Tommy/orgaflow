export interface ParsedDocumentOcr {
    supplier?: string;
    amount?: number;
    netto?: number;
    taxRate?: number;
    taxSum?: number;
    date?: string; // YYYY-MM-DD
    invoiceNumber?: string;
    iban?: string;
    confidence: number; // 0..1
    rawText: string;
}

/**
 * Prüft eine IBAN mathematisch per ISO-13616 Modulo-97-Verfahren.
 */
export function isValidIban(raw: string): boolean {
    const clean = raw.replace(/\s+/g, '').toUpperCase();
    if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(clean)) return false;
    const rearranged = clean.slice(4) + clean.slice(0, 4);
    let mod = 0;
    for (const ch of rearranged) {
        const val = ch >= 'A' && ch <= 'Z' ? String(ch.charCodeAt(0) - 55) : ch;
        for (const digit of val) {
            mod = (mod * 10 + Number(digit)) % 97;
        }
    }
    return mod === 1;
}

export function extractValidIban(text: string): string | undefined {
    const matches = text.match(/[A-Z]{2}\d{2}(?:\s?[A-Z0-9]){10,30}/gi) || [];
    for (const m of matches) {
        const compact = m.replace(/\s+/g, '').toUpperCase();
        if (isValidIban(compact)) return compact;
    }
    return undefined;
}

function parseEuroNumber(str: string): number | undefined {
    const cleaned = str.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '');
    const val = parseFloat(cleaned);
    return Number.isFinite(val) && val > 0 && val < 100000 ? Math.round(val * 100) / 100 : undefined;
}

export function extractDateIso(text: string): string | undefined {
    const iso = text.match(/\b(20\d{2})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])\b/);
    if (iso) return iso[0];

    const de = text.match(/\b(0?[1-9]|[12]\d|3[01])\.(0?[1-9]|1[0-2])\.(20\d{2}|\d{2})\b/);
    if (!de) return undefined;
    const dd = de[1].padStart(2, '0');
    const mm = de[2].padStart(2, '0');
    const yyyy = de[3].length === 2 ? `20${de[3]}` : de[3];
    return `${yyyy}-${mm}-${dd}`;
}

export function extractInvoiceNumber(text: string): string | undefined {
    const re = /(?:Rechnungs?(?:nummer|\s*-?\s*Nr\.?)|Re\.?\s*-?\s*Nr\.?|Beleg\s*-?\s*Nr\.?|Invoice\s*No\.?)[:\s#]*([A-Z0-9][A-Z0-9\-\/]{2,24})/i;
    const m = text.match(re);
    return m?.[1]?.trim();
}

export function extractSupplier(text: string): string | undefined {
    const skip = /^(kassenbon|quittung|rechnung|beleg|ust-id|steuer|datum|tel\.?|fax|www\.|http|iban|bic|seite\s+\d)/i;
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length >= 3);
    for (const line of lines.slice(0, 6)) {
        if (skip.test(line)) continue;
        if (/^[\d\s.,:/-]+$/.test(line)) continue;
        return line.slice(0, 60);
    }
    return undefined;
}

export function extractAmountAndTax(text: string): {
    amount?: number;
    taxRate?: number;
    taxSum?: number;
    netto?: number;
} {
    const lines = text.split(/\r?\n/);
    let amount: number | undefined;
    const totalKw = /(summe|gesamt(?:betrag)?|endbetrag|zu zahlen|brutto|total|ec-?karte|betrag)/i;

    for (let i = lines.length - 1; i >= 0; i--) {
        if (!totalKw.test(lines[i])) continue;
        const m = lines[i].match(/(\d{1,3}(?:\.\d{3})*,\d{2}|\d+\.\d{2})/);
        if (m) {
            const parsed = parseEuroNumber(m[1].includes(',') ? m[1] : m[1].replace('.', ','));
            if (parsed) {
                amount = parsed;
                break;
            }
        }
    }

    if (!amount) {
        const all = [...text.matchAll(/(\d{1,3}(?:\.\d{3})*,\d{2})\s?(?:€|EUR)?/gi)]
            .map((m) => parseEuroNumber(m[1]))
            .filter((n): n is number => Boolean(n));
        if (all.length > 0) amount = Math.max(...all);
    }

    let taxRate: number | undefined;
    if (/\b19(?:[.,]0{1,2})?\s?%/i.test(text)) taxRate = 19;
    else if (/\b7(?:[.,]0{1,2})?\s?%/i.test(text)) taxRate = 7;

    let netto: number | undefined;
    let taxSum: number | undefined;
    if (amount && taxRate) {
        netto = Math.round((amount / (1 + taxRate / 100)) * 100) / 100;
        taxSum = Math.round((amount - netto) * 100) / 100;
    }

    return { amount, taxRate, taxSum, netto };
}

/**
 * Extrahiert strukturiert Beleg- & Rechnungsdaten lokal aus OCR-Rohtext.
 */
export function parseDocumentOcrText(rawText: string): ParsedDocumentOcr {
    const text = (rawText || '').trim();
    if (!text) return { confidence: 0, rawText: '' };

    const supplier = extractSupplier(text);
    const date = extractDateIso(text);
    const invoiceNumber = extractInvoiceNumber(text);
    const iban = extractValidIban(text);
    const { amount, taxRate, taxSum, netto } = extractAmountAndTax(text);

    let hits = 0;
    if (amount) hits += 0.4;
    if (date) hits += 0.25;
    if (supplier) hits += 0.2;
    if (taxRate || invoiceNumber || iban) hits += 0.15;

    return {
        supplier,
        amount,
        netto,
        taxRate,
        taxSum,
        date,
        invoiceNumber,
        iban,
        confidence: Math.min(1, Math.round(hits * 100) / 100),
        rawText: text
    };
}
