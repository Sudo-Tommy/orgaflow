<script lang="ts">
    import { useChat } from '$lib/services/chatService.svelte';
    import { pb } from '$lib/services/pocketbase';
    import { onMount, onDestroy, tick } from 'svelte';
    import { toastStore } from "$lib/services/toastService.svelte";
    import { confirmStore } from "$lib/services/confirmService.svelte";
    import NotificationSettingsModal from "$lib/components/NotificationSettingsModal.svelte";
    import FeedbackActionPromptModal from "$lib/components/admin/FeedbackActionPromptModal.svelte";

    const chat = useChat();
    let chatContainer: HTMLElement;
    let fileInput: HTMLInputElement;

    // UI State
    let msgText = $state('');
    let selectedFile: File | null = $state(null);
    let whisperTo = $state('');
    let isBug = $state(false);
    let isSending = $state(false);
    
    let isRecording = $state(false);
    let mediaRecorder: MediaRecorder | null = $state(null);
    let audioChunks: Blob[] = [];
    let recordingTime = $state(0);
    let recordingInterval: any;

    // Reaktive Variablen-Bindung für Svelte 5
    let notificationModal: any = $state();
    let feedbackPromptModal: any = $state();
    let filterOnlyInquiries = $state(false);

    // Filterbare Nachrichten (Alle vs. Anfragen & Bug-Reports)
    const displayedMessages = $derived(
        filterOnlyInquiries
            ? chat.messages.filter(m => {
                const text = (m.text || '').toLowerCase();
                return (
                    m.text?.includes('🚨 [BUG REPORT]') ||
                    text.includes('?') ||
                    text.includes('bug') ||
                    text.includes('fehler') ||
                    text.includes('problem') ||
                    text.includes('hilfe') ||
                    text.includes('bitte') ||
                    text.includes('frage')
                );
            })
            : chat.messages
    );

    // Re-Init Funktion: Erkennt Standby-Aufwachen oder Netzwechsel
    function handleResume() {
        if (document.visibilityState === 'visible' && navigator.onLine) {
            chat.init(); // Läd die Historie lautlos neu, um Lücken zu füllen
        }
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
        chat.cleanup(); 
    });

    // Auto-Scroll nach unten, wenn eine neue Nachricht kommt
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
            msgText = '';
            selectedFile = null;
            isBug = false;
            whisperTo = '';
            if (fileInput) fileInput.value = '';
        } finally {
            isSending = false;
        }
    }

    function handleFile(e: Event) {
        const target = e.target as HTMLInputElement;
        if (target.files && target.files.length > 0) {
            selectedFile = target.files[0];
        }
    }

    async function startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunks.push(e.data);
            };

            mediaRecorder.onstop = () => {
                if (audioChunks.length > 0) {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                    const audioFile = new File([audioBlob], `Sprachnachricht_${new Date().getTime()}.webm`, { type: 'audio/webm' });
                    selectedFile = audioFile;
                }
            };

            mediaRecorder.start();
            isRecording = true;
            recordingTime = 0;
            recordingInterval = setInterval(() => recordingTime++, 1000);
        } catch (err) {
            console.error("Mikrofon-Zugriff verweigert", err);
            toastStore.error("Konnte nicht auf das Mikrofon zugreifen. Bitte überprüfe die Browser-Berechtigungen.");
        }
    }

    function stopRecording() {
        if (mediaRecorder && isRecording) {
            mediaRecorder.stop();
            isRecording = false;
            clearInterval(recordingInterval);
            mediaRecorder.stream.getTracks().forEach(track => track.stop());
        }
    }

    function cancelRecording() {
        if (mediaRecorder && isRecording) {
            mediaRecorder.onstop = null; // Verhindert das Speichern der Datei
            mediaRecorder.stop();
            isRecording = false;
            clearInterval(recordingInterval);
            mediaRecorder.stream.getTracks().forEach(track => track.stop());
            audioChunks = [];
        }
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

    let formattedRecordingTime = $derived(`${Math.floor(recordingTime / 60)}:${(recordingTime % 60).toString().padStart(2, '0')}`);

    // Intelligente Zeitformatierung (Heute, Gestern, Wochentag oder Datum)
    function formatMessageTime(dateStr: string) {
        const d = new Date(dateStr);
        const now = new Date();
        const timeStr = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

        // Mitternacht vergleichen für saubere Tagesdifferenz
        const dayD = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        const dayNow = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const diffDays = Math.round((dayNow.getTime() - dayD.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return `Heute ${timeStr}`;
        if (diffDays === 1) return `Gestern ${timeStr}`;
        if (diffDays < 7) {
            const days = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
            return `${days[d.getDay()]} ${timeStr}`;
        }
        return `${d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })} ${timeStr}`;
    }
</script>

<div class="orga-card-white flex flex-col overflow-hidden border border-neutral-200 relative" style="height: 600px;">
    <!-- Header -->
    <div class="bg-brand-800 text-white p-4 flex items-center justify-between z-10 shadow-md">
        <div class="flex items-center gap-4">
            <div class="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xl">💬</div>
            <div>
                <h2 class="font-bold text-lg leading-tight">Team Chat & Support</h2>
                <p class="text-xs text-brand-100 flex items-center gap-1">
                    <span class="w-2 h-2 rounded-full bg-emerald-400"></span> System online
                </p>
            </div>
        </div>
        <div class="flex items-center gap-2">
            {#if chat.isAdmin}
                <a 
                    href="/admin/system-prompts?tab=feedbacks" 
                    class="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 rounded-xl transition-colors text-xs font-bold flex items-center gap-1.5 text-white"
                    title="Zur Superadmin Prompt-Verwaltung wechseln"
                >
                    <span>🎯</span>
                    <span class="hidden sm:inline">Prompts</span>
                </a>
            {/if}
            <button type="button" onclick={() => notificationModal?.open?.()} class="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors text-xl" title="Benachrichtigungen verwalten">🔔</button>
        </div>
    </div>

    <!-- Sub-Header / Filter-Option für Anfragen & Bug-Reports -->
    <div class="bg-brand-900/30 px-4 py-1.5 flex items-center justify-between text-[11px] border-b border-brand-700/40">
        <span class="text-brand-100 font-medium">
            {#if filterOnlyInquiries}
                🔍 Nur Anfragen & Bugs ({displayedMessages.length})
            {:else}
                💬 Alle Chat-Nachrichten ({chat.messages.length})
            {/if}
        </span>
        <button 
            type="button" 
            onclick={() => filterOnlyInquiries = !filterOnlyInquiries}
            class="px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer text-xs {filterOnlyInquiries ? 'bg-amber-400 text-neutral-900 shadow-xs' : 'bg-white/10 hover:bg-white/20 text-white'}"
            title="Chat-Nachrichten nach Anfragen und Bug-Reports filtern"
        >
            {filterOnlyInquiries ? '✓ Nur Anfragen/Bugs' : 'Filter: Alle'}
        </button>
    </div>

    <!-- Chat History / Messages -->
    <div class="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-brand-50" bind:this={chatContainer}>
        {#if displayedMessages.length === 0}
            <div class="flex flex-col items-center justify-center h-full text-center p-6 text-neutral-400 space-y-2">
                <span class="text-2xl">🔍</span>
                <p class="text-xs font-semibold text-neutral-600">Keine Anfragen oder Bug-Reports gefunden</p>
                {#if filterOnlyInquiries}
                    <button 
                        type="button" 
                        onclick={() => filterOnlyInquiries = false} 
                        class="text-xs text-brand-600 hover:underline font-bold cursor-pointer"
                    >
                        Alle Nachrichten anzeigen
                    </button>
                {/if}
            </div>
        {/if}

        {#each displayedMessages as msg}
            {@const rawUser = typeof msg.user === 'string' && msg.user.startsWith('[') ? JSON.parse(msg.user) : msg.user}
            {@const senderId = Array.isArray(rawUser) ? rawUser[0] : rawUser}
            {@const isMe = senderId === chat.currentUserId}
            {@const isBugReport = msg.text ? msg.text.includes('🚨 [BUG REPORT]') : false}
            
            {@const rawWhisper = typeof msg.whispered_user === 'string' && msg.whispered_user.startsWith('[') ? JSON.parse(msg.whispered_user) : msg.whispered_user}
            {@const whisperId = Array.isArray(rawWhisper) ? rawWhisper[0] : rawWhisper}

            <!-- Fallback auf chat.users (falls realtime expand fehlt) oder auf "Support" (falls Absender ein Superuser ist) -->
            {@const expandUser = (Array.isArray(msg.expand?.user) ? msg.expand.user[0] : msg.expand?.user) || chat.users.find(u => u.id === senderId) || { name_first: 'System/Support' }}
            {@const expandWhisper = (Array.isArray(msg.expand?.whispered_user) ? msg.expand.whispered_user[0] : msg.expand?.whispered_user) || chat.users.find(u => u.id === whisperId)}

            <div class="flex flex-col {isMe ? 'items-end' : 'items-start'} animate-enter relative group/msg">
                <!-- Flüstern Hinweis -->
                {#if msg.whispered}
                    <span class="text-[10px] font-bold text-neutral-500 bg-neutral-200/60 px-2 py-0.5 rounded-full mb-1">
                        🤫 Geflüstert {isMe ? `an ${expandWhisper?.name_first || 'Support'}` : 'an dich'}
                    </span>
                {/if}
                
                <!-- Bubble -->
                <div class="max-w-[85%] md:max-w-[70%] rounded-2xl p-3 shadow-sm relative
                            {isMe ? 'bg-brand-200 text-brand-950 rounded-tr-none' : 'bg-white text-neutral-900 rounded-tl-none'}
                            {isBugReport ? 'bg-rose-100! border! border-rose-300!' : ''}">
                    
                    <!-- Action Buttons on Hover (Admin & Delete) -->
                    <div class="absolute {isMe ? '-left-8' : '-right-8'} top-1 flex flex-col gap-1 opacity-0 group-hover/msg:opacity-100 transition-all z-10">
                        {#if chat.isAdmin}
                            <button 
                                type="button"
                                onclick={() => feedbackPromptModal?.open(msg, 'chat')} 
                                class="p-1.5 text-indigo-600 bg-white border border-indigo-200 rounded-full hover:bg-indigo-600 hover:text-white shadow-sm transition-colors cursor-pointer" 
                                title="🎯 Prompt aus dieser Nachricht erstellen"
                            >
                                <span class="text-xs leading-none">🎯</span>
                            </button>
                        {/if}

                        {#if isMe || chat.isAdmin}
                            <button 
                                type="button"
                                onclick={() => handleDelete(msg.id)} 
                                class="p-1.5 text-rose-400 bg-white border border-rose-200 rounded-full hover:bg-rose-500 hover:text-white shadow-sm transition-colors cursor-pointer" 
                                title="Nachricht löschen"
                            >
                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                            </button>
                        {/if}
                    </div>

                    <!-- Absender Name (nur bei anderen) -->
                    {#if !isMe}
                        <div class="text-xs font-bold text-emerald-700 mb-1">{expandUser?.name_first || 'System/Support'}</div>
                    {/if}

                    <!-- Dateianhang -->
                    {#if msg.file && msg.file.length > 0}
                        {@const fileName = Array.isArray(msg.file) ? msg.file[0] : msg.file}
                        {#if fileName.match(/\.(webm|mp3|wav|ogg|m4a)$/i)}
                            <div class="mb-2 p-1 bg-black/5 rounded-xl border border-black/10 min-w-50">
                                <!-- svelte-ignore a11y_media_has_caption -->
                            <audio controls src={pb.files.getURL(msg, fileName)} class="w-full max-w-60 h-10"></audio>
                            </div>
                        {:else}
                            <div class="mb-2 p-2 bg-black/5 rounded-xl border border-black/10 flex items-center gap-2">
                                <span class="text-xl">📎</span>
                            <a href={pb.files.getURL(msg, fileName)} target="_blank" class="text-sm font-bold text-blue-600 hover:underline truncate">Anhang ansehen</a>
                            </div>
                        {/if}
                    {/if}

                    <!-- Text -->
                    {#if msg.text}
                        <div class="text-sm leading-relaxed whitespace-pre-wrap word-break">{msg.text.replace('🚨 [BUG REPORT]\n\n', '')}</div>
                    {/if}
                    
                    <!-- Zeitstempel -->
                    <div class="text-[10px] text-neutral-400 text-right mt-1.5 font-medium select-none flex items-center justify-end gap-1">
                        {formatMessageTime(msg.created)}
                        {#if isMe}
                            <!-- Blaue Haken (Gelesen-Bestätigung) -->
                            <svg class="w-4 h-4 text-brand-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M18 6L7 17l-5-5"/><path d="M22 10l-7.5 7.5L13 16"/>
                            </svg>
                        {/if}
                    </div>
                </div>
            </div>
        {/each}
    </div>

    <!-- Controls & Input Area -->
    <div class="bg-neutral-100 flex flex-col p-3 z-10 border-t border-neutral-200">
        
        <!-- Obere Kontroll-Leiste (Optionen) -->
        <div class="flex items-center gap-3 mb-3 px-1">
         <button type="button" onclick={() => isBug = !isBug} class="text-xs font-bold px-4 sm:px-3 py-3 sm:py-1.5 rounded-full transition-colors border shrink-0 whitespace-nowrap {isBug ? 'bg-rose-500 text-white border-rose-600 shadow-inner' : 'bg-white text-neutral-600 border-neutral-300 hover:bg-neutral-100'}">
            🚨 Bug melden
            </button>
            
            <select bind:value={whisperTo} class="text-xs font-bold px-4 sm:px-3 py-3 sm:py-1.5 rounded-full border border-neutral-300 bg-white text-neutral-600 focus:outline-none focus:border-brand-500 cursor-pointer w-full">
                <option value="">Offen für alle</option>
                {#each chat.users as u}
                    {#if u.id !== chat.currentUserId}
                    <option value={u.id}>🤫 Flüstern an {u.name_first} {u.name_last}</option>
                    {/if}
                {/each}
            </select>
         </div>

        <!-- Eingabeleiste -->
        <form onsubmit={handleSend} class="flex flex-col bg-white rounded-2xl md:rounded-3xl border border-neutral-200 shadow-sm p-2 transition-colors focus-within:border-brand-500">
            
            <!-- Dateivorschau (wird oberhalb des Textfelds eingeklinkt, wenn vorhanden) -->
            {#if selectedFile && !isRecording}
                <div class="bg-neutral-50 text-neutral-800 text-xs font-bold px-3 py-2 rounded-xl border border-neutral-100 mb-2 max-w-full flex items-center justify-between gap-2 animate-enter">
                    <span class="truncate">{selectedFile.type.startsWith('audio/') ? '🎤 Sprachnachricht' : `📎 ${selectedFile.name}`}</span>
                    <button type="button" onclick={() => selectedFile = null} class="text-rose-500 hover:text-rose-700 bg-white rounded-full p-1 shadow-sm">✕</button>
                </div>
            {/if}

            {#if isRecording}
                <div class="flex items-center justify-between bg-rose-50 rounded-2xl px-4 py-3 mb-2 animate-enter border border-rose-100">
                    <div class="flex items-center gap-3">
                        <div class="w-3 h-3 bg-rose-500 rounded-full animate-pulse"></div>
                        <span class="text-rose-700 font-bold">{formattedRecordingTime}</span>
                    </div>
                    <button type="button" onclick={cancelRecording} class="text-xs font-bold text-rose-600 hover:text-rose-800 transition-colors">Abbrechen</button>
                </div>
            {:else}
                <textarea bind:value={msgText} onkeydown={(e) => { if(e.key==='Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e); } }} placeholder="Schreibe eine Nachricht..." class="w-full bg-transparent border-none px-2 py-1 min-h-11 max-h-30 resize-none focus:outline-none custom-scrollbar" disabled={isSending}></textarea>
            {/if}
            
            <!-- Steuerleiste unter dem Textfeld -->
            <div class="flex items-center justify-between border-t border-neutral-100 pt-2 px-1 mt-1">
                <div class="flex items-center gap-1">
                    <input type="file" bind:this={fileInput} onchange={handleFile} class="hidden" />
                    <button type="button" onclick={() => fileInput.click()} class="p-2 text-neutral-500 hover:text-neutral-800 transition-colors bg-neutral-50 hover:bg-neutral-100 rounded-full" title="Datei anhängen">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>
                    </button>
                    {#if !isRecording && !msgText.trim() && !selectedFile}
                        <button type="button" onclick={startRecording} disabled={isSending} class="p-2 text-neutral-500 hover:text-neutral-800 transition-colors bg-neutral-50 hover:bg-neutral-100 rounded-full disabled:opacity-50" title="Sprachnachricht aufnehmen">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>
                        </button>
                    {/if}
                </div>
                
                {#if isRecording}
                    <button type="button" aria-label="Aufnahme beenden" onclick={stopRecording} class="p-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-full transition-all shadow-md active:scale-95 shrink-0" title="Aufnahme beenden & anhängen">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                    </button>
                {:else}
                    <button type="submit" aria-label="Senden" disabled={isSending || (!msgText.trim() && !selectedFile)} class="p-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-full transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:active:scale-100 shrink-0">
                        <svg class="w-4 h-4 translate-x-0.5" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"></path></svg>
                    </button>
                {/if}
            </div>
         </form>
    </div>
</div>

<NotificationSettingsModal bind:this={notificationModal} />
<FeedbackActionPromptModal bind:this={feedbackPromptModal} />