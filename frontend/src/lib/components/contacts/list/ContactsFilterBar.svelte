<script lang="ts">
    interface Props {
        activeTab: "contacts" | "homes";
        searchQuery: string;
        sortBy: "name_asc" | "name_desc" | "company" | "city" | "updated";
        viewMode: "table" | "grid";
        contactFilterChip: "all" | "caregiver" | "relative" | "other" | "unassigned" | "linked" | "unlinked" | "portal" | "phone" | "email";
        homeFilterChip: "all" | "unverified" | "verified" | "portal";
        totalContactsCount: number;
        caregiverCount: number;
        relativeCount: number;
        otherCount: number;
        unassignedCount: number;
        linkedContactsCount: number;
        portalContactsCount: number;
        totalHomesCount: number;
        unverifiedHomesCount: number;
    }

    let {
        activeTab = $bindable(),
        searchQuery = $bindable(),
        sortBy = $bindable(),
        viewMode = $bindable(),
        contactFilterChip = $bindable(),
        homeFilterChip = $bindable(),
        totalContactsCount,
        caregiverCount,
        relativeCount,
        otherCount,
        unassignedCount,
        linkedContactsCount,
        portalContactsCount,
        totalHomesCount,
        unverifiedHomesCount
    }: Props = $props();
</script>

<!-- === FILTER- & SUCHLEISTE === -->
<div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3 sm:p-4 mb-6 shadow-2xs animate-enter delay-150 space-y-3">
    <div class="flex flex-col md:flex-row items-center justify-between gap-3">
        <!-- Tab-Umschalter -->
        <div class="flex bg-slate-100 dark:bg-slate-800/90 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shrink-0 w-full md:w-auto">
            <button 
                type="button"
                onclick={() => { activeTab = 'contacts'; searchQuery = ''; }} 
                class="flex-1 md:flex-none px-4 py-2 min-h-[38px] text-xs sm:text-sm font-bold rounded-lg transition-colors cursor-pointer {activeTab === 'contacts' ? 'bg-white dark:bg-slate-900 shadow-xs text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}"
            >
                Kontaktpersonen ({totalContactsCount})
            </button>
            <button 
                type="button"
                onclick={() => { activeTab = 'homes'; searchQuery = ''; }} 
                class="flex-1 md:flex-none px-4 py-2 min-h-[38px] text-xs sm:text-sm font-bold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2 {activeTab === 'homes' ? 'bg-white dark:bg-slate-900 shadow-xs text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}"
            >
                <span>Pflegeheime ({totalHomesCount})</span>
                {#if unverifiedHomesCount > 0}
                    <span class="px-1.5 py-0.5 text-[10px] font-black bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300 dark:border-amber-700 rounded-full">
                        {unverifiedHomesCount}
                    </span>
                {/if}
            </button>
        </div>

        <!-- Suchfeld -->
        <div class="flex-1 w-full relative">
            <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
            <input 
                id="search-contacts"
                type="text" 
                bind:value={searchQuery} 
                placeholder={activeTab === 'contacts' ? "Nach Name, Firma, E-Mail, Telefon, Straße oder Stadt suchen..." : "Nach Einrichtungsname, Adresse oder Stadt suchen..."} 
                class="orga-input-clear pl-10 pr-9 min-h-[44px] py-2 text-xs sm:text-sm w-full"
            />
            {#if searchQuery}
                <button 
                    type="button" 
                    onclick={() => searchQuery = ''} 
                    class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 w-6 h-6 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    title="Suche leeren"
                >✕</button>
            {/if}
        </div>

        <!-- Sortierung & View Toggle -->
        <div class="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
            {#if activeTab === 'contacts'}
                <select 
                    bind:value={sortBy} 
                    class="orga-input-clear min-h-[44px] text-xs font-bold py-2 px-3 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer"
                    title="Sortierung anpassen"
                >
                    <option value="name_asc">Name (A-Z)</option>
                    <option value="name_desc">Name (Z-A)</option>
                    <option value="company">Firma / Praxis</option>
                    <option value="city">Stadt / Ort</option>
                    <option value="updated">Zuletzt aktualisiert</option>
                </select>
            {/if}

            <div class="flex bg-slate-100 dark:bg-slate-800/90 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shrink-0">
                <button 
                    type="button" 
                    onclick={() => viewMode = 'table'} 
                    class="p-2 min-h-[36px] min-w-[36px] rounded-lg transition-colors cursor-pointer flex items-center justify-center {viewMode === 'table' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs' : 'text-slate-400 hover:text-slate-600'}"
                    title="Tabellenansicht"
                >
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
                </button>
                <button 
                    type="button" 
                    onclick={() => viewMode = 'grid'} 
                    class="p-2 min-h-[36px] min-w-[36px] rounded-lg transition-colors cursor-pointer flex items-center justify-center {viewMode === 'grid' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs' : 'text-slate-400 hover:text-slate-600'}"
                    title="Kartenansicht (Grid)"
                >
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                </button>
            </div>
        </div>
    </div>

    <!-- Filter-Chips -->
    <div class="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar text-xs">
        <span class="text-slate-400 font-bold uppercase tracking-wider text-[10px] shrink-0">Filter:</span>
        {#if activeTab === 'contacts'}
            <button 
                type="button" 
                onclick={() => contactFilterChip = 'all'} 
                class="px-3 py-1.5 min-h-[32px] rounded-lg font-bold transition-all cursor-pointer shrink-0 {contactFilterChip === 'all' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}"
            >
                Alle ({totalContactsCount})
            </button>
            <button 
                type="button" 
                onclick={() => contactFilterChip = 'portal'} 
                class="px-3 py-1.5 min-h-[32px] rounded-lg font-bold transition-all cursor-pointer shrink-0 {contactFilterChip === 'portal' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100'}"
            >
                🪪 Portal aktiv ({portalContactsCount})
            </button>
            <button 
                type="button" 
                onclick={() => contactFilterChip = 'caregiver'} 
                class="px-3 py-1.5 min-h-[32px] rounded-lg font-bold transition-all cursor-pointer shrink-0 {contactFilterChip === 'caregiver' ? 'bg-purple-600 text-white shadow-xs' : 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 hover:bg-purple-100'}"
            >
                🩺 Betreuer & Pflege ({caregiverCount})
            </button>
            <button 
                type="button" 
                onclick={() => contactFilterChip = 'relative'} 
                class="px-3 py-1.5 min-h-[32px] rounded-lg font-bold transition-all cursor-pointer shrink-0 {contactFilterChip === 'relative' ? 'bg-amber-600 text-white shadow-xs' : 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800 hover:bg-amber-100'}"
            >
                👥 Angehörige ({relativeCount})
            </button>
            <button 
                type="button" 
                onclick={() => contactFilterChip = 'other'} 
                class="px-3 py-1.5 min-h-[32px] rounded-lg font-bold transition-all cursor-pointer shrink-0 {contactFilterChip === 'other' ? 'bg-blue-600 text-white shadow-xs' : 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100'}"
            >
                🏢 Sonstige ({otherCount})
            </button>
            {#if unassignedCount > 0}
                <button 
                    type="button" 
                    onclick={() => contactFilterChip = 'unassigned'} 
                    class="px-3 py-1.5 min-h-[32px] rounded-lg font-bold transition-all cursor-pointer shrink-0 {contactFilterChip === 'unassigned' ? 'bg-slate-700 text-white shadow-xs' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-slate-200'}"
                >
                    ❓ Ohne Zuordnung ({unassignedCount})
                </button>
            {/if}
            <div class="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1 shrink-0"></div>
            <button 
                type="button" 
                onclick={() => contactFilterChip = 'linked'} 
                class="px-3 py-1.5 min-h-[32px] rounded-lg font-bold transition-all cursor-pointer shrink-0 {contactFilterChip === 'linked' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}"
            >
                🔗 Verknüpft ({linkedContactsCount})
            </button>
            <button 
                type="button" 
                onclick={() => contactFilterChip = 'unlinked'} 
                class="px-3 py-1.5 min-h-[32px] rounded-lg font-bold transition-all cursor-pointer shrink-0 {contactFilterChip === 'unlinked' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}"
            >
                Ohne Klient ({totalContactsCount - linkedContactsCount})
            </button>
            <button 
                type="button" 
                onclick={() => contactFilterChip = 'phone'} 
                class="px-3 py-1.5 min-h-[32px] rounded-lg font-bold transition-all cursor-pointer shrink-0 {contactFilterChip === 'phone' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}"
            >
                📞 Mit Telefon
            </button>
            <button 
                type="button" 
                onclick={() => contactFilterChip = 'email'} 
                class="px-3 py-1.5 min-h-[32px] rounded-lg font-bold transition-all cursor-pointer shrink-0 {contactFilterChip === 'email' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}"
            >
                ✉️ Mit E-Mail
            </button>
        {:else}
            <button 
                type="button" 
                onclick={() => homeFilterChip = 'all'} 
                class="px-3 py-1.5 min-h-[32px] rounded-lg font-bold transition-all cursor-pointer shrink-0 {homeFilterChip === 'all' ? 'bg-teal-600 text-white shadow-xs' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}"
            >
                Alle ({totalHomesCount})
            </button>
            <button 
                type="button" 
                onclick={() => homeFilterChip = 'unverified'} 
                class="px-3 py-1.5 min-h-[32px] rounded-lg font-bold transition-all cursor-pointer shrink-0 {homeFilterChip === 'unverified' ? 'bg-amber-600 text-white shadow-xs' : 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-200 border border-amber-200'}"
            >
                ⚠️ Unüberprüft ({unverifiedHomesCount})
            </button>
            <button 
                type="button" 
                onclick={() => homeFilterChip = 'verified'} 
                class="px-3 py-1.5 min-h-[32px] rounded-lg font-bold transition-all cursor-pointer shrink-0 {homeFilterChip === 'verified' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}"
            >
                ✓ Überprüft ({totalHomesCount - unverifiedHomesCount})
            </button>
            <button 
                type="button" 
                onclick={() => homeFilterChip = 'portal'} 
                class="px-3 py-1.5 min-h-[32px] rounded-lg font-bold transition-all cursor-pointer shrink-0 {homeFilterChip === 'portal' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}"
            >
                🌐 Aus Portal
            </button>
        {/if}
    </div>
</div>
