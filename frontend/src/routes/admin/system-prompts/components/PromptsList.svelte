<script lang="ts">
    import { Search, X, RefreshCw } from 'lucide-svelte';
    import type { SystemPromptRecord } from '$lib/types/orgaTypes';
    import { formatKW, formatShortDate, getStatusBadge } from '../types';

    let {
        prompts = [],
        selectedPromptId = $bindable(''),
        isLoading = false,
        currentKWString,
        mobileView = $bindable<'list' | 'detail'>('list'),
        onOpenCreateModal
    }: {
        prompts: SystemPromptRecord[];
        selectedPromptId: string;
        isLoading: boolean;
        currentKWString: string;
        mobileView: 'list' | 'detail';
        onOpenCreateModal: () => void;
    } = $props();

    let searchQuery = $state('');
    let statusFilter = $state<'all' | 'open' | 'applied' | 'archived'>('all');

    const filteredPrompts = $derived.by(() => {
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
</script>

<aside class="w-full md:w-80 lg:w-96 flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shrink-0 {mobileView === 'detail' ? 'hidden md:flex' : 'flex'}">
    <!-- Search & Filter Controls -->
    <div class="p-3 border-b border-slate-200 dark:border-slate-800 space-y-2 bg-slate-50/50 dark:bg-slate-950/40">
        <div class="relative">
            <Search class="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input 
                type="text" 
                bind:value={searchQuery}
                placeholder="Prompts nach Titel, KW, Inhalt..." 
                class="w-full pl-8 pr-7 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
            />
            {#if searchQuery}
                <button type="button" onclick={() => searchQuery = ''} class="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
                    <X class="w-3 h-3" />
                </button>
            {/if}
        </div>

        <!-- Status Filter Pills -->
        <div class="flex items-center gap-1 overflow-x-auto pb-0.5 custom-scrollbar text-[11px]">
            <button 
                type="button" 
                onclick={() => statusFilter = 'all'} 
                class="px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-colors cursor-pointer {statusFilter === 'all' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'}"
            >
                Alle ({prompts.length})
            </button>
            <button 
                type="button" 
                onclick={() => statusFilter = 'open'} 
                class="px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-colors cursor-pointer {statusFilter === 'open' ? 'bg-amber-500 text-white' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'}"
            >
                Offen
            </button>
            <button 
                type="button" 
                onclick={() => statusFilter = 'applied'} 
                class="px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-colors cursor-pointer {statusFilter === 'applied' ? 'bg-emerald-600 text-white' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'}"
            >
                Angewendet
            </button>
            <button 
                type="button" 
                onclick={() => statusFilter = 'archived'} 
                class="px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-colors cursor-pointer {statusFilter === 'archived' ? 'bg-slate-700 text-white' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'}"
            >
                Archiviert
            </button>
        </div>
    </div>

    <!-- Scrollable Prompts List -->
    <div class="flex-1 overflow-y-auto custom-scrollbar divide-y divide-slate-100 dark:divide-slate-800/60 p-2 space-y-1">
        {#if isLoading && filteredPrompts.length === 0}
            <div class="p-8 text-center text-slate-400 space-y-2">
                <RefreshCw class="w-6 h-6 animate-spin text-indigo-600 mx-auto" />
                <p class="text-xs font-medium">Lade Prompts...</p>
            </div>
        {:else if filteredPrompts.length === 0}
            <div class="p-8 text-center text-slate-400 space-y-3">
                <span class="text-3xl block">📭</span>
                <p class="text-xs font-medium">Keine Prompts gefunden.</p>
                <button 
                    type="button" 
                    onclick={onOpenCreateModal}
                    class="w-full py-2 px-3 rounded-xl text-xs font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 cursor-pointer"
                >
                    + Prompt manuell anlegen
                </button>
            </div>
        {:else}
            {#each filteredPrompts as p (p.id)}
                {@const isSelected = selectedPromptId === p.id}
                {@const statusInfo = getStatusBadge(p.status)}
                {@const kwDisplay = formatKW(p.calendar_week)}
                {@const isCurrentWeek = p.calendar_week === currentKWString}
                <button 
                    type="button" 
                    onclick={() => { selectedPromptId = p.id; mobileView = 'detail'; }}
                    class="w-full text-left p-3 rounded-2xl transition-all flex flex-col gap-1.5 cursor-pointer relative {isSelected ? 'bg-indigo-50/90 dark:bg-indigo-950/60 border border-indigo-300 dark:border-indigo-800 shadow-xs' : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-transparent'}"
                >
                    {#if isSelected}
                        <div class="absolute left-0 top-3 bottom-3 w-1 bg-indigo-600 rounded-r-full"></div>
                    {/if}

                    <div class="flex items-center justify-between gap-1.5">
                        <div class="flex items-center gap-1.5 flex-wrap">
                            {#if kwDisplay}
                                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black {isCurrentWeek ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}">
                                    {kwDisplay}
                                </span>
                            {/if}
                            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border {statusInfo.bg}">
                                <span class="w-1.5 h-1.5 rounded-full {statusInfo.dot}"></span>
                                {statusInfo.label}
                            </span>
                        </div>
                        <span class="text-[10px] font-medium text-slate-400 shrink-0">
                            {formatShortDate(p.created)}
                        </span>
                    </div>

                    <h3 class="text-xs font-bold text-slate-900 dark:text-white line-clamp-2 leading-snug">
                        {p.title}
                    </h3>

                    <div class="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-medium pt-1 border-t border-slate-100 dark:border-slate-800/60">
                        <span>🔍 {p.feedback_count ?? 0} Rückmeldungen</span>
                        {#if p.source_period_start && p.source_period_end}
                            <span class="text-[9px] text-slate-400">
                                {formatShortDate(p.source_period_start)} – {formatShortDate(p.source_period_end)}
                            </span>
                        {/if}
                    </div>
                </button>
            {/each}
        {/if}
    </div>
</aside>
