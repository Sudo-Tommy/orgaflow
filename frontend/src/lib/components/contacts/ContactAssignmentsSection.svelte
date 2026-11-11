<script lang="ts">
    import type { ClientRecord, RetirementHomeRecord } from "$lib/types/orgaTypes";
    import type { ContactModalState } from "./contactModalState.svelte";

    interface Props {
        state: ContactModalState;
        filteredClients: ClientRecord[];
        filteredHomes: RetirementHomeRecord[];
    }

    let { state: modalState, filteredClients, filteredHomes }: Props = $props();

    // Standardmäßig ausnahmslos zugeklappt (auch wenn Verknüpfungen existieren)
    let showClients = $state(false);
    let showHomes = $state(false);
    let showMailing = $state(false);

    // Alphabetische Sortierung nach Nachname/Name gemäß Vorgabe
    let sortedClients = $derived.by(() => {
        return [...filteredClients].sort((a, b) => {
            const nameA = `${a.name_last || ''} ${a.name_first || ''}`.trim();
            const nameB = `${b.name_last || ''} ${b.name_first || ''}`.trim();
            return nameA.localeCompare(nameB, 'de', { sensitivity: 'base' });
        });
    });

    let sortedHomes = $derived.by(() => {
        return [...filteredHomes].sort((a, b) => {
            return (a.name || '').localeCompare(b.name || '', 'de', { sensitivity: 'base' });
        });
    });
</script>

<div class="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
    <!-- Akkordeon 1: Zugeordnete Klienten (standardmäßig zugeklappt) -->
    <div class="border border-slate-200/80 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900/60 overflow-hidden shadow-2xs">
        <button
            type="button"
            onclick={() => showClients = !showClients}
            class="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer select-none"
            aria-expanded={showClients}
        >
            <div class="flex items-center gap-3 min-w-0">
                <span class="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-sm shrink-0">👥</span>
                <div class="min-w-0">
                    <p class="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">Zugeordnete Klienten</p>
                    <p class="text-[11px] text-slate-500 dark:text-slate-400 truncate">Verknüpfung als Betreuer oder Angehöriger</p>
                </div>
            </div>
            <div class="flex items-center gap-2 shrink-0">
                <span class="px-2.5 py-0.5 rounded-full text-xs font-bold {modalState.linkedClients.length > 0 ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}">
                    {modalState.linkedClients.length} {modalState.linkedClients.length === 1 ? 'Klient' : 'Klienten'}
                </span>
                <svg class="w-4 h-4 text-slate-400 transition-transform duration-200 {showClients ? 'rotate-180' : ''}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
            </div>
        </button>

        {#if showClients}
            <div class="p-3 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/50 space-y-2">
                <input 
                    type="text" 
                    bind:value={modalState.clientSearchFilter} 
                    placeholder="Klienten filtern..." 
                    class="orga-input-clear min-h-[36px] text-xs"
                />
                <div class="border border-slate-200 dark:border-slate-700/80 rounded-xl p-1 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800 max-h-64 overflow-y-auto custom-scrollbar">
                    {#each sortedClients as c (c.id)}
                        <label class="flex items-center justify-between gap-2.5 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-lg cursor-pointer transition-colors">
                            <div class="flex items-center gap-2.5 min-w-0">
                                <input 
                                    type="checkbox" 
                                    checked={modalState.linkedClients.includes(c.id)} 
                                    onchange={() => modalState.toggleClient(c.id)} 
                                    class="w-4 h-4 text-indigo-600 border-slate-300 dark:border-slate-600 rounded focus:ring-indigo-500 cursor-pointer shrink-0" 
                                    disabled={modalState.isLoading} 
                                />
                                <span class="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                                    {c.name_first} {c.name_last}
                                </span>
                            </div>
                            <div class="flex items-center gap-1.5 shrink-0">
                                {#if c.city}
                                    <span class="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                        {c.city}
                                    </span>
                                {/if}
                                {#if c.caregiver === modalState.editId}
                                    <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                        Betreuer
                                    </span>
                                {/if}
                            </div>
                        </label>
                    {/each}
                    {#if sortedClients.length === 0}
                        <p class="text-xs text-slate-500 dark:text-slate-400 p-3 italic text-center">Keine Klienten gefunden.</p>
                    {/if}
                </div>
            </div>
        {/if}
    </div>

    <!-- Akkordeon 2: Zugeordnete Pflegeheime & Einrichtungen (standardmäßig zugeklappt) -->
    <div class="border border-slate-200/80 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900/60 overflow-hidden shadow-2xs">
        <button
            type="button"
            onclick={() => showHomes = !showHomes}
            class="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer select-none"
            aria-expanded={showHomes}
        >
            <div class="flex items-center gap-3 min-w-0">
                <span class="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center text-sm shrink-0">🏥</span>
                <div class="min-w-0">
                    <p class="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">Zugeordnete Einrichtungen</p>
                    <p class="text-[11px] text-slate-500 dark:text-slate-400 truncate">Pflegeheime & Wohngruppen</p>
                </div>
            </div>
            <div class="flex items-center gap-2 shrink-0">
                <span class="px-2.5 py-0.5 rounded-full text-xs font-bold {modalState.linkedHomes.length > 0 ? 'bg-teal-100 text-teal-800 dark:bg-teal-950/70 dark:text-teal-300 border border-teal-200 dark:border-teal-800' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}">
                    {modalState.linkedHomes.length} {modalState.linkedHomes.length === 1 ? 'Einrichtung' : 'Einrichtungen'}
                </span>
                <svg class="w-4 h-4 text-slate-400 transition-transform duration-200 {showHomes ? 'rotate-180' : ''}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
            </div>
        </button>

        {#if showHomes}
            <div class="p-3 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/50 space-y-2">
                <input 
                    type="text" 
                    bind:value={modalState.homeSearchFilter} 
                    placeholder="Einrichtung filtern..." 
                    class="orga-input-clear min-h-[36px] text-xs"
                />
                <div class="border border-slate-200 dark:border-slate-700/80 rounded-xl p-1 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800 max-h-64 overflow-y-auto custom-scrollbar">
                    {#each sortedHomes as h (h.id)}
                        <label class="flex items-center justify-between gap-2.5 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-lg cursor-pointer transition-colors">
                            <div class="flex items-center gap-2.5 min-w-0">
                                <input 
                                    type="checkbox" 
                                    checked={modalState.linkedHomes.includes(h.id)} 
                                    onchange={() => modalState.toggleHome(h.id)} 
                                    class="w-4 h-4 text-teal-600 border-slate-300 dark:border-slate-600 rounded focus:ring-teal-500 cursor-pointer shrink-0" 
                                    disabled={modalState.isLoading} 
                                />
                                <span class="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{h.name}</span>
                            </div>
                            {#if h.city}
                                <span class="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                                    {h.city}
                                </span>
                            {/if}
                        </label>
                    {/each}
                    {#if sortedHomes.length === 0}
                        <p class="text-xs text-slate-500 dark:text-slate-400 p-3 italic text-center">Keine Einrichtungen gefunden.</p>
                    {/if}
                </div>
            </div>
        {/if}
    </div>

    <!-- Akkordeon 3: E-Mail-CC-Verteiler (standardmäßig zugeklappt) -->
    <div class="border border-slate-200/80 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900/60 overflow-hidden shadow-2xs">
        <button
            type="button"
            onclick={() => showMailing = !showMailing}
            class="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer select-none"
            aria-expanded={showMailing}
        >
            <div class="flex items-center gap-3 min-w-0">
                <span class="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center text-sm shrink-0">📧</span>
                <div class="min-w-0">
                    <p class="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">E-Mail-CC-Verteiler</p>
                    <p class="text-[11px] text-slate-500 dark:text-slate-400 truncate">Automatische Kopie bei Klienten-Aussendungen</p>
                </div>
            </div>
            <div class="flex items-center gap-2 shrink-0">
                <span class="px-2.5 py-0.5 rounded-full text-xs font-bold {modalState.linkedMailingLists.length > 0 ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-200 dark:border-blue-800' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}">
                    {modalState.linkedMailingLists.length}
                </span>
                <svg class="w-4 h-4 text-slate-400 transition-transform duration-200 {showMailing ? 'rotate-180' : ''}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
            </div>
        </button>

        {#if showMailing}
            <div class="p-3 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/50 space-y-2">
                {#if !modalState.email}
                    <p class="text-xs text-amber-700 dark:text-amber-300 p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-900/60 flex items-center gap-2">
                        <span>ℹ️</span> Bitte oben zuerst eine E-Mail-Adresse angeben, um den CC-Verteiler zu aktivieren.
                    </p>
                {:else}
                    <div class="border border-slate-200 dark:border-slate-700/80 rounded-xl p-1 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800 max-h-64 overflow-y-auto custom-scrollbar">
                        {#each sortedClients as c (c.id)}
                            <label class="flex items-center justify-between gap-2.5 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-lg cursor-pointer transition-colors">
                                <div class="flex items-center gap-2.5 min-w-0">
                                    <input 
                                        type="checkbox" 
                                        checked={modalState.linkedMailingLists.includes(c.id)} 
                                        onchange={() => modalState.toggleMailingList(c.id)} 
                                        class="w-4 h-4 text-blue-600 border-slate-300 dark:border-slate-600 rounded focus:ring-blue-500 cursor-pointer shrink-0" 
                                        disabled={modalState.isLoading} 
                                    />
                                    <span class="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{c.name_first} {c.name_last}</span>
                                </div>
                                {#if c.city}
                                    <span class="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                                        {c.city}
                                    </span>
                                {/if}
                            </label>
                        {/each}
                        {#if sortedClients.length === 0}
                            <p class="text-xs text-slate-500 dark:text-slate-400 p-3 italic text-center">Keine Klienten gefunden.</p>
                        {/if}
                    </div>
                {/if}
            </div>
        {/if}
    </div>
</div>
