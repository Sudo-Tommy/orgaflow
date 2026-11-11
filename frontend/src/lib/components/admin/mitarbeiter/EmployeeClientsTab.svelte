<script lang="ts">
    import { Search, Check } from 'lucide-svelte';
    import type { ClientRecord } from '$lib/types/orgaTypes';

    let {
        clientSearch = $bindable(''),
        selectedClientIds = $bindable<string[]>([]),
        syncAppointmentsWithClients = $bindable(true),
        filteredClients = [],
        isSubmitting = false,
        onSave,
        onToggleClient
    }: {
        clientSearch: string;
        selectedClientIds: string[];
        syncAppointmentsWithClients: boolean;
        filteredClients: ClientRecord[];
        isSubmitting: boolean;
        onSave: () => void;
        onToggleClient: (id: string) => void;
    } = $props();
</script>

<div class="space-y-4">
    <div class="flex items-center justify-between gap-3 flex-wrap">
        <div class="relative flex-1 min-w-48">
            <label for="search-assign-clients" class="sr-only">Klienten durchsuchen</label>
            <Search class="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input 
                id="search-assign-clients"
                type="text" 
                bind:value={clientSearch}
                placeholder="Klienten durchsuchen..." 
                class="w-full min-h-11 pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
        </div>
        <button
            type="button"
            onclick={onSave}
            disabled={isSubmitting}
            class="min-h-11 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
        >
            <Check class="w-4 h-4" />
            <span>Klienten-Zuweisung speichern</span>
        </button>
    </div>

    <label class="flex items-center gap-2.5 p-3 bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-xl cursor-pointer">
        <input 
            type="checkbox" 
            bind:checked={syncAppointmentsWithClients}
            class="w-4 h-4 text-indigo-600 rounded-md border-slate-300 focus:ring-indigo-500"
        />
        <span class="text-xs font-semibold text-indigo-900 dark:text-indigo-200">
            Offene und zukünftige Termine dieser Klienten automatisch dem Mitarbeiter zuweisen (Termin-Sync)
        </span>
    </label>

    <div class="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
        {#if filteredClients.length === 0}
            <div class="p-8 text-center text-slate-400 text-sm">Keine passenden Klienten gefunden.</div>
        {:else}
            {#each filteredClients as client (client.id)}
                {@const isSelected = selectedClientIds.includes(client.id)}
                <label class="flex items-center justify-between p-3.5 hover:bg-indigo-50/40 dark:hover:bg-slate-800/40 cursor-pointer transition-colors {isSelected ? 'bg-indigo-50/20 dark:bg-indigo-950/20' : ''}">
                    <div class="flex items-center gap-3 min-w-0">
                        <input 
                            type="checkbox" 
                            checked={isSelected} 
                            onchange={() => onToggleClient(client.id)} 
                            class="w-4 h-4 text-indigo-600 rounded-md border-slate-300 focus:ring-indigo-500"
                        />
                        <div class="min-w-0">
                            <p class="text-sm font-bold text-slate-900 dark:text-white truncate">
                                {client.name_last}, {client.name_first}
                            </p>
                            <p class="text-xs text-slate-500 truncate">
                                {client.street || ''} {client.housenr || ''}, {client.zip || ''} {client.city || ''}
                                {#if client.level_of_care}
                                    • PG {client.level_of_care}
                                {/if}
                            </p>
                        </div>
                    </div>
                    <span class="text-xs font-bold px-2.5 py-1 rounded-lg {isSelected ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}">
                        {isSelected ? 'Zugewiesen' : 'Nicht zugewiesen'}
                    </span>
                </label>
            {/each}
        {/if}
    </div>
</div>
