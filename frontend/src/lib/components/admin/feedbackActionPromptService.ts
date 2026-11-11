import { pb } from '$lib/services/pocketbase';
import { proposalService } from '$lib/services/improvementProposalService.svelte';

export interface GeneratedFeedbackPromptResult {
    title: string;
    prompt: string;
    teamChatPrompt: string;
    draftReply: string;
    savedSystemPromptId?: string;
    usedModel: string;
}

export interface ParsedFeedbackSource {
    senderName: string;
    senderEmail: string;
    messageText: string;
    ratingScore: number | null;
    selectedStatus: 'Neu' | 'In Bearbeitung' | 'Gelöst' | 'Archiviert';
    contextInfo: string;
}

export function parseFeedbackSourceItem(item: any, source: 'feedback' | 'support_message' | 'inquiry' | 'chat' | 'proposal'): ParsedFeedbackSource {
    if (source === 'feedback') {
        const nameFirst = item.name_first || (item.expand?.client?.name_first) || '';
        const nameLast = item.name_last || (item.expand?.client?.name_last) || '';
        const senderName = [nameFirst, nameLast].filter(Boolean).join(' ') || 'Klient / Nutzer';
        const senderEmail = item.expand?.client?.email || '';
        const messageText = item.message || '';
        const ratingScore = item.rating || null;
        const selectedStatus = item.status === 'Gelesen' ? 'In Bearbeitung' : (item.status === 'Archieviert' || item.status === 'Archiviert') ? 'Gelöst' : (item.status || 'In Bearbeitung');
        const parts: string[] = [];
        if (item.expand?.client) parts.push(`Klient: ${item.expand.client.name_first} ${item.expand.client.name_last}`);
        if (item.expand?.appointment) parts.push(`Termin: ${new Date(item.expand.appointment.appointment).toLocaleDateString('de-DE')}`);
        return { senderName, senderEmail, messageText, ratingScore, selectedStatus, contextInfo: parts.join(' | ') };
    }
    if (source === 'inquiry') {
        const senderName = item.sender_name || 'Interessent';
        const senderEmail = item.sender_email || '';
        const messageText = item.raw_text || '';
        const selectedStatus = item.status === 'new' ? 'Neu' : item.status === 'in_progress' ? 'In Bearbeitung' : 'Gelöst';
        return { senderName, senderEmail, messageText, ratingScore: null, selectedStatus, contextInfo: `Urgency: ${item.urgency || 'normal'} | Telefon: ${item.sender_phone || '-'}` };
    }
    if (source === 'chat') {
        const u = item.expand?.user;
        const senderName = u ? `${u.name_first || ''} ${u.name_last || ''}`.trim() || u.username || 'Kollege / Chat' : (item.sender || 'Mitarbeiter');
        const senderEmail = u?.email || item.email || '';
        const messageText = item.text || item.message || '';
        const isBug = messageText.includes('🚨 [BUG REPORT]');
        const ratingScore = isBug ? 3 : null;
        const selectedStatus = item.status || 'In Bearbeitung';
        const contextInfo = isBug ? '🚨 Bug Report aus ChatWidget' : (item.whispered ? '🤫 Geflüstert im Team-Chat' : '💬 Team-Chat Nachricht');
        return { senderName, senderEmail, messageText, ratingScore, selectedStatus, contextInfo };
    }
    if (source === 'proposal') {
        const senderName = item.author_name || 'Superadmin';
        const desc = item.description || '';
        const sol = item.solution_concept ? `\n\nErwartetes Lösungskonzept:\n${item.solution_concept}` : '';
        const messageText = `💡 [Vorschlag] ${item.title || 'Verbesserungsvorschlag'}\n\n${desc}${sol}`;
        const ratingScore = item.priority === 'critical' ? 2 : item.priority === 'high' ? 4 : item.priority === 'medium' ? 7 : 9;
        const selectedStatus = item.status === 'idea' ? 'Neu' : item.status === 'planned' ? 'In Bearbeitung' : item.status === 'in_progress' ? 'In Bearbeitung' : 'Gelöst';
        const contextInfo = `Kategorie: ${item.category || 'System'} | Priorität: ${item.priority || 'normal'}${item.tags ? ` | Tags: ${item.tags}` : ''}`;
        return { senderName, senderEmail: '', messageText, ratingScore, selectedStatus, contextInfo };
    }
    return {
        senderName: item.sender || 'Nutzer',
        senderEmail: item.email || '',
        messageText: item.body || item.message || '',
        ratingScore: null,
        selectedStatus: 'In Bearbeitung',
        contextInfo: item.subject || ''
    };
}

export async function requestPromptGeneration(payload: {
    source: string;
    id?: string;
    sender: string;
    message: string;
    rating: number | null;
    context: string;
    adminInstruction: string;
}): Promise<GeneratedFeedbackPromptResult> {
    const microserviceUrl = import.meta.env.DEV ? 'http://localhost:3000' : '';
    const res = await fetch(`${microserviceUrl}/api/emails/admin/feedback-prompt/generate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': pb.authStore.token ? `Bearer ${pb.authStore.token}` : ''
        },
        body: JSON.stringify({
            source: payload.source,
            id: payload.id,
            sender: payload.sender,
            message: payload.message,
            rating: payload.rating,
            context: payload.context,
            adminInstruction: payload.adminInstruction.trim(),
            saveAsSystemPrompt: false
        })
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Server antwortete mit Status ${res.status}`);
    }

    const data = await res.json();
    return {
        title: data.title || `Ausbesserung: ${payload.sender}`,
        prompt: data.prompt,
        teamChatPrompt: data.teamChatPrompt || '',
        draftReply: data.draftReply || '',
        savedSystemPromptId: data.savedSystemPromptId,
        usedModel: data.usedModel
    };
}

export async function saveFeedbackToSystemPrompts(
    result: GeneratedFeedbackPromptResult,
    senderName: string,
    messageText: string,
    itemId?: string
): Promise<string> {
    const currentYear = new Date().getFullYear();
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const kwNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    const kwIdentifier = `${currentYear}-W${String(kwNo).padStart(2, '0')}-FB-${itemId ? itemId.substring(0, 5) : Date.now().toString().slice(-4)}`;

    const created = await pb.collection('system_prompts').create({
        title: result.title,
        calendar_week: kwIdentifier,
        prompt_content: result.prompt,
        status: 'open',
        feedback_count: 1,
        source_period_start: new Date().toISOString(),
        source_period_end: new Date().toISOString(),
        raw_summary: `Erstellt aus Einzel-Feedback von ${senderName}: "${messageText.substring(0, 150)}"`
    }, { requestKey: null });

    return created.id;
}

export async function submitStatusAndReply(payload: {
    itemSource: string;
    activeItem: any;
    selectedStatus: string;
    adminInstruction: string;
    replyText: string;
    senderEmail: string;
}): Promise<void> {
    const { itemSource, activeItem, selectedStatus, adminInstruction, replyText, senderEmail } = payload;
    if (itemSource === 'proposal' && activeItem?.id) {
        const propStatus = selectedStatus === 'Neu' ? 'idea' : (selectedStatus === 'In Bearbeitung' ? 'in_progress' : (selectedStatus === 'Gelöst' ? 'implemented' : 'idea'));
        await proposalService.updateProposalStatus(activeItem.id, propStatus);
        return;
    }

    let savedViaMicroservice = false;
    try {
        const microserviceUrl = import.meta.env.DEV ? 'http://localhost:3000' : '';
        const res = await fetch(`${microserviceUrl}/api/emails/admin/feedback-react`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': pb.authStore.token ? `Bearer ${pb.authStore.token}` : ''
            },
            body: JSON.stringify({
                id: activeItem?.id,
                source: itemSource,
                newStatus: selectedStatus,
                adminNotes: adminInstruction.trim() || undefined,
                replyMessage: replyText.trim() || undefined,
                recipientEmail: senderEmail.trim() || undefined
            })
        });

        if (res.ok) {
            savedViaMicroservice = true;
        }
    } catch (fetchErr) {
        console.warn('[React] Microservice fetch failed, falling back to direct PB update:', fetchErr);
    }

    if (!savedViaMicroservice && activeItem?.id) {
        if (itemSource === 'feedback') {
            try {
                await pb.collection('feedbacks').update(activeItem.id, {
                    status: selectedStatus,
                    admin_notes: adminInstruction.trim() || undefined,
                    admin_reply: replyText.trim() || undefined
                }, { requestKey: null });
            } catch {
                const fallbackStatus = selectedStatus === 'In Bearbeitung' ? 'Gelesen' : (selectedStatus === 'Gelöst' || selectedStatus === 'Archiviert' ? 'Archieviert' : 'Neu');
                await pb.collection('feedbacks').update(activeItem.id, { status: fallbackStatus }, { requestKey: null });
            }
        } else if (itemSource === 'inquiry') {
            const inqStatus = selectedStatus === 'Neu' ? 'new' : selectedStatus === 'In Bearbeitung' ? 'in_progress' : (selectedStatus === 'Gelöst' ? 'converted' : 'rejected');
            await pb.collection('inquiries').update(activeItem.id, { status: inqStatus, draft_reply: replyText.trim() || undefined }, { requestKey: null });
        } else if (itemSource === 'chat') {
            try {
                await pb.collection('live_chat').update(activeItem.id, { status: selectedStatus }, { requestKey: null });
            } catch (chatErr) {
                console.warn('[Modal] Local PB live_chat update failed:', chatErr);
            }
        }
    }
}
