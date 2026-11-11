import PocketBase from 'pocketbase';
import { PB_URL } from '../config/env.js';

export async function verifySuperadminAccess(req, res, next) {
    try {
        const ip = req.ip || req.connection?.remoteAddress || '';
        const isLocalhost = ['127.0.0.1', '::1', '::ffff:127.0.0.1', 'localhost'].includes(ip);
        if (isLocalhost && req.body?.triggeredBy === 'pb_cron_weekly_digest') {
            req.authInfo = { isSuperuser: true, role: 'superuser' };
            return next();
        }
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            if (isLocalhost && process.env.NODE_ENV !== 'production') {
                req.authInfo = { isSuperuser: true, role: 'superadmin' };
                return next();
            }
            return res.status(401).json({ error: 'Nicht autorisiert: Bearer-Token erforderlich.' });
        }
        const token = authHeader.replace('Bearer ', '').trim();
        const pb = new PocketBase(PB_URL);
        pb.authStore.save(token, null);
        let authModel = null;
        let isSuperuser = false;
        try {
            const refresh = await pb.collection('_superusers').authRefresh();
            authModel = refresh.record;
            isSuperuser = true;
        } catch {
            try {
                const refresh = await pb.collection('users').authRefresh();
                authModel = refresh.record;
            } catch {
                return res.status(401).json({ error: 'Ungültiger oder abgelaufener Authentifizierungs-Token.' });
            }
        }
        if (!isSuperuser && !['superadmin', 'owner'].includes(authModel?.role)) {
            return res.status(403).json({ error: 'Zugriff verweigert: Nur für Inhaber und Superadmins.' });
        }
        req.authInfo = { isSuperuser, role: isSuperuser ? 'superuser' : authModel.role, user: authModel };
        next();
    } catch (e) {
        return res.status(500).json({ error: 'Authentifizierungsprüfung fehlgeschlagen: ' + e.message });
    }
}
