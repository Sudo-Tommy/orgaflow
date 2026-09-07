import PDFDocument from 'pdfkit';

const doc = new PDFDocument({ size: 'A4' });
const buffers = [];
doc.on('data', b => buffers.push(b));
doc.on('end', () => console.log("PDF finished successfully!"));
doc.on('error', err => console.error("PDF error:", err));

try {
    doc.text("Test with ☕ and ⚡ and 📞 and € and äöüß");
    doc.end();
} catch (e) {
    console.error("Caught synchronous error:", e.message);
}
