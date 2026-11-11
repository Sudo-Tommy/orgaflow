import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { GoogleGenAI, Type } from '@google/genai';
import { env } from '$env/dynamic/private';
import {
    getAvailableFrontendModels,
    recordFrontendModelRequest,
    markFrontendModelFailure
} from '$lib/utils/tokenSaverEngine';

const cache = new Map<string, any[]>();

export const POST: RequestHandler = async ({ request }) => {
    try {
        const body = await request.json();
        const { query = '', location = '', type = 'doctor', context = '' } = body;
        const cleanQuery = String(query).trim();
        const cleanLoc = String(location).trim();

        if (!cleanQuery && !cleanLoc) {
            return json({ success: true, results: [] });
        }

        const cacheKey = `${cleanQuery.toLowerCase()}|${cleanLoc.toLowerCase()}|${type}`;
        if (cache.has(cacheKey)) {
            return json({ success: true, results: cache.get(cacheKey) });
        }

        const apiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return json({ success: false, error: 'GEMINI_API_KEY ist nicht konfiguriert', results: [] });
        }

        const ai = new GoogleGenAI({ apiKey });
        const systemPrompt = `Ermittle präzise Kontaktdaten für Praxen, Ärzte oder Einrichtungen in Deutschland.
Antworte strikt im vorgegebenen JSON-Schema. Keine Einleitung, keine Kommentare.`;

        const userPrompt = `Suche: "${cleanQuery}"
Ort / Region: "${cleanLoc}"
Kategorie: "${type}"
Zusatzkontext: "${context}"`;

        const candidateModels = getAvailableFrontendModels();

        for (const modelName of candidateModels) {
            try {
                recordFrontendModelRequest(modelName);
                const response = await ai.models.generateContent({
                    model: modelName,
                    contents: userPrompt,
                    config: {
                        systemInstruction: systemPrompt,
                        responseMimeType: 'application/json',
                        responseSchema: {
                            type: Type.OBJECT,
                            properties: {
                                results: {
                                    type: Type.ARRAY,
                                    items: {
                                        type: Type.OBJECT,
                                        properties: {
                                            company_name: { type: Type.STRING },
                                            name_first: { type: Type.STRING },
                                            name_last: { type: Type.STRING },
                                            salutation: { type: Type.STRING },
                                            street: { type: Type.STRING },
                                            housenr: { type: Type.STRING },
                                            zip: { type: Type.STRING },
                                            city: { type: Type.STRING },
                                            phone: { type: Type.STRING },
                                            email: { type: Type.STRING },
                                            website: { type: Type.STRING },
                                            category: { type: Type.STRING },
                                            description: { type: Type.STRING }
                                        }
                                    }
                                }
                            }
                        }
                    }
                });

                const rawText = response.text?.trim() || '{}';
                const parsed = JSON.parse(rawText);
                const results = Array.isArray(parsed.results) ? parsed.results : [];
                if (results.length > 0) {
                    cache.set(cacheKey, results);
                    return json({ success: true, results });
                }
            } catch (err: any) {
                markFrontendModelFailure(modelName, err);
                console.warn(`[google-lookup server] Modell ${modelName} fehlgeschlagen:`, err?.message);
            }
        }

        return json({ success: true, results: [] });
    } catch (err: any) {
        console.error('[google-lookup server] Interner Fehler:', err);
        return json({ success: false, error: err.message, results: [] }, { status: 500 });
    }
};
