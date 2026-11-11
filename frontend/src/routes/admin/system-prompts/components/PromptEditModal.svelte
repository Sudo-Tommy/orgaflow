<script lang="ts">
    import { Zap, Edit3, X, ShieldCheck, RefreshCw, Check } from 'lucide-svelte';
    import type { SystemPromptRecord } from '$lib/types/orgaTypes';
    import { formatKW, DEFAULT_PROMPT_TEMPLATE } from '../types';
    import { toastStore } from '$lib/services/toastService.svelte';
    import PromptEditForm from './PromptEditForm.svelte';

    let {
        isOpen = $bindable(false),
        mode = 'create',
        prompt = null,
        existingPrompts = [],
        currentKWString,
        onClose,
        onSave,
        onSwitchPrompt
    }: {
        isOpen: boolean;
        mode: 'create' | 'edit';
        prompt: SystemPromptRecord | null;
        existingPrompts: SystemPromptRecord[];
        currentKWString: string;
        onClose: () => void;
        onSave: (data: {
            title: string;
            calendar_week: string;
            status: 'open' | 'applied' | 'archived';
            prompt_content: string;
            raw_summary: string;
        }) => Promise<void>;
        onSwitchPrompt: (p: SystemPromptRecord) => void;
    } = $props();

    let dialog = $state<HTMLDialogElement | null>(null);
    let modalTitle = $state('');
    let modalCalendarWeek = $state('');
    let modalStatus = $state<'open' | 'applied' | 'archived'>('open');
    let modalPromptContent = $state('');
    let modalRawSummary = $state('');
    let isSaving = $state(false);

    $effect(() => {
        if (isOpen) {
            dialog?.showModal();
            if (mode === 'edit' && prompt) {
                modalTitle = prompt.title || '';
                modalCalendarWeek = prompt.calendar_week || '';
                modalStatus = prompt.status || 'open';
                modalPromptContent = prompt.prompt_content || '';
                modalRawSummary = prompt.raw_summary || '';
            } else {
                modalTitle = `Wöchentlicher System-Ausbesserungsprompt (${formatKW(currentKWString)})`;
                modalCalendarWeek = currentKWString;
                modalStatus = 'open';
                modalPromptContent = DEFAULT_PROMPT_TEMPLATE;
                modalRawSummary = '';
            }
        } else {
            dialog?.close();
        }
    });

    const kwConflictPrompt = $derived.by(() => {
        const targetKW = modalCalendarWeek.trim();
        if (!targetKW) return null;
        return existingPrompts.find(p => p.calendar_week === targetKW && (mode === 'create' || p.id !== prompt?.id)) || null;
    });

    async function handleSubmit(e?: Event) {
        if (e) e.preventDefault();
        if (!modalTitle.trim()) {
            toastStore.error("Bitte geben Sie einen Titel an.");
            return;
        }
        const targetKW = modalCalendarWeek.trim();
        if (!targetKW) {
            toastStore.error("Bitte geben Sie eine Kalenderwoche an (z.B. 2026-W36).");
            return;
        }
        if (kwConflictPrompt) {
            toastStore.error(`Für ${formatKW(targetKW)} existiert bereits ein Prompt.`);
            return;
        }
        if (!modalPromptContent.trim()) {
            toastStore.error("Bitte geben Sie den Prompt-Inhalt an.");
            return;
        }

        isSaving = true;
        try {
            await onSave({
                title: modalTitle.trim(),
                calendar_week: targetKW,
                status: modalStatus,
                prompt_content: modalPromptContent.trim(),
                raw_summary: modalRawSummary.trim()
            });
            isOpen = false;
        } finally {
            isSaving = false;
        }
    }
</script>

{#if isOpen}
    <dialog 
        bind:this={dialog}
        class="zero-inner-scroll-modal p-0 bg-transparent backdrop:bg-black/60 backdrop:backdrop-blur-xs w-full max-w-3xl mx-auto my-auto rounded-3xl border-none outline-none animate-enter z-50"
        onclick={(e) => { if (e.target === dialog) onClose(); }}
        oncancel={(e) => { e.preventDefault(); onClose(); }}
    >
        <div class="bg-white dark:bg-slate-900 rounded-3xl w-full h-auto flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 my-auto">
            <div class="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/50 shrink-0 rounded-t-3xl">
                <div>
                    <h2 class="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                        {#if mode === 'create'}
                            <Zap class="w-5 h-5 text-indigo-600" />
                            <span>Neuen System-Prompt anlegen</span>
                        {:else}
                            <Edit3 class="w-5 h-5 text-indigo-600" />
                            <span>System-Prompt bearbeiten</span>
                        {/if}
                    </h2>
                    <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                        Regelwerk: Pro Kalenderwoche existiert genau 1 aggregierter Prompt.
                    </p>
                </div>
                <button 
                    type="button" 
                    onclick={onClose} 
                    aria-label="Schließen" 
                    class="min-h-11 min-w-11 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                    <X class="w-5 h-5" />
                </button>
            </div>

            <form onsubmit={handleSubmit} class="flex-1 flex flex-col">
                <PromptEditForm
                    bind:modalTitle
                    bind:modalCalendarWeek
                    bind:modalStatus
                    bind:modalPromptContent
                    bind:modalRawSummary
                    {isSaving}
                    {kwConflictPrompt}
                    {currentKWString}
                    {onSwitchPrompt}
                />

                <div class="flex items-center justify-between p-4 sm:px-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-950/90 backdrop-blur-xs shrink-0">
                    <span class="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                        <ShieldCheck class="w-3.5 h-3.5 text-emerald-500" />
                        <span>Einzigartige KW-Validierung</span>
                    </span>
                    <div class="flex items-center gap-2">
                        <button 
                            type="button" 
                            onclick={onClose} 
                            class="py-2 px-4 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                            disabled={isSaving}
                        >
                            Abbrechen
                        </button>
                        <button 
                            type="submit" 
                            class="py-2 px-5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white inline-flex items-center gap-1.5 cursor-pointer shadow-xs {kwConflictPrompt ? 'opacity-50 cursor-not-allowed' : ''}"
                            disabled={isSaving || kwConflictPrompt !== null}
                        >
                            {#if isSaving}
                                <RefreshCw class="w-3.5 h-3.5 animate-spin text-white" />
                                <span>Speichert...</span>
                            {:else}
                                <Check class="w-3.5 h-3.5" />
                                <span>{mode === 'create' ? 'Prompt anlegen' : 'Speichern'}</span>
                            {/if}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    </dialog>
{/if}
