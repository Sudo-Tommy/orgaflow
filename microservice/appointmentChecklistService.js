import { GoogleGenerativeAI } from '@google/generative-ai';
import {
    HIGH_QUOTA_FAST_MODELS,
    getAvailableModels,
    recordModelRequest,
    markModelFailure
} from './src/services/ai/aiModelRouter.js';

/**
 * Kürzt einen Text strikt auf maximal maxWords Wörter und schließt sauber ab.
 */
export function truncateToMaxWords(text, maxWords = 8) {
    if (!text || typeof text !== 'string') return '';
    const clean = text.trim().replace(/\s+/g, ' ');
    const dangling = new Set(['und', 'oder', 'sowie', 'für', 'mit', 'in', 'im', 'am', 'an', 'zu', 'zum', 'zur', 'von', 'vom', 'der', 'die', 'das', 'den', 'dem', 'des', 'ein', 'eine', 'einer', 'eines', 'einem', 'einen', 'als', 'wie', 'bei', 'beim', 'um']);

    let words = clean.split(' ').filter(Boolean);
    if (words.length > maxWords) {
        words = words.slice(0, maxWords);
    }
    while (words.length > 3 && dangling.has(words[words.length - 1].toLowerCase().replace(/[^a-zäöüß]/gi, ''))) {
        words.pop();
    }
    let truncated = words.join(' ').replace(/[,;:\-\s]+$/, '');
    if (!/[.!?]$/.test(truncated)) {
        truncated += '.';
    }
    return truncated;
}

/**
 * Synthesiert ausnahmslos ALLE vorliegenden Daten des Termins aus PocketBase.
 * Nutzt die High-Quota Flash-Lite Kaskade (gemini-3.5-flash-lite & gemini-3.1-flash-lite, je 500 RPD).
 */
export async function generateAppointmentChecklist(appointmentId, pbAdmin, options = {}) {
    let app = options?.appRecord;
    if (!app) {
        try {
            app = await pbAdmin.collection('appointments').getOne(appointmentId, {
                expand: 'client,tasks,appointment_at,user,drive_record,time_record',
                requestKey: null
            });
        } catch (err) {
            if (err?.status === 404) {
                console.warn(`[generateAppointmentChecklist] Termin ${appointmentId} nicht gefunden (bereits gelöscht).`);
                return [];
            }
            throw err;
        }
    }

    const blockText = `${app?.title || ''} ${app?.description || ''}`.toUpperCase();
    if (!app || app.is_private || app.is_blocked || blockText.includes('[BLOCK]')) {
        return [];
    }

    const client = app.expand?.client?.[0] || app.expand?.client || null;
    const clientName = client ? `${client.name_first || ''} ${client.name_last || ''}`.trim() : 'Klient';
    const clientSalutation = client?.salutation || '';
    const careLevel = client?.care_level ? `Pflegegrad ${client.care_level}` : 'Keine Angabe';
    const clientAddress = client ? `${client.street || ''} ${client.housenr || ''}, ${client.zip || ''} ${client.city || ''}`.trim() : '';
    const clientPhone = client?.phone || client?.handy || '';
    const clientNotes = (client?.notes || '').trim();

    const contact = app.expand?.appointment_at?.[0] || app.expand?.appointment_at || null;
    let destinationInfo = '';
    if (contact) {
        const comp = contact.company_name || '';
        const pers = `${contact.name_first || ''} ${contact.name_last || ''}`.trim();
        const addr = `${contact.street || ''} ${contact.housenr || ''}, ${contact.zip || ''} ${contact.city || ''}`.trim();
        destinationInfo = `- Anlaufstelle: ${comp} ${pers} | Tel: ${contact.phone || 'k. A.'} | Ort: ${addr || 'k. A.'}`;
    } else if (app.location_address) {
        destinationInfo = `- Zieladresse: ${app.location_address}`;
    } else {
        destinationInfo = `- Zielort: Häusliches Umfeld (${clientAddress || 'beim Klienten'})`;
    }

    let prevContext = '';
    let prevOpenTasks = [];
    let prevAppId = options?.previousAppointmentId;
    if (!prevAppId && client?.id && (app.description?.includes('Folgetermin') || app.title?.includes('Folgetermin'))) {
        try {
            const prev = await pbAdmin.collection('appointments').getList(1, 1, {
                filter: `client ~ "${client.id}" && id != "${appointmentId}" && appointment < "${app.appointment}"`,
                sort: '-appointment',
                requestKey: null
            });
            if (prev.items.length > 0) prevAppId = prev.items[0].id;
        } catch {}
    }

    if (prevAppId) {
        try {
            const prevApp = await pbAdmin.collection('appointments').getOne(prevAppId, { requestKey: null });
            const prevDesc = (prevApp.description || '').replace('[BLOCK]', '').trim();
            const prevNotes = (prevApp.notes || prevApp.internal_notes || '').trim();
            if (Array.isArray(prevApp.checklist)) {
                prevOpenTasks = prevApp.checklist.filter(item => !item.completed).map(item => item.text);
            }
            prevContext = `=== VORHERIGER TERMIN ===\n- Datum: ${prevApp.appointment ? new Date(prevApp.appointment).toLocaleDateString('de-DE') : 'k. A.'}\n- Bericht: ${prevDesc || 'Keiner'}\n- Notizen: ${prevNotes || 'Keine'}\n- Offene Aufgaben: ${prevOpenTasks.length > 0 ? prevOpenTasks.join('; ') : 'Alle erledigt'}`;
        } catch {}
    }

    const employeeName = app.expand?.user?.[0] ? `${app.expand.user[0].name_first || ''} ${app.expand.user[0].name_last || ''}`.trim() : 'Betreuungskraft';
    const tasks = Array.isArray(app.expand?.tasks) ? app.expand.tasks : (app.expand?.tasks ? [app.expand.tasks] : []);
    const taskTitles = tasks.map(t => t.title || t.name).filter(Boolean);
    const driveInfo = app.expand?.drive_record?.[0] ? `Fahrt: ${app.expand.drive_record[0].start_address || ''} -> ${app.expand.drive_record[0].destination_address || ''}` : '';

    const appDate = app.appointment ? new Date(app.appointment) : null;
    const dateFormatted = appDate ? `${appDate.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })} um ${appDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr` : 'Datum unbestimmt';
    const cleanDesc = (app.description || '').replace('[BLOCK]', '').trim();
    const cleanNotes = (app.notes || app.internal_notes || '').trim();

    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
        const genAI = new GoogleGenerativeAI(apiKey);
        const candidateModels = getAvailableModels(HIGH_QUOTA_FAST_MODELS);

        const prompt = `Du bist Einsatzkoordinator für "Seniorenassistenz Jenzsch" (OrgaFlow).
Erstelle eine extrem praxisnahe To-Do-Checkliste für die Betreuungskraft vor Ort.
=== TERMIN-DATEN ===
- Titel & Zeit: ${app.title || 'Betreuung'} (${dateFormatted})
- Beschreibung: ${cleanDesc || 'Keine'}
- Interne Notizen: ${cleanNotes || 'Keine'}
=== KLIENT ===
- Klient: ${clientSalutation} ${clientName} (${careLevel})
- Adresse & Tel: ${clientAddress || 'k. A.'} | ${clientPhone || 'k. A.'}
- Pflegehinweise: ${clientNotes || 'Keine'}
=== ZIELORT & MITARBEITER ===
${destinationInfo}
- Betreuungskraft: ${employeeName}
- Aufgaben: ${taskTitles.length > 0 ? taskTitles.join(', ') : 'Alltagsbegleitung'}
${driveInfo ? `- ${driveInfo}` : ''}
${prevContext}

STRIKTE REGELN:
1. MAXIMAL 8 WORTE PRO AUFGABE: Jedes To-Do darf STRIKT HÖCHSTENS 8 WORTE lang sein!
2. PRÄGNANZ: Keine Floskeln. Sofort auf den Punkt.
3. UMFANG: 3 bis 6 kurze Aufgaben mit Priorität ('high', 'medium', 'low').
4. Antworte STRIKT als JSON-Array:
[{"id": "ck_1", "text": "Kurze Aufgabe...", "priority": "high", "completed": false, "completed_at": null, "completed_by": null}]`;

        for (const modelName of candidateModels) {
            try {
                recordModelRequest(modelName);
                const model = genAI.getGenerativeModel({ model: modelName, generationConfig: { responseMimeType: 'application/json' } });
                const result = await model.generateContent(prompt);
                const responseText = result.response.text();
                const jsonMatch = responseText.match(/\[[\s\S]*\]/);
                const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    return parsed.map((item, idx) => ({
                        id: item.id || `ck_${Date.now()}_${idx}`,
                        text: truncateToMaxWords(String(item.text || ''), 8),
                        priority: ['high', 'medium', 'low'].includes(item.priority) ? item.priority : 'medium',
                        completed: Boolean(item.completed),
                        completed_at: null,
                        completed_by: null
                    }));
                }
            } catch (err) {
                markModelFailure(modelName, err);
                console.warn(`[Checklist AI] Modell ${modelName} fehlgeschlagen:`, err.message);
            }
        }
    }

    const fallbackList = [];
    let counter = 1;
    if (prevOpenTasks.length > 0) {
        prevOpenTasks.slice(0, 3).forEach(t => {
            fallbackList.push({
                id: `ck_${Date.now()}_${counter++}`,
                text: truncateToMaxWords(`Vortermin fortführen: ${truncateToMaxWords(t, 5)}`, 8),
                priority: 'high', completed: false, completed_at: null, completed_by: null
            });
        });
    }
    if (cleanNotes) {
        cleanNotes.split('\n').filter(l => l.trim().length > 3).slice(0, 2).forEach(l => {
            fallbackList.push({
                id: `ck_${Date.now()}_${counter++}`,
                text: truncateToMaxWords(`Notiz: ${l.trim()}`, 8),
                priority: 'high', completed: false, completed_at: null, completed_by: null
            });
        });
    }
    if (cleanDesc) {
        cleanDesc.split('\n').filter(l => l.trim().length > 3).slice(0, 2).forEach(l => {
            fallbackList.push({
                id: `ck_${Date.now()}_${counter++}`,
                text: truncateToMaxWords(`Auftrag: ${l.trim()}`, 8),
                priority: 'high', completed: false, completed_at: null, completed_by: null
            });
        });
    }
    if (fallbackList.length === 0) {
        fallbackList.push({
            id: `ck_${Date.now()}_1`,
            text: truncateToMaxWords(`Vorbereitung für ${clientName} durchführen.`, 8),
            priority: 'high', completed: false, completed_at: null, completed_by: null
        });
    }
    fallbackList.push({
        id: `ck_${Date.now()}_end`,
        text: 'Besuchsbericht und Dokumentation zeitnah erfassen.',
        priority: 'low', completed: false, completed_at: null, completed_by: null
    });
    return fallbackList;
}
