<script lang="ts">
    import { Trash2, Mail, Phone, MapPin, Sparkles, Paperclip, FolderDown, UserPlus, Check, X, RotateCcw } from "lucide-svelte";
    import { hapticFeedback } from "$lib/services/hapticFeedback";
    import AppointmentRequestHeroWorkflow from "./AppointmentRequestHeroWorkflow.svelte";

    interface Props {
        req: any;
        detectedClient: any;
        detectedContact: any;
        detectedLoc: string;
        detectedMode: string;
        linkedApps: any[];
        missingContact: string | null;
        clientEmail: string | null;
        isTransferring: boolean;
        isSyncing: boolean;
        isSummarizing: boolean;
        filteredAttachClients: any[];
        attachSearchQuery: string;
        attachDropdownOpen: { reqId: string, filename: string } | null;
        viewMode: 'ai' | 'original';
        onSetViewMode: (mode: 'ai' | 'original') => void;
        onLoadAiSummary: (force: boolean) => void;
        onStatusChange: (id: string, status: string) => void;
        onPropose: (id: string) => void;
        onCreateContact: (req: any) => void;
        onCreateClient: (req: any) => void;
        onReply: (req: any, status: string, email: string) => void;
        onDelete: (id: string) => void;
        onTransfer: (options: { openModal?: boolean, forceNew?: boolean }) => void;
        onSync: () => void;
        onOpenAppointment: (app: any) => void;
        onGoogleSearch: (type: 'doctor' | 'location') => void;
        onAssignClient: (client: any) => void;
        onPreviewAttachment: (req: any, filename: string) => void;
        onCopyToClient: (req: any, filename: string, clientId: string) => void;
    }

    let {
        req,
        detectedClient,
        detectedContact,
        detectedLoc,
        detectedMode,
        linkedApps,
        missingContact,
        clientEmail,
        isTransferring,
        isSyncing,
        isSummarizing,
        filteredAttachClients,
        attachSearchQuery = $bindable(),
        attachDropdownOpen = $bindable(),
        viewMode,
        onSetViewMode,
        onLoadAiSummary,
        onStatusChange,
        onPropose,
        onCreateContact,
        onCreateClient,
        onReply,
        onDelete,
        onTransfer,
        onSync,
        onOpenAppointment,
        onGoogleSearch,
        onAssignClient,
        onPreviewAttachment,
        onCopyToClient
    }: Props = $props();

    function formatContact(method: string) {
        switch(method) {
            case 'telephone': return '📞 Rückruf';
            case 'e-mail-address': return '✉️ E-Mail';
            case 'whatsapp': return '💬 WhatsApp';
            case 'mail-adress': return '📮 Postbrief';
            default: return '📞 Kontakt';
        }
    }
</script>

<div class="p-4 sm:p-6 pb-20 sm:pb-24 space-y-4 max-w-4xl w-full mx-auto animate-enter">
    <!-- 1. SENDER HEADER & TOP ACTIONS -->
    <div class="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs flex flex-col gap-4">
        <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                    <h3 class="font-black text-slate-900 dark:text-white text-lg sm:text-xl truncate">
                        {req.sender_name || 'Unbekannter Absender'}
                    </h3>
                    <span class="inline-flex items-center gap-1 text-xs font-bold text-sky-800 dark:text-sky-300 bg-sky-100 dark:bg-sky-950/70 px-3 py-1 rounded-full border border-sky-300 dark:border-sky-700">
                        {formatContact(req.contact_method)}
                    </span>
                    <span class="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full {req.status === 'accepted' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700' : req.status === 'denied' ? 'bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-700' : 'bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700'}">
                        {req.status === 'accepted' ? '✓ Angenommen' : req.status === 'denied' ? '✕ Abgelehnt' : '⏳ Offen'}
                    </span>
                </div>
                <p class="text-xs text-slate-400 dark:text-slate-500 mt-1.5">
                    Eingegangen am {new Date(req.created).toLocaleDateString('de-DE')} um {new Date(req.created).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr
                </p>
            </div>

            <div class="flex items-center gap-2 flex-wrap">
                {#if !detectedClient}
                    <button type="button" onclick={() => { hapticFeedback.success(); onCreateClient(req); }} class="min-h-11 px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 rounded-xl transition-all shadow-xs cursor-pointer touch-manipulation flex items-center gap-1.5">
                        <UserPlus class="w-4 h-4" />
                        <span>Als Klient anlegen</span>
                    </button>
                {/if}

                {#if req.status !== 'accepted'}
                    <button type="button" onclick={() => { hapticFeedback.success(); onStatusChange(req.id, 'accepted'); }} class="min-h-11 px-3 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 rounded-xl transition-all border border-emerald-200 dark:border-emerald-800 cursor-pointer touch-manipulation flex items-center gap-1">
                        <Check class="w-3.5 h-3.5" />
                        <span>Bestätigen</span>
                    </button>
                {/if}

                {#if req.status !== 'denied'}
                    <button type="button" onclick={() => { hapticFeedback.tap(); onStatusChange(req.id, 'denied'); }} class="min-h-11 px-3 py-2 text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 rounded-xl transition-all border border-rose-200 dark:border-rose-800 cursor-pointer touch-manipulation flex items-center gap-1">
                        <X class="w-3.5 h-3.5" />
                        <span>Ablehnen</span>
                    </button>
                {:else}
                    <button type="button" onclick={() => { hapticFeedback.tap(); onStatusChange(req.id, 'requested'); }} class="min-h-11 px-3 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 dark:bg-slate-800 rounded-xl transition-all border border-slate-200 dark:border-slate-700 cursor-pointer touch-manipulation flex items-center gap-1">
                        <RotateCcw class="w-3.5 h-3.5" />
                        <span>Zurücksetzen</span>
                    </button>
                {/if}

                {#if clientEmail}
                    <button type="button" onclick={() => { hapticFeedback.tap(); onReply(req, req.status, clientEmail); }} class="min-h-11 px-3.5 py-2 text-xs font-bold text-sky-700 dark:text-sky-300 bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/40 rounded-xl transition-all border border-sky-200 dark:border-sky-800 cursor-pointer touch-manipulation">✉️ Antworten</button>
                {/if}
                <button type="button" onclick={() => { hapticFeedback.warning(); onDelete(req.id); }} class="min-h-11 min-w-11 p-2 text-slate-400 hover:text-rose-600 rounded-xl flex items-center justify-center cursor-pointer touch-manipulation" title="Löschen">
                    <Trash2 class="w-4 h-4" />
                </button>
            </div>
        </div>

        <div class="flex flex-wrap items-center gap-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
            {#if clientEmail}
                <a href="mailto:{clientEmail}" class="inline-flex items-center gap-1 hover:text-indigo-600 font-medium"><Mail class="w-3.5 h-3.5 text-slate-400" /><span>{clientEmail}</span></a>
            {/if}
            {#if req.phone}
                <a href="tel:{req.phone}" class="inline-flex items-center gap-1 hover:text-indigo-600 font-medium"><Phone class="w-3.5 h-3.5 text-slate-400" /><span>{req.phone}</span></a>
            {/if}
            {#if req.street || req.zip_city}
                <span class="inline-flex items-center gap-1 text-slate-500"><MapPin class="w-3.5 h-3.5 text-slate-400" /><span>{[req.street, req.zip_city].filter(Boolean).join(', ')}</span></span>
            {/if}
        </div>
    </div>

    <!-- 2. GUIDED WORKFLOW -->
    <AppointmentRequestHeroWorkflow
        {req}
        {detectedClient}
        {detectedContact}
        {detectedLoc}
        {detectedMode}
        {linkedApps}
        {missingContact}
        {isTransferring}
        {isSyncing}
        {onTransfer}
        {onSync}
        {onOpenAppointment}
        {onGoogleSearch}
        {onAssignClient}
        {onCreateClient}
    />

    <!-- 3. CONTENT BOX: AI SUMMARY VS ORIGINAL -->
    <div class="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs flex flex-col gap-3">
        <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3.5">
            <div class="inline-flex p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-xs font-bold gap-1">
                <button type="button" onclick={() => { hapticFeedback.tap(); onSetViewMode('ai'); }} class="min-h-11 px-3.5 py-2 rounded-xl transition-all cursor-pointer touch-manipulation {viewMode === 'ai' ? 'bg-white dark:bg-slate-700 shadow-xs text-indigo-700 dark:text-indigo-300 font-extrabold' : 'text-slate-500 dark:text-slate-400'}">
                    ✨ Zusammenfassung
                </button>
                <button type="button" onclick={() => { hapticFeedback.tap(); onSetViewMode('original'); }} class="min-h-11 px-3.5 py-2 rounded-xl transition-all cursor-pointer touch-manipulation {viewMode === 'original' ? 'bg-white dark:bg-slate-700 shadow-xs text-slate-900 dark:text-white font-extrabold' : 'text-slate-500 dark:text-slate-400'}">
                    📄 Originaltext
                </button>
            </div>
            <button type="button" onclick={() => { hapticFeedback.tap(); onSetViewMode('ai'); onLoadAiSummary(true); }} disabled={isSummarizing} class="min-h-11 text-xs text-slate-700 dark:text-slate-200 hover:text-indigo-600 font-bold transition-all flex items-center gap-2 cursor-pointer bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs touch-manipulation">
                <Sparkles class="w-4 h-4 text-indigo-600 {isSummarizing ? 'animate-spin' : ''}" />
                <span>{req.ai_summary ? 'Neu berechnen' : 'Erstellen'}</span>
            </button>
        </div>
        {#if viewMode === 'ai'}
            {#if isSummarizing}
                <div class="bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 p-5 rounded-2xl text-xs text-indigo-800 dark:text-indigo-200 font-medium flex items-center gap-3 animate-pulse min-h-[56px]">
                    <span class="text-lg animate-spin">✨</span><span>Zusammenfassung wird erstellt...</span>
                </div>
            {:else if req.ai_summary}
                <div class="bg-indigo-50/20 dark:bg-slate-800/40 p-4 sm:p-5 rounded-2xl border border-indigo-100 dark:border-slate-700 text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed shadow-inner">
                    {req.ai_summary}
                </div>
            {:else}
                <div class="p-6 text-center text-xs text-slate-500">Noch keine Zusammenfassung vorhanden.</div>
            {/if}
        {:else}
            <div class="bg-slate-50 dark:bg-slate-800/60 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed shadow-inner">
                "{req.request_text || 'Kein Textinhalt vorhanden'}"
            </div>
        {/if}
    </div>

    <!-- 4. ATTACHMENTS -->
    {#if req.attachments && req.attachments.length > 0}
        <div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-xs flex flex-col gap-3">
            <h4 class="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5"><Paperclip class="w-3.5 h-3.5" /><span>Anhänge ({req.attachments.length})</span></h4>
            <div class="flex flex-wrap gap-2">
                {#each req.attachments as attachment}
                    <div class="relative flex items-center group">
                        <button type="button" onclick={() => { hapticFeedback.tap(); onPreviewAttachment(req, attachment); }} class="min-h-11 flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-l-xl text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer touch-manipulation">
                            <Paperclip class="w-3.5 h-3.5" /><span class="truncate max-w-44">{attachment}</span>
                        </button>
                        <button type="button" onclick={() => { hapticFeedback.tap(); attachDropdownOpen = (attachDropdownOpen?.reqId === req.id && attachDropdownOpen?.filename === attachment) ? null : { reqId: req.id, filename: attachment }; }} class="min-h-11 px-3 py-2 bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 border-y border-r border-slate-200 dark:border-slate-700 rounded-r-xl text-slate-400 hover:text-indigo-600 border-l-0 cursor-pointer touch-manipulation" title="In Klienten-Akte speichern">
                            <FolderDown class="w-3.5 h-3.5" />
                        </button>
                        {#if attachDropdownOpen?.reqId === req.id && attachDropdownOpen?.filename === attachment}
                            <button type="button" class="fixed inset-0 w-full h-full cursor-default z-30" onclick={() => attachDropdownOpen = null} tabindex="-1" aria-label="Schließen"></button>
                            <div class="absolute top-full left-0 mt-1.5 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-2xl z-40 overflow-hidden flex flex-col">
                                <div class="p-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                                    <input type="text" bind:value={attachSearchQuery} placeholder="Klient suchen..." class="w-full text-xs px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-hidden" />
                                </div>
                                <div class="max-h-40 overflow-y-auto p-1">
                                    {#each filteredAttachClients as c}
                                        <button type="button" onclick={() => { hapticFeedback.success(); onCopyToClient(req, attachment, c.id); }} class="w-full text-left px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-indigo-50 rounded-lg truncate cursor-pointer">{c.name_first} {c.name_last}</button>
                                    {/each}
                                </div>
                            </div>
                        {/if}
                    </div>
                {/each}
            </div>
        </div>
    {/if}
</div>
