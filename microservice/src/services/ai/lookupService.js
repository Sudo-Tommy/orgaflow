/**
 * lookupService.js
 * Kontakt- & Praxissuche sowie Kalenderanfragen-Zusammenfassung mit High-Quota Flash-Lite
 * (gemini-3.5-flash-lite & gemini-3.1-flash-lite, je 500 RPD / 15 RPM) und Rate-Limit-Guard.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import {
    HIGH_QUOTA_FAST_MODELS,
    getAvailableModels,
    recordModelRequest,
    markModelFailure
} from './aiModelRouter.js';

const lookupCache = new Map();

export async function lookupGoogleContact({ query, location, type, context }) {
    const cleanQuery = (query || '').trim();
    const cleanLoc = (location || '').trim();
    if (!cleanQuery && !cleanLoc) return [];

    // Layer 1: In-Memory Cache (0 ms)
    const cacheKey = `${cleanQuery.toLowerCase()}|${cleanLoc.toLowerCase()}|${type || ''}`;
    if (lookupCache.has(cacheKey)) {
        return lookupCache.get(cacheKey);
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY ist nicht konfiguriert.');

    const genAI = new GoogleGenerativeAI(apiKey);
    const prompt = `Ermittle präzise Adress- und Kontaktdaten für: Suchbegriff "${cleanQuery}", Ort "${cleanLoc}", Typ "${type || 'allgemein'}", Kontext: "${context || ''}".
Antworte AUSSCHLIESSLICH im JSON-Format:
{"results":[{"company_name":"","name_first":"","name_last":"","salutation":"","street":"","housenr":"","zip":"","city":"","phone":"","email":"","website":"","category":"","description":""}]}`;

    const candidateModels = getAvailableModels(HIGH_QUOTA_FAST_MODELS);

    for (const modelName of candidateModels) {
        try {
            recordModelRequest(modelName);
            const model = genAI.getGenerativeModel({
                model: modelName,
                generationConfig: {
                    responseMimeType: 'application/json',
                    maxOutputTokens: 1500,
                    temperature: 0.1
                }
            });

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Timeout nach 10000ms')), 10000)
            );

            const result = await Promise.race([model.generateContent(prompt), timeoutPromise]);
            const text = result.response.text();
            const cleanText = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
            const match = cleanText.match(/\{[\s\S]*\}/);
            const data = JSON.parse(match ? match[0] : cleanText);
            const list = data.results || [];
            if (list.length > 0) {
                lookupCache.set(cacheKey, list);
                return list;
            }
        } catch (e) {
            markModelFailure(modelName, e);
            console.warn(`[lookupGoogleContact] Modell ${modelName} fehlgeschlagen oder Timeout:`, e?.message);
        }
    }
    return [];
}

export async function summarizeCalendarRequest(record, pbAdmin) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return record.request_text;

    const genAI = new GoogleGenerativeAI(apiKey);
    let timeStr = '';
    if (record.time) {
        const rawTime = String(record.time).trim();
        if (/^\d{1,2}:\d{2}/.test(rawTime)) {
            timeStr = rawTime.includes('Uhr') ? rawTime : `${rawTime} Uhr`;
        } else {
            const clean = rawTime.includes(' ') && !rawTime.includes('T') ? rawTime.replace(' ', 'T') : rawTime;
            const d = new Date(clean);
            if (!isNaN(d.getTime())) {
                timeStr = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' }) + ' Uhr';
            }
        }
    }
    const dateStr = record.date ? new Date(record.date).toLocaleDateString('de-DE') : '';
    const timing = dateStr || timeStr ? `Wunschtermin: ${dateStr} ${timeStr}`.trim() : '';

    const prompt = `Erstelle eine kurze, prägnante Zusammenfassung (max 2 Sätze) für den Terminkalender:
Name: ${record.sender_name}, ${timing ? timing + ', ' : ''}Adresse: ${record.street || ''} ${record.zip_city || ''}, Text: ${record.request_text}.`;

    const candidateModels = getAvailableModels(HIGH_QUOTA_FAST_MODELS);

    for (const model of candidateModels) {
        try {
            recordModelRequest(model);
            const m = genAI.getGenerativeModel({ model, generationConfig: { maxOutputTokens: 200, temperature: 0.2 } });
            const res = await m.generateContent(prompt);
            const summary = res.response.text().trim();
            if (record.id && pbAdmin) {
                await pbAdmin.collection('appointment_requests').update(record.id, { ai_summary: summary }).catch(() => null);
            }
            return summary;
        } catch (e) {
            markModelFailure(model, e);
        }
    }
    return record.request_text;
}
