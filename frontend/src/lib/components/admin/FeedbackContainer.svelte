<script lang="ts">
    import FeedbackList from './FeedbackList.svelte';
    import FeedbackDetail from './FeedbackDetail.svelte';

    // Props-Deklaration gem. Svelte 5 Standard
    interface Props {
        pbClient: any;
    }

    let { pbClient }: Props = $props();

    // Reaktiver Zustand (Svelte 5 Runes)
    let feedbacks = $state<any[]>([]);
    let selectedId = $state<string | null>(null);
    let isMobileDetailOpen = $state(false);
    let isLoading = $state(true);

    // Abgeleiteter Zustand für das ausgewählte Feedback
    let activeFeedback = $derived(feedbacks.find(f => f.id === selectedId) || null);

    // Daten-Fetch beim Mounten (Lazy Loading: Nur Listen-Basisdaten holen)
    $effect(() => {
        async function loadFeedbacks() {
            try {
                isLoading = true;
                const records = await pbClient.collection('support_feedbacks').getFullList({
                    sort: '-created',
                    fields: 'id,sender,priority,category,created,status,subject'
                });
                feedbacks = records;
                // Auf Desktop: Wenn noch nichts ausgewählt ist und Einträge vorhanden sind, das erste auswählen
                if (typeof window !== 'undefined' && window.innerWidth >= 768 && records.length > 0 && !selectedId) {
                    selectedId = records[0].id;
                }
            } catch (err) {
                console.error("Fehler beim Laden der Feedbacks:", err);
            } finally {
                isLoading = false;
            }
        }
        loadFeedbacks();
    });

    function selectFeedback(id: string) {
        selectedId = id;
        isMobileDetailOpen = true;
    }

    function closeMobileDetail() {
        isMobileDetailOpen = false;
    }

    function handleStatusUpdate(updatedFeedback: any) {
        feedbacks = feedbacks.map(f => f.id === updatedFeedback.id ? { ...f, ...updatedFeedback } : f);
    }
</script>

<div class="h-[calc(100vh-4rem)] w-full flex bg-slate-50 overflow-hidden relative">
    <!-- Listen-Spalte: Sichtbar auf Desktop, ausgeblendet auf Mobile wenn Detailansicht offen -->
    <div class="w-full md:w-5/12 lg:w-4/12 border-r border-slate-200 flex flex-col bg-white shrink-0
        {isMobileDetailOpen ? 'hidden md:flex' : 'flex'}">
        
        <div class="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center h-16 shrink-0">
            <div>
                <h1 class="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                    <span>🎯</span>
                    <span>Support & Feedback</span>
                </h1>
            </div>
            <span class="bg-primary-100 text-primary-800 text-xs font-bold px-2.5 py-1 rounded-full">
                {feedbacks.length} {feedbacks.length === 1 ? 'Meldung' : 'Meldungen'}
            </span>
        </div>

        {#if isLoading}
            <div class="flex-1 flex items-center justify-center">
                <div class="flex flex-col items-center gap-2">
                    <div class="w-8 h-8 border-3 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
                    <span class="text-xs text-slate-400">Lade Meldungen...</span>
                </div>
            </div>
        {:else}
            <FeedbackList 
                {feedbacks} 
                {selectedId} 
                onSelect={selectFeedback} 
            />
        {/if}
    </div>

    <!-- Detail-Spalte: Vollbild auf Mobile wenn Detail offen, ansonsten sichtbar auf Desktop -->
    <div class="w-full md:w-7/12 lg:w-8/12 flex flex-col bg-slate-50 flex-1
        {!isMobileDetailOpen ? 'hidden md:flex' : 'flex'}">
        
        {#if activeFeedback}
            <FeedbackDetail 
                feedback={activeFeedback} 
                {pbClient}
                onBack={closeMobileDetail}
                onStatusUpdated={handleStatusUpdate}
            />
        {:else}
            <div class="hidden md:flex flex-col items-center justify-center flex-1 text-slate-400 p-8 text-center">
                <div class="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4 text-slate-400">
                    <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                </div>
                <h3 class="text-sm font-semibold text-slate-700 mb-1">Keine Nachricht ausgewählt</h3>
                <p class="text-xs text-slate-400 max-w-sm">
                    Wählen Sie eine Nachricht aus der linken Liste aus, um die Details anzuzeigen und den Status zu bearbeiten.
                </p>
            </div>
        {/if}
    </div>
</div>
