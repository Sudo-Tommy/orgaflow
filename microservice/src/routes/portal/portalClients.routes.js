import { Router } from 'express';
import { getAdminPb } from '../../services/pb.js';
import { resolvePortalAuth } from '../../middleware/portalAuth.js';
import { getContactClientsFilter } from '../../services/portal/portalHelper.js';

const router = Router();

router.get(['/api/emails/portal/insurances', '/portal/insurances'], async (req, res) => {
    try {
        const pb = await getAdminPb();
        const insurances = await pb.collection('insurancies').getFullList({ sort: 'name', requestKey: null });
        res.json({ success: true, insurances });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get(['/api/emails/portal/clients', '/portal/clients'], async (req, res) => {
    const auth = await resolvePortalAuth(req.headers.authorization, res);
    if (!auth) return;

    try {
        const pb = auth.pb || await getAdminPb();
        const expand = 'insurance,caregiver,contacts,retirement_homes';
        const internalUsers = await pb.collection('users').getFullList({ fields: 'id,name_first,name_last,email,phone,clients', requestKey: null }).catch(() => []);

        const mapClient = (c) => {
            const assigned = internalUsers.filter(u => Array.isArray(u.clients) && u.clients.includes(c.id));
            return {
                ...c, name: `${c.name_first} ${c.name_last}`.trim(),
                assigned_employee: assigned[0] ? { id: assigned[0].id, name_first: assigned[0].name_first, name_last: assigned[0].name_last, email: assigned[0].email, phone: assigned[0].phone } : null
            };
        };

        if (auth.type === 'admin') {
            const list = await pb.collection('clients').getFullList({ sort: 'name_first', expand, requestKey: null });
            return res.json({ success: true, clients: list.map(mapClient) });
        }

        const filter = auth.type === 'contact' ? await getContactClientsFilter(pb, auth) : `id = "${auth.clientId}"`;
        const clients = await pb.collection('clients').getFullList({ filter, expand, requestKey: null });
        res.json({ success: true, clients: clients.map(mapClient) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put(['/api/emails/portal/clients/:id', '/portal/clients/:id'], async (req, res) => {
    const auth = await resolvePortalAuth(req.headers.authorization, res);
    if (!auth) return;

    try {
        const pb = auth.pb || await getAdminPb();
        const { name_first, name_last, email, phone, handy, street, housenr, zip, city, birthdate, level_of_care, insurance_nr, insurance, retirement_homes } = req.body;
        const update = { name_first, name_last, email, phone, handy, street, housenr, zip, city, level_of_care, insurance_nr };
        if (birthdate) update.birthdate = birthdate.includes(':') ? birthdate : `${birthdate} 12:00:00.000Z`;
        if (insurance !== undefined) update.insurance = insurance;
        if (retirement_homes !== undefined) {
            update.retirement_homes = Array.isArray(retirement_homes) ? retirement_homes : (retirement_homes ? [retirement_homes] : []);
        }

        const updated = await pb.collection('clients').update(req.params.id, update);
        res.json({ success: true, client: updated });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

function prepareContactPayload(body) {
    let notesData = body.notes;
    if (typeof notesData === 'string' || !notesData || typeof notesData !== 'object') {
        notesData = {
            role: body.relationship || '',
            details: typeof body.notes === 'string' ? body.notes : ''
        };
    } else if (body.relationship) {
        notesData.role = body.relationship;
    }

    const payload = {};
    if (body.name_first !== undefined) payload.name_first = body.name_first;
    if (body.name_last !== undefined) payload.name_last = body.name_last;
    if (body.company_name !== undefined) payload.company_name = body.company_name;
    if (body.phone !== undefined) payload.phone = body.phone;
    if (body.email !== undefined) payload.email = body.email;
    if (body.street !== undefined) payload.street = body.street;
    if (body.housenr !== undefined) payload.housenr = body.housenr;
    if (body.zip !== undefined) payload.zip = body.zip;
    if (body.city !== undefined) payload.city = body.city;
    if (body.salutation !== undefined) payload.salutation = body.salutation;
    if (notesData !== undefined) payload.notes = notesData;

    return payload;
}

router.post(['/api/emails/portal/clients/:id/contacts', '/portal/clients/:id/contacts'], async (req, res) => {
    const auth = await resolvePortalAuth(req.headers.authorization, res);
    if (!auth) return;

    try {
        const pb = auth.pb || await getAdminPb();
        const payload = prepareContactPayload(req.body);
        const newContact = await pb.collection('contacts').create(payload);
        const client = await pb.collection('clients').getOne(req.params.id);
        const contacts = Array.isArray(client.contacts) ? [...client.contacts, newContact.id] : [newContact.id];
        await pb.collection('clients').update(req.params.id, { contacts });
        res.json({ success: true, contact: newContact });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put(['/api/emails/portal/clients/:id/contacts/:contactId', '/portal/clients/:id/contacts/:contactId'], async (req, res) => {
    const auth = await resolvePortalAuth(req.headers.authorization, res);
    if (!auth) return;

    try {
        const pb = auth.pb || await getAdminPb();
        const payload = prepareContactPayload(req.body);
        const updatedContact = await pb.collection('contacts').update(req.params.contactId, payload);

        const client = await pb.collection('clients').getOne(req.params.id);
        const contacts = Array.isArray(client.contacts) ? client.contacts : [];
        if (!contacts.includes(req.params.contactId)) {
            await pb.collection('clients').update(req.params.id, {
                contacts: [...contacts, req.params.contactId]
            });
        }

        res.json({ success: true, contact: updatedContact });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete(['/api/emails/portal/clients/:id/contacts/:contactId', '/portal/clients/:id/contacts/:contactId'], async (req, res) => {
    const auth = await resolvePortalAuth(req.headers.authorization, res);
    if (!auth) return;

    try {
        const pb = auth.pb || await getAdminPb();
        const client = await pb.collection('clients').getOne(req.params.id);
        const contacts = (client.contacts || []).filter(c => c !== req.params.contactId);
        await pb.collection('clients').update(req.params.id, { contacts });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
