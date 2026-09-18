import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getAdminPb } from '../pb.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STAMP_PATH = path.resolve(__dirname, '../../assets/storno-stamp.png');

/**
 * Öffnet die bestehende Rechnungs-PDF aus PocketBase, brennt den "STORNIERT"-Stempel
 * groß und zentriert auf die Rechnungsseite und speichert die Datei in PocketBase neu.
 */
export async function stampExistingInvoicePdf(invoiceId) {
    if (!invoiceId) throw new Error("Keine Rechnungs-ID übergeben.");

    const pb = await getAdminPb();
    const invoice = await pb.collection('invoices').getOne(invoiceId, { requestKey: null });

    if (!invoice || !invoice.pdf) {
        return { success: false, reason: "Keine PDF für diese Rechnung vorhanden." };
    }

    const pdfList = Array.isArray(invoice.pdf) ? invoice.pdf : [invoice.pdf];
    if (pdfList.length === 0 || !pdfList[0]) {
        return { success: false, reason: "PDF-Liste ist leer." };
    }

    const mainPdfFilename = pdfList[0];
    const fileUrl = pb.files.getURL(invoice, mainPdfFilename);

    // 1. Original-PDF herunterladen
    const resp = await fetch(fileUrl);
    if (!resp.ok) {
        throw new Error(`Konnte Original-PDF nicht abrufen: ${resp.statusText}`);
    }
    const pdfBytes = await resp.arrayBuffer();

    // 2. Mit pdf-lib öffnen
    const pdfDoc = await PDFDocument.load(pdfBytes);

    // 3. Stempel-Grafik einbetten
    if (!fs.existsSync(STAMP_PATH)) {
        throw new Error(`Stempel-Grafik nicht gefunden unter: ${STAMP_PATH}`);
    }
    const stampBuffer = fs.readFileSync(STAMP_PATH);
    const stampImage = await pdfDoc.embedPng(stampBuffer);

    // 4. Stempel auf die Seiten aufbringen (dominant zentriert)
    const pages = pdfDoc.getPages();
    for (const page of pages) {
        const { width, height } = page.getSize();
        // Groß und zentriert: ca. 65-70% der Seitenbreite (max 420 pt)
        const stampW = Math.min(width * 0.68, 420);
        const stampH = stampW * (551 / 646);
        const stampX = (width - stampW) / 2;
        const stampY = (height - stampH) / 2;

        page.drawImage(stampImage, {
            x: stampX,
            y: stampY,
            width: stampW,
            height: stampH,
            opacity: 0.85
        });
    }

    // 5. Modifizierte PDF exportieren
    const stampedPdfBytes = await pdfDoc.save();

    // 6. In PocketBase aktualisieren (mit FormData, um das File zu ersetzen)
    const formData = new FormData();
    const stampedBlob = new Blob([stampedPdfBytes], { type: 'application/pdf' });
    formData.append('pdf', stampedBlob, mainPdfFilename);

    // Falls ein Zeitnachweis als zweites PDF existierte, diesen beibehalten
    if (pdfList.length > 1) {
        for (let i = 1; i < pdfList.length; i++) {
            const extraFilename = pdfList[i];
            const extraUrl = pb.files.getURL(invoice, extraFilename);
            const extraResp = await fetch(extraUrl).catch(() => null);
            if (extraResp && extraResp.ok) {
                const extraBytes = await extraResp.arrayBuffer();
                formData.append('pdf', new Blob([extraBytes], { type: 'application/pdf' }), extraFilename);
            }
        }
    }

    formData.append('status', 'Storniert');

    await pb.collection('invoices').update(invoiceId, formData);

    return { 
        success: true, 
        invoiceId, 
        filename: mainPdfFilename 
    };
}
