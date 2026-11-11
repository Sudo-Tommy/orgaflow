import { Router } from 'express';
import { getAdminPb } from '../../services/pb.js';
import { resolvePortalAuth } from '../../middleware/portalAuth.js';
import { formatPublicFileUrl } from '../../services/portal/portalHelper.js';

const router = Router();

router.get(['/api/emails/portal/profile', '/portal/profile'], async (req, res) => {
    const auth = await resolvePortalAuth(req.headers.authorization, res);
    if (!auth) return;

    try {
        const pb = auth.pb || await getAdminPb();
        let profile = null;
        if (auth.type === 'client') profile = await pb.collection('clients').getOne(auth.clientId);
        else if (auth.type === 'contact') profile = await pb.collection('contacts').getOne(auth.contactId);
        else if (auth.type === 'admin') profile = await pb.collection('users').getFirstListItem(`email="${auth.email}"`).catch(() => auth.pb.authStore.model);

        if (!profile) return res.status(404).json({ error: "Profil nicht gefunden." });
        const token = await pb.files.getToken().catch(() => '');
        const signUrl = profile.sign ? formatPublicFileUrl(pb, profile, profile.sign, { token }, req) : '';
        res.json({ success: true, profile: { ...profile, signUrl } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put(['/api/emails/portal/profile', '/portal/profile'], async (req, res) => {
    const auth = await resolvePortalAuth(req.headers.authorization, res);
    if (!auth) return;

    try {
        const pb = auth.pb || await getAdminPb();
        const { name_first, name_last, email, phone, street, housenr, zip, city, signature_base64, delete_signature } = req.body;
        const updateData = { name_first, name_last, email, phone, street, housenr, zip, city };
        const col = auth.type === 'client' ? 'clients' : auth.type === 'contact' ? 'contacts' : auth.pb.authStore.model.collectionName;
        const id = auth.type === 'client' ? auth.clientId : auth.type === 'contact' ? auth.contactId : auth.pb.authStore.model.id;

        let updated;
        if (signature_base64?.startsWith('data:image/')) {
            const buffer = Buffer.from(signature_base64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
            const formData = new FormData();
            Object.entries(updateData).forEach(([k, v]) => v != null && formData.append(k, v));
            formData.append('sign', new Blob([buffer], { type: 'image/png' }), 'unterschrift.png');
            updated = await pb.collection(col).update(id, formData);
        } else if (delete_signature) {
            updated = await pb.collection(col).update(id, { ...updateData, sign: '' });
        } else {
            updated = await pb.collection(col).update(id, updateData);
        }

        const token = await pb.files.getToken().catch(() => '');
        const signUrl = updated.sign ? formatPublicFileUrl(pb, updated, updated.sign, { token }, req) : '';
        res.json({ success: true, profile: { ...updated, signUrl } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
