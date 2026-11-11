import { pb } from "$lib/services/pocketbase";
import { orgaStore } from "$lib/stores/orgaStore.svelte";
import { toastStore } from "$lib/services/toastService.svelte";
import { confirmStore } from "$lib/services/confirmService.svelte";
import { hapticFeedback } from "$lib/services/hapticFeedback";
import type { AppointmentModalState } from "./appointmentModalState.svelte";

export async function deleteAppointmentAction(state: AppointmentModalState, onClose?: () => void) {
    if (!state.editId) return;
    const msg = state.is_series ? "Möchten Sie nur diesen einzelnen Termin löschen?" : "Möchten Sie diesen Termin wirklich löschen?";
    if (!(await confirmStore.ask(msg, "Termin löschen?", "Löschen", "Abbrechen", true))) return;

    state.isLoading = true;
    try {
        await pb.collection('appointments').delete(state.editId);
        if (orgaStore.appointments) orgaStore.appointments.data = orgaStore.appointments.data.filter((a:any) => a.id !== state.editId);
        toastStore.info("Termin gelöscht.");
        hapticFeedback.warning();
        state.isDeleted = true;
        onClose?.();
    } catch (err) {
        state.errorMsg = "Fehler beim Löschen.";
        hapticFeedback.error();
    } finally {
        state.isLoading = false;
    }
}

export async function deleteSeriesAction(state: AppointmentModalState, onClose?: () => void) {
    if (!state.editId || !state.is_series || !state.series_id) return;
    if (!(await confirmStore.ask("Möchten Sie diesen und ALLE zukünftigen Termine dieser Serie wirklich löschen?", "Komplette Serie löschen?", "Ja, Serie löschen", "Abbrechen", true))) return;
    state.isLoading = true;
    try {
        if (state.series_id && state.appDate) {
            const localDateStr = `${state.appDate}T00:00:00`;
            const futureApps = await pb.collection('appointments').getFullList({
                filter: `series_id = '${state.series_id}' && appointment >= '${new Date(localDateStr).toISOString()}'`,
                requestKey: null
            });
            const promises: Promise<any>[] = [];
            for (const a of futureApps) {
                if (a.time_record) {
                    for (const trId of a.time_record) promises.push(pb.collection('time_records').delete(trId).catch(()=>{}));
                }
                promises.push(pb.collection('appointments').delete(a.id));
            }
            const chunkSize = 20;
            for (let i = 0; i < promises.length; i += chunkSize) {
                await Promise.all(promises.slice(i, i + chunkSize));
            }
            if (orgaStore.appointments) {
                const deletedIds = futureApps.map((a:any) => a.id);
                orgaStore.appointments.data = orgaStore.appointments.data.filter((a:any) => !deletedIds.includes(a.id));
            }
            toastStore.info(`Komplette Terminserie gelöscht (${futureApps.length} Termine).`);
            hapticFeedback.warning();
        }
        state.isDeleted = true;
        onClose?.();
    } catch (err) {
        state.errorMsg = "Fehler beim Löschen der Serie.";
        hapticFeedback.error();
    } finally {
        state.isLoading = false;
    }
}
