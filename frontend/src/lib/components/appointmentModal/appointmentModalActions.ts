import { pb } from "$lib/services/pocketbase";
import { orgaStore } from "$lib/stores/orgaStore.svelte";
import { toastStore } from "$lib/services/toastService.svelte";
import { hapticFeedback } from "$lib/services/hapticFeedback";
import { triggerAutoChecklistGeneration } from "../appointmentDetail/appointmentChecklistService";
import type { AppointmentModalState } from "./appointmentModalState.svelte";

function getLocalDateString(date: Date) {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export async function saveAppointment(state: AppointmentModalState, onSaved?: (record?: any) => void, onClose?: () => void) {
    if (state.isLoading) return;
    state.isLoading = true;
    state.errorMsg = "";

    if (!state.appDate) {
        state.errorMsg = "Bitte ein Datum wählen.";
        state.activeTab = 'time';
        state.isLoading = false;
        hapticFeedback.error();
        return;
    }
    
    if (!state.is_blocked && !state.appStartTime) {
        state.errorMsg = "Bitte eine Startzeit wählen.";
        state.activeTab = 'time';
        state.isLoading = false;
        hapticFeedback.error();
        return;
    }

    if (state.isSuperAdmin && !state.selectedUserId) {
        state.errorMsg = "Bitte einen zuständigen Mitarbeiter wählen.";
        state.activeTab = 'client';
        state.isLoading = false;
        hapticFeedback.error();
        return;
    }
    
    if (!state.editId && state.is_series) {
        if (!state.seriesEndDate) {
            state.errorMsg = "Bitte wählen Sie ein Enddatum für die Serie.";
            state.activeTab = 'time';
            state.isLoading = false;
            hapticFeedback.error();
            return;
        } else if (new Date(state.seriesEndDate) < new Date(state.appDate)) {
            state.errorMsg = "Das Enddatum der Serie darf nicht vor dem Startdatum liegen.";
            state.activeTab = 'time';
            state.isLoading = false;
            hapticFeedback.error();
            return;
        }
    }

    let finalDesc = state.description.trim();
    if (state.is_blocked) {
        let cleanDesc = finalDesc.replace('[BLOCK]', '').trim();
        if (!cleanDesc || cleanDesc === "Neuer Termin") cleanDesc = "Urlaub / Abwesend";
        finalDesc = `[BLOCK] ${cleanDesc}`;
    } else {
        if (finalDesc === "Urlaub / Abwesend" || !finalDesc) finalDesc = "Neuer Termin";
    }

    try {
        const localDateStr = `${state.appDate}T${state.is_blocked ? '12:00' : (state.appStartTime || '12:00')}:00`;
        const utcAppointment = new Date(localDateStr).toISOString();
        const safeSeriesId = state.series_id || (state.is_series ? (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2)) : "");

        let resolvedBillingUser = state.billing_user;
        if (!resolvedBillingUser && state.selectedClientId) {
            const clientRec = orgaStore.clients?.data.find((c: any) => c.id === state.selectedClientId);
            if (clientRec?.billing_user) resolvedBillingUser = clientRec.billing_user;
        }
        if (!resolvedBillingUser) {
            resolvedBillingUser = state.selectedUserId || pb.authStore.model?.id || null;
        }

        let utcAppointmentEnd: string | null = null;
        if (state.appStartTime && state.appEndTime && !state.is_blocked) {
            const endDate = new Date(`${state.appDate}T${state.appEndTime}:00`);
            if (state.appEndTime < state.appStartTime) endDate.setDate(endDate.getDate() + 1);
            utcAppointmentEnd = endDate.toISOString();
        }

        const payload: any = {
            appointment: utcAppointment,
            appointment_end: utcAppointmentEnd,
            description: finalDesc,
            location_address: state.location_address,
            appointment_at: state.selectedContactId ? [state.selectedContactId] : [],
            is_private: state.is_private,
            settled: state.settled,
            billing_type: state.billing_type || null,
            billing_user: resolvedBillingUser,
            is_series: state.is_series,
            is_visible: state.is_visible,
            series_id: safeSeriesId,
            user: state.selectedUserId,
            client: state.selectedClientId ? [state.selectedClientId] : [],
            use_client_address: state.useClientAddress,
            notes: state.internalNotes,
            tasks: state.selectedTasks,
            status: state.status || 'geplant'
        };

        let savedId: string | null = state.editId;
        if (state.editId) {
            const currentEditId = state.editId;
            await pb.collection('appointments').update(currentEditId, payload, { requestKey: null });
        } else {
            if (state.is_series && state.seriesEndDate) {
                let curr = new Date(state.appDate);
                const end = new Date(state.seriesEndDate);
                const promises: Promise<any>[] = [];
                
                while(curr <= end) {
                    const iterDateStr = getLocalDateString(curr);
                    const iterLocalStr = `${iterDateStr}T${state.is_blocked ? '12:00' : (state.appStartTime || '12:00')}:00`;
                    const iterUtc = new Date(iterLocalStr).toISOString();

                    let iterEndUtc: string | null = null;
                    if (state.appStartTime && state.appEndTime && !state.is_blocked) {
                        const endDateObj = new Date(`${iterDateStr}T${state.appEndTime}:00`);
                        if (state.appEndTime < state.appStartTime) endDateObj.setDate(endDateObj.getDate() + 1);
                        iterEndUtc = endDateObj.toISOString();
                    }

                    promises.push((async () => {
                        await pb.collection('appointments').create({
                            ...payload,
                            appointment: iterUtc,
                            appointment_end: iterEndUtc,
                            time_record: []
                        }, { requestKey: null });
                    })());

                    if (state.seriesInterval === 'weekly') curr.setDate(curr.getDate() + 7);
                    else if (state.seriesInterval === 'biweekly') curr.setDate(curr.getDate() + 14);
                    else if (state.seriesInterval === 'monthly') curr.setMonth(curr.getMonth() + 1);
                }

                const chunkSize = 20;
                for (let i = 0; i < promises.length; i += chunkSize) {
                    await Promise.all(promises.slice(i, i + chunkSize));
                }
                
                if (orgaStore.appointments) await orgaStore.appointments.init();
                toastStore.success(`Serientermin erfolgreich angelegt (${promises.length} Termine)!`);
                hapticFeedback.success();
                state.isSaved = true;
                onClose?.();
                state.isLoading = false;
                return;
            } else {
                const record = await pb.collection('appointments').create({
                    ...payload,
                    time_record: []
                }, { requestKey: null });
                savedId = record.id;
                triggerAutoChecklistGeneration(savedId, { isPrivate: state.is_private, isBlocked: state.is_blocked });
            }
        }

        let savedRecord = null;
        if (savedId && orgaStore.appointments) {
            const updatedApp = await pb.collection('appointments').getOne(savedId, { expand: 'user,client,drive_record,time_record,tasks,expenditures', requestKey: null }) as any;
            const idx = orgaStore.appointments.data.findIndex((a:any) => a.id === savedId);
            const newData = [...orgaStore.appointments.data];
            if (idx !== -1) newData[idx] = updatedApp;
            else newData.push(updatedApp);
            orgaStore.appointments.data = newData;
            savedRecord = updatedApp;
        }

        state.isSaved = true;
        hapticFeedback.success();
        onClose?.();
        onSaved?.(savedRecord);
    } catch (err: any) {
        console.error(err);
        state.errorMsg = err.message || "Fehler beim Speichern.";
        hapticFeedback.error();
    } finally {
        state.isLoading = false;
    }
}

export { deleteAppointmentAction, deleteSeriesAction } from "./appointmentModalDeleteActions";
