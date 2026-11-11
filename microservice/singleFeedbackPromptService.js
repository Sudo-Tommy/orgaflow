/**
 * singleFeedbackPromptService.js
 *
 * Superadmin-Funktion zur gezielten Auswertung einzelner Feedbacks,
 * Support-Tickets, Anfragen und Chat-Nachrichten.
 *
 * Erstellt mittels Gemini API zielgerichtete, hochpräzise Ausbesserungs-Prompts
 * für Gemini Code Assist (Agent) in Antigravity inklusive Ursachenanalyse,
 * betroffenen Codebereichen, technischem Implementierungsplan und Testkriterien.
 */

import PocketBase from 'pocketbase';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildCacheOptimizedPrompt, callGeminiWithFallback } from './tokenSaverEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

/**
 * Generiert einen maßgeschneiderten Ausbesserungsprompt für ein einzelnes Feedback oder Ticket.
 * @param {Object} options
 * @param {string} options.source - 'feedback' | 'support_message' | 'inquiry' | 'chat' | 'proposal'
 * @param {string} [options.id] - ID des Datensatzes
 * @param {string} [options.sender] - Name des Einsenders
 * @param {string} options.message - Der eigentliche Text des Feedbacks / der Nachricht
 * @param {number} [options.rating] - Bewertung (1-10) falls vorhanden
 * @param {string} [options.context] - Zusätzliche Metadaten (z. B. Klient, Termin, Modul)
 * @param {string} [options.adminInstruction] - Spezifische Anweisungen des Superadmins
 * @param {boolean} [options.saveAsSystemPrompt=false] - Ob ein Eintrag in system_prompts angelegt werden soll
 * @param {PocketBase} [options.pb] - PocketBase Instanz
 */
export async function generateSingleFeedbackPrompt(options = {}) {
    const {
        source = 'feedback',
        id = '',
        sender = 'Klient / Mitarbeiter',
        message = '',
        rating = null,
        context = '',
        adminInstruction = '',
        saveAsSystemPrompt = false
    } = options;

    if (!message || !message.trim()) {
        throw new Error("Der Nachrichtentext darf nicht leer sein.");
    }

    const pbUrl = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090';
    let pbAdmin = options.pb;

    if (!pbAdmin || !pbAdmin.authStore.isValid) {
        try {
            pbAdmin = new PocketBase(pbUrl);
            await pbAdmin.collection('_superusers').authWithPassword(
                process.env.PB_ADMIN_EMAIL,
                process.env.PB_ADMIN_PASSWORD
            );
        } catch (e) {
            console.warn("[SingleFeedbackPrompt] PocketBase Admin Auth:", e.message);
        }
    }

    const apiKey = process.env.GEMINI_API_KEY;

    const ratingInfo = rating ? `Bewertung: ${rating}/10 Sternen` : 'Bewertung: Keine numerische Bewertung';
    const sourceLabel = {
        'feedback': 'Nutzer- / Klienten-Feedback',
        'support_message': 'Support-Nachricht / E-Mail',
        'inquiry': 'Kundenanfrage / Support-Inquiry',
        'chat': 'Live-Chat Support',
        'proposal': 'Superadmin Verbesserungsvorschlag'
    }[source] || 'Verbesserungsvorschlag';

    // --- TOKEN-SAVER ENGINE: Statische Instruktionen ZUERST (Caching-Optimierung) ---
    const staticSystemInstruction = `Du bist der Lead Software Architect und Pair Programming AI für "OrgaFlow", eine Enterprise-Software für Seniorenbetreuung und Pflegedienste (Technologie: SvelteKit 2 mit Svelte 5 Runes, Tailwind CSS, PocketBase, Node.js Microservice).

Deine Aufgabe:
Ein Superadmin hat ein einzelnes, konkretes Feedback oder Support-Ticket ausgewählt. Analysiere es und erstelle einen hochpräzisen, sofort ausführbaren AUSBESSERUNGSPROMPT für Gemini Code Assist (Agent) in Antigravity.

STRENGE RICHTLINIEN (unveränderlich):
1. REINER FLIESSTEXT: Der Prompt muss AUSNAHMSLOS ALS KOHÄRENTER, PROFESSIONELLER FLIESSTEXT in zusammenhängenden Absätzen formuliert sein.
2. KEINE LISTEN: Verwende KEINE Aufzählungszeichen, KEINE Bullet-Points (- oder *), KEINE Kacheln, KEINE Checkboxen.
3. Nur thematische Markdown-Überschriften (# und ##) zur Gliederung verwenden. Unter jeder Überschrift folgt zusammenhängender Fließtext.
4. Nur Abschnitte 1–4 ausgeben. Kein Team-Chat, kein Support-Briefing, keine Kundenantworten.
5. Svelte 5 Runes ($state, $derived, $props, $effect). Kein veraltetes let/export let.
6. Tailwind CSS. Barrierefreie Touch-Flächen (mindestens 44×44 px / h-11).
7. Formelle Sie-Form im Portal. KI-Blacklist: Nie "KI"/"AI" in nutzer-sichtbaren Texten.
8. Double-Submission-Schutz bei allen asynchronen Aktionen (isSubmitting-Flag).
9. Konkrete Dateipfade und Verifikations-Befehle (npm run check, npm run build, robocopy) fließend im Text erwähnen.

AUSGABEFORMAT (exakt 4 Abschnitte als Fließtext-Absätze, keine weiteren):
# Spezifischer Ausbesserungsprompt für Gemini Code Assist (Agent) in Antigravity: [Titel]
## 1. Executive Problem-Diagnose & Kontext
## 2. Betroffene Komponenten & Dateien
## 3. Konkreter technischer Ausbesserungsplan
## 4. Test- & Verifikationskriterien`;

    // --- DYNAMISCHER TASK-TEIL (immer am Ende – nie gecacht) ---
    const dynamicTaskPrompt = `KONKRETER FEEDBACK- / SUPPORT-FALL:
- Quelle: ${sourceLabel}
- Absender: ${sender}
- ${ratingInfo}
- Quelle-ID: ${id || 'Keine ID'}
- Zusätzlicher Kontext: ${context || 'Kein zusätzlicher Kontext'}
- Superadmin-Anweisung: ${adminInstruction || 'Keine; analysiere und behebe zielgerichtet'}

NACHRICHTENTEXT:
"""
${message}
"""

Erstelle ausschließlich die 4 Abschnitte des Ausbesserungsprompts:`;

    // skipEnvelope: true, da der TOKEN_SAVER_ENVELOPE ("Ausschließlich 3-7 Bullet Points") die Prompt-Synthese der 4 Abschnitte sonst abbricht!
    const { systemPart, userPart } = buildCacheOptimizedPrompt(staticSystemInstruction, dynamicTaskPrompt, { skipEnvelope: true });

    // --- GEMINI AUFRUF via Token-Saver Engine (DRY Kaskade, Timeout, Quota-Handling) ---
    let fullGeneratedText = "";
    let usedModel = "";

    if (apiKey) {
        try {
            const result = await callGeminiWithFallback({
                apiKey,
                systemPart,
                userPart,
                timeoutMs: 45000,
                temperature: 0.2,
                maxOutputTokens: 8192,
                label: 'SingleFeedbackPrompt',
            });
            fullGeneratedText = result.text;
            usedModel = result.model;
        } catch (err) {
            console.warn('[SingleFeedbackPrompt] Alle Modelle fehlgeschlagen:', err.message);
        }
    }

    // Integritätsprüfung: Hat Gemini den Prompt unvollständig / mittendrin abgebrochen?
    if (fullGeneratedText) {
        const hasSec1 = fullGeneratedText.includes('## 1.');
        const hasSec2 = fullGeneratedText.includes('## 2.');
        const hasSec3 = fullGeneratedText.includes('## 3.');
        const hasSec4 = fullGeneratedText.includes('## 4.');
        if (!hasSec2 || !hasSec3 || !hasSec4) {
            console.warn('[SingleFeedbackPrompt] Unvollständige Generierung erkannt (Abschnitte fehlen) – ergänze fehlende Abschnitte strukturiert.');
            if (!hasSec2) {
                fullGeneratedText += `\n\n## 2. Betroffene Komponenten & Dateien\n- Relevante Frontend-Routen & Widgets (\`frontend/src/routes/.../+\`)\n- Backend-Services & API-Schnittstellen (\`microservice/.../+\`)\n- PocketBase Datenintegrität & Live-Collections (\`pocketbase/pb_migrations/.../+\`)`;
            }
            if (!hasSec3) {
                fullGeneratedText += `\n\n## 3. Konkreter technischer Ausbesserungsplan\n1. **Svelte 5 Runes:** Reaktive Zustände sauber mit \`$state\`, \`$derived\` und \`$props\` abbilden.\n2. **Double-Submission & Fehler-Resilienz:** Schutz aller asynchronen Aktionen mit \`isSubmitting\`-Flag.\n3. **Barrierefreiheit & Daumenzonen:** Alle klickbaren Flächen mobil auf mind. 44x44px (\`h-11\`) vergrößern.\n4. **Datenabgleich:** Lückenlose Synchronisation und Einbindung externer Kalenderdaten.`;
            }
            if (!hasSec4) {
                fullGeneratedText += `\n\n## 4. Test- & Verifikationskriterien\n- TypeScript Check: \`cd frontend && npm run check\`\n- Production Build: \`cd frontend && npm run build\`\n- Asset-Sync: \`robocopy frontend\\pb_public backend\\pb_public /MIR\`\n- Manuelle Prüfung im Viewport (375px) auf Fehlerfreiheit und Kontrast.`;
            }
        }
    }

    // Fallback-Prompt-Generierung falls Gemini offline / Quota erreicht
    if (!fullGeneratedText) {
        console.warn("[SingleFeedbackPrompt] Generiere strukturierten Fallback-Prompt...");
        
        let titleLine = message.length > 60 ? message.substring(0, 57) + '...' : message;
        if (source === 'proposal' && message.startsWith('💡 [Vorschlag] ')) {
            const firstLineBreak = message.indexOf('\n');
            titleLine = firstLineBreak > -1 ? message.substring(14, firstLineBreak).trim() : message.substring(14).trim();
        }

        const isProposal = source === 'proposal';
        const componentFliesstext = context.includes('Finanzen') || context.includes('Haushalt')
            ? "Die Ausbesserung betrifft schwerpunktmäßig das Haushaltsbuch und die Buchungsverwaltung in `frontend/src/routes/finances/+page.svelte` sowie die Geschäftslogik in `frontend/src/lib/services/personalFinanceService.svelte.ts`."
            : context.includes('Dokument') || context.includes('Vorlage')
            ? "Der Eingriff fokussiert sich auf die Dokumentenverwaltung in `frontend/src/routes/documents/+page.svelte`, den Vorlagengenerator in `frontend/src/lib/services/documentGeneratorService.svelte.ts` sowie die Menüleiste in `frontend/src/lib/components/editor/EditorTopBar.svelte`."
            : context.includes('Termin') || context.includes('Außendienst')
            ? "Betroffen sind insbesondere die Einsatz- und Terminplanung in `frontend/src/routes/appointments/+page.svelte` sowie der Buchungsdialog in `frontend/src/lib/components/AppointmentModal.svelte`."
            : context.includes('Sicherheit') || context.includes('Audit')
            ? "Die Anpassungen betreffen die PocketBase API-Rules in den Migrationsdateien, das Rechtesystem in `frontend/src/lib/services/rbacService.svelte.ts` sowie die serverseitigen Guards in `frontend/src/hooks.server.ts`."
            : "Die Umsetzung betrifft die relevanten Svelte-Komponenten im Frontend-Verzeichnis (`frontend/src/routes/...`), die zugehörigen Service-Module sowie die PocketBase API-Regeln.";

        const ratingText = rating ? `mit einer Nutzerbewertung von ${rating} von 10 Punkten` : 'ohne numerische Sternebewertung';
        const rootCauseText = isProposal
            ? 'Als Ursache liegt eine gezielte Anforderung zur Funktionserweiterung oder Optimierung des bestehenden Systems gemäß Spezifikation vor.'
            : 'Der Nutzer beanstandet unzureichende Benutzerführung, fehlende Klarheit oder einen fehlerhaften Ablauf im genannten Kontext.';

        fullGeneratedText = `# Spezifischer Ausbesserungsprompt für Gemini Code Assist (Agent) in Antigravity: ${titleLine}

## 1. Executive Problem-Diagnose & Kontext
Dieser Vorgang geht zurück auf eine Meldung aus der Quelle ${sourceLabel}, übermittelt von ${sender} ${ratingText}. Im Originaltext wurde folgende Rückmeldung hinterlegt: „${message.trim()}“. ${rootCauseText} Als verbindliche Vorgabe für die Umsetzung gilt: ${adminInstruction || 'Vollständige und fehlerfreie Ausbesserung nach modernsten OrgaFlow Best Practices.'}

## 2. Betroffene Komponenten & Dateien
${componentFliesstext} Bei Bedarf sind zusätzlich betroffene Hilfsfunktionen und Typdefinitionen in die Überarbeitung einzubeziehen.

## 3. Konkreter technischer Ausbesserungsplan
Der Entwickler-Agent implementiert die geforderten Änderungen unter konsequenter Einhaltung moderner Svelte 5 Runes mit $state, $derived und $props. Alle asynchronen Interaktionen und API-Anfragen sind mit einem Double-Submission-Schutz (isSubmitting-Flag) sowie aussagekräftigen Fehler- und Erfolgsmeldungen auszustatten. Für mobile Endgeräte im Außendienst müssen sämtliche interaktiven Klick- und Touchflächen eine barrierefreie Mindesthöhe von 44 Pixeln aufweisen. Zudem ist die strikte KI-Blacklist einzuhalten, sodass in der Benutzeroberfläche keinerlei KI-Begriffe erscheinen.

## 4. Test- & Verifikationskriterien
Zur Verifikation der Änderungen führt der Agent zunächst eine Typprüfung mit „cd frontend && npm run check“ aus. Daraufhin erfolgt der Produktiv-Build mit „cd frontend && npm run build“ sowie die Synchronisation der gebauten Dateien über „robocopy frontend\\pb_public backend\\pb_public /MIR“. Abschließend wird das Verhalten in der mobilen Viewport-Simulation bei 375 Pixeln Breite geprüft.`;
    }

    // Extrahiere Titel
    let extractedTitle = `Ausbesserung: Feedback von ${sender}`;
    const titleMatch = fullGeneratedText.match(/^#\s+(.+)$/m);
    if (titleMatch && titleMatch[1]) {
        extractedTitle = titleMatch[1].trim();
    }

    // Team Chat und Kundenantwort bleiben bewusst leer, da nur der Entwickler-Prompt gewünscht ist
    let teamChatPrompt = "";
    let draftReply = "";

    // Optionale Persistierung in PocketBase
    let savedSystemPromptId = null;
    if (saveAsSystemPrompt && pbAdmin) {
        try {
            const currentYear = new Date().getFullYear();
            const d = new Date();
            d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
            const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
            const kwNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
            const kwTag = `${currentYear}-W${String(kwNo).padStart(2, '0')}-FB-${id ? id.substring(0, 5) : Date.now().toString().slice(-4)}`;

            const record = await pbAdmin.collection('system_prompts').create({
                title: extractedTitle,
                calendar_week: kwTag,
                prompt_content: fullGeneratedText,
                status: 'open',
                feedback_count: 1,
                source_period_start: new Date().toISOString(),
                source_period_end: new Date().toISOString(),
                raw_summary: `Erstellt aus Einzel-Feedback #${id || 'direct'} von ${sender}: "${message.substring(0, 150)}"`
            }, { requestKey: null });

            savedSystemPromptId = record.id;
            console.log(`[SingleFeedbackPrompt] Als System-Prompt gespeichert: ${record.id}`);
        } catch (saveErr) {
            console.warn("[SingleFeedbackPrompt] Konnte nicht in system_prompts speichern:", saveErr.message);
        }
    }

    // Falls ID und source === 'feedback', aktualisiere Status in PocketBase
    if (id && source === 'feedback' && pbAdmin) {
        try {
            await pbAdmin.collection('feedbacks').update(id, {
                status: 'Gelesen'
            }, { requestKey: null });
        } catch (uErr) {
            // Ignorieren falls Felder nicht exakt passen
        }
    }

    return {
        success: true,
        title: extractedTitle,
        prompt: fullGeneratedText,
        teamChatPrompt: teamChatPrompt,
        draftReply: draftReply,
        savedSystemPromptId,
        source,
        sender,
        rating,
        usedModel: usedModel || 'synthesizer-fallback'
    };
}
