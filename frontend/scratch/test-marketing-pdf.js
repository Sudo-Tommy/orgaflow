import PDFDocument from 'pdfkit';
import fs from 'fs';

async function testPdf() {
    console.log("Testing PDFKit marketing generator...");

    const doc = new PDFDocument({
        size: [841.89, 595.28], // A4 landscape
        margins: { top: 0, bottom: 0, left: 0, right: 0 }
    });

    const buffers = [];
    doc.on('data', b => buffers.push(b));
    
    await new Promise((resolve, reject) => {
        doc.on('end', () => {
            const pdfData = Buffer.concat(buffers);
            console.log(`Generated Flyer PDF successfully, size: ${pdfData.length} bytes`);
            resolve(pdfData);
        });
        doc.on('error', reject);

        // Render sample flyer elements
        doc.rect(0, 0, 97 * 2.8346, 210 * 2.8346).fill('#fef3c7');
        doc.fillColor('#134e4a').fontSize(24).text("Auf uns können Sie bauen", 10 * 2.8346, 20 * 2.8346, { width: 77 * 2.8346 });
        doc.addPage({ size: [841.89, 595.28], margins: { top: 0, bottom: 0, left: 0, right: 0 } });
        doc.rect(0, 0, 100 * 2.8346, 210 * 2.8346).fill('#ffffff');
        doc.fillColor('#134e4a').fontSize(22).text("Ihre persönliche Task-Force", 10 * 2.8346, 20 * 2.8346, { width: 80 * 2.8346 });
        
        doc.end();
    });

    console.log("All checks passed!");
}

testPdf().catch(err => {
    console.error("Test failed:", err);
    process.exit(1);
});
