/**
 * omniLiveSessionManager.js
 * Verwaltet persistente Gemini Live-API WebSocket-Sessions (BidiGenerateContent) für Omni
 * mit Echtzeit-Streaming, multimodaler Bild-/Audio-Eingabe und Modell-Kaskadierung.
 */

import { GoogleGenAI, Modality, ThinkingLevel } from '@google/genai/node';
import {
    LIVE_CHAT_MODELS, LIVE_MODEL_LABELS, getAvailableModels, recordModelRequest, markModelFailure
} from './aiModelRouter.js';

const IDLE_TIMEOUT_MS = 10 * 60 * 1000;
const activeSessions = new Map();

export function buildLiveSessionConfig(modelName, systemInstruction = '') {
    const isThinking = String(modelName || '').includes('thinking');
    return {
        responseModalities: [Modality.AUDIO],
        outputAudioTranscription: {},
        ...(isThinking ? { thinkingConfig: { thinkingLevel: ThinkingLevel?.LOW || 'LOW' } } : {}),
        ...(systemInstruction ? { systemInstruction } : {})
    };
}

export function buildMultimodalLiveParts({ text = '', attachments = [], audioBase64 = null, mimeType = 'audio/webm' }) {
    const parts = [];
    if (text && text.trim()) parts.push({ text: text.trim() });

    if (Array.isArray(attachments)) {
        for (const att of attachments) {
            const rawMime = att.type || att.mimeType || '';
            if (att.base64 && rawMime.startsWith('image/')) {
                const cleanBase64 = String(att.base64).replace(/^data:[^;]+;base64,/, '');
                parts.push({ inlineData: { mimeType: rawMime, data: cleanBase64 } });
            } else if (att.textContent) {
                parts.push({ text: `\n[Angehängte Datei: ${att.name}]\n${String(att.textContent).slice(0, 8000)}` });
            }
        }
    }
    if (audioBase64) {
        const cleanAudio = String(audioBase64).replace(/^data:[^;]+;base64,/, '');
        parts.push({ inlineData: { mimeType: mimeType || 'audio/webm', data: cleanAudio } });
    }
    if (parts.length === 0) {
        parts.push({ text: 'Bitte analysiere das beigefügte Bild bzw. die aktuelle Ansicht.' });
    }
    return parts;
}

function touchSession(entry) {
    if (!entry) return;
    entry.lastUsedAt = Date.now();
    if (entry.idleTimer) clearTimeout(entry.idleTimer);
    entry.idleTimer = setTimeout(() => closeLiveSession(entry.sessionId), IDLE_TIMEOUT_MS);
}

export function closeLiveSession(sessionId) {
    if (!sessionId) return;
    const entry = activeSessions.get(sessionId);
    if (!entry) return;
    activeSessions.delete(sessionId);
    if (entry.idleTimer) clearTimeout(entry.idleTimer);
    try { entry.session?.close(); } catch {}
}

export function getLiveSessionStatus(sessionId) {
    const entry = activeSessions.get(sessionId);
    if (entry && entry.isConnected) {
        return { connected: true, model: entry.model, modelLabel: LIVE_MODEL_LABELS[entry.model] || entry.model };
    }
    const primary = getAvailableModels(LIVE_CHAT_MODELS)[0] || LIVE_CHAT_MODELS[0];
    return { connected: false, model: primary, modelLabel: LIVE_MODEL_LABELS[primary] || primary };
}

export async function connectOrGetLiveSession({
    sessionId = 'default',
    apiKey = process.env.GEMINI_API_KEY,
    systemInstruction = '',
    models = LIVE_CHAT_MODELS
}) {
    if (!apiKey) throw new Error('GEMINI_API_KEY fehlt.');
    const existing = activeSessions.get(sessionId);
    if (existing && existing.isConnected && existing.session) {
        touchSession(existing);
        return existing;
    }
    closeLiveSession(sessionId);

    const ai = new GoogleGenAI({ apiKey });
    const candidates = getAvailableModels(models);
    let lastErr = null;

    for (const modelName of candidates) {
        try {
            recordModelRequest(modelName);
            const entry = {
                sessionId,
                model: modelName,
                modelLabel: LIVE_MODEL_LABELS[modelName] || modelName,
                isConnected: false,
                seededHistory: false,
                currentHandler: null,
                session: null,
                idleTimer: null,
                lastUsedAt: Date.now()
            };

            const session = await ai.live.connect({
                model: modelName,
                config: buildLiveSessionConfig(modelName, systemInstruction),
                callbacks: {
                    onopen: () => { entry.isConnected = true; },
                    onmessage: (msg) => { entry.currentHandler?.onMessage?.(msg); },
                    onerror: (err) => { entry.isConnected = false; entry.currentHandler?.onError?.(err); },
                    onclose: (ev) => {
                        entry.isConnected = false;
                        activeSessions.delete(sessionId);
                        entry.currentHandler?.onClose?.(ev);
                    }
                }
            });

            entry.session = session;
            entry.isConnected = true;
            activeSessions.set(sessionId, entry);
            touchSession(entry);
            return entry;
        } catch (err) {
            markModelFailure(modelName, err);
            lastErr = err;
            console.warn(`[Omni Live Session] Verbindung zu '${modelName}' fehlgeschlagen:`, err.message);
        }
    }

    throw lastErr || new Error('Keine Live-API-Verbindung möglich.');
}

export async function streamLiveTurn({
    sessionId = 'default',
    apiKey = process.env.GEMINI_API_KEY,
    systemInstruction = '',
    historyTurns = [],
    userText = '',
    attachments = [],
    audioBase64 = null,
    mimeType = 'audio/webm',
    models = LIVE_CHAT_MODELS,
    timeoutMs = 18000,
    onChunk = null,
    onMeta = null
}) {
    const candidates = getAvailableModels(models);
    let lastError = null;

    for (const candidateModel of candidates) {
        try {
            const entry = await connectOrGetLiveSession({
                sessionId,
                apiKey,
                systemInstruction,
                models: [candidateModel, ...candidates.filter(m => m !== candidateModel)]
            });

            if (typeof onMeta === 'function') {
                onMeta({ model: entry.model, modelLabel: entry.modelLabel, connected: true });
            }

            let effectiveText = userText || '';
            if (!entry.seededHistory && Array.isArray(historyTurns) && historyTurns.length > 0) {
                const priorLines = historyTurns
                    .map(t => `${t.role === 'assistant' || t.role === 'model' ? 'Omni' : 'Nutzer'}: ${t.text}`)
                    .filter(Boolean);
                if (priorLines.length > 0) {
                    effectiveText = `Bisheriger Gesprächskontext:\n${priorLines.join('\n')}\n\nAktuelle Nachricht des Nutzers: ${effectiveText || '(Screenshot / Anhang gesendet)'}`;
                }
            }
            entry.seededHistory = true;

            const parts = buildMultimodalLiveParts({ text: effectiveText, attachments, audioBase64, mimeType });

            const replyText = await new Promise((resolve, reject) => {
                let textOut = '';
                let settled = false;
                let timer = null;
                const finish = (err, val) => {
                    if (settled) return;
                    settled = true;
                    if (timer) clearTimeout(timer);
                    entry.currentHandler = null;
                    err ? reject(err) : resolve(val);
                };

                const resetTimer = (ms = timeoutMs) => {
                    if (timer) clearTimeout(timer);
                    timer = setTimeout(() => {
                        if (textOut.trim().length > 2) finish(null, textOut.trim());
                        else { closeLiveSession(sessionId); finish(new Error(`Live-API Timeout (${entry.model})`)); }
                    }, ms);
                };
                resetTimer(timeoutMs);

                entry.currentHandler = {
                    onMessage: (msg) => {
                        let delta = msg?.serverContent?.outputTranscription?.text || '';
                        for (const p of (msg?.serverContent?.modelTurn?.parts || [])) {
                            if (p.text && !p.thought) delta += p.text;
                        }
                        if (delta) {
                            textOut += delta;
                            resetTimer(12000);
                            if (typeof onChunk === 'function') onChunk(delta, textOut, entry.model, entry.modelLabel);
                        }
                        const isThinkingInProgress = msg?.serverContent?.interactionStatus === 'IN_PROGRESS';
                        if ((msg?.serverContent?.turnComplete || msg?.serverContent?.generationComplete) && !isThinkingInProgress && textOut.trim().length > 0) {
                            finish(null, textOut.trim());
                        }
                    },
                    onError: (err) => {
                        if (textOut.trim().length > 2) finish(null, textOut.trim());
                        else { closeLiveSession(sessionId); finish(err || new Error('Live-WebSocket Fehler')); }
                    },
                    onClose: (ev) => {
                        if (textOut.trim().length > 0) finish(null, textOut.trim());
                        else finish(new Error(`Live-Session geschlossen (${ev?.code || ''})`));
                    }
                };

                try {
                    touchSession(entry);
                    entry.session.sendClientContent({ turns: [{ role: 'user', parts }], turnComplete: true });
                } catch (sendErr) { closeLiveSession(sessionId); finish(sendErr); }
            });

            if (replyText && replyText.trim().length > 0) {
                return { text: replyText.trim(), model: entry.model, modelLabel: entry.modelLabel, isLive: true };
            }
        } catch (err) {
            markModelFailure(candidateModel, err);
            closeLiveSession(sessionId);
            lastError = err;
            console.warn(`[Omni Live Turn] '${candidateModel}' fehlgeschlagen, wechsle Modell:`, err.message);
        }
    }

    throw lastError || new Error('Live-API vorübergehend nicht erreichbar.');
}
