import { pb } from "$lib/services/pocketbase";
import { orgaStore } from "$lib/stores/orgaStore.svelte";
import { toastStore } from "$lib/services/toastService.svelte";
import { confirmStore } from "$lib/services/confirmService.svelte";

export async function unlinkClientContact(client: any, contactId: string, contactName: string): Promise<boolean> {
    if (!client) return false;
    const confirmed = await confirmStore.ask(
        `Möchten Sie die Verknüpfung zu "${contactName}" wirklich aufheben? Der Kontakt bleibt im Adressbuch erhalten.`,
        "Verknüpfung aufheben?",
        "Verknüpfung aufheben",
        "Abbrechen",
        true
    );
    if (!confirmed) return false;

    try {
        const existingIds = Array.isArray(client.contacts) ? client.contacts : (client.contacts ? [client.contacts] : []);
        const updatedContacts = existingIds.filter((id: string) => id !== contactId);
        const currentRelations = { ...(client.contact_relations || {}) };
        delete currentRelations[contactId];

        await pb.collection('clients').update(client.id, {
            contacts: updatedContacts,
            contact_relations: currentRelations
        }, { requestKey: null });

        setTimeout(async () => {
            const updated = await pb.collection('clients').getOne(client.id, {
                expand: 'insurance,retirement_homes,contacts,caregiver,inheritor',
                requestKey: null
            }) as any;
            const index = orgaStore.clients?.data.findIndex((c: any) => c.id === client.id) ?? -1;
            if (index !== -1 && orgaStore.clients) orgaStore.clients.data[index] = updated;
        }, 300);

        toastStore.success(`Verknüpfung zu "${contactName}" aufgehoben.`);
        return true;
    } catch (err) {
        console.error(err);
        toastStore.error("Fehler beim Aufheben der Verknüpfung.");
        return false;
    }
}

export async function unlinkClientRetirementHome(client: any, homeId: string, homeName: string): Promise<boolean> {
    if (!client) return false;
    const confirmed = await confirmStore.ask(
        `Möchten Sie die Verknüpfung zum Pflegeheim "${homeName}" wirklich aufheben?`,
        "Verknüpfung aufheben?",
        "Verknüpfung aufheben",
        "Abbrechen",
        true
    );
    if (!confirmed) return false;

    try {
        const existingIds = Array.isArray(client.retirement_homes) ? client.retirement_homes : (client.retirement_homes ? [client.retirement_homes] : []);
        const updatedHomes = existingIds.filter((id: string) => id !== homeId);

        await pb.collection('clients').update(client.id, {
            retirement_homes: updatedHomes
        }, { requestKey: null });

        setTimeout(async () => {
            const updated = await pb.collection('clients').getOne(client.id, {
                expand: 'insurance,retirement_homes,contacts,caregiver,inheritor',
                requestKey: null
            }) as any;
            const index = orgaStore.clients?.data.findIndex((c: any) => c.id === client.id) ?? -1;
            if (index !== -1 && orgaStore.clients) orgaStore.clients.data[index] = updated;
        }, 300);

        toastStore.success(`Verknüpfung zum Pflegeheim aufgehoben.`);
        return true;
    } catch (err) {
        console.error(err);
        toastStore.error("Fehler beim Trennen des Pflegeheims.");
        return false;
    }
}

export async function updateClientField(clientId: string, field: string, value: any): Promise<boolean> {
    try {
        await pb.collection('clients').update(clientId, { [field]: value }, { requestKey: null });
        setTimeout(async () => {
            const updated = await pb.collection('clients').getOne(clientId, {
                expand: 'insurance,retirement_homes,contacts,caregiver,inheritor',
                requestKey: null
            }) as any;
            const index = orgaStore.clients?.data.findIndex((c: any) => c.id === clientId) ?? -1;
            if (index !== -1 && orgaStore.clients) orgaStore.clients.data[index] = updated;
        }, 300);
        toastStore.success("Erfolgreich aktualisiert.");
        return true;
    } catch (err) {
        console.error(err);
        toastStore.error("Fehler beim Speichern der Änderung.");
        return false;
    }
}
