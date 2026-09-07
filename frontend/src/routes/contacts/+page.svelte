<script lang="ts">
    import { onMount } from "svelte";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import ContactModal from "$lib/components/contacts/ContactModal.svelte";
    import RetirementHomeModal from "$lib/components/RetirementHomeModal.svelte";
    import ClientPortalAccessModal from "$lib/components/portal/ClientPortalAccessModal.svelte";
    import { rbacService } from "$lib/services/rbacService.svelte";

    let activeTab = $state<"contacts" | "homes">("contacts");
    let searchQuery = $state("");

    onMount(async () => {
        await Promise.allSettled([
            orgaStore.contacts.init(),
            orgaStore.retirement_homes.init()
        ]);
    });

    // svelte-ignore non_reactive_update
    let contactModal: ReturnType<typeof ContactModal>;
    // svelte-ignore non_reactive_update
    let homeModal: ReturnType<typeof RetirementHomeModal>;
    // svelte-ignore non_reactive_update
    let portalAccessModal: ReturnType<typeof ClientPortalAccessModal>;

    // Dynamischer Filter für alle normalen Kontaktpersonen (Angehörige, Betreuer etc.)
    let filteredContacts = $derived.by(() => {
        const list = orgaStore.contacts?.data || [];
        if (!searchQuery) return list;
        const q = searchQuery.toLowerCase();
        return list.filter(c => 
            (c.name_first || '').toLowerCase().includes(q) ||
            (c.name_last || '').toLowerCase().includes(q) ||
            (c.company_name || '').toLowerCase().includes(q) ||
            (c.email || '').toLowerCase().includes(q) ||
            (c.phone || '').toLowerCase().includes(q)
        );
    });

    // Dynamischer Filter für alle Einrichtungen/Pflegeheime
    let filteredHomes = $derived.by(() => {
        const list = orgaStore.retirement_homes?.data || [];
        if (!searchQuery) return list;
        const q = searchQuery.toLowerCase();
        return list.filter(h => 
            (h.name || '').toLowerCase().includes(q) ||
            (h.address || '').toLowerCase().includes(q) ||
            (h.address_addition || '').toLowerCase().includes(q)
        );
    });
</script>

<div class="orga-page-header animate-enter">
    <div>
        <h1 class="orga-page-title">Kontakte & Einrichtungen</h1>
        <p class="orga-page-subtitle">Zentrale Verwaltung für Ansprechpartner, Angehörige und Pflegeheime.</p>
    </div>
    <div class="flex flex-col sm:flex-row items-center gap-3 mt-4 sm:mt-0 w-full sm:w-auto">
        {#if activeTab === 'contacts'}
            <button onclick={() => contactModal?.open()} class="orga-button-primary inline-flex w-full sm:w-auto justify-center py-3 sm:py-2.5">
                <svg class="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg>
                Neuer Kontakt
            </button>
        {:else}
            <button onclick={() => homeModal?.open()} class="orga-button-primary inline-flex w-full sm:w-auto justify-center py-3 sm:py-2.5">
                <svg class="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg>
                Neues Pflegeheim
            </button>
        {/if}
    </div>
</div>

<div class="orga-filter-bar animate-enter delay-100 items-center">
    <!-- Tab Switcher -->
    <div class="flex bg-neutral-100 p-1 rounded-lg border border-neutral-200 shadow-inner shrink-0 w-full md:w-auto">
        <button onclick={() => activeTab = 'contacts'} class="flex-1 md:flex-none px-4 py-2 sm:py-1.5 text-sm font-bold rounded-md transition-colors {activeTab === 'contacts' ? 'bg-white shadow-sm text-indigo-600' : 'text-neutral-500 hover:text-neutral-700'}">Kontaktpersonen</button>
        <button onclick={() => activeTab = 'homes'} class="flex-1 md:flex-none px-4 py-2 sm:py-1.5 text-sm font-bold rounded-md transition-colors {activeTab === 'homes' ? 'bg-white shadow-sm text-indigo-600' : 'text-neutral-500 hover:text-neutral-700'}">Pflegeheime</button>
    </div>
    
    <!-- Suchfeld -->
    <div class="flex-1 w-full mt-4 md:mt-0">
        <label for="search-contacts" class="sr-only">Suchen</label>
        <input 
            id="search-contacts"
            type="text" 
            bind:value={searchQuery} 
            placeholder={activeTab === 'contacts' ? "Nach Name, E-Mail oder Rolle suchen..." : "Nach Name oder Stadt suchen..."} 
        class="orga-input-clear py-3 sm:py-2.5"
        />
    </div>
</div>

<div class="animate-enter delay-200">
    {#if activeTab === 'contacts'}
        <!-- === REITER: KONTAKTE === -->
        {#if orgaStore.contacts?.isLoading}
            <div class="text-center py-12 text-neutral-500 font-medium animate-pulse">Lade Kontakte...</div>
        {:else if filteredContacts.length === 0}
            <div class="orga-card-white p-12 text-center text-neutral-500 border border-neutral-100 shadow-sm">
                <p class="text-lg font-bold text-neutral-900 mb-2">Keine Kontakte gefunden</p>
                <p>Passen Sie die Suche an oder legen Sie einen neuen Kontakt an.</p>
            </div>
        {:else}
            <div class="orga-card-white overflow-hidden">
                <!-- Desktop Table View -->
                <div class="hidden md:block overflow-x-auto custom-scrollbar">
                    <table class="w-full text-left border-collapse min-w-150">
                        <thead class="bg-slate-100/90 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700">
                            <tr>
                                <th class="p-3.5 sm:p-4 font-bold text-slate-700 dark:text-slate-200 text-xs uppercase tracking-wider">Name</th>
                                <th class="p-3.5 sm:p-4 font-bold text-slate-700 dark:text-slate-200 text-xs uppercase tracking-wider">Firma</th>
                                <th class="p-3.5 sm:p-4 font-bold text-slate-700 dark:text-slate-200 text-xs uppercase tracking-wider">Kontakt</th>
                                <th class="p-3.5 sm:p-4 font-bold text-slate-700 dark:text-slate-200 text-xs uppercase tracking-wider">Adresse</th>
                                <th class="p-3.5 sm:p-4 font-bold text-slate-700 dark:text-slate-200 text-xs uppercase tracking-wider text-right">Portal</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-slate-900">
                            {#each filteredContacts as contact (contact.id)}
                                <tr onclick={() => contactModal?.open(contact)} class="hover:bg-indigo-50/60 dark:hover:bg-slate-800/60 transition-colors group cursor-pointer">
                                    <td class="p-3.5 sm:p-4">
                                        <div class="flex items-center gap-3">
                                            <div class="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold flex items-center justify-center text-sm shrink-0 shadow-inner">
                                                {(contact.name_first?.charAt(0) || contact.company_name?.charAt(0) || '?').toUpperCase()}
                                            </div>
                                            <div>
                                                <p class="font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                                    {#if contact.name_first || contact.name_last}{contact.name_first} {contact.name_last}{:else if contact.company_name}{contact.company_name}{:else}Unbekannt{/if}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td class="p-3.5 sm:p-4 text-sm text-slate-700 dark:text-slate-200 font-medium">
                                        {#if contact.company_name && (contact.name_first || contact.name_last)}
                                            {contact.company_name}
                                        {:else}
                                            -
                                        {/if}
                                    </td>
                                    <td class="p-3.5 sm:p-4 text-sm text-slate-700 dark:text-slate-200 font-medium">
                                        {#if contact.phone}
                                            <div class="flex items-center gap-1.5 truncate"><span class="text-indigo-500">📞</span> {contact.phone}</div>
                                        {/if}
                                        {#if contact.email}
                                            <div class="flex items-center gap-1.5 truncate mt-1"><span class="text-emerald-500">✉️</span> {contact.email}</div>
                                        {/if}
                                        {#if !contact.phone && !contact.email}
                                            -
                                        {/if}
                                    </td>
                                    <td class="p-3.5 sm:p-4 text-sm text-slate-700 dark:text-slate-200 font-medium">
                                        {#if contact.street || contact.city}
                                            <p>{contact.street} {contact.housenr}</p>
                                            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{contact.zip} {contact.city}</p>
                                        {:else}
                                            -
                                        {/if}
                                    </td>
                                    <td class="p-3.5 sm:p-4 text-right" onclick={(e) => e.stopPropagation()}>
                                        <button type="button" onclick={() => portalAccessModal?.open(contact, 'contact')} class="orga-button-ghost py-1.5 px-3 text-xs text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 border border-indigo-200 dark:border-indigo-800 inline-flex items-center gap-1.5 shadow-xs font-bold" title="Portal-Zugangskarte für diesen Kontakt öffnen">
                                            <span>🪪</span> <span class="hidden lg:inline">Portal</span>
                                        </button>
                                    </td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>

                <!-- Mobile List View -->
                <div class="block md:hidden divide-y divide-neutral-100">
                    {#each filteredContacts as contact (contact.id)}
                        <div role="button" tabindex="0" onclick={() => contactModal?.open(contact)} onkeydown={(e) => { if (e.key === 'Enter') contactModal?.open(contact); }} class="w-full text-left p-4 flex flex-col gap-3 hover:bg-neutral-50/50 transition-colors cursor-pointer">
                            <div class="flex items-center justify-between">
                                <div class="flex items-center gap-3 min-w-0">
                                    <div class="w-10 h-10 rounded-full bg-neutral-100 text-neutral-600 font-bold flex items-center justify-center text-base shrink-0 shadow-inner">
                                        {(contact.name_first?.charAt(0) || contact.company_name?.charAt(0) || '?').toUpperCase()}
                                    </div>
                                    <div class="flex-1 min-w-0">
                                        <h2 class="text-[15px] font-bold text-neutral-900 truncate hover:text-indigo-600 transition-colors">
                                            {#if contact.name_first || contact.name_last}{contact.name_first} {contact.name_last}{:else if contact.company_name}{contact.company_name}{:else}Unbekannt{/if}
                                        </h2>
                                        {#if contact.company_name && (contact.name_first || contact.name_last)}
                                            <p class="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider mt-0.5 truncate">{contact.company_name}</p>
                                        {:else}
                                            <p class="text-[10px] text-neutral-500 truncate mt-0.5">{contact.email || contact.phone || 'Keine Kontaktdaten'}</p>
                                        {/if}
                                    </div>
                                </div>
                            </div>
                            <div class="flex items-center justify-between gap-3 text-xs mt-1 pt-3 border-t border-neutral-100 overflow-hidden">
                                <div class="flex flex-row gap-4 overflow-hidden min-w-0">
                                    {#if contact.phone}
                                        <div class="flex items-center gap-1.5 text-neutral-600 truncate shrink-0">
                                            <span class="text-indigo-400">📞</span> {contact.phone}
                                        </div>
                                    {/if}
                                    {#if contact.email}
                                        <div class="flex items-center gap-1.5 text-neutral-600 truncate">
                                            <span class="text-emerald-400">✉️</span> {contact.email}
                                        </div>
                                    {/if}
                                </div>
                                <button type="button" onclick={(e) => { e.stopPropagation(); portalAccessModal?.open(contact, 'contact'); }} class="orga-button-ghost py-1 px-2.5 text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 inline-flex items-center gap-1 font-bold shrink-0 shadow-xs">
                                    <span>🪪</span> <span>Portal</span>
                                </button>
                            </div>
                        </div>
                    {/each}
                </div>
            </div>
        {/if}

    {:else}
        <!-- === REITER: PFLEGEHEIME === -->
        {#if orgaStore.retirement_homes?.isLoading}
            <div class="text-center py-12 text-neutral-500 font-medium animate-pulse">Lade Einrichtungen...</div>
        {:else if filteredHomes.length === 0}
            <div class="orga-card-white p-12 text-center text-neutral-500 border border-neutral-100 shadow-sm">
                <p class="text-lg font-bold text-neutral-900 mb-2">Keine Pflegeheime gefunden</p>
                <p>Passen Sie die Suche an oder legen Sie ein neues Pflegeheim an.</p>
            </div>
        {:else}
            <div class="orga-card-white overflow-hidden">
                <!-- Desktop Table View -->
                <div class="hidden md:block overflow-x-auto custom-scrollbar">
                    <table class="w-full text-left border-collapse min-w-150">
                        <thead class="bg-neutral-50/50 border-b border-neutral-100">
                            <tr>
                                <th class="p-4 font-bold text-neutral-500 text-xs uppercase tracking-wider">Einrichtung</th>
                                <th class="p-4 font-bold text-neutral-500 text-xs uppercase tracking-wider">Adresse</th>
                                <th class="p-4 font-bold text-neutral-500 text-xs uppercase tracking-wider">Ansprechpartner</th>
                                <th class="p-4 font-bold text-neutral-500 text-xs uppercase tracking-wider text-right">Schnellzugriff</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-neutral-50">
                            {#each filteredHomes as home (home.id)}
                                <tr onclick={() => homeModal?.open(home)} class="hover:bg-indigo-50 transition-colors group cursor-pointer">
                                    <td class="p-4">
                                        <div class="flex items-center gap-3">
                                            <div class="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-500 font-bold flex items-center justify-center text-lg shrink-0 shadow-sm">
                                                🏥
                                            </div>
                                            <div>
                                                <p class="font-bold text-neutral-900 group-hover:text-indigo-600 transition-colors">{home.name || 'Unbekannt'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td class="p-4 text-sm text-neutral-600">
                                        <p>{home.address || '-'}</p>
                                        {#if home.address_addition}<p class="text-xs text-neutral-400 mt-0.5">{home.address_addition}</p>{/if}
                                    </td>
                                    <td class="p-4">
                                        {#if home.expand?.contacts && home.expand.contacts.length > 0}
                                            <div class="flex -space-x-2 overflow-hidden">
                                                {#each home.expand.contacts.slice(0, 3) as hc}
                                                    <div class="flex h-8 w-8 rounded-full ring-2 ring-white bg-neutral-200 items-center justify-center text-[10px] font-bold text-neutral-700" title="{hc.name_first} {hc.name_last}">
                                                        {(hc.name_first?.charAt(0) || hc.company_name?.charAt(0) || '?').toUpperCase()}
                                                    </div>
                                                {/each}
                                                {#if home.expand.contacts.length > 3}
                                                    <div class="flex h-8 w-8 rounded-full ring-2 ring-white bg-neutral-100 items-center justify-center text-[10px] font-bold text-neutral-500">
                                                        +{home.expand.contacts.length - 3}
                                                    </div>
                                                {/if}
                                            </div>
                                        {:else}
                                            <p class="text-xs text-neutral-400 italic">Keine</p>
                                        {/if}
                                    </td>
                                    <td class="p-4">
                                        <div class="flex items-center justify-end gap-1 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                                            {#if home.phone}
                                                <a href="tel:{home.phone}" onclick={(e) => e.stopPropagation()} class="p-2 text-neutral-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Anrufen"><span class="text-lg">📞</span></a>
                                            {/if}
                                            {#if home.email}
                                                <a href="mailto:{home.email}" onclick={(e) => e.stopPropagation()} class="p-2 text-neutral-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="E-Mail senden"><span class="text-lg">✉️</span></a>
                                            {/if}
                                            {#if home.website}
                                                <a href={home.website} target="_blank" rel="noopener noreferrer" onclick={(e) => e.stopPropagation()} class="p-2 text-neutral-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Webseite öffnen"><span class="text-lg">🌐</span></a>
                                            {/if}
                                            {#if home.address}
                                                <a href="https://www.google.com/maps/search/?api=1&query={encodeURIComponent(`${home.name}, ${home.address}`)}" target="_blank" rel="noopener noreferrer" onclick={(e) => e.stopPropagation()} class="p-2 text-neutral-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="In Google Maps öffnen"><span class="text-lg">🗺️</span></a>
                                            {/if}
                                        </div>
                                    </td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>

                <!-- Mobile List View -->
                <div class="block md:hidden divide-y divide-neutral-100">
                    {#each filteredHomes as home (home.id)}
                        <button type="button" onclick={() => homeModal?.open(home)} class="w-full text-left p-4 flex flex-col gap-3 hover:bg-neutral-50/50 transition-colors">
                            <div class="flex items-center justify-between">
                                <div class="flex items-center gap-3 min-w-0">
                                    <div class="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-500 font-bold flex items-center justify-center text-lg shrink-0 shadow-sm">
                                        🏥
                                    </div>
                                    <div class="flex-1 min-w-0">
                                        <h2 class="text-[15px] font-bold text-neutral-900 truncate hover:text-indigo-600 transition-colors">{home.name || 'Unbekannt'}</h2>
                                        <p class="text-[10px] font-semibold text-neutral-500 mt-0.5 truncate">{home.address || 'Keine Adresse'}</p>
                                    </div>
                                </div>
                            </div>
                            <div class="flex items-center justify-between gap-4 pl-13 pt-2 border-t border-neutral-100 mt-2">
                                {#if home.expand?.contacts && home.expand.contacts.length > 0}
                                    <div class="flex items-center gap-2">
                                        <p class="text-[10px] text-neutral-500 font-semibold uppercase tracking-wider">Ansprechpartner:</p>
                                        <span class="text-xs font-bold text-neutral-700">{home.expand.contacts.length}</span>
                                    </div>
                                {:else}
                                    <p class="text-[10px] text-neutral-400 italic">Keine Ansprechpartner</p>
                                {/if}
                                <div class="flex items-center gap-1">
                                    {#if home.phone}
                                        <a href="tel:{home.phone}" onclick={(e) => e.stopPropagation()} class="p-1.5 text-neutral-400 hover:text-indigo-600 transition-colors" title="Anrufen"><span class="text-base">📞</span></a>
                                    {/if}
                                    {#if home.email}
                                        <a href="mailto:{home.email}" onclick={(e) => e.stopPropagation()} class="p-1.5 text-neutral-400 hover:text-emerald-600 transition-colors" title="E-Mail senden"><span class="text-base">✉️</span></a>
                                    {/if}
                                    {#if home.website}
                                        <a href={home.website} target="_blank" rel="noopener noreferrer" onclick={(e) => e.stopPropagation()} class="p-1.5 text-neutral-400 hover:text-blue-600 transition-colors" title="Webseite öffnen"><span class="text-base">🌐</span></a>
                                    {/if}
                                    {#if home.address}
                                        <a href="https://www.google.com/maps/search/?api=1&query={encodeURIComponent(`${home.name}, ${home.address}`)}" target="_blank" rel="noopener noreferrer" onclick={(e) => e.stopPropagation()} class="p-1.5 text-neutral-400 hover:text-amber-600 transition-colors" title="In Google Maps öffnen"><span class="text-base">🗺️</span></a>
                                    {/if}
                                </div>
                            </div>
                        </button>
                    {/each}
                </div>
            </div>
        {/if}
    {/if}
</div>

<ContactModal bind:this={contactModal} />
<RetirementHomeModal bind:this={homeModal} />
<ClientPortalAccessModal bind:this={portalAccessModal} />