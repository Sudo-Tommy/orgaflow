import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import PocketBase from 'pocketbase';

const PB_URL = process.env.PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090';
const PB_ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || 't.jenzsch@ihre-seniorenassistenz.com';
const PB_ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || '6AZePm6YLLa2DGE';

export const POST: RequestHandler = async ({ request }) => {
    try {
        const authHeader = request.headers.get('Authorization') || '';
        const userToken = authHeader.replace(/^Bearer\s+/i, '').trim();

        if (!userToken) {
            return json({ success: false, message: 'Nicht autorisiert.' }, { status: 401 });
        }

        const pbAdmin = new PocketBase(PB_URL);
        pbAdmin.autoCancellation(false);
        await pbAdmin.collection('_superusers').authWithPassword(PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD);

        // Caller Auth prüfen
        const callerPb = new PocketBase(PB_URL);
        callerPb.authStore.save(userToken, null);

        let callerRecord: any = null;
        try {
            const authResult = await callerPb.collection('users').authRefresh();
            callerRecord = authResult.record;
        } catch {
            try {
                const adminResult = await callerPb.collection('_superusers').authRefresh();
                callerRecord = adminResult.record;
            } catch {
                return json({ success: false, message: 'Ungültige Sitzung.' }, { status: 401 });
            }
        }

        const isSuperadmin = callerRecord?.role === 'developer' || callerRecord?.role === 'superadmin' || callerRecord?.role === 'owner' || callerRecord?.collectionName === '_superusers';
        const isAdmin = isSuperadmin || callerRecord?.role === 'admin';

        if (!isAdmin) {
            return json({ success: false, message: 'Nur Administratoren dürfen QR-Tokens widerrufen.' }, { status: 403 });
        }

        let body: any = {};
        try {
            body = await request.json();
        } catch {
            return json({ success: false, message: 'Ungültiger Request-Body.' }, { status: 400 });
        }

        const targetUserId = body.userId;
        if (!targetUserId) {
            return json({ success: false, message: 'Mitarbeiter-ID fehlt.' }, { status: 400 });
        }

        await pbAdmin.collection('users').update(targetUserId, {
            quick_access_token: '',
            token_expires_at: null
        });

        // Audit-Log
        try {
            const callerName = `${callerRecord.name_first || ''} ${callerRecord.name_last || ''}`.trim() || callerRecord.email || 'Admin';
            await pbAdmin.collection('audit_logs').create({
                user_name: callerName,
                user_role: callerRecord.role || 'admin',
                action: 'EMPLOYEE_TOKEN_REVOKED',
                route: '/api/auth/employee-token/revoke',
                details: `QR-Zugang für Benutzer ${targetUserId} widerrufen.`
            });
        } catch (auditErr) {
            console.warn('Audit-Log Error:', auditErr);
        }

        return json({
            success: true,
            message: 'QR-Zugang erfolgreich widerrufen.'
        });
    } catch (err: any) {
        console.error('Error revoking employee token:', err);
        return json({ success: false, message: err?.message || 'Fehler beim Widerrufen des Tokens.' }, { status: 500 });
    }
};
