import PDFDocument from 'pdfkit';
import { renderPoster } from './posterPdf.js';
import { renderFactsheet, renderVoucher, renderInsert } from './voucherFactsheetPdf.js';

export function generateMarketingPdf({ format, formatData }, res) {
    let doc;
    let filename = 'Werbemittel.pdf';

    if (format === 'poster') {
        filename = 'Plakat-Aushang-A4.pdf';
        doc = new PDFDocument({ size: 'A4', margins: { top: 40, left: 45, right: 45, bottom: 40 } });
        renderPoster(doc, formatData?.poster);
    } else if (format === 'factsheet') {
        filename = 'Infoblatt-Pflegekassen-A4.pdf';
        doc = new PDFDocument({ size: 'A4', margins: { top: 45, left: 50, right: 50, bottom: 45 } });
        renderFactsheet(doc, formatData?.factsheet);
    } else if (format === 'insert') {
        filename = 'Beileger-Postkarte-A6.pdf';
        doc = new PDFDocument({ size: [297.64, 419.53], margins: { top: 20, left: 20, right: 20, bottom: 20 } });
        renderInsert(doc, formatData?.insert);
    } else if (format === 'voucher') {
        filename = 'Gutschein-Kennenlernen-A6.pdf';
        doc = new PDFDocument({ size: [419.53, 297.64], margins: { top: 20, left: 20, right: 20, bottom: 20 } });
        renderVoucher(doc, formatData?.voucher);
    } else {
        return res.status(400).json({ error: 'Unbekanntes Werbemittel-Format.' });
    }

    const buffers = [];
    doc.on('data', b => buffers.push(b));
    doc.on('end', () => {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(Buffer.concat(buffers));
    });
    doc.on('error', err => { if (!res.headersSent) res.status(500).json({ error: err.message }); });
    doc.end();
}
