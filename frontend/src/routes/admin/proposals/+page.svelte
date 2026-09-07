<script lang="ts">
    import { onMount } from 'svelte';
    import { pb } from '$lib/services/pocketbase';
    import { proposalService } from '$lib/services/improvementProposalService.svelte';
    import { toastStore } from '$lib/services/toastService.svelte';
    import { confirmStore } from '$lib/services/confirmService.svelte';
    import type { ImprovementProposalRecord } from '$lib/types/orgaTypes';
    import ImprovementProposalModal from '$lib/components/admin/ImprovementProposalModal.svelte';
    import ProposalSynthesizer from '$lib/components/admin/ProposalSynthesizer.svelte';
    import { 
        Lightbulb, Plus, Search, Filter, CheckCircle2, Clock, 
        AlertCircle, Trash2, Edit3, Tag, ArrowLeft, CheckSquare, 
        Square, Layers, Sparkles
    } from 'lucide-svelte';

    // Svelte 5 Runes State
    let selectedProposalIds = $state<string[]>([]);
    let proposals = $state<ImprovementProposalRecord[]>([]);

    let proposalModal: ReturnType<typeof ImprovementProposalModal>;

    // Filter & Suche State
    let statusFilter = $state<'all' | 'idea' | 'planned' | 'in_progress' | 'implemented'>('all');
    let categoryFilter = $state<string>('all');
    let priorityFilter = $state<string>('all');
    let searchQuery = $state<string>('');

    // Synchronisiere proposals reaktiv mit proposalService.proposals
    $effect(() => {
        proposals = proposalService.proposals;
    });

    onMount(async () => {
        await proposalService.init();
        proposals = proposalService.proposals;
    });

    // Gefilterte Liste
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

    // Vorgänge im Status "in Bearbeitung"
    const inProgressProposals = $derived(
        proposals.filter(p => p.status === 'in_progress')
    );

    // Prüft, ob alle in_progress Vorgänge aktuell ausgewählt sind
    const areAllInProgressSelected = $derived(
        inProgressProposals.length > 0 &&
        inProgressProposals.every(p => selectedProposalIds.includes(p.id))
    );

    function toggleSelectAllInProgress() {
        if (areAllInProgressSelected) {
            // Alle in_progress Vorgänge abwählen
            const inProgressIds = new Set(inProgressProposals.map(p => p.id));
            selectedProposalIds = selectedProposalIds.filter(id => !inProgressIds.has(id));
            toastStore.info("Auswahl der Vorgänge in Bearbeitung aufgehoben.");
        } else {
            // Alle in_progress Vorgänge zur Auswahl hinzufügen
            const merged = new Set([...selectedProposalIds, ...inProgressProposals.map(p => p.id)]);
            selectedProposalIds = Array.from(merged);
            toastStore.success(`${inProgressProposals.length} Vorgänge in Bearbeitung ausgewählt.`);
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

    function formatDate(dateStr?: string): string {
        if (!dateStr) return '–';
        try {
            return new Date(dateStr).toLocaleDateString('de-DE', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        } catch {
            return '–';
        }
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
                    class="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors min-h-[44px] py-2 px-1 rounded-lg"
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
                class="orga-button-primary bg-amber-500 hover:bg-amber-600 text-white font-bold py-2.5 px-4 rounded-xl shadow-sm hover:shadow-md transition-all text-xs sm:text-sm flex items-center gap-2 min-h-[44px] cursor-pointer"
            >
                <Plus class="w-4 h-4" />
                <span>Neuer Vorschlag</span>
            </button>
        </div>
    </div>

    <!-- Statistik & Schnellauswahl-Karten -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div class="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
            <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Gesamt</span>
            <div class="flex items-baseline justify-between">
                <span class="text-2xl font-black text-slate-900">{proposals.length}</span>
                <span class="text-xs text-slate-500 font-medium">Vorschläge</span>
            </div>
        </div>

        <div class="bg-indigo-50/70 rounded-2xl p-4 border border-indigo-200/80 shadow-xs">
            <div class="flex items-center justify-between mb-1">
                <span class="text-[11px] font-bold uppercase tracking-wider text-indigo-700">In Bearbeitung</span>
                <span class="h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></span>
            </div>
            <div class="flex items-baseline justify-between">
                <span class="text-2xl font-black text-indigo-900">{inProgressProposals.length}</span>
                <span class="text-[11px] font-bold text-indigo-700">Bereit für Synthese</span>
            </div>
        </div>

        <div class="bg-blue-50/70 rounded-2xl p-4 border border-blue-200/80 shadow-xs">
            <span class="text-[11px] font-bold uppercase tracking-wider text-blue-700 block mb-1">Geplant</span>
            <div class="flex items-baseline justify-between">
                <span class="text-2xl font-black text-blue-900">
                    {proposals.filter(p => p.status === 'planned').length}
                </span>
                <span class="text-xs text-blue-600 font-medium">in Pipeline</span>
            </div>
        </div>

        <div class="bg-emerald-50/70 rounded-2xl p-4 border border-emerald-200/80 shadow-xs">
            <span class="text-[11px] font-bold uppercase tracking-wider text-emerald-700 block mb-1">Umgesetzt</span>
            <div class="flex items-baseline justify-between">
                <span class="text-2xl font-black text-emerald-900">
                    {proposals.filter(p => p.status === 'implemented').length}
                </span>
                <span class="text-xs text-emerald-600 font-medium">Erledigt</span>
            </div>
        </div>
    </div>

    <!-- Filter-, Such- & Sammel-Aktionsleiste -->
    <div class="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200 shadow-sm space-y-4">
        <!-- Obere Filterleiste: Status-Buttons & Schnellauswahl -->
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <!-- Status-Buttons -->
            <div class="flex flex-wrap items-center gap-1.5 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/80 text-xs">
                <button
                    type="button"
                    onclick={() => statusFilter = 'all'}
                    class="px-3 py-1.5 rounded-xl font-bold transition-all min-h-[36px] flex items-center justify-center cursor-pointer {statusFilter === 'all' ? 'bg-white text-primary-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}"
                >
                    Alle ({proposals.length})
                </button>
                <button
                    type="button"
                    onclick={() => statusFilter = 'in_progress'}
                    class="px-3 py-1.5 rounded-xl font-bold transition-all min-h-[36px] flex items-center justify-center cursor-pointer {statusFilter === 'in_progress' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}"
                >
                    ⚙️ In Bearbeitung ({inProgressProposals.length})
                </button>
                <button
                    type="button"
                    onclick={() => statusFilter = 'idea'}
                    class="px-3 py-1.5 rounded-xl font-bold transition-all min-h-[36px] flex items-center justify-center cursor-pointer {statusFilter === 'idea' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}"
                >
                    💡 Idee ({proposals.filter(p => p.status === 'idea').length})
                </button>
                <button
                    type="button"
                    onclick={() => statusFilter = 'planned'}
                    class="px-3 py-1.5 rounded-xl font-bold transition-all min-h-[36px] flex items-center justify-center cursor-pointer {statusFilter === 'planned' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}"
                >
                    📋 Geplant ({proposals.filter(p => p.status === 'planned').length})
                </button>
                <button
                    type="button"
                    onclick={() => statusFilter = 'implemented'}
                    class="px-3 py-1.5 rounded-xl font-bold transition-all min-h-[36px] flex items-center justify-center cursor-pointer {statusFilter === 'implemented' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}"
                >
                    ✅ Umgesetzt ({proposals.filter(p => p.status === 'implemented').length})
                </button>
            </div>

            <!-- Schnellauswahl-Button für "In Bearbeitung" -->
            <div class="flex items-center gap-2">
                <button
                    type="button"
                    onclick={toggleSelectAllInProgress}
                    disabled={inProgressProposals.length === 0}
                    class="px-3.5 py-2 rounded-xl text-xs font-bold border transition-all min-h-[44px] flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed {
                        areAllInProgressSelected 
                            ? 'bg-indigo-50 border-indigo-200 text-indigo-800' 
                            : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                    }"
                    title="Alle Vorgänge im Status 'In Bearbeitung' markieren oder abwählen"
                >
                    {#if areAllInProgressSelected}
                        <CheckSquare class="w-4 h-4 text-indigo-600" />
                        <span>Alle In Bearbeitung gewählt</span>
                    {:else}
                        <Square class="w-4 h-4 text-slate-400" />
                        <span>Alle In Bearbeitung auswählen ({inProgressProposals.length})</span>
                    {/if}
                </button>

                {#if selectedProposalIds.length > 0}
                    <button
                        type="button"
                        onclick={clearSelection}
                        class="px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl min-h-[44px] transition-colors cursor-pointer"
                    >
                        Auswahl aufheben ({selectedProposalIds.length})
                    </button>
                {/if}
            </div>
        </div>

        <!-- Zweite Filterzeile: Volltextsuche, Bereich & Priorität -->
        <div class="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-3 border-t border-slate-100">
            <div class="sm:col-span-6 relative">
                <input
                    type="text"
                    bind:value={searchQuery}
                    placeholder="Nach Titel, Beschreibung, Lösungskonzept, Schlagwort oder Ersteller suchen..."
                    class="orga-input-clear pl-9 pr-3 py-2 text-xs w-full bg-slate-50 border border-slate-200 rounded-xl focus:bg-white min-h-[44px]"
                />
                <Search class="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
            </div>

            <div class="sm:col-span-3">
                <select
                    bind:value={categoryFilter}
                    class="orga-input-clear py-2 text-xs w-full bg-slate-50 border border-slate-200 rounded-xl min-h-[44px] cursor-pointer"
                >
                    <option value="all">Alle Module / Kategorien</option>
                    <option value="Core Engine & API">Core Engine & API</option>
                    <option value="UI/UX & Design">UI/UX & Mobile Ergonomie</option>
                    <option value="Haushaltsbuch & Finanzen">Haushaltsbuch & Finanzen</option>
                    <option value="Dokumente & Vorlagen">Dokumente & Vorlagen</option>
                    <option value="Termine & Außendienst">Termine & Außendienst</option>
                    <option value="Sicherheit & Audit">Sicherheit & Audit</option>
                    <option value="Sonstiges">Sonstiges</option>
                </select>
            </div>

            <div class="sm:col-span-3">
                <select
                    bind:value={priorityFilter}
                    class="orga-input-clear py-2 text-xs w-full bg-slate-50 border border-slate-200 rounded-xl min-h-[44px] cursor-pointer"
                >
                    <option value="all">Alle Prioritäten</option>
                    <option value="critical">🔴 Kritisch</option>
                    <option value="high">🟠 Hoch</option>
                    <option value="medium">🔵 Mittel</option>
                    <option value="low">🟢 Niedrig</option>
                </select>
            </div>
        </div>
    </div>

    <!-- Vorschlags-Liste mit barrierefreien Checkboxen -->
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
                class="orga-button-primary bg-amber-500 hover:bg-amber-600 text-white py-2.5 px-4 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer min-h-[44px] mt-2"
            >
                <Plus class="w-4 h-4" />
                <span>Neuen Vorschlag anlegen</span>
            </button>
        </div>
    {:else}
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            {#each filteredProposals as proposal (proposal.id)}
                {@const isSelected = selectedProposalIds.includes(proposal.id)}
                {@const isInProgress = proposal.status === 'in_progress'}
                <div 
                    class="bg-white rounded-2xl border p-4 sm:p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-3 relative {
                        isSelected 
                            ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/15' 
                            : 'border-slate-200 hover:border-slate-300'
                    }"
                >
                    <div class="space-y-3">
                        <!-- Kopfzeile: Checkbox (min 44x44px Touch Target) & Metadaten -->
                        <div class="flex items-start justify-between gap-3">
                            <div class="flex items-center gap-2.5 flex-1 min-w-0">
                                <!-- Barrierefreie Checkbox mit garantierter 44x44px Touchfläche -->
                                <label 
                                    class="flex items-center justify-center min-w-[44px] min-h-[44px] cursor-pointer p-2 -m-2 rounded-xl hover:bg-slate-100 transition-colors shrink-0"
                                    title={isInProgress ? 'Für Sammel-Synthese auswählen' : 'Vorschlag markieren'}
                                >
                                    <input 
                                        type="checkbox" 
                                        value={proposal.id} 
                                        bind:group={selectedProposalIds}
                                        class="w-5 h-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                                    />
                                </label>

                                <div class="flex items-center gap-1.5 flex-wrap min-w-0">
                                    <span class="px-2.5 py-0.5 rounded-lg text-[11px] font-bold border bg-blue-50 text-blue-800 border-blue-200 truncate">
                                        {proposal.category || 'Core'}
                                    </span>
                                    <span class="px-2 py-0.5 rounded-lg text-[11px] font-bold border {
                                        proposal.priority === 'critical' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                        proposal.priority === 'high' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                        proposal.priority === 'medium' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                        'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    }">
                                        {proposal.priority === 'critical' ? '🔴 Kritisch' :
                                         proposal.priority === 'high' ? '🟠 Hoch' :
                                         proposal.priority === 'medium' ? '🔵 Mittel' :
                                         '🟢 Niedrig'}
                                    </span>
                                    {#if isInProgress}
                                        <span class="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                                            Synthese-Kandidat
                                        </span>
                                    {/if}
                                </div>
                            </div>

                            <span class="text-[11px] text-slate-400 font-medium whitespace-nowrap shrink-0">
                                {formatDate(proposal.created)}
                            </span>
                        </div>

                        <!-- Titel & Ersteller -->
                        <div>
                            <h2 class="text-sm font-bold text-slate-900 leading-snug">
                                {proposal.title}
                            </h2>
                            {#if proposal.author_name || proposal.author}
                                <p class="text-[11px] text-slate-400 mt-0.5 font-medium">
                                    Erfasst von: {proposal.author_name || proposal.author}
                                </p>
                            {/if}
                        </div>

                        <!-- Problem & Soll-Verhalten / Lösungskonzept -->
                        <div class="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-2">
                            <div>
                                <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                                    Problem / Ausgangslage:
                                </span>
                                <p class="text-xs text-slate-700 font-medium whitespace-pre-wrap leading-relaxed line-clamp-4">
                                    {proposal.description}
                                </p>
                            </div>

                            {#if proposal.expected_behavior || proposal.solution_concept}
                                <div class="pt-2 border-t border-slate-200/60">
                                    <span class="text-[10px] font-bold uppercase tracking-wider text-indigo-600 block mb-0.5 flex items-center gap-1">
                                        <span>🎯</span> Erwartetes Soll-Verhalten:
                                    </span>
                                    <p class="text-xs text-slate-800 font-medium whitespace-pre-wrap leading-relaxed line-clamp-4">
                                        {proposal.expected_behavior || proposal.solution_concept}
                                    </p>
                                </div>
                            {/if}
                        </div>

                        <!-- Tags / Schlagworte -->
                        {#if proposal.tags}
                            <div class="flex flex-wrap gap-1">
                                {#each proposal.tags.split(',') as tag}
                                    {#if tag.trim()}
                                        <span class="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-mono">
                                            #{tag.trim()}
                                        </span>
                                    {/if}
                                {/each}
                            </div>
                        {/if}
                    </div>

                    <!-- Footer: Direkte Status-Umschaltung & Aktionen -->
                    <div class="pt-3 border-t border-slate-100 flex flex-col gap-2.5 mt-1">
                        <!-- Status-Buttons pro Vorgang (ohne Dropdowns) -->
                        <div class="flex items-center justify-between gap-2 flex-wrap">
                            <span class="text-[11px] font-semibold text-slate-400">Status:</span>
                            <div class="inline-flex p-0.5 bg-slate-100 rounded-xl border border-slate-200 gap-0.5">
                                <button
                                    type="button"
                                    onclick={() => proposalService.updateProposalStatus(proposal.id, 'idea')}
                                    class="px-2 py-1 rounded-lg text-[11px] font-bold transition-all min-h-[32px] cursor-pointer {
                                        proposal.status === 'idea' ? 'bg-amber-400 text-amber-950 shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                                    }"
                                >
                                    💡 Idee
                                </button>
                                <button
                                    type="button"
                                    onclick={() => proposalService.updateProposalStatus(proposal.id, 'planned')}
                                    class="px-2 py-1 rounded-lg text-[11px] font-bold transition-all min-h-[32px] cursor-pointer {
                                        proposal.status === 'planned' ? 'bg-blue-500 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                                    }"
                                >
                                    📋 Geplant
                                </button>
                                <button
                                    type="button"
                                    onclick={() => proposalService.updateProposalStatus(proposal.id, 'in_progress')}
                                    class="px-2 py-1 rounded-lg text-[11px] font-bold transition-all min-h-[32px] cursor-pointer {
                                        proposal.status === 'in_progress' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                                    }"
                                >
                                    ⚙️ In Arbeit
                                </button>
                                <button
                                    type="button"
                                    onclick={() => proposalService.updateProposalStatus(proposal.id, 'implemented')}
                                    class="px-2 py-1 rounded-lg text-[11px] font-bold transition-all min-h-[32px] cursor-pointer {
                                        proposal.status === 'implemented' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                                    }"
                                >
                                    ✅ Umgesetzt
                                </button>
                            </div>
                        </div>

                        <!-- Aktionen: Bearbeiten & Löschen (min 44x44px Touch Targets) -->
                        <div class="flex items-center justify-between pt-2 border-t border-slate-100">
                            <span class="text-[10px] text-slate-400 font-mono">
                                ID: {proposal.id}
                            </span>

                            <div class="flex items-center gap-1">
                                <button
                                    type="button"
                                    onclick={() => proposalModal?.open(proposal)}
                                    class="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                                    title="Vorschlag bearbeiten"
                                    aria-label="Vorschlag bearbeiten"
                                >
                                    <Edit3 class="w-4 h-4" />
                                </button>

                                <button
                                    type="button"
                                    onclick={() => handleDeleteProposal(proposal)}
                                    class="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                                    title="Vorschlag löschen"
                                    aria-label="Vorschlag löschen"
                                >
                                    <Trash2 class="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            {/each}
        </div>
    {/if}
</div>

<!-- Wiederverwendbare Sammel-Synthese-Komponente (Floating Action-Widget) -->
<ProposalSynthesizer 
    selectedIds={selectedProposalIds} 
    onClearSelection={clearSelection} 
/>

<!-- Modal zum Anlegen und Bearbeiten von Vorschlägen -->
<ImprovementProposalModal bind:this={proposalModal} />
