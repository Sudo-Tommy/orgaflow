import nodemailer from 'nodemailer';
import { sendEmailViaGmailOAuth2 } from '../../../googleCalendarService.js';
import { sanitizeHeaderValue, isValidEmail } from '../../utils/security.js';
import { buildFallbackHtml } from './emailTemplateHelper.js';

export async function sendEmailMessage({ userId, userEmail, toRaw, ccRaw, bccRaw, subjectRaw, text, html, attachments, fromName, provider }, pbAdmin) {
    const to = sanitizeHeaderValue(toRaw);
    const cc = ccRaw ? sanitizeHeaderValue(ccRaw) : undefined;
    const bcc = bccRaw ? sanitizeHeaderValue(bccRaw) : undefined;
    const subject = sanitizeHeaderValue(subjectRaw);

    if (!to || !subject) throw new Error('Empfänger (to) und Betreff (subject) sind erforderlich.');
    if (!isValidEmail(to.split(',')[0].trim())) throw new Error('Ungültige Empfänger-Adresse.');

    let userRecord = userId ? await pbAdmin.collection('users').getOne(userId).catch(() => null) : null;
    if (!userRecord && userEmail) {
        userRecord = await pbAdmin.collection('users').getFirstListItem(`email = "${userEmail}"`).catch(() => null);
    }

    const effectiveUserId = userRecord?.id || null;
    const compId = userRecord?.company ? (Array.isArray(userRecord.company) ? userRecord.company[0] : userRecord.company) : null;
    const compRecord = compId ? await pbAdmin.collection('company').getOne(compId).catch(() => null) : null;

    let finalHtml = html;
    if (!finalHtml && text) {
        finalHtml = buildFallbackHtml({
            text,
            userName: fromName || (userRecord ? `${userRecord.name_first || ''} ${userRecord.name_last || ''}`.trim() : ''),
            userEmail: userRecord?.email || userEmail || '',
            userPhone: userRecord?.handy || userRecord?.tel || '',
            compName: compRecord?.name,
            compStreet: `${compRecord?.street || ''} ${compRecord?.housenr || ''}`.trim(),
            compCity: `${compRecord?.zip || ''} ${compRecord?.city || ''}`.trim(),
            compWeb: compRecord?.website
        });
    }

    const chosenProvider = (provider || 'ionos').toLowerCase();

    // 1. Google Mail / Gmail Versand
    if (chosenProvider === 'google' || chosenProvider === 'gmail') {
        const googleConfig = effectiveUserId
            ? await pbAdmin.collection('user_calendar_configs').getFirstListItem(`user = "${effectiveUserId}"`).catch(() => null)
            : null;

        if (!googleConfig?.sync_enabled || !googleConfig.refresh_token) {
            throw new Error('Google Mail ist für dieses Benutzerkonto nicht eingerichtet oder die Verbindung ist inaktiv.');
        }

        try {
            const result = await sendEmailViaGmailOAuth2({
                userId: effectiveUserId, to, cc, bcc, subject, text, html: finalHtml, attachments, pbAdmin,
                fromName: fromName || process.env.SMTP_FROM_NAME || 'Ihre Seniorenassistenz'
            });
            await archiveSentMessage(pbAdmin, {
                messageId: result.messageId || `sent-gmail-${Date.now()}`,
                subject, from: result.from || googleConfig.google_email, to, text, html: finalHtml, userId: effectiveUserId, attachments
            });
            return { success: true, messageId: result.messageId, provider: 'gmail', from: result.from || googleConfig.google_email };
        } catch (e) {
            throw new Error(`Google Mail-Versand fehlgeschlagen: ${e.message}`);
        }
    }

    // 2. IONOS / SMTP Versand (Standard für alle Mails)
    let userMailConfig = effectiveUserId
        ? await pbAdmin.collection('userMailConfigs').getFirstListItem(`user = "${effectiveUserId}"`).catch(() => null)
        : null;
    if (!userMailConfig && compId) {
        userMailConfig = await pbAdmin.collection('userMailConfigs').getFirstListItem(`company = "${compId}"`).catch(() => null);
    }
    if (!userMailConfig && userEmail) {
        userMailConfig = await pbAdmin.collection('userMailConfigs').getFirstListItem(`smtp_user = "${userEmail}" || email_address = "${userEmail}"`).catch(() => null);
    }
    if (!userMailConfig) {
        userMailConfig = await pbAdmin.collection('userMailConfigs').getFirstListItem('').catch(() => null);
    }

    let smtpUser = userMailConfig?.smtp_user || process.env.SMTP_USER;
    let smtpPass = userMailConfig?.smtp_password || process.env.SMTP_PASS;
    let smtpHost = userMailConfig?.smtp_host || process.env.SMTP_HOST || 'smtp.ionos.de';
    let smtpPort = parseInt(userMailConfig?.smtp_port || process.env.SMTP_PORT) || 465;

    if (!smtpUser || !smtpPass) {
        throw new Error('Kein IONOS- oder SMTP-E-Mail-Konto für diesen Benutzer konfiguriert.');
    }

    const resolvedName = fromName || compRecord?.name || process.env.SMTP_FROM_NAME || 'Seniorenassistenz Jenzsch';
    const fromEmail = userMailConfig?.email_address || userRecord?.email || smtpUser;
    const fromHeader = `"${resolvedName}" <${fromEmail}>`;

    const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPass }
    });
    const formattedAttachments = (attachments || []).map(att => ({
        filename: att.filename,
        content: att.content,
        encoding: att.encoding || 'base64',
        contentType: att.contentType
    }));

    try {
        const info = await transporter.sendMail({
            from: fromHeader,
            to, cc, bcc, subject, text, html: finalHtml,
            attachments: formattedAttachments
        });

        await archiveSentMessage(pbAdmin, {
            messageId: info.messageId || `sent-ionos-${Date.now()}`,
            subject, from: fromHeader, to, text, html: finalHtml, userId: effectiveUserId,
            attachments: formattedAttachments, compId: compId || userMailConfig?.company
        });

        return { success: true, messageId: info.messageId, provider: 'ionos', from: fromHeader };
    } catch (err) {
        throw new Error(`IONOS E-Mail-Versand fehlgeschlagen: ${err.message}`);
    }
}

async function archiveSentMessage(pbAdmin, { messageId, subject, from, to, text, html, userId, attachments, compId }) {
    try {
        const existing = await pbAdmin.collection('mailbox_messages').getList(1, 5, {
            filter: `folder = "Sent" && message_id = "${(messageId || '').replace(/"/g, '\\"')}"`,
            requestKey: null
        }).catch(() => null);

        const formData = new FormData();
        formData.append('folder', 'Sent');
        formData.append('message_id', messageId || '');
        formData.append('subject', subject || '');
        formData.append('from_address', from || '');
        formData.append('to_address', to || '');
        formData.append('date', new Date().toISOString());
        formData.append('body_text', text || '');
        formData.append('body_html', html || '');
        formData.append('is_read', 'true');
        if (userId) {
            formData.append('send_by', userId);
            formData.append('user', userId);
        }
        if (compId) formData.append('company', compId);

        if (attachments && Array.isArray(attachments)) {
            for (const att of attachments) {
                if (!att || !att.filename || !att.content) continue;
                let buf;
                if (typeof att.content === 'string') {
                    buf = Buffer.from(att.content, att.encoding === 'base64' || !att.encoding ? 'base64' : 'utf-8');
                } else if (Buffer.isBuffer(att.content)) {
                    buf = att.content;
                }
                if (buf) {
                    const fileObj = new File([buf], att.filename, { type: att.contentType || 'application/octet-stream' });
                    formData.append('attachments', fileObj);
                }
            }
        }

        if (existing && existing.items && existing.items.length > 0) {
            await pbAdmin.collection('mailbox_messages').update(existing.items[0].id, formData);
        } else {
            await pbAdmin.collection('mailbox_messages').create(formData);
        }
    } catch (err) {
        console.warn('[archiveSentMessage] Fehler beim Archivieren der gesendeten E-Mail:', err.message);
    }
}
