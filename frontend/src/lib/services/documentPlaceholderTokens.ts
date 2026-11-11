import { pb } from "$lib/services/pocketbase";
import { resolveRecipientData, formatRecipientDetails } from "./documentRecipientHelper";
import {
    resolveClientCarepersonContact,
    resolveClientInheritorContact,
    getNormalizedContactRelation
} from "./clientContactRoleHelper";
import type { PlaceholderContext } from "./documentPlaceholderTypes";
import { safeFormatDate } from "./documentPlaceholderTypes";
import { getLegacyAndMetaTokens } from "./documentLegacyTokens";

export { type PlaceholderContext, safeFormatDate };

export function buildDocumentTokenMap(ctx: PlaceholderContext): Array<[string, string]> {
    const cl: any = ctx.client || {};
    const comp: any = ctx.company || {};
    const usr: any = (ctx.onBehalfOfUserId ? ctx.effectiveUser : null) || pb.authStore.record || {};
    const ins: any = cl.expand?.insurance || {};
    const isAddr = ctx.isAddressContext || false;
    const isDiff = ctx.recipientType !== 'client';
    const allContacts: any[] = ctx.orgaStore?.contacts?.data || [];

    const rec = resolveRecipientData(cl, ctx.recipientType, ctx.recipientId, ctx.orgaStore);
    const recD = formatRecipientDetails(rec, ctx.recipientType, cl);

    let clSign = cl.sign ? pb.files.getURL(cl, cl.sign) : '';
    let usrSign = usr.sign ? pb.files.getURL(usr, usr.sign) : '';
    if (clSign && pb.authStore.token) clSign += (clSign.includes('?') ? '&' : '?') + 'token=' + pb.authStore.token;
    if (usrSign && pb.authStore.token) usrSign += (usrSign.includes('?') ? '&' : '?') + 'token=' + pb.authStore.token;

    const issueDateObj = new Date((ctx.manualIssueDate || new Date().toISOString().slice(0, 10)) + 'T00:00:00Z');
    const plus1y = new Date(issueDateObj); plus1y.setUTCFullYear(plus1y.getUTCFullYear() + 1);
    const dateTodayStr = issueDateObj.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
    const dateToday1y = plus1y.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
    const dueDate = new Date(issueDateObj.getTime() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });

    const clSalMap = (sal: string) => sal === 'Herr' ? 'Herr' : (sal === 'Frau' ? 'Frau' : (sal && sal !== 'Keine Angabe' && sal !== 'Divers' ? sal : ''));
    const clSalutation = (cl.status || '').toLowerCase() === 'verstorben' ? '' : clSalMap(cl.salutation || '');
    const clFormal = cl.salutation === 'Herr' ? `Sehr geehrter Herr ${cl.name_last || ''},`
        : (cl.salutation === 'Frau' ? `Sehr geehrte Frau ${cl.name_last || ''},` : `Guten Tag ${cl.name_first || ''} ${cl.name_last || ''},`);

    const sigLine = '<div class="signature-line-placeholder"></div>';
    const recSig = recD.recSignUrl ? `<img src="${recD.recSignUrl}" style="max-height: 50px; height: 45px; object-fit: contain;" crossorigin="anonymous" />` : sigLine;
    let clSig = clSign ? `<img src="${clSign}" style="max-height: 50px; height: 45px; object-fit: contain;" crossorigin="anonymous" />` : sigLine;
    const usrSig = usrSign ? `<img src="${usrSign}" style="max-height: 50px; height: 45px; object-fit: contain;" crossorigin="anonymous" />` : sigLine;

    // Careperson & Inheritor (§ 39 & Vertretung aus verknüpftem Kontakt mit Legacy-Fallback)
    let cpInfo: any = cl.inheritor_info || {};
    if (typeof cpInfo === 'string') {
        try { cpInfo = JSON.parse(cpInfo); } catch { cpInfo = {}; }
    }
    const cpCont: any = resolveClientCarepersonContact(cl, allContacts) || {};
    const inhCont: any = resolveClientInheritorContact(cl, allContacts) || {};
    let cpContSign = cpCont.sign ? pb.files.getURL(cpCont, cpCont.sign) : '';
    if (cpContSign && pb.authStore.token) cpContSign += (cpContSign.includes('?') ? '&' : '?') + 'token=' + pb.authStore.token;
    let inhContSign = inhCont.sign ? pb.files.getURL(inhCont, inhCont.sign) : '';
    if (inhContSign && pb.authStore.token) inhContSign += (inhContSign.includes('?') ? '&' : '?') + 'token=' + pb.authStore.token;

    const directCpSign = cpContSign || cpInfo.signature || cpInfo.sign || '';
    const cpSig = directCpSign ? `<img src="${directCpSign}" style="max-height: 50px; height: 45px; object-fit: contain;" crossorigin="anonymous" />` : sigLine;
    const directInhSign = inhContSign || cpInfo.inheritor_signature || cpInfo.representative_signature || '';
    const inhSig = directInhSign ? `<img src="${directInhSign}" style="max-height: 50px; height: 45px; object-fit: contain;" crossorigin="anonymous" />` : sigLine;
    if (!clSign && directInhSign) clSig = inhSig;

    const cpName = `${cpCont.name_first || ''} ${cpCont.name_last || ''}`.trim() || cpCont.company_name || cpInfo.name || cpInfo.careperson_name || '';
    const cpStreet = cpCont.street || cpInfo.street || '';
    const cpHousenr = cpCont.housenr || cpInfo.housenr || '';
    const cpZip = cpCont.zip || cpInfo.zip || '';
    const cpCity = cpCont.city || cpInfo.city || '';
    const cpBirthdate = safeFormatDate(cpCont.birthdate || cpCont.date_birth || cpInfo.birthdate || '');
    const cpRelation = (cpCont.id ? getNormalizedContactRelation(cl, cpCont.id).relation : '') || cpInfo.relation || '';
    const cpReason = cpInfo.reason || 'Erholungsurlaub';
    const cpPhone = cpCont.phone || cpCont.handy || cpInfo.phone || '';
    const cpEmail = cpCont.email || cpInfo.email || '';

    const inhName = `${inhCont.name_first || ''} ${inhCont.name_last || ''}`.trim() || inhCont.company_name || cpInfo.inheritor_name || '';
    const inhRelation = (inhCont.id ? getNormalizedContactRelation(cl, inhCont.id).relation : '') || cpInfo.inheritor_relation || '';
    const inhPhone = inhCont.phone || inhCont.handy || cpInfo.inheritor_phone || '';
    const inhEmail = inhCont.email || cpInfo.inheritor_email || '';

    const cgRaw: any = cpCont.id ? cpCont : ((Array.isArray(cl.expand?.caregiver) ? cl.expand.caregiver[0] : cl.expand?.caregiver) || {});
    const ctRaw: any = (Array.isArray(cl.expand?.contacts) ? cl.expand.contacts[0] : cl.expand?.contacts) || {};

    let assUser: any = ctx.assistantUser;
    if (!assUser || (!assUser.id && !assUser.name_first)) {
        const allUsers: any[] = ctx.orgaStore?.users?.data || [];
        if (cl.id && allUsers.length > 0) {
            assUser = allUsers.find((u: any) => {
                let list = u.assigned_clients || u.clients;
                if (typeof list === 'string') {
                    try { list = JSON.parse(list); } catch { return list.includes(cl.id); }
                }
                return Array.isArray(list) && list.includes(cl.id);
            });
        }
        if (!assUser && cl.caregiver && allUsers.length > 0) assUser = allUsers.find((u: any) => u.id === cl.caregiver);
        if (!assUser && ctx.onBehalfOfUserId && allUsers.length > 0) assUser = allUsers.find((u: any) => u.id === ctx.onBehalfOfUserId);
        if (!assUser || (!assUser.id && !assUser.name_first)) assUser = ctx.effectiveUser || usr || {};
    }
    const hasAss = !!(assUser && (assUser.id || assUser.name_first || assUser.name_last));
    let assSign = assUser.sign ? pb.files.getURL(assUser, assUser.sign) : (usr.sign ? pb.files.getURL(usr, usr.sign) : '');
    if (assSign && pb.authStore.token) assSign += (assSign.includes('?') ? '&' : '?') + 'token=' + pb.authStore.token;
    const assSig = assSign ? `<img src="${assSign}" style="max-height: 50px; height: 45px; object-fit: contain;" crossorigin="anonymous" />` : sigLine;
    const assFullName = hasAss ? `${assUser.name_first || ''} ${assUser.name_last || ''}`.trim() : '';
    const assRole = hasAss ? (assUser.salutation === 'Frau' ? 'Assistentin' : 'Assistent') : '';
    const clEffectiveFullName = (isAddr && isDiff) ? recD.recFullName : `${cl.name_first || ''} ${cl.name_last || ''}`.trim();

    return [
        ['{{recipient.street}} {{recipient.housenr}}', recD.recStreetFull],
        ['{{recipient.zip}} {{recipient.city}}',       recD.recCityFull],
        ['{{recipient.address_full}}',                 recD.recAddressFull.replace(/\n/g, '<br/>')],
        ['{{recipient.salutation}}',                   recD.recSalutation],
        ['{{recipient.salutation_formal}}',            recD.recFormal],
        ['{{recipient.name}}',                         recD.recFullName],
        ['{{recipient.name_first}}',                   recD.recNameFirst],
        ['{{recipient.name_last}}',                    recD.recNameLast],
        ['{{recipient.company_name}}',                 recD.recCompanyName],
        ['{{recipient.addition}}',                     recD.recAddition],
        ['{{recipient.street}}',                       recD.recStreet],
        ['{{recipient.housenr}}',                      recD.recHousenr],
        ['{{recipient.zip}}',                          recD.recZip],
        ['{{recipient.city}}',                         recD.recCity],
        ['{{recipient.phone}}',                        rec.phone || rec.tel || rec.handy || ''],
        ['{{recipient.email}}',                        rec.email || ''],
        ['{{recipient.signature}}',                    recSig],

        ['{{client.street}} {{client.housenr}}', (isAddr && isDiff) ? recD.recStreetFull : `${cl.street || ''} ${cl.housenr || ''}`.trim()],
        ['{{client.zip}} {{client.city}}',       (isAddr && isDiff) ? recD.recCityFull : `${cl.zip || ''} ${cl.city || ''}`.trim()],
        ['{{client.salutation}}',        (isAddr && isDiff) ? recD.recSalutation : clSalutation],
        ['{{client.salutation_formal}}', isDiff ? recD.recFormal : clFormal],
        ['{{client.name_first}} {{client.name_last}}', clEffectiveFullName],
        ['{{client.name}}',              clEffectiveFullName],
        ['{{client.name_first}}',        (isAddr && isDiff) ? recD.recNameFirst : (cl.name_first || '')],
        ['{{client.name_last}}',         (isAddr && isDiff) ? recD.recNameLast : (cl.name_last || '')],
        ['{{client.street}}',            (isAddr && isDiff) ? recD.recStreet : (cl.street || '')],
        ['{{client.housenr}}',           (isAddr && isDiff) ? recD.recHousenr : (cl.housenr || '')],
        ['{{client.zip}}',               (isAddr && isDiff) ? recD.recZip : (cl.zip || '')],
        ['{{client.city}}',              (isAddr && isDiff) ? recD.recCity : (cl.city || '')],
        ['{{client.company_name}}',      (isAddr && isDiff) ? recD.recCompanyName : (cl.company_name || '')],
        ['{{client.addition}}',          (isAddr && isDiff) ? recD.recAddition : (cl.company_name || '')],
        ['{{client.email}}',             cl.email || ''],
        ['{{client.phone}}',             cl.phone || ''],
        ['{{client.handy}}',             cl.handy || ''],
        ['{{client.insurance_nr}}',      cl.insurance_nr || ''],
        ['{{client.birthdate}}',         safeFormatDate(cl.birthdate)],
        ['{{client.level_of_care}}',     cl.level_of_care || ''],
        ['{{client.budget_45b}}',        '125,00 €'],
        ['{{client.signature}}',         clSig],

        ['{{assistant.street}} {{assistant.housenr}}', hasAss ? `${assUser.street || ''} ${assUser.housenr || ''}`.trim() : ''],
        ['{{assistant.zip}} {{assistant.city}}',       hasAss ? `${assUser.zip || ''} ${assUser.city || ''}`.trim() : ''],
        ['{{assistant.name_first}} {{assistant.name_last}}', assFullName],
        ['{{assistant.name}}',                         assFullName],
        ['{{assistant.name_first}}',                   hasAss ? (assUser.name_first || '') : ''],
        ['{{assistant.name_last}}',                    hasAss ? (assUser.name_last || '') : ''],
        ['{{assistant.role}}',                         assRole],
        ['{{assistant.email}}',                        hasAss ? (assUser.email || '') : ''],
        ['{{assistant.tel}}',                          hasAss ? (assUser.tel || assUser.phone || '') : ''],
        ['{{assistant.phone}}',                        hasAss ? (assUser.phone || assUser.tel || '') : ''],
        ['{{assistant.handy}}',                        hasAss ? (assUser.handy || assUser.mobile || '') : ''],
        ['{{assistant.mobile}}',                       hasAss ? (assUser.handy || assUser.mobile || '') : ''],
        ['{{assistant.street}}',                       hasAss ? (assUser.street || '') : ''],
        ['{{assistant.housenr}}',                      hasAss ? (assUser.housenr || '') : ''],
        ['{{assistant.zip}}',                          hasAss ? (assUser.zip || '') : ''],
        ['{{assistant.city}}',                         hasAss ? (assUser.city || '') : ''],
        ['{{assistant.date_birth}}',                   hasAss ? safeFormatDate(assUser.date_birth || assUser.birthdate) : ''],
        ['{{assistant.birthdate}}',                    hasAss ? safeFormatDate(assUser.birthdate || assUser.date_birth) : ''],
        ['{{assistant.signature}}', assSig], ['{{assistant.sign}}', assSig], ['{{assistant_signature}}', assSig],
        ['{{assistant_sign}}', assSig], ['{{signature_assistant}}', assSig], ['{{mitarbeiter.signature}}', assSig], ['{{mitarbeiter.sign}}', assSig],

        ['{{careperson.street}} {{careperson.housenr}}', `${cpStreet} ${cpHousenr}`.trim()],
        ['{{careperson.zip}} {{careperson.city}}',       `${cpZip} ${cpCity}`.trim()],
        ['{{careperson.name}}',        cpName],
        ['{{careperson.street}}',      cpStreet],
        ['{{careperson.housenr}}',     cpHousenr],
        ['{{careperson.zip}}',         cpZip],
        ['{{careperson.city}}',        cpCity],
        ['{{careperson.birthdate}}',   cpBirthdate],
        ['{{careperson.relation}}',    cpRelation],
        ['{{careperson.reason}}',      cpReason],
        ['{{careperson.phone}}',       cpPhone],
        ['{{careperson.email}}',       cpEmail],
        ['{{careperson.budget_39}}',   '1.612,00 €'],
        ['{{careperson.signature}}', cpSig], ['{{careperson.sign}}', cpSig], ['{{pflegeperson.signature}}', cpSig], ['{{pflegeperson.sign}}', cpSig],
        ['{{inheritor.signature}}', inhSig], ['{{inheritor.sign}}', inhSig], ['{{representative.signature}}', inhSig], ['{{representative.sign}}', inhSig],
        ['{{bevollmaechtigter.signature}}', inhSig], ['{{bevollmaechtigter.sign}}', inhSig], ['{{gesetzlicher_vertreter.signature}}', inhSig],
        ['{{vertretung.signature}}', inhSig], ['{{erbe.signature}}', inhSig],
        ['{{inheritor.name}}',         inhName],
        ['{{inheritor.relation}}',     inhRelation],
        ['{{inheritor.phone}}',        inhPhone],
        ['{{inheritor.email}}',        inhEmail],

        ['{{insurance.zip}} {{insurance.city}}', `${ins.zip || ''} ${ins.city || ''}`.trim()],
        ['{{insurance.name}}',       ins.name || ''],
        ['{{insurance.department}}', ins.department || ''],
        ['{{insurance.addition}}',   ins.addition || ''],
        ['{{insurance.street}}',     ins.street || ''],
        ['{{insurance.zip}}',        ins.zip || ''],
        ['{{insurance.city}}',       ins.city || ''],
        ['{{insurance.phone}}',      ins.phone || ''],
        ['{{caregiver.street}} {{caregiver.housenr}}', `${cgRaw.street || ''} ${cgRaw.housenr || ''}`.trim()],
        ['{{caregiver.zip}} {{caregiver.city}}',       `${cgRaw.zip || ''} ${cgRaw.city || ''}`.trim()],
        ['{{caregiver.name_first}}',   cgRaw.name_first || ''],
        ['{{caregiver.name_last}}',    cgRaw.name_last || ''],
        ['{{caregiver.company_name}}', cgRaw.company_name || ''],
        ['{{caregiver.street}}',       cgRaw.street || ''],
        ['{{caregiver.housenr}}',      cgRaw.housenr || ''],
        ['{{caregiver.zip}}',          cgRaw.zip || ''],
        ['{{caregiver.city}}',         cgRaw.city || ''],
        ['{{caregiver.phone}}',        cgRaw.phone || cgRaw.handy || ''],
        ['{{caregiver.email}}',        cgRaw.email || ''],
        ['{{caregiver.salutation}}',   cgRaw.salutation || ''],
        ['{{caregiver.signature}}',    cpSig],
        ['{{caregiver.sign}}',         cpSig],
        ['{{contact.name_first}}',     ctRaw.name_first || ''],
        ['{{contact.name_last}}',      ctRaw.name_last || ''],
        ['{{contact.company_name}}',   ctRaw.company_name || ''],
        ['{{contact.street}}',         ctRaw.street || ''],
        ['{{contact.zip}}',            ctRaw.zip || ''],
        ['{{contact.city}}',           ctRaw.city || ''],
        ['{{user.name_first}}', usr.name_first || ''],
        ['{{user.name_last}}',  usr.name_last || ''],
        ['{{user.signature}}',  usrSig],
        ['{{company.return_address_line}}', `[[RET_ADDR]]${comp.name || ''} • ${comp.street || ''} ${comp.housenr || ''} • ${comp.zip || ''} ${comp.city || ''}[[/RET_ADDR]]`.trim()],
        ['{{company.name}}',             comp.name || ''],
        ['{{company.street}}',           comp.street || ''],
        ['{{company.housenr}}',          comp.housenr || ''],
        ['{{company.zip}}',              comp.zip || ''],
        ['{{company.city}}',             comp.city || ''],
        ['{{company.email}}',            comp.email || ''],
        ['{{company.phone}}',            comp.number_telephone || comp.phone || ''],
        ['{{company.number_telephone}}', comp.number_telephone || comp.phone || ''],
        ['{{company.number_mobile}}',    comp.number_mobile || comp.mobile || comp.handy || ''],
        ['{{company.website}}',          comp.website || ''],
        ['{{company.bank_name}}',        comp.bank_name || ''],
        ['{{company.bank_iban}}',        comp.bank_iban || ''],
        ['{{company.bank_bic}}',         comp.bank_bic || ''],
        ['{{company.vatcode}}',          comp.vatcode || ''],
        ['{{company.ik_number}}',        comp.ik_number || ''],
        ...getLegacyAndMetaTokens(comp, usr, dateTodayStr, dateToday1y, dueDate, recD, ctx)
    ];
}
