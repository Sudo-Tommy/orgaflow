import type { RequestHandler } from '@sveltejs/kit';
import type PDFDocument from 'pdfkit';
import { createFlyerDoc } from './renderFlyerPdf';
import {
    createPosterDoc,
    createFactsheetDoc,
    createInsertDoc,
    createVoucherDoc
} from './renderDocumentFormats';

interface FormatConfig {
    filename: string;
    createDoc: (formatData: any, sheets?: any[]) => InstanceType<typeof PDFDocument>;
}

const FORMAT_CONFIGS: Record<string, FormatConfig> = {
    flyer: {
        filename: 'Flyer-Seniorenassistenz-Wickelfalz.pdf',
        createDoc: (_, sheets) => createFlyerDoc(sheets || [])
    },
    poster: {
        filename: 'Plakat-Aushang-A4.pdf',
        createDoc: (data) => createPosterDoc(data?.poster)
    },
    factsheet: {
        filename: 'Infoblatt-Pflegekassen-A4.pdf',
        createDoc: (data) => createFactsheetDoc(data?.factsheet)
    },
    insert: {
        filename: 'Beileger-Postkarte-A6.pdf',
        createDoc: (data) => createInsertDoc(data?.insert)
    },
    voucher: {
        filename: 'Gutschein-Kennenlernen-A6.pdf',
        createDoc: (data) => createVoucherDoc(data?.voucher)
    }
};

export const POST: RequestHandler = async ({ request }) => {
    try {
        const { format, formatData, sheets } = await request.json();
        const config = FORMAT_CONFIGS[format];

        if (!config) {
            return new Response(JSON.stringify({ error: 'Unbekanntes Werbemittel-Format.' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const doc = config.createDoc(formatData, sheets);

        return new Promise((resolve, reject) => {
            const buffers: Buffer[] = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => {
                const pdfData = Buffer.concat(buffers);
                resolve(new Response(pdfData, {
                    headers: {
                        'Content-Type': 'application/pdf',
                        'Content-Disposition': `attachment; filename="${config.filename}"`
                    }
                }));
            });
            doc.on('error', reject);
            doc.end();
        });
    } catch (e: any) {
        console.error('Fehler beim Generieren des Werbemittel-PDFs:', e);
        return new Response(JSON.stringify({ error: e.message || 'PDF Generierung fehlgeschlagen.' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
