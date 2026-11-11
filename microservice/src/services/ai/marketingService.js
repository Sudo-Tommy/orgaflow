/**
 * marketingService.js
 * Marketing-Vorlagen & Werbetexte über STRATEGIC_ANALYSIS_MODELS mit Rate-Limit-Guard
 * (gemini-3.5-flash-lite, gemini-3.1-flash-lite, gemini-3.6-flash, gemini-3.8-flash).
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import crypto from 'crypto';
import {
    STRATEGIC_ANALYSIS_MODELS,
    getAvailableModels,
    recordModelRequest,
    markModelFailure
} from './aiModelRouter.js';

export async function generateMarketingContent({ format = 'poster', target_audience = 'Angehörige', context = '' }, pbAdmin) {
    const rawHashInput = `${format}|${target_audience}|${context}`.trim();
    const contentHash = crypto.createHash('sha256').update(rawHashInput).digest('hex');

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY ist serverseitig nicht konfiguriert.');

    const genAI = new GoogleGenerativeAI(apiKey);
    const formatGuidance = format === 'poster' || format === 'flyer'
        ? `{"headline":"","subheadline":"","bulletpoints":["","","",""],"highlight_box":"","cta":"","contacts":""}`
        : format === 'social_sheet'
        ? `[{"platform":"Instagram / Facebook","hook":"","text":"","cta":"","hashtags":""}]`
        : `{"title":"","body":"","cta":""}`;

    const prompt = `Du bist ein hochqualifizierter Werbetexter für Seniorenassistenz Jenzsch (Sachsen-Anhalt).
Zielgruppe: ${target_audience}. Format: ${format}. Zusatzkontext: ${context || 'Keiner'}.
Erstelle professionelle Inhalte im Format: ${formatGuidance} (nur reines JSON, kein Markdown).`;

    let resultJson = null;
    let usedModel = '';
    let lastError = null;
    const candidateModels = getAvailableModels(STRATEGIC_ANALYSIS_MODELS);

    for (const modelName of candidateModels) {
        try {
            recordModelRequest(modelName);
            const model = genAI.getGenerativeModel({
                model: modelName,
                generationConfig: { responseMimeType: 'application/json' }
            });
            const result = await model.generateContent(prompt);
            const text = result.response.text();
            const match = text.match(/(\{|\[)[\s\S]*(\}|\])/);
            resultJson = JSON.parse(match ? match[0] : text);
            usedModel = modelName;
            break;
        } catch (err) {
            markModelFailure(modelName, err);
            lastError = err;
        }
    }

    if (!resultJson) throw new Error(`Marketing-Generierung fehlgeschlagen: ${lastError?.message || 'Keine Antwort'}`);

    let savedRecord = null;
    try {
        const existing = await pbAdmin.collection('marketing_assets').getFirstListItem(`format = "${format}"`, { requestKey: null }).catch(() => null);
        const data = {
            title: `Marketing-Vorlage (${format.toUpperCase()} - ${target_audience})`,
            format,
            content_json: resultJson,
            source_hash: contentHash,
            target_audience,
            headline: resultJson.headline || resultJson.title || '',
            body_text: resultJson.subheadline || resultJson.description || '',
            call_to_action: resultJson.cta || '',
            contact_info: resultJson.contacts || ''
        };
        savedRecord = existing
            ? await pbAdmin.collection('marketing_assets').update(existing.id, data)
            : await pbAdmin.collection('marketing_assets').create(data);
    } catch {}

    return { success: true, model: usedModel, id: savedRecord?.id || null, format, content: resultJson, source_hash: contentHash };
}
