import { pb } from "$lib/services/pocketbase";
import {
    resolveClientCarepersonContact,
    resolveClientInheritorContact
} from "./clientContactRoleHelper";

/**
 * documentRecipientHelper.ts
 * Sichere Auflösung und Adressformatierung für unterschiedliche Empfängertypen
 * (Klient, Betreuer, Krankenkasse, Kontakt, Pflegeheim, Pflegeperson/Erbe).
 */

export function resolveRecipientData(
    client: any,
    recipientType: string,
    recipientId: string,
    orgaStore: any
): any {
    if (!client) return {};
    const allContacts = orgaStore?.contacts?.data || [];

    if (recipientType === 'caregiver') {
        const cgs = Array.isArray(client.expand?.caregiver)
            ? client.expand.caregiver
            : (client.expand?.caregiver ? [client.expand.caregiver] : []);
        const found = cgs.find((c: any) => c.id === recipientId) || cgs[0];
        if (found) return found;
        const resolved = resolveClientCarepersonContact(client, allContacts);
        if (resolved) return resolved;
        if (client.caregiver) {
            return allContacts.find((c: any) => c.id === client.caregiver) || {};
        }
        return {};
    }

    if (recipientType === 'insurance') {
        const inss = Array.isArray(client.expand?.insurance)
            ? client.expand.insurance
            : (client.expand?.insurance ? [client.expand.insurance] : []);
        const found = inss.find((i: any) => i.id === recipientId) || inss[0];
        if (found) return found;
        if (client.insurance) {
            return (orgaStore?.insurancies?.data || orgaStore?.insurances?.data || []).find((i: any) => i.id === client.insurance) || {};
        }
        return {};
    }

    if (recipientType === 'contact') {
        const contacts = Array.isArray(client.expand?.contacts)
            ? client.expand.contacts
            : (client.expand?.contacts ? [client.expand.contacts] : []);
        return contacts.find((c: any) => c.id === recipientId) || contacts[0] || allContacts.find((c: any) => c.id === recipientId) || {};
    }

    if (recipientType === 'home') {
        const homes = [
            ...(Array.isArray(client.expand?.retirement_homes) ? client.expand.retirement_homes : (client.expand?.retirement_homes ? [client.expand.retirement_homes] : [])),
            ...(Array.isArray(client.expand?.nursing_homes) ? client.expand.nursing_homes : (client.expand?.nursing_homes ? [client.expand.nursing_homes] : []))
        ];
        return homes.find((h: any) => h.id === recipientId) || homes[0] || {};
    }

    if (recipientType === 'inheritor') {
        const inheritors = Array.isArray(client.expand?.inheritor)
            ? client.expand.inheritor
            : (client.expand?.inheritor ? [client.expand.inheritor] : []);
        const found = inheritors.find((i: any) => i.id === recipientId) || inheritors[0];
        if (found) return found;
        const resolved = resolveClientInheritorContact(client, allContacts) || resolveClientCarepersonContact(client, allContacts);
        if (resolved) return resolved;
        let inh = client.inheritor_info;
        if (typeof inh === 'string') {
            try { inh = JSON.parse(inh); } catch { inh = {}; }
        }
        if (inh?.inheritor_name || inh?.name) {
            return {
                name: inh.inheritor_name || inh.name,
                name_first: inh.inheritor_name || inh.name,
                phone: inh.inheritor_phone || inh.phone,
                email: inh.inheritor_email || inh.email,
                street: inh.street,
                housenr: inh.housenr,
                zip: inh.zip,
                city: inh.city,
                directSign: inh.inheritor_signature || inh.signature
            };
        }
        return {};
    }

    return client;
}

export function formatRecipientDetails(rec: any, recipientType: string, client: any) {
    const cl = client || {};
    const cStatus = (cl.status || '').toLowerCase();
    const isDeceased = cStatus === 'verstorben';

    let recSalutation = '';
    let recNameFirst = '';
    let recNameLast = '';
    let recFullName = '';
    let recCompanyName = '';
    let recAddition = '';
    let recStreet = '';
    let recHousenr = '';
    let recZip = '';
    let recCity = '';
    let recFormal = '';

    if (recipientType === 'insurance') {
        recNameFirst = rec.name || '';
        recFullName = rec.name || 'Krankenkasse';
        recCompanyName = rec.name || '';
        recAddition = rec.department || rec.addition || '';
        recStreet = rec.street || '';
        recHousenr = rec.housenr || '';
        recZip = rec.zip || '';
        recCity = rec.city || '';
        recFormal = 'Sehr geehrte Damen und Herren,';
    } else if (recipientType === 'home') {
        recNameFirst = rec.name || '';
        recFullName = rec.name || 'Pflegeheim';
        recCompanyName = rec.name || '';
        recAddition = rec.addition || '';
        recStreet = rec.street || '';
        recHousenr = rec.housenr || '';
        recZip = rec.zip || '';
        recCity = rec.city || '';
        recFormal = 'Sehr geehrte Damen und Herren,';
    } else if (recipientType === 'inheritor' && isDeceased) {
        recNameFirst = cl.name_first || '';
        recNameLast = cl.name_last || '';
        recFullName = `${cl.name_first || ''} ${cl.name_last || ''}`.trim();
        recCompanyName = `c/o ${rec.name_first || ''} ${rec.name_last || ''}`.trim();
        recAddition = `c/o ${rec.name_first || ''} ${rec.name_last || ''}`.trim();
        recStreet = `c/o ${rec.name_first || ''} ${rec.name_last || ''}\n${rec.street || ''}`.trim();
        recHousenr = rec.housenr || '';
        recZip = rec.zip || '';
        recCity = rec.city || '';
        recFormal = rec.salutation === 'Herr'
            ? `Sehr geehrter Herr ${rec.name_last || ''},`
            : (rec.salutation === 'Frau' ? `Sehr geehrte Frau ${rec.name_last || ''},` : 'Sehr geehrte Damen und Herren,');
    } else {
        if (rec.salutation === 'Herr') recSalutation = 'Herr';
        else if (rec.salutation === 'Frau') recSalutation = 'Frau';
        else if (rec.salutation && rec.salutation !== 'Keine Angabe' && rec.salutation !== 'Divers') recSalutation = rec.salutation;

        if (recipientType === 'client' && isDeceased) recSalutation = '';

        recNameFirst = rec.name_first || '';
        recNameLast = rec.name_last || '';
        recFullName = `${recNameFirst} ${recNameLast}`.trim() || rec.name || '';
        recCompanyName = rec.company_name || '';
        recAddition = rec.company_name || rec.addition || '';
        recStreet = rec.street || '';
        recHousenr = rec.housenr || '';
        recZip = rec.zip || '';
        recCity = rec.city || '';

        if (rec.salutation === 'Herr') {
            recFormal = `Sehr geehrter Herr ${recNameLast || recFullName},`;
        } else if (rec.salutation === 'Frau') {
            recFormal = `Sehr geehrte Frau ${recNameLast || recFullName},`;
        } else if (recNameLast) {
            recFormal = `Guten Tag ${recFullName},`;
        } else {
            recFormal = 'Sehr geehrte Damen und Herren,';
        }
    }

    const recStreetFull = `${recStreet} ${recHousenr}`.trim();
    const recCityFull = `${recZip} ${recCity}`.trim();

    const addressLines: string[] = [];
    if (recipientType === 'insurance' || recipientType === 'home') {
        if (rec.name) addressLines.push(rec.name);
        if (recAddition) addressLines.push(recAddition);
        if (recStreetFull) addressLines.push(recStreetFull);
        if (recCityFull) addressLines.push(recCityFull);
    } else {
        if (recCompanyName) addressLines.push(recCompanyName);
        const nameLine = [recSalutation, recFullName].filter(Boolean).join(' ');
        if (nameLine) addressLines.push(nameLine);
        if (recStreetFull) addressLines.push(recStreetFull);
        if (recCityFull) addressLines.push(recCityFull);
    }

    let recSignUrl = rec.sign ? pb.files.getURL(rec, rec.sign) : (rec.directSign || '');
    if (recSignUrl && pb.authStore.token && !recSignUrl.startsWith('data:')) {
        recSignUrl += (recSignUrl.includes('?') ? '&' : '?') + 'token=' + pb.authStore.token;
    }

    return {
        recSalutation, recNameFirst, recNameLast, recFullName, recCompanyName, recAddition,
        recStreet, recHousenr, recZip, recCity, recStreetFull, recCityFull, recFormal,
        recAddressFull: addressLines.join('\n'), recSignUrl
    };
}

export function getRecipientSummaryLabel(recipientType: string, rec: any): string {
    if (!rec) return 'Kein Empfänger';
    if (recipientType === 'client') return `Klient selbst (${rec.name_first || ''} ${rec.name_last || ''})`.trim();
    if (recipientType === 'caregiver') return `Gesetzl. Betreuung: ${rec.name_first || ''} ${rec.name_last || ''}${rec.company_name ? ` (${rec.company_name})` : ''}`.trim();
    if (recipientType === 'insurance') return `Krankenkasse: ${rec.name || 'Unbekannt'}${rec.department ? ` (${rec.department})` : ''}`.trim();
    if (recipientType === 'contact') return `Kontakt: ${rec.name_first || ''} ${rec.name_last || ''}${rec.company_name ? ` (${rec.company_name})` : ''}`.trim();
    if (recipientType === 'home') return `Pflegeheim: ${rec.name || 'Unbekannt'}`.trim();
    if (recipientType === 'inheritor') return `Pflegeperson: ${rec.name_first || ''} ${rec.name_last || ''}`.trim();
    return rec.name || `${rec.name_first || ''} ${rec.name_last || ''}`.trim() || recipientType;
}
