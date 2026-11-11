<script lang="ts">
    interface Props {
        linkedClients: any[];
    }

    let { linkedClients }: Props = $props();
</script>

<div class="pt-3 border-t border-slate-100 dark:border-slate-800">
    <div class="flex items-center justify-between mb-2">
        <span class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <span>👥</span> Versicherte Klienten ({linkedClients.length})
        </span>
    </div>
    {#if linkedClients.length === 0}
        <p class="text-xs text-slate-400 dark:text-slate-500 italic bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800/60">
            Aktuell sind keine Klienten dieser Krankenkasse zugeordnet.
        </p>
    {:else}
        <div class="space-y-1.5 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/60">
            {#each linkedClients as client (client.id)}
                <div class="flex items-center justify-between bg-white dark:bg-slate-800 p-2 rounded-lg text-xs shadow-2xs border border-slate-200/60 dark:border-slate-700/60">
                    <div class="flex items-center gap-2 min-w-0">
                        <div class="w-6 h-6 rounded-full bg-teal-100 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300 font-bold flex items-center justify-center text-[10px] shrink-0">
                            {(client.name_first?.charAt(0) || '')}{(client.name_last?.charAt(0) || '')}
                        </div>
                        <span class="font-bold text-slate-800 dark:text-slate-100 truncate">
                            {client.name_first || ''} {client.name_last || 'Klient'}
                        </span>
                        {#if client.insurance_nr}
                            <span class="text-[10px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/60 px-1.5 py-0.2 rounded">
                                {client.insurance_nr}
                            </span>
                        {/if}
                    </div>
                    <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full {client.status === 'Inaktiv' ? 'bg-neutral-100 text-neutral-600 dark:bg-slate-700 dark:text-slate-300' : client.status === 'Verstorben' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'}">
                        {client.status || 'Aktiv'}
                    </span>
                </div>
            {/each}
        </div>
    {/if}
</div>
