import { Router } from 'express';
import crypto from 'crypto';
import { getAdminPb } from '../../services/pb.js';
import { generateFormToken, isValidEmail, sanitizeHeaderValue } from '../../utils/security.js';
import { resolvePortalAuth } from '../../middleware/portalAuth.js';
import { sendPortalOtpEmail } from '../../services/portal/portalOtpService.js';
import { findPortalUserByEmail, findPortalUserByPin, findPortalUserByCode, createPortalToken } from '../../services/portal/portalAuthService.js';

const router = Router();

router.get(['/api/emails/form-token', '/api/form-token', '/form-token'], (req, res) => res.json({ token: generateFormToken() }));
router.post(['/api/emails/portal/frontend-audit', '/portal/frontend-audit'], (req, res) => res.json({ ok: true }));

router.post(['/api/emails/portal/request-otp', '/portal/request-otp'], async (req, res) => {
    let email = sanitizeHeaderValue(String(req.body.email || '').trim().toLowerCase());
    if (!email || !isValidEmail(email)) return res.status(400).json({ error: 'Ungültige E-Mail-Adresse.' });
    try {
        const pb = await getAdminPb();
        const found = await findPortalUserByEmail(email, pb);
        if (!found) return res.status(404).json({ error: 'Diese E-Mail-Adresse ist nicht hinterlegt.' });
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();
        await pb.collection('otp_codes').create({ email, code: otp, expires, user_id: found.user.id, user_type: found.userType });
        const result = await sendPortalOtpEmail({ user: found.user, userType: found.userType, email, otp }, pb);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post(['/api/emails/portal/verify-otp', '/portal/verify-otp'], async (req, res) => {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: 'E-Mail oder Code fehlt.' });
    try {
        const pb = await getAdminPb();
        const now = new Date().toISOString().replace('T', ' ');
        const rec = await pb.collection('otp_codes').getFirstListItem(`email = "${email.toLowerCase()}" && code = "${otp}" && expires > "${now}"`);
        const userRec = await pb.collection(rec.user_type === 'client' ? 'clients' : 'contacts').getOne(rec.user_id).catch(() => ({}));
        const token = createPortalToken({ id: rec.user_id, email: rec.email, ...userRec }, rec.user_type, '7d');
        await pb.collection('otp_codes').delete(rec.id);
        res.json({ success: true, token });
    } catch {
        res.status(401).json({ error: 'Code ist ungültig oder abgelaufen.' });
    }
});

router.post(['/api/emails/portal/auth-with-pin', '/portal/auth-with-pin'], async (req, res) => {
    const { email, pin } = req.body;
    if (!email || !pin) return res.status(400).json({ error: 'E-Mail-Adresse und PIN erforderlich.' });
    try {
        const pb = await getAdminPb();
        const found = await findPortalUserByPin(email, pin, pb);
        if (!found) return res.status(401).json({ error: 'Ungültige E-Mail-Adresse oder PIN.' });
        const token = createPortalToken(found.user, found.userType, '30d');
        res.json({ success: true, token, user: { id: found.user.id, type: found.userType, email: found.user.email, name_first: found.user.name_first, name_last: found.user.name_last } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post(['/api/emails/portal/auth-with-code', '/portal/auth-with-code'], async (req, res) => {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Zugangs-Code fehlt.' });
    try {
        const pb = await getAdminPb();
        const found = await findPortalUserByCode(code, pb);
        if (!found) return res.status(401).json({ error: 'Ungültiger oder abgelaufener QR-Code.' });
        const token = createPortalToken(found.user, found.userType, '30d');
        res.json({ success: true, token, user: { id: found.user.id, type: found.userType, email: found.user.email, name_first: found.user.name_first, name_last: found.user.name_last } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post(['/api/emails/portal/admin/access-data', '/portal/admin/access-data'], async (req, res) => {
    const auth = await resolvePortalAuth(req.headers.authorization);
    if (!auth || auth.type !== 'admin') return res.status(403).json({ error: 'Nur für Administratoren zugänglich.' });
    const { clientId, type = 'client', action = 'get', customPin } = req.body;
    if (!clientId) return res.status(400).json({ error: 'Klienten-ID fehlt.' });
    try {
        const pb = auth.pb || await getAdminPb();
        const col = type === 'contact' ? 'contacts' : 'clients';
        let rec = await pb.collection(col).getOne(clientId, { requestKey: null });
        const updates = {};
        if (action === 'generate' || !rec.portal_pin) updates.portal_pin = Math.floor(100000 + Math.random() * 900000).toString();
        else if (action === 'set' && customPin) updates.portal_pin = String(customPin).trim();
        if (!rec.portal_code || action === 'generate' || action === 'generate_code') updates.portal_code = 'sec_' + crypto.randomBytes(16).toString('hex');
        if (Object.keys(updates).length) rec = await pb.collection(col).update(clientId, updates, { requestKey: null });
        res.json({ success: true, clientId: rec.id, name_first: rec.name_first || '', name_last: rec.name_last || '', email: rec.email || '', portal_pin: rec.portal_pin, portal_code: rec.portal_code });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post(['/api/emails/portal/change-pin', '/portal/change-pin'], async (req, res) => {
    const auth = await resolvePortalAuth(req.headers.authorization);
    if (!auth || (!auth.clientId && !auth.contactId)) return res.status(401).json({ error: 'Nicht autorisiert.' });
    const { currentPin, newPin } = req.body;
    if (!newPin || String(newPin).trim().length < 4) return res.status(400).json({ error: 'PIN muss mind. 4 Ziffern haben.' });
    try {
        const pb = auth.pb || await getAdminPb();
        const col = auth.type === 'contact' ? 'contacts' : 'clients';
        const targetId = auth.clientId || auth.contactId;
        const userRec = await pb.collection(col).getOne(targetId, { requestKey: null });
        if (userRec.portal_pin && currentPin && String(userRec.portal_pin).trim() !== String(currentPin).trim()) {
            return res.status(400).json({ error: 'Die aktuelle PIN ist nicht korrekt.' });
        }
        await pb.collection(col).update(targetId, { portal_pin: String(newPin).trim() }, { requestKey: null });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post(['/api/emails/portal/employee-auth-token', '/portal/employee-auth-token'], async (req, res) => {
    const token = String(req.body.token || '').trim();
    if (!token) return res.status(400).json({ success: false, error: 'Zugangs-Token fehlt.' });
    try {
        const pb = await getAdminPb();
        const records = await pb.collection('users').getList(1, 1, {
            filter: `quick_access_token = "${token}"`
        });
        if (!records || records.items.length === 0) {
            return res.status(401).json({ success: false, error: 'Ungültiger oder nicht gefundener Schnellzugangs-Token.' });
        }
        const user = records.items[0];
        if (user.status === 'Inaktiv') {
            return res.status(403).json({ success: false, error: 'Dieser Mitarbeiter-Account ist derzeit inaktiv geschaltet.' });
        }
        if (user.token_expires_at) {
            const expiryTime = new Date(user.token_expires_at).getTime();
            if (!isNaN(expiryTime) && expiryTime < Date.now()) {
                return res.status(401).json({ success: false, error: 'Dieser QR-Code-Zugang ist abgelaufen. Bitte neuen Link anfordern.' });
            }
        }
        // Generiere gültiges Auth-Token via Impersonation (30 Tage)
        const imp = await pb.collection('users').impersonate(user.id, 86400 * 30);
        res.json({
            success: true,
            token: imp.authStore.token,
            record: imp.authStore.record || user
        });
    } catch (err) {
        console.error('Error in employee-auth-token route:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

export default router;
