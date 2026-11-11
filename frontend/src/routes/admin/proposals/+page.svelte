<script lang="ts">
    import { onMount } from 'svelte';
    import { proposalService } from '$lib/services/improvementProposalService.svelte';
    import { toastStore } from '$lib/services/toastService.svelte';
    import { confirmStore } from '$lib/services/confirmService.svelte';
    import type { ImprovementProposalRecord } from '$lib/types/orgaTypes';
    import ImprovementProposalModal from '$lib/components/admin/ImprovementProposalModal.svelte';
    import ProposalSynthesizer from '$lib/components/admin/ProposalSynthesizer.svelte';
    import ProposalStats from '$lib/components/admin/proposals/ProposalStats.svelte';
    import ProposalFilterBar from '$lib/components/admin/proposals/ProposalFilterBar.svelte';
    import ProposalCard from '$lib/components/admin/proposals/ProposalCard.svelte';
    import { Plus, ArrowLeft } from 'lucide-svelte';

    let selectedProposalIds = $state<string[]>([]);
    let proposals = $state<ImprovementProposalRecord[]>([]);
    let proposalModal: ReturnType<typeof ImprovementProposalModal>;

    let statusFilter = $state<'all' | 'idea' | 'planned' | 'in_progress' | 'implemented'>('all');
    let categoryFilter = $state<string>('all');
    let priorityFilter = $state<string>('all');
    let searchQuery = $state<string>('');

    $effect(() => {
        proposals = proposalService.proposals;
    });

    onMount(async () => {
        await proposalService.init();
        proposals = proposalService.proposals;
    });

    const filteredProposals = $derived(
        proposals.filter(p => {
            if (statusFilter !== 'all' && p.status !== statusFilter) return false;
            if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;
            if (priorityFilter !== 'all' && p.priority !== priorityFilter) return false;
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchTitle = (p.title || '').toLowerCase().includes(q);
                const matchDesc = (p.description || '').toLowerCase().includes(q);
                const matchConcept = (p.solution_concept || p.expected_behavior || '').toLowerCase().includes(q);
                const matchTags = (p.tags || '').toLowerCase().includes(q);
                const matchAuthor = (p.author_name || p.author || '').toLowerCase().includes(q);
                if (!matchTitle && !matchDesc && !matchConcept && !matchTags && !matchAuthor) return false;
            }
            return true;
        })
    );

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
            toastStore.info("Auswahl der Vorgänge in Bearbeitung aufgehoben.");
        } else {
            const merged = new Set([...selectedProposalIds, ...inProgressProposals.map(p => p.id)]);
            selectedProposalIds = Array.from(merged);
            toastStore.success(`${inProgressProposals.length} Vorgänge in Bearbeitung ausgewählt.`);
        }
    }

    function toggleSelect(id: string) {
        if (selectedProposalIds.includes(id)) {
            selectedProposalIds = selectedProposalIds.filter(item => item !== id);
        } else {
            selectedProposalIds = [...selectedProposalIds, id];
        }
    }

    function clearSelection() {
        selectedProposalIds = [];
    }

    async function handleDeleteProposal(proposal: ImprovementProposalRecord) {
        const confirmMsg = `Möchten Sie den Vorschlag "${proposal.title}" wirklich unwiderruflich löschen?`;
        if (await confirmStore.ask(confirmMsg, "Vorschlag löschen?", "Unwiderruflich löschen", "Abbrechen", true)) {
            selectedProposalIds = selectedProposalIds.filter(id => id !== proposal.id);
            await proposalService.deleteProposal(proposal.id);
        }
    }

    async function handleUpdateStatus(id: string, status: 'idea' | 'planned' | 'in_progress' | 'implemented') {
        await proposalService.updateProposalStatus(id, status);
    }
</script>

<svelte:head>
    <title>Vorschlagsverwaltung & Sammel-Synthese | OrgaFlow Admin</title>
</svelte:head>

<div class="space-y-6 pb-28 animate-enter">
    <!-- Seiten-Kopfzeile -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
            <div class="flex items-center gap-2 mb-1">
                <a 
                    href="/admin" 
                    class="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors min-h-[44px] py-2 px-1 rounded-lg touch-manipulation"
                >
                    <ArrowLeft class="w-3.5 h-3.5" />
                    <span>Admin-Zentrale</span>
                </a>
                <span class="text-xs text-slate-300">/</span>
                <span class="text-xs font-bold text-slate-700">Vorschlagsverwaltung</span>
            </div>
            <h1 class="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
                <span class="text-amber-500">💡</span>
                <span>Vorschlagsverwaltung & Sammel-Synthese</span>
            </h1>
            <p class="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
                Bündeln Sie offene Verbesserungsvorschläge im Status „In Bearbeitung“ zu einem präzisen, konsolidierten System-Arbeitsauftrag für das Entwicklungsteam.
            </p>
        </div>

        <div class="flex items-center gap-2">
            <button
                type="button"
                onclick={() => proposalModal?.open()}
                class="orga-button-primary bg-amber-500 hover:bg-amber-600 text-white font-bold py-2.5 px-4 rounded-xl shadow-sm hover:shadow-md transition-all text-xs sm:text-sm flex items-center gap-2 min-h-[44px] cursor-pointer touch-manipulation"
            >
                <Plus class="w-4 h-4" />
                <span>Neuer Vorschlag</span>
            </button>
        </div>
    </div>

    <!-- Statistik-Karten -->
    <ProposalStats
        totalCount={proposals.length}
        inProgressCount={inProgressProposals.length}
        plannedCount={proposals.filter(p => p.status === 'planned').length}
        implementedCount={proposals.filter(p => p.status === 'implemented').length}
    />

    <!-- Filter-, Such- & Sammel-Aktionsleiste -->
    <ProposalFilterBar
        bind:statusFilter
        bind:categoryFilter
        bind:priorityFilter
        bind:searchQuery
        totalCount={proposals.length}
        inProgressCount={inProgressProposals.length}
        ideaCount={proposals.filter(p => p.status === 'idea').length}
        plannedCount={proposals.filter(p => p.status === 'planned').length}
        implementedCount={proposals.filter(p => p.status === 'implemented').length}
        {areAllInProgressSelected}
        selectedCount={selectedProposalIds.length}
        onToggleSelectAllInProgress={toggleSelectAllInProgress}
        onClearSelection={clearSelection}
    />

    <!-- Vorschlags-Liste -->
    {#if proposalService.isLoading}
        <div class="p-16 text-center bg-white rounded-3xl border border-slate-200 shadow-xs">
            <div class="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p class="text-xs text-slate-500 font-medium">Lade Verbesserungsvorschläge...</p>
        </div>
    {:else if filteredProposals.length === 0}
        <div class="p-16 text-center bg-white rounded-3xl border border-slate-200 shadow-xs space-y-3">
            <span class="text-4xl block">💡</span>
            <h3 class="text-sm font-bold text-slate-800">Keine passenden Vorschläge gefunden</h3>
            <p class="text-xs text-slate-400 max-w-sm mx-auto">
                Erfassen Sie einen neuen Vorschlag oder passen Sie die Such- und Statusfilter an.
            </p>
            <button
                type="button"
                onclick={() => proposalModal?.open()}
                class="orga-button-primary bg-amber-500 hover:bg-amber-600 text-white py-2.5 px-4 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer min-h-[44px] mt-2 touch-manipulation"
            >
                <Plus class="w-4 h-4" />
                <span>Neuen Vorschlag anlegen</span>
            </button>
        </div>
    {:else}
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            {#each filteredProposals as proposal (proposal.id)}
                <ProposalCard
                    {proposal}
                    isSelected={selectedProposalIds.includes(proposal.id)}
                    isInProgress={proposal.status === 'in_progress'}
                    onToggleSelect={toggleSelect}
                    onUpdateStatus={handleUpdateStatus}
                    onEdit={(p) => proposalModal?.open(p)}
                    onDelete={handleDeleteProposal}
                />
            {/each}
        </div>
    {/if}
</div>

<!-- Wiederverwendbare Sammel-Synthese-Komponente -->
<ProposalSynthesizer 
    selectedIds={selectedProposalIds} 
    onClearSelection={clearSelection} 
/>

<!-- Modal zum Anlegen und Bearbeiten von Vorschlägen -->
<ImprovementProposalModal bind:this={proposalModal} />
