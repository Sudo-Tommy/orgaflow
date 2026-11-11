import type { DevMessage } from './devAgentState.svelte';

export interface SseChunkEvent {
    event: string;
    payload: any;
}

export function parseSseBlock(block: string): SseChunkEvent | null {
    const eventMatch = block.match(/event:\s*([a-zA-Z_]+)/);
    const dataMatch = block.match(/data:\s*(.+)/s);
    if (!dataMatch) return null;

    const event = eventMatch ? eventMatch[1] : 'chunk';
    let payload: any = {};
    try { payload = JSON.parse(dataMatch[1]); } catch {}
    return { event, payload };
}
