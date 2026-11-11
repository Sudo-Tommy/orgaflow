<script lang="ts">
    import { Sparkles, Edit3, MessageCircle, Trash2 } from 'lucide-svelte';
    import type { ImprovementProposalRecord } from '$lib/types/orgaTypes';
    import { formatDate } from '../types';
    import { proposalService } from '$lib/services/improvementProposalService.svelte';

    let {
        proposal,
        isSelected = false,
        onToggleSelect,
        onUpdateStatus,
        onEdit,
        onDelete,
        onShareChat,
        onSolution,
        onCreatePrompt
    }: {
        proposal: ImprovementProposalRecord;
        isSelected: boolean;
        onToggleSelect: () => void;
        onUpdateStatus: (id: string, status: 'idea' | 'planned' | 'in_progress' | 'implemented') => Promise<void>;
        onEdit: (p: ImprovementProposalRecord) => void;
        onDelete: (p: ImprovementProposalRecord) => void;
        onShareChat: (p: ImprovementProposalRecord) => void;
        onSolution: (p: ImprovementProposalRecord) => void;
        onCreatePrompt: (p: ImprovementProposalRecord) => void;
    } = $props();

    const isInProgress = $derived(proposal.status === 'in_progress');
    const isUnread = $derived(proposalService.isProposalUnread(proposal.id));
</script>

<div class="bg-white dark:bg-slate-900 rounded-2xl border p-4 sm:p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-3 {
    isSelected ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/15 dark:bg-indigo-950/20' : 
    isUnread ? 'border-amber-400 dark:border-amber-500/70 ring-2 ring-amber-400/20 bg-amber-50/10' :
    'border-slate-200 dark:border-slate-800 hover:border-amber-300 dark:hover:border-amber-600'
}">
    <div class="space-y-2.5">
        <div class="flex items-start justify-between gap-2">
            <div class="flex items-center gap-2 flex-wrap">
                <label class="flex items-center justify-center min-w-[36px] min-h-[36px] cursor-pointer p-1.5 -m-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0">
                    <input 
                        type="checkbox" 
                        checked={isSelected}
                        onchange={onToggleSelect}
                        class="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                </label>
                <span class="px-2.5 py-0.5 rounded-lg text-[11px] font-bold border bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                    {proposal.category || 'Core'}
                </span>
                <span class="px-2 py-0.5 rounded-lg text-[11px] font-bold border {
                    proposal.priority === 'critical' ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800' :
                    proposal.priority === 'high' ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800' :
                    proposal.priority === 'medium' ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800' :
                    'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                }">
                    {proposal.priority === 'critical' ? '🔴 Kritisch' :
                     proposal.priority === 'high' ? '🟠 Hoch' :
                     proposal.priority === 'medium' ? '🔵 Mittel' :
                     '🟢 Niedrig'}
                </span>
            </div>
            <div class="flex items-center gap-1.5 shrink-0">
                {#if isUnread}
                    <span class="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-black bg-amber-500 text-slate-950 animate-pulse shadow-2xs">
                        Neu 💡
                    </span>
                {/if}
                <span class="text-[11px] text-slate-400 whitespace-nowrap">
                    {formatDate(proposal.created)}
                </span>
            </div>
        </div>

        <div>
            <h4 class="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                {proposal.title}
            </h4>
            {#if proposal.author_name}
                <p class="text-[11px] text-slate-400 mt-0.5 font-medium">Erfasst von: {proposal.author_name}</p>
            {/if}
        </div>

        <div class="bg-slate-50 dark:bg-slate-950/60 rounded-xl p-3 border border-slate-100 dark:border-slate-800 space-y-2">
            <div>
                <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Problem:</span>
                <p class="text-xs text-slate-800 dark:text-slate-200 font-medium whitespace-pre-wrap leading-relaxed">
                    {proposal.description}
                </p>
            </div>

            {#if proposal.solution_concept}
                <div class="pt-2 border-t border-slate-200/60 dark:border-slate-800">
                    <span class="text-[10px] font-bold uppercase tracking-wider text-indigo-500 block mb-0.5 flex items-center gap-1">
                        <Sparkles class="w-3 h-3" />
                        <span>Lösungskonzept:</span>
                    </span>
                    <p class="text-xs text-slate-900 dark:text-slate-100 font-medium whitespace-pre-wrap leading-relaxed">
                        {proposal.solution_concept}
                    </p>
                </div>
            {/if}
        </div>

        {#if proposal.tags}
            <div class="flex flex-wrap gap-1">
                {#each proposal.tags.split(',') as tag}
                    {#if tag.trim()}
                        <span class="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-mono">
                            #{tag.trim()}
                        </span>
                    {/if}
                {/each}
            </div>
        {/if}
    </div>

    <div class="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2.5 mt-1">
        <div class="flex items-center justify-between gap-2">
            <span class="text-[11px] font-semibold text-slate-400">Status:</span>
            <div class="inline-flex p-0.5 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 gap-0.5">
                <button
                    type="button"
                    onclick={() => onUpdateStatus(proposal.id, 'idea')}
                    class="px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer {
                        proposal.status === 'idea' ? 'bg-amber-400 text-slate-950 shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }"
                >
                    💡 Idee
                </button>
                <button
                    type="button"
                    onclick={() => onUpdateStatus(proposal.id, 'planned')}
                    class="px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer {
                        proposal.status === 'planned' ? 'bg-blue-500 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }"
                >
                    📋 Geplant
                </button>
                <button
                    type="button"
                    onclick={() => onUpdateStatus(proposal.id, 'in_progress')}
                    class="px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer {
                        proposal.status === 'in_progress' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }"
                >
                    ⚙️ In Arbeit
                </button>
                <button
                    type="button"
                    onclick={() => onUpdateStatus(proposal.id, 'implemented')}
                    class="px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer {
                        proposal.status === 'implemented' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }"
                >
                    ✅ Umgesetzt
                </button>
            </div>
        </div>

        <div class="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div class="flex items-center gap-1">
                <button
                    type="button"
                    onclick={() => onEdit(proposal)}
                    class="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                    title="Vorschlag bearbeiten"
                >
                    <Edit3 class="w-3.5 h-3.5" />
                </button>
                <button
                    type="button"
                    onclick={() => onShareChat(proposal)}
                    class="p-2 text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded-xl transition-colors cursor-pointer"
                    title="Im Team-Chat teilen"
                >
                    <MessageCircle class="w-3.5 h-3.5" />
                </button>
                <button
                    type="button"
                    onclick={() => onDelete(proposal)}
                    class="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl transition-colors cursor-pointer"
                    title="Vorschlag löschen"
                >
                    <Trash2 class="w-3.5 h-3.5" />
                </button>
            </div>

            <div class="flex items-center gap-2">
                <button
                    type="button"
                    onclick={() => onSolution(proposal)}
                    class="py-1.5 px-3 rounded-xl text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-2xs"
                >
                    <Sparkles class="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span class="hidden sm:inline">Lösungsansatz</span>
                </button>

                <button
                    type="button"
                    onclick={() => onCreatePrompt(proposal)}
                    class="bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs shadow-indigo-600/30 py-1.5 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer active:scale-95 transition-transform"
                >
                    <Sparkles class="w-3.5 h-3.5 text-amber-300" />
                    <span>🎯 Prompt erstellen</span>
                </button>
            </div>
        </div>
    </div>
</div>
