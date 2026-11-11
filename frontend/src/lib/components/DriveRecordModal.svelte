<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import { confirmStore } from "$lib/services/confirmService.svelte";
    import { toastStore } from "$lib/services/toastService.svelte";
    import GpsAddressButton from "$lib/components/common/GpsAddressButton.svelte";
    import { fetchRouteMetrics } from "$lib/components/appointmentDetail/appointmentRouteService";
    import { MapPin } from "lucide-svelte";

    let { appointment } = $props<{ appointment: any }>();
    
    // svelte-ignore non_reactive_update
    let dialog: HTMLDialogElement;
    let isLoading = $state(false);
    let errorMsg = $state("");

    let editId = $state<string | null>(null);
    let type = $state("Anfahrt");
    let km = $state<number | "">("");
    let lump_sum = $state<number | "">("");
    let initialDataHash = $state("");

    let capturedAddress = $state("");
    let isCalculatingDistance = $state(false);

    function getAppointmentDestination(): string {
        if (appointment?.location_address?.trim()) return appointment.location_address.trim();
        const client = appointment?.expand?.client?.[0] || appointment?.expand?.client;
        if (client) {
            return [
                `${client.street || ''} ${client.housenr || ''}`.trim(),
                `${client.zip || ''} ${client.city || ''}`.trim()
            ].filter(Boolean).join(', ');
        }
        return '';
    }

    async function handleAddressCaptured(address: string, _coords: { latitude: number; longitude: number }) {
        capturedAddress = address;
        const destination = getAppointmentDestination();
        if (destination) {
            isCalculatingDistance = true;
            try {
                const metrics = await fetchRouteMetrics(address, destination);
                if (metrics && metrics.distance > 0) {
                    km = Number(metrics.distance.toFixed(1));
                    toastStore.success(`Distanz (${km} km) automatisch berechnet.`);
                }
            } catch (e) {
                console.warn("Routenberechnung fehlgeschlagen:", e);
            } finally {
                isCalculatingDistance = false;
            }
        } else if (appointment?.id && !appointment.id.startsWith('google_') && !appointment.location_address) {
            try {
                await pb.collection('appointments').update(appointment.id, { location_address: address });
                appointment.location_address = address;
                toastStore.success("Standort als Zieladresse im Termin hinterlegt.");
            } catch (e) {
                console.warn("Fehler beim Speichern der Zieladresse:", e);
            }
        }
    }

    export function open(record?: any) {
        if (record) {
            editId = record.id;
            type = record.type || "Anfahrt";
            km = record.km ?? "";
            lump_sum = record.lump_sum ?? "";
        } else {
            editId = null;
            type = "Anfahrt";
            km = (appointment?.route_distance !== undefined && appointment?.route_distance !== null)
                ? Number(appointment.route_distance.toFixed(1))
                : "";
            lump_sum = "";
        }
        capturedAddress = "";
        errorMsg = "";
        initialDataHash = JSON.stringify({ type, km, lump_sum });
        dialog?.showModal();
    }

    export function close() {
        dialog?.close();
    }

    export async function attemptClose() {
        if (JSON.stringify({ type, km, lump_sum }) !== initialDataHash) {
            if (!(await confirmStore.ask("Sie haben ungespeicherte Änderungen. Möchten Sie wirklich abbrechen?", "Änderungen verwerfen?", "Verwerfen", "Abbrechen", true))) return;
        }
        close();
    }

    async function onSubmit(e: Event) {
        e.preventDefault();
        isLoading = true;
        errorMsg = "";

        // PocketBase Schema Contract: drive_records collection strictly accepts { type, km, lump_sum }
        const payload = {
            type,
            km: km === "" ? 0 : Number(km),
            lump_sum: lump_sum === "" ? 0 : Number(lump_sum)
        };

        try {
            if (editId) {
                await pb.collection('drive_records').update(editId, payload);
            } else {
                const newRecord = await pb.collection('drive_records').create(payload);
    
                const existing = appointment.drive_record || [];
                if (appointment?.id && !appointment.id.startsWith('google_')) {
                    await pb.collection('appointments').update(appointment.id, {
                        drive_record: [...existing, newRecord.id]
                    });
                }
            }

            if (appointment?.id && !appointment.id.startsWith('google_')) {
                setTimeout(async () => {
                    const updatedApp = await pb.collection('appointments').getOne(appointment.id, { 
                        expand: 'user,client,drive_record,time_record,tasks,expenditures,appointment_at', requestKey: null
                    }) as any;
                    const index = orgaStore.appointments?.data.findIndex(a => a.id === appointment.id) ?? -1;
                    if (index !== -1 && orgaStore.appointments) {
                        orgaStore.appointments.data[index] = updatedApp;
                    }
                }, 400);
            }

            close();
        } catch (err: any) {
            console.error(err);
            errorMsg = err.message || "Fehler beim Speichern.";
            if (err.response?.data) {
                const details = Object.entries(err.response.data).map(([k, v]: any) => `${k}: ${v.message}`).join(", ");
                if (details) errorMsg += ` (${details})`;
            }
        } finally {
            isLoading = false;
        }
    }
</script>

<dialog bind:this={dialog} class="p-0 bg-transparent backdrop:bg-slate-950/65 backdrop:backdrop-blur-md w-full max-w-md mx-auto my-auto rounded-3xl" onclick={(e) => { if (e.target === dialog) attemptClose(); }}>
    <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-3xl p-6 md:p-8 w-full relative shadow-2xl">
        <button aria-label="Schließen" title="Schließen" onclick={attemptClose} class="absolute top-5 right-5 w-10 h-10 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full flex items-center justify-center transition-colors">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <h2 class="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6">{editId ? 'Fahrt bearbeiten' : 'Fahrt eintragen'}</h2>
        {#if errorMsg}<div class="bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-300 p-4 rounded-xl mb-6 text-sm font-medium border border-red-200 dark:border-red-900/60">{errorMsg}</div>{/if}
        <form onsubmit={onSubmit} class="space-y-4">
            <div>
                <label for="drive-type" class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Art der Fahrt</label>
                <select id="drive-type" bind:value={type} class="orga-input-clear" required disabled={isLoading}>
                    <option value="Anfahrt">Anfahrt (zu Klient / von Klient)</option>
                    <option value="Auftragsfahrt">Auftragsfahrt (z.B. Einkauf)</option>
                </select>
            </div>

            <!-- GPS Standort- & Streckenerfassung -->
            <div class="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700 space-y-2">
                <div class="flex items-center justify-between">
                    <span class="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <MapPin class="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        <span>GPS-Streckenerfassung</span>
                    </span>
                    <GpsAddressButton
                        label="Standort erfassen"
                        variant="button"
                        onAddressCaptured={handleAddressCaptured}
                        disabled={isLoading || isCalculatingDistance}
                    />
                </div>

                {#if capturedAddress}
                    <div class="text-xs space-y-1 pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60">
                        <div class="flex items-center justify-between text-slate-500 dark:text-slate-400">
                            <span>Erfasster Standort:</span>
                            {#if isCalculatingDistance}
                                <span class="text-indigo-600 dark:text-indigo-400 animate-pulse font-medium">Berechne Distanz...</span>
                            {/if}
                        </div>
                        <p class="font-medium text-slate-800 dark:text-slate-200 truncate">{capturedAddress}</p>
                    </div>
                {/if}
            </div>

            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label for="drive-km" class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Gefahrene Kilometer</label>
                    <input id="drive-km" type="number" step="0.1" bind:value={km} class="orga-input-clear" placeholder="z.B. 15.5" disabled={isLoading} />
                </div>
                <div>
                    <label for="drive-lump" class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Pauschale in €</label>
                    <input id="drive-lump" type="number" step="0.01" bind:value={lump_sum} class="orga-input-clear" placeholder="z.B. 5.00" disabled={isLoading} />
                </div>
            </div>

            <div class="pt-4 flex flex-col-reverse sm:flex-row justify-end gap-3 border-t border-slate-100 dark:border-slate-800 mt-6">
                <button type="button" onclick={attemptClose} class="orga-button-ghost w-full sm:w-auto py-3 sm:py-2.5" disabled={isLoading}>Abbrechen</button>
                <button type="submit" class="orga-button-primary w-full sm:w-auto py-3 sm:py-2.5" disabled={isLoading}>{isLoading ? "Speichert..." : (editId ? "Änderungen speichern" : "Fahrt sichern")}</button>
            </div>
        </form>
    </div>
</dialog>
