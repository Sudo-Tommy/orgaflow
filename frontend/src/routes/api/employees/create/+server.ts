import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import PocketBase from 'pocketbase';

const PB_URL = process.env.PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090';
const PB_ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || 't.jenzsch@ihre-seniorenassistenz.com';
const PB_ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || '6AZePm6YLLa2DGE';

function transliterateAndSanitize(input: string): string {
    return input
        .toLowerCase()
        .replace(/ä/g, 'ae')
        .replace(/ö/g, 'oe')
        .replace(/ü/g, 'ue')
        .replace(/ß/g, 'ss')
        .replace(/[^a-z0-9\.\-_]/g, '')
        .replace(/^\.+|\.+$/g, '');
}

export const POST: RequestHandler = async ({ request }) => {
    try {
        const authHeader = request.headers.get('authorization') || '';
        const token = authHeader.replace(/^Bearer\s+/i, '').trim();

        if (!token) {
            return json({ success: false, message: 'Nicht authentifiziert: Bitte als Administrator anmelden.' }, { status: 401 });
        }

        // 1. Prüfe Berechtigung des aufrufenden Nutzers
        const clientPb = new PocketBase(PB_URL);
        clientPb.autoCancellation(false);
        clientPb.authStore.save(token, null);

        let callerRecord: any = null;
        try {
            const authRefresh = await clientPb.collection('users').authRefresh();
            callerRecord = authRefresh.record;
        } catch {
            try {
                const superuserRefresh = await clientPb.collection('_superusers').authRefresh();
                callerRecord = { ...superuserRefresh.record, role: 'superadmin' };
            } catch {
                return json({ success: false, message: 'Ungültige oder abgelaufene Sitzung.' }, { status: 401 });
            }
        }

        const callerRole = callerRecord?.role || '';
        const isAllowed = callerRole === 'superadmin' || callerRole === 'owner' || callerRole === 'admin';
        if (!isAllowed) {
            return json({ success: false, message: 'Zugriff verweigert: Nur Administratoren dürfen Mitarbeiter anlegen.' }, { status: 403 });
        }

        // 2. Payload validieren
        let payload: any = {};
        try {
            payload = await request.json();
        } catch {
            return json({ success: false, message: 'Ungültiger Request-Body.' }, { status: 400 });
        }

        const email = (payload.email || '').trim().toLowerCase();
        const firstName = (payload.name_first || '').trim();
        const lastName = (payload.name_last || '').trim();

        if (!email || !firstName || !lastName) {
            return json({ success: false, message: 'Vorname, Nachname und E-Mail-Adresse sind Pflichtfelder.' }, { status: 400 });
        }

        // 3. PocketBase Admin Client mit Superuser Rechten
        const pbAdmin = new PocketBase(PB_URL);
        pbAdmin.autoCancellation(false);
        await pbAdmin.collection('_superusers').authWithPassword(PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD);

        // Prüfe ob E-Mail bereits existiert
        try {
            const existing = await pbAdmin.collection('users').getList(1, 1, {
                filter: `email = "${email}"`
            });
            if (existing.items.length > 0) {
                return json({ 
                    success: false, 
                    message: `Ein Benutzer mit der E-Mail-Adresse "${email}" existiert bereits.` 
                }, { status: 400 });
            }
        } catch (e: any) {
            console.warn('Check existing email warning:', e);
        }

        // 4. Username generieren / säubern
        let username = transliterateAndSanitize(payload.username || '');
        if (!username || username.length < 3) {
            const safeFirst = transliterateAndSanitize(firstName) || 'user';
            const safeLast = transliterateAndSanitize(lastName) || 'employee';
            username = `${safeFirst}.${safeLast}.${Math.floor(100 + Math.random() * 900)}`;
        }

        // Passwort festlegen
        const password = payload.password?.trim() || `OF-${Math.random().toString(36).slice(-8)}!A1`;

        // Daten für neuen UserRecord zusammenstellen
        const userData: Record<string, any> = {
            username: username,
            email: email,
            emailVisibility: true,
            password: password,
            passwordConfirm: payload.passwordConfirm?.trim() || password,
            name_first: firstName,
            name_last: lastName,
            role: payload.role || 'employee',
            employment_type: payload.employment_type || 'Vollzeit',
            status: payload.status || 'Aktiv',
            qualifications: (payload.qualifications || '').trim(),
            emergency_contacts: (payload.emergency_contacts || '').trim(),
            tel: (payload.tel || '').trim(),
            handy: (payload.handy || '').trim(),
            street: (payload.street || '').trim(),
            housenr: (payload.housenr || '').trim(),
            zip: (payload.zip || '').trim(),
            city: (payload.city || '').trim(),
            verified: true // Superuser kann und soll verified=true setzen
        };

        if (callerRecord?.company) {
            userData.company = callerRecord.company;
        }
        if (callerRecord?.facility) {
            userData.facility = callerRecord.facility;
        }

        const created = await pbAdmin.collection('users').create(userData);

        // Audit-Log schreiben
        try {
            const auditColl = await pbAdmin.collection('audit_logs').getList(1, 1).catch(() => null);
            if (auditColl) {
                await pbAdmin.collection('audit_logs').create({
                    user_name: `${callerRecord.name_first || ''} ${callerRecord.name_last || ''}`.trim() || callerRecord.email,
                    user_role: callerRole,
                    action: 'EMPLOYEE_CREATED',
                    route: '/api/employees/create',
                    details: `Neuer Mitarbeiter ${firstName} ${lastName} (${email}) angelegt mit Rolle ${userData.role}.`
                });
            }
        } catch (auditErr) {
            console.warn('Audit-Log write ignored:', auditErr);
        }

        return json({
            success: true,
            record: created,
            generatedPassword: payload.password ? undefined : password,
            message: `Mitarbeiter "${firstName} ${lastName}" erfolgreich angelegt.`
        });
    } catch (err: any) {
        console.error('API Error in /api/employees/create:', err);

        let errorMsg = err?.message || 'Fehler beim Erstellen des Mitarbeiters.';
        if (err?.data?.data && typeof err.data.data === 'object') {
            const fieldErrors = Object.entries(err.data.data)
                .map(([field, details]: [string, any]) => `${field}: ${details?.message || details?.code || 'Ungültig'}`)
                .join(', ');
            if (fieldErrors) {
                errorMsg = `Validierungsfehler: ${fieldErrors}`;
            }
        }

        return json({
            success: false,
            message: errorMsg,
            details: err?.data || null
        }, { status: err?.status || 500 });
    }
};
