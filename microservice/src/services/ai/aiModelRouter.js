/**
 * aiModelRouter.js
 * Zentraler Modell-Router, Live-API-Client & Rate-Limit-Guard für OrgaFlow.
 * Verteilt KI-Anfragen auf die jeweils stärksten Modelle unter strikter Beachtung
 * der RPM- (Requests Per Minute) und RPD-Kontingente (Requests Per Day).
 */

import { GoogleGenAI, Modality, ThinkingLevel } from '@google/genai/node';
import { GoogleGenerativeAI } from '@google/generative-ai';

// 1. Spezialisierte Modell-Kaskaden (A2: Gemini 3.8 Live Extended Thinking & Gemini 3.8 Live zuerst)
export const LIVE_CHAT_MODELS = [
    'gemini-3.8-live-extended-thinking',
    'gemini-3.8-live',
    'gemini-3.1-flash-live-preview',
    'gemini-2.5-flash-native-audio-latest'
];

export const LIVE_MODEL_LABELS = {
    'gemini-3.8-live-extended-thinking': 'Gemini 3.8 Live Extended Thinking',
    'gemini-3.8-live': 'Gemini 3.8 Live',
    'gemini-3.1-flash-live-preview': 'Gemini 3.1 Flash Live',
    'gemini-2.5-flash-native-audio-latest': 'Gemini 2.5 Flash Live Audio'
};

export const HIGH_QUOTA_FAST_MODELS = [
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite',
    'gemini-3.6-flash',
    'gemini-3.8-flash',
    'gemini-flash-lite-latest'
];

export const STRATEGIC_ANALYSIS_MODELS = [
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite',
    'gemini-3.6-flash',
    'gemini-3.8-flash'
];

export const VISION_DOCUMENT_MODELS = [
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite',
    'gemini-3.6-flash',
    'gemini-3.8-flash'
];

export const AUDIO_TRANSCRIBE_MODELS = [
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite',
    'gemini-3.5-transcribe',
    'gemini-3.6-flash'
];

export const EMBEDDING_MODELS = [
    'gemini-embedding-2',
    'gemini-embedding-001'
];

// 2. Rate-Limit-Guard (RPM Sliding Window & 429 Cooldown)
const MODEL_RPM_LIMITS = {
    'gemini-3.5-flash-lite': 14,
    'gemini-3.1-flash-lite': 14,
    'gemini-flash-lite-latest': 14,
    'gemini-3.6-flash': 4,
    'gemini-3.8-flash': 4,
    'gemini-3.5-transcribe': 3,
    'gemini-embedding-2': 95,
    'gemini-embedding-001': 95
};

const modelCooldownUntil = new Map();
const modelMinuteTimestamps = new Map();

export function isModelAvailable(modelName) {
    const now = Date.now();
    if (now < (modelCooldownUntil.get(modelName) || 0)) return false;
    const rpmLimit = MODEL_RPM_LIMITS[modelName];
    if (!rpmLimit) return true;
    const timestamps = (modelMinuteTimestamps.get(modelName) || []).filter(t => now - t < 60_000);
    modelMinuteTimestamps.set(modelName, timestamps);
    return timestamps.length < rpmLimit;
}

export function recordModelRequest(modelName) {
    const now = Date.now();
    const timestamps = (modelMinuteTimestamps.get(modelName) || []).filter(t => now - t < 60_000);
    timestamps.push(now);
    modelMinuteTimestamps.set(modelName, timestamps);
}

export function markModelFailure(modelName, error) {
    const msg = String(error?.message || error || '');
    if (msg.includes('404') || msg.includes('no longer available') || msg.includes('not found')) {
        modelCooldownUntil.set(modelName, Date.now() + 24 * 60 * 60_000);
        return;
    }
    if (msg.includes('429') || msg.toLowerCase().includes('quota') || msg.includes('RESOURCE_EXHAUSTED')) {
        const isDailyQuota = msg.includes('PerDay') || msg.includes('retryDelay');
        const cooldownMs = isDailyQuota ? 60 * 60_000 : 2 * 60_000;
        modelCooldownUntil.set(modelName, Date.now() + cooldownMs);
        console.warn(`[AI RateLimit Guard] Modell '${modelName}' pausiert für ${Math.round(cooldownMs / 60000)} Min.`);
    }
}

export function getAvailableModels(cascade = HIGH_QUOTA_FAST_MODELS) {
    const available = cascade.filter(isModelAvailable);
    return available.length > 0 ? available : cascade.slice(0, 2);
}

// 3. One-Shot Live-API WebSocket Aufruf (für Audio-Transkription, Checklisten & Direkt-Aufrufe)
export async function callGeminiLiveSession({
    apiKey = process.env.GEMINI_API_KEY,
    systemInstruction = '',
    turns = [],
    audioBase64 = null,
    mimeType = 'audio/webm',
    models = LIVE_CHAT_MODELS,
    timeoutMs = 12000
}) {
    if (!apiKey) throw new Error('GEMINI_API_KEY fehlt.');
    const ai = new GoogleGenAI({ apiKey });
    const candidates = getAvailableModels(models);
    const clean = turns
        .map(t => ({
            role: t.role === 'model' || t.role === 'assistant' ? 'Omni' : 'Nutzer',
            text: (t.parts || []).map(p => p.text || '').join(' ').trim()
        }))
        .filter(t => t.text.length > 0);

    const promptText = clean.length <= 1
        ? (clean[0]?.text || 'Hilfe zur aktuellen Ansicht')
        : ['Bisheriger Gesprächsverlauf:', ...clean.slice(0, -1).map(c => `${c.role}: ${c.text}`), '', `Aktuelle Nachricht: ${clean[clean.length - 1].text}`].join('\n');

    const parts = [{ text: promptText }];
    if (audioBase64) parts.push({ inlineData: { mimeType: mimeType || 'audio/webm', data: audioBase64 } });
    let lastError = null;

    for (const modelName of candidates) {
        try {
            recordModelRequest(modelName);
            const isThinking = modelName.includes('thinking');
            const transcript = await new Promise(async (resolve, reject) => {
                let textOut = '';
                let settled = false;
                let session = null;
                const finish = (err, val) => {
                    if (settled) return;
                    settled = true;
                    clearTimeout(timer);
                    try { session?.close(); } catch {}
                    err ? reject(err) : resolve(val);
                };
                const timer = setTimeout(() => {
                    if (textOut.trim().length > 3) finish(null, textOut.trim());
                    else finish(new Error(`Live-Timeout (${modelName})`));
                }, timeoutMs);

                try {
                    session = await ai.live.connect({
                        model: modelName,
                        config: {
                            responseModalities: [Modality.AUDIO],
                            outputAudioTranscription: {},
                            ...(isThinking ? { thinkingConfig: { thinkingLevel: ThinkingLevel?.LOW || 'LOW' } } : {}),
                            ...(systemInstruction ? { systemInstruction } : {})
                        },
                        callbacks: {
                            onopen: () => {},
                            onmessage: (msg) => {
                                if (msg?.serverContent?.outputTranscription?.text) textOut += msg.serverContent.outputTranscription.text;
                                for (const p of (msg?.serverContent?.modelTurn?.parts || [])) {
                                    if (p.text && !p.thought) textOut += p.text;
                                }
                                if ((msg?.serverContent?.generationComplete || msg?.serverContent?.turnComplete) && textOut.trim().length > 0) {
                                    finish(null, textOut.trim());
                                }
                            },
                            onerror: (err) => finish(textOut.trim().length > 3 ? null : (err || new Error('Live Error')), textOut.trim()),
                            onclose: (ev) => finish(textOut.trim().length > 0 ? null : new Error(`Live geschlossen (${ev?.code || ''})`), textOut.trim())
                        }
                    });
                    session.sendClientContent({ turns: [{ role: 'user', parts }], turnComplete: true });
                } catch (connErr) { finish(connErr); }
            });
            if (transcript && transcript.length > 1) return { text: transcript, model: modelName, isLive: true };
        } catch (err) {
            markModelFailure(modelName, err);
            lastError = err;
            console.warn(`[AI Live Router] '${modelName}' fehlgeschlagen:`, err.message);
        }
    }
    throw lastError || new Error('Live-API nicht erreichbar.');
}

// 4. REST-API Aufruf mit Rate-Limit-Guard & JSON-Support
export async function callGeminiRestWithGuard({
    apiKey = process.env.GEMINI_API_KEY,
    prompt,
    systemInstruction = '',
    models = HIGH_QUOTA_FAST_MODELS,
    jsonMode = false,
    temperature = 0.2,
    maxOutputTokens = 2048,
    timeoutMs = 15000,
    label = 'AI'
}) {
    if (!apiKey) throw new Error(`[${label}] GEMINI_API_KEY fehlt.`);
    const genAI = new GoogleGenerativeAI(apiKey);
    const candidates = getAvailableModels(models);
    let lastError = null;

    for (const modelName of candidates) {
        try {
            recordModelRequest(modelName);
            const modelConfig = {
                model: modelName,
                generationConfig: { temperature, maxOutputTokens, ...(jsonMode ? { responseMimeType: 'application/json' } : {}) }
            };
            if (systemInstruction) modelConfig.systemInstruction = { parts: [{ text: systemInstruction }] };
            const model = genAI.getGenerativeModel(modelConfig);
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error(`Timeout nach ${timeoutMs}ms`)), timeoutMs));
            const res = await Promise.race([model.generateContent(prompt), timeoutPromise]);
            const text = res.response.text();
            if (text && text.trim().length > 0) return { text: text.trim(), model: modelName };
        } catch (err) {
            markModelFailure(modelName, err);
            lastError = err;
            console.warn(`[${label}] Modell '${modelName}' fehlgeschlagen:`, err.message);
        }
    }
    throw lastError || new Error(`[${label}] Alle KI-Modelle ausgelastet.`);
}
