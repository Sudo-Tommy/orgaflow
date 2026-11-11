/**
 * feedbackDigestService.js
 *
 * Wöchentliche Auto-Update-Schleife (Feedback-to-Prompt Engine).
 * Analysiert aggregiertes Nutzerfeedback und Support-Logs der letzten 7 Tage
 * via Gemini API und synthetisiert einen strukturierten, priorisierten
 * Ausbesserungsprompt für das OrgaFlow Admin-Panel.
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

    // 1. Datenquellen sammeln (Strikt: Nur OFFENE, unbearbeitete Vorgänge berücksichtigen!)
    let feedbackItems = [];
    let proposalItems = [];
    let chatItems = [];
    let inquiryItems = [];
    let appointmentRequestItems = [];
    let systemMailItems = [];

    // 1.1 Collection 'feedbacks' (Nur Status 'Neu', 'In Bearbeitung', 'Gelesen' – KEIN 'Gelöst' oder 'Archiviert')
    try {
        const rawFbs = await pbAdmin.collection('feedbacks').getFullList({
            filter: `created >= "${isoPeriodStart}" && status != "Gelöst" && status != "Archiviert" && status != "Archieviert"`,
            sort: '-created',
            requestKey: null
        });
        feedbackItems = rawFbs.filter(f => {
            const st = (f.status || '').toLowerCase().trim();
            return st !== 'gelöst' && !st.includes('archiv');
        });
    } catch (e) {
        console.warn("[Feedback Digest] 'feedbacks' Abfrage:", e.message);
    }

    // 1.2 Verbesserungsvorschläge (improvement_proposals: Nur 'idea', 'planned', 'in_progress')
    if (includeProposals) {
        try {
            const rawProposals = await pbAdmin.collection('improvement_proposals').getFullList({
                filter: `status != 'implemented' && status != 'archived'`,
                sort: '-id',
                requestKey: null
            });
            proposalItems = rawProposals.filter(p => p.status !== 'implemented' && p.status !== 'archived');
        } catch (e) {
            console.warn("[Feedback Digest] 'improvement_proposals' Abfrage:", e.message);
        }
    }

    // 1.3 Helpdesk / Live-Chat Logs (Nur ungelöste Nachrichten, KEIN 'Gelöst' oder 'Archiviert')
    if (includeChat) {
        try {
            const rawChats = await pbAdmin.collection('live_chat').getList(1, 50, {
                filter: `created >= "${isoPeriodStart}"`,
                sort: '-created',
                expand: 'user',
                requestKey: null
            }).then(r => r.items).catch(() => []);

            chatItems = rawChats.filter(c => {
                const st = (c.status || '').toLowerCase().trim();
                const isResolved = st === 'gelöst' || st.includes('archiv') || st === 'erledigt';
                return !isResolved;
            });
        } catch (e) {
            console.warn("[Feedback Digest] 'live_chat' Abfrage:", e.message);
        }
    }

    // 1.4 Kundenanfragen / Inquiries (Nur 'new' oder 'in_progress', KEIN 'converted' oder 'rejected')
    if (includeInquiries) {
        try {
            const rawInqs = await pbAdmin.collection('inquiries').getList(1, 30, {
                filter: `created >= "${isoPeriodStart}" && status != "converted" && status != "rejected"`,
                sort: '-created',
                requestKey: null
            }).then(r => r.items).catch(() => []);

            inquiryItems = rawInqs.filter(i => {
                const st = (i.status || '').toLowerCase().trim();
                return st !== 'converted' && st !== 'rejected' && st !== 'gelöst';
            });
        } catch (e) {
            console.warn("[Feedback Digest] 'inquiries' Abfrage:", e.message);
        }
    }

    // 1.5 Terminanfragen (Nur Status 'requested')
    if (includeAppointmentRequests) {
        try {
            const rawAppts = await pbAdmin.collection('appointment_requests').getList(1, 30, {
                filter: `status = "requested" && created >= "${isoPeriodStart}"`,
                sort: '-created',
                requestKey: null
            }).then(r => r.items).catch(() => []);

            appointmentRequestItems = rawAppts.filter(ar => ar.status === 'requested');
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

    // 2. Gemini API Synthese via Token-Saver Engine
    const apiKey = process.env.GEMINI_API_KEY;
    const kw = getWeekNumber(now);
    const year = now.getFullYear();
    const staticSystemPart = `Du bist der leitende Softwarearchitekt und Core System Auditor für die App "OrgaFlow" (Stack: SvelteKit 2 mit Svelte 5 Runes, PocketBase, TypeScript, Tailwind CSS).
Deine Aufgabe: Aggregierte offene Nutzer-Rückmeldungen, ungelöste Verbesserungsvorschläge, offene Bugreports und Anfragen der vergangenen ${days} Tage analysieren und daraus einen priorisierten, hochpräzisen Entwickler-Ausbesserungsprompt generieren, SPEZIFISCH FÜR GEMINI CODE ASSIST (AGENT) IN ANTIGRAVITY.

STRIKTE FORMAT- UND TEXTSTIL-VORGABEN (unveränderlich):
1. REINER FLIESSTEXT: Der gesamte Prompt muss AUSNAHMSLOS ALS KOHÄRENTER, PROFESSIONELLER FLIESSTEXT in zusammenhängenden, flüssigen Textabsätzen ausformuliert sein.
2. KEINE LISTEN: Verwende KEINE Aufzählungszeichen, KEINE Bullet-Points (- oder *), KEINE Kacheln und KEINE Checkboxen.
3. Nur thematische Markdown-Überschriften (# und ##) zur Gliederung verwenden. Unter jeder Überschrift folgt zusammenhängender Fließtext.
4. AUSSCHLIESSLICH OFFENE VORGÄNGE: Nur aktuell noch offene, ungelöste Probleme ansprechen. Erledigte oder bereits gelöste Punkte dürfen nicht erwähnt werden. Liegen keine offenen Fehler vor, fokussiere den Fließtext auf präventive Code-Hygiene, Performance und Refactoring.
5. Ausschließlich an den Entwickler-Agenten "Gemini Code Assist (Agent) in Antigravity" richten.
6. Svelte 5 Runes ($state, $derived, $props, $effect). Tailwind CSS. Barrierefreie Touch-Flächen (mindestens 44×44 px / h-11). KI-Blacklist: Nie "KI"/"AI" in sichtbaren Ansichten.
7. Am Ende im Fließtext verbindlich erwähnen: npm run check, npm run build, robocopy frontend\\pb_public backend\\pb_public /MIR.

GLIEDERUNG (ausschließlich Fließtext-Absätze unter diesen Überschriften):
# Wöchentlicher System-Ausbesserungsprompt für Gemini Code Assist (Agent) in Antigravity (KW ${kw} / ${year})
## 1. Executive Summary & Audit offener Punkte
## Bereich 1: Core Engine, API-Resilienz & Asynchronität
## Bereich 2: PocketBase Datenmodell, Integrität & Sicherheit
## Bereich 3: Abrechnungswesen, Dokumenten-Engine & GoBD-Konformität
## Bereich 4: Mobile Ergonomie, Touch-UX & Dashboard-Logik
## Bereich 5: Performance, Code-Hygiene & Klientenportal-Audit
## 3. Priorisierte Umsetzungsreihenfolge
## 4. Test- & Verifikationskriterien`;

    // --- DYNAMISCHER DATEN-TEIL (nie gecacht, immer am Ende) ---
    const dynamicDataPart = `STATISTIK DIESER PERIODE (Ausschließlich offene Einträge):
- Offene Feedbacks: ${feedbackItems.length}
- Offene Verbesserungsvorschläge: ${proposalItems.length}
- Offene Chat-/Support-Nachrichten: ${chatItems.length}
- Offene Kundenanfragen: ${inquiryItems.length}
- Offene Terminanfragen: ${appointmentRequestItems.length}
- System-Mails: ${systemMailItems.length}

${totalRawCount === 0 ? 'HINWEIS: Es liegen aktuell keine ungelösten Fehlermeldungen vor. Bitte erstelle den Fließtext-Prompt mit Schwerpunkt auf Systempflege, Code-Hygiene, Stabilität und Refactoring.' : 'HIER SIND DIE OFFENEN ROHDATEN:\n' + aggregatedContext}`;

    const { systemPart, userPart } = buildCacheOptimizedPrompt(staticSystemPart, dynamicDataPart, { skipEnvelope: true });

    // --- GEMINI AUFRUF via Token-Saver Engine ---
    let generatedPrompt = "";

    if (apiKey) {
        try {
            const result = await callGeminiWithFallback({
                apiKey,
                systemPart,
                userPart,
                timeoutMs: 45000,
                temperature: 0.2,
                maxOutputTokens: 8192,
                label: 'Feedback Digest',
            });
            generatedPrompt = result.text;
        } catch (err) {
            console.warn('[Feedback Digest] Alle Modelle fehlgeschlagen:', err.message);
        }
    }

    // Fallback-Synthese: Wenn Gemini Quota-Limit erreicht oder API nicht erreichbar ist,
    // synthetisieren wir den Prompt direkt als Fließtext aus den offenen Vorgängen!
    if (!generatedPrompt) {
        console.warn("[Feedback Digest] Erzeuge dynamische System-Synthese als Fließtext...");

        // Kategorisierung der offenen Verbesserungsvorschläge
        const pCore = proposalItems.filter(p => !p.category || p.category.includes('Core') || p.category.includes('API'));
        const pUI = proposalItems.filter(p => p.category && (p.category.includes('UI') || p.category.includes('Design')));
        const pFin = proposalItems.filter(p => p.category && (p.category.includes('Finanzen') || p.category.includes('Haushalt') || p.category.includes('Abrechnung')));
        const pDoc = proposalItems.filter(p => p.category && (p.category.includes('Dokument') || p.category.includes('Vorlage')));
        const pMobile = proposalItems.filter(p => p.category && (p.category.includes('Termin') || p.category.includes('Außendienst') || p.category.includes('Mobile')));
        const pSec = proposalItems.filter(p => p.category && (p.category.includes('Sicherheit') || p.category.includes('Audit')));

        const chatBugs = chatItems.filter(c => c.text?.includes('🚨 [BUG REPORT]') || c.text?.toLowerCase().includes('bug') || c.text?.toLowerCase().includes('fehler'));
        const criticalFeedbacks = feedbackItems.filter(f => f.rating && f.rating <= 5);

        const formatProposalsAsFliesstext = (items, fallbackParagraph) => {
            if (items.length > 0) {
                return items.map(p => {
                    const desc = p.description ? p.description.trim() : 'Keine detaillierte Beschreibung hinterlegt.';
                    const sol = p.solution_concept ? ` Als Lösungskonzept ist vorgesehen: ${p.solution_concept.trim()}` : '';
                    return `Im Aufgabenbereich „${p.title}“ (Priorität: ${p.priority || 'mittel'}, Bereich: ${p.category || 'System'}, gemeldet von ${p.author_name || 'Team'}) steht folgende Anforderung zur Umsetzung an: ${desc}${sol}`;
                }).join('\n\n');
            }
            return fallbackParagraph;
        };

        const sortedProposals = [...proposalItems].sort((a, b) => {
            const prioScore = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
            return (prioScore[b.priority] || 2) - (prioScore[a.priority] || 2);
        });

        const topProposalsText = sortedProposals.length > 0
            ? sortedProposals.slice(0, 5).map((p, idx) => `Priorität ${idx + 1} besitzt die Umsetzung von „${p.title}“ (${p.category || 'System'}), wobei das Hauptaugenmerk auf folgender Vorgabe liegt: ${p.solution_concept || p.description || 'Sorgfältige technische Realisierung gemäß Spezifikation.'}`).join('\n\n')
            : 'In der aktuellen Umsetzungsreihenfolge stehen die kontinuierliche Stärkung der HRBAC-Matrix und Rollenisolierung, die Absicherung aller Formulare gegen Double-Submissions sowie die Überprüfung von Timeouts und Ladezuständen an oberster Stelle.';

        generatedPrompt = `# Wöchentlicher System-Ausbesserungsprompt für Gemini Code Assist (Agent) in Antigravity (KW ${kw} / ${year})

## 1. Executive Summary & Audit offener Punkte
Die automatische System-Analyse der vergangenen ${days} Tage umfasst insgesamt ${totalRawCount} offene Vorgänge, darunter ${proposalItems.length} ungelöste Verbesserungsvorschläge, ${feedbackItems.length} offene Nutzerfeedbacks sowie ${chatItems.length} relevante Chat-Einträge. Sämtliche bereits gelösten oder erledigten Anfragen wurden vollständig herausgefiltert, sodass dieser Auftrag ausschließlich reale, unerledigte Handlungsfelder adressiert. Der Schwerpunkt liegt auf der direkten Behebung gemeldeter Anforderungen in den Kernbereichen API-Resilienz, Datenintegrität, Abrechnung und mobile Ergonomie.

## Bereich 1: Core Engine, API-Resilienz & Asynchronität
${formatProposalsAsFliesstext(pCore, 'In der Core Engine stehen die Absicherung externer Microservice-Aufrufe mit harten Timeouts von 15 Sekunden sowie der Schutz sämtlicher asynchroner Aktionen durch Double-Submission-Flags im Fokus. Alle API-Endpoints müssen Authentifizierungs-Header einheitlich prüfen und Netzwerkunterbrechungen mit aussagekräftigen, benutzerfreundlichen Rückmeldungen abfangen.')}
${chatBugs.length > 0 ? '\n\nZu den gemeldeten Support- und Bug-Fällen aus dem Chat gehört folgender ungelöster Sachverhalt: ' + chatBugs.map(b => b.text).join(' ') : ''}

## Bereich 2: PocketBase Datenmodell, Integrität & Sicherheit
${formatProposalsAsFliesstext(pSec, 'Im Datenmodell liegt der Fokus auf der strikten Durchsetzung der HRBAC-Sicherheitsmatrix in den PocketBase API-Rules. Beziehungen zwischen Klienten, Kontakten, Terminen und Abrechnungen sind gegen unbeabsichtigte Löschkaskaden abzusichern. Datenschutzrelevante Zugriffe müssen gemäß DSGVO und SGB XI revisionssicher protokolliert werden.')}

## Bereich 3: Abrechnungswesen, Dokumenten-Engine & GoBD-Konformität
${formatProposalsAsFliesstext([...pFin, ...pDoc], 'Im Abrechnungswesen ist sicherzustellen, dass stornierte Buchungen unveränderbar archiviert und aus den aktiven Summen herausgerechnet werden. Bei den Druckvorlagen nach DIN 5008 müssen Anschriftfelder, Bezugszeichen und Firmenlogo millimetergenau platziert werden, während die Platzhalter für § 39 Verhinderungspflege und § 45b Entlastungsbetrag fehlerfrei befüllt werden.')}

## Bereich 4: Mobile Ergonomie, Touch-UX & Dashboard-Logik
${formatProposalsAsFliesstext([...pUI, ...pMobile], 'Für den Außendienst auf Smartphones und Tablets müssen sämtliche interaktiven Klick- und Touchflächen eine Mindestgröße von 44 mal 44 Pixeln aufweisen. Zudem sind Safe-Area-Insets für moderne Mobilgeräte ohne physischen Home-Button einzubinden und der Folgetermin-Workflow direkt im Anschluss an die Leistungsdokumentation bereitzustellen.')}

## Bereich 5: Performance, Code-Hygiene & Klientenportal-Audit
Im Klientenportal muss durchgängig die formelle Sie-Form eingehalten werden. Jegliche Entwicklerbegriffe oder KI-Bezeichnungen sind in sichtbaren Oberflächen strikt untersagt. Zur Vermeidung von Speicherlecks sind alle Realtime-Abonnements in Svelte-Komponenten beim Zerstören der Ansichten sauber abzumelden.
${criticalFeedbacks.length > 0 ? '\n\nAus den offenen Klienten-Feedbacks geht folgende Kritik hervor, die prioritär behoben werden muss: ' + criticalFeedbacks.map(f => `Bewertung ${f.rating}/10: „${f.message || 'Kein Text'}“`).join(' ') : ''}

## 3. Priorisierte Umsetzungsreihenfolge
${topProposalsText}

## 4. Test- & Verifikationskriterien
Nach der Durchführung der Ausbesserungen führt der Entwickler-Agent die folgenden Verifikationsschritte aus: Zunächst wird mit dem Befehl „cd frontend && npm run check“ eine vollständige Typprüfung durchgeführt. Anschließend erfolgt der Produktiv-Build mittels „cd frontend && npm run build“. Schließlich werden die kompilierten Artefakte mit „robocopy frontend\\pb_public backend\\pb_public /MIR“ synchronisiert und im Browser die Touch-Flächen sowie das responsive Verhalten bei 375 Pixel Viewport-Breite geprüft.`;
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
