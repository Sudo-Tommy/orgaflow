<!-- src/lib/components/support/AiLiveSupportChat.svelte -->
<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { pb } from '$lib/services/pocketbase';
    import { toastStore } from '$lib/services/toastService.svelte';
    import { rbacService } from '$lib/services/rbacService.svelte';
    import { triggerHaptic } from '$lib/services/hapticFeedback';
    import { manageLiveSupportSession, type FinalizeResult, type ChatAttachment } from '$lib/services/aiLiveSupportService';
    import {
        loadUserChatHistory, saveOmniMessage, updateOmniMessageRating,
        clearUserOmniChat, subscribeUserOmniChat, shouldShowDailyGreeting,
        dedupeOmniMessages, type StoredOmniMessage
    } from '$lib/services/omniChatStorageService';
    import { processFileAttachments } from './supportAttachmentUtils';
    import { speakText, createSpeechRecognizer } from './supportSpeechService';
    import { finalizeAndClearChat, createWelcomeMessage, runOmniLiveStreamTurn } from './supportWorkflowHelper';
    import AiClarificationBanner from './AiClarificationBanner.svelte';
    import AttachmentPreviewChips from './AttachmentPreviewChips.svelte';
    import ChatMessageList from './ChatMessageList.svelte';
    import AiSupportSuccessView from './AiSupportSuccessView.svelte';
    import ChatInputBar from './ChatInputBar.svelte';

    interface Props { contextData?: Record<string, any>; onClose: () => void; }
    let { contextData = {}, onClose }: Props = $props();

    let messages = $state<StoredOmniMessage[]>([]), inputText = $state('');
    let isLoading = $state(false), isSubmitting = $state(false), isClarified = $state(false);
    let problemSummary = $state(''), selectedCategory = $state('Technik / Fehler');
    let selectedPriority = $state<'low' | 'normal' | 'urgent'>('normal');
    let finalizeResult = $state<FinalizeResult | null>(null);

    let pendingAttachments = $state<ChatAttachment[]>([]), pendingRawFiles = $state<File[]>([]);
    let lastAttemptPayload = $state<{ text: string; atts: ChatAttachment[] } | null>(null);
    let isDraggingOver = $state(false), chatListComp = $state<ReturnType<typeof ChatMessageList> | null>(null);
    let currentPage = $state(1), totalPages = $state(1), isLoadingMore = $state(false), isRecording = $state(false);
    let unsubscribeRealtime: (() => void) | null = null;

    const isDev = $derived(rbacService.isDeveloper);
    const userId = $derived(pb.authStore.model?.id || '');
    const recognizer = createSpeechRecognizer((t) => handleSendMessage(t), (rec) => isRecording = rec);

    function appendOrUpdateMessage(msg: StoredOmniMessage) {
        if (!msg?.id) return;
        const idx = messages.findIndex(m => m.id === msg.id);
        if (idx !== -1) messages[idx] = { ...messages[idx], ...msg };
        else messages = dedupeOmniMessages([...messages, msg]);
    }

    export async function addFiles(fileList: FileList | File[]) {
        pendingRawFiles = [...pendingRawFiles, ...Array.from(fileList)];
        const newAtts = await processFileAttachments(fileList, pendingAttachments.length, 3);
        pendingAttachments = [...pendingAttachments, ...newAtts];
    }

    export function handleExternalPaste(e: ClipboardEvent) {
        if (e.clipboardData?.files && e.clipboardData.files.length > 0) {
            e.preventDefault();
            addFiles(e.clipboardData.files);
            toastStore.success('Screenshot / Datei aus Zwischenablage eingefügt! 📋');
        }
    }

    export async function clearChat(): Promise<boolean> {
        if (!userId) return false;
        const ok = await clearUserOmniChat(userId);
        if (ok) {
            messages = [createWelcomeMessage(userId)];
            isClarified = false; problemSummary = ''; currentPage = 1; totalPages = 1;
            manageLiveSupportSession(userId, 'reset', contextData);
            toastStore.success('Chatverlauf erfolgreich geleert.');
        }
        return ok;
    }

    async function loadMoreHistory() {
        if (!userId || isLoadingMore || currentPage >= totalPages) return;
        isLoadingMore = true;
        try {
            const res = await loadUserChatHistory(userId, currentPage + 1, 50);
            if (res.items.length > 0) {
                messages = dedupeOmniMessages([...res.items, ...messages]);
                currentPage += 1; totalPages = res.totalPages;
            }
        } finally { isLoadingMore = false; }
    }

    async function executeTurn(text: string, outgoingAtts: ChatAttachment[]) {
        try {
            const { savedMessage, response, streamMsgId } = await runOmniLiveStreamTurn({
                userId, messages, contextData, attachments: outgoingAtts,
                onStreamingUpdate: (streamingMsg) => { appendOrUpdateMessage(streamingMsg); chatListComp?.scrollDown(); }
            });
            messages = messages.filter(m => m.id !== streamMsgId);
            appendOrUpdateMessage(savedMessage);

            if (response.isClarified) {
                isClarified = true;
                problemSummary = response.problemSummary || text;
                if (response.suggestedCategory) selectedCategory = response.suggestedCategory;
                if (response.suggestedPriority) selectedPriority = response.suggestedPriority;
                triggerHaptic('info');
            } else {
                isClarified = false;
            }
        } catch (err: any) {
            messages = messages.filter(m => !m.isStreaming);
            appendOrUpdateMessage({
                id: `live-err-${crypto.randomUUID()}`, user: userId, role: 'assistant', isLiveError: true,
                text: err?.message || 'Die Gemini Live-API ist momentan nicht erreichbar. Bitte versuche es erneut.',
                created: new Date().toISOString()
            });
        }
    }

    async function handleSendMessage(textOverride?: string) {
        const text = (textOverride || inputText).trim();
        if ((!text && pendingAttachments.length === 0) || isLoading || !userId) return;

        triggerHaptic('tap');
        const outgoingAtts = [...pendingAttachments], outgoingFiles = [...pendingRawFiles];
        lastAttemptPayload = { text, atts: outgoingAtts };
        pendingAttachments = []; pendingRawFiles = []; inputText = ''; isLoading = true;
        messages = messages.filter(m => !m.isLiveError);

        try {
            const savedUserMsg = await saveOmniMessage(userId, 'user', text, { rawFiles: outgoingFiles });
            appendOrUpdateMessage(savedUserMsg);
            chatListComp?.scrollDown();
            await executeTurn(text, outgoingAtts);
        } finally {
            isLoading = false;
            chatListComp?.scrollDown();
        }
    }

    async function handleRetryLastMessage() {
        if (!lastAttemptPayload || isLoading || !userId) return;
        isLoading = true;
        messages = messages.filter(m => !m.isLiveError);
        try { await executeTurn(lastAttemptPayload.text, lastAttemptPayload.atts); }
        finally { isLoading = false; chatListComp?.scrollDown(); }
    }

    async function handleContinueExplaining() {
        isClarified = false;
        if (!userId) return;
        const followUpMsg = await saveOmniMessage(userId, 'assistant', 'Was möchtest du noch ergänzen oder korrigieren?');
        appendOrUpdateMessage(followUpMsg);
        setTimeout(() => chatListComp?.scrollDown(), 40);
    }

    async function handleConfirmAndSubmit() {
        if (isSubmitting || !userId) return;
        isSubmitting = true;
        triggerHaptic('selection');
        finalizeResult = await finalizeAndClearChat({
            messages, problemSummary, category: selectedCategory, priority: selectedPriority, contextData, userId
        });
        if (finalizeResult?.ticketId) {
            isClarified = false; problemSummary = '';
            messages = [createWelcomeMessage(userId)];
            currentPage = 1; totalPages = 1; pendingAttachments = []; pendingRawFiles = []; inputText = '';
            manageLiveSupportSession(userId, 'reset', contextData);
        }
        isSubmitting = false;
    }

    onMount(async () => {
        if (!userId) return;
        manageLiveSupportSession(userId, 'connect', {
            ...contextData, userId,
            userRole: pb.authStore.model?.role || 'user',
            userName: pb.authStore.model?.name_first || 'Benutzer'
        });

        const res = await loadUserChatHistory(userId, 1, 50);
        let loaded = [...res.items];
        currentPage = 1; totalPages = res.totalPages;
        if (shouldShowDailyGreeting(loaded)) loaded.push(createWelcomeMessage(userId));
        messages = dedupeOmniMessages(loaded);
        setTimeout(() => chatListComp?.scrollDown(), 60);

        unsubscribeRealtime = subscribeUserOmniChat(userId, (e) => {
            if (e.action === 'create' && e.record) {
                appendOrUpdateMessage({
                    id: e.record.id, user: e.record.user, role: e.record.role,
                    text: e.record.text || '', actionLink: e.record.action_link || null,
                    created: e.record.created || new Date().toISOString()
                });
                chatListComp?.scrollDown();
            }
        });
    });

    onDestroy(() => {
        unsubscribeRealtime?.();
        if (userId) manageLiveSupportSession(userId, 'close');
    });
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
    role="region" aria-label="Omni Support Chat"
    class="flex flex-col h-full space-y-3 relative {isDraggingOver ? 'ring-2 ring-indigo-500 rounded-2xl bg-indigo-50/20' : ''}"
    ondragover={(e) => { e.preventDefault(); isDraggingOver = true; }}
    ondragleave={() => (isDraggingOver = false)}
    ondrop={(e) => { e.preventDefault(); isDraggingOver = false; if (e.dataTransfer?.files) addFiles(e.dataTransfer.files); }}
    onpaste={handleExternalPaste}
>
    {#if finalizeResult}
        <AiSupportSuccessView {finalizeResult} {isDev} onClose={() => { finalizeResult = null; onClose(); }} onNewChat={() => { finalizeResult = null; }} />
    {:else}
        <ChatMessageList
            bind:this={chatListComp} {messages} {isLoading} currentRoute={contextData?.route || '/dashboard'}
            hasMore={currentPage < totalPages} {isLoadingMore}
            onQuickAction={(t) => handleSendMessage(t)} onSpeak={speakText} onCloseModal={onClose}
            onRate={(id, r) => { const t = messages.find(m => m.id === id); if (t) t.rating = r; updateOmniMessageRating(id, r); }}
            onLoadMore={loadMoreHistory} onRetry={handleRetryLastMessage}
        />
        {#if isClarified && !isSubmitting}
            <AiClarificationBanner
                {problemSummary} bind:selectedCategory bind:selectedPriority
                categories={['Idee & Wunsch', 'Optik & Layout', 'Sonstiges', 'Technik / Fehler']}
                onConfirm={handleConfirmAndSubmit} onCancel={handleContinueExplaining}
            />
        {/if}
        <AttachmentPreviewChips
            attachments={pendingAttachments}
            onRemove={(id) => {
                const idx = pendingAttachments.findIndex(a => a.id === id);
                if (idx !== -1) {
                    pendingAttachments = pendingAttachments.filter((_, i) => i !== idx);
                    pendingRawFiles = pendingRawFiles.filter((_, i) => i !== idx);
                }
            }}
        />
        <ChatInputBar
            bind:inputText {pendingAttachments} {isLoading} {isSubmitting} {isRecording}
            onSend={() => handleSendMessage()} onAddFiles={addFiles}
            onToggleSpeech={() => { if (!recognizer) toastStore.info('Spracherkennung nicht unterstützt.'); else recognizer.toggle(); }}
        />
    {/if}
</div>
