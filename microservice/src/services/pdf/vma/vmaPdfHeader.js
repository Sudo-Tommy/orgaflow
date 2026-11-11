export function drawVmaHeader(doc, { userName, userAddress, company, period, createdDate, isFirstPage, leftMargin, contentWidth }) {
    doc.rect(leftMargin, 25, contentWidth, 3).fill('#4f46e5');
    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(16).text('REISEKOSTEN- & VMA-ABRECHNUNG', leftMargin, 34);
    doc.fillColor('#64748b').font('Helvetica').fontSize(8.5).text('Gemäß § 9 Abs. 4a EStG & den amtlichen BMF-Reisekostenrichtlinien (Die 4 Säulen)', leftMargin, 53);
    doc.fillColor('#1e293b').font('Helvetica-Bold').fontSize(9).text('Abrechnungszeitraum: ', leftMargin, 67, { continued: true });
    doc.font('Helvetica').text(`${period}   |   Erstellt am: ${createdDate}`);

    const rightBoxX = 520;
    const companyName = company?.name || 'Seniorenassistenz & Betreuungsdienst';
    const companyStreet = company?.street ? `${company.street} ${company.housenr || ''}`.trim() : '';
    const companyCity = company?.city ? `${company.zip || ''} ${company.city}`.trim() : '';
    const companyVat = company?.vatcode ? `USt-IdNr.: ${company.vatcode}` : '';

    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(9).text(companyName, rightBoxX, 34, { width: 286, align: 'right' });
    if (companyStreet || companyCity) {
        doc.fillColor('#475569').font('Helvetica').fontSize(8).text(`${companyStreet}${companyStreet && companyCity ? ', ' : ''}${companyCity}`, rightBoxX, 46, { width: 286, align: 'right' });
    }
    if (companyVat) {
        doc.fillColor('#475569').font('Helvetica').fontSize(8).text(companyVat, rightBoxX, 57, { width: 286, align: 'right' });
    }
    doc.fillColor('#1e293b').font('Helvetica-Bold').fontSize(9).text(`Reisende Person: ${userName}`, rightBoxX, 68, { width: 286, align: 'right' });
    if (userAddress) {
        doc.font('Helvetica').fontSize(7.5).fillColor('#64748b').text(`Wohnanschrift: ${userAddress}`, rightBoxX, 79, { width: 286, align: 'right' });
    }

    if (isFirstPage) {
        doc.rect(leftMargin, 92, contentWidth, 22).fill('#f1f5f9');
        doc.fillColor('#334155').font('Helvetica').fontSize(7.5).text(
            'Gesetzliche Pflichtangaben: Name, Reisezweck, Reiseroute & minutengenaue Abwesenheit. Mahlzeitenkürzung (§ 9 Abs. 4a EStG): Frühstück -20 %, Mittag-/Abendessen je -40 %. Säule 1: PKW 0,30 €/km + Tickets. Säule 3: Hotel. Säule 4: Nebenkosten.',
            leftMargin + 8, 98, { width: contentWidth - 16 }
        );
        return 120;
    }
    return 95;
}

export function drawVmaTableHeader(doc, cols, leftMargin, contentWidth, topY) {
    doc.rect(leftMargin, topY, contentWidth, 18).fill('#1e293b');
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(8);
    Object.values(cols).forEach(col => {
        const textX = col.align === 'right' ? col.x : col.x + 3;
        doc.text(col.title, textX, topY + 5, { width: col.w - 6, align: col.align });
    });
    return topY + 18;
}
