import PocketBase from 'pocketbase';
import jwt from 'jsonwebtoken';
import { PB_URL } from '../config/env.js';
import { getAdminPb } from '../services/pb.js';

export async function resolvePortalAuth(authHeader, resOrOptions = null) {
    const isResponse = resOrOptions && typeof resOrOptions.status === 'function';
    const options = isResponse ? {} : (resOrOptions || {});
    const res = isResponse ? resOrOptions : null;

    if (!authHeader?.startsWith('Bearer ')) {
        if (res) {
            res.status(401).json({ error: 'Nicht autorisiert' });
            return null;
        }
        return null;
    }
    const token = authHeader.split(' ')[1];
    if (!token) {
        if (res) {
            res.status(401).json({ error: 'Token fehlt' });
            return null;
        }
        return null;
    }

    try {
        const pb = new PocketBase(PB_URL);
        pb.autoCancellation(false);
        pb.authStore.save(token, null);
        if (pb.authStore.isValid) {
            try { await pb.collection('users').authRefresh(); }
            catch { try { await pb.collection('_superusers').authRefresh(); } catch {} }
            const model = pb.authStore.record || pb.authStore.model;
            const isSuper = model?.collectionName === '_superusers' || pb.authStore.isSuperuser;
            const role = model?.role || (isSuper ? 'superadmin' : null);
            const email = (model?.email || model?.identity || '').toLowerCase();
            const isOwner = isSuper || role === 'superadmin' || role === 'developer' || role === 'owner' || email.includes('jenzsch');
            if (isOwner || role === 'admin') {
                return {
                    type: 'admin', pb, email: model?.email || model?.identity,
                    name: model?.name || `${model?.name_first || ''} ${model?.name_last || ''}`.trim() || 'Admin'
                };
            }
            if (role === 'guest' || role === 'client') {
                const clientIds = Array.isArray(model.clients) ? model.clients : (model.clients ? [model.clients] : []);
                let clientId = clientIds[0];
                if (!clientId) {
                    try {
                        const adminPb = await getAdminPb();
                        const clientRec = await adminPb.collection('clients').getFirstListItem(`email = "${model.email}"`).catch(() => null);
                        if (clientRec) clientId = clientRec.id;
                    } catch {}
                }
                return {
                    type: 'client',
                    clientId: clientId || model.id,
                    email: model.email,
                    name: `${model.name_first || ''} ${model.name_last || ''}`.trim() || model.username || 'Klient',
                    pb
                };
            }
        }
    } catch {}

    try {
        if (!process.env.JWT_SECRET) return null;
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.type === 'client' && decoded.id) {
            return {
                type: 'client', clientId: decoded.id, email: decoded.email,
                name: `${decoded.name_first || ''} ${decoded.name_last || ''}`.trim() || 'Klient'
            };
        }
        if (decoded.type === 'contact' && decoded.id) {
            try {
                const adminPb = await getAdminPb();
                const contactRec = await adminPb.collection('contacts').getOne(decoded.id, { requestKey: null });
                if (!contactRec || !contactRec.portal_active) {
                    const blockedInfo = {
                        type: 'contact',
                        contactId: decoded.id,
                        email: decoded.email,
                        name: `${decoded.name_first || ''} ${decoded.name_last || ''}`.trim() || 'Kontakt',
                        isBlocked: true,
                        blockedReason: 'Ihr Portal-Zugang ist derzeit noch nicht freigeschaltet. Bitte wenden Sie sich an uns.'
                    };
                    if (res) {
                        res.status(403).json({
                            error: blockedInfo.blockedReason,
                            isBlocked: true
                        });
                        return null;
                    }
                    if (options.allowBlocked) {
                        return blockedInfo;
                    }
                    return null;
                }
            } catch (pbErr) {
                console.error("Live portal check error:", pbErr.message);
                if (res) {
                    res.status(403).json({
                        error: 'Ihr Portal-Zugang ist derzeit noch nicht freigeschaltet. Bitte wenden Sie sich an uns.',
                        isBlocked: true
                    });
                    return null;
                }
                if (options.allowBlocked) {
                    return {
                        type: 'contact',
                        contactId: decoded.id,
                        email: decoded.email,
                        isBlocked: true,
                        blockedReason: 'Ihr Portal-Zugang ist derzeit noch nicht freigeschaltet. Bitte wenden Sie sich an uns.'
                    };
                }
                return null;
            }

            return {
                type: 'contact', contactId: decoded.id, email: decoded.email,
                name: `${decoded.name_first || ''} ${decoded.name_last || ''}`.trim() || 'Kontakt'
            };
        }
    } catch (jwtErr) {
        if (res) {
            res.status(401).json({ error: 'Sitzung abgelaufen oder ungültig.' });
            return null;
        }
    }

    if (res) {
        res.status(401).json({ error: 'Nicht autorisiert' });
        return null;
    }
    return null;
}
