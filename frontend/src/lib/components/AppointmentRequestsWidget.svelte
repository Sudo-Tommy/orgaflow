<script lang="ts">
    import { useRequestAdmin } from "$lib/services/requestAdminService.svelte";
    import { onMount, onDestroy } from "svelte";
    import { sendEmail } from "$lib/services/emailService";
    import { toastStore } from "$lib/services/toastService.svelte";
    import { confirmStore } from "$lib/services/confirmService.svelte";
    import { pb } from "$lib/services/pocketbase";
    import RequestReplyModal from "./RequestReplyModal.svelte";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import ClientDetailModal from "$lib/components/clients/ClientDetailModal.svelte";

    const reqService = useRequestAdmin();
    let showAll = $state(false);
    // svelte-ignore non_reactive_update
    let replyModal: any;
    // svelte-ignore non_reactive_update
    let clientDetailModal: any;

    let currentUser = $state(pb.authStore.model);
    pb.authStore.onChange(() => currentUser = pb.authStore.model);
    let isGodMode = $derived(pb.authStore.isSuperuser || currentUser?.role === 'superadmin');
    let isAdmin = $derived(isGodMode || currentUser?.role === 'admin');

    // --- Feedbacks State ---
    let activeTab = $state<'requests' | 'changes' | 'feedbacks' | 'admissions'>('requests');
    let feedbacks = $state<any[]>([]);
    let isFeedbacksLoading = $state(false);
    let showAllFeedbacks = $state(false);

    let newFeedbacksCount = $derived(feedbacks.filter(f => f.status === 'Neu').length);
    let visibleFeedbacks = $derived(feedbacks.filter(f => showAllFeedbacks || f.status !== 'Archieviert'));

    async function loadFeedbacks() {
        isFeedbacksLoading = true;
        try {
            let filter = 'id != ""';
            if (!isGodMode) {
                const userCompanyId = currentUser?.company;
                if (userCompanyId) {
                    // Filtert Feedbacks, bei denen der verknüpfte Klient zur Firma des Admins gehört
                    filter = `client.company = "${userCompanyId}"`;
                } else {
                    // Nutzer ohne Firma (sollte nicht vorkommen) sehen keine Feedbacks
                    feedbacks = [];
                    isFeedbacksLoading = false;
                    return;
                }
            }
            feedbacks = await pb.collection('feedbacks').getFullList({ filter, sort: '-created', expand: 'client', requestKey: null });
        } catch (e) {
            console.error("Fehler beim Laden der Feedbacks:", e);
        } finally {
            isFeedbacksLoading = false;
        }
    }
    
    const feedbackCallback = (e: any) => {
        if (e.action === 'create') {
            feedbacks = [e.record, ...feedbacks];
        } else if (e.action === 'update') {
            feedbacks = feedbacks.map(f => f.id === e.record.id ? e.record : f);
        } else if (e.action === 'delete') {
            feedbacks = feedbacks.filter(f => f.id !== e.record.id);
        }
    };

    const requestsCallback = () => {
        reqService.init(); // Lädt die Anfragen bei jeder Änderung sofort neu
    };

    onMount(() => {
        reqService.init();
        loadFeedbacks();
        
        pb.collection('feedbacks').subscribe('*', feedbackCallback, { requestKey: null });
        pb.collection('appointment_requests').subscribe('*', requestsCallback);
    });
    onDestroy(() => {
        reqService.cleanup();
        pb.collection('feedbacks').unsubscribe('*');
        pb.collection('appointment_requests').unsubscribe('*');
    });

    let visibleRequests = $derived.by(() => {
        let list = reqService.requests.filter(r => showAll || r.status === 'requested');
        if (isGodMode) return list;

        const userCompanyId = currentUser?.company;
        if (!userCompanyId) return [];

        // Filtert Anfragen, die direkt der Firma des Admins zugeordnet sind
        return list.filter(r => r.company === userCompanyId);
    });
    let pendingCount = $derived(reqService.requests.filter(r => r.status === 'requested').length);

    // --- Änderungswünsche (Appointments mit requestet_changes) ---
    let changeRequests = $derived.by(() => {
        let list = (orgaStore.appointments?.data || []).filter((a: any) => a.requestet_changes && a.requestet_changes.status === 'pending');

        if (!isGodMode) {
            const userCompanyId = currentUser?.company;
            if (isAdmin && userCompanyId) {
                // Admins sehen alle Änderungen, deren Termine einem Mitarbeiter ihrer Firma gehören
                list = list.filter((a: any) => a.expand?.user?.company === userCompanyId);
            } else { // Normale Mitarbeiter sehen nur ihre eigenen
                list = list.filter((a: any) => a.user === currentUser?.id);
            }
        }
        return list.sort((a: any, b: any) => new Date(b.requestet_changes.created).getTime() - new Date(a.requestet_changes.created).getTime());
    });
    
    let pendingChangesCount = $derived(changeRequests.length);

    // --- Neuaufnahmen (Inaktive Klienten mit speziellem Notiz-Text) ---
    let newClients = $derived.by(() => {
        let list = (orgaStore.clients?.data || []).filter((c: any) => c.status === 'Inaktiv' && c.notes && c.notes.includes('NEUAUFNAHME-ANFRAGE'));
        if (!isGodMode) {
            const userCompanyId = currentUser?.company;
            if (isAdmin && userCompanyId) {
                list = list.filter((c: any) => {
                    const comp = c.company;
                    if (Array.isArray(comp)) return comp.includes(userCompanyId);
                    if (typeof comp === 'string' && comp.startsWith('[')) {
                        try { return JSON.parse(comp).includes(userCompanyId); } catch { return false; }
                    }
                    return comp === userCompanyId || (comp && comp.includes(userCompanyId));
                });
            } else {
                list = []; // Normale Mitarbeiter sehen keine Aufnahmen, es sei denn sie haben Admin-Rechte für ihren Standort
            }
        }
        return list.sort((a: any, b: any) => new Date(b.created).getTime() - new Date(a.created).getTime());
    });
    
    let pendingAdmissionsCount = $derived(newClients.length);

    async function acceptClient(id: string) {
        try {
            await pb.collection('clients').update(id, { status: 'Aktiv' });
            toastStore.success("Klient wurde erfolgreich aufgenommen (Status: Aktiv).");
        } catch (e) { toastStore.error("Fehler beim Aufnehmen des Klienten."); }
    }

    async function deleteNewClient(id: string) {
        if (await confirmStore.ask("Möchten Sie diese Anfrage und den dazugehörigen Klienten-Datensatz wirklich unwiderruflich löschen?", "Anfrage löschen?", "Löschen", "Abbrechen", true)) {
            try {
                await pb.collection('clients').delete(id);
                toastStore.info("Aufnahme-Anfrage gelöscht.");
            } catch (e) { toastStore.error("Fehler beim Löschen."); }
        }
    }

    function formatContact(method: string) {
        switch(method) {
            case 'telephone': return '📞 Telefonrückruf';
            case 'e-mail-address': return '✉️ E-Mail';
            case 'whatsapp': return '💬 WhatsApp';
            case 'mail-adress': return '📮 Postbrief';
            default: return '📞 Unbekannt';
        }
    }
    
    async function handlePropose(id: string) {
        const req = reqService.requests.find((r) => r.id === id);
        if (req) {
            const emailMatch = req.request_text.match(/E-Mail:\s*([^\n]+)/);
            const clientEmail = emailMatch ? emailMatch[1].trim() : null;
            
            if (clientEmail && clientEmail !== '-' && clientEmail.includes('@')) {
                replyModal?.open(req, 'propose', clientEmail);
            } else {
                toastStore.warning("Dieser Klient hat keine E-Mail-Adresse hinterlegt.");
            }
        }
    }

    async function handleStatus(id: string, status: 'accepted' | 'denied' | 'requested') {
        const req = reqService.requests.find((r) => r.id === id);
        try {
            await reqService.updateStatus(id, status);
            
            // Direktbenachrichtigung via E-Mail anbieten
            if (req && status !== 'requested') {
                const emailMatch = req.request_text.match(/E-Mail:\s*([^\n]+)/);
                const clientEmail = emailMatch ? emailMatch[1].trim() : null;
                
                if (clientEmail && clientEmail !== '-' && clientEmail.includes('@')) {
                    replyModal?.open(req, status, clientEmail);
                } else {
                    toastStore.success(`Anfrage wurde auf '${status === 'accepted' ? 'Angenommen' : 'Abgelehnt'}' gesetzt.`);
                }
            }
        } catch (err) {
            console.error(err);
            toastStore.error("Fehler beim Aktualisieren oder beim Senden der E-Mail.");
        }
    }

    async function handleDelete(id: string) {
        if (confirm("Möchten Sie diese Anfrage wirklich unwiderruflich löschen?")) {
            try {
                await reqService.deleteReq(id);
                toastStore.info("Anfrage wurde gelöscht.");
            } catch (err) {
                toastStore.error("Fehler beim Löschen der Anfrage.");
            }
        }
    }

    async function updateFeedbackStatus(id: string, status: string) {
        try {
            await pb.collection('feedbacks').update(id, { status });
            toastStore.success(`Feedback auf '${status}' gesetzt.`);
        } catch (e) {
            toastStore.error("Fehler beim Aktualisieren.");
        }
    }

    async function deleteFeedback(id: string) {
        if (await confirmStore.ask("Möchten Sie dieses Feedback wirklich löschen?", "Feedback löschen?", "Löschen", "Abbrechen", true)) {
            try {
                await pb.collection('feedbacks').delete(id);
                toastStore.info("Feedback wurde gelöscht.");
            } catch (e) {
                toastStore.error("Fehler beim Löschen des Feedbacks.");
            }
        }
    }

    async function markChangeAsDone(id: string) {
        try {
            await pb.collection('appointments').update(id, { requestet_changes: null });
            toastStore.success("Änderungswunsch als erledigt markiert.");
        } catch (e) {
            toastStore.error("Fehler beim Aktualisieren des Termins.");
        }
    }

    function getRatingBadgeClass(val: number) {
        if (val <= 3) return "bg-rose-100 text-rose-700 border-rose-200";
        if (val <= 6) return "bg-amber-100 text-amber-700 border-amber-200";
        if (val <= 8) return "bg-emerald-100 text-emerald-700 border-emerald-200";
        return "bg-teal-100 text-teal-700 border-teal-200";
    }
</script>

<div class="orga-card-white flex flex-col overflow-hidden">
    <!-- Header -->
    <div class="px-4 sm:px-6 pt-4 sm:pt-5 border-b border-neutral-100 flex items-center gap-4 sm:gap-6 bg-neutral-50/50 overflow-x-auto custom-scrollbar">
        <button onclick={() => activeTab = 'requests'} class="pb-3 sm:pb-4 relative text-sm sm:text-lg font-bold transition-colors whitespace-nowrap shrink-0 {activeTab === 'requests' ? 'text-neutral-900' : 'text-neutral-400 hover:text-neutral-700'}">
            <span class="flex items-center gap-2">
                <span>📬</span> Anfragen
                {#if pendingCount > 0}
                    <span class="px-2 py-0.5 rounded-full bg-brand-500 text-white text-[10px] shadow-sm animate-pulse">{pendingCount}</span>
                {/if}
            </span>
            {#if activeTab === 'requests'}
                <div class="absolute bottom-0 left-0 right-0 h-1 bg-brand-500 rounded-t-full"></div>
            {/if}
        </button>

        <button onclick={() => activeTab = 'changes'} class="pb-3 sm:pb-4 relative text-sm sm:text-lg font-bold transition-colors whitespace-nowrap shrink-0 {activeTab === 'changes' ? 'text-neutral-900' : 'text-neutral-400 hover:text-neutral-700'}">
            <span class="flex items-center gap-2">
                <span>🔄</span> Änderungen
                {#if pendingChangesCount > 0}
                    <span class="px-2 py-0.5 rounded-full bg-blue-500 text-white text-[10px] shadow-sm animate-pulse">{pendingChangesCount}</span>
                {/if}
            </span>
            {#if activeTab === 'changes'}
                <div class="absolute bottom-0 left-0 right-0 h-1 bg-blue-500 rounded-t-full"></div>
            {/if}
        </button>

        <button onclick={() => activeTab = 'feedbacks'} class="pb-3 sm:pb-4 relative text-sm sm:text-lg font-bold transition-colors whitespace-nowrap shrink-0 {activeTab === 'feedbacks' ? 'text-neutral-900' : 'text-neutral-400 hover:text-neutral-700'}">
            <span class="flex items-center gap-2">
                <span>⭐</span> Feedback
                {#if newFeedbacksCount > 0}
                    <span class="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] shadow-sm animate-pulse">{newFeedbacksCount}</span>
                {/if}
            </span>
            {#if activeTab === 'feedbacks'}
                <div class="absolute bottom-0 left-0 right-0 h-1 bg-amber-500 rounded-t-full"></div>
            {/if}
        </button>

        <button onclick={() => activeTab = 'admissions'} class="pb-3 sm:pb-4 relative text-sm sm:text-lg font-bold transition-colors whitespace-nowrap shrink-0 {activeTab === 'admissions' ? 'text-neutral-900' : 'text-neutral-400 hover:text-neutral-700'}">
            <span class="flex items-center gap-2">
                <span>👤</span> Aufnahmen
                {#if pendingAdmissionsCount > 0}
                    <span class="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] shadow-sm animate-pulse">{pendingAdmissionsCount}</span>
                {/if}
            </span>
            {#if activeTab === 'admissions'}
                <div class="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500 rounded-t-full"></div>
            {/if}
        </button>
    </div>

    {#if activeTab === 'requests'}
        <div class="flex bg-white p-1 rounded-lg border border-neutral-200 shadow-sm m-1">
            <button onclick={() => showAll = false} class="px-3 py-1 text-xs font-bold rounded-md transition-colors {!showAll ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-500 hover:text-neutral-700'}">Offen ({pendingCount})</button>
            <button onclick={() => showAll = true} class="px-3 py-1 text-xs font-bold rounded-md transition-colors {showAll ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-500 hover:text-neutral-700'}">Alle</button>
        </div>
    {:else if activeTab === 'changes'}
        <div class="flex bg-white p-1 rounded-lg border border-neutral-200 shadow-sm m-1">
            <button class="px-3 py-1 text-xs font-bold rounded-md transition-colors bg-neutral-100 text-neutral-900">Offen ({pendingChangesCount})</button>
        </div>
    {:else if activeTab === 'feedbacks'}
        <div class="flex bg-white p-1 rounded-lg border border-neutral-200 shadow-sm m-1">
            <button onclick={() => showAllFeedbacks = false} class="px-3 py-1 text-xs font-bold rounded-md transition-colors {!showAllFeedbacks ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-500 hover:text-neutral-700'}">Aktuell</button>
            <button onclick={() => showAllFeedbacks = true} class="px-3 py-1 text-xs font-bold rounded-md transition-colors {showAllFeedbacks ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-500 hover:text-neutral-700'}">Alle (inkl. Archiv)</button>
        </div>
    {/if}

    <!-- Content -->
    <div class="p-6 bg-white min-h-50 max-h-125 overflow-y-auto custom-scrollbar">
        {#if activeTab === 'requests'}
            {#if reqService.isLoading}
                <p class="text-neutral-500 text-sm text-center py-10">Lade Anfragen...</p>
            {:else if visibleRequests.length === 0}
                <div class="text-center py-12 border-2 border-dashed border-neutral-200 rounded-2xl bg-neutral-50/50">
                    <span class="text-4xl mb-3 block opacity-80">🙌</span>
                    <p class="text-neutral-700 font-bold mb-1">Alles erledigt!</p>
                    <p class="text-neutral-400 text-sm">Es liegen aktuell keine neuen Terminanfragen vor.</p>
                </div>
            {:else}
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {#each visibleRequests as req (req.id)}
                    <div class="border rounded-xl p-5 flex flex-col relative transition-all shadow-sm hover:shadow-md {req.status === 'requested' ? 'border-brand-200 bg-brand-50/30' : 'border-neutral-200 bg-white'}">
                        
                        <div class="flex justify-between items-start mb-3">
                            <div>
                                <h3 class="font-bold text-neutral-900 text-lg">{req.sender_name}</h3>
                                <p class="text-xs font-semibold text-brand-600 bg-brand-100 inline-block px-2 py-0.5 rounded mt-1 border border-brand-200">{formatContact(req.contact_method)}</p>
                            </div>
                            <div class="text-right">
                                <p class="text-xs text-neutral-500 font-medium">{new Date(req.created).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })} {new Date(req.created).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</p>
                                {#if req.status === 'accepted'}<span class="text-xs font-bold text-emerald-600 mt-1 block">✅ Angenommen</span>{/if}
                                {#if req.status === 'denied'}<span class="text-xs font-bold text-rose-600 mt-1 block">❌ Abgelehnt</span>{/if}
                            </div>
                        </div>

                        <div class="bg-white p-3 rounded-lg border border-neutral-100 text-sm text-neutral-700 mb-4 flex-1 whitespace-pre-wrap shadow-inner">
                            "{req.request_text}"
                        </div>

                        <div class="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-neutral-100">
                            <div class="text-xs text-neutral-500 w-full sm:w-auto">
                                {#if req.date || req.time}
                                    <span class="font-bold">Wunsch:</span> 
                                    {req.date ? new Date(req.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Kein Datum'} 
                                    {req.time ? `um ${new Date(req.time).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr` : ''}
                                {:else}
                                    <span class="italic">Kein Terminwunsch</span>
                                {/if}
                            </div>
                            
                            <div class="flex flex-wrap items-center justify-end gap-2 w-full sm:w-auto">
                                {#if req.status === 'requested'}
                                    <button onclick={() => handleStatus(req.id, 'denied')} class="flex-1 sm:flex-none px-2 py-1.5 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors border border-rose-200 text-center whitespace-nowrap">Ablehnen</button>
                                    <button onclick={() => handlePropose(req.id)} class="flex-1 sm:flex-none px-2 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200 text-center whitespace-nowrap">Vorschlag</button>
                                    <button onclick={() => handleStatus(req.id, 'accepted')} class="flex-1 sm:flex-none px-2 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors border border-emerald-300 text-center whitespace-nowrap">Annehmen</button>
                                {:else}
                                    <button onclick={() => handleStatus(req.id, 'requested')} class="flex-1 sm:flex-none px-2 py-1.5 text-xs font-bold text-neutral-500 hover:text-neutral-700 transition-colors text-center whitespace-nowrap">Zurücksetzen</button>
                                {/if}
                                <button onclick={() => handleDelete(req.id)} class="p-1.5 text-neutral-400 hover:text-rose-500 transition-colors shrink-0" title="Löschen"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
                            </div>
                        </div>
                    </div>
                {/each}
            </div>
            {/if}
        {:else if activeTab === 'changes'}
            {#if changeRequests.length === 0}
                <div class="text-center py-12 border-2 border-dashed border-neutral-200 rounded-2xl bg-neutral-50/50">
                    <span class="text-4xl mb-3 block opacity-80">🙌</span>
                    <p class="text-neutral-700 font-bold mb-1">Alles aktuell!</p>
                    <p class="text-neutral-400 text-sm">Es liegen keine Änderungswünsche für Termine vor.</p>
                </div>
            {:else}
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {#each changeRequests as req (req.id)}
                        <div class="border border-blue-200 bg-blue-50/30 rounded-xl p-5 flex flex-col relative transition-all shadow-sm hover:shadow-md">
                            <div class="flex justify-between items-start mb-3">
                                <div>
                                    <h3 class="font-bold text-neutral-900 text-lg">{req.expand?.client?.[0]?.name_first || ''} {req.expand?.client?.[0]?.name_last || 'Unbekannter Klient'}</h3>
                                    <p class="text-xs font-semibold text-blue-600 bg-blue-100 inline-block px-2 py-0.5 rounded mt-1 border border-blue-200">
                                        Termin: {req.appointment ? new Date(req.appointment).toLocaleDateString('de-DE') : '-'} um {req.appointment ? new Date(req.appointment).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '-'} Uhr
                                    </p>
                                </div>
                                <div class="text-right">
                                    <p class="text-xs text-neutral-500 font-medium">Angefragt am {new Date(req.requestet_changes.created).toLocaleDateString('de-DE')}</p>
                                </div>
                            </div>
                            <div class="bg-white p-3 rounded-lg border border-neutral-100 text-sm text-neutral-700 mb-4 flex-1 whitespace-pre-wrap shadow-inner">
                                "{req.requestet_changes.text}"
                            </div>
                            <div class="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-neutral-100 mt-auto">
                                <button onclick={() => markChangeAsDone(req.id)} class="px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200 shadow-sm active:scale-95">Als erledigt markieren</button>
                            </div>
                        </div>
                    {/each}
                </div>
            {/if}
        {:else if activeTab === 'feedbacks'}
            {#if isFeedbacksLoading}
                <p class="text-neutral-500 text-sm text-center py-10">Lade Feedbacks...</p>
            {:else if visibleFeedbacks.length === 0}
                <div class="text-center py-12 border-2 border-dashed border-neutral-200 rounded-2xl bg-neutral-50/50">
                    <span class="text-4xl mb-3 block opacity-80">🙌</span>
                    <p class="text-neutral-700 font-bold mb-1">Keine neuen Feedbacks!</p>
                    <p class="text-neutral-400 text-sm">Aktuell liegen in dieser Ansicht keine Bewertungen vor.</p>
                </div>
            {:else}
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {#each visibleFeedbacks as f (f.id)}
                        <div class="border rounded-xl p-5 flex flex-col relative transition-all shadow-sm hover:shadow-md {f.status === 'Neu' ? 'border-amber-200 bg-amber-50/30' : 'border-neutral-200 bg-white'}">
                            <div class="flex justify-between items-start mb-3">
                                <div>
                                    {#if f.name_first || f.name_last}
                                        <h3 class="font-bold text-neutral-900 text-lg">{f.name_first} {f.name_last}</h3>
                                    {:else}
                                        <h3 class="font-bold text-neutral-500 text-lg italic">Anonymes Feedback</h3>
                                    {/if}
                                    <div class="flex items-center gap-1 mt-1">
                                        <span class="text-xs font-black {getRatingBadgeClass(f.rating)} px-2 py-0.5 rounded-md border">{f.rating} / 10</span>
                                    </div>
                                </div>
                                <div class="text-right">
                                    <p class="text-xs text-neutral-500 font-medium">{new Date(f.created).toLocaleDateString('de-DE')} {new Date(f.created).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</p>
                                    <span class="text-xs font-bold mt-1 block {f.status === 'Neu' ? 'text-amber-600' : (f.status === 'Gelesen' ? 'text-emerald-600' : 'text-neutral-400')}">{f.status}</span>
                                </div>
                            </div>
                            
                            {#if f.message}
                                <div class="bg-white p-3 rounded-lg border border-neutral-100 text-sm text-neutral-700 mb-4 flex-1 whitespace-pre-wrap shadow-inner">
                                    "{f.message}"
                                </div>
                            {/if}

                            <div class="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-neutral-100 mt-auto">
                                {#if f.status === 'Neu'}
                                    <button onclick={() => updateFeedbackStatus(f.id, 'Gelesen')} class="px-2 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200">Gelesen</button>
                                {/if}
                                {#if f.status !== 'Archieviert'}
                                    <button onclick={() => updateFeedbackStatus(f.id, 'Archieviert')} class="px-2 py-1.5 text-xs font-bold text-neutral-600 bg-neutral-50 hover:bg-neutral-100 rounded-lg transition-colors border border-neutral-200">Archivieren</button>
                                {/if}
                                <button onclick={() => deleteFeedback(f.id)} class="p-1.5 text-neutral-400 hover:text-rose-500 transition-colors shrink-0" title="Löschen"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
                            </div>
                        </div>
                    {/each}
                </div>
            {/if}
        {:else if activeTab === 'admissions'}
            {#if newClients.length === 0}
                <div class="text-center py-12 border-2 border-dashed border-neutral-200 rounded-2xl bg-neutral-50/50">
                    <span class="text-4xl mb-3 block opacity-80">🙌</span>
                    <p class="text-neutral-700 font-bold mb-1">Alles aktuell!</p>
                    <p class="text-neutral-400 text-sm">Es liegen keine Anfragen zur Neuaufnahme vor.</p>
                </div>
            {:else}
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {#each newClients as client (client.id)}
                        <div class="border border-emerald-200 bg-emerald-50/30 rounded-xl p-5 flex flex-col relative transition-all shadow-sm hover:shadow-md">
                            <div class="flex justify-between items-start mb-3">
                                <div class="min-w-0 pr-4">
                                    <h3 class="font-bold text-neutral-900 text-lg truncate">{client.name_first} {client.name_last}</h3>
                                    <div class="flex flex-wrap gap-2 mt-1">
                                        <span class="text-xs font-semibold text-emerald-700 bg-emerald-100 inline-block px-2 py-0.5 rounded border border-emerald-200">Neuaufnahme</span>
                                        {#if client.expand?.caregiver}
                                            {@const caregiver = Array.isArray(client.expand.caregiver) ? client.expand.caregiver[0] : client.expand.caregiver}
                                            <span class="text-xs font-semibold text-neutral-600 bg-neutral-100 inline-block px-2 py-0.5 rounded border border-neutral-200 truncate max-w-50" title="Betreuer">👤 {caregiver.name_first} {caregiver.name_last}</span>
                                        {/if}
                                    </div>
                                </div>
                                <div class="text-right shrink-0">
                                    <p class="text-xs text-neutral-500 font-medium">Angefragt am {new Date(client.created).toLocaleDateString('de-DE')}</p>
                                </div>
                            </div>
                            
                            <div class="bg-white p-3 rounded-lg border border-neutral-100 text-sm text-neutral-700 mb-4 flex-1 whitespace-pre-wrap shadow-inner custom-scrollbar overflow-y-auto max-h-32">
                                {(client.notes || '').replace('⚠️ NEUAUFNAHME-ANFRAGE:', '').trim()}
                            </div>
                            
                            <div class="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-neutral-100 mt-auto">
                                <button onclick={() => clientDetailModal?.open(client.id)} class="flex-1 sm:flex-none px-2 py-1.5 text-xs font-bold text-neutral-600 bg-white hover:bg-neutral-50 rounded-lg transition-colors border border-neutral-200 shadow-sm">Details ansehen</button>
                                <button onclick={() => acceptClient(client.id)} class="flex-1 sm:flex-none px-2 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors border border-emerald-300 shadow-sm">Aufnehmen (Aktivieren)</button>
                                <button onclick={() => deleteNewClient(client.id)} class="p-1.5 text-neutral-400 hover:text-rose-500 transition-colors shrink-0" title="Ablehnen / Löschen"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
                            </div>
                        </div>
                    {/each}
                </div>
            {/if}
        {/if}
    </div>
</div>

<RequestReplyModal bind:this={replyModal} />
<ClientDetailModal bind:this={clientDetailModal} />