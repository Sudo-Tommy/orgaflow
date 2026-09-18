import PDFTableDocument from 'pdfkit-table';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { sanitizePdfDocumentText, cleanBase64DocumentImage } from '../../../utils/pdfTextHelper.js';
import { buildTableData, drawInvoiceTotals } from './docTableHelper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STAMP_PATH = path.resolve(__dirname, '../../../assets/storno-stamp.png');

export function generateDocumentPdf({ templateJson, data, isTimesheet }, res) {
    const fields = templateJson?.fields || [];
    const tableField = fields.find(f => f.type === 'table');
    const isLandscape = templateJson?.orientation === 'landscape';
    const pageHeight = isLandscape ? 794 : 1123;
    const pageWidth = isLandscape ? 1123 : 794;
    const headerThreshold = Number(templateJson?.marginTop) || 250;
    const calculatedBottomMargin = Number(templateJson?.marginBottom) || 150;
    const footerTop = pageHeight - calculatedBottomMargin;

    const safeTableX = tableField ? (Number(tableField.x) || 50) : 50;
    const safeTableW = tableField ? (Number(tableField.w) || (pageWidth - 100)) : (pageWidth - 100);

    const doc = new PDFTableDocument({
        size: isLandscape ? [1123, 794] : [794, 1123],
        margins: {
            top: Math.max(headerThreshold, 50),
            left: safeTableX,
            right: tableField ? Math.max(pageWidth - (safeTableX + safeTableW), 20) : 50,
            bottom: calculatedBottomMargin
        },
        autoFirstPage: true,
        bufferPages: true
    });

    const buffers = [];
    doc.on('data', b => buffers.push(b));
    doc.on('end', () => {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="dokument.pdf"');
        res.send(Buffer.concat(buffers));
    });
    doc.on('error', err => {
        console.error('Fehler im PDFKit-Stream:', err);
        if (!res.headersSent) {
            res.status(500).json({ error: err.message || 'Fehler bei PDF-Generierung' });
        }
    });

    // Zeichnet absolute Header- und Footer-Felder (mit Schutz gegen Stack Overflow / Endlosschleifen)
    const drawAbsoluteFields = (filterCondition) => {
        const origAddPage = doc.addPage.bind(doc);
        doc.addPage = (() => doc);
        const prevX = doc.x;
        const prevY = doc.y;
        const savedMargins = { top: doc.page.margins.top, bottom: doc.page.margins.bottom };
        doc.page.margins.top = 0;
        doc.page.margins.bottom = 0;

        for (const field of fields.filter(filterCondition)) {
            const relativeY = (Number(field.y) || 0) % pageHeight;

            if (field.type === 'text') {
                const isBold = field.style?.fontWeight === 'bold';
                doc.font(isBold ? 'Helvetica-Bold' : 'Helvetica');

                const textOptions = {
                    width: Number(field.w) > 0 ? Number(field.w) : undefined,
                    align: field.style?.textAlign || 'left',
                    lineGap: 2
                };
                if (field.h && !field.style?.dynamicHeight) {
                    textOptions.height = Number(field.h);
                }

                doc.fontSize(Number(field.style?.fontSize) || 12);
                doc.fillColor(field.style?.color || '#000000');
                doc.text(sanitizePdfDocumentText(field.content || ''), Number(field.x) || 50, relativeY, textOptions);
            } else if (field.type === 'logo') {
                const imgBuffer = cleanBase64DocumentImage(field.imageBase64 || data?.companyLogoBase64);
                if (imgBuffer) {
                    try {
                        doc.image(imgBuffer, Number(field.x) || 50, relativeY, {
                            fit: [Number(field.w) || 120, Number(field.h) || 60],
                            align: 'center',
                            valign: 'center'
                        });
                    } catch (e) {
                        console.warn('Fehler beim Rendern des Bildes im Header/Footer:', e);
                    }
                }
            }
        }

        doc.page.margins.top = savedMargins.top;
        doc.page.margins.bottom = savedMargins.bottom;
        doc.x = prevX;
        doc.y = prevY;
        doc.addPage = origAddPage;
    };

    const headerFields = fields.filter(f => f.type !== 'table' && ((Number(f.y) || 0) % pageHeight) < headerThreshold);
    const footerFields = fields.filter(f => f.type !== 'table' && ((Number(f.y) || 0) % pageHeight) >= footerTop);
    const bodyFields = fields.filter(f => f.type !== 'table' && ((Number(f.y) || 0) % pageHeight) >= headerThreshold && ((Number(f.y) || 0) % pageHeight) < footerTop);

    let isDrawingPageHeaderFooter = false;
    doc.on('pageAdded', () => {
        if (isDrawingPageHeaderFooter) return;
        isDrawingPageHeaderFooter = true;
        try {
            drawAbsoluteFields(f => (headerFields.includes(f) || footerFields.includes(f)) && f.style?.repeatOnAllPages !== false);
        } finally {
            isDrawingPageHeaderFooter = false;
        }
    });

    drawAbsoluteFields(f => headerFields.includes(f) || footerFields.includes(f));

    const drawBodyFields = (fieldsToRender, isAfterTable = false) => {
        if (!fieldsToRender || fieldsToRender.length === 0) return;

        const sortedBodyFields = [...fieldsToRender].sort((a, b) => {
            const ay = Number(a.y) || 0;
            const by = Number(b.y) || 0;
            if (Math.abs(ay - by) < 10) return (Number(a.x) || 0) - (Number(b.x) || 0);
            return ay - by;
        });

        let cursorY = doc.y > headerThreshold ? doc.y + 30 : headerThreshold;
        let currentBlockCanvasY = Number(sortedBodyFields[0].y) || 0;
        if (!isAfterTable && currentBlockCanvasY > cursorY) {
            cursorY = currentBlockCanvasY;
        }
        let currentBlockPdfY = cursorY;
        let maxCanvasBottomSoFar = currentBlockCanvasY;
        let maxDocYForCurrentLine = cursorY;
        let currentMaxPage = doc.page;

        for (const field of sortedBodyFields) {
            const fieldY = Number(field.y) || 0;
            const fieldH = Number(field.h) || 50;
            const canvasGapToBottom = fieldY - maxCanvasBottomSoFar;

            if (canvasGapToBottom >= 0) {
                if (field !== sortedBodyFields[0]) {
                    cursorY = maxDocYForCurrentLine + canvasGapToBottom;
                    currentBlockCanvasY = fieldY;
                    currentBlockPdfY = cursorY;
                }
            } else {
                cursorY = currentBlockPdfY + (fieldY - currentBlockCanvasY);
            }

            maxCanvasBottomSoFar = Math.max(maxCanvasBottomSoFar, fieldY + fieldH);

            const isDynamicText = field.type === 'text' && field.style?.dynamicHeight;
            const needsPageBreak = isDynamicText
                ? cursorY > (pageHeight - calculatedBottomMargin)
                : cursorY + fieldH > (pageHeight - calculatedBottomMargin);

            if (needsPageBreak) {
                doc.addPage();
                cursorY = doc.page.margins.top;
                currentBlockPdfY = cursorY - (fieldY - currentBlockCanvasY);
                maxDocYForCurrentLine = cursorY;
                currentMaxPage = doc.page;
            }

            if (field.type === 'text') {
                const isBold = field.style?.fontWeight === 'bold';
                doc.font(isBold ? 'Helvetica-Bold' : 'Helvetica')
                   .fontSize(Number(field.style?.fontSize) || 12)
                   .fillColor(field.style?.color || '#000000');

                const textOpts = {
                    width: Number(field.w) > 0 ? Number(field.w) : undefined,
                    align: field.style?.textAlign || 'left',
                    lineGap: 2
                };
                if (field.h && !field.style?.dynamicHeight) textOpts.height = Number(field.h);

                doc.text(sanitizePdfDocumentText(field.content || ''), Number(field.x) || 50, cursorY, textOpts);

                if (doc.page !== currentMaxPage) {
                    currentMaxPage = doc.page;
                    maxDocYForCurrentLine = doc.y;
                } else {
                    maxDocYForCurrentLine = Math.max(maxDocYForCurrentLine, doc.y);
                }
            } else if (field.type === 'logo') {
                const imgBuffer = cleanBase64DocumentImage(field.imageBase64 || data?.companyLogoBase64);
                if (imgBuffer) {
                    try {
                        doc.image(imgBuffer, Number(field.x) || 50, cursorY, {
                            fit: [Number(field.w) || 120, Number(field.h) || 60],
                            align: 'center',
                            valign: 'center'
                        });
                        if (doc.page !== currentMaxPage) {
                            currentMaxPage = doc.page;
                            maxDocYForCurrentLine = doc.y;
                        } else {
                            maxDocYForCurrentLine = Math.max(maxDocYForCurrentLine, cursorY + fieldH);
                        }
                    } catch (e) {
                        console.warn('Fehler beim Rendern des Logo-Bildes in Body:', e);
                    }
                }
            }
        }

        doc.y = maxDocYForCurrentLine;
    };

    if (tableField) {
        const tableY = Number(tableField.y) || headerThreshold;
        const bodyFieldsBeforeTable = bodyFields.filter(f => (Number(f.y) || 0) < tableY);
        const bodyFieldsAfterTable = bodyFields.filter(f => (Number(f.y) || 0) >= tableY);

        drawBodyFields(bodyFieldsBeforeTable, false);

        const tableConf = tableField.tableConfig || {};
        const columns = Array.isArray(tableConf.columns) ? tableConf.columns : [];
        const positions = isTimesheet ? data?.timesheetPositions : data?.invoicePositions;

        if (positions?.length && columns.length) {
            const tData = buildTableData(columns, positions);
            tData.headers = tData.headers.map(h => ({ ...h, width: h.width * safeTableW }));

            const startY = Math.max(tableY, doc.y > headerThreshold ? doc.y + 20 : doc.y);
            doc.x = safeTableX;
            doc.y = startY;

            doc.strokeColor(tableConf.borderColor || '#cbd5e1').lineWidth(Number(tableConf.borderWidth) || 1);

            doc.table(tData, {
                width: safeTableW,
                x: safeTableX,
                padding: Number(tableConf.cellPadding) || 5,
                columnSpacing: 5,
                hideHeader: !tableConf.showHeaders,
                divider: {
                    header: { disabled: !(tableConf.showBorderHeader ?? true), width: Number(tableConf.borderWidth) || 1, opacity: 1 },
                    horizontal: { disabled: !(tableConf.showBorderRows ?? true), width: (Number(tableConf.borderWidth) || 1) * 0.5, opacity: 1 }
                },
                prepareHeader: () => doc.font('Helvetica-Bold').fontSize(Number(tableConf.fontSize) || 10).fillColor(tableConf.headerTextColor || '#000000'),
                prepareRow: () => doc.font('Helvetica').fontSize(Number(tableConf.fontSize) || 10).fillColor(tableField.style?.color || '#000000')
            }).then(() => {
                let currentY = doc.y;
                if (!isTimesheet) {
                    currentY = drawInvoiceTotals(doc, {
                        tableConf,
                        tableField: { ...tableField, x: safeTableX, w: safeTableW },
                        data,
                        currentY,
                        pageHeight,
                        bottomMargin: calculatedBottomMargin
                    });
                }
                doc.y = currentY;
                drawBodyFields(bodyFieldsAfterTable, true);
                drawStornoStampIfCancelled();
                doc.end();
            }).catch(err => {
                console.error('Fehler beim Zeichnen der PDF-Tabelle:', err);
                if (!res.headersSent) res.status(500).json({ error: err.message });
            });
            return;
        }

        drawBodyFields(bodyFieldsAfterTable, true);
    } else {
        drawBodyFields(bodyFields, false);
    }

    drawStornoStampIfCancelled();
    doc.end();

    function drawStornoStampIfCancelled() {
        if (data?.status !== 'Storniert') return;
        if (!fs.existsSync(STAMP_PATH)) return;

        try {
            const { count } = doc.bufferedPageRange();
            const stampW = Math.min(pageWidth * 0.68, 420);
            const stampH = stampW * (551 / 646);
            const stampX = (pageWidth - stampW) / 2;
            const stampY = (pageHeight - stampH) / 2;

            for (let i = 0; i < count; i++) {
                doc.switchToPage(i);
                doc.save();
                doc.opacity(0.85);
                try {
                    doc.image(STAMP_PATH, stampX, stampY, { width: stampW });
                } catch (err) {
                    console.warn('Fehler beim Zeichnen des Storno-Stempels:', err);
                }
                doc.restore();
            }
        } catch (e) {
            console.warn('Konnte Storno-Stempel nicht auf Seiten anwenden:', e);
        }
    }
}
