import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { GoogleGenAI, Type } from '@google/genai';
import crypto from 'crypto';
import PocketBase from 'pocketbase';
import { env } from '$env/dynamic/private';

const PB_URL = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090';

async function getAdminPb() {
    const pb = new PocketBase(PB_URL);
    pb.autoCancellation(false);
    const adminEmail = process.env.PB_ADMIN_EMAIL || env.PB_ADMIN_EMAIL;
    const adminPass = process.env.PB_ADMIN_PASSWORD || env.PB_ADMIN_PASSWORD;
    if (adminEmail && adminPass) {
        try {
            await pb.collection('_superusers').authWithPassword(adminEmail, adminPass);
        } catch (e) {
            console.error('[AI Marketing] Superuser Auth fehlgeschlagen:', e);
        }
    }
    return pb;
}

function getSchemaForFormat(format: string) {
    if (format === 'poster' || format === 'flyer') {
        return {
            type: Type.OBJECT,
            properties: {
                headline: { type: Type.STRING },
                subheadline: { type: Type.STRING },
                bulletpoints: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                },
                highlight_box: { type: Type.STRING },
                cta: { type: Type.STRING },
                contacts: { type: Type.STRING }
            },
            required: ['headline', 'subheadline', 'bulletpoints', 'highlight_box', 'cta', 'contacts']
        };
    }

    if (format === 'social_sheet') {
        return {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    platform: { type: Type.STRING },
                    hook: { type: Type.STRING },
                    text: { type: Type.STRING },
                    cta: { type: Type.STRING },
                    hashtags: { type: Type.STRING }
                },
                required: ['platform', 'hook', 'text', 'cta', 'hashtags']
            }
        };
    }

    if (format === 'insert') {
        return {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING },
                subtitle: { type: Type.STRING },
                benefits: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                },
                footer: { type: Type.STRING }
            },
            required: ['title', 'subtitle', 'benefits', 'footer']
        };
    }

    if (format === 'factsheet') {
        return {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING },
                section1_title: { type: Type.STRING },
                section1_text: { type: Type.STRING },
                section2_title: { type: Type.STRING },
                section2_items: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                },
                section3_title: { type: Type.STRING },
                section3_text: { type: Type.STRING }
            },
            required: ['title', 'section1_title', 'section1_text', 'section2_title', 'section2_items', 'section3_title', 'section3_text']
        };
    }

    if (format === 'voucher') {
        return {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING },
                value: { type: Type.STRING },
                description: { type: Type.STRING },
                code: { type: Type.STRING },
                validity: { type: Type.STRING }
            },
            required: ['title', 'value', 'description', 'code', 'validity']
        };
    }

    // Default object fallback
    return {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING },
            body: { type: Type.STRING },
            cta: { type: Type.STRING }
        },
        required: ['title', 'body', 'cta']
    };
}

export const POST: RequestHandler = async ({ request }) => {
    try {
        const body = await request.json();
        const { format = 'poster', target_audience = 'Angehörige', prompt_override, context = '', force_refresh = false } = body;

        const pbAdmin = await getAdminPb();

        // 1. Content-Hash für Idempotenz und Caching
        const rawHashInput = `${format}|${target_audience}|${prompt_override || ''}|${context}`.trim();
        const contentHash = crypto.createHash('sha256').update(rawHashInput).digest('hex');

        // 2. Cache-Prüfung in PocketBase
        if (!force_refresh) {
            try {
                const cachedAsset = await pbAdmin.collection('marketing_assets').getFirstListItem(
                    `source_hash = "${contentHash}"`,
                    { requestKey: null }
                );
                if (cachedAsset && cachedAsset.content_json) {
                    return json({
                        success: true,
                        cached: true,
                        id: cachedAsset.id,
                        format: cachedAsset.format,
                        content: cachedAsset.content_json,
                        source_hash: contentHash
                    });
                }
            } catch {}
        }

        // 3. Gemini API Client initialisieren
        const apiKey = process.env.GEMINI_API_KEY || env.GEMINI_API_KEY;
        if (!apiKey) {
            throw error(500, 'GEMINI_API_KEY ist serverseitig nicht konfiguriert.');
        }

        const ai = new GoogleGenAI({ apiKey });
        const schema = getSchemaForFormat(format);

        const systemInstruction = `Du bist ein hochqualifizierter deutscher Werbetexter und Marketing-Spezialist für die Seniorenassistenz Jenzsch (Standorte: Halle Saale und Lutherstadt Wittenberg).
Deine Texte sind einfühlsam, seriös, vertrauensbildend und rechtlich präzise (z.B. Erwähnung des Entlastungsbetrags § 45b SGB XI mit 131 €/Monat, Verhinderungspflege § 39 SGB XI, keine starre Vertragsbindung).
Zielgruppe: ${target_audience}.
Format: ${format}.
Zusatzkontext: ${context || 'Kein Zusatzkontext'}.

Erstelle für das gewünschte Werbemittel-Format professionelle Inhalte. Antworte ausschließlich mit dem geforderten JSON-Schema.`;

        const userPrompt = prompt_override || `Generiere optimierte, hochattraktive Marketing-Inhalte für das Werbemittel-Format "${format}" für die Zielgruppe "${target_audience}".`;

        const candidateModels = ['gemini-2.5-flash', 'gemini-3.5-flash'];
        let resultJson: any = null;
        let usedModel = '';
        let lastError: any = null;

        for (const modelName of candidateModels) {
            try {
                const response = await ai.models.generateContent({
                    model: modelName,
                    contents: userPrompt,
                    config: {
                        systemInstruction,
                        responseMimeType: 'application/json',
                        responseSchema: schema,
                        temperature: 0.3
                    }
                });

                if (response.text) {
                    resultJson = JSON.parse(response.text);
                    usedModel = modelName;
                    break;
                }
            } catch (err: any) {
                lastError = err;
                console.warn(`[AI Marketing] Modell ${modelName} fehlgeschlagen:`, err?.message || err);
            }
        }

        if (!resultJson) {
            throw error(500, `Gemini API Fehler: ${lastError?.message || 'Keine Antwort generiert'}`);
        }

        // 4. In PocketBase marketing_assets cachen/speichern
        const title = `Marketing-Vorlage (${format.toUpperCase()} - ${target_audience})`;
        let savedRecord = null;
        try {
            // Prüfe, ob es bereits einen Eintrag für dieses Format gibt
            let existing = null;
            try {
                existing = await pbAdmin.collection('marketing_assets').getFirstListItem(
                    `format = "${format}"`,
                    { requestKey: null }
                );
            } catch {}

            const updateData: any = {
                title,
                format,
                content_json: resultJson,
                source_hash: contentHash,
                target_audience,
                headline: resultJson.headline || resultJson.title || '',
                body_text: resultJson.subheadline || resultJson.description || resultJson.section1_text || '',
                call_to_action: resultJson.cta || resultJson.call_to_action || '',
                contact_info: resultJson.contacts || resultJson.footer || ''
            };

            if (existing) {
                savedRecord = await pbAdmin.collection('marketing_assets').update(existing.id, updateData);
            } else {
                savedRecord = await pbAdmin.collection('marketing_assets').create(updateData);
            }
        } catch (dbErr) {
            console.error('[AI Marketing] Speichern in PocketBase fehlgeschlagen:', dbErr);
        }

        return json({
            success: true,
            cached: false,
            model: usedModel,
            id: savedRecord?.id || null,
            format,
            content: resultJson,
            source_hash: contentHash
        });
    } catch (e: any) {
        console.error('[AI Marketing Error]:', e);
        if (e.status && e.body) throw e;
        throw error(500, e.message || 'Interner Serverfehler bei der Marketing-Generierung.');
    }
};
