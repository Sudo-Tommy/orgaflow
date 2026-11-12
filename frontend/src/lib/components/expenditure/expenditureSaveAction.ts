import { pb } from "$lib/services/pocketbase";
import { orgaStore } from "$lib/stores/orgaStore.svelte";
import { toastStore } from "$lib/services/toastService.svelte";
import { connectionManager } from "$lib/services/connectionManager.svelte";
import { queueOfflineMutation } from "$lib/services/offlineDb";
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

        if (!connectionManager.isOnline) {
            if (state.editId) {
                await queueOfflineMutation('expenditure', 'update', state.editId, formData, { label: state.titel.trim() });
            } else {
                await queueOfflineMutation('expenditure', 'create', undefined, formData, {
                    label: state.titel.trim(),
                    parentLink: { parentCollection: 'appointments', parentId: appointment.id, parentField: 'expenditures' }
                });
            }
            toastStore.info("Beleg offline gespeichert – wird automatisch gesendet.");
            return true;
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
        if (!navigator.onLine || err?.status === 0) {
            const fd = new FormData();
            fd.append('titel', state.titel.trim());
            fd.append('sum', (state.sum === "" ? 0 : state.sum).toString());
            if (state.receiptFile) fd.append('receipt', state.receiptFile);
            await queueOfflineMutation('expenditure', state.editId ? 'update' : 'create', state.editId || undefined, fd, {
                label: state.titel.trim(),
                parentLink: state.editId ? undefined : { parentCollection: 'appointments', parentId: appointment.id, parentField: 'expenditures' }
            });
            toastStore.info("Beleg offline gespeichert – wird automatisch gesendet.");
            return true;
        }
        console.error(err);
        state.errorMsg = err.message || "Fehler beim Speichern.";
        toastStore.error(state.errorMsg);
        return false;
    } finally {
        state.isLoading = false;
    }
}
