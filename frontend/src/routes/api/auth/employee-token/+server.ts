import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import PocketBase from 'pocketbase';

const PB_URL = process.env.PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090';
const PB_ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || 't.jenzsch@ihre-seniorenassistenz.com';
const PB_ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || '6AZePm6YLLa2DGE';

export const POST: RequestHandler = async ({ request }) => {
    try {
        let body: any = {};
        try {
            body = await request.json();
        } catch {
            return json({ success: false, message: 'Ungültiger Request-Body.' }, { status: 400 });
        }

        const token = (body.token || '').trim();
        if (!token) {
            return json({ success: false, message: 'Zugriffs-Token fehlt.' }, { status: 400 });
        }

        // PocketBase Admin Client initialisieren
        const pbAdmin = new PocketBase(PB_URL);
        pbAdmin.autoCancellation(false);

        try {
            await pbAdmin.collection('_superusers').authWithPassword(PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD);
        } catch (authErr: any) {
            console.error('Superuser Auth Error in employee-token endpoint:', authErr);
            return json({ success: false, message: 'Server-Authentifizierungsfehler.' }, { status: 500 });
        }

        // Suche den Benutzer mit diesem quick_access_token
        let matchingUsers;
        try {
            matchingUsers = await pbAdmin.collection('users').getList(1, 1, {
                filter: `quick_access_token = "${token}"`
            });
        } catch (findErr: any) {
            console.error('User lookup error:', findErr);
            return json({ success: false, message: 'Fehler bei der Benutzersuche.' }, { status: 500 });
        }

        if (!matchingUsers || matchingUsers.items.length === 0) {
            return json({ success: false, message: 'Ungültiger oder nicht gefundener Schnellzugangs-Token.' }, { status: 401 });
        }

        const user = matchingUsers.items[0];

        // Status prüfen
        if (user.status === 'Inaktiv') {
            return json({ success: false, message: 'Dieser Mitarbeiter-Account ist derzeit inaktiv geschaltet.' }, { status: 403 });
        }

        // Ablaufdatum prüfen
        if (user.token_expires_at) {
            const expiryTime = new Date(user.token_expires_at).getTime();
            if (!isNaN(expiryTime) && expiryTime < Date.now()) {
                return json({ 
                    success: false, 
                    message: 'Dieser QR-Code-Zugang ist abgelaufen. Bitte fordern Sie einen neuen Link bei der Administration an.' 
                }, { status: 401 });
            }
        }

        // Gültige Session via impersonate generieren (7 Tage Standarddauer)
        const impersonatedClient = await pbAdmin.collection('users').impersonate(user.id, 7 * 24 * 3600);
        const authToken = impersonatedClient.authStore.token;
        const authRecord = impersonatedClient.authStore.record;

        // Audit-Log für GoBD & DSGVO Nachvollziehbarkeit eintragen
        try {
            const fullName = `${user.name_first || ''} ${user.name_last || ''}`.trim() || user.email;
            await pbAdmin.collection('audit_logs').create({
                user_name: fullName,
                user_role: user.role || 'employee',
                action: 'EMPLOYEE_QR_LOGIN',
                route: '/api/auth/employee-token',
                details: `Erfolgreicher mobiler Schnellzugriff via QR-Code Token für ${fullName} (${user.id})`
            });
        } catch (auditErr) {
            console.warn('Audit-Log Eintrag fehlgeschlagen:', auditErr);
        }

        return json({
            success: true,
            token: authToken,
            record: authRecord
        });
    } catch (err: any) {
        console.error('Unexpected error in employee-token endpoint:', err);
        return json({ success: false, message: err?.message || 'Interner Serverfehler.' }, { status: 500 });
    }
};
