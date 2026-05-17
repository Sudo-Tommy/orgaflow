<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";

    let { appointment } = $props<{ appointment: any }>();
    
    // svelte-ignore non_reactive_update
    let dialog: HTMLDialogElement;
    let isLoading = $state(false);
    let errorMsg = $state("");

    let editId = $state<string | null>(null);
    let titel = $state("");
    let sum = $state<number | "">("");

    export function open(record?: any) {
        if (record) {
            editId = record.id;
            titel = record.titel || "";
            sum = record.sum ?? "";
        } else {
            editId = null;
            titel = "";
            sum = "";
        }
        errorMsg = "";
        dialog?.showModal();
    }

    export function close() {
        dialog?.close();
    }

    async function onSubmit(e: Event) {
        e.preventDefault();
        isLoading = true;
        errorMsg = "";

        try {
            if (editId) {
                // Aktualisieren
                await pb.collection('expenditure').update(editId, {
                    titel,
                    sum: sum === "" ? 0 : sum
                });
            } else {
                // Anlegen
                const newRecord = await pb.collection('expenditure').create({
                    titel,
                    sum: sum === "" ? 0 : sum
                });
    
                const existing = appointment.expenditures || [];
                await pb.collection('appointments').update(appointment.id, {
                    expenditures: [...existing, newRecord.id]
                });
            }

            // Store Update erzwingen
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

<dialog bind:this={dialog} class="p-0 bg-transparent backdrop:bg-black/50 backdrop:backdrop-blur-sm w-full max-w-sm mx-auto my-auto rounded-3xl" onclick={(e) => { if (e.target === dialog) close(); }}>
    <div class="bg-white rounded-3xl p-6 md:p-8 w-full relative">
        <button aria-label="Schließen" title="Schließen" onclick={close} class="absolute top-5 right-5 w-10 h-10 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-full flex items-center justify-center transition-colors">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <h2 class="text-2xl font-bold text-neutral-900 mb-6">{editId ? 'Ausgabe bearbeiten' : 'Ausgabe hinzufügen'}</h2>
        {#if errorMsg}<div class="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm font-medium border border-red-100">{errorMsg}</div>{/if}
        <form onsubmit={onSubmit} class="space-y-4">
            <div><label for="exp-titel" class="block text-sm font-semibold text-neutral-700 mb-1.5">Titel / Zweck</label><input id="exp-titel" type="text" bind:value={titel} class="orga-input-clear" placeholder="z.B. Apothekeneinkauf" required disabled={isLoading} /></div>
            <div><label for="exp-sum" class="block text-sm font-semibold text-neutral-700 mb-1.5">Betrag in €</label><input id="exp-sum" type="number" step="0.01" bind:value={sum} class="orga-input-clear" placeholder="z.B. 14.50" required disabled={isLoading} /></div>
            <div class="pt-4 flex flex-col-reverse sm:flex-row justify-end gap-3 border-t border-neutral-100 mt-6">
                <button type="button" onclick={close} class="orga-button-ghost w-full sm:w-auto py-3 sm:py-2.5" disabled={isLoading}>Abbrechen</button>
                <button type="submit" class="orga-button-primary w-full sm:w-auto py-3 sm:py-2.5" disabled={isLoading}>{isLoading ? "Speichert..." : (editId ? "Änderungen speichern" : "Hinzufügen")}</button>
            </div>
        </form>
    </div>
</dialog>