import { pb } from '$lib/services/pocketbase';
import { toastStore } from '$lib/services/toastService.svelte';
import { confirmStore } from '$lib/services/confirmService.svelte';
import type { SystemPromptRecord, ImprovementProposalRecord } from '$lib/types/orgaTypes';
import type { UnifiedInboxItem } from './types';
import { formatKW } from './types';

export function mapRawItemsToUnified(
    rawFeedbacks: any[],
    rawInquiries: any[],
    rawChatMessages: any[]
): UnifiedInboxItem[] {
    const list: UnifiedInboxItem[] = [];

    for (const f of rawFeedbacks) {
        const nameFirst = f.name_first || f.expand?.client?.name_first || '';
        const nameLast = f.name_last || f.expand?.client?.name_last || '';
        const sender = [nameFirst, nameLast].filter(Boolean).join(' ') || 'Klient / Nutzer';
        const contextParts: string[] = [];
        if (f.expand?.client) contextParts.push(`Klient: ${f.expand.client.name_first} ${f.expand.client.name_last}`);
        if (f.expand?.appointment) contextParts.push(`Termin: ${new Date(f.expand.appointment.appointment).toLocaleDateString('de-DE')}`);

        list.push({
            id: f.id,
            source: 'feedback',
            title: f.message ? (f.message.length > 50 ? f.message.substring(0, 47) + '...' : f.message) : 'Feedback',
            sender,
            email: f.expand?.client?.email || '',
            message: f.message || '',
            rating: f.rating || null,
            status: f.status === 'Gelesen' ? 'In Bearbeitung' : (f.status === 'Archieviert' || f.status === 'Archiviert') ? 'Gelöst' : (f.status || 'Neu'),
            date: f.created,
            context: contextParts.join(' | '),
            rawRecord: f
        });
    }

    for (const i of rawInquiries) {
        list.push({
            id: i.id,
            source: 'inquiry',
            title: i.raw_text ? (i.raw_text.length > 50 ? i.raw_text.substring(0, 47) + '...' : i.raw_text) : 'Kundenanfrage',
            sender: i.sender_name || 'Interessent',
            email: i.sender_email || '',
            message: i.raw_text || '',
            rating: null,
            status: i.status === 'new' ? 'Neu' : i.status === 'in_progress' ? 'In Bearbeitung' : (i.status === 'converted' || i.status === 'rejected' ? 'Gelöst' : 'Neu'),
            date: i.created,
            context: `Dringlichkeit: ${i.urgency || 'normal'} • Tel: ${i.sender_phone || '-'}`,
            rawRecord: i
        });
    }

    for (const c of rawChatMessages) {
        const userName = c.expand?.user 
            ? `${c.expand.user.name_first || ''} ${c.expand.user.name_last || ''}`.trim() || c.expand.user.username || 'Mitarbeiter'
            : 'Mitarbeiter / Team';
        const isBug = c.text?.includes('🚨 [BUG REPORT]');
        const cleanText = isBug ? c.text.replace('🚨 [BUG REPORT]\n\n', '').trim() : (c.text || '');

        list.push({
            id: c.id,
            source: 'chat',
            title: isBug ? '🚨 Bug-Report im Team-Chat' : (cleanText.length > 50 ? cleanText.substring(0, 47) + '...' : (cleanText || 'Chat-Nachricht')),
            sender: userName,
            email: c.expand?.user?.email || '',
            message: cleanText,
            rating: isBug ? 3 : null,
            status: c.status || (isBug ? 'Neu' : 'Neu'),
            date: c.created,
            context: isBug ? '🚨 Bug Report aus ChatWidget' : (c.whispered ? '🤫 Geflüstert im Team-Chat' : '💬 Team-Chat Nachricht'),
            rawRecord: c
        });
    }

    list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return list;
}

export async function fetchPromptsList(): Promise<SystemPromptRecord[]> {
    if (!pb.authStore.isValid) return [];
    return await pb.collection('system_prompts').getFullList<SystemPromptRecord>({
        sort: '-created',
        requestKey: null
    });
}

export async function fetchInboxCollections(): Promise<{ feedbacks: any[]; inquiries: any[]; chat: any[] }> {
    const [fbRes, inqRes, chatRes] = await Promise.allSettled([
        pb.collection('feedbacks').getFullList({ sort: '-created', expand: 'client,appointment,submitted_by', requestKey: null }),
        pb.collection('inquiries').getFullList({ sort: '-created', requestKey: null }),
        pb.collection('live_chat').getFullList({ sort: '-created', expand: 'user,whispered_user', requestKey: null })
    ]);
    return {
        feedbacks: fbRes.status === 'fulfilled' ? fbRes.value : [],
        inquiries: inqRes.status === 'fulfilled' ? inqRes.value : [],
        chat: chatRes.status === 'fulfilled' ? chatRes.value : []
    };
}

export async function updateUnifiedItemStatus(item: UnifiedInboxItem, newStatus: string): Promise<void> {
    if (item.source === 'feedback') {
        try {
            await pb.collection('feedbacks').update(item.id, { status: newStatus }, { requestKey: null });
        } catch {
            const fallback = (newStatus === 'In Bearbeitung' || newStatus === 'In Arbeit') ? 'Gelesen' : (newStatus === 'Gelöst' ? 'Archieviert' : 'Neu');
            await pb.collection('feedbacks').update(item.id, { status: fallback }, { requestKey: null });
        }
    } else if (item.source === 'inquiry') {
        const map = newStatus === 'Neu' ? 'new' : (newStatus === 'In Bearbeitung' || newStatus === 'In Arbeit') ? 'in_progress' : 'converted';
        await pb.collection('inquiries').update(item.id, { status: map }, { requestKey: null });
    } else if (item.source === 'chat') {
        try {
            await pb.collection('live_chat').update(item.id, { status: newStatus }, { requestKey: null });
        } catch (chatErr: any) {
            const url = import.meta.env.DEV ? 'http://localhost:3000' : '';
            const res = await fetch(`${url}/api/emails/admin/feedback-react`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': pb.authStore.token ? `Bearer ${pb.authStore.token}` : '' },
                body: JSON.stringify({ id: item.id, source: 'chat', newStatus })
            });
            if (!res.ok) throw new Error(chatErr.message || 'Speichern fehlgeschlagen.');
        }
    }
}

export async function shareProposalInChat(p: ImprovementProposalRecord): Promise<void> {
    if (await confirmStore.ask(`Vorschlag "${p.title}" als Impuls im Team-Chat teilen?`, "Im Chat teilen?", "Ja, teilen", "Abbrechen")) {
        try {
            const emoji = p.priority === 'critical' ? '🚨' : p.priority === 'high' ? '🟠' : '💡';
            const msg = `${emoji} [VERBESSERUNGSVORSCHLAG] ${p.title}\n\nBereich: ${p.category} | Prio: ${p.priority.toUpperCase()}\n\n${p.description}${p.solution_concept ? `\n\nGeplante Lösung:\n${p.solution_concept}` : ''}`;
            await pb.collection('live_chat').create({ text: msg, user: pb.authStore.model?.id || null, whispered: false }, { requestKey: null });
            toastStore.success("Vorschlag im Team-Chat gepostet! 💬");
        } catch (e: any) {
            toastStore.error("Fehler beim Teilen: " + e.message);
        }
    }
}

export async function generateWeeklyPromptApi(options: {
    days: number;
    includeChat: boolean;
    includeProposals: boolean;
    includeInquiries: boolean;
    includeAppointmentRequests: boolean;
}) {
    const url = import.meta.env.DEV ? 'http://localhost:3000' : '';
    const res = await fetch(`${url}/api/emails/admin/system-prompts/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': pb.authStore.token ? `Bearer ${pb.authStore.token}` : '' },
        body: JSON.stringify({ forceCreate: true, ...options })
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Server antwortete mit Status ${res.status}`);
    }
    return await res.json();
}
