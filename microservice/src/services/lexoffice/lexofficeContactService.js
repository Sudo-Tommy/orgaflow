import { lexofficeRequest } from './lexofficeHttpClient.js';

const VENDOR_KEYWORDS = [
    'telekom', 'vodafone', 'o2', '1&1', 'ionos', 'strato', 'hetzner', 'google', 'apple', 'microsoft',
    'adobe', 'lexware', 'haufe', 'datev', 'connex', 'steuer', 'finanzamt', 'aok', 'barmer', 'tk ', 'dak',
    'ikk', 'knappschaft', 'bkk', 'allianz', 'huk', 'arag', 'ergo', 'axa', 'sparkasse', 'volksbank', 'ing ',
    'dkb', 'commerzbank', 'deutsche bank', 'postbank', 'revolut', 'paypal', 'stripe', 'sumup', 'amazon',
    'ebay', 'obi', 'bauhaus', 'hornbach', 'ikea', 'mediamarkt', 'saturn', 'kaufland', 'rewe', 'edeka',
    'aldi', 'lidl', 'netto', 'penny', 'dm ', 'rossmann', 'deutsche post', 'dhl', 'hermes', 'dpd', 'ups',
    'gls', 'db vertrieb', 'deutsche bahn', 'aral', 'shell', 'total', 'esso', 'jet ', 'hem ', 'star ',
    'tankstelle', 'totalenergies', 'orlen', 'q1 ', 'agip', 'avia', 'westfalen', 'kia', 'leasing', 'sixt',
    'europcar', 'hertz', 'buchbinder', 'rundfunk', 'gez', 'ihk', 'bgw', 'berufsgenossenschaft',
    'eigenbeleg', 'sammellieferant', 'kontoauszug', 'kontoauzug'
];

const CORPORATE_REGEX = /\b(gmbh|ag|kg|ohg|ug|gbr|e\.?\s*v\.?|e\.?\s*k\.?|ltd|inc|plc|holding|service\s+gmbh|wirtschaftsberatung)\b/i;

function normalizeName(str) {
    return String(str || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function normalizeCity(str) {
    return String(str || '')
        .toLowerCase()
        .replace(/[(),/-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

export function isVendorContactName(rawName) {
    const n = normalizeName(rawName);
    if (!n) return false;
    return VENDOR_KEYWORDS.some((kw) => n.includes(kw));
}

export function isNonCareCorporateName(rawName) {
    const clean = String(rawName || '').trim();
    if (!clean) return true;
    if (isVendorContactName(clean)) return true;
    if (CORPORATE_REGEX.test(clean)) return true;
    const norm = normalizeName(clean);
    if (norm === 'jenzsch' || norm === 'seniorenassistenz jenzsch') return true;
    return false;
}

function splitFullName(rawName) {
    const clean = String(rawName || '').trim();
    if (!clean) return { firstName: '', lastName: '' };
    if (clean.includes(',')) {
        const [last, first] = clean.split(',').map((s) => s.trim());
        return { firstName: first || '', lastName: last || clean };
    }
    const parts = clean.split(/\s+/);
    if (parts.length === 1) return { firstName: '', lastName: parts[0] };
    const lastName = parts.pop();
    return { firstName: parts.join(' '), lastName };
}

function parseStreetAndNumber(rawStreet) {
    const clean = String(rawStreet || '').trim();
    if (!clean) return { street: '', housenr: '' };
    const m = clean.match(/^(.*?)\s+(\d+[a-zA-Z0-9\s/-]*)$/);
    if (m) return { street: m[1].trim(), housenr: m[2].trim() };
    return { street: clean, housenr: '' };
}

export async function fetchAllLexOfficeContacts(apiKey) {
    try {
        const res = await lexofficeRequest(apiKey, '/contacts?page=0&size=100');
        return Array.isArray(res?.content) ? res.content : [];
    } catch {
        return [];
    }
}

export function findMatchingOrgaFlowClient(clientsList, lexDetail, voucherSummary = null, lexContact = null) {
    if (!Array.isArray(clientsList) || clientsList.length === 0) return null;

    const contactId = lexDetail?.address?.contactId || lexDetail?.contactId || voucherSummary?.contactId || lexContact?.id || '';
    if (contactId) {
        const byId = clientsList.find((c) => c.lexoffice_contact_id === contactId);
        if (byId) return byId;
    }

    const emailCandidates = [
        ...(lexContact?.emailAddresses?.business || []),
        ...(lexContact?.emailAddresses?.private || []),
        ...(lexContact?.emailAddresses?.office || []),
        ...(lexContact?.emailAddresses?.other || [])
    ].map((e) => normalizeName(e)).filter(Boolean);

    if (emailCandidates.length > 0) {
        const byEmail = clientsList.find((c) => emailCandidates.includes(normalizeName(c.email)));
        if (byEmail) return byEmail;
    }

    const candidateName = normalizeName(
        lexDetail?.address?.name ||
        voucherSummary?.contactName ||
        lexContact?.company?.name ||
        (lexContact?.person ? `${lexContact.person.firstName || ''} ${lexContact.person.lastName || ''}` : '')
    );
    if (!candidateName) return null;

    const addressCity = normalizeCity(lexDetail?.address?.city || lexContact?.addresses?.billing?.[0]?.city || '');

    const nameMatchesList = clientsList.filter((c) => {
        const first = normalizeName(c.name_first);
        const last = normalizeName(c.name_last);
        if (!first && !last) return false;
        const fullA = `${first} ${last}`.trim();
        const fullB = `${last}, ${first}`.trim();
        const fullC = `${last} ${first}`.trim();
        return (
            candidateName === fullA ||
            candidateName === fullB ||
            candidateName === fullC ||
            (last && first && candidateName.includes(last) && candidateName.includes(first))
        );
    });

    if (nameMatchesList.length === 1) return nameMatchesList[0];
    if (nameMatchesList.length > 1 && addressCity) {
        const byCity = nameMatchesList.find((c) => {
            const city = normalizeCity(c.city);
            return city && (addressCity === city || addressCity.includes(city) || city.includes(addressCity));
        });
        if (byCity) return byCity;
    }
    return nameMatchesList[0] || null;
}

export async function ensureOrgaFlowClientFromLexOffice(pb, apiKey, clientsList, lexDetail, voucherSummary, companyId, lexContactsMap = new Map()) {
    const contactId = lexDetail?.address?.contactId || lexDetail?.contactId || voucherSummary?.contactId || '';
    let lexContact = contactId ? lexContactsMap.get(contactId) : null;

    const matched = findMatchingOrgaFlowClient(clientsList, lexDetail, voucherSummary, lexContact);
    if (matched) {
        if (contactId && !matched.lexoffice_contact_id) {
            await pb.collection('clients').update(matched.id, {
                lexoffice_contact_id: contactId
            }, { requestKey: null }).catch(() => {});
            matched.lexoffice_contact_id = contactId;
        }
        return matched;
    }

    if (contactId && !lexContact) {
        lexContact = await lexofficeRequest(apiKey, `/contacts/${encodeURIComponent(contactId)}`).catch(() => null);
        if (lexContact) lexContactsMap.set(contactId, lexContact);
    }

    if (lexContact?.roles?.vendor && !lexContact?.roles?.customer) return null;
    if (lexContact?.company?.name && !lexContact?.person?.lastName) return null;

    const rawName = lexDetail?.address?.name ||
        voucherSummary?.contactName ||
        (lexContact?.person ? `${lexContact.person.firstName || ''} ${lexContact.person.lastName || ''}`.trim() : '');

    if (!rawName || isNonCareCorporateName(rawName)) return null;

    const { firstName, lastName } = lexContact?.person?.lastName
        ? { firstName: lexContact.person.firstName || '', lastName: lexContact.person.lastName }
        : splitFullName(rawName);

    if (!firstName || !lastName) return null;

    const billingAddr = lexDetail?.address || lexContact?.addresses?.billing?.[0] || {};
    const { street, housenr } = parseStreetAndNumber(billingAddr.street);
    const email = lexContact?.emailAddresses?.private?.[0] || lexContact?.emailAddresses?.business?.[0] || '';
    const phone = lexContact?.phoneNumbers?.private?.[0] || lexContact?.phoneNumbers?.mobile?.[0] || '';

    try {
        const createdClient = await pb.collection('clients').create({
            name_first: firstName,
            name_last: lastName,
            salutation: lexContact?.person?.salutation || '',
            street,
            housenr,
            zip: billingAddr.zip ? String(billingAddr.zip) : '',
            city: billingAddr.city || '',
            email,
            phone,
            company: companyId,
            status: 'Aktiv',
            lexoffice_contact_id: contactId || ''
        }, { requestKey: null });

        clientsList.push(createdClient);
        return createdClient;
    } catch {
        return null;
    }
}

export async function ensureLexOfficeContactForClient(pb, apiKey, clientRecord, lexContactsList = []) {
    if (!clientRecord) return null;
    if (clientRecord.lexoffice_contact_id) return clientRecord.lexoffice_contact_id;

    const fullName = `${clientRecord.name_first || ''} ${clientRecord.name_last || ''}`.trim();
    if (!fullName) return null;

    const normFull = normalizeName(fullName);
    const existingLex = lexContactsList.find((c) => {
        const compName = normalizeName(c.company?.name);
        const persName = normalizeName(`${c.person?.firstName || ''} ${c.person?.lastName || ''}`);
        return compName === normFull || persName === normFull;
    });

    if (existingLex?.id) {
        await pb.collection('clients').update(clientRecord.id, {
            lexoffice_contact_id: existingLex.id
        }, { requestKey: null }).catch(() => {});
        clientRecord.lexoffice_contact_id = existingLex.id;
        return existingLex.id;
    }

    const streetLine = `${clientRecord.street || ''} ${clientRecord.housenr || ''}`.trim();
    const contactPayload = {
        version: 0,
        roles: { customer: {} },
        person: {
            salutation: clientRecord.salutation === 'Herr' || clientRecord.salutation === 'Frau' ? clientRecord.salutation : undefined,
            firstName: clientRecord.name_first || undefined,
            lastName: clientRecord.name_last || fullName
        },
        addresses: (streetLine || clientRecord.city || clientRecord.zip) ? {
            billing: [{
                street: streetLine || undefined,
                zip: clientRecord.zip ? String(clientRecord.zip) : undefined,
                city: clientRecord.city || undefined,
                countryCode: 'DE'
            }]
        } : undefined
    };

    try {
        const created = await lexofficeRequest(apiKey, '/contacts', { method: 'POST', body: contactPayload });
        if (created?.id) {
            await pb.collection('clients').update(clientRecord.id, { lexoffice_contact_id: created.id }, { requestKey: null }).catch(() => {});
            clientRecord.lexoffice_contact_id = created.id;
            lexContactsList.push({ id: created.id, person: contactPayload.person, roles: { customer: {} } });
            return created.id;
        }
    } catch {}
    return null;
}
