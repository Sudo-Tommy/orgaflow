export function formatPublicFileUrl(pbAdmin, record, filename, options = {}, req = null) {
    if (!record || !filename) return '';
    let rawUrl = '';
    try { rawUrl = (pbAdmin.files.getURL || pbAdmin.files.getUrl).call(pbAdmin.files, record, filename, options); } catch { return ''; }
    if (!rawUrl) return '';

    const forwardedHost = req ? (req.get('x-forwarded-host') || req.get('host') || '') : '';
    const isLive = forwardedHost.includes('ihre-seniorenassistenz.com') || (process.env.NODE_ENV === 'production' && !forwardedHost.includes('localhost') && !forwardedHost.includes('127.0.0.1'));

    if (isLive || (!forwardedHost.includes('localhost') && !forwardedHost.includes('127.0.0.1') && forwardedHost)) {
        try {
            const parsed = new URL(rawUrl);
            return `${parsed.pathname}${parsed.search}`;
        } catch {
            return rawUrl.replace(/^https?:\/\/(127\.0\.0\.1|localhost):8090/i, '');
        }
    }

    if (forwardedHost) {
        const clientHostname = forwardedHost.split(':')[0] || '127.0.0.1';
        return rawUrl.replace(/https?:\/\/(127\.0\.0\.1|localhost):8090/i, `http://${clientHostname}:8090`);
    }

    return rawUrl;
}

export async function getContactClientsFilter(pbAdmin, auth) {
    const contactId = auth.contactId;
    const userEmail = auth.email;
    const parts = [];
    if (contactId) {
        parts.push(`contacts ~ "${contactId}"`);
        parts.push(`caregiver ~ "${contactId}"`);
    }
    if (userEmail) {
        parts.push(`email = "${userEmail}"`);
        parts.push(`contacts.email ?= "${userEmail}"`);
        parts.push(`caregiver.email ?= "${userEmail}"`);
    }
    if (contactId) {
        try {
            const homes = await pbAdmin.collection('retirement_homes').getFullList({ filter: `contacts ~ "${contactId}"`, fields: 'id', requestKey: null });
            for (const h of homes) parts.push(`retirement_homes ~ "${h.id}"`);
        } catch {}
    }
    return parts.length > 0 ? parts.join(' || ') : 'id = ""';
}

export function detectPortalDocumentCategory(filename = '') {
    const lower = filename.toLowerCase();
    if (/vertrag|vereinbarung|contract|datenschutz|schweigepflicht/i.test(lower)) return 'Verträge & Vereinbarungen';
    if (/bescheid|pflegegrad|einstufung|kasse|aok|barmer|dak|tk|mdk|gutachten/i.test(lower)) return 'Pflegekassenbescheide';
    if (/vollmacht|verfügung|vorsorge|patientenverf|betreuung|beschluss/i.test(lower)) return 'Vollmachten & Verfügungen';
    if (/rechnung|abrechnung|nachweis|leistungsnachweis|zeitnachweis/i.test(lower)) return 'Rechnungen & Nachweise';
    if (/ausweis|schwerbehindert|arzt|befund|medikation|diagnose|pass/i.test(lower)) return 'Scans & Nachweise';
    return 'Sonstige Dokumente';
}

export function cleanPortalDocumentName(filename = '') {
    return filename ? filename.replace(/^[a-z0-9]{8,15}_/i, '') : 'Dokument';
}
