import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getAdminPb } from '../services/pb.js';
import { sendEmailMessage } from '../services/email/emailSendService.js';
import { fetchImapInbox, setImapMessageRead, deleteImapMessage } from '../services/email/emailInboxService.js';
import { parseMailTemplate, renderResponsiveMailHtml } from '../services/email/massMailHelper.js';

const router = Router();
const THROTTLE_MS = 700;

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

router.post(['/api/emails/send', '/api/send'], requireAuth, async (req, res) => {
    try {
        const pb = await getAdminPb();
        const { to, cc, bcc, subject, text, html, attachments, fromName, provider } = req.body;
        const result = await sendEmailMessage({
            userId: req.user.id, userEmail: req.user.email,
            toRaw: to, ccRaw: cc, bccRaw: bcc,
            subjectRaw: subject, text, html, attachments, fromName, provider
        }, pb);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post(['/api/emails/mass-send', '/api/mail/send'], requireAuth, async (req, res) => {
    const { recipientIds = [], subject = '', bodyTemplate = '', templateId = '', isTest = false } = req.body || {};

    if (!subject.trim() || !bodyTemplate.trim()) {
        return res.status(400).json({ error: 'Betreff und Vorlage sind erforderlich.' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    if (res.flushHeaders) res.flushHeaders();

    const sendEvent = (data) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    const pb = await getAdminPb();

    try {
        if (isTest) {
            sendEvent({ current: 0, total: 1, recipient: 'Testversand', status: 'wartend' });
            const adminEmail = req.user.email || 'info@ihre-seniorenassistenz.com';
            const dummy = { salutation: 'Frau', name_first: 'Erika', name_last: 'Muster-Betreuerin', company_name: 'Betreuungsbüro Musterstadt' };
            const parsedSubj = parseMailTemplate(subject, dummy);
            const parsedBody = parseMailTemplate(bodyTemplate, dummy);
            const renderedHtml = renderResponsiveMailHtml(parsedBody);

            try {
                await sendEmailMessage({
                    userId: req.user.id, userEmail: req.user.email,
                    toRaw: adminEmail, subjectRaw: `[TEST] ${parsedSubj}`,
                    text: parsedBody, html: renderedHtml
                }, pb);

                await pb.collection('mail_logs').create({
                    empfaenger_id: req.user.id, empfaenger_name: 'Test-Admin',
                    empfaenger_email: adminEmail, template_id: templateId || undefined,
                    betreff: `[TEST] ${parsedSubj}`, status: 'gesendet', gesendet_am: new Date().toISOString()
                }).catch(() => null);

                sendEvent({ current: 1, total: 1, recipient: adminEmail, status: 'gesendet' });
            } catch (e) {
                sendEvent({ current: 1, total: 1, recipient: adminEmail, status: 'fehler', errorMessage: e.message });
            }
            sendEvent({ done: true });
            return res.end();
        }

        const total = recipientIds.length;
        for (let i = 0; i < total; i++) {
            const id = recipientIds[i];
            let rec = await pb.collection('contacts').getOne(id).catch(() => null);
            if (!rec) rec = await pb.collection('clients').getOne(id).catch(() => null);

            if (!rec) {
                sendEvent({ current: i + 1, total, recipient: `ID: ${id}`, status: 'fehler', errorMessage: 'Empfänger nicht gefunden' });
                continue;
            }

            const recName = `${rec.name_first || ''} ${rec.name_last || ''}`.trim() || rec.email;

            if (rec.opt_out || (rec.mailing_list === false)) {
                sendEvent({ current: i + 1, total, recipient: recName, status: 'fehler', errorMessage: 'Opt-Out aktiv (abgemeldet)' });
                continue;
            }

            if (!rec.email || !rec.email.includes('@')) {
                sendEvent({ current: i + 1, total, recipient: recName, status: 'fehler', errorMessage: 'Keine gültige E-Mail-Adresse' });
                continue;
            }

            const parsedSubj = parseMailTemplate(subject, rec);
            const parsedBody = parseMailTemplate(bodyTemplate, rec);
            const renderedHtml = renderResponsiveMailHtml(parsedBody);

            try {
                await sendEmailMessage({
                    userId: req.user.id, userEmail: req.user.email,
                    toRaw: rec.email, subjectRaw: parsedSubj,
                    text: parsedBody, html: renderedHtml
                }, pb);

                await pb.collection('mail_logs').create({
                    empfaenger_id: rec.id, empfaenger_name: recName,
                    empfaenger_email: rec.email, template_id: templateId || undefined,
                    betreff: parsedSubj, status: 'gesendet', gesendet_am: new Date().toISOString()
                }).catch(() => null);

                sendEvent({ current: i + 1, total, recipient: recName, status: 'gesendet' });
            } catch (err) {
                await pb.collection('mail_logs').create({
                    empfaenger_id: rec.id, empfaenger_name: recName,
                    empfaenger_email: rec.email, template_id: templateId || undefined,
                    betreff: parsedSubj, status: 'fehler', fehlermeldung: err.message,
                    gesendet_am: new Date().toISOString()
                }).catch(() => null);

                sendEvent({ current: i + 1, total, recipient: recName, status: 'fehler', errorMessage: err.message });
            }

            if (i < total - 1) await sleep(THROTTLE_MS);
        }

        sendEvent({ done: true });
        res.end();
    } catch (err) {
        sendEvent({ done: true, fatal: err.message });
        res.end();
    }
});

router.get(['/api/emails/inbox', '/api/inbox'], requireAuth, async (req, res) => {
    try {
        const pb = await getAdminPb();
        const emails = await fetchImapInbox(req.user.id, pb);
        res.json({ success: true, data: emails });
    } catch (err) {
        res.json({ success: true, data: [], error: err.message });
    }
});

router.post(['/api/emails/mark-read', '/api/mark-read'], requireAuth, async (req, res) => {
    try {
        const { uid, is_read = true } = req.body || {};
        if (!uid) return res.status(400).json({ success: false, error: 'UID erforderlich' });
        const pb = await getAdminPb();
        const records = await pb.collection('mailbox_messages').getFullList({ filter: `message_id = "${uid}"`, requestKey: null });
        for (const rec of records) {
            await pb.collection('mailbox_messages').update(rec.id, { is_read: !!is_read });
        }
        setImapMessageRead(req.user.id, uid, !!is_read, pb).catch(() => {});
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.post(['/api/emails/delete', '/api/delete'], requireAuth, async (req, res) => {
    try {
        const { uid } = req.body || {};
        if (!uid) return res.status(400).json({ success: false, error: 'UID erforderlich' });
        const pb = await getAdminPb();
        const records = await pb.collection('mailbox_messages').getFullList({ filter: `message_id = "${uid}"`, requestKey: null });
        for (const rec of records) {
            await pb.collection('mailbox_messages').delete(rec.id).catch(() => {});
        }
        deleteImapMessage(req.user.id, uid, pb).catch(() => {});
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

export default router;
