/**
 * docPdfGenerator.js
 * Generates pixel-perfect PDFs from templateJson and data using Headless Chromium.
 * Eliminates all PDFKit coordinate calculations, overlapping text, and broken breaks.
 */
import { buildDocumentHtml } from './docHtmlBuilder.js';
import { printHtmlToPdf } from '../browserPool.js';
import { PDFDocument } from 'pdf-lib';
import { cleanBase64DocumentImage } from '../../../utils/pdfTextHelper.js';

export async function generateDocumentPdf({ templateJson, data, isTimesheet }, res) {
    try {
        const isLandscape = templateJson?.orientation === 'landscape';

        // 1. Build semantic DIN A4 HTML & CSS
        const docResult = buildDocumentHtml({ templateJson, data, isTimesheet });
        const html = typeof docResult === 'string' ? docResult : docResult.html;
        const footerTemplate = typeof docResult === 'object' ? docResult.footerTemplate : null;

        // 2. Render PDF via Headless Chromium
        let pdfBuffer = await printHtmlToPdf(html, {
            landscape: isLandscape,
            footerTemplate
        });

        // 3. Stamp repeating logo on Folgeseiten (pages 2+) if configured
        const blocks = templateJson?.blocks || [];
        const repeatLogo = blocks.find(b => b.type === 'logo' && (b.logoConfig?.repeatOnAllPages === true || b.canvasMeta?.repeatOnAllPages === true));
        const logoSrc = data?.companyLogoBase64 ? `data:image/png;base64,${data.companyLogoBase64}` : null;

        if (repeatLogo && logoSrc) {
            try {
                const doc = await PDFDocument.load(pdfBuffer);
                const pages = doc.getPages();
                if (pages.length > 1) {
                    const cleanBuffer = cleanBase64DocumentImage(logoSrc);
                    if (cleanBuffer) {
                        let embeddedImg = null;
                        try {
                            embeddedImg = await doc.embedPng(cleanBuffer);
                        } catch {
                            try { embeddedImg = await doc.embedJpg(cleanBuffer); } catch {}
                        }
                        if (embeddedImg) {
                            const imgDims = embeddedImg.scale(1);
                            const targetH = Math.min(repeatLogo.logoConfig?.height || 45, 45);
                            const scale = targetH / imgDims.height;
                            const targetW = imgDims.width * scale;

                            for (let i = 1; i < pages.length; i++) {
                                const page = pages[i];
                                const { width, height } = page.getSize();
                                const marginRt = 20 * 2.83465;
                                const x = width - marginRt - targetW;
                                const y = height - (20 * 2.83465) - targetH;
                                page.drawImage(embeddedImg, { x, y, width: targetW, height: targetH });
                            }
                            pdfBuffer = Buffer.from(await doc.save());
                        }
                    }
                }
            } catch (stampErr) {
                console.warn('Could not stamp repeating logo with pdf-lib:', stampErr);
            }
        }

        // 4. Send PDF stream
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="dokument.pdf"');
        res.setHeader('Content-Length', pdfBuffer.length);
        res.end(pdfBuffer);
    } catch (err) {
        console.error('Fehler bei der HTML-PDF-Generierung via Puppeteer:', err);
        if (!res.headersSent) {
            res.status(500).json({ 
                error: err.message || 'Fehler bei der PDF-Generierung',
                details: 'Chromium PDF-Engine konnte das Dokument nicht rendern.'
            });
        }
    }
}
