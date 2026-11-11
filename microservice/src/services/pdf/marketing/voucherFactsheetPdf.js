import { sanitizePdfDocumentText } from '../../../utils/pdfTextHelper.js';

export function renderFactsheet(doc, fData = {}) {
    doc.font('Helvetica-Bold').fontSize(18).fillColor('#0f172a').text(sanitizePdfDocumentText(fData.title || 'Information zum Entlastungsbetrag (§ 45b SGB XI)'), 50, 45, { width: 350 });
    doc.font('Helvetica').fontSize(9).fillColor('#64748b').text('Information für Klienten, Angehörige & Betreuer', 50, 75);
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#312e81').text('Seniorenassistenz Jenzsch\nHalle & Wittenberg', 400, 45, { width: 145, align: 'right' });
    doc.strokeColor('#4f46e5').lineWidth(2).moveTo(50, 95).lineTo(545, 95).stroke();

    let y = 115;
    doc.font('Helvetica-Bold').fontSize(12).fillColor('#1e1b4b').text(sanitizePdfDocumentText(fData.section1_title || '1. Wer hat Anspruch?'), 50, y);
    y += 18;
    doc.font('Helvetica').fontSize(10).fillColor('#334155').text(sanitizePdfDocumentText(fData.section1_text || 'Jede Person mit Pflegegrad (1-5) hat Anspruch auf bis zu 131 € monatlich.'), 50, y, { width: 495, lineGap: 3 });
    y = doc.y + 20;

    doc.font('Helvetica-Bold').fontSize(12).fillColor('#1e1b4b').text(sanitizePdfDocumentText(fData.section2_title || '2. Welche Leistungen können genutzt werden?'), 50, y);
    y += 18;
    const items = fData.section2_items || ['Alltagsbegleitung', 'Unterstützung bei Behörden', 'Mobilisation', 'Entlastung der Angehörigen'];
    for (const it of items) {
        doc.font('Helvetica').fontSize(10).fillColor('#334155').text('• ' + sanitizePdfDocumentText(it), 65, y, { width: 480, lineGap: 2 });
        y = doc.y + 6;
    }
    y += 14;

    doc.font('Helvetica-Bold').fontSize(12).fillColor('#1e1b4b').text(sanitizePdfDocumentText(fData.section3_title || '3. Wie erfolgt die Abrechnung?'), 50, y);
    y += 18;
    doc.font('Helvetica').fontSize(10).fillColor('#334155').text(sanitizePdfDocumentText(fData.section3_text || 'Direktabrechnung mit der Pflegekasse oder per Erstattungsrechnung.'), 50, y, { width: 495, lineGap: 3 });
    doc.strokeColor('#e2e8f0').lineWidth(1).moveTo(50, 740).lineTo(545, 740).stroke();
    doc.font('Helvetica').fontSize(8.5).fillColor('#64748b').text('Seniorenassistenz Jenzsch · Tel: 0345 / 213 895 20 · info@ihre-seniorenassistenz.com', 50, 755, { width: 495, align: 'center' });
}

export function renderVoucher(doc, vData = {}) {
    doc.fillColor('#fffbeb').roundedRect(10, 10, 399.53, 277.64, 12).fill();
    doc.strokeColor('#f59e0b').lineWidth(1.5).dash(4, { space: 3 }).roundedRect(15, 15, 389.53, 267.64, 10).stroke().undash();
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#92400e').text('EINLADUNG ZUM KENNENLERNEN', 20, 32, { width: 379.53, align: 'center' });
    doc.font('Helvetica-Bold').fontSize(16).fillColor('#0f172a').text(sanitizePdfDocumentText(vData.title || 'Gutschein für ein kostenfreies Erstgespräch'), 20, 52, { width: 379.53, align: 'center' });

    doc.fillColor('#f59e0b').roundedRect(140, 85, 140, 28, 14).fill();
    doc.font('Helvetica-Bold').fontSize(12).fillColor('#ffffff').text(sanitizePdfDocumentText(vData.value || '100% Kostenfrei'), 140, 93, { width: 140, align: 'center' });
    doc.font('Helvetica').fontSize(9).fillColor('#475569').text(sanitizePdfDocumentText(vData.description || 'Lernen Sie uns bei einem Kaffee unverbindlich kennen.'), 40, 128, { width: 339.53, align: 'center', lineGap: 3 });

    doc.fillColor('#ffffff').strokeColor('#fde68a').lineWidth(1).roundedRect(120, 180, 180, 36, 8).fillAndStroke();
    doc.font('Courier-Bold').fontSize(13).fillColor('#0f172a').text(sanitizePdfDocumentText(vData.code || 'HALLO-ORGAFLOW'), 120, 192, { width: 180, align: 'center' });
    doc.font('Helvetica').fontSize(7.5).fillColor('#64748b').text(sanitizePdfDocumentText(vData.validity || 'Gültig für Neukunden · Tel: 0151 57515432'), 20, 240, { width: 379.53, align: 'center' });
}

export function renderInsert(doc, iData = {}) {
    doc.strokeColor('#312e81').lineWidth(2).roundedRect(12, 12, 273.64, 395.53, 10).stroke();
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#4f46e5').text('SENIORENASSISTENZ JENZSCH', 20, 26, { width: 257.64, align: 'center' });
    doc.font('Helvetica-Bold').fontSize(14).fillColor('#0f172a').text(sanitizePdfDocumentText(iData.title || 'Ihr persönlicher Begleiter im Alltag'), 20, 45, { width: 257.64, align: 'center', lineGap: 2 });
    doc.font('Helvetica').fontSize(9).fillColor('#475569').text(sanitizePdfDocumentText(iData.subtitle || 'Für mehr Lebensqualität.'), 20, 85, { width: 257.64, align: 'center' });
    doc.strokeColor('#e2e8f0').lineWidth(1).moveTo(35, 120).lineTo(262, 120).stroke();

    let y = 135;
    for (const b of (iData.benefits || ['Persönlich & herzlich', 'Abrechnung über Pflegekassen', 'Keine Mindestvertragslaufzeit'])) {
        doc.font('Helvetica-Bold').fontSize(9).fillColor('#059669').text('✓', 30, y);
        doc.fillColor('#1e293b').text(sanitizePdfDocumentText(b), 48, y, { width: 220, lineGap: 2 });
        y += 30;
    }
    doc.fillColor('#f8fafc').roundedRect(20, 315, 257.64, 75, 8).fill();
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#312e81').text('0151 57515432 (Halle) · 0160 7303830 (WB)', 20, 342, { width: 257.64, align: 'center' });
}
