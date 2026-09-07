<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import { confirmStore } from "$lib/services/confirmService.svelte";

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

    export function open(record?: any) {
        if (record) {
            editId = record.id;
            type = record.type || "Anfahrt";
            km = record.km ?? "";
            lump_sum = record.lump_sum ?? "";
        } else {
            editId = null;
            type = "Anfahrt";
            km = "";
            lump_sum = "";
        }
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

        try {
            if (editId) {
                // Datensatz aktualisieren
                await pb.collection('drive_records').update(editId, {
                    type,
                    km: km === "" ? 0 : km,
                    lump_sum: lump_sum === "" ? 0 : lump_sum
                });
            } else {
                // Neu anlegen
                const newRecord = await pb.collection('drive_records').create({
                    type,
                    km: km === "" ? 0 : km,
                    lump_sum: lump_sum === "" ? 0 : lump_sum
                });
    
                const existing = appointment.drive_record || [];
                await pb.collection('appointments').update(appointment.id, {
                    drive_record: [...existing, newRecord.id]
                });
            }

            // Termin-Record aktualisieren für UI-Live-Sync
            setTimeout(async () => {
                const updatedApp = await pb.collection('appointments').getOne(appointment.id, { 
                    expand: 'user,client,drive_record,time_record,tasks,expenditures,appointment_at', requestKey: null
                }) as any;
                const index = orgaStore.appointments?.data.findIndex(a => a.id === appointment.id) ?? -1;
                if (index !== -1 && orgaStore.appointments) {
                    orgaStore.appointments.data[index] = updatedApp;
                }
            }, 400);

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
            <div><label for="drive-type" class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Art der Fahrt</label><select id="drive-type" bind:value={type} class="orga-input-clear" required disabled={isLoading}><option value="Anfahrt">Anfahrt (zu Klient / von Klient)</option><option value="Auftragsfahrt">Auftragsfahrt (z.B. Einkauf)</option></select></div>
            <div class="grid grid-cols-2 gap-4"><div><label for="drive-km" class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Gefahrene Kilometer</label><input id="drive-km" type="number" step="0.1" bind:value={km} class="orga-input-clear" placeholder="z.B. 15.5" disabled={isLoading} /></div><div><label for="drive-lump" class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Pauschale in €</label><input id="drive-lump" type="number" step="0.01" bind:value={lump_sum} class="orga-input-clear" placeholder="z.B. 5.00" disabled={isLoading} /></div></div>
            <div class="pt-4 flex flex-col-reverse sm:flex-row justify-end gap-3 border-t border-slate-100 dark:border-slate-800 mt-6">
                <button type="button" onclick={attemptClose} class="orga-button-ghost w-full sm:w-auto py-3 sm:py-2.5" disabled={isLoading}>Abbrechen</button>
                <button type="submit" class="orga-button-primary w-full sm:w-auto py-3 sm:py-2.5" disabled={isLoading}>{isLoading ? "Speichert..." : (editId ? "Änderungen speichern" : "Fahrt sichern")}</button>
            </div>
        </form>
    </div>
</dialog>