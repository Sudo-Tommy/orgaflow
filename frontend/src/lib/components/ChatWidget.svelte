<script lang="ts">
    import { useChat } from '$lib/services/chatService.svelte';
    import { autoGrow } from '$lib/actions/autoGrow';
    import { onMount, onDestroy, tick } from 'svelte';
    import { toastStore } from "$lib/services/toastService.svelte";
    import { confirmStore } from "$lib/services/confirmService.svelte";
    import NotificationSettingsModal from "$lib/components/NotificationSettingsModal.svelte";
    import FeedbackActionPromptModal from "$lib/components/admin/FeedbackActionPromptModal.svelte";
    import ChatHeader from "./chat/ChatHeader.svelte";
    import ChatMessageItem from "./chat/ChatMessageItem.svelte";
    import DocumentScanButton from "$lib/components/common/DocumentScanButton.svelte";
    import { createChatAudioRecorder } from "./chat/useChatAudioRecorder.svelte";

    const chat = useChat();
    let chatContainer: HTMLElement;
    let fileInput: HTMLInputElement;

    let msgText = $state('');
    let selectedFile: File | null = $state(null);
    let whisperTo = $state('');
    let isBug = $state(false);
    let isSending = $state(false);
    
    const recorder = createChatAudioRecorder((file) => { selectedFile = file; });

    let notificationModal: any = $state();
    let feedbackPromptModal: any = $state();
    let filterOnlyInquiries = $state(false);

    const displayedMessages = $derived(
        filterOnlyInquiries
            ? chat.messages.filter(m => {
                const text = (m.text || '').toLowerCase();
                return m.text?.includes('🚨 [BUG REPORT]') || text.includes('?') || text.includes('bug') || text.includes('fehler') || text.includes('problem') || text.includes('hilfe') || text.includes('bitte') || text.includes('frage');
            })
            : chat.messages
    );

    function handleResume() {
        if (document.visibilityState === 'visible' && navigator.onLine) chat.init();
    }

    onMount(() => { 
        chat.init();
        document.addEventListener('visibilitychange', handleResume);
        window.addEventListener('focus', handleResume);
        window.addEventListener('online', handleResume);
    });
    onDestroy(() => { 
        document.removeEventListener('visibilitychange', handleResume);
        window.removeEventListener('focus', handleResume);
        window.removeEventListener('online', handleResume);
        recorder.cleanup();
        chat.cleanup(); 
    });

    $effect(() => {
        if (displayedMessages.length) {
            tick().then(() => {
                if (chatContainer) chatContainer.scrollTop = chatContainer.scrollHeight;
            });
        }
    });

    async function handleSend(e: Event) {
        e.preventDefault();
        if (!msgText.trim() && !selectedFile) return;
        isSending = true;
        try {
            await chat.sendMessage(msgText, selectedFile, whisperTo, isBug);
            msgText = ''; selectedFile = null; isBug = false; whisperTo = '';
            if (fileInput) fileInput.value = '';
        } finally { isSending = false; }
    }

    function handleFile(e: Event) {
        const target = e.target as HTMLInputElement;
        if (target.files && target.files.length > 0) selectedFile = target.files[0];
    }

    async function handleDelete(id: string) {
        if (await confirmStore.ask("Möchtest du diese Nachricht wirklich löschen?", "Nachricht löschen?", "Löschen", "Abbrechen", true)) {
            try {
                await chat.deleteMessage(id);
                toastStore.info("Nachricht gelöscht.");
            } catch (err: any) {
                toastStore.error("Fehler beim Löschen: " + err.message);
            }
        }
    }

    function formatMessageTime(dateStr: string) {
        const d = new Date(dateStr); const now = new Date();
        const timeStr = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
        const dayD = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        const dayNow = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const diffDays = Math.round((dayNow.getTime() - dayD.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 0) return `Heute ${timeStr}`;
        if (diffDays === 1) return `Gestern ${timeStr}`;
        if (diffDays < 7) { const days = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']; return `${days[d.getDay()]} ${timeStr}`; }
        return `${d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })} ${timeStr}`;
    }
</script>

<div class="orga-card-white flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 relative shadow-xs" style="height: 600px;">
    <ChatHeader 
        {chat} 
        filterOnlyInquiries={filterOnlyInquiries} 
        displayedCount={displayedMessages.length} 
        totalCount={chat.messages.length} 
        onToggleFilter={() => filterOnlyInquiries = !filterOnlyInquiries} 
        onOpenNotifications={() => notificationModal?.open?.()} 
    />

    <div class="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-slate-50/60 dark:bg-slate-950/70" bind:this={chatContainer}>
        {#if displayedMessages.length === 0}
            <div class="flex flex-col items-center justify-center h-full text-center p-6 text-slate-400 dark:text-slate-500 space-y-2">
                <span class="text-2xl">🔍</span>
                <p class="text-xs font-semibold text-slate-600 dark:text-slate-300">Keine Anfragen oder Bug-Reports gefunden</p>
                {#if filterOnlyInquiries}
                    <button type="button" onclick={() => filterOnlyInquiries = false} class="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-bold cursor-pointer">Alle Nachrichten anzeigen</button>
                {/if}
            </div>
        {/if}

        {#each displayedMessages as msg}
            <ChatMessageItem 
                {msg} 
                {chat} 
                {formatMessageTime} 
                onFeedbackPrompt={(m) => feedbackPromptModal?.open(m, 'chat')} 
                onDelete={handleDelete} 
            />
        {/each}
    </div>

    <div class="bg-white dark:bg-slate-900 flex flex-col p-3 z-10 border-t border-slate-200 dark:border-slate-800 transition-colors">
        <div class="flex items-center gap-3 mb-3 px-1">
            <button type="button" onclick={() => isBug = !isBug} class="text-xs font-bold px-4 sm:px-3 py-3 sm:py-1.5 rounded-full transition-colors border shrink-0 whitespace-nowrap cursor-pointer {isBug ? 'bg-rose-500 text-white border-rose-600 shadow-inner' : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'}">
                🚨 Bug melden
            </button>
            <select bind:value={whisperTo} class="text-xs font-bold px-4 sm:px-3 py-3 sm:py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer w-full">
                <option value="">Offen für alle</option>
                {#each chat.users as u}
                    {#if u.id !== chat.currentUserId}
                        <option value={u.id}>🤫 Flüstern an {u.name_first} {u.name_last}</option>
                    {/if}
                {/each}
            </select>
        </div>

        <form onsubmit={handleSend} class="flex flex-col bg-slate-50 dark:bg-slate-800/80 rounded-2xl md:rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xs p-2 transition-colors focus-within:border-indigo-500">
            {#if selectedFile && !recorder.isRecording}
                <div class="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 mb-2 max-w-full flex items-center justify-between gap-2 animate-enter">
                    <span class="truncate">{selectedFile.type.startsWith('audio/') ? '🎤 Sprachnachricht' : `📎 ${selectedFile.name}`}</span>
                    <button type="button" onclick={() => selectedFile = null} class="text-rose-500 hover:text-rose-700 bg-slate-100 dark:bg-slate-800 rounded-full p-1 shadow-xs cursor-pointer">✕</button>
                </div>
            {/if}

            {#if recorder.isRecording}
                <div class="flex items-center justify-between bg-rose-50 dark:bg-rose-950/40 rounded-2xl px-4 py-3 mb-2 animate-enter border border-rose-200 dark:border-rose-900">
                    <div class="flex items-center gap-3"><div class="w-3 h-3 bg-rose-500 rounded-full animate-pulse"></div><span class="text-rose-700 dark:text-rose-300 font-bold">{recorder.formattedRecordingTime}</span></div>
                    <button type="button" onclick={() => recorder.cancelRecording()} class="text-xs font-bold text-rose-600 dark:text-rose-400 hover:text-rose-800 transition-colors cursor-pointer">Abbrechen</button>
                </div>
            {:else}
                <textarea bind:value={msgText} use:autoGrow rows="1" onkeydown={(e) => { if(e.key==='Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e); } }} placeholder="Schreibe eine Nachricht..." class="w-full bg-transparent border-none px-2 py-1 min-h-11 resize-none focus:outline-none auto-grow text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500" disabled={isSending}></textarea>
            {/if}
            
            <div class="flex items-center justify-between border-t border-slate-200/60 dark:border-slate-700/60 pt-2 px-1 mt-1">
                <div class="flex items-center gap-1">
                    <input type="file" bind:this={fileInput} onchange={handleFile} class="hidden" />
                    <button type="button" onclick={() => fileInput.click()} class="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full border border-slate-200/80 dark:border-slate-700 cursor-pointer" title="Datei anhängen">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>
                    </button>
                    <DocumentScanButton
                        variant="icon"
                        label="Dokument scannen"
                        documentTitle="Chat_Dokument"
                        disabled={isSending || recorder.isRecording}
                        onScanComplete={(file) => { selectedFile = file; }}
                    />
                    {#if !recorder.isRecording && !msgText.trim() && !selectedFile}
                        <button type="button" onclick={() => recorder.startRecording()} disabled={isSending} class="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full border border-slate-200/80 dark:border-slate-700 disabled:opacity-50 cursor-pointer" title="Sprachnachricht aufnehmen">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>
                        </button>
                    {/if}
                </div>
                
                {#if recorder.isRecording}
                    <button type="button" aria-label="Aufnahme beenden" onclick={() => recorder.stopRecording()} class="p-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-full transition-all shadow-md active:scale-95 shrink-0 cursor-pointer" title="Aufnahme beenden & anhängen">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                    </button>
                {:else}
                    <button type="submit" aria-label="Senden" disabled={isSending || (!msgText.trim() && !selectedFile)} class="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:active:scale-100 shrink-0 cursor-pointer">
                        <svg class="w-4 h-4 translate-x-0.5" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"></path></svg>
                    </button>
                {/if}
            </div>
        </form>
    </div>
</div>

<NotificationSettingsModal bind:this={notificationModal} />
<FeedbackActionPromptModal bind:this={feedbackPromptModal} />