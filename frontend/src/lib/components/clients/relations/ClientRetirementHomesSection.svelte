<script lang="ts">
    import { Building2, Plus, Link2Off } from "lucide-svelte";
    import { sortAlphabetical } from "$lib/utils/sortHelper";

    let {
        retirementHomes = [],
        onLinkHome,
        onOpenHome,
        onUnlinkHome
    } = $props<{
        retirementHomes: any[];
        onLinkHome: () => void;
        onOpenHome: (home: any) => void;
        onUnlinkHome: (homeId: string, name: string) => void;
    }>();

    let sortedHomes = $derived.by(() => {
        return sortAlphabetical(retirementHomes || [], (h: any) => h.name || '');
    });
</script>

<div class="bg-white dark:bg-slate-900 border border-neutral-200/80 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm flex flex-col border-l-4 border-l-teal-500">
    <div class="p-5 sm:p-6 border-b border-neutral-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-neutral-50/50 dark:bg-slate-800/40">
        <h3 class="text-base font-black text-neutral-900 dark:text-white flex items-center gap-2.5">
            <span class="w-9 h-9 flex items-center justify-center bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-xl border border-teal-500/20 shadow-xs">
                <Building2 class="w-4 h-4" />
            </span>
            <span>Pflegeheime</span>
            {#if sortedHomes.length > 0}
                <span class="text-xs font-bold px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                    {sortedHomes.length}
                </span>
            {/if}
        </h3>
        <button onclick={onLinkHome} aria-label="Pflegeheim verknüpfen" title="Pflegeheim verknüpfen" class="w-9 h-9 flex items-center justify-center rounded-xl bg-teal-600 hover:bg-teal-700 text-white shadow-xs transition-colors shrink-0 cursor-pointer min-h-[44px] min-w-[44px]">
            <Plus class="w-4 h-4" />
        </button>
    </div>
    <div class="p-5 sm:p-6 flex-1">
        {#if sortedHomes.length === 0}
            <div class="text-center py-8">
                <Building2 class="w-10 h-10 text-neutral-300 dark:text-slate-600 mx-auto mb-2" />
                <p class="text-neutral-400 dark:text-slate-500 text-sm mb-3">Keine Pflegeheime verknüpft.</p>
                <button onclick={onLinkHome} class="text-teal-600 dark:text-teal-400 hover:text-teal-800 text-sm font-bold transition-colors cursor-pointer min-h-[44px]">Jetzt verknüpfen &rarr;</button>
            </div>
        {:else}
            <ul class="space-y-3">
                {#each sortedHomes as home}
                    <div class="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-neutral-50/60 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 border border-neutral-200/70 dark:border-slate-700/70 transition-all group shadow-xs hover:shadow-md">
                        <button type="button" onclick={() => onOpenHome(home)} class="flex-1 text-left flex items-center gap-3 cursor-pointer min-w-0 min-h-[44px]">
                            <div class="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold text-lg shrink-0 border border-teal-500/20">
                                <Building2 class="w-5 h-5" />
                            </div>
                            <div class="flex-1 min-w-0">
                                <p class="text-sm font-bold text-neutral-900 dark:text-white truncate">{home.name}</p>
                                <p class="text-xs text-neutral-500 dark:text-slate-400 mt-1 truncate">{home.address || 'Keine Adresse hinterlegt'}</p>
                            </div>
                        </button>
                        <div class="flex items-center gap-1 shrink-0">
                            <button type="button" onclick={() => onOpenHome(home)} class="opacity-0 group-hover:opacity-100 transition-opacity text-teal-600 dark:text-teal-400 px-2.5 py-1 text-xs font-bold uppercase tracking-wider hover:bg-teal-50 dark:hover:bg-slate-700 rounded-lg hidden sm:block cursor-pointer min-h-[44px]">Details</button>
                            <button 
                                type="button" 
                                onclick={() => onUnlinkHome(home.id, home.name || 'Pflegeheim')}
                                class="p-2 text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                                title="Verknüpfung aufheben"
                                aria-label="Verknüpfung aufheben"
                            >
                                <Link2Off class="w-4 h-4 text-rose-500" />
                            </button>
                        </div>
                    </div>
                {/each}
            </ul>
        {/if}
    </div>
</div>
