import { Router } from 'express';
import { getAdminPb } from '../../services/pb.js';
import { resolvePortalAuth } from '../../middleware/portalAuth.js';
import { formatPublicFileUrl, getContactClientsFilter, detectPortalDocumentCategory, cleanPortalDocumentName } from '../../services/portal/portalHelper.js';

const router = Router();

router.get(['/api/emails/portal/mailing-list', '/portal/mailing-list'], async (req, res) => {
    const auth = await resolvePortalAuth(req.headers.authorization, res);
    if (!auth) return;
    try {
        const pb = auth.pb || await getAdminPb();
        const filter = auth.type === 'client' ? `id = "${auth.clientId}"` : await getContactClientsFilter(pb, auth);
        const clients = await pb.collection('clients').getFullList({ filter, fields: 'id,email,mailing_list', requestKey: null });
        const isSubscribed = clients.some(c => (c.mailing_list || []).includes(auth.email));
        res.json({ success: true, subscribed: isSubscribed });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post(['/api/emails/portal/mailing-list', '/portal/mailing-list'], async (req, res) => {
    const auth = await resolvePortalAuth(req.headers.authorization, res);
    if (!auth) return;
    try {
        const pb = auth.pb || await getAdminPb();
        const filter = auth.type === 'client' ? `id = "${auth.clientId}"` : await getContactClientsFilter(pb, auth);
        const clients = await pb.collection('clients').getFullList({ filter, fields: 'id,mailing_list', requestKey: null });
        const subscribe = Boolean(req.body.subscribed);
        for (const c of clients) {
            let list = c.mailing_list || [];
            if (subscribe && !list.includes(auth.email)) list.push(auth.email);
            else if (!subscribe) list = list.filter(e => e !== auth.email);
            await pb.collection('clients').update(c.id, { mailing_list: list });
        }
        res.json({ success: true, subscribed: subscribe });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get(['/api/emails/portal/documents', '/portal/documents', '/documents'], async (req, res) => {
    const auth = await resolvePortalAuth(req.headers.authorization, res);
    if (!auth) return;
    try {
        const pb = auth.pb || await getAdminPb();
        let clients = [];
        if (auth.type === 'client') {
            const c = await pb.collection('clients').getOne(auth.clientId).catch(() => null);
            if (c) clients = [c];
        } else if (auth.type === 'contact') {
            clients = await pb.collection('clients').getFullList({ filter: await getContactClientsFilter(pb, auth), requestKey: null });
        } else if (auth.type === 'admin') {
            clients = req.query.client_id ? [await pb.collection('clients').getOne(req.query.client_id)] : await pb.collection('clients').getFullList({ requestKey: null });
        }
        const fileToken = await pb.files.getToken().catch(() => '');
        const docs = [];
        for (const cl of clients) {
            const files = Array.isArray(cl.documents) ? cl.documents : (cl.documents ? [cl.documents] : []);
            for (const f of files) {
                docs.push({
                    id: `${cl.id}_${f}`, clientId: cl.id, clientName: `${cl.name_first || ''} ${cl.name_last || ''}`.trim() || 'Klient',
                    filename: f, name: cleanPortalDocumentName(f), originalName: f, url: formatPublicFileUrl(pb, cl, f, { token: fileToken }, req),
                    extension: f.split('.').pop()?.toLowerCase() || '', category: detectPortalDocumentCategory(f), updated: cl.updated
                });
            }
        }

        if (clients.length > 0) {
            const clientFilter = clients.map(c => `client = "${c.id}"`).join(' || ');
            const invoices = await pb.collection('invoices').getFullList({
                filter: `(${clientFilter}) && status != "Entwurf"`,
                sort: '-issue_date',
                requestKey: null
            }).catch(() => []);

            for (const inv of invoices) {
                const cl = clients.find(c => c.id === inv.client);
                const clientName = cl ? `${cl.name_first || ''} ${cl.name_last || ''}`.trim() || 'Klient' : 'Klient';
                const pdfs = Array.isArray(inv.pdf) ? inv.pdf : (inv.pdf ? [inv.pdf] : []);
                pdfs.forEach((f, idx) => {
                    const isTimesheet = /^(az_|zeitnachweis_|nachweis_)/i.test(f) || idx > 0;
                    const docName = isTimesheet 
                        ? (inv.invoice_nr ? `Zeitnachweis ${inv.invoice_nr}` : 'Zeitnachweis')
                        : (inv.invoice_nr ? `Rechnung ${inv.invoice_nr}` : 'Rechnung');
                    docs.push({
                        id: `${inv.id}_${f}`,
                        clientId: inv.client,
                        clientName,
                        filename: f,
                        name: docName,
                        originalName: f,
                        url: formatPublicFileUrl(pb, inv, f, { token: fileToken }, req),
                        extension: 'pdf',
                        category: isTimesheet ? 'Zeitnachweise' : 'Rechnungen & Nachweise',
                        updated: inv.updated || inv.issue_date || inv.created,
                        isTimesheet,
                        isFromInvoice: true,
                        invoiceId: inv.id
                    });
                });
            }
        }

        docs.sort((a, b) => new Date(b.updated || 0) - new Date(a.updated || 0));
        res.json({ success: true, documents: docs });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get(['/api/emails/portal/documents/download', '/portal/documents/download'], async (req, res) => {
    const auth = await resolvePortalAuth(req.headers.authorization, res);
    if (!auth) return;
    const { clientId, filename, inline } = req.query;
    try {
        const pb = auth.pb || await getAdminPb();
        const client = await pb.collection('clients').getOne(clientId).catch(() => null);
        let fileRecord = client;
        let foundDocs = Array.isArray(client?.documents) ? client.documents : (client?.documents ? [client.documents] : []);
        if (!foundDocs.includes(filename)) {
            const inv = await pb.collection('invoices').getFirstListItem(`client = "${clientId}" && pdf ~ "${filename}"`, { requestKey: null }).catch(() => null);
            if (inv) {
                fileRecord = inv;
                foundDocs = Array.isArray(inv.pdf) ? inv.pdf : (inv.pdf ? [inv.pdf] : []);
            }
        }
        if (!fileRecord || !foundDocs.includes(filename)) return res.status(404).json({ error: "Datei nicht gefunden." });
        const token = await pb.files.getToken().catch(() => '');
        const resp = await fetch((pb.files.getURL || pb.files.getUrl).call(pb.files, fileRecord, filename, { token }));
        res.setHeader('Content-Disposition', `${inline === 'true' ? 'inline' : 'attachment'}; filename="${cleanPortalDocumentName(filename)}"`);
        res.send(Buffer.from(await resp.arrayBuffer()));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post(['/api/emails/portal/documents/upload', '/portal/documents/upload'], async (req, res) => {
    const auth = await resolvePortalAuth(req.headers.authorization, res);
    if (!auth) return;
    const { clientId, fileName, fileBase64, mimeType } = req.body;
    try {
        const pb = auth.pb || await getAdminPb();
        const client = await pb.collection('clients').getOne(clientId);
        const existing = Array.isArray(client.documents) ? client.documents : (client.documents ? [client.documents] : []);
        const formData = new FormData();
        existing.forEach(e => formData.append('documents', e));
        formData.append('documents', new Blob([Buffer.from(fileBase64, 'base64')], { type: mimeType || 'application/pdf' }), fileName);
        await pb.collection('clients').update(clientId, formData);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
