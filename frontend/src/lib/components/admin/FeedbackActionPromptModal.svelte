<script lang="ts">
    import { pb } from '$lib/services/pocketbase';
    import { toastStore } from '$lib/services/toastService.svelte';
    import { autoGrow } from '$lib/actions/autoGrow';
    import { X, Sparkles, CheckCircle2, RotateCw, Copy } from 'lucide-svelte';
    import FeedbackSourceCard from './FeedbackSourceCard.svelte';
    import FeedbackPromptResultTabs from './FeedbackPromptResultTabs.svelte';
    import {
        requestPromptGeneration,
        saveFeedbackToSystemPrompts,
        submitStatusAndReply,
        parseFeedbackSourceItem,
        type GeneratedFeedbackPromptResult
    } from './feedbackActionPromptService';

    let dialog: HTMLDialogElement;
    let isOpen = $state(false);

    let activeItem = $state<any>(null);
    let itemSource = $state<'feedback' | 'support_message' | 'inquiry' | 'chat' | 'proposal'>('feedback');
    let senderName = $state('');
    let senderEmail = $state('');
    let messageText = $state('');
    let ratingScore = $state<number | null>(null);
    let contextInfo = $state('');
    let adminInstruction = $state('');

    let isGenerating = $state(false);
    let generatedResult = $state<GeneratedFeedbackPromptResult | null>(null);

    let activeTab = $state<'prompt' | 'team' | 'reply'>('prompt');
    let isPromptCopied = $state(false);
    let isTeamPromptCopied = $state(false);
    let isReplyCopied = $state(false);
    let isSavingToPrompts = $state(false);
    let isSendingReply = $state(false);
    let isPostingToChat = $state(false);
    let teamChatEditableText = $state('');
    let replyEditableText = $state('');
    let selectedStatus = $state<'Neu' | 'In Bearbeitung' | 'Gelöst' | 'Archiviert'>('In Bearbeitung');

    const statusOptions = (['Archiviert', 'Gelöst', 'In Bearbeitung', 'Neu'] as const)
        .slice()
        .sort((a, b) => a.localeCompare(b, 'de', { sensitivity: 'base' }));

    export function open(item: any, source: 'feedback' | 'support_message' | 'inquiry' | 'chat' | 'proposal' = 'feedback') {
        activeItem = item;
        itemSource = source;
        generatedResult = null;
        isGenerating = false;
        isPromptCopied = false;
        isTeamPromptCopied = false;
        isReplyCopied = false;
        adminInstruction = '';
        teamChatEditableText = '';
        replyEditableText = '';
        activeTab = 'prompt';

        const parsed = parseFeedbackSourceItem(item, source);
        senderName = parsed.senderName;
        senderEmail = parsed.senderEmail;
        messageText = parsed.messageText;
        ratingScore = parsed.ratingScore;
        selectedStatus = parsed.selectedStatus;
        contextInfo = parsed.contextInfo;

        isOpen = true;
        dialog?.showModal();
    }

    export function close() {
        isOpen = false;
        dialog?.close();
    }

    async function generatePrompt() {
        if (isGenerating) return;
        isGenerating = true;
        try {
            generatedResult = await requestPromptGeneration({
                source: itemSource,
                id: activeItem?.id,
                sender: senderName,
                message: messageText,
                rating: ratingScore,
                context: contextInfo,
                adminInstruction
            });
            teamChatEditableText = generatedResult.teamChatPrompt || '';
            replyEditableText = generatedResult.draftReply || '';
            toastStore.success('Ausbesserungsprompt für Gemini Code Assist (Antigravity) erfolgreich generiert! 🎯');
        } catch (err: any) {
            console.error('[Feedback Prompt Error]:', err);
            toastStore.error(`Generierung fehlgeschlagen: ${err.message}`);
        } finally {
            isGenerating = false;
        }
    }

    async function copyText(text: string, label: string, setCopied: (v: boolean) => void) {
        if (!text) return;
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            toastStore.success(`${label} in Zwischenablage kopiert! 📋`);
            setTimeout(() => setCopied(false), 3000);
        } catch {
            toastStore.error('Kopieren fehlgeschlagen.');
        }
    }

    async function postToTeamChat() {
        if (!teamChatEditableText.trim() || isPostingToChat) return;
        isPostingToChat = true;
        try {
            const currentUser = pb.authStore.record;
            const fullMessage = `📢 [BRIEFING TEAM & SUPPORT]\nBetrifft: Feedback von ${senderName}\n\n${teamChatEditableText.trim()}`;
            await pb.collection('live_chat').create({ text: fullMessage, user: currentUser?.id || undefined }, { requestKey: null });
            toastStore.success('Erfolgreich im Team-Chat (live_chat) geteilt! 💬');
        } catch (err: any) {
            toastStore.error(`Konnte nicht im Team-Chat gepostet werden: ${err.message}`);
        } finally { isPostingToChat = false; }
    }

    async function saveAsSystemPromptRecord() {
        if (!generatedResult?.prompt || isSavingToPrompts) return;
        isSavingToPrompts = true;
        try {
            const id = await saveFeedbackToSystemPrompts(generatedResult, senderName, messageText, activeItem?.id);
            generatedResult.savedSystemPromptId = id;
            toastStore.success(`Als System-Prompt '${generatedResult.title}' gespeichert! 💾`);
        } catch (err: any) {
            toastStore.error(`Speichern fehlgeschlagen: ${err.message}`);
        } finally { isSavingToPrompts = false; }
    }

    async function handleStatusAndReplyUpdate() {
        if (isSendingReply) return;
        isSendingReply = true;
        try {
            await submitStatusAndReply({
                itemSource,
                activeItem,
                selectedStatus,
                adminInstruction,
                replyText: replyEditableText,
                senderEmail
            });
            toastStore.success('Status und Reaktion erfolgreich im System hinterlegt! ✅');
            close();
        } catch (err: any) {
            toastStore.error(`Aktualisierung fehlgeschlagen: ${err.message}`);
        } finally { isSendingReply = false; }
    }
</script>

<dialog
    bind:this={dialog}
    class="zero-inner-scroll-modal p-0 bg-transparent backdrop:bg-black/60 backdrop:backdrop-blur-sm w-full max-w-3xl mx-auto my-auto rounded-3xl border-none shadow-2xl z-[9999]"
    onclick={(e) => { if (e.target === dialog) close(); }}
>
    <div class="bg-white rounded-3xl w-full flex flex-col relative shadow-2xl border border-neutral-100">
        <div class="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-neutral-100 flex items-center justify-between shrink-0 bg-white/95 backdrop-blur-md rounded-t-3xl">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shadow-inner text-xl shrink-0">🎯</div>
                <div>
                    <h2 class="text-base sm:text-xl font-bold text-neutral-900 leading-tight">Feedback analysieren & Prompt erstellen</h2>
                    <span class="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">Superadmin</span>
                </div>
            </div>
            <button aria-label="Schließen" onclick={close} class="min-w-[44px] min-h-[44px] bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-full flex items-center justify-center transition-colors cursor-pointer shrink-0 touch-manipulation">
                <X class="w-4 h-4" />
            </button>
        </div>

        <div class="p-4 sm:p-6 space-y-5">
            <FeedbackSourceCard {senderName} {senderEmail} {ratingScore} {contextInfo} {messageText} {itemSource} />

            <div class="bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-cyan-500/5 rounded-2xl p-5 border border-indigo-200/80 space-y-3">
                <label for="admin-instruction" class="block text-xs font-bold text-indigo-900">Zusätzliche Admin-Anweisung für die KI-Analyse (optional):</label>
                <textarea use:autoGrow id="admin-instruction" bind:value={adminInstruction} placeholder="z.B. 'Fokussiere auf die mobile Ansicht'..." class="auto-grow orga-input-clear text-xs py-2.5 px-3 bg-white border border-indigo-200/70 rounded-xl resize-none overflow-hidden min-h-20"></textarea>
                <button type="button" onclick={generatePrompt} disabled={isGenerating} class="orga-button-primary w-full min-h-[44px] py-3 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-indigo-600/30 cursor-pointer touch-manipulation">
                    {#if isGenerating}
                        <RotateCw class="w-4 h-4 animate-spin" />
                        <span>Analysiere mit Gemini 2.5 Pro...</span>
                    {:else}
                        <Sparkles class="w-4 h-4" />
                        <span>{generatedResult ? 'Erneut analysieren' : 'Ausbesserungsprompt für Gemini generieren'}</span>
                    {/if}
                </button>
            </div>

            {#if generatedResult}
                <FeedbackPromptResultTabs
                    {generatedResult}
                    bind:activeTab
                    bind:teamChatEditableText
                    bind:replyEditableText
                    {isPromptCopied}
                    {isTeamPromptCopied}
                    {isReplyCopied}
                    {isSavingToPrompts}
                    {isPostingToChat}
                    onCopyPrompt={() => copyText(generatedResult?.prompt || '', 'Ausbesserungsprompt', (v) => isPromptCopied = v)}
                    onCopyTeamPrompt={() => copyText(teamChatEditableText, 'Team Chat & Support Briefing', (v) => isTeamPromptCopied = v)}
                    onCopyReply={() => copyText(replyEditableText, 'Kundenantwort', (v) => isReplyCopied = v)}
                    onSaveToPrompts={saveAsSystemPromptRecord}
                    onPostToChat={postToTeamChat}
                />
            {/if}

            <div class="bg-neutral-50 rounded-2xl p-4 sm:p-5 border border-neutral-200/80 space-y-4">
                <h3 class="text-xs font-bold text-neutral-800 uppercase tracking-wider">Ticket-Status & Admin-Reaktion festlegen</h3>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div class="inline-flex p-1 bg-white rounded-xl border border-neutral-200 gap-1 w-full flex-wrap sm:flex-nowrap">
                        {#each statusOptions as st}
                            <button type="button" onclick={() => selectedStatus = st} class="flex-1 min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer touch-manipulation {selectedStatus === st ? 'bg-indigo-600 text-white shadow-xs' : 'text-neutral-600 hover:text-neutral-900'}">{st}</button>
                        {/each}
                    </div>
                    <button type="button" onclick={handleStatusAndReplyUpdate} disabled={isSendingReply} class="orga-button-primary bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20 w-full min-h-[44px] py-2.5 text-xs flex items-center justify-center gap-2 cursor-pointer touch-manipulation">
                        {#if isSendingReply}<RotateCw class="w-3.5 h-3.5 animate-spin" /><span>Speichert...</span>{:else}<CheckCircle2 class="w-3.5 h-3.5" /><span>Status speichern</span>{/if}
                    </button>
                </div>
            </div>
        </div>

        <div class="px-5 sm:px-8 py-3.5 border-t border-neutral-100 bg-neutral-50 flex items-center justify-between shrink-0 rounded-b-3xl">
            <button type="button" onclick={close} class="orga-button-ghost min-h-[44px] py-2 px-4 text-xs font-medium text-neutral-600 cursor-pointer touch-manipulation">Schließen</button>
            {#if activeTab === 'prompt' && generatedResult?.prompt}
                <button type="button" onclick={() => copyText(generatedResult?.prompt || '', 'Ausbesserungsprompt', (v) => isPromptCopied = v)} class="orga-button-primary min-h-[44px] py-2 px-5 text-xs font-bold flex items-center gap-1.5 shadow-indigo-600/20 cursor-pointer touch-manipulation">
                    <Copy class="w-3.5 h-3.5" /><span>Prompt kopieren</span>
                </button>
            {/if}
        </div>
    </div>
</dialog>
