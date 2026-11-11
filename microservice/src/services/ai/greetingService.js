/**
 * greetingService.js
 * Generiert kontextbasierte KI-Begrüßungen mit situationsbezogenem Sarkasmus und Witz.
 * Nutzt die High-Quota Flash-Lite Kaskade (gemini-3.5-flash-lite & gemini-3.1-flash-lite, je 500 RPD).
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import {
    HIGH_QUOTA_FAST_MODELS,
    getAvailableModels,
    recordModelRequest,
    markModelFailure
} from './aiModelRouter.js';

function sanitizeGreetingText(greeting = '', name = '') {
    if (!greeting) return 'Hallo';
    let clean = greeting.trim();
    if (name) {
        const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        clean = clean.replace(new RegExp(`[,\\s!]+${escaped}[,!\\s]*$`, 'gi'), '').trim();
        clean = clean.replace(new RegExp(`^${escaped}[,!\\s]+`, 'gi'), '').trim();
    }
    return clean.replace(/[,!.\s]+$/, '').trim() || 'Hallo';
}

export async function generateAiGreeting(body, pbAdmin) {
    const { userName = 'Chef', userId = '', timeSlot = 'morning', date, slotKey, forceRefresh = false, context = {} } = body;

    if (!slotKey) throw new Error('slotKey ist erforderlich.');

    // 1. Caching in PocketBase
    if (!forceRefresh && pbAdmin) {
        try {
            const existing = await pbAdmin.collection('ai_greetings').getFirstListItem(`slot_key = "${slotKey}"`, { requestKey: null });
            if (existing && existing.greeting && existing.sub_greeting) {
                return {
                    success: true,
                    cached: true,
                    greeting: {
                        greeting: sanitizeGreetingText(existing.greeting, userName),
                        subGreeting: existing.sub_greeting,
                        emoji: existing.emoji || '👋',
                        fromAi: true
                    }
                };
            }
        } catch {}
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY fehlt.');

    const genAI = new GoogleGenerativeAI(apiKey);
    const slotLabels = {
        morning: 'Morgen (04:00 - 11:59 Uhr)',
        lunch: 'Mittag (12:00 - 15:59 Uhr)',
        afternoon: 'Nachmittag (16:00 - 19:59 Uhr)',
        night: 'Spätschicht / Nacht (ab 20:00 Uhr)'
    };

    const prompt = `Erstelle eine prägnante, humorvolle Begrüßung für ein Dashboard einer Seniorenassistenz-Firma.
Name des Nutzers: ${userName}
Tageszeit: ${slotLabels[timeSlot] || timeSlot}
Situationsdaten:
- Wochentag: ${context.weekday || 'Heute'}
- Wetter: ${context.weather || 'Keine Wetterdaten'}
- Heutige Termine: ${context.todaysAppointmentsCount ?? 0}
- Tag ist arbeitsfrei / blockiert: ${context.hasBlockedDayToday ? 'Ja (Sperrzeit / Wochenende)' : 'Nein'}
- Geburtstage heute: ${context.birthdaysTodayCount ?? 0}
${context.isSpecialDay ? `- Besonderer Tag: ${context.isSpecialDay}` : ''}

WICHTIG:
- greeting: Knackiger Anreißer (z.B. "Mahlzeit", "Bergfest", "Moin", "Endspurt") – STRIKT OHNE DEN NUTZERNAMEN, da dieser im UI separat formatiert wird!
- subGreeting: Genau ein Satz mit trockenem Witz / Realismus.
- emoji: Genau 1 passendes Emoji.

Antworte AUSSCHLIESSLICH als JSON:
{"greeting":"...","subGreeting":"...","emoji":"..."}`;

    let aiResult = null;
    const candidateModels = getAvailableModels(HIGH_QUOTA_FAST_MODELS);

    for (const model of candidateModels) {
        try {
            recordModelRequest(model);
            const m = genAI.getGenerativeModel({ model, generationConfig: { responseMimeType: 'application/json' } });
            const res = await m.generateContent(prompt);
            const text = res.response.text();
            aiResult = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || text);
            if (aiResult?.greeting && aiResult?.subGreeting) {
                aiResult.greeting = sanitizeGreetingText(aiResult.greeting, userName);
                break;
            }
        } catch (e) {
            markModelFailure(model, e);
            console.warn(`[Greeting AI] Model ${model} fehlgeschlagen:`, e.message);
        }
    }

    if (!aiResult) {
        aiResult = {
            greeting: timeSlot === 'lunch' ? 'Mahlzeit' : (timeSlot === 'morning' ? 'Guten Morgen' : 'Hallo'),
            subGreeting: 'Schön, dass du da bist! Ein neuer Tag für OrgaFlow.',
            emoji: '☕'
        };
    }

    if (pbAdmin) {
        try {
            await pbAdmin.collection('ai_greetings').create({
                slot_key: slotKey,
                user: userId || null,
                greeting: aiResult.greeting,
                sub_greeting: aiResult.subGreeting,
                emoji: aiResult.emoji,
                time_slot: timeSlot,
                date: date || new Date().toISOString().split('T')[0]
            }, { requestKey: null });
        } catch {}
    }

    return {
        success: true,
        cached: false,
        greeting: { ...aiResult, fromAi: true }
    };
}
