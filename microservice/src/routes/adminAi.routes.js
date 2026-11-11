import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { verifySuperadminAccess } from '../middleware/superadminAuth.js';
import { getAdminPb } from '../services/pb.js';
import { generateMarketingContent } from '../services/ai/marketingService.js';
import { generateFinancialForecast } from '../services/ai/forecastService.js';
import { lookupGoogleContact, summarizeCalendarRequest } from '../services/ai/lookupService.js';
import { generateWeeklyFeedbackDigest } from '../../feedbackDigestService.js';
import { generateSingleFeedbackPrompt } from '../../singleFeedbackPromptService.js';
import { generateSolutionConcept } from '../../solutionConceptService.js';

const router = Router();

router.post(['/api/emails/ai/generate-marketing', '/api/ai/generate-marketing'], async (req, res) => {
    try {
        const pb = await getAdminPb();
        res.json(await generateMarketingContent(req.body || {}, pb));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post(['/api/emails/ai/forecast-speculation', '/api/ai/forecast-speculation'], async (req, res) => {
    try {
        const pb = await getAdminPb();
        res.json(await generateFinancialForecast(req.body || {}, pb));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post(['/api/emails/admin/system-prompts/generate', '/api/admin/system-prompts/generate'], verifySuperadminAccess, async (req, res) => {
    try {
        res.json(await generateWeeklyFeedbackDigest(req.body || {}));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post(['/api/emails/admin/feedback-prompt/generate', '/api/admin/feedback-prompt/generate'], verifySuperadminAccess, async (req, res) => {
    try {
        res.json(await generateSingleFeedbackPrompt(req.body || {}));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post(['/api/emails/admin/generate-solution', '/api/emails/generate-solution', '/api/v1/generate-solution', '/api/admin/generate-solution'], async (req, res) => {
    try {
        res.json(await generateSolutionConcept(req.body || {}));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post(['/api/emails/admin/feedback-react', '/api/admin/feedback-react'], async (req, res) => {
    try {
        const { id, source = 'feedback', newStatus, adminNotes, replyMessage } = req.body;
        const pb = await getAdminPb();
        const col = source === 'inquiry' ? 'inquiries' : source === 'appointment_request' ? 'appointment_requests' : 'feedbacks';
        const payload = {};
        if (newStatus) payload.status = newStatus;
        if (adminNotes) payload.admin_notes = adminNotes;
        if (replyMessage) payload[source === 'inquiry' ? 'draft_reply' : 'admin_reply'] = replyMessage;
        const updated = await pb.collection(col).update(id, payload).catch(() => null);
        res.json({ success: true, updatedRecord: updated });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post(['/api/emails/ai/summarize-request', '/api/ai/summarize-request', '/api/emails/summarize-request'], requireAuth, async (req, res) => {
    try {
        const pb = await getAdminPb();
        const record = req.body.id ? await pb.collection('appointment_requests').getOne(req.body.id).catch(() => null) : req.body;
        if (!record) return res.status(400).json({ error: 'Anfrage nicht gefunden.' });
        const summary = await summarizeCalendarRequest(record, pb);
        res.json({ success: true, summary });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post(['/api/contacts/google-lookup', '/api/emails/contacts/google-lookup', '/api/ai/google-contact-lookup'], requireAuth, async (req, res) => {
    try {
        const results = await lookupGoogleContact(req.body || {});
        res.json({ success: true, results });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
