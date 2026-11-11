// src/lib/services/omniChatStorageService.ts
import { pb } from '$lib/services/pocketbase';

export interface StoredOmniAttachment {
    id: string;
    name: string;
    url: string;
    type?: string;
    size?: number;
}

export interface StoredOmniMessage {
    id: string;
    user: string;
    role: 'user' | 'assistant';
    text: string;
    actionLink?: { label: string; href: string } | null;
    attachments?: StoredOmniAttachment[];
    rating?: 'up' | 'down' | null;
    created: string;
    isTicketGenerated?: boolean;
    ticketId?: string;
    isStreaming?: boolean;
    isLiveError?: boolean;
}

export function dedupeOmniMessages(list: StoredOmniMessage[]): StoredOmniMessage[] {
    const seen = new Set<string>();
    const result: StoredOmniMessage[] = [];
    for (const item of list) {
        const key = item?.id || `fallback-${result.length}`;
        if (!seen.has(key)) {
            seen.add(key);
            result.push(item.id ? item : { ...item, id: key });
        }
    }
    return result;
}

export function formatChatMessageDate(dateStr: string): string {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Heute';
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();

    if (isToday) return 'Heute';
    if (isYesterday) return 'Gestern';
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatChatMessageTime(dateStr: string): string {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

export function shouldShowDailyGreeting(messages: StoredOmniMessage[]): boolean {
    if (!messages || messages.length === 0) return true;
    const now = new Date().toDateString();
    const hasTodayMessage = messages.some(m => new Date(m.created).toDateString() === now);
    return !hasTodayMessage;
}

function mapRecordToMessage(rec: any): StoredOmniMessage {
    const attachments: StoredOmniAttachment[] = [];
    if (Array.isArray(rec.attachments) && rec.attachments.length > 0) {
        for (const filename of rec.attachments) {
            attachments.push({
                id: `${rec.id}-${filename}`,
                name: filename,
                url: pb.files.getURL(rec, filename)
            });
        }
    }
    return {
        id: rec.id || `msg-${crypto.randomUUID()}`,
        user: rec.user,
        role: rec.role,
        text: rec.text || '',
        actionLink: rec.action_link || null,
        attachments,
        rating: rec.rating || null,
        created: rec.created || new Date().toISOString(),
        isTicketGenerated: rec.is_ticket_generated || false,
        ticketId: rec.ticket_id || undefined
    };
}

export async function loadUserChatHistory(userId: string, page = 1, perPage = 50): Promise<{
    items: StoredOmniMessage[];
    totalPages: number;
    totalItems: number;
}> {
    if (!userId) return { items: [], totalPages: 0, totalItems: 0 };
    try {
        const result = await pb.collection('omni_chat_messages').getList(page, perPage, {
            filter: `user = "${userId}"`,
            sort: '-created',
            requestKey: null
        });

        const items = dedupeOmniMessages(result.items.map(mapRecordToMessage).reverse());
        return {
            items,
            totalPages: result.totalPages,
            totalItems: result.totalItems
        };
    } catch (err: any) {
        console.warn('[OmniChatStorage] Laden fehlgeschlagen:', err?.message);
        return { items: [], totalPages: 0, totalItems: 0 };
    }
}

export async function saveOmniMessage(
    userId: string,
    role: 'user' | 'assistant',
    text: string,
    opts: {
        actionLink?: { label: string; href: string } | null;
        rawFiles?: File[];
        rating?: 'up' | 'down' | null;
        ticketId?: string;
    } = {}
): Promise<StoredOmniMessage> {
    try {
        const formData = new FormData();
        formData.append('user', userId);
        formData.append('role', role);
        formData.append('text', text || '');
        if (opts.actionLink) formData.append('action_link', JSON.stringify(opts.actionLink));
        if (opts.rating) formData.append('rating', opts.rating);
        if (opts.ticketId) {
            formData.append('ticket_id', opts.ticketId);
            formData.append('is_ticket_generated', 'true');
        }

        if (opts.rawFiles && opts.rawFiles.length > 0) {
            for (const file of opts.rawFiles) {
                formData.append('attachments', file);
            }
        }

        const rec = await pb.collection('omni_chat_messages').create(formData, { requestKey: null });
        return mapRecordToMessage(rec);
    } catch {
        return {
            id: `local-${crypto.randomUUID()}`,
            user: userId,
            role,
            text: text || '',
            actionLink: opts.actionLink || null,
            rating: opts.rating || null,
            created: new Date().toISOString()
        };
    }
}

export async function updateOmniMessageRating(id: string, rating: 'up' | 'down' | null): Promise<void> {
    if (!id || id.startsWith('welcome-') || id.startsWith('local-')) return;
    try {
        await pb.collection('omni_chat_messages').update(id, { rating: rating || null }, { requestKey: null });
    } catch (err: any) {
        console.warn('[OmniChatStorage] Rating-Update fehlgeschlagen:', err?.message);
    }
}

export async function clearUserOmniChat(userId: string): Promise<boolean> {
    if (!userId) return false;
    try {
        const records = await pb.collection('omni_chat_messages').getFullList({
            filter: `user = "${userId}"`,
            fields: 'id',
            requestKey: null
        });
        if (records.length === 0) return true;
        await Promise.all(records.map(r => pb.collection('omni_chat_messages').delete(r.id).catch(() => {})));
        return true;
    } catch (err: any) {
        console.warn('[OmniChatStorage] Leeren fehlgeschlagen:', err?.message);
        return false;
    }
}

export function subscribeUserOmniChat(userId: string, onUpdate: (e: any) => void): () => void {
    if (!userId) return () => {};
    let isUnsubscribed = false;

    pb.collection('omni_chat_messages').subscribe('*', (e) => {
        if (isUnsubscribed) return;
        if (e.record && e.record.user === userId) {
            onUpdate(e);
        }
    }, { requestKey: null }).catch(() => {});

    return () => {
        isUnsubscribed = true;
        pb.collection('omni_chat_messages').unsubscribe('*').catch(() => {});
    };
}
