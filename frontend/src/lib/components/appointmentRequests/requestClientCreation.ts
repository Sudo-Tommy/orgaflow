import { pb } from "$lib/services/pocketbase";
import { orgaStore } from "$lib/stores/orgaStore.svelte";
import { toastStore } from "$lib/services/toastService.svelte";
import { confirmStore } from "$lib/services/confirmService.svelte";
import { hapticFeedback } from "$lib/services/hapticFeedback";
import { rbacService } from "$lib/services/rbacService.svelte";
import { parseNameAndSalutation, parseAddress } from "./appointmentRequestsHelper";

export function findExistingClientMatch(req: any) {
    const clients = orgaStore.clients?.data || [];
    const email = (req.email || '').toLowerCase().trim();
    const phone = (req.phone || '').replace(/[^0-9+]/g, '');
    const { firstName, lastName } = parseNameAndSalutation(req.sender_name);
    const cleanFirst = firstName.toLowerCase().trim();
    const cleanLast = lastName.toLowerCase().trim();

    return clients.find((c: any) => {
        if (email && c.email && c.email.toLowerCase().trim() === email) return true;
        if (phone && phone.length > 5) {
            const cPhone = (c.phone || '').replace(/[^0-9+]/g, '');
            const cHandy = (c.handy || '').replace(/[^0-9+]/g, '');
            if (cPhone && (cPhone === phone || cPhone.endsWith(phone.slice(-7)))) return true;
            if (cHandy && (cHandy === phone || cHandy.endsWith(phone.slice(-7)))) return true;
        }
        if (cleanFirst && cleanLast && cleanFirst.length > 2 && cleanLast.length > 2) {
            const cf = (c.name_first || '').toLowerCase().trim();
            const cl = (c.name_last || '').toLowerCase().trim();
            if (cf === cleanFirst && cl === cleanLast) return true;
        }
        return false;
    });
}

export async function createClientFromRequestAction(req: any, reqService?: any): Promise<any | null> {
    if (!req) return null;

    // Duplikaterkennung
    const existing = findExistingClientMatch(req);
    if (existing) {
        const choice = await confirmStore.ask(
            `Es existiert bereits ein Klient "${existing.name_first} ${existing.name_last}". Möchten Sie diese Anfrage dem bestehenden Klienten zuordnen?`,
            "Klient existiert bereits",
            "Bestehendem Klienten zuordnen",
            "Trotzdem neu anlegen",
            false
        );
        if (choice) {
            req.client_id = existing.id;
            try {
                if (req._collection === 'inquiries') {
                    await pb.collection('inquiries').update(req.id, { status: 'converted' }, { requestKey: null });
                } else {
                    await pb.collection('appointment_requests').update(req.id, { client_id: existing.id, status: 'accepted' }, { requestKey: null });
                }
                req.status = 'accepted';
                toastStore.success(`Anfrage "${existing.name_first} ${existing.name_last}" zugeordnet.`);
                hapticFeedback.success();
                return existing;
            } catch (err: any) {
                toastStore.error("Fehler beim Zuordnen: " + (err.message || ''));
                return null;
            }
        }
    }

    const { salutation, firstName, lastName } = parseNameAndSalutation(req.sender_name);
    const { streetName, houseNr, zip, city } = parseAddress(req.street, req.zip_city);

    let companyId = rbacService.userCompanyId || '';
    if (!companyId && pb.authStore.model?.company) {
        const comp = pb.authStore.model.company;
        companyId = Array.isArray(comp) ? comp[0] : comp;
    }

    const formData = new FormData();
    formData.append('status', 'Aktiv');
    formData.append('salutation', salutation || 'Keine Angabe');
    formData.append('name_first', firstName || 'Neuer');
    formData.append('name_last', lastName || 'Klient');
    formData.append('street', streetName || '');
    formData.append('housenr', houseNr || '');
    formData.append('zip', zip || '');
    formData.append('city', city || '');
    formData.append('phone', req.phone || '');
    formData.append('email', (req.email && req.email.includes('@')) ? req.email.trim() : '');
    formData.append('hourly_rate', '36');
    formData.append('tax_rate', '0');
    formData.append('km_rate', '0.3');
    formData.append('level_of_care', 'Keine Angabe');
    if (companyId) formData.append('company', companyId);

    const timeLabel = new Date().toLocaleDateString('de-DE');
    const noteText = `Aus Online-Anfrage übernommen am ${timeLabel}:\n${req.request_text || req.ai_summary || 'Keine Beschreibung'}`;
    formData.append('notes', noteText);

    // Anhänge übertragen falls vorhanden
    if (Array.isArray(req.attachments) && req.attachments.length > 0) {
        for (const filename of req.attachments) {
            try {
                const fileUrl = pb.files.getURL(req, filename);
                const fileRes = await fetch(fileUrl);
                if (fileRes.ok) {
                    const blob = await fileRes.blob();
                    formData.append('documents', new File([blob], filename, { type: blob.type }));
                }
            } catch (fileErr) {
                console.warn("[createClientFromRequestAction] Dateianhang nicht kopierbar:", filename, fileErr);
            }
        }
    }

    try {
        const createdClient = await pb.collection('clients').create(formData, { requestKey: null });

        if (orgaStore.clients) {
            orgaStore.clients.data = [createdClient as any, ...orgaStore.clients.data];
        }

        req.client_id = createdClient.id;
        req.status = 'accepted';

        if (req._collection === 'inquiries') {
            await pb.collection('inquiries').update(req.id, { status: 'converted' }, { requestKey: null });
        } else {
            await pb.collection('appointment_requests').update(req.id, { client_id: createdClient.id, status: 'accepted' }, { requestKey: null });
        }

        if (reqService?.updateStatus) {
            await reqService.updateStatus(req.id, 'accepted', createdClient.id);
        }

        toastStore.success(`Klient "${createdClient.name_first} ${createdClient.name_last}" erfolgreich angelegt & aktiviert!`);
        hapticFeedback.success();
        return createdClient;
    } catch (e: any) {
        console.error("[createClientFromRequestAction] Fehler beim Anlegen des Klienten:", e);
        toastStore.error("Klient konnte nicht angelegt werden: " + (e.message || ''));
        hapticFeedback.error();
        return null;
    }
}

