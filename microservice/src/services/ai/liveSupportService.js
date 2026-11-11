/**
 * liveSupportService.js
 * Verwaltet "Omni", den Echtzeit-Livechat-Assistenten von OrgaFlow.
 * Nutzt die multimodale Google Gemini Live-API (WebSocket BidiGenerateContent)
 * kombiniert mit Live-Lesezugriff auf PocketBase (omniPocketbaseTools.js).
 */

import { LIVE_CHAT_MODELS } from './aiModelRouter.js';
import {
    streamLiveTurn,
    connectOrGetLiveSession,
    closeLiveSession,
    getLiveSessionStatus
} from './omniLiveSessionManager.js';
import {
    finalizeLiveSupportTicket,
    inferTicketCategoryAndPriority,
    buildSynthesizedProblemSummary
} from './liveSupportTicketService.js';
import { getBerlinNowInfo } from './omniDateParser.js';
import { resolvePocketBaseLiveContext } from './omniPocketbaseTools.js';

export {
    finalizeLiveSupportTicket,
    connectOrGetLiveSession,
    closeLiveSession,
    getLiveSessionStatus
};

export function buildCompactLiveInstruction(context = {}) {
    const nowInfo = getBerlinNowInfo();
    const route = context?.route || context?.url || '/dashboard';
    const openDialogs = Array.isArray(context?.openDialogs) && context.openDialogs.length > 0
        ? `Geöffnete Fenster/Dialoge: ${context.openDialogs.join(', ')}.`
        : 'Keine Dialogfenster geöffnet.';
    const visibleErrors = Array.isArray(context?.visibleErrors) && context.visibleErrors.length > 0
        ? `Sichtbare Hinweise/Fehlermeldungen auf dem Bildschirm: ${context.visibleErrors.join(' | ')}.`
        : '';

    return `Du bist "Omni", der persönliche Echtzeit-Livechat-Kollege & Assistent von OrgaFlow (Software für Seniorenassistenz).
Aktuelles Datum & Uhrzeit (Europe/Berlin): ${nowInfo.weekday}, ${nowInfo.dateStr}, ${nowInfo.timeStr} Uhr.
Aktueller Kontext des Nutzers (${context?.userName || 'Mitarbeiter'}, Rolle: ${context?.userRole || 'Mitarbeiter'}):
- Geöffnete Seite: ${route}
- ${openDialogs}
${visibleErrors ? `- ${visibleErrors}\n` : ''}
OrgaFlow-Module:
- Dashboard (/dashboard), Termine & Kalender (/appointments), Klienten (/clients), Kontakte (/contacts), Rechnungen (/invoices), Haushaltsbuch (/household), BWA (/bwa), Reisekosten VMA (/vma).

ANFRAGE-VERHALTEN:
1. DATEN- & KALENDERABFRAGEN:
   - Wenn [ECHTZEIT-DATEN AUS POCKETBASE] im Prompt stehen, gib die Termine, Klienten oder Kennzahlen sofort, vollständig und übersichtlich formatiert aus.
   - Kündige nicht erst an, dass du nachschaust, sondern gib das Ergebnis direkt an.
2. ALLGEMEINE FRAGEN (z. B. "Ist das live?", "Wer bist du?", "Wie funktioniert...?"):
   - Antworte direkt, kollegial und präzise. Frage bei allgemeinen Fragen NIEMALS nach einer Fehlermeldung!
3. TECHNISCHE PROBLEME & SCREENSHOTS:
   - Nur wenn der Nutzer tatsächlich einen Fehler meldet oder Screenshots schickt: Gezielt analysieren, max. 1 Klärungsfrage, bei Fertigstellung mit [TICKET_BEREIT] markieren.`;
}

export function cleanReply(text = '', isProblemContext = true) {
    let clean = String(text || '')
        .replace(/\[TICKET_BEREIT\]/gi, '')
        .replace(/Habe ich (das Problem|dein Anliegen|das so|dich) richtig verstanden\s*\??/gi, '')
        .replace(/Hab ich (das Problem|dein Anliegen|das) richtig verstanden\s*\??/gi, '')
        .trim();

    if (!isProblemContext) {
        clean = clean
            .replace(/Lass uns bitte kurz den Text der Fehlermeldung klären[^.?!]*[.?!]?/gi, '')
            .replace(/Welche Fehlermeldung erscheint genau[^.?!]*[.?!]?/gi, '')
            .trim();
    }

    let prev;
    do {
        prev = clean;
        clean = clean
            .replace(/^(Moini|Moin|Hallo|Guten (Morgen|Tag|Abend)|Hi|Hey|Servus|Grüß Gott|Na klar|Sehr gerne|Gerne|Alles klar|Herzlich willkommen)[!,\.\s-]*/i, '')
            .replace(/^(ich bin omni[,\.\s!]*)/i, '')
            .replace(/^(ich schaue (direkt |gerade |kurz |mal )?(in deinen kalender|in den kalender|in die daten|nach)[!,\.\s:-]*)/i, '')
            .replace(/^(hier ist (die|eine) (kurze )?(erklärung|anleitung|übersicht):?)\s*/i, '')
            .trim();
    } while (clean !== prev && clean.length > 0);

    clean = clean.replace(/^[,\.\s:-]+/, '').trim();
    if (!clean) return '';
    return clean.charAt(0).toUpperCase() + clean.slice(1);
}

function isProblemReportConversation(messages = [], attachments = []) {
    if (Array.isArray(attachments) && attachments.length > 0) return true;
    const userMsgs = messages.filter(m => m.role === 'user');
    const lastMsgs = userMsgs.slice(-2).map(m => String(m.text || m.content || '').toLowerCase()).join(' ');
    return /problem|fehler|kaputt|geht nicht|funktioniert nicht|bug|überlappt|abgeschnitten|verdeckt|stürzt ab/.test(lastMsgs);
}

function inferNavigationActionLink(userText = '', aiReply = '', isProblem = false) {
    if (isProblem) return null;
    const lowerUser = String(userText || '').toLowerCase();
    const isNavIntent = /wo finde|wie kann|wie erstelle|erkläre|zeig mir|öffne|anlegen|eintragen|bearbeiten|löschen|termin|kalender|klient|rechnung|kontakt/.test(lowerUser);
    if (!isNavIntent) return null;

    const combined = `${lowerUser} ${String(aiReply || '').toLowerCase()}`;
    if (/klient|pflegeperson|unterschrift|budget|pflegegrad/.test(combined)) return { label: '👉 Zu den Klienten', href: '/clients' };
    if (/rechnung|mahnung|lexoffice/.test(combined)) return { label: '👉 Zu den Rechnungen', href: '/invoices' };
    if (/kontakt|arzt|praxis|pflegeheim|einrichtung/.test(combined)) return { label: '👉 Zu den Kontakten', href: '/contacts' };
    if (/termin|kalender|zeiterfassung|nachbereit/.test(combined)) return { label: '👉 Zum Kalender', href: '/appointments' };
    if (/haushaltsbuch|beleg/.test(combined)) return { label: '👉 Zum Haushaltsbuch', href: '/household' };
    return null;
}

function isInitialGenericProblemClick(messages = [], attachments = []) {
    if (Array.isArray(attachments) && attachments.length > 0) return false;
    const userMsgs = messages.filter(m => m.role === 'user');
    const lastText = String(userMsgs[userMsgs.length - 1]?.text || '').trim().toLowerCase();
    return lastText === 'ich habe ein technisches problem oder einen fehler';
}

function hasExplicitDirectTicketCommand(text = '') {
    const lower = String(text || '').toLowerCase();
    return /direkt ein ticket|sofort ein ticket|ticket direkt erstellen|mach direkt ein ticket/.test(lower);
}

export async function chatWithLiveSupport({
    sessionId = 'default',
    messages = [],
    context = {},
    attachments = [],
    audioBase64 = null,
    mimeType = null,
    pbAdmin = null,
    onStatus = null,
    onChunk = null,
    onMeta = null
}) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY ist auf dem Server nicht hinterlegt.');

    const effectiveSessionId = sessionId || context?.userId || 'default';
    const userMessages = messages.filter(m => m.role === 'user');
    const lastUserMsg = userMessages[userMessages.length - 1]?.text || '';
    const historyTurns = messages.slice(0, -1).slice(-10).map(m => ({
        role: m.role === 'assistant' || m.role === 'model' ? 'model' : 'user',
        text: m.text || m.content || ''
    }));

    // 1. Prüfe Live-Datenabfrage gegen PocketBase (Termine, Nachbereitung, Klienten, Kontakte, Rechnungen)
    const liveData = await resolvePocketBaseLiveContext({
        userText: lastUserMsg,
        context,
        pbAdmin,
        onStatus
    });

    const isGenericClick = isInitialGenericProblemClick(messages, attachments);
    const forceClarified = !isGenericClick && hasExplicitDirectTicketCommand(lastUserMsg);
    const isProblem = !liveData.isDataQuery && isProblemReportConversation(messages, attachments);
    const fullConvText = messages.map(m => m.text || m.content || '').join(' ');

    const effectiveUserPrompt = liveData.isDataQuery
        ? `${lastUserMsg}\n\n[ECHTZEIT-DATEN AUS POCKETBASE]:\n${liveData.dataContextBlock}\n\n(Beantworte die Anfrage direkt anhand dieser Daten. Falls keine Einträge vorhanden sind, sage dies klar und freundlich. Kündige nicht erst an, dass du nachschaust, sondern antworte direkt.)`
        : lastUserMsg;

    const liveRes = await streamLiveTurn({
        sessionId: effectiveSessionId,
        apiKey,
        systemInstruction: buildCompactLiveInstruction(context),
        historyTurns,
        userText: effectiveUserPrompt,
        attachments,
        audioBase64,
        mimeType,
        models: LIVE_CHAT_MODELS,
        timeoutMs: 22000,
        onChunk: (delta, fullSoFar, model, modelLabel) => {
            if (typeof onChunk === 'function') {
                onChunk(delta, cleanReply(fullSoFar, isProblem), model, modelLabel);
            }
        },
        onMeta
    });

    const rawText = liveRes?.text || '';
    const hasReadyTag = !liveData.isDataQuery && /\[TICKET_BEREIT\]/i.test(rawText);
    let cleaned = cleanReply(rawText, isProblem);

    // Bei strukturierten Live-Daten die Datenansicht garantieren
    if (liveData.isDataQuery && liveData.dataContextBlock) {
        const isPlaceholderOnly = cleaned.length < 50 || /^(ich schaue|einen moment|ich prüfe|kurz)/i.test(cleaned) || !cleaned;
        if (isPlaceholderOnly) {
            cleaned = liveData.dataContextBlock;
        } else if (!cleaned.includes('•') && liveData.dataContextBlock.includes('•')) {
            cleaned = `${cleaned}\n\n${liveData.dataContextBlock}`;
        }
        if (typeof onChunk === 'function') {
            onChunk('', cleaned, liveRes.model, liveRes.modelLabel);
        }
    }

    const isClarified = !liveData.isDataQuery && !isGenericClick && (hasReadyTag || forceClarified);
    const { suggestedCategory, suggestedPriority } = inferTicketCategoryAndPriority(`${fullConvText} ${cleaned}`);
    const actionLink = isClarified ? null : (liveData.suggestedActionLink || inferNavigationActionLink(lastUserMsg, cleaned, isProblem));

    return {
        reply: cleaned || (liveData.dataContextBlock || 'Ich bin bereit. Wie kann ich dir helfen?'),
        model: liveRes.model,
        modelLabel: liveRes.modelLabel,
        isLive: true,
        isClarified,
        problemSummary: isClarified ? buildSynthesizedProblemSummary(messages, cleaned) : '',
        suggestedCategory,
        suggestedPriority,
        actionLink
    };
}
