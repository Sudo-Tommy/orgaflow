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
