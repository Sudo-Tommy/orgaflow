import { sanitizePdfDocumentText } from '../../../utils/pdfTextHelper.js';

export function renderPoster(doc, pData = {}) {
    doc.fillColor('#fef3c7').roundedRect(170, 40, 255, 24, 12).fill();
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#b45309').text('OFFIZIELLE SENIORENASSISTENZ', 170, 47, { width: 255, align: 'center' });
    doc.font('Helvetica-Bold').fontSize(24).fillColor('#0f172a').text(sanitizePdfDocumentText(pData.headline || 'Gemeinsam statt einsam'), 45, 80, { width: 505, align: 'center', lineGap: 3 });
    doc.font('Helvetica').fontSize(13).fillColor('#475569').text(sanitizePdfDocumentText(pData.subheadline || 'Ihre vertrauensvolle Unterstützung im Alltag'), 45, 145, { width: 505, align: 'center' });
    doc.strokeColor('#f59e0b').lineWidth(2).moveTo(150, 185).lineTo(445, 185).stroke();

    doc.font('Helvetica-Bold').fontSize(11).fillColor('#64748b').text('UNSERE LEISTUNGEN FÜR SIE:', 50, 205);
    let y = 225;
    const bullets = pData.bulletpoints || ['Begleitung zu Arztterminen & Behörden', 'Hilfe bei Anträgen & Papierkram', 'Gemeinsame Spaziergänge', 'Entlastung für Angehörige'];
    for (const bp of bullets) {
        doc.fillColor('#f8fafc').strokeColor('#e2e8f0').lineWidth(1).roundedRect(50, y, 495, 36, 8).fillAndStroke();
        doc.font('Helvetica-Bold').fontSize(11).fillColor('#059669').text('[x]', 65, y + 11);
        doc.font('Helvetica-Bold').fontSize(11).fillColor('#1e293b').text(sanitizePdfDocumentText(bp), 90, y + 11, { width: 440 });
        y += 44;
    }

    y += 10;
    doc.fillColor('#312e81').roundedRect(50, y, 495, 80, 12).fill();
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#a5b4fc').text('PFLEGEKASSEN-VORTEIL', 50, y + 15, { width: 495, align: 'center' });
    doc.font('Helvetica-Bold').fontSize(14).fillColor('#ffffff').text(sanitizePdfDocumentText(pData.highlight_box || 'Bis zu 131 € monatlich erstattungsfähig ab Pflegegrad 1!'), 70, y + 34, { width: 455, align: 'center', lineGap: 2 });

    y += 100;
    doc.fillColor('#f8fafc').strokeColor('#cbd5e1').lineWidth(1.5).roundedRect(50, y, 495, 110, 12).fillAndStroke();
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#1e1b4b').text('JETZT KOSTENFREIEN BERATUNGSTERMIN VEREINBAREN', 50, y + 14, { width: 495, align: 'center' });
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#0f172a').text('Tommy Jenzsch (Halle): 0151 57515432 · Doreen Jenzsch (Wittenberg): 0160 7303830', 50, y + 40, { width: 495, align: 'center' });
    doc.font('Helvetica').fontSize(10).fillColor('#475569').text('E-Mail: info@ihre-seniorenassistenz.com · Web: www.ihre-seniorenassistenz.com', 50, y + 65, { width: 495, align: 'center' });
    doc.font('Helvetica').fontSize(8.5).fillColor('#94a3b8').text('Anerkannter Dienst für Angebote zur Unterstützung im Alltag gem. § 45a SGB XI', 50, y + 88, { width: 495, align: 'center' });
}
