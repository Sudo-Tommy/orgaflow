<script lang="ts">
    import { Search, UserCheck, X } from "lucide-svelte";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";

    interface Props {
        currentClientId?: string;
        onSelect: (clientId: string) => void;
        onClose: () => void;
    }

    let { currentClientId, onSelect, onClose }: Props = $props();

    let searchQuery = $state("");

    let allClients = $derived((orgaStore.clients?.data || []) as any[]);

    let sortedClients = $derived.by(() => {
        return [...allClients].sort((a, b) => {
            const nameA = `${a.name_last || ''} ${a.name_first || ''}`.trim();
            const nameB = `${b.name_last || ''} ${b.name_first || ''}`.trim();
            return nameA.localeCompare(nameB, 'de', { sensitivity: 'base' });
        });
    });

    let filteredClients = $derived.by(() => {
        if (!searchQuery.trim()) return sortedClients.slice(0, 8);
        const q = searchQuery.toLowerCase().trim();
        return sortedClients.filter(c => {
            const name = `${c.name_first || ''} ${c.name_last || ''}`.toLowerCase();
            const city = (c.city || '').toLowerCase();
            const care = (c.level_of_care || '').toLowerCase();
            return name.includes(q) || city.includes(q) || care.includes(q);
        }).slice(0, 12);
    });
</script>

<div class="p-3 bg-slate-50 dark:bg-slate-800/90 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/60 space-y-2 animate-enter">
    <div class="flex items-center justify-between">
        <span class="text-xs font-bold text-slate-700 dark:text-slate-300">Klient auswählen:</span>
        <button type="button" onclick={onClose} class="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer" title="Schließen">
            <X class="w-4 h-4" />
        </button>
    </div>

    <div class="relative">
        <input
            type="text"
            bind:value={searchQuery}
            placeholder="Name, Ort oder Pflegegrad suchen..."
            class="orga-input-clear min-h-10 py-1.5 pl-8 pr-3 text-xs w-full bg-white dark:bg-slate-900"
        />
        <Search class="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
    </div>

    <div class="space-y-1 pt-1 max-h-60 overflow-y-auto">
        <button
            type="button"
            onclick={() => onSelect("")}
            class="w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-transparent hover:border-rose-200 cursor-pointer flex items-center gap-2"
        >
            <span>🚫 Kein Klient zuordnen</span>
        </button>

        {#each filteredClients as c (c.id)}
            {@const isSelected = currentClientId === c.id}
            <button
                type="button"
                onclick={() => onSelect(c.id)}
                class="w-full text-left p-2 rounded-xl text-xs flex items-center justify-between gap-2 cursor-pointer border transition-colors {
                    isSelected
                        ? 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-300 dark:border-emerald-800 font-bold text-emerald-900 dark:text-emerald-100'
                        : 'bg-white dark:bg-slate-900 border-slate-200/60 dark:border-slate-700 hover:bg-emerald-50/50 dark:hover:bg-slate-700/80 text-slate-800 dark:text-slate-200'
                }"
            >
                <div class="min-w-0">
                    <p class="font-bold truncate">{c.name_first} {c.name_last}</p>
                    <p class="text-[10px] text-slate-500 truncate mt-0.5">
                        {[c.zip, c.city, c.street].filter(Boolean).join(' ')}
                    </p>
                </div>
                {#if c.level_of_care}
                    <span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-50 text-purple-700 shrink-0">
                        PG {c.level_of_care}
                    </span>
                {/if}
            </button>
        {/each}
    </div>
</div>
