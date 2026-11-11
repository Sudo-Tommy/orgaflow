<script lang="ts">
    import { Building2, Search } from "lucide-svelte";

    let {
        isOpen = $bindable(false),
        contacts = [],
        searchQuery = $bindable(""),
        onSelect = (_contact: any) => {}
    } = $props<{
        isOpen: boolean;
        contacts: any[];
        searchQuery: string;
        onSelect: (contact: any) => void;
    }>();
</script>

<div class="space-y-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
    <div class="flex items-center justify-between">
        <span class="text-[11px] font-bold text-slate-500 dark:text-slate-400">Ziel aus Kontakten übernehmen (Arzt, Praxis)</span>
        {#if isOpen}
            <button type="button" onclick={() => isOpen = false} class="text-[11px] text-slate-400 hover:text-slate-600 cursor-pointer">Schließen</button>
        {/if}
    </div>
    {#if !isOpen}
        <button
            type="button"
            onclick={() => isOpen = true}
            class="w-full text-left p-2.5 min-h-11 bg-blue-50/50 dark:bg-blue-950/30 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-2xl border border-blue-200/70 dark:border-blue-900/50 text-xs font-bold text-blue-700 dark:text-blue-300 flex items-center gap-2 cursor-pointer transition-colors touch-manipulation"
        >
            <Building2 class="w-4 h-4 text-blue-500 shrink-0" />
            <span>+ Arzt / Praxis / Kontakt durchsuchen...</span>
        </button>
    {:else}
        <div class="space-y-1.5 p-2 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-blue-200/80 dark:border-blue-900/60">
            <div class="relative">
                <input
                    type="text"
                    bind:value={searchQuery}
                    placeholder="Name, Fachrichtung oder Stadt..."
                    class="orga-input-clear min-h-10 py-1.5 pl-8 pr-3 text-xs w-full bg-white dark:bg-slate-900"
                />
                <Search class="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>
            <div class="space-y-1 pt-1">
                {#each contacts as contact (contact.id)}
                    <button
                        type="button"
                        onclick={() => onSelect(contact)}
                        class="w-full text-left p-2 min-h-11 bg-white dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-slate-700/80 rounded-xl border border-slate-200/60 dark:border-slate-700 text-xs flex items-center justify-between gap-2 cursor-pointer transition-colors touch-manipulation"
                    >
                        <div class="min-w-0">
                            <p class="font-bold text-slate-900 dark:text-slate-100 truncate">
                                {#if contact.company_name}{contact.company_name} - {/if}
                                {contact.name_first} {contact.name_last}
                            </p>
                            <p class="text-[10px] text-slate-500 truncate mt-0.5">
                                {[contact.street, contact.housenr, contact.zip, contact.city].filter(Boolean).join(' ')}
                            </p>
                        </div>
                        {#if contact.category}
                            <span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-50 text-blue-700 shrink-0">
                                {contact.category}
                            </span>
                        {/if}
                    </button>
                {/each}
            </div>
        </div>
    {/if}
</div>
