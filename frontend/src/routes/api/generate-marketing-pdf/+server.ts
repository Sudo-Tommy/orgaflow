import PDFDocument from 'pdfkit';
import type { RequestHandler } from '@sveltejs/kit';
import fs from 'fs';
import path from 'path';

function sanitizePdfText(text: string): string {
    if (!text) return '';
    return text
        .replace(/[\u201C\u201D\u201E\u00AB\u00BB]/g, '"')
        .replace(/[\u2018\u2019\u201A\u2039\u203A]/g, "'")
        .replace(/[\u2013\u2014\u2015]/g, '-')
        .replace(/[\u2022\u25CF\u25AA\u25AB\u2023]/g, '-')
        .replace(/\u2026/g, '...')
        .replace(/\u00A0/g, ' ')
        .replace(/\u2192/g, '->')
        .replace(/[\u2713\u2714]/g, '[x]')
        .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDE4F]|\uD83D[\uDE80-\uDEFF]|\uD83E[\uDD00-\uDDFF]/g, '');
}

function cleanBase64Image(base64Str: string | null | undefined): Buffer | null {
    if (!base64Str) return null;
    try {
        const clean = base64Str.replace(/^data:image\/[a-zA-Z0-9+]+;base64,/, '').trim();
        if (!clean) return null;
        return Buffer.from(clean, 'base64');
    } catch {
        return null;
    }
}

const MM_TO_PT = 2.83464567;

export const POST: RequestHandler = async ({ request }) => {
    try {
        const { format, formatData, sheets } = await request.json();

        return new Promise((resolve, reject) => {
            let doc: InstanceType<typeof PDFDocument>;
            let filename = 'Werbemittel.pdf';

            if (format === 'flyer') {
                filename = 'Flyer-Seniorenassistenz-Wickelfalz.pdf';
                doc = new PDFDocument({
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
                                try {
                                    const favPath = path.resolve('static/favicon.png');
                                    if (fs.existsSync(favPath)) {
                                        imgBuffer = fs.readFileSync(favPath);
                                    }
                                } catch (e) {
                                    console.warn("Konnte favicon nicht lesen:", e);
                                }
                            }
                            if (imgBuffer) {
                                try {
                                    doc.image(imgBuffer, x, y, {
                                        fit: [w, h],
                                        align: el.textAlign === 'center' ? 'center' : (el.textAlign === 'right' ? 'right' : 'left'),
                                        valign: 'center'
                                    });
                                } catch (e) {
                                    console.warn("Konnte Flyer-Bild nicht rendern:", e);
                                }
                            }
                        }
                    }
                }

            } else if (format === 'poster') {
                filename = 'Plakat-Aushang-A4.pdf';
                doc = new PDFDocument({
                    size: 'A4', // 595.28 x 841.89
                    margins: { top: 40, left: 45, right: 45, bottom: 40 }
                });

                const pData = formatData?.poster || {};

                // Top Badge
                doc.save();
                doc.fillColor('#fef3c7');
                doc.roundedRect(170, 40, 255, 24, 12).fill();
                doc.font('Helvetica-Bold').fontSize(9).fillColor('#b45309');
                doc.text('OFFIZIELLE SENIORENASSISTENZ', 170, 47, { width: 255, align: 'center' });
                doc.restore();

                // Headline
                doc.font('Helvetica-Bold').fontSize(24).fillColor('#0f172a');
                doc.text(sanitizePdfText(pData.headline || 'Gemeinsam statt einsam'), 45, 80, { width: 505, align: 'center', lineGap: 3 });

                // Subheadline
                doc.font('Helvetica').fontSize(13).fillColor('#475569');
                doc.text(sanitizePdfText(pData.subheadline || 'Ihre vertrauensvolle Unterstützung im Alltag'), 45, 145, { width: 505, align: 'center' });

                // Divider
                doc.save();
                doc.strokeColor('#f59e0b').lineWidth(2);
                doc.moveTo(150, 185).lineTo(445, 185).stroke();
                doc.restore();

                // Leistungen Überschrift
                doc.font('Helvetica-Bold').fontSize(11).fillColor('#64748b');
                doc.text('UNSERE LEISTUNGEN FÜR SIE:', 50, 205);

                // Bulletpoints
                let currentY = 225;
                const bullets = Array.isArray(pData.bulletpoints) ? pData.bulletpoints : [
                    'Begleitung zu Arztterminen & Behörden',
                    'Hilfe bei Anträgen & Papierkram',
                    'Gemeinsame Spaziergänge & Alltagsfreude',
                    'Entlastung für pflegende Angehörige'
                ];

                for (const bp of bullets) {
                    doc.save();
                    doc.fillColor('#f8fafc').strokeColor('#e2e8f0').lineWidth(1);
                    doc.roundedRect(50, currentY, 495, 36, 8).fillAndStroke();

                    doc.font('Helvetica-Bold').fontSize(11).fillColor('#059669');
                    doc.text('[x]', 65, currentY + 11);

                    doc.font('Helvetica-Bold').fontSize(11).fillColor('#1e293b');
                    doc.text(sanitizePdfText(bp), 90, currentY + 11, { width: 440 });
                    doc.restore();
                    currentY += 44;
                }

                // Highlight Box
                currentY += 10;
                doc.save();
                doc.fillColor('#312e81');
                doc.roundedRect(50, currentY, 495, 80, 12).fill();

                doc.font('Helvetica-Bold').fontSize(9).fillColor('#a5b4fc');
                doc.text('PFLEGEKASSEN-VORTEIL', 50, currentY + 15, { width: 495, align: 'center' });

                doc.font('Helvetica-Bold').fontSize(14).fillColor('#ffffff');
                doc.text(sanitizePdfText(pData.highlight_box || 'Bis zu 131 € monatlich über den Entlastungsbetrag ab Pflegegrad 1 erstattungsfähig!'), 70, currentY + 34, { width: 455, align: 'center', lineGap: 2 });
                doc.restore();

                // Kontaktbox Unten
                currentY += 100;
                doc.save();
                doc.fillColor('#f8fafc').strokeColor('#cbd5e1').lineWidth(1.5);
                doc.roundedRect(50, currentY, 495, 110, 12).fillAndStroke();

                doc.font('Helvetica-Bold').fontSize(11).fillColor('#1e1b4b');
                doc.text('JETZT KOSTENFREIEN BERATUNGSTERMIN VEREINBAREN', 50, currentY + 14, { width: 495, align: 'center' });

                doc.font('Helvetica-Bold').fontSize(11).fillColor('#0f172a');
                doc.text('Tommy Jenzsch (Halle): 0151 57515432   ·   Doreen Jenzsch (Wittenberg): 0160 7303830', 50, currentY + 40, { width: 495, align: 'center' });

                doc.font('Helvetica').fontSize(10).fillColor('#475569');
                doc.text('E-Mail: info@ihre-seniorenassistenz.com   ·   Web: www.ihre-seniorenassistenz.com', 50, currentY + 65, { width: 495, align: 'center' });

                doc.font('Helvetica').fontSize(8.5).fillColor('#94a3b8');
                doc.text('Anerkannter Dienst für Angebote zur Unterstützung im Alltag gem. § 45a SGB XI', 50, currentY + 88, { width: 495, align: 'center' });
                doc.restore();

            } else if (format === 'factsheet') {
                filename = 'Infoblatt-Pflegekassen-A4.pdf';
                doc = new PDFDocument({
                    size: 'A4',
                    margins: { top: 45, left: 50, right: 50, bottom: 45 }
                });

                const fData = formatData?.factsheet || {};

                // Header
                doc.font('Helvetica-Bold').fontSize(18).fillColor('#0f172a');
                doc.text(sanitizePdfText(fData.title || 'Information zum Entlastungsbetrag (§ 45b SGB XI)'), 50, 45, { width: 350 });

                doc.font('Helvetica').fontSize(9).fillColor('#64748b');
                doc.text('Information für Klienten, Angehörige & Betreuer', 50, 75);

                doc.font('Helvetica-Bold').fontSize(9).fillColor('#312e81');
                doc.text('Seniorenassistenz Jenzsch\nHalle (Saale) & Wittenberg', 400, 45, { width: 145, align: 'right' });

                // Divider
                doc.save();
                doc.strokeColor('#4f46e5').lineWidth(2);
                doc.moveTo(50, 95).lineTo(545, 95).stroke();
                doc.restore();

                let y = 115;
                // Section 1
                doc.font('Helvetica-Bold').fontSize(12).fillColor('#1e1b4b');
                doc.text(sanitizePdfText(fData.section1_title || '1. Wer hat Anspruch?'), 50, y);
                y += 18;
                doc.font('Helvetica').fontSize(10).fillColor('#334155');
                doc.text(sanitizePdfText(fData.section1_text || 'Jede Person mit einem anerkannten Pflegegrad (1 bis 5) hat Anspruch auf den monatlichen Entlastungsbetrag von bis zu 131 Euro.'), 50, y, { width: 495, lineGap: 3 });
                y = doc.y + 20;

                // Section 2
                doc.font('Helvetica-Bold').fontSize(12).fillColor('#1e1b4b');
                doc.text(sanitizePdfText(fData.section2_title || '2. Welche Leistungen können genutzt werden?'), 50, y);
                y += 18;
                const items = Array.isArray(fData.section2_items) ? fData.section2_items : [
                    'Alltagsbegleitung (Einkäufe, Arztfahrten, Botengänge)',
                    'Unterstützung bei Behörden- und Kassenanträgen',
                    'Mobilisation & geistige Aktivierung im gewohnten Umfeld',
                    'Entlastung von pflegenden Angehörigen'
                ];
                for (const it of items) {
                    doc.font('Helvetica').fontSize(10).fillColor('#334155');
                    doc.text('•  ' + sanitizePdfText(it), 65, y, { width: 480, lineGap: 2 });
                    y = doc.y + 6;
                }
                y += 14;

                // Section 3
                doc.font('Helvetica-Bold').fontSize(12).fillColor('#1e1b4b');
                doc.text(sanitizePdfText(fData.section3_title || '3. Wie erfolgt die Abrechnung?'), 50, y);
                y += 18;
                doc.font('Helvetica').fontSize(10).fillColor('#334155');
                doc.text(sanitizePdfText(fData.section3_text || 'Die Abrechnung erfolgt transparent: Als anerkannter Dienst können wir entweder direkt mit Ihrer Pflegekasse abrechnen oder Sie reichen unsere Monatsrechnung zur Erstattung ein.'), 50, y, { width: 495, lineGap: 3 });
                y = doc.y + 35;

                // Footer
                doc.save();
                doc.strokeColor('#e2e8f0').lineWidth(1);
                doc.moveTo(50, 740).lineTo(545, 740).stroke();

                doc.font('Helvetica').fontSize(8.5).fillColor('#64748b');
                doc.text('Seniorenassistenz Jenzsch  ·  Dreyhauptstr. 2, 06108 Halle (Saale)  ·  Tel: 0345 / 213 895 20  ·  info@ihre-seniorenassistenz.com', 50, 755, { width: 495, align: 'center' });
                doc.restore();

            } else if (format === 'insert') {
                filename = 'Beileger-Postkarte-A6.pdf';
                doc = new PDFDocument({
                    size: [297.64, 419.53], // DIN A6 Portrait
                    margins: { top: 20, left: 20, right: 20, bottom: 20 }
                });

                const iData = formatData?.insert || {};

                // Rahmen
                doc.save();
                doc.strokeColor('#312e81').lineWidth(2);
                doc.roundedRect(12, 12, 273.64, 395.53, 10).stroke();
                doc.restore();

                // Logo/Sub
                doc.font('Helvetica-Bold').fontSize(8).fillColor('#4f46e5');
                doc.text('SENIORENASSISTENZ JENZSCH', 20, 26, { width: 257.64, align: 'center' });

                // Title
                doc.font('Helvetica-Bold').fontSize(14).fillColor('#0f172a');
                doc.text(sanitizePdfText(iData.title || 'Ihr persönlicher Begleiter im Alltag'), 20, 45, { width: 257.64, align: 'center', lineGap: 2 });

                // Subtitle
                doc.font('Helvetica').fontSize(9).fillColor('#475569');
                doc.text(sanitizePdfText(iData.subtitle || 'Für mehr Lebensqualität und Selbstbestimmung zu Hause.'), 20, 85, { width: 257.64, align: 'center' });

                // Divider
                doc.save();
                doc.strokeColor('#e2e8f0').lineWidth(1);
                doc.moveTo(35, 120).lineTo(262, 120).stroke();
                doc.restore();

                // Benefits
                let y = 135;
                const benefits = Array.isArray(iData.benefits) ? iData.benefits : [
                    'Persönlich, herzlich & zuverlässig',
                    'Abrechnung über alle Pflegekassen möglich',
                    'Flexible Termine nach Ihren Wünschen',
                    'Keine Mindestvertragslaufzeit'
                ];
                for (const b of benefits) {
                    doc.save();
                    doc.font('Helvetica-Bold').fontSize(9).fillColor('#059669');
                    doc.text('✓', 30, y);
                    doc.font('Helvetica-Bold').fontSize(9).fillColor('#1e293b');
                    doc.text(sanitizePdfText(b), 48, y, { width: 220, lineGap: 2 });
                    doc.restore();
                    y += 30;
                }

                // Footer Box
                doc.save();
                doc.fillColor('#f8fafc');
                doc.roundedRect(20, 315, 257.64, 75, 8).fill();

                doc.font('Helvetica-Bold').fontSize(9).fillColor('#0f172a');
                doc.text('Rufen Sie uns unverbindlich an:', 20, 325, { width: 257.64, align: 'center' });

                doc.font('Helvetica-Bold').fontSize(10).fillColor('#312e81');
                doc.text('0151 57515432  (Halle)\n0160 7303830  (Wittenberg)', 20, 342, { width: 257.64, align: 'center', lineGap: 2 });

                doc.font('Helvetica').fontSize(7.5).fillColor('#64748b');
                doc.text(sanitizePdfText(iData.footer || 'www.ihre-seniorenassistenz.com'), 20, 375, { width: 257.64, align: 'center' });
                doc.restore();

            } else if (format === 'voucher') {
                filename = 'Gutschein-Kennenlernen-A6.pdf';
                doc = new PDFDocument({
                    size: [419.53, 297.64], // DIN A6 Landscape
                    margins: { top: 20, left: 20, right: 20, bottom: 20 }
                });

                const vData = formatData?.voucher || {};

                // Warmer Hintergrund & Gestrichelter Rahmen
                doc.save();
                doc.fillColor('#fffbeb');
                doc.roundedRect(10, 10, 399.53, 277.64, 12).fill();

                doc.strokeColor('#f59e0b').lineWidth(1.5).dash(4, { space: 3 });
                doc.roundedRect(15, 15, 389.53, 267.64, 10).stroke();
                doc.restore();

                // Badge
                doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#92400e');
                doc.text('EINLADUNG ZUM KENNENLERNEN', 20, 32, { width: 379.53, align: 'center' });

                // Titel
                doc.font('Helvetica-Bold').fontSize(16).fillColor('#0f172a');
                doc.text(sanitizePdfText(vData.title || 'Gutschein für ein kostenfreies Erstgespräch'), 20, 52, { width: 379.53, align: 'center' });

                // Wert-Pille
                doc.save();
                doc.fillColor('#f59e0b');
                doc.roundedRect(140, 85, 140, 28, 14).fill();
                doc.font('Helvetica-Bold').fontSize(12).fillColor('#ffffff');
                doc.text(sanitizePdfText(vData.value || '100% Kostenfrei'), 140, 93, { width: 140, align: 'center' });
                doc.restore();

                // Beschreibung
                doc.font('Helvetica').fontSize(9).fillColor('#475569');
                doc.text(sanitizePdfText(vData.description || 'Lernen Sie uns und unsere Angebote bei einer gemütlichen Tasse Kaffee unverbindlich kennen.'), 40, 128, { width: 339.53, align: 'center', lineGap: 3 });

                // Gutscheincode-Box
                doc.save();
                doc.fillColor('#ffffff').strokeColor('#fde68a').lineWidth(1);
                doc.roundedRect(120, 180, 180, 36, 8).fillAndStroke();

                doc.font('Courier-Bold').fontSize(13).fillColor('#0f172a');
                doc.text(sanitizePdfText(vData.code || 'HALLO-ORGAFLOW'), 120, 192, { width: 180, align: 'center' });
                doc.restore();

                // Gültigkeit & Kontakt
                doc.font('Helvetica').fontSize(7.5).fillColor('#64748b');
                doc.text(sanitizePdfText(vData.validity || 'Gültig für Neukunden in Halle (Saale) & Wittenberg · Tel: 0151 57515432'), 20, 240, { width: 379.53, align: 'center' });
            } else {
                throw new Error('Unbekanntes Werbemittel-Format.');
            }

            const buffers: Buffer[] = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => {
                const pdfData = Buffer.concat(buffers);
                resolve(new Response(pdfData, {
                    headers: {
                        'Content-Type': 'application/pdf',
                        'Content-Disposition': `attachment; filename="${filename}"`
                    }
                }));
            });
            doc.on('error', reject);
            doc.end();
        });
    } catch (e: any) {
        console.error("Fehler beim Generieren des Werbemittel-PDFs:", e);
        return new Response(JSON.stringify({ error: e.message || 'PDF Generierung fehlgeschlagen.' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
