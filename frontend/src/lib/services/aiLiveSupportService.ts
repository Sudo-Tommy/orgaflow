// src/lib/services/aiLiveSupportService.ts
import { writable } from 'svelte/store';

export interface ChatAttachment {
    id: string;
    name: string;
    type: string;
    size: number;
    base64: string;
    previewUrl?: string;
    textContent?: string;
}

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    text: string;
    timestamp: Date;
    audioData?: string;
    attachments?: ChatAttachment[];
    actionLink?: { label: string; href: string } | null;
    rating?: 'up' | 'down' | null;
}

export interface LiveSupportResponse {
    reply: string;
    model?: string;
    modelLabel?: string;
    isLive?: boolean;
    liveError?: boolean;
    isClarified: boolean;
    problemSummary: string;
    suggestedCategory: string;
    suggestedPriority: 'low' | 'normal' | 'urgent';
    actionLink?: { label: string; href: string } | null;
}

export interface LiveSessionStatus {
    connected: boolean;
    connecting: boolean;
    model: string;
    modelLabel: string;
    statusText?: string;
}

export const liveSessionStore = writable<LiveSessionStatus>({
    connected: false,
    connecting: false,
    model: 'gemini-3.8-live-extended-thinking',
    modelLabel: 'Gemini 3.8 Live Extended Thinking',
    statusText: ''
});

export interface FinalizePayload {
    chatTranscript: Array<{ role: string; text: string }>;
    problemSummary: string;
    category: string;
    priority: string;
    context: Record<string, any>;
    screenshotBase64?: string | null;
    attachments?: ChatAttachment[];
    user?: { id: string; email: string; role: string; name_first?: string; name_last?: string };
}

export interface FinalizeResult {
    success: boolean;
    ticketId: string;
    systemPromptId?: string | null;
    antigravityPrompt: string;
    summary: string;
}

const API_BASE = '/api/emails/ai/live-support';

// A12: Sammelt automatisch aktuelle Seite, geöffnete Modale/Dialoge und sichtbare Fehlermeldungen
export function collectLiveDomContext(baseContext: Record<string, any> = {}): Record<string, any> {
    if (typeof document === 'undefined') return baseContext;
    const openDialogs: string[] = [];
    document.querySelectorAll('dialog[open]').forEach((dlg) => {
        if (dlg.id === 'feedback-dialog' || dlg.id === 'omni-dialog') return;
        const heading = dlg.querySelector('h1, h2, h3, .orga-modal-title')?.textContent?.trim();
        if (heading) openDialogs.push(heading.slice(0, 80));
    });

    const visibleErrors: string[] = [];
    document.querySelectorAll('#global-toast-container [role="status"], [role="alert"], .orga-error-banner').forEach((el) => {
        const txt = el.textContent?.trim();
        if (txt && txt.length > 2) visibleErrors.push(txt.slice(0, 120));
    });

    return {
        ...baseContext,
        openDialogs: openDialogs.slice(0, 5),
        visibleErrors: visibleErrors.slice(0, 5),
        viewportWidth: typeof window !== 'undefined' ? window.innerWidth : 1280,
        viewportHeight: typeof window !== 'undefined' ? window.innerHeight : 800
    };
}

// A5 & A14: Persistente Live-API Session im Backend verwalten (connect / reset / close)
export async function manageLiveSupportSession(
    sessionId: string,
    action: 'connect' | 'reset' | 'close' = 'connect',
    context: Record<string, any> = {}
): Promise<void> {
    if (!sessionId) return;
    if (action === 'connect' || action === 'reset') {
        liveSessionStore.update(s => ({ ...s, connecting: true }));
    }
    try {
        const res = await fetch(`${API_BASE}/session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, action, context: collectLiveDomContext(context) })
        });
        const data = await res.json().catch(() => ({}));
        liveSessionStore.set({
            connected: Boolean(res.ok && data.connected),
            connecting: false,
            model: data.model || 'gemini-3.8-live-extended-thinking',
            modelLabel: data.modelLabel || 'Gemini 3.8 Live Extended Thinking'
        });
    } catch {
        liveSessionStore.update(s => ({ ...s, connected: false, connecting: false }));
    }
}

// A3, A4, A16: Echtzeit Wort-für-Wort Streaming über die Gemini Live-API
export async function streamLiveSupportChat({
    sessionId,
    messages,
    context = {},
    attachments = [],
    audioBase64 = null,
    mimeType = null,
    onChunk
}: {
    sessionId: string;
    messages: Array<{ role: string; text: string }>;
    context?: Record<string, any>;
    attachments?: ChatAttachment[];
    audioBase64?: string | null;
    mimeType?: string | null;
    onChunk?: (textSoFar: string, modelLabel?: string) => void;
}): Promise<LiveSupportResponse> {
    const enrichedContext = collectLiveDomContext(context);
    const res = await fetch(`${API_BASE}/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, messages, context: enrichedContext, attachments, audioBase64, mimeType })
    });

    if (!res.ok || !res.body) {
        throw new Error(`Live-API Verbindung fehlgeschlagen (Status ${res.status})`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let finalResponse: LiveSupportResponse | null = null;

    while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() || '';

        for (const rawEvent of events) {
            const line = rawEvent.trim();
            if (!line.startsWith('data:')) continue;
            const jsonStr = line.replace(/^data:\s*/, '');
            if (!jsonStr) continue;

            try {
                const evt = JSON.parse(jsonStr);
                if (evt.type === 'status' && evt.statusText) {
                    liveSessionStore.update(s => ({ ...s, statusText: evt.statusText }));
                } else if (evt.type === 'meta') {
                    liveSessionStore.update(s => ({
                        ...s,
                        connected: true,
                        connecting: false,
                        model: evt.model || 'gemini-3.8-live-extended-thinking',
                        modelLabel: evt.modelLabel || 'Gemini 3.8 Live Extended Thinking'
                    }));
                } else if (evt.type === 'chunk') {
                    liveSessionStore.update(s => ({
                        ...s,
                        connected: true,
                        connecting: false,
                        statusText: '',
                        model: evt.model || s.model,
                        modelLabel: evt.modelLabel || s.modelLabel
                    }));
                    onChunk?.(evt.text || '', evt.modelLabel);
                } else if (evt.type === 'done') {
                    liveSessionStore.update(s => ({ ...s, statusText: '' }));
                    finalResponse = evt;
                } else if (evt.type === 'error') {
                    liveSessionStore.update(s => ({ ...s, connected: false, connecting: false, statusText: '' }));
                    throw new Error(evt.error || 'Gemini Live-API momentan nicht erreichbar.');
                }
            } catch (parseErr: any) {
                if (parseErr?.message?.includes('Live-API') || parseErr?.message?.includes('erreichbar')) {
                    throw parseErr;
                }
            }
        }
    }

    if (!finalResponse) {
        throw new Error('Keine vollständige Antwort von der Gemini Live-API erhalten.');
    }
    return finalResponse;
}

export async function sendLiveSupportChat(
    messages: Array<{ role: string; text: string }>,
    context: Record<string, any> = {},
    attachments: ChatAttachment[] = [],
    audioBase64: string | null = null,
    mimeType: string | null = null
): Promise<LiveSupportResponse> {
    return streamLiveSupportChat({
        sessionId: context?.userId || 'default',
        messages,
        context,
        attachments,
        audioBase64,
        mimeType
    });
}

export async function submitLiveSupportFinalize(payload: FinalizePayload): Promise<FinalizeResult> {
    const res = await fetch(`${API_BASE}/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    if (res.ok) {
        return await res.json();
    }
    throw new Error('Ticket konnte serverseitig nicht gespeichert werden.');
}
