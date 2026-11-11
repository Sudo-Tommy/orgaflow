<script lang="ts">
    import { Search, Check, Lock } from 'lucide-svelte';
    import type { ContactRecord } from '$lib/types/orgaTypes';

    let {
        contactSearch = $bindable(''),
        selectedContactIds = $bindable<string[]>([]),
        filteredContacts = [],
        isSubmitting = false,
        onSave,
        onToggleContact
    }: {
        contactSearch: string;
        selectedContactIds: string[];
        filteredContacts: ContactRecord[];
        isSubmitting: boolean;
        onSave: () => void;
        onToggleContact: (id: string) => void;
    } = $props();
</script>

<div class="space-y-4">
    <div class="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
        <Lock class="w-4 h-4 shrink-0 mt-0.5" />
        <span>
            <strong>DSGVO & GoBD Schutz:</strong> Zugewiesene Kontakte werden für Mitarbeiter mit einem Schloss-Symbol als <em>schreibgeschützt</em> dargestellt. Nur selbst angelegte Kontakte dürfen von Mitarbeitern editiert werden.
        </span>
    </div>

    <div class="flex items-center justify-between gap-3 flex-wrap">
        <div class="relative flex-1 min-w-48">
            <label for="search-assign-contacts" class="sr-only">Kontakte durchsuchen</label>
            <Search class="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input 
                id="search-assign-contacts"
                type="text" 
                bind:value={contactSearch}
                placeholder="Kontakte durchsuchen..." 
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
            <span>Kontakt-Zuweisung speichern</span>
        </button>
    </div>

    <div class="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
        {#if filteredContacts.length === 0}
            <div class="p-8 text-center text-slate-400 text-sm">Keine passenden Kontakte gefunden.</div>
        {:else}
            {#each filteredContacts as contact (contact.id)}
                {@const isSelected = selectedContactIds.includes(contact.id)}
                <label class="flex items-center justify-between p-3.5 hover:bg-indigo-50/40 dark:hover:bg-slate-800/40 cursor-pointer transition-colors {isSelected ? 'bg-indigo-50/20 dark:bg-indigo-950/20' : ''}">
                    <div class="flex items-center gap-3 min-w-0">
                        <input 
                            type="checkbox" 
                            checked={isSelected} 
                            onchange={() => onToggleContact(contact.id)} 
                            class="w-4 h-4 text-indigo-600 rounded-md border-slate-300 focus:ring-indigo-500"
                        />
                        <div class="min-w-0">
                            <p class="text-sm font-bold text-slate-900 dark:text-white truncate">
                                {#if contact.company_name}
                                    <span class="text-indigo-600 dark:text-indigo-400">[{contact.company_name}]</span>
                                {/if}
                                {contact.name_last}, {contact.name_first}
                            </p>
                            <p class="text-xs text-slate-500 truncate">
                                {contact.phone || contact.email || 'Keine Direkt-Kontaktdaten hinterlegt'} • {contact.city || ''}
                            </p>
                        </div>
                    </div>
                    <span class="text-xs font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 {isSelected ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}">
                        {#if isSelected}
                            <Lock class="w-3 h-3" />
                            <span>Zugewiesen (Read-Only)</span>
                        {:else}
                            <span>Nicht zugewiesen</span>
                        {/if}
                    </span>
                </label>
            {/each}
        {/if}
    </div>
</div>
