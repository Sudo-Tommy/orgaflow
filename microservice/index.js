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
import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit'; // Hinzugefügt für PDF-Generierung
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Erlaubt Anfragen vom SvelteKit Frontend
app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// --- HILFSFUNKTION FÜR MENSCHENLESBARE LOGS ---
function getReadableAction(method, path) {
    let action = "geändert";
    if (method === 'POST') action = "erstellt";
    if (method === 'DELETE') action = "gelöscht";

    let subject = "Daten";

    // 1. PocketBase Tabellen erkennen
    const pbMatch = path.match(/collections\/([^\/]+)/);
    if (pbMatch) {
        const col = pbMatch[1];
        const dict = {
            'feedbacks': 'ein Feedback',
            'appointments': 'einen Termin',
            'clients': 'eine Klienten-Akte',
            'contacts': 'einen Kontakt / Angehörigen',
            'invoices': 'eine Rechnung',
            'time_records': 'eine Zeiterfassung',
            'drive_records': 'eine Fahrt',
            'expenditure': 'eine Ausgabe',
            'tasks': 'eine Leistung',
            'document_templates': 'eine Dokumenten-Vorlage',
            'users': 'einen Mitarbeiter-Zugang',
            'mailbox_messages': 'eine E-Mail / Systemnachricht',
            'appointment_requests': 'eine Terminanfrage',
            'retirement_homes': 'ein Pflegeheim',
            'insurancies': 'eine Krankenkasse',
            'stickies': 'eine Notiz (Post-it)'
        };
        subject = dict[col] || `einen System-Eintrag (${col})`;
        return `hat ${subject} ${action}`;
    }

    // 2. Custom Microservice Routen erkennen
    if (path.includes('/profile')) return `hat sein Profil ${action}`;
    if (path.includes('/mailing-list')) return `hat seine Info-Verteiler Einstellungen ${action}`;
    if (path.includes('/send')) return `hat eine E-Mail versendet`;
    if (path.includes('/verify-otp')) return `hat sich erfolgreich eingeloggt`;
    if (path.includes('/request-otp')) return `hat einen neuen Login-Code angefordert`;
    if (path.includes('/transcribe')) return `hat einen Text durch die KI generieren lassen`;
    if (path.includes('/traveltime/duration')) return `hat eine Fahrtzeit-Berechnung angefordert`;
    if (path.includes('/inbox')) return `hat den Posteingang abgerufen`;
    if (path.includes('/mark-read')) return `hat eine E-Mail als gelesen markiert`;
    if (path.includes('/delete')) return `hat E-Mails gelöscht`;
    if (path.includes('/vma/pdf')) return `hat eine Reisekostenabrechnung (VMA) als PDF generiert`;

    return `hat eine System-Aktion ausgeführt (${method})`;
}

// --- AUDIT LOG MIDDLEWARE ---
app.use(async (req, res, next) => {
    next();

    try {
        if (!req.path.startsWith('/api') && !req.path.startsWith('/portal')) return;
        if (req.path.includes('/frontend-audit')) return; // Wird vom separaten Endpoint unten behandelt
        if (req.path.includes('/realtime') || req.path.includes('auth-refresh') || req.path.includes('/logs')) return;

        const timestamp = new Date().toISOString();
        let userIdentifier = "Gast / Unbekannt";
        let userRole = "Gast";
        let authData = null;

        const authHeader = req.headers.authorization;
        if (authHeader) {
            authData = await resolvePortalAuth(authHeader).catch(() => null);
            if (authData) {
                userIdentifier = authData.name;
                if (authData.type === 'admin') userRole = 'System-Administrator';
                else if (authData.type === 'client') userRole = 'Klient';
                else if (authData.type === 'contact') userRole = 'Kontakt/Betreuer';
            }
        }

        const safeBody = { ...req.body };
        if (safeBody.password) safeBody.password = "***";
        if (safeBody.oldPassword) safeBody.oldPassword = "***";
        if (safeBody.passwordConfirm) safeBody.passwordConfirm = "***";
        if (safeBody.otp) safeBody.otp = "***";

        // Große Datenmengen/Dateien maskieren
        const fileKeys = ['sign', 'logo', 'avatar', 'imageBase64', 'audioBase64', 'pdf', 'documents', 'receipt_file', 'file'];
        for (const key of fileKeys) { if (safeBody[key]) safeBody[key] = "[DATEIANHANG / ZU LANG]"; }

        let payloadStr = Object.keys(safeBody).length > 0 ? JSON.stringify(safeBody) : "Keine Daten";
        if (payloadStr.length > 250) payloadStr = payloadStr.substring(0, 250) + '... (gekürzt)';

        const readableAction = getReadableAction(req.method, req.path);
        const logEntry = `[${timestamp}] [${userRole}] ${userIdentifier} ${readableAction}. | Route: ${req.path} | Daten: ${payloadStr}\n`;

        console.log(`\x1b[36m[AUDIT]\x1b[0m ${logEntry.trim()}`);
        fs.appendFile(path.join(__dirname, 'audit.log'), logEntry, () => {});

        // In DB speichern
        try {
            const pbAdmin = await getAdminPb();
            await pbAdmin.collection('audit_logs').create({
                user_name: authData?.name || "Gast",
                user_role: authData?.type === 'admin' ? 'System-Administrator' : (authData?.type === 'client' ? 'Klient' : (authData?.type === 'contact' ? 'Kontakt' : 'Gast')),
                action: readableAction,
                route: req.path,
                details: payloadStr
            });
        } catch(e) {}
    } catch (err) {
        console.error("Audit-Log Fehler:", err);
    }
});

// --- GLOBALE LOGGING MIDDLEWARE ---
app.use((req, res, next) => {
    const start = Date.now();
    const timestamp = new Date().toLocaleString('de-DE');
    
    // Wartet, bis die Anfrage abgeschlossen ist, um den Status und die Dauer zu loggen
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`[${timestamp}] 🚀 ${req.method} ${req.url} | Status: ${res.statusCode} | Dauer: ${duration}ms`);
    });
    
    next();
});

// --- FRONTEND (POCKETBASE) AUDIT LOG ENDPOINT ---
app.post(['/api/emails/portal/frontend-audit', '/portal/frontend-audit'], async (req, res) => {
    try {
        const { method, url, payload } = req.body;
        
        if (url.includes('/realtime') || url.includes('auth-refresh') || url.includes('/logs')) {
            return res.json({ success: true, ignored: true });
        }

        let userIdentifier = "Gast / Unbekannt";
        let userRole = "Gast";
        let authData = null;
        
        const authHeader = req.headers.authorization;
        if (authHeader) {
            authData = await resolvePortalAuth(authHeader).catch(() => null);
            if (authData) {
                userIdentifier = authData.name;
                if (authData.type === 'admin') userRole = 'System-Administrator';
                else if (authData.type === 'client') userRole = 'Klient';
                else if (authData.type === 'contact') userRole = 'Kontakt/Betreuer';
            }
        }

        const safeBody = typeof payload === 'object' && payload ? { ...payload } : payload || "Keine Daten";
        if (safeBody.password) safeBody.password = "***";
        if (safeBody.passwordConfirm) safeBody.passwordConfirm = "***";
        if (safeBody.oldPassword) safeBody.oldPassword = "***";

        // Große Datenmengen/Dateien im Frontend-Payload maskieren
        const fileKeys = ['sign', 'logo', 'avatar', 'imageBase64', 'audioBase64', 'pdf', 'documents', 'receipt_file', 'file'];
        for (const key of fileKeys) { if (safeBody[key]) safeBody[key] = "[DATEIANHANG / ZU LANG]"; }

        let payloadStr = typeof safeBody === 'object' ? JSON.stringify(safeBody) : String(safeBody);
        if (payloadStr.length > 250) payloadStr = payloadStr.substring(0, 250) + '... (gekürzt)';

        // Den verständlichen Satz für Frontend-Datenbankzugriffe generieren
        const readableAction = getReadableAction(method, url);
        const logEntry = `[${new Date().toISOString()}] [${userRole}] ${userIdentifier} ${readableAction}. | Daten: ${payloadStr}\n`;

        console.log(`\x1b[35m[PB-AUDIT]\x1b[0m ${logEntry.trim()}`);
        fs.appendFile(path.join(__dirname, 'audit.log'), logEntry, () => {});

        // In DB speichern
        try {
            const pbAdmin = await getAdminPb();
            await pbAdmin.collection('audit_logs').create({
                user_name: authData?.name || "Gast",
                user_role: authData?.type === 'admin' ? 'System-Administrator' : (authData?.type === 'client' ? 'Klient' : (authData?.type === 'contact' ? 'Kontakt' : 'Gast')),
                action: readableAction,
                route: url,
                details: payloadStr
            });
        } catch(e) {}

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Fehler beim Loggen" });
    }
});

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
            // Wenn PB gar nicht antwortet (Status 0), Fehler sofort werfen
            if (e.status === 0) throw e;
            const authData = await pb.collection('_superusers').authRefresh();
            user = authData.record || authData.admin;
        }
    } catch (err) {
        if (err.status === 0) throw new Error("PocketBase-Dienst (Datenbank) ist nicht erreichbar.");
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
        try {
            await pbAuth.collection('users').authRefresh();
        } catch (e) {
            if (e.status === 0) throw e; // PocketBase offline
            await pbAuth.collection('_superusers').authRefresh();
        }
        next();
    } catch (err) {
        if (err.status === 0) {
            return res.status(503).json({ error: 'PocketBase-Dienst ist nicht erreichbar' });
        }
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
                            is_read: message.flags?.has('\\Seen') || false,
                            attachments: parsed.attachments ? parsed.attachments.map(a => ({
                                filename: a.filename || 'anhang',
                                content: a.content.toString('base64'),
                                contentType: a.contentType
                            })) : []
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
                    const linkedClients = await pbAdmin.collection('clients').getFullList({ filter: `contacts ~ "${contact.id}" || caregiver ~ "${contact.id}"`, fields: 'id' });
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

        // 🛡️ DEV-MODE HACK: OTP-Code deutlich in die Konsole drucken
        const isDevMode = !process.env.NODE_ENV || process.env.NODE_ENV === 'development' || PB_URL.includes('127.0.0.1') || PB_URL.includes('localhost');
        if (isDevMode) {
            console.log('\n=============================================================');
            console.log(`🔑 DEV-MODE: Login-Code für ${email} lautet: ${otp}`);
            console.log('=============================================================\n');
        }

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
            if (isDevMode) {
                console.warn(`[PORTAL] ⚠️ DEV-MODE: SMTP-Daten fehlen. E-Mail wird übersprungen!`);
                return res.json({ success: true, devMode: true });
            }
            console.error(`[PORTAL] FEHLER: Weder in .env noch in Firmen-Einstellungen SMTP-Daten gefunden!`);
            return res.status(500).json({ error: "E-Mail-Server ist nicht konfiguriert." });
        }

        try {
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
        } catch (mailError) {
            if (isDevMode) {
                console.error(`[PORTAL] ⚠️ DEV-MODE: E-Mail-Fehler abgefangen (${mailError.message}). Bitte Code aus Konsole nutzen!`);
                return res.json({ success: true, devMode: true });
            }
            throw mailError; // Wird vom äußeren catch-Block gefangen, falls in Produktion
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

        // Holt sich den vollständigen Namen aus der Datenbank für die Begrüßung im Portal
        let nameFirst = "";
        let nameLast = "";
        try {
            const collection = otpRecord.user_type === 'client' ? 'clients' : 'contacts';
            const userRecord = await pbAdmin.collection(collection).getOne(otpRecord.user_id);
            nameFirst = userRecord.name_first || "";
            nameLast = userRecord.name_last || "";
        } catch (e) { console.warn("[PORTAL] Konnte Benutzernamen für Token nicht laden:", e.message); }

        const payload = {
            id: otpRecord.user_id,
            type: otpRecord.user_type, // 'client' oder 'contact'
            email: otpRecord.email,
            name_first: nameFirst,
            name_last: nameLast
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
            try {
                await pb.collection('users').authRefresh();
            } catch (e) {
                await pb.collection('_superusers').authRefresh();
            }
            const model = pb.authStore.model;
            const role = model?.role || (pb.authStore.isAdmin ? 'admin' : null);
            if (role === 'superadmin' || role === 'admin') return { 
                type: 'admin', 
                pb: pb, 
                email: model?.email,
                name: model?.name || `${model?.name_first || ''} ${model?.name_last || ''}`.trim() || 'Administrator'
            };
        }
    } catch(e) {
        // Fallthrough
    }
    
    try {
        if (!process.env.JWT_SECRET) return null;
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.type === 'client' && decoded.id) return { 
            type: 'client', 
            clientId: decoded.id, 
            email: decoded.email,
            name: `${decoded.name_first || ''} ${decoded.name_last || ''}`.trim() || 'Klient'
        };
        if (decoded.type === 'contact' && decoded.id) return { 
            type: 'contact', 
            contactId: decoded.id, 
            email: decoded.email,
            name: `${decoded.name_first || ''} ${decoded.name_last || ''}`.trim() || 'Kontakt'
        };
    } catch (err) { /* Ungültiger Token */ }
    
    return null;
}

// --- Info-Verteiler (Mailing List) abfragen ---
app.get(['/api/emails/portal/mailing-list', '/portal/mailing-list'], async (req, res) => {
    const auth = await resolvePortalAuth(req.headers.authorization);
    if (!auth) return res.status(401).json({ error: "Session abgelaufen oder ungültig. Bitte neu anmelden." });

    try {
        const pbAdmin = auth.pb || await getAdminPb();
        const userEmail = auth.email;

        if (!userEmail) return res.status(400).json({ error: "Keine E-Mail-Adresse im Token gefunden." });

        // Finde alle Klienten, bei denen der Nutzer Betreuer, Angehöriger oder der Klient selbst ist
        const clients = await pbAdmin.collection('clients').getFullList({
            filter: `email = "${userEmail}" || contacts.email ?= "${userEmail}" || caregiver.email ?= "${userEmail}"`,
            requestKey: null
        });

        let isSubscribed = false;
        for (const client of clients) {
            const list = Array.isArray(client.mailing_list) ? client.mailing_list : [];
            if (list.includes(userEmail)) {
                isSubscribed = true;
                break;
            }
        }

        res.json({ success: true, subscribed: isSubscribed, email: userEmail });
    } catch (err) {
        console.error("[PORTAL MAILING-LIST GET]", err);
        res.status(500).json({ error: "Fehler beim Abrufen des Verteiler-Status." });
    }
});

// --- Info-Verteiler (Mailing List) umschalten ---
app.post(['/api/emails/portal/mailing-list', '/portal/mailing-list'], async (req, res) => {
    const auth = await resolvePortalAuth(req.headers.authorization);
    if (!auth) return res.status(401).json({ error: "Session abgelaufen oder ungültig. Bitte neu anmelden." });

    try {
        const { subscribed } = req.body;
        const pbAdmin = auth.pb || await getAdminPb();
        const userEmail = auth.email;

        if (!userEmail) return res.status(400).json({ error: "Keine E-Mail-Adresse im Token gefunden." });

        const clients = await pbAdmin.collection('clients').getFullList({
            filter: `email = "${userEmail}" || contacts.email ?= "${userEmail}" || caregiver.email ?= "${userEmail}"`,
            requestKey: null
        });

        let updatedCount = 0;
        for (const client of clients) {
            let mailingList = Array.isArray(client.mailing_list) ? [...client.mailing_list] : [];
            let listChanged = false;
            
            if (subscribed) {
                if (!mailingList.includes(userEmail)) {
                    mailingList.push(userEmail);
                    listChanged = true;
                }
            } else {
                if (mailingList.includes(userEmail)) {
                    mailingList = mailingList.filter(e => e !== userEmail);
                    listChanged = true;
                }
            }

            if (listChanged) {
                await pbAdmin.collection('clients').update(client.id, { mailing_list: mailingList });
                updatedCount++;
            }
        }

        res.json({ success: true, subscribed, message: `Verteiler für ${updatedCount} Klienten aktualisiert.` });
    } catch (err) {
        console.error("[PORTAL MAILING-LIST POST]", err);
        res.status(500).json({ error: "Fehler beim Aktualisieren des Verteilers." });
    }
});

app.get(['/api/emails/portal/invoices', '/portal/invoices', '/invoices'], async (req, res) => {
    const auth = await resolvePortalAuth(req.headers.authorization);
    if (!auth) return res.status(401).json({ error: "Session abgelaufen oder ungültig. Bitte neu anmelden." });
    
    try {
        const pbAdmin = auth.pb || await getAdminPb();
        
        let filterStr = `(status = "Eingereicht" || status = "Abgeschlossen" || status = "In Bearbeitung")`;
        if (auth.type === 'client') {
            filterStr = `(client = "${auth.clientId}" || client ~ "${auth.clientId}") && ${filterStr}`;
        } else if (auth.type === 'contact') {
            const linkedClients = await pbAdmin.collection('clients').getFullList({ filter: `contacts ~ "${auth.contactId}" || caregiver ~ "${auth.contactId}"`, fields: 'id' });
            if (linkedClients.length === 0) return res.json({ success: true, invoices: [] });
            const clientIds = linkedClients.map(c => c.id);
            const clientFilter = clientIds.map(id => `(client = "${id}" || client ~ "${id}")`).join(' || ');
            filterStr = `(${clientFilter}) && ${filterStr}`;
        } else if (auth.type === 'admin' && req.query.client_id) {
            filterStr = `(client = "${req.query.client_id}" || client ~ "${req.query.client_id}") && ${filterStr}`;
        }
        
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
            const linkedClients = await pbAdmin.collection('clients').getFullList({ filter: `contacts ~ "${auth.contactId}" || caregiver ~ "${auth.contactId}"`, fields: 'id' });
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

// --- Klienten für eingeloggte Portal-Nutzer abfragen ---
app.get(['/api/emails/portal/clients', '/portal/clients'], async (req, res) => {
    const auth = await resolvePortalAuth(req.headers.authorization);
    if (!auth) return res.status(401).json({ error: "Session abgelaufen oder ungültig. Bitte neu anmelden." });

    try {
        const pbAdmin = auth.pb || await getAdminPb();
        
        // Wenn es ein Admin ist und KEIN spezifischer caregiverOnly-Filter gesetzt ist, geben wir alle zurück
        if (auth.type === 'admin' && req.query.caregiverOnly !== 'true') {
            const clients = await pbAdmin.collection('clients').getFullList({ sort: 'name_first', requestKey: null });
            return res.json({ success: true, clients: clients.map(c => ({ id: c.id, name: `${c.name_first} ${c.name_last}`.trim() })) });
        }

        const userEmail = auth.email;
        if (!userEmail) return res.json({ success: true, clients: [] });

        // Prüfe, ob das Frontend (z.B. Termin-Anfrage) streng nur "Betreuer"-Klienten verlangt
        const isCaregiverOnly = req.query.caregiverOnly === 'true';
        
        const filterQuery = isCaregiverOnly 
            ? `caregiver.email ?= "${userEmail}"` 
            : `email = "${userEmail}" || contacts.email ?= "${userEmail}" || caregiver.email ?= "${userEmail}"`;

        const clients = await pbAdmin.collection('clients').getFullList({ filter: filterQuery, requestKey: null });
        const mapped = clients.map(c => ({ id: c.id, name: `${c.name_first} ${c.name_last}`.trim() }));

        res.json({ success: true, clients: mapped });
    } catch (err) {
        console.error("[PORTAL CLIENTS GET]", err);
        res.status(500).json({ error: "Fehler beim Laden der Klienten." });
    }
});

// --- Profil-Daten für das Portal abrufen (GET) ---
app.get(['/api/emails/portal/profile', '/portal/profile'], async (req, res) => {
    const auth = await resolvePortalAuth(req.headers.authorization);
    if (!auth) return res.status(401).json({ error: "Session abgelaufen oder ungültig. Bitte neu anmelden." });

    try {
        const pbAdmin = auth.pb || await getAdminPb();
        let profile = null;

        if (auth.type === 'client') {
            profile = await pbAdmin.collection('clients').getOne(auth.clientId, { requestKey: null });
        } else if (auth.type === 'contact') {
            profile = await pbAdmin.collection('contacts').getOne(auth.contactId, { requestKey: null });
        } else if (auth.type === 'admin') {
            // Für interne Mitarbeiter (falls diese sich ins Portal einloggen)
            const userEmail = auth.email;
            if (!userEmail) return res.status(400).json({ error: "Keine E-Mail im Token." });
            profile = await pbAdmin.collection('users').getFirstListItem(`email="${userEmail}"`, { requestKey: null }).catch(() => null);
            if (!profile) profile = auth.pb.authStore.model;
        }

        if (!profile) return res.status(404).json({ error: "Profil nicht gefunden." });

        res.json({ success: true, profile });
    } catch (err) {
        console.error("[PORTAL PROFILE GET]", err);
        res.status(500).json({ error: "Fehler beim Laden des Profils." });
    }
});

// --- Profil-Daten für das Portal aktualisieren (PUT) ---
app.put(['/api/emails/portal/profile', '/portal/profile'], async (req, res) => {
    const auth = await resolvePortalAuth(req.headers.authorization);
    if (!auth) return res.status(401).json({ error: "Session abgelaufen oder ungültig. Bitte neu anmelden." });

    try {
        const pbAdmin = auth.pb || await getAdminPb();
        const { name_first, name_last, email, phone, street, housenr, zip, city } = req.body;

        const updateData = { name_first, name_last, email, phone, street, housenr, zip, city };
        let updatedProfile = null;

        if (auth.type === 'client') {
            updatedProfile = await pbAdmin.collection('clients').update(auth.clientId, updateData);
        } else if (auth.type === 'contact') {
            updatedProfile = await pbAdmin.collection('contacts').update(auth.contactId, updateData);
        } else if (auth.type === 'admin') {
            // Bei Mitarbeitern heißt das Feld in der Datenbank 'tel' statt 'phone'
            const adminUpdateData = { name_first, name_last, email, tel: phone, street, housenr, zip, city };
            const collection = auth.pb.authStore.model.collectionName;
            updatedProfile = await pbAdmin.collection(collection).update(auth.pb.authStore.model.id, adminUpdateData);
        }

        res.json({ success: true, profile: updatedProfile });
    } catch (err) {
        console.error("[PORTAL PROFILE PUT]", err);
        res.status(500).json({ error: "Fehler beim Speichern des Profils." });
    }
});

// --- Neue Klienten-Aufnahme über das Portal anfragen ---
app.post(['/api/emails/portal/new-client', '/portal/new-client'], async (req, res) => {
    const auth = await resolvePortalAuth(req.headers.authorization);
    if (!auth) return res.status(401).json({ error: "Session abgelaufen oder ungültig. Bitte neu anmelden." });

    try {
        const pbAdmin = auth.pb || await getAdminPb();
        const { 
            company, salutation, name_first, name_last, birthdate, marital_status, 
            nationality, street, housenr, zip, city, email, phone, handy, 
            level_of_care, insurance_nr, insurance, retirement_homes, notes 
        } = req.body;

        if (!name_first || !name_last || !company) {
            return res.status(400).json({ error: "Vorname, Nachname und Standort (Firma) sind erforderlich." });
        }

        const payload = {
            company: [company],
            salutation,
            name_first,
            name_last,
            marital_status,
            nationality,
            street,
            housenr,
            zip,
            city,
            email,
            phone,
            handy,
            level_of_care,
            insurance_nr,
            status: "Inaktiv", // Steht standardmäßig auf Inaktiv, bis ihr ihn wirklich übernehmt!
            notes: `⚠️ NEUAUFNAHME-ANFRAGE: ${notes}\nEingereicht von: ${auth.email || 'Unbekannt'}`
        };

        if (birthdate) {
            payload.birthdate = `${birthdate} 12:00:00.000Z`;
        }
        
        if (insurance) payload.insurance = [insurance];
        if (retirement_homes) payload.retirement_homes = [retirement_homes];

        // Wenn die Anfrage von einem Betreuer/Kontakt kommt, verknüpfen wir ihn sofort automatisch!
        if (auth.type === 'contact') {
            payload.caregiver = [auth.contactId];
        }

        await pbAdmin.collection('clients').create(payload);

        res.json({ success: true });
    } catch (err) {
        console.error("[PORTAL NEW CLIENT POST]", err);
        res.status(500).json({ error: "Fehler beim Anlegen des Klienten." });
    }
});

// Benachrichtigung an Admin bei neuer Terminanfrage
app.post(['/api/emails/portal/notify-request', '/portal/notify-request'], async (req, res) => {
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

// KI Sprachnotiz-Transkription (Gemini 3.5 Flash)
app.post('/api/emails/ai/transcribe', requireAuth, async (req, res) => { // Behält den Namen für Kompatibilität
    try {
        const { audioBase64, mimeType, prompt: customPrompt, inputText } = req.body;
        if (!audioBase64 && !inputText) return res.status(400).json({ error: "Kein Audio oder Text gesendet." });
        if (!process.env.GEMINI_API_KEY) return res.status(500).json({ error: "Gemini API Key fehlt im Server." });

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        
        const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });

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
        const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });

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

// --- VMA PDF GENERIERUNG ---
app.post(['/api/emails/vma/pdf', '/api/vma/pdf', '/portal/vma/pdf'], requireAuth, async (req, res) => {
    try { // Removed totalSum from destructuring as it's already in the payload
        const { userName, period, reports, totalSum, totalAbsenceSum, totalVMASum, totalAccommodationSum } = req.body;
        
        console.log(`[VMA] Generiere PDF für ${userName} (${period})`);

        const doc = new PDFDocument({ margin: 50, size: 'A4' });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="VMA_${period.replace(/\s+/g, '_')}.pdf"`);
        
        doc.pipe(res);

        // Header
        doc.fontSize(20).text('Verpflegungsmehraufwand (VMA)', { align: 'center' });
        doc.moveDown();
        doc.fontSize(11); // Setzt die Schriftgröße für den Infobereich herab
        doc.text(`Zeitraum: ${period}`);
        // Datumsformat auf DD.MM.YYYY geändert
        doc.text(`Erstellt am: ${new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}`);
        doc.moveDown();

        // Tabelle Header
        const tableTop = doc.y + 15;
        doc.fontSize(10).font('Helvetica-Bold');
        doc.text('Datum', 50, tableTop);
        doc.text('Ziel', 95, tableTop);
        doc.text('Zweck', 200, tableTop);
        doc.text('Abwes.', 315, tableTop);
        doc.text('VMA', 380, tableTop);
        doc.text('Übernacht.', 435, tableTop);
        doc.text('Gesamt', 500, tableTop);
        
        doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();
        doc.font('Helvetica');

        let y = tableTop + 22;
        (reports || []).forEach(report => {
            doc.fontSize(9); // Kleinere Schrift für die Tabelleneinträge
            
            // Dynamische Höhenberechnung basierend auf dem Textinhalt, um Überlappungen zu vermeiden
            const destinationHeight = doc.heightOfString(report.destination || '', { width: 100 });
            const purposeHeight = doc.heightOfString(report.purpose || '', { width: 110 });
            const rowHeight = Math.max(destinationHeight, purposeHeight, 12);

            if (y + rowHeight > 780) { doc.addPage(); y = 50; }
            
            doc.text(report.date || '', 50, y);
            doc.text(report.destination || '', 95, y, { width: 100 });
            doc.text(report.purpose || '', 200, y, { width: 110 });
            doc.text(report.absence || '', 315, y);
            doc.text(report.perDiem || '', 380, y);
            doc.text(report.accommodation || '', 435, y);
            doc.text(report.total || '', 500, y);
            y += rowHeight + 8; // Dynamischer Vorschub plus Padding
        });

        doc.moveTo(50, y).lineTo(550, y).stroke();
        y += 10;
        doc.fontSize(10).font('Helvetica-Bold');
        doc.text('Gesamtsumme:', 315, y, { width: 180, align: 'right' });
        doc.text(totalSum || '0,00 €', 500, y, { width: 50, align: 'right' });

        // Summen-Aufschlüsselung unter der Tabelle
        y += 25; // Abstand zur Haupttabelle
        doc.fontSize(10).font('Helvetica-Bold');
        doc.text('Summen-Aufschlüsselung:', 50, y);
        y += 15;

        doc.font('Helvetica');
        doc.text('Abwesenheit gesamt:', 50, y);
        doc.text(totalAbsenceSum || '0h 0m', 200, y, { width: 100, align: 'right' });
        y += 15;

        doc.text('VMA (Verpflegung):', 50, y);
        doc.text(totalVMASum ? `${totalVMASum} €` : '0,00 €', 200, y, { width: 100, align: 'right' });
        y += 15;

        doc.text('Übernachtung:', 50, y);
        doc.text(totalAccommodationSum ? `${totalAccommodationSum} €` : '0,00 €', 200, y, { width: 100, align: 'right' });
        y += 15;

        // Gesamt Auszahlung (fett)
        doc.font('Helvetica-Bold');
        doc.text('Gesamt Auszahlung:', 50, y);
        doc.text(totalSum || '0,00 €', 200, y, { width: 100, align: 'right' }); // Use totalSum from payload
        y += 15;

        // Optional: Eine Linie unter der Summen-Aufschlüsselung
        doc.moveTo(50, y).lineTo(300, y).stroke();

        doc.end();

    } catch (error) {
        console.error("[VMA PDF] Fehler:", error);
        res.status(500).json({ error: "Interner Fehler bei der PDF-Erstellung." });
    }
});

// --- TRAVELTIME API PROXY ---
// Berechnet Fahrtzeit und Distanz zwischen zwei Adressen via TravelTime API
app.post([
    '/api/emails/traveltime/duration', 
    '/api/traveltime/duration', 
    '/api/vma/duration',
    '/portal/traveltime/duration',
    '/api/emails/portal/traveltime/duration'
], requireAuth, async (req, res) => {
    try {
        const { origin, destination } = req.body;
        if (!origin || !destination) {
            return res.status(400).json({ error: "Start- und Zieladresse sind erforderlich." });
        }

        const appId = process.env.TRAVELTIME_APP_ID || 'c7ac9a66';
        const apiKey = process.env.TRAVELTIME_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ error: "TravelTime API Key ist auf dem Server nicht konfiguriert (.env)." });
        }

        // 1. Geocoding: Adressen in Koordinaten umwandeln
        const geocode = async (address) => {
            const response = await fetch(`https://api.traveltimeapp.com/v4/geocoding/search?query=${encodeURIComponent(address)}`, {
                method: 'GET',
                headers: {
                    'X-Application-Id': appId,
                    'X-Api-Key': apiKey,
                    'Accept': 'application/json',
                    'Accept-Language': 'de-DE' // Hinzugefügt für BCP47 Standard
                }
            });
            const data = await response.json();
            if (!response.ok) {
                console.error(`[TravelTime API] ${response.status}:`, data);
                throw new Error(`Geocoding Fehler (${response.status}) für: ${address}`);
            }
            return data.features?.[0]?.geometry?.coordinates; // Liefert [lng, lat]
        };

        const originCoords = await geocode(origin);
        const destCoords = await geocode(destination);

        if (!originCoords || !destCoords) {
            return res.status(404).json({ error: "Eine oder beide Adressen konnten nicht gefunden werden." });
        }

        // 2. Routing: Reisezeit und Distanz abfragen
        const routesRes = await fetch('https://api.traveltimeapp.com/v4/routes', {
            method: 'POST',
            headers: {
                'X-Application-Id': appId,
                'X-Api-Key': apiKey,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                locations: [
                    { id: "start", coords: { lat: originCoords[1], lng: originCoords[0] } },
                    { id: "end", coords: { lat: destCoords[1], lng: destCoords[0] } }
                ],
                departure_searches: [{
                    id: "driving-route",
                    departure_location_id: "start",
                    arrival_location_ids: ["end"],
                    transportation: { type: "driving" },
                    departure_time: new Date().toISOString(),
                    properties: ["travel_time", "distance"]
                }]
            })
        });

        const routesData = await routesRes.json();
        const result = routesData.results?.[0]?.locations?.[0]?.properties?.[0];

        if (result && result.travel_time) {
            return res.json({
                success: true,
                duration: Math.ceil(result.travel_time / 60), // Sekunden in Minuten aufgerundet
                distance: Math.round((result.distance / 1000) * 10) / 10 // Meter in Kilometer (1 Nachkommastelle)
            });
        }

        res.status(404).json({ error: "Keine Route zwischen diesen Orten gefunden." });
    } catch (error) {
        console.error("[TravelTime] Fehler:", error);
        res.status(500).json({ error: "Interner Fehler bei der Routenberechnung." });
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