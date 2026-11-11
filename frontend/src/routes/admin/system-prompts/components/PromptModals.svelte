<script lang="ts">
    import FeedbackActionPromptModal from '$lib/components/admin/FeedbackActionPromptModal.svelte';
    import ImprovementProposalModal from '$lib/components/admin/ImprovementProposalModal.svelte';
    import SolutionPromptModal from '$lib/components/solution-generator/SolutionPromptModal.svelte';
    import PromptEditModal from './PromptEditModal.svelte';
    import type { SystemPromptRecord } from '$lib/types/orgaTypes';

    let {
        isEditModalOpen = $bindable(false),
        editModalMode = $bindable<'create' | 'edit'>('create'),
        editingPrompt = $bindable<SystemPromptRecord | null>(null),
        existingPrompts = [],
        currentKWString,
        onSavePrompt
    }: {
        isEditModalOpen: boolean;
        editModalMode: 'create' | 'edit';
        editingPrompt: SystemPromptRecord | null;
        existingPrompts: SystemPromptRecord[];
        currentKWString: string;
        onSavePrompt: (data: any) => Promise<void>;
    } = $props();

    let feedbackActionModal: ReturnType<typeof FeedbackActionPromptModal>;
    let proposalModal: ReturnType<typeof ImprovementProposalModal>;
    let solutionModal: ReturnType<typeof SolutionPromptModal>;

    export function openFeedbackAction(record: any, type?: 'feedback' | 'chat' | 'inquiry' | 'proposal' | 'support_message' | string) {
        feedbackActionModal?.open(record, type as any);
    }

    export function openProposal(proposal?: any, callback?: (saved: any) => void) {
        proposalModal?.open(proposal, callback);
    }

    export function openSolution(data: any, callback: (concept: string) => void) {
        solutionModal?.open(data, callback);
    }
</script>

<FeedbackActionPromptModal bind:this={feedbackActionModal} />
<ImprovementProposalModal bind:this={proposalModal} />
<SolutionPromptModal bind:this={solutionModal} />
<PromptEditModal 
    bind:isOpen={isEditModalOpen} 
    mode={editModalMode} 
    prompt={editingPrompt}
    {existingPrompts} 
    {currentKWString}
    onClose={() => isEditModalOpen = false}
    onSave={onSavePrompt}
    onSwitchPrompt={(p) => { editingPrompt = p; editModalMode = 'edit'; }}
/>
