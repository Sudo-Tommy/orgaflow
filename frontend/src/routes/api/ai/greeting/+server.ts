import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { GoogleGenAI, Type } from '@google/genai';
import PocketBase from 'pocketbase';
import { env } from '$env/dynamic/private';
import {
    getAvailableFrontendModels,
    recordFrontendModelRequest,
    markFrontendModelFailure
} from '$lib/utils/tokenSaverEngine';

const PB_URL = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090';

function sanitizeGreetingText(greeting = '', name = ''): string {
    if (!greeting) return 'Hallo';
    let clean = greeting.trim();
    if (name) {
        const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        clean = clean.replace(new RegExp(`[,\\s!]+${escaped}[,!\\s]*$`, 'gi'), '').trim();
        clean = clean.replace(new RegExp(`^${escaped}[,!\\s]+`, 'gi'), '').trim();
    }
    return clean.replace(/[,!.\s]+$/, '').trim() || 'Hallo';
}

async function getAdminPb(): Promise<PocketBase> {
    const pb = new PocketBase(PB_URL);
    pb.autoCancellation(false);
    const adminEmail = process.env.PB_ADMIN_EMAIL || env.PB_ADMIN_EMAIL;
    const adminPass = process.env.PB_ADMIN_PASSWORD || env.PB_ADMIN_PASSWORD;
    if (adminEmail && adminPass) {
        try {
            await pb.collection('_superusers').authWithPassword(adminEmail, adminPass);
        } catch (e) {
            console.warn('[AI Greeting] Superuser Auth fallback:', e);
        }
    }
    return pb;
}

async function ensureAiGreetingsCollection(pb: PocketBase) {
    try {
        await pb.collections.getOne('ai_greetings');
    } catch {
        try {
            await pb.collections.create({
                name: 'ai_greetings',
                type: 'base',
                createRule: '@request.auth.id != ""',
                updateRule: '@request.auth.id != ""',
                deleteRule: '@request.auth.role = "admin" || @request.auth.role = "superadmin" || @request.auth.role = "owner"',
                listRule: '@request.auth.id != ""',
                viewRule: '@request.auth.id != ""',
                fields: [
                    { name: 'slot_key', type: 'text', required: true },
                    { name: 'user', type: 'relation', collectionId: '_pb_users_auth_', maxSelect: 1 },
                    { name: 'date', type: 'text' },
                    { name: 'time_slot', type: 'text' },
                    { name: 'greeting', type: 'text' },
                    { name: 'sub_greeting', type: 'text' },
                    { name: 'emoji', type: 'text' },
                    { name: 'situation_context', type: 'text' }
                ]
            });
        } catch (err) {
            console.warn('[AI Greeting] Auto-create collection warning:', err);
        }
    }
}

export const POST: RequestHandler = async ({ request }) => {
    try {
        const body = await request.json();
        const { userName = 'Chef', userId = '', timeSlot = 'morning', date, slotKey, forceRefresh = false, context = {} } = body;

        if (!slotKey) {
            throw error(400, 'Parameter slotKey ist erforderlich.');
        }

        const pbAdmin = await getAdminPb();
        await ensureAiGreetingsCollection(pbAdmin);

        // 1. Caching-Prüfung in PocketBase
        if (!forceRefresh) {
            try {
                const existing = await pbAdmin.collection('ai_greetings').getFirstListItem(`slot_key = "${slotKey}"`, { requestKey: null });
                if (existing && existing.greeting && existing.sub_greeting) {
                    return json({
                        success: true,
                        cached: true,
                        greeting: {
                            greeting: sanitizeGreetingText(existing.greeting, userName),
                            subGreeting: existing.sub_greeting,
                            emoji: existing.emoji || '👋',
                            fromAi: true
                        }
                    });
                }
            } catch {}
        }

        // 2. Gemini API mit High-Quota Flash-Lite & Rate-Limit-Guard
        const apiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw error(500, 'GEMINI_API_KEY nicht konfiguriert.');
        }

        const ai = new GoogleGenAI({ apiKey });
        const slotLabels: Record<string, string> = {
            morning: 'Morgen (04:00 - 11:59 Uhr)',
            lunch: 'Mittag (12:00 - 15:59 Uhr)',
            afternoon: 'Nachmittag (16:00 - 19:59 Uhr)',
            night: 'Spätschicht / Nacht (ab 20:00 Uhr)'
        };

        const staticSystem = `Du bist ein schlagfertiger, menschlicher Bürokollege in OrgaFlow (Seniorenassistenz & Betreuungsdienst).
Schreibe eine kurze, extrem natürliche, witzige Begrüßung für das Dashboard.

WICHTIGSTE REGEL – KEINE FORMELHAFTEN AUFZÄHLUNGEN:
Verwebe die Fakten (Wetter, Termine, Geburtstag) lebendig und beiläufig in EINEN einzigen lockeren Satz mit trockenem Büro-Humor:
1. subGreeting: Genau EIN flüssiger, pointierter Satz. Niemals wie eine Liste klingen.
2. greeting: Knackiger Anreißer passend zum Zeitfenster (morgens: "Guten Morgen", "Moin"; mittags: "Mahlzeit"; nachmittags: "Endspurt"; mittwochs: "Bergfest") – STRIKT OHNE DEN NUTZERNAMEN, da dieser im UI separat angezeigt wird!
3. emoji: Genau 1 passendes Emoji.
4. Verboten: Wörter wie "KI", "Bot", "Algorithmus", "Assistent".`;

        const dynamicQuery = `Nutzer: ${userName}
Zeitfenster: ${slotLabels[timeSlot] || timeSlot}
Datum: ${date}
Situationsdaten:
- Wochentag: ${context.weekday || 'Heute'}
- Wetter: ${context.weather || 'Keine Wetterdaten'}
- Heutige Termine: ${context.todaysAppointmentsCount ?? 0}
- Geburtstage heute: ${context.birthdaysTodayCount ?? 0}
${context.isSpecialDay ? `- Besonderer Tag: ${context.isSpecialDay}` : ''}

Erstelle nun das JSON.`;

        const models = getAvailableFrontendModels();
        let aiResult: any = null;

        for (const modelName of models) {
            try {
                recordFrontendModelRequest(modelName);
                const response = await ai.models.generateContent({
                    model: modelName,
                    contents: dynamicQuery,
                    config: {
                        systemInstruction: staticSystem,
                        responseMimeType: 'application/json',
                        responseSchema: {
                            type: Type.OBJECT,
                            properties: {
                                greeting: { type: Type.STRING, description: 'Begrüßungsformel ohne Nutzername' },
                                subGreeting: { type: Type.STRING, description: 'Sarkastischer 1-Satz-Spruch mit Augenzwinkern' },
                                emoji: { type: Type.STRING, description: 'Ein passendes Emoji' }
                            },
                            required: ['greeting', 'subGreeting', 'emoji']
                        }
                    }
                });

                if (response?.text) {
                    aiResult = JSON.parse(response.text);
                    if (aiResult.greeting && aiResult.subGreeting) {
                        aiResult.greeting = sanitizeGreetingText(aiResult.greeting, userName);
                        break;
                    }
                }
            } catch (modelErr) {
                markFrontendModelFailure(modelName, modelErr);
                console.warn(`[AI Greeting] Model ${modelName} fehlgeschlagen, versuche nächstes:`, modelErr);
            }
        }

        if (!aiResult) {
            aiResult = {
                greeting: timeSlot === 'lunch' ? 'Mahlzeit' : (timeSlot === 'morning' ? 'Guten Morgen' : 'Hallo'),
                subGreeting: 'Schön, dass du da bist! Ein neuer Tag für OrgaFlow.',
                emoji: '☕'
            };
        }

        // 3. In PocketBase speichern
        try {
            let existingRecord: any = null;
            try {
                existingRecord = await pbAdmin.collection('ai_greetings').getFirstListItem(`slot_key = "${slotKey}"`, { requestKey: null });
            } catch {}

            const recordData = {
                slot_key: slotKey,
                user: userId || null,
                date: date || new Date().toISOString().split('T')[0],
                time_slot: timeSlot,
                greeting: aiResult.greeting,
                sub_greeting: aiResult.subGreeting,
                emoji: aiResult.emoji || '☕',
                situation_context: JSON.stringify(context)
            };

            if (existingRecord) {
                await pbAdmin.collection('ai_greetings').update(existingRecord.id, recordData);
            } else {
                await pbAdmin.collection('ai_greetings').create(recordData);
            }
        } catch (saveErr) {
            console.warn('[AI Greeting] Konnte nicht in PocketBase gespeichert werden:', saveErr);
        }

        return json({
            success: true,
            cached: false,
            greeting: {
                greeting: aiResult.greeting,
                subGreeting: aiResult.subGreeting,
                emoji: aiResult.emoji || '☕',
                fromAi: true
            }
        });
    } catch (err: any) {
        console.error('[AI Greeting] Fehler im Endpoint:', err);
        return json({ success: false, error: err.message || 'Unbekannter Fehler' }, { status: 500 });
    }
};
