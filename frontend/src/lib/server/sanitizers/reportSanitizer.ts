/**
 * reportSanitizer.ts
 *
 * Strikte serverseitige Bereinigungs- und Validierungslogik für Besuchsberichte und Klienten-Dokumente.
 * Verhindert ausnahmslos, dass Begriffe wie "KI", "AI", "künstliche Intelligenz" oder Modellhinweise
 * in öffentlichen oder für Klienten sichtbaren Berichten gerendert werden.
 */

export interface ReportSanitizationResult {
    isValid: boolean;
    forbiddenTerms: string[];
    sanitizedText: string;
}

// Regex-Pattern zur Erkennung verbotener Begriffe für Audit & Validierung
const FORBIDDEN_PATTERNS: Array<{ pattern: RegExp; term: string }> = [
    { pattern: /\b(künstliche[rnms]?\s+intelligenz)\b/gi, term: 'künstliche Intelligenz' },
    { pattern: /\b(artificial\s+intelligence)\b/gi, term: 'Artificial Intelligence' },
    { pattern: /\b(ki-zusammenfassung|ai-zusammenfassung)\b/gi, term: 'KI-Zusammenfassung' },
    { pattern: /\b(ki-generiert\w*|ai-generiert\w*)\b/gi, term: 'KI-generiert' },
    { pattern: /\b(ki-gestützt\w*|ai-gestützt\w*)\b/gi, term: 'KI-gestützt' },
    { pattern: /\b(ki-assistent\w*|ai-assistent\w*)\b/gi, term: 'KI-Assistent' },
    { pattern: /\b(ki-bericht\w*|ai-bericht\w*)\b/gi, term: 'KI-Bericht' },
    { pattern: /\b(ki-protokoll\w*|ai-protokoll\w*)\b/gi, term: 'KI-Protokoll' },
    { pattern: /\b(ki-modell\w*|ai-modell\w*)\b/gi, term: 'KI-Modell' },
    { pattern: /\b(ki-notiz\w*|ai-notiz\w*)\b/gi, term: 'KI-Notiz' },
    { pattern: /\b(ki-vorschlag\w*|ai-vorschlag\w*)\b/gi, term: 'KI-Vorschlag' },
    { pattern: /\b(large\s+language\s+model|sprachmodell\w*)\b/gi, term: 'Sprachmodell' },
    { pattern: /\b(chatgpt|openai|gemini\s+(?:pro|flash|api)?|anthropic|claude\s+\d+|llm)\b/gi, term: 'Modellbezeichnung' },
    { pattern: /\b(prompt|prompts)\b/gi, term: 'Prompt' },
    { pattern: /\b(KI|AI)\b/g, term: 'KI/AI' }
];

// Regelbasierte Ersetzungen für eine neutrale, professionelle Formulierung
interface ReplacementRule {
    pattern: RegExp;
    replacement: string | ((substring: string, ...args: any[]) => string);
}

const REPLACEMENT_RULES: ReplacementRule[] = [
    // Phrasen und Kontexte
    {
        pattern: /(?:durch|mit|mittels|via)\s+(?:einer?\s+)?künstliche[rnms]?\s+intelligenz/gi,
        replacement: 'automatisch'
    },
    {
        pattern: /künstliche[rnms]?\s+intelligenz/gi,
        replacement: 'automatische Protokollierung'
    },
    {
        pattern: /artificial\s+intelligence/gi,
        replacement: 'Systemdokumentation'
    },
    // Zusammengesetzte Begriffe mit Bindestrich oder Leerzeichen
    {
        pattern: /\b(?:KI|AI)[- ]zusammenfassung\b/gi,
        replacement: 'Systemzusammenfassung'
    },
    {
        pattern: /\b(?:KI|AI)[- ]generierte?([rnms]?)\b/gi,
        replacement: 'Automatisch dokumentierte$1'
    },
    {
        pattern: /\b(?:KI|AI)[- ]gestützte?([rnms]?)\b/gi,
        replacement: 'Systemgestützte$1'
    },
    {
        pattern: /\b(?:KI|AI)[- ]assistent(?:en)?\b/gi,
        replacement: 'Systemassistent'
    },
    {
        pattern: /\b(?:KI|AI)[- ]berichte?([s]?)\b/gi,
        replacement: 'Besuchsbericht$1'
    },
    {
        pattern: /\b(?:KI|AI)[- ]protokolle?([s]?)\b/gi,
        replacement: 'Einsatzprotokoll$1'
    },
    {
        pattern: /\b(?:KI|AI)[- ]notiz(?:en)?\b/gi,
        replacement: 'Dokumentationsnotiz'
    },
    {
        pattern: /\b(?:KI|AI)[- ]modelle?([s]?)\b/gi,
        replacement: 'System'
    },
    {
        pattern: /\b(?:KI|AI)[- ]vorschl(?:ag|äge)\b/gi,
        replacement: 'Systemvorschlag'
    },
    // Modellnamen & Entwicklerhinweise
    {
        pattern: /\b(?:chatgpt|gemini(?:\s+(?:pro|flash|api))?|anthropic|claude(?:\s+\d+)?)\b/gi,
        replacement: 'System'
    },
    {
        pattern: /\bopenai\b/gi,
        replacement: 'Systemdienst'
    },
    {
        pattern: /\blarge\s+language\s+models?\b/gi,
        replacement: 'Protokollsystem'
    },
    {
        pattern: /\bsprachmodelle?([s]?)\b/gi,
        replacement: 'Protokollsystem$1'
    },
    {
        pattern: /\bLLMs?\b/g,
        replacement: 'System'
    },
    // Floskeln wie "Als KI...", "Ich bin ein Sprachmodell..."
    {
        pattern: /als\s+(?:eine?\s+)?(?:KI|AI|künstliche\s+intelligenz|sprachmodell)\b/gi,
        replacement: 'im Rahmen der Systemdokumentation'
    },
    {
        pattern: /ich\s+bin\s+(?:eine?\s+)?(?:KI|AI|künstliche\s+intelligenz|sprachmodell)\b/gi,
        replacement: 'dies ist ein automatisches Protokoll'
    },
    // Einzelne Token "KI" oder "AI" mit grammatikalischem Kontext
    {
        pattern: /\b(?:die|der|das)\s+(?:KI|AI)\b/g,
        replacement: 'das System'
    },
    {
        pattern: /\b(?:einer?|den)\s+(?:KI|AI)\b/g,
        replacement: 'dem System'
    },
    {
        pattern: /\b(?:von|durch)\s+(?:der\s+)?(?:KI|AI)\b/g,
        replacement: 'automatisch'
    },
    {
        pattern: /\bKI\b/g,
        replacement: 'System'
    },
    {
        pattern: /\bAI\b/g,
        replacement: 'System'
    }
];

/**
 * Bereinigt einen Text vollständig von allen KI- und Modellhinweisen.
 * Ersetzt diese durch neutrale, professionelle Formulierungen wie
 * "Automatische Protokollierung", "Systemzusammenfassung" oder "Einsatzdokumentation".
 */
export function sanitizeReportText(text: string | null | undefined): string {
    if (!text || typeof text !== 'string') return '';

    let cleaned = text;

    for (const rule of REPLACEMENT_RULES) {
        cleaned = cleaned.replace(rule.pattern, rule.replacement as any);
    }

    // Zusätzlicher Sicherheitsdurchlauf: Entferne doppelte Leerzeichen und bereinige Satzzeichen
    cleaned = cleaned
        .replace(/[ \t]{2,}/g, ' ')
        .replace(/\(\s*\)/g, '')
        .trim();

    return cleaned;
}

/**
 * Überprüft, ob ein Text noch verbotene KI-Begriffe enthält.
 */
export function containsAiForbiddenTerms(text: string | null | undefined): boolean {
    if (!text || typeof text !== 'string') return false;

    for (const { pattern } of FORBIDDEN_PATTERNS) {
        pattern.lastIndex = 0;
        if (pattern.test(text)) {
            return true;
        }
    }

    return false;
}

/**
 * Vollständige Validierung eines Berichtes mit Rückgabe aller gefundenen Begriffe.
 */
export function validateReportForForbiddenTerms(text: string | null | undefined): ReportSanitizationResult {
    if (!text || typeof text !== 'string') {
        return { isValid: true, forbiddenTerms: [], sanitizedText: '' };
    }

    const detectedTerms: string[] = [];

    for (const { pattern, term } of FORBIDDEN_PATTERNS) {
        pattern.lastIndex = 0;
        if (pattern.test(text)) {
            detectedTerms.push(term);
        }
    }

    const sanitizedText = sanitizeReportText(text);

    return {
        isValid: detectedTerms.length === 0,
        forbiddenTerms: detectedTerms,
        sanitizedText
    };
}

/**
 * Bereinigt rekursiv Objekte (z. B. Appointment-Objekte aus PocketBase),
 * sodass alle 'report' oder 'notes' Felder für das Klientenportal sicher sind.
 */
export function sanitizeReportObject<T>(obj: T): T {
    if (!obj || typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
        return obj.map(item => sanitizeReportObject(item)) as unknown as T;
    }

    const copy: any = { ...obj };

    for (const key of Object.keys(copy)) {
        if (key === 'report' && typeof copy[key] === 'string') {
            copy[key] = sanitizeReportText(copy[key]);
        } else if (key === 'description' && typeof copy[key] === 'string') {
            copy[key] = sanitizeReportText(copy[key]);
        } else if (typeof copy[key] === 'object' && copy[key] !== null) {
            copy[key] = sanitizeReportObject(copy[key]);
        }
    }

    return copy;
}
