<script lang="ts">
    import { orgaStore } from "$lib/stores/orgaStore.svelte";

    interface Props {
        contacts: string[];
        linkedClients: string[];
        isLoading: boolean;
        onToggleContact: (id: string) => void;
        onToggleClient: (id: string) => void;
    }

    let { contacts, linkedClients, isLoading, onToggleContact, onToggleClient }: Props = $props();
</script>

<div class="space-y-4">
    <div class="pt-2">
        <span class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Ansprechpartner vor Ort</span>
        <div class="border border-slate-200 dark:border-slate-700 rounded-xl p-2 bg-white dark:bg-slate-900 space-y-1">
            {#each orgaStore.contacts?.data || [] as c}
                <label class="flex items-center gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-lg cursor-pointer transition-colors">
                    <input 
                        type="checkbox" 
                        checked={contacts.includes(c.id)} 
                        onchange={() => onToggleContact(c.id)} 
                        class="w-4 h-4 text-indigo-600 border-slate-300 dark:border-slate-600 rounded focus:ring-indigo-500 cursor-pointer" 
                        disabled={isLoading} 
                    />
                    <div>
                        <p class="text-sm font-bold text-slate-900 dark:text-slate-100">{c.name_first} {c.name_last}</p>
                        {#if c.company_name}
                            <p class="text-xs text-slate-500 dark:text-slate-400">{c.company_name}</p>
                        {/if}
                    </div>
                </label>
            {/each}
            {#if (orgaStore.contacts?.data || []).length === 0}
                <p class="text-sm text-slate-500 dark:text-slate-400 p-3 italic">Keine Kontakte im System vorhanden.</p>
            {/if}
        </div>
    </div>

    <div class="pt-2">
        <span class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Verknüpfte Klienten</span>
        <div class="border border-slate-200 dark:border-slate-700 rounded-xl p-2 bg-white dark:bg-slate-900 space-y-1">
            {#each orgaStore.clients?.data || [] as c}
                <label class="flex items-center gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-lg cursor-pointer transition-colors">
                    <input 
                        type="checkbox" 
                        checked={linkedClients.includes(c.id)} 
                        onchange={() => onToggleClient(c.id)} 
                        class="w-4 h-4 text-indigo-600 border-slate-300 dark:border-slate-600 rounded focus:ring-indigo-500 cursor-pointer" 
                        disabled={isLoading} 
                    />
                    <div>
                        <p class="text-sm font-bold text-slate-900 dark:text-slate-100">{c.name_first} {c.name_last}</p>
                        <p class="text-xs text-slate-500 dark:text-slate-400">{c.city || ''}</p>
                    </div>
                </label>
            {/each}
            {#if (orgaStore.clients?.data || []).length === 0}
                <p class="text-sm text-slate-500 dark:text-slate-400 p-3 italic">Keine Klienten im System vorhanden.</p>
            {/if}
        </div>
    </div>
</div>
