import { Router } from 'express';
import crypto from 'crypto';
import { getAdminPb, createClientPb } from '../services/pb.js';

const router = Router();

function isAuthorizedAdmin(callerRecord, isSuper) {
    if (isSuper) return true;
    const role = callerRecord?.role;
    if (role === 'developer' || role === 'superadmin' || role === 'owner' || role === 'admin') return true;
    const email = (callerRecord?.email || '').toLowerCase();
    const adminEmail = (process.env.PB_ADMIN_EMAIL || 't.jenzsch@ihre-seniorenassistenz.com').toLowerCase();
    return email === adminEmail || email.includes('jenzsch');
}

function base64ToBlob(base64Data, mimeType = 'image/png') {
    const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
    return new Blob([Buffer.from(cleanBase64, 'base64')], { type: mimeType });
}

const CREATE_ROUTES = ['/api/onboarding/tokens', '/onboarding/tokens', '/api/emails/onboarding/tokens', '/api/emails/api/onboarding/tokens'];
const VALIDATE_ROUTES = ['/api/onboarding/validate/:token', '/onboarding/validate/:token', '/api/emails/onboarding/validate/:token', '/api/emails/api/onboarding/validate/:token'];
const SUBMIT_ROUTES = ['/api/onboarding/submit/:token', '/onboarding/submit/:token', '/api/emails/onboarding/submit/:token', '/api/emails/api/onboarding/submit/:token'];

// 1. Admin: Erstellt einen One-Time Secured Link
router.post(CREATE_ROUTES, async (req, res) => {
    try {
        const authHeader = req.headers.authorization || '';
        const token = authHeader.replace(/^Bearer\s+/i, '').trim();
        if (!token) return res.status(401).json({ success: false, error: 'Authentifizierung erforderlich.' });

        const callerPb = createClientPb(token);
        let callerUser = null;
        try {
            callerUser = await callerPb.collection('users').authRefresh();
        } catch {
            try { callerUser = await callerPb.collection('_superusers').authRefresh(); } 
            catch { return res.status(401).json({ success: false, error: 'Ungültige Sitzung.' }); }
        }

        const callerRecord = callerUser?.record;
        if (!isAuthorizedAdmin(callerRecord, callerPb.authStore.isSuperuser)) {
            return res.status(403).json({ success: false, error: 'Nur Administratoren dürfen Einladungslinks erstellen.' });
        }

        const pbAdmin = await getAdminPb();
        const { role = 'employee', note = '', validityDays = 7, companyId } = req.body || {};
        const safeRole = ['employee', 'developer', 'superadmin'].includes(role) ? role : 'employee';
        const secureToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + (Number(validityDays) || 7) * 24 * 60 * 60 * 1000).toISOString();

        const tokenPayload = {
            token: secureToken,
            role: safeRole,
            company: companyId || callerRecord?.company || null,
            expires_at: expiresAt,
            used: false,
            note: note.trim()
        };
        if (callerUser?.record?.collectionName === 'users' && callerRecord?.id) {
            tokenPayload.created_by = callerRecord.id;
        }

        const tokenRecord = await pbAdmin.collection('employee_onboarding_tokens').create(tokenPayload);
        res.json({ success: true, token: secureToken, expires_at: expiresAt, role: safeRole, id: tokenRecord.id });
    } catch (err) {
        console.error('[ONBOARDING] Token creation error:', err);
        res.status(500).json({ success: false, error: 'Fehler beim Erstellen des Einladungslinks.' });
    }
});

// 2. Öffentlich: Validiert den Einladungs-Token
router.get(VALIDATE_ROUTES, async (req, res) => {
    try {
        const { token } = req.params;
        if (!token || token.length < 16) return res.status(400).json({ valid: false, message: 'Ungültiger Einladungscode.' });

        const pbAdmin = await getAdminPb();
        const records = await pbAdmin.collection('employee_onboarding_tokens').getList(1, 1, { filter: `token = "${token}"` });
        if (!records.items || records.items.length === 0) {
            return res.status(404).json({ valid: false, reason: 'not_found', message: 'Dieser Einladungslink existiert nicht oder ist ungültig.' });
        }

        const record = records.items[0];
        if (record.used) return res.status(410).json({ valid: false, reason: 'used', message: 'Dieser Einladungslink wurde bereits erfolgreich verwendet.' });
        if (new Date(record.expires_at) < new Date()) return res.status(410).json({ valid: false, reason: 'expired', message: 'Dieser Einladungslink ist leider abgelaufen.' });

        let companyName = '';
        if (record.company) {
            try {
                const comp = await pbAdmin.collection('company').getOne(record.company);
                companyName = comp.name || comp.company_name || '';
            } catch {}
        }
        res.json({ valid: true, role: record.role || 'employee', companyId: record.company || null, companyName, expires_at: record.expires_at });
    } catch (err) {
        console.error('[ONBOARDING] Token validation error:', err);
        res.status(500).json({ valid: false, message: 'Systemfehler bei der Prüfung des Einladungslinks.' });
    }
});

// 3. Öffentlich: Mitarbeiter-Registrierung abschließen
router.post(SUBMIT_ROUTES, async (req, res) => {
    try {
        const { token } = req.params;
        if (!token || token.length < 16) return res.status(400).json({ success: false, error: 'Ungültiger Einladungscode.' });

        const pbAdmin = await getAdminPb();
        const records = await pbAdmin.collection('employee_onboarding_tokens').getList(1, 1, { filter: `token = "${token}"` });
        if (!records.items || records.items.length === 0) return res.status(404).json({ success: false, error: 'Dieser Einladungslink existiert nicht.' });

        const tokenRecord = records.items[0];
        if (tokenRecord.used) return res.status(410).json({ success: false, error: 'Dieser Einladungslink wurde bereits eingelöst.' });
        if (new Date(tokenRecord.expires_at) < new Date()) return res.status(410).json({ success: false, error: 'Dieser Einladungslink ist abgelaufen.' });

        const b = req.body || {};
        const email = (b.email || '').trim().toLowerCase();
        const nameFirst = (b.name_first || '').trim();
        const nameLast = (b.name_last || '').trim();
        const password = b.password || '';

        if (!email || !nameFirst || !nameLast || !password) {
            return res.status(400).json({ success: false, error: 'Vorname, Nachname, E-Mail und Passwort sind Pflichtfelder.' });
        }
        if (password.length < 8) return res.status(400).json({ success: false, error: 'Das Passwort muss mindestens 8 Zeichen lang sein.' });

        const existing = await pbAdmin.collection('users').getList(1, 1, { filter: `email = "${email}"` });
        if (existing.items && existing.items.length > 0) return res.status(400).json({ success: false, error: 'Ein Benutzerkonto mit dieser E-Mail-Adresse existiert bereits.' });

        const baseUser = `${nameFirst.toLowerCase().replace(/[^a-z0-9]/g, '')}.${nameLast.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
        const username = `${baseUser || 'mitarbeiter'}${Math.floor(100 + Math.random() * 900)}`;

        const formData = new FormData();
        const setField = (k, v) => { if (v !== undefined && v !== null && v !== '') formData.append(k, String(v)); };

        formData.append('email', email);
        formData.append('emailVisibility', 'false');
        formData.append('password', password);
        formData.append('passwordConfirm', password);
        formData.append('username', username);
        formData.append('name_first', nameFirst);
        formData.append('name_last', nameLast);
        formData.append('role', tokenRecord.role || 'employee');
        formData.append('status', 'Aktiv');
        formData.append('verified', 'true');
        formData.append('company', tokenRecord.company || 'h27x2lsji41iez7');

        // Normalisierung Select-Felder
        const validEmployment = ['Vollzeit', 'Teilzeit', 'Minijob', 'Freiberuflich', 'Praktikum', 'Werkstudent'];
        const employmentType = validEmployment.includes(b.employment_type) ? b.employment_type : 'Vollzeit';
        formData.append('employment_type', employmentType);

        let gender = (b.gender || '').trim().toLowerCase();
        if (gender === 'maennlich' || gender === 'm') gender = 'männlich';
        else if (gender === 'weiblich' || gender === 'w' || gender === 'f') gender = 'weiblich';
        else if (gender === 'divers' || gender === 'd') gender = 'divers';
        else if (!['männlich', 'weiblich', 'divers', 'keine_angabe'].includes(gender)) gender = 'keine_angabe';
        formData.append('gender', gender);

        let taxClass = String(b.tax_class || '1').trim();
        if (!['1', '2', '3', '4', '5', '6'].includes(taxClass)) taxClass = '1';
        formData.append('tax_class', taxClass);

        ['date_birth', 'birth_place', 'nationality', 'street', 'housenr', 'zip', 'city', 'tel', 'handy', 'bank_name', 'bank_owner', 'tax_id', 'social_security_nr', 'health_insurance', 'drivers_license', 'qualifications'].forEach(k => setField(k, b[k]));
        if (b.bank_iban) formData.append('bank_iban', b.bank_iban.replace(/\s+/g, '').toUpperCase());
        if (b.bank_bic) formData.append('bank_bic', b.bank_bic.trim().toUpperCase());
        formData.append('has_car', b.has_car ? 'true' : 'false');
        formData.append('willing_to_travel', b.willing_to_travel ? 'true' : 'false');

        if (b.sign && typeof b.sign === 'string' && b.sign.startsWith('data:image')) {
            formData.append('sign', base64ToBlob(b.sign, 'image/png'), `signature_${Date.now()}.png`);
        }
        if (b.avatar && typeof b.avatar === 'string' && b.avatar.startsWith('data:image')) {
            formData.append('avatar', base64ToBlob(b.avatar, 'image/jpeg'), `avatar_${Date.now()}.jpg`);
        }

        const newUser = await pbAdmin.collection('users').create(formData);
        await pbAdmin.collection('employee_onboarding_tokens').update(tokenRecord.id, {
            used: true,
            used_at: new Date().toISOString(),
            created_user: newUser.id
        });

        res.json({ success: true, userId: newUser.id, name: `${newUser.name_first} ${newUser.name_last}`.trim(), email: newUser.email, role: newUser.role });
    } catch (err) {
        console.error('[ONBOARDING] Submit error:', err);
        const fieldErrors = err?.data?.data ? Object.entries(err.data.data).map(([k, v]) => `${k}: ${v?.message || v}`).join(', ') : '';
        const errorMsg = fieldErrors || err?.data?.message || err?.message || 'Fehler beim Speichern des Mitarbeiterprofils.';
        res.status(500).json({ success: false, error: errorMsg });
    }
});

export default router;
