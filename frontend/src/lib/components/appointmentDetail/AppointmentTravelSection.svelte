<script lang="ts">
    import { Car, Navigation, MapPin, User, RotateCw, Copy, ExternalLink, Edit3, Trash2 } from "lucide-svelte";
    import { formatMinutes } from "./appointmentRouteService";
    import { toastStore } from "$lib/services/toastService.svelte";
    import { tripRecorder } from "$lib/services/trips/tripRecorder.svelte";
    import type { RouteTargetMode } from "./appointmentDetailTypes";

    interface Props {
        appointmentId?: string; clientId?: string;
        driveRecords: any[]; totalKm: number; routeEmbedUrl: string; googleMapsNavUrl: string;
        activeDestinationTitle: string; activeDestinationAddress: string; targetLocationAddress: string;
        clientAddress: string; routeTargetMode: RouteTargetMode; isMobile: boolean; isLocatingUser: boolean;
        userLocation: { lat: number; lng: number } | null; locationError: string | null;
        routeDistance: number | null; routeDuration: number | null; isCalculatingRoute: boolean;
        onFetchDeviceLocation: () => void;
        onSetRouteTargetMode: (mode: 'destination' | 'client' | 'client_to_destination') => void;
        onOpenDriveModal: (drive?: any) => void; onDeleteDrive: (id: string) => void;
        onOpenEdit?: () => void; onSaveAddress?: (address: string) => Promise<boolean>;
    }

    let {
        appointmentId, clientId,
        driveRecords, totalKm, routeEmbedUrl, googleMapsNavUrl, activeDestinationTitle,
        activeDestinationAddress, targetLocationAddress, clientAddress, routeTargetMode,
        isMobile, isLocatingUser, userLocation, locationError, routeDistance, routeDuration,
        isCalculatingRoute, onFetchDeviceLocation, onSetRouteTargetMode, onOpenDriveModal,
        onDeleteDrive, onOpenEdit, onSaveAddress
    }: Props = $props();

    let isEditingAddress = $state(false);
    let newAddressInput = $state("");

    interface RouteOption {
        mode: RouteTargetMode;
        label: string;
        icon: any;
        address: string;
    }

    const hasClientAddress = $derived(Boolean(clientAddress?.trim()));
    const hasTargetAddress = $derived(Boolean(targetLocationAddress?.trim()));

    const isSameAddress = $derived.by(() => {
        if (!hasClientAddress || !hasTargetAddress) return false;
        const c1 = clientAddress.trim().toLowerCase().replace(/[\s,.-]+/g, ' ');
        const c2 = targetLocationAddress.trim().toLowerCase().replace(/[\s,.-]+/g, ' ');
        return c1 === c2;
    });

    const availableRoutes = $derived.by<RouteOption[]>(() => {
        const list: RouteOption[] = [];

        if (hasTargetAddress) {
            list.push({
                mode: 'destination',
                label: isSameAddress ? 'Ich → Einsatzort' : 'Ich → Zielort',
                icon: MapPin,
                address: targetLocationAddress
            });
        }

        if (hasClientAddress && !isSameAddress) {
            list.push({
                mode: 'client',
                label: 'Ich → Klient',
                icon: User,
                address: clientAddress
            });
        }

        if (hasClientAddress && hasTargetAddress && !isSameAddress) {
            list.push({
                mode: 'client_to_destination',
                label: 'Abholung → Einsatz',
                icon: Navigation,
                address: targetLocationAddress
            });
        }

        return list;
    });

    // Automatisch erste verfügbare Route aktivieren, falls aktuelle Route nicht verfügbar ist
    $effect(() => {
        if (availableRoutes.length > 0) {
            const currentAvailable = availableRoutes.some(r => r.mode === routeTargetMode);
            if (!currentAvailable) {
                onSetRouteTargetMode(availableRoutes[0].mode);
            }
        }
    });

    function copyAddress() {
        if (!activeDestinationAddress) return;
        navigator.clipboard.writeText(activeDestinationAddress).then(() => toastStore.success("Adresse kopiert.")).catch(() => {});
    }
</script>

<div class="space-y-4">
    <!-- 1. Routen- & Navigationskarte -->
    {#if availableRoutes.length > 0}
        <div class="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-neutral-200/90 dark:border-slate-800 shadow-xs">
            <!-- Header mit einheitlichem Titel "Navigation & Route" -->
            <div class="flex items-center justify-between mb-3 border-b border-neutral-100 dark:border-slate-800 pb-2.5">
                <h3 class="text-xs font-bold text-neutral-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Navigation class="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>Navigation & Route</span>
                </h3>
                {#if activeDestinationAddress}
                    <button type="button" onclick={copyAddress} class="text-xs font-bold text-neutral-700 dark:text-slate-300 flex items-center gap-1 bg-neutral-100 dark:bg-slate-800 hover:bg-neutral-200 dark:hover:bg-slate-700 px-2.5 py-1 rounded-lg cursor-pointer transition-colors shadow-2xs">
                        <Copy class="w-3 h-3" /> Kopieren
                    </button>
                {/if}
            </div>

            <!-- Tabs nur einblenden wenn mehr als 1 Option verfügbar ist, sonst kompakter Info-Badge -->
            {#if availableRoutes.length > 1}
                <div class="grid gap-1 p-1 bg-neutral-100 dark:bg-slate-800 rounded-xl mb-3 {availableRoutes.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}">
                    {#each availableRoutes as r (r.mode)}
                        {@const Icon = r.icon}
                        <button 
                            type="button" 
                            onclick={() => onSetRouteTargetMode(r.mode)} 
                            class="py-1.5 px-2 rounded-lg text-[11px] font-bold flex flex-col items-center justify-center gap-0.5 cursor-pointer leading-tight transition-all {routeTargetMode === r.mode ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs' : 'text-neutral-600 dark:text-slate-400 hover:text-neutral-900 dark:hover:text-slate-200'}"
                        >
                            <Icon class="w-3.5 h-3.5" />
                            <span>{r.label}</span>
                        </button>
                    {/each}
                </div>
            {:else if availableRoutes.length === 1}
                {@const FirstIcon = availableRoutes[0].icon}
                <div class="flex items-center gap-2 mb-3 px-3 py-2 bg-blue-50/80 dark:bg-blue-950/40 rounded-xl border border-blue-200/80 dark:border-blue-900/60 text-xs font-bold text-blue-700 dark:text-blue-300">
                    <FirstIcon class="w-3.5 h-3.5 shrink-0 text-blue-600 dark:text-blue-400" />
                    <span>{availableRoutes[0].label}:</span>
                    <span class="font-semibold text-slate-700 dark:text-slate-200 truncate">{availableRoutes[0].address}</span>
                </div>
            {/if}

            {#if isMobile}
                <div class="flex items-center justify-between gap-2 mb-3 text-xs bg-neutral-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-neutral-200 dark:border-slate-700">
                    <span class="font-bold text-xs truncate">📱 Start: {userLocation ? `GPS aktiv (${userLocation.lat.toFixed(4)})` : (locationError || 'GPS-Standort')}</span>
                    <button type="button" onclick={onFetchDeviceLocation} disabled={isLocatingUser} class="p-1.5 bg-white dark:bg-slate-700 rounded-lg border border-neutral-200 cursor-pointer" title="GPS aktualisieren"><RotateCw class="w-3.5 h-3.5 {isLocatingUser ? 'animate-spin text-blue-600' : ''}" /></button>
                </div>
            {/if}

            <div class="grid grid-cols-2 gap-2 mb-3 text-xs">
                <div class="p-2.5 bg-neutral-50 dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-700"><span class="text-[10px] text-neutral-400 uppercase font-bold">Distanz</span><p class="text-sm font-black mt-0.5">{routeDistance !== null ? `${routeDistance.toFixed(1)} km` : (isCalculatingRoute ? '...' : '-- km')}</p></div>
                <div class="p-2.5 bg-neutral-50 dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-700"><span class="text-[10px] text-neutral-400 uppercase font-bold">Fahrzeit</span><p class="text-sm font-black mt-0.5">{routeDuration !== null ? formatMinutes(routeDuration) : (isCalculatingRoute ? '...' : '-- min')}</p></div>
            </div>

            <div class="w-full h-44 rounded-xl overflow-hidden border border-neutral-200 dark:border-slate-700 bg-neutral-100 dark:bg-slate-800 mb-3">
                {#if routeEmbedUrl}<iframe title="Route" src={routeEmbedUrl} class="w-full h-full border-0" loading="lazy"></iframe>{:else}<div class="w-full h-full flex items-center justify-center text-xs text-neutral-400">Keine Karte verfügbar</div>{/if}
            </div>

            {#if googleMapsNavUrl}
                <a href={googleMapsNavUrl} target="_blank" rel="noopener noreferrer" class="w-full min-h-10 flex items-center justify-center gap-2 text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 rounded-xl border border-blue-200 dark:border-blue-800 shadow-2xs hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"><ExternalLink class="w-4 h-4" /> <span>Google Maps Navigation</span></a>
            {/if}
        </div>
    {:else}
        <!-- Fallback: Keine Adresse vorhanden -->
        <div class="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-neutral-200/90 dark:border-slate-800 shadow-xs text-center space-y-3">
            <div class="w-11 h-11 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xl mx-auto shadow-2xs">
                📍
            </div>
            <div>
                <h4 class="text-sm font-bold text-slate-900 dark:text-slate-100">Keine Adresse hinterlegt</h4>
                <p class="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
                    Für diesen Termin wurde weder ein Zielort noch eine Adresse des Klienten eingetragen.
                </p>
            </div>
            {#if isEditingAddress}
                <div class="flex flex-col sm:flex-row items-center gap-2 max-w-md mx-auto pt-1">
                    <input
                        type="text"
                        bind:value={newAddressInput}
                        placeholder="Adresse eingeben (z.B. Markt 1, Halle)..."
                        class="orga-input-clear min-h-10 py-1.5 px-3 text-xs w-full"
                    />
                    <div class="flex items-center gap-1.5 shrink-0">
                        <button
                            type="button"
                            onclick={() => isEditingAddress = false}
                            class="px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
                        >
                            Abbrechen
                        </button>
                        <button
                            type="button"
                            onclick={async () => {
                                if (onSaveAddress && newAddressInput.trim()) {
                                    const ok = await onSaveAddress(newAddressInput.trim());
                                    if (ok) isEditingAddress = false;
                                }
                            }}
                            class="orga-button-primary px-3 py-1.5 text-xs font-bold rounded-xl cursor-pointer"
                            disabled={!newAddressInput.trim()}
                        >
                            Speichern
                        </button>
                    </div>
                </div>
            {:else}
                <button
                    type="button"
                    onclick={() => { newAddressInput = ""; isEditingAddress = true; }}
                    class="orga-button-ghost py-2 px-4 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                    <Edit3 class="w-3.5 h-3.5" />
                    <span>Adresse jetzt eintragen</span>
                </button>
            {/if}
        </div>
    {/if}

    <!-- 2. Fahrtenbuch -->
    <div class="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-neutral-200/90 dark:border-slate-800 shadow-xs">
        <div class="flex items-center justify-between gap-2 flex-wrap mb-3 border-b border-neutral-100 dark:border-slate-800 pb-2">
            <h3 class="text-xs font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5"><Car class="w-4 h-4 text-emerald-600" /> Fahrtenbuch</h3>
            <div class="flex items-center gap-2">
                <button type="button" onclick={() => tripRecorder.isRecording ? tripRecorder.stopTrip(true) : tripRecorder.startTrip({ appointmentId, clientId })} class="min-h-9 px-3 text-xs font-bold rounded-xl border cursor-pointer {tripRecorder.isRecording ? 'bg-rose-600 text-white border-rose-600' : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'}">{tripRecorder.isRecording ? `Stop (${tripRecorder.kilometers.toFixed(1)} km)` : 'Fahrt starten'}</button>
                <button type="button" onclick={() => onOpenDriveModal()} class="min-h-9 px-3 text-xs font-bold text-emerald-800 bg-emerald-50 rounded-xl border border-emerald-200 cursor-pointer">+ Fahrt</button>
            </div>
        </div>
        {#if driveRecords.length === 0}
            <p class="text-center text-xs text-neutral-400 py-4">Keine Fahrten hinterlegt.</p>
        {:else}
            <div class="space-y-2 mb-3">
                {#each driveRecords as drive (drive.id)}
                    <div class="p-2.5 rounded-xl border border-neutral-200 dark:border-slate-800 bg-neutral-50 dark:bg-slate-800/60 flex items-center justify-between text-xs">
                        <div><p class="font-bold">{drive.type || 'Fahrt'}</p>{#if drive.lump_sum}<p class="text-[10px] text-neutral-500">Pauschale: {drive.lump_sum.toFixed(2)} €</p>{/if}</div>
                        <div class="flex items-center gap-2">
                            <span class="font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-lg">{drive.km || 0} km</span>
                            <button type="button" onclick={() => onOpenDriveModal(drive)} class="p-1.5 bg-white dark:bg-slate-700 rounded-lg border border-neutral-200 cursor-pointer"><Edit3 class="w-3 h-3" /></button>
                            <button type="button" onclick={() => onDeleteDrive(drive.id)} class="p-1.5 bg-white dark:bg-slate-700 rounded-lg border border-neutral-200 text-rose-600 cursor-pointer"><Trash2 class="w-3 h-3" /></button>
                        </div>
                    </div>
                {/each}
            </div>
            <div class="bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 rounded-xl p-2.5 flex justify-between items-center text-xs font-bold text-emerald-950 dark:text-emerald-200"><span>Gesamte Fahrtstrecke:</span><span class="text-sm font-black">{totalKm} km</span></div>
        {/if}
    </div>
</div>
