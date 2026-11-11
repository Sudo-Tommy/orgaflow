<script lang="ts">
    import { slide } from "svelte/transition";
    import { ListTodo, ChevronUp, ChevronDown, Check, X, Search } from "lucide-svelte";

    interface Props {
        tasks: any[];
        allTasks: any[];
        onToggleTask: (taskId: string) => void;
        onCreateTask: (title: string) => Promise<void>;
    }

    let { tasks, allTasks, onToggleTask, onCreateTask }: Props = $props();

    let isExpanded = $state(false);
    let searchQuery = $state("");
    let newTitle = $state("");
    let isLoading = $state(false);

    // 1. Ausgewählte Leistungen alphabetisch A-Z (Antwort 7a)
    let sortedSelectedTasks = $derived.by(() => {
        return [...tasks].sort((a, b) => 
            (a.title || '').localeCompare(b.title || '', 'de', { sensitivity: 'base' })
        );
    });

    // 2. Nicht ausgewählte Leistungen alphabetisch A-Z (Antwort 6b)
    let sortedUnselectedTasks = $derived.by(() => {
        const unselected = allTasks.filter(t => !tasks.some(pt => pt.id === t.id));
        return unselected.sort((a, b) => 
            (a.title || '').localeCompare(b.title || '', 'de', { sensitivity: 'base' })
        );
    });

    // 3. Gefilterte unselektierte Leistungen nach Suchtext
    let filteredUnselectedTasks = $derived.by(() => {
        if (!searchQuery.trim()) return sortedUnselectedTasks;
        const q = searchQuery.toLowerCase().trim();
        return sortedUnselectedTasks.filter(t => (t.title || '').toLowerCase().includes(q));
    });

    async function handleCreate() {
        if (!newTitle.trim() || isLoading) return;
        isLoading = true;
        try {
            await onCreateTask(newTitle.trim());
            newTitle = "";
        } finally {
            isLoading = false;
        }
    }
</script>

<div class="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-neutral-200/90 dark:border-slate-800 shadow-xs">
    <div class="flex items-center justify-between mb-3.5 border-b border-neutral-100 dark:border-slate-800 pb-2.5">
        <div class="flex items-center gap-2">
            <h3 class="text-xs font-bold text-neutral-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <ListTodo class="w-4 h-4 text-amber-600" /> Erbrachte Leistungen (A–Z)
            </h3>
            {#if sortedSelectedTasks.length > 0}
                <span class="px-2 py-0.5 text-xs font-black rounded-md bg-amber-100 text-amber-900 border border-amber-300">
                    {sortedSelectedTasks.length}
                </span>
            {/if}
        </div>
        <button 
            type="button" 
            onclick={() => isExpanded = !isExpanded} 
            class="min-h-10 px-3 text-xs font-bold text-neutral-700 dark:text-slate-300 bg-neutral-100 dark:bg-slate-800 rounded-xl flex items-center gap-1.5 border border-neutral-200 dark:border-slate-700 cursor-pointer"
        >
            {#if isExpanded}Schließen <ChevronUp class="w-3.5 h-3.5" />{:else}+ Auswählen <ChevronDown class="w-3.5 h-3.5" />{/if}
        </button>
    </div>

    <!-- Ausgewählte Leistungen Chips (A–Z sortiert) -->
    {#if sortedSelectedTasks.length > 0}
        <div class="flex flex-wrap gap-2 mb-3">
            {#each sortedSelectedTasks as t (t.id)}
                <div class="flex items-center rounded-xl border bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 shadow-2xs overflow-hidden min-h-10">
                    <span class="px-3.5 py-1.5 text-xs font-bold text-amber-950 dark:text-amber-100 flex items-center gap-1.5">
                        <Check class="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" /> {t.title}
                    </span>
                    {#if isExpanded}
                        <button 
                            type="button" 
                            onclick={() => onToggleTask(t.id)} 
                            class="h-full px-2.5 text-amber-700 dark:text-amber-300 hover:text-rose-600 border-l border-amber-200 dark:border-amber-800 cursor-pointer"
                            title="Entfernen"
                        >
                            <X class="w-3.5 h-3.5" />
                        </button>
                    {/if}
                </div>
            {/each}
        </div>
    {:else if !isExpanded}
        <p class="text-center text-xs font-medium text-neutral-400 py-5 bg-neutral-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-neutral-200 dark:border-slate-700">
            Keine Leistungen für diesen Termin ausgewählt.
        </p>
    {/if}

    <!-- Ausklappbereich: Gewählte oben (A-Z), darunter alle verfügbaren (A-Z) (Antwort 6b) -->
    {#if isExpanded}
        <div transition:slide class="mt-4 pt-3 border-t border-neutral-100 dark:border-slate-800 space-y-3">
            <div class="relative">
                <Search class="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                <input 
                    type="text" 
                    bind:value={searchQuery} 
                    placeholder="Leistungen durchsuchen (A–Z)..." 
                    class="w-full text-xs pl-9 pr-3 py-2.5 bg-neutral-50 dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-700" 
                />
            </div>

            <!-- Verfügbare Leistungen (A-Z sortiert) -->
            <div class="space-y-1.5">
                <span class="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block px-1">
                    Verfügbare Leistungen ({filteredUnselectedTasks.length})
                </span>
                <div class="flex flex-wrap gap-2 p-1 max-h-72 overflow-y-auto">
                    {#each filteredUnselectedTasks as t (t.id)}
                        <button 
                            type="button" 
                            onclick={() => onToggleTask(t.id)} 
                            class="min-h-10 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer bg-white dark:bg-slate-800 text-neutral-800 dark:text-slate-200 border-neutral-200 dark:border-slate-700 hover:border-amber-400 hover:bg-amber-50/50 dark:hover:bg-amber-950/30"
                        >
                            <span>+</span>
                            <span>{t.title}</span>
                        </button>
                    {/each}
                    {#if filteredUnselectedTasks.length === 0}
                        <p class="text-xs text-neutral-400 italic py-2 px-1">
                            {searchQuery.trim() ? 'Keine passende Leistung gefunden.' : 'Alle verfügbaren Leistungen sind bereits ausgewählt.'}
                        </p>
                    {/if}
                </div>
            </div>

            <div class="flex gap-2 pt-2 border-t border-neutral-100 dark:border-slate-800">
                <input 
                    type="text" 
                    bind:value={newTitle} 
                    placeholder="Neue Leistung erstellen..." 
                    class="text-xs flex-1 px-3 py-2 bg-neutral-50 dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-700" 
                    onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreate(); } }} 
                />
                <button 
                    type="button" 
                    onclick={handleCreate} 
                    disabled={!newTitle.trim() || isLoading} 
                    class="min-h-10 px-4 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs shrink-0 cursor-pointer shadow-xs disabled:opacity-50"
                >
                    + Neu
                </button>
            </div>
        </div>
    {/if}
</div>
