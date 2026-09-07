<script lang="ts">
    import { pb } from '$lib/services/pocketbase';
    import { toastStore } from '$lib/services/toastService.svelte';
    import { confirmStore } from '$lib/services/confirmService.svelte';
    import { proposalService } from '$lib/services/improvementProposalService.svelte';
    import { 
        X, Sparkles, Copy, Check, Save, Send, AlertTriangle, 
        MessageSquare, User, Star, ArrowRight, ShieldAlert, CheckCircle2, RotateCw
    } from 'lucide-svelte';

    let dialog: HTMLDialogElement;
    let isOpen = $state(false);

    // Input item state
    let activeItem = $state<any>(null);
    let itemSource = $state<'feedback' | 'support_message' | 'inquiry' | 'chat' | 'proposal'>('feedback');
    let senderName = $state('');
    let senderEmail = $state('');
    let messageText = $state('');
    let ratingScore = $state<number | null>(null);
    let contextInfo = $state('');
    let adminInstruction = $state('');

    // Generation state
    let isGenerating = $state(false);
    let generatedResult = $state<{
        title: string;
        prompt: string;
        teamChatPrompt: string;
        draftReply: string;
        savedSystemPromptId?: string;
        usedModel: string;
    } | null>(null);

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

        if (source === 'feedback') {
            const nameFirst = item.name_first || (item.expand?.client?.name_first) || '';
            const nameLast = item.name_last || (item.expand?.client?.name_last) || '';
            senderName = [nameFirst, nameLast].filter(Boolean).join(' ') || 'Klient / Nutzer';
            senderEmail = item.expand?.client?.email || '';
            messageText = item.message || '';
            ratingScore = item.rating || null;
            selectedStatus = item.status === 'Gelesen' ? 'In Bearbeitung' : (item.status === 'Archieviert' || item.status === 'Archiviert') ? 'Gelöst' : (item.status || 'In Bearbeitung');

            const parts: string[] = [];
            if (item.expand?.client) parts.push(`Klient: ${item.expand.client.name_first} ${item.expand.client.name_last}`);
            if (item.expand?.appointment) parts.push(`Termin: ${new Date(item.expand.appointment.appointment).toLocaleDateString('de-DE')}`);
            contextInfo = parts.join(' | ');
        } else if (source === 'inquiry') {
            senderName = item.sender_name || 'Interessent';
            senderEmail = item.sender_email || '';
            messageText = item.raw_text || '';
            ratingScore = null;
            selectedStatus = item.status === 'new' ? 'Neu' : item.status === 'in_progress' ? 'In Bearbeitung' : 'Gelöst';
            contextInfo = `Urgency: ${item.urgency || 'normal'} | Telefon: ${item.sender_phone || '-'}`;
        } else if (source === 'chat') {
            const u = item.expand?.user;
            senderName = u ? `${u.name_first || ''} ${u.name_last || ''}`.trim() || u.username || 'Kollege / Chat' : (item.sender || 'Mitarbeiter');
            senderEmail = u?.email || item.email || '';
            messageText = item.text || item.message || '';
            ratingScore = messageText.includes('🚨 [BUG REPORT]') ? 3 : null;
            selectedStatus = item.status || 'In Bearbeitung';
            const isBug = messageText.includes('🚨 [BUG REPORT]');
            contextInfo = isBug ? '🚨 Bug Report aus ChatWidget' : (item.whispered ? '🤫 Geflüstert im Team-Chat' : '💬 Team-Chat Nachricht');
        } else if (source === 'proposal') {
            senderName = item.author_name || 'Superadmin';
            senderEmail = '';
            const desc = item.description || '';
            const sol = item.solution_concept ? `\n\nErwartetes Lösungskonzept:\n${item.solution_concept}` : '';
            messageText = `💡 [Vorschlag] ${item.title || 'Verbesserungsvorschlag'}\n\n${desc}${sol}`;
            ratingScore = item.priority === 'critical' ? 2 : item.priority === 'high' ? 4 : item.priority === 'medium' ? 7 : 9;
            selectedStatus = item.status === 'idea' ? 'Neu' : item.status === 'planned' ? 'In Bearbeitung' : item.status === 'in_progress' ? 'In Bearbeitung' : 'Gelöst';
            contextInfo = `Kategorie: ${item.category || 'System'} | Priorität: ${item.priority || 'normal'}${item.tags ? ` | Tags: ${item.tags}` : ''}`;
        } else {
            senderName = item.sender || 'Nutzer';
            senderEmail = item.email || '';
            messageText = item.body || item.message || '';
            ratingScore = null;
            selectedStatus = 'In Bearbeitung';
            contextInfo = item.subject || '';
        }

        isOpen = true;
        dialog?.showModal();
    }

    export function close() {
        isOpen = false;
        dialog?.close();
    }

    async function generatePrompt() {
        if (isGenerating) return; // Double-submission lock
        isGenerating = true;
        try {
            const microserviceUrl = import.meta.env.DEV ? 'http://localhost:3000' : '';
            const res = await fetch(`${microserviceUrl}/api/emails/admin/feedback-prompt/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': pb.authStore.token ? `Bearer ${pb.authStore.token}` : ''
                },
                body: JSON.stringify({
                    source: itemSource,
                    id: activeItem?.id,
                    sender: senderName,
                    message: messageText,
                    rating: ratingScore,
                    context: contextInfo,
                    adminInstruction: adminInstruction.trim(),
                    saveAsSystemPrompt: false
                })
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || `Server antwortete mit Status ${res.status}`);
            }

            const data = await res.json();
            generatedResult = {
                title: data.title || `Ausbesserung: ${senderName}`,
                prompt: data.prompt,
                teamChatPrompt: data.teamChatPrompt || '',
                draftReply: data.draftReply || '',
                savedSystemPromptId: data.savedSystemPromptId,
                usedModel: data.usedModel
            };
            teamChatEditableText = data.teamChatPrompt || '';
            replyEditableText = data.draftReply || '';
            toastStore.success('Ausbesserungsprompt für Gemini Code Assist (Antigravity) erfolgreich generiert! 🎯');
        } catch (err: any) {
            console.error('[Feedback Prompt Error]:', err);
            toastStore.error(`Generierung fehlgeschlagen: ${err.message}`);
        } finally {
            isGenerating = false;
        }
    }

    async function copyPromptToClipboard() {
        if (!generatedResult?.prompt) return;
        try {
            await navigator.clipboard.writeText(generatedResult.prompt);
            isPromptCopied = true;
            toastStore.success('Ausbesserungsprompt in Zwischenablage kopiert! 📋');
            setTimeout(() => { isPromptCopied = false; }, 3000);
        } catch {
            toastStore.error('Kopieren fehlgeschlagen.');
        }
    }

    async function copyTeamPromptToClipboard() {
        if (!teamChatEditableText) return;
        try {
            await navigator.clipboard.writeText(teamChatEditableText);
            isTeamPromptCopied = true;
            toastStore.success('Team Chat & Support Briefing in Zwischenablage kopiert! 📋');
            setTimeout(() => { isTeamPromptCopied = false; }, 3000);
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
            await pb.collection('live_chat').create({
                text: fullMessage,
                user: currentUser?.id || undefined
            }, { requestKey: null });

            toastStore.success('Erfolgreich im Team-Chat (live_chat) geteilt! 💬');
        } catch (err: any) {
            console.error('[Post to Chat Error]:', err);
            toastStore.error(`Konnte nicht im Team-Chat gepostet werden: ${err.message}`);
        } finally {
            isPostingToChat = false;
        }
    }

    async function copyReplyToClipboard() {
        if (!replyEditableText) return;
        try {
            await navigator.clipboard.writeText(replyEditableText);
            isReplyCopied = true;
            toastStore.success('Kundenantwort in Zwischenablage kopiert! 📋');
            setTimeout(() => { isReplyCopied = false; }, 3000);
        } catch {
            toastStore.error('Kopieren fehlgeschlagen.');
        }
    }

    async function saveAsSystemPromptRecord() {
        if (!generatedResult?.prompt || isSavingToPrompts) return;
        isSavingToPrompts = true;
        try {
            const currentYear = new Date().getFullYear();
            const d = new Date();
            d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
            const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
            const kwNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
            const kwIdentifier = `${currentYear}-W${String(kwNo).padStart(2, '0')}-FB-${activeItem?.id ? activeItem.id.substring(0, 5) : Date.now().toString().slice(-4)}`;

            const created = await pb.collection('system_prompts').create({
                title: generatedResult.title,
                calendar_week: kwIdentifier,
                prompt_content: generatedResult.prompt,
                status: 'open',
                feedback_count: 1,
                source_period_start: new Date().toISOString(),
                source_period_end: new Date().toISOString(),
                raw_summary: `Erstellt aus Einzel-Feedback von ${senderName}: "${messageText.substring(0, 150)}"`
            }, { requestKey: null });

            generatedResult.savedSystemPromptId = created.id;
            toastStore.success(`Als System-Prompt '${created.title}' gespeichert! 💾`);
        } catch (err: any) {
            console.error('[Save Prompt Error]:', err);
            toastStore.error(`Speichern fehlgeschlagen: ${err.message}`);
        } finally {
            isSavingToPrompts = false;
        }
    }

    async function handleStatusAndReplyUpdate() {
        if (isSendingReply) return;
        isSendingReply = true;
        try {
            if (itemSource === 'proposal' && activeItem?.id) {
                const propStatus = selectedStatus === 'Neu' ? 'idea' : (selectedStatus === 'In Bearbeitung' ? 'in_progress' : (selectedStatus === 'Gelöst' ? 'implemented' : 'idea'));
                await proposalService.updateProposalStatus(activeItem.id, propStatus);
            } else {
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
                            replyMessage: replyEditableText.trim() || undefined,
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
                                admin_reply: replyEditableText.trim() || undefined
                            }, { requestKey: null });
                        } catch (err: any) {
                            const fallbackStatus = selectedStatus === 'In Bearbeitung' ? 'Gelesen' : (selectedStatus === 'Gelöst' || selectedStatus === 'Archiviert' ? 'Archieviert' : 'Neu');
                            await pb.collection('feedbacks').update(activeItem.id, { status: fallbackStatus }, { requestKey: null });
                        }
                    } else if (itemSource === 'inquiry') {
                        const inqStatus = selectedStatus === 'Neu' ? 'new' : selectedStatus === 'In Bearbeitung' ? 'in_progress' : (selectedStatus === 'Gelöst' ? 'converted' : 'rejected');
                        await pb.collection('inquiries').update(activeItem.id, { status: inqStatus, draft_reply: replyEditableText.trim() || undefined }, { requestKey: null });
                    } else if (itemSource === 'chat') {
                        try {
                            await pb.collection('live_chat').update(activeItem.id, { status: selectedStatus }, { requestKey: null });
                        } catch (chatErr) {
                            console.warn('[Modal] Local PB live_chat update failed:', chatErr);
                        }
                    }
                }
            }

            toastStore.success('Status und Reaktion erfolgreich im System hinterlegt! ✅');
            close();
        } catch (err: any) {
            console.error('[React Error]:', err);
            toastStore.error(`Aktualisierung fehlgeschlagen: ${err.message}`);
        } finally {
            isSendingReply = false;
        }
    }
</script>

<dialog
    bind:this={dialog}
    class="p-0 bg-transparent backdrop:bg-black/60 backdrop:backdrop-blur-sm w-full max-w-4xl m-0 sm:m-auto fixed sm:relative inset-x-0 bottom-0 sm:bottom-auto max-h-[95vh] rounded-t-3xl sm:rounded-3xl border-none shadow-2xl z-[9999]"
    onclick={(e) => { if (e.target === dialog) close(); }}
>
    <div class="bg-white rounded-t-3xl sm:rounded-3xl w-full max-h-[92vh] flex flex-col relative overflow-hidden shadow-2xl border border-neutral-100">
        
        <!-- Header -->
        <div class="px-5 sm:px-8 py-4 sm:py-5 border-b border-neutral-100 flex items-center justify-between shrink-0 bg-white/95 backdrop-blur-md sticky top-0 z-20">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shadow-inner text-xl shrink-0">
                    🎯
                </div>
                <div>
                    <div class="flex items-center gap-2">
                        <h2 class="text-base sm:text-xl font-bold text-neutral-900 leading-tight">
                            Feedback analysieren & Ausbesserungsprompt erstellen
                        </h2>
                        <span class="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 shrink-0">
                            Superadmin
                        </span>
                    </div>
                    <p class="text-xs text-neutral-500 font-medium mt-0.5">
                        Synthetisiert einen spezifischen Ausbesserungsprompt für Gemini Code Assist (Agent) in Antigravity.
                    </p>
                </div>
            </div>
            <button
                type="button"
                aria-label="Schließen"
                onclick={close}
                class="w-9 h-9 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-full flex items-center justify-center transition-colors shrink-0"
            >
                <X class="w-4 h-4" />
            </button>
        </div>

        <!-- Scrollable Content -->
        <div class="flex-1 overflow-y-auto custom-scrollbar p-5 sm:p-8 space-y-6">
            
            <!-- Quelle & Kunden-Nachricht Kachel -->
            <div class="bg-neutral-50/80 rounded-2xl p-4 sm:p-5 border border-neutral-200/80 space-y-3">
                <div class="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200/60 pb-3">
                    <div class="flex items-center gap-2">
                        <span class="w-7 h-7 rounded-xl bg-white border border-neutral-200 text-neutral-700 flex items-center justify-center text-xs shadow-xs">
                            👤
                        </span>
                        <div>
                            <span class="text-xs font-bold text-neutral-900">{senderName}</span>
                            {#if senderEmail}
                                <span class="text-[11px] text-neutral-400 font-mono ml-1.5">({senderEmail})</span>
                            {/if}
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        {#if ratingScore}
                            <span class="text-xs font-bold px-2.5 py-1 rounded-lg border flex items-center gap-1 {ratingScore <= 5 ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}">
                                <span>{ratingScore <= 5 ? '⚠️' : '⭐'}</span>
                                {ratingScore} / 10
                            </span>
                        {/if}
                        <span class="text-xs font-semibold px-2.5 py-1 rounded-lg bg-white border border-neutral-200 text-neutral-600">
                            {itemSource === 'feedback' ? '⭐ Portal-Feedback' : itemSource === 'inquiry' ? '📬 Kundenanfrage' : itemSource === 'chat' ? '💬 Chat-Anfrage' : itemSource === 'proposal' ? '💡 Verbesserungsvorschlag' : 'Support-Nachricht'}
                        </span>
                    </div>
                </div>

                <!-- Text der Nachricht -->
                <div class="bg-white rounded-xl p-3.5 border border-neutral-200/60 shadow-xs">
                    <p class="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">Mängelbeschreibung / Text des Nutzers:</p>
                    <p class="text-sm text-neutral-800 font-medium whitespace-pre-wrap leading-relaxed">
                        "{messageText}"
                    </p>
                </div>

                {#if contextInfo}
                    <p class="text-[11px] text-neutral-400 font-medium flex items-center gap-1.5">
                        <span>ℹ️</span> {contextInfo}
                    </p>
                {/if}
            </div>

            <!-- Admin-Vorgaben Input -->
            <div class="space-y-1.5">
                <label for="admin-inst" class="block text-xs font-bold text-neutral-800 flex items-center justify-between">
                    <span>Zusätzliche Admin-Hinweise zur Behebung (optional):</span>
                    <span class="text-[10px] text-neutral-400 font-normal">z. B. "Bitte Svelte 5 Runes verwenden und Mobile Safe-Area beachten"</span>
                </label>
                <textarea
                    id="admin-inst"
                    bind:value={adminInstruction}
                    rows="2"
                    placeholder="Spezifische Vorgaben für die Code-Änderung (z. B. konkrete Datei, GoBD-Anforderung, Rollback-Vermeidung)..."
                    class="orga-input-clear text-xs py-2.5 px-3 leading-relaxed"
                    disabled={isGenerating}
                ></textarea>
            </div>

            <!-- Generierungs-Button -->
            <div class="flex items-center justify-between gap-4 pt-1">
                <button
                    type="button"
                    onclick={generatePrompt}
                    disabled={isGenerating || !messageText.trim()}
                    class="orga-button-primary bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/25 py-3 px-6 text-sm flex items-center gap-2 touch-manipulation active:scale-95 disabled:opacity-50"
                >
                    {#if isGenerating}
                        <RotateCw class="w-4 h-4 animate-spin" />
                        <span>KI analysiert Feedback & generiert Prompt...</span>
                    {:else}
                        <Sparkles class="w-4 h-4 text-amber-300" />
                        <span>{generatedResult ? 'Prompt neu generieren' : 'Ausbesserungsprompt generieren'}</span>
                    {/if}
                </button>

                {#if generatedResult}
                    <div class="text-[11px] text-neutral-400 flex items-center gap-1">
                        <span>⚡ Modell:</span>
                        <span class="font-mono text-neutral-600 font-bold">{generatedResult.usedModel}</span>
                    </div>
                {/if}
            </div>

            <!-- Generiertes Ergebnis (Tabs: Entwickler-Prompt vs Team Chat vs Kundenantwort) -->
            {#if generatedResult}
                <div class="border border-neutral-200 rounded-2xl overflow-hidden shadow-xs animate-enter">
                    <!-- Tab-Kopfzeile -->
                    <div class="bg-neutral-50 px-4 py-2.5 border-b border-neutral-200 flex flex-wrap items-center justify-between gap-2">
                        <div class="flex items-center gap-1">
                            <button
                                type="button"
                                onclick={() => activeTab = 'prompt'}
                                class="px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 {activeTab === 'prompt' ? 'bg-white text-indigo-700 shadow-xs border border-neutral-200' : 'text-neutral-500 hover:text-neutral-900'}"
                            >
                                <span>🛠️</span>
                                Ausbesserungsprompt (Antigravity Agent)
                            </button>
                            {#if generatedResult.teamChatPrompt}
                                <button
                                    type="button"
                                    onclick={() => activeTab = 'team'}
                                    class="px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 {activeTab === 'team' ? 'bg-white text-indigo-700 shadow-xs border border-neutral-200' : 'text-neutral-500 hover:text-neutral-900'}"
                                >
                                    <span>💬</span>
                                    Team Chat & Support
                                </button>
                            {/if}
                            {#if generatedResult.draftReply}
                                <button
                                    type="button"
                                    onclick={() => activeTab = 'reply'}
                                    class="px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 {activeTab === 'reply' ? 'bg-white text-indigo-700 shadow-xs border border-neutral-200' : 'text-neutral-500 hover:text-neutral-900'}"
                                >
                                    <span>✉️</span>
                                    Kundenantwort
                                </button>
                            {/if}
                        </div>

                        <!-- Schnelle Aktionen -->
                        <div class="flex items-center gap-1.5">
                            {#if activeTab === 'prompt'}
                                <button
                                    type="button"
                                    onclick={copyPromptToClipboard}
                                    class="px-2.5 py-1 text-xs font-bold rounded-lg border transition-colors flex items-center gap-1 min-h-[32px] {isPromptCopied ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'}"
                                    title="In Zwischenablage kopieren"
                                >
                                    {#if isPromptCopied}
                                        <Check class="w-3.5 h-3.5 text-emerald-600" />
                                        <span>Kopiert!</span>
                                    {:else}
                                        <Copy class="w-3.5 h-3.5 text-neutral-500" />
                                        <span>Kopieren</span>
                                    {/if}
                                </button>
                                <button
                                    type="button"
                                    onclick={saveAsSystemPromptRecord}
                                    disabled={isSavingToPrompts || !!generatedResult.savedSystemPromptId}
                                    class="px-2.5 py-1 text-xs font-bold rounded-lg border transition-colors flex items-center gap-1 min-h-[32px] {generatedResult.savedSystemPromptId ? 'bg-indigo-50 text-indigo-700 border-indigo-200 cursor-default' : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'}"
                                    title="Dauerhaft in System-Prompts ablegen"
                                >
                                    <Save class="w-3.5 h-3.5" />
                                    <span>{generatedResult.savedSystemPromptId ? 'Gespeichert ✓' : 'In Prompts sichern'}</span>
                                </button>
                            {:else if activeTab === 'team'}
                                <button
                                    type="button"
                                    onclick={copyTeamPromptToClipboard}
                                    class="px-2.5 py-1 text-xs font-bold rounded-lg border transition-colors flex items-center gap-1 min-h-[32px] {isTeamPromptCopied ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'}"
                                    title="Team-Briefing in Zwischenablage kopieren"
                                >
                                    {#if isTeamPromptCopied}
                                        <Check class="w-3.5 h-3.5 text-emerald-600" />
                                        <span>Kopiert!</span>
                                    {:else}
                                        <Copy class="w-3.5 h-3.5 text-neutral-500" />
                                        <span>Briefing kopieren</span>
                                    {/if}
                                </button>
                                <button
                                    type="button"
                                    onclick={postToTeamChat}
                                    disabled={isPostingToChat || !teamChatEditableText.trim()}
                                    class="px-2.5 py-1 text-xs font-bold rounded-lg border transition-colors flex items-center gap-1 min-h-[32px] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200 disabled:opacity-50 cursor-pointer"
                                    title="Direkt als Nachricht im OrgaFlow Team-Chat veröffentlichen"
                                >
                                    {#if isPostingToChat}
                                        <RotateCw class="w-3.5 h-3.5 animate-spin" />
                                        <span>Sendet...</span>
                                    {:else}
                                        <Send class="w-3.5 h-3.5 text-indigo-600" />
                                        <span>In Team-Chat posten</span>
                                    {/if}
                                </button>
                            {:else}
                                <button
                                    type="button"
                                    onclick={copyReplyToClipboard}
                                    class="px-2.5 py-1 text-xs font-bold rounded-lg border transition-colors flex items-center gap-1 min-h-[32px] {isReplyCopied ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'}"
                                >
                                    {#if isReplyCopied}
                                        <Check class="w-3.5 h-3.5 text-emerald-600" />
                                        <span>Kopiert!</span>
                                    {:else}
                                        <Copy class="w-3.5 h-3.5" />
                                        <span>Antwort kopieren</span>
                                    {/if}
                                </button>
                            {/if}
                        </div>
                    </div>

                    <!-- Tab-Inhalt -->
                    <div class="p-4 sm:p-5 bg-white">
                        {#if activeTab === 'prompt'}
                            <div class="space-y-3">
                                <div class="flex items-center justify-between text-xs text-neutral-400">
                                    <span class="font-bold text-neutral-700">{generatedResult.title}</span>
                                    <span>Bereit zum Einfügen in Gemini Code Assist in Antigravity</span>
                                </div>
                                <pre class="bg-neutral-900 text-neutral-100 rounded-xl p-4 text-xs font-mono whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto custom-scrollbar select-all">{generatedResult.prompt}</pre>
                            </div>
                        {:else if activeTab === 'team'}
                            <div class="space-y-3">
                                <div class="flex items-center justify-between text-xs">
                                    <label for="team-chat-text" class="font-bold text-neutral-800 flex items-center gap-1.5">
                                        <span>💬</span> Briefing & Handlungsanweisungen für Team Chat & Support:
                                    </label>
                                    <span class="text-neutral-400 text-[11px]">Für Außendienst vor Ort, Team-Chat & Kundensupport</span>
                                </div>
                                <textarea
                                    id="team-chat-text"
                                    bind:value={teamChatEditableText}
                                    rows="10"
                                    class="orga-input-clear text-xs font-sans py-3 px-3.5 leading-relaxed bg-white border border-neutral-200 rounded-xl"
                                    placeholder="Team Chat & Support Briefing wird generiert..."
                                ></textarea>
                            </div>
                        {:else}
                            <div class="space-y-3">
                                <label for="reply-text" class="block text-xs font-bold text-neutral-700">
                                    Antwortschreiben an Kunden (formell "Sie"):
                                </label>
                                <textarea
                                    id="reply-text"
                                    bind:value={replyEditableText}
                                    rows="8"
                                    class="orga-input-clear text-xs py-3 px-3.5 leading-relaxed"
                                    placeholder="Text der Kundenantwort..."
                                ></textarea>
                            </div>
                        {/if}
                    </div>
                </div>
            {/if}

            <!-- Status- & Reaktionsleiste -->
            <div class="bg-neutral-50 rounded-2xl p-4 sm:p-5 border border-neutral-200/80 space-y-4">
                <h3 class="text-xs font-bold text-neutral-800 uppercase tracking-wider">
                    Ticket-Status & Admin-Reaktion festlegen
                </h3>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <span class="block text-xs font-semibold text-neutral-600 mb-1.5">Bearbeitungsstatus:</span>
                        <div class="inline-flex p-1 bg-white rounded-xl border border-neutral-200 gap-1 w-full sm:w-auto">
                            <button
                                type="button"
                                onclick={() => selectedStatus = 'Neu'}
                                class="flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer {selectedStatus === 'Neu' ? 'bg-amber-500 text-white shadow-xs' : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'}"
                            >
                                Neu
                            </button>
                            <button
                                type="button"
                                onclick={() => selectedStatus = 'In Bearbeitung'}
                                class="flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer {selectedStatus === 'In Bearbeitung' ? 'bg-indigo-600 text-white shadow-xs' : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'}"
                            >
                                In Arbeit
                            </button>
                            <button
                                type="button"
                                onclick={() => selectedStatus = 'Gelöst'}
                                class="flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer {selectedStatus === 'Gelöst' ? 'bg-emerald-600 text-white shadow-xs' : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'}"
                            >
                                ✓ Gelöst
                            </button>
                            <button
                                type="button"
                                onclick={() => selectedStatus = 'Archiviert'}
                                class="flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer {selectedStatus === 'Archiviert' ? 'bg-neutral-700 text-white shadow-xs' : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'}"
                            >
                                Archiviert
                            </button>
                        </div>
                    </div>

                    <div class="flex items-end">
                        <button
                            type="button"
                            onclick={handleStatusAndReplyUpdate}
                            disabled={isSendingReply}
                            class="orga-button-primary bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20 w-full py-2.5 text-xs flex items-center justify-center gap-2 touch-manipulation active:scale-95"
                        >
                            {#if isSendingReply}
                                <RotateCw class="w-3.5 h-3.5 animate-spin" />
                                <span>Speichert...</span>
                            {:else}
                                <CheckCircle2 class="w-3.5 h-3.5" />
                                <span>Status speichern {#if senderEmail && replyEditableText}& Antwort senden{/if}</span>
                            {/if}
                        </button>
                    </div>
                </div>
            </div>

        </div>

        <!-- Footer -->
        <div class="px-5 sm:px-8 py-3.5 border-t border-neutral-100 bg-neutral-50 flex items-center justify-between shrink-0">
            <button
                type="button"
                onclick={close}
                class="orga-button-ghost py-2 px-4 text-xs font-medium text-neutral-600"
            >
                Schließen
            </button>

            {#if activeTab === 'prompt' && generatedResult?.prompt}
                <button
                    type="button"
                    onclick={copyPromptToClipboard}
                    class="orga-button-primary py-2 px-5 text-xs font-bold flex items-center gap-1.5 shadow-indigo-600/20 cursor-pointer"
                >
                    <Copy class="w-3.5 h-3.5" />
                    <span>Prompt kopieren & Entwickler beauftragen</span>
                </button>
            {:else if activeTab === 'team' && teamChatEditableText}
                <div class="flex items-center gap-2">
                    <button
                        type="button"
                        onclick={copyTeamPromptToClipboard}
                        class="orga-button-secondary py-2 px-4 text-xs font-bold flex items-center gap-1.5 bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-50 cursor-pointer"
                    >
                        <Copy class="w-3.5 h-3.5" />
                        <span>Briefing kopieren</span>
                    </button>
                    <button
                        type="button"
                        onclick={postToTeamChat}
                        disabled={isPostingToChat}
                        class="orga-button-primary py-2 px-5 text-xs font-bold flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20 cursor-pointer"
                    >
                        {#if isPostingToChat}
                            <RotateCw class="w-3.5 h-3.5 animate-spin" />
                            <span>Sendet...</span>
                        {:else}
                            <Send class="w-3.5 h-3.5 text-white" />
                            <span>In Team-Chat posten</span>
                        {/if}
                    </button>
                </div>
            {:else if activeTab === 'reply' && replyEditableText}
                <button
                    type="button"
                    onclick={copyReplyToClipboard}
                    class="orga-button-primary py-2 px-5 text-xs font-bold flex items-center gap-1.5 shadow-indigo-600/20 cursor-pointer"
                >
                    <Copy class="w-3.5 h-3.5" />
                    <span>Kundenantwort kopieren</span>
                </button>
            {/if}
        </div>
    </div>
</dialog>
