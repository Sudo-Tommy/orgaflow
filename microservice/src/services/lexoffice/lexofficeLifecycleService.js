import { decryptApiKey } from './lexofficeCrypto.js';
import { lexofficeRequest, attachFileToLexOfficeVoucher } from './lexofficeHttpClient.js';
import { ensureLexOfficeContactForClient, fetchAllLexOfficeContacts } from './lexofficeContactService.js';
import { mapOrgaFlowToLexOfficeVoucher } from './lexofficeMapper.js';
import { syncInvoiceToOrgaAccounting } from './lexofficeAccountingService.js';
import { writeLexOfficeAuditLog } from './lexofficeSchemaService.js';
import { PB_URL } from '../../config/env.js';

async function getActiveCompanyConfig(pb, companyId) {
    const cid = Array.isArray(companyId) ? companyId[0] : companyId;
    if (!cid) return null;
    return await pb.collection('lexoffice_configs').getFirstListItem(
        `company = "${cid}" && status != "disconnected"`,
        { requestKey: null }
    ).catch(() => null);
}

export async function uploadOrgaPdfToLexOfficeVoucher(apiKey, inv, lexVoucherId) {
    if (!inv?.id || !lexVoucherId) return false;
    const pdfFiles = Array.isArray(inv.pdf) ? inv.pdf : (inv.pdf ? [inv.pdf] : []);
    if (pdfFiles.length === 0) return false;

    try {
        const pdfUrl = `${PB_URL}/api/files/invoices/${inv.id}/${encodeURIComponent(pdfFiles[0])}`;
        const fileRes = await fetch(pdfUrl);
        if (!fileRes.ok) return false;
        const buf = Buffer.from(await fileRes.arrayBuffer());
        await attachFileToLexOfficeVoucher(apiKey, lexVoucherId, buf, pdfFiles[0]);
        return true;
    } catch {
        return false;
    }
}

export async function pushOrUpdateSingleInvoiceInLexOffice(pb, invoiceId, options = {}) {
    const inv = await pb.collection('invoices').getOne(invoiceId, {
        expand: 'client',
        requestKey: null
    }).catch(() => null);

    if (!inv || inv.invoice_nr === 'Zeitnachweis' || inv.status === 'Abgelehnt') {
        return { synced: false, reason: 'skipped' };
    }

    const companyId = Array.isArray(inv.company) ? inv.company[0] : inv.company;
    if (!companyId) return { synced: false, reason: 'no_company' };

    const config = await getActiveCompanyConfig(pb, companyId);
    if (!config) return { synced: false, reason: 'no_config' };

    const apiKey = decryptApiKey(config);
    const clientRecord = Array.isArray(inv.expand?.client) ? inv.expand.client[0] : inv.expand?.client;
    if (clientRecord?.company) {
        const clientComps = Array.isArray(clientRecord.company) ? clientRecord.company : [clientRecord.company];
        if (!clientComps.includes(companyId)) return { synced: false, reason: 'company_mismatch' };
    }

    const lexContacts = await fetchAllLexOfficeContacts(apiKey);
    const contactId = clientRecord
        ? await ensureLexOfficeContactForClient(pb, apiKey, clientRecord, lexContacts)
        : null;

    let existingLexVoucher = null;
    if (inv.lexoffice_id) {
        existingLexVoucher = await lexofficeRequest(apiKey, `/vouchers/${encodeURIComponent(inv.lexoffice_id)}`).catch(() => null);
    }

    const voucherPayload = mapOrgaFlowToLexOfficeVoucher(inv, clientRecord, contactId, existingLexVoucher);

    let lexVoucherId = inv.lexoffice_id;
    if (existingLexVoucher?.id && existingLexVoucher?.version != null && existingLexVoucher.voucherStatus === 'unchecked') {
        const updated = await lexofficeRequest(apiKey, `/vouchers/${encodeURIComponent(existingLexVoucher.id)}`, {
            method: 'PUT',
            body: voucherPayload
        }).catch(() => null);
        if (updated?.id) lexVoucherId = updated.id;
    } else if (!existingLexVoucher) {
        const created = await lexofficeRequest(apiKey, '/vouchers', {
            method: 'POST',
            body: voucherPayload
        });
        lexVoucherId = created?.id || '';
    }

    if (lexVoucherId) {
        const hasLexFiles = Array.isArray(existingLexVoucher?.files) && existingLexVoucher.files.length > 0;
        if (!hasLexFiles) {
            await uploadOrgaPdfToLexOfficeVoucher(apiKey, inv, lexVoucherId);
        }

        await pb.collection('invoices').update(inv.id, {
            lexoffice_id: lexVoucherId,
            lexoffice_voucher_status: existingLexVoucher?.voucherStatus || 'open',
            lexoffice_synced_at: new Date().toISOString()
        }, { requestKey: null });

        const accountingList = await pb.collection('accounting').getFullList({ requestKey: null }).catch(() => []);
        await syncInvoiceToOrgaAccounting(pb, { ...inv, lexoffice_id: lexVoucherId }, clientRecord, accountingList);
    }

    return { synced: Boolean(lexVoucherId), lexofficeId: lexVoucherId };
}

export async function handleInvoiceStornoOrDeleteInLexOffice(pb, invoiceData, mode = 'storno', actor = {}) {
    if (!invoiceData) return { handled: false };
    const rawNr = String(invoiceData.invoice_nr || '').trim();
    if (rawNr.toUpperCase().startsWith('STORNO') || invoiceData.is_cancellation) {
        return { handled: true, skipped: true };
    }

    const companyId = Array.isArray(invoiceData.company) ? invoiceData.company[0] : invoiceData.company;
    const config = await getActiveCompanyConfig(pb, companyId);
    if (!config) return { handled: false, reason: 'no_config' };

    let clientRecord = Array.isArray(invoiceData.expand?.client) ? invoiceData.expand.client[0] : invoiceData.expand?.client;
    if (!clientRecord && invoiceData.client) {
        const cid = Array.isArray(invoiceData.client) ? invoiceData.client[0] : invoiceData.client;
        clientRecord = await pb.collection('clients').getOne(cid, { requestKey: null }).catch(() => null);
    }

    let creditVoucherId = null;
    if (mode === 'storno' && invoiceData.lexoffice_id) {
        const apiKey = decryptApiKey(config);
        const lexContacts = await fetchAllLexOfficeContacts(apiKey);
        const contactId = clientRecord
            ? await ensureLexOfficeContactForClient(pb, apiKey, clientRecord, lexContacts)
            : null;

        const stornoNr = invoiceData.cancellation_nr || `STORNO-${rawNr || invoiceData.id?.slice(0, 6)}`;
        const creditPayload = mapOrgaFlowToLexOfficeVoucher({
            ...invoiceData,
            invoice_nr: stornoNr,
            is_cancellation: true,
            status: 'Storniert',
            issue_date: new Date().toISOString(),
            notes: `GoBD-Stornobeleg zu Rechnung ${rawNr}`
        }, clientRecord, contactId, null);

        try {
            const createdCredit = await lexofficeRequest(apiKey, '/vouchers', {
                method: 'POST',
                body: creditPayload
            });
            creditVoucherId = createdCredit?.id || null;
            if (creditVoucherId && invoiceData.id) {
                await uploadOrgaPdfToLexOfficeVoucher(apiKey, invoiceData, creditVoucherId);
            }
        } catch (err) {
            console.warn('[LexOffice Storno] Hinweis:', err.message);
        }
    }

    const accountingList = await pb.collection('accounting').getFullList({ requestKey: null }).catch(() => []);
    await syncInvoiceToOrgaAccounting(pb, { ...invoiceData, status: 'Storniert', is_cancellation: true }, clientRecord, accountingList);

    await writeLexOfficeAuditLog(pb, {
        userName: actor.userName || 'System',
        userRole: actor.userRole || 'admin',
        action: mode === 'delete' ? 'LEXOFFICE_INVOICE_DELETED' : 'LEXOFFICE_INVOICE_STORNO',
        details: `Rechnung ${rawNr || invoiceData.id} (${mode}) verarbeitet${creditVoucherId ? ` (Gegenbeleg ${creditVoucherId})` : ''}.`
    });

    return { handled: true, creditVoucherId };
}
