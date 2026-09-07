<script lang="ts">
    import { pb } from '$lib/services/pocketbase';
    import { orgaStore } from '$lib/stores/orgaStore.svelte';
    import { toastStore } from '$lib/services/toastService.svelte';
    import { confirmStore } from '$lib/services/confirmService.svelte';
    import { onMount } from 'svelte';
    import { page } from '$app/stores';
    import type { SystemPromptRecord, ImprovementProposalRecord } from '$lib/types/orgaTypes';
    import FeedbackActionPromptModal from '$lib/components/admin/FeedbackActionPromptModal.svelte';
    import ImprovementProposalModal from '$lib/components/admin/ImprovementProposalModal.svelte';
    import SolutionPromptModal from '$lib/components/solution-generator/SolutionPromptModal.svelte';
    import ProposalSynthesizer from '$lib/components/admin/ProposalSynthesizer.svelte';
    import { proposalService } from '$lib/services/improvementProposalService.svelte';
    import { rbacService } from '$lib/services/rbacService.svelte';
    import { goto } from '$app/navigation';
    import { MessageSquare, Star, Sparkles, Filter, CheckCircle2, Clock, AlertCircle, RefreshCw, Eye, ArrowUpRight, Lightbulb, Plus, Trash2, Edit3, MessageCircle, Tag, CheckSquare, Square, Download, Zap, FileDown, Copy } from 'lucide-svelte';

    $effect(() => {
        if (!rbacService.canAccessSystemPrompts) {
            toastStore.warning("Nur für den Inhaber zugänglich.");
            goto('/admin');
        }
    });

    // Top-Level Tab Switcher: Wöchentliche Prompts vs. Einzel-Feedbacks vs. Verbesserungsvorschläge
    let mainTab = $state<'prompts' | 'feedbacks' | 'proposals'>('prompts');
    let feedbackActionModal: ReturnType<typeof FeedbackActionPromptModal>;
    let proposalModal: ReturnType<typeof ImprovementProposalModal>;
    let solutionModal: ReturnType<typeof SolutionPromptModal>;

    // Verbesserungsvorschläge State & Sammel-Auswahl
    let selectedProposalIds = $state<string[]>([]);
    let proposalStatusFilter = $state<'all' | 'idea' | 'planned' | 'in_progress' | 'implemented'>('all');
    let proposalCategoryFilter = $state<string>('all');
    let proposalPriorityFilter = $state<string>('all');
    let proposalSearch = $state<string>('');

    const inProgressProposals = $derived(
        proposalService.proposals.filter(p => p.status === 'in_progress')
    );

    const areAllInProgressSelected = $derived(
        inProgressProposals.length > 0 &&
        inProgressProposals.every(p => selectedProposalIds.includes(p.id))
    );

    function toggleSelectAllInProgress() {
        if (areAllInProgressSelected) {
            const inProgressIds = new Set(inProgressProposals.map(p => p.id));
            selectedProposalIds = selectedProposalIds.filter(id => !inProgressIds.has(id));
        } else {
            const merged = new Set([...selectedProposalIds, ...inProgressProposals.map(p => p.id)]);
            selectedProposalIds = Array.from(merged);
        }
    }

    const filteredProposals = $derived(
        proposalService.proposals.filter(p => {
            if (proposalStatusFilter !== 'all' && p.status !== proposalStatusFilter) return false;
            if (proposalCategoryFilter !== 'all' && p.category !== proposalCategoryFilter) return false;
            if (proposalPriorityFilter !== 'all' && p.priority !== proposalPriorityFilter) return false;
            if (proposalSearch.trim()) {
                const q = proposalSearch.toLowerCase();
                const matchTitle = (p.title || '').toLowerCase().includes(q);
                const matchDesc = (p.description || '').toLowerCase().includes(q);
                const matchConcept = (p.solution_concept || '').toLowerCase().includes(q);
                const matchTags = (p.tags || '').toLowerCase().includes(q);
                if (!matchTitle && !matchDesc && !matchConcept && !matchTags) return false;
            }
            return true;
        })
    );

    // Feedbacks & Support state (Terminanfragen werden strikt ignoriert, ChatWidget-Anfragen wählbar)
    let rawFeedbacks = $state<any[]>([]);
    let rawInquiries = $state<any[]>([]);
    let rawChatMessages = $state<any[]>([]);
    let isLoadingInbox = $state(false);

    let feedbackSourceFilter = $state<'all' | 'feedbacks' | 'inquiries' | 'chat'>('all');
    let feedbackStatusFilter = $state<'all' | 'Neu' | 'In Bearbeitung' | 'Gelöst'>('all');
    let feedbackRatingFilter = $state<'all' | 'critical' | 'good'>('all');
    let feedbackSearch = $state('');

    // Local state for direct fetching & realtime fallback
    let localPrompts = $state<SystemPromptRecord[]>([]);
    let isLoading = $state<boolean>(true);
    let isRefreshing = $state<boolean>(false);

    // Reactive store data from orgaStore or local state
    let prompts = $derived<SystemPromptRecord[]>(
        (orgaStore.system_prompts?.data && orgaStore.system_prompts.data.length > 0)
            ? orgaStore.system_prompts.data
            : localPrompts
    );
    let selectedPromptId = $state<string>('');
    let statusFilter = $state<'all' | 'open' | 'applied' | 'archived'>('all');
    let searchQuery = $state<string>('');
    let copiedState = $state<boolean>(false);
    let isGenerating = $state<boolean>(false);
    let viewMode = $state<'formatted' | 'raw'>('formatted');
    let generateDays = $state<number>(7);
    let includeChatInDigest = $state<boolean>(true);
    let includeProposalsInDigest = $state<boolean>(true);
    let includeInquiriesInDigest = $state<boolean>(true);
    let includeAppointmentRequestsInDigest = $state<boolean>(true);
    let copyForAntigravitySuccess = $state<boolean>(false);
    let downloadSuccess = $state<boolean>(false);

    // Modal state for CRUD (Create & Update)
    let isModalOpen = $state<boolean>(false);
    let modalMode = $state<'create' | 'edit'>('create');
    let modalPromptId = $state<string>('');
    let modalTitle = $state<string>('');
    let modalCalendarWeek = $state<string>('');
    let modalStatus = $state<'open' | 'applied' | 'archived'>('open');
    let modalPromptContent = $state<string>('');
    let modalRawSummary = $state<string>('');
    let isSaving = $state<boolean>(false);

    // Default template for manual creation
    const DEFAULT_PROMPT_TEMPLATE = `## Executive Summary & Zielsetzung
Überblick über die durchgeführten Analysen und Kernziele für diese Kalenderwoche.

## Bereich 1: Core Engine & System-Architektur
- Konkrete Architekturverbesserungen
- Fehlerkorrekturen und Typensicherheit

## Bereich 2: Datenmodell & PocketBase Integrität
- Schemaanpassungen und Validierungen
- Regelwerke und Berechtigungen

## Bereich 3: Abrechnung & Finanz-Workflows
- Rechnungs- und BWA-Optimierungen
- DATEV- und Exportlogik

## Bereich 4: Mobile & Mitarbeiter-UX
- UI-Optimierungen für Smartphones
- Zeiterfassungs- und Fahrtenbuch-Flows

## Bereich 5: Stabilität & Performance
- Ladezeiten und Caching
- Logging und Fehlertoleranz

## Priorisierte Umsetzungsreihenfolge
1. Sofortmaßnahmen (Prio 1)
2. Folgeanpassungen (Prio 2)
3. Refactoring (Prio 3)`;

    // ISO-8601 Calendar Week calculation helper
    function getISOWeekString(date = new Date()): string {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
        return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
    }

    // Format ISO string "2026-W36" to "KW 36 / 2026"
    function formatKW(kwStr?: string): string {
        if (!kwStr) return '';
        const match = kwStr.match(/^(\d{4})-W(\d{1,2})$/);
        if (match) {
            return `KW ${parseInt(match[2], 10)} / ${match[1]}`;
        }
        return kwStr;
    }

    const currentKWString = getISOWeekString();

    // Check if the currently typed modal calendar week collides with an existing prompt
    let kwConflictPrompt = $derived.by(() => {
        const targetKW = modalCalendarWeek.trim();
        if (!targetKW) return null;
        return prompts.find(p => p.calendar_week === targetKW && p.id !== modalPromptId) || null;
    });

    async function loadPrompts() {
        isLoading = true;
        try {
            if (pb.authStore.isValid) {
                const list = await pb.collection('system_prompts').getFullList<SystemPromptRecord>({
                    sort: '-created',
                    requestKey: null
                });
                localPrompts = list;
                if (!selectedPromptId && list.length > 0) {
                    selectedPromptId = list[0].id;
                }
            }
        } catch (err: any) {
            console.warn("[System Prompts Load Error]:", err);
            // Fallback: versuche Abfrage ohne Sortierung
            try {
                const fallbackList = await pb.collection('system_prompts').getFullList<SystemPromptRecord>({
                    requestKey: null
                });
                localPrompts = fallbackList;
                if (!selectedPromptId && fallbackList.length > 0) {
                    selectedPromptId = fallbackList[0].id;
                }
            } catch (e2) {
                console.error("[System Prompts Fallback Load Error]:", e2);
            }
        } finally {
            isLoading = false;
        }
    }

    async function handleRefreshList() {
        isRefreshing = true;
        try {
            await loadPrompts();
            toastStore.success('Prompts-Liste erfolgreich aktualisiert! 🔄');
        } catch {
            toastStore.error('Aktualisierung fehlgeschlagen.');
        } finally {
            isRefreshing = false;
        }
    }

    onMount(() => {
        loadPrompts();
        loadInboxItems();
        proposalService.init();

        if ($page.url.searchParams.get('tab') === 'feedbacks') {
            mainTab = 'feedbacks';
        } else if ($page.url.searchParams.get('tab') === 'proposals') {
            mainTab = 'proposals';
        }

        // Stelle sicher, dass auch der orgaStore läuft
        if (pb.authStore.isValid && orgaStore.system_prompts) {
            orgaStore.system_prompts.init().catch(() => {});
        }

        // Live SSE-Abonnement für Prompts
        let unsubPrompts: (() => void) | null = null;
        pb.collection('system_prompts').subscribe<SystemPromptRecord>('*', (e) => {
            if (e.action === 'create') {
                localPrompts = [e.record, ...localPrompts.filter(p => p.id !== e.record.id)];
                if (!selectedPromptId) selectedPromptId = e.record.id;
            } else if (e.action === 'update') {
                localPrompts = localPrompts.map(p => p.id === e.record.id ? e.record : p);
            } else if (e.action === 'delete') {
                localPrompts = localPrompts.filter(p => p.id !== e.record.id);
                if (selectedPromptId === e.record.id) {
                    selectedPromptId = localPrompts[0]?.id || '';
                }
            }
        }).then(u => { unsubPrompts = u; }).catch(() => {});

        // Live SSE-Abonnement für Feedbacks
        let unsubFeedbacks: (() => void) | null = null;
        pb.collection('feedbacks').subscribe('*', (e) => {
            if (e.action === 'create') {
                rawFeedbacks = [e.record, ...rawFeedbacks.filter(f => f.id !== e.record.id)];
                toastStore.info(`Neues Feedback eingegangen von ${e.record.name_first || 'Klient'} ⭐`);
            } else if (e.action === 'update') {
                rawFeedbacks = rawFeedbacks.map(f => f.id === e.record.id ? e.record : f);
            } else if (e.action === 'delete') {
                rawFeedbacks = rawFeedbacks.filter(f => f.id !== e.record.id);
            }
        }).then(u => { unsubFeedbacks = u; }).catch(() => {});

        // Live SSE-Abonnement für Team-Chat
        let unsubChat: (() => void) | null = null;
        pb.collection('live_chat').subscribe('*', async (e) => {
            if (e.action === 'create') {
                try {
                    const record = await pb.collection('live_chat').getOne(e.record.id, { expand: 'user,whispered_user', requestKey: null });
                    rawChatMessages = [record, ...rawChatMessages.filter(c => c.id !== e.record.id)];
                    if (record.text?.includes('🚨 [BUG REPORT]')) {
                        toastStore.warning(`Neuer Bug-Report im Team-Chat eingegangen! 🚨`);
                    }
                } catch {
                    rawChatMessages = [e.record, ...rawChatMessages.filter(c => c.id !== e.record.id)];
                }
            } else if (e.action === 'update') {
                rawChatMessages = rawChatMessages.map(c => c.id === e.record.id ? e.record : c);
            } else if (e.action === 'delete') {
                rawChatMessages = rawChatMessages.filter(c => c.id !== e.record.id);
            }
        }).then(u => { unsubChat = u; }).catch(() => {});

        return () => {
            if (unsubPrompts) unsubPrompts();
            else pb.collection('system_prompts').unsubscribe('*').catch(() => {});
            if (unsubFeedbacks) unsubFeedbacks();
            else pb.collection('feedbacks').unsubscribe('*').catch(() => {});
            if (unsubChat) unsubChat();
            else pb.collection('live_chat').unsubscribe('*').catch(() => {});
        };
    });

    let newFeedbacksCount = $derived.by(() => {
        const newFb = rawFeedbacks.filter(f => !f.status || f.status === 'Neu').length;
        const newInq = rawInquiries.filter(i => !i.status || i.status === 'new').length;
        const newChat = rawChatMessages.filter(c => !c.status || c.status === 'Neu' || c.text?.includes('🚨 [BUG REPORT]')).length;
        return newFb + newInq + newChat;
    });

    async function loadInboxItems() {
        isLoadingInbox = true;
        try {
            const [fbRes, inqRes, chatRes] = await Promise.allSettled([
                pb.collection('feedbacks').getFullList({
                    sort: '-created',
                    expand: 'client,appointment,submitted_by',
                    requestKey: null
                }),
                pb.collection('inquiries').getFullList({
                    sort: '-created',
                    requestKey: null
                }),
                pb.collection('live_chat').getFullList({
                    sort: '-created',
                    expand: 'user,whispered_user',
                    requestKey: null
                })
            ]);

            if (fbRes.status === 'fulfilled') rawFeedbacks = fbRes.value;
            if (inqRes.status === 'fulfilled') rawInquiries = inqRes.value;
            if (chatRes.status === 'fulfilled') rawChatMessages = chatRes.value;
        } catch (e) {
            console.warn("[Inbox Load Error]:", e);
        } finally {
            isLoadingInbox = false;
        }
    }

    interface UnifiedInboxItem {
        id: string;
        source: 'feedback' | 'inquiry' | 'chat';
        title: string;
        sender: string;
        email: string;
        message: string;
        rating: number | null;
        status: string;
        date: string;
        context: string;
        rawRecord: any;
    }

    let unifiedInboxItems = $derived.by(() => {
        const list: UnifiedInboxItem[] = [];

        if (feedbackSourceFilter === 'all' || feedbackSourceFilter === 'feedbacks') {
            for (const f of rawFeedbacks) {
                const nameFirst = f.name_first || f.expand?.client?.name_first || '';
                const nameLast = f.name_last || f.expand?.client?.name_last || '';
                const sender = [nameFirst, nameLast].filter(Boolean).join(' ') || 'Klient / Nutzer';
                const contextParts: string[] = [];
                if (f.expand?.client) contextParts.push(`Klient: ${f.expand.client.name_first} ${f.expand.client.name_last}`);
                if (f.expand?.appointment) contextParts.push(`Termin: ${new Date(f.expand.appointment.appointment).toLocaleDateString('de-DE')}`);

                list.push({
                    id: f.id,
                    source: 'feedback',
                    title: f.message ? (f.message.length > 50 ? f.message.substring(0, 47) + '...' : f.message) : 'Feedback',
                    sender,
                    email: f.expand?.client?.email || '',
                    message: f.message || '',
                    rating: f.rating || null,
                    status: f.status === 'Gelesen' ? 'In Bearbeitung' : (f.status === 'Archieviert' || f.status === 'Archiviert') ? 'Gelöst' : (f.status || 'Neu'),
                    date: f.created,
                    context: contextParts.join(' | '),
                    rawRecord: f
                });
            }
        }

        if (feedbackSourceFilter === 'all' || feedbackSourceFilter === 'inquiries') {
            for (const i of rawInquiries) {
                list.push({
                    id: i.id,
                    source: 'inquiry',
                    title: i.raw_text ? (i.raw_text.length > 50 ? i.raw_text.substring(0, 47) + '...' : i.raw_text) : 'Kundenanfrage',
                    sender: i.sender_name || 'Interessent',
                    email: i.sender_email || '',
                    message: i.raw_text || '',
                    rating: null,
                    status: i.status === 'new' ? 'Neu' : i.status === 'in_progress' ? 'In Bearbeitung' : (i.status === 'converted' || i.status === 'rejected' ? 'Gelöst' : 'Neu'),
                    date: i.created,
                    context: `Dringlichkeit: ${i.urgency || 'normal'} • Tel: ${i.sender_phone || '-'}`,
                    rawRecord: i
                });
            }
        }

        if (feedbackSourceFilter === 'all' || feedbackSourceFilter === 'chat') {
            for (const c of rawChatMessages) {
                const userName = c.expand?.user 
                    ? `${c.expand.user.name_first || ''} ${c.expand.user.name_last || ''}`.trim() || c.expand.user.username || 'Mitarbeiter'
                    : 'Mitarbeiter / Team';
                const isBug = c.text?.includes('🚨 [BUG REPORT]');
                const cleanText = isBug ? c.text.replace('🚨 [BUG REPORT]\n\n', '').trim() : (c.text || '');

                list.push({
                    id: c.id,
                    source: 'chat',
                    title: isBug ? '🚨 Bug-Report im Team-Chat' : (cleanText.length > 50 ? cleanText.substring(0, 47) + '...' : (cleanText || 'Chat-Nachricht')),
                    sender: userName,
                    email: c.expand?.user?.email || '',
                    message: cleanText,
                    rating: isBug ? 3 : null,
                    status: c.status || (isBug ? 'Neu' : 'Neu'),
                    date: c.created,
                    context: isBug ? '🚨 Bug Report aus ChatWidget' : (c.whispered ? '🤫 Geflüstert im Team-Chat' : '💬 Team-Chat Nachricht'),
                    rawRecord: c
                });
            }
        }

        list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return list.filter(item => {
            if (feedbackStatusFilter !== 'all') {
                if (feedbackStatusFilter === 'Neu' && item.status !== 'Neu' && item.status !== 'new') return false;
                if (feedbackStatusFilter === 'In Bearbeitung' && item.status !== 'In Bearbeitung' && item.status !== 'in_progress' && item.status !== 'Gelesen') return false;
                if (feedbackStatusFilter === 'Gelöst' && item.status !== 'Gelöst' && item.status !== 'Archiviert' && item.status !== 'Archieviert' && item.status !== 'converted') return false;
            }

            if (feedbackRatingFilter === 'critical') {
                if (item.rating === null || item.rating > 5) return false;
            } else if (feedbackRatingFilter === 'good') {
                if (item.rating === null || item.rating <= 5) return false;
            }

            if (feedbackSearch.trim()) {
                const q = feedbackSearch.toLowerCase().trim();
                const matches = item.sender.toLowerCase().includes(q) ||
                    item.message.toLowerCase().includes(q) ||
                    item.context.toLowerCase().includes(q) ||
                    item.email.toLowerCase().includes(q);
                if (!matches) return false;
            }

            return true;
        });
    });

    async function updateInboxItemStatus(item: UnifiedInboxItem, newStatus: string) {
        try {
            if (item.source === 'feedback') {
                try {
                    await pb.collection('feedbacks').update(item.id, { status: newStatus }, { requestKey: null });
                } catch (fbErr: any) {
                    console.warn('[updateInboxItemStatus] Primary status update failed, applying fallback enum:', fbErr);
                    const fallbackStatus = (newStatus === 'In Bearbeitung' || newStatus === 'In Arbeit') ? 'Gelesen' : (newStatus === 'Gelöst' ? 'Archieviert' : 'Neu');
                    await pb.collection('feedbacks').update(item.id, { status: fallbackStatus }, { requestKey: null });
                }
                rawFeedbacks = rawFeedbacks.map(f => f.id === item.id ? { ...f, status: newStatus } : f);
            } else if (item.source === 'inquiry') {
                const mapStatus = newStatus === 'Neu' ? 'new' : (newStatus === 'In Bearbeitung' || newStatus === 'In Arbeit') ? 'in_progress' : 'converted';
                await pb.collection('inquiries').update(item.id, { status: mapStatus }, { requestKey: null });
                rawInquiries = rawInquiries.map(i => i.id === item.id ? { ...i, status: mapStatus } : i);
            } else if (item.source === 'chat') {
                try {
                    await pb.collection('live_chat').update(item.id, { status: newStatus }, { requestKey: null });
                } catch (chatErr: any) {
                    console.warn('[updateInboxItemStatus] Direct PB live_chat update failed, attempting microservice fallback:', chatErr);
                    const microserviceUrl = import.meta.env.DEV ? 'http://localhost:3000' : '';
                    const res = await fetch(`${microserviceUrl}/api/emails/admin/feedback-react`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': pb.authStore.token ? `Bearer ${pb.authStore.token}` : ''
                        },
                        body: JSON.stringify({
                            id: item.id,
                            source: 'chat',
                            newStatus
                        })
                    });
                    if (!res.ok) {
                        throw new Error(chatErr.message || 'Status konnte nicht in PocketBase gespeichert werden.');
                    }
                }
                rawChatMessages = rawChatMessages.map(c => c.id === item.id ? { ...c, status: newStatus } : c);
            }
            toastStore.success(`Status auf '${newStatus}' gesetzt.`);
        } catch (e: any) {
            toastStore.error(`Statusänderung fehlgeschlagen: ${e.message}`);
        }
    }

    function convertInboxItemToProposal(item: any) {
        proposalModal?.open({
            id: '',
            title: item.title || item.context || `Vorschlag aus ${item.source === 'chat' ? 'Chat' : 'Feedback'} von ${item.sender}`,
            category: 'Core Engine & API',
            priority: item.rating && item.rating <= 5 ? 'high' : 'medium',
            status: 'idea',
            description: item.message || '',
            solution_concept: '',
            source_type: item.source,
            source_id: item.id,
            author_name: item.sender
        } as any, (savedProposal) => {
            feedbackActionModal?.open(savedProposal, 'proposal');
        });
    }

    async function shareProposalInChat(p: ImprovementProposalRecord) {
        if (await confirmStore.ask(`Möchten Sie den Vorschlag "${p.title}" als Impuls im Team-Chat teilen?`, "Im Team-Chat teilen?", "Ja, teilen", "Abbrechen")) {
            try {
                const priorityEmoji = p.priority === 'critical' ? '🚨' : p.priority === 'high' ? '🟠' : '💡';
                const chatMessage = `${priorityEmoji} [VERBESSERUNGSVORSCHLAG] ${p.title}\n\nBereich: ${p.category} | Priorität: ${p.priority.toUpperCase()}\n\nAusgangslage:\n${p.description}${p.solution_concept ? `\n\nGeplante Lösung:\n${p.solution_concept}` : ''}`;
                await pb.collection('live_chat').create({
                    text: chatMessage,
                    user: pb.authStore.model?.id || null,
                    whispered: false
                }, { requestKey: null });
                toastStore.success("Vorschlag erfolgreich im Team-Chat gepostet! 💬");
            } catch (e: any) {
                toastStore.error("Fehler beim Teilen im Chat: " + e.message);
            }
        }
    }

    // Initialisiere Auswahl sobald Daten vorliegen
    $effect(() => {
        if (!selectedPromptId && prompts.length > 0) {
            selectedPromptId = prompts[0].id;
        }
    });

    // Filtered list
    let filteredPrompts = $derived.by(() => {
        return prompts.filter((p: SystemPromptRecord) => {
            const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
            const q = searchQuery.toLowerCase().trim();
            const kwDisplay = formatKW(p.calendar_week).toLowerCase();
            const matchesSearch = !q || 
                (p.title || '').toLowerCase().includes(q) ||
                (p.calendar_week || '').toLowerCase().includes(q) ||
                kwDisplay.includes(q) ||
                (p.prompt_content || '').toLowerCase().includes(q);
            return matchesStatus && matchesSearch;
        });
    });

    // Currently selected prompt
    let selectedPrompt = $derived.by(() => {
        if (!selectedPromptId && filteredPrompts.length > 0) {
            return filteredPrompts[0];
        }
        return prompts.find((p: SystemPromptRecord) => p.id === selectedPromptId) || filteredPrompts[0] || null;
    });

    // Parse sections from Markdown for rich formatted tabs/cards
    let parsedSections = $derived.by(() => {
        if (!selectedPrompt?.prompt_content) return [];
        const content = selectedPrompt.prompt_content;
        
        // Split by ## headers
        const parts = content.split(/^##\s+/m);
        const sections: Array<{ title: string; body: string; icon: string; badgeColor: string }> = [];

        for (let i = 1; i < parts.length; i++) {
            const part = parts[i];
            const firstLineBreak = part.indexOf('\n');
            const title = (firstLineBreak > -1 ? part.substring(0, firstLineBreak) : part).trim();
            const body = (firstLineBreak > -1 ? part.substring(firstLineBreak + 1) : '').trim();

            let icon = '⚡';
            let badgeColor = 'bg-indigo-50 text-indigo-700 border-indigo-200';

            if (title.toLowerCase().includes('executive summary') || title.toLowerCase().includes('audit')) {
                icon = '📊';
                badgeColor = 'bg-blue-50 text-blue-700 border-blue-200';
            } else if (title.includes('Bereich 1') || title.toLowerCase().includes('core engine')) {
                icon = '⚙️';
                badgeColor = 'bg-purple-50 text-purple-700 border-purple-200';
            } else if (title.includes('Bereich 2') || title.toLowerCase().includes('datenmodell')) {
                icon = '🗄️';
                badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
            } else if (title.includes('Bereich 3') || title.toLowerCase().includes('abrechnung')) {
                icon = '💶';
                badgeColor = 'bg-amber-50 text-amber-700 border-amber-200';
            } else if (title.includes('Bereich 4') || title.toLowerCase().includes('mobile')) {
                icon = '📱';
                badgeColor = 'bg-cyan-50 text-cyan-700 border-cyan-200';
            } else if (title.includes('Bereich 5') || title.toLowerCase().includes('performance')) {
                icon = '🛡️';
                badgeColor = 'bg-rose-50 text-rose-700 border-rose-200';
            } else if (title.toLowerCase().includes('priorisiert') || title.toLowerCase().includes('reihenfolge')) {
                icon = '🎯';
                badgeColor = 'bg-orange-50 text-orange-700 border-orange-200';
            }

            sections.push({ title, body, icon, badgeColor });
        }

        return sections;
    });

    async function copyToClipboard(text: string) {
        try {
            await navigator.clipboard.writeText(text);
            copiedState = true;
            toastStore.success('Vollständiger Prompt in Zwischenablage kopiert! 📋');
            setTimeout(() => {
                copiedState = false;
            }, 3000);
        } catch {
            toastStore.error('Kopieren fehlgeschlagen.');
        }
    }

    async function copyForAntigravity(prompt: SystemPromptRecord) {
        if (!prompt?.prompt_content) return;
        try {
            const formattedForAgent = `=== AUSBESSERUNGSAUFTRAG FÜR GEMINI CODE ASSIST (AGENT) IN ANTIGRAVITY ===\n\n` +
                prompt.prompt_content.trim() + 
                `\n\n=== VERIFIKATION NACH UMSETZUNG ===\n` +
                `- Typecheck: cd frontend && npm run check\n` +
                `- Build: cd frontend && npm run build\n` +
                `- Asset-Sync: robocopy frontend\\pb_public backend\\pb_public /MIR\n`;
            await navigator.clipboard.writeText(formattedForAgent);
            copyForAntigravitySuccess = true;
            toastStore.success('Perfekt formatiert für Antigravity Agent kopiert! ⚡');
            setTimeout(() => { copyForAntigravitySuccess = false; }, 3000);
        } catch {
            toastStore.error('Kopieren fehlgeschlagen.');
        }
    }

    function downloadPromptFile(prompt: SystemPromptRecord) {
        if (!prompt?.prompt_content) return;
        try {
            const kwPart = prompt.calendar_week ? prompt.calendar_week.replace(/[^a-zA-Z0-9_-]/g, '_') : 'Prompt';
            const blob = new Blob([prompt.prompt_content], { type: 'text/markdown;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `System-Prompt_${kwPart}.md`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            downloadSuccess = true;
            toastStore.success('Prompt als Markdown-Datei heruntergeladen! 💾');
            setTimeout(() => { downloadSuccess = false; }, 2500);
        } catch (e) {
            toastStore.error('Download fehlgeschlagen.');
        }
    }

    async function copySection(sectionTitle: string, sectionBody: string) {
        try {
            await navigator.clipboard.writeText(`## ${sectionTitle}\n\n${sectionBody}`);
            toastStore.success(`Abschnitt "${sectionTitle}" kopiert!`);
        } catch {
            toastStore.error('Kopieren fehlgeschlagen.');
        }
    }

    // Modal Handlers for Create and Edit (C & U)
    function openCreateModal() {
        modalMode = 'create';
        modalPromptId = '';
        
        // Check if current KW is already taken
        const isCurrentTaken = prompts.some(p => p.calendar_week === currentKWString);
        modalCalendarWeek = currentKWString;
        modalTitle = `Wöchentlicher System-Ausbesserungsprompt (${formatKW(currentKWString)})`;
        modalStatus = 'open';
        modalPromptContent = DEFAULT_PROMPT_TEMPLATE;
        modalRawSummary = '';
        isModalOpen = true;

        if (isCurrentTaken) {
            toastStore.info(`Hinweis: Für ${formatKW(currentKWString)} existiert bereits ein Prompt. Wählen Sie ggf. eine andere KW oder bearbeiten Sie den bestehenden Prompt.`);
        }
    }

    function openEditModal(prompt: SystemPromptRecord) {
        modalMode = 'edit';
        modalPromptId = prompt.id;
        modalTitle = prompt.title || '';
        modalCalendarWeek = prompt.calendar_week || '';
        modalStatus = prompt.status || 'open';
        modalPromptContent = prompt.prompt_content || '';
        modalRawSummary = prompt.raw_summary || '';
        isModalOpen = true;
    }

    async function handleModalSave(e?: Event) {
        if (e) e.preventDefault();

        if (!modalTitle.trim()) {
            toastStore.error("Bitte geben Sie einen Titel an.");
            return;
        }

        const targetKW = modalCalendarWeek.trim();
        if (!targetKW) {
            toastStore.error("Bitte geben Sie eine Kalenderwoche an (z.B. 2026-W36).");
            return;
        }

        // Validate 1 prompt per KW constraint
        if (kwConflictPrompt) {
            toastStore.error(`Für ${formatKW(targetKW)} existiert bereits ein Prompt. Pro Kalenderwoche kann nur genau 1 Prompt existieren.`);
            return;
        }

        if (!modalPromptContent.trim()) {
            toastStore.error("Bitte geben Sie den Prompt-Inhalt an.");
            return;
        }

        isSaving = true;
        try {
            const payload: Partial<SystemPromptRecord> = {
                title: modalTitle.trim(),
                calendar_week: targetKW,
                status: modalStatus,
                prompt_content: modalPromptContent.trim(),
                raw_summary: modalRawSummary.trim() || undefined
            };

            if (modalMode === 'create') {
                const created = await pb.collection('system_prompts').create<SystemPromptRecord>(payload);
                localPrompts = [created, ...localPrompts.filter(p => p.id !== created.id)];
                selectedPromptId = created.id;
                toastStore.success(`Prompt für ${formatKW(created.calendar_week)} erfolgreich angelegt! ✅`);
            } else {
                const updated = await pb.collection('system_prompts').update<SystemPromptRecord>(modalPromptId, payload);
                localPrompts = localPrompts.map(p => p.id === modalPromptId ? updated : p);
                selectedPromptId = updated.id;
                toastStore.success(`Prompt "${updated.title}" erfolgreich gespeichert! ✅`);
            }
            isModalOpen = false;
        } catch (err: any) {
            console.error("[Modal Save Error]:", err);
            toastStore.error(`Fehler beim Speichern: ${err.message}`);
        } finally {
            isSaving = false;
        }
    }

    async function updatePromptStatus(id: string, newStatus: 'open' | 'applied' | 'archived') {
        try {
            await pb.collection('system_prompts').update(id, { status: newStatus });
            localPrompts = localPrompts.map(p => p.id === id ? { ...p, status: newStatus } : p);
            toastStore.success(`Status auf "${newStatus}" aktualisiert!`);
        } catch (err: any) {
            console.error("[Update Status Error]:", err);
            toastStore.error(`Fehler beim Aktualisieren: ${err.message}`);
        }
    }

    // Delete Prompt (D)
    async function deletePrompt(id: string) {
        const promptToDelete = prompts.find(p => p.id === id);
        const kwText = promptToDelete?.calendar_week ? ` (${formatKW(promptToDelete.calendar_week)})` : '';
        const confirmMessage = `Möchten Sie den Prompt "${promptToDelete?.title || 'Diesen Prompt'}"${kwText} wirklich unwiderruflich löschen?\n\nDadurch wird diese Kalenderwoche wieder für einen neuen Prompt freigegeben.`;

        if (await confirmStore.ask(confirmMessage, "Prompt löschen?", "Unwiderruflich löschen", "Abbrechen", true)) {
            try {
                await pb.collection('system_prompts').delete(id);
                localPrompts = localPrompts.filter(p => p.id !== id);
                toastStore.info("Prompt wurde erfolgreich gelöscht. 🗑️");
                if (selectedPromptId === id) {
                    selectedPromptId = localPrompts[0]?.id || '';
                }
            } catch (err: any) {
                console.error("[Delete Prompt Error]:", err);
                toastStore.error(`Fehler beim Löschen: ${err.message}`);
            }
        }
    }

    // AI Generation (Create or Refresh KW Prompt)
    async function handleGenerateNow() {
        isGenerating = true;
        try {
            const microserviceUrl = import.meta.env.DEV ? 'http://localhost:3000' : '';
            const res = await fetch(`${microserviceUrl}/api/emails/admin/system-prompts/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': pb.authStore.token ? `Bearer ${pb.authStore.token}` : ''
                },
                body: JSON.stringify({ 
                    days: generateDays, 
                    forceCreate: true, 
                    includeChat: includeChatInDigest,
                    includeProposals: includeProposalsInDigest,
                    includeInquiries: includeInquiriesInDigest,
                    includeAppointmentRequests: includeAppointmentRequestsInDigest
                })
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || `Server antwortete mit Status ${res.status}`);
            }

            const result = await res.json();
            const actionVerb = result.action === 'updated' ? 'aktualisiert' : 'generiert';
            toastStore.success(`Prompt für ${formatKW(result.record?.calendar_week) || 'aktuelle KW'} erfolgreich ${actionVerb}! (${result.title || 'KW-Digest'})`);
            
            // Reload list immediately
            await loadPrompts();
            if (result.record?.id) {
                selectedPromptId = result.record.id;
            }
        } catch (err: any) {
            console.error("[Generate Prompt Error]:", err);
            toastStore.error(`Generierung fehlgeschlagen: ${err.message}`);
        } finally {
            isGenerating = false;
        }
    }

    function formatDate(dateStr: string) {
        if (!dateStr) return '–';
        try {
            const d = new Date(dateStr);
            return d.toLocaleDateString('de-DE', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return dateStr;
        }
    }

    function formatShortDate(dateStr: string) {
        if (!dateStr) return '–';
        try {
            const d = new Date(dateStr);
            return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
        } catch {
            return dateStr;
        }
    }

    function getStatusBadge(status: string) {
        switch (status) {
            case 'applied':
                return { label: 'In Umsetzung / Angewendet', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' };
            case 'archived':
                return { label: 'Archiviert', bg: 'bg-neutral-100 text-neutral-600 border-neutral-200', dot: 'bg-neutral-400' };
            case 'open':
            default:
                return { label: 'Offen / Neu', bg: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500 animate-pulse' };
        }
    }
</script>

<svelte:head>
    <title>Auto-Update Prompts | OrgaFlow Admin</title>
</svelte:head>

<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-enter">
    
    <!-- Top Breadcrumb & Global Action Toolbar (CRUD: Create, Refresh) -->
    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
        <div class="flex items-center gap-3">
            <a href="/admin" class="p-2 text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 rounded-xl transition-colors inline-flex items-center gap-1.5 text-xs font-semibold">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                Administration
            </a>
            <span class="text-neutral-300">/</span>
            <span class="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">Feedback-to-Prompt Engine</span>
        </div>

        <!-- Global Action Buttons: Create, Refresh, AI Generate -->
        <div class="flex flex-wrap items-center gap-2">
            <!-- REFRESH (R): List reload -->
            <button 
                type="button" 
                onclick={handleRefreshList}
                disabled={isRefreshing || isLoading}
                class="orga-button-ghost py-1.5 px-3 text-xs font-bold inline-flex items-center gap-1.5 border border-neutral-200 hover:bg-neutral-100 cursor-pointer"
                title="Prompts-Liste aus Datenbank neu laden"
            >
                <svg class="w-3.5 h-3.5 text-neutral-600 {isRefreshing ? 'animate-spin' : ''}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Neu laden</span>
            </button>

            <!-- CREATE (C): Manual Prompt Button -->
            <button 
                type="button" 
                onclick={openCreateModal}
                class="orga-button-secondary py-1.5 px-3 text-xs font-bold inline-flex items-center gap-1.5 bg-neutral-900 hover:bg-neutral-800 text-white cursor-pointer"
                title="Neuen Prompt manuell anlegen (1 pro KW)"
            >
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
                <span>+ Prompt manuell anlegen</span>
            </button>

            <!-- CREATE / REFRESH via AI (C/R) -->
            <div class="flex flex-wrap items-center gap-1.5 bg-indigo-50/90 p-1 rounded-2xl border border-indigo-100 shadow-xs">
                <select bind:value={generateDays} class="bg-white border border-indigo-200 rounded-lg py-1 px-2 text-xs font-semibold text-indigo-900 cursor-pointer shadow-2xs focus:ring-1 focus:ring-indigo-500" disabled={isGenerating}>
                    <option value={7}>Letzte 7 Tage</option>
                    <option value={14}>Letzte 14 Tage</option>
                    <option value={30}>Letzte 30 Tage</option>
                </select>

                <!-- Checkbox to include improvement proposals -->
                <label class="flex items-center gap-1 px-2 py-1 text-xs font-semibold text-indigo-950 cursor-pointer hover:bg-indigo-100/70 rounded-lg transition-colors select-none" title="Offene Verbesserungsvorschläge aus dem Team mit einbeziehen">
                    <input type="checkbox" bind:checked={includeProposalsInDigest} class="w-3.5 h-3.5 text-indigo-600 rounded border-indigo-300 focus:ring-indigo-500 cursor-pointer" />
                    <span>💡 Vorschläge</span>
                </label>

                <!-- Checkbox to include ChatWidget messages -->
                <label class="flex items-center gap-1 px-2 py-1 text-xs font-semibold text-indigo-950 cursor-pointer hover:bg-indigo-100/70 rounded-lg transition-colors select-none" title="ChatWidget-Nachrichten (Mitarbeiteranfragen, Bug-Reports) mit einbeziehen">
                    <input type="checkbox" bind:checked={includeChatInDigest} class="w-3.5 h-3.5 text-indigo-600 rounded border-indigo-300 focus:ring-indigo-500 cursor-pointer" />
                    <span>💬 Chat</span>
                </label>

                <!-- Checkbox to include inquiries -->
                <label class="flex items-center gap-1 px-2 py-1 text-xs font-semibold text-indigo-950 cursor-pointer hover:bg-indigo-100/70 rounded-lg transition-colors select-none" title="Kunden- und Landing-Page-Anfragen mit einbeziehen">
                    <input type="checkbox" bind:checked={includeInquiriesInDigest} class="w-3.5 h-3.5 text-indigo-600 rounded border-indigo-300 focus:ring-indigo-500 cursor-pointer" />
                    <span>📬 Anfragen</span>
                </label>

                <button 
                    type="button" 
                    onclick={handleGenerateNow}
                    disabled={isGenerating} 
                    class="orga-button-primary py-1.5 px-3.5 text-xs font-bold shadow-indigo-600/20 inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                    title="Analysiert Feedbacks, Vorschläge und Chat-Logs und generiert den Antigravity-Ausbesserungsprompt"
                >
                    {#if isGenerating}
                        <svg class="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        <span>Analysiere Quellen...</span>
                    {:else}
                        <Zap class="w-3.5 h-3.5 text-amber-300" />
                        <span>Prompt für Antigravity generieren</span>
                    {/if}
                </button>
            </div>
        </div>
    </div>

    <!-- Top-Level Tab Switcher: Wöchentliche Prompts vs. Einzel-Feedbacks & Support-Inbox -->
    <div class="flex flex-wrap items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-neutral-200 shadow-xs">
        <div class="flex items-center gap-2 w-full sm:w-auto">
            <button
                type="button"
                onclick={() => mainTab = 'prompts'}
                class="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer {mainTab === 'prompts' ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30' : 'text-neutral-600 hover:bg-neutral-100'}"
            >
                <span>📅</span>
                <span>Wöchentliche System-Prompts</span>
                <span class="px-1.5 py-0.5 rounded-md text-[10px] {mainTab === 'prompts' ? 'bg-white/20 text-white' : 'bg-neutral-200 text-neutral-700'}">{prompts.length}</span>
            </button>
            <button
                type="button"
                onclick={() => { mainTab = 'feedbacks'; if (rawFeedbacks.length === 0) loadInboxItems(); }}
                class="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer {mainTab === 'feedbacks' ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30' : 'text-neutral-600 hover:bg-neutral-100'}"
            >
                <span>🎯</span>
                <span>Einzel-Feedbacks & Support-Inbox</span>
                {#if newFeedbacksCount > 0}
                    <span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-400 text-amber-950 animate-pulse">{newFeedbacksCount} neu</span>
                {/if}
            </button>
            <button
                type="button"
                onclick={() => mainTab = 'proposals'}
                class="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer {mainTab === 'proposals' ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30' : 'text-neutral-600 hover:bg-neutral-100'}"
            >
                <span>💡</span>
                <span>Verbesserungsvorschläge</span>
                <span class="px-1.5 py-0.5 rounded-md text-[10px] {mainTab === 'proposals' ? 'bg-white/20 text-white' : 'bg-neutral-200 text-neutral-700'}">{proposalService.proposals.length}</span>
            </button>
        </div>

        <div class="flex items-center gap-2">
            {#if mainTab === 'feedbacks'}
                <button
                    type="button"
                    onclick={loadInboxItems}
                    disabled={isLoadingInbox}
                    class="orga-button-ghost text-xs py-2 px-3 flex items-center gap-1.5 cursor-pointer"
                    title="Inbox aktualisieren"
                >
                    <RefreshCw class="w-3.5 h-3.5 {isLoadingInbox ? 'animate-spin' : ''}" />
                    <span>Inbox aktualisieren</span>
                </button>
            {:else if mainTab === 'proposals'}
                <button
                    type="button"
                    onclick={() => proposalModal?.open(null, (p) => feedbackActionModal?.open(p, 'proposal'))}
                    class="orga-button-primary py-2 px-3.5 text-xs font-bold flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20 cursor-pointer"
                    title="Neuen Verbesserungsvorschlag anlegen"
                >
                    <Plus class="w-3.5 h-3.5 text-white" />
                    <span>+ Neuer Vorschlag</span>
                </button>
            {/if}
        </div>
    </div>

    {#if mainTab === 'prompts'}
    <!-- Header & Info Banner with KW Constraint Notice -->
    <div class="bg-gradient-to-r from-neutral-900 via-indigo-950 to-neutral-900 text-white rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden">
        <div class="absolute -right-12 -bottom-12 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>
        <div class="relative z-10 max-w-3xl space-y-2.5">
            <div class="flex flex-wrap items-center gap-2">
                <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/30 border border-indigo-400/30 text-[11px] font-bold text-indigo-200 uppercase tracking-wider">
                    <span>🔄</span> Wöchentlicher Cron-Zyklus (Montags 02:00 Uhr)
                </span>
                <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-[11px] font-bold text-emerald-300">
                    <span>📅</span> Aktuell: {formatKW(currentKWString)}
                </span>
                <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-400/30 text-[11px] font-bold text-amber-300">
                    <span>⚡</span> 1 Prompt pro Kalenderwoche
                </span>
            </div>
            <h1 class="text-2xl sm:text-3xl font-black tracking-tight text-white">
                Feedback-to-Prompt Engine & CRUD-Verwaltung
            </h1>
            <p class="text-xs sm:text-sm text-neutral-300 leading-relaxed">
                Aggregiert Kundenfeedbacks, Supportanfragen und System-Logs zu strukturierten Entwickler-Prompts. Pro Kalenderwoche kann genau 1 Prompt existieren; erneutes Generieren oder Bearbeiten aktualisiert stets den bestehenden Wochenprompt.
            </p>
        </div>
    </div>

    <!-- Main Workspace: 2-Column Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[600px]">
        
        <!-- LEFT COLUMN: Prompt History / List (4 cols) -->
        <div class="lg:col-span-4 bg-white rounded-3xl border border-neutral-200 shadow-sm flex flex-col overflow-hidden">
            <!-- Filter & Search Bar -->
            <div class="p-4 border-b border-neutral-200 space-y-3 bg-neutral-50/50">
                <div class="flex items-center justify-between">
                    <h2 class="text-xs font-black uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
                        <span>📜</span> Historie ({filteredPrompts.length})
                    </h2>
                    <span class="text-[10px] font-bold text-neutral-400">1 Prompt / KW</span>
                </div>

                <!-- Search Input -->
                <div class="relative">
                    <input 
                        type="text" 
                        bind:value={searchQuery}
                        placeholder="Durchsuchen nach Titel, KW, Inhalt..." 
                        class="orga-input-clear pl-8 pr-3 py-1.5 text-xs w-full"
                    />
                    <svg class="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>

                <!-- Status Filter Pills -->
                <div class="flex items-center gap-1 overflow-x-auto pb-1 custom-scrollbar text-[11px]">
                    <button 
                        type="button"
                        onclick={() => statusFilter = 'all'} 
                        class="px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition-colors cursor-pointer {statusFilter === 'all' ? 'bg-indigo-600 text-white' : 'bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200'}"
                    >
                        Alle ({prompts.length})
                    </button>
                    <button 
                        type="button"
                        onclick={() => statusFilter = 'open'} 
                        class="px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition-colors cursor-pointer {statusFilter === 'open' ? 'bg-amber-500 text-white' : 'bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200'}"
                    >
                        Offen
                    </button>
                    <button 
                        type="button"
                        onclick={() => statusFilter = 'applied'} 
                        class="px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition-colors cursor-pointer {statusFilter === 'applied' ? 'bg-emerald-600 text-white' : 'bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200'}"
                    >
                        Angewendet
                    </button>
                    <button 
                        type="button"
                        onclick={() => statusFilter = 'archived'} 
                        class="px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition-colors cursor-pointer {statusFilter === 'archived' ? 'bg-neutral-700 text-white' : 'bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200'}"
                    >
                        Archiviert
                    </button>
                </div>
            </div>

            <!-- Prompts Scroll List -->
            <div class="flex-1 overflow-y-auto custom-scrollbar divide-y divide-neutral-100 p-2 space-y-1">
                {#if isLoading && filteredPrompts.length === 0}
                    <div class="p-8 text-center text-neutral-400 space-y-2">
                        <svg class="animate-spin h-6 w-6 text-indigo-600 mx-auto" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        <p class="text-xs font-medium">Lade Prompts...</p>
                    </div>
                {:else if filteredPrompts.length === 0}
                    <div class="p-8 text-center text-neutral-400 space-y-3">
                        <span class="text-3xl">📭</span>
                        <p class="text-xs font-medium">Keine Prompts gefunden.</p>
                        <div class="flex flex-col gap-2 pt-2">
                            <button 
                                type="button" 
                                onclick={openCreateModal}
                                class="orga-button-secondary py-1.5 px-3 text-xs font-bold"
                            >
                                + Prompt manuell anlegen
                            </button>
                            <button 
                                type="button" 
                                onclick={handleGenerateNow}
                                class="orga-button-primary py-1.5 px-3 text-xs font-bold"
                            >
                                ✨ KI-Prompt generieren
                            </button>
                        </div>
                    </div>
                {:else}
                    {#each filteredPrompts as p (p.id)}
                        {@const isSelected = selectedPrompt?.id === p.id}
                        {@const statusInfo = getStatusBadge(p.status)}
                        {@const kwDisplay = formatKW(p.calendar_week)}
                        {@const isCurrentWeek = p.calendar_week === currentKWString}
                        <button 
                            type="button"
                            onclick={() => selectedPromptId = p.id}
                            class="w-full text-left p-3 rounded-2xl transition-all flex flex-col gap-2 cursor-pointer group {isSelected ? 'bg-indigo-50/80 border border-indigo-200 shadow-xs' : 'hover:bg-neutral-50 border border-transparent'}"
                        >
                            <div class="flex items-center justify-between gap-2">
                                <div class="flex items-center gap-1.5 flex-wrap">
                                    {#if kwDisplay}
                                        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black {isCurrentWeek ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-800'}">
                                            <span>📅</span> {kwDisplay}
                                        </span>
                                    {/if}
                                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border {statusInfo.bg}">
                                        <span class="w-1.5 h-1.5 rounded-full {statusInfo.dot}"></span>
                                        {statusInfo.label}
                                    </span>
                                </div>
                                <span class="text-[10px] font-medium text-neutral-400 shrink-0">
                                    {formatShortDate(p.created)}
                                </span>
                            </div>

                            <h3 class="text-xs font-bold text-neutral-900 line-clamp-2 leading-snug">
                                {p.title}
                            </h3>

                            <div class="flex items-center justify-between text-[10px] text-neutral-500 font-medium pt-1 border-t border-neutral-100">
                                <span>🔍 {p.feedback_count ?? 0} Rückmeldungen</span>
                                {#if p.source_period_start && p.source_period_end}
                                    <span class="text-[9px] text-neutral-400">
                                        {formatShortDate(p.source_period_start)} – {formatShortDate(p.source_period_end)}
                                    </span>
                                {/if}
                            </div>
                        </button>
                    {/each}
                {/if}
            </div>
        </div>

        <!-- RIGHT COLUMN: Prompt Detail View (8 cols) -->
        <div class="lg:col-span-8 bg-white rounded-3xl border border-neutral-200 shadow-sm flex flex-col overflow-hidden">
            {#if selectedPrompt}
                {@const currentStatus = getStatusBadge(selectedPrompt.status)}
                {@const selectedKWDisplay = formatKW(selectedPrompt.calendar_week)}
                
                <!-- Detail Header & Action Toolbar -->
                <div class="p-5 border-b border-neutral-200 bg-neutral-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div class="space-y-1 min-w-0">
                        <div class="flex items-center gap-2 flex-wrap">
                            {#if selectedKWDisplay}
                                <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-black bg-indigo-600 text-white shadow-xs">
                                    <span>📅</span> {selectedKWDisplay}
                                </span>
                            {/if}
                            <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border {currentStatus.bg}">
                                <span class="w-2 h-2 rounded-full {currentStatus.dot}"></span>
                                {currentStatus.label}
                            </span>
                            <span class="text-xs text-neutral-500 font-medium">
                                Erstellt: {formatDate(selectedPrompt.created)}
                            </span>
                            {#if selectedPrompt.feedback_count !== undefined}
                                <span class="text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-lg">
                                    {selectedPrompt.feedback_count} Eingaben
                                </span>
                            {/if}
                            {#if selectedPrompt.metadata?.counts}
                                <div class="flex items-center gap-1.5 flex-wrap text-[11px] text-neutral-600">
                                    {#if selectedPrompt.metadata.counts.feedbacks}
                                        <span class="bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded font-medium">⭐ {selectedPrompt.metadata.counts.feedbacks} Feedbacks</span>
                                    {/if}
                                    {#if selectedPrompt.metadata.counts.proposals}
                                        <span class="bg-purple-50 text-purple-800 border border-purple-200 px-1.5 py-0.5 rounded font-medium">💡 {selectedPrompt.metadata.counts.proposals} Vorschläge</span>
                                    {/if}
                                    {#if selectedPrompt.metadata.counts.chats}
                                        <span class="bg-blue-50 text-blue-800 border border-blue-200 px-1.5 py-0.5 rounded font-medium">💬 {selectedPrompt.metadata.counts.chats} Chats</span>
                                    {/if}
                                    {#if selectedPrompt.metadata.counts.inquiries}
                                        <span class="bg-cyan-50 text-cyan-800 border border-cyan-200 px-1.5 py-0.5 rounded font-medium">📬 {selectedPrompt.metadata.counts.inquiries} Anfragen</span>
                                    {/if}
                                    {#if selectedPrompt.metadata.counts.appointmentRequests}
                                        <span class="bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded font-medium">📅 {selectedPrompt.metadata.counts.appointmentRequests} Terminanfragen</span>
                                    {/if}
                                </div>
                            {/if}
                        </div>
                        <h2 class="text-lg sm:text-xl font-black text-neutral-900 truncate">
                            {selectedPrompt.title}
                        </h2>
                    </div>

                    <!-- Quick Actions (Antigravity Copy, Download, View Toggle) -->
                    <div class="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
                        <!-- 1-Click Antigravity Copy -->
                        <button 
                            type="button" 
                            onclick={() => copyForAntigravity(selectedPrompt)}
                            class="px-3 py-1.5 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer {copyForAntigravitySuccess ? 'bg-emerald-600 text-white shadow-emerald-600/20' : 'bg-purple-600 hover:bg-purple-700 text-white shadow-purple-600/20 shadow-sm'}"
                            title="Kopiert den Prompt mit standardisierter Antigravity-Ausführungsanweisung"
                        >
                            {#if copyForAntigravitySuccess}
                                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" /></svg>
                                <span>Für Antigravity kopiert! ⚡</span>
                            {:else}
                                <Zap class="w-3.5 h-3.5 text-amber-300" />
                                <span>Für Antigravity kopieren ⚡</span>
                            {/if}
                        </button>

                        <!-- Download Markdown File -->
                        <button 
                            type="button" 
                            onclick={() => downloadPromptFile(selectedPrompt)}
                            class="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-700 transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                            title="Prompt als strukturierte Markdown-Datei herunterladen"
                        >
                            <FileDown class="w-3.5 h-3.5 text-neutral-500" />
                            <span>.md Export</span>
                        </button>

                        <!-- 1-Click Clipboard Copy -->
                        <button 
                            type="button" 
                            onclick={() => copyToClipboard(selectedPrompt.prompt_content)}
                            class="px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer {copiedState ? 'bg-emerald-600 text-white shadow-emerald-600/20' : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-800'}"
                            title="Reinen Prompt-Text in die Zwischenablage kopieren"
                        >
                            {#if copiedState}
                                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" /></svg>
                                <span>Kopiert!</span>
                            {:else}
                                <Copy class="w-3.5 h-3.5 text-neutral-500" />
                                <span>Kopieren</span>
                            {/if}
                        </button>

                        <!-- View Toggle: Formatted vs Raw -->
                        <div class="flex items-center bg-neutral-200/70 p-0.5 rounded-xl text-xs font-bold">
                            <button 
                                type="button" 
                                onclick={() => viewMode = 'formatted'}
                                class="px-2.5 py-1.5 rounded-lg transition-all cursor-pointer {viewMode === 'formatted' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-600 hover:text-neutral-900'}"
                            >
                                Strukturiert
                            </button>
                            <button 
                                type="button" 
                                onclick={() => viewMode = 'raw'}
                                class="px-2.5 py-1.5 rounded-lg transition-all cursor-pointer {viewMode === 'raw' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-600 hover:text-neutral-900'}"
                            >
                                Markdown
                            </button>
                        </div>
                    </div>
                </div>

                <!-- CRUD Operations Bar (Update, Status Switcher, Delete) -->
                <div class="px-5 py-2.5 bg-neutral-100/70 border-b border-neutral-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <!-- Status Switcher (Inline Update) -->
                    <div class="flex items-center gap-2">
                        <span class="font-semibold text-neutral-600">Status:</span>
                        <div class="inline-flex rounded-lg shadow-xs">
                            <button 
                                type="button" 
                                onclick={() => updatePromptStatus(selectedPrompt.id, 'open')}
                                class="px-2.5 py-1 text-[11px] font-bold rounded-l-lg border transition-colors cursor-pointer {selectedPrompt.status === 'open' ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-neutral-700 hover:bg-neutral-50 border-neutral-300'}"
                            >
                                Offen
                            </button>
                            <button 
                                type="button" 
                                onclick={() => updatePromptStatus(selectedPrompt.id, 'applied')}
                                class="px-2.5 py-1 text-[11px] font-bold border-t border-b transition-colors cursor-pointer {selectedPrompt.status === 'applied' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-neutral-700 hover:bg-neutral-50 border-neutral-300'}"
                            >
                                Angewendet
                            </button>
                            <button 
                                type="button" 
                                onclick={() => updatePromptStatus(selectedPrompt.id, 'archived')}
                                class="px-2.5 py-1 text-[11px] font-bold rounded-r-lg border transition-colors cursor-pointer {selectedPrompt.status === 'archived' ? 'bg-neutral-700 text-white border-neutral-700' : 'bg-white text-neutral-700 hover:bg-neutral-50 border-neutral-300'}"
                            >
                                Archiviert
                            </button>
                        </div>
                    </div>

                    <!-- CRUD Action Buttons: UPDATE (U) & DELETE (D) -->
                    <div class="flex items-center gap-2">
                        <!-- UPDATE (U): Edit Modal Trigger -->
                        <button 
                            type="button" 
                            onclick={() => openEditModal(selectedPrompt)}
                            class="orga-button-secondary py-1 px-3 text-[11px] font-bold inline-flex items-center gap-1.5 cursor-pointer bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-700"
                            title="Prompt-Inhalte oder Kalenderwoche anpassen"
                        >
                            <svg class="w-3.5 h-3.5 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            <span>Prompt bearbeiten</span>
                        </button>

                        <!-- DELETE (D): Delete Button -->
                        <button 
                            type="button" 
                            onclick={() => deletePrompt(selectedPrompt.id)}
                            class="text-rose-600 hover:text-rose-800 hover:bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg transition-colors font-semibold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                            title="Diesen Prompt unwiderruflich löschen (gibt die KW wieder frei)"
                        >
                            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            <span>Löschen</span>
                        </button>
                    </div>
                </div>

                <!-- Content Area -->
                <div class="flex-1 overflow-y-auto custom-scrollbar p-6">
                    {#if viewMode === 'formatted' && parsedSections.length > 0}
                        <div class="space-y-6">
                            {#each parsedSections as sec}
                                <div class="bg-neutral-50/60 rounded-2xl border border-neutral-200 overflow-hidden shadow-xs hover:border-neutral-300 transition-colors">
                                    <!-- Section Header -->
                                    <div class="p-4 bg-white border-b border-neutral-200 flex items-center justify-between gap-3">
                                        <div class="flex items-center gap-2.5 min-w-0">
                                            <span class="text-xl shrink-0">{sec.icon}</span>
                                            <h3 class="text-sm font-bold text-neutral-900 truncate">
                                                {sec.title}
                                            </h3>
                                        </div>
                                        <button 
                                            type="button" 
                                            onclick={() => copySection(sec.title, sec.body)}
                                            class="text-[11px] font-semibold text-neutral-500 hover:text-indigo-600 bg-neutral-100 hover:bg-indigo-50 px-2.5 py-1 rounded-lg transition-colors shrink-0 inline-flex items-center gap-1 cursor-pointer"
                                            title="Nur diesen Abschnitt kopieren"
                                        >
                                            <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                            Kopieren
                                        </button>
                                    </div>

                                    <!-- Section Body -->
                                    <div class="p-4 text-xs text-neutral-700 whitespace-pre-wrap font-sans leading-relaxed">
                                        {sec.body}
                                    </div>
                                </div>
                            {/each}

                            <!-- Raw Aggregation Data Expander -->
                            {#if selectedPrompt.raw_summary}
                                <details class="group bg-white rounded-2xl border border-neutral-200 p-4 transition-all">
                                    <summary class="cursor-pointer text-xs font-bold text-neutral-600 hover:text-neutral-900 flex items-center justify-between">
                                        <span class="flex items-center gap-2">
                                            <span>📋</span> Aggregierter Rohdaten-Kontext (Audit Log)
                                        </span>
                                        <span class="text-neutral-400 group-open:rotate-180 transition-transform">▼</span>
                                    </summary>
                                    <div class="mt-3 pt-3 border-t border-neutral-100">
                                        <pre class="bg-neutral-900 text-neutral-200 p-4 rounded-xl text-[11px] font-mono overflow-x-auto whitespace-pre-wrap max-h-80 custom-scrollbar">{selectedPrompt.raw_summary}</pre>
                                    </div>
                                </details>
                            {/if}
                        </div>
                    {:else}
                        <!-- Raw Markdown Text View -->
                        <div class="space-y-4">
                            <div class="flex items-center justify-between text-xs text-neutral-500 font-medium">
                                <span>Vollständiger Markdown-Quelltext (ideal für KI-Chats wie Claude / GPT / Gemini):</span>
                                <span>{selectedPrompt.prompt_content?.length || 0} Zeichen</span>
                            </div>
                            <textarea 
                                readonly 
                                class="w-full h-[550px] bg-neutral-900 text-neutral-100 p-4 rounded-2xl font-mono text-xs leading-relaxed custom-scrollbar border border-neutral-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none select-all"
                                value={selectedPrompt.prompt_content}
                            ></textarea>
                        </div>
                    {/if}
                </div>
            {:else}
                <div class="flex-1 flex flex-col items-center justify-center p-12 text-center text-neutral-400 space-y-3">
                    <span class="text-4xl">💡</span>
                    <h3 class="text-base font-bold text-neutral-700">Kein Prompt ausgewählt</h3>
                    <p class="text-xs max-w-sm">Wählen Sie links einen Prompt aus oder legen Sie über "+ Prompt manuell anlegen" bzw. die KI-Analyse einen neuen Wochenprompt an.</p>
                </div>
            {/if}
        </div>
    </div>
    {:else if mainTab === 'feedbacks'}
        <!-- Einzel-Feedbacks & Support-Inbox Workspace -->
        <div class="space-y-6 animate-enter">
            <!-- Filter- & Steuerungsleiste -->
            <div class="bg-white rounded-3xl p-4 sm:p-6 border border-neutral-200 shadow-sm space-y-4">
                <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div>
                        <h2 class="text-base sm:text-lg font-bold text-neutral-900 flex items-center gap-2">
                            <span>📥</span>
                            Einzel-Feedbacks & Support-Nachrichten
                            <span class="text-xs px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-600 font-semibold border border-neutral-200">
                                {unifiedInboxItems.length} Treffer
                            </span>
                        </h2>
                        <p class="text-xs text-neutral-500 mt-0.5">
                            Wählen Sie ein einzelnes Feedback oder Support-Ticket aus, um sofort eine KI-gestützte Fehleranalyse und einen zielgerichteten Ausbesserungsprompt zu generieren.
                        </p>
                    </div>

                    <!-- Schnell-Filter Quelle -->
                    <div class="flex flex-wrap items-center gap-1.5 bg-neutral-100/80 p-1 rounded-xl border border-neutral-200/80 text-xs">
                        <button
                            type="button"
                            onclick={() => feedbackSourceFilter = 'all'}
                            class="px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer {feedbackSourceFilter === 'all' ? 'bg-white text-indigo-700 shadow-xs' : 'text-neutral-600 hover:text-neutral-900'}"
                        >
                            Alle Quellen
                        </button>
                        <button
                            type="button"
                            onclick={() => feedbackSourceFilter = 'feedbacks'}
                            class="px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer {feedbackSourceFilter === 'feedbacks' ? 'bg-white text-indigo-700 shadow-xs' : 'text-neutral-600 hover:text-neutral-900'}"
                        >
                            ⭐ Feedbacks ({rawFeedbacks.length})
                        </button>
                        <button
                            type="button"
                            onclick={() => feedbackSourceFilter = 'inquiries'}
                            class="px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer {feedbackSourceFilter === 'inquiries' ? 'bg-white text-indigo-700 shadow-xs' : 'text-neutral-600 hover:text-neutral-900'}"
                        >
                            📬 Support-Anfragen ({rawInquiries.length})
                        </button>
                        <button
                            type="button"
                            onclick={() => feedbackSourceFilter = 'chat'}
                            class="px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer {feedbackSourceFilter === 'chat' ? 'bg-white text-indigo-700 shadow-xs' : 'text-neutral-600 hover:text-neutral-900'}"
                        >
                            💬 Chat-Anfragen ({rawChatMessages.length})
                        </button>
                    </div>
                </div>

                <!-- Zweite Filterzeile: Status, Rating & Suche -->
                <div class="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-3 border-t border-neutral-100">
                    <div class="sm:col-span-6 relative">
                        <input
                            type="text"
                            bind:value={feedbackSearch}
                            placeholder="Nach Absender, Nachricht, E-Mail oder Details suchen..."
                            class="orga-input-clear pl-9 pr-3 py-2 text-xs w-full bg-neutral-50"
                        />
                        <svg class="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>

                    <div class="sm:col-span-3">
                        <select
                            bind:value={feedbackStatusFilter}
                            class="orga-input-clear py-2 text-xs w-full bg-neutral-50 cursor-pointer"
                        >
                            <option value="all">Alle Status</option>
                            <option value="Neu">Neu / Offen</option>
                            <option value="In Bearbeitung">In Bearbeitung</option>
                            <option value="Gelöst">Gelöst / Erledigt</option>
                        </select>
                    </div>

                    <div class="sm:col-span-3">
                        <select
                            bind:value={feedbackRatingFilter}
                            class="orga-input-clear py-2 text-xs w-full bg-neutral-50 cursor-pointer"
                        >
                            <option value="all">Alle Bewertungen</option>
                            <option value="critical">⚠️ Kritisch (≤ 5 Sterne)</option>
                            <option value="good">⭐ Positiv (6-10 Sterne)</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- Liste der Feedbacks / Tickets -->
            {#if isLoadingInbox}
                <div class="p-12 text-center bg-white rounded-3xl border border-neutral-200">
                    <div class="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                    <p class="text-xs text-neutral-500 font-medium">Lade Feedbacks & Support-Nachrichten...</p>
                </div>
            {:else if unifiedInboxItems.length === 0}
                <div class="p-12 text-center bg-white rounded-3xl border border-neutral-200 space-y-2">
                    <span class="text-3xl block">🎉</span>
                    <h3 class="text-sm font-bold text-neutral-800">Keine passenden Nachrichten gefunden</h3>
                    <p class="text-xs text-neutral-400 max-w-sm mx-auto">Für die gewählten Filterkriterien liegen keine Einträge vor oder alle Anliegen wurden gelöst.</p>
                </div>
            {:else}
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {#each unifiedInboxItems as item (item.id)}
                        <div class="bg-white rounded-2xl border border-neutral-200 hover:border-indigo-300 p-4 sm:p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-3">
                            <div class="space-y-2.5">
                                <div class="flex items-start justify-between gap-2">
                                    <div class="flex items-center gap-2 flex-wrap">
                                        <span class="px-2.5 py-0.5 rounded-lg text-[11px] font-bold border {
                                            item.source === 'feedback' 
                                                ? 'bg-amber-50 text-amber-800 border-amber-200' 
                                                : item.source === 'chat'
                                                ? 'bg-purple-50 text-purple-800 border-purple-200'
                                                : 'bg-blue-50 text-blue-800 border-blue-200'
                                        }">
                                            {item.source === 'feedback' ? '⭐ Feedback' : item.source === 'chat' ? '💬 Chat-Anfrage' : '📬 Support-Anfrage'}
                                        </span>
                                        {#if item.rating !== null}
                                            <span class="px-2 py-0.5 rounded-lg text-[11px] font-bold border {item.rating <= 5 ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}">
                                                {item.rating} / 10
                                            </span>
                                        {/if}
                                        <span class="px-2 py-0.5 rounded-lg text-[11px] font-bold {item.status === 'Neu' || item.status === 'new' ? 'bg-amber-100 text-amber-800' : item.status === 'In Bearbeitung' || item.status === 'in_progress' ? 'bg-indigo-100 text-indigo-800' : 'bg-emerald-100 text-emerald-800'}">
                                            {item.status}
                                        </span>
                                    </div>
                                    <span class="text-[11px] text-neutral-400 whitespace-nowrap">
                                        {formatDate(item.date)}
                                    </span>
                                </div>

                                <div>
                                    <h3 class="text-sm font-bold text-neutral-900">
                                        {item.sender}
                                        {#if item.email}
                                            <span class="text-xs font-normal text-neutral-400 font-mono ml-1">({item.email})</span>
                                        {/if}
                                    </h3>
                                    {#if item.context}
                                        <p class="text-[11px] text-neutral-400 mt-0.5 font-medium">{item.context}</p>
                                    {/if}
                                </div>

                                <div class="bg-neutral-50 rounded-xl p-3 border border-neutral-100">
                                    <p class="text-xs text-neutral-700 font-medium whitespace-pre-wrap leading-relaxed">
                                        "{item.message}"
                                    </p>
                                </div>
                            </div>

                            <!-- Footer Aktionen -->
                            <div class="pt-3 border-t border-neutral-100 flex flex-wrap items-center justify-between gap-2 mt-1">
                                <!-- Status Buttons (Statt Dropdown) -->
                                <div class="inline-flex p-0.5 bg-neutral-100/90 rounded-xl border border-neutral-200/80 gap-0.5">
                                    <button
                                        type="button"
                                        onclick={() => updateInboxItemStatus(item, 'Neu')}
                                        class="px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer {
                                            (item.status === 'Neu' || item.status === 'new')
                                                ? 'bg-amber-500 text-white shadow-xs font-black'
                                                : 'text-neutral-600 hover:text-neutral-900 hover:bg-white/60'
                                        }"
                                        title="Status auf 'Neu' setzen"
                                    >
                                        Neu
                                    </button>
                                    <button
                                        type="button"
                                        onclick={() => updateInboxItemStatus(item, 'In Bearbeitung')}
                                        class="px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer {
                                            (item.status === 'In Bearbeitung' || item.status === 'in_progress' || item.status === 'Gelesen')
                                                ? 'bg-indigo-600 text-white shadow-xs font-black'
                                                : 'text-neutral-600 hover:text-neutral-900 hover:bg-white/60'
                                        }"
                                        title="Status auf 'In Bearbeitung' setzen"
                                    >
                                        In Arbeit
                                    </button>
                                    <button
                                        type="button"
                                        onclick={() => updateInboxItemStatus(item, 'Gelöst')}
                                        class="px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer {
                                            (item.status === 'Gelöst' || item.status === 'resolved' || item.status === 'Archiviert' || item.status === 'Archieviert' || item.status === 'converted')
                                                ? 'bg-emerald-600 text-white shadow-xs font-black'
                                                : 'text-neutral-600 hover:text-neutral-900 hover:bg-white/60'
                                        }"
                                        title="Status auf 'Gelöst' setzen"
                                    >
                                        ✓ Gelöst
                                    </button>
                                </div>

                                <div class="flex items-center gap-1.5">
                                    <button
                                        type="button"
                                        onclick={() => convertInboxItemToProposal(item)}
                                        class="orga-button-ghost py-1.5 px-2.5 text-xs text-neutral-600 hover:text-amber-700 hover:bg-amber-50 border border-neutral-200 rounded-xl flex items-center gap-1 cursor-pointer"
                                        title="Diesen Eintrag als eigenständigen Verbesserungsvorschlag erfassen"
                                    >
                                        <span>💡</span>
                                        <span class="hidden sm:inline">Als Vorschlag</span>
                                    </button>

                                    <button
                                        type="button"
                                        onclick={() => feedbackActionModal?.open(item.rawRecord, item.source)}
                                        class="orga-button-primary bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20 py-1.5 px-3.5 text-xs font-bold flex items-center gap-1.5 min-h-[34px] touch-manipulation active:scale-95 cursor-pointer"
                                    >
                                        <Sparkles class="w-3.5 h-3.5 text-amber-300" />
                                        <span>🎯 Prompt erstellen & reagieren</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    {/each}
                </div>
            {/if}
        </div>
    {:else if mainTab === 'proposals'}
        <!-- Verbesserungsvorschläge Workspace (Einzel-Verwertung) -->
        <div class="space-y-6 animate-enter">
            <!-- Header & Steuerungsleiste -->
            <div class="bg-white rounded-3xl p-4 sm:p-6 border border-neutral-200 shadow-sm space-y-4">
                <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div>
                        <h2 class="text-base sm:text-lg font-bold text-neutral-900 flex items-center gap-2">
                            <span>💡</span>
                            Verbesserungsvorschläge (Einzel-Verwertung)
                            <span class="text-xs px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 font-semibold border border-amber-200">
                                {filteredProposals.length} Vorschläge
                            </span>
                        </h2>
                        <p class="text-xs text-neutral-500 mt-0.5">
                            Erfassen Sie einzelne Ideen, Mängel oder Feature-Wünsche. Verfolgen Sie deren Status per Knopfdruck und verwerten Sie sie einzeln als hochpräzise Entwickler-Prompts oder Team-Briefings.
                        </p>
                    </div>

                    <div class="flex flex-wrap items-center gap-2">
                        <!-- Status Filter Buttons -->
                        <div class="flex flex-wrap items-center gap-1.5 bg-neutral-100/80 p-1 rounded-xl border border-neutral-200/80 text-xs">
                            <button
                                type="button"
                                onclick={() => proposalStatusFilter = 'all'}
                                class="px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer {proposalStatusFilter === 'all' ? 'bg-white text-indigo-700 shadow-xs' : 'text-neutral-600 hover:text-neutral-900'}"
                            >
                                Alle ({proposalService.proposals.length})
                            </button>
                            <button
                                type="button"
                                onclick={() => proposalStatusFilter = 'idea'}
                                class="px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer {proposalStatusFilter === 'idea' ? 'bg-white text-amber-700 shadow-xs' : 'text-neutral-600 hover:text-neutral-900'}"
                            >
                                💡 Idee ({proposalService.proposals.filter(p => p.status === 'idea').length})
                            </button>
                            <button
                                type="button"
                                onclick={() => proposalStatusFilter = 'planned'}
                                class="px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer {proposalStatusFilter === 'planned' ? 'bg-white text-blue-700 shadow-xs' : 'text-neutral-600 hover:text-neutral-900'}"
                            >
                                📋 Geplant ({proposalService.proposals.filter(p => p.status === 'planned').length})
                            </button>
                            <button
                                type="button"
                                onclick={() => proposalStatusFilter = 'in_progress'}
                                class="px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer {proposalStatusFilter === 'in_progress' ? 'bg-white text-indigo-700 shadow-xs' : 'text-neutral-600 hover:text-neutral-900'}"
                            >
                                ⚙️ In Arbeit ({proposalService.proposals.filter(p => p.status === 'in_progress').length})
                            </button>
                            <button
                                type="button"
                                onclick={() => proposalStatusFilter = 'implemented'}
                                class="px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer {proposalStatusFilter === 'implemented' ? 'bg-white text-emerald-700 shadow-xs' : 'text-neutral-600 hover:text-neutral-900'}"
                            >
                                ✅ Umgesetzt ({proposalService.proposals.filter(p => p.status === 'implemented').length})
                            </button>
                        </div>

                        <!-- Schnellauswahl für Synthese & Vollansicht-Link -->
                        <div class="flex items-center gap-1.5">
                            <button
                                type="button"
                                onclick={toggleSelectAllInProgress}
                                disabled={inProgressProposals.length === 0}
                                class="px-3 py-1.5 rounded-xl text-xs font-bold border transition-all min-h-[36px] flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed {
                                    areAllInProgressSelected 
                                        ? 'bg-indigo-50 border-indigo-200 text-indigo-800' 
                                        : 'bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-50'
                                }"
                                title="Alle Vorgänge im Status 'In Bearbeitung' markieren oder abwählen"
                            >
                                {#if areAllInProgressSelected}
                                    <CheckSquare class="w-3.5 h-3.5 text-indigo-600" />
                                    <span>In Arbeit gewählt</span>
                                {:else}
                                    <Square class="w-3.5 h-3.5 text-neutral-400" />
                                    <span>In Arbeit wählen ({inProgressProposals.length})</span>
                                {/if}
                            </button>

                            {#if selectedProposalIds.length > 0}
                                <button
                                    type="button"
                                    onclick={() => selectedProposalIds = []}
                                    class="px-2 py-1 text-xs font-semibold text-neutral-400 hover:text-neutral-700 rounded-lg min-h-[36px] transition-colors cursor-pointer"
                                >
                                    Aufheben ({selectedProposalIds.length})
                                </button>
                            {/if}

                            <a
                                href="/admin/proposals"
                                class="px-2.5 py-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 border border-indigo-200 rounded-xl min-h-[36px] flex items-center gap-1 transition-colors"
                                title="Zur Vollbild-Vorschlagsverwaltung wechseln"
                            >
                                <span>↗ Vollansicht</span>
                            </a>
                        </div>
                    </div>
                </div>

                <!-- Zweite Filterzeile: Suche, Kategorie & Priorität -->
                <div class="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-3 border-t border-neutral-100">
                    <div class="sm:col-span-6 relative">
                        <input
                            type="text"
                            bind:value={proposalSearch}
                            placeholder="Nach Titel, Problem, Lösung oder Tags suchen..."
                            class="orga-input-clear pl-9 pr-3 py-2 text-xs w-full bg-neutral-50"
                        />
                        <svg class="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>

                    <div class="sm:col-span-3">
                        <select
                            bind:value={proposalCategoryFilter}
                            class="orga-input-clear py-2 text-xs w-full bg-neutral-50 cursor-pointer"
                        >
                            <option value="all">Alle Bereiche / Module</option>
                            <option value="Core Engine & API">Core Engine & API-Resilienz</option>
                            <option value="UI/UX & Design">UI/UX & Mobile Ergonomie</option>
                            <option value="Haushaltsbuch & Finanzen">Haushaltsbuch & Finanzen</option>
                            <option value="Dokumente & Vorlagen">Dokumente, PDF & DIN 5008</option>
                            <option value="Termine & Außendienst">Termine & Außendienst</option>
                            <option value="Sicherheit & Audit">Sicherheit & Audit-Trail</option>
                            <option value="Sonstiges">Sonstiges</option>
                        </select>
                    </div>

                    <div class="sm:col-span-3">
                        <select
                            bind:value={proposalPriorityFilter}
                            class="orga-input-clear py-2 text-xs w-full bg-neutral-50 cursor-pointer"
                        >
                            <option value="all">Alle Prioritäten</option>
                            <option value="critical">🔴 Kritisch</option>
                            <option value="high">🟠 Hoch</option>
                            <option value="medium">🔵 Mittel</option>
                            <option value="low">🟢 Niedrig</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- Liste der Vorschläge -->
            {#if proposalService.isLoading}
                <div class="p-12 text-center bg-white rounded-3xl border border-neutral-200">
                    <div class="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                    <p class="text-xs text-neutral-500 font-medium">Lade Verbesserungsvorschläge...</p>
                </div>
            {:else if filteredProposals.length === 0}
                <div class="p-12 text-center bg-white rounded-3xl border border-neutral-200 space-y-3">
                    <span class="text-4xl block">💡</span>
                    <h3 class="text-sm font-bold text-neutral-800">Keine passenden Verbesserungsvorschläge gefunden</h3>
                    <p class="text-xs text-neutral-400 max-w-sm mx-auto">Legen Sie über "+ Neuer Vorschlag" Ihren ersten individuellen Verbesserungsvorschlag an oder passen Sie die Filter an.</p>
                    <button
                        type="button"
                        onclick={() => proposalModal?.open(null, (p) => feedbackActionModal?.open(p, 'proposal'))}
                        class="orga-button-primary bg-amber-500 hover:bg-amber-600 py-2 px-4 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer mt-2"
                    >
                        <Plus class="w-3.5 h-3.5" />
                        <span>Jetzt ersten Vorschlag erfassen</span>
                    </button>
                </div>
            {:else}
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {#each filteredProposals as proposal (proposal.id)}
                        {@const isSelected = selectedProposalIds.includes(proposal.id)}
                        {@const isInProgress = proposal.status === 'in_progress'}
                        <div class="bg-white rounded-2xl border p-4 sm:p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-3 {
                            isSelected ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/15' : 'border-neutral-200 hover:border-amber-300'
                        }">
                            <div class="space-y-2.5">
                                <div class="flex items-start justify-between gap-2">
                                    <div class="flex items-center gap-2 flex-wrap">
                                        <!-- Barrierefreie Checkbox für Sammel-Synthese (min 44x44px) -->
                                        <label 
                                            class="flex items-center justify-center min-w-[44px] min-h-[44px] cursor-pointer p-2 -m-2 rounded-xl hover:bg-neutral-100 transition-colors shrink-0" 
                                            title={isInProgress ? 'Für Sammel-Synthese auswählen' : 'Vorschlag markieren'}
                                        >
                                            <input 
                                                type="checkbox" 
                                                value={proposal.id} 
                                                bind:group={selectedProposalIds}
                                                class="w-5 h-5 rounded border-neutral-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                                            />
                                        </label>
                                        <span class="px-2.5 py-0.5 rounded-lg text-[11px] font-bold border bg-blue-50 text-blue-800 border-blue-200">
                                            {proposal.category || 'Core'}
                                        </span>
                                        <span class="px-2 py-0.5 rounded-lg text-[11px] font-bold border {
                                            proposal.priority === 'critical' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                            proposal.priority === 'high' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                            proposal.priority === 'medium' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                            'bg-emerald-50 text-emerald-700 border-emerald-200'
                                        }">
                                            {proposal.priority === 'critical' ? '🔴 Kritisch' :
                                             proposal.priority === 'high' ? '🟠 Hoch' :
                                             proposal.priority === 'medium' ? '🔵 Mittel' :
                                             '🟢 Niedrig'}
                                        </span>
                                    </div>
                                    <span class="text-[11px] text-neutral-400 whitespace-nowrap">
                                        {formatDate(proposal.created)}
                                    </span>
                                </div>

                                <div>
                                    <h3 class="text-sm font-bold text-neutral-900 leading-snug">
                                        {proposal.title}
                                    </h3>
                                    {#if proposal.author_name}
                                        <p class="text-[11px] text-neutral-400 mt-0.5 font-medium">Erfasst von: {proposal.author_name}</p>
                                    {/if}
                                </div>

                                <div class="bg-neutral-50 rounded-xl p-3 border border-neutral-100 space-y-2">
                                    <div>
                                        <span class="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-0.5">Problem / Ausgangslage:</span>
                                        <p class="text-xs text-neutral-700 font-medium whitespace-pre-wrap leading-relaxed">
                                            {proposal.description}
                                        </p>
                                    </div>

                                    {#if proposal.solution_concept}
                                        <div class="pt-2 border-t border-neutral-200/60">
                                            <span class="text-[10px] font-bold uppercase tracking-wider text-indigo-500 block mb-0.5 flex items-center gap-1">
                                                <span>💡</span> Lösungskonzept:
                                            </span>
                                            <p class="text-xs text-neutral-800 font-medium whitespace-pre-wrap leading-relaxed">
                                                {proposal.solution_concept}
                                            </p>
                                        </div>
                                    {/if}
                                </div>

                                {#if proposal.tags}
                                    <div class="flex flex-wrap gap-1">
                                        {#each proposal.tags.split(',') as tag}
                                            {#if tag.trim()}
                                                <span class="px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-600 text-[10px] font-mono">
                                                    #{tag.trim()}
                                                </span>
                                            {/if}
                                        {/each}
                                    </div>
                                {/if}
                            </div>

                            <!-- Footer Aktionen -->
                            <div class="pt-3 border-t border-neutral-100 flex flex-col gap-2.5 mt-1">
                                <!-- Status Buttons pro Vorschlag (Statt Dropdown!) -->
                                <div class="flex items-center justify-between gap-2">
                                    <span class="text-[11px] font-semibold text-neutral-400">Status:</span>
                                    <div class="inline-flex p-0.5 bg-neutral-100 rounded-xl border border-neutral-200 gap-0.5">
                                        <button
                                            type="button"
                                            onclick={() => proposalService.updateProposalStatus(proposal.id, 'idea')}
                                            class="px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer {
                                                proposal.status === 'idea' ? 'bg-amber-400 text-amber-950 shadow-xs' : 'text-neutral-600 hover:text-neutral-900 hover:bg-white/60'
                                            }"
                                        >
                                            💡 Idee
                                        </button>
                                        <button
                                            type="button"
                                            onclick={() => proposalService.updateProposalStatus(proposal.id, 'planned')}
                                            class="px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer {
                                                proposal.status === 'planned' ? 'bg-blue-500 text-white shadow-xs' : 'text-neutral-600 hover:text-neutral-900 hover:bg-white/60'
                                            }"
                                        >
                                            📋 Geplant
                                        </button>
                                        <button
                                            type="button"
                                            onclick={() => proposalService.updateProposalStatus(proposal.id, 'in_progress')}
                                            class="px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer {
                                                proposal.status === 'in_progress' ? 'bg-indigo-600 text-white shadow-xs' : 'text-neutral-600 hover:text-neutral-900 hover:bg-white/60'
                                            }"
                                        >
                                            ⚙️ In Arbeit
                                        </button>
                                        <button
                                            type="button"
                                            onclick={() => proposalService.updateProposalStatus(proposal.id, 'implemented')}
                                            class="px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer {
                                                proposal.status === 'implemented' ? 'bg-emerald-600 text-white shadow-xs' : 'text-neutral-600 hover:text-neutral-900 hover:bg-white/60'
                                            }"
                                        >
                                            ✅ Umgesetzt
                                        </button>
                                    </div>
                                </div>

                                <!-- Aktionen: Einzeln verwerten, Bearbeiten, Löschen, Teilen -->
                                <div class="flex items-center justify-between gap-2 pt-2 border-t border-neutral-100">
                                    <div class="flex items-center gap-1">
                                        <button
                                            type="button"
                                            onclick={() => proposalModal?.open(proposal)}
                                            class="p-2 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl transition-colors cursor-pointer"
                                            title="Vorschlag bearbeiten"
                                        >
                                            <Edit3 class="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            type="button"
                                            onclick={() => shareProposalInChat(proposal)}
                                            class="p-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-xl transition-colors cursor-pointer"
                                            title="Im Team-Chat teilen"
                                        >
                                            <MessageCircle class="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            type="button"
                                            onclick={async () => {
                                                if (await confirmStore.ask(`Möchten Sie den Vorschlag "${proposal.title}" wirklich löschen?`, "Vorschlag löschen?", "Löschen", "Abbrechen", true)) {
                                                    proposalService.deleteProposal(proposal.id);
                                                }
                                            }}
                                            class="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                                            title="Vorschlag löschen"
                                        >
                                            <Trash2 class="w-3.5 h-3.5" />
                                        </button>
                                    </div>

                                    <div class="flex items-center gap-2">
                                        <!-- Automatisierter Lösungs- & Maßnahmen-Assistent (1-Click) -->
                                        <button
                                            type="button"
                                            onclick={() => solutionModal?.open({
                                                title: proposal.title,
                                                description: proposal.description,
                                                category: proposal.category,
                                                currentConcept: proposal.solution_concept
                                            }, async (newConcept) => {
                                                await proposalService.updateProposal(proposal.id, { solution_concept: newConcept });
                                            })}
                                            class="py-1.5 px-3 rounded-xl text-xs font-bold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 transition-all flex items-center gap-1.5 min-h-[36px] cursor-pointer active:scale-95 shadow-2xs"
                                            title="Automatisierter Assistent: Lösungs- und Maßnahmenkonzept per 1-Click erstellen oder anpassen"
                                        >
                                            <Sparkles class="w-3.5 h-3.5 text-brand-600" />
                                            <span class="hidden sm:inline">Lösungsansatz</span>
                                        </button>

                                        <!-- Einzeln verwerten: Prompt generieren -->
                                        <button
                                            type="button"
                                            onclick={() => feedbackActionModal?.open(proposal, 'proposal')}
                                            class="orga-button-primary bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20 py-1.5 px-3.5 text-xs font-bold flex items-center gap-1.5 min-h-[36px] touch-manipulation active:scale-95 cursor-pointer"
                                            title="Diesen Vorschlag einzeln als zielgerichteten Entwickler-Prompt & Team-Briefing verwerten"
                                        >
                                            <Sparkles class="w-3.5 h-3.5 text-amber-300" />
                                            <span>🎯 Einzeln verwerten</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    {/each}
                </div>
            {/if}

            <!-- Wiederverwendbare Sammel-Synthese-Komponente -->
            <ProposalSynthesizer 
                selectedIds={selectedProposalIds} 
                onClearSelection={() => selectedProposalIds = []} 
            />
        </div>
    {/if}
</div>

<FeedbackActionPromptModal bind:this={feedbackActionModal} />
<ImprovementProposalModal bind:this={proposalModal} />
<SolutionPromptModal bind:this={solutionModal} />

<!-- ========================================================================= -->
<!-- CRUD MODAL: Create & Update System Prompt                                 -->
<!-- Enforces strictly 1 Prompt per Calendar Week (KW)                         -->
<!-- ========================================================================= -->
{#if isModalOpen}
    <div 
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-enter"
        role="dialog"
        aria-modal="true"
        aria-labelledby="prompt-modal-title"
    >
        <div class="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl border border-neutral-200 overflow-hidden">
            <!-- Modal Header -->
            <div class="p-5 md:p-6 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/70">
                <div>
                    <h2 id="prompt-modal-title" class="text-lg font-black text-neutral-900 flex items-center gap-2">
                        {#if modalMode === 'create'}
                            <span class="text-indigo-600">✨</span> Neuer System-Prompt anlegen
                        {:else}
                            <span class="text-indigo-600">✏️</span> System-Prompt bearbeiten
                        {/if}
                    </h2>
                    <p class="text-xs text-neutral-500 mt-0.5 font-medium">
                        Strikte Regel: Pro Kalenderwoche kann nur genau 1 Prompt existieren.
                    </p>
                </div>
                <button 
                    type="button" 
                    onclick={() => isModalOpen = false} 
                    class="w-8 h-8 rounded-full bg-neutral-200/70 hover:bg-neutral-300 text-neutral-600 flex items-center justify-center transition-colors cursor-pointer"
                    aria-label="Schließen"
                >
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>

            <!-- Modal Form Body -->
            <form onsubmit={handleModalSave} class="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
                
                <!-- KW Collision Warning Box if another prompt already occupies the selected KW -->
                {#if kwConflictPrompt}
                    <div class="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-2 text-xs">
                        <div class="flex items-start gap-2">
                            <span class="text-base shrink-0">⚠️</span>
                            <div class="space-y-1">
                                <p class="font-bold">
                                    Kalenderwoche bereits belegt ({formatKW(modalCalendarWeek)})!
                                </p>
                                <p class="text-amber-800 leading-relaxed">
                                    Für die Kalenderwoche <strong>{formatKW(modalCalendarWeek)}</strong> existiert bereits ein Prompt: 
                                    <span class="font-semibold italic">"{kwConflictPrompt.title}"</span>. 
                                    Pro KW kann aus Konsistenzgründen nur genau ein Prompt existieren.
                                </p>
                            </div>
                        </div>
                        <div class="pt-1 flex items-center gap-2">
                            <button 
                                type="button" 
                                onclick={() => openEditModal(kwConflictPrompt)}
                                class="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs inline-flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                            >
                                ✏️ Diesen bestehenden Prompt bearbeiten
                            </button>
                        </div>
                    </div>
                {/if}

                <!-- Fields: Titel & Kalenderwoche -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <!-- Titel (2 cols) -->
                    <div class="md:col-span-2 space-y-1">
                        <label for="prompt-title" class="block text-xs font-bold text-neutral-700">
                            Titel des Prompts <span class="text-rose-500">*</span>
                        </label>
                        <input 
                            id="prompt-title"
                            type="text" 
                            bind:value={modalTitle} 
                            placeholder="z.B. Wöchentlicher System-Ausbesserungsprompt (KW 36 / 2026)"
                            class="orga-input-clear py-2 text-xs font-semibold w-full"
                            required 
                            disabled={isSaving}
                        />
                    </div>

                    <!-- Kalenderwoche (1 col) -->
                    <div class="space-y-1">
                        <div class="flex items-center justify-between">
                            <label for="prompt-kw" class="block text-xs font-bold text-neutral-700">
                                Kalenderwoche (KW) <span class="text-rose-500">*</span>
                            </label>
                            <button 
                                type="button" 
                                onclick={() => modalCalendarWeek = currentKWString} 
                                class="text-[10px] text-indigo-600 font-bold hover:underline cursor-pointer"
                                title="Auf aktuelle KW setzen"
                            >
                                Aktuelle KW
                            </button>
                        </div>
                        <div class="relative">
                            <input 
                                id="prompt-kw"
                                type="text" 
                                bind:value={modalCalendarWeek} 
                                placeholder="z.B. 2026-W36"
                                class="orga-input-clear py-2 text-xs font-mono font-bold w-full {kwConflictPrompt ? 'border-amber-400 bg-amber-50/50' : ''}"
                                required 
                                disabled={isSaving}
                            />
                        </div>
                        <span class="text-[10px] text-neutral-400 block">
                            Format: YYYY-Www ({formatKW(modalCalendarWeek) || 'z.B. KW 36 / 2026'})
                        </span>
                    </div>
                </div>

                <!-- Status Selector -->
                <div class="space-y-1">
                    <label for="prompt-status" class="block text-xs font-bold text-neutral-700">
                        Bearbeitungsstatus
                    </label>
                    <div class="flex items-center gap-3">
                        <label class="inline-flex items-center gap-2 text-xs font-medium text-neutral-700 cursor-pointer">
                            <input type="radio" bind:group={modalStatus} value="open" class="text-amber-500 focus:ring-amber-500" disabled={isSaving} />
                            <span>Offen / Neu</span>
                        </label>
                        <label class="inline-flex items-center gap-2 text-xs font-medium text-neutral-700 cursor-pointer">
                            <input type="radio" bind:group={modalStatus} value="applied" class="text-emerald-600 focus:ring-emerald-500" disabled={isSaving} />
                            <span>In Umsetzung / Angewendet</span>
                        </label>
                        <label class="inline-flex items-center gap-2 text-xs font-medium text-neutral-700 cursor-pointer">
                            <input type="radio" bind:group={modalStatus} value="archived" class="text-neutral-600 focus:ring-neutral-500" disabled={isSaving} />
                            <span>Archiviert</span>
                        </label>
                    </div>
                </div>

                <!-- Prompt Content (Markdown) -->
                <div class="space-y-1">
                    <div class="flex items-center justify-between">
                        <label for="prompt-content" class="block text-xs font-bold text-neutral-700">
                            Prompt-Inhalt (Markdown) <span class="text-rose-500">*</span>
                        </label>
                        <span class="text-[10px] font-mono text-neutral-400">
                            {modalPromptContent.length} Zeichen
                        </span>
                    </div>
                    <textarea 
                        id="prompt-content"
                        bind:value={modalPromptContent} 
                        rows="14" 
                        placeholder="Geben Sie hier den strukturierten Prompt-Text ein..."
                        class="orga-input-clear py-2.5 px-3 text-xs font-mono leading-relaxed resize-y w-full custom-scrollbar bg-neutral-50 focus:bg-white"
                        required 
                        disabled={isSaving}
                    ></textarea>
                </div>

                <!-- Optional Context / Raw Summary -->
                <details class="bg-neutral-50 p-3.5 rounded-xl border border-neutral-200">
                    <summary class="cursor-pointer text-xs font-bold text-neutral-600 flex items-center justify-between">
                        <span>Zusätzliche Rohdaten / Notizen (Optional)</span>
                        <span class="text-neutral-400">▼</span>
                    </summary>
                    <div class="mt-2.5">
                        <textarea 
                            bind:value={modalRawSummary} 
                            rows="4" 
                            placeholder="Zusätzliche Aggregations-Logs oder Notizen..."
                            class="orga-input-clear py-2 text-xs font-mono w-full custom-scrollbar"
                            disabled={isSaving}
                        ></textarea>
                    </div>
                </details>

                <!-- Footer Buttons -->
                <div class="flex items-center justify-between pt-4 border-t border-neutral-100">
                    <span class="text-[11px] text-neutral-400 font-medium">
                        🛡️ Einzigartige KW-Validierung aktiv
                    </span>
                    <div class="flex items-center gap-2">
                        <button 
                            type="button" 
                            onclick={() => isModalOpen = false} 
                            class="orga-button-ghost py-2 px-4 text-xs font-bold cursor-pointer"
                            disabled={isSaving}
                        >
                            Abbrechen
                        </button>
                        <button 
                            type="submit" 
                            class="orga-button-primary py-2 px-5 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer {kwConflictPrompt ? 'opacity-50 cursor-not-allowed' : ''}"
                            disabled={isSaving || kwConflictPrompt !== null}
                        >
                            {#if isSaving}
                                <svg class="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                <span>Speichert...</span>
                            {:else}
                                <span>💾</span>
                                <span>{modalMode === 'create' ? 'Prompt anlegen' : 'Änderungen speichern'}</span>
                            {/if}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    </div>
{/if}
