import nodemailer from 'nodemailer';
import { escapeHtml } from '../../utils/security.js';

export async function sendPortalOtpEmail({ user, userType, email, otp }, pbAdmin) {
    const isDev = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
    if (isDev) console.log(`\n🔑 [DEV-OTP] Code für ${email}: ${otp}\n`);

    let smtpUser = process.env.SMTP_USER;
    let smtpPass = process.env.SMTP_PASSWORD;
    let smtpHost = process.env.SMTP_HOST || 'smtp.ionos.de';
    let smtpPort = 465;

    const companies = await pbAdmin.collection('company').getFullList({ requestKey: null });
    if (companies[0]) {
        const configs = await pbAdmin.collection('userMailConfigs').getFullList({ filter: `company = "${companies[0].id}"`, requestKey: null });
        if (configs[0]?.smtp_user) {
            smtpUser = configs[0].smtp_user; smtpPass = configs[0].smtp_password;
            smtpHost = configs[0].smtp_host; smtpPort = parseInt(configs[0].smtp_port);
        }
    }

    if (!smtpUser || !smtpPass) {
        if (isDev) return { success: true, devMode: true };
        throw new Error('E-Mail-Server ist nicht konfiguriert.');
    }

    try {
        const transporter = nodemailer.createTransport({ host: smtpHost, port: smtpPort, secure: smtpPort === 465, auth: { user: smtpUser, pass: smtpPass } });
        const subject = 'Ihr Zugangs-Code für das Portal';
        const html = `<div style="font-family: Arial; padding: 20px;"><h2>Guten Tag ${escapeHtml(user.name_first || '')},</h2><p>Ihr Einmal-Code lautet: <strong style="font-size: 24px; color: #4f46e5;">${otp}</strong></p><p>Gültig für 10 Minuten.</p></div>`;
        const text = `Guten Tag ${user.name_first || ''},\n\nIhr Einmal-Code: ${otp}\nGültig für 10 Minuten.`;

        const info = await transporter.sendMail({ from: `"Klienten-Portal" <${smtpUser}>`, to: email, subject, html, text });
        await pbAdmin.collection('mailbox_messages').create({
            folder: "System", message_id: info.messageId || `sent-otp-${Date.now()}`, subject,
            from_address: smtpUser, to_address: email, date: new Date().toISOString(),
            body_text: text, body_html: html, is_read: true, client: userType === 'client' ? user.id : null
        }).catch(() => null);

        return { success: true };
    } catch (err) {
        if (isDev) return { success: true, devMode: true };
        throw err;
    }
}
