<script lang="ts">
    import { Edit3, Trash2 } from 'lucide-svelte';
    import type { ImprovementProposalRecord } from '$lib/types/orgaTypes';

    interface Props {
        proposal: ImprovementProposalRecord;
        isSelected: boolean;
        isInProgress: boolean;
        onToggleSelect: (id: string) => void;
        onUpdateStatus: (id: string, status: 'idea' | 'planned' | 'in_progress' | 'implemented') => void;
        onEdit: (proposal: ImprovementProposalRecord) => void;
        onDelete: (proposal: ImprovementProposalRecord) => void;
    }

    let {
        proposal,
        isSelected,
        isInProgress,
        onToggleSelect,
        onUpdateStatus,
        onEdit,
        onDelete
    }: Props = $props();

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
                <label 
                    class="flex items-center justify-center min-w-[44px] min-h-[44px] cursor-pointer p-2 -m-2 rounded-xl hover:bg-slate-100 transition-colors shrink-0 touch-manipulation"
                    title={isInProgress ? 'Für Sammel-Synthese auswählen' : 'Vorschlag markieren'}
                >
                    <input 
                        type="checkbox" 
                        checked={isSelected}
                        onchange={() => onToggleSelect(proposal.id)}
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
                    onclick={() => onUpdateStatus(proposal.id, 'idea')}
                    class="px-2 py-1 rounded-lg text-[11px] font-bold transition-all min-h-[32px] cursor-pointer touch-manipulation {
                        proposal.status === 'idea' ? 'bg-amber-400 text-amber-950 shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }"
                >
                    💡 Idee
                </button>
                <button
                    type="button"
                    onclick={() => onUpdateStatus(proposal.id, 'planned')}
                    class="px-2 py-1 rounded-lg text-[11px] font-bold transition-all min-h-[32px] cursor-pointer touch-manipulation {
                        proposal.status === 'planned' ? 'bg-blue-500 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }"
                >
                    📋 Geplant
                </button>
                <button
                    type="button"
                    onclick={() => onUpdateStatus(proposal.id, 'in_progress')}
                    class="px-2 py-1 rounded-lg text-[11px] font-bold transition-all min-h-[32px] cursor-pointer touch-manipulation {
                        proposal.status === 'in_progress' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }"
                >
                    ⚙️ In Arbeit
                </button>
                <button
                    type="button"
                    onclick={() => onUpdateStatus(proposal.id, 'implemented')}
                    class="px-2 py-1 rounded-lg text-[11px] font-bold transition-all min-h-[32px] cursor-pointer touch-manipulation {
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
                    onclick={() => onEdit(proposal)}
                    class="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer touch-manipulation"
                    title="Vorschlag bearbeiten"
                    aria-label="Vorschlag bearbeiten"
                >
                    <Edit3 class="w-4 h-4" />
                </button>

                <button
                    type="button"
                    onclick={() => onDelete(proposal)}
                    class="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer touch-manipulation"
                    title="Vorschlag löschen"
                    aria-label="Vorschlag löschen"
                >
                    <Trash2 class="w-4 h-4" />
                </button>
            </div>
        </div>
    </div>
</div>
