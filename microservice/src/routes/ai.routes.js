import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getAdminPb } from '../services/pb.js';
import { transcribeAudioOrText } from '../services/ai/transcribeService.js';
import { processReceiptImage } from '../services/ai/receiptService.js';
import { processCustomerInquiry } from '../services/ai/inquiryService.js';
import { generateAppointmentChecklist } from '../../appointmentChecklistService.js';
import { generateAiGreeting } from '../services/ai/greetingService.js';
import {
    chatWithLiveSupport,
    finalizeLiveSupportTicket,
    connectOrGetLiveSession,
    closeLiveSession,
    getLiveSessionStatus,
    buildCompactLiveInstruction
} from '../services/ai/liveSupportService.js';

const router = Router();

router.post('/api/emails/ai/transcribe', requireAuth, async (req, res) => {
    try {
        const text = await transcribeAudioOrText(req.body);
        res.json({ success: true, text });
    } catch (error) {
        console.error("[KI Transcribe] Fehler:", error);
        res.status(500).json({ error: "Fehler bei der KI-Generierung: " + error.message });
    }
});

router.post(['/api/emails/ai/receipt', '/api/ai/receipt'], requireAuth, async (req, res) => {
    try {
        const data = await processReceiptImage(req.body);
        res.json(data);
    } catch (error) {
        console.error("[KI Receipt] Fehler:", error);
        res.status(500).json({ error: "KI Fehler: " + (error.message || "Unbekannter Fehler") });
    }
});

router.post(['/api/emails/ai/process-inquiry', '/api/ai/process-inquiry'], requireAuth, async (req, res) => {
    try {
        const pbAdmin = await getAdminPb();
        const data = await processCustomerInquiry(req.body, pbAdmin);
        res.json(data);
    } catch (error) {
        console.error("[KI Process Inquiry] Fehler:", error);
        res.status(500).json({ error: "Fehler bei der KI-Anfragenverarbeitung: " + error.message });
    }
});

router.post([
    '/api/v1/appointments/:id/generate-checklist',
    '/api/emails/v1/appointments/:id/generate-checklist',
    '/api/emails/appointments/:id/generate-checklist',
    '/api/appointments/:id/generate-checklist'
], requireAuth, async (req, res) => {
    try {
        const appointmentId = req.params.id;
        const previousAppointmentId = req.body?.previousAppointmentId || req.query?.previousAppointmentId;
        if (!appointmentId) return res.status(400).json({ error: "Termin-ID fehlt." });

        const pbAdmin = await getAdminPb();
        let appRecord;
        try {
            appRecord = await pbAdmin.collection('appointments').getOne(appointmentId, {
                expand: 'client,tasks,appointment_at,user,drive_record,time_record',
                requestKey: null
            });
        } catch (fetchErr) {
            if (fetchErr?.status === 404) {
                return res.status(404).json({ error: "Termin nicht gefunden oder bereits gelöscht.", notFound: true, checklist: [] });
            }
            throw fetchErr;
        }

        const checklist = await generateAppointmentChecklist(appointmentId, pbAdmin, { previousAppointmentId, appRecord });
        try {
            await pbAdmin.collection('appointments').update(appointmentId, { checklist });
        } catch (updateErr) {
            if (updateErr?.status === 404) {
                return res.status(404).json({ error: "Termin wurde zwischenzeitlich gelöscht.", notFound: true, checklist: [] });
            }
            throw updateErr;
        }
        res.json({ success: true, appointment_id: appointmentId, checklist });
    } catch (error) {
        if (error?.status === 404) {
            return res.status(404).json({ error: "Termin nicht gefunden oder gelöscht.", notFound: true, checklist: [] });
        }
        console.error("[Checklist Generator] Fehler:", error);
        res.status(500).json({ error: "Fehler bei der Checklisten-Generierung: " + error.message });
    }
});

router.post(['/api/emails/ai/greeting', '/api/ai/greeting'], async (req, res) => {
    try {
        let pbAdmin = null;
        try { pbAdmin = await getAdminPb(); } catch {}
        const data = await generateAiGreeting(req.body, pbAdmin);
        res.json(data);
    } catch (error) {
        res.json({
            success: true,
            greeting: {
                greeting: "Guten Tag",
                subGreeting: "Schön, dass du da bist! Ein neuer Tag voller Möglichkeiten.",
                emoji: "☕",
                fromAi: false
            }
        });
    }
});

// Persistente Live-API Session Steuerung (Warmup / Status / Reset / Close)
router.post([
    '/api/ai/live-support/session',
    '/api/emails/ai/live-support/session'
], async (req, res) => {
    const { sessionId = 'default', action = 'connect', context = {} } = req.body || {};
    try {
        if (action === 'close' || action === 'reset') {
            closeLiveSession(sessionId);
            if (action === 'close') {
                return res.json({ connected: false, model: '', modelLabel: 'Getrennt' });
            }
        }
        const entry = await connectOrGetLiveSession({
            sessionId,
            systemInstruction: buildCompactLiveInstruction(context)
        });
        res.json({
            connected: true,
            model: entry.model,
            modelLabel: entry.modelLabel
        });
    } catch (err) {
        console.warn("[Omni Live Session] Verbindungsfehler:", err.message);
        const status = getLiveSessionStatus(sessionId);
        res.status(503).json({
            connected: false,
            model: status.model,
            modelLabel: status.modelLabel,
            error: err.message || 'Live-API aktuell nicht erreichbar.'
        });
    }
});

// Echtzeit-Livechat Stream (SSE Wort-für-Wort über Gemini Live-API)
router.post([
    '/api/ai/live-support/stream',
    '/api/emails/ai/live-support/stream'
], async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    if (typeof res.flushHeaders === 'function') res.flushHeaders();

    const sendEvent = (payload) => {
        try {
            res.write(`data: ${JSON.stringify(payload)}\n\n`);
        } catch {}
    };

    try {
        let pbAdmin = null;
        try { pbAdmin = await getAdminPb(); } catch {}
        const result = await chatWithLiveSupport({
            ...(req.body || {}),
            pbAdmin,
            onStatus: (statusText) => sendEvent({ type: 'status', statusText }),
            onMeta: (meta) => sendEvent({ type: 'meta', ...meta }),
            onChunk: (delta, fullText, model, modelLabel) => {
                sendEvent({ type: 'chunk', delta, text: fullText, model, modelLabel });
            }
        });
        sendEvent({ type: 'done', ...result });
        res.end();
    } catch (error) {
        console.error("[Omni Live Stream] Fehler:", error.message);
        sendEvent({
            type: 'error',
            liveError: true,
            error: `Die Gemini Live-API ist momentan nicht erreichbar (${error.message || 'Verbindungsfehler'}). Bitte versuche es in wenigen Sekunden erneut.`
        });
        res.end();
    }
});

// Synchroner Live-API Endpunkt (ebenfalls 100% über Gemini Live-API ohne Fake-Antworten)
router.post([
    '/api/ai/live-support/chat',
    '/api/emails/ai/live-support/chat',
    '/api/emails/api/live-support/chat',
    '/api/emails/api/ai-live-support/chat'
], async (req, res) => {
    try {
        let pbAdmin = null;
        try { pbAdmin = await getAdminPb(); } catch {}
        const result = await chatWithLiveSupport({ ...(req.body || {}), pbAdmin });
        res.json(result);
    } catch (error) {
        console.error("[KI Live Support Chat] Fehler:", error);
        res.status(503).json({
            liveError: true,
            reply: `Die Gemini Live-API ist momentan nicht erreichbar (${error.message || 'Verbindungsfehler'}). Bitte klicke auf „Erneut versuchen“.`,
            isClarified: false,
            problemSummary: "",
            suggestedCategory: "Technik / Fehler",
            suggestedPriority: "normal",
            actionLink: null
        });
    }
});

router.post([
    '/api/ai/live-support/finalize',
    '/api/emails/ai/live-support/finalize',
    '/api/emails/api/live-support/finalize',
    '/api/emails/api/ai-live-support/finalize'
], async (req, res) => {
    try {
        const pbAdmin = await getAdminPb();
        const result = await finalizeLiveSupportTicket({ ...(req.body || {}), pbAdmin });
        res.json(result);
    } catch (error) {
        console.error("[KI Live Support Finalize] Fehler:", error);
        res.status(500).json({ error: error.message || "Fehler bei der Ticket-Finalisierung." });
    }
});

export default router;
