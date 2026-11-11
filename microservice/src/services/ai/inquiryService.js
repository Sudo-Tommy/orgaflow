/**
 * inquiryService.js
 * Verarbeitet Kundenanfragen über die High-Quota Flash-Lite Kaskade
 * (gemini-3.5-flash-lite & gemini-3.1-flash-lite, je 500 RPD) mit Rate-Limit-Guard.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import crypto from 'crypto';
import {
    HIGH_QUOTA_FAST_MODELS,
    getAvailableModels,
    recordModelRequest,
    markModelFailure
} from './aiModelRouter.js';

export async function processCustomerInquiry({ raw_text, inquiry_id, force_refresh }, pbAdmin) {
    if (!raw_text?.trim()) throw new Error('Feld raw_text ist erforderlich.');
    const trimmed = raw_text.trim();
    const contentHash = crypto.createHash('sha256').update(trimmed).digest('hex');

    if (!force_refresh) {
        if (inquiry_id) {
            const ex = await pbAdmin.collection('inquiries').getOne(inquiry_id, { requestKey: null }).catch(() => null);
            if (ex?.ai_processed && ex.ai_result_cache) return { success: true, cached: true, inquiry_id: ex.id, result: ex.ai_result_cache };
        }
        const cached = await pbAdmin.collection('inquiries').getFirstListItem(`content_hash = "${contentHash}" && ai_processed = true`, { requestKey: null }).catch(() => null);
        if (cached?.ai_result_cache) return { success: true, cached: true, inquiry_id: cached.id, result: cached.ai_result_cache };
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY ist nicht konfiguriert.');
    const genAI = new GoogleGenerativeAI(apiKey);

    const prompt = `Analysiere die folgende Kundenanfrage für Seniorenassistenz Jenzsch:\n"""${trimmed}"""\n
Antworte AUSSCHLIESSLICH als JSON:
{"category":"Erstberatung|Entlastungsbetrag|Alltagsbegleitung|Sonstiges","urgency":"high|medium|low","clientName":"","contactInfo":{"phone":"","email":""},"summary":"","preferredDate":null,"suggestedResponse":""}`;

    let aiResult = null;
    const candidateModels = getAvailableModels(HIGH_QUOTA_FAST_MODELS);

    for (const model of candidateModels) {
        try {
            recordModelRequest(model);
            const m = genAI.getGenerativeModel({ model, generationConfig: { responseMimeType: 'application/json' } });
            const res = await m.generateContent(prompt);
            const text = res.response.text();
            aiResult = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || text);
            break;
        } catch (e) {
            markModelFailure(model, e);
        }
    }
    if (!aiResult) throw new Error('Analyse derzeit nicht verfügbar.');

    let appointmentId = null;
    if (aiResult.preferredDate) {
        const appDate = new Date(aiResult.preferredDate);
        if (!isNaN(appDate.getTime())) {
            const newApp = await pbAdmin.collection('appointments').create({
                appointment: appDate.toISOString(),
                description: `[ANFRAGE: ${aiResult.category}] ${aiResult.summary}`,
                is_private: false,
                status: 'pending',
                notes: `Entwurf aus Anfrage.\n${aiResult.suggestedResponse}`
            }).catch(() => null);
            if (newApp) appointmentId = newApp.id;
        }
    }

    const inquiryData = {
        raw_text: trimmed,
        content_hash: contentHash,
        ai_processed: true,
        ai_result_cache: aiResult,
        sender_name: aiResult.clientName || '',
        sender_email: aiResult.contactInfo?.email || '',
        sender_phone: aiResult.contactInfo?.phone || '',
        urgency: aiResult.urgency || 'medium',
        summary: aiResult.summary || '',
        draft_reply: aiResult.suggestedResponse || '',
        status: 'new',
        ...(appointmentId ? { appointment_id: appointmentId } : {})
    };

    let savedId = inquiry_id;
    if (inquiry_id) {
        const upd = await pbAdmin.collection('inquiries').update(inquiry_id, inquiryData).catch(() => null);
        if (!upd) savedId = (await pbAdmin.collection('inquiries').create(inquiryData)).id;
    } else {
        savedId = (await pbAdmin.collection('inquiries').create(inquiryData)).id;
    }

    return { success: true, cached: false, inquiry_id: savedId, appointment_id: appointmentId, result: aiResult };
}
