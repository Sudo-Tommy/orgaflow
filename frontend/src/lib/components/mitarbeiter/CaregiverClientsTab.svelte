<script lang="ts">
    import { orgaStore } from '$lib/stores/orgaStore.svelte';
    import { pb } from '$lib/services/pocketbase';
    import { toastStore } from '$lib/services/toastService.svelte';
    import { 
        Users, Search, MapPin, Phone, Navigation, Heart, 
        AlertCircle, FileText, ChevronRight, Calendar
    } from 'lucide-svelte';
    import type { ClientRecord } from '$lib/types/orgaTypes';

    let { 
        onSelectClientAppointments 
    }: { 
        onSelectClientAppointments?: (clientId: string) => void;
    } = $props();

    let searchQuery = $state('');

    const currentUser = $derived(pb.authStore.model);
    const currentUserId = $derived(currentUser?.id);

    // Alle Klienten, die dem Mitarbeiter zugewiesen sind
    let myClients = $derived.by(() => {
        if (!currentUserId) return [];
        const clients = orgaStore.clients.data || [];
        const assignedIds = Array.isArray(currentUser?.assigned_clients) ? currentUser.assigned_clients : [];
        
        return clients.filter(c => 
            c.caregiver === currentUserId || 
            assignedIds.includes(c.id) ||
            (Array.isArray(c.caregiver) && c.caregiver.includes(currentUserId))
        );
    });

    let filteredClients = $derived.by(() => {
        if (!searchQuery.trim()) return myClients;
        const q = searchQuery.toLowerCase().trim();
        return myClients.filter(c => 
            `${c.name_first || ''} ${c.name_last || ''}`.toLowerCase().includes(q) ||
            (c.city || '').toLowerCase().includes(q) ||
            (c.street || '').toLowerCase().includes(q) ||
            (c.notes || '').toLowerCase().includes(q)
        );
    });

    function getUpcomingAppointmentsCount(clientId: string): number {
        const nowStr = new Date().toISOString().slice(0, 10);
        const appts = orgaStore.appointments.data || [];
        return appts.filter(a => {
            const isClient = Array.isArray(a.client) ? a.client.includes(clientId) : a.client === clientId;
            const isFutureOrOpen = (a.appointment || '').slice(0, 10) >= nowStr || a.status !== 'Erledigt';
            return isClient && isFutureOrOpen;
        }).length;
    }

    function openMapsNavigation(client: ClientRecord) {
        const address = `${client.street || ''} ${client.housenr || ''}, ${client.zip || ''} ${client.city || ''}`.trim();
        if (!address) {
            toastStore.warning('Keine Adresse für diesen Klienten hinterlegt.');
            return;
        }
        const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
        window.open(url, '_blank');
    }

    function callClient(phone?: string) {
        if (!phone) {
            toastStore.warning('Keine Telefonnummer hinterlegt.');
            return;
        }
        window.location.href = `tel:${phone.replace(/\s+/g, '')}`;
    }
</script>

<div class="space-y-4 pb-20">
    
    <!-- Suchleiste -->
    <div class="relative">
        <label for="search-my-clients" class="sr-only">Meine Klienten suchen</label>
        <Search class="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
        <input 
            id="search-my-clients"
            type="text" 
            bind:value={searchQuery}
            placeholder="Klienten nach Name, Ort oder Notiz suchen..." 
            class="w-full min-h-12 pl-10 pr-4 py-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
        />
    </div>

    <!-- Klienten-Liste -->
    {#if orgaStore.clients?.isLoading}
        <div class="text-center py-16 text-slate-400 font-medium animate-pulse">Lade Klienten-Daten...</div>
    {:else if filteredClients.length === 0}
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center shadow-xs">
            <div class="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-3">
                <Users class="w-6 h-6" />
            </div>
            <h3 class="text-base font-bold text-slate-900 dark:text-white">Keine zugewiesenen Klienten</h3>
            <p class="text-xs sm:text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                {#if searchQuery}
                    Keine Klienten gefunden, die auf "{searchQuery}" passen.
                {:else}
                    Ihnen wurden von der Betriebsleitung noch keine Klienten zugewiesen.
                {/if}
            </p>
        </div>
    {:else}
        <div class="space-y-4">
            {#each filteredClients as client (client.id)}
                {@const fullAddress = `${client.street || ''} ${client.housenr || ''}, ${client.zip || ''} ${client.city || ''}`.trim()}
                {@const phone = client.phone || client.handy}
                {@const upcomingCount = getUpcomingAppointmentsCount(client.id)}

                <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs transition-all hover:border-indigo-300 dark:hover:border-indigo-700 space-y-4">
                    
                    <!-- Card Header -->
                    <div class="flex items-start justify-between gap-3">
                        <div class="flex items-center gap-3 min-w-0">
                            <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-teal-500 text-white font-black text-lg flex items-center justify-center shadow-xs shrink-0">
                                {client.name_last ? client.name_last[0] : 'K'}
                            </div>
                            <div class="min-w-0">
                                <h3 class="text-base font-black text-slate-900 dark:text-white truncate">
                                    {client.name_last}, {client.name_first}
                                </h3>
                                <p class="text-xs text-slate-500 truncate">
                                    {client.salutation || 'Klient'} • Geb. {client.birthdate || 'Nicht angegeben'}
                                </p>
                            </div>
                        </div>

                        <div class="flex items-center gap-1.5 shrink-0">
                            {#if client.level_of_care}
                                <span class="text-xs font-black px-2.5 py-1 rounded-xl bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                    PG {client.level_of_care}
                                </span>
                            {/if}
                        </div>
                    </div>

                    <!-- Anschrift -->
                    {#if fullAddress}
                        <div class="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <MapPin class="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                            <span class="font-medium">{fullAddress}</span>
                        </div>
                    {/if}

                    <!-- Notizen / Besonderheiten -->
                    {#if client.notes}
                        <div class="text-xs text-slate-600 dark:text-slate-400 bg-amber-50/50 dark:bg-amber-950/20 p-3 rounded-2xl border border-amber-200/50 dark:border-amber-900/30">
                            <strong class="text-amber-800 dark:text-amber-300 block mb-0.5">Betreuungshinweise & Besonderheiten:</strong>
                            <p class="line-clamp-3">{client.notes}</p>
                        </div>
                    {/if}

                    <!-- Termin-Status für diesen Klienten -->
                    <div class="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                        <div class="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                            <Calendar class="w-4 h-4 text-indigo-500" />
                            <span>
                                {#if upcomingCount > 0}
                                    <strong class="text-indigo-600 dark:text-indigo-400">{upcomingCount}</strong> anstehende(r) Einsatz/Einsätze
                                {:else}
                                    Keine offenen Termine
                                {/if}
                            </span>
                        </div>

                        {#if onSelectClientAppointments}
                            <button
                                type="button"
                                onclick={() => onSelectClientAppointments?.(client.id)}
                                class="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 flex items-center gap-1 p-1 hover:underline cursor-pointer"
                            >
                                <span>Einsätze anzeigen</span>
                                <ChevronRight class="w-3.5 h-3.5" />
                            </button>
                        {/if}
                    </div>

                    <!-- Ergonomische Außendienst-Aktionen (Mindestens 44x44 px) -->
                    <div class="grid grid-cols-2 gap-3 pt-1 border-t border-slate-100 dark:border-slate-800">
                        <button
                            type="button"
                            onclick={() => openMapsNavigation(client)}
                            disabled={!fullAddress}
                            class="min-h-12 px-4 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-xs sm:text-sm font-bold transition-all shadow-xs flex items-center justify-center gap-2 disabled:opacity-40"
                        >
                            <Navigation class="w-4 h-4" />
                            <span>Route / Maps</span>
                        </button>

                        <button
                            type="button"
                            onclick={() => callClient(phone)}
                            disabled={!phone}
                            class="min-h-12 px-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-[0.98] text-slate-800 dark:text-slate-100 text-xs sm:text-sm font-bold transition-all border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-2 disabled:opacity-40"
                        >
                            <Phone class="w-4 h-4 text-emerald-500" />
                            <span>Anrufen</span>
                        </button>
                    </div>

                </div>
            {/each}
        </div>
    {/if}

</div>
