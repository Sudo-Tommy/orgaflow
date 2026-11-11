<script lang="ts">
    import { toastStore } from '$lib/services/toastService.svelte';
    import { hapticFeedback } from '$lib/services/hapticFeedback';
    import {
        fetchProposalsAndSynthesize,
        saveProposalToSystemPrompts,
        downloadMarkdownBriefing
    } from './proposals/proposalSynthesizerService';
    import ProposalSynthesizerDock from './proposals/ProposalSynthesizerDock.svelte';
    import ProposalSynthesizerPreviewModal from './proposals/ProposalSynthesizerPreviewModal.svelte';

    interface Props {
        selectedIds: string[];
        onClearSelection: () => void;
    }

    let { selectedIds, onClearSelection }: Props = $props();

    let isProcessing = $state(false);
    let synthesisResult = $state("");
    let copySuccess = $state(false);
    let downloadSuccess = $state(false);
    let isSavingToPrompts = $state(false);
    let saveSuccess = $state(false);
    let isPreviewOpen = $state(false);

    let selectionCount = $derived(selectedIds.length);

    async function handleGenerate() {
        if (isProcessing || selectionCount === 0) return;
        isProcessing = true;
        hapticFeedback.tap();
        try {
            synthesisResult = await fetchProposalsAndSynthesize(selectedIds);
            hapticFeedback.success();
        } catch (error) {
            console.error("Synthese-Fehler:", error);
            hapticFeedback.error();
            toastStore.error("Fehler bei der Synthese-Generierung.");
        } finally {
            isProcessing = false;
        }
    }

    async function handleCopy() {
        if (!synthesisResult) return;
        try {
            await navigator.clipboard.writeText(synthesisResult);
            copySuccess = true;
            hapticFeedback.success();
            toastStore.success('In Zwischenablage kopiert! ✓');
            setTimeout(() => { copySuccess = false; }, 3000);
        } catch (e) {
            console.error("Clipboard-Kopierfehler:", e);
            hapticFeedback.error();
            toastStore.error("Kopieren fehlgeschlagen.");
        }
    }

    function handleDownload() {
        if (!synthesisResult) return;
        downloadMarkdownBriefing(synthesisResult, selectionCount);
        downloadSuccess = true;
        hapticFeedback.tap();
        setTimeout(() => { downloadSuccess = false; }, 2500);
    }

    async function handleSavePrompt() {
        if (!synthesisResult || isSavingToPrompts) return;
        isSavingToPrompts = true;
        hapticFeedback.tap();
        try {
            await saveProposalToSystemPrompts(synthesisResult, selectionCount);
            saveSuccess = true;
            hapticFeedback.success();
            toastStore.success('Als System-Prompt für Antigravity gespeichert! 💾');
            setTimeout(() => { saveSuccess = false; }, 3000);
        } catch (err: any) {
            console.error("Fehler beim Speichern in system_prompts:", err);
            hapticFeedback.error();
            toastStore.error("Speichern fehlgeschlagen: " + (err.message || 'Unbekannter Fehler'));
        } finally {
            isSavingToPrompts = false;
        }
    }
</script>

{#if selectionCount > 0}
    <ProposalSynthesizerDock
        {selectionCount}
        {isProcessing}
        {synthesisResult}
        {copySuccess}
        {downloadSuccess}
        {isSavingToPrompts}
        {saveSuccess}
        {onClearSelection}
        onGenerate={handleGenerate}
        onOpenPreview={() => isPreviewOpen = true}
        onCopy={handleCopy}
        onSavePrompt={handleSavePrompt}
        onDownload={handleDownload}
    />
{/if}

{#if isPreviewOpen}
    <ProposalSynthesizerPreviewModal
        {synthesisResult}
        {selectionCount}
        {copySuccess}
        onCopy={handleCopy}
        onClose={() => isPreviewOpen = false}
    />
{/if}
