import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { GoogleGenAI, Type } from '@google/genai';
import crypto from 'crypto';
import PocketBase from 'pocketbase';
import { env } from '$env/dynamic/private';
import {
    buildCacheOptimizedPrompt,
    getAvailableFrontendModels,
    recordFrontendModelRequest,
    markFrontendModelFailure
} from '$lib/utils/tokenSaverEngine';

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
            console.error('[AI Inquiry] Superuser Auth fehlgeschlagen:', e);
        }
    }
    return pb;
}

export const POST: RequestHandler = async ({ request }) => {
    try {
        const body = await request.json();
        const { raw_text, inquiry_id, force_refresh } = body;

        if (!raw_text || typeof raw_text !== 'string' || !raw_text.trim()) {
            throw error(400, 'Feld raw_text ist erforderlich.');
        }

        const trimmedText = raw_text.trim();
        const contentHash = crypto.createHash('sha256').update(trimmedText).digest('hex');
        const pbAdmin = await getAdminPb();

        // 1. Caching & Idempotenz Prüfung
        if (!force_refresh) {
            if (inquiry_id) {
                try {
                    const existingInquiry = await pbAdmin.collection('inquiries').getOne(inquiry_id, { requestKey: null });
                    if (existingInquiry.ai_processed && existingInquiry.ai_result_cache) {
                        return json({
                            success: true,
                            cached: true,
                            inquiry_id: existingInquiry.id,
                            result: existingInquiry.ai_result_cache
                        });
                    }
                } catch {}
            }

            try {
                const cached = await pbAdmin.collection('inquiries').getFirstListItem(
                    `content_hash = "${contentHash}" && ai_processed = true`,
                    { requestKey: null }
                );
                if (cached && cached.ai_result_cache) {
                    return json({
                        success: true,
                        cached: true,
                        inquiry_id: cached.id,
                        result: cached.ai_result_cache
                    });
                }
            } catch {}
        }

        // 2. Gemini API Call mit Rate-Limit-Guard (High-Quota Flash-Lite Kaskade)
        const apiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw error(500, 'GEMINI_API_KEY ist serverseitig nicht konfiguriert.');
        }

        const ai = new GoogleGenAI({ apiKey });
        const nowIso = new Date().toISOString();
        const nowFormatted = new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' });

        const staticSystem = `Du bist ein intelligenter Assistent für das Assistenz- und Betreuungsunternehmen "Seniorenassistenz Jenzsch" (OrgaFlow).
Analysiere eine unstrukturierte Kundenanfrage (E-Mail, Kontaktformular, Sprachnotiz) und extrahiere strukturierte Daten.
Konvertiere relative Datumsangaben ("nächsten Dienstag 14 Uhr", "übermorgen Vormittag") in valide ISO-8601 Daten.
Antworte ausschließlich mit dem geforderten JSON-Schema. Kein Vorgeplänkel.`;

        const dynamicQuery = `Aktueller Zeitpunkt: ${nowFormatted} (${nowIso}).
Text der Anfrage:
"""
${trimmedText}
"""`;

        const { systemPart, userPart } = buildCacheOptimizedPrompt(staticSystem, dynamicQuery, { skipEnvelope: true });
        const candidateModels = getAvailableFrontendModels();
        let aiResult: any = null;

        for (const modelName of candidateModels) {
            try {
                recordFrontendModelRequest(modelName);
                const response = await ai.models.generateContent({
                    model: modelName,
                    contents: userPart,
                    config: {
                        systemInstruction: systemPart,
                        responseMimeType: 'application/json',
                        responseSchema: {
                            type: Type.OBJECT,
                            properties: {
                                clientName: { type: Type.STRING },
                                contactInfo: {
                                    type: Type.OBJECT,
                                    properties: {
                                        email: { type: Type.STRING },
                                        phone: { type: Type.STRING }
                                    },
                                    required: ['email', 'phone']
                                },
                                category: {
                                    type: Type.STRING,
                                    enum: ['Erstberatung', 'Begleitung', 'Alltagshilfe', 'Verhinderungspflege', 'Sonstiges']
                                },
                                urgency: {
                                    type: Type.STRING,
                                    enum: ['low', 'medium', 'high']
                                },
                                appointmentRequested: { type: Type.BOOLEAN },
                                preferredDate: { type: Type.STRING },
                                summary: { type: Type.STRING },
                                suggestedResponse: { type: Type.STRING }
                            },
                            required: [
                                'clientName', 'contactInfo', 'category', 'urgency',
                                'appointmentRequested', 'summary', 'suggestedResponse'
                            ]
                        }
                    }
                });

                const rawJsonText = response.text?.trim() || '{}';
                aiResult = JSON.parse(rawJsonText);
                break;
            } catch (err: any) {
                markFrontendModelFailure(modelName, err);
                console.warn(`[API Process Inquiry] Modell ${modelName} fehlgeschlagen (${err.status || err.message}). Versuche nächstes...`);
            }
        }

        if (!aiResult) {
            return json({ error: 'Anfrage konnte momentan nicht automatisch analysiert werden.' }, { status: 500 });
        }

        // 3. Automatischer Terminentwurf bei Terminwunsch
        let appointmentId: string | null = null;
        if (aiResult.appointmentRequested && aiResult.preferredDate) {
            try {
                const appDate = new Date(aiResult.preferredDate);
                if (!isNaN(appDate.getTime())) {
                    const newApp = await pbAdmin.collection('appointments').create({
                        appointment: appDate.toISOString(),
                        description: `[ANFRAGE: ${aiResult.category}] ${aiResult.summary} (Klient: ${aiResult.clientName})`,
                        is_private: false,
                        status: 'pending',
                        notes: `Terminentwurf aus Kundenanfrage.\n\nKategorie: ${aiResult.category}\nDringlichkeit: ${aiResult.urgency}\nKontakt: ${aiResult.contactInfo?.phone || '-'} / ${aiResult.contactInfo?.email || '-'}\n\nAntwortentwurf:\n${aiResult.suggestedResponse}`
                    });
                    appointmentId = newApp.id;
                }
            } catch (appErr: any) {
                console.warn('[AI Inquiry] Konnte Terminentwurf nicht automatisch in PB anlegen:', appErr.message);
            }
        }

        // 4. Persistentes Caching in PocketBase Collection 'inquiries'
        let savedInquiryId = inquiry_id;
        const inquiryData = {
            raw_text: trimmedText,
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

        if (inquiry_id) {
            try {
                await pbAdmin.collection('inquiries').update(inquiry_id, inquiryData);
            } catch {
                const created = await pbAdmin.collection('inquiries').create(inquiryData);
                savedInquiryId = created.id;
            }
        } else {
            const created = await pbAdmin.collection('inquiries').create(inquiryData);
            savedInquiryId = created.id;
        }

        return json({
            success: true,
            cached: false,
            inquiry_id: savedInquiryId,
            appointment_id: appointmentId,
            result: aiResult
        });
    } catch (err: any) {
        console.error('[AI Inquiry Error]', err);
        throw error(err.status || 500, err.message || 'Fehler bei der Anfragenverarbeitung.');
    }
};
