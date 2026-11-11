import { pb } from "$lib/services/pocketbase";
import { orgaStore } from "$lib/stores/orgaStore.svelte";
import { toastStore } from "$lib/services/toastService.svelte";
import type { ExpenditureState } from "./expenditureState.svelte";

export async function saveExpenditure(
    state: ExpenditureState,
    appointment: any,
    onSaved?: (app: any) => void
): Promise<boolean> {
    state.isLoading = true;
    state.errorMsg = "";

    try {
        const formData = new FormData();
        formData.append('titel', state.titel.trim());
        formData.append('sum', (state.sum === "" ? 0 : state.sum).toString());

        if (state.receiptFile) {
            formData.append('receipt', state.receiptFile);
        } else if (state.removeReceipt && state.editId) {
            formData.append('receipt', '');
        }

        if (state.editId) {
            await pb.collection('expenditure').update(state.editId, formData);
        } else {
            const newRecord = await pb.collection('expenditure').create(formData);
            const existing = appointment.expenditures || [];
            await pb.collection('appointments').update(appointment.id, {
                expenditures: [...existing, newRecord.id]
            });
        }

        const updatedApp = await pb.collection('appointments').getOne(appointment.id, { 
            expand: 'user,client,drive_record,time_record,tasks,expenditures,appointment_at', requestKey: null
        }) as any;

        orgaStore.appointments.replaceItem(appointment.id, updatedApp);
        if (onSaved) onSaved(updatedApp);

        toastStore.success(state.editId ? "Sonderausgabe gespeichert." : "Sonderausgabe hinzugefügt.");
        return true;
    } catch (err: any) {
        console.error(err);
        state.errorMsg = err.message || "Fehler beim Speichern.";
        toastStore.error(state.errorMsg);
        return false;
    } finally {
        state.isLoading = false;
    }
}
