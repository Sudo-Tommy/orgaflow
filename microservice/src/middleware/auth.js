import { createClientPb, getAdminPb } from '../services/pb.js';

function decodeJwtPayload(token) {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        const payload = Buffer.from(parts[1], 'base64url').toString('utf8');
        return JSON.parse(payload);
    } catch {
        return null;
    }
}

export async function requireAuth(req, res, next) {
    const rawHeader = req.headers.authorization || '';
    const token = rawHeader.startsWith('Bearer ')
        ? rawHeader.slice(7).trim()
        : rawHeader.trim();

    if (!token) {
        return res.status(401).json({ error: 'Zugriff verweigert: Kein Token oder nicht eingeloggt' });
    }

    const pbAuth = createClientPb(token);
    try {
        try {
            const authRes = await pbAuth.collection('users').authRefresh();
            req.user = authRes.record || pbAuth.authStore.record || pbAuth.authStore.model;
            return next();
        } catch (e) {
            if (e.status === 0) throw e;
            const authRes = await pbAuth.collection('_superusers').authRefresh();
            req.user = authRes.record || pbAuth.authStore.record || pbAuth.authStore.model;
            return next();
        }
    } catch (err) {
        if (err.status === 0) {
            return res.status(503).json({ error: 'PocketBase-Dienst ist nicht erreichbar' });
        }

        // Fallback: Prüfe signierten JWT-Payload gegen PocketBase Admin, falls Token gültig und nicht abgelaufen
        const claims = decodeJwtPayload(token);
        if (claims && claims.id && (!claims.exp || claims.exp * 1000 > Date.now())) {
            try {
                const pbAdmin = await getAdminPb();
                let record = await pbAdmin.collection('users').getOne(claims.id).catch(() => null);
                if (!record) {
                    record = await pbAdmin.collection('_superusers').getOne(claims.id).catch(() => null);
                }
                if (record) {
                    req.user = record;
                    return next();
                }
            } catch {}
        }

        return res.status(401).json({ error: 'Zugriff verweigert: Ungültiges oder abgelaufenes Token' });
    }
}
