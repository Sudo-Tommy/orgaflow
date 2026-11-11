import { toastStore } from './toastService.svelte';
import { parseSseBlock } from './devAgentStreamParser';

export interface DevMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    statusText?: string;
    tools?: Array<{ name: string; args?: any; result?: any }>;
    filesChanged?: string[];
    checkpointId?: string;
    timestamp: string;
}

class DevAgentState {
    isOpen = $state(false);
    isLoading = $state(false);
    statusMessage = $state('');
    lastCheckpointId = $state<string | null>(null);
    lastFilesChanged = $state<string[]>([]);
    messages = $state<DevMessage[]>([]);
    recentError = $state<{ message: string; stack?: string; file?: string } | null>(null);
    includeVisualContext = $state(false);

    constructor() {
        if (typeof window !== 'undefined') {
            this.setupErrorCapture();
        }
    }

    private setupErrorCapture() {
        const origConsoleError = console.error;
        console.error = (...args: any[]) => {
            origConsoleError.apply(console, args);
            const str = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
            const expected = ['[Vite]', 'devAgent', 'PIN Auth Error', 'Ungültige E-Mail', '401', 'Unauthorized'];
            if (str && !expected.some(e => str.includes(e))) {
                this.recentError = { message: str.slice(0, 500) };
            }
        };

        window.addEventListener('error', (event) => {
            this.recentError = {
                message: event.message,
                file: event.filename ? `${event.filename}:${event.lineno}` : undefined,
                stack: event.error?.stack?.slice(0, 800)
            };
        });
    }

    dismissError() {
        this.recentError = null;
    }

    fixCurrentError() {
        if (!this.recentError) return;
        const errText = `${this.recentError.message} ${this.recentError.file ? 'in ' + this.recentError.file : ''}\n${this.recentError.stack || ''}`.trim();
        this.isOpen = true;
        this.sendPrompt(`Bitte analysiere und behebe diesen Fehler:\n${errText}`, window.location.pathname, 'Aktive Ansicht');
        this.recentError = null;
    }

    async sendPrompt(promptText: string, currentRoute = window.location.pathname, activeComponent = '') {
        if (!promptText.trim() || this.isLoading) return;

        const timeStr = new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
        this.messages.push({
            id: `msg_${Date.now()}`,
            role: 'user',
            content: promptText.trim(),
            timestamp: timeStr
        });

        this.messages.push({
            id: `msg_${Date.now() + 1}`,
            role: 'assistant',
            content: '',
            statusText: 'Antigravity wird vorbereitet...',
            tools: [],
            timestamp: timeStr
        });
        const assistantIndex = this.messages.length - 1;

        this.isLoading = true;
        this.statusMessage = 'Verbinde mit Antigravity...';

        let domSnippet = '';
        if (this.includeVisualContext && typeof document !== 'undefined') {
            const main = document.querySelector('main') || document.body;
            domSnippet = main.innerHTML.slice(0, 1500);
        }

        try {
            const res = await fetch('/api/dev/agent/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: promptText.trim(),
                    route: currentRoute,
                    activeComponent,
                    windowInfo: `${window.innerWidth}x${window.innerHeight}`,
                    domSnippet,
                    history: this.messages.slice(-8, -2).map(m => ({ role: m.role, content: m.content }))
                })
            });

            if (!res.ok || !res.body) {
                throw new Error(`Server antwortete mit Status ${res.status}`);
            }

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });

                const lines = buffer.split(/\r?\n\r?\n/);
                buffer = lines.pop() || '';

                for (const block of lines) {
                    const parsed = parseSseBlock(block);
                    if (!parsed) continue;
                    const { event, payload } = parsed;

                    const target = this.messages[assistantIndex];
                    if (!target) continue;

                    if (event === 'status') {
                        this.statusMessage = payload.message || '';
                        this.messages[assistantIndex] = { ...target, statusText: payload.message };
                    } else if (event === 'checkpoint') {
                        this.lastCheckpointId = payload.checkpointId;
                        this.messages[assistantIndex] = { ...target, checkpointId: payload.checkpointId };
                    } else if (event === 'chunk') {
                        const newContent = (target.content ? target.content + '\n' : '') + payload.text;
                        this.messages[assistantIndex] = { ...target, content: newContent };
                    } else if (event === 'tool') {
                        const newTools = [...(target.tools || []), { name: payload.name, args: payload.args }];
                        this.statusMessage = `Aktion: ${payload.name}...`;
                        this.messages[assistantIndex] = { ...target, tools: newTools };
                    } else if (event === 'tool_result') {
                        const newTools = [...(target.tools || [])];
                        if (newTools.length > 0) {
                            newTools[newTools.length - 1] = { ...newTools[newTools.length - 1], result: payload.result };
                        }
                        this.messages[assistantIndex] = { ...target, tools: newTools };
                    } else if (event === 'done') {
                        const finalContent = payload.response || target.content || 'Änderungen erfolgreich angewendet.';
                        this.lastFilesChanged = payload.filesChanged || [];
                        this.messages[assistantIndex] = {
                            ...target,
                            content: finalContent,
                            filesChanged: payload.filesChanged || [],
                            statusText: undefined
                        };
                        toastStore.success('Code erfolgreich geändert und per HMR aktualisiert!');
                    } else if (event === 'error') {
                        this.messages[assistantIndex] = {
                            ...target,
                            content: target.content + `\n❌ Fehler: ${payload.error}`,
                            statusText: 'Fehlgeschlagen'
                        };
                        toastStore.error(payload.error || 'Fehler beim Ausführen');
                    }
                }
            }
        } catch (err: any) {
            const target = this.messages[assistantIndex];
            if (target) {
                this.messages[assistantIndex] = {
                    ...target,
                    content: target.content + `\n❌ Verbindungsfehler: ${err.message}`,
                    statusText: 'Fehlgeschlagen'
                };
            }
            toastStore.error(err.message || 'Verbindungsabbruch');
        } finally {
            this.isLoading = false;
            this.statusMessage = '';
        }
    }

    async sendToIde(promptText: string, currentRoute = window.location.pathname, activeFile = '') {
        if (!promptText.trim()) return;
        this.isLoading = true;
        this.statusMessage = 'Öffne in Antigravity IDE...';
        try {
            const res = await fetch('/api/dev/agent/ide', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: promptText.trim(), route: currentRoute, file: activeFile })
            });
            const data = await res.json();
            if (data.success) {
                toastStore.success('Auftrag an Antigravity IDE übergeben!');
                const ts = new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
                this.messages.push({ id: `msg_${Date.now()}`, role: 'user', content: promptText.trim(), timestamp: ts });
                this.messages.push({
                    id: `msg_${Date.now() + 1}`,
                    role: 'assistant',
                    content: '🚀 Der Prompt wurde an das Chat-Fenster in Antigravity IDE übergeben.',
                    timestamp: ts
                });
            }
        } catch (err: any) {
            toastStore.error('Konnte nicht an Antigravity übergeben: ' + err.message);
        } finally {
            this.isLoading = false;
            this.statusMessage = '';
        }
    }

    async rollback() {
        if (!this.lastCheckpointId || this.isLoading) return;
        this.isLoading = true;
        this.statusMessage = 'Setze Änderungen zurück...';
        try {
            const res = await fetch('/api/dev/agent/rollback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ checkpointId: this.lastCheckpointId })
            });
            const data = await res.json();
            if (data.success) {
                toastStore.success('Änderungen erfolgreich rückgängig gemacht!');
                this.lastCheckpointId = null;
                this.lastFilesChanged = [];
            } else {
                toastStore.error(data.error || 'Rollback fehlgeschlagen');
            }
        } catch (e: any) {
            toastStore.error(e.message || 'Netzwerkfehler beim Rollback');
        } finally {
            this.isLoading = false;
            this.statusMessage = '';
        }
    }
}

export const devAgentState = new DevAgentState();
