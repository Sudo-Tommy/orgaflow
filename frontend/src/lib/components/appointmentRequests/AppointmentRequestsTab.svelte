<script lang="ts">
    import { Clock, Calendar, Sparkles, ChevronLeft } from "lucide-svelte";
    import { hapticFeedback } from "$lib/services/hapticFeedback";
    import { formatContact, formatRequestTime, formatDisplayDate, getDetectedClient } from "./appointmentRequestsHelper";
    import AppointmentRequestDetailCard from "./AppointmentRequestDetailCard.svelte";

    interface Props {
        visibleRequests: any[];
        filteredRequests: any[];
        selectedRequest: any;
        selectedRequestId: string | null;
        requestSearch: string;
        requestStatusFilter: 'all' | 'open' | 'accepted';
        requestsWithoutSummaryCount: number;
        isBatchGenerating: boolean;
        isLoading: boolean;
        onSelectRequest: (id: string) => void;
        onBatchGenerate: () => void;
        cardProps: any;
    }

    let {
        visibleRequests,
        filteredRequests,
        selectedRequest,
        selectedRequestId = $bindable(),
        requestSearch = $bindable(),
        requestStatusFilter = $bindable(),
        requestsWithoutSummaryCount,
        isBatchGenerating,
        isLoading,
        onSelectRequest,
        onBatchGenerate,
        cardProps
    }: Props = $props();

    let showMobileDetail = $state(false);
    let pendingCount = $derived(visibleRequests.filter((r: any) => r.status !== 'accepted' && r.status !== 'denied').length);

    function selectItem(id: string) {
        hapticFeedback.tap();
        selectedRequestId = id;
        showMobileDetail = true;
        onSelectRequest(id);
    }
</script>

<div class="flex flex-col flex-1 min-h-0">
    <!-- Sub-Toolbar -->
    <div class="px-4 sm:px-6 py-2.5 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0 rounded-2xl">
        <input
            type="text"
            bind:value={requestSearch}
            placeholder="Anfragen nach Name, Klient, Ort suchen..."
            class="orga-input-clear min-h-11 text-xs max-w-sm flex-1"
        />
        <div class="flex items-center gap-2 flex-wrap">
            <div class="inline-flex p-1 rounded-2xl bg-slate-200/70 dark:bg-slate-800 text-xs font-semibold gap-1">
                <button type="button" onclick={() => { hapticFeedback.tap(); requestStatusFilter = 'open'; }} class="min-h-10 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer touch-manipulation {requestStatusFilter === 'open' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold' : 'text-slate-600 dark:text-slate-400'}">
                    Offen ({pendingCount})
                </button>
                <button type="button" onclick={() => { hapticFeedback.tap(); requestStatusFilter = 'all'; }} class="min-h-10 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer touch-manipulation {requestStatusFilter === 'all' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold' : 'text-slate-600 dark:text-slate-400'}">
                    Alle ({visibleRequests.length})
                </button>
                <button type="button" onclick={() => { hapticFeedback.tap(); requestStatusFilter = 'accepted'; }} class="min-h-10 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer touch-manipulation {requestStatusFilter === 'accepted' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold' : 'text-slate-600 dark:text-slate-400'}">
                    Angenommen
                </button>
            </div>
            {#if requestsWithoutSummaryCount > 0}
                <button type="button" onclick={() => { hapticFeedback.tap(); onBatchGenerate(); }} disabled={isBatchGenerating} class="min-h-11 px-3.5 py-2 text-xs font-bold rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition-all flex items-center gap-2 cursor-pointer touch-manipulation">
                    <Sparkles class="w-4 h-4 {isBatchGenerating ? 'animate-spin' : ''}" />
                    <span>{isBatchGenerating ? 'Wird erstellt...' : `${requestsWithoutSummaryCount} Zusammenfassungen`}</span>
                </button>
            {/if}
        </div>
    </div>

    <!-- Master-Detail Body -->
    <div class="flex-1 min-h-0 overflow-hidden flex flex-col md:flex-row bg-slate-50/40 dark:bg-slate-950/30">
        {#if isLoading}
            <div class="flex-1 flex flex-col items-center justify-center py-16 text-slate-500 gap-3">
                <span class="inline-block w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></span>
                <p class="text-sm font-medium">Lade Anfragen...</p>
            </div>
        {:else if visibleRequests.length === 0}
            <div class="flex-1 p-8 flex flex-col items-center justify-center text-center">
                <p class="text-3xl mb-2">🙌</p>
                <p class="text-base font-bold text-slate-800 dark:text-slate-200">Alles erledigt!</p>
                <p class="text-xs text-slate-400 mt-1">Es liegen aktuell keine neuen Terminanfragen vor.</p>
            </div>
        {:else}
            <!-- MASTER COLUMN -->
            <aside class="w-full md:w-80 lg:w-[380px] shrink-0 border-r border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 flex flex-col min-h-0 h-full {showMobileDetail ? 'hidden md:flex' : 'flex'}">
                <div class="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-semibold text-slate-500 shrink-0">
                    <span>Anfragen ({filteredRequests.length})</span>
                    <span class="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-1"><Clock class="w-3 h-3" />Neueste zuerst</span>
                </div>
                <div class="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                    {#if filteredRequests.length === 0}
                        <div class="p-8 text-center text-slate-400 text-xs">Keine Anfragen gefunden.</div>
                    {:else}
                        {#each filteredRequests as req (req.id)}
                            {@const detectedClient = getDetectedClient(req)}
                            {@const isSelected = selectedRequest?.id === req.id}
                            <button
                                type="button"
                                onclick={() => selectItem(req.id)}
                                class="w-full text-left p-3.5 sm:p-4 transition-all cursor-pointer flex flex-col gap-1.5 touch-manipulation {isSelected ? 'bg-indigo-50/90 dark:bg-indigo-950/50 border-l-4 border-l-indigo-600' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 border-l-4 border-l-transparent'}"
                            >
                                <div class="flex items-center justify-between gap-2 text-xs">
                                    <span class="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold rounded-full {req.status === 'accepted' ? 'bg-emerald-100 text-emerald-800' : req.status === 'denied' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}">
                                        {req.status === 'accepted' ? '✅ Angenommen' : req.status === 'denied' ? '❌ Abgelehnt' : '⏳ Offen'}
                                    </span>
                                    <span class="text-[10px] text-slate-400">{new Date(req.created).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}</span>
                                </div>
                                <div class="flex items-center justify-between gap-2">
                                    <h4 class="text-sm font-bold text-slate-900 dark:text-white truncate">{req.sender_name || 'Unbekannt'}</h4>
                                    <span class="text-[10px] font-semibold text-slate-500">{formatContact(req.contact_method)}</span>
                                </div>
                                <div class="flex items-center gap-1.5 flex-wrap">
                                    {#if req.date || req.time || formatRequestTime(req)}
                                        <div class="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                            <Calendar class="w-3 h-3 text-indigo-600" />
                                            <span>{req.date ? formatDisplayDate(req.date) : 'Termin'} {formatRequestTime(req)}</span>
                                        </div>
                                    {/if}
                                    {#if detectedClient}
                                        <span class="px-2 py-0.5 text-[10px] font-semibold text-emerald-800 bg-emerald-50 rounded-full border border-emerald-200 truncate max-w-[140px]">👤 {detectedClient.name_first} {detectedClient.name_last}</span>
                                    {:else}
                                        <span class="px-2 py-0.5 text-[10px] font-semibold text-amber-800 bg-amber-50 rounded-full border border-amber-200">✨ Neukunde</span>
                                    {/if}
                                </div>
                                <p class="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{req.ai_summary ? req.ai_summary.replace(/^[^\n]+\n/, '') : (req.request_text || '')}</p>
                            </button>
                        {/each}
                    {/if}
                </div>
            </aside>

            <!-- DETAIL COLUMN -->
            <main class="flex-1 min-h-0 h-full flex flex-col overflow-y-auto bg-slate-50/60 dark:bg-slate-950/30 {showMobileDetail ? 'flex' : 'hidden md:flex'}">
                {#if !selectedRequest}
                    <div class="flex-1 flex items-center justify-center p-8 text-center text-slate-400 text-xs">
                        👈 Wähle links eine Anfrage aus der Liste aus.
                    </div>
                {:else}
                    <div class="md:hidden px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0">
                        <button type="button" onclick={() => { hapticFeedback.tap(); showMobileDetail = false; }} class="min-h-11 px-3.5 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 inline-flex items-center gap-2 text-xs font-bold cursor-pointer touch-manipulation">
                            <ChevronLeft class="w-4 h-4" />
                            <span>Zurück zur Übersicht</span>
                        </button>
                    </div>
                    <AppointmentRequestDetailCard {...cardProps} req={selectedRequest} />
                {/if}
            </main>
        {/if}
    </div>
</div>
