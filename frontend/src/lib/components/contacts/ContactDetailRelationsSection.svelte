<script lang="ts">
    export interface RelationItem {
        id: string;
        badge: string;
        badgeClass: string;
        title: string;
        subtitle: string;
        caregiver?: boolean;
    }

    interface Props {
        clientItems: RelationItem[];
        homeItems: RelationItem[];
        mailingItems: RelationItem[];
    }

    let { clientItems, homeItems, mailingItems }: Props = $props();
</script>

{#snippet relationSection(title: string, items: RelationItem[], emptyText: string)}
    <div class="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
        <p class="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-3">{title} ({items.length})</p>
        {#if items.length > 0}
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {#each items as item (item.id)}
                    <div class="bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/80 p-3 rounded-2xl shadow-2xs flex items-center justify-between gap-3">
                        <div class="flex items-center gap-3 min-w-0">
                            <div class="w-9 h-9 rounded-xl {item.badgeClass} flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                                {item.badge}
                            </div>
                            <div class="min-w-0">
                                <p class="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{item.title}</p>
                                {#if item.subtitle}
                                    <p class="text-[11px] text-slate-500 dark:text-slate-400 truncate">{item.subtitle}</p>
                                {/if}
                            </div>
                        </div>
                        {#if item.caregiver}
                            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 shrink-0">
                                Betreuer
                            </span>
                        {/if}
                    </div>
                {/each}
            </div>
        {:else}
            <p class="text-xs text-slate-500 dark:text-slate-400 italic py-1">{emptyText}</p>
        {/if}
    </div>
{/snippet}

<div class="space-y-1">
    {@render relationSection("Zugeordnete Klienten", clientItems, "Dieser Kontakt ist noch keinem Klienten zugeordnet.")}
    {@render relationSection("Zugeordnete Pflegeheime & Einrichtungen", homeItems, "Dieser Kontakt ist keinem Pflegeheim zugeordnet.")}
    {@render relationSection("Im CC-Verteiler von Klienten", mailingItems, "Dieser Kontakt ist in keinem E-Mail-Verteiler eingetragen.")}
</div>
