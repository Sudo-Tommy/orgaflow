import MailComposer from 'nodemailer/lib/mail-composer/index.js';
import { getValidAccessToken, fetchWithRetry, APP_DISPLAY_NAME } from './googleOAuthService.js';
import { importGoogleEventsToPocketBase } from './googleCalendarImportService.js';

export async function fetchExternalGoogleEvents(userId, pbAdmin, timeMin, timeMax) {
    if (!userId || !pbAdmin) return [];

    // Importiert bzw. aktualisiert externe Google-Termine direkt als vollwertige PocketBase-Termine
    await importGoogleEventsToPocketBase(userId, pbAdmin, timeMin, timeMax).catch(err => {
        console.warn('[Google Calendar] Sync nach PocketBase fehlgeschlagen:', err.message);
    });

    // Gibt leeres Array zurück, da alle Termine nun als reguläre PocketBase-Datensätze geladen werden
    return [];
}

export async function sendEmailViaGmailOAuth2({ userId, to, cc, bcc, subject, text, html, attachments, pbAdmin, fromName }) {
    const auth = await getValidAccessToken(userId, pbAdmin);
    if (!auth) {
        throw new Error('Kein verknüpftes Google-Konto gefunden oder Token abgelaufen. Bitte verknüpfen Sie Ihr Google-Konto.');
    }

    const senderEmail = auth.config.google_email;
    if (!senderEmail) {
        throw new Error('Google-E-Mail-Adresse des Kontos konnte nicht ermittelt werden.');
    }

    const displayName = fromName || process.env.SMTP_FROM_NAME || APP_DISPLAY_NAME;
    const formattedFrom = `"${displayName}" <${senderEmail}>`;

    const formattedAttachments = (attachments || []).map(att => ({
        filename: att.filename,
        content: att.content,
        encoding: att.encoding || 'base64'
    }));

    const mail = new MailComposer({
        from: formattedFrom,
        to,
        cc: cc || undefined,
        bcc: bcc || undefined,
        subject,
        text,
        html,
        attachments: formattedAttachments
    });

    const compiledMessage = await new Promise((resolve, reject) => {
        mail.compile().build((err, message) => (err ? reject(err) : resolve(message)));
    });

    const raw = compiledMessage.toString('base64url');
    const response = await fetchWithRetry('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${auth.accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ raw })
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error?.message || 'Fehler beim Senden über die Gmail API.');
    }

    return {
        success: true,
        messageId: data.id,
        threadId: data.threadId,
        provider: 'gmail-oauth2',
        from: formattedFrom
    };
}
