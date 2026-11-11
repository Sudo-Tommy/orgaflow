<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { pb } from "$lib/services/pocketbase";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import { useRequestAdmin } from "$lib/services/requestAdminService.svelte";
    import RequestReplyModal from "./RequestReplyModal.svelte";
    import PdfPreviewModal from "$lib/components/PdfPreviewModal.svelte";
    import AppointmentModal from "$lib/components/AppointmentModal.svelte";
    import ClientDetailModal from "$lib/components/clients/ClientDetailModal.svelte";
    import GoogleContactSelectionModal from "$lib/components/contacts/GoogleContactSelectionModal.svelte";
    import AdmissionReviewModal from "./appointmentRequests/AdmissionReviewModal.svelte";
    import AppointmentChangesTab from "./appointmentRequests/AppointmentChangesTab.svelte";
    import AppointmentFeedbacksTab from "./appointmentRequests/AppointmentFeedbacksTab.svelte";
    import AppointmentAdmissionsTab from "./appointmentRequests/AppointmentAdmissionsTab.svelte";
    import AppointmentRequestsTab from "./appointmentRequests/AppointmentRequestsTab.svelte";
    import { 
        loadAiSummaryForRequest, acceptClientAction, deleteNewClientAction, 
        copyToClientAction, createContactFromRequestAction, assignClientToRequestAction,
        transferRequestToAppointmentAction, createClientFromRequestAction
    } from "./appointmentRequests/appointmentRequestsActions";
    import { 
        getDetectedClient, getDetectedContact, getDetectedLocation, 
        getDetectedExecutionMode, getLinkedAppointments, detectMissingContactQuery, getClientEmail
    } from "./appointmentRequests/appointmentRequestsHelper";
    import { X, Calendar } from "lucide-svelte";
    import { hapticFeedback } from "$lib/services/hapticFeedback";

    interface Props {
        onclose?: () => void;
        initialTab?: 'requests' | 'changes' | 'feedbacks' | 'admissions';
        activeTab?: 'requests' | 'changes' | 'feedbacks' | 'admissions';
        hideHeader?: boolean;
    }

    let {
        onclose,
        initialTab = 'requests',
        activeTab = $bindable<'requests' | 'changes' | 'feedbacks' | 'admissions'>('requests'),
        hideHeader = false
    }: Props = $props();

    const reqService = useRequestAdmin();
    $effect(() => { if (initialTab && !hideHeader) activeTab = initialTab; });

    let replyModal = $state<ReturnType<typeof RequestReplyModal>>();
    let pdfPreviewModal = $state<ReturnType<typeof PdfPreviewModal>>();
    let clientDetailModal = $state<ReturnType<typeof ClientDetailModal>>();
    let appointmentModal = $state<ReturnType<typeof AppointmentModal>>();
    let googleContactModal = $state<ReturnType<typeof GoogleContactSelectionModal>>();
    let admissionReviewModal = $state<ReturnType<typeof AdmissionReviewModal>>();

    let currentUser = $state(pb.authStore.model);
    pb.authStore.onChange(() => currentUser = pb.authStore.model);
    let isGodMode = $derived(pb.authStore.isSuperuser || ['superadmin', 'developer'].includes(currentUser?.role));
    let isAdmin = $derived(isGodMode || currentUser?.role === 'admin');

    let reqViewModes = $state<Record<string, 'ai' | 'original'>>({});
    let summarizingReqIds = $state<Record<string, boolean>>({});
    let transferringReqIds = $state<Record<string, boolean>>({});
    let syncingAppIds = $state<Record<string, boolean>>({});
    let isBatchGenerating = $state(false);

    let requestSearch = $state('');
    let requestStatusFilter = $state<'all' | 'open' | 'accepted'>('open');
    let selectedRequestId = $state<string | null>(null);

    let feedbackSearch = $state('');
    let feedbackRatingFilter = $state<'all' | 'critical' | 'good'>('all');
    let showAllFeedbacks = $state(false);
    let feedbacks = $state<any[]>([]);
    let isFeedbacksLoading = $state(false);

    let admissionSearch = $state('');
    let attachDropdownOpen = $state<{ reqId: string, filename: string } | null>(null);
    let attachSearchQuery = $state("");

    async function loadFeedbacks() {
        isFeedbacksLoading = true;
        try {
            feedbacks = await pb.collection('feedbacks').getFullList({ sort: '-created', expand: 'client', requestKey: null });
        } catch { feedbacks = []; }
        finally { isFeedbacksLoading = false; }
    }

    onMount(() => { reqService.init(); loadFeedbacks(); });
    onDestroy(() => { reqService.cleanup(); });

    let visibleRequests = $derived(reqService.requests || []);
    let filteredRequests = $derived.by(() => {
        let list = visibleRequests;
        if (requestStatusFilter === 'open') list = list.filter((r: any) => r.status !== 'accepted' && r.status !== 'denied');
        else if (requestStatusFilter === 'accepted') list = list.filter((r: any) => r.status === 'accepted');
        if (requestSearch.trim()) {
            const q = requestSearch.toLowerCase().trim();
            list = list.filter((r: any) => (r.sender_name || '').toLowerCase().includes(q) || (r.request_text || '').toLowerCase().includes(q));
        }
        return list;
    });

    let selectedRequest = $derived(filteredRequests.find(r => r.id === selectedRequestId) || filteredRequests[0] || null);

    let newClients = $derived.by(() => {
        return (orgaStore.clients?.data || []).filter((c: any) => {
            if (c.status === 'Aktiv' || c.status === 'Verstorben') return false;
            const n = (c.notes || '').toUpperCase();
            return n.includes('NEUAUFNAHME') || n.includes('AUFNAHME') || (c.status === 'Inaktiv' && n.includes('EINGEREICHT'));
        });
    });

    let filteredAttachClients = $derived.by(() => {
        const q = attachSearchQuery.toLowerCase().trim();
        let list = orgaStore.clients?.data || [];
        if (q) list = list.filter((c: any) => `${c.name_first || ''} ${c.name_last || ''}`.toLowerCase().includes(q));
        return [...list].sort((a: any, b: any) => `${a.name_last || ''} ${a.name_first || ''}`.localeCompare(`${b.name_last || ''} ${b.name_first || ''}`, 'de', { sensitivity: 'base' })).slice(0, 15);
    });

    let cardProps = $derived.by(() => {
        const req = selectedRequest;
        const detClient = req ? getDetectedClient(req) : null;
        const detContact = req ? getDetectedContact(req, detClient) : null;
        return {
            detectedClient: detClient, detectedContact: detContact,
            detectedLoc: req ? getDetectedLocation(req, detClient, detContact) : '',
            detectedMode: req ? getDetectedExecutionMode(req) : '',
            linkedApps: req ? getLinkedAppointments(req) : [],
            missingContact: req ? detectMissingContactQuery(req, detClient) : null,
            clientEmail: req ? getClientEmail(req) : null,
            isTransferring: req ? !!transferringReqIds[req.id] : false,
            isSyncing: req ? !!syncingAppIds[req.id] : false,
            isSummarizing: req ? !!summarizingReqIds[req.id] : false,
            filteredAttachClients, attachSearchQuery, attachDropdownOpen,
            viewMode: req ? (reqViewModes[req.id] || 'ai') : 'ai',
            onSetViewMode: (mode: 'ai' | 'original') => { if (req) reqViewModes[req.id] = mode; },
            onLoadAiSummary: (force: boolean) => { if (req) loadAiSummaryForRequest(req, force, summarizingReqIds); },
            onStatusChange: (id: string, s: string) => reqService.updateStatus(id, s as any),
            onPropose: (id: string) => { const r = visibleRequests.find(x => x.id === id); const email = getClientEmail(r); if (email) replyModal?.open(r, 'propose', email); },
            onCreateContact: (r: any) => createContactFromRequestAction(r, reqService),
            onCreateClient: (r: any) => createClientFromRequestAction(r, reqService),
            onReply: (r: any, s: string, email: string) => replyModal?.open(r, s as any, email),
            onDelete: (id: string) => reqService.deleteReq(id),
            onTransfer: (opts: any) => transferRequestToAppointmentAction(req, opts, transferringReqIds, reqService, appointmentModal),
            onSync: () => {},
            onOpenAppointment: (app: any) => appointmentModal?.open(app),
            onGoogleSearch: (type: any) => googleContactModal?.open({ query: '', location: '', type }),
            onAssignClient: (c: any) => assignClientToRequestAction(req, c),
            onPreviewAttachment: (r: any, fn: string) => pdfPreviewModal?.open(pb.files.getURL(r, fn), fn, fn),
            onCopyToClient: (r: any, fn: string, cId: string) => copyToClientAction(r, fn, cId)
        };
    });
</script>

<div class="flex flex-col h-full bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border border-slate-200/80 dark:border-slate-800 shadow-2xl">
    {#if !hideHeader}
        <div class="px-4 sm:px-6 py-3.5 border-b border-slate-200/80 dark:border-slate-800 flex justify-between items-center gap-3 shrink-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md">
            <div class="flex items-center gap-2.5">
                <div class="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-slate-800 dark:text-indigo-400 flex items-center justify-center font-bold">
                    <Calendar class="w-5 h-5" />
                </div>
                <h2 class="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">Eingangszentrale</h2>
            </div>
            {#if onclose}
                <button type="button" aria-label="Schließen" onclick={onclose} class="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 cursor-pointer touch-manipulation">
                    <X class="w-5 h-5" />
                </button>
            {/if}
        </div>
        <div class="px-3 sm:px-6 py-2 bg-slate-50 dark:bg-slate-900/90 border-b border-slate-200/80 dark:border-slate-800 shrink-0">
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {#each [
                    { id: 'requests', label: 'Anfragen', count: visibleRequests.length },
                    { id: 'changes', label: 'Änderungen', count: (orgaStore.appointments?.data || []).filter((a: any) => a.requestet_changes?.status === 'pending').length },
                    { id: 'feedbacks', label: 'Feedback', count: feedbacks.length },
                    { id: 'admissions', label: 'Aufnahmen', count: newClients.length }
                ] as tab}
                    <button
                        type="button"
                        onclick={() => { hapticFeedback.tap(); activeTab = tab.id as any; }}
                        class="min-h-11 px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation {activeTab === tab.id ? 'bg-slate-900 text-white dark:bg-indigo-600 shadow-xs' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700'}"
                    >
                        <span>{tab.label}</span>
                        {#if tab.count > 0}
                            <span class="px-1.5 py-0.5 rounded-full text-[10px] {activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'}">{tab.count}</span>
                        {/if}
                    </button>
                {/each}
            </div>
        </div>
    {/if}

    <div class="flex-1 min-h-0 {activeTab === 'requests' ? 'overflow-hidden flex flex-col' : 'overflow-y-auto'}">
        {#if activeTab === 'requests'}
            <AppointmentRequestsTab
                {visibleRequests} {filteredRequests} {selectedRequest}
                bind:selectedRequestId bind:requestSearch bind:requestStatusFilter
                requestsWithoutSummaryCount={visibleRequests.filter(r => !r.ai_summary).length}
                {isBatchGenerating} isLoading={reqService.isLoading}
                onSelectRequest={(id) => selectedRequestId = id}
                onBatchGenerate={() => {}} {cardProps}
            />
        {:else if activeTab === 'changes'}
            <AppointmentChangesTab {currentUser} {isAdmin} {isGodMode} onOpenAppointment={(app) => appointmentModal?.open(app)} />
        {:else if activeTab === 'feedbacks'}
            <div class="p-4 sm:p-6">
                <AppointmentFeedbacksTab
                    {feedbacks} isLoading={isFeedbacksLoading}
                    bind:feedbackSearch bind:feedbackRatingFilter bind:showAllFeedbacks
                    onUpdateStatus={async (id, status) => { await pb.collection('feedbacks').update(id, { status }); loadFeedbacks(); }}
                    onDelete={async (id) => { await pb.collection('feedbacks').delete(id); loadFeedbacks(); }}
                />
            </div>
        {:else if activeTab === 'admissions'}
            <div class="p-4 sm:p-6">
                <AppointmentAdmissionsTab
                    admissions={newClients} bind:admissionSearch
                    onOpenDetail={(id) => clientDetailModal?.open(id)}
                    onOpenReview={(c) => admissionReviewModal?.open(c)}
                    onAcceptClient={(id) => acceptClientAction(id)}
                    onDeleteClient={(id) => deleteNewClientAction(id)}
                />
            </div>
        {/if}
    </div>
</div>

<RequestReplyModal bind:this={replyModal} />
<ClientDetailModal bind:this={clientDetailModal} />
<PdfPreviewModal bind:this={pdfPreviewModal} />
<AppointmentModal bind:this={appointmentModal} />
<GoogleContactSelectionModal bind:this={googleContactModal} />
<AdmissionReviewModal bind:this={admissionReviewModal} onClientAccepted={(c) => clientDetailModal?.open(c.id)} />