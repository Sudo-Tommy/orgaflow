import { pb } from "$lib/services/pocketbase";
import { orgaStore } from "$lib/stores/orgaStore.svelte";
import { toastStore } from "$lib/services/toastService.svelte";
import { confirmStore } from "$lib/services/confirmService.svelte";
import { googleCalendarService } from "$lib/services/googleCalendarService";

export async function deleteSingleAppointment(appointment: any, onSuccess: () => void): Promise<void> {
    if (!appointment) return;
    const hasGoogle = Boolean(appointment.google_event_id);
    const msg = appointment.is_series
        ? "Möchten Sie nur diesen einzelnen Termin (inkl. Google Kalender) löschen?"
        : (hasGoogle
            ? "Möchten Sie diesen Termin wirklich in OrgaFlow und im verknüpften Google Kalender löschen?"
            : "Möchten Sie diesen Termin wirklich löschen?");

    if (!(await confirmStore.ask(msg, "Termin löschen?", "Löschen", "Abbrechen", true))) return;

    try {
        if (hasGoogle) {
            googleCalendarService.syncAppointment(appointment.id, 'delete', appointment.google_event_id).catch(() => {});
        }
        if (Array.isArray(appointment.time_record)) {
            for (const trId of appointment.time_record) {
                await pb.collection('time_records').delete(trId).catch(() => {});
            }
        }
        await pb.collection('appointments').delete(appointment.id);
        if (orgaStore.appointments) {
            orgaStore.appointments.data = orgaStore.appointments.data.filter((a: any) => a.id !== appointment.id);
        }
        toastStore.info(hasGoogle ? "Termin in OrgaFlow und Google Kalender gelöscht." : "Termin gelöscht.");
        onSuccess();
    } catch {
        toastStore.error("Fehler beim Löschen.");
    }
}

export async function deleteAppointmentSeries(appointment: any, onSuccess: () => void): Promise<void> {
    if (!appointment?.is_series || !appointment.series_id) return;
    if (!(await confirmStore.ask("Möchten Sie diesen und ALLE zukünftigen Termine dieser Serie (inkl. Google Kalender) löschen?", "Komplette Serie löschen?", "Ja, Serie löschen", "Abbrechen", true))) return;

    try {
        const appDate = new Date(appointment.appointment as string || new Date());
        appDate.setHours(0, 0, 0, 0);
        const futureApps = await pb.collection('appointments').getFullList({
            filter: `series_id = '${appointment.series_id}' && appointment >= '${appDate.toISOString()}'`,
            requestKey: null
        });

        const promises = [];
        for (const a of futureApps) {
            if (a.google_event_id) {
                promises.push(googleCalendarService.syncAppointment(a.id, 'delete', a.google_event_id).catch(() => {}));
            }
            if (a.time_record) {
                for (const trId of a.time_record) promises.push(pb.collection('time_records').delete(trId).catch(() => {}));
            }
            promises.push(pb.collection('appointments').delete(a.id));
        }

        const chunkSize = 20;
        for (let i = 0; i < promises.length; i += chunkSize) {
            await Promise.all(promises.slice(i, i + chunkSize));
        }

        if (orgaStore.appointments) {
            const deletedIds = futureApps.map((a: any) => a.id);
            orgaStore.appointments.data = orgaStore.appointments.data.filter((a: any) => !deletedIds.includes(a.id));
        }
        toastStore.info(`Komplette Terminserie gelöscht (${futureApps.length} Termine).`);
        onSuccess();
    } catch {
        toastStore.error("Fehler beim Löschen der Serie.");
    }
}
