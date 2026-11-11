export function drawVmaRow(doc, report, cols, idx, currentY, leftMargin, rightMargin, contentWidth) {
    const purposeStr = report.purpose || 'Dienstgang / Kliententermin';
    const routeStr = report.route || report.destination || 'Einsatzort';
    const purposeHeight = doc.heightOfString(purposeStr, { width: cols.purposeRoute.w - 6 });
    const routeHeight = doc.heightOfString(routeStr, { width: cols.purposeRoute.w - 6 });
    const rowHeight = Math.max(purposeHeight + routeHeight + 4, 26);

    if (idx % 2 === 1) doc.rect(leftMargin, currentY, contentWidth, rowHeight).fill('#f8fafc');
    doc.moveTo(leftMargin, currentY + rowHeight).lineTo(rightMargin, currentY + rowHeight).strokeColor('#e2e8f0').lineWidth(0.5).stroke();

    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(8).text(report.date || '', cols.date.x + 3, currentY + 4, { width: cols.date.w - 6 });
    if (report.weekday) doc.font('Helvetica').fontSize(6.5).fillColor('#64748b').text(report.weekday, cols.date.x + 3, currentY + 14, { width: cols.date.w - 6 });

    const timesStr = report.timesFormatted || report.times || (report.departureTime && report.arrivalTime ? `${report.departureTime} - ${report.arrivalTime}` : 'Ganztägig');
    doc.fillColor('#334155').font('Helvetica').fontSize(7.5).text(timesStr, cols.times.x + 3, currentY + 4, { width: cols.times.w - 6 });
    doc.font('Helvetica').fontSize(6.5).fillColor('#64748b').text('Abfahrt -> Rückk.', cols.times.x + 3, currentY + 14, { width: cols.times.w - 6 });

    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(8).text(purposeStr, cols.purposeRoute.x + 3, currentY + 3, { width: cols.purposeRoute.w - 6 });
    doc.fillColor('#475569').font('Helvetica-Oblique').fontSize(7).text(routeStr, cols.purposeRoute.x + 3, currentY + 3 + purposeHeight, { width: cols.purposeRoute.w - 6 });

    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(8).text(report.absenceFormatted || report.absence || '-', cols.absence.x, currentY + 4, { width: cols.absence.w - 6, align: 'right' });
    if (report.distanceKm) doc.fillColor('#64748b').font('Helvetica').fontSize(6.5).text(`${report.distanceKm} km`, cols.absence.x, currentY + 14, { width: cols.absence.w - 6, align: 'right' });

    const travelText = report.travelCostsFormatted || (report.mileageCosts ? `${(report.mileageCosts + (report.ticketCosts || 0)).toFixed(2).replace('.', ',')} €` : '-');
    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(8).text(travelText, cols.travel.x, currentY + 4, { width: cols.travel.w - 6, align: 'right' });
    const travelDetail = report.travelDetails || (report.distanceKm ? `${report.distanceKm} km PKW` : '');
    if (travelDetail) doc.fillColor('#64748b').font('Helvetica').fontSize(6.5).text(travelDetail, cols.travel.x, currentY + 14, { width: cols.travel.w - 6, align: 'right' });

    doc.fillColor(report.netPerDiem > 0 ? '#047857' : '#64748b').font('Helvetica-Bold').fontSize(8);
    doc.text(report.vmaFormatted || report.perDiem || '0,00 €', cols.vma.x, currentY + 4, { width: cols.vma.w - 6, align: 'right' });
    if (report.deductionText || report.deductions) {
        doc.fillColor('#b91c1c').font('Helvetica').fontSize(6.5).text(report.deductionText || report.deductions, cols.vma.x, currentY + 14, { width: cols.vma.w - 6, align: 'right' });
    }

    doc.fillColor('#0f172a').font('Helvetica').fontSize(8).text(report.accommodationFormatted || report.accommodation || '0,00 €', cols.accommodation.x, currentY + 4, { width: cols.accommodation.w - 6, align: 'right' });
    doc.text(report.incidentalFormatted || report.incidentalCosts ? `${(report.incidentalCosts || 0).toFixed(2).replace('.', ',')} €` : '0,00 €', cols.incidental.x, currentY + 4, { width: cols.incidental.w - 6, align: 'right' });
    doc.fillColor('#4338ca').font('Helvetica-Bold').fontSize(8.5).text(report.dayTotalFormatted || report.total || '0,00 €', cols.total.x, currentY + 4, { width: cols.total.w - 6, align: 'right' });

    return rowHeight;
}
