import { pb } from "$lib/services/pocketbase";
import { orgaStore } from "$lib/stores/orgaStore.svelte";
import type { ClientRecord, RetirementHomeRecord } from "$lib/types/orgaTypes";

interface ClientRelationUpdate {
    id: string;
    contacts?: string[];
    caregiver?: string;
}

interface HomeRelationUpdate {
    id: string;
    contacts?: string[];
}

export async function syncContactClientRelations(
    savedContactId: string,
    initialLinkedClients: string[],
    linkedClients: string[]
): Promise<void> {
    const clientsToUpdate: ClientRelationUpdate[] = [];
    const clientList = ((orgaStore.clients?.data || []) as ClientRecord[]);

    for (const c of clientList) {
        const isCurrentlyLinked = initialLinkedClients.includes(c.id);
        const shouldBeLinked = linkedClients.includes(c.id);

        if (isCurrentlyLinked !== shouldBeLinked) {
            let cContacts = Array.isArray(c.contacts) ? [...c.contacts] : (c.contacts ? [c.contacts] : []);
            const updates: ClientRelationUpdate = { id: c.id };

            if (shouldBeLinked) {
                if (!cContacts.includes(savedContactId)) {
                    cContacts.push(savedContactId);
                    updates.contacts = cContacts;
                }
            } else {
                if (cContacts.includes(savedContactId)) {
                    updates.contacts = cContacts.filter((id) => id !== savedContactId);
                }
                if (c.caregiver === savedContactId) {
                    updates.caregiver = "";
                }
            }

            if (updates.contacts !== undefined || updates.caregiver !== undefined) {
                clientsToUpdate.push(updates);
            }
        }
    }

    for (const update of clientsToUpdate) {
        const payload: Partial<ClientRecord> = {};
        if (update.contacts !== undefined) payload.contacts = update.contacts;
        if (update.caregiver !== undefined) payload.caregiver = update.caregiver;
        await pb.collection('clients').update(update.id, payload);
    }

    if (clientsToUpdate.length > 0 && orgaStore.clients) {
        setTimeout(async () => {
            if (orgaStore.clients) await orgaStore.clients.init();
        }, 300);
    }
}

export async function syncContactHomeRelations(
    savedContactId: string,
    initialLinkedHomes: string[],
    linkedHomes: string[]
): Promise<void> {
    const homesToUpdate: HomeRelationUpdate[] = [];
    const homeList = ((orgaStore.retirement_homes?.data || []) as RetirementHomeRecord[]);

    for (const h of homeList) {
        const isCurrentlyLinked = initialLinkedHomes.includes(h.id);
        const shouldBeLinked = linkedHomes.includes(h.id);

        if (isCurrentlyLinked !== shouldBeLinked) {
            let hContacts = Array.isArray(h.contacts) ? [...h.contacts] : (h.contacts ? [h.contacts] : []);
            const updates: HomeRelationUpdate = { id: h.id };

            if (shouldBeLinked) {
                if (!hContacts.includes(savedContactId)) {
                    hContacts.push(savedContactId);
                    updates.contacts = hContacts;
                }
            } else {
                if (hContacts.includes(savedContactId)) {
                    updates.contacts = hContacts.filter((id) => id !== savedContactId);
                }
            }

            if (updates.contacts !== undefined) {
                homesToUpdate.push(updates);
            }
        }
    }

    for (const update of homesToUpdate) {
        const payload: Partial<RetirementHomeRecord> = {};
        if (update.contacts !== undefined) payload.contacts = update.contacts;
        await pb.collection('retirement_homes').update(update.id, payload);
    }

    if (homesToUpdate.length > 0 && orgaStore.retirement_homes) {
        setTimeout(async () => {
            if (orgaStore.retirement_homes) await orgaStore.retirement_homes.init();
        }, 300);
    }
}

export async function syncAllContactRelations(
    savedContactId: string,
    initialClients: string[],
    currentClients: string[],
    initialHomes: string[],
    currentHomes: string[]
): Promise<void> {
    await Promise.all([
        syncContactClientRelations(savedContactId, initialClients, currentClients),
        syncContactHomeRelations(savedContactId, initialHomes, currentHomes)
    ]);
    if (orgaStore.contacts) {
        await orgaStore.contacts.init();
    }
}
