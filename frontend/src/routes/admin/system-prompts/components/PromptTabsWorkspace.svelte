<script lang="ts">
    import PromptsList from './PromptsList.svelte';
    import PromptDetailView from './PromptDetailView.svelte';
    import FeedbackInboxTab from './FeedbackInboxTab.svelte';
    import ProposalsTab from './ProposalsTab.svelte';
    import type { SystemPromptRecord, ImprovementProposalRecord } from '$lib/types/orgaTypes';
    import type { UnifiedInboxItem } from '../types';

    let {
        mainTab,
        mobileView = $bindable<'list' | 'detail'>('list'),
        prompts = [],
        selectedPromptId = $bindable(''),
        selectedPrompt = null,
        isLoading = false,
        isLoadingInbox = false,
        currentKWString,
        unifiedInboxItems = [],
        rawFeedbacksCount = 0,
        rawInquiriesCount = 0,
        rawChatCount = 0,
        proposals = [],
        selectedProposalIds = $bindable<string[]>([]),
        isProposalsLoading = false,
        onOpenCreatePrompt,
        onUpdatePromptStatus,
        onEditPrompt,
        onDeletePrompt,
        onUpdateInboxStatus,
        onConvertToProposal,
        onCreateInboxPrompt,
        onOpenCreateProposal,
        onUpdateProposalStatus,
        onEditProposal,
        onDeleteProposal,
        onShareProposalChat,
        onSolutionProposal,
        onCreateProposalPrompt
    }: {
        mainTab: 'prompts' | 'feedbacks' | 'proposals';
        mobileView: 'list' | 'detail';
        prompts: SystemPromptRecord[];
        selectedPromptId: string;
        selectedPrompt: SystemPromptRecord | null;
        isLoading: boolean;
        isLoadingInbox: boolean;
        currentKWString: string;
        unifiedInboxItems: UnifiedInboxItem[];
        rawFeedbacksCount: number;
        rawInquiriesCount: number;
        rawChatCount: number;
        proposals: ImprovementProposalRecord[];
        selectedProposalIds: string[];
        isProposalsLoading: boolean;
        onOpenCreatePrompt: () => void;
        onUpdatePromptStatus: (id: string, s: 'open' | 'applied' | 'archived') => void;
        onEditPrompt: (p: SystemPromptRecord) => void;
        onDeletePrompt: (id: string) => void;
        onUpdateInboxStatus: (item: UnifiedInboxItem, s: string) => Promise<void>;
        onConvertToProposal: (item: UnifiedInboxItem) => void;
        onCreateInboxPrompt: (item: UnifiedInboxItem) => void;
        onOpenCreateProposal: () => void;
        onUpdateProposalStatus: (id: string, s: any) => Promise<void>;
        onEditProposal: (p: ImprovementProposalRecord) => void;
        onDeleteProposal: (p: ImprovementProposalRecord) => void;
        onShareProposalChat: (p: ImprovementProposalRecord) => void;
        onSolutionProposal: (p: ImprovementProposalRecord) => void;
        onCreateProposalPrompt: (p: ImprovementProposalRecord) => void;
    } = $props();
</script>

<main class="flex-1 flex overflow-hidden relative">
    {#if mainTab === 'prompts'}
        <div class="flex-1 flex w-full h-full overflow-hidden">
            <PromptsList 
                {prompts} bind:selectedPromptId bind:mobileView {isLoading} {currentKWString}
                onOpenCreateModal={onOpenCreatePrompt}
            />
            <PromptDetailView 
                prompt={selectedPrompt} bind:mobileView
                onUpdateStatus={onUpdatePromptStatus}
                onEdit={onEditPrompt}
                onDelete={onDeletePrompt}
            />
        </div>
    {:else if mainTab === 'feedbacks'}
        <FeedbackInboxTab 
            items={unifiedInboxItems} isLoading={isLoadingInbox}
            {rawFeedbacksCount} {rawInquiriesCount} {rawChatCount}
            onUpdateStatus={onUpdateInboxStatus}
            onConvertToProposal={onConvertToProposal}
            onCreatePrompt={onCreateInboxPrompt}
        />
    {:else if mainTab === 'proposals'}
        <ProposalsTab 
            {proposals} bind:selectedProposalIds isLoading={isProposalsLoading}
            onOpenCreate={onOpenCreateProposal}
            onUpdateStatus={onUpdateProposalStatus}
            onEdit={onEditProposal}
            onDelete={onDeleteProposal}
            onShareChat={onShareProposalChat}
            onSolution={onSolutionProposal}
            onCreatePrompt={onCreateProposalPrompt}
        />
    {/if}
</main>
