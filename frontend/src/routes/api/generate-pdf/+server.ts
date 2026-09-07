import PDFDocument from 'pdfkit-table';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';

function sanitizePdfText(text: string): string {
    if (!text) return '';
    return text
        .replace(/[\u201C\u201D\u201E\u00AB\u00BB]/g, '"') // Typografische doppelte Anführungszeichen
        .replace(/[\u2018\u2019\u201A\u2039\u203A]/g, "'") // Typografische einfache Anführungszeichen
        .replace(/[\u2013\u2014\u2015]/g, '-') // Gedankenstriche (En-dash, Em-dash)
        .replace(/[\u2022\u25CF\u25AA\u25AB\u2023]/g, '-') // Bullets
        .replace(/\u2026/g, '...') // Auslassungspunkte
        .replace(/\u00A0/g, ' ') // Geschütztes Leerzeichen
        .replace(/\u2192/g, '->') // Pfeil rechts
        .replace(/[\u2713\u2714]/g, '[x]') // Häkchen
        // Emojis entfernen, da Standard-Helvetica in PDFKit sie nicht unterstützt
        .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDE4F]|\uD83D[\uDE80-\uDEFF]|\uD83E[\uDD00-\uDDFF]/g, '');
}

function cleanBase64Image(base64Str: string | null | undefined): Buffer | null {
    if (!base64Str) return null;
    try {
        const clean = base64Str.replace(/^data:image\/[a-zA-Z0-9+]+;base64,/, '').trim();
        if (!clean) return null;
        return Buffer.from(clean, 'base64');
    } catch (e) {
        console.warn("Fehler beim Konvertieren von Base64 zu Buffer:", e);
        return null;
    }
}

export const POST: RequestHandler = async ({ request }) => {
    try {
        const { templateJson, data, isTimesheet } = await request.json();

        return new Promise((resolve, reject) => {
            const fields = templateJson.fields || [];
            const tableField = fields.find((f: any) => f.type === 'table');

            const pageHeight = templateJson.orientation === 'landscape' ? 794 : 1123;
            
            // Hole die Ränder direkt aus den Einstellungen (mit Fallbacks falls leer)
            const headerThreshold = templateJson.marginTop ?? 250;
            const calculatedBottomMargin = templateJson.marginBottom ?? 150;
            const footerTop = pageHeight - calculatedBottomMargin;

            // 1. EXAKTE Anpassung an das Frontend-Canvas!
            const doc = new PDFDocument({
                size: templateJson.orientation === 'landscape' ? [1123, 794] : [794, 1123],
                margins: { 
                    top: Math.max(headerThreshold, 50), 
                    left: tableField ? tableField.x : 50, 
                    right: tableField ? Math.max((templateJson.orientation === 'landscape' ? 1123 : 794) - (tableField.x + tableField.w), 20) : 50, 
                    bottom: calculatedBottomMargin 
                },
                autoFirstPage: true
            });

            // Interceptoren für Schrift und Farbe, um den exakten Zustand für Seitenumbrüche zu bewahren
            const origFillColor = doc.fillColor.bind(doc);
            const origFont = doc.font.bind(doc);
            const origFontSize = doc.fontSize.bind(doc);

            let lastColor: any[] | null = null;
            let lastFont: any[] | null = null;
            let lastFontSize: any[] | null = null;

            doc.fillColor = function(...args: any[]) {
                if (args.length > 0) { lastColor = args; return (origFillColor as any)(...args); }
                return (doc as any)._fillColor;
            } as any;

            doc.font = function(...args: any[]) {
                if (args.length > 0 && args[0] !== undefined) { lastFont = args; return origFont(args[0], args[1], args[2]); }
                return (doc as any)._font;
            } as any;

            doc.fontSize = function(...args: any[]) {
                if (args.length > 0) { lastFontSize = args; return origFontSize(...(args as [number])); }
                return (doc as any)._fontSize;
            } as any;

            let buffers: Buffer[] = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => {
                const pdfData = Buffer.concat(buffers);
                resolve(new Response(pdfData, {
                    headers: {
                        'Content-Type': 'application/pdf',
                        'Content-Disposition': 'attachment; filename="dokument.pdf"'
                    }
                }));
            });
            doc.on('error', reject);

            // Helfer, um absolute Felder (Text & Logos) auf dem Canvas zu zeichnen
            const drawAbsoluteFields = (filterCondition: (f: any) => boolean) => {
                // Verhindert Endlosschleifen (Maximum call stack), wenn Felder über den Seitenrand hinausgehen
                const origAddPage = doc.addPage.bind(doc);
                doc.addPage = (() => doc) as any; 
                const prevX = doc.x;
                const prevY = doc.y;
                
                // Aktuellen Text- und Farbstatus speichern, damit umgebrochener Text nicht falsch eingefärbt wird
                const prevColorArgs = lastColor;
                const prevFontArgs = lastFont;
                const prevFontSizeArgs = lastFontSize;

                for (const field of fields.filter(filterCondition)) {
                    const relativeY = (field.y ?? 0) % pageHeight;

                    if (field.type === 'text') {
                        // WICHTIG: Das Frontend hat die Platzhalter bereits alle formatiert
                        const isBold = field.style?.fontWeight === 'bold';
                        doc.font(isBold ? 'Helvetica-Bold' : 'Helvetica');
                        
                        const textOptions: any = {
                               width: field.w,
                               align: (field.style?.textAlign as any) || 'left',
                               lineGap: 2
                        };
                        if (field.h) {
                            textOptions.height = field.h;
                        }
                        
                        (doc.fontSize as any)(field.style?.fontSize || 12);
                        doc.fillColor(field.style?.color || '#000000');
                        doc.text(sanitizePdfText(field.content || ''), field.x, relativeY, textOptions);
                           
                    } else if (field.type === 'logo') {
                        const imgBuffer = cleanBase64Image(field.imageBase64 || data.companyLogoBase64);
                        if (imgBuffer) {
                            try {
                                doc.image(imgBuffer, field.x, relativeY, {
                                    fit: [field.w, field.h],
                                    align: 'center',
                                    valign: 'center'
                                });
                            } catch (e) {
                                console.warn("Konnte Bild nicht rendern", e);
                            }
                        }
                    }
                }
                
                // Status wiederherstellen
                if (prevColorArgs) origFillColor.apply(doc, prevColorArgs as any);
                if (prevFontArgs) origFont.apply(doc, prevFontArgs as any);
                if (prevFontSizeArgs) origFontSize.apply(doc, prevFontSizeArgs as any);
                
                lastColor = prevColorArgs;
                lastFont = prevFontArgs;
                lastFontSize = prevFontSizeArgs;

                doc.x = prevX;
                doc.y = prevY;
                doc.addPage = origAddPage;
            };

            // Logische Trennung der Felder
            const headerFields = fields.filter((f: any) => f.type !== 'table' && (f.y % pageHeight) < headerThreshold);
            const footerFields = fields.filter((f: any) => f.type !== 'table' && (f.y % pageHeight) >= footerTop);
            const bodyFields = fields.filter((f: any) => f.type !== 'table' && (f.y % pageHeight) >= headerThreshold && (f.y % pageHeight) < footerTop);

            // Zeichnet Kopf- und Fußzeile IMMER neu, wenn 'pdfkit-table' automatisch eine neue Seite umbricht!
            doc.on('pageAdded', () => {
                drawAbsoluteFields(f => (headerFields.includes(f) || footerFields.includes(f)) && f.style?.repeatOnAllPages !== false);
            });

            // Initiale Kopf- und Fußzeile zeichnen
            drawAbsoluteFields(f => headerFields.includes(f) || footerFields.includes(f));

            const bodyFieldsBeforeTable = tableField ? bodyFields.filter((f: any) => f.y < tableField.y) : bodyFields;
            const bodyFieldsAfterTable = tableField ? bodyFields.filter((f: any) => f.y >= tableField.y) : [];

            const drawBodyFields = (fieldsToRender: any[], isAfterTable: boolean = false) => {
                if (fieldsToRender.length === 0) return;

                const sortedBodyFields = [...fieldsToRender].sort((a, b) => {
                    if (Math.abs(a.y - b.y) < 10) return a.x - b.x;
                    return a.y - b.y;
                });

                let cursorY = doc.y > headerThreshold ? doc.y + 30 : headerThreshold;
                let currentBlockCanvasY = sortedBodyFields[0].y;
                if (!isAfterTable && currentBlockCanvasY > cursorY) {
                    cursorY = currentBlockCanvasY;
                }
                let currentBlockPdfY = cursorY;
                let maxCanvasBottomSoFar = sortedBodyFields[0].y;
                let maxDocYForCurrentLine = cursorY;
                let currentMaxPage = doc.page;

                for (const field of sortedBodyFields) {
                    const canvasGapToBottom = field.y - maxCanvasBottomSoFar;
                    
                    if (canvasGapToBottom >= 0) {
                        // Neues Block-Element (steht streng unterhalb aller vorherigen)
                        if (field !== sortedBodyFields[0]) {
                            cursorY = maxDocYForCurrentLine + canvasGapToBottom;
                            currentBlockCanvasY = field.y;
                            currentBlockPdfY = cursorY;
                        }
                    } else {
                        // Überlappendes Element (z.B. nebeneinander platzierte Texte)
                        cursorY = currentBlockPdfY + (field.y - currentBlockCanvasY);
                    }
                    
                    maxCanvasBottomSoFar = Math.max(maxCanvasBottomSoFar, field.y + (field.h || 50));

                    const isDynamicText = field.type === 'text' && field.style?.dynamicHeight;
                    const needsPageBreak = isDynamicText 
                        ? cursorY > (pageHeight - calculatedBottomMargin) 
                        : cursorY + (field.h || 50) > (pageHeight - calculatedBottomMargin);

                    if (needsPageBreak) {
                        doc.addPage();
                        cursorY = doc.page.margins.top;
                        currentBlockPdfY = cursorY - (field.y - currentBlockCanvasY);
                        maxDocYForCurrentLine = cursorY;
                        currentMaxPage = doc.page;
                    }

                    if (field.type === 'text') {
                        const isBold = field.style?.fontWeight === 'bold';
                        doc.font(isBold ? 'Helvetica-Bold' : 'Helvetica')
                           .fontSize(field.style?.fontSize || 12)
                           .fillColor(field.style?.color || '#000000');
                           
                        const textOpts: any = { width: field.w, align: field.style?.textAlign || 'left', lineGap: 2 };
                        if (field.h && !field.style?.dynamicHeight) textOpts.height = field.h;

                        doc.text(sanitizePdfText(field.content || ''), field.x, cursorY, textOpts);
                        
                        if (doc.page !== currentMaxPage) {
                            currentMaxPage = doc.page;
                            maxDocYForCurrentLine = doc.y;
                        } else {
                            maxDocYForCurrentLine = Math.max(maxDocYForCurrentLine, doc.y);
                        }
                    } else if (field.type === 'logo') {
                        const imgBuffer = cleanBase64Image(field.imageBase64 || data.companyLogoBase64);
                        if (imgBuffer) {
                            try {
                                doc.image(imgBuffer, field.x, cursorY, { fit: [field.w, field.h], align: 'center', valign: 'center' });
                                if (doc.page !== currentMaxPage) {
                                    currentMaxPage = doc.page;
                                    maxDocYForCurrentLine = doc.y;
                                } else {
                                    maxDocYForCurrentLine = Math.max(maxDocYForCurrentLine, cursorY + field.h);
                                }
                            } catch (e) {
                                console.warn("Konnte Bild in bodyFields nicht rendern", e);
                            }
                        }
                    }
                }
                
                // Setze den globalen Cursor für das nächste Element (z.B. Tabelle)
                doc.y = maxDocYForCurrentLine;
            };

            if (tableField) {
                // Zuerst die Felder zeichnen, die im Editor ÜBER der Tabelle liegen
                drawBodyFields(bodyFieldsBeforeTable, false);

                const tableConf = tableField.tableConfig || {};
                const columns = Array.isArray(tableConf.columns) ? tableConf.columns : [];
                const positions = isTimesheet ? data.timesheetPositions : data.invoicePositions;
                
                if (positions && positions.length > 0 && columns.length > 0) {
                    const tableData = {
                        headers: columns.map((c: any) => ({
                            label: sanitizePdfText(c.name || ''),
                            property: c.type,
                            width: ((Number(c.width) || 10) / 100) * tableField.w,
                            renderer: null,
                            align: c.align || 'left'
                        })),
                        datas: positions.map((pos: any, idx: number) => {
                            let row: any = {};
                            for (const col of columns) {
                                if (col.type === 'total') {
                                    row[col.type] = (Number(pos.total) || 0).toLocaleString('de-DE', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' €';
                                } else if (col.type === 'price') {
                                    row[col.type] = sanitizePdfText(String(pos.price || ''));
                                } else if (col.type === 'duration') {
                                    row[col.type] = sanitizePdfText(String(pos.duration || ''));
                                } else if (col.type === 'date') {
                                    row[col.type] = sanitizePdfText(String(pos.date || ''));
                                } else if (col.type === 'pos') {
                                    row[col.type] = String(pos.pos ?? (idx + 1));
                                } else if (col.type === 'title') {
                                    row[col.type] = sanitizePdfText(String(pos.title || ''));
                                } else {
                                    row[col.type] = sanitizePdfText(String(pos[col.type] ?? ''));
                                }
                            }
                            return row;
                        }),
                    };
                    

                    // WICHTIG: Cursor-Position für die Tabelle setzen. 
                    // Wenn vorher Texte dynamisch gezeichnet wurden, ist doc.y evtl. nach unten gerutscht!
                    const startY = Math.max(tableField.y, doc.y > headerThreshold ? doc.y + 20 : doc.y);
                    doc.x = tableField.x;
                    doc.y = startY;

                    doc.strokeColor(tableConf.borderColor || '#cbd5e1').lineWidth(tableConf.borderWidth || 1);

                    doc.table(tableData, {
                        prepareHeader: () => doc.font('Helvetica-Bold').fontSize(tableConf.fontSize || 10).fillColor(tableConf.headerTextColor || '#000000'),
                        prepareRow: () => doc.font('Helvetica').fontSize(tableConf.fontSize || 10).fillColor(tableField.style?.color || '#000000'),
                        width: tableField.w,
                        x: tableField.x, // Zwingt die Tabelle auf den vom Editor vorgesehenen Einzug!
                        padding: tableConf.cellPadding || 5,
                        columnSpacing: 5,
                        hideHeader: !tableConf.showHeaders,
                        divider: { 
                            header: { disabled: !(tableConf.showBorderHeader ?? true), width: tableConf.borderWidth || 1, opacity: 1 }, 
                            horizontal: { disabled: !(tableConf.showBorderRows ?? true), width: (tableConf.borderWidth || 1) * 0.5, opacity: 1 } 
                        }
                    }).then(() => {
                        let currentY = doc.y;
                        
                        // Manueller, isolierter Tabellen-Fuß (Damit Linien nicht über das ganze Blatt gehen!)
                        if (!isTimesheet && (tableConf.includeTotalNetto !== false || tableConf.includeTotalTax !== false || tableConf.includeTotalBrutto !== false)) {
                            
                            // Wenn der Platz für die Summen zu knapp wird, auf neue Seite umbrechen
                            if (currentY + 75 > (pageHeight - calculatedBottomMargin)) {
                                doc.addPage();
                                currentY = doc.page.margins.top;
                            }

                            currentY += 15;
                            const fWidth = tableConf.footerWidth || 200;
                            const footerX = tableField.x + tableField.w - fWidth;
                            
                            // Draw top line for footer
                            doc.moveTo(footerX, currentY - 5)
                               .lineTo(tableField.x + tableField.w, currentY - 5)
                               .strokeColor(tableConf.borderColor || '#cbd5e1')
                               .lineWidth(tableConf.borderWidth || 1)
                               .stroke();

                            doc.fontSize(tableConf.fontSize || 10).fillColor(tableField.style?.color || '#000000');
                            
                            const alignLabel = tableConf.footerTextAlign === 'left' ? 'left' : (tableConf.footerTextAlign === 'center' ? 'center' : 'left');
                            const alignValue = tableConf.footerTextAlign === 'left' ? 'right' : (tableConf.footerTextAlign === 'center' ? 'center' : 'right');
                            
                            if (tableConf.includeTotalNetto !== false) {
                                doc.text('Netto:', footerX, currentY, { width: fWidth / 2, align: alignLabel });
                                doc.text((data.netto || 0).toLocaleString('de-DE', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' €', footerX + fWidth / 2, currentY, { width: fWidth / 2, align: alignValue });
                                currentY += 15;
                            }
                            if (tableConf.includeTotalTax !== false) {
                                doc.text(`MwSt (${data.taxRate || 0}%):`, footerX, currentY, { width: fWidth / 2, align: alignLabel });
                                doc.text((data.tax_sum || 0).toLocaleString('de-DE', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' €', footerX + fWidth / 2, currentY, { width: fWidth / 2, align: alignValue });
                                currentY += 15;
                            }
                            if (tableConf.includeTotalBrutto !== false) {
                                doc.font('Helvetica-Bold');
                                doc.text('Gesamt:', footerX, currentY, { width: fWidth / 2, align: alignLabel });
                                doc.text((data.brutto || 0).toLocaleString('de-DE', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' €', footerX + fWidth / 2, currentY, { width: fWidth / 2, align: alignValue });
                                doc.font('Helvetica'); // reset
                                currentY += 15;
                            }
                        }

                        doc.y = currentY;
                        drawBodyFields(bodyFieldsAfterTable, true);
                        doc.end();
                    }).catch((err) => {
                        console.error("Fehler beim Zeichnen der PDF-Tabelle:", err);
                        reject(err);
                    });
                } else {
                    drawBodyFields(bodyFieldsAfterTable, true);
                    doc.end();
                }
            } else {
                drawBodyFields(bodyFieldsBeforeTable, false);
                doc.end();
            }
        });
    } catch (err: any) { 
        return json({ error: err.message }, { status: 500 }); 
    }
};