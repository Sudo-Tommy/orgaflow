import { orgaStore } from "$lib/stores/orgaStore.svelte";

export interface AvailableContact {
    name: string;
    email: string;
    phone: string;
    salutation: string;
    isClient: boolean;
    isDirect: boolean;
    directRole?: string; // z.B. "Klient", "Angehöriger / Kontakt", "Pflegeheim", "Krankenkasse", "Betreuer", "Verteiler"
}

/**
 * Erstellt eine vollständige, deduplizierte Liste aller Kontakte für den E-Mail- & Nachrichtenversand.
 * Direkte Kontakte des übergebenen Klienten (Klient selbst, Angehörige/Kontakte, Pflegeheim, Kasse, Betreuer)
 * werden mit isDirect=true markiert und STRIKT GANZ OBEN platziert!
 */
export function buildPrioritizedContacts(targetClientOrList?: any | any[]): AvailableContact[] {
    const directList: AvailableContact[] = [];
    const otherList: AvailableContact[] = [];
    const seenEmailsAndPhones = new Set<string>();

    const targetClients: any[] = [];
    if (targetClientOrList) {
        if (Array.isArray(targetClientOrList)) {
            targetClients.push(...targetClientOrList.filter(Boolean));
        } else {
            targetClients.push(targetClientOrList);
        }
    }

    // IDs aller direkten Entitäten des/der Zielklienten sammeln
    const directContactIds = new Set<string>();
    const directHomeIds = new Set<string>();
    const directInsuranceIds = new Set<string>();
    const directCaregiverIds = new Set<string>();
    const directClientIds = new Set<string>();

    for (const rawC of targetClients) {
        if (!rawC) continue;
        // Falls nur die ID übergeben wurde oder das Objekt noch nicht alle Relationen hat: im Store nachschlagen
        const c = (rawC.id && orgaStore.clients?.data?.find(sc => sc.id === rawC.id)) || rawC;
        if (c.id) directClientIds.add(c.id);

        // Kontakte (Angehörige, Bevollmächtigte)
        const cIds = Array.isArray(c.contacts) ? c.contacts : (c.contacts ? [c.contacts] : []);
        cIds.forEach((id: string) => directContactIds.add(id));
        if (c.expand?.contacts) {
            const expList = Array.isArray(c.expand.contacts) ? c.expand.contacts : [c.expand.contacts];
            expList.forEach((contactObj: any) => {
                if (contactObj?.id) directContactIds.add(contactObj.id);
            });
        }

        // Pflegeheime
        const hIds = Array.isArray(c.retirement_homes) ? c.retirement_homes : (c.retirement_homes ? [c.retirement_homes] : []);
        hIds.forEach((id: string) => directHomeIds.add(id));
        if (c.expand?.retirement_homes) {
            const expHomes = Array.isArray(c.expand.retirement_homes) ? c.expand.retirement_homes : [c.expand.retirement_homes];
            expHomes.forEach((h: any) => { if (h?.id) directHomeIds.add(h.id); });
        }

        // Krankenkasse / Versicherung
        if (c.insurance) directInsuranceIds.add(c.insurance);
        if (c.expand?.insurance?.id) directInsuranceIds.add(c.expand.insurance.id);

        // Betreuer
        if (c.caregiver) directCaregiverIds.add(c.caregiver);
        if (c.expand?.caregiver?.id) directCaregiverIds.add(c.expand.caregiver.id);
    }

    const addContact = (contact: AvailableContact) => {
        if (!contact.email && !contact.phone) return;
        const key = `${(contact.email || '').toLowerCase().trim()}-${(contact.phone || '').trim()}`;
        if (seenEmailsAndPhones.has(key)) return;
        seenEmailsAndPhones.add(key);

        if (contact.isDirect) {
            directList.push(contact);
        } else {
            otherList.push(contact);
        }
    };

    // 1. PHASE: Direkte Kontakte der Ziel-Klienten erfassen (höchste Priorität)
    for (const rawC of targetClients) {
        if (!rawC) continue;
        const c = (rawC.id && orgaStore.clients?.data?.find(sc => sc.id === rawC.id)) || rawC;
        const cName = `${c.name_first || ''} ${c.name_last || ''}`.trim() || 'Klient';
        const sal = c.salutation === 'Herr' ? `Sehr geehrter Herr ${c.name_last}` : (c.salutation === 'Frau' ? `Sehr geehrte Frau ${c.name_last}` : `Guten Tag ${cName}`);
        
        // Klient selbst
        addContact({
            name: `${cName} (Klient)`,
            email: c.email || '',
            phone: c.phone || c.handy || '',
            salutation: sal + ',',
            isClient: true,
            isDirect: true,
            directRole: 'Klient'
        });

        // Verteilerliste des Klienten
        if (c.mailing_list && Array.isArray(c.mailing_list)) {
            for (const mEmail of c.mailing_list) {
                if (mEmail) {
                    addContact({
                        name: `${cName} (Verteiler: ${mEmail})`,
                        email: mEmail,
                        phone: '',
                        salutation: 'Sehr geehrte Damen und Herren,',
                        isClient: false,
                        isDirect: true,
                        directRole: 'Verteiler'
                    });
                }
            }
        }
    }

    // Direkte Angehörige / Kontakte des Klienten
    orgaStore.contacts?.data?.forEach((c: any) => {
        if (directContactIds.has(c.id)) {
            const sal = c.salutation === 'Herr' ? `Sehr geehrter Herr ${c.name_last}` : (c.salutation === 'Frau' ? `Sehr geehrte Frau ${c.name_last}` : `Guten Tag ${c.name_first} ${c.name_last}`);
            const role = c.company_name || 'Angehöriger / Kontakt';
            addContact({
                name: `${c.name_first} ${c.name_last} (${role})`,
                email: c.email || '',
                phone: c.phone || '',
                salutation: sal + ',',
                isClient: false,
                isDirect: true,
                directRole: role
            });
        }
    });

    // Direktes Pflegeheim des Klienten
    orgaStore.retirement_homes?.data?.forEach((h: any) => {
        if (directHomeIds.has(h.id)) {
            addContact({
                name: `${h.name} (Pflegeheim des Klienten)`,
                email: h.email || '',
                phone: h.phone || '',
                salutation: `Sehr geehrte Damen und Herren vom ${h.name},`,
                isClient: false,
                isDirect: true,
                directRole: 'Pflegeheim'
            });
        }
    });

    // Direkte Krankenkasse des Klienten
    orgaStore.insurancies?.data?.forEach((i: any) => {
        if (directInsuranceIds.has(i.id)) {
            addContact({
                name: `${i.name} (Krankenkasse des Klienten)`,
                email: i.email || '',
                phone: i.phone || '',
                salutation: `Sehr geehrte Damen und Herren,`,
                isClient: false,
                isDirect: true,
                directRole: 'Krankenkasse'
            });
        }
    });

    // Direkter Betreuer (aus contacts)
    orgaStore.contacts?.data?.forEach((c: any) => {
        if (directCaregiverIds.has(c.id)) {
            const sal = c.salutation === 'Herr' ? `Sehr geehrter Herr ${c.name_last}` : (c.salutation === 'Frau' ? `Sehr geehrte Frau ${c.name_last}` : `Guten Tag ${c.name_first} ${c.name_last}`);
            addContact({
                name: `${c.name_first} ${c.name_last} (Betreuer)`,
                email: c.email || '',
                phone: c.phone || '',
                salutation: sal + ',',
                isClient: false,
                isDirect: true,
                directRole: 'Betreuer'
            });
        }
    });

    // 2. PHASE: Alle weiteren Kontakte aus dem Adressbuch anhängen
    orgaStore.clients?.data?.forEach((c: any) => {
        if (!directClientIds.has(c.id)) {
            const sal = c.salutation === 'Herr' ? `Sehr geehrter Herr ${c.name_last}` : (c.salutation === 'Frau' ? `Sehr geehrte Frau ${c.name_last}` : `Guten Tag ${c.name_first} ${c.name_last}`);
            addContact({
                name: `${c.name_first} ${c.name_last} (Klient)`,
                email: c.email || '',
                phone: c.phone || c.handy || '',
                salutation: sal + ',',
                isClient: true,
                isDirect: false
            });
        }
    });

    orgaStore.contacts?.data?.forEach((c: any) => {
        if (!directContactIds.has(c.id) && !directCaregiverIds.has(c.id)) {
            const sal = c.salutation === 'Herr' ? `Sehr geehrter Herr ${c.name_last}` : (c.salutation === 'Frau' ? `Sehr geehrte Frau ${c.name_last}` : `Guten Tag ${c.name_first} ${c.name_last}`);
            addContact({
                name: `${c.name_first} ${c.name_last} (${c.company_name || 'Kontakt'})`,
                email: c.email || '',
                phone: c.phone || '',
                salutation: sal + ',',
                isClient: false,
                isDirect: false
            });
        }
    });

    orgaStore.retirement_homes?.data?.forEach((h: any) => {
        if (!directHomeIds.has(h.id)) {
            addContact({
                name: `${h.name} (Pflegeheim)`,
                email: h.email || '',
                phone: h.phone || '',
                salutation: `Sehr geehrte Damen und Herren vom ${h.name},`,
                isClient: false,
                isDirect: false
            });
        }
    });

    orgaStore.insurancies?.data?.forEach((i: any) => {
        if (!directInsuranceIds.has(i.id)) {
            addContact({
                name: `${i.name} (Krankenkasse)`,
                email: i.email || '',
                phone: i.phone || '',
                salutation: `Sehr geehrte Damen und Herren,`,
                isClient: false,
                isDirect: false
            });
        }
    });

    // Sortierung: Direkte Kontakte alphabetisch, restliche Kontakte alphabetisch
    directList.sort((a, b) => a.name.localeCompare(b.name));
    otherList.sort((a, b) => a.name.localeCompare(b.name));

    // STRIKTE REIHENFOLGE: Alle direkten Kontakte des Klienten immer ganz oben!
    return [...directList, ...otherList];
}

import { pb } from "$lib/services/pocketbase";

/**
 * Gleicht einen neu erstellten Kontakt mit offenen Kundenanfragen (inquiries & appointment_requests) ab.
 * Wenn eine Übereinstimmung (Name, E-Mail oder Firma) gefunden wird, wird die Anfrage automatisch als
 * erledigt ('converted' bzw. 'accepted') markiert, sodass der Benachrichtigungszähler sofort verschwindet.
 */
export async function resolveMatchingInquiriesForContact(contact: any) {
    if (!contact) return;
    try {
        const email = (contact.email || '').toLowerCase().trim();
        const fName = (contact.name_first || '').toLowerCase().trim();
        const lName = (contact.name_last || '').toLowerCase().trim();
        const companyName = (contact.company_name || '').toLowerCase().trim();

        // 1. Offene inquiries prüfen
        const inqs = await pb.collection('inquiries').getList(1, 30, {
            filter: 'status = "new" || status = "in_progress"',
            requestKey: null
        }).catch(() => ({ items: [] }));

        for (const inq of inqs.items) {
            const inqEmail = (inq.sender_email || inq.email || '').toLowerCase().trim();
            const inqName = (inq.sender_name || '').toLowerCase().trim();
            const isMatch = (email && inqEmail && inqEmail === email) ||
                (lName && lName.length >= 3 && inqName.includes(lName)) ||
                (companyName && companyName.length >= 4 && inqName.includes(companyName));
            if (isMatch) {
                await pb.collection('inquiries').update(inq.id, { status: 'converted' }, { requestKey: null });
            }
        }

        // 2. Offene appointment_requests prüfen
        const reqs = await pb.collection('appointment_requests').getList(1, 30, {
            filter: 'status != "accepted" && status != "denied"',
            requestKey: null
        }).catch(() => ({ items: [] }));

        for (const req of reqs.items) {
            const reqEmail = (req.email || '').toLowerCase().trim();
            const reqName = (req.sender_name || '').toLowerCase().trim();
            const isMatch = (email && reqEmail && reqEmail === email) ||
                (lName && lName.length >= 3 && reqName.includes(lName)) ||
                (companyName && companyName.length >= 4 && reqName.includes(companyName));
            if (isMatch) {
                await pb.collection('appointment_requests').update(req.id, { status: 'accepted' }, { requestKey: null });
            }
        }
    } catch (e) {
        console.warn("[Auto-Resolve Inquiries] Fehler beim Abgleich:", e);
    }
}
