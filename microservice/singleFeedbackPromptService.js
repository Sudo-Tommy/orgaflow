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
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

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
    const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

    const ratingInfo = rating ? `Bewertung: ${rating}/10 Sternen` : 'Bewertung: Keine numerische Bewertung';
    const sourceLabel = {
        'feedback': 'Nutzer- / Klienten-Feedback',
        'support_message': 'Support-Nachricht / E-Mail',
        'inquiry': 'Kundenanfrage / Support-Inquiry',
        'chat': 'Live-Chat Support',
        'proposal': 'Superadmin Verbesserungsvorschlag'
    }[source] || 'Verbesserungsvorschlag';

    const systemInstruction = `Du bist der Lead Software Architect und Pair Programming AI für "OrgaFlow", eine Enterprise-Software für Seniorenbetreuung und Pflegedienste (Technologie: SvelteKit 2 mit Svelte 5 Runes, Tailwind CSS, PocketBase, Node.js Microservice).

Deine Aufgabe:
Ein Superadmin hat ein einzelnes, konkretes Feedback oder Support-Ticket ausgewählt. Du sollst dieses analysieren und einen hochpräzisen, detaillierten und sofort ausführbaren AUSBESSERUNGSPROMPT erstellen, der SPEZIFISCH FÜR GEMINI CODE ASSIST (AGENT) IN ANTIGRAVITY formuliert ist.

WICHTIGE ANWEISUNGEN:
- Lasse jegliche Abschnitte für Team Chat, Support-Briefings oder Kundenantwort-Entwürfe KOMPLETT WEG!
- Der generierte Prompt richtet sich AUSSCHLIESSLICH an den Entwickler-Agenten "Gemini Code Assist (Agent) in Antigravity".

STRENG ZU BEACHTENDE ORGAFLOW- & ANTIGRAVITY-RICHTLINIEN:
1. Svelte 5 Runes verwenden ($state, $derived, $props, $effect). Kein veraltetes let/export let.
2. Tailwind CSS für Design (keine ad-hoc Inline-Styles). Barrierefreie Touch-Flächen (mindestens 44x44px / h-11).
3. Durchgängig formelle Sie-Form im Klienten-Portal ("Ihr Profil", "Ihre Termine", "Ihre Unterschrift").
4. Strikte KI-Blacklist: Das Wort "KI" oder "AI" darf in Besuchsberichten oder sichtbaren Formularen NIE erscheinen (Verwende stattdessen: "Spezifikation für automatischen Aktions-Entwurf", "automatische Text-Optimierung", "System-Spezifikation").
5. Double-Submission-Schutz bei allen asynchronen Aktionen (isSubmitting Flag & Lade-Spinner).
6. Konkrete Dateipfade im Workspace nennen (z. B. frontend/src/routes/... oder microservice/...).
7. Konkrete Verifikations-Befehle angeben (z. B. "cd frontend && npm run check", "npm run build", "robocopy frontend\\pb_public backend\\pb_public /MIR").

FORMATIERUNG DES AUSZUGEBENDEN PROMPTS:
Erzeuge deinen Output mit exakt folgenden vier strukturierten Abschnitten und KEINEN weiteren:

# Spezifischer Ausbesserungsprompt für Gemini Code Assist (Agent) in Antigravity: [Prägnanter Titel]

## 1. Executive Problem-Diagnose & Kontext
- **Quelle:** ${sourceLabel} (Absender: ${sender})
- **Bewertung:** ${rating ? rating + '/10' : 'N/A'}
- **Problemursache (Root Cause):** Warum tritt dieses Problem auf oder warum fehlt das Feature?
- **Dringlichkeit & UX-Impact:** Einschätzung des Einflusses auf den Außendienst / Klienten / Administratoren.

## 2. Betroffene Komponenten & Dateien
- Nenne konkrete Dateipfade (z. B. \`frontend/src/routes/...\` oder \`microservice/...\`) und Komponenten mit genauer Aufgabenbeschreibung.

## 3. Konkreter technischer Ausbesserungsplan
- Detaillierte Schritt-für-Schritt-Anleitung für den Gemini Code Assist Agenten
- Konkrete Code-Anpassungen (Svelte 5 Runes, Tailwind CSS, PocketBase SDK, Node.js Microservice)
- Fehlerbehandlung & Edge Cases (z. B. Timeouts, Null-Checks, Double-Submission-Locks)
- Ergonomie: Mindestens 44x44px Touch-Ziele (h-11) und Safe-Area-Insets

## 4. Test- & Verifikationskriterien
- Exakte Antigravity-Befehle zur automatisierten Verifikation (\`npm run check\`, \`npm run build\`, \`robocopy\`)
- Manuelle Prüfschritte (Responsive Viewport Simulation, Touch Targets, Network Throttling)`;

    const userPrompt = `KONKRETER FEEDBACK- / SUPPORT-FALL:
- Quelle: ${sourceLabel}
- Absender: ${sender}
- ${ratingInfo}
- Zusätzlicher Kontext: ${context || 'Kein zusätzlicher Kontext angegeben'}
- Spezifische Anweisungen des Superadmins: ${adminInstruction || 'Keine spezifischen Sonderwünsche; analysiere und behebe zielgerichtet'}

URSPRÜNGLICHER NACHRICHTENTEXT DES KUNDEN / NUTZERS:
"""
${message}
"""

Erstelle nun den spezifischen Ausbesserungsprompt für Gemini Code Assist (Agent) in Antigravity (ausschließlich Abschnitte 1 bis 4, keine Team- oder Kundenantworten):`;

    const candidateModels = [
        'gemini-3.8-flash',
        'gemini-3.5-flash',
        'gemini-flash-latest'
    ];

    let fullGeneratedText = "";
    let usedModel = "";

    if (genAI) {
        for (const modelName of candidateModels) {
            try {
                console.log(`[SingleFeedbackPrompt] Rufe Gemini '${modelName}' auf...`);
                const model = genAI.getGenerativeModel({
                    model: modelName,
                    generationConfig: {
                        temperature: 0.2,
                        maxOutputTokens: 2048,
                    }
                });
                
                const generatePromise = model.generateContent([
                    { text: systemInstruction },
                    { text: userPrompt }
                ]);

                // 10s harter Timeout pro Modell-Aufruf
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error(`Timeout bei Modell '${modelName}' nach 10s`)), 10000)
                );

                const res = await Promise.race([generatePromise, timeoutPromise]);
                const txt = res.response.text();
                if (txt && txt.length > 200) {
                    fullGeneratedText = txt;
                    usedModel = modelName;
                    console.log(`[SingleFeedbackPrompt] Erfolgreich generiert via '${modelName}' (${txt.length} Zeichen).`);
                    break;
                }
            } catch (err) {
                console.warn(`[SingleFeedbackPrompt] Fehler bei '${modelName}':`, err.message);
                // Wenn das tägliche Quota des Projekts erschöpft ist, sofort die Fallback-Synthese nutzen
                if (err.message.includes('429') || err.message.includes('Quota exceeded')) {
                    console.log("[SingleFeedbackPrompt] Quota erreicht - wechsle direkt zur System-Synthese.");
                    break;
                }
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
        const componentHints = context.includes('Finanzen') || context.includes('Haushalt')
            ? "- `frontend/src/routes/finances/+page.svelte` (Haushaltsbuch & Buchungen)\n- `frontend/src/lib/services/personalFinanceService.svelte.ts`"
            : context.includes('Dokument') || context.includes('Vorlage')
            ? "- `frontend/src/routes/documents/+page.svelte` (Dokumentenverwaltung)\n- `frontend/src/lib/services/documentGeneratorService.svelte.ts`\n- `frontend/src/lib/components/editor/EditorTopBar.svelte`"
            : context.includes('Termin') || context.includes('Außendienst')
            ? "- `frontend/src/routes/appointments/+page.svelte` (Einsatz- und Terminplanung)\n- `frontend/src/lib/components/AppointmentModal.svelte`"
            : context.includes('Sicherheit') || context.includes('Audit')
            ? "- `pocketbase/pb_migrations/...` (HRBAC Matrix & API Rules)\n- `frontend/src/lib/services/rbacService.svelte.ts`\n- `frontend/src/hooks.server.ts`"
            : "- Relevante Svelte-Komponenten im Frontend (`frontend/src/routes/...`)\n- State Management & Services (`frontend/src/lib/services/...`)\n- PocketBase API-Rules & Datenintegrität";

        fullGeneratedText = `# Spezifischer Ausbesserungsprompt für Gemini Code Assist (Agent) in Antigravity: ${titleLine}

## 1. Executive Problem-Diagnose & Kontext
- **Quelle:** ${sourceLabel} (Absender: ${sender})
- **Bewertung:** ${rating ? rating + '/10' : 'N/A (Standard-Priorität)'}
- **Original-Nachricht / Anforderung:**
"""
${message}
"""
- **Problemursache (Root Cause):** ${isProposal ? 'Anforderung zur Funktionserweiterung oder Optimierung des bestehenden Systems gemäß Spezifikation.' : 'Der Nutzer beanstandet unzureichende Benutzerführung, fehlende Klarheit oder einen fehlerhaften Ablauf im genannten Kontext.'}
- **Admin-Vorgabe:** ${adminInstruction || 'Vollständige und fehlerfreie Ausbesserung nach modernsten OrgaFlow Best Practices.'}

## 2. Betroffene Komponenten & Dateien
${componentHints}

## 3. Konkreter technischer Ausbesserungsplan
1. **Zustandsverwaltung mit Svelte 5 Runes:** Alle reaktiven Variablen strikt über \`$state\`, \`$derived\` und \`$props\` deklarieren.
2. **Double-Submission & Fehler-Resilienz:** Verhindern von Mehrfachklicks während asynchroner Operationen (\`isSubmitting\`-Flag) und Einbau aussagekräftiger Feedback-Meldungen.
3. **Ergonomie & Mobile Daumenzonen:** Alle interaktiven Schaltflächen auf mindestens 44x44px (\`h-11\`) vergrößern.
4. **Strikte KI-Blacklist:** Keine Erwähnung von Begriffen wie "KI", "AI", "Prompt" im gerenderten Benutzerinterface.
5. **Datenintegrität:** Konsistente Übertragung an PocketBase unter Berücksichtigung der HRBAC-Rechte.

## 4. Test- & Verifikationskriterien
- TypeScript- & Svelte-Check ausführen: \`cd frontend && npm run check\`
- Frontend Build-Validierung: \`cd frontend && npm run build\`
- Asset-Synchronisation: \`robocopy frontend\\pb_public backend\\pb_public /MIR\`
- Manuelle Prüfung im mobilen Viewport (375px Breite) auf Barrierefreiheit und responsives Verhalten.`;
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
