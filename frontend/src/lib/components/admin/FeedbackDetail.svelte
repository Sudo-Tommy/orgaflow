<script lang="ts">
    import { toastStore } from '$lib/services/toastService.svelte';

    interface Props {
        feedback: any;
        pbClient: any;
        onBack: () => void;
        onStatusUpdated: (item: any) => void;
    }

    let { feedback, pbClient, onBack, onStatusUpdated }: Props = $props();

    let isSubmitting = $state(false);
    let detailData = $state<any>(null);
    let detailLoading = $state(false);

    // Lazy Loading Detail-Content (Nachrichtentext & vollständiger Record)
    $effect(() => {
        const currentId = feedback?.id;
        if (!currentId) return;

        async function loadDetail() {
            try {
                detailLoading = true;
                const record = await pbClient.collection('support_feedbacks').getOne(currentId);
                detailData = record;
            } catch (err: any) {
                console.error("Fehler beim Nachladen der Details:", err);
                // Fallback falls getOne fehlschlägt
                detailData = feedback;
            } finally {
                detailLoading = false;
            }
        }
        loadDetail();
    });

    async function updateStatus(newStatus: 'in_progress' | 'resolved') {
        if (isSubmitting || !feedback?.id) return; // Double-Submission-Schutz
        isSubmitting = true;

        try {
            const updated = await pbClient.collection('support_feedbacks').update(feedback.id, {
                status: newStatus
            });
            onStatusUpdated(updated);
            if (detailData) {
                detailData = { ...detailData, status: newStatus };
            }
            toastStore.success(
                newStatus === 'resolved' 
                    ? 'Status auf „Gelöst“ gesetzt! ✅' 
                    : 'Status auf „In Bearbeitung“ gesetzt! ⏳'
            );
        } catch (err: any) {
            console.error("Fehler beim Aktualisieren des Status:", err);
            toastStore.error(err?.message || "Fehler beim Aktualisieren des Status. Bitte erneut versuchen.");
        } finally {
            isSubmitting = false;
        }
    }
</script>

<div class="flex-1 flex flex-col h-full bg-white md:bg-slate-50 dark:bg-slate-950 md:dark:bg-slate-950 relative">
    <!-- Mobile Header mit Back-Button (44x44px Touch: w-11 h-11) -->
    <div class="h-16 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
        <button 
            type="button"
            onclick={onBack}
            class="md:hidden w-11 h-11 flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition cursor-pointer"
            aria-label="Zurück zur Liste"
        >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
        </button>
        <div class="flex-1 pl-2 md:pl-0">
            <h2 class="font-bold text-slate-900 dark:text-white text-sm sm:text-base truncate">{feedback.sender || 'Anonym'}</h2>
            <p class="text-xs text-slate-400 dark:text-slate-500">
                Status: <span class="capitalize font-semibold text-slate-700 dark:text-slate-200">
                    {feedback.status === 'resolved' ? 'Gelöst' : feedback.status === 'in_progress' ? 'In Bearbeitung' : 'Neu'}
                </span>
            </p>
        </div>
        {#if feedback.created}
            <span class="text-xs text-slate-400 dark:text-slate-500 hidden sm:inline-block">
                {new Date(feedback.created).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
        {/if}
    </div>

    <!-- Scroll-Content Bereich -->
    <div class="flex-1 overflow-y-auto p-4 sm:p-6 pb-24 md:pb-6 custom-scrollbar space-y-4">
        {#if detailLoading}
            <div class="flex h-40 items-center justify-center">
                <div class="flex flex-col items-center gap-2">
                    <div class="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                    <span class="text-xs text-slate-400 dark:text-slate-500">Lade Ticket-Details...</span>
                </div>
            </div>
        {:else if detailData}
            <div class="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 shadow-xs border border-slate-200/80 dark:border-slate-800 space-y-4">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div>
                        <span class="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Betreff</span>
                        <h3 class="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-0.5">{detailData.subject || 'Kein Betreff'}</h3>
                    </div>
                    <div class="flex items-center gap-2">
                        {#if detailData.category}
                            <span class="text-xs px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium rounded-lg border border-slate-200/60 dark:border-slate-700">
                                {detailData.category}
                            </span>
                        {/if}
                        <span class="text-xs px-2.5 py-1 rounded-lg border font-semibold {detailData.priority === 'high' ? 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800' : detailData.priority === 'medium' ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800' : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'}">
                            {(detailData.priority || 'Normal').toUpperCase()}
                        </span>
                    </div>
                </div>

                <div>
                    <span class="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Nachricht</span>
                    <div class="bg-slate-50/70 dark:bg-slate-950/60 rounded-xl p-4 border border-slate-100 dark:border-slate-800">
                        <p class="text-slate-800 dark:text-slate-100 text-sm leading-relaxed whitespace-pre-wrap font-normal">
                            {detailData.message || 'Keine Nachricht hinterlegt.'}
                        </p>
                    </div>
                </div>
            </div>
        {/if}
    </div>

    <!-- Mobile Bottom Actions / Daumen-optimierte Aktionsleiste (Feste Position auf Mobile, min 44x44px Buttons) -->
    <div class="absolute bottom-0 inset-x-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 p-3 sm:p-4 flex gap-3 md:relative md:bg-white/80 md:dark:bg-slate-900/80 md:backdrop-blur-sm z-10">
        <button
            type="button"
            onclick={() => updateStatus('in_progress')}
            disabled={isSubmitting || feedback.status === 'in_progress'}
            class="flex-1 h-11 min-h-[44px] rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold text-xs sm:text-sm transition-all hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
        >
            {#if isSubmitting}
                <svg class="animate-spin h-4 w-4 text-slate-700 dark:text-slate-300 shrink-0" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            {/if}
            <span>In Bearbeitung</span>
        </button>
        
        <button
            type="button"
            onclick={() => updateStatus('resolved')}
            disabled={isSubmitting || feedback.status === 'resolved'}
            class="flex-1 h-11 min-h-[44px] rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white font-semibold text-xs sm:text-sm transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-xs shadow-indigo-600/20"
        >
            {#if isSubmitting}
                <svg class="animate-spin h-4 w-4 text-white shrink-0" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            {/if}
            <span>Lösen</span>
        </button>
    </div>
</div>
