<script lang="ts">
    import { ChevronLeft, Zap, Calendar, Inbox, Lightbulb, RefreshCw, Plus } from 'lucide-svelte';
    import { formatKW } from '../types';
    import PromptAiGeneratorDropdown from './PromptAiGeneratorDropdown.svelte';

    let {
        mainTab = $bindable<'prompts' | 'feedbacks' | 'proposals'>('prompts'),
        mobileView = $bindable<'list' | 'detail'>('list'),
        currentKWString,
        promptsCount = 0,
        inboxCount = 0,
        newFeedbacksCount = 0,
        proposalsCount = 0,
        newProposalsCount = 0,
        isRefreshing = false,
        isLoading = false,
        isLoadingInbox = false,
        isGenerating = false,
        onRefresh,
        onOpenCreatePrompt,
        onOpenCreateProposal,
        onGeneratePrompt
    }: {
        mainTab: 'prompts' | 'feedbacks' | 'proposals';
        mobileView: 'list' | 'detail';
        currentKWString: string;
        promptsCount: number;
        inboxCount: number;
        newFeedbacksCount: number;
        proposalsCount: number;
        newProposalsCount?: number;
        isRefreshing: boolean;
        isLoading: boolean;
        isLoadingInbox: boolean;
        isGenerating: boolean;
        onRefresh: () => void;
        onOpenCreatePrompt: () => void;
        onOpenCreateProposal: () => void;
        onGeneratePrompt: (options: any) => void;
    } = $props();
</script>

<header class="h-14 md:h-16 px-3 sm:px-5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 shrink-0 z-30 shadow-xs">
    <div class="flex items-center gap-2.5 min-w-0">
        <a 
            href="/admin" 
            class="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors shrink-0"
            title="Zurück zum Admin-Dashboard"
        >
            <ChevronLeft class="w-4 h-4" />
        </a>

        <div class="flex items-center gap-2 min-w-0">
            <div class="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center shadow-xs shadow-indigo-600/30 shrink-0">
                <Zap class="w-4 h-4 text-amber-300" />
            </div>
            <div class="truncate">
                <div class="flex items-center gap-1.5">
                    <span class="text-sm font-black tracking-tight text-slate-900 dark:text-white">Prompt Studio</span>
                    <span class="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                        Gemini Flash
                    </span>
                </div>
                <div class="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate flex items-center gap-1">
                    <span>{formatKW(currentKWString)}</span>
                    <span>•</span>
                    <span class="text-emerald-600 dark:text-emerald-400 font-semibold">Live Engine</span>
                </div>
            </div>
        </div>
    </div>

    <!-- Center: Segmented Navigation Control Tabs (Desktop) -->
    <div class="hidden lg:flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
        <button
            type="button"
            onclick={() => { mainTab = 'prompts'; mobileView = 'list'; }}
            class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer {mainTab === 'prompts' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}"
        >
            <Calendar class="w-3.5 h-3.5" />
            <span>Wochen-Prompts</span>
            <span class="px-1.5 py-0.2 rounded-md text-[10px] {mainTab === 'prompts' ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-black' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}">{promptsCount}</span>
        </button>

        <button
            type="button"
            onclick={() => { mainTab = 'feedbacks'; }}
            class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer {mainTab === 'feedbacks' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}"
        >
            <Inbox class="w-3.5 h-3.5" />
            <span>Support-Inbox</span>
            {#if newFeedbacksCount > 0}
                <span class="px-1.5 py-0.2 rounded-md text-[10px] font-black bg-amber-500 text-slate-950 animate-pulse">{newFeedbacksCount}</span>
            {:else}
                <span class="px-1.5 py-0.2 rounded-md text-[10px] {mainTab === 'feedbacks' ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-black' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}">{inboxCount}</span>
            {/if}
        </button>

        <button
            type="button"
            onclick={() => mainTab = 'proposals'}
            class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer {mainTab === 'proposals' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}"
        >
            <Lightbulb class="w-3.5 h-3.5 text-amber-500" />
            <span>Vorschläge</span>
            {#if newProposalsCount > 0}
                <span class="px-1.5 py-0.2 rounded-md text-[10px] font-black bg-amber-500 text-slate-950 animate-pulse">{newProposalsCount}</span>
            {:else}
                <span class="px-1.5 py-0.2 rounded-md text-[10px] {mainTab === 'proposals' ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-black' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}">{proposalsCount}</span>
            {/if}
        </button>
    </div>

    <!-- Right: Actions Cluster & AI Generator Popover -->
    <div class="flex items-center gap-2 shrink-0">
        <button
            type="button"
            onclick={onRefresh}
            disabled={isRefreshing || isLoading || isLoadingInbox}
            class="w-8 h-8 md:w-9 md:h-9 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
            title="Aktuelle Daten mit Datenbank synchronisieren"
        >
            <RefreshCw class="w-3.5 h-3.5 {isRefreshing || isLoading || isLoadingInbox ? 'animate-spin text-indigo-600' : ''}" />
        </button>

        {#if mainTab === 'prompts'}
            <button
                type="button"
                onclick={onOpenCreatePrompt}
                class="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer shadow-2xs"
            >
                <Plus class="w-3.5 h-3.5 text-indigo-600" />
                <span>Prompt anlegen</span>
            </button>
        {:else if mainTab === 'proposals'}
            <button
                type="button"
                onclick={onOpenCreateProposal}
                class="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer shadow-2xs"
            >
                <Plus class="w-3.5 h-3.5 text-amber-500" />
                <span>Neuer Vorschlag</span>
            </button>
        {/if}

        <PromptAiGeneratorDropdown 
            {isGenerating} 
            {currentKWString} 
            onGenerate={onGeneratePrompt} 
        />
    </div>
</header>
