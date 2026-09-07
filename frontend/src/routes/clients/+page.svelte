<script lang="ts">
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import { useClientFilter } from "$lib/services/clientFilterService.svelte";
    import ClientDetailModal from "$lib/components/clients/ClientDetailModal.svelte";
    import { pb } from "$lib/services/pocketbase";
    import { onMount } from "svelte";

    const clientsStore = orgaStore.clients;
    const filterService = useClientFilter(() => clientsStore?.data || []);

    // svelte-ignore non_reactive_update
    let detailModal: ReturnType<typeof ClientDetailModal>;

    let clientGroups = $derived.by(() => {
        const active = filterService.filtered.filter(c => (c.status || 'Aktiv').toLowerCase() === 'aktiv');
        const inactive = filterService.filtered.filter(c => (c.status || '').toLowerCase() === 'inaktiv');
        const deceased = filterService.filtered.filter(c => (c.status || '').toLowerCase() === 'verstorben');
        const other = filterService.filtered.filter(c => {
            const s = (c.status || 'Aktiv').toLowerCase();
            return s !== 'aktiv' && s !== 'inaktiv' && s !== 'verstorben';
        });
        
        const groups = [];
        if (active.length > 0) groups.push({ title: "Aktive Klienten", clients: active });
        if (inactive.length > 0) groups.push({ title: "Inaktive Klienten", clients: inactive });
        if (deceased.length > 0) groups.push({ title: "Verstorbene Klienten", clients: deceased });
        if (other.length > 0) groups.push({ title: "Sonstige Klienten", clients: other });
        return groups;
    });

    onMount(() => {
        if (typeof localStorage !== 'undefined') {
            const stored = localStorage.getItem('global_company_id');
            if (stored) filterService.companyFilter = stored;
        }
        const handleSync = (e: any) => { filterService.companyFilter = e.detail; };
        window.addEventListener('global-company-changed', handleSync);
        return () => window.removeEventListener('global-company-changed', handleSync);
    });
</script>

<div class="orga-page-header animate-enter">
    <div>
        <h1 class="orga-page-title">Klienten</h1>
        <p class="orga-page-subtitle">Verwalten Sie hier alle Stammdaten und Pflegegrade.</p>
    </div>
    <a href="/clients/new" class="orga-button-primary inline-flex w-full sm:w-auto justify-center py-3 sm:py-2.5 mt-4 sm:mt-0">
        <svg class="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg>
        Neuer Klient
    </a>
</div>

<div class="orga-filter-bar animate-enter delay-100">
    <div class="flex-1">
        <label for="search" class="sr-only">Suchen</label>
        <input 
            id="search"
            type="text" 
            bind:value={filterService.searchQuery} 
            placeholder="Nach Name oder E-Mail suchen..." 
            class="orga-input-clear py-3 sm:py-2.5"
        />
    </div>
    <div class="md:w-64 shrink-0">
        <label for="status" class="sr-only">Status</label>
        <select id="status" bind:value={filterService.statusFilter} class="orga-input-clear py-3 sm:py-2.5 cursor-pointer">
            <option value="all">Alle Status anzeigen</option>
            <option value="Aktiv">Nur Aktive</option>
            <option value="Inaktiv">Nur Inaktive</option>
            <option value="Verstorben">Nur Verstorbene</option>
        </select>
    </div>
</div>

{#if clientsStore?.isLoading}
    <div class="text-center py-12 text-neutral-500 font-medium animate-pulse animate-enter delay-200">Lade Klienten-Daten...</div>
{:else if filterService.filtered.length === 0}
    <div class="orga-card-white p-12 text-center text-neutral-500 border border-neutral-100 shadow-sm animate-enter delay-200">
        <p class="text-lg font-bold text-neutral-900 mb-2">Keine Klienten gefunden</p>
        <p>Versuchen Sie, die Suchkriterien anzupassen, oder legen Sie einen neuen Klienten an.</p>
    </div>
{:else}
    <div class="space-y-6">
        {#each clientGroups as group}
            <div class="orga-card-white overflow-hidden animate-enter delay-200">
                <!-- Group Header -->
                <div class="bg-slate-50/90 dark:bg-slate-800/70 border-b border-slate-200/80 dark:border-slate-800 p-4">
                    <h2 class="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">{group.title} <span class="text-xs font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 px-2.5 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 shadow-2xs">{group.clients.length}</span></h2>
                </div>
                
                <!-- Desktop Table View -->
                <div class="hidden md:block overflow-x-auto custom-scrollbar">
                    <table class="w-full text-left border-collapse min-w-150">
                        <thead class="bg-slate-100/90 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700">
                            <tr>
                                <th class="p-3.5 sm:p-4 font-bold text-slate-700 dark:text-slate-200 text-xs uppercase tracking-wider">Klient</th>
                                <th class="p-3.5 sm:p-4 font-bold text-slate-700 dark:text-slate-200 text-xs uppercase tracking-wider">Kontakt</th>
                                <th class="p-3.5 sm:p-4 font-bold text-slate-700 dark:text-slate-200 text-xs uppercase tracking-wider">Notizen</th>
                                <th class="p-3.5 sm:p-4 font-bold text-slate-700 dark:text-slate-200 text-xs uppercase tracking-wider">Status</th>
                                <th class="p-3.5 sm:p-4 font-bold text-slate-700 dark:text-slate-200 text-xs uppercase tracking-wider">Pflegegrad</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-slate-900">
                            {#each group.clients as client (client.id)}
                                <tr onclick={() => detailModal?.open(client.id)} class="hover:bg-indigo-50/60 dark:hover:bg-slate-800/60 transition-colors group cursor-pointer">
                                    <td class="p-3.5 sm:p-4">
                                        <div class="flex items-center gap-3">
                                            <div class="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center text-sm shrink-0 shadow-inner">
                                                {(client.name_first?.charAt(0) || '')}{(client.name_last?.charAt(0) || '')}
                                            </div>
                                            <div>
                                                <p class="font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{client.name_first} {client.name_last}</p>
                                                <p class="text-xs text-slate-500 dark:text-slate-400 font-medium">{client.city || 'Kein Ort'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td class="p-3.5 sm:p-4 text-sm text-slate-700 dark:text-slate-200 font-medium">
                                        <p>{client.email || '-'}</p>
                                        <p class="text-xs text-slate-500 dark:text-slate-400 font-normal">{client.phone || ''}</p>
                                    </td>
                                    <td class="p-3.5 sm:p-4">
                                        {#if client.notes}
                                            <div class="bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 text-xs p-2 rounded-lg border border-amber-200/60 dark:border-amber-800/50 line-clamp-2 max-w-[16rem] leading-relaxed" title={client.notes}>
                                                {client.notes}
                                            </div>
                                        {:else}
                                            <span class="text-slate-300 dark:text-slate-600">-</span>
                                        {/if}
                                    </td>
                                    <td class="p-3.5 sm:p-4">
                                        <span class="px-2.5 py-1 text-xs font-bold rounded-full {(client.status || '').toLowerCase() === 'aktiv' ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'}">
                                            {(client.status || 'Unbekannt')}
                                        </span>
                                    </td>
                                    <td class="p-3.5 sm:p-4 text-sm font-bold text-slate-800 dark:text-slate-100">
                                        {client.level_of_care ? `Grad ${client.level_of_care}` : '-'}
                                    </td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>

                <!-- Mobile Card View -->
                <div class="block md:hidden divide-y divide-slate-100 dark:divide-slate-800">
                    {#each group.clients as client (client.id)}
                        <button type="button" onclick={() => detailModal?.open(client.id)} class="w-full text-left p-4 flex flex-col gap-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                            <div class="flex items-center justify-between">
                                <div class="flex items-center gap-3 min-w-0">
                                    <div class="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center text-base shrink-0 shadow-inner">
                                        {(client.name_first?.charAt(0) || '')}{(client.name_last?.charAt(0) || '')}
                                    </div>
                                    <div class="flex-1 min-w-0 sm:hidden">
                                        <h2 class="text-[15px] font-bold text-slate-900 dark:text-slate-100 truncate hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">{client.name_first} {client.name_last}</h2>
                                        <p class="text-xs text-slate-500 dark:text-slate-400 truncate font-medium">{client.city || 'Kein Ort'}</p>
                                    </div>
                                </div>
                                <span class="px-2 py-0.5 text-[10px] font-bold rounded-full shrink-0 {(client.status || '').toLowerCase() === 'aktiv' ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'}">
                                    {(client.status || 'Unbekannt')}
                                </span>
                            </div>
                            <div class="flex items-start justify-between gap-4 pl-13">
                                <div class="text-xs text-slate-600 dark:text-slate-300 flex-1 min-w-0">
                                {#if client.level_of_care}
                                    <p><span class="font-semibold text-slate-900 dark:text-slate-100">Pflegegrad:</span> {client.level_of_care}</p>
                                {/if}
                                {#if client.phone}
                                    <p class="mt-1"><span class="font-semibold text-slate-900 dark:text-slate-100">Telefon:</span> {client.phone}</p>
                                {/if}
                                {#if client.notes}
                                    <div class="mt-2 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 p-2 rounded-lg border border-amber-200/60 dark:border-amber-800/50">
                                        <p class="line-clamp-2 leading-relaxed">{client.notes}</p>
                                    </div>
                                {/if}
                                </div>
                                <span class="text-indigo-600 dark:text-indigo-400 text-xs font-bold shrink-0 self-center">&rarr;</span>
                            </div>
                        </button>
                    {/each}
                </div>
            </div>
        {/each}
    </div>
{/if}

<ClientDetailModal bind:this={detailModal} />