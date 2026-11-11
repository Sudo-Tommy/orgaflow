<script lang="ts">
    import { pb } from '$lib/services/pocketbase';
    import { toastStore } from '$lib/services/toastService.svelte';
    import { confirmStore } from '$lib/services/confirmService.svelte';
    import { rbacService } from '$lib/services/rbacService.svelte';
    import { proposalService } from '$lib/services/improvementProposalService.svelte';
    import { onMount } from 'svelte';
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';
    import type { SystemPromptRecord } from '$lib/types/orgaTypes';
    import PromptHeader from './components/PromptHeader.svelte';
    import PromptMobileTabs from './components/PromptMobileTabs.svelte';
    import PromptTabsWorkspace from './components/PromptTabsWorkspace.svelte';
    import PromptModals from './components/PromptModals.svelte';
    import { promptAdminState } from './promptAdminState.svelte';
    import { updateUnifiedItemStatus, shareProposalInChat } from './promptAdminService';

    $effect(() => {
        if (!rbacService.canAccessSystemPrompts) {
            toastStore.warning("Nur für den Inhaber zugänglich.");
            goto('/admin');
        }
    });

    let promptModalsRef: ReturnType<typeof PromptModals>;

    function convertToProposal(item: any) {
        promptModalsRef?.openProposal({
            id: '', title: item.title || `Vorschlag aus ${item.source}`, category: 'Core Engine & API',
            priority: item.rating && item.rating <= 5 ? 'high' : 'medium', status: 'idea',
            description: item.message, solution_concept: '', source_type: item.source, source_id: item.id, author_name: item.sender
        }, (p) => promptModalsRef?.openFeedbackAction(p, 'proposal'));
    }

    async function deleteProposal(p: any) {
        if (await confirmStore.ask(`Vorschlag "${p.title}" löschen?`, "Löschen", "Löschen", "Abbrechen", true)) {
            proposalService.deleteProposal(p.id);
        }
    }

    onMount(() => {
        promptAdminState.loadPrompts();
        promptAdminState.loadInboxItems();
        proposalService.init();

        const paramTab = $page.url.searchParams.get('tab');
        if (paramTab === 'feedbacks' || paramTab === 'proposals') promptAdminState.mainTab = paramTab;

        const unsubP = pb.collection('system_prompts').subscribe<SystemPromptRecord>('*', (e) => {
            if (e.action === 'create') promptAdminState.localPrompts = [e.record, ...promptAdminState.localPrompts.filter(p => p.id !== e.record.id)];
            else if (e.action === 'update') promptAdminState.localPrompts = promptAdminState.localPrompts.map(p => p.id === e.record.id ? e.record : p);
            else if (e.action === 'delete') promptAdminState.localPrompts = promptAdminState.localPrompts.filter(p => p.id !== e.record.id);
        });

        return () => { unsubP.then(u => u()).catch(() => {}); };
    });
</script>

<svelte:head>
    <title>Auto-Update Studio | OrgaFlow</title>
</svelte:head>

<div class="-mx-3.5 -my-4 sm:-mx-6 sm:-my-4 md:-m-8 lg:-m-10 h-[calc(100dvh-4.25rem)] md:h-[calc(100dvh-0.5rem)] flex flex-col overflow-hidden bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 select-none antialiased">
    <PromptHeader 
        bind:mainTab={promptAdminState.mainTab} 
        bind:mobileView={promptAdminState.mobileView} 
        currentKWString={promptAdminState.currentKWString}
        promptsCount={promptAdminState.prompts.length} 
        inboxCount={promptAdminState.unifiedInboxItems.length}
        newFeedbacksCount={promptAdminState.newFeedbacksCount} 
        proposalsCount={proposalService.proposals.length}
        newProposalsCount={proposalService.unreadCount}
        isRefreshing={promptAdminState.isRefreshing} 
        isLoading={promptAdminState.isLoading} 
        isLoadingInbox={promptAdminState.isLoadingInbox} 
        isGenerating={promptAdminState.isGenerating}
        onRefresh={() => promptAdminState.refresh()}
        onOpenCreatePrompt={() => promptAdminState.openCreatePrompt()}
        onOpenCreateProposal={() => promptModalsRef?.openProposal(null, (p) => promptModalsRef?.openFeedbackAction(p, 'proposal'))}
        onGeneratePrompt={(opts) => promptAdminState.generatePrompt(opts)}
    />

    <PromptMobileTabs 
        bind:mainTab={promptAdminState.mainTab} 
        bind:mobileView={promptAdminState.mobileView}
        promptsCount={promptAdminState.prompts.length} 
        newFeedbacksCount={promptAdminState.newFeedbacksCount}
        proposalsCount={proposalService.proposals.length}
        newProposalsCount={proposalService.unreadCount}
        onSelectInbox={() => { if (promptAdminState.rawFeedbacks.length === 0) promptAdminState.loadInboxItems(); }}
    />

    <PromptTabsWorkspace 
        mainTab={promptAdminState.mainTab} 
        bind:mobileView={promptAdminState.mobileView}
        prompts={promptAdminState.prompts} 
        bind:selectedPromptId={promptAdminState.selectedPromptId} 
        selectedPrompt={promptAdminState.selectedPrompt} 
        isLoading={promptAdminState.isLoading} 
        isLoadingInbox={promptAdminState.isLoadingInbox} 
        currentKWString={promptAdminState.currentKWString}
        unifiedInboxItems={promptAdminState.unifiedInboxItems} 
        rawFeedbacksCount={promptAdminState.rawFeedbacks.length} 
        rawInquiriesCount={promptAdminState.rawInquiries.length} 
        rawChatCount={promptAdminState.rawChatMessages.length}
        proposals={proposalService.proposals} 
        bind:selectedProposalIds={promptAdminState.selectedProposalIds} 
        isProposalsLoading={proposalService.isLoading}
        onOpenCreatePrompt={() => promptAdminState.openCreatePrompt()}
        onUpdatePromptStatus={(id, s) => promptAdminState.updatePromptStatus(id, s)}
        onEditPrompt={(p) => promptAdminState.openEditPrompt(p)}
        onDeletePrompt={(id) => promptAdminState.deletePrompt(id)}
        onUpdateInboxStatus={async (item, newStatus) => {
            await updateUnifiedItemStatus(item, newStatus);
            await promptAdminState.loadInboxItems();
            toastStore.success(`Status auf '${newStatus}' gesetzt.`);
        }}
        onConvertToProposal={convertToProposal}
        onCreateInboxPrompt={(item) => promptModalsRef?.openFeedbackAction(item.rawRecord, item.source)}
        onOpenCreateProposal={() => promptModalsRef?.openProposal(null, (p) => promptModalsRef?.openFeedbackAction(p, 'proposal'))}
        onUpdateProposalStatus={(id, s) => proposalService.updateProposalStatus(id, s)}
        onEditProposal={(p) => promptModalsRef?.openProposal(p)}
        onDeleteProposal={deleteProposal}
        onShareProposalChat={shareProposalInChat}
        onSolutionProposal={(p) => promptModalsRef?.openSolution({
            title: p.title, description: p.description, category: p.category, currentConcept: p.solution_concept
        }, (concept) => proposalService.updateProposal(p.id, { solution_concept: concept }))}
        onCreateProposalPrompt={(p) => promptModalsRef?.openFeedbackAction(p, 'proposal')}
    />
</div>

<PromptModals 
    bind:this={promptModalsRef}
    bind:isEditModalOpen={promptAdminState.isEditModalOpen}
    bind:editModalMode={promptAdminState.editModalMode}
    bind:editingPrompt={promptAdminState.editingPrompt}
    existingPrompts={promptAdminState.prompts}
    currentKWString={promptAdminState.currentKWString}
    onSavePrompt={(data) => promptAdminState.savePrompt(data)}
/>
