<script lang="ts">
    import { Search, ArrowUpDown, X, Users } from "lucide-svelte";

    let {
        filterService,
        stats
    } = $props<{
        filterService: any;
        stats: {
            total: number;
            gkv: number;
            pkv: number;
        };
    }>();
</script>

<div class="orga-filter-bar animate-enter delay-100 flex-col gap-4">
    <!-- Erste Zeile: Suchfeld & Sortierung -->
    <div class="flex flex-col md:flex-row gap-3 w-full">
        <!-- Live Suchfeld -->
        <div class="relative flex-1">
            <Search class="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
                id="search-ins"
                type="text"
                bind:value={filterService.searchQuery}
                placeholder="Nach Kasse, Stadt, PLZ, E-Mail oder Notizen suchen..."
                class="orga-input-clear pl-10 pr-9 py-2.5 text-xs sm:text-sm min-h-[44px]"
            />
            {#if filterService.searchQuery}
                <button
                    type="button"
                    onclick={() => filterService.searchQuery = ""}
                    class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                    title="Suche leeren"
                >
                    <X class="w-3.5 h-3.5" />
                </button>
            {/if}
        </div>

        <!-- Sortierung Dropdown Alphabetisch sortiert gem. alphabetical-select.md -->
        <div class="w-full md:w-60 shrink-0 flex items-center gap-2">
            <label for="sort-select" class="sr-only">Sortierung</label>
            <div class="relative w-full">
                <ArrowUpDown class="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <select
                    id="sort-select"
                    bind:value={filterService.sortBy}
                    class="orga-input-clear pl-8.5 py-2.5 text-xs font-semibold cursor-pointer w-full min-h-[44px]"
                >
                    <option value="clients-desc">Meiste Klienten zuerst</option>
                    <option value="city-asc">Nach Stadt / Ort</option>
                    <option value="name-asc">Name (A → Z)</option>
                    <option value="name-desc">Name (Z → A)</option>
                    <option value="created-desc">Neueste Einträge zuerst</option>
                </select>
            </div>
        </div>
    </div>

    <!-- Zweite Zeile: Typ-Pills & Filterchips -->
    <div class="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
        <div class="flex flex-wrap items-center gap-1.5">
            <button
                type="button"
                onclick={() => filterService.typeFilter = "all"}
                class="px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[40px] {filterService.typeFilter === 'all' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}"
            >
                Alle ({stats.total})
            </button>
            <button
                type="button"
                onclick={() => filterService.typeFilter = "GKV (Gesetzlich)"}
                class="px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[40px] {filterService.typeFilter.includes('GKV') ? 'bg-teal-600 text-white shadow-xs' : 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200/60 dark:border-teal-800/60 hover:bg-teal-100'}"
            >
                GKV ({stats.gkv})
            </button>
            <button
                type="button"
                onclick={() => filterService.typeFilter = "PKV (Privat)"}
                class="px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[40px] {filterService.typeFilter.includes('PKV') ? 'bg-indigo-600 text-white shadow-xs' : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60 hover:bg-indigo-100'}"
            >
                PKV ({stats.pkv})
            </button>
            <button
                type="button"
                onclick={() => filterService.typeFilter = "Beihilfe"}
                class="px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[40px] {filterService.typeFilter === 'Beihilfe' ? 'bg-purple-600 text-white shadow-xs' : 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/60 hover:bg-purple-100'}"
            >
                Beihilfe
            </button>
            <button
                type="button"
                onclick={() => filterService.typeFilter = "Berufsgenossenschaft"}
                class="px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[40px] {filterService.typeFilter === 'Berufsgenossenschaft' ? 'bg-amber-600 text-white shadow-xs' : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60 hover:bg-amber-100'}"
            >
                Berufsgenossenschaft
            </button>
        </div>

        <div class="flex items-center gap-2">
            <button
                type="button"
                onclick={() => filterService.clientFilter = filterService.clientFilter === 'with_clients' ? 'all' : 'with_clients'}
                class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer min-h-[40px] {filterService.clientFilter === 'with_clients' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}"
            >
                <Users class="w-3.5 h-3.5" />
                <span>Nur mit Klienten</span>
            </button>

            {#if filterService.searchQuery || filterService.typeFilter !== 'all' || filterService.clientFilter !== 'all'}
                <button
                    type="button"
                    onclick={() => filterService.resetFilters()}
                    class="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline px-1.5 cursor-pointer min-h-[40px] flex items-center"
                >
                    Zurücksetzen
                </button>
            {/if}
        </div>
    </div>
</div>
