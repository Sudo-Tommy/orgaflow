<script lang="ts">
    import { Trash2 } from "lucide-svelte";
    import { hapticFeedback } from "$lib/services/hapticFeedback";

    interface Props {
        feedbacks: any[];
        isLoading?: boolean;
        feedbackSearch: string;
        feedbackRatingFilter: 'all' | 'critical' | 'good';
        showAllFeedbacks: boolean;
        onUpdateStatus: (id: string, status: string) => void;
        onDelete: (id: string) => void;
    }

    let {
        feedbacks,
        isLoading = false,
        feedbackSearch = $bindable(),
        feedbackRatingFilter = $bindable(),
        showAllFeedbacks = $bindable(),
        onUpdateStatus,
        onDelete
    }: Props = $props();

    function getRatingBadgeClass(rating: number) {
        const val = Number(rating) || 0;
        if (val <= 3) return "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800";
        if (val <= 5) return "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800";
        if (val <= 8) return "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800";
        return "bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800";
    }

    let filteredFeedbacks = $derived.by(() => {
        let list = feedbacks;
        if (!showAllFeedbacks) {
            list = list.filter(f => f.status !== 'Archieviert');
        }
        if (feedbackRatingFilter === 'critical') {
            list = list.filter(f => (Number(f.rating) || 0) <= 5);
        } else if (feedbackRatingFilter === 'good') {
            list = list.filter(f => (Number(f.rating) || 0) > 5);
        }
        if (feedbackSearch.trim()) {
            const q = feedbackSearch.toLowerCase().trim();
            list = list.filter(f => {
                const fullName = `${f.name_first || ''} ${f.name_last || ''}`.toLowerCase();
                const msg = (f.message || '').toLowerCase();
                return fullName.includes(q) || msg.includes(q);
            });
        }
        return list;
    });
</script>

<div class="space-y-4">
    <!-- Sub-Toolbar -->
    <div class="px-4 sm:px-6 py-2.5 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0 rounded-2xl">
        <input
            type="text"
            bind:value={feedbackSearch}
            placeholder="Feedbacks nach Name oder Text durchsuchen..."
            class="orga-input-clear min-h-11 text-xs max-w-sm flex-1"
        />
        <div class="flex items-center gap-2 flex-wrap">
            <select
                bind:value={feedbackRatingFilter}
                onchange={() => hapticFeedback.selection()}
                class="min-h-11 px-3 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-medium cursor-pointer"
            >
                <option value="all">Alle Bewertungen</option>
                <option value="critical">⚠️ Kritisch (≤ 5)</option>
                <option value="good">⭐ Positiv (&gt; 5)</option>
            </select>
            <div class="inline-flex p-0.5 rounded-xl bg-slate-200/70 dark:bg-slate-800 text-xs font-semibold">
                <button
                    type="button"
                    onclick={() => { hapticFeedback.tap(); showAllFeedbacks = false; }}
                    class="min-h-10 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer touch-manipulation {!showAllFeedbacks ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold' : 'text-slate-600 dark:text-slate-400'}"
                >
                    Aktuell ({feedbacks.filter(f => f.status !== 'Archieviert').length})
                </button>
                <button
                    type="button"
                    onclick={() => { hapticFeedback.tap(); showAllFeedbacks = true; }}
                    class="min-h-10 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer touch-manipulation {showAllFeedbacks ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold' : 'text-slate-600 dark:text-slate-400'}"
                >
                    Alle ({feedbacks.length})
                </button>
            </div>
        </div>
    </div>

    {#if isLoading}
        <div class="flex flex-col items-center justify-center py-16 text-slate-500 dark:text-slate-400 gap-3">
            <span class="inline-block w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></span>
            <p class="text-sm font-medium">Lade Feedbacks...</p>
        </div>
    {:else if filteredFeedbacks.length === 0}
        <div class="p-8 text-center text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <p class="text-2xl mb-1">{feedbackSearch.trim() || feedbackRatingFilter !== 'all' ? '🔍' : '🙌'}</p>
            <p class="text-sm font-bold">{feedbackSearch.trim() || feedbackRatingFilter !== 'all' ? 'Keine Treffer gefunden' : 'Keine Feedbacks!'}</p>
            <p class="text-xs text-slate-400 mt-1">Aktuell liegen in dieser Ansicht keine Bewertungen vor.</p>
        </div>
    {:else}
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            {#each filteredFeedbacks as f (f.id)}
                <div class="border rounded-2xl p-4 sm:p-5 flex flex-col relative transition-all duration-200 shadow-xs hover:shadow-md {f.status === 'Neu' ? 'border-amber-300/80 dark:border-amber-700/70 bg-white dark:bg-slate-900 ring-1 ring-amber-500/10' : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900'}">
                    <div class="flex justify-between items-start mb-3 gap-2">
                        <div class="min-w-0">
                            <h3 class="font-bold text-slate-900 dark:text-white text-base truncate">
                                {f.name_first || f.name_last ? `${f.name_first || ''} ${f.name_last || ''}`.trim() : 'Anonymes Feedback'}
                            </h3>
                            <div class="flex items-center gap-1 mt-1">
                                <span class="text-xs font-black {getRatingBadgeClass(f.rating)} px-2.5 py-0.5 rounded-lg border shadow-2xs">{f.rating} / 10</span>
                            </div>
                        </div>
                        <div class="text-right shrink-0">
                            <p class="text-xs text-slate-500 dark:text-slate-400 font-medium">{new Date(f.created).toLocaleDateString('de-DE')} {new Date(f.created).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</p>
                            <span class="text-xs font-bold mt-1 block {f.status === 'Neu' ? 'text-amber-600 dark:text-amber-400' : (f.status === 'Gelesen' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500')}">{f.status}</span>
                        </div>
                    </div>
                    {#if f.message}
                        <div class="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-sm text-slate-700 dark:text-slate-300 mb-4 flex-1 whitespace-pre-wrap leading-relaxed shadow-inner">
                            "{f.message}"
                        </div>
                    {/if}
                    <div class="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 mt-auto">
                        {#if f.status === 'Neu'}
                            <button type="button" onclick={() => { hapticFeedback.tap(); onUpdateStatus(f.id, 'Gelesen'); }} class="min-h-11 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 rounded-xl transition-colors border border-emerald-200 dark:border-emerald-800 cursor-pointer touch-manipulation">Gelesen</button>
                        {/if}
                        {#if f.status !== 'Archieviert'}
                            <button type="button" onclick={() => { hapticFeedback.tap(); onUpdateStatus(f.id, 'Archieviert'); }} class="min-h-11 px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer touch-manipulation">Archivieren</button>
                        {/if}
                        <button type="button" onclick={() => { hapticFeedback.warning(); onDelete(f.id); }} class="min-h-11 min-w-11 p-2 text-slate-400 hover:text-rose-500 rounded-xl flex items-center justify-center cursor-pointer touch-manipulation" title="Löschen">
                            <Trash2 class="w-4 h-4" />
                        </button>
                    </div>
                </div>
            {/each}
        </div>
    {/if}
</div>
