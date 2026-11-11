import type { ClientRecord, ContactRecord, RetirementHomeRecord } from "$lib/types/orgaTypes";
import { toastStore } from "$lib/services/toastService.svelte";
import { pb } from "$lib/services/pocketbase";
import { confirmStore } from "$lib/services/confirmService.svelte";
import { orgaStore } from "$lib/stores/orgaStore.svelte";

const RETIREMENT_HOME_KEYWORDS = /(pflegeheim|seniorenheim|altenheim|seniorenresidenz|altersheim|pflegezentrum|seniorenpark|seniorendomizil|seniorenhaus|pflegehaus|hospiz|pflegeeinrichtung|wohnheim|altenpflegeheim|pflegeresidenz|senioren-residenz|pflege- und|betreutes wohnen|alten- und pflegeheim)/i;

/**
 * Erkennt anhand von Schlüsselwörtern, ob ein Kontakt in Wahrheit eine Pflegeeinrichtung / ein Pflegeheim ist
 */
export function isSuspectedRetirementHome(contact: Partial<ContactRecord>): boolean {
    if (!contact) return false;
    const targets = [
        contact.company_name,
        contact.name_first,
        contact.name_last,
        typeof contact.notes === 'string' ? contact.notes : ''
    ].filter(Boolean).join(" ");
    return RETIREMENT_HOME_KEYWORDS.test(targets);
}

/**
 * Überführt einen irrtümlich als Kontakt angelegten Eintrag in die Tabelle retirement_homes
 */
export async function convertContactToRetirementHome(
    contact: ContactRecord,
    options?: { onCompleted?: (newHome: RetirementHomeRecord) => void }
): Promise<boolean> {
    const displayName = contact.company_name || `${contact.name_first || ''} ${contact.name_last || ''}`.trim() || "Unbenanntes Heim";

    const confirmed = await confirmStore.ask(
        `Möchten Sie „${displayName}“ wirklich in den Bereich „Pflegeheime & Einrichtungen“ verschieben?\n\nDer Eintrag wird als neues Pflegeheim angelegt, verknüpfte Klienten werden automatisch umgemeldet und der Kontakt wird aus der Kontaktliste entfernt.`,
        "In Pflegeheime verschieben?",
        "Jetzt verschieben",
        "Abbrechen",
        false
    );

    if (!confirmed) return false;

    try {
        const fullAddress = [
            [contact.street, contact.housenr].filter(Boolean).join(" "),
            [contact.zip, contact.city].filter(Boolean).join(" ")
        ].filter(Boolean).join(", ");

        const homePayload = {
            name: displayName,
            phone: contact.phone || "",
            email: contact.email || "",
            street: [contact.street, contact.housenr].filter(Boolean).join(" "),
            zip: contact.zip || "",
            city: contact.city || "",
            address: fullAddress,
            source: "converted_contact",
            is_verified: true,
            contacts: []
        };

        const newHome = await pb.collection('retirement_homes').create(homePayload) as RetirementHomeRecord;

        const clientsToUpdate = ((orgaStore.clients?.data || []) as ClientRecord[]).filter((c) => {
            const cContacts = Array.isArray(c.contacts) ? c.contacts : (c.contacts ? [c.contacts] : []);
            return cContacts.includes(contact.id);
        });

        for (const client of clientsToUpdate) {
            const currentContacts = Array.isArray(client.contacts) ? [...client.contacts] : (client.contacts ? [client.contacts] : []);
            const updatedContacts = currentContacts.filter(id => id !== contact.id);

            const currentHomes = Array.isArray(client.retirement_homes) ? [...client.retirement_homes] : (client.retirement_homes ? [client.retirement_homes] : []);
            if (!currentHomes.includes(newHome.id)) {
                currentHomes.push(newHome.id);
            }

            await pb.collection('clients').update(client.id, {
                contacts: updatedContacts,
                retirement_homes: currentHomes
            });
        }

        await pb.collection('contacts').delete(contact.id);

        if (orgaStore.contacts) await orgaStore.contacts.init();
        if (orgaStore.retirement_homes) await orgaStore.retirement_homes.init();
        if (clientsToUpdate.length > 0 && orgaStore.clients) await orgaStore.clients.init();

        toastStore.success(`„${displayName}“ erfolgreich in „Pflegeheime & Einrichtungen“ übertragen.`);
        if (options?.onCompleted) {
            options.onCompleted(newHome);
        }
        return true;
    } catch (err: any) {
        console.error("Fehler beim Übertragen des Pflegeheims:", err);
        toastStore.error("Fehler beim Verschieben: " + (err?.message || "Unbekannter Fehler"));
        return false;
    }
}
