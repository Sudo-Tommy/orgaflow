import jwt from 'jsonwebtoken';

export async function findPortalUserByEmail(email, pbAdmin) {
    const clean = email.toLowerCase().trim();
    let client = await pbAdmin.collection('clients').getFirstListItem(`email = "${clean}"`).catch(() => null);
    if (client) return { user: client, userType: 'client' };
    let contact = await pbAdmin.collection('contacts').getFirstListItem(`email = "${clean}"`).catch(() => null);
    if (contact) return { user: contact, userType: 'contact' };
    return null;
}

export async function findPortalUserByPin(email, pin, pbAdmin) {
    const cleanEmail = email.toLowerCase().trim();
    const cleanPin = String(pin).trim();
    const cList = await pbAdmin.collection('clients').getList(1, 1, { filter: `email = "${cleanEmail}" && portal_pin = "${cleanPin}"`, requestKey: null }).catch(() => ({ items: [] }));
    if (cList.items[0]) return { user: cList.items[0], userType: 'client' };
    const ctList = await pbAdmin.collection('contacts').getList(1, 1, { filter: `email = "${cleanEmail}" && portal_pin = "${cleanPin}"`, requestKey: null }).catch(() => ({ items: [] }));
    if (ctList.items[0]) return { user: ctList.items[0], userType: 'contact' };
    return null;
}

export async function findPortalUserByCode(code, pbAdmin) {
    const clean = String(code).trim();
    const cList = await pbAdmin.collection('clients').getList(1, 1, { filter: `portal_code = "${clean}" || id = "${clean}"`, requestKey: null }).catch(() => ({ items: [] }));
    if (cList.items[0]) return { user: cList.items[0], userType: 'client' };
    const ctList = await pbAdmin.collection('contacts').getList(1, 1, { filter: `portal_code = "${clean}" || id = "${clean}"`, requestKey: null }).catch(() => ({ items: [] }));
    if (ctList.items[0]) return { user: ctList.items[0], userType: 'contact' };
    return null;
}

function sanitizeNameField(str) {
    if (!str || typeof str !== 'string') return '';
    const cleaned = str.replace(/\{\{[^}]*\}\}/g, '').replace(/[{}\[\]]/g, '').trim();
    if (['anrede', 'vorname', 'nachname', 'undefined', 'null', 'keine angabe'].includes(cleaned.toLowerCase())) {
        return '';
    }
    return cleaned;
}

function sanitizeSalutation(str) {
    if (!str || typeof str !== 'string') return '';
    const cleaned = str.replace(/\{\{[^}]*\}\}/g, '').replace(/[{}\[\]]/g, '').replace(/\banrede\b/gi, '').trim();
    if (['anrede', 'undefined', 'null', 'keine angabe', 'divers'].includes(cleaned.toLowerCase())) {
        return '';
    }
    if (cleaned.toLowerCase() === 'herr') return 'Herr';
    if (cleaned.toLowerCase() === 'frau') return 'Frau';
    return cleaned;
}

export function createPortalToken(user, userType, expiresIn = '30d') {
    if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET ist nicht konfiguriert.');
    return jwt.sign({
        id: user.id, type: userType, email: user.email,
        name_first: sanitizeNameField(user.name_first),
        name_last: sanitizeNameField(user.name_last),
        salutation: sanitizeSalutation(user.salutation)
    }, process.env.JWT_SECRET, { expiresIn });
}
