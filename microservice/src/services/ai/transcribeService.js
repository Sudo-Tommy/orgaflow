/**
 * transcribeService.js
 * Transkribiert Sprachnotizen & erstellt Besuchsberichte.
 * Nutzt für Audio primär die Live-API (gemini-2.5-flash-native-audio-latest / gemini-3.8-live, unbegrenztes Kontingent)
 * und als Fallback AUDIO_TRANSCRIBE_MODELS (gemini-3.5-flash-lite, gemini-3.1-flash-lite, gemini-3.5-transcribe).
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import {
    AUDIO_TRANSCRIBE_MODELS,
    HIGH_QUOTA_FAST_MODELS,
    callGeminiLiveSession,
    getAvailableModels,
    recordModelRequest,
    markModelFailure
} from './aiModelRouter.js';

export async function transcribeAudioOrText({ audioBase64, mimeType, prompt: customPrompt, inputText }) {
    if (!audioBase64 && !inputText) throw new Error('Kein Audio oder Text gesendet.');
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('Gemini API Key fehlt im Server.');

    const defaultPrompt = "Du bist ein professioneller Assistent in der Seniorenbetreuung. Erstelle aus den folgenden Notizen/dem Diktat einen sachlichen, gut lesbaren Pflege- bzw. Besuchsbericht. Entferne Füllwörter, korrigiere Grammatikfehler und strukturiere den Text sinnvoll. Bleibe beim 'Sie', wenn über den Klienten gesprochen wird. Schreibe KEINE Einleitung, sondern gib direkt nur den fertigen Text aus.";
    const promptToUse = customPrompt || defaultPrompt;

    // 1. Bei Audio-Diktaten zuerst Live-API mit Native Audio (Unbegrenztes Kontingent!) versuchen
    if (audioBase64) {
        try {
            const liveRes = await callGeminiLiveSession({
                apiKey,
                systemInstruction: promptToUse,
                turns: [{ role: 'user', parts: [{ text: promptToUse }] }],
                audioBase64,
                mimeType: mimeType || 'audio/webm',
                models: ['gemini-2.5-flash-native-audio-latest', 'gemini-3.8-live', 'gemini-3.1-flash-live-preview'],
                timeoutMs: 15000
            });
            if (liveRes?.text && liveRes.text.length > 5) {
                return liveRes.text;
            }
        } catch (liveErr) {
            console.warn('[KI Diktat Live] Fallback auf REST-Kaskade:', liveErr.message);
        }
    }

    // 2. REST-Kaskade mit Rate-Limit-Guard
    const genAI = new GoogleGenerativeAI(apiKey);
    const candidateModels = getAvailableModels(audioBase64 ? AUDIO_TRANSCRIBE_MODELS : HIGH_QUOTA_FAST_MODELS);
    const contentParts = [promptToUse];

    if (inputText) {
        contentParts.push(inputText);
    } else if (audioBase64) {
        contentParts.push({
            inlineData: { mimeType: mimeType || 'audio/webm', data: audioBase64 }
        });
    }

    let lastErr = null;
    for (const mName of candidateModels) {
        try {
            recordModelRequest(mName);
            const model = genAI.getGenerativeModel({ model: mName });
            const resGen = await model.generateContent(contentParts);
            const resultText = resGen.response.text();
            if (resultText && resultText.trim().length > 0) return resultText.trim();
        } catch (aErr) {
            markModelFailure(mName, aErr);
            console.warn(`[KI Diktat] Fehler bei Modell ${mName}:`, aErr.message);
            lastAudioErr(aErr);
            lastErr = aErr;
        }
    }

    throw new Error(lastErr?.message || 'Kein Text generiert.');
}

function lastAudioErr() {}
