// src/lib/components/support/supportWorkflowHelper.ts
import { pb } from '$lib/services/pocketbase';
import { toastStore } from '$lib/services/toastService.svelte';
import {
    submitLiveSupportFinalize,
    streamLiveSupportChat,
    type FinalizeResult,
    type ChatAttachment,
    type LiveSupportResponse
} from '$lib/services/aiLiveSupportService';
import { clearUserOmniChat, saveOmniMessage, type StoredOmniMessage } from '$lib/services/omniChatStorageService';

export function createWelcomeMessage(userId: string): StoredOmniMessage {
    return {
        id: 'welcome-' + crypto.randomUUID(),
        user: userId,
        role: 'assistant',
        text: 'Worum geht es? Frag mich gern zu Modulen der App oder schildere ein Problem.',
        created: new Date().toISOString()
    };
}

export async function runOmniLiveStreamTurn({
    userId,
    messages,
    contextData,
    attachments,
    onStreamingUpdate
}: {
    userId: string;
    messages: StoredOmniMessage[];
    contextData: Record<string, any>;
    attachments: ChatAttachment[];
    onStreamingUpdate: (msg: StoredOmniMessage) => void;
}): Promise<{ savedMessage: StoredOmniMessage; response: LiveSupportResponse; streamMsgId: string }> {
    const streamMsgId = `live-stream-${crypto.randomUUID()}`;
    const contextHistory = messages
        .filter(m => !m.isLiveError && !m.isStreaming && !m.id.startsWith('welcome-'))
        .slice(-12)
        .map(m => ({ role: m.role, text: m.text }));

    const response = await streamLiveSupportChat({
        sessionId: userId,
        messages: contextHistory,
        context: {
            ...contextData,
            userId,
            userRole: pb.authStore.model?.role || 'user',
            userName: pb.authStore.model?.name_first || 'Benutzer'
        },
        attachments,
        onChunk: (liveText) => {
            onStreamingUpdate({
                id: streamMsgId,
                user: userId,
                role: 'assistant',
                text: liveText,
                isStreaming: true,
                created: new Date().toISOString()
            });
        }
    });

    const savedMessage = await saveOmniMessage(userId, 'assistant', response.reply, {
        actionLink: response.actionLink
    });

    return { savedMessage, response, streamMsgId };
}

export async function submitFinalTicket({
    messages,
    problemSummary,
    category,
    priority,
    contextData
}: {
    messages: StoredOmniMessage[];
    problemSummary: string;
    category: string;
    priority: string;
    contextData: Record<string, any>;
}): Promise<FinalizeResult | null> {
    const summaryText = problemSummary || messages[messages.length - 1]?.text || 'Support-Anfrage an Omni';
    const transcript = messages.slice(-12).map(m => ({ role: m.role, text: String(m.text || '').slice(0, 500) }));
    const authUser = pb.authStore.model;

    try {
        const res = await submitLiveSupportFinalize({
            chatTranscript: transcript,
            problemSummary: summaryText,
            category,
            priority,
            context: contextData,
            user: authUser ? {
                id: authUser.id,
                email: authUser.email,
                role: authUser.role,
                name_first: authUser.name_first,
                name_last: authUser.name_last
            } : undefined
        });
        toastStore.success('Ticket erfolgreich erstellt! ✓');
        return res;
    } catch {
        try {
            const fallbackPrompt = `### AntiGravity Ticket\n**Problem:** ${summaryText}\n**Kategorie:** ${category}\n**Ansicht:** ${contextData?.url || contextData?.route || ''}`;
            const record = await pb.collection('support_tickets').create({
                category: category || 'Technik / Fehler',
                status: 'Neu',
                comment: summaryText.slice(0, 4000),
                url: String(contextData?.url || contextData?.route || '').slice(0, 500),
                userAgent: String(contextData?.userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : 'Web Client')).slice(0, 400),
                resolution: `${Number(contextData?.viewportWidth) || 1280}x${Number(contextData?.viewportHeight) || 800}`,
                annotations_data: JSON.stringify({
                    summary: summaryText.slice(0, 400),
                    category,
                    priority,
                    transcript: transcript.slice(-6),
                    antigravityPrompt: fallbackPrompt,
                    createdAt: new Date().toISOString()
                }),
                ...(authUser?.id ? { user: authUser.id } : {})
            });
            toastStore.success('Ticket erfolgreich erstellt! ✓');
            return {
                success: true,
                ticketId: record.id,
                antigravityPrompt: fallbackPrompt,
                summary: summaryText
            };
        } catch (err: any) {
            toastStore.error(err.message || 'Ticket konnte nicht erstellt werden.');
            return null;
        }
    }
}

export async function finalizeAndClearChat(
    params: Parameters<typeof submitFinalTicket>[0] & { userId: string }
): Promise<FinalizeResult | null> {
    const result = await submitFinalTicket(params);
    if (result?.ticketId && params.userId) {
        await clearUserOmniChat(params.userId);
    }
    return result;
}
