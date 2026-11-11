import PDFDocument from 'pdfkit';
import { MM_TO_PT, sanitizePdfText, cleanBase64Image, resolveFaviconBuffer } from './marketingPdfUtils';

export function createFlyerDoc(sheets: any[]): InstanceType<typeof PDFDocument> {
    const doc = new PDFDocument({
        size: [841.89, 595.28], // A4 Landscape
        margins: { top: 0, left: 0, right: 0, bottom: 0 },
        autoFirstPage: false
    });

    const sheetList = Array.isArray(sheets) && sheets.length > 0 ? sheets : [];

    for (let i = 0; i < sheetList.length; i++) {
        const sheet = sheetList[i];
        doc.addPage({
            size: [841.89, 595.28],
            margins: { top: 0, left: 0, right: 0, bottom: 0 }
        });

        // Sortiere Elemente nach zIndex
        const elements = [...(sheet.elements || [])].sort((a: any, b: any) => (a.zIndex || 0) - (b.zIndex || 0));

        for (const el of elements) {
            renderFlyerElement(doc, el);
        }
    }

    return doc;
}

function renderFlyerElement(doc: InstanceType<typeof PDFDocument>, el: any) {
    const x = (el.x || 0) * MM_TO_PT;
    const y = (el.y || 0) * MM_TO_PT;
    const w = Math.max(1, (el.w || 10) * MM_TO_PT);
    const r = Math.max(0, (el.borderRadius || 0) * MM_TO_PT);
    const pad = Math.max(0, (el.padding || 0) * MM_TO_PT);
    let h = (el.h > 0 ? el.h : 20) * MM_TO_PT;

    if (el.type === 'text' && el.content) {
        const isBold = el.fontWeight === 'bold' || el.fontWeight === '900';
        doc.font(isBold ? 'Helvetica-Bold' : 'Helvetica');
        doc.fontSize(el.fontSize || 10);
        const textW = Math.max(10, w - 2 * pad);
        const textHeight = doc.heightOfString(sanitizePdfText(el.content), { width: textW, lineGap: 1.5 });
        if (!el.h || el.h === 0) {
            h = textHeight + 2 * pad;
        }
    }

    // Hintergrund-Box
    if (el.bgColor && el.bgColor !== 'transparent') {
        doc.save();
        doc.fillColor(el.bgColor);
        if (r > 0) {
            doc.roundedRect(x, y, w, h, r).fill();
        } else {
            doc.rect(x, y, w, h).fill();
        }

        if (el.borderWidth && el.borderWidth > 0 && el.borderColor) {
            doc.lineWidth(el.borderWidth * MM_TO_PT);
            doc.strokeColor(el.borderColor);
            if (r > 0) {
                doc.roundedRect(x, y, w, h, r).stroke();
            } else {
                doc.rect(x, y, w, h).stroke();
            }
        }
        doc.restore();
    }

    if (el.type === 'text' && el.content) {
        doc.save();
        const isBold = el.fontWeight === 'bold' || el.fontWeight === '900';
        doc.font(isBold ? 'Helvetica-Bold' : 'Helvetica');
        doc.fontSize(el.fontSize || 10);
        doc.fillColor(el.color || '#000000');

        const textX = x + pad;
        const textY = y + pad;
        const textW = Math.max(10, w - 2 * pad);

        doc.text(sanitizePdfText(el.content), textX, textY, {
            width: textW,
            align: el.textAlign || 'left',
            lineGap: 1.5
        });
        doc.restore();
    } else if (el.type === 'image') {
        let imgBuffer: Buffer | null = null;
        if (el.content?.startsWith('data:image')) {
            imgBuffer = cleanBase64Image(el.content);
        } else if (el.content === '/favicon.png' || el.content?.includes('favicon.png')) {
            imgBuffer = resolveFaviconBuffer();
        }
        if (imgBuffer) {
            try {
                doc.image(imgBuffer, x, y, {
                    fit: [w, h],
                    align: el.textAlign === 'center' ? 'center' : (el.textAlign === 'right' ? 'right' : undefined),
                    valign: 'center'
                });
            } catch (e) {
                console.warn('Konnte Flyer-Bild nicht rendern:', e);
            }
        }
    }
}
