import nodemailer from 'nodemailer';
import { getAdminPb } from '../pb.js';
import { PB_URL } from '../../config/env.js';
import { summarizeCalendarRequest } from '../ai/lookupService.js';
import { sendEmailMessage } from '../email/emailSendService.js';

export async function processNotifyRequest(appointmentRequestId, fallbackData = {}) {
    try {
        const pbAdmin = await getAdminPb();
        const requestRecord = await pbAdmin.collection('appointment_requests').getOne(appointmentRequestId, { expand: 'company,client_id', requestKey: null });
        summarizeCalendarRequest(requestRecord, pbAdmin).catch(() => {});

        const name = requestRecord.sender_name || fallbackData.senderName || 'Unbekannt';
        const email = requestRecord.email || fallbackData.email || '';
        const phone = requestRecord.phone || fallbackData.phone || '';
        const requestText = requestRecord.request_text || fallbackData.requestText || '';

        let date = '-';
        const rawDate = requestRecord.date || fallbackData.date;
        if (rawDate) {
            const d = new Date(rawDate);
            if (!isNaN(d.getTime())) date = d.toLocaleDateString('de-DE');
            else date = String(rawDate);
        }

        let time = '-';
        const rawTime = requestRecord.time || fallbackData.time;
        if (rawTime) {
            const strTime = String(rawTime).trim();
            if (/^\d{1,2}:\d{2}/.test(strTime)) {
                time = strTime.includes('Uhr') ? strTime : `${strTime} Uhr`;
            } else {
                const cleanTime = strTime.includes(' ') && !strTime.includes('T') ? strTime.replace(' ', 'T') : strTime;
                const d = new Date(cleanTime);
                if (!isNaN(d.getTime())) {
                    time = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' }) + ' Uhr';
                }
            }
        }

        if (!requestRecord.time && fallbackData.time && rawDate) {
            const m = String(fallbackData.time).match(/(\d{1,2}):(\d{2})/);
            if (m) {
                try {
                    const datePart = new Date(rawDate).toISOString().split('T')[0];
                    const timeIso = new Date(`${datePart}T${m[1].padStart(2, '0')}:${m[2]}:00`).toISOString();
                    await pbAdmin.collection('appointment_requests').update(requestRecord.id, { time: timeIso }, { requestKey: null }).catch(() => {});
                } catch {}
            }
        }
        const company = requestRecord.expand?.company;
        const companyName = company?.name || 'Zentrale';

        const subject = `Neue Terminanfrage von ${name}`;
        const html = `<h2>Neue Terminanfrage (${companyName})</h2><p><strong>Name:</strong> ${name}</p><p><strong>E-Mail:</strong> ${email}</p><p><strong>Telefon:</strong> ${phone}</p><p><strong>Wunschtermin:</strong> ${date} um ${time}</p><p><strong>Nachricht:</strong><br>${requestText.replace(/\n/g, '<br>')}</p>`;
        const text = `Neue Terminanfrage (${companyName})\nName: ${name}\nE-Mail: ${email}\nTelefon: ${phone}\nWunschtermin: ${date} um ${time}\n\nNachricht:\n${requestText}`;

        const adminUser = await pbAdmin.collection('users').getFirstListItem('role = "superadmin" || role = "admin"', { requestKey: null }).catch(() => null);
        const targetEmail = company?.email || adminUser?.email || process.env.EMAIL_USER || 't.jenzsch@ihre-seniorenassistenz.com';

        // 1. Primär: Versand über sendEmailMessage (nutzt Gmail OAuth2 falls aktiv)
        if (adminUser?.id) {
            try {
                await sendEmailMessage({
                    userId: adminUser.id,
                    toRaw: targetEmail,
                    subjectRaw: subject,
                    text,
                    html,
                    fromName: 'OrgaFlow Terminanfragen'
                }, pbAdmin);
                return;
            } catch (sendErr) {
                console.warn('[NOTIFY-REQUEST] sendEmailMessage:', sendErr.message);
            }
        }

        // 2. Fallback: Firmen-SMTP aus userMailConfigs oder .env
        let smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER;
        let smtpPass = process.env.SMTP_PASSWORD || process.env.EMAIL_PASS || process.env.SMTP_PASS;
        let smtpHost = process.env.SMTP_HOST || 'smtp.ionos.de';
        let smtpPort = parseInt(process.env.SMTP_PORT || '465', 10);

        if (requestRecord.company) {
            const configs = await pbAdmin.collection('userMailConfigs').getFullList({ filter: `company = "${requestRecord.company}"`, requestKey: null }).catch(() => []);
            if (configs[0]?.smtp_user && configs[0]?.smtp_password) {
                smtpUser = configs[0].smtp_user;
                smtpPass = configs[0].smtp_password;
                smtpHost = configs[0].smtp_host || smtpHost;
                smtpPort = parseInt(configs[0].smtp_port) || smtpPort;
            }
        }

        if (smtpUser && smtpPass) {
            const transporter = nodemailer.createTransport({ host: smtpHost, port: smtpPort, secure: smtpPort === 465, auth: { user: smtpUser, pass: smtpPass } });
            await transporter.sendMail({ from: `"OrgaFlow" <${smtpUser}>`, to: targetEmail, replyTo: email || undefined, subject, html });
        } else {
            console.warn('[NOTIFY-REQUEST] Keine gültige E-Mail-Konfiguration vorhanden (weder Google OAuth2 noch SMTP).');
        }
    } catch (err) {
        if (err.message?.includes('535')) {
            console.warn('[NOTIFY-REQUEST] SMTP-Login fehlgeschlagen (535): Die Zugangsdaten wurden vom Mailserver abgelehnt. Bitte das Passwort in userMailConfigs oder .env prüfen.');
        } else {
            console.warn('[NOTIFY-REQUEST ERROR]', err.message);
        }
    }
}
