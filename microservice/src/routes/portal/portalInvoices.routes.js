import { Router } from 'express';
import { getAdminPb } from '../../services/pb.js';
import { resolvePortalAuth } from '../../middleware/portalAuth.js';
import { formatPublicFileUrl, getContactClientsFilter } from '../../services/portal/portalHelper.js';

const router = Router();

router.get(['/api/emails/portal/invoices', '/portal/invoices', '/invoices'], async (req, res) => {
    const auth = await resolvePortalAuth(req.headers.authorization, res);
    if (!auth) return;

    try {
        const pb = auth.pb || await getAdminPb();
        let filterStr = `status != "Entwurf"`;
        if (auth.type === 'client') {
            filterStr = `(client = "${auth.clientId}" || client ~ "${auth.clientId}") && ${filterStr}`;
        } else if (auth.type === 'contact') {
            const contactFilter = await getContactClientsFilter(pb, auth);
            const linkedClients = await pb.collection('clients').getFullList({ filter: contactFilter, fields: 'id', requestKey: null });
            if (!linkedClients.length) return res.json({ success: true, invoices: [] });
            filterStr = `(${linkedClients.map(c => `client = "${c.id}" || client ~ "${c.id}"`).join(' || ')}) && ${filterStr}`;
        } else if (auth.type === 'admin' && req.query.client_id) {
            filterStr = `(client = "${req.query.client_id}" || client ~ "${req.query.client_id}") && ${filterStr}`;
        }

        const invoices = await pb.collection('invoices').getFullList({ filter: filterStr, sort: '-issue_date', expand: 'client', requestKey: null });
        let fileToken = await pb.files.getToken().catch(() => '');

        const mappedInvoices = invoices.map(inv => {
            const pdfs = Array.isArray(inv.pdf) ? inv.pdf : (inv.pdf ? [inv.pdf] : []);
            const files = pdfs.map((filename, idx) => ({
                name: filename,
                url: formatPublicFileUrl(pb, inv, filename, { token: fileToken }, req),
                isTimesheet: /^(az_|zeitnachweis_|nachweis_)/i.test(filename) || idx > 0
            }));
            return { ...inv, files };
        });

        const comp = await pb.collection('company').getFirstListItem('', { requestKey: null }).catch(() => null);
        const companyInfo = comp ? { name: comp.name || '', bank_name: comp.bank_name || '', bank_iban: comp.bank_iban || '', bank_bic: comp.bank_bic || '', email: comp.email || '', phone: comp.number_telephone || comp.number_mobile || '' } : null;

        res.json({ success: true, invoices: mappedInvoices, companyInfo });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get(['/api/emails/portal/invoices/:invoiceId/download', '/portal/invoices/:invoiceId/download'], async (req, res) => {
    const auth = await resolvePortalAuth(req.headers.authorization, res);
    if (!auth) return;

    try {
        const pb = auth.pb || await getAdminPb();
        const inv = await pb.collection('invoices').getOne(req.params.invoiceId, { expand: 'client', requestKey: null });
        if (!inv) return res.status(404).json({ error: "Rechnung nicht gefunden." });

        const clientId = inv.client || inv.expand?.client?.id;
        if (auth.type === 'client' && auth.clientId !== clientId) return res.status(403).json({ error: "Kein Zugriff." });
        if (auth.type === 'contact') {
            const contactFilter = await getContactClientsFilter(pb, auth);
            const allowed = await pb.collection('clients').getFullList({ filter: `id = "${clientId}" && (${contactFilter})`, fields: 'id', requestKey: null });
            if (!allowed.length) return res.status(403).json({ error: "Kein Zugriff." });
        }

        const pdfs = Array.isArray(inv.pdf) ? inv.pdf : (inv.pdf ? [inv.pdf] : []);
        const fileIndex = parseInt(req.query.fileIndex || '0', 10);
        const filename = pdfs[fileIndex] || pdfs[0];
        if (!filename) return res.status(404).json({ error: "Keine Datei vorhanden." });

        const fileToken = await pb.files.getToken().catch(() => '');
        const fileUrl = (pb.files.getURL || pb.files.getUrl).call(pb.files, inv, filename, { token: fileToken });
        const response = await fetch(fileUrl);
        if (!response.ok) throw new Error('Download fehlgeschlagen');

        res.setHeader('Content-Type', response.headers.get('content-type') || 'application/pdf');
        res.setHeader('Content-Disposition', `${req.query.inline === 'true' ? 'inline' : 'attachment'}; filename="${filename}"`);
        const buffer = Buffer.from(await response.arrayBuffer());
        res.send(buffer);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
