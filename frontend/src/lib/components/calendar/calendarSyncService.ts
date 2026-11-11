import { pb } from "$lib/services/pocketbase";
import { orgaStore } from "$lib/stores/orgaStore.svelte";
import { toastStore } from "$lib/services/toastService.svelte";
import { googleCalendarService } from "$lib/services/googleCalendarService";
import type { AppointmentRecord } from "$lib/types/orgaTypes";

export async function syncAllCalendarData(canEdit: boolean, isSuperAdmin: boolean, loadGoogleFn?: () => Promise<void>) {
    toastStore.info("Kalender wird mit Google synchronisiert...");
    try {
        if (canEdit) {
            await googleCalendarService.syncAll().catch(() => {});
            if (loadGoogleFn) {
                await loadGoogleFn();
            }
        }
        if (orgaStore.appointments) {
            const refreshed = await pb.collection('appointments').getFullList<AppointmentRecord>({
                expand: 'user,client,appointment_at,drive_record,time_record,tasks,expenditures',
                sort: 'appointment',
                requestKey: null
            });
            orgaStore.appointments.data = refreshed;
        }
        toastStore.success("Kalender erfolgreich synchronisiert.");
    } catch (err) {
        console.error("Fehler beim Synchronisieren:", err);
        toastStore.error("Fehler beim Synchronisieren des Kalenders.");
    }
}

export async function moveAppointment(appId: string, newDate: Date): Promise<void> {
    const app = orgaStore.appointments?.getById(appId);
    const oldDate = new Date((app?.appointment as string) || newDate);
    const deltaMs = newDate.getTime() - oldDate.getTime();

    if (app?.expand?.time_record?.length) {
        for (const tr of app.expand.time_record) {
            const trPayload: any = {};
            if (tr.start) trPayload.start = new Date(new Date(tr.start).getTime() + deltaMs).toISOString();
            if (tr.end) trPayload.end = new Date(new Date(tr.end).getTime() + deltaMs).toISOString();
            if (Object.keys(trPayload).length > 0) {
                await pb.collection('time_records').update(tr.id, trPayload).catch((e) => {
                    console.warn('[calendarSyncService] time_record update fehlgeschlagen:', tr.id, e);
                });
            }
        }
    }

    const appUpdatePayload: Record<string, any> = { appointment: newDate.toISOString() };
    if (app?.appointment_end) {
        const oldEnd = new Date(app.appointment_end);
        if (!isNaN(oldEnd.getTime())) {
            appUpdatePayload.appointment_end = new Date(oldEnd.getTime() + deltaMs).toISOString();
        }
    }

    await pb.collection('appointments').update(appId, appUpdatePayload);
    googleCalendarService.syncAppointment(appId, 'upsert').catch(() => {});
    const updated = await pb.collection<any>('appointments').getOne(appId, {
        expand: 'user,client,appointment_at,drive_record,time_record,tasks,expenditures'
    });
    if (orgaStore.appointments) {
        const idx = orgaStore.appointments.data.findIndex(a => a.id === appId);
        if (idx !== -1) orgaStore.appointments.data[idx] = updated;
    }
}

export async function toggleAppVisibility(app: any): Promise<boolean> {
    const newValue = !app.is_visible;
    await pb.collection('appointments').update(app.id, { is_visible: newValue });
    if (orgaStore.appointments) {
        const idx = orgaStore.appointments.data.findIndex(a => a.id === app.id);
        if (idx !== -1) {
            const copy = [...orgaStore.appointments.data];
            copy[idx] = { ...copy[idx], is_visible: newValue };
            orgaStore.appointments.data = copy;
        }
    }
    toastStore.success(newValue ? "Termin ist nun für alle sichtbar 👁️" : "Termin ist nun nur für Sie & Admins sichtbar 🙈");
    return newValue;
}

export function subscribeRealtimeAppointments(): () => void {
    const callback = async (e: any) => {
        if (!orgaStore.appointments) return;
        if (e.action === 'delete') {
            orgaStore.appointments.data = orgaStore.appointments.data.filter((a: any) => a.id !== e.record.id);
        } else {
            try {
                const updated = await pb.collection<any>('appointments').getOne(e.record.id, {
                    expand: 'user,client,appointment_at,drive_record,time_record,tasks,expenditures',
                    requestKey: null
                });
                const idx = orgaStore.appointments.data.findIndex((a: any) => a.id === e.record.id);
                const list = [...orgaStore.appointments.data];
                if (idx !== -1) list[idx] = updated;
                else list.push(updated);
                orgaStore.appointments.data = list;
            } catch {}
        }
    };
    pb.collection('appointments').subscribe('*', callback, { requestKey: null });
    return () => { pb.collection('appointments').unsubscribe('*'); };
}
