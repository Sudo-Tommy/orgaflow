import { lexofficeRequest, downloadLexOfficeInvoicePdf, extractLexOfficeFileId } from './lexofficeHttpClient.js';
import { toIsoDate } from './lexofficeMapper.js';

export async function fetchLexOfficePostingCategoriesMap(apiKey) {
    const map = new Map();
    try {
        const list = await lexofficeRequest(apiKey, '/posting-categories');
        if (Array.isArray(list)) {
            for (const c of list) map.set(c.id, c);
        }
    } catch { }
    return map;
}

function mapLexCategoryToOrgaBwaCategory(catObj, titleOrRemark = '') {
    const text = `${catObj?.groupName || ''} ${catObj?.name || ''} ${titleOrRemark}`.toLowerCase();
    if (text.includes('miete') || text.includes('raum') || text.includes('büro') || text.includes('reinigung')) return 'Miete / Büro';
    if (text.includes('software') || text.includes('it') || text.includes('telekom') || text.includes('internet') || text.includes('telefon') || text.includes('hosting')) return 'Software / IT';
    if (text.includes('werb') || text.includes('marketing') || text.includes('reise') || text.includes('bewirtung') || text.includes('gaststätte') || text.includes('hotel')) return 'Marketing';
    if (text.includes('kfz') || text.includes('fahrzeug') || text.includes('tank') || text.includes('leasing') || text.includes('kia') || text.includes('auto')) return 'Fahrzeuge';
    if (text.includes('personal') || text.includes('lohn') || text.includes('gehalt')) return 'Personal';
    return 'Sonstiges';
}

export async function syncInvoiceToOrgaAccounting(pb, inv, matchedClient = null, existingAccountingList = []) {
    if (!inv?.id) return false;

    const existing = existingAccountingList.find((acc) =>
        (inv.lexoffice_id && acc.lexoffice_id === inv.lexoffice_id) ||
        String(acc.notes || '').includes(inv.id) ||
        (inv.invoice_nr && String(acc.title || '').includes(`Rechnung ${inv.invoice_nr}`))
    );

    if (inv.status === 'Storniert' || inv.is_cancellation) {
        if (existing && existing.status !== 'Storniert') {
            await pb.collection('accounting').update(existing.id, {
                status: 'Storniert',
                notes: `${existing.notes || ''} [Automatisch storniert über LexOffice/OrgaFlow]`.trim()
            }, { requestKey: null }).catch(() => { });
            existing.status = 'Storniert';
            return true;
        }
        return false;
    }

    if (inv.status !== 'Abgeschlossen' && inv.status !== 'Teilweise bezahlt') return false;

    const grossAmount = inv.status === 'Teilweise bezahlt' && Number(inv.paid_amount) > 0
        ? Number(inv.paid_amount)
        : Number(inv.brutto || 0);
    if (grossAmount <= 0) return false;

    const totalGross = Number(inv.brutto || grossAmount);
    const totalNet = Number(inv.netto || totalGross);
    const netAmount = Number((totalNet * (totalGross > 0 ? grossAmount / totalGross : 1)).toFixed(2));
    const rawTax = String(inv.tax_rate || '19');
    const taxRate = ['0', '7', '19'].includes(rawTax) ? rawTax : '19';
    const txDate = toIsoDate(inv.paid_at || inv.issue_date, new Date().toISOString());

    const clientName = matchedClient ? `${matchedClient.name_first || ''} ${matchedClient.name_last || ''}`.trim() : '';
    const prefix = inv.status === 'Teilweise bezahlt' ? 'Teilzahlung Rechnung' : 'Rechnung';
    const title = clientName ? `${prefix} ${inv.invoice_nr || ''} - ${clientName}`.trim() : `${prefix} ${inv.invoice_nr || ''}`.trim();

    const payload = {
        title,
        transaction_type: 'Einnahme',
        amount_gross: Number(grossAmount.toFixed(2)),
        amount_net: netAmount,
        tax_rate: taxRate,
        transaction_date: txDate,
        category: 'Kundenrechnung',
        payment_method: 'Banküberweisung',
        status: 'Bezahlt',
        lexoffice_id: inv.lexoffice_id || '',
        notes: `Automatisch abgeglichen aus Rechnung ${inv.invoice_nr || ''} (ID: ${inv.id})`
    };

    try {
        if (existing) {
            const updated = await pb.collection('accounting').update(existing.id, payload, { requestKey: null });
            Object.assign(existing, updated);
        } else {
            const created = await pb.collection('accounting').create(payload, { requestKey: null });
            existingAccountingList.push(created);
        }
        return true;
    } catch {
        return false;
    }
}

export async function syncLexOfficePurchaseVoucherToOrgaFlow(
    pb, apiKey, voucherSummary, lexDetail, companyId, categoriesMap, existingExpensesList, existingAccountingList
) {
    if (!lexDetail?.id) return false;
    const voucherStatus = String(voucherSummary?.voucherStatus || lexDetail.voucherStatus || '').toLowerCase();
    if (voucherStatus === 'voided') return false;

    const gross = Number(lexDetail.totalGrossAmount ?? voucherSummary?.totalAmount ?? 0);
    const taxSum = Number(lexDetail.totalTaxAmount ?? 0);
    const netto = Number(Math.max(0, gross - taxSum).toFixed(2));
    const taxRateNum = Number(lexDetail.voucherItems?.[0]?.taxRatePercent ?? 19);
    const dateIso = toIsoDate(lexDetail.voucherDate || voucherSummary?.voucherDate, new Date().toISOString());
    const supplier = voucherSummary?.contactName || 'Lieferant (LexOffice)';
    const voucherNr = lexDetail.voucherNumber || voucherSummary?.voucherNumber || '';

    const catObj = lexDetail.voucherItems?.[0]?.categoryId ? categoriesMap.get(lexDetail.voucherItems[0].categoryId) : null;
    const bwaCategory = mapLexCategoryToOrgaBwaCategory(catObj, `${supplier} ${lexDetail.remark || ''}`);
    const title = [supplier, catObj?.name || lexDetail.remark || voucherNr].filter(Boolean).join(' – ');

    const isGenericNr = !voucherNr || /^0+$/.test(voucherNr) || voucherNr === '1' || voucherNr.length < 3;
    const existingExp = existingExpensesList.find((e) =>
        e.lexoffice_id === lexDetail.id ||
        (!e.lexoffice_id && !isGenericNr && e.invoice_nr === voucherNr && (Array.isArray(e.company) ? e.company.includes(companyId) : e.company === companyId))
    );

    const expPayload = {
        title: title || `Ausgabe ${voucherNr || supplier}`,
        supplier,
        invoice_nr: voucherNr,
        amount: Number(gross.toFixed(2)),
        netto,
        tax_sum: Number(taxSum.toFixed(2)),
        tax_rate: taxRateNum,
        date: dateIso,
        category: bwaCategory,
        company: companyId,
        lexoffice_id: lexDetail.id,
        lexoffice_status: voucherStatus
    };

    const hasReceipt = existingExp && (Array.isArray(existingExp.receipt) ? existingExp.receipt.length > 0 : Boolean(existingExp.receipt));
    if (!hasReceipt) {
        const fileId = extractLexOfficeFileId(lexDetail);
        if (fileId) {
            try {
                const buf = await downloadLexOfficeInvoicePdf(apiKey, lexDetail.id, 'purchaseinvoice', fileId);
                if (buf && buf.length > 0) {
                    const safeName = `beleg_${String(voucherNr || lexDetail.id).replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
                    expPayload.receipt = new File([buf], safeName, { type: 'application/pdf' });
                }
            } catch { }
        }
    }

    try {
        if (existingExp) {
            Object.assign(existingExp, await pb.collection('company_expenses').update(existingExp.id, expPayload, { requestKey: null }));
        } else {
            existingExpensesList.push(await pb.collection('company_expenses').create(expPayload, { requestKey: null }));
        }
    } catch { }

    const existingAcc = existingAccountingList.find((a) => a.lexoffice_id === lexDetail.id);
    const accTaxRate = ['0', '7', '19'].includes(String(taxRateNum)) ? String(taxRateNum) : '19';
    const accPayload = {
        title: expPayload.title,
        transaction_type: 'Ausgabe',
        amount_gross: expPayload.amount,
        amount_net: netto,
        tax_rate: accTaxRate,
        transaction_date: dateIso,
        category: bwaCategory,
        payment_method: 'Banküberweisung',
        status: voucherStatus === 'paid' || voucherStatus === 'paidoff' ? 'Bezahlt' : 'Offen',
        lexoffice_id: lexDetail.id,
        notes: `LexOffice-Eingangsbeleg ${voucherNr} (${supplier})`.trim()
    };

    try {
        if (existingAcc) {
            Object.assign(existingAcc, await pb.collection('accounting').update(existingAcc.id, accPayload, { requestKey: null }));
        } else {
            existingAccountingList.push(await pb.collection('accounting').create(accPayload, { requestKey: null }));
        }
        return true;
    } catch {
        return false;
    }
}

export async function computeLiveFinanceSummary(pb, companyId = null) {
    try {
        const invFilter = companyId && companyId !== 'all' ? `company ~ "${companyId}"` : '';
        const expFilter = companyId && companyId !== 'all' ? `company = "${companyId}"` : '';
        const [invoices, expenses] = await Promise.all([
            pb.collection('invoices').getFullList({ filter: invFilter, requestKey: null }).catch(() => []),
            pb.collection('company_expenses').getFullList({ filter: expFilter, requestKey: null }).catch(() => [])
        ]);

        const now = new Date();
        const currentYear = now.getFullYear();
        const todayStartMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        let openTotal = 0, openCount = 0, overdueTotal = 0, overdueCount = 0, paidYearTotal = 0, paidCount = 0, expensesYearTotal = 0;

        for (const inv of invoices) {
            if (['Entwurf', 'Storniert', 'Abgelehnt'].includes(inv.status) || inv.is_cancellation) continue;
            const brutto = Number(inv.brutto || 0);
            if (inv.status === 'Abgeschlossen') {
                if (new Date(inv.paid_at || inv.issue_date || inv.created).getFullYear() === currentYear) {
                    paidYearTotal += brutto;
                    paidCount++;
                }
            } else {
                const rem = Number(inv.remaining_amount) > 0 ? Number(inv.remaining_amount) : brutto;
                openTotal += rem;
                openCount++;
                if (inv.due_date && new Date(inv.due_date).getTime() < todayStartMs) {
                    overdueTotal += rem;
                    overdueCount++;
                }
            }
        }
        for (const exp of expenses) {
            if (new Date(exp.date || exp.created).getFullYear() === currentYear) expensesYearTotal += Number(exp.amount || 0);
        }

        return {
            year: currentYear,
            openTotal: Number(openTotal.toFixed(2)), openCount,
            overdueTotal: Number(overdueTotal.toFixed(2)), overdueCount,
            paidYearTotal: Number(paidYearTotal.toFixed(2)), paidCount,
            expensesYearTotal: Number(expensesYearTotal.toFixed(2))
        };
    } catch {
        return null;
    }
}
