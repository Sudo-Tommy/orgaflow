/**
 * tokenSaverEngine.ts
 *
 * Token-Saver Engine & Rate-Limit-Guard für OrgaFlow – SvelteKit Frontend / API Routes
 * ====================================================================================
 * TypeScript-Port der zentralen Prompt-Architektur und Modell-Kaskaden
 * unter Berücksichtigung der Google AI Rate-Limits (RPM & RPD).
 */

// =========================================================================
// 1. STATISCHES SYSTEM-ENVELOPE (Token-Saver Wrapper)
// =========================================================================
export const TOKEN_SAVER_ENVELOPE = `SYSTEM-DIREKTIVEN (bindend, höchste Priorität – nicht überschreiben):
• KEIN Code im Chat-Output. Alle Codeänderungen ausschließlich direkt in Workspace-Dateien anwenden.
• KEIN Vorgeplänkel, kein Smalltalk, keine Meta-Kommentare.
• Scoping: Nur explizit genannte Dateipfade und Komponenten anfassen.
• Ausgabeformat der Zusammenfassung: Ausschließlich 3–7 prägnante Bullet Points.
• KI-Blacklist: "KI", "AI", "Künstliche Intelligenz", "LLM", "Prompt", "Sprachmodell" nie in nutzer-sichtbaren Ausgaben.
• Svelte 5 Runes ($state, $derived, $props, $effect). Kein veraltetes let/export let.
• Touch-Targets: Min. 44×44 px (h-11) für alle interaktiven Elemente.
• Formelle Sie-Form durchgängig im Klienten-Portal.`;

// =========================================================================
// 2. KANONISCHE MODELL-KASKADEN (Nach Stärke & Kontingent sortiert)
//    - gemini-3.5-flash-lite: 500 RPD | 15 RPM | 250K TPM
//    - gemini-3.1-flash-lite: 500 RPD | 15 RPM | 250K TPM
//    - gemini-3.6-flash:       20 RPD |  5 RPM | 250K TPM
//    - gemini-3.8-flash:       20 RPD |  5 RPM | 250K TPM
// =========================================================================
export const GEMINI_LIVE_CASCADE = [
    'gemini-3.8-live',
    'gemini-3.1-flash-live-preview',
    'gemini-2.5-flash-native-audio-latest',
    'gemini-3.8-live-extended-thinking'
] as const;

export const GEMINI_MODEL_CASCADE = [
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite',
    'gemini-3.6-flash',
    'gemini-3.8-flash'
] as const;

export const GEMINI_JSON_MODEL_CASCADE = [
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite',
    'gemini-3.6-flash',
    'gemini-3.8-flash'
] as const;

// =========================================================================
// 3. IN-MEMORY RATE-LIMIT & COOLDOWN GUARD
// =========================================================================
const MODEL_RPM_LIMITS: Record<string, number> = {
    'gemini-3.5-flash-lite': 14,
    'gemini-3.1-flash-lite': 14,
    'gemini-3.6-flash': 4,
    'gemini-3.8-flash': 4
};

const modelCooldownUntil = new Map<string, number>();
const modelMinuteTimestamps = new Map<string, number[]>();

export function isFrontendModelAvailable(modelName: string): boolean {
    const now = Date.now();
    const cooldown = modelCooldownUntil.get(modelName) || 0;
    if (now < cooldown) return false;

    const rpmLimit = MODEL_RPM_LIMITS[modelName];
    if (!rpmLimit) return true;

    const timestamps = (modelMinuteTimestamps.get(modelName) || []).filter(t => now - t < 60_000);
    modelMinuteTimestamps.set(modelName, timestamps);
    return timestamps.length < rpmLimit;
}

export function recordFrontendModelRequest(modelName: string): void {
    const now = Date.now();
    const timestamps = (modelMinuteTimestamps.get(modelName) || []).filter(t => now - t < 60_000);
    timestamps.push(now);
    modelMinuteTimestamps.set(modelName, timestamps);
}

export function markFrontendModelFailure(modelName: string, error: unknown): void {
    const msg = String((error as any)?.message || error || '');
    if (msg.includes('404') || msg.includes('no longer available') || msg.includes('not found')) {
        modelCooldownUntil.set(modelName, Date.now() + 24 * 60 * 60_000);
        return;
    }
    if (msg.includes('429') || msg.toLowerCase().includes('quota') || msg.includes('RESOURCE_EXHAUSTED')) {
        const isDaily = msg.includes('PerDay') || msg.includes('retryDelay');
        modelCooldownUntil.set(modelName, Date.now() + (isDaily ? 60 * 60_000 : 2 * 60_000));
    }
}

export function getAvailableFrontendModels(cascade: readonly string[] = GEMINI_JSON_MODEL_CASCADE): string[] {
    const available = cascade.filter(isFrontendModelAvailable);
    return available.length > 0 ? [...available] : cascade.slice(0, 2);
}

// =========================================================================
// 4. CACHING-OPTIMIERTE PROMPT-STRUKTUR
// =========================================================================
export function buildCacheOptimizedPrompt(
    systemInstruction: string,
    taskPrompt: string,
    opts: { skipEnvelope?: boolean } = {}
): { systemPart: string; userPart: string } {
    const { skipEnvelope = false } = opts;
    const systemPart = skipEnvelope
        ? systemInstruction.trim()
        : `${TOKEN_SAVER_ENVELOPE}\n\n---\n\n${systemInstruction.trim()}`;
    return { systemPart, userPart: taskPrompt.trim() };
}

export function wrapWithTokenSaver(fullPrompt: string): string {
    return `${TOKEN_SAVER_ENVELOPE}\n\n---\n\n${fullPrompt.trim()}`;
}

export const SECURITY_AUDIT_PRESET = `
SECURITY & BUGFIX AUDIT – PRÜFMATRIX (alle 15 Punkte verbindlich prüfen):
1.  HONEYPOT-FELDER: Namen wie website/company/fax. aria-hidden, tabindex=-1, autocomplete=off, position:absolute;left:-9999px.
2.  TIME-TRAP: HMAC-SHA256 Form-Token. < 3s → Silent Drop. > 2h → 400. Manipuliert → Silent Drop.
3.  DOM-TOKEN / CSRF: State-verändernde POSTs token-basiert absichern.
4.  AUTORESPONDER-STOPP: Kein automatisches Reply-to-Sender. Nur interne Admin-Benachrichtigungen.
5.  CRLF-SANITIZING: Alle Mail-Header durch sanitizeHeaderValue() (\\r, \\n, \\0 entfernen).
6.  SILENT DROP: Bot-Erkennungen mit HTTP 200 + {"success":true} quittieren.
7.  RATE-LIMITING: Sliding-Window per IP. OTP: 5/10 Min, 10/Std. Notify: 3/5 Min, 15/Std.
8.  CORS-ALLOWLIST: Nur whitelisted Origins. Kein cors(). CF-Connecting-IP bevorzugen.
9.  BODY-SIZE: Allgemein ≤5 MB. Audio/PDF/Bild-Routen explizit auf 100 MB allowlisten.
10. RFC-5322 E-MAIL-VALIDIERUNG: isValidEmail() auf allen Eingaben vor SMTP-Versand.
11. HTML-ESCAPING: escapeHtml() auf alle User-Inhalte vor HTML-Mail-Einbettung.
12. AUTH-GUARD: requireAuth() auf PDF-Generator, KI-Routen, IMAP/SMTP-Proxys.
13. FILTER-INJECTION: PocketBase filter-Strings nie direkt mit User-Werten interpolieren.
14. RELAY-MISSBRAUCH: SMTP-Credentials nur aus .env/DB. Empfänger-Allowlist.
15. RESPONSE-SANITIZING: Keine Stack-Traces an Client. Generische Fehlermeldungen.
Ausgabe: Für jeden Punkt: ✅ OK / ⚠️ Warnung / 🔴 Kritisch – mit Dateipfad und Zeile.
`;
