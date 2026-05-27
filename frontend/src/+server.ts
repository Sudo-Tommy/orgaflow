import PDFDocument from 'pdfkit-table';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request }) => {
    try {
        const { templateJson, data, isTimesheet } = await request.json();

        return new Promise((resolve, reject) => {
            const doc = new PDFDocument({
                size: templateJson.orientation === 'landscape' ? [842, 595] : [595, 842], // DIN A4
                margin: 0,
                autoFirstPage: true
            });

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

            const fields = templateJson.fields || [];
            
            // Helfer, um absolute Felder (Text & Logos) auf dem Canvas zu zeichnen
            const drawAbsoluteFields = (filterCondition: (f: any) => boolean) => {
                for (const field of fields.filter(filterCondition)) {
                    if (field.type === 'text') {
                        doc.fontSize(field.style?.fontSize || 12)
                           .fillColor(field.style?.color || '#000000')
                           .text(field.content, field.x, field.y, {
                               width: field.w,
                               height: field.h,
                               align: field.style?.textAlign || 'left'
                           });
                           
                    } else if (field.type === 'logo') {
                        const base64Str = field.imageBase64 || data.companyLogoBase64;
                        if (base64Str) {
                            try {
                                const imgBuffer = Buffer.from(base64Str, 'base64');
                                doc.image(imgBuffer, field.x, field.y, {
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
            };

            // Logische Trennung der Felder anhand der Tabellen-Y-Koordinate
            const tableField = fields.find((f: any) => f.type === 'table');
            const headerFields = fields.filter((f: any) => f.type !== 'table' && (!tableField || f.y < tableField.y));
            const footerFields = fields.filter((f: any) => f.type !== 'table' && tableField && f.y > 950);
            const bodyFields = fields.filter((f: any) => f.type !== 'table' && tableField && f.y >= tableField.y && f.y <= 950);

            // Zeichnet Kopf- und Fußzeile IMMER neu, wenn 'pdfkit-table' automatisch eine neue Seite umbricht!
            doc.on('pageAdded', () => {
                drawAbsoluteFields(f => headerFields.includes(f) || footerFields.includes(f));
            });

            // Initiale Kopf- und Fußzeile zeichnen
            drawAbsoluteFields(f => headerFields.includes(f) || footerFields.includes(f));

            if (tableField) {
                const tableConf = tableField.tableConfig || {};
                const positions = isTimesheet ? data.timesheetPositions : data.invoicePositions;
                
                if (positions && positions.length > 0) {
                    const tableData = {
                        headers: tableConf.columns.map((c: any) => ({
                            label: c.name,
                            property: c.type,
                            width: (c.width / 100) * tableField.w,
                            renderer: null,
                            align: c.align || 'left'
                        })),
                        datas: positions.map((pos: any) => {
                            let row: any = {};
                            for (const col of tableConf.columns) {
                                if (col.type === 'total') row[col.type] = pos.total.toLocaleString('de-DE', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' €';
                                else if (col.type === 'price') row[col.type] = pos.price;
                                else if (col.type === 'duration') row[col.type] = pos.duration;
                                else if (col.type === 'date') row[col.type] = pos.date;
                                else if (col.type === 'pos') row[col.type] = pos.pos.toString();
                                else if (col.type === 'title') row[col.type] = pos.title;
                                else row[col.type] = pos[col.type] || '';
                            }
                            return row;
                        }),
                    };
                    
                    if (!isTimesheet && (tableConf.includeTotalNetto || tableConf.includeTotalTax || tableConf.includeTotalBrutto)) {
                        tableData.datas.push({}); // Leere Puffer-Zeile
                        
                        if (tableConf.includeTotalNetto) {
                            let row: any = {};
                            tableConf.columns.forEach((c: any, i: number) => {
                                if (i === tableConf.columns.length - 2) row[c.type] = 'Netto:';
                                else if (i === tableConf.columns.length - 1) row[c.type] = (data.netto || 0).toLocaleString('de-DE', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' €';
                                else row[c.type] = '';
                            });
                            tableData.datas.push(row);
                        }
                        if (tableConf.includeTotalTax) {
                            let row: any = {};
                            tableConf.columns.forEach((c: any, i: number) => {
                                if (i === tableConf.columns.length - 2) row[c.type] = `MwSt (${data.taxRate || 0}%):`;
                                else if (i === tableConf.columns.length - 1) row[c.type] = (data.tax_sum || 0).toLocaleString('de-DE', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' €';
                                else row[c.type] = '';
                            });
                            tableData.datas.push(row);
                        }
                        if (tableConf.includeTotalBrutto) {
                            let row: any = {};
                            tableConf.columns.forEach((c: any, i: number) => {
                                if (i === tableConf.columns.length - 2) row[c.type] = 'Gesamt:';
                                else if (i === tableConf.columns.length - 1) row[c.type] = (data.brutto || 0).toLocaleString('de-DE', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' €';
                                else row[c.type] = '';
                            });
                            tableData.datas.push(row);
                        }
                    }

                    // WICHTIG: Cursor-Position für die Tabelle setzen
                    doc.x = tableField.x;
                    doc.y = tableField.y;

                    doc.table(tableData, {
                        prepareHeader: () => doc.font('Helvetica-Bold').fontSize(tableConf.fontSize || 10).fillColor(tableConf.headerTextColor || '#000000'),
                        prepareRow: () => doc.font('Helvetica').fontSize(tableConf.fontSize || 10).fillColor(tableField.style?.color || '#000000'),
                        width: tableField.w,
                        padding: tableConf.cellPadding || 5,
                        columnSpacing: 5,
                        hideHeader: !tableConf.showHeaders,
                        divider: { header: { disabled: false, width: 1, opacity: 1 }, horizontal: { disabled: false, width: 0.5, opacity: 0.5 } }
                    }).then(() => {
                        // Nachdem die Tabelle fertig ist, platzieren wir den Schlusstext exakt unter der dynamischen Tabellen-Länge!
                        if (bodyFields.length > 0) {
                            const startY = doc.y + 30;
                            const minBodyY = Math.min(...bodyFields.map((f: any) => f.y));
                            for (const field of bodyFields) {
                                if (field.type === 'text') doc.fontSize(field.style?.fontSize || 12).fillColor(field.style?.color || '#000000').text(field.content, field.x, startY + (field.y - minBodyY), { width: field.w, height: field.h, align: field.style?.textAlign || 'left' });
                            }
                        }
                        doc.end();
                    });
                } else { doc.end(); }
            } else { doc.end(); }
        });
    } catch (err: any) { return json({ error: err.message }, { status: 500 }); }
}