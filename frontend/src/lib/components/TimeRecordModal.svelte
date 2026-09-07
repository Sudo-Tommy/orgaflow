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
    let startTime = $state("");
    let endTime = $state("");
    let initialDataHash = $state("");

    // Hilfsfunktion: Extrahiert "hh:mm" aus einem ISO-Datum für das time Input
    function extractTime(dateString?: string) {
        if (!dateString) return "";
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return "";
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }

    // Hilfsfunktion: Kombiniert das Datum des Termins mit der eingegebenen Uhrzeit
    function combineDateAndTime(timeString: string) {
        if (!timeString || !appointment?.appointment) return null;
        const baseDate = new Date(appointment.appointment);
        if (isNaN(baseDate.getTime())) return null;

        const [hours, minutes] = timeString.split(':').map(Number);
        const d = new Date(baseDate);
        d.setHours(hours, minutes, 0, 0);
        return d.toISOString();
    }

    export function open(record?: any) {
        if (record) {
            editId = record.id;
            startTime = extractTime(record.start);
            endTime = extractTime(record.end);
        } else {
            editId = null;
            startTime = "";
            endTime = "";
        }
        errorMsg = "";
        initialDataHash = JSON.stringify({ startTime, endTime });
        dialog?.showModal();
    }

    export function close() {
        dialog?.close();
    }

    export async function attemptClose() {
        if (JSON.stringify({ startTime, endTime }) !== initialDataHash) {
            if (!(await confirmStore.ask("Sie haben ungespeicherte Änderungen. Möchten Sie wirklich abbrechen?", "Änderungen verwerfen?", "Verwerfen", "Abbrechen", true))) return;
        }
        close();
    }

    async function onSubmit(e: Event) {
        e.preventDefault();
        isLoading = true;
        errorMsg = "";

        try {
            const payload = {
                start: combineDateAndTime(startTime),
                end: combineDateAndTime(endTime)
            };

            if (editId) {
                // Bestehenden Datensatz aktualisieren
                await pb.collection('time_records').update(editId, payload);
            } else {
                // 1. Neuen Zeiteintrag in der Collection anlegen
                const newRecord = await pb.collection('time_records').create(payload);
    
                // 2. Den neuen Eintrag mit dem Termin verknüpfen
                const existing = appointment.time_record || [];
                await pb.collection('appointments').update(appointment.id, {
                    time_record: [...existing, newRecord.id]
                });
            }

            // Realtime Update im Store erzwingen, um Relationen in der Ansicht live zu aktualisieren
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

<dialog bind:this={dialog} class="p-0 bg-transparent backdrop:bg-slate-950/65 backdrop:backdrop-blur-md w-full max-w-sm mx-auto my-auto rounded-3xl" onclick={(e) => { if (e.target === dialog) attemptClose(); }}>
    <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-3xl p-6 md:p-8 w-full relative shadow-2xl">
        <button aria-label="Schließen" title="Schließen" onclick={attemptClose} class="absolute top-5 right-5 w-10 h-10 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full flex items-center justify-center transition-colors">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <h2 class="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6">{editId ? 'Zeit bearbeiten' : 'Zeit erfassen'}</h2>
        {#if errorMsg}<div class="bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-300 p-4 rounded-xl mb-6 text-sm font-medium border border-red-200 dark:border-red-900/60">{errorMsg}</div>{/if}
        <form onsubmit={onSubmit} class="space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label for="time-start" class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Startzeit</label><input id="time-start" type="time" bind:value={startTime} class="orga-input-clear py-3 sm:py-2.5" required disabled={isLoading} /></div>
                <div><label for="time-end" class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Endzeit</label><input id="time-end" type="time" bind:value={endTime} class="orga-input-clear py-3 sm:py-2.5" disabled={isLoading} /></div>
            </div>
            <div class="pt-4 flex flex-col-reverse sm:flex-row justify-end gap-3 border-t border-slate-100 dark:border-slate-800 mt-6">
                <button type="button" onclick={attemptClose} class="orga-button-ghost w-full sm:w-auto py-3 sm:py-2.5" disabled={isLoading}>Abbrechen</button>
                <button type="submit" class="orga-button-primary w-full sm:w-auto py-3 sm:py-2.5" disabled={isLoading}>{isLoading ? "Speichert..." : (editId ? "Änderungen speichern" : "Eintragen")}</button>
            </div>
        </form>
    </div>
</dialog>