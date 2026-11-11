<script lang="ts">
    import { Search, CheckSquare, Square } from 'lucide-svelte';
    import { sortAlphabetical } from '$lib/utils/sortHelper';

    interface Props {
        statusFilter: 'all' | 'idea' | 'planned' | 'in_progress' | 'implemented';
        categoryFilter: string;
        priorityFilter: string;
        searchQuery: string;
        totalCount: number;
        inProgressCount: number;
        ideaCount: number;
        plannedCount: number;
        implementedCount: number;
        areAllInProgressSelected: boolean;
        selectedCount: number;
        onToggleSelectAllInProgress: () => void;
        onClearSelection: () => void;
    }

    let {
        statusFilter = $bindable('all'),
        categoryFilter = $bindable('all'),
        priorityFilter = $bindable('all'),
        searchQuery = $bindable(''),
        totalCount,
        inProgressCount,
        ideaCount,
        plannedCount,
        implementedCount,
        areAllInProgressSelected,
        selectedCount,
        onToggleSelectAllInProgress,
        onClearSelection
    }: Props = $props();

    const RAW_CATEGORIES = [
        { value: 'Core Engine & API', label: 'Core Engine & API' },
        { value: 'Dokumente & Vorlagen', label: 'Dokumente & Vorlagen' },
        { value: 'Haushaltsbuch & Finanzen', label: 'Haushaltsbuch & Finanzen' },
        { value: 'Sicherheit & Audit', label: 'Sicherheit & Audit' },
        { value: 'Sonstiges', label: 'Sonstiges' },
        { value: 'Termine & Außendienst', label: 'Termine & Außendienst' },
        { value: 'UI/UX & Design', label: 'UI/UX & Mobile Ergonomie' }
    ];

    const sortedCategories = $derived(
        sortAlphabetical(RAW_CATEGORIES, c => c.label)
    );

    const RAW_PRIORITIES = [
        { value: 'critical', label: '🔴 Kritisch' },
        { value: 'high', label: '🟠 Hoch' },
        { value: 'medium', label: '🔵 Mittel' },
        { value: 'low', label: '🟢 Niedrig' }
    ];

    const sortedPriorities = $derived(
        sortAlphabetical(RAW_PRIORITIES, p => p.label)
    );
</script>

<div class="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200 shadow-sm space-y-4">
    <!-- Obere Filterleiste: Status-Buttons & Schnellauswahl -->
    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <!-- Status-Buttons -->
        <div class="flex flex-wrap items-center gap-1.5 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/80 text-xs">
            <button
                type="button"
                onclick={() => statusFilter = 'all'}
                class="px-3 py-1.5 rounded-xl font-bold transition-all min-h-[36px] flex items-center justify-center cursor-pointer touch-manipulation {statusFilter === 'all' ? 'bg-white text-primary-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}"
            >
                Alle ({totalCount})
            </button>
            <button
                type="button"
                onclick={() => statusFilter = 'in_progress'}
                class="px-3 py-1.5 rounded-xl font-bold transition-all min-h-[36px] flex items-center justify-center cursor-pointer touch-manipulation {statusFilter === 'in_progress' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}"
            >
                ⚙️ In Bearbeitung ({inProgressCount})
            </button>
            <button
                type="button"
                onclick={() => statusFilter = 'idea'}
                class="px-3 py-1.5 rounded-xl font-bold transition-all min-h-[36px] flex items-center justify-center cursor-pointer touch-manipulation {statusFilter === 'idea' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}"
            >
                💡 Idee ({ideaCount})
            </button>
            <button
                type="button"
                onclick={() => statusFilter = 'planned'}
                class="px-3 py-1.5 rounded-xl font-bold transition-all min-h-[36px] flex items-center justify-center cursor-pointer touch-manipulation {statusFilter === 'planned' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}"
            >
                📋 Geplant ({plannedCount})
            </button>
            <button
                type="button"
                onclick={() => statusFilter = 'implemented'}
                class="px-3 py-1.5 rounded-xl font-bold transition-all min-h-[36px] flex items-center justify-center cursor-pointer touch-manipulation {statusFilter === 'implemented' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}"
            >
                ✅ Umgesetzt ({implementedCount})
            </button>
        </div>

        <!-- Schnellauswahl-Button für "In Bearbeitung" -->
        <div class="flex items-center gap-2">
            <button
                type="button"
                onclick={onToggleSelectAllInProgress}
                disabled={inProgressCount === 0}
                class="px-3.5 py-2 rounded-xl text-xs font-bold border transition-all min-h-[44px] flex items-center gap-2 cursor-pointer touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed {
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
                    <span>Alle In Bearbeitung auswählen ({inProgressCount})</span>
                {/if}
            </button>

            {#if selectedCount > 0}
                <button
                    type="button"
                    onclick={onClearSelection}
                    class="px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl min-h-[44px] transition-colors cursor-pointer touch-manipulation"
                >
                    Auswahl aufheben ({selectedCount})
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
                class="orga-input-clear py-2 text-xs w-full bg-slate-50 border border-slate-200 rounded-xl min-h-[44px] cursor-pointer touch-manipulation"
            >
                <option value="all">Alle Module / Kategorien</option>
                {#each sortedCategories as cat (cat.value)}
                    <option value={cat.value}>{cat.label}</option>
                {/each}
            </select>
        </div>

        <div class="sm:col-span-3">
            <select
                bind:value={priorityFilter}
                class="orga-input-clear py-2 text-xs w-full bg-slate-50 border border-slate-200 rounded-xl min-h-[44px] cursor-pointer touch-manipulation"
            >
                <option value="all">Alle Prioritäten</option>
                {#each sortedPriorities as prio (prio.value)}
                    <option value={prio.value}>{prio.label}</option>
                {/each}
            </select>
        </div>
    </div>
</div>
