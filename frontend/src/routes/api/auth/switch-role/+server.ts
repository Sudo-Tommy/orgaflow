// src/routes/api/auth/switch-role/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import PocketBase from 'pocketbase';

const PB_URL = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090';
const PB_ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || 't.jenzsch@ihre-seniorenassistenz.com';
const PB_ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || '6AZePm6YLLa2DGE';

async function getAdminPb(): Promise<PocketBase> {
    const pbAdmin = new PocketBase(PB_URL);
    pbAdmin.autoCancellation(false);
    await pbAdmin.collection('_superusers').authWithPassword(PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD);
    return pbAdmin;
}

export const POST: RequestHandler = async ({ request }) => {
    try {
        const authHeader = request.headers.get('authorization') || '';
        const token = authHeader.replace(/^Bearer\s+/i, '').trim();

        if (!token) {
            throw error(401, 'Authentifizierung erforderlich.');
        }

        const pbAdmin = await getAdminPb();

        // Anfragenden Benutzer validieren
        const callerPb = new PocketBase(PB_URL);
        callerPb.authStore.save(token, null);
        let callerUser: any = null;
        try {
            callerUser = await callerPb.collection('users').authRefresh();
        } catch {
            throw error(401, 'Ungültige Sitzung.');
        }

        const callerRecord = callerUser?.record;
        const email = (callerRecord?.email || '').toLowerCase();
        const isAuthorized =
            callerRecord?.role === 'developer' ||
            callerRecord?.role === 'superadmin' ||
            email.includes('jenzsch') ||
            email === 'tommy.jenzsch@ihre-seniorenassistenz.com' ||
            email === 't.jenzsch@ihre-seniorenassistenz.com';

        if (!isAuthorized) {
            throw error(403, 'Nur der Entwickler oder Inhaber darf Rollen wechseln.');
        }

        const body = await request.json().catch(() => ({}));
        const { targetRole } = body;

        const allowedRoles = ['developer', 'superadmin', 'admin', 'user', 'guest', 'caregiver', 'client'];
        if (!targetRole || !allowedRoles.includes(targetRole)) {
            throw error(400, 'Ungültige Zielrolle angegeben.');
        }

        const updated = await pbAdmin.collection('users').update(callerRecord.id, { role: targetRole });

        return json({
            success: true,
            record: updated
        });
    } catch (err: any) {
        console.error('[SwitchRole Endpoint Error]:', err);
        return json({ success: false, error: err.message || 'Fehler beim Rollenwechsel.' }, { status: err.status || 500 });
    }
};
