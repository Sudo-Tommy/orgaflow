import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import PocketBase from 'pocketbase';
import jwt from 'jsonwebtoken';
import { GoogleGenerativeAI } from '@google/generative-ai';
import webpush from 'web-push';

dotenv.config();

const app = express();

// Erlaubt Anfragen vom SvelteKit Frontend
app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// PocketBase ist intern (hinter Nginx) weiterhin sicher auf Port 8090 erreichbar
const PB_URL = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090';

// Web-Push Konfiguration (VAPID Keys)
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
        'mailto:info@ihre-seniorenassistenz.com', // Deine Kontakt-E-Mail
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    );
}


// Helper: Auth-Token validieren und Postfach-Zugangsdaten aus PB holen
async function getUserEmailCredentials(authHeader) {
    if (!authHeader) throw new Error("Nicht autorisiert: Kein Token gesendet.");
    const token = authHeader.replace('Bearer ', '');
    
    const pb = new PocketBase(PB_URL);
    pb.authStore.save(token, null);
    
    let user = null;
    try {
        try {
            const authData = await pb.collection('users').authRefresh();
            user = authData.record;
        } catch (e) {
            const authData = await pb.collection('_superusers').authRefresh();
            user = authData.record || authData.admin;
        }
    } catch (err) {
        throw new Error("Token ungültig oder Berechtigung fehlt. Bitte logge dich neu ein.");
    }
        
    try {
        // Firmen-Zugehörigkeit ermitteln
        let companyId = null;
        if (user.company) {
            companyId = Array.isArray(user.company) ? user.company[0] : user.company;
        }

        let mailConfig = null;
        if (companyId) {
            try {
                // Mail-Config der Firma abrufen
                const configs = await pb.collection('userMailConfigs').getFullList({ filter: `company = "${companyId}"` });
                if (configs.length > 0) mailConfig = configs[0];
            } catch (e) {
                console.log("Info: Keine Firmen-Mail-Config gefunden.");
            }
        }
        
        // E-Mail Account des Nutzers hat Vorrang, danach greifen wir auf das zentrale Firmen-Postfach zurück
        const emailUser = user.smtp_mail || mailConfig?.smtp_user;
        const emailPass = user.smtp_password || mailConfig?.smtp_password;

        if (!emailUser || !emailPass) {
            throw new Error("Es sind keine E-Mail-Zugangsdaten im Profil oder Unternehmen hinterlegt.");
        }
        
        const actualUserName = `${user.name_first || ''} ${user.name_last || ''}`.trim() || "Ihre Seniorenassistenz";
        const actualUserEmail = user.email || emailUser;

        return {
            user: emailUser,
            pass: emailPass,
            actualUserName,
            actualUserEmail,
            smtp_host: mailConfig?.smtp_host || process.env.SMTP_HOST,
            smtp_port: mailConfig?.smtp_port ? parseInt(mailConfig.smtp_port) : 465,
            imap_host: mailConfig?.imap_host || process.env.IMAP_HOST,
            imap_port: mailConfig?.imap_port ? parseInt(mailConfig.imap_port) : 993
        };
    } catch (err) {
        throw new Error(err.message || "PocketBase Authentifizierung fehlgeschlagen.");
    }
}

// Middleware zur strengen Authentifizierung via PocketBase
async function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Zugriff verweigert: Kein Token oder nicht eingeloggt' });
    }
    const token = authHeader.replace('Bearer ', '');
    const pbAuth = new PocketBase(PB_URL);
    pbAuth.authStore.save(token, null);
    try {
        try { await pbAuth.collection('users').authRefresh(); } 
        catch (e) { await pbAuth.collection('_superusers').authRefresh(); }
        next();
    } catch (err) {
        return res.status(403).json({ error: 'Zugriff verweigert: Ungültiges oder abgelaufenes Token' });
    }
}


// --- ROUTEN ---

// 1. E-Mail senden
app.post('/api/emails/send', requireAuth, async (req, res) => {
    const { to, cc, bcc, subject, text, html, attachments } = req.body;

    try {
        const credentials = await getUserEmailCredentials(req.headers.authorization);
        
        // Transporter dynamisch für diesen Nutzer erstellen
        const transporter = nodemailer.createTransport({
            host: credentials.smtp_host,
            port: credentials.smtp_port,
            secure: credentials.smtp_port === 465, // SSL für 465, sonst TLS (z.B. 587)
            auth: {
                user: credentials.user,
                pass: credentials.pass,
            },
        });

        const info = await transporter.sendMail({
            from: `"${credentials.actualUserName}" <${credentials.actualUserEmail}>`,
            replyTo: credentials.actualUserEmail,
            to,
            cc,
            bcc,
            subject,
            text,
            html,
            attachments
        });
        res.status(200).json({ success: true, messageId: info.messageId });
    } catch (error) {
        console.error("Fehler beim Senden der E-Mail:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 2. E-Mails abrufen (Posteingang)
app.get('/api/emails/inbox', requireAuth, async (req, res) => {
    let imapClient;
    try {
        const credentials = await getUserEmailCredentials(req.headers.authorization);

        // IMAP Client dynamisch für diesen Nutzer erstellen
        imapClient = new ImapFlow({
            host: credentials.imap_host,
            port: credentials.imap_port,
            secure: credentials.imap_port === 993,
            auth: {
                user: credentials.user,
                pass: credentials.pass
            },
            logger: false
        });

        await imapClient.connect();
        let lock = await imapClient.getMailboxLock('INBOX');
        const emails = [];
        
        try {
            // Die absolut sicherste Methode: Anzahl aller E-Mails im Ordner ermitteln
            const totalMails = imapClient.mailbox.exists;
            
            if (totalMails > 0) {
                // Wir holen die neuesten 15 E-Mails (um Ladezeiten zu minimieren)
                const startSeq = Math.max(1, totalMails - 14);
                const seqRange = `${startSeq}:*`;
                
                for await (let message of imapClient.fetch(seqRange, { envelope: true, source: true, uid: true, flags: true })) {
                    try {
                        const parsed = await simpleParser(message.source);
                        emails.push({
                            uid: message.uid.toString(),
                            subject: parsed.subject || 'Kein Betreff',
                            from: parsed.from?.value[0]?.address || message.envelope?.from?.[0]?.address || 'Unbekannt',
                            to: parsed.to?.value[0]?.address || credentials.user,
                            date: parsed.date || message.envelope?.date || new Date().toISOString(),
                            text: parsed.text || '',
                            html: parsed.html || parsed.textAsHtml || '',
                            is_read: message.flags?.has('\\Seen') || false
                        });
                    } catch (parseErr) {
                        console.error("Konnte E-Mail nicht parsen:", parseErr);
                    }
                }
            }
        } finally {
            lock.release();
        }
        await imapClient.logout();
        
        res.status(200).json({ success: true, data: emails });
    } catch (error) {
        console.error("Fehler beim Abrufen der E-Mails:", error);
        // Sicherstellen, dass die IMAP-Verbindung bei einem Fehler geschlossen wird
        if (imapClient && imapClient.usable) {
            await imapClient.logout();
        }
        res.status(500).json({ success: false, error: error.message });
    }
});

// 3. E-Mails löschen (Massenlöschung)
app.post('/api/emails/delete', requireAuth, async (req, res) => {
    let imapClient;
    try {
        const credentials = await getUserEmailCredentials(req.headers.authorization);
        const { uid } = req.body;
        
        if (!uid) {
            return res.status(400).json({ error: "Keine UID(s) angegeben." });
        }

        const uidsToDelete = Array.isArray(uid) ? uid.join(',') : uid.toString();

        imapClient = new ImapFlow({
            host: credentials.imap_host,
            port: credentials.imap_port,
            secure: credentials.imap_port === 993,
            auth: { user: credentials.user, pass: credentials.pass },
            logger: false
        });

        await imapClient.connect();
        let lock = await imapClient.getMailboxLock('INBOX');
        try {
            await imapClient.messageFlagsAdd(uidsToDelete, ['\\Deleted'], { uid: true });
            try { await imapClient.messageExpunge(uidsToDelete, { uid: true }); } catch(e) {}
        } finally {
            lock.release();
        }
        await imapClient.logout();
        res.json({ success: true, deleted: uidsToDelete });
    } catch (error) {
        console.error("Lösch-Fehler:", error);
        if (imapClient && imapClient.usable) {
            await imapClient.logout();
        }
        res.status(500).json({ error: error.message });
    }
});

// 4. E-Mail als gelesen markieren
app.post('/api/emails/mark-read', requireAuth, async (req, res) => {
    let imapClient;
    try {
        const credentials = await getUserEmailCredentials(req.headers.authorization);
        const { uid } = req.body;
        
        if (!uid) {
            return res.status(400).json({ error: "Keine UID angegeben." });
        }

        imapClient = new ImapFlow({
            host: credentials.imap_host,
            port: credentials.imap_port,
            secure: credentials.imap_port === 993,
            auth: { user: credentials.user, pass: credentials.pass },
            logger: false
        });

        await imapClient.connect();
        let lock = await imapClient.getMailboxLock('INBOX');
        try {
            await imapClient.messageFlagsAdd(uid.toString(), ['\\Seen'], { uid: true });
        } finally {
            lock.release();
        }
        await imapClient.logout();
        res.json({ success: true, uid });
    } catch (error) {
        console.error("Fehler beim Markieren als gelesen:", error);
        if (imapClient && imapClient.usable) {
            await imapClient.logout();
        }
        res.status(500).json({ error: error.message });
    }
});

// --- PORTAL ROUTEN (Für Klienten) ---

async function getAdminPb() {
    const pbAdmin = new PocketBase(PB_URL);
    const adminEmail = process.env.PB_ADMIN_EMAIL;
    const adminPass = process.env.PB_ADMIN_PASSWORD;
    if (!adminEmail || !adminPass) throw new Error("PB_ADMIN_EMAIL und PB_ADMIN_PASSWORD fehlen in .env");
    // PocketBase v0.23+ nutzt '_superusers' anstelle der veralteten 'admins'
    await pbAdmin.collection('_superusers').authWithPassword(adminEmail, adminPass);
    return pbAdmin;
}

app.post(['/api/emails/portal/request-otp', '/portal/request-otp'], async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'E-Mail fehlt.' });

    try {
        console.log(`[PORTAL] Fordere OTP an für: ${email}`);
        const pbAdmin = await getAdminPb();
        let user = null;
        let userType = '';

        try {
            const client = await pbAdmin.collection('clients').getFirstListItem(`email = "${email.toLowerCase()}"`);
            if (client) { user = client; userType = 'client'; }
        } catch (e) {}

        if (!user) {
            try {
                const contact = await pbAdmin.collection('contacts').getFirstListItem(`email = "${email.toLowerCase()}"`);
                if (contact) {
                    const linkedClients = await pbAdmin.collection('clients').getFullList({ filter: `contacts ~ "${contact.id}"`, fields: 'id' });
                    if (linkedClients.length > 0) { user = contact; userType = 'contact'; }
                }
            } catch (e) {}
        }

        if (!user) {
            console.log(`[PORTAL] Abbruch: E-Mail '${email}' ist nicht als Klient oder Kontakt registriert.`);
            return res.status(404).json({ error: "Diese E-Mail-Adresse ist im System nicht als Klient oder Bezugsperson hinterlegt." });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expires = new Date(Date.now() + 10 * 60 * 1000);
        await pbAdmin.collection('otp_codes').create({
            email: user.email.toLowerCase(), code: otp, expires: expires.toISOString(), user_id: user.id, user_type: userType
        });

        console.log(`[PORTAL] User gefunden: ${user.name_first} ${user.name_last} (Typ: ${userType}). Lade SMTP-Config...`);
        const companies = await pbAdmin.collection('company').getFullList({ requestKey: null });
        let smtpUser = process.env.SMTP_USER;
        let smtpPass = process.env.SMTP_PASSWORD;
        let smtpHost = process.env.SMTP_HOST || 'smtp.ionos.de';
        let smtpPort = 465;

        const companyConfig = companies[0];
        if (companyConfig) {
            const configs = await pbAdmin.collection('userMailConfigs').getFullList({ filter: `company = "${companyConfig.id}"`, requestKey: null });
            if (configs.length > 0 && configs[0].smtp_user) {
                console.log(`[PORTAL] Nutze Firmen-E-Mail-Config aus der Datenbank.`);
                smtpUser = configs[0].smtp_user; smtpPass = configs[0].smtp_password;
                smtpHost = configs[0].smtp_host; smtpPort = parseInt(configs[0].smtp_port);
            }
        }

        if (!smtpUser || !smtpPass) {
            console.error(`[PORTAL] FEHLER: Weder in .env noch in Firmen-Einstellungen SMTP-Daten gefunden!`);
            return res.status(500).json({ error: "E-Mail-Server ist nicht konfiguriert." });
        }

        console.log(`[PORTAL] Sende Code via SMTP (${smtpHost}:${smtpPort}) als ${smtpUser}...`);
        const transporter = nodemailer.createTransport({ host: smtpHost, port: smtpPort, secure: smtpPort === 465, auth: { user: smtpUser, pass: smtpPass } });
        
        const subject = 'Ihr Zugangs-Code für das Portal';
        const htmlBody = `<div style="font-family: Arial; padding: 20px;"><h2>Guten Tag ${user.name_first || ''},</h2><p>Ihr Einmal-Code für das Portal lautet: <strong><span style="font-size: 24px; color: #4f46e5; letter-spacing: 2px;">${otp}</span></strong></p><p>Dieser Code ist 10 Minuten gültig.</p></div>`;
        const textBody = `Guten Tag ${user.name_first || ''},\n\nIhr Einmal-Code für das Portal lautet: ${otp}\n\nDieser Code ist 10 Minuten gültig.`;

        const info = await transporter.sendMail({
            from: `"Klienten-Portal" <${smtpUser}>`,
            to: email,
            subject: subject,
            html: htmlBody,
            text: textBody
        });

        console.log(`[PORTAL] E-Mail erfolgreich versendet!`);

        // Gesendete E-Mail in der Datenbank für die Nachverfolgung speichern
        try {
            await pbAdmin.collection('mailbox_messages').create({
                folder: "System",
                message_id: info.messageId || `sent-otp-${Date.now()}`,
                subject: subject,
                from_address: smtpUser,
                to_address: email,
                date: new Date().toISOString(),
                body_text: textBody,
                body_html: htmlBody,
                is_read: true,
                client: userType === 'client' ? user.id : null
            });
            console.log(`[PORTAL] Gesendete OTP-E-Mail in der Datenbank archiviert.`);
        } catch (dbError) {
            console.error("[PORTAL] Fehler beim Archivieren der OTP-E-Mail:", dbError);
        }

        res.json({ success: true });
    } catch (err) {
        console.error("[PORTAL] Schwerer Fehler beim Versenden:", err);
        let clientMsg = "Fehler beim E-Mail-Versand. Stimmen die SMTP-Zugangsdaten?";
        if (err.status === 400 || (err.message && err.message.includes("authenticate"))) {
            clientMsg = "Datenbank-Verbindung fehlgeschlagen: Das PB_ADMIN_PASSWORD in der .env Datei des Microservices ist falsch.";
        } else if (err.status === 404 && err.message && err.message.includes("collection")) {
            // Dieser Fehler tritt auf, wenn die 'otp_codes' Tabelle in der DB fehlt.
            clientMsg = "Datenbank-Fehler: Die Collection 'otp_codes' wurde nicht gefunden. Bitte im PocketBase Admin-UI anlegen.";
        }
        res.status(500).json({ error: clientMsg });
    }
});

app.post(['/api/emails/portal/verify-otp', '/portal/verify-otp'], async (req, res) => {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: "E-Mail oder Code fehlt." });

    try {
        const pbAdmin = await getAdminPb();
        // WICHTIG: Das "T" im Datum durch ein Leerzeichen ersetzen, damit SQLite nicht durcheinanderkommt!
        const now = new Date().toISOString().replace('T', ' ');
        const otpRecord = await pbAdmin.collection('otp_codes').getFirstListItem(
            `email = "${email.toLowerCase()}" && code = "${otp}" && expires > "${now}"`
        );

        const payload = {
            id: otpRecord.user_id,
            type: otpRecord.user_type, // 'client' oder 'contact'
            email: otpRecord.email
        };

        if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET ist nicht in der .env Datei konfiguriert!");

        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
        await pbAdmin.collection('otp_codes').delete(otpRecord.id);
        res.json({ success: true, token });
    } catch (err) {
        res.status(401).json({ error: "Code ist ungültig oder abgelaufen." });
    }
});

// Helper: Portal-Auth validieren (Erlaubt OTP-Session ODER PocketBase Admin-Token)
async function resolvePortalAuth(authHeader) {
    if (!authHeader) return null;
    const token = authHeader.split(' ')[1];
    if (!token) return null;

    try {
        const pb = new PocketBase(PB_URL);
        pb.authStore.save(token, null);
        if (pb.authStore.isValid) {
            await pb.collection('users').authRefresh();
            const role = pb.authStore.model.role;
            if (role === 'superadmin' || role === 'admin') return { type: 'admin', pb: pb };
        }
    } catch(e) {
        // Fallthrough
    }
    
    try {
        if (!process.env.JWT_SECRET) return null;
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.type === 'client' && decoded.id) return { type: 'client', clientId: decoded.id };
        if (decoded.type === 'contact' && decoded.id) return { type: 'contact', contactId: decoded.id };
    } catch (err) { /* Ungültiger Token */ }
    
    return null;
}

app.get('/api/emails/portal/invoices', async (req, res) => {
    const auth = await resolvePortalAuth(req.headers.authorization);
    if (!auth) return res.status(401).json({ error: "Session abgelaufen oder ungültig. Bitte neu anmelden." });
    
    try {
        const pbAdmin = auth.pb || await getAdminPb();
        
        let filterStr = `(status = "Eingereicht" || status = "Abgeschlossen" || status = "In Bearbeitung")`;
        if (auth.type === 'client') filterStr = `(client = "${auth.clientId}" || client ?= "${auth.clientId}") && ${filterStr}`;
        
        const invoices = await pbAdmin.collection('invoices').getFullList({
            filter: filterStr,
            sort: '-issue_date', requestKey: null
        });

        // PocketBase File-Token erzeugen, damit der Klient die PDF ohne PB-Account herunterladen darf!
        let fileToken = '';
        try { fileToken = await pbAdmin.files.getToken(); } catch(e) {}
        
        const mappedInvoices = invoices.map(inv => {
            const pdfs = Array.isArray(inv.pdf) ? inv.pdf : (inv.pdf ? [inv.pdf] : []);
            const files = pdfs.map((filename, index) => ({
                name: filename,
                url: pbAdmin.files.getUrl(inv, filename, { 'token': fileToken }),
                isTimesheet: index > 0
            }));
            return { ...inv, files };
        });

        res.json({ success: true, invoices: mappedInvoices });
    } catch (err) {
        console.error("[PORTAL INVOICES]", err);
        res.status(500).json({ error: "Rechnungen konnten nicht geladen werden: " + err.message });
    }
});

// --- Termine für das Klienten-Portal abrufen ---
app.get(['/api/emails/portal/appointments', '/portal/appointments', '/appointments'], async (req, res) => {
    const auth = await resolvePortalAuth(req.headers.authorization);
    if (!auth) return res.status(401).json({ error: "Session abgelaufen oder ungültig. Bitte neu anmelden." });

    try {
        const pbAdmin = auth.pb || await getAdminPb();

        // Termine ab gestern laden (damit auch frische, vergangene Termine angezeigt werden)
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        // WICHTIG: Das "T" im Datum durch ein Leerzeichen ersetzen, damit SQLite nicht durcheinanderkommt!
        let filterStr = `appointment >= "${yesterday.toISOString().replace('T', ' ')}"`;

        if (auth.type === 'client') {
            filterStr = `(client = "${auth.clientId}" || client ~ "${auth.clientId}") && ${filterStr}`;
        } else if (auth.type === 'contact') {
            const linkedClients = await pbAdmin.collection('clients').getFullList({ filter: `contacts ~ "${auth.contactId}" || caregiver = "${auth.contactId}"`, fields: 'id' });
            if (linkedClients.length === 0) return res.json({ success: true, appointments: [] });
            const clientIds = linkedClients.map(c => c.id);
            const clientFilter = clientIds.map(id => `(client = "${id}" || client ~ "${id}")`).join(' || ');
            filterStr = `(${clientFilter}) && ${filterStr}`;
        } else if (auth.type === 'admin' && req.query.client_id) {
            // Superadmin-Filter: Zeige nur Termine des ausgewählten Klienten
            filterStr = `(client = "${req.query.client_id}" || client ~ "${req.query.client_id}") && ${filterStr}`;
        }

        const appointments = await pbAdmin.collection('appointments').getFullList({
            filter: filterStr,
            sort: 'appointment',
            expand: 'user,time_record,drive_record,tasks,expenditures,appointment_at,client',
            requestKey: null
        });

        res.json({ success: true, appointments });
    } catch (err) {
        console.error("[PORTAL APPOINTMENTS] Fehler beim Laden der Termine:", err);
        res.status(500).json({ error: "Fehler beim Laden der Termine: " + err.message });
    }
});

// --- Klienten-Liste für den Admin im Portal abrufen ---
app.get(['/api/emails/portal/clients', '/portal/clients'], async (req, res) => {
    const auth = await resolvePortalAuth(req.headers.authorization);
    if (!auth || auth.type !== 'admin') return res.status(403).json({ error: "Nur für Administratoren zugänglich." });

    try {
        const pbAdmin = auth.pb || await getAdminPb();
        const clients = await pbAdmin.collection('clients').getFullList({ sort: 'name_first', requestKey: null });
        res.json({ success: true, clients: clients.map(c => ({ id: c.id, name_first: c.name_first, name_last: c.name_last })) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Benachrichtigung an Admin bei neuer Terminanfrage
app.post('/api/emails/portal/notify-request', async (req, res) => {
    const { name, email, phone, requestText, date, time, companyName } = req.body;

    try {
        let smtpUser = process.env.SMTP_USER;
        let smtpPass = process.env.SMTP_PASSWORD;
        let smtpHost = process.env.SMTP_HOST || 'smtp.ionos.de';
        let smtpPort = 465;

        if (!smtpUser || !smtpPass) {
            return res.status(500).json({ error: "E-Mail-Server ist nicht konfiguriert." });
        }

        const transporter = nodemailer.createTransport({ host: smtpHost, port: smtpPort, secure: smtpPort === 465, auth: { user: smtpUser, pass: smtpPass } });
        
        const subject = `Neue Terminanfrage von ${name || 'Unbekannt'}`;
        const htmlBody = `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                    <h2 style="color: #c66a4d;">Neue Terminanfrage eingegangen</h2>
                    <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin-top: 20px; border: 1px solid #eee;">
                        <p><strong>Name:</strong> ${name}</p>
                        <p><strong>E-Mail:</strong> ${email || '-'}</p>
                        <p><strong>Telefon:</strong> ${phone || '-'}</p>
                        <p><strong>Standort:</strong> ${companyName || '-'}</p>
                        <p><strong>Wunschdatum:</strong> ${date || '-'}</p>
                        <p><strong>Uhrzeit:</strong> ${time || '-'}</p>
                    </div>
                    <h3 style="margin-top: 20px; color: #555;">Anliegen:</h3>
                    <p style="background-color: #fff; border: 1px solid #eee; padding: 15px; border-radius: 8px; white-space: pre-wrap;">${(requestText || '').replace(/\n/g, '<br>')}</p>
                    <p style="margin-top: 30px; font-size: 12px; color: #999;">
                        Diese E-Mail wurde automatisch vom OrgaFlow System generiert. Sie finden die Anfrage in Ihrem Dashboard.
                    </p>
                </div>
            `;
        const textBody = `Neue Terminanfrage eingegangen\n-----------------------------\nName: ${name}\nE-Mail: ${email || '-'}\nTelefon: ${phone || '-'}\nStandort: ${companyName || '-'}\nWunschdatum: ${date || '-'}\nUhrzeit: ${time || '-'}\n\nAnliegen:\n${requestText || ''}\n\n-----------------------------\nDiese E-Mail wurde automatisch vom OrgaFlow System generiert.`;

        const info = await transporter.sendMail({
            from: `"OrgaFlow System" <${smtpUser}>`,
            to: "info@ihre-seniorenassistenz.com",
            subject: subject,
            html: htmlBody,
            text: textBody
        });

        console.log(`[PORTAL] E-Mail-Benachrichtigung für neue Terminanfrage gesendet.`);

        // Gesendete E-Mail in der Datenbank für die Nachverfolgung speichern
        try {
            const pbAdmin = await getAdminPb();
            await pbAdmin.collection('mailbox_messages').create({
                folder: "System",
                message_id: info.messageId || `sent-notify-${Date.now()}`,
                subject: subject,
                from_address: smtpUser,
                to_address: "info@ihre-seniorenassistenz.com",
                date: new Date().toISOString(),
                body_text: textBody,
                body_html: htmlBody,
                is_read: true
            });
            console.log(`[PORTAL] Gesendete Benachrichtigungs-E-Mail in der Datenbank archiviert.`);
        } catch (dbError) {
            console.error("[PORTAL] Fehler beim Archivieren der gesendeten E-Mail:", dbError);
        }

        res.json({ success: true });
        
        // --- PUSH BENACHRICHTIGUNG AN ALLE ADMINS ---
        try {
            if (process.env.VAPID_PUBLIC_KEY) {
                const pbAdmin = await getAdminPb();
                const admins = await pbAdmin.collection('_superusers').getFullList({ requestKey: null });
                
                const payload = JSON.stringify({
                    title: 'Neue Terminanfrage! 📬',
                    body: `${name || 'Jemand'} hat eine Anfrage gesendet.`,
                    url: '/dashboard'
                });

                for (const admin of admins) {
                    if (admin.push_subscriptions) {
                        let subs = admin.push_subscriptions;
                        if (typeof subs === 'string') { try { subs = JSON.parse(subs); } catch(e){} }
                        if (Array.isArray(subs)) {
                            for (const sub of subs) {
                                await webpush.sendNotification(sub, payload).catch(e => console.log('Alte/Ungültige Subscription:', e.statusCode));
                            }
                        }
                    }
                }
            }
        } catch (pushErr) { console.error("[PORTAL] Push konnte nicht gesendet werden:", pushErr); }
    } catch (err) {
        console.error("[PORTAL] Fehler beim Senden der Benachrichtigung:", err);
        res.status(500).json({ error: "Fehler beim Senden der Benachrichtigung." });
    }
});

// KI Sprachnotiz-Transkription (Gemini 1.5 Flash)
app.post('/api/emails/ai/transcribe', requireAuth, async (req, res) => { // Behält den Namen für Kompatibilität
    try {
        const { audioBase64, mimeType, prompt: customPrompt, inputText } = req.body;
        if (!audioBase64 && !inputText) return res.status(400).json({ error: "Kein Audio oder Text gesendet." });
        if (!process.env.GEMINI_API_KEY) return res.status(500).json({ error: "Gemini API Key fehlt im Server." });

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        
        const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite" });

        const defaultPrompt = "Du bist ein professioneller Assistent in der Seniorenbetreuung. Erstelle aus den folgenden Notizen/dem Diktat einen sachlichen, gut lesbaren Pflege- bzw. Besuchsbericht. Entferne Füllwörter, korrigiere Grammatikfehler und strukturiere den Text sinnvoll (z.B. mit Absätzen oder kurzen Stichpunkten). Bleibe beim 'Sie', wenn über den Klienten gesprochen wird. Schreibe KEINE Einleitung wie 'Hier ist der Bericht', sondern gib mir direkt nur den fertigen Text.";
        
        const promptToUse = customPrompt || defaultPrompt;

        const contentParts = [promptToUse];

        if (inputText) {
            contentParts.push(inputText);
        } else if (audioBase64) {
            contentParts.push({
                inlineData: {
                    mimeType: mimeType || "audio/webm",
                    data: audioBase64
                }
            });
        }

        const result = await model.generateContent(contentParts);

        res.json({ success: true, text: result.response.text() });
    } catch (error) {
        console.error("[KI] Fehler:", error);
        res.status(500).json({ error: "Fehler bei der KI-Generierung: " + error.message });
    }
});

// KI Kassenbon/Rechnung-Scanner (Gemini Vision)
app.post('/api/emails/ai/receipt', requireAuth, async (req, res) => {
    try {
        const { imageBase64, mimeType } = req.body;
        
        if (!imageBase64) return res.status(400).json({ error: "Kein Bild übergeben." });
        if (!process.env.GEMINI_API_KEY) return res.status(500).json({ error: "Gemini API Key fehlt im Server." });

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite" });

        const prompt = `Analysiere diesen Kassenbon/Rechnung und extrahiere die wichtigsten Daten.
Antworte AUSSCHLIESSLICH mit einem gültigen JSON-Objekt. Verwende KEINE Markdown-Blöcke (kein \`\`\`json).
Nutze exakt dieses Format:
{
  "title": "Kurzer Zweck der Ausgabe (z.B. Büromaterial, Tanken)",
  "supplier": "Name des Geschäfts oder Ausstellers (z.B. Aral, MediaMarkt, Adobe)",
  "amount": "Der Brutto-Endbetrag als reine Zahl (z.B. 14.50)",
  "netto": "Der Netto-Betrag als reine Zahl (z.B. 12.18, falls ausgewiesen)",
  "tax_sum": "Die enthaltene Steuer als reine Zahl (z.B. 2.32, falls ausgewiesen)",
  "tax_rate": "Der angewandte Steuersatz als reine Zahl (z.B. 19 oder 7)",
  "invoice_nr": "Rechnungsnummer oder Belegnummer (falls vorhanden, sonst leer)",
  "date": "Das Datum auf dem Beleg im Format YYYY-MM-DD",
  "category": "Ordne es zwingend EINER dieser Kategorien zu: 'Miete / Büro', 'Software / IT', 'Marketing', 'Fahrzeuge', 'Personal', oder 'Sonstiges'",
  "is_installment": true/false,
  "installment_current": "Die wievielte Rate es ist (z.B. 3, falls '3/12' oder '3. Rate' draufsteht)",
  "installment_total_count": "Die Gesamtanzahl der Raten (z.B. 12, falls '3/12' draufsteht)",
  "installment_total_amount": "Die Gesamtsumme der Anschaffung, falls es eine Ratenzahlung ist und diese auf dem Beleg ersichtlich ist (z.B. 1200.00)"
}`;

        const imagePart = { inlineData: { data: imageBase64, mimeType: mimeType || 'image/jpeg' } };

        const result = await model.generateContent([prompt, imagePart]);
        const responseText = result.response.text();
        
        // JSON extrem sicher parsen (falls die KI Text VOR dem JSON sendet)
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        const cleanJson = jsonMatch ? jsonMatch[0] : responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        res.json(JSON.parse(cleanJson));
    } catch (error) {
        console.error("[KI Receipt] Fehler:", error);
        res.status(500).json({ error: "KI Fehler: " + (error.message || "Unbekannter Fehler") });
    }
});

// Universeller Endpunkt (Catch-All für jede mögliche Weiterleitung)
app.post([
    '/api/emails/portal/push', 
    '/portal/push', 
    '/push', 
    '/api/push/send', 
    '/api/emails/push/send', 
    '/push/send'
], requireAuth, async (req, res) => {
    try {
        const { userId, title, body, url } = req.body;
        
        if (!userId || !title) return res.status(400).json({ error: "Fehlende Parameter." });
        if (!process.env.VAPID_PUBLIC_KEY) return res.status(500).json({ error: "VAPID Keys fehlen." });

        const pbAdmin = await getAdminPb();
        
        let targetUser;
        try { targetUser = await pbAdmin.collection('_superusers').getOne(userId); } catch (e) {}
        if (!targetUser) {
            try { targetUser = await pbAdmin.collection('users').getOne(userId); } catch (e) {}
        }

        if (targetUser && targetUser.push_subscriptions) {
            let subs = targetUser.push_subscriptions;
            if (typeof subs === 'string') { try { subs = JSON.parse(subs); } catch(e){} }
            const payload = JSON.stringify({ title, body, url: url || '/' });
            
            let pushResults = [];
            if (Array.isArray(subs)) {
                for (const sub of subs) {
                    try {
                        await webpush.sendNotification(sub, payload);
                        pushResults.push({ status: "success" });
                    } catch (e) {
                        console.error('[PUSH] Apple/Google Fehler:', e.statusCode, e.body);
                        pushResults.push({ status: "error", error: e.body || e.message });
                    }
                }
            }
            return res.json({ success: true, pushResults });
        }
        
        res.json({ success: false, error: "Keine Abonnements gefunden." });
    } catch (error) {
        console.error("[PUSH] Fehler:", error);
        res.status(500).json({ error: "Fehler beim Senden der Push-Benachrichtigung." });
    }
});

const PORT = process.env.PORT || 3000;
// Host weglassen, damit der Service unter localhost und IPv4/IPv6 erreichbar ist
app.listen(PORT, () => {
    console.log(`✉️ Email Microservice läuft erfolgreich auf http://localhost:${PORT}`);
});