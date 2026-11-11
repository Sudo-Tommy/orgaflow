<script lang="ts">
    import { Calendar, Inbox, Lightbulb } from 'lucide-svelte';

    let {
        mainTab = $bindable<'prompts' | 'feedbacks' | 'proposals'>('prompts'),
        mobileView = $bindable<'list' | 'detail'>('list'),
        promptsCount = 0,
        newFeedbacksCount = 0,
        proposalsCount = 0,
        newProposalsCount = 0,
        onSelectInbox
    }: {
        mainTab: 'prompts' | 'feedbacks' | 'proposals';
        mobileView: 'list' | 'detail';
        promptsCount: number;
        newFeedbacksCount: number;
        proposalsCount: number;
        newProposalsCount?: number;
        onSelectInbox: () => void;
    } = $props();
</script>

<div class="lg:hidden flex items-center bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-2 py-1.5 gap-1 shrink-0 overflow-x-auto">
    <button
        type="button"
        onclick={() => { mainTab = 'prompts'; mobileView = 'list'; }}
        class="flex-1 py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 whitespace-nowrap {mainTab === 'prompts' ? 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400'}"
    >
        <Calendar class="w-3.5 h-3.5" />
        <span>Prompts ({promptsCount})</span>
    </button>

    <button
        type="button"
        onclick={() => { mainTab = 'feedbacks'; onSelectInbox(); }}
        class="flex-1 py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 whitespace-nowrap {mainTab === 'feedbacks' ? 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400'}"
    >
        <Inbox class="w-3.5 h-3.5" />
        <span>Inbox</span>
        {#if newFeedbacksCount > 0}
            <span class="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-500 text-slate-950 animate-pulse">{newFeedbacksCount}</span>
        {/if}
    </button>

    <button
        type="button"
        onclick={() => mainTab = 'proposals'}
        class="flex-1 py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 whitespace-nowrap {mainTab === 'proposals' ? 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400'}"
    >
        <Lightbulb class="w-3.5 h-3.5 text-amber-500" />
        <span>Vorschläge</span>
        {#if newProposalsCount > 0}
            <span class="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-500 text-slate-950 animate-pulse">{newProposalsCount}</span>
        {:else}
            <span class="text-[10px] text-slate-400">({proposalsCount})</span>
        {/if}
    </button>
</div>
