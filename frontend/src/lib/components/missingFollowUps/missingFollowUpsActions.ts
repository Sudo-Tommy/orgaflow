import { pb } from "$lib/services/pocketbase";
import { orgaStore } from "$lib/stores/orgaStore.svelte";
import { confirmStore } from "$lib/services/confirmService.svelte";
import { toastStore } from "$lib/services/toastService.svelte";

export async function markAppointmentAsPrivate(app: any): Promise<boolean> {
    const clientName = app.expand?.client?.[0] 
        ? `${app.expand.client[0].name_first} ${app.expand.client[0].name_last}`.trim()
        : 'Termin';
    const dateStr = new Date(app.appointment).toLocaleDateString('de-DE');

    if (!(await confirmStore.ask(
        `Möchten Sie den Termin für "${clientName}" vom ${dateStr} als "privat" kennzeichnen? Dadurch wird er nicht mehr in der Nachbereitung angezeigt.`,
        "Termin als privat markieren?",
        "Als privat markieren",
        "Abbrechen",
        false
    ))) return false;

    try {
        await pb.collection('appointments').update(app.id, { is_private: true });
        toastStore.success("Termin als privat markiert.");
        if (orgaStore.appointments) await orgaStore.appointments.init();
        return true;
    } catch {
        toastStore.error("Fehler beim Aktualisieren des Termins.");
        return false;
    }
}

export async function deleteAppointment(app: any): Promise<boolean> {
    const clientName = app.expand?.client?.[0] 
        ? `${app.expand.client[0].name_first} ${app.expand.client[0].name_last}`.trim()
        : 'Termin';
    const dateStr = new Date(app.appointment).toLocaleDateString('de-DE');

    if (!(await confirmStore.ask(
        `Möchten Sie den Termin für "${clientName}" vom ${dateStr} wirklich löschen? Dies kann nicht rückgängig gemacht werden.`,
        "Termin löschen?",
        "Löschen",
        "Abbrechen",
        true
    ))) return false;

    try {
        await pb.collection('appointments').delete(app.id);
        toastStore.success("Termin erfolgreich gelöscht.");
        if (orgaStore.appointments) await orgaStore.appointments.init();
        return true;
    } catch {
        toastStore.error("Fehler beim Löschen des Termins.");
        return false;
    }
}

export async function batchMarkAsPrivate(selectedIds: string[]): Promise<boolean> {
    if (selectedIds.length === 0) return false;
    if (!(await confirmStore.ask(
        `Möchten Sie ${selectedIds.length} Termine als "privat" kennzeichnen?`,
        "Termine privat markieren?",
        "Als privat markieren",
        "Abbrechen",
        false
    ))) return false;

    try {
        const promises = selectedIds.map(id => pb.collection('appointments').update(id, { is_private: true }));
        for (let i = 0; i < promises.length; i += 20) await Promise.all(promises.slice(i, i + 20));
        toastStore.success(`${selectedIds.length} Termine als privat markiert.`);
        if (orgaStore.appointments) await orgaStore.appointments.init();
        return true;
    } catch {
        toastStore.error("Fehler beim Aktualisieren der Termine.");
        return false;
    }
}

export async function batchDeleteAppointments(selectedIds: string[]): Promise<boolean> {
    if (selectedIds.length === 0) return false;
    if (!(await confirmStore.ask(
        `Möchten Sie ${selectedIds.length} Termine wirklich unwiderruflich aus dem System löschen?`,
        "Termine unwiderruflich löschen?",
        "Unwiderruflich Löschen",
        "Abbrechen",
        true
    ))) return false;

    try {
        const promises = selectedIds.map(id => pb.collection('appointments').delete(id));
        for (let i = 0; i < promises.length; i += 20) await Promise.all(promises.slice(i, i + 20));
        toastStore.success(`${selectedIds.length} Termine gelöscht.`);
        if (orgaStore.appointments) await orgaStore.appointments.init();
        return true;
    } catch (err) {
        console.error("Fehler beim Löschen:", err);
        toastStore.error("Fehler beim Löschen der Termine.");
        return false;
    }
}

export async function updateAppointmentBillingType(app: any, newType: string): Promise<boolean> {
    const previousType = app.billing_type;
    try {
        await pb.collection('appointments').update(app.id, { billing_type: newType || null });
        app.billing_type = newType;
        toastStore.success('Abrechnungsart aktualisiert.');
        if (orgaStore.appointments) await orgaStore.appointments.init();
        return true;
    } catch {
        app.billing_type = previousType;
        toastStore.error("Abrechnungsart konnte nicht gespeichert werden.");
        return false;
    }
}
