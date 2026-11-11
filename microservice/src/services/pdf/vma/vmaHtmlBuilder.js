/**
 * vmaHtmlBuilder.js
 * Builds clean, landscape DIN A4 HTML/CSS for VMA travel expense reports.
 */
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

export function buildVmaHtml(data) {
    const {
        userName = 'Mitarbeiter',
        userAddress = '',
        company = null,
        period = '',
        createdDate = new Date().toLocaleDateString('de-DE'),
        reports = [],
        totals = {},
        totalSum = '0,00 €'
    } = data;

    const companyName = company?.name || 'Seniorenassistenz';
    const finalGrandTotal = totals?.grandTotal 
        ? `${totals.grandTotal.toFixed(2).replace('.', ',')} €` 
        : totalSum;

    return `<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <title>Reisekostenabrechnung - ${escapeHtml(userName)}</title>
    <style>
        @page {
            size: A4 landscape;
            margin: 12mm 14mm 12mm 14mm;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            font-size: 8.5pt;
            color: #0f172a;
            background: #ffffff;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #4338ca;
            padding-bottom: 3mm;
            margin-bottom: 4mm;
        }
        .title { font-size: 14pt; font-weight: 800; color: #312e81; }
        .subtitle { font-size: 8pt; color: #64748b; margin-top: 1mm; }
        .meta-box { text-align: right; font-size: 8pt; color: #334155; line-height: 1.4; }
        .meta-box strong { color: #0f172a; }

        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 8pt;
            margin-bottom: 5mm;
            page-break-inside: auto;
        }
        thead { display: table-header-group; }
        tr { page-break-inside: avoid; }
        th {
            background-color: #f1f5f9;
            color: #1e293b;
            font-weight: 700;
            padding: 2mm 2.5mm;
            border-bottom: 1.5px solid #cbd5e1;
            text-align: left;
        }
        td {
            padding: 2mm 2.5mm;
            border-bottom: 0.5px solid #e2e8f0;
            vertical-align: top;
        }
        tr:nth-child(even) td { background-color: #f8fafc; }
        .text-right { text-align: right; }
        .font-bold { font-weight: 700; }
        .text-muted { font-size: 6.5pt; color: #64748b; display: block; }
        .text-emerald { color: #047857; }
        .text-indigo { color: #4338ca; font-weight: 700; }

        .summary-wrapper {
            display: flex;
            gap: 4mm;
            page-break-inside: avoid;
            margin-top: 2mm;
        }
        .summary-card {
            flex: 3;
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 4px;
            padding: 3mm 4mm;
        }
        .summary-card h4 {
            font-size: 8pt;
            font-weight: 800;
            color: #0f172a;
            margin-bottom: 2mm;
            text-transform: uppercase;
        }
        .pillars-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 2mm;
            font-size: 7.5pt;
            color: #334155;
        }
        .payout-card {
            flex: 2;
            background: #eef2ff;
            border: 1.5px solid #818cf8;
            border-radius: 4px;
            padding: 3mm 4mm;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
        }
        .payout-label { font-size: 8pt; font-weight: 700; color: #3730a3; text-transform: uppercase; }
        .payout-amount { font-size: 14pt; font-weight: 800; color: #4338ca; margin-top: 1mm; }

        .signatures {
            margin-top: 6mm;
            display: flex;
            justify-content: space-between;
            font-size: 7.5pt;
            color: #475569;
            page-break-inside: avoid;
        }
        .signature-line {
            width: 45%;
            border-top: 1px solid #94a3b8;
            padding-top: 1.5mm;
        }
    </style>
</head>
<body>

    <header class="header">
        <div>
            <div class="title">REISEKOSTEN- &amp; VMA-ABRECHNUNG</div>
            <div class="subtitle">${escapeHtml(companyName)} • Abrechnungszeitraum: <strong>${escapeHtml(period)}</strong></div>
        </div>
        <div class="meta-box">
            <div>Mitarbeiter: <strong>${escapeHtml(userName)}</strong></div>
            ${userAddress ? `<div>${escapeHtml(userAddress)}</div>` : ''}
            <div>Erstellt am: ${escapeHtml(createdDate)}</div>
        </div>
    </header>

    <table>
        <thead>
            <tr>
                <th style="width: 8%;">Datum</th>
                <th style="width: 11%;">Reisezeit</th>
                <th style="width: 28%;">Reisezweck &amp; Reiseroute</th>
                <th style="width: 7%;" class="text-right">Abwes.</th>
                <th style="width: 11%;" class="text-right">1. Fahrtkosten</th>
                <th style="width: 11%;" class="text-right">2. VMA Netto</th>
                <th style="width: 8%;" class="text-right">3. Übernacht.</th>
                <th style="width: 8%;" class="text-right">4. Nebenkost.</th>
                <th style="width: 8%;" class="text-right">Tagessumme</th>
            </tr>
        </thead>
        <tbody>
            ${reports.map(r => `
                <tr>
                    <td>
                        <span class="font-bold">${escapeHtml(r.date || '')}</span>
                        ${r.weekday ? `<span class="text-muted">${escapeHtml(r.weekday)}</span>` : ''}
                    </td>
                    <td>
                        <span>${escapeHtml(r.timesFormatted || r.times || 'Ganztägig')}</span>
                        <span class="text-muted">Abfahrt -> Rückk.</span>
                    </td>
                    <td>
                        <span class="font-bold">${escapeHtml(r.purpose || 'Dienstgang')}</span>
                        <span class="text-muted" style="font-style: italic;">${escapeHtml(r.route || r.destination || 'Einsatzort')}</span>
                    </td>
                    <td class="text-right font-bold">
                        ${escapeHtml(r.absenceFormatted || r.absence || '-')}
                        ${r.distanceKm ? `<span class="text-muted">${r.distanceKm} km</span>` : ''}
                    </td>
                    <td class="text-right font-bold">
                        ${escapeHtml(r.travelCostsFormatted || (r.mileageCosts ? `${(r.mileageCosts + (r.ticketCosts || 0)).toFixed(2).replace('.', ',')} €` : '-'))}
                        ${r.travelDetails ? `<span class="text-muted">${escapeHtml(r.travelDetails)}</span>` : ''}
                    </td>
                    <td class="text-right font-bold ${r.netPerDiem > 0 ? 'text-emerald' : ''}">
                        ${escapeHtml(r.vmaFormatted || r.perDiem || '0,00 €')}
                        ${r.deductionText ? `<span class="text-muted" style="color: #b91c1c;">${escapeHtml(r.deductionText)}</span>` : ''}
                    </td>
                    <td class="text-right">${escapeHtml(r.accommodationFormatted || r.accommodation || '0,00 €')}</td>
                    <td class="text-right">${escapeHtml(r.incidentalFormatted || '0,00 €')}</td>
                    <td class="text-right text-indigo">${escapeHtml(r.dayTotalFormatted || r.total || '0,00 €')}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>

    <div class="summary-wrapper">
        <div class="summary-card">
            <h4>Aufschlüsselung nach den 4 Säulen der Reisekosten</h4>
            <div class="pillars-grid">
                <div>1. Fahrtkosten: <strong>${totals?.totalTravelCosts ? totals.totalTravelCosts.toFixed(2).replace('.', ',') + ' €' : '-'}</strong></div>
                <div>2. VMA Verpflegungsmehraufwand: <strong>${totals?.totalNetVma ? totals.totalNetVma.toFixed(2).replace('.', ',') + ' €' : '-'}</strong></div>
                <div>3. Übernachtungskosten: <strong>${totals?.totalAccommodation ? totals.totalAccommodation.toFixed(2).replace('.', ',') + ' €' : '0,00 €'}</strong></div>
                <div>4. Reisenebenkosten: <strong>${totals?.totalIncidentals ? totals.totalIncidentals.toFixed(2).replace('.', ',') + ' €' : '0,00 €'}</strong></div>
            </div>
        </div>
        <div class="payout-card">
            <div class="payout-label">Auszahlungsbetrag Gesamt</div>
            <div class="payout-amount">${finalGrandTotal}</div>
        </div>
    </div>

    <div class="signatures">
        <div class="signature-line">Datum, Unterschrift Mitarbeiter (${escapeHtml(userName)})</div>
        <div class="signature-line">Datum, Sachliche Richtigkeit &amp; Genehmigung (Arbeitgeber)</div>
    </div>

</body>
</html>`;
}
