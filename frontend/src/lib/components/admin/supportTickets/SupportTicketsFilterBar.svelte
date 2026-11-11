<script lang="ts">
    import { Search } from "lucide-svelte";

    interface Props {
        statusFilter: "all" | "open" | "in_progress" | "resolved";
        categoryFilter: string;
        searchQuery: string;
        totalTicketsCount: number;
        openCount: number;
        inProgressCount: number;
        resolvedCount: number;
        availableCategories: string[];
    }

    let {
        statusFilter = $bindable(),
        categoryFilter = $bindable(),
        searchQuery = $bindable(),
        totalTicketsCount,
        openCount,
        inProgressCount,
        resolvedCount,
        availableCategories
    }: Props = $props();
</script>

<div class="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
    <div class="flex items-center gap-1.5 overflow-x-auto custom-scrollbar p-1 bg-slate-100/80 dark:bg-slate-800/80 rounded-xl">
        <button
            type="button"
            onclick={() => (statusFilter = "all")}
            class="min-h-11 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer touch-manipulation {statusFilter === 'all' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs border border-slate-200/60 dark:border-slate-800' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}"
        >
            Alle ({totalTicketsCount})
        </button>
        <button
            type="button"
            onclick={() => (statusFilter = "open")}
            class="min-h-11 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 touch-manipulation {statusFilter === 'open' ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs border border-slate-200/60 dark:border-slate-800' : 'text-slate-600 dark:text-slate-400 hover:text-rose-600'}"
        >
            <span class="w-2 h-2 rounded-full bg-rose-500"></span>
            <span>Offen ({openCount})</span>
        </button>
        <button
            type="button"
            onclick={() => (statusFilter = "in_progress")}
            class="min-h-11 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 touch-manipulation {statusFilter === 'in_progress' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs border border-slate-200/60 dark:border-slate-800' : 'text-slate-600 dark:text-slate-400 hover:text-indigo-600'}"
        >
            <span class="w-2 h-2 rounded-full bg-indigo-500"></span>
            <span>In Bearbeitung ({inProgressCount})</span>
        </button>
        <button
            type="button"
            onclick={() => (statusFilter = "resolved")}
            class="min-h-11 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 touch-manipulation {statusFilter === 'resolved' ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs border border-slate-200/60 dark:border-slate-800' : 'text-slate-600 dark:text-slate-400 hover:text-emerald-600'}"
        >
            <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Gelöst ({resolvedCount})</span>
        </button>
    </div>

    <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div class="relative min-w-[170px]">
            <select
                bind:value={categoryFilter}
                class="orga-input-clear w-full min-h-11 text-xs font-semibold py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 touch-manipulation cursor-pointer"
            >
                <option value="all">Alle Kategorien</option>
                {#each availableCategories as cat}
                    <option value={cat}>{cat}</option>
                {/each}
            </select>
        </div>
        <div class="relative min-w-[220px]">
            <Search class="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
                type="text"
                bind:value={searchQuery}
                placeholder="Suchen nach Inhalt, Route, User..."
                class="orga-input-clear w-full min-h-11 text-xs py-2 pl-9 pr-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 touch-manipulation"
            />
        </div>
    </div>
</div>
