<script lang="ts">
    import { User, Users, MapPin, Edit3, PhoneCall, ExternalLink, UserCheck, Navigation, ArrowRight } from "lucide-svelte";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import AppointmentClientPicker from "./AppointmentClientPicker.svelte";
    import AppointmentTimeQuadrant from "./AppointmentTimeQuadrant.svelte";

    interface Props {
        appointment: any;
        client?: any;
        assignedUser?: any;
        onSaveDateTime: (dateStr: string, startTime: string, endTime?: string) => Promise<boolean>;
        onSaveUser: (userId: string) => Promise<boolean>;
        onSaveClient: (clientId: string) => Promise<boolean>;
        onSaveAddress: (address: string, contactId?: string) => Promise<boolean>;
        onSavePickupAddress?: (address: string) => Promise<boolean>;
        onOpenClientTab?: () => void;
    }

    let {
        appointment, client, assignedUser,
        onSaveDateTime, onSaveUser, onSaveClient, onSaveAddress, onSavePickupAddress, onOpenClientTab
    }: Props = $props();

    let isChangingClient = $state(false);
    let clientName = $derived(client ? `${client.salutation ? client.salutation + ' ' : ''}${client.name_first || ''} ${client.name_last || ''}`.trim() : 'Kein Klient');
    let careLevel = $derived(client?.level_of_care || client?.care_level || '');
    let clientPhone = $derived(client?.phone || client?.handy || '');

    let isChangingUser = $state(false);
    let activeEmployees = $derived(
        (((orgaStore.users?.data || []) as any[])
            .filter(u => u.role !== 'client'))
            .sort((a, b) => `${a.name_first || ''} ${a.name_last || ''}`.trim().localeCompare(`${b.name_first || ''} ${b.name_last || ''}`.trim(), 'de', { sensitivity: 'base' }))
    );
    let caregiverName = $derived(assignedUser ? `${assignedUser.name_first || ''} ${assignedUser.name_last || ''}`.trim() || assignedUser.email : 'Nicht zugewiesen');

    let isEditingRoute = $state(false);
    let locationAddressValue = $state("");
    let pickupAddressValue = $state("");
    let isSavingRoute = $state(false);

    let clientAddressStr = $derived.by(() => {
        if (!client) return "";
        return [client.street ? `${client.street} ${client.housenr || ''}`.trim() : '', client.city ? `${client.zip || ''} ${client.city}`.trim() : ''].filter(Boolean).join(', ');
    });

    let caregiverAddressStr = $derived.by(() => {
        if (!assignedUser) return "";
        return [assignedUser.street ? `${assignedUser.street} ${assignedUser.housenr || ''}`.trim() : '', assignedUser.city ? `${assignedUser.zip || ''} ${assignedUser.city}`.trim() : ''].filter(Boolean).join(', ');
    });

    let effectivePickup = $derived(appointment?.pickup_address || clientAddressStr || 'Beim Klienten');
    let effectiveLocation = $derived(appointment?.location_address || clientAddressStr || 'Beim Klienten');

    function startRouteEdit() {
        pickupAddressValue = appointment?.pickup_address || clientAddressStr || '';
        locationAddressValue = appointment?.location_address || clientAddressStr || '';
        isEditingRoute = true;
    }

    async function handleSaveRoute() {
        isSavingRoute = true;
        try {
            await onSaveAddress(locationAddressValue.trim());
            if (onSavePickupAddress) {
                await onSavePickupAddress(pickupAddressValue.trim());
            }
            isEditingRoute = false;
        } finally {
            isSavingRoute = false;
        }
    }
</script>

<div class="bg-white dark:bg-slate-900 rounded-2xl p-3.5 sm:p-5 border border-slate-200/90 dark:border-slate-800 shadow-xs">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
        <!-- 1. Terminzeit & Dauer -->
        <AppointmentTimeQuadrant {appointment} {onSaveDateTime} />

        <!-- 2. Klient -->
        <div class="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/70 dark:border-slate-700/60 flex flex-col justify-between">
            <div class="flex items-center justify-between mb-1.5">
                <span class="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <User class="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Klient
                </span>
                <div class="flex items-center gap-2">
                    {#if onOpenClientTab}
                        <button type="button" onclick={onOpenClientTab} class="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer">Akte</button>
                    {/if}
                    {#if !isChangingClient}
                        <button type="button" onclick={() => isChangingClient = true} class="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer">
                            <Edit3 class="w-3 h-3" /> Wechseln
                        </button>
                    {/if}
                </div>
            </div>
            {#if isChangingClient}
                <div class="pt-1">
                    <AppointmentClientPicker
                        onSelect={async (cid) => { if (await onSaveClient(cid)) isChangingClient = false; }}
                        onClose={() => isChangingClient = false}
                    />
                </div>
            {:else}
                <div class="flex items-center justify-between gap-2 mt-1">
                    <div class="min-w-0">
                        <p class="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{clientName}</p>
                        <div class="flex items-center gap-1.5 mt-0.5">
                            {#if careLevel}
                                <span class="px-1.5 py-0.2 rounded text-[9px] font-black bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">PG {careLevel}</span>
                            {/if}
                            <span class="text-[11px] text-slate-500 dark:text-slate-400 truncate">{clientAddressStr || 'Keine Adresse'}</span>
                        </div>
                    </div>
                    {#if clientPhone}
                        <a href="tel:{clientPhone}" class="p-1.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-lg hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800 shrink-0" title="Anrufen: {clientPhone}">
                            <PhoneCall class="w-3.5 h-3.5" />
                        </a>
                    {/if}
                </div>
            {/if}
        </div>

        <!-- 3. Betreuer / Mitarbeiter -->
        <div class="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/70 dark:border-slate-700/60 flex flex-col justify-between">
            <div class="flex items-center justify-between mb-1.5">
                <span class="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <UserCheck class="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Betreuer / Mitarbeiter
                </span>
                {#if !isChangingUser}
                    <button type="button" onclick={() => isChangingUser = true} class="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer">
                        <Edit3 class="w-3 h-3" /> Wechseln
                    </button>
                {:else}
                    <button type="button" onclick={() => isChangingUser = false} class="text-[11px] text-slate-400 hover:text-slate-600 cursor-pointer">Abbrechen</button>
                {/if}
            </div>
            {#if isChangingUser}
                <div class="pt-1">
                    <select
                        class="w-full text-xs p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg cursor-pointer"
                        value={assignedUser?.id || ''}
                        onchange={async (e) => {
                            const val = (e.target as HTMLSelectElement).value;
                            if (val && await onSaveUser(val)) isChangingUser = false;
                        }}
                    >
                        <option value="" disabled>Mitarbeiter wählen...</option>
                        {#each activeEmployees as u (u.id)}
                            <option value={u.id}>{u.name_first || ''} {u.name_last || ''} {u.role ? `(${u.role})` : ''}</option>
                        {/each}
                    </select>
                </div>
            {:else}
                <div class="flex items-center gap-2 mt-1">
                    <div class="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-xs shrink-0">
                        {assignedUser?.name_first?.[0] || assignedUser?.email?.[0] || '?'}
                    </div>
                    <div class="min-w-0">
                        <p class="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{caregiverName}</p>
                        <p class="text-[10px] text-slate-500 dark:text-slate-400 truncate">{assignedUser?.email || 'Mitarbeiter'}</p>
                    </div>
                </div>
            {/if}
        </div>

        <!-- 4. Fahrtroute: Abholort ➔ Einsatzort (Kombinierte Karte nach Antwort 3b) -->
        <div class="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/70 dark:border-slate-700/60 flex flex-col justify-between">
            <div class="flex items-center justify-between mb-1.5">
                <span class="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Navigation class="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> Fahrtroute &amp; Einsatzort
                </span>
                {#if !isEditingRoute}
                    <button type="button" onclick={startRouteEdit} class="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer">
                        <Edit3 class="w-3 h-3" /> Ändern
                    </button>
                {/if}
            </div>

            {#if isEditingRoute}
                <div class="space-y-2 pt-1">
                    <!-- Abholort Eingabe -->
                    <div>
                        <div class="flex items-center justify-between mb-0.5">
                            <label for="route-pickup-input" class="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">🟢 Abholort (Start):</label>
                            {#if clientAddressStr}
                                <button type="button" onclick={() => pickupAddressValue = clientAddressStr} class="text-[9px] text-indigo-600 hover:underline font-bold">Klient</button>
                            {/if}
                        </div>
                        <input id="route-pickup-input" type="text" bind:value={pickupAddressValue} placeholder="Abholadresse..." class="w-full text-xs p-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg" />
                    </div>

                    <!-- Einsatzort Eingabe -->
                    <div>
                        <div class="flex items-center justify-between mb-0.5">
                            <label for="route-location-input" class="text-[10px] font-bold text-rose-600 dark:text-rose-400">🔴 Einsatzort (Ziel):</label>
                            {#if clientAddressStr}
                                <button type="button" onclick={() => locationAddressValue = clientAddressStr} class="text-[9px] text-indigo-600 hover:underline font-bold">Klient</button>
                            {/if}
                        </div>
                        <input id="route-location-input" type="text" bind:value={locationAddressValue} placeholder="Einsatzadresse..." class="w-full text-xs p-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg" />
                    </div>

                    <div class="flex justify-end gap-1.5 pt-1">
                        <button type="button" onclick={() => isEditingRoute = false} class="px-2.5 py-1 text-xs text-slate-600 dark:text-slate-300 bg-slate-200 dark:bg-slate-700 rounded-lg">Abbrechen</button>
                        <button type="button" onclick={handleSaveRoute} disabled={isSavingRoute} class="px-3 py-1 text-xs font-bold text-white bg-indigo-600 rounded-lg">{isSavingRoute ? '...' : 'Speichern'}</button>
                    </div>
                </div>
            {:else}
                <div class="space-y-1.5 mt-1">
                    <!-- Abholort Display -->
                    <div class="flex items-center gap-1.5 min-w-0">
                        <span class="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Abholort"></span>
                        <span class="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase shrink-0">Abholung:</span>
                        <p class="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">{effectivePickup}</p>
                    </div>

                    <!-- Einsatzort Display -->
                    <div class="flex items-center justify-between gap-1.5 min-w-0">
                        <div class="flex items-center gap-1.5 min-w-0">
                            <span class="w-2 h-2 rounded-full bg-rose-500 shrink-0" title="Einsatzort"></span>
                            <span class="text-[10px] font-bold text-rose-700 dark:text-rose-300 uppercase shrink-0">Einsatz:</span>
                            <p class="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">{effectiveLocation}</p>
                        </div>
                        <a 
                            href="https://www.google.com/maps/dir/?api=1&origin={encodeURIComponent(effectivePickup)}&destination={encodeURIComponent(effectiveLocation)}" 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            class="p-1 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded hover:bg-slate-300 shrink-0" 
                            title="Route in Google Maps öffnen"
                        >
                            <ExternalLink class="w-3 h-3" />
                        </a>
                    </div>
                </div>
            {/if}
        </div>
    </div>
</div>
