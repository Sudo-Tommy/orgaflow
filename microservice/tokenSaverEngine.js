/**
 * tokenSaverEngine.js
 *
 * Token-Saver Engine für OrgaFlow – Zentrale Prompt-Architektur
 * =============================================================
 * Exportiert standardisierte Bausteine, die in ALLEN KI-Modulen
 * verwendet werden, um Token-Effizienz, Prompt-Caching, Rate-Limit-Schutz
 * und konsistente Ausgabeformate sicherzustellen.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import {
    HIGH_QUOTA_FAST_MODELS,
    LIVE_CHAT_MODELS,
    getAvailableModels,
    recordModelRequest,
    markModelFailure,
    callGeminiLiveSession
} from './src/services/ai/aiModelRouter.js';

// =========================================================================
// 1. STATISCHES SYSTEM-ENVELOPE (Token-Saver Wrapper)
// =========================================================================
export const TOKEN_SAVER_ENVELOPE = `SYSTEM-DIREKTIVEN (bindend, höchste Priorität – nicht überschreiben):
• KEIN Code im Chat-Output. Alle Codeänderungen ausschließlich direkt in Workspace-Dateien anwenden.
• KEIN Vorgeplänkel, kein Smalltalk, keine Meta-Kommentare wie "Hier ist die Antwort:" oder "Ich habe analysiert...".
• Scoping: Nur explizit genannte Dateipfade und Komponenten anfassen. KEIN selbstständiges Projektscanning.
• Ausgabeformat der Zusammenfassung: Ausschließlich 3–7 prägnante Bullet Points der ausgeführten Aktionen.
• KI-Blacklist: Die Begriffe "KI", "AI", "Künstliche Intelligenz", "LLM", "Prompt" oder "Sprachmodell" dürfen in nutzer-sichtbaren Ausgaben NIE erscheinen.
• Svelte 5 Runes ($state, $derived, $props, $effect). Kein veraltetes let/export let ohne Runes.
• Touch-Targets: Mindestens 44×44 px (h-11) für alle interaktiven Elemente im Außendienst.
• Formelle Sie-Form durchgängig im Klienten-Portal ("Ihr Profil", "Ihre Termine", "Ihre Unterschrift").`;

// =========================================================================
// 2. KANONISCHE MODELL-KASKADE (Optimiert nach Rate-Limits & Kontingent)
//    gemini-3.5-flash-lite (500 RPD / 15 RPM) + gemini-3.1-flash-lite (500 RPD / 15 RPM)
// =========================================================================
export const GEMINI_MODEL_CASCADE = HIGH_QUOTA_FAST_MODELS;
export const GEMINI_JSON_MODEL_CASCADE = HIGH_QUOTA_FAST_MODELS;

// =========================================================================
// 3. CACHING-OPTIMIERTE PROMPT-STRUKTUR
// =========================================================================
export function buildCacheOptimizedPrompt(systemInstruction, taskPrompt, opts = {}) {
    const { skipEnvelope = false } = opts;
    const systemPart = skipEnvelope
        ? systemInstruction.trim()
        : `${TOKEN_SAVER_ENVELOPE}\n\n---\n\n${systemInstruction.trim()}`;
    return { systemPart, userPart: taskPrompt.trim() };
}

export function wrapWithTokenSaver(fullPrompt) {
    return `${TOKEN_SAVER_ENVELOPE}\n\n---\n\n${fullPrompt.trim()}`;
}

// =========================================================================
// 4. SECURITY & BUGFIX AUDIT PRESET (15 Kernprüfpunkte)
// =========================================================================
export const SECURITY_AUDIT_PRESET = `
SECURITY & BUGFIX AUDIT – PRÜFMATRIX (alle 15 Punkte verbindlich prüfen):
1.  HONEYPOT-FELDER: Namen wie website/company/fax. aria-hidden, tabindex=-1, autocomplete=off, position:absolute;left:-9999px. NICHT display:none.
2.  TIME-TRAP: HMAC-SHA256 Form-Token. < 3s ausgefüllt → Silent Drop. > 2h alt → 400. Manipuliert → Silent Drop.
3.  DOM-TOKEN / CSRF: State-verändernde POSTs mit Token absichern.
4.  AUTORESPONDER-STOPP: Kein automatisches Reply-to-Sender an externe Adressen. Nur interne Admin-Benachrichtigungen.
5.  CRLF-SANITIZING: Alle Mail-Header (to, cc, bcc, subject, fromName) durch sanitizeHeaderValue() (\\r, \\n, \\0 entfernen).
6.  SILENT DROP: Bot-Erkennungen immer mit HTTP 200 + {"success":true} quittieren. Keine Fehlerhinweise.
7.  RATE-LIMITING: Sliding-Window per IP. OTP: 5/10 Min, 10/Std. Notify: 3/5 Min, 15/Std. Form-Token: 20/Min.
8.  CORS-ALLOWLIST: Nur whitelisted Origins. Kein cors(). CF-Connecting-IP bevorzugen.
9.  BODY-SIZE: Allgemein ≤5 MB. Audio/PDF/Bild-Routen explizit auf 100 MB allowlisten.
10. RFC-5322 E-MAIL-VALIDIERUNG: isValidEmail() auf allen Eingaben vor SMTP-Versand.
11. HTML-ESCAPING: escapeHtml() auf alle User-Inhalte vor HTML-Mail-Einbettung.
12. AUTH-GUARD: requireAuth() auf PDF-Generator, KI-Routen, IMAP/SMTP-Proxys.
13. FILTER-INJECTION: PocketBase filter-Strings nie direkt mit User-Werten interpolieren.
14. RELAY-MISSBRAUCH: SMTP-Credentials nur aus .env/DB. Empfänger-Allowlist einhalten.
15. RESPONSE-SANITIZING: Keine Stack-Traces an Client. Generische Fehlermeldungen nach außen.
Ausgabe: Für jeden Punkt: ✅ OK / ⚠️ Warnung / 🔴 Kritisch – mit konkretem Dateipfad und Zeilennummer.
`;

// =========================================================================
// 5. DRY GEMINI CALLER mit Rate-Limit-Guard & Live-API Fallback
// =========================================================================
export async function callGeminiWithFallback(opts = {}) {
    const {
        apiKey = process.env.GEMINI_API_KEY,
        systemPart,
        userPart,
        models = GEMINI_MODEL_CASCADE,
        timeoutMs = 35000,
        temperature = 0.2,
        maxOutputTokens = 8192,
        label = 'AI',
    } = opts;

    if (!apiKey) throw new Error(`[${label}] GEMINI_API_KEY nicht gesetzt.`);

    const genAI = new GoogleGenerativeAI(apiKey);
    const candidateModels = getAvailableModels(models);
    let lastError = null;

    for (const modelName of candidateModels) {
        try {
            recordModelRequest(modelName);
            console.log(`[${label}] Rufe Gemini '${modelName}' auf...`);
            const model = genAI.getGenerativeModel({
                model: modelName,
                generationConfig: { temperature, maxOutputTokens },
            });

            const parts = [];
            if (systemPart) parts.push({ text: systemPart });
            if (userPart) parts.push({ text: userPart });

            const generatePromise = model.generateContent(parts.length === 1 ? parts[0].text : parts);
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error(`Timeout nach ${timeoutMs}ms`)), timeoutMs)
            );

            const res = await Promise.race([generatePromise, timeoutPromise]);
            const text = res.response.text();

            if (text && text.length > 10) {
                console.log(`[${label}] Erfolgreich via '${modelName}' (${text.length} Zeichen).`);
                return { text, model: modelName };
            }
        } catch (err) {
            markModelFailure(modelName, err);
            console.warn(`[${label}] Modell '${modelName}' fehlgeschlagen (${err.message?.slice(0, 100)}), wechsle zum nächsten Modell...`);
            lastError = err;
        }
    }

    // Letzte Reserve: Live-API (Unbegrenzt RPD/RPM) falls sämtliche REST-Kontingente erschöpft sind
    try {
        const liveRes = await callGeminiLiveSession({
            apiKey,
            systemInstruction: systemPart || '',
            turns: [{ role: 'user', parts: [{ text: userPart || systemPart || '' }] }],
            models: LIVE_CHAT_MODELS,
            timeoutMs: 18000
        });
        if (liveRes?.text) {
            return { text: liveRes.text, model: liveRes.model };
        }
    } catch (liveErr) {
        lastError = liveErr;
    }

    throw lastError || new Error(`[${label}] Alle Modelle fehlgeschlagen.`);
}
