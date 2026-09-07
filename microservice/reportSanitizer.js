/**
 * reportSanitizer.js
 *
 * Bereinigungslogik für Besuchsberichte und Klienten-Dokumente im Microservice.
 * Maskiert oder ersetzt alle KI/AI-Begriffe durch professionelle, neutrale Formulierungen.
 */

const REPLACEMENT_RULES = [
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
    {
        pattern: /als\s+(?:eine?\s+)?(?:KI|AI|künstliche\s+intelligenz|sprachmodell)\b/gi,
        replacement: 'im Rahmen der Systemdokumentation'
    },
    {
        pattern: /ich\s+bin\s+(?:eine?\s+)?(?:KI|AI|künstliche\s+intelligenz|sprachmodell)\b/gi,
        replacement: 'dies ist ein automatisches Protokoll'
    },
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

export function sanitizeReportText(text) {
    if (!text || typeof text !== 'string') return '';

    let cleaned = text;

    for (const rule of REPLACEMENT_RULES) {
        cleaned = cleaned.replace(rule.pattern, rule.replacement);
    }

    return cleaned
        .replace(/[ \t]{2,}/g, ' ')
        .replace(/\(\s*\)/g, '')
        .trim();
}

export function sanitizeAppointments(appointments) {
    if (!Array.isArray(appointments)) return appointments;

    return appointments.map(app => {
        if (!app) return app;
        const copy = { ...app };
        if (copy.report && typeof copy.report === 'string') {
            copy.report = sanitizeReportText(copy.report);
        }
        if (copy.notes && typeof copy.notes === 'string') {
            copy.notes = sanitizeReportText(copy.notes);
        }
        return copy;
    });
}
