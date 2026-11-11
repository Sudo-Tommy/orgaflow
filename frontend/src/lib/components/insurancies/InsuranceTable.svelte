<script lang="ts">
    import { Users, Phone, Mail, ExternalLink, Edit3, Trash2 } from "lucide-svelte";
    import { getTypeBadgeClass } from "./insuranceHelper";

    let {
        insurancies,
        getClientCount,
        onOpenDetail,
        onOpenClients,
        onDelete
    } = $props<{
        insurancies: any[];
        getClientCount: (id: string) => number;
        onOpenDetail: (ins: any) => void;
        onOpenClients: (ins: any, e: Event) => void;
        onDelete: (ins: any, e: Event) => void;
    }>();
</script>

<div class="orga-table-container overflow-hidden">
    <div class="overflow-x-auto custom-scrollbar">
        <table class="orga-table min-w-180">
            <thead class="orga-table-head">
                <tr>
                    <th class="orga-table-th">Krankenkasse</th>
                    <th class="orga-table-th">Art</th>
                    <th class="orga-table-th">Standort</th>
                    <th class="orga-table-th">Kontakt</th>
                    <th class="orga-table-th text-center">Klienten</th>
                    <th class="orga-table-th text-right">Aktionen</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-slate-900">
                {#each insurancies as ins (ins.id)}
                    {@const clientCount = getClientCount(ins.id)}
                    <!-- svelte-ignore a11y_click_events_have_key_events -->
                    <!-- svelte-ignore a11y_no_static_element_interactions -->
                    <tr
                        onclick={() => onOpenDetail(ins)}
                        class="orga-table-row cursor-pointer group"
                    >
                        <td class="orga-table-td">
                            <div class="flex items-center gap-3">
                                <div class="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 font-bold flex items-center justify-center text-base shrink-0 border border-teal-200/60 dark:border-teal-800/60 shadow-2xs">
                                    🛡️
                                </div>
                                <div class="min-w-0">
                                    <p class="font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                                        {ins.name || 'Unbenannte Kasse'}
                                    </p>
                                    {#if ins.addition}
                                        <p class="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                            {ins.addition}
                                        </p>
                                    {/if}
                                </div>
                            </div>
                        </td>

                        <td class="orga-table-td whitespace-nowrap">
                            <span class="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border {getTypeBadgeClass(ins.type)}">
                                {ins.type || 'GKV'}
                            </span>
                        </td>

                        <td class="orga-table-td">
                            {#if ins.street || ins.city}
                                <div class="text-xs">
                                    {#if ins.street}<p class="font-medium text-slate-800 dark:text-slate-200 truncate">{ins.street}</p>{/if}
                                    <p class="text-slate-500 dark:text-slate-400 mt-0.5 truncate">{ins.zip || ''} {ins.city || ''}</p>
                                </div>
                            {:else}
                                <span class="text-xs text-slate-400 italic">-</span>
                            {/if}
                        </td>

                        <td class="orga-table-td" onclick={(e) => e.stopPropagation()}>
                            <div class="space-y-1 text-xs">
                                {#if ins.phone}
                                    <div class="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                                        <Phone class="w-3 h-3 shrink-0" />
                                        <a href="tel:{ins.phone}" class="hover:underline truncate">{ins.phone}</a>
                                    </div>
                                {/if}
                                {#if ins.email}
                                    <div class="flex items-center gap-1.5 text-teal-600 dark:text-teal-400">
                                        <Mail class="w-3 h-3 shrink-0" />
                                        <a href="mailto:{ins.email}" class="hover:underline truncate">{ins.email}</a>
                                    </div>
                                {/if}
                                {#if !ins.phone && !ins.email}
                                    <span class="text-slate-400 italic">-</span>
                                {/if}
                            </div>
                        </td>

                        <td class="orga-table-td text-center" onclick={(e) => e.stopPropagation()}>
                            {#if clientCount > 0}
                                <button
                                    type="button"
                                    onclick={(e) => onOpenClients(ins, e)}
                                    class="inline-flex items-center gap-1 text-xs font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900/60 px-2.5 py-1 rounded-lg border border-teal-200/60 dark:border-teal-800/60 transition-colors cursor-pointer min-h-[36px]"
                                    title="Klienten auflisten"
                                >
                                    <Users class="w-3 h-3" />
                                    <span>{clientCount}</span>
                                </button>
                            {:else}
                                <span class="text-xs text-slate-400">0</span>
                            {/if}
                        </td>

                        <td class="orga-table-td text-right" onclick={(e) => e.stopPropagation()}>
                            <div class="flex items-center justify-end gap-1">
                                {#if ins.street || ins.city}
                                    <a
                                        href="https://www.google.com/maps/search/?api=1&query={encodeURIComponent(`${ins.name || ''}, ${ins.street || ''}, ${ins.zip || ''} ${ins.city || ''}`)}"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        class="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
                                        title="Auf Google Maps anzeigen"
                                    >
                                        <ExternalLink class="w-4 h-4" />
                                    </a>
                                {/if}
                                <button
                                    type="button"
                                    onclick={() => onOpenDetail(ins)}
                                    class="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
                                    title="Bearbeiten"
                                >
                                    <Edit3 class="w-4 h-4" />
                                </button>
                                <button
                                    type="button"
                                    onclick={(e) => onDelete(ins, e)}
                                    class="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
                                    title="Löschen"
                                >
                                    <Trash2 class="w-4 h-4" />
                                </button>
                            </div>
                        </td>
                    </tr>
                {/each}
            </tbody>
        </table>
    </div>
</div>
