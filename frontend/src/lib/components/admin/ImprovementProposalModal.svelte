<script lang="ts">
    import { proposalService } from '$lib/services/improvementProposalService.svelte';
    import { toastStore } from '$lib/services/toastService.svelte';
    import { pb } from '$lib/services/pocketbase';
    import type { ImprovementProposalRecord } from '$lib/types/orgaTypes';
    import { X, Sparkles, Check, Lightbulb, Loader2 } from 'lucide-svelte';

    let dialog: HTMLDialogElement;
    let isOpen = $state(false);
    let isEditing = $state(false);
    let editingId = $state('');

    // Formular-Felder
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

    // Callback nach Speichern, z.B. zum direkten Prompt-Generieren
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
        try {
            const isLocal = typeof window !== 'undefined' && !window.location.hostname.includes('ihre-seniorenassistenz.com') && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
            const microserviceUrl = isLocal ? `http://${window.location.hostname}:3000` : '';

            // Nutzt /api/emails/ Präfix für korrektes Nginx-Routing in Produktion
            let res = await fetch(`${microserviceUrl}/api/emails/admin/generate-solution`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': pb.authStore.token ? `Bearer ${pb.authStore.token}` : ''
                },
                body: JSON.stringify({
                    title: title.trim(),
                    description: description.trim(),
                    category
                })
            });

            // Fallback falls direkter Endpoint
            if (res.status === 404) {
                res = await fetch(`${microserviceUrl}/api/v1/generate-solution`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': pb.authStore.token ? `Bearer ${pb.authStore.token}` : ''
                    },
                    body: JSON.stringify({
                        title: title.trim(),
                        description: description.trim(),
                        category
                    })
                });
            }

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Generierung fehlgeschlagen.');
            }

            solutionConcept = data.solutionConcept;
            toastStore.success('Lösungs- und Maßnahmenkonzept erfolgreich generiert! ✨');
        } catch (err: any) {
            console.error('[Generate Solution Error]:', err);
            toastStore.error('Fehler: ' + err.message);
        } finally {
            isGeneratingSolution = false;
        }
    }

    async function handleSave(triggerGenerate: boolean = false) {
        if (!title.trim()) {
            toastStore.warning('Bitte vergeben Sie einen aussagekräftigen Titel.');
            return;
        }
        if (!description.trim()) {
            toastStore.warning('Bitte beschreiben Sie das Problem oder den Mangel.');
            return;
        }

        isSaving = true;
        try {
            const data: Partial<ImprovementProposalRecord> = {
                title: title.trim(),
                category,
                priority,
                status,
                description: description.trim(),
                solution_concept: solutionConcept.trim(),
                expected_behavior: solutionConcept.trim(),
                tags: tags.trim()
            };

            let savedItem: ImprovementProposalRecord;
            if (isEditing && editingId) {
                savedItem = await proposalService.updateProposal(editingId, data);
            } else {
                savedItem = await proposalService.createProposal(data);
            }

            close();

            if (triggerGenerate && onSaveAndGenerate) {
                onSaveAndGenerate(savedItem);
            }
        } catch (err: any) {
            console.error('[Proposal Modal Save Error]:', err);
            toastStore.error('Fehler beim Speichern: ' + err.message);
        } finally {
            isSaving = false;
        }
    }
</script>

<dialog
    bind:this={dialog}
    class="backdrop:bg-neutral-950/60 backdrop:backdrop-blur-sm bg-transparent p-0 w-full max-w-2xl rounded-3xl shadow-2xl transition-all border-0 open:flex open:flex-col overflow-hidden m-auto"
>
    <div class="bg-white flex flex-col max-h-[92vh] w-full rounded-3xl overflow-hidden border border-neutral-200">
        
        <!-- Modal Header -->
        <div class="px-6 py-4 bg-gradient-to-r from-amber-500/10 via-indigo-50 to-white border-b border-neutral-100 flex items-center justify-between shrink-0">
            <div class="flex items-center gap-2.5">
                <div class="w-9 h-9 rounded-2xl bg-amber-500/20 text-amber-700 flex items-center justify-center text-lg shadow-xs">
                    💡
                </div>
                <div>
                    <h2 class="text-base font-bold text-neutral-900 leading-tight">
                        {isEditing ? 'Verbesserungsvorschlag bearbeiten' : 'Neuen Verbesserungsvorschlag anlegen'}
                    </h2>
                    <p class="text-xs text-neutral-500">
                        Einzeln erfassen, im Status nachverfolgen und gezielt als KI-Prompt verwerten
                    </p>
                </div>
            </div>
            <button
                type="button"
                onclick={close}
                class="p-2 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-full transition-colors cursor-pointer"
                title="Schließen"
            >
                <X class="w-5 h-5" />
            </button>
        </div>

        <!-- Modal Body -->
        <div class="p-6 overflow-y-auto space-y-5 custom-scrollbar">
            
            <!-- Titel -->
            <div class="space-y-1.5">
                <label for="prop-title" class="block text-xs font-bold text-neutral-800">
                    Titel des Vorschlags <span class="text-rose-500">*</span>
                </label>
                <input
                    id="prop-title"
                    type="text"
                    bind:value={title}
                    placeholder="z. B. Haushaltsbuch: Automatische Belegerkennung für Quittungen"
                    class="orga-input-clear text-xs py-2.5 px-3.5 w-full bg-neutral-50 focus:bg-white"
                />
            </div>

            <!-- Kategorie & Priorität -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                <!-- Kategorie -->
                <div class="space-y-1.5">
                    <label for="prop-category" class="block text-xs font-bold text-neutral-800">
                        Bereich / Modul
                    </label>
                    <select
                        id="prop-category"
                        bind:value={category}
                        class="orga-input-clear text-xs py-2.5 px-3 bg-neutral-50 focus:bg-white cursor-pointer w-full"
                    >
                        <option value="Core Engine & API">Core Engine & API-Resilienz</option>
                        <option value="UI/UX & Design">UI/UX & Mobile Ergonomie</option>
                        <option value="Haushaltsbuch & Finanzen">Haushaltsbuch & Finanzen</option>
                        <option value="Dokumente & Vorlagen">Dokumente, PDF & DIN 5008</option>
                        <option value="Termine & Außendienst">Termine & Außendienst</option>
                        <option value="Sicherheit & Audit">Sicherheit & Audit-Trail</option>
                        <option value="Sonstiges">Sonstiges</option>
                    </select>
                </div>

                <!-- Priorität (Buttons statt Dropdown) -->
                <div class="space-y-1.5">
                    <span class="block text-xs font-bold text-neutral-800">Priorität</span>
                    <div class="grid grid-cols-4 gap-1 p-0.5 bg-neutral-100 rounded-xl border border-neutral-200">
                        <button
                            type="button"
                            onclick={() => priority = 'low'}
                            class="py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer {priority === 'low' ? 'bg-emerald-500 text-white shadow-xs' : 'text-neutral-600 hover:text-neutral-900'}"
                        >
                            Niedrig
                        </button>
                        <button
                            type="button"
                            onclick={() => priority = 'medium'}
                            class="py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer {priority === 'medium' ? 'bg-blue-500 text-white shadow-xs' : 'text-neutral-600 hover:text-neutral-900'}"
                        >
                            Mittel
                        </button>
                        <button
                            type="button"
                            onclick={() => priority = 'high'}
                            class="py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer {priority === 'high' ? 'bg-amber-500 text-white shadow-xs' : 'text-neutral-600 hover:text-neutral-900'}"
                        >
                            Hoch
                        </button>
                        <button
                            type="button"
                            onclick={() => priority = 'critical'}
                            class="py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer {priority === 'critical' ? 'bg-rose-600 text-white shadow-xs' : 'text-neutral-600 hover:text-neutral-900'}"
                        >
                            Kritisch
                        </button>
                    </div>
                </div>
            </div>

            <!-- Status (Buttons statt Dropdown) -->
            <div class="space-y-1.5">
                <span class="block text-xs font-bold text-neutral-800">Aktueller Bearbeitungsstatus</span>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-neutral-100 rounded-xl border border-neutral-200">
                    <button
                        type="button"
                        onclick={() => status = 'idea'}
                        class="py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 {status === 'idea' ? 'bg-amber-400 text-amber-950 shadow-xs' : 'text-neutral-600 hover:text-neutral-900'}"
                    >
                        <span>💡</span>
                        <span>Idee</span>
                    </button>
                    <button
                        type="button"
                        onclick={() => status = 'planned'}
                        class="py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 {status === 'planned' ? 'bg-blue-500 text-white shadow-xs' : 'text-neutral-600 hover:text-neutral-900'}"
                    >
                        <span>📋</span>
                        <span>Geplant</span>
                    </button>
                    <button
                        type="button"
                        onclick={() => status = 'in_progress'}
                        class="py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 {status === 'in_progress' ? 'bg-indigo-600 text-white shadow-xs' : 'text-neutral-600 hover:text-neutral-900'}"
                    >
                        <span>⚙️</span>
                        <span>In Arbeit</span>
                    </button>
                    <button
                        type="button"
                        onclick={() => status = 'implemented'}
                        class="py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 {status === 'implemented' ? 'bg-emerald-600 text-white shadow-xs' : 'text-neutral-600 hover:text-neutral-900'}"
                    >
                        <span>✅</span>
                        <span>Umgesetzt</span>
                    </button>
                </div>
            </div>

            <!-- Problembeschreibung / Ausgangslage -->
            <div class="space-y-1.5">
                <label for="prop-desc" class="block text-xs font-bold text-neutral-800">
                    Problem & Ausgangslage <span class="text-rose-500">*</span>
                </label>
                <textarea
                    id="prop-desc"
                    bind:value={description}
                    rows="4"
                    placeholder="Beschreiben Sie das aktuelle Verhalten, Einschränkungen oder den Wunsch der Betreuungskräfte bzw. Klienten..."
                    class="orga-input-clear text-xs py-2.5 px-3.5 w-full bg-neutral-50 focus:bg-white leading-relaxed resize-y custom-scrollbar"
                ></textarea>
            </div>

            <!-- Erwartete Lösung / Konzept -->
            <div class="space-y-1.5">
                <div class="flex items-center justify-between">
                    <label for="prop-concept" class="block text-xs font-bold text-neutral-800">
                        Erwartetes Lösungskonzept / Technischer Ansatz
                    </label>
                    <button
                        type="button"
                        onclick={handleAutoGenerateSolution}
                        disabled={!canGenerateSolution}
                        class="min-h-[38px] px-3 py-1 text-[11px] font-bold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 shadow-2xs"
                        title="Generiert automatisch ein strukturiertes Lösungs- und Maßnahmenkonzept"
                    >
                        {#if isGeneratingSolution}
                            <Loader2 class="w-3.5 h-3.5 animate-spin text-brand-600" />
                            <span>Generiert Konzept...</span>
                        {:else}
                            <Sparkles class="w-3.5 h-3.5 text-brand-600" />
                            <span>✨ Lösungsansatz vorschlagen (1-Click)</span>
                        {/if}
                    </button>
                </div>
                <textarea
                    id="prop-concept"
                    bind:value={solutionConcept}
                    rows="6"
                    placeholder="Welche UI-Elemente, API-Endpoints, Datenbank-Felder oder Berechnungen sollen angepasst werden? (Tipp: Nutzen Sie den 1-Click-Assistenten oben rechts)"
                    disabled={isGeneratingSolution}
                    class="orga-input-clear text-xs py-2.5 px-3.5 w-full bg-neutral-50 focus:bg-white leading-relaxed resize-y custom-scrollbar {isGeneratingSolution ? 'opacity-50 animate-pulse' : ''}"
                ></textarea>
            </div>

            <!-- Tags -->
            <div class="space-y-1.5">
                <label for="prop-tags" class="block text-xs font-bold text-neutral-800 flex items-center justify-between">
                    <span>Schlagworte / Tags</span>
                    <span class="text-neutral-400 font-normal text-[11px]">(Komma-getrennt)</span>
                </label>
                <input
                    id="prop-tags"
                    type="text"
                    bind:value={tags}
                    placeholder="z. B. haushaltsbuch, ocr, quellen, export"
                    class="orga-input-clear text-xs py-2.5 px-3.5 w-full bg-neutral-50 focus:bg-white"
                />
            </div>

        </div>

        <!-- Modal Footer -->
        <div class="px-6 py-4 bg-neutral-50 border-t border-neutral-100 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <button
                type="button"
                onclick={close}
                disabled={isSaving}
                class="orga-button-ghost w-full sm:w-auto py-2 px-4 text-xs text-neutral-600 font-semibold cursor-pointer"
            >
                Abbrechen
            </button>

            <div class="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                <button
                    type="button"
                    onclick={() => handleSave(false)}
                    disabled={isSaving}
                    class="orga-button-secondary w-full sm:w-auto py-2 px-4 text-xs font-bold cursor-pointer"
                >
                    <span>Vorschlag speichern</span>
                </button>

                <button
                    type="button"
                    onclick={() => handleSave(true)}
                    disabled={isSaving}
                    class="orga-button-primary bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20 w-full sm:w-auto py-2 px-4.5 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                    <Sparkles class="w-3.5 h-3.5 text-amber-300" />
                    <span>Speichern & Sofort Prompt generieren</span>
                </button>
            </div>
        </div>

    </div>
</dialog>
