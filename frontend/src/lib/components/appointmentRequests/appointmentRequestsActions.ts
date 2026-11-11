import { pb } from "$lib/services/pocketbase";
import { orgaStore } from "$lib/stores/orgaStore.svelte";
import { toastStore } from "$lib/services/toastService.svelte";
import { confirmStore } from "$lib/services/confirmService.svelte";
import { hapticFeedback } from "$lib/services/hapticFeedback";
import { MICROSERVICE_URL } from "$lib/services/emailService";
import { 
    parseNameAndSalutation, parseAddress, 
    getDetectedClient, resolveAppointmentTiming, 
    resolveLocationAndContact 
} from "./appointmentRequestsHelper";
import { createClientFromRequestAction } from "./requestClientCreation";

export { createClientFromRequestAction };

export async function loadAiSummaryForRequest(req: any, force = false, summarizingReqIds: Record<string, boolean>) {
    if (!req?.id || (!force && req.ai_summary) || summarizingReqIds[req.id]) return;
    summarizingReqIds[req.id] = true;
    try {
        const res = await fetch(`${MICROSERVICE_URL}/ai/summarize-request`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${pb.authStore.token}`
            },
            body: JSON.stringify({ id: req.id, force })
        });
        if (res.ok) {
            const data = await res.json();
            if (data.summary) req.ai_summary = data.summary;
        }
    } catch (err) {
        console.warn('[AI Summary] Fehler beim Laden:', err);
    } finally {
        summarizingReqIds[req.id] = false;
    }
}

export async function acceptClientAction(id: string) {
    try {
        const client = await pb.collection('clients').getOne(id, { requestKey: null });
        let updatedNotes = client.notes || '';
        let newInsuranceId: string | null = null;
        let newInsName = '';

        const match = updatedNotes.match(/\[NEUE_KRANKENKASSE:\s*({.*?})\]/);
        if (match) {
            try {
                const insData = JSON.parse(match[1]);
                newInsName = (insData.name || '').trim();
                if (newInsName) {
                    const existingList = await pb.collection('insurancies').getFullList({
                        filter: `name ~ "${newInsName}"`,
                        requestKey: null
                    }).catch(() => []);
                    
                    const exactMatch = existingList.find((i: any) => i.name.toLowerCase().trim() === newInsName.toLowerCase().trim());
                    if (exactMatch) {
                        newInsuranceId = exactMatch.id;
                    } else {
                        const created = await pb.collection('insurancies').create({
                            name: newInsName,
                            street: insData.street || '',
                            zip: insData.zip || '',
                            city: insData.city || '',
                            type: 'GKV (Gesetzlich)'
                        });
                        newInsuranceId = created.id;
                        if (orgaStore.insurancies) {
                            orgaStore.insurancies.data = [created as any, ...orgaStore.insurancies.data];
                        }
                    }
                }
                updatedNotes = updatedNotes.replace(/\[NEUE_KRANKENKASSE:\s*{.*?}\]\n?/g, '').trim();
            } catch (err) {
                console.error("Fehler beim Verarbeiten der neuen Krankenkasse:", err);
            }
        }

        const updatePayload: any = { status: 'Aktiv', notes: updatedNotes };
        if (newInsuranceId) updatePayload.insurance = [newInsuranceId];

        const updatedClient = await pb.collection('clients').update(id, updatePayload, {
            expand: 'insurance,contacts,caregiver,retirement_homes',
            requestKey: null
        });

        if (orgaStore.clients) {
            const idx = orgaStore.clients.data.findIndex((c: any) => c.id === id);
            if (idx !== -1) orgaStore.clients.data[idx] = updatedClient as any;
        }

        toastStore.success(newInsuranceId && newInsName 
            ? `Klient aufgenommen und Krankenkasse "${newInsName}" direkt neu angelegt!` 
            : "Klient wurde erfolgreich aufgenommen (Status: Aktiv).");
        hapticFeedback.success();
    } catch (e: any) {
        console.error(e);
        toastStore.error("Fehler beim Aufnehmen des Klienten: " + (e.message || ''));
        hapticFeedback.error();
    }
}

export async function deleteNewClientAction(id: string) {
    if (await confirmStore.ask("Möchten Sie diese Anfrage und den Klienten wirklich unwiderruflich löschen?", "Anfrage löschen?", "Löschen", "Abbrechen", true)) {
        try {
            await pb.collection('clients').delete(id);
            if (orgaStore.clients) orgaStore.clients.data = orgaStore.clients.data.filter((c: any) => c.id !== id);
            toastStore.info("Aufnahme-Anfrage gelöscht.");
            hapticFeedback.warning();
        } catch {
            toastStore.error("Fehler beim Löschen.");
            hapticFeedback.error();
        }
    }
}

export async function copyToClientAction(req: any, filename: string, clientId: string, silent = false) {
    try {
        if (!silent) toastStore.info("Übertrage Datei...");
        const url = pb.files.getURL(req, filename);
        const res = await fetch(url);
        const blob = await res.blob();
        const file = new File([blob], filename, { type: blob.type });

        const formData = new FormData();
        formData.append('documents', file);

        await pb.collection('clients').update(clientId, formData);
        if (!silent) {
            toastStore.success("Datei wurde erfolgreich in der Klienten-Akte gespeichert.");
            hapticFeedback.success();
        }
    } catch (e) {
        if (!silent) {
            toastStore.error("Fehler beim Speichern der Datei.");
            hapticFeedback.error();
        }
        console.error(e);
    }
}

export async function createContactFromRequestAction(req: any, reqService: any) {
    if (!req) return;
    const { salutation, firstName, lastName } = parseNameAndSalutation(req.sender_name);
    const { streetName, houseNr, zip, city } = parseAddress(req.street, req.zip_city);

    const payload: any = {
        salutation,
        company_name: '',
        name_first: firstName,
        name_last: lastName || 'Unbekannt',
        street: streetName,
        housenr: houseNr,
        zip,
        city,
        phone: req.phone || '',
        email: req.email || '',
        notes: `Aus Kundenanfrage übernommen:\n${req.request_text || req.ai_summary || ''}`
    };

    try {
        const created = await pb.collection('contacts').create(payload, { requestKey: null });
        if (orgaStore.contacts) orgaStore.contacts.optimisticCreate(created as any);

        const client = getDetectedClient(req);
        if (client?.id && orgaStore.clients) {
            const currentContacts = Array.isArray(client.contacts) ? [...client.contacts, created.id] : [created.id];
            await pb.collection('clients').update(client.id, { contacts: currentContacts }, { requestKey: null });
        }
        if (req.id) await reqService.updateStatus(req.id, 'accepted');

        toastStore.success(`Kontakt erfolgreich erstellt & Anfrage erledigt!`);
        hapticFeedback.success();
    } catch (err: any) {
        console.error("Fehler beim Anlegen des Kontakts:", err);
        toastStore.error("Kontakt konnte nicht erstellt werden: " + (err.message || ''));
        hapticFeedback.error();
    }
}

export async function assignClientToRequestAction(req: any, client: any) {
    req.client_id = client.id;
    try {
        await pb.collection('appointment_requests').update(req.id, { client_id: client.id }, { requestKey: null });
        toastStore.success(`Klient "${client.name_first} ${client.name_last}" erfolgreich zugeordnet.`);
        hapticFeedback.success();
    } catch (e) {
        console.error(e);
        toastStore.error("Fehler beim Zuordnen des Klienten.");
        hapticFeedback.error();
    }
}

export async function transferRequestToAppointmentAction(
    req: any,
    options: { openModal?: boolean },
    transferringReqIds: Record<string, boolean>,
    reqService: any,
    appointmentModal: any
) {
    if (!req?.id || transferringReqIds[req.id]) return;
    transferringReqIds[req.id] = true;
    try {
        let client = getDetectedClient(req);
        if (!client && !options.openModal) {
            client = await createClientFromRequestAction(req, reqService);
        }

        const { appDateStr, appTimeStr } = resolveAppointmentTiming(req);
        const { locationAddress } = resolveLocationAndContact(req, client);
        const appPayload: any = {
            description: req.sender_name ? `Termin: ${req.sender_name}` : 'Termin aus Anfrage',
            appointment: new Date(`${appDateStr}T${appTimeStr || '10:00'}:00`).toISOString(),
            location_address: locationAddress,
            client: client?.id ? [client.id] : [],
            notes: `Aus Terminanfrage erstellt:\n${req.request_text || ''}`
        };
        if (options.openModal) {
            appointmentModal?.open(appPayload);
        } else {
            await pb.collection('appointments').create(appPayload, { requestKey: null });
            await reqService.updateStatus(req.id, 'accepted', client?.id);
            toastStore.success(client ? `Termin für "${client.name_first} ${client.name_last}" erfolgreich angelegt!` : "Termin erfolgreich angelegt!");
            hapticFeedback.success();
        }
    } catch {
        toastStore.error("Fehler beim Erstellen des Termins.");
        hapticFeedback.error();
    } finally {
        transferringReqIds[req.id] = false;
    }
}
