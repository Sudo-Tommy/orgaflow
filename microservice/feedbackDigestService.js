/**
 * feedbackDigestService.js
 *
 * Wöchentliche Auto-Update-Schleife (Feedback-to-Prompt Engine).
 * Analysiert aggregiertes Nutzerfeedback und Support-Logs der letzten 7 Tage
 * via Gemini API und synthetisiert einen strukturierten, priorisierten
 * Ausbesserungsprompt für das OrgaFlow Admin-Panel.
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

function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return weekNo;
}

/**
 * Führt die Feedback-Aggregations- und Prompt-Synthese-Schleife aus.
 * @param {Object} options
 * @param {PocketBase} [options.pb] - Optionale PocketBase-Instanz mit Admin-Rechten
 * @param {number} [options.days=7] - Zeitraum in Tagen für die Feedback-Erfassung
 * @param {boolean} [options.forceCreate=true] - Ob der Prompt in system_prompts persistiert werden soll
 */
export async function generateWeeklyFeedbackDigest(options = {}) {
    const days = options.days || 7;
    const forceCreate = options.forceCreate !== false;
    const includeChat = options.includeChat !== false;
    const includeProposals = options.includeProposals !== false;
    const includeInquiries = options.includeInquiries !== false;
    const includeAppointmentRequests = options.includeAppointmentRequests !== false;

    const pbUrl = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090';
    let pbAdmin = options.pb;

    if (!pbAdmin || !pbAdmin.authStore.isValid) {
        pbAdmin = new PocketBase(pbUrl);
        await pbAdmin.collection('_superusers').authWithPassword(
            process.env.PB_ADMIN_EMAIL,
            process.env.PB_ADMIN_PASSWORD
        );
    }

    const now = new Date();
    const periodStart = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
    const isoPeriodStart = periodStart.toISOString();

    console.log(`[Feedback Digest] Starte Analyse für Zeitraum ${isoPeriodStart} bis ${now.toISOString()} (Quellen: Feedback, Vorschläge: ${includeProposals}, Chat: ${includeChat}, Inquiries: ${includeInquiries}, Terminanfragen: ${includeAppointmentRequests})...`);

    // 1. Datenquellen sammeln
    let feedbackItems = [];
    let proposalItems = [];
    let chatItems = [];
    let inquiryItems = [];
    let appointmentRequestItems = [];
    let systemMailItems = [];

    // 1.1 Collection 'feedbacks'
    try {
        feedbackItems = await pbAdmin.collection('feedbacks').getFullList({
            filter: `created >= "${isoPeriodStart}"`,
            sort: '-created',
            requestKey: null
        });
        if (feedbackItems.length === 0) {
            feedbackItems = await pbAdmin.collection('feedbacks').getList(1, 15, {
                sort: '-created',
                requestKey: null
            }).then(r => r.items).catch(() => []);
        }
    } catch (e) {
        console.warn("[Feedback Digest] 'feedbacks' Abfrage:", e.message);
    }

    // 1.2 Verbesserungsvorschläge (improvement_proposals)
    if (includeProposals) {
        try {
            proposalItems = await pbAdmin.collection('improvement_proposals').getFullList({
                filter: `status != 'implemented' && status != 'archived'`,
                sort: '-id',
                requestKey: null
            });
            if (proposalItems.length === 0) {
                proposalItems = await pbAdmin.collection('improvement_proposals').getList(1, 15, {
                    sort: '-id',
                    requestKey: null
                }).then(r => r.items).catch(() => []);
            }
        } catch (e) {
            console.warn("[Feedback Digest] 'improvement_proposals' Abfrage:", e.message);
        }
    }

    // 1.3 Helpdesk / Live-Chat Logs (insb. Bug Reports)
    if (includeChat) {
        try {
            chatItems = await pbAdmin.collection('live_chat').getList(1, 40, {
                filter: `created >= "${isoPeriodStart}"`,
                sort: '-created',
                expand: 'user',
                requestKey: null
            }).then(r => r.items).catch(() => []);
        } catch (e) {
            console.warn("[Feedback Digest] 'live_chat' Abfrage:", e.message);
        }
    }

    // 1.4 Kundenanfragen / Inquiries
    if (includeInquiries) {
        try {
            inquiryItems = await pbAdmin.collection('inquiries').getList(1, 20, {
                filter: `created >= "${isoPeriodStart}"`,
                sort: '-created',
                requestKey: null
            }).then(r => r.items).catch(() => []);
        } catch (e) {
            console.warn("[Feedback Digest] 'inquiries' Abfrage:", e.message);
        }
    }

    // 1.5 Terminanfragen (appointment_requests)
    if (includeAppointmentRequests) {
        try {
            appointmentRequestItems = await pbAdmin.collection('appointment_requests').getList(1, 20, {
                filter: `status = "requested" || created >= "${isoPeriodStart}"`,
                sort: '-created',
                requestKey: null
            }).then(r => r.items).catch(() => []);
        } catch (e) {
            console.warn("[Feedback Digest] 'appointment_requests' Abfrage:", e.message);
        }
    }

    // 1.6 System- & Supportnachrichten aus Mailbox
    try {
        systemMailItems = await pbAdmin.collection('mailbox_messages').getList(1, 20, {
            filter: `folder = "System" && created >= "${isoPeriodStart}"`,
            sort: '-created',
            requestKey: null
        }).then(r => r.items).catch(() => []);
    } catch (e) {
        console.warn("[Feedback Digest] 'mailbox_messages' Abfrage:", e.message);
    }

    const totalRawCount = feedbackItems.length + proposalItems.length + chatItems.length + inquiryItems.length + appointmentRequestItems.length + systemMailItems.length;

    // Aufbereitung der aggregierten Rohdaten für den LLM-Kontext
    let aggregatedContext = `=== AGGREGIERTE NUTZER-FEEDBACKS (Letzte ${days} Tage) ===\n`;
    if (feedbackItems.length > 0) {
        aggregatedContext += feedbackItems.map((f, i) => 
            `[Feedback #${i+1}] Datum: ${f.created} | Bewertung: ${f.rating}/10 | Status: ${f.status || 'Neu'} | Nachricht: "${f.message || '(Kein Freitext)'}" | Von: ${f.name_first || ''} ${f.name_last || ''}`
        ).join('\n') + '\n\n';
    } else {
        aggregatedContext += "Keine neuen Einträge in 'feedbacks'.\n\n";
    }

    if (proposalItems.length > 0) {
        aggregatedContext += `=== VERBESSERUNGSVORSCHLÄGE & ANFORDERUNGEN (improvement_proposals) ===\n` + proposalItems.map((p, i) => {
            const author = p.author_name || p.author || 'Team';
            return `[Vorschlag #${i+1}] Priorität: ${p.priority || 'medium'} | Kategorie: ${p.category || 'Core'} | Status: ${p.status || 'idea'} | Titel: "${p.title}" | Beschreibung: "${p.description || ''}" | Geplante Lösung: "${p.solution_concept || ''}" | Von: ${author}`;
        }).join('\n') + '\n\n';
    }

    if (includeChat && chatItems.length > 0) {
        aggregatedContext += `=== TEAM-CHAT ANFRAGEN & BUG-REPORTS (ChatWidget) ===\n` + chatItems.map((c, i) => {
            const userName = c.expand?.user ? `${c.expand.user.name_first || ''} ${c.expand.user.name_last || ''}`.trim() : 'Mitarbeiter/Support';
            const tag = c.text?.includes('🚨 [BUG REPORT]') ? ' [🚨 BUG REPORT]' : '';
            return `[Chat #${i+1}${tag}] Datum: ${c.created} | Von: ${userName} | Text: "${c.text || ''}"`;
        }).join('\n') + '\n\n';
    }

    if (inquiryItems.length > 0) {
        aggregatedContext += `=== KUNDENANFRAGEN & BESCHWERDEN (inquiries) ===\n` + inquiryItems.map((inq, i) => 
            `[Anfrage #${i+1}] Datum: ${inq.created} | Dringlichkeit: ${inq.urgency || 'normal'} | Zusammenfassung: "${inq.summary || inq.raw_text || ''}"`
        ).join('\n') + '\n\n';
    }

    if (appointmentRequestItems.length > 0) {
        aggregatedContext += `=== OFFENE TERMINANFRAGEN (appointment_requests) ===\n` + appointmentRequestItems.map((ar, i) => 
            `[Terminanfrage #${i+1}] Datum: ${ar.created} | Status: ${ar.status} | Name: ${ar.name} | Anliegen: "${ar.subject || ar.message || ''}"`
        ).join('\n') + '\n\n';
    }

    if (systemMailItems.length > 0) {
        aggregatedContext += `=== SYSTEM-FEHLERMELDUNGEN & NOTIFIKATIONEN ===\n` + systemMailItems.map((m, i) => 
            `[System-Mail #${i+1}] Datum: ${m.created} | Betreff: "${m.subject || ''}" | Snippet: "${(m.body_text || '').substring(0, 150)}"`
        ).join('\n') + '\n\n';
    }

    // 2. Gemini API Synthese
    const apiKey = process.env.GEMINI_API_KEY;
    const kw = getWeekNumber(now);
    const year = now.getFullYear();
    const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

    const systemPrompt = `Du bist der leitende Softwarearchitekt und Core System Auditor für die App "OrgaFlow" (Stack: SvelteKit 2 mit Svelte 5 Runes, PocketBase, TypeScript, Tailwind CSS).
Deine Aufgabe ist es, aggregierte Nutzer-Rückmeldungen, Verbesserungsvorschläge, Bugreports, Helpdesk-Logs und Support-Anfragen der vergangenen ${days} Tage zu analysieren und daraus einen priorisierten, hochpräzisen Entwickler-Ausbesserungsprompt zu generieren, der SPEZIFISCH FÜR GEMINI CODE ASSIST (AGENT) IN ANTIGRAVITY formuliert ist.

STRIKTE VORGABEN:
1. Der generierte Prompt richtet sich AUSSCHLIESSLICH an den Entwickler-Agenten "Gemini Code Assist (Agent) in Antigravity".
2. Lasse Abschnitte für Team Chat & Support Briefings sowie Kundenantwort-Entwürfe KOMPLETT WEG!
3. Formuliere technisch präzise mit konkreten Dateipfaden und Svelte 5 Runes ($state, $derived, $props, $effect). Kein veraltetes let/export let.
4. Tailwind CSS für Design (keine ad-hoc Inline-Styles). Barrierefreie Touch-Flächen (mindestens 44x44px / h-11).
5. Strikte KI-Blacklist: Das Wort "KI" oder "AI" darf in sichtbaren Ansichten oder Berichten NIE erscheinen.
6. Gib am Ende verbindlich die genauen Verifikations-Befehle an (npm run check, npm run build, robocopy frontend\\pb_public backend\\pb_public /MIR).

STRIKTE FORMAT-VORGABEN:
Ordne alle abgeleiteten Aufgaben, Fehlerbehebungen und Optimierungsvorschläge verbindlich in folgende standardisierte Struktur ein:

# Wöchentlicher System-Ausbesserungsprompt für Gemini Code Assist (Agent) in Antigravity (KW ${kw} / ${year})

## 1. Executive Summary & Feedback-Audit
- **Analysierte Quellen:** ${feedbackItems.length} Feedbacks, ${proposalItems.length} Verbesserungsvorschläge, ${chatItems.length} Chat-/Support-Nachrichten, ${inquiryItems.length} Kundenanfragen, ${appointmentRequestItems.length} Terminanfragen, ${systemMailItems.length} System-Mails.
- **Gesamteinschätzung:** [Zusammenfassung der Zufriedenheit und Hauptschmerzpunkte in 2-3 prägnanten Sätzen]
- **Kritischste Brennpunkte:** [Stichpunkte zu den drängendsten Problemen]

---

## Bereich 1: Core Engine, API-Resilienz & Asynchronität
- Harte Timeouts bei externen Services (SMTP, Push) und Fehlerbehandlung.
- Double-Submission-Locks & asynchrone State-Flags (isSubmitting).
- Robuste Token-Validierung und Realtime-Abonnement-Verwaltung.

---

## Bereich 2: PocketBase Datenmodell, Integrität & Sicherheit
- HRBAC-Absicherung (Inhaber/Superadmin vs. Betriebsleiter vs. Pflegekräfte vs. Klienten).
- Schema-Integrität und Cascade-Delete-Sicherheit.
- Audit-Logging bei datenschutzrelevanten Aktionen.

---

## Bereich 3: Abrechnungswesen, Dokumenten-Engine & GoBD-Konformität
- Korrekte Buchhaltungssätze, Stornierungen und Rechnungsstatus-Workflow.
- HTML-Token-Parser für Vorlagen (§ 39 Verhinderungspflege & § 45b Entlastungsbetrag).
- Pixelgenaue DIN-A4-Druckansichten ohne Seitenumbrüche.

---

## Bereich 4: Mobile Ergonomie, Touch-UX & Dashboard-Logik
- Daumenzonen-Optimierung für mobile Betreuer im Außendienst (Mindesthöhe 44x44px / h-11).
- Safe-Area-Insets für moderne Smartphones via env(safe-area-inset-bottom).
- Schneller Folgetermin-Workflow direkt nach Einsatzerfassung.

---

## Bereich 5: Performance, Code-Hygiene & Klientenportal-Audit
- Barrierearmes Klientenportal: Durchgängig formelle Sie-Form („Ihr Profil“, „Ihre Termine“).
- Strikte KI-Blacklist: Vollständige Verbannung von „KI“/„AI“/„Prompt“ aus Kunden-Ansichten.
- Sauberes Unsubscribe aller Realtime-Listener beim Zerstören von Komponenten.

---

## 3. Priorisierte Umsetzungsreihenfolge (Top 5 Maßnahmen)
1. [P0 / Höchste Priorität]
2. [P1 / Hohe Priorität]
3. [P2 / Mittlere Priorität]
4. [P3 / Mittlere Priorität]
5. [P4 / Quick Win]

---

## 4. Test- & Verifikationskriterien
- TypeScript- & Svelte-Check ausführen: \`cd frontend && npm run check\`
- Frontend Build-Validierung: \`cd frontend && npm run build\`
- Asset-Synchronisation: \`robocopy frontend\\pb_public backend\\pb_public /MIR\`
- DevTools-Simulation (Responsive & Touch Target Audit).`;

    // Performante Modell-Kaskade mit neuestem Modell als Standard: gemini-3.8-flash
    const modelNames = [
        'gemini-3.8-flash',
        'gemini-3.5-flash',
        'gemini-flash-latest'
    ];
    let generatedPrompt = "";

    if (genAI) {
        for (const modelName of modelNames) {
            try {
                console.log(`[Feedback Digest] Rufe Gemini Modell '${modelName}' auf...`);
                const model = genAI.getGenerativeModel({
                    model: modelName,
                    generationConfig: {
                        temperature: 0.2,
                        maxOutputTokens: 2048,
                    }
                });
                
                const generatePromise = model.generateContent([
                    { text: systemPrompt },
                    { text: `HIER SIND DIE AGGREGIERTEN ROHDATEN:\n\n${aggregatedContext}` }
                ]);

                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error(`Timeout bei Modell '${modelName}' nach 10s`)), 10000)
                );

                const result = await Promise.race([generatePromise, timeoutPromise]);
                generatedPrompt = result.response.text();
                if (generatedPrompt && generatedPrompt.length > 200) {
                    console.log(`[Feedback Digest] Erfolgreich generiert via '${modelName}' (${generatedPrompt.length} Zeichen).`);
                    break;
                }
            } catch (err) {
                console.warn(`[Feedback Digest] Fehler bei Modell '${modelName}':`, err.message);
                if (err.message.includes('429') || err.message.includes('Quota exceeded')) {
                    console.log("[Feedback Digest] Quota erreicht - wechsle direkt zur dynamischen System-Synthese.");
                    break;
                }
            }
        }
    }

    // Fallback-Synthese: Wenn Gemini Quota-Limit erreicht oder API nicht erreichbar ist,
    // synthetisieren wir den Prompt direkt aus allen realen Vorgängen der Datenbank!
    if (!generatedPrompt) {
        console.warn("[Feedback Digest] Erzeuge dynamische System-Synthese direkt aus Vorgängen & Datenquellen...");

        // 1. Kategorisierung der echten Verbesserungsvorschläge
        const pCore = proposalItems.filter(p => !p.category || p.category.includes('Core') || p.category.includes('API'));
        const pUI = proposalItems.filter(p => p.category && (p.category.includes('UI') || p.category.includes('Design')));
        const pFin = proposalItems.filter(p => p.category && (p.category.includes('Finanzen') || p.category.includes('Haushalt') || p.category.includes('Abrechnung')));
        const pDoc = proposalItems.filter(p => p.category && (p.category.includes('Dokument') || p.category.includes('Vorlage')));
        const pMobile = proposalItems.filter(p => p.category && (p.category.includes('Termin') || p.category.includes('Außendienst') || p.category.includes('Mobile')));
        const pSec = proposalItems.filter(p => p.category && (p.category.includes('Sicherheit') || p.category.includes('Audit')));

        // Bug-Reports aus Live-Chat
        const chatBugs = chatItems.filter(c => c.text?.includes('🚨 [BUG REPORT]') || c.text?.toLowerCase().includes('bug') || c.text?.toLowerCase().includes('fehler'));
        
        // Negative Feedbacks
        const criticalFeedbacks = feedbackItems.filter(f => f.rating && f.rating <= 5);

        // Sortiere Vorgänge nach Priorität für Top-5
        const sortedProposals = [...proposalItems].sort((a, b) => {
            const prioScore = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
            return (prioScore[b.priority] || 2) - (prioScore[a.priority] || 2);
        });

        const topProposals = sortedProposals.slice(0, 5);

        const formatProposalBullet = (p) => {
            return `- **[${p.priority ? p.priority.toUpperCase() : 'NORMAL'}] ${p.title}** (Bereich: ${p.category || 'Core'}, Erfasser: ${p.author_name || 'Admin'}):\n  ${p.description || 'Keine Beschreibung.'}${p.solution_concept ? `\n  *Lösungskonzept:* ${p.solution_concept}` : ''}`;
        };

        const renderSectionProposals = (items, fallbackText) => {
            if (items.length > 0) {
                return items.map(formatProposalBullet).join('\n\n');
            }
            return fallbackText;
        };

        generatedPrompt = `# Wöchentlicher System-Ausbesserungsprompt für Gemini Code Assist (Agent) in Antigravity (KW ${kw} / ${year})

## 1. Executive Summary & Feedback-Audit
- **Analysierte Quellen:** ${feedbackItems.length} Feedbacks, ${proposalItems.length} Verbesserungsvorschläge, ${chatItems.length} Chat-/Support-Nachrichten, ${inquiryItems.length} Kundenanfragen, ${appointmentRequestItems.length} Terminanfragen, ${systemMailItems.length} System-Mails.
- **Gesamteinschätzung:** Die Auswertung der vergangenen ${days} Tage bündelt ${proposalItems.length} offene Verbesserungsvorschläge und ${feedbackItems.length} Nutzerfeedbacks. Der Fokus dieses Ausbesserungszyklus liegt auf der direkten Abarbeitung der gemeldeten Anforderungen in den Modulen Core Engine, Finanzen, Dokumenten-Engine und mobile Außendienst-Ergonomie.
- **Kritischste Brennpunkte:** ${sortedProposals.slice(0, 3).map(p => p.title).join(' • ') || 'HRBAC-Zugriffssicherheit, Double-Submission-Schutz und Mobile Touch-Ergonomie'}.

---

## Bereich 1: Core Engine, API-Resilienz & Asynchronität
${renderSectionProposals(pCore, `- **Service-Resilienz & Timeouts:** Harte Timeouts bei externen Microservice- und Mailbox-Aufrufen auf 15 Sekunden begrenzen.\n- **Double-Submission-Schutz:** Sperrung aller Aktionsbuttons mit isSubmitting-State und Lade-Spinnern.\n- **Token- und Session-Validierung:** Konsistente Überprüfung von Authentifizierungs-Headern bei allen API-Endpoints.`)}
${chatBugs.length > 0 ? `\n### Gemeldete Chat-Bugs & Supportfälle:\n` + chatBugs.map(b => `- 🚨 ${b.text}`).join('\n') : ''}

---

## Bereich 2: PocketBase Datenmodell, Integrität & Sicherheit
${renderSectionProposals(pSec, `- **HRBAC-Sicherheitsmatrix:** Strikte Durchsetzung von Inhaber-, Betriebsleiter-, Betreuer- und Klienten-Rollen in den PocketBase API-Rules.\n- **Cascade-Delete-Sicherheit:** Absicherung von Abhängigkeiten zwischen Klienten, Kontakten, Terminen und Abrechnungen.\n- **Audit-Logging:** Vollständige Protokollierung datenschutzrelevanter Zugriffe gemäß DSGVO & SGB XI.`)}

---

## Bereich 3: Abrechnungswesen, Dokumenten-Engine & GoBD-Konformität
${renderSectionProposals([...pFin, ...pDoc], `- **GoBD-Konforme Stornos:** Buchungen im Status 'Storniert' unveränderbar archivieren und aus aktiven Summen herausrechnen.\n- **DIN 5008 Vorlagen:** Normgerechte Positionierung von Anschriftfeld, Bezugszeichen und Firmenlogo.\n- **Token-Ersetzung:** Zuverlässige Ersetzung aller Platzhalter für § 39 Verhinderungspflege und § 45b Entlastungsbetrag.`)}

---

## Bereich 4: Mobile Ergonomie, Touch-UX & Dashboard-Logik
${renderSectionProposals([...pUI, ...pMobile], `- **Daumenzonen-Optimierung:** Alle interaktiven Flächen für Betreuer im Außendienst auf mind. 44x44px (h-11) vergrößern.\n- **Safe-Area-Insets:** Einbindung von env(safe-area-inset-bottom) für Mobilgeräte ohne Home-Button.\n- **Folgetermin-Workflow:** Direkte Anlage des nächsten Einsatzes unmittelbar nach Abschluss der Leistungsdokumentation.`)}

---

## Bereich 5: Performance, Code-Hygiene & Klientenportal-Audit
- **Klientenportal-Förmlichkeit:** Durchgängig formelle Sie-Form („Ihr Profil“, „Ihre Termine“, „Ihre Abrechnungen“).
- **Strikte KI-Blacklist:** Vollständige Verbannung von „KI“/„AI“/„Prompt“ aus allen sichtbaren Kundenansichten und Berichten.
- **Memory-Leak-Prävention:** Sauberes Unsubscribe aller PocketBase Realtime-Listener beim Zerstören von Svelte-Komponenten.
${criticalFeedbacks.length > 0 ? `\n### Relevante Kunden-Feedbacks:\n` + criticalFeedbacks.map(f => `- ⭐ [${f.rating}/10] ${f.message || 'Ohne Text'} (${f.name_first || ''} ${f.name_last || 'Klient'})`).join('\n') : ''}

---

## 3. Priorisierte Umsetzungsreihenfolge (Top 5 Maßnahmen)
${topProposals.length > 0 ? topProposals.map((p, i) => `${i + 1}. **[${p.priority ? p.priority.toUpperCase() : 'PRIO'}] ${p.title}** (${p.category || 'System'}): ${p.solution_concept || p.description || 'Vollständige Umsetzung nach Spezifikation'}`).join('\n') : `1. **[P0]** HRBAC-Matrix und Rollenisolierung im Klienten- und Mitarbeiterportal finalisieren.\n2. **[P1]** Double-Submission-Locks in allen Buchungs- und Terminformularen einbinden.\n3. **[P2]** Ausbesserungsprompt- und Lösungskonzept-Generierung fehlertolerant gegen API-Limits absichern.\n4. **[P3]** Mobile Touch-Ziele (mind. 44x44px / h-11) und Safe-Area-Insets im Außendienst-Modul nachrüsten.\n5. **[P4]** DIN-5008-Druckvorlagen und Token-Parser für § 39 und § 45b SGB XI optimieren.`}

---

## 4. Test- & Verifikationskriterien
- TypeScript- & Svelte-Check ausführen: \`cd frontend && npm run check\`
- Frontend Build-Validierung: \`cd frontend && npm run build\`
- Asset-Synchronisation: \`robocopy frontend\\pb_public backend\\pb_public /MIR\`
- DevTools-Simulation (Responsive Viewport 375px & Touch Target Audit).`;
    }

    // 3. Ergebnis in PocketBase 'system_prompts' speichern (Strikt: Nur 1 Prompt pro KW!)
    const calendarWeekKey = `${year}-W${String(kw).padStart(2, '0')}`;
    const title = `Wöchentlicher System-Ausbesserungsprompt (KW ${kw} / ${year})`;
    const rawSummary = `Analyse von ${totalRawCount} Einträgen (Feedbacks: ${feedbackItems.length}, Vorschläge: ${proposalItems.length}, Chats: ${chatItems.length}, Inquiries: ${inquiryItems.length}, Terminanfragen: ${appointmentRequestItems.length}, System-Mails: ${systemMailItems.length}) im Zeitraum ${isoPeriodStart.split('T')[0]} bis ${now.toISOString().split('T')[0]}.`;

    let savedRecord = null;
    if (forceCreate) {
        try {
            // Prüfe, ob für diese Kalenderwoche bereits ein Prompt existiert
            let existingRecord = null;
            try {
                const existingList = await pbAdmin.collection('system_prompts').getFullList({
                    filter: `calendar_week = "${calendarWeekKey}" || title = "${title}"`,
                    requestKey: null
                });
                if (existingList.length > 0) {
                    existingRecord = existingList[0];
                }
            } catch (queryErr) {
                console.warn("[Feedback Digest] Prüfung auf existierenden KW-Eintrag:", queryErr.message);
            }

            const payload = {
                title,
                calendar_week: calendarWeekKey,
                prompt_content: generatedPrompt,
                feedback_count: totalRawCount,
                source_period_start: isoPeriodStart,
                source_period_end: now.toISOString(),
                raw_summary: rawSummary,
                metadata: {
                    week: kw,
                    year,
                    generatedAt: now.toISOString(),
                    counts: {
                        total: totalRawCount,
                        feedbacks: feedbackItems.length,
                        proposals: proposalItems.length,
                        chats: chatItems.length,
                        inquiries: inquiryItems.length,
                        appointmentRequests: appointmentRequestItems.length,
                        systemMails: systemMailItems.length
                    }
                }
            };

            if (existingRecord) {
                // Aktualisiere bestehenden Eintrag der KW (Refresh anstelle von Duplikaten)
                payload.status = existingRecord.status || 'open';
                savedRecord = await pbAdmin.collection('system_prompts').update(existingRecord.id, payload);
                console.log(`[Feedback Digest] Bestehender Prompt für KW ${kw}/${year} aktualisiert (ID: ${savedRecord.id}).`);
            } else {
                // Erstelle neuen Eintrag für diese KW
                payload.status = 'open';
                savedRecord = await pbAdmin.collection('system_prompts').create(payload);
                console.log(`[Feedback Digest] Neuer Prompt für KW ${kw}/${year} angelegt (ID: ${savedRecord.id}).`);
            }
        } catch (saveErr) {
            console.error("[Feedback Digest] Fehler beim Speichern in 'system_prompts':", saveErr);
            throw saveErr;
        }
    }

    return {
        success: true,
        record: savedRecord,
        prompt: generatedPrompt,
        title,
        counts: {
            total: totalRawCount,
            feedbacks: feedbackItems.length,
            proposals: proposalItems.length,
            chats: chatItems.length,
            inquiries: inquiryItems.length,
            appointmentRequests: appointmentRequestItems.length,
            systemMails: systemMailItems.length
        }
    };
}
