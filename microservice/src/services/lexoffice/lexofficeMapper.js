export function toIsoDate(value, fallback = '') {
    if (!value) return fallback;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? fallback : parsed.toISOString();
}

export function normalizeInvoiceNr(nr) {
    const clean = String(nr || '').trim().toLowerCase();
    if (!clean) return '';
    return clean.replace(/^0+(\d+\/)/, '$1');
}

export function mapLexOfficeStatusToOrgaFlow(voucherStatus, voucherItem = null) {
    const raw = String(voucherStatus || '').toLowerCase();
    if (raw === 'voided') return 'Storniert';
    if (raw === 'paid' || raw === 'paidoff') return 'Abgeschlossen';
    if (raw === 'draft') return 'Entwurf';

    const total = Number(
        voucherItem?.totalAmount ??
        voucherItem?.totalGrossAmount ??
        voucherItem?.totalPrice?.totalGrossAmount ?? 0
    );
    const open = Number(voucherItem?.openAmount ?? total);
    if (total > 0 && open > 0 && open < total) {
        return 'Teilweise bezahlt';
    }
    return 'Eingereicht';
}

function buildTablePositions(lineItems, existingPositions, issueDateShort, netto, fallbackTitle) {
    if (lineItems.length > 0) {
        return lineItems.filter((i) => i.type !== 'text').map((item, idx) => {
            const qty = Number(item.quantity ?? 1);
            const unit = item.unitName || 'Std.';
            const uPrice = Number(item.unitPrice?.netAmount ?? item.unitPrice?.grossAmount ?? 0);
            const title = [item.name, item.description].filter(Boolean).join(' – ') || 'Leistungsposition';
            return {
                pos: idx + 1, date: issueDateShort, title, description: title,
                duration: `${qty} ${unit}`.trim(), quantity: qty, unit,
                price: uPrice, unitPrice: uPrice,
                total: Number(item.lineItemAmount ?? Number((qty * uPrice).toFixed(2)))
            };
        });
    }
    if (existingPositions.length > 0) return existingPositions;
    return [{
        pos: 1, date: issueDateShort, title: fallbackTitle, description: fallbackTitle,
        duration: '1 Pauschal', quantity: 1, unit: 'Pauschal',
        price: Number(netto.toFixed(2)), unitPrice: Number(netto.toFixed(2)), total: Number(netto.toFixed(2))
    }];
}

export function mapLexOfficeInvoiceToOrgaFlow(lexDetail, voucherSummary, companyId, matchedClient = null, existingOrgaInvoice = null) {
    const voucherStatus = lexDetail?.voucherStatus || voucherSummary?.voucherStatus || 'open';
    let orgaStatus = mapLexOfficeStatusToOrgaFlow(voucherStatus, voucherSummary || lexDetail);

    // Schutz vor Status-Downgrade: Bereits in OrgaFlow als bezahlt markierte Rechnungen nicht auf offen zurücksetzen
    if (existingOrgaInvoice?.status === 'Abgeschlossen' && orgaStatus !== 'Storniert') {
        orgaStatus = 'Abgeschlossen';
    }

    const vType = String(voucherSummary?.voucherType || lexDetail?.type || '').toLowerCase();
    const isCreditNote = vType === 'creditnote' || vType === 'salescreditnote' || Boolean(lexDetail?.precedingSalesVoucherId);
    const hasTotalPrice = lexDetail?.totalPrice != null;

    const brutto = Number(
        hasTotalPrice
            ? (lexDetail.totalPrice.totalGrossAmount ?? lexDetail.totalPrice.totalNetAmount ?? 0)
            : (lexDetail?.totalGrossAmount ?? voucherSummary?.totalAmount ?? existingOrgaInvoice?.brutto ?? 0)
    );
    const taxSum = Number(hasTotalPrice ? (lexDetail.totalPrice.totalTaxAmount ?? 0) : (lexDetail?.totalTaxAmount ?? existingOrgaInvoice?.tax_sum ?? 0));
    const netto = Number(hasTotalPrice ? (lexDetail.totalPrice.totalNetAmount ?? Math.max(0, brutto - taxSum)) : Math.max(0, Number((brutto - taxSum).toFixed(2))));

    const firstTaxRate = lexDetail?.lineItems?.[0]?.unitPrice?.taxRatePercentage ?? lexDetail?.voucherItems?.[0]?.taxRatePercent ?? existingOrgaInvoice?.tax_rate ?? 19;
    let taxRateStr = [0, 7, 9].includes(Number(firstTaxRate)) ? String(firstTaxRate) : '19';

    const issueDateIso = toIsoDate(lexDetail?.voucherDate || voucherSummary?.voucherDate || existingOrgaInvoice?.issue_date, new Date().toISOString());
    let dueDateIso = toIsoDate(lexDetail?.dueDate || voucherSummary?.dueDate || existingOrgaInvoice?.due_date, '');
    if (!dueDateIso && lexDetail?.paymentConditions?.paymentTermDuration && issueDateIso) {
        const d = new Date(issueDateIso);
        d.setDate(d.getDate() + Number(lexDetail.paymentConditions.paymentTermDuration || 14));
        dueDateIso = d.toISOString();
    }

    const issueDateShort = new Date(issueDateIso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const existingPositions = Array.isArray(existingOrgaInvoice?.table_positions) ? existingOrgaInvoice.table_positions : [];
    const lineItems = Array.isArray(lexDetail?.lineItems) ? lexDetail.lineItems : [];
    const fallbackTitle = lexDetail?.remark || `Beleg ${lexDetail?.voucherNumber || voucherSummary?.voucherNumber || ''}`.trim() || 'Abrechnungsposition (LexOffice)';

    const tablePositions = buildTablePositions(lineItems, existingPositions, issueDateShort, netto, fallbackTitle);

    const openAmount = Number(voucherSummary?.openAmount ?? (orgaStatus === 'Abgeschlossen' ? 0 : brutto));
    const paidAmount = orgaStatus === 'Abgeschlossen' ? Number(brutto.toFixed(2)) : Number(Math.max(0, brutto - openAmount).toFixed(2));
    const remainingAmount = (orgaStatus === 'Abgeschlossen' || isCreditNote || orgaStatus === 'Storniert') ? 0 : Number(Math.max(0, openAmount).toFixed(2));

    const payload = {
        invoice_nr: existingOrgaInvoice?.invoice_nr || lexDetail?.voucherNumber || voucherSummary?.voucherNumber || `LEX-${String(lexDetail?.id || '').slice(0, 6)}`,
        status: isCreditNote ? 'Storniert' : orgaStatus,
        issue_date: issueDateIso,
        due_date: dueDateIso || issueDateIso,
        tax_rate: taxRateStr,
        netto: Number(netto.toFixed(2)),
        tax_sum: Number(taxSum.toFixed(2)),
        brutto: Number(brutto.toFixed(2)),
        paid_amount: paidAmount,
        remaining_amount: remainingAmount,
        table_positions: tablePositions,
        company: companyId,
        is_cancellation: Boolean(existingOrgaInvoice?.is_cancellation || isCreditNote || orgaStatus === 'Storniert'),
        lexoffice_id: lexDetail?.id || voucherSummary?.id,
        lexoffice_voucher_status: voucherStatus,
        lexoffice_synced_at: new Date().toISOString()
    };

    const clientId = matchedClient?.id || (Array.isArray(existingOrgaInvoice?.client) ? existingOrgaInvoice.client[0] : existingOrgaInvoice?.client);
    if (clientId) {
        payload.client = clientId;
    } else {
        const recipientName = lexDetail?.address?.name || voucherSummary?.contactName || '';
        if (recipientName && !existingOrgaInvoice?.notes) payload.notes = `LexOffice-Empfänger: ${recipientName}`;
    }

    // Reales Bank-Zahlungsdatum aus LexOffice ermitteln (paidDate oder paymentItems)
    const lexPaymentDate =
        lexDetail?.paidDate ||
        voucherSummary?.paidDate ||
        (Array.isArray(lexDetail?.paymentItems) && lexDetail.paymentItems[0]?.paymentDate) ||
        existingOrgaInvoice?.paid_at ||
        voucherSummary?.updatedDate ||
        lexDetail?.updatedDate;

    if (orgaStatus === 'Abgeschlossen') {
        payload.paid_at = toIsoDate(lexPaymentDate, new Date().toISOString());
        payload.paid_amount = Number(brutto.toFixed(2));
        payload.remaining_amount = 0;
    } else if (orgaStatus === 'Teilweise bezahlt' && lexPaymentDate) {
        payload.paid_at = toIsoDate(lexPaymentDate, existingOrgaInvoice?.paid_at || '');
    }

    return payload;
}

export function mapOrgaFlowToLexOfficeVoucher(orgaInvoice, clientRecord = null, contactId = null, existingLexVoucher = null) {
    const rawTax = Number(orgaInvoice.tax_rate || 19);
    const taxRateNum = rawTax === 7 ? 7 : (rawTax === 0 ? 0 : 19);
    const grossRounded = Number(Math.max(0.01, Math.abs(Number(orgaInvoice.brutto || orgaInvoice.netto || 0))).toFixed(2));
    const netRounded = taxRateNum > 0 ? Number((grossRounded / (1 + taxRateNum / 100)).toFixed(2)) : grossRounded;
    const taxRounded = taxRateNum > 0 ? Number((grossRounded - netRounded).toFixed(2)) : 0;

    const voucherDateIso = toIsoDate(orgaInvoice.issue_date || orgaInvoice.created, new Date().toISOString());
    const dueDateIso = toIsoDate(orgaInvoice.due_date || voucherDateIso, voucherDateIso);
    const clientName = clientRecord ? `${clientRecord.name_first || ''} ${clientRecord.name_last || ''}`.trim() : '';

    const isCredit = Boolean(orgaInvoice.is_cancellation || orgaInvoice.status === 'Storniert' || Number(orgaInvoice.brutto) < 0);
    const categoryId = isCredit
        ? '8f8664a3-fd86-11e1-a21f-0800200c9a66' // Erlösminderungen / Gutschrift
        : '8f8664a1-fd86-11e1-a21f-0800200c9a66'; // Einnahmen

    const remarkParts = [`OrgaFlow Rechnung ${orgaInvoice.invoice_nr || ''}`.trim(), clientName, orgaInvoice.notes || ''].filter(Boolean);

    const payload = {
        type: isCredit ? 'salescreditnote' : 'salesinvoice',
        voucherNumber: String(orgaInvoice.invoice_nr || `OF-${orgaInvoice.id?.slice(0, 6)}`).trim(),
        voucherDate: voucherDateIso,
        shippingDate: voucherDateIso,
        dueDate: dueDateIso,
        totalGrossAmount: grossRounded,
        totalTaxAmount: taxRounded,
        taxType: 'gross',
        useCollectiveContact: !contactId,
        ...(contactId ? { contactId } : {}),
        remark: remarkParts.join(' – ').slice(0, 250),
        voucherItems: [{
            amount: grossRounded,
            taxAmount: taxRounded,
            taxRatePercent: taxRateNum,
            categoryId
        }]
    };

    if (existingLexVoucher?.id && existingLexVoucher?.version != null) {
        payload.id = existingLexVoucher.id;
        payload.version = existingLexVoucher.version;
    }

    return payload;
}
