import { Router } from 'express';
import { getAdminPb } from '../../services/pb.js';
import { resolvePortalAuth } from '../../middleware/portalAuth.js';
import { getContactClientsFilter } from '../../services/portal/portalHelper.js';
import { sanitizeAppointments } from '../../../reportSanitizer.js';

const router = Router();

router.get(['/api/emails/portal/appointments', '/portal/appointments', '/appointments'], async (req, res) => {
    const auth = await resolvePortalAuth(req.headers.authorization, res);
    if (!auth) return;

    try {
        const pb = auth.pb || await getAdminPb();
        let filterStr = `id != ""`;

        if (auth.type === 'client') {
            filterStr = `(client = "${auth.clientId}" || client ~ "${auth.clientId}")`;
        } else if (auth.type === 'contact') {
            const contactFilter = await getContactClientsFilter(pb, auth);
            const clients = await pb.collection('clients').getFullList({ filter: contactFilter, fields: 'id', requestKey: null });
            if (!clients.length) return res.json({ success: true, appointments: [] });
            filterStr = `(${clients.map(c => `client = "${c.id}" || client ~ "${c.id}"`).join(' || ')})`;
        } else if (auth.type === 'admin' && req.query.client_id) {
            filterStr = `(client = "${req.query.client_id}" || client ~ "${req.query.client_id}")`;
        }

        filterStr += ` && is_private != true && is_visible != false`;
        const appointments = await pb.collection('appointments').getFullList({
            filter: filterStr, sort: 'appointment',
            expand: 'user,time_record,drive_record,tasks,expenditures,appointment_at,client,client_id',
            requestKey: null
        });

        res.json({ success: true, appointments: sanitizeAppointments(appointments) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
