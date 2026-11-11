<script lang="ts">
    import { proposalService } from '$lib/services/improvementProposalService.svelte';
    import { toastStore } from '$lib/services/toastService.svelte';
    import { hapticFeedback } from '$lib/services/hapticFeedback';
    import type { ImprovementProposalRecord } from '$lib/types/orgaTypes';
    import { X, Sparkles, Save } from 'lucide-svelte';
    import ProposalMetaFields from './ProposalMetaFields.svelte';
    import ProposalContentFields from './proposals/ProposalContentFields.svelte';
    import { generateAiSolution } from './proposals/proposalAiService';

    let dialog: HTMLDialogElement;
    let isOpen = $state(false);
    let isEditing = $state(false);
    let editingId = $state('');

    let title = $state('');
    let category = $state<ImprovementProposalRecord['category']>('Core Engine & API');
    let priority = $state<ImprovementProposalRecord['priority']>('medium');
    let status = $state<ImprovementProposalRecord['status']>('idea');
    let description = $state('');
    let solutionConcept = $state('');
    let tags = $state('');
    let isSaving = $state(false);
    let isGeneratingSolution = $state(false);

    let canGenerateSolution = $derived((!!title.trim() || !!description.trim()) && !isGeneratingSolution);
    let onSaveAndGenerate: ((proposal: ImprovementProposalRecord) => void) | null = null;

    export function open(proposal?: ImprovementProposalRecord | null, callback?: (p: ImprovementProposalRecord) => void) {
        onSaveAndGenerate = callback || null;
        if (proposal) {
            isEditing = true;
            editingId = proposal.id;
            title = proposal.title || '';
            category = proposal.category || 'Core Engine & API';
            priority = proposal.priority || 'medium';
            status = proposal.status || 'idea';
            description = proposal.description || '';
            solutionConcept = proposal.expected_behavior || proposal.solution_concept || '';
            tags = proposal.tags || '';
        } else {
            isEditing = false;
            editingId = '';
            title = '';
            category = 'Core Engine & API';
            priority = 'medium';
            status = 'idea';
            description = '';
            solutionConcept = '';
            tags = '';
        }
        isOpen = true;
        dialog?.showModal();
    }

    export function close() {
        isOpen = false;
        dialog?.close();
    }

    async function handleAutoGenerateSolution() {
        if (isGeneratingSolution) return;
        if (!title.trim() && !description.trim()) {
            toastStore.warning('Bitte geben Sie zuerst einen Titel oder eine Problembeschreibung ein.');
            return;
        }

        isGeneratingSolution = true;
        hapticFeedback.tap();
        try {
            solutionConcept = await generateAiSolution(title, description, category);
            hapticFeedback.success();
            toastStore.success('Lösungskonzept erfolgreich generiert! ✨');
        } catch (err: any) {
            console.error('[Generate Solution Error]:', err);
            hapticFeedback.error();
            toastStore.error('KI-Generierung fehlgeschlagen: ' + err.message);
        } finally {
            isGeneratingSolution = false;
        }
    }

    async function handleSave(triggerGenerate: boolean = false) {
        let effectiveTitle = title.trim();
        if (!effectiveTitle) {
            const sourceText = description.trim() || solutionConcept.trim();
            if (sourceText) {
                const firstSentence = sourceText.split(/[.\n!?]/)[0].trim();
                effectiveTitle = firstSentence.length > 60
                    ? firstSentence.slice(0, 57).trim() + '...'
                    : firstSentence;
                title = effectiveTitle;
            }
        }

        if (!effectiveTitle) {
            toastStore.warning('Bitte beschreiben Sie das Problem oder vergeben Sie einen Titel.');
            return;
        }
        if (!description.trim()) {
            description = effectiveTitle;
        }

        isSaving = true;
        hapticFeedback.tap();
        try {
            const payload: Partial<ImprovementProposalRecord> = {
                title: effectiveTitle,
                category,
                priority,
                status,
                description: description.trim(),
                solution_concept: solutionConcept.trim(),
                expected_behavior: solutionConcept.trim(),
                tags: tags.trim()
            };

            let savedItem: ImprovementProposalRecord | null = null;
            if (isEditing && editingId) {
                savedItem = await proposalService.update(editingId, payload);
                toastStore.success('Verbesserungsvorschlag aktualisiert.');
            } else {
                savedItem = await proposalService.create(payload);
                toastStore.success('Verbesserungsvorschlag angelegt.');
            }

            hapticFeedback.success();
            close();

            if (triggerGenerate && onSaveAndGenerate && savedItem) {
                onSaveAndGenerate(savedItem);
            }
        } catch (err: any) {
            console.error('[Proposal Modal Save Error]:', err);
            hapticFeedback.error();
            toastStore.error('Fehler beim Speichern: ' + err.message);
        } finally {
            isSaving = false;
        }
    }
</script>

<dialog
    bind:this={dialog}
    class="backdrop:bg-neutral-950/60 backdrop:backdrop-blur-sm bg-transparent p-0 w-full max-w-2xl mx-auto my-auto sm:my-8 rounded-3xl shadow-2xl transition-all border-0 zero-inner-scroll-modal"
>
    <div class="bg-white dark:bg-slate-900 flex flex-col w-full rounded-3xl border border-neutral-200 dark:border-slate-700">
        <!-- Modal Header -->
        <div class="px-6 py-4 bg-gradient-to-r from-amber-500/10 via-indigo-50 dark:via-slate-800/60 to-white dark:to-slate-900 border-b border-neutral-100 dark:border-slate-700/80 flex items-center justify-between shrink-0 rounded-t-3xl">
            <div class="flex items-center gap-2.5">
                <div class="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center text-lg shadow-2xs">
                    💡
                </div>
                <div>
                    <h2 class="text-base font-bold text-neutral-900 dark:text-slate-100 leading-tight">
                        {isEditing ? 'Verbesserungsvorschlag bearbeiten' : 'Neuen Verbesserungsvorschlag anlegen'}
                    </h2>
                    <p class="text-xs text-neutral-500 dark:text-slate-400">
                        Einzeln erfassen, im Status nachverfolgen und gezielt als KI-Prompt verwerten
                    </p>
                </div>
            </div>
            <button
                type="button"
                onclick={close}
                class="w-10 h-10 flex items-center justify-center text-neutral-400 dark:text-slate-500 hover:text-neutral-700 dark:hover:text-slate-200 hover:bg-neutral-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer touch-manipulation"
                title="Schließen"
                aria-label="Schließen"
            >
                <X class="w-5 h-5" />
            </button>
        </div>

        <!-- Modal Body (Zero-Inner-Scroll) -->
        <div class="p-6 space-y-5 bg-white dark:bg-slate-900">
            <div class="space-y-1.5">
                <label for="prop-title" class="block text-xs font-bold text-neutral-800 dark:text-slate-200">
                    Titel des Vorschlags <span class="text-neutral-400 font-normal">(wird bei Bedarf automatisch erkannt)</span>
                </label>
                <input
                    id="prop-title"
                    type="text"
                    bind:value={title}
                    placeholder="z. B. Haushaltsbuch: Automatische Belegerkennung für Quittungen"
                    class="orga-input-clear text-xs py-2.5 px-3.5 w-full min-h-11 touch-manipulation"
                />
            </div>

            <ProposalMetaFields 
                bind:category={category}
                bind:priority={priority}
                bind:status={status}
            />

            <ProposalContentFields
                bind:description={description}
                bind:solutionConcept={solutionConcept}
                bind:tags={tags}
                {isGeneratingSolution}
                {canGenerateSolution}
                onGenerateSolution={handleAutoGenerateSolution}
            />
        </div>

        <!-- Modal Footer -->
        <div class="px-6 py-4 bg-neutral-50 dark:bg-slate-800/60 border-t border-neutral-100 dark:border-slate-700/80 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 rounded-b-3xl">
            <button
                type="button"
                onclick={close}
                disabled={isSaving}
                class="orga-button-ghost w-full sm:w-auto min-h-11 py-2 px-4 text-xs font-semibold cursor-pointer touch-manipulation"
            >
                Abbrechen
            </button>

            <div class="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                <button
                    type="button"
                    onclick={() => handleSave(false)}
                    disabled={isSaving}
                    class="w-full sm:w-auto min-h-11 py-2 px-4.5 text-xs font-bold rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white shadow-xs border border-slate-800 dark:border-slate-600 flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation transition-all active:scale-95"
                >
                    <Save class="w-3.5 h-3.5" />
                    <span>Vorschlag speichern</span>
                </button>

                <button
                    type="button"
                    onclick={() => handleSave(true)}
                    disabled={isSaving}
                    class="orga-button-primary bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20 w-full sm:w-auto min-h-11 py-2 px-4.5 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation active:scale-95"
                >
                    <Sparkles class="w-3.5 h-3.5 text-amber-300" />
                    <span>Speichern & Prompt generieren</span>
                </button>
            </div>
        </div>
    </div>
</dialog>
