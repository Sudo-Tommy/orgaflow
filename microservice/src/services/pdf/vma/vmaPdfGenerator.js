/**
 * vmaPdfGenerator.js
 * Generates landscape VMA travel expense report PDFs using Chromium HTML rendering.
 */
import { buildVmaHtml } from './vmaHtmlBuilder.js';
import { printHtmlToPdf } from '../browserPool.js';

export async function generateVmaPdf(data, res) {
    try {
        const { userName = 'Mitarbeiter', period = '' } = data;
        const html = buildVmaHtml(data);
        const pdfBuffer = await printHtmlToPdf(html, { landscape: true });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="Reisekosten_${userName.replace(/\s+/g, '_')}_${period.replace(/\s+/g, '_')}.pdf"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        res.end(pdfBuffer);
    } catch (err) {
        console.error('Fehler bei der VMA-PDF-Generierung via Puppeteer:', err);
        if (!res.headersSent) {
            res.status(500).json({ error: err.message || 'Fehler bei der VMA-PDF-Generierung' });
        }
    }
}
