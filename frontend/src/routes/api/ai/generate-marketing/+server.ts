import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { GoogleGenAI } from '@google/genai';
import crypto from 'crypto';
import PocketBase from 'pocketbase';
import { env } from '$env/dynamic/private';
import {
    buildCacheOptimizedPrompt,
    getAvailableFrontendModels,
    recordFrontendModelRequest,
    markFrontendModelFailure
} from '$lib/utils/tokenSaverEngine';
import { getSchemaForFormat } from './marketingAiSchemas';

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

        // 3. Gemini API Client mit Rate-Limit-Guard
        const apiKey = process.env.GEMINI_API_KEY || env.GEMINI_API_KEY;
        if (!apiKey) {
            throw error(500, 'GEMINI_API_KEY ist serverseitig nicht konfiguriert.');
        }

        const ai = new GoogleGenAI({ apiKey });
        const schema = getSchemaForFormat(format);

        const staticSystem = `Du bist ein hochqualifizierter deutscher Werbetexter und Marketing-Spezialist für die Seniorenassistenz Jenzsch (Standorte: Halle Saale und Lutherstadt Wittenberg).
Deine Texte sind einfühlsam, seriös, vertrauensbildend und rechtlich präzise (§ 45b SGB XI: 131 €/Monat Entlastungsbetrag, § 39 SGB XI Verhinderungspflege, keine starre Vertragsbindung).
Antworte ausschließlich mit dem geforderten JSON-Schema. Kein Vorgeplänkel.`;

        const dynamicTask = `Zielgruppe: ${target_audience}.
Format: ${format}.
Zusatzkontext: ${context || 'Kein Zusatzkontext'}.
${prompt_override || `Generiere optimierte, hochattraktive Marketing-Inhalte für das Format "${format}" für die Zielgruppe "${target_audience}".`}`;

        const { systemPart, userPart } = buildCacheOptimizedPrompt(staticSystem, dynamicTask, { skipEnvelope: true });
        const candidateModels = getAvailableFrontendModels();
        let resultJson: any = null;
        let usedModel = '';
        let lastError: any = null;

        for (const modelName of candidateModels) {
            try {
                recordFrontendModelRequest(modelName);
                const response = await ai.models.generateContent({
                    model: modelName,
                    contents: userPart,
                    config: {
                        systemInstruction: systemPart,
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
                markFrontendModelFailure(modelName, err);
                lastError = err;
                console.warn(`[AI Marketing] Modell ${modelName} fehlgeschlagen:`, err?.message || err);
            }
        }

        if (!resultJson) {
            throw error(500, `Marketing-Generierung fehlgeschlagen: ${lastError?.message || 'Keine Antwort generiert'}`);
        }

        // 4. In PocketBase speichern
        const title = `Marketing-Vorlage (${format.toUpperCase()} - ${target_audience})`;
        let savedRecord = null;
        try {
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
