<script lang="ts">
    import { Inbox, Search, RefreshCw } from 'lucide-svelte';
    import type { UnifiedInboxItem } from '../types';
    import FeedbackInboxCard from './FeedbackInboxCard.svelte';

    let {
        items = [],
        isLoading = false,
        rawFeedbacksCount = 0,
        rawInquiriesCount = 0,
        rawChatCount = 0,
        onUpdateStatus,
        onConvertToProposal,
        onCreatePrompt
    }: {
        items: UnifiedInboxItem[];
        isLoading: boolean;
        rawFeedbacksCount: number;
        rawInquiriesCount: number;
        rawChatCount: number;
        onUpdateStatus: (item: UnifiedInboxItem, newStatus: string) => Promise<void>;
        onConvertToProposal: (item: UnifiedInboxItem) => void;
        onCreatePrompt: (item: UnifiedInboxItem) => void;
    } = $props();

    let feedbackSourceFilter = $state<'all' | 'feedbacks' | 'inquiries' | 'chat'>('all');
    let feedbackStatusFilter = $state<'all' | 'Neu' | 'In Bearbeitung' | 'Gelöst'>('all');
    let feedbackRatingFilter = $state<'all' | 'critical' | 'good'>('all');
    let feedbackSearch = $state('');

    const filteredItems = $derived.by(() => {
        return items.filter(item => {
            if (feedbackSourceFilter !== 'all' && item.source !== (feedbackSourceFilter === 'feedbacks' ? 'feedback' : feedbackSourceFilter === 'inquiries' ? 'inquiry' : 'chat')) {
                return false;
            }
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
</script>

<div class="flex-1 flex flex-col overflow-hidden bg-slate-100 dark:bg-slate-950">
    <!-- Inbox Sticky Filter Toolbar -->
    <div class="p-3 sm:p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0 space-y-3 shadow-2xs">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div class="flex items-center gap-2">
                <Inbox class="w-4 h-4 text-indigo-600" />
                <h3 class="text-sm font-black text-slate-900 dark:text-white">Unified Support & Feedback Inbox</h3>
                <span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {filteredItems.length} Einträge
                </span>
            </div>

            <!-- Source Filter Buttons -->
            <div class="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl overflow-x-auto text-xs font-bold">
                <button
                    type="button"
                    onclick={() => feedbackSourceFilter = 'all'}
                    class="px-3 py-1 rounded-lg transition-all cursor-pointer {feedbackSourceFilter === 'all' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}"
                >
                    Alle ({rawFeedbacksCount + rawInquiriesCount + rawChatCount})
                </button>
                <button
                    type="button"
                    onclick={() => feedbackSourceFilter = 'feedbacks'}
                    class="px-3 py-1 rounded-lg transition-all cursor-pointer {feedbackSourceFilter === 'feedbacks' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}"
                >
                    ⭐ Feedbacks ({rawFeedbacksCount})
                </button>
                <button
                    type="button"
                    onclick={() => feedbackSourceFilter = 'inquiries'}
                    class="px-3 py-1 rounded-lg transition-all cursor-pointer {feedbackSourceFilter === 'inquiries' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}"
                >
                    📬 Support ({rawInquiriesCount})
                </button>
                <button
                    type="button"
                    onclick={() => feedbackSourceFilter = 'chat'}
                    class="px-3 py-1 rounded-lg transition-all cursor-pointer {feedbackSourceFilter === 'chat' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}"
                >
                    💬 Chat ({rawChatCount})
                </button>
            </div>
        </div>

        <!-- Search & Secondary Filters -->
        <div class="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
            <div class="sm:col-span-6 relative">
                <Search class="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                    type="text"
                    bind:value={feedbackSearch}
                    placeholder="Nach Absender, Nachricht, E-Mail oder Details suchen..."
                    class="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                />
            </div>

            <div class="sm:col-span-3">
                <select
                    bind:value={feedbackStatusFilter}
                    class="w-full py-1.5 px-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-medium cursor-pointer"
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
                    class="w-full py-1.5 px-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-medium cursor-pointer"
                >
                    <option value="all">Alle Bewertungen</option>
                    <option value="critical">⚠️ Kritisch (≤ 5 Sterne)</option>
                    <option value="good">⭐ Positiv (6-10 Sterne)</option>
                </select>
            </div>
        </div>
    </div>

    <!-- Scrollable Inbox List -->
    <div class="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6">
        {#if isLoading}
            <div class="p-12 text-center">
                <RefreshCw class="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-3" />
                <p class="text-xs text-slate-500 dark:text-slate-400 font-medium">Lade Support-Nachrichten...</p>
            </div>
        {:else if filteredItems.length === 0}
            <div class="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-md mx-auto space-y-2 mt-8">
                <span class="text-3xl block">🎉</span>
                <h3 class="text-sm font-bold text-slate-800 dark:text-white">Keine passenden Nachrichten gefunden</h3>
                <p class="text-xs text-slate-400">Alle Anliegen in dieser Ansicht wurden gelöst oder erfüllen nicht die Filterkriterien.</p>
            </div>
        {:else}
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-7xl mx-auto">
                {#each filteredItems as item (item.id)}
                    <FeedbackInboxCard 
                        {item}
                        {onUpdateStatus}
                        {onConvertToProposal}
                        {onCreatePrompt}
                    />
                {/each}
            </div>
        {/if}
    </div>
</div>
