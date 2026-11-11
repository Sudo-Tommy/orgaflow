import { decryptApiKey } from './lexofficeCrypto.js';
import { lexofficeRequest, fetchLexOfficeProfile, downloadLexOfficeInvoicePdf, extractLexOfficeFileId } from './lexofficeHttpClient.js';
import {
    fetchAllLexOfficeContacts, ensureOrgaFlowClientFromLexOffice,
    ensureLexOfficeContactForClient, isVendorContactName, isNonCareCorporateName
} from './lexofficeContactService.js';
import { normalizeInvoiceNr, mapLexOfficeInvoiceToOrgaFlow, mapOrgaFlowToLexOfficeVoucher } from './lexofficeMapper.js';
import {
    fetchLexOfficePostingCategoriesMap, syncInvoiceToOrgaAccounting,
    syncLexOfficePurchaseVoucherToOrgaFlow, computeLiveFinanceSummary
} from './lexofficeAccountingService.js';
import { uploadOrgaPdfToLexOfficeVoucher } from './lexofficeLifecycleService.js';
import { ensureLexOfficeSchema, writeLexOfficeAuditLog } from './lexofficeSchemaService.js';

function belongsStrictlyToCompany(record, companyId) {
    if (!record?.company || !companyId) return false;
    return Array.isArray(record.company) ? record.company.includes(companyId) : String(record.company) === String(companyId);
}

function normalizePersonKey(raw) {
    return String(raw || '').toLowerCase().replace(/[,.;:-]/g, ' ').replace(/\s+/g, ' ').trim();
}

async function fetchVoucherList(apiKey, minDateIso = null) {
    const allVouchers = [];
    for (let page = 0; page < 15; page++) {
        const query = `/voucherlist?voucherType=salesinvoice,salescreditnote,invoice,creditnote,purchaseinvoice,purchasecreditnote&voucherStatus=draft,open,paid,paidoff,voided,transferred,sepadebit&page=${page}&size=100`;
        const res = await lexofficeRequest(apiKey, query);
        const content = Array.isArray(res?.content) ? res.content : [];
        for (const v of content) {
            if (minDateIso && v.voucherDate && new Date(v.voucherDate) < new Date(minDateIso)) continue;
            allVouchers.push(v);
        }
        if (res?.last !== false || content.length < 100) break;
    }
    return allVouchers;
}

async function attachPdfFromLexOffice(apiKey, voucherId, voucherType, invoiceNr, existingDocFileId = null) {
    try {
        const pdfBuffer = await downloadLexOfficeInvoicePdf(apiKey, voucherId, voucherType, existingDocFileId);
        if (!pdfBuffer?.length) return null;
        return new File([pdfBuffer], `RE_${String(invoiceNr || voucherId).replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`, { type: 'application/pdf' });
    } catch { return null; }
}

function getDetailEndpoint(voucher) {
    const t = String(voucher.voucherType || '').toLowerCase();
    if (t === 'creditnote') return `/credit-notes/${encodeURIComponent(voucher.id)}`;
    if (t === 'invoice') return `/invoices/${encodeURIComponent(voucher.id)}`;
    return `/vouchers/${encodeURIComponent(voucher.id)}`;
}

export async function syncCompanyWithLexOffice(pb, companyId, options = {}) {
    if (!companyId || companyId === 'all') throw new Error('Bitte wählen Sie eine spezifische Firma für den LexOffice-Abgleich aus.');
    await ensureLexOfficeSchema(pb);

    const config = await pb.collection('lexoffice_configs').getFirstListItem(`company = "${companyId}"`, { requestKey: null }).catch(() => null);
    if (!config || config.status === 'disconnected') throw new Error('Für diesen Standort ist noch keine aktive LexOffice-Verbindung eingerichtet.');

    const stats = { created: 0, updated: 0, pushed: 0, expensesSynced: 0, pdfsSynced: 0, skipped: 0, paidCount: 0 };
    const minDateIso = options.includeAllYears ? null : `${new Date().getFullYear() - 1}-01-01T00:00:00.000Z`;

    try {
        const apiKey = decryptApiKey(config);
        const [allClientsGlobal, allInvoicesGlobal, existingExpenses, existingAccounting, lexContactsList, categoriesMap] = await Promise.all([
            pb.collection('clients').getFullList({ requestKey: null }),
            pb.collection('invoices').getFullList({ requestKey: null }),
            pb.collection('company_expenses').getFullList({ filter: `company ~ "${companyId}"`, requestKey: null }).catch(() => []),
            pb.collection('accounting').getFullList({ requestKey: null }).catch(() => []),
            fetchAllLexOfficeContacts(apiKey),
            fetchLexOfficePostingCategoriesMap(apiKey)
        ]);

        const clientsList = allClientsGlobal.filter((c) => belongsStrictlyToCompany(c, companyId));
        const existingInvoices = allInvoicesGlobal.filter((inv) => belongsStrictlyToCompany(inv, companyId));
        const otherInvoices = allInvoicesGlobal.filter((inv) => !belongsStrictlyToCompany(inv, companyId));
        const otherCompanyNormNrs = new Set(otherInvoices.map((i) => normalizeInvoiceNr(i.invoice_nr)).filter(Boolean));
        const otherCompanyLexIds = new Set(otherInvoices.map((i) => i.lexoffice_id).filter(Boolean));

        const ownClientNames = new Set();
        for (const c of clientsList) {
            ownClientNames.add(normalizePersonKey(`${c.name_first || ''} ${c.name_last || ''}`));
            ownClientNames.add(normalizePersonKey(`${c.name_last || ''} ${c.name_first || ''}`));
        }
        const otherCompanyClientNames = new Set();
        for (const c of allClientsGlobal.filter((cl) => !belongsStrictlyToCompany(cl, companyId))) {
            const k1 = normalizePersonKey(`${c.name_first || ''} ${c.name_last || ''}`);
            const k2 = normalizePersonKey(`${c.name_last || ''} ${c.name_first || ''}`);
            if (k1 && !ownClientNames.has(k1)) otherCompanyClientNames.add(k1);
            if (k2 && !ownClientNames.has(k2)) otherCompanyClientNames.add(k2);
        }

        const clientsMap = new Map(clientsList.map((c) => [c.id, c]));
        const lexContactsMap = new Map(lexContactsList.map((c) => [c.id, c]));
        const byLexId = new Map();
        const byNormInvNr = new Map();

        for (const inv of existingInvoices) {
            if (inv.lexoffice_id) byLexId.set(inv.lexoffice_id, inv);
            const norm = normalizeInvoiceNr(inv.invoice_nr);
            if (norm) byNormInvNr.set(norm, inv);
        }

        const vouchers = await fetchVoucherList(apiKey, minDateIso);
        const seenLexIds = new Set(vouchers.map((v) => v.id));
        const salesVouchers = vouchers.filter((v) => ['salesinvoice', 'salescreditnote', 'invoice', 'creditnote'].includes(String(v.voucherType).toLowerCase()));
        const purchaseVouchers = vouchers.filter((v) => ['purchaseinvoice', 'purchasecreditnote'].includes(String(v.voucherType).toLowerCase()));

        for (const voucher of salesVouchers) {
            const rawVoucherNr = String(voucher.voucherNumber || '').trim();
            if (rawVoucherNr.toUpperCase().startsWith('STORNO')) { stats.skipped++; continue; }

            const normNr = normalizeInvoiceNr(rawVoucherNr);
            const baseNormNr = normalizeInvoiceNr(rawVoucherNr.replace(/^(STORNO[-\s]*)+/i, ''));
            if (otherCompanyLexIds.has(voucher.id) || (baseNormNr && otherCompanyNormNrs.has(baseNormNr) && !byNormInvNr.has(baseNormNr))) {
                stats.skipped++; continue;
            }

            const existing = byLexId.get(voucher.id) || (normNr ? byNormInvNr.get(normNr) : null);
            const contactKey = normalizePersonKey(voucher.contactName);
            if (!existing && contactKey && otherCompanyClientNames.has(contactKey)) { stats.skipped++; continue; }

            const contactObj = voucher.contactId ? lexContactsMap.get(voucher.contactId) : null;
            if (!existing && ((contactObj?.roles?.vendor && !contactObj?.roles?.customer) || isVendorContactName(voucher.contactName))) {
                if (voucher.voucherStatus !== 'voided') purchaseVouchers.push(voucher);
                continue;
            }
            if (!existing && isNonCareCorporateName(voucher.contactName)) { stats.skipped++; continue; }

            const lexUpdatedMs = voucher.updatedDate ? new Date(voucher.updatedDate).getTime() : Date.now();
            const orgaUpdatedMs = existing?.updated ? new Date(existing.updated).getTime() : 0;
            const statusChanged = existing && existing.lexoffice_voucher_status !== voucher.voucherStatus;

            if (existing?.lexoffice_id && lexUpdatedMs <= orgaUpdatedMs && !statusChanged) {
                await syncInvoiceToOrgaAccounting(pb, existing, clientsMap.get(Array.isArray(existing.client) ? existing.client[0] : existing.client), existingAccounting);
                stats.skipped++; continue;
            }

            const lexDetail = await lexofficeRequest(apiKey, getDetailEndpoint(voucher)).catch(() => null);
            if (!lexDetail) continue;

            const matchedClient = await ensureOrgaFlowClientFromLexOffice(pb, apiKey, clientsList, lexDetail, voucher, companyId, lexContactsMap);
            if (matchedClient) clientsMap.set(matchedClient.id, matchedClient);
            if (!existing && !matchedClient) { stats.skipped++; continue; }

            const mappedPayload = mapLexOfficeInvoiceToOrgaFlow(lexDetail, voucher, companyId, matchedClient, existing);
            const hasOrgaPdf = existing && (Array.isArray(existing.pdf) ? existing.pdf.length > 0 : Boolean(existing.pdf));
            const lexFileId = extractLexOfficeFileId(lexDetail);

            if (!hasOrgaPdf && voucher.voucherStatus !== 'draft') {
                const pdfFile = await attachPdfFromLexOffice(apiKey, voucher.id, voucher.voucherType, mappedPayload.invoice_nr, lexFileId);
                if (pdfFile) { mappedPayload.pdf = pdfFile; stats.pdfsSynced++; }
            } else if (hasOrgaPdf && !lexFileId && (voucher.voucherType === 'salesinvoice' || voucher.voucherType === 'salescreditnote')) {
                if (await uploadOrgaPdfToLexOfficeVoucher(apiKey, existing, voucher.id)) stats.pdfsSynced++;
            }

            if (existing && mappedPayload.status === 'Storniert' && Array.isArray(existing.appointments) && existing.appointments.length > 0) {
                mappedPayload.appointments = [];
            }
            if ((!existing || existing.status !== 'Abgeschlossen') && mappedPayload.status === 'Abgeschlossen') stats.paidCount++;

            const savedRec = existing
                ? await pb.collection('invoices').update(existing.id, mappedPayload, { requestKey: null })
                : await pb.collection('invoices').create(mappedPayload, { requestKey: null });

            if (existing) { Object.assign(existing, savedRec); stats.updated++; }
            else { existingInvoices.push(savedRec); stats.created++; }

            byLexId.set(voucher.id, savedRec);
            if (normNr) byNormInvNr.set(normNr, savedRec);
            await syncInvoiceToOrgaAccounting(pb, savedRec, matchedClient, existingAccounting);
        }

        for (const inv of [...existingInvoices]) {
            if (!inv.lexoffice_id || seenLexIds.has(inv.lexoffice_id)) continue;
            if (minDateIso && inv.issue_date && new Date(inv.issue_date) < new Date(minDateIso)) continue;
            if (inv.status === 'Entwurf') await pb.collection('invoices').delete(inv.id, { requestKey: null }).catch(() => {});
            else inv.lexoffice_id = '';
        }

        for (const inv of existingInvoices) {
            if (!belongsStrictlyToCompany(inv, companyId) || inv.lexoffice_id || inv.status === 'Abgelehnt' || inv.invoice_nr === 'Zeitnachweis') continue;
            if (minDateIso && inv.issue_date && new Date(inv.issue_date) < new Date(minDateIso)) continue;
            try {
                const clientId = Array.isArray(inv.client) ? inv.client[0] : inv.client;
                const clientRecord = clientId ? clientsMap.get(clientId) : null;
                if (clientRecord && !belongsStrictlyToCompany(clientRecord, companyId)) continue;
                const contactId = clientRecord ? await ensureLexOfficeContactForClient(pb, apiKey, clientRecord, lexContactsList) : null;
                const created = await lexofficeRequest(apiKey, '/vouchers', { method: 'POST', body: mapOrgaFlowToLexOfficeVoucher(inv, clientRecord, contactId) });
                if (created?.id) {
                    if (await uploadOrgaPdfToLexOfficeVoucher(apiKey, inv, created.id)) stats.pdfsSynced++;
                    await pb.collection('invoices').update(inv.id, {
                        lexoffice_id: created.id, lexoffice_voucher_status: 'open', lexoffice_synced_at: new Date().toISOString()
                    }, { requestKey: null });
                    inv.lexoffice_id = created.id;
                    stats.pushed++;
                }
                await syncInvoiceToOrgaAccounting(pb, inv, clientRecord, existingAccounting);
            } catch (pushErr) {
                console.warn(`[LexOffice Push] Rechnung ${inv.invoice_nr}:`, pushErr.message);
            }
        }

        for (const pv of purchaseVouchers) {
            const existingExp = existingExpenses.find((e) => e.lexoffice_id === pv.id);
            const pvStatus = String(pv.voucherStatus || '').toLowerCase();
            if (existingExp && (existingExp.lexoffice_status === pvStatus || (['paid', 'paidoff', 'unchecked'].includes(existingExp.lexoffice_status) && ['paid', 'paidoff'].includes(pvStatus)))) continue;
            const lexDetail = await lexofficeRequest(apiKey, `/vouchers/${encodeURIComponent(pv.id)}`).catch(() => null);
            if (lexDetail && await syncLexOfficePurchaseVoucherToOrgaFlow(pb, apiKey, pv, lexDetail, companyId, categoriesMap, existingExpenses, existingAccounting)) {
                stats.expensesSynced++;
            }
        }

        const nowIso = new Date().toISOString();
        const financeSummary = await computeLiveFinanceSummary(pb, companyId);
        await pb.collection('lexoffice_configs').update(config.id, {
            status: 'connected', last_error: '', last_sync: nowIso, last_sync_stats: { ...stats, financeSummary }
        }, { requestKey: null });

        const paidNotice = stats.paidCount > 0 ? `${stats.paidCount} als bezahlt markiert, ` : '';
        await writeLexOfficeAuditLog(pb, {
            userName: options.userName || 'System-Sync', userRole: options.userRole || 'admin', action: 'LEXOFFICE_SYNC_SUCCESS',
            details: `Standort ${config.lexoffice_company_name || companyId}: ${paidNotice}${stats.updated} aktualisiert, ${stats.created} importiert, ${stats.pushed} zu LexOffice übertragen.`
        });

        return {
            success: true, companyId, lexofficeCompanyName: config.lexoffice_company_name, lastSync: nowIso, stats, financeSummary,
            message: `${paidNotice}${stats.updated} aktualisiert, ${stats.created} neu importiert, ${stats.pushed} zu LexOffice übertragen${stats.expensesSynced > 0 ? `, ${stats.expensesSynced} Ausgaben abgeglichen` : ''}.`
        };
    } catch (err) {
        let isKeyInvalid = false;
        if (err.status === 401 || err.needsReconnect) {
            try { await fetchLexOfficeProfile(decryptApiKey(config)); }
            catch (profErr) { if (profErr.status === 401) isKeyInvalid = true; }
        }
        await pb.collection('lexoffice_configs').update(config.id, {
            status: isKeyInvalid ? 'error' : 'connected', last_error: isKeyInvalid ? (err.message || 'Zugangsschlüssel abgelaufen') : ''
        }, { requestKey: null }).catch(() => {});
        throw err;
    }
}
