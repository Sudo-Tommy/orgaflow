import PDFDocument from 'pdfkit';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request }) => {
    try {
        // Empfängt das Layout-JSON (aus PocketBase) und die konkreten Daten (Rechnungsnr, Summe etc.)
        const { templateJson, data } = await request.json();

        return new Promise((resolve, reject) => {
            // 1. PDFKit Dokument initialisieren
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
                        'Content-Disposition': 'inline; filename="dokument.pdf"'
                    }
                }));
            });
            doc.on('error', reject);

            // 2. Generische Render-Logik (Der Interpreter)
            const fields = templateJson.fields || [];
            
            for (const field of fields) {
                if (field.type === 'text') {
                    // Platzhalter ersetzen (z.B. {{invoice.total}} -> 150,00 €)
                    let text = field.content || '';
                    for (const [key, val] of Object.entries(data)) {
                        text = text.replace(new RegExp(`{{${key}}}`, 'g'), String(val));
                    }

                    doc.fontSize(field.style.fontSize || 12)
                       .fillColor(field.style.color || '#000000')
                       .text(text, field.x, field.y, {
                           width: field.w,
                           height: field.h,
                           align: field.style.textAlign || 'left'
                       });
                       
                } else if (field.type === 'logo') {
                    // Bilder via Base64 aus den gelieferten 'data' zeichnen
                    if (data.companyLogoBase64) {
                        try {
                            const imgBuffer = Buffer.from(data.companyLogoBase64, 'base64');
                            doc.image(imgBuffer, field.x, field.y, {
                                fit: [field.w, field.h],
                                align: 'center',
                                valign: 'center'
                            });
                        } catch (e) {
                            console.warn("Konnte Logo nicht rendern", e);
                        }
                    }
                } else if (field.type === 'table') {
                    // Hier kommt deine Paginierungs-Logik für PDFKit hin. 
                    // Tipp: Für PDFKit gibt es das Plugin 'pdfkit-table', das dir das 
                    // manuelle Zeichnen von Linien und Seitenumbrüchen komplett abnimmt!
                    // tableRenderer(doc, field, data.positions);
                }
            }

            // 3. Dokument abschließen und streamen
            doc.end();
        });
    } catch (err: any) {
        return json({ error: err.message }, { status: 500 });
    }
}