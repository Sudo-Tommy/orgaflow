import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { generateVmaPdf } from '../services/pdf/vma/vmaPdfGenerator.js';
import { generateDocumentPdf } from '../services/pdf/doc/docPdfGenerator.js';
import { generateMarketingPdf } from '../services/pdf/marketing/marketingPdfGenerator.js';
import { stampExistingInvoicePdf } from '../services/pdf/invoiceStornoPdfService.js';

const router = Router();

router.post(['/api/emails/vma/pdf', '/api/vma/pdf', '/portal/vma/pdf'], requireAuth, async (req, res) => {
    try {
        await generateVmaPdf(req.body, res);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post(['/api/emails/generate-pdf', '/api/generate-pdf', '/generate-pdf'], requireAuth, async (req, res) => {
    try {
        if (!req.body?.templateJson) return res.status(400).json({ error: 'templateJson erforderlich.' });
        await generateDocumentPdf(req.body, res);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post(['/api/emails/generate-marketing-pdf', '/api/generate-marketing-pdf', '/generate-marketing-pdf'], (req, res) => {
    try {
        generateMarketingPdf(req.body || {}, res);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post(['/api/emails/invoices/:id/stamp-storno', '/api/invoices/:id/stamp-storno'], requireAuth, async (req, res) => {
    try {
        const result = await stampExistingInvoicePdf(req.params.id);
        res.json(result);
    } catch (err) {
        console.error("Fehler beim Stempeln der Rechnung:", err);
        res.status(500).json({ error: err.message });
    }
});

export default router;
