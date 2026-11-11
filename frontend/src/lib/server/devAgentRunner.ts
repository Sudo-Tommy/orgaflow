import { GoogleGenAI } from '@google/genai';
import PocketBase from 'pocketbase';
import dotenv from 'dotenv';
import {
    startCheckpoint,
    toolReadFile,
    toolWriteFile,
    toolReplaceInFile,
    toolListDir,
    toolSearchCode,
    toolRunCommand
} from './devAgentTools.js';
import { toolsDefinition, SYSTEM_INSTRUCTION } from './devAgentSpec.js';

try {
    if (typeof process.loadEnvFile === 'function') {
        process.loadEnvFile();
    }
} catch {}
try {
    dotenv?.config?.();
} catch {}

const pb = new PocketBase(process.env.POCKETBASE_URL || 'http://127.0.0.1:8090');
const ACTIVE_MODEL = process.env.GEMINI_DEV_MODEL || 'gemini-3-flash-preview';

async function getAuthenticatedPb() {
    try {
        if (!pb.authStore.isValid && process.env.PB_ADMIN_EMAIL && process.env.PB_ADMIN_PASSWORD) {
            await pb.collection('_superusers').authWithPassword(
                process.env.PB_ADMIN_EMAIL,
                process.env.PB_ADMIN_PASSWORD
            );
        }
    } catch (e: any) {
        console.warn('PocketBase auth in dev runner failed:', e.message);
    }
    return pb;
}


export interface DevAgentChatOptions {
    prompt: string;
    route?: string;
    activeComponent?: string;
    windowInfo?: string;
    domSnippet?: string;
    errorContext?: string;
    history?: Array<{ role: string; content: string }>;
    onEvent: (event: string, data: any) => void;
}

const FALLBACK_MODEL = 'gemini-flash-latest';

async function generateWithRetry(ai: GoogleGenAI, contents: any[], onEvent: any) {
    let model = ACTIVE_MODEL;
    for (let attempt = 1; attempt <= 5; attempt++) {
        try {
            return await ai.models.generateContent({
                model,
                contents,
                config: { tools: toolsDefinition, systemInstruction: SYSTEM_INSTRUCTION }
            });
        } catch (err: any) {
            const msg = String(err?.message || '');
            const isQuota = err?.status === 429 || msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED');
            const isBusy = err?.status === 503 || msg.includes('503') || msg.includes('UNAVAILABLE');
            if (!(isQuota || isBusy) || attempt === 5) throw err;
            if (isBusy && model !== FALLBACK_MODEL && attempt >= 2) {
                model = FALLBACK_MODEL;
                onEvent('status', { message: 'Modell überlastet, wechsle auf Ausweichmodell...' });
                continue;
            }
            let waitSec = isBusy ? 4 : 12;
            const match = msg.match(/retry in ([0-9.]+)s/i) || msg.match(/retryDelay":"([0-9]+)s/i);
            if (match && match[1]) waitSec = Math.min(Math.ceil(parseFloat(match[1])), 20);
            for (let w = waitSec; w > 0; w--) {
                onEvent('status', { message: `${isBusy ? 'KI ausgelastet' : 'API-Ratenlimit erreicht'}. Neuer Versuch in ${w}s...` });
                await new Promise(r => setTimeout(r, 1000));
            }
        }
    }
}

export async function runDevAgentChat({ prompt, route, activeComponent, windowInfo, domSnippet, errorContext, history = [], onEvent }: DevAgentChatOptions) {
    const checkpointId = startCheckpoint();
    onEvent('checkpoint', { checkpointId });
    onEvent('status', { message: 'Git-Checkpoint gesichert. Antigravity analysiert...' });

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const modifiedFiles = new Set<string>();

    let contextPrefix = `[KONTEXT]\nRoute: ${route || '/'}\nKomponente: ${activeComponent || 'Unbekannt'}\n`;
    if (domSnippet) contextPrefix += `DOM:\n${domSnippet}\n`;
    if (errorContext) contextPrefix += `FEHLER:\n${errorContext}\n`;

    const contents: any[] = [];
    for (const h of history) {
        contents.push({ role: h.role === 'user' ? 'user' : 'model', parts: [{ text: h.content }] });
    }
    contents.push({ role: 'user', parts: [{ text: `${contextPrefix}\n[AUFTRAG]\n${prompt}` }] });

    let finalResponseText = '';
    let iterations = 0;
    const MAX_ITERATIONS = 25;

    try {
        while (iterations < MAX_ITERATIONS) {
            iterations++;
            const response = await generateWithRetry(ai, contents, onEvent);
            if (!response) break;

            const candidate = response.candidates?.[0];
            const parts = candidate?.content?.parts || [];
            const functionCalls = parts.filter((p: any) => p.functionCall);
            const textParts = parts.filter((p: any) => p.text).map((p: any) => p.text).join('\n');

            if (textParts) {
                finalResponseText += (finalResponseText ? '\n' : '') + textParts;
                onEvent('chunk', { text: textParts });
            }

            if (!functionCalls || functionCalls.length === 0) break;

            if (candidate?.content) contents.push(candidate.content);
            const responseParts: any[] = [];

            for (const call of functionCalls) {
                const { name, args } = (call as any).functionCall;
                onEvent('tool', { name, args });
                let result: any;
                try {
                    if (name === 'read_file') result = await toolReadFile(args);
                    else if (name === 'replace_in_file') {
                        result = await toolReplaceInFile(args, checkpointId);
                        modifiedFiles.add(result.path);
                    }
                    else if (name === 'write_file') {
                        result = await toolWriteFile(args, checkpointId);
                        modifiedFiles.add(result.path);
                    }
                    else if (name === 'list_dir') result = await toolListDir(args);
                    else if (name === 'search_code') result = await toolSearchCode(args);
                    else if (name === 'run_command') result = await toolRunCommand(args);
                    else result = { error: `Unbekanntes Tool: ${name}` };
                } catch (err: any) {
                    result = { error: err.message };
                }
                onEvent('tool_result', { name, result });
                responseParts.push({ functionResponse: { name, response: { result } } });
            }
            contents.push({ role: 'user', parts: responseParts });

            // Puffer zwischen Tool-Schritten
            await new Promise(r => setTimeout(r, 200));
        }

        const filesArray = Array.from(modifiedFiles);
        onEvent('done', { response: finalResponseText, filesChanged: filesArray, checkpointId });

        try {
            const pbClient = await getAuthenticatedPb();
            await pbClient.collection('dev_prompts').create({
                prompt,
                response: finalResponseText.slice(0, 5000),
                route: route || '/',
                active_component: activeComponent || '',
                status: 'success',
                files_changed: filesArray,
                error_context: errorContext || '',
                checkpoint_id: checkpointId
            });
        } catch {}

        return { response: finalResponseText, filesChanged: filesArray, checkpointId };
    } catch (err: any) {
        let msg = err.message;
        if (err?.status === 429 || String(msg).includes('429') || String(msg).includes('RESOURCE_EXHAUSTED')) {
            msg = 'Das API-Ratenlimit von Gemini (Free Tier: 5 Anfragen/Min.) wurde erreicht. Bitte warte ca. 45–60 Sekunden oder hinterlege einen API-Schlüssel mit Pay-as-you-go Kontingent in der .env.';
        }
        onEvent('error', { error: msg });
        try {
            const pbClient = await getAuthenticatedPb();
            await pbClient.collection('dev_prompts').create({
                prompt,
                response: msg,
                route: route || '/',
                active_component: activeComponent || '',
                status: 'error',
                files_changed: [],
                error_context: errorContext || '',
                checkpoint_id: checkpointId
            });
        } catch {}
        throw err;
    }
}
