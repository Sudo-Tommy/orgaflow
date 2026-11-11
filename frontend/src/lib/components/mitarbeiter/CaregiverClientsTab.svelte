<script lang="ts">
    import { caregiverPortal } from '$lib/services/caregiverPortalService.svelte';
    import { orgaStore } from '$lib/stores/orgaStore.svelte';
    import { rbacService } from '$lib/services/rbacService.svelte';
    import { toastStore } from '$lib/services/toastService.svelte';
    import { 
        Users, Search, MapPin, Phone, Navigation, 
        FileText, Calendar, ChevronRight
    } from 'lucide-svelte';
    import type { ClientRecord } from '$lib/types/orgaTypes';
    import CaregiverClientDetailModal from './CaregiverClientDetailModal.svelte';

    let searchQuery = $state('');
    let detailModal = $state<ReturnType<typeof CaregiverClientDetailModal>>();

    const currentUserId = $derived(caregiverPortal.currentUserId || rbacService.currentUser?.id);
    const assignedIds = $derived(caregiverPortal.assignedClientIds);

    // Alle Klienten des Mitarbeiters, alphabetisch nach Nachname sortiert
    const myClients = $derived.by(() => {
        if (!currentUserId) return [];
        const clients = orgaStore.clients.data || [];
        return clients
            .filter(c => 
                rbacService.isDirectlyAssignedClient(c) ||
                c.caregiver === currentUserId || 
                c.assigned_employee === currentUserId ||
                assignedIds.has(c.id) ||
                (Array.isArray(c.caregiver) && c.caregiver.includes(currentUserId))
            )
            .sort((a, b) => (a.name_last || '').localeCompare(b.name_last || '', 'de', { sensitivity: 'base' }));
    });

    const filteredClients = $derived.by(() => {
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

    function openMaps(client: ClientRecord) {
        const addr = caregiverPortal.getClientAddress(client);
        if (!addr) {
            toastStore.warning('Keine Adresse für Navigation hinterlegt.');
            return;
        }
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addr)}`, '_blank');
    }

    function callClient(phone?: string) {
        if (!phone) {
            toastStore.warning('Keine Telefonnummer hinterlegt.');
            return;
        }
        window.location.href = `tel:${phone.replace(/\s+/g, '')}`;
    }

    function filterAppointmentsForClient(clientId: string) {
        caregiverPortal.selectedClientId = clientId;
        caregiverPortal.activeTab = 'appointments';
    }
</script>

<div class="space-y-4 pb-24">
    <div class="relative">
        <label for="search-clients-input" class="sr-only">Klienten suchen</label>
        <Search class="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
        <input 
            id="search-clients-input"
            type="text" 
            bind:value={searchQuery}
            placeholder="Klienten nach Name, Ort oder Besonderheit suchen..." 
            class="w-full min-h-12 pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs text-slate-900 dark:text-white"
        />
    </div>

    {#if orgaStore.clients?.isLoading}
        <div class="text-center py-16 text-slate-400 font-medium animate-pulse">Lade Klienten...</div>
    {:else if filteredClients.length === 0}
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center shadow-xs">
            <div class="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-3">
                <Users class="w-6 h-6" />
            </div>
            <h3 class="text-base font-bold text-slate-900 dark:text-white">Keine Klienten gefunden</h3>
            <p class="text-xs sm:text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                {#if searchQuery}
                    Keine Klienten gefunden, die auf "{searchQuery}" passen.
                {:else}
                    Ihnen wurden aktuell keine Klienten zugeteilt.
                {/if}
            </p>
        </div>
    {:else}
        <div class="space-y-3">
            {#each filteredClients as client (client.id)}
                {@const fullAddress = caregiverPortal.getClientAddress(client)}
                {@const phone = client.phone || client.handy}
                {@const upcomingCount = getUpcomingAppointmentsCount(client.id)}

                <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xs transition-all hover:border-indigo-300 dark:hover:border-indigo-700 space-y-3.5">
                    <div class="flex items-start justify-between gap-3">
                        <div class="flex items-center gap-3 min-w-0">
                            <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-teal-500 text-white font-black text-lg flex items-center justify-center shrink-0">
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

                        {#if client.level_of_care}
                            <span class="text-xs font-black px-2.5 py-1 rounded-xl bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800 shrink-0">
                                PG {client.level_of_care}
                            </span>
                        {/if}
                    </div>

                    {#if fullAddress}
                        <div class="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl">
                            <MapPin class="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                            <span class="truncate">{fullAddress}</span>
                        </div>
                    {/if}

                    <div class="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-xs">
                        <span class="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                            <Calendar class="w-3.5 h-3.5 text-indigo-500" />
                            <span>{upcomingCount > 0 ? `${upcomingCount} offene(r) Einsatz/Einsätze` : 'Keine offenen Einsätze'}</span>
                        </span>
                        <button
                            type="button"
                            onclick={() => filterAppointmentsForClient(client.id)}
                            class="font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                            <span>Einsätze</span>
                            <ChevronRight class="w-3 h-3" />
                        </button>
                    </div>

                    <div class="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                        <button
                            type="button"
                            onclick={() => openMaps(client)}
                            disabled={!fullAddress}
                            class="min-h-11 px-2.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer shadow-xs"
                        >
                            <Navigation class="w-3.5 h-3.5" />
                            <span>Route</span>
                        </button>

                        <button
                            type="button"
                            onclick={() => callClient(phone)}
                            disabled={!phone}
                            class="min-h-11 px-2.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer"
                        >
                            <Phone class="w-3.5 h-3.5 text-emerald-500" />
                            <span>Anrufen</span>
                        </button>

                        <button
                            type="button"
                            onclick={() => detailModal?.open(client)}
                            class="min-h-11 px-2.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-indigo-600 dark:text-indigo-400 text-xs font-bold transition-all border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                            <FileText class="w-3.5 h-3.5" />
                            <span>Akte</span>
                        </button>
                    </div>
                </div>
            {/each}
        </div>
    {/if}
</div>

<CaregiverClientDetailModal bind:this={detailModal} />
