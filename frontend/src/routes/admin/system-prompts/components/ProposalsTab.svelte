<script lang="ts">
    import { RefreshCw, Plus } from 'lucide-svelte';
    import type { ImprovementProposalRecord } from '$lib/types/orgaTypes';
    import ProposalSynthesizer from '$lib/components/admin/ProposalSynthesizer.svelte';
    import ProposalFilterBar from './ProposalFilterBar.svelte';
    import ProposalCard from './ProposalCard.svelte';

    let {
        proposals = [],
        selectedProposalIds = $bindable<string[]>([]),
        isLoading = false,
        onOpenCreate,
        onUpdateStatus,
        onEdit,
        onDelete,
        onShareChat,
        onSolution,
        onCreatePrompt
    }: {
        proposals: ImprovementProposalRecord[];
        selectedProposalIds: string[];
        isLoading: boolean;
        onOpenCreate: () => void;
        onUpdateStatus: (id: string, status: 'idea' | 'planned' | 'in_progress' | 'implemented') => Promise<void>;
        onEdit: (p: ImprovementProposalRecord) => void;
        onDelete: (p: ImprovementProposalRecord) => void;
        onShareChat: (p: ImprovementProposalRecord) => void;
        onSolution: (p: ImprovementProposalRecord) => void;
        onCreatePrompt: (p: ImprovementProposalRecord) => void;
    } = $props();

    let proposalStatusFilter = $state<'all' | 'idea' | 'planned' | 'in_progress' | 'implemented'>('all');
    let proposalCategoryFilter = $state<string>('all');
    let proposalPriorityFilter = $state<string>('all');
    let proposalSearch = $state<string>('');

    const inProgressProposals = $derived(
        proposals.filter(p => p.status === 'in_progress')
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

    function toggleSelectProposal(id: string) {
        if (selectedProposalIds.includes(id)) {
            selectedProposalIds = selectedProposalIds.filter(x => x !== id);
        } else {
            selectedProposalIds = [...selectedProposalIds, id];
        }
    }

    const filteredProposals = $derived(
        proposals.filter(p => {
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
</script>

<div class="flex-1 flex flex-col overflow-hidden bg-slate-100 dark:bg-slate-950">
    <ProposalFilterBar 
        {proposals}
        filteredCount={filteredProposals.length}
        bind:proposalStatusFilter
        bind:proposalCategoryFilter
        bind:proposalPriorityFilter
        bind:proposalSearch
        bind:selectedProposalIds
        inProgressCount={inProgressProposals.length}
        {areAllInProgressSelected}
        onToggleSelectAllInProgress={toggleSelectAllInProgress}
    />

    <div class="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 space-y-6">
        {#if isLoading}
            <div class="p-12 text-center">
                <RefreshCw class="w-8 h-8 animate-spin text-amber-500 mx-auto mb-3" />
                <p class="text-xs text-slate-500 dark:text-slate-400 font-medium">Lade Verbesserungsvorschläge...</p>
            </div>
        {:else if filteredProposals.length === 0}
            <div class="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-md mx-auto space-y-3 mt-8">
                <span class="text-4xl block">💡</span>
                <h3 class="text-sm font-bold text-slate-800 dark:text-white">Keine Vorschläge gefunden</h3>
                <p class="text-xs text-slate-400">Erfassen Sie Ihren ersten individuellen Vorschlag oder passen Sie die Filterkriterien an.</p>
                <button
                    type="button"
                    onclick={onOpenCreate}
                    class="py-2 px-4 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 inline-flex items-center gap-1.5 cursor-pointer mt-2 shadow-xs"
                >
                    <Plus class="w-3.5 h-3.5" />
                    <span>Ersten Vorschlag erfassen</span>
                </button>
            </div>
        {:else}
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-7xl mx-auto">
                {#each filteredProposals as proposal (proposal.id)}
                    <ProposalCard 
                        {proposal}
                        isSelected={selectedProposalIds.includes(proposal.id)}
                        onToggleSelect={() => toggleSelectProposal(proposal.id)}
                        {onUpdateStatus}
                        {onEdit}
                        {onDelete}
                        {onShareChat}
                        {onSolution}
                        {onCreatePrompt}
                    />
                {/each}
            </div>
        {/if}

        <ProposalSynthesizer 
            selectedIds={selectedProposalIds} 
            onClearSelection={() => selectedProposalIds = []} 
        />
    </div>
</div>
