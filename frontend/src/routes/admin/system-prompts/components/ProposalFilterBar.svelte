<script lang="ts">
    import { Lightbulb, Search, CheckSquare, Square, ExternalLink } from 'lucide-svelte';
    import type { ImprovementProposalRecord } from '$lib/types/orgaTypes';

    let {
        proposals = [],
        filteredCount = 0,
        proposalStatusFilter = $bindable<'all' | 'idea' | 'planned' | 'in_progress' | 'implemented'>('all'),
        proposalCategoryFilter = $bindable<string>('all'),
        proposalPriorityFilter = $bindable<string>('all'),
        proposalSearch = $bindable<string>(''),
        selectedProposalIds = $bindable<string[]>([]),
        inProgressCount = 0,
        areAllInProgressSelected = false,
        onToggleSelectAllInProgress
    }: {
        proposals: ImprovementProposalRecord[];
        filteredCount: number;
        proposalStatusFilter: 'all' | 'idea' | 'planned' | 'in_progress' | 'implemented';
        proposalCategoryFilter: string;
        proposalPriorityFilter: string;
        proposalSearch: string;
        selectedProposalIds: string[];
        inProgressCount: number;
        areAllInProgressSelected: boolean;
        onToggleSelectAllInProgress: () => void;
    } = $props();
</script>

<div class="p-3 sm:p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0 space-y-3 shadow-2xs">
    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div class="flex items-center gap-2">
            <Lightbulb class="w-4 h-4 text-amber-500" />
            <h3 class="text-sm font-black text-slate-900 dark:text-white">Verbesserungsvorschläge & Feature-Backlog</h3>
            <span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                {filteredCount} Vorschläge
            </span>
        </div>

        <!-- Status Filter Buttons -->
        <div class="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl overflow-x-auto text-xs font-bold">
            <button
                type="button"
                onclick={() => proposalStatusFilter = 'all'}
                class="px-3 py-1 rounded-lg transition-all cursor-pointer {proposalStatusFilter === 'all' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}"
            >
                Alle ({proposals.length})
            </button>
            <button
                type="button"
                onclick={() => proposalStatusFilter = 'idea'}
                class="px-3 py-1 rounded-lg transition-all cursor-pointer {proposalStatusFilter === 'idea' ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}"
            >
                💡 Idee ({proposals.filter(p => p.status === 'idea').length})
            </button>
            <button
                type="button"
                onclick={() => proposalStatusFilter = 'planned'}
                class="px-3 py-1 rounded-lg transition-all cursor-pointer {proposalStatusFilter === 'planned' ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}"
            >
                📋 Geplant ({proposals.filter(p => p.status === 'planned').length})
            </button>
            <button
                type="button"
                onclick={() => proposalStatusFilter = 'in_progress'}
                class="px-3 py-1 rounded-lg transition-all cursor-pointer {proposalStatusFilter === 'in_progress' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}"
            >
                ⚙️ In Arbeit ({inProgressCount})
            </button>
            <button
                type="button"
                onclick={() => proposalStatusFilter = 'implemented'}
                class="px-3 py-1 rounded-lg transition-all cursor-pointer {proposalStatusFilter === 'implemented' ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}"
            >
                ✅ Umgesetzt ({proposals.filter(p => p.status === 'implemented').length})
            </button>
        </div>
    </div>

    <!-- Search, Category & Batch Actions -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div class="flex-1 grid grid-cols-1 sm:grid-cols-12 gap-2.5">
            <div class="sm:col-span-6 relative">
                <Search class="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                    type="text"
                    bind:value={proposalSearch}
                    placeholder="Nach Titel, Problem, Lösung oder Tags suchen..."
                    class="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                />
            </div>

            <div class="sm:col-span-3">
                <select
                    bind:value={proposalCategoryFilter}
                    class="w-full py-1.5 px-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-medium cursor-pointer"
                >
                    <option value="all">Alle Bereiche / Module</option>
                    <option value="Core Engine & API">Core Engine & API-Resilienz</option>
                    <option value="UI/UX & Design">UI/UX & Mobile Ergonomie</option>
                    <option value="Haushaltsbuch & Finanzen">Haushaltsbuch & Finanzen</option>
                    <option value="Dokumente & Vorlagen">Dokumente, PDF & DIN 5008</option>
                    <option value="Termine & Außendienst">Termine & Außendienst</option>
                    <option value="Sicherheit & Audit">Sicherheit & Audit-Trail</option>
                    <option value="Sonstiges">Sonstiges</option>
                </select>
            </div>

            <div class="sm:col-span-3">
                <select
                    bind:value={proposalPriorityFilter}
                    class="w-full py-1.5 px-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-medium cursor-pointer"
                >
                    <option value="all">Alle Prioritäten</option>
                    <option value="critical">🔴 Kritisch</option>
                    <option value="high">🟠 Hoch</option>
                    <option value="medium">🔵 Mittel</option>
                    <option value="low">🟢 Niedrig</option>
                </select>
            </div>
        </div>

        <div class="flex items-center gap-1.5 shrink-0">
            <button
                type="button"
                onclick={onToggleSelectAllInProgress}
                disabled={inProgressCount === 0}
                class="px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed {
                    areAllInProgressSelected 
                        ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800' 
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                }"
            >
                {#if areAllInProgressSelected}
                    <CheckSquare class="w-3.5 h-3.5 text-indigo-600" />
                    <span>In Arbeit gewählt</span>
                {:else}
                    <Square class="w-3.5 h-3.5 text-slate-400" />
                    <span>In Arbeit wählen ({inProgressCount})</span>
                {/if}
            </button>

            {#if selectedProposalIds.length > 0}
                <button
                    type="button"
                    onclick={() => selectedProposalIds = []}
                    class="px-2 py-1 text-xs font-semibold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                >
                    Aufheben ({selectedProposalIds.length})
                </button>
            {/if}

            <a
                href="/admin/proposals"
                class="px-2.5 py-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-xl flex items-center gap-1 transition-colors"
            >
                <ExternalLink class="w-3 h-3" />
                <span class="hidden sm:inline">Vollansicht</span>
            </a>
        </div>
    </div>
</div>
