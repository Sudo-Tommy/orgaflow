<script lang="ts">
    import { User, Calendar, MapPin } from "lucide-svelte";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import { hapticFeedback } from "$lib/services/hapticFeedback";
    import { formatDisplayDate, formatRequestTime } from "./appointmentRequestsHelper";

    interface Props {
        req: any;
        detectedClient: any;
        detectedContact: any;
        detectedLoc: string;
        detectedMode: string;
        linkedApps: any[];
        missingContact: string | null;
        isTransferring: boolean;
        isSyncing: boolean;
        onTransfer: (options: { openModal?: boolean, forceNew?: boolean }) => void;
        onSync: () => void;
        onOpenAppointment: (app: any) => void;
        onGoogleSearch: (type: 'doctor' | 'location') => void;
        onAssignClient: (client: any) => void;
        onCreateClient?: (req: any) => void;
    }

    let {
        req, detectedClient, detectedContact, detectedLoc, detectedMode,
        linkedApps, missingContact, isTransferring, isSyncing,
        onTransfer, onSync, onOpenAppointment, onGoogleSearch,
        onAssignClient, onCreateClient
    }: Props = $props();

    let activeClientPickerReqId = $state<string | null>(null);
    let clientPickerSearch = $state('');
</script>

<div class="rounded-3xl border-2 border-indigo-200 dark:border-indigo-800/80 bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/40 p-4 sm:p-5 shadow-sm flex flex-col gap-3.5">
    <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">⚡</div>
            <div>
                <h4 class="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Geführte Kalender-Übernahme</h4>
                <p class="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Automatisch erkannte Termindaten prüfen &amp; per 1-Click in OrgaFlow übernehmen</p>
            </div>
        </div>

        {#if linkedApps.length > 0}
            <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 text-xs font-bold shadow-2xs">
                ✅ Termin bereits im Kalender
            </span>
        {/if}
    </div>

    <!-- Recognized Data Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        <!-- Klient Card / Selector -->
        <div class="p-3.5 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between gap-2 shadow-2xs relative">
            <span class="text-[10px] font-extrabold uppercase text-slate-400 dark:text-slate-500 flex items-center gap-1">
                <User class="w-3.5 h-3.5 text-indigo-500" />
                Klient / Akte:
            </span>
            <div class="flex flex-col gap-2">
                {#if detectedClient}
                    <div class="min-w-0">
                        <p class="text-xs font-bold text-slate-900 dark:text-white truncate">{detectedClient.name_first} {detectedClient.name_last}</p>
                        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">✓ In Datenbank</span>
                    </div>
                {:else}
                    <div class="min-w-0">
                        <p class="text-xs font-bold text-amber-800 dark:text-amber-200 truncate">Neukunde</p>
                        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">Neuanlage</span>
                    </div>
                {/if}

                <div class="flex items-center gap-1.5 flex-wrap pt-0.5">
                    {#if !detectedClient && onCreateClient}
                        <button 
                            type="button" 
                            onclick={() => { hapticFeedback.success(); onCreateClient(req); }}
                            class="px-2.5 py-1.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-all cursor-pointer active:scale-95 flex items-center gap-1 shadow-xs touch-manipulation"
                            title="Jetzt Klienten anlegen"
                        >
                            <span>👤</span> Anlegen
                        </button>
                    {/if}
                    <button 
                        type="button" 
                        onclick={() => { hapticFeedback.tap(); activeClientPickerReqId = activeClientPickerReqId === req.id ? null : req.id; clientPickerSearch = ''; }} 
                        class="px-2.5 py-1.5 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer shrink-0 active:scale-95 flex items-center gap-1 touch-manipulation"
                        title="Anderen Klienten zuweisen"
                    >
                        <span>✏️</span> Ändern
                    </button>
                </div>
            </div>

            <!-- Klienten-Auswahl Popup -->
            {#if activeClientPickerReqId === req.id}
                <div class="absolute left-0 top-full mt-1.5 w-72 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-2.5 z-50 animate-in fade-in zoom-in-95">
                    <div class="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-100 dark:border-slate-800">
                        <span class="font-bold text-slate-800 dark:text-slate-200 text-xs">Klient zuweisen</span>
                        <button type="button" onclick={() => activeClientPickerReqId = null} class="min-h-8 min-w-8 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs cursor-pointer">✕</button>
                    </div>
                    <input 
                        type="text" 
                        bind:value={clientPickerSearch} 
                        placeholder="Klient suchen..." 
                        class="w-full px-2.5 py-1.5 text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg mb-1.5 outline-hidden"
                    />
                    <div class="max-h-48 overflow-y-auto space-y-1">
                        {#each (orgaStore.clients?.data || []).filter((c: any) => {
                            if (!clientPickerSearch) return true;
                            const q = clientPickerSearch.toLowerCase();
                            return (c.name_first || '').toLowerCase().includes(q) || (c.name_last || '').toLowerCase().includes(q);
                        }).sort((a: any, b: any) => `${a.name_last || ''} ${a.name_first || ''}`.localeCompare(`${b.name_last || ''} ${b.name_first || ''}`, 'de', { sensitivity: 'base' })).slice(0, 20) as clientOption}
                            <button 
                                type="button" 
                                onclick={() => { hapticFeedback.tap(); onAssignClient(clientOption); activeClientPickerReqId = null; }} 
                                class="w-full text-left px-3 py-2 text-xs rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-700 dark:hover:text-indigo-300 text-slate-700 dark:text-slate-300 transition-colors flex items-center justify-between cursor-pointer touch-manipulation"
                            >
                                <span class="font-medium">{clientOption.name_first} {clientOption.name_last}</span>
                                {#if detectedClient?.id === clientOption.id}
                                    <span class="text-emerald-600 dark:text-emerald-400 text-xs font-bold">✓</span>
                                {/if}
                            </button>
                        {/each}
                    </div>
                </div>
            {/if}
        </div>

        <!-- Termin & Uhrzeit Card -->
        <div class="p-3.5 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between gap-1 shadow-2xs">
            <span class="text-[10px] font-extrabold uppercase text-slate-400 dark:text-slate-500 flex items-center gap-1">
                <Calendar class="w-3.5 h-3.5 text-indigo-500" />
                Wunschtermin:
            </span>
            <div class="min-w-0">
                {#if req.date || req.time || formatRequestTime(req)}
                    <p class="text-xs font-bold text-slate-900 dark:text-white">
                        {req.date ? formatDisplayDate(req.date) : 'Datum n. Vereinbarung'}
                    </p>
                    <span class="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                        {formatRequestTime(req) || 'Standard: 10:00 Uhr'}
                    </span>
                {:else}
                    <p class="text-xs font-bold text-slate-500 italic">Kein konkreter Zeitpunkt</p>
                    <span class="text-[10px] text-slate-400">Wird auf heute 10:00 Uhr gesetzt</span>
                {/if}
            </div>
        </div>

        <!-- Ort / Kontakt Card -->
        <div class="p-3.5 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between gap-1 shadow-2xs">
            <span class="text-[10px] font-extrabold uppercase text-slate-400 dark:text-slate-500 flex items-center gap-1">
                <MapPin class="w-3.5 h-3.5 text-indigo-500" />
                Ort &amp; Durchführung:
            </span>
            <div class="min-w-0">
                {#if detectedContact}
                    <p class="text-xs font-bold text-indigo-700 dark:text-indigo-300 truncate">
                        🩺 {detectedContact.company_name || `${detectedContact.name_first || ''} ${detectedContact.name_last || ''}`.trim()}
                    </p>
                {:else if missingContact}
                    <button 
                        type="button" 
                        onclick={() => { hapticFeedback.tap(); onGoogleSearch('doctor'); }}
                        class="text-left text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer truncate"
                        title="Über Google ermitteln"
                    >
                        🌐 Google: "{missingContact}"
                    </button>
                {/if}

                {#if detectedLoc}
                    <span class="text-[11px] text-slate-600 dark:text-slate-300 break-words leading-tight block" title={detectedLoc}>
                        📍 {detectedLoc}
                    </span>
                {:else if detectedMode}
                    <span class="text-[11px] text-purple-600 dark:text-purple-400 font-semibold block">
                        📞 {detectedMode}
                    </span>
                {:else}
                    <span class="text-[10px] text-slate-400 italic block">Adresse aus Klientenakte</span>
                {/if}
            </div>
        </div>
    </div>

    <!-- Big Action Buttons -->
    <div class="flex flex-wrap items-center gap-2.5 pt-1">
        {#if linkedApps.length > 0}
            <button 
                type="button"
                disabled={isSyncing}
                onclick={() => { hapticFeedback.tap(); onSync(); }}
                class="flex-1 sm:flex-none px-4 py-2.5 text-xs font-bold text-amber-900 dark:text-amber-200 bg-amber-100 dark:bg-amber-950/60 hover:bg-amber-200 active:scale-95 rounded-xl transition-all border border-amber-300 dark:border-amber-700 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 touch-manipulation"
            >
                <span>🔄</span>
                <span>Termin mit Anfrage aktualisieren</span>
            </button>
            <button 
                type="button"
                onclick={() => { hapticFeedback.tap(); onOpenAppointment(linkedApps[0]); }} 
                class="flex-1 sm:flex-none px-4 py-2.5 text-xs font-bold text-emerald-800 dark:text-emerald-200 bg-emerald-100 dark:bg-emerald-950/60 hover:bg-emerald-200 active:scale-95 rounded-xl transition-all border border-emerald-300 dark:border-emerald-700 cursor-pointer flex items-center justify-center gap-2 touch-manipulation"
            >
                <span>📅</span>
                <span>Termin im Kalender öffnen</span>
            </button>
        {:else}
            <button 
                type="button" 
                disabled={isTransferring}
                onclick={() => { hapticFeedback.success(); onTransfer({ openModal: false }); }} 
                class="flex-1 sm:flex-none px-6 py-3 text-xs sm:text-sm font-black text-white bg-emerald-600 hover:bg-emerald-700 active:scale-98 rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 border border-emerald-500 whitespace-nowrap disabled:opacity-50 touch-manipulation" 
            >
                <span>⚡</span>
                <span>{isTransferring ? 'Wird angelegt...' : '1-Click Termin übernehmen'}</span>
            </button>
            <button 
                type="button" 
                disabled={isTransferring}
                onclick={() => { hapticFeedback.tap(); onTransfer({ openModal: true }); }} 
                class="flex-1 sm:flex-none px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white hover:bg-slate-100 dark:bg-slate-800 rounded-xl transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 touch-manipulation" 
            >
                <span>📅</span>
                <span>Prüfen &amp; Öffnen</span>
            </button>
        {/if}
    </div>
</div>
