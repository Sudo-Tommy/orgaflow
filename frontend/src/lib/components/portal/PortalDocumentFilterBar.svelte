<script lang="ts">
    import { Search, User, LayoutGrid, List } from "lucide-svelte";
    import { PORTAL_DOCUMENT_CATEGORIES } from "./portalDocumentHelper";
    import { sortAlphabetical } from "$lib/utils/sortHelper";

    let {
        searchQuery = $bindable(),
        selectedCategory = $bindable(),
        selectedClientFilter = $bindable(),
        viewMode = $bindable(),
        myClients = [],
        categoryCounts
    } = $props<{
        searchQuery: string;
        selectedCategory: string;
        selectedClientFilter: string;
        viewMode: 'grid' | 'list';
        myClients?: any[];
        categoryCounts: Record<string, number>;
    }>();

    let sortedClients = $derived.by(() => {
        return sortAlphabetical(myClients || [], (c: any) => `${c.name_first || ''} ${c.name_last || ''}`);
    });
</script>

<div class="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-neutral-100 dark:border-slate-800 shadow-xl space-y-4">
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <!-- Suchfeld -->
        <div class="relative flex-1">
            <Search class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 dark:text-slate-400 pointer-events-none" />
            <input
                type="search"
                bind:value={searchQuery}
                placeholder="Dokumente nach Name, Kategorie oder Klient durchsuchen..."
                class="orga-input-clear py-2.5 pl-10 pr-9 text-xs sm:text-sm bg-neutral-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 text-neutral-900 dark:text-slate-100 transition-colors w-full rounded-2xl border border-neutral-200 dark:border-slate-700 min-h-[44px]"
            />
            {#if searchQuery}
                <button
                    type="button"
                    onclick={() => searchQuery = ""}
                    class="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-neutral-200 dark:bg-slate-700 hover:bg-neutral-300 dark:hover:bg-slate-600 text-neutral-600 dark:text-slate-300 flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
                    title="Suche leeren"
                >
                    ✕
                </button>
            {/if}
        </div>

        <!-- Klienten-Filter Alphabetisch sortiert -->
        {#if sortedClients.length > 1}
            <div class="flex items-center gap-2 shrink-0">
                <User class="w-4 h-4 text-neutral-400 dark:text-slate-400" />
                <select
                    bind:value={selectedClientFilter}
                    class="orga-input-clear py-2.5 px-3 text-xs bg-neutral-50 dark:bg-slate-800 dark:text-slate-100 border border-neutral-200 dark:border-slate-700 rounded-2xl min-h-[44px]"
                >
                    <option value="all">Alle Klienten ({sortedClients.length})</option>
                    {#each sortedClients as cl}
                        <option value={cl.id}>{cl.name_first} {cl.name_last}</option>
                    {/each}
                </select>
            </div>
        {/if}

        <!-- View-Switcher -->
        <div class="flex items-center gap-1 bg-neutral-100 dark:bg-slate-800 p-1 rounded-xl shrink-0 self-end md:self-center">
            <button
                type="button"
                onclick={() => viewMode = 'grid'}
                class="p-2 rounded-lg transition-colors cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center {viewMode === 'grid' ? 'bg-white dark:bg-slate-700 text-brand-700 dark:text-brand-400 shadow-2xs font-bold' : 'text-neutral-500 dark:text-slate-400 hover:text-neutral-900 dark:hover:text-white'}"
                title="Karten-Ansicht"
            >
                <LayoutGrid class="w-4 h-4" />
            </button>
            <button
                type="button"
                onclick={() => viewMode = 'list'}
                class="p-2 rounded-lg transition-colors cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center {viewMode === 'list' ? 'bg-white dark:bg-slate-700 text-brand-700 dark:text-brand-400 shadow-2xs font-bold' : 'text-neutral-500 dark:text-slate-400 hover:text-neutral-900 dark:hover:text-white'}"
                title="Listen-Ansicht"
            >
                <List class="w-4 h-4" />
            </button>
        </div>
    </div>

    <!-- Kategorie Filter-Pills -->
    <div class="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1 -mx-1 px-1">
        {#each PORTAL_DOCUMENT_CATEGORIES as cat}
            {@const count = categoryCounts[cat.id] || 0}
            <button
                type="button"
                onclick={() => selectedCategory = cat.id}
                class="min-h-[44px] px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all active:scale-95 cursor-pointer flex items-center gap-2 shrink-0 touch-manipulation {selectedCategory === cat.id ? 'bg-brand-600 text-white shadow-xs' : 'bg-neutral-50 dark:bg-slate-800 hover:bg-neutral-100 dark:hover:bg-slate-700 text-neutral-600 dark:text-slate-300 border border-neutral-200/60 dark:border-slate-700'}"
            >
                <span>{cat.label}</span>
                <span class="px-2 py-0.5 rounded-full text-[10px] {selectedCategory === cat.id ? 'bg-white/25 text-white' : 'bg-neutral-200 dark:bg-slate-700 text-neutral-600 dark:text-slate-300'}">
                    {count}
                </span>
            </button>
        {/each}
    </div>
</div>
