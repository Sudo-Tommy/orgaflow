// EventSource Polyfill für Node.js (PocketBase Realtime benötigt dies)
// Das 'eventsource' Paket ist CJS und exportiert { EventSource, ErrorEvent }
import { createRequire } from 'module';
const _require = createRequire(import.meta.url);
const { EventSource } = _require('eventsource');
if (typeof globalThis.EventSource === 'undefined') {
    globalThis.EventSource = EventSource;
}

// Globale Crash-Protection für Node.js (Verhindert unkontrollierten Absturz des Microservice)
process.on('unhandledRejection', (reason, promise) => {
    console.error('[CRASH-PREVENTION] Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (err) => {
    console.error('[CRASH-PREVENTION] Uncaught Exception:', err);
});

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import PocketBase from 'pocketbase';
import jwt from 'jsonwebtoken';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleGenAI, Type } from '@google/genai';
import webpush from 'web-push';
import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit'; // Hinzugefügt für PDF-Generierung
import PDFTableDocument from 'pdfkit-table';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { fileURLToPath } from 'url';

import crypto from 'crypto';
import {
    generateAuthUrl,
    handleOAuthCallback,
    getValidAccessToken,
    syncAppointmentToGoogle,
    deleteAppointmentFromGoogle,
    syncAllUpcomingAppointments,
    disconnectGoogleCalendar,
    getGoogleCredentials,
    isRecentSelfUpdate,
    fetchExternalGoogleEvents,
    sendEmailViaGmailOAuth2
} from './googleCalendarService.js';
import { sanitizeReportText, sanitizeAppointments } from './reportSanitizer.js';
import { generateWeeklyFeedbackDigest } from './feedbackDigestService.js';
import { generateSingleFeedbackPrompt } from './singleFeedbackPromptService.js';
import { generateSolutionConcept } from './solutionConceptService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Beide .env Dateien laden (lokale und root)
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

const app = express();

// Erlaubt Anfragen vom SvelteKit Frontend
app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// --- GLOBALE LOGGING MIDDLEWARE ---
app.use((req, res, next) => {
    const start = Date.now();
    const timestamp = new Date().toLocaleString('de-DE');
    
    // Wartet, bis die Anfrage abgeschlossen ist, um den Status und die Dauer zu loggen
    res.on('finish', () => {
        // Spezifische Routen vom Logging ausschließen
        if (req.path.includes('/frontend-audit')) return;

        const duration = Date.now() - start;
        console.log(`[${timestamp}] 🚀 ${req.method} ${req.url} | Status: ${res.statusCode} | Dauer: ${duration}ms`);
    });
    
    next();
});

// PocketBase ist intern (hinter Nginx) weiterhin sicher auf Port 8090 erreichbar
const PB_URL = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090';

// Globaler Cache für die Admin-Instanz um Login-Spam zu vermeiden
let pbAdminInstance = null;

// Web-Push Konfiguration (VAPID Keys)
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    try {
        webpush.setVapidDetails(
            'mailto:info@ihre-seniorenassistenz.com',
            process.env.VAPID_PUBLIC_KEY,
            process.env.VAPID_PRIVATE_KEY
        );
    } catch (e) { console.error("VAPID Setup Error:", e); }
}


// Middleware zur strengen Authentifizierung via PocketBase
async function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Zugriff verweigert: Kein Token oder nicht eingeloggt' });
    }
    const token = authHeader.replace('Bearer ', '');
    const pbAuth = new PocketBase(PB_URL);
    pbAuth.autoCancellation(false);
    pbAuth.authStore.save(token, null);
    try {
        try {
            const authRes = await pbAuth.collection('users').authRefresh();
            req.user = authRes.record || pbAuth.authStore.record || pbAuth.authStore.model;
        } catch (e) {
            if (e.status === 0) throw e; // PocketBase offline
            const authRes = await pbAuth.collection('_superusers').authRefresh();
            req.user = authRes.record || pbAuth.authStore.record || pbAuth.authStore.model;
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

// --- PORTAL ROUTEN (Für Klienten) ---

async function getAdminPb() {
    // Cache nutzen um ständige Re-Logins zu vermeiden
    if (pbAdminInstance && pbAdminInstance.authStore.isValid) {
        return pbAdminInstance;
    }
    
    pbAdminInstance = new PocketBase(PB_URL);
    pbAdminInstance.autoCancellation(false);
    const adminEmail = process.env.PB_ADMIN_EMAIL;
    const adminPass = process.env.PB_ADMIN_PASSWORD;
    if (!adminEmail || !adminPass) throw new Error("PB_ADMIN_EMAIL und PB_ADMIN_PASSWORD fehlen in .env");
    await pbAdminInstance.collection('_superusers').authWithPassword(adminEmail, adminPass);
    return pbAdminInstance;
}

// Erkennt abgelaufene (HTTP 410 / 404) oder ungültige Web-Push-Subscriptions
function isDeadSubscription(err) {
    if (!err) return false;
    const code = err.statusCode || err.status;
    if (code === 404 || code === 410) return true;
    const bodyText = typeof err.body === 'string' ? err.body : JSON.stringify(err.body || {});
    const msg = `${err.message || ''} ${bodyText}`.toLowerCase();
    return msg.includes('unregistered') ||
           msg.includes('expired') ||
           msg.includes('notregistered') ||
           msg.includes('gone') ||
           msg.includes('invalidregistration') ||
           msg.includes('baddevicetoken') ||
           msg.includes('devicenotregistered') ||
           msg.includes('not a valid push subscription');
}

/**
 * Sendet eine Web-Push-Benachrichtigung mit einem harten Timeout (max. 3500 ms).
 * Verhindert das Einfrieren von Prozessen bei hängenden Apple/Google Push-Gateways.
 */
async function sendPushWithTimeout(sub, payload, options = {}, timeoutMs = 3500) {
    let timer;
    const timeoutPromise = new Promise((_, reject) => {
        timer = setTimeout(() => {
            const err = new Error(`Push notification timed out after ${timeoutMs}ms`);
            err.name = 'TimeoutError';
            err.statusCode = 408;
            reject(err);
        }, timeoutMs);
    });

    try {
        return await Promise.race([
            webpush.sendNotification(sub, payload, options),
            timeoutPromise
        ]);
    } finally {
        clearTimeout(timer);
    }
}

// Bereinigt abgelaufene (HTTP 410 / 404 / ungültige Tokens) Web-Push-Abonnements aus PocketBase
async function cleanupDeadPushSubscriptions(pbAdmin, collection, userId, deadEndpoints) {
    if (!deadEndpoints || deadEndpoints.size === 0 || !userId) return;
    try {
        let col = collection || 'users';
        let record = null;
        try {
            record = await pbAdmin.collection(col).getOne(userId, { requestKey: null });
        } catch {
            const fallbackCol = col === 'users' ? '_superusers' : 'users';
            try {
                record = await pbAdmin.collection(fallbackCol).getOne(userId, { requestKey: null });
                if (record) col = fallbackCol;
            } catch {}
        }
        if (!record) return;

        let currentSubs = record.push_subscriptions;
        if (typeof currentSubs === 'string') {
            try { currentSubs = JSON.parse(currentSubs); } catch(e) { currentSubs = []; }
        }
        if (Array.isArray(currentSubs)) {
            const filtered = currentSubs.filter(s => s && s.endpoint && typeof s.endpoint === 'string' && !deadEndpoints.has(s.endpoint));
            if (filtered.length !== currentSubs.length) {
                await pbAdmin.collection(col).update(userId, { push_subscriptions: filtered }, { requestKey: null });
                console.log(`[PUSH] ${currentSubs.length - filtered.length} abgelaufene/ungültige Push-Abonnements für ${userId} (${col}) automatisch bereinigt.`);
            }
        }
    } catch (cleanErr) {
        console.warn(`[PUSH] Konnte abgelaufene Abonnements für ${userId} nicht bereinigen:`, cleanErr.message);
    }
}

// Audit-Log Endpunkt für Frontend-Aktivitäten (verhindert 404 und loggt nach audit.log)
app.post(['/api/emails/portal/frontend-audit', '/portal/frontend-audit'], (req, res) => {
    try {
        const { method, url, payload } = req.body || {};
        const timestamp = new Date().toISOString();
        const user = req.headers.authorization ? 'Auth-User' : 'Gast / Unbekannt';
        const logLine = `[${timestamp}] [${method || 'UNKNOWN'}] ${url || ''} | User: ${user} | Payload: ${JSON.stringify(payload || {})}\n`;
        const auditFile = path.resolve(__dirname, 'audit.log');
        fs.appendFile(auditFile, logLine, () => {});
    } catch (e) {}
    res.json({ ok: true });
});

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

        // Holt sich den vollständigen Namen und die Anrede aus der Datenbank für die Begrüßung im Portal
        let nameFirst = "";
        let nameLast = "";
        let salutation = "";
        try {
            const collection = otpRecord.user_type === 'client' ? 'clients' : 'contacts';
            const userRecord = await pbAdmin.collection(collection).getOne(otpRecord.user_id);
            nameFirst = userRecord.name_first || "";
            nameLast = userRecord.name_last || "";
            salutation = userRecord.salutation || "";
        } catch (e) { console.warn("[PORTAL] Konnte Benutzernamen für Token nicht laden:", e.message); }

        const payload = {
            id: otpRecord.user_id,
            type: otpRecord.user_type, // 'client' oder 'contact'
            email: otpRecord.email,
            name_first: nameFirst,
            name_last: nameLast,
            salutation: salutation
        };

        if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET ist nicht in der .env Datei konfiguriert!");

        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
        await pbAdmin.collection('otp_codes').delete(otpRecord.id);
        res.json({ success: true, token });
    } catch (err) {
        res.status(401).json({ error: "Code ist ungültig oder abgelaufen." });
    }
});

app.post(['/api/emails/portal/auth-with-id', '/portal/auth-with-id'], async (req, res) => {
    const { email, password } = req.body; // password is the user's ID
    if (!email || !password) {
        return res.status(400).json({ error: "E-Mail oder ID fehlt." });
    }

    try {
        const pbAdmin = await getAdminPb();
        let userRecord = null;
        let userType = '';

        // Versuche, einen Klienten zu finden
        try {
            userRecord = await pbAdmin.collection('clients').getOne(password);
            if (userRecord.email.toLowerCase() !== email.toLowerCase()) userRecord = null;
            else userType = 'client';
        } catch (e) { /* nicht gefunden, weiter suchen */ }

        // Wenn kein Klient, versuche einen Kontakt zu finden
        if (!userRecord) {
            try {
                userRecord = await pbAdmin.collection('contacts').getOne(password);
                if (userRecord.email.toLowerCase() !== email.toLowerCase()) userRecord = null;
                else userType = 'contact';
            } catch (e) { /* nicht gefunden */ }
        }

        if (!userRecord) {
            return res.status(401).json({ error: "Ungültige E-Mail oder ID." });
        }

        const payload = { 
            id: userRecord.id, 
            type: userType, 
            email: userRecord.email, 
            name_first: userRecord.name_first, 
            name_last: userRecord.name_last,
            salutation: userRecord.salutation || ""
        };
        if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET ist nicht in der .env Datei konfiguriert!");
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.json({ success: true, token });
    } catch (err) {
        res.status(500).json({ error: "Serverfehler bei der Authentifizierung." });
    }
});

// 🔑 Neuer Portal PIN-Login (Für PC & Senioren mit E-Mail + PIN)
app.post(['/api/emails/portal/auth-with-pin', '/portal/auth-with-pin'], async (req, res) => {
    const { email, pin } = req.body;
    if (!email || !pin) {
        return res.status(400).json({ error: "E-Mail-Adresse und PIN erforderlich." });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanPin = String(pin).trim();

    try {
        const pbAdmin = await getAdminPb();
        let userRecord = null;
        let userType = '';

        // 1. In Clients suchen
        try {
            const list = await pbAdmin.collection('clients').getList(1, 1, {
                filter: `email = "${cleanEmail}" && portal_pin = "${cleanPin}"`,
                requestKey: null
            });
            if (list.items.length > 0) {
                userRecord = list.items[0];
                userType = 'client';
            }
        } catch (e) {
            console.warn("[PORTAL PIN AUTH] Clients-Suche:", e.message);
        }

        // 2. In Contacts suchen
        if (!userRecord) {
            try {
                const list = await pbAdmin.collection('contacts').getList(1, 1, {
                    filter: `email = "${cleanEmail}" && portal_pin = "${cleanPin}"`,
                    requestKey: null
                });
                if (list.items.length > 0) {
                    userRecord = list.items[0];
                    userType = 'contact';
                }
            } catch (e) {
                console.warn("[PORTAL PIN AUTH] Contacts-Suche:", e.message);
            }
        }

        if (!userRecord) {
            return res.status(401).json({ 
                error: "Ungültige E-Mail-Adresse oder PIN. Bitte prüfen Sie Ihre Angaben auf der Zugangskarte." 
            });
        }

        const payload = {
            id: userRecord.id,
            type: userType,
            email: userRecord.email,
            name_first: userRecord.name_first,
            name_last: userRecord.name_last,
            salutation: userRecord.salutation || ""
        };

        if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET ist nicht in der .env Datei konfiguriert!");
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '30d' });

        res.json({
            success: true,
            token,
            user: {
                id: userRecord.id,
                type: userType,
                email: userRecord.email,
                name_first: userRecord.name_first,
                name_last: userRecord.name_last,
                salutation: userRecord.salutation || ""
            }
        });
    } catch (err) {
        console.error("[PORTAL PIN AUTH SERVER ERROR]", err);
        res.status(500).json({ error: "Serverfehler bei der Authentifizierung." });
    }
});

// 📲 1-Klick QR-Code-Login (Scannen mit Smartphone/Tablet)
app.post(['/api/emails/portal/auth-with-code', '/portal/auth-with-code'], async (req, res) => {
    const { code } = req.body;
    if (!code) {
        return res.status(400).json({ error: "Zugangs-Code fehlt." });
    }

    const cleanCode = String(code).trim();

    try {
        const pbAdmin = await getAdminPb();
        let userRecord = null;
        let userType = '';

        // 1. In Clients suchen
        try {
            const list = await pbAdmin.collection('clients').getList(1, 1, {
                filter: `portal_code = "${cleanCode}"`,
                requestKey: null
            });
            if (list.items.length > 0) {
                userRecord = list.items[0];
                userType = 'client';
            }
        } catch (e) {
            console.warn("[PORTAL CODE AUTH] Clients-Suche:", e.message);
        }

        // 2. In Contacts suchen
        if (!userRecord) {
            try {
                const list = await pbAdmin.collection('contacts').getList(1, 1, {
                    filter: `portal_code = "${cleanCode}"`,
                    requestKey: null
                });
                if (list.items.length > 0) {
                    userRecord = list.items[0];
                    userType = 'contact';
                }
            } catch (e) {
                console.warn("[PORTAL CODE AUTH] Contacts-Suche:", e.message);
            }
        }

        if (!userRecord) {
            return res.status(401).json({ 
                error: "Ungültiger oder abgelaufener QR-Code. Bitte fordern Sie eine neue Zugangskarte an." 
            });
        }

        const payload = {
            id: userRecord.id,
            type: userType,
            email: userRecord.email,
            name_first: userRecord.name_first,
            name_last: userRecord.name_last,
            salutation: userRecord.salutation || ""
        };

        if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET ist nicht in der .env Datei konfiguriert!");
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '30d' });

        res.json({
            success: true,
            token,
            user: {
                id: userRecord.id,
                type: userType,
                email: userRecord.email,
                name_first: userRecord.name_first,
                name_last: userRecord.name_last,
                salutation: userRecord.salutation || ""
            }
        });
    } catch (err) {
        console.error("[PORTAL CODE AUTH SERVER ERROR]", err);
        res.status(500).json({ error: "Serverfehler beim QR-Code-Login." });
    }
});

// 🛡️ Admin: Zugangskarte & Zugangsdaten für Klienten abfragen / neu generieren
app.post(['/api/emails/portal/admin/access-data', '/portal/admin/access-data'], async (req, res) => {
    const auth = await resolvePortalAuth(req.headers.authorization);
    if (!auth || auth.type !== 'admin') {
        return res.status(403).json({ error: "Nur für Administratoren zugänglich." });
    }

    const { clientId, type = 'client', action = 'get', customPin } = req.body;
    if (!clientId) {
        return res.status(400).json({ error: "Klienten-ID fehlt." });
    }

    try {
        const pbAdmin = auth.pb || await getAdminPb();
        const collection = type === 'contact' ? 'contacts' : 'clients';
        let record = await pbAdmin.collection(collection).getOne(clientId, { requestKey: null });

        let pin = record.portal_pin;
        let code = record.portal_code;
        let shouldUpdate = false;
        const updates = {};

        if (action === 'generate' || !pin) {
            pin = Math.floor(100000 + Math.random() * 900000).toString();
            updates.portal_pin = pin;
            shouldUpdate = true;
        } else if (action === 'set' && customPin) {
            pin = String(customPin).trim();
            updates.portal_pin = pin;
            shouldUpdate = true;
        }

        if (!code || action === 'generate' || action === 'generate_code') {
            code = 'sec_' + crypto.randomBytes(16).toString('hex');
            updates.portal_code = code;
            shouldUpdate = true;
        }

        if (shouldUpdate) {
            record = await pbAdmin.collection(collection).update(clientId, updates, { requestKey: null });
        }

        res.json({
            success: true,
            clientId: record.id,
            name_first: record.name_first || '',
            name_last: record.name_last || '',
            email: record.email || '',
            portal_pin: record.portal_pin,
            portal_code: record.portal_code
        });
    } catch (err) {
        console.error("[PORTAL ADMIN ACCESS DATA ERROR]", err);
        res.status(500).json({ error: "Fehler beim Laden/Erstellen der Zugangsdaten." });
    }
});

// 🔄 Klient/Kontakt: Eigene PIN im Portal ändern
app.post(['/api/emails/portal/change-pin', '/portal/change-pin'], async (req, res) => {
    const auth = await resolvePortalAuth(req.headers.authorization);
    if (!auth || (!auth.clientId && !auth.contactId)) {
        return res.status(401).json({ error: "Nicht autorisiert." });
    }

    const { currentPin, newPin } = req.body;
    if (!newPin || String(newPin).trim().length < 4) {
        return res.status(400).json({ error: "Die neue PIN muss mindestens 4 Ziffern lang sein." });
    }

    try {
        const pbAdmin = auth.pb || await getAdminPb();
        const collection = auth.type === 'contact' ? 'contacts' : 'clients';
        const targetId = auth.clientId || auth.contactId;
        const userRecord = await pbAdmin.collection(collection).getOne(targetId, { requestKey: null });

        if (userRecord.portal_pin && currentPin && String(userRecord.portal_pin).trim() !== String(currentPin).trim()) {
            return res.status(400).json({ error: "Die aktuelle PIN ist nicht korrekt." });
        }

        await pbAdmin.collection(collection).update(targetId, { portal_pin: String(newPin).trim() }, { requestKey: null });
        res.json({ success: true, message: "PIN erfolgreich geändert." });
    } catch (err) {
        console.error("[PORTAL CHANGE PIN ERROR]", err);
        res.status(500).json({ error: "Fehler beim Ändern der PIN." });
    }
});

// Helper: Portal-Auth validieren (Erlaubt OTP-Session ODER PocketBase Admin-Token)
async function resolvePortalAuth(authHeader) {
    if (!authHeader) return null;
    const token = authHeader.split(' ')[1];
    if (!token) return null;

    try {
        const pb = new PocketBase(PB_URL);
        pb.autoCancellation(false);
        pb.authStore.save(token, null);
        if (pb.authStore.isValid) {
            try {
                await pb.collection('users').authRefresh();
            } catch (e) { 
                try { await pb.collection('_superusers').authRefresh(); } catch(e2) {}
            }
            const model = pb.authStore.model;
            const isSuper = model?.collectionName === '_superusers' || pb.authStore.isAdmin || pb.authStore.isSuperuser;
            const role = model?.role || (isSuper ? 'superadmin' : null);
            if (isSuper || role === 'superadmin' || role === 'admin') return { 
                type: 'admin', 
                pb: pb, 
                email: model?.email || model?.identity,
                name: model?.name || `${model?.name_first || ''} ${model?.name_last || ''}`.trim() || model?.email || 'Administrator'
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
            name: `${decoded.name_first || ''} ${decoded.name_last || ''}`.trim() || decoded.email || 'Klient'
        };
        if (decoded.type === 'contact' && decoded.id) return { 
            type: 'contact', 
            contactId: decoded.id, 
            email: decoded.email,
            name: `${decoded.name_first || ''} ${decoded.name_last || ''}`.trim() || decoded.email || 'Kontakt'
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

async function getContactClientsFilter(pbAdmin, auth) {
    const contactId = auth.contactId;
    const userEmail = auth.email;
    const parts = [];
    if (contactId) {
        parts.push(`contacts ~ "${contactId}"`);
        parts.push(`caregiver ~ "${contactId}"`);
    }
    if (userEmail) {
        parts.push(`email = "${userEmail}"`);
        parts.push(`contacts.email ?= "${userEmail}"`);
        parts.push(`caregiver.email ?= "${userEmail}"`);
    }

    // Falls der Kontakt einem oder mehreren Pflegeheimen zugeordnet ist, auch deren Klienten einbinden
    if (contactId) {
        try {
            const homes = await pbAdmin.collection('retirement_homes').getFullList({
                filter: `contacts ~ "${contactId}"`,
                fields: 'id',
                requestKey: null
            });
            for (const h of homes) {
                parts.push(`retirement_homes ~ "${h.id}"`);
            }
        } catch (e) {
            console.warn("[getContactClientsFilter homes lookup]:", e.message);
        }
    }

    return parts.length > 0 ? parts.join(' || ') : 'id = ""';
}

// Wandelt interne PocketBase-Dateilinks (127.0.0.1:8090) in saubere, für Browser erreichbare URLs um
function formatPublicFileUrl(pbAdmin, record, filename, options = {}, req = null) {
    if (!record || !filename) return '';
    let rawUrl = '';
    try {
        rawUrl = pbAdmin.files.getUrl(record, filename, options);
    } catch(e) {
        return '';
    }
    if (!rawUrl) return '';

    // Ermittle Client-Host aus den Express Request Headern
    const forwardedHost = req ? (req.get('x-forwarded-host') || req.get('host') || '') : '';
    const isLive = forwardedHost.includes('ihre-seniorenassistenz.com') || (process.env.NODE_ENV === 'production' && !forwardedHost.includes('localhost') && !forwardedHost.includes('127.0.0.1'));

    if (isLive || (!forwardedHost.includes('localhost') && !forwardedHost.includes('127.0.0.1') && forwardedHost)) {
        // Im Live-Betrieb oder bei externem Zugriff via Domain:
        // Nutze relative URL /api/files/..., damit der Browser die Datei direkt über den gleichen Host & Port abruft
        try {
            const parsed = new URL(rawUrl);
            return `${parsed.pathname}${parsed.search}`;
        } catch {
            return rawUrl.replace(/^https?:\/\/(127\.0\.0\.1|localhost):8090/i, '');
        }
    }

    // Im lokalen Entwicklungsmodus:
    if (forwardedHost) {
        const clientHostname = forwardedHost.split(':')[0] || '127.0.0.1';
        return rawUrl.replace(/https?:\/\/(127\.0\.0\.1|localhost):8090/i, `http://${clientHostname}:8090`);
    }

    return rawUrl;
}

app.get(['/api/emails/portal/invoices', '/portal/invoices', '/invoices'], async (req, res) => {
    const auth = await resolvePortalAuth(req.headers.authorization);
    if (!auth) return res.status(401).json({ error: "Session abgelaufen oder ungültig. Bitte neu anmelden." });
    
    try {
        const pbAdmin = auth.pb || await getAdminPb();
        
        let filterStr = `(status = "Eingereicht" || status = "Abgeschlossen" || status = "In Bearbeitung")`;
        if (auth.type === 'client') {
            filterStr = `(client = "${auth.clientId}" || client ~ "${auth.clientId}") && ${filterStr}`;
        } else if (auth.type === 'contact') {
            const contactFilter = await getContactClientsFilter(pbAdmin, auth);
            const linkedClients = await pbAdmin.collection('clients').getFullList({ filter: contactFilter, fields: 'id', requestKey: null });
            if (linkedClients.length === 0) return res.json({ success: true, invoices: [] });
            const clientIds = linkedClients.map(c => c.id);
            const clientFilter = clientIds.map(id => `(client = "${id}" || client ~ "${id}")`).join(' || ');
            filterStr = `(${clientFilter}) && ${filterStr}`;
        } else if (auth.type === 'admin' && req.query.client_id) {
            filterStr = `(client = "${req.query.client_id}" || client ~ "${req.query.client_id}") && ${filterStr}`;
        }
        
        const invoices = await pbAdmin.collection('invoices').getFullList({
            filter: filterStr,
            sort: '-issue_date',
            expand: 'client',
            requestKey: null
        });

        // Vorlagen zur Erkennung von Kassenrechnungen (Entlastungsleistungen, Verhinderungspflege etc.) laden
        const insuranceTemplateIds = new Set(['299p3n08p25vmeu', 'dkdyu0mrlcqkcoc', 'unm9kzapp3zailt']);
        try {
            const templates = await pbAdmin.collection('document_templates').getFullList({ requestKey: null });
            for (const t of templates) {
                if (t.type === 'rechnung' && (
                    /entlastung|verhinderung|umwandlung|krankenkasse|pflegekasse|45a|45b|sgb/i.test(t.title || '') ||
                    JSON.stringify(t.content_html || '').includes('{{insurance.')
                )) {
                    insuranceTemplateIds.add(t.id);
                }
            }
        } catch (e) {
            console.warn("[PORTAL INVOICES templates lookup]:", e.message);
        }

        // Kassenrechnungen herausfiltern (nur Rechnungen an den Klienten / Selbstzahler dürfen im Portal erscheinen)
        const clientInvoices = invoices.filter(inv => {
            let meta = inv.table_sum_positions;
            if (typeof meta === 'string') {
                try { meta = JSON.parse(meta); } catch(e){}
            }
            if (meta?.recipientType === 'insurance') return false;
            if (meta?.templateId && insuranceTemplateIds.has(meta.templateId)) return false;

            let positions = inv.table_positions;
            if (typeof positions === 'string') {
                try { positions = JSON.parse(positions); } catch(e){}
            }
            if (Array.isArray(positions)) {
                const isInsurance = positions.some(p => 
                    /entlastungsleistung|verhinderungspflege|umwandlungsleistung|sgb\s*xi|pflegekasse|krankenkasse/i.test(p.title || '')
                );
                if (isInsurance) return false;
            }

            return true;
        });

        // PocketBase File-Token erzeugen, damit der Klient die PDF ohne PB-Account herunterladen darf!
        let fileToken = '';
        try { fileToken = await pbAdmin.files.getToken(); } catch(e) {}
        
        const mappedInvoices = clientInvoices.map(inv => {
            const pdfs = Array.isArray(inv.pdf) ? inv.pdf : (inv.pdf ? [inv.pdf] : []);
            const files = pdfs.map((filename, index) => ({
                name: filename,
                url: formatPublicFileUrl(pbAdmin, inv, filename, { 'token': fileToken }, req),
                isTimesheet: index > 0
            }));
            return { ...inv, files };
        });

        // Firmen-/Bankverbindung für Überweisungen abrufen
        let companyInfo = null;
        try {
            const comp = await pbAdmin.collection('company').getFirstListItem('', { requestKey: null });
            if (comp) {
                companyInfo = {
                    name: comp.name || '',
                    bank_name: comp.bank_name || '',
                    bank_iban: comp.bank_iban || '',
                    bank_bic: comp.bank_bic || '',
                    email: comp.email || '',
                    phone: comp.number_telephone || comp.number_mobile || ''
                };
            }
        } catch (e) {
            // Ignorieren falls keine Firmendaten vorhanden
        }

        res.json({ success: true, invoices: mappedInvoices, companyInfo });
    } catch (err) {
        console.error("[PORTAL INVOICES]", err);
        res.status(500).json({ error: "Rechnungen konnten nicht geladen werden: " + err.message });
    }
});

// --- RECHNUNG / ZEITNACHWEIS SICHER DURCH DEN MICROSERVICE STREAMEN / DOWNLOADEN ---
app.get(['/api/emails/portal/invoices/:invoiceId/download', '/portal/invoices/:invoiceId/download'], async (req, res) => {
    const auth = await resolvePortalAuth(req.headers.authorization);
    if (!auth) return res.status(401).json({ error: "Session abgelaufen oder ungültig. Bitte neu anmelden." });

    const invoiceId = req.params.invoiceId;
    const fileIndex = parseInt(req.query.fileIndex || '0', 10);
    const inline = req.query.inline === 'true';

    try {
        const pbAdmin = auth.pb || await getAdminPb();
        const invoice = await pbAdmin.collection('invoices').getOne(invoiceId, { expand: 'client', requestKey: null });
        if (!invoice) return res.status(404).json({ error: "Rechnung nicht gefunden." });

        const clientId = invoice.client || invoice.expand?.client?.id;

        // Berechtigungsprüfung nach HRBAC
        if (auth.type === 'client' && auth.clientId !== clientId) {
            return res.status(403).json({ error: "Kein Zugriff auf diese Rechnung." });
        }
        if (auth.type === 'contact') {
            const contactFilter = await getContactClientsFilter(pbAdmin, auth);
            const allowed = await pbAdmin.collection('clients').getFullList({
                filter: `id = "${clientId}" && (${contactFilter})`,
                fields: 'id',
                requestKey: null
            });
            if (allowed.length === 0) {
                return res.status(403).json({ error: "Keine Berechtigung für diesen Klienten." });
            }
        }

        const pdfs = Array.isArray(invoice.pdf) ? invoice.pdf : (invoice.pdf ? [invoice.pdf] : []);
        const filename = pdfs[fileIndex];
        if (!filename) {
            return res.status(404).json({ error: "Rechnungsdatei nicht vorhanden." });
        }

        let fileToken = '';
        try { fileToken = await pbAdmin.files.getToken(); } catch(e) {}
        const pbFileUrl = pbAdmin.files.getUrl(invoice, filename, { token: fileToken });

        const fileResponse = await fetch(pbFileUrl);
        if (!fileResponse.ok) {
            return res.status(fileResponse.status).json({ error: "Rechnungs-PDF konnte nicht geladen werden." });
        }

        const invoiceNr = invoice.invoice_nr ? invoice.invoice_nr.replace(/[^a-zA-Z0-9_-]/g, '_') : 'Rechnung';
        const docName = fileIndex === 0 ? `Rechnung_${invoiceNr}.pdf` : `Zeitnachweis_${invoiceNr}.pdf`;
        const disposition = inline ? 'inline' : 'attachment';

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `${disposition}; filename="${docName}"`);
        res.setHeader('Cache-Control', 'private, max-age=3600');

        const arrayBuffer = await fileResponse.arrayBuffer();
        res.send(Buffer.from(arrayBuffer));
    } catch (err) {
        console.error("[PORTAL INVOICE DOWNLOAD ERROR]", err);
        res.status(500).json({ error: "Fehler beim Streamen der Rechnung: " + err.message });
    }
});

// Helper für Portal-Dokumente: Kategorie & bereinigter Anzeigename
function detectPortalDocumentCategory(filename = '') {
    const lower = filename.toLowerCase();
    if (/vertrag|vereinbarung|contract|datenschutz|schweigepflicht|behandlungsvertrag/i.test(lower)) return 'Verträge & Vereinbarungen';
    if (/bescheid|pflegegrad|einstufung|kasse|aok|barmer|dak|tk|mdk|gutachten|bewilligung|abteilung/i.test(lower)) return 'Pflegekassenbescheide';
    if (/vollmacht|verfügung|vorsorge|patientenverf|betreuung|beschluss|amtsgericht/i.test(lower)) return 'Vollmachten & Verfügungen';
    if (/rechnung|abrechnung|nachweis|leistungsnachweis|zeitnachweis/i.test(lower)) return 'Rechnungen & Nachweise';
    if (/ausweis|schwerbehindert|arzt|befund|medikation|diagnose|pass/i.test(lower)) return 'Scans & Nachweise';
    return 'Sonstige Dokumente';
}

function cleanPortalDocumentName(filename = '') {
    if (!filename) return 'Dokument';
    // Entfernt zufällige PocketBase-Hashes am Anfang (z.B. x9d8f3k2_vertrag.pdf -> vertrag.pdf)
    let clean = filename.replace(/^[a-z0-9]{8,15}_/i, '');
    return clean;
}

// --- DOKUMENTE FÜR DAS KLIENTEN-PORTAL ABRUFEN ---
app.get(['/api/emails/portal/documents', '/portal/documents', '/documents'], async (req, res) => {
    const auth = await resolvePortalAuth(req.headers.authorization);
    if (!auth) return res.status(401).json({ error: "Session abgelaufen oder ungültig. Bitte neu anmelden." });

    try {
        const pbAdmin = auth.pb || await getAdminPb();
        let clients = [];

        if (auth.type === 'client') {
            try {
                const client = await pbAdmin.collection('clients').getOne(auth.clientId, { requestKey: null });
                if (client) clients = [client];
            } catch(e) {}
        } else if (auth.type === 'contact') {
            const contactFilter = await getContactClientsFilter(pbAdmin, auth);
            clients = await pbAdmin.collection('clients').getFullList({ filter: contactFilter, requestKey: null });
        } else if (auth.type === 'admin') {
            if (req.query.client_id) {
                try {
                    const client = await pbAdmin.collection('clients').getOne(req.query.client_id, { requestKey: null });
                    if (client) clients = [client];
                } catch(e) {}
            } else {
                clients = await pbAdmin.collection('clients').getFullList({ requestKey: null });
            }
        }

        let fileToken = '';
        try { fileToken = await pbAdmin.files.getToken(); } catch(e) {}

        const documents = [];
        for (const client of clients) {
            const clientDocs = Array.isArray(client.documents) ? client.documents : (client.documents ? [client.documents] : []);
            const clientName = `${client.name_first || ''} ${client.name_last || ''}`.trim() || 'Klient';

            for (const filename of clientDocs) {
                if (!filename) continue;
                const ext = filename.split('.').pop()?.toLowerCase() || '';
                const isPdf = ext === 'pdf';
                const isImage = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext);
                const isWord = ['doc', 'docx'].includes(ext);

                documents.push({
                    id: `${client.id}_${filename}`,
                    clientId: client.id,
                    clientName: clientName,
                    filename: filename,
                    name: cleanPortalDocumentName(filename),
                    originalName: filename,
                    url: formatPublicFileUrl(pbAdmin, client, filename, { token: fileToken }, req),
                    extension: ext,
                    category: detectPortalDocumentCategory(filename),
                    created: client.created,
                    updated: client.updated,
                    isPdf,
                    isImage,
                    isWord
                });
            }
        }

        // Sortieren nach Datum (neueste zuerst)
        documents.sort((a, b) => new Date(b.updated || b.created || 0).getTime() - new Date(a.updated || a.created || 0).getTime());

        res.json({ success: true, documents });
    } catch (err) {
        console.error("[PORTAL DOCUMENTS GET]", err);
        res.status(500).json({ error: "Fehler beim Laden der Dokumente: " + err.message });
    }
});

// --- DOKUMENT SICHER DURCH DEN MICROSERVICE STREAMEN / DOWNLOADEN ---
app.get(['/api/emails/portal/documents/download', '/portal/documents/download'], async (req, res) => {
    const auth = await resolvePortalAuth(req.headers.authorization);
    if (!auth) return res.status(401).json({ error: "Session abgelaufen oder ungültig. Bitte neu anmelden." });

    const clientId = req.query.clientId;
    const filename = req.query.filename;
    const inline = req.query.inline === 'true';

    if (!clientId || !filename) {
        return res.status(400).json({ error: "clientId und filename sind erforderlich." });
    }

    try {
        const pbAdmin = auth.pb || await getAdminPb();

        // Berechtigungsprüfung nach HRBAC
        if (auth.type === 'client' && auth.clientId !== clientId) {
            return res.status(403).json({ error: "Kein Zugriff auf Dokumente dieses Klienten." });
        }
        if (auth.type === 'contact') {
            const contactFilter = await getContactClientsFilter(pbAdmin, auth);
            const allowed = await pbAdmin.collection('clients').getFullList({
                filter: `id = "${clientId}" && (${contactFilter})`,
                fields: 'id',
                requestKey: null
            });
            if (allowed.length === 0) {
                return res.status(403).json({ error: "Keine Berechtigung für diesen Klienten." });
            }
        }

        const client = await pbAdmin.collection('clients').getOne(clientId, { requestKey: null });
        const existingDocs = Array.isArray(client.documents) ? client.documents : (client.documents ? [client.documents] : []);
        if (!existingDocs.includes(filename)) {
            return res.status(404).json({ error: "Dokument in der Klientenakte nicht gefunden." });
        }

        let fileToken = '';
        try { fileToken = await pbAdmin.files.getToken(); } catch(e) {}
        const pbFileUrl = pbAdmin.files.getUrl(client, filename, { token: fileToken });

        const fileResponse = await fetch(pbFileUrl);
        if (!fileResponse.ok) {
            return res.status(fileResponse.status).json({ error: "Datei konnte nicht vom internen Speicher abgerufen werden." });
        }

        const ext = filename.split('.').pop()?.toLowerCase() || '';
        let contentType = 'application/octet-stream';
        if (ext === 'pdf') contentType = 'application/pdf';
        else if (ext === 'png') contentType = 'image/png';
        else if (ext === 'jpg' || ext === 'jpeg') contentType = 'image/jpeg';
        else if (ext === 'webp') contentType = 'image/webp';
        else if (ext === 'doc') contentType = 'application/msword';
        else if (ext === 'docx') contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

        const cleanName = cleanPortalDocumentName(filename);
        const disposition = inline ? 'inline' : 'attachment';

        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `${disposition}; filename="${encodeURIComponent(cleanName)}"`);
        res.setHeader('Cache-Control', 'private, max-age=3600');

        const arrayBuffer = await fileResponse.arrayBuffer();
        res.send(Buffer.from(arrayBuffer));
    } catch (err) {
        console.error("[PORTAL DOCUMENT DOWNLOAD ERROR]", err);
        res.status(500).json({ error: "Fehler beim Streamen des Dokuments: " + err.message });
    }
});

// --- DOKUMENT ÜBER DAS PORTAL HOCHLADEN ---
app.post(['/api/emails/portal/documents/upload', '/portal/documents/upload'], async (req, res) => {
    const auth = await resolvePortalAuth(req.headers.authorization);
    if (!auth) return res.status(401).json({ error: "Session abgelaufen oder ungültig. Bitte neu anmelden." });

    try {
        const { clientId, fileName, fileBase64, mimeType } = req.body;
        if (!clientId || !fileName || !fileBase64) {
            return res.status(400).json({ error: "clientId, fileName und Datei-Inhalt (Base64) sind erforderlich." });
        }

        const pbAdmin = auth.pb || await getAdminPb();

        // Berechtigungsprüfung
        if (auth.type === 'client' && auth.clientId !== clientId) {
            return res.status(403).json({ error: "Keine Berechtigung für diesen Klienten." });
        }
        if (auth.type === 'contact') {
            const contactFilter = await getContactClientsFilter(pbAdmin, auth);
            const allowed = await pbAdmin.collection('clients').getFullList({ filter: `id = "${clientId}" && (${contactFilter})`, fields: 'id', requestKey: null });
            if (allowed.length === 0) {
                return res.status(403).json({ error: "Keine Berechtigung für diesen Klienten." });
            }
        }

        const client = await pbAdmin.collection('clients').getOne(clientId, { requestKey: null });
        const existingDocs = Array.isArray(client.documents) ? client.documents : (client.documents ? [client.documents] : []);

        // Base64 to Buffer & Blob
        const buffer = Buffer.from(fileBase64, 'base64');
        const blob = new Blob([buffer], { type: mimeType || 'application/pdf' });

        const formData = new FormData();
        for (const existing of existingDocs) {
            formData.append('documents', existing);
        }
        formData.append('documents', blob, fileName);

        const updated = await pbAdmin.collection('clients').update(clientId, formData, { requestKey: null });

        res.json({
            success: true,
            message: "Dokument erfolgreich hochgeladen.",
            documentsCount: (updated.documents || []).length
        });
    } catch (err) {
        console.error("[PORTAL DOCUMENTS UPLOAD]", err);
        res.status(500).json({ error: "Fehler beim Hochladen des Dokuments: " + err.message });
    }
});

// --- Termine für das Klienten-Portal abrufen ---
app.get(['/api/emails/portal/appointments', '/portal/appointments', '/appointments'], async (req, res) => {
    const auth = await resolvePortalAuth(req.headers.authorization);
    if (!auth) return res.status(401).json({ error: "Session abgelaufen oder ungültig. Bitte neu anmelden." });

    try {
        const pbAdmin = auth.pb || await getAdminPb();

        let filterStr = `id != ""`; // Lade alle Termine (auch Historie)

        if (auth.type === 'client') {
            filterStr = `(client = "${auth.clientId}" || client ~ "${auth.clientId}")`;
        } else if (auth.type === 'contact') {
            const contactFilter = await getContactClientsFilter(pbAdmin, auth);
            const linkedClients = await pbAdmin.collection('clients').getFullList({ filter: contactFilter, fields: 'id', requestKey: null });
            if (linkedClients.length === 0) return res.json({ success: true, appointments: [] });
            const clientIds = linkedClients.map(c => c.id);
            const clientFilter = clientIds.map(id => `(client = "${id}" || client ~ "${id}")`).join(' || ');
            filterStr = `(${clientFilter})`;
        } else if (auth.type === 'admin' && req.query.client_id) {
            // Superadmin-Filter: Zeige nur Termine des ausgewählten Klienten
            filterStr = `(client = "${req.query.client_id}" || client ~ "${req.query.client_id}")`;
        }

        // Private und ausgeblendete Termine dürfen im Portal nicht sichtbar sein
        filterStr += ` && is_private != true && is_visible != false`;

        const appointments = await pbAdmin.collection('appointments').getFullList({
            filter: filterStr,
            sort: 'appointment',
            expand: 'user,time_record,drive_record,tasks,expenditures,appointment_at,client,client_id',
            requestKey: null
        });

        // 🛡️ KI-Blacklist: Besuchsberichte und Notizen vor der Übertragung an das Klientenportal strikt bereinigen
        const sanitizedList = sanitizeAppointments(appointments);

        res.json({ success: true, appointments: sanitizedList });
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
        const expandFields = 'insurance,caregiver,contacts,retirement_homes';
        
        // Mitarbeiter für Zuordnung zu Klienten laden
        const internalUsers = await pbAdmin.collection('users').getFullList({
            fields: 'id,name_first,name_last,email,phone,clients,avatar',
            requestKey: null
        }).catch(() => []);

        const mapClientWithStaff = (c) => {
            const assigned = internalUsers.filter(u => Array.isArray(u.clients) && u.clients.includes(c.id));
            return {
                ...c,
                name: `${c.name_first} ${c.name_last}`.trim(),
                assigned_employee: assigned.length > 0 ? {
                    id: assigned[0].id,
                    name_first: assigned[0].name_first,
                    name_last: assigned[0].name_last,
                    email: assigned[0].email,
                    phone: assigned[0].phone
                } : null,
                assigned_employees: assigned.map(u => ({
                    id: u.id,
                    name_first: u.name_first,
                    name_last: u.name_last,
                    email: u.email,
                    phone: u.phone
                }))
            };
        };

        // Wenn es ein Admin ist und KEIN spezifischer caregiverOnly-Filter gesetzt ist, geben wir alle zurück
        if (auth.type === 'admin' && req.query.caregiverOnly !== 'true') {
            const clients = await pbAdmin.collection('clients').getFullList({ sort: 'name_first', expand: expandFields, requestKey: null });
            return res.json({ success: true, clients: clients.map(mapClientWithStaff) });
        }

        const userEmail = auth.email;
        // Prüfe, ob das Frontend (z.B. Termin-Anfrage) streng nur "Betreuer"-Klienten verlangt
        const isCaregiverOnly = req.query.caregiverOnly === 'true';
        
        let filterQuery = '';
        if (auth.type === 'contact') {
            filterQuery = await getContactClientsFilter(pbAdmin, auth);
            if (isCaregiverOnly && auth.contactId) {
                filterQuery = `caregiver ~ "${auth.contactId}" || caregiver.email ?= "${userEmail}"`;
            }
        } else {
            // Klient: Nur eigene Daten
            filterQuery = isCaregiverOnly 
                ? `caregiver.email ?= "${userEmail}"` 
                : (auth.clientId ? `id = "${auth.clientId}"` : `email = "${userEmail}" || contacts.email ?= "${userEmail}" || caregiver.email ?= "${userEmail}"`);
        }

        const clients = await pbAdmin.collection('clients').getFullList({ filter: filterQuery, expand: expandFields, requestKey: null });
        const mapped = clients.map(mapClientWithStaff);
        
        res.json({ success: true, clients: mapped });
    } catch (err) {
        console.error("[PORTAL CLIENTS GET]", err);
        res.status(500).json({ error: "Fehler beim Laden der Klienten." });
    }
});

// Hilfsfunktion: Strikte RBAC-Prüfung für Klientenzugriff im Portal
async function verifyPortalClientAccess(pbAdmin, auth, clientId) {
    if (!auth || !clientId) return false;
    if (auth.type === 'admin') return true;
    if (auth.type === 'client' && auth.clientId === clientId) return true;
    
    if (auth.type === 'contact') {
        const client = await pbAdmin.collection('clients').getOne(clientId, { expand: 'contacts,caregiver,retirement_homes', requestKey: null }).catch(() => null);
        if (!client) return false;

        const userEmail = auth.email;
        const contactId = auth.contactId;

        const caregivers = Array.isArray(client.caregiver) ? client.caregiver : (client.caregiver ? [client.caregiver] : []);
        const contacts = Array.isArray(client.contacts) ? client.contacts : (client.contacts ? [client.contacts] : []);

        if (contactId && (caregivers.includes(contactId) || contacts.includes(contactId))) return true;

        const expCare = Array.isArray(client.expand?.caregiver) ? client.expand.caregiver : (client.expand?.caregiver ? [client.expand.caregiver] : []);
        const expCont = Array.isArray(client.expand?.contacts) ? client.expand.contacts : (client.expand?.contacts ? [client.expand.contacts] : []);
        if (userEmail && (expCare.some(c => c.email === userEmail) || expCont.some(c => c.email === userEmail))) return true;

        // Prüfe auch Pflegeheim-Zugehörigkeit
        if (contactId && client.retirement_homes) {
            const homes = Array.isArray(client.retirement_homes) ? client.retirement_homes : [client.retirement_homes];
            const linkedHomes = await pbAdmin.collection('retirement_homes').getFullList({
                filter: `contacts ~ "${contactId}"`,
                fields: 'id',
                requestKey: null
            }).catch(() => []);
            if (linkedHomes.some(h => homes.includes(h.id))) return true;
        }
    }
    return false;
}

// --- Krankenkassen für das Portal abfragen ---
app.get(['/api/emails/portal/insurances', '/portal/insurances'], async (req, res) => {
    try {
        const pbAdmin = await getAdminPb();
        const insurances = await pbAdmin.collection('insurancies').getFullList({ sort: 'name', requestKey: null });
        res.json({ success: true, insurances });
    } catch (err) {
        console.error("[PORTAL INSURANCES GET]", err);
        res.status(500).json({ error: "Fehler beim Laden der Krankenkassen." });
    }
});

// --- Klientendaten im Portal aktualisieren ---
app.put(['/api/emails/portal/clients/:id', '/portal/clients/:id'], async (req, res) => {
    const auth = await resolvePortalAuth(req.headers.authorization);
    if (!auth) return res.status(401).json({ error: "Session abgelaufen oder ungültig. Bitte neu anmelden." });

    try {
        const pbAdmin = auth.pb || await getAdminPb();
        const clientId = req.params.id;

        const canAccess = await verifyPortalClientAccess(pbAdmin, auth, clientId);
        if (!canAccess) return res.status(403).json({ error: "Keine Berechtigung, diesen Klienten zu bearbeiten." });

        let { name_first, name_last, email, phone, handy, street, housenr, zip, city, birthdate, level_of_care, insurance_nr, insurance, other_insurance_name } = req.body;
        
        // PocketBase Date-Format sicherstellen, falls der Zeit-Teil fehlt
        if (birthdate && !birthdate.includes(':')) birthdate = `${birthdate} 12:00:00.000Z`;

        const updateData = { name_first, name_last, email, phone, handy, street, housenr, zip, city, birthdate, level_of_care, insurance_nr };
        
        if (insurance !== undefined) {
            if (insurance === 'other' && other_insurance_name && other_insurance_name.trim()) {
                const insName = other_insurance_name.trim();
                const existingList = await pbAdmin.collection('insurancies').getFullList({
                    filter: `name ~ "${insName}"`,
                    requestKey: null
                }).catch(() => []);
                const match = existingList.find(i => i.name.toLowerCase().trim() === insName.toLowerCase().trim());
                if (match) {
                    updateData.insurance = [match.id];
                } else {
                    const newIns = await pbAdmin.collection('insurancies').create({
                        name: insName,
                        type: 'GKV (Gesetzlich)'
                    });
                    updateData.insurance = [newIns.id];
                }
            } else if (insurance && insurance !== 'other') {
                updateData.insurance = [insurance];
            } else if (insurance === '') {
                updateData.insurance = [];
            }
        }

        Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

        const updated = await pbAdmin.collection('clients').update(clientId, updateData, { expand: 'insurance,caregiver,contacts,retirement_homes', requestKey: null });
        res.json({ success: true, client: { ...updated, name: `${updated.name_first} ${updated.name_last}`.trim() } });
    } catch (err) {
        console.error("[PORTAL CLIENT PUT]", err);
        res.status(500).json({ error: "Fehler beim Speichern der Klientendaten." });
    }
});

// --- RBAC: Kontakt für einen Klienten im Portal anlegen ---
app.post(['/api/emails/portal/clients/:id/contacts', '/portal/clients/:id/contacts'], async (req, res) => {
    const auth = await resolvePortalAuth(req.headers.authorization);
    if (!auth) return res.status(401).json({ error: "Nicht autorisiert." });

    try {
        const pbAdmin = auth.pb || await getAdminPb();
        const clientId = req.params.id;

        const canAccess = await verifyPortalClientAccess(pbAdmin, auth, clientId);
        if (!canAccess) return res.status(403).json({ error: "Keine Berechtigung für diesen Klienten." });

        const client = await pbAdmin.collection('clients').getOne(clientId, { requestKey: null });
        const { name_first, name_last, company_name, email, phone, street, housenr, zip, city, notes, relationship } = req.body;

        if (!name_first && !name_last && !company_name) {
            return res.status(400).json({ error: "Bitte mindestens Vorname, Nachname oder Firmenname angeben." });
        }

        // Kontakt-Datensatz erstellen
        const contactNotes = typeof notes === 'object' ? notes : { role: relationship || notes || 'Notfallkontakt', details: notes || '' };
        const newContact = await pbAdmin.collection('contacts').create({
            name_first: name_first || '',
            name_last: name_last || '',
            company_name: company_name || '',
            email: email || '',
            phone: phone || '',
            street: street || '',
            housenr: housenr || '',
            zip: zip || '',
            city: city || '',
            notes: contactNotes
        }, { requestKey: null });

        // Mit Klient verknüpfen
        const existingContacts = Array.isArray(client.contacts) ? client.contacts : (client.contacts ? [client.contacts] : []);
        if (!existingContacts.includes(newContact.id)) {
            existingContacts.push(newContact.id);
            await pbAdmin.collection('clients').update(clientId, { contacts: existingContacts }, { requestKey: null });
        }

        res.json({ success: true, contact: newContact });
    } catch (err) {
        console.error("[PORTAL CLIENT CONTACT CREATE]", err);
        res.status(500).json({ error: "Fehler beim Anlegen des Kontakts: " + err.message });
    }
});

// --- RBAC: Kontakt eines Klienten im Portal aktualisieren ---
app.put(['/api/emails/portal/clients/:id/contacts/:contactId', '/portal/clients/:id/contacts/:contactId'], async (req, res) => {
    const auth = await resolvePortalAuth(req.headers.authorization);
    if (!auth) return res.status(401).json({ error: "Nicht autorisiert." });

    try {
        const pbAdmin = auth.pb || await getAdminPb();
        const { id: clientId, contactId } = req.params;

        const canAccess = await verifyPortalClientAccess(pbAdmin, auth, clientId);
        if (!canAccess) return res.status(403).json({ error: "Keine Berechtigung für diesen Klienten." });

        const client = await pbAdmin.collection('clients').getOne(clientId, { requestKey: null });
        const existingContacts = Array.isArray(client.contacts) ? client.contacts : (client.contacts ? [client.contacts] : []);
        const caregivers = Array.isArray(client.caregiver) ? client.caregiver : (client.caregiver ? [client.caregiver] : []);

        if (!existingContacts.includes(contactId) && !caregivers.includes(contactId)) {
            return res.status(404).json({ error: "Dieser Kontakt ist nicht mit dem angegebenen Klienten verknüpft." });
        }

        const { name_first, name_last, company_name, email, phone, street, housenr, zip, city, notes, relationship } = req.body;
        const updateData = { name_first, name_last, company_name, email, phone, street, housenr, zip, city };
        if (notes !== undefined || relationship !== undefined) {
            updateData.notes = typeof notes === 'object' ? notes : { role: relationship || notes || '', details: notes || '' };
        }
        Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

        const updatedContact = await pbAdmin.collection('contacts').update(contactId, updateData, { requestKey: null });
        res.json({ success: true, contact: updatedContact });
    } catch (err) {
        console.error("[PORTAL CLIENT CONTACT UPDATE]", err);
        res.status(500).json({ error: "Fehler beim Bearbeiten des Kontakts: " + err.message });
    }
});

// --- RBAC: Kontakt-Verknüpfung im Portal entfernen ---
app.delete(['/api/emails/portal/clients/:id/contacts/:contactId', '/portal/clients/:id/contacts/:contactId'], async (req, res) => {
    const auth = await resolvePortalAuth(req.headers.authorization);
    if (!auth) return res.status(401).json({ error: "Nicht autorisiert." });

    try {
        const pbAdmin = auth.pb || await getAdminPb();
        const { id: clientId, contactId } = req.params;

        const canAccess = await verifyPortalClientAccess(pbAdmin, auth, clientId);
        if (!canAccess) return res.status(403).json({ error: "Keine Berechtigung für diesen Klienten." });

        const client = await pbAdmin.collection('clients').getOne(clientId, { requestKey: null });
        let existingContacts = Array.isArray(client.contacts) ? client.contacts : (client.contacts ? [client.contacts] : []);
        
        existingContacts = existingContacts.filter(cid => cid !== contactId);
        await pbAdmin.collection('clients').update(clientId, { contacts: existingContacts }, { requestKey: null });

        res.json({ success: true, message: "Kontakt-Verknüpfung erfolgreich entfernt." });
    } catch (err) {
        console.error("[PORTAL CLIENT CONTACT DELETE]", err);
        res.status(500).json({ error: "Fehler beim Entfernen des Kontakts: " + err.message });
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

        let signUrl = '';
        if (profile.sign) {
            let fileToken = '';
            try { fileToken = await pbAdmin.files.getToken(); } catch(e) {}
            signUrl = formatPublicFileUrl(pbAdmin, profile, profile.sign, { token: fileToken }, req);
        }

        res.json({ success: true, profile: { ...profile, signUrl } });
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
        const { name_first, name_last, email, phone, street, housenr, zip, city, signature_base64, delete_signature } = req.body;

        const updateData = { name_first, name_last, email, phone, street, housenr, zip, city };
        let targetCollection = '';
        let targetId = '';

        if (auth.type === 'client') {
            targetCollection = 'clients';
            targetId = auth.clientId;
        } else if (auth.type === 'contact') {
            targetCollection = 'contacts';
            targetId = auth.contactId;
        } else if (auth.type === 'admin') {
            targetCollection = auth.pb.authStore.model.collectionName;
            targetId = auth.pb.authStore.model.id;
            updateData.tel = phone;
            delete updateData.phone;
        }

        let updatedProfile = null;

        // Wenn eine Unterschrift neu gezeichnet oder als Datei hochgeladen wurde (als Base64 Data URL)
        if (signature_base64 && typeof signature_base64 === 'string' && signature_base64.startsWith('data:image/')) {
            const base64Data = signature_base64.replace(/^data:image\/\w+;base64,/, '');
            const buffer = Buffer.from(base64Data, 'base64');
            const file = new File([buffer], 'unterschrift.png', { type: 'image/png' });

            const formData = new FormData();
            for (const [key, val] of Object.entries(updateData)) {
                if (val !== undefined && val !== null) formData.append(key, val);
            }
            formData.append('sign', file);

            updatedProfile = await pbAdmin.collection(targetCollection).update(targetId, formData, { requestKey: null });
        } else if (delete_signature) {
            // Bestehende Unterschrift entfernen
            const formData = new FormData();
            for (const [key, val] of Object.entries(updateData)) {
                if (val !== undefined && val !== null) formData.append(key, val);
            }
            formData.append('sign', '');

            updatedProfile = await pbAdmin.collection(targetCollection).update(targetId, formData, { requestKey: null });
        } else {
            // Reguläres Profil-Update ohne Unterschriftsänderung
            updatedProfile = await pbAdmin.collection(targetCollection).update(targetId, updateData, { requestKey: null });
        }

        let signUrl = '';
        if (updatedProfile.sign) {
            let fileToken = '';
            try { fileToken = await pbAdmin.files.getToken(); } catch(e) {}
            signUrl = formatPublicFileUrl(pbAdmin, updatedProfile, updatedProfile.sign, { token: fileToken }, req);
        }

        res.json({ success: true, profile: { ...updatedProfile, signUrl } });
    } catch (err) {
        console.error("[PORTAL PROFILE PUT]", err);
        res.status(500).json({ error: "Fehler beim Speichern des Profils: " + err.message });
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
            level_of_care, insurance_nr, insurance, other_insurance_name, other_insurance_street, other_insurance_zip, other_insurance_city, retirement_homes, notes 
        } = req.body;

        if (!name_first || !name_last || !company) {
            return res.status(400).json({ error: "Vorname, Nachname und Standort (Firma) sind erforderlich." });
        }

        let customInsuranceNote = "";
        if (insurance === 'other' && other_insurance_name && other_insurance_name.trim()) {
            const insData = {
                name: other_insurance_name.trim(),
                street: (other_insurance_street || '').trim(),
                zip: (other_insurance_zip || '').trim(),
                city: (other_insurance_city || '').trim()
            };
            customInsuranceNote = `\n[NEUE_KRANKENKASSE: ${JSON.stringify(insData)}]\n🏥 Gewünschte Krankenkasse (Neu): ${other_insurance_name.trim()}`;
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
            notes: `⚠️ NEUAUFNAHME-ANFRAGE: ${notes || ''}${customInsuranceNote}\nEingereicht von: ${auth.email || 'Unbekannt'}`
        };

        if (birthdate) {
            payload.birthdate = `${birthdate} 12:00:00.000Z`;
        }
        
        if (insurance && insurance !== 'other') payload.insurance = [insurance];
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

// Benachrichtigung an Admin bei neuer Terminanfrage (Resilient & Non-Blocking)
app.post(['/api/emails/portal/notify-request', '/portal/notify-request'], async (req, res) => {
    const { appointmentRequestId } = req.body;

    if (!appointmentRequestId) {
        return res.status(400).json({ error: "Fehlende appointmentRequestId." });
    }

    // 1. Sofortige Antwort an den Client senden -> Das Frontend friert NIEMALS ein!
    res.json({ success: true, queued: true, message: "Benachrichtigung wird im Hintergrund versendet." });

    // 2. Asynchrone Abarbeitung im Hintergrund mit striktem Error-Handling
    (async () => {
        try {
            console.log(`[NOTIFY-REQUEST] Starte Hintergrundverarbeitung für Anfrage: ${appointmentRequestId}`);
            const pbAdmin = await getAdminPb();
            let requestRecord;
            try {
                requestRecord = await pbAdmin.collection('appointment_requests').getOne(appointmentRequestId, { 
                    expand: 'company,client_id',
                    requestKey: null
                });
            } catch (fetchErr) {
                console.error(`[NOTIFY-REQUEST] Konnte Datensatz ${appointmentRequestId} nicht laden:`, fetchErr.message);
                return;
            }

            // Automatische KI-Kalender-Zusammenfassung im Hintergrund generieren und an der Anfrage speichern
            generateCalendarSummaryForRequest(requestRecord, pbAdmin).catch(err => console.warn('[NOTIFY-REQUEST] KI-Zusammenfassung fehlgeschlagen:', err.message));

            const name = requestRecord.sender_name || 'Unbekannt';
            const email = requestRecord.email || '';
            const phone = requestRecord.phone || '';
            const requestText = requestRecord.request_text || '';
            const date = requestRecord.date ? new Date(requestRecord.date).toLocaleDateString('de-DE') : '-';
            const time = requestRecord.time || '-';
            const companyName = requestRecord.expand?.company?.name || requestRecord.expand?.company?.city || 'Zentrale / Allgemein';

            // Anhänge sicher verarbeiten (nur absolute URLs)
            const emailAttachments = [];
            if (requestRecord.attachments && Array.isArray(requestRecord.attachments) && requestRecord.attachments.length > 0) {
                for (const filename of requestRecord.attachments) {
                    try {
                        const rawUrl = pbAdmin.files.getUrl(requestRecord, filename);
                        const fullUrl = rawUrl.startsWith('http') 
                            ? rawUrl 
                            : `${PB_URL.replace(/\/$/, '')}${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`;
                        
                        const fileResponse = await fetch(fullUrl, { signal: AbortSignal.timeout(6000) });
                        if (fileResponse.ok) {
                            const arrayBuffer = await fileResponse.arrayBuffer();
                            emailAttachments.push({ filename: filename, content: Buffer.from(arrayBuffer) });
                        }
                    } catch (attErr) {
                        console.warn(`[NOTIFY-REQUEST] Anhang ${filename} konnte nicht geladen werden:`, attErr.message);
                    }
                }
            }

            // SMTP Konfiguration mit Fallbacks
            const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER;
            const smtpPass = process.env.SMTP_PASSWORD || process.env.EMAIL_PASS;
            const smtpHost = process.env.SMTP_HOST || 'smtp.ionos.de';
            const smtpPort = parseInt(process.env.SMTP_PORT || '465', 10);

            if (smtpUser && smtpPass) {
                try {
                    const transporter = nodemailer.createTransport({ 
                        host: smtpHost, 
                        port: smtpPort, 
                        secure: smtpPort === 465, 
                        auth: { user: smtpUser, pass: smtpPass },
                        connectionTimeout: 7000,
                        greetingTimeout: 5000,
                        socketTimeout: 10000
                    });

                    const subject = `Neue Terminanfrage von ${name}`;
                    const htmlBody = `
                        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px;">
                            <h2 style="color: #c66a4d; margin-top: 0;">Neue Terminanfrage eingegangen</h2>
                            <div style="background-color: #f8fafc; padding: 16px; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 20px;">
                                <p style="margin: 4px 0;"><strong>Name:</strong> ${name}</p>
                                <p style="margin: 4px 0;"><strong>E-Mail:</strong> ${email || '-'}</p>
                                <p style="margin: 4px 0;"><strong>Telefon:</strong> ${phone || '-'}</p>
                                <p style="margin: 4px 0;"><strong>Standort:</strong> ${companyName}</p>
                                <p style="margin: 4px 0;"><strong>Wunschdatum:</strong> ${date}</p>
                                <p style="margin: 4px 0;"><strong>Uhrzeit:</strong> ${time}</p>
                            </div>
                            <h3 style="color: #1e293b; margin-bottom: 8px;">Anliegen:</h3>
                            <div style="background-color: #ffffff; border: 1px solid #e2e8f0; padding: 16px; border-radius: 12px; white-space: pre-wrap; font-size: 14px; line-height: 1.6;">${requestText.replace(/\n/g, '<br>')}</div>
                            <p style="margin-top: 24px; font-size: 11px; color: #94a3b8;">
                                Automatisch generiert von OrgaFlow. Sie können die Anfrage direkt im Dashboard einsehen und bestätigen.
                            </p>
                        </div>
                    `;
                    const textBody = `Neue Terminanfrage von ${name}\n\nE-Mail: ${email || '-'}\nTelefon: ${phone || '-'}\nStandort: ${companyName}\nDatum: ${date}\nUhrzeit: ${time}\n\nAnliegen:\n${requestText}`;

                    const info = await transporter.sendMail({
                        from: `"OrgaFlow System" <${smtpUser}>`,
                        to: "info@ihre-seniorenassistenz.com",
                        subject,
                        html: htmlBody,
                        text: textBody,
                        attachments: emailAttachments
                    });

                    console.log(`[NOTIFY-REQUEST] E-Mail erfolgreich gesendet: ${info.messageId}`);

                    // Archivierung in mailbox_messages
                    try {
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
                    } catch (archErr) {
                        console.warn("[NOTIFY-REQUEST] Archivierung fehlgeschlagen:", archErr.message);
                    }
                } catch (mailErr) {
                    console.error("[NOTIFY-REQUEST] E-Mail-Versand fehlgeschlagen:", mailErr.message);
                }
            } else {
                console.warn("[NOTIFY-REQUEST] SMTP-Zugangsdaten nicht konfiguriert – E-Mail wird übersprungen.");
            }

            // Web-Push Benachrichtigung an Admins
            if (process.env.VAPID_PUBLIC_KEY) {
                try {
                    const superusers = await pbAdmin.collection('_superusers').getFullList({ requestKey: null }).catch(() => []);
                    const adminUsers = await pbAdmin.collection('users').getFullList({
                        filter: 'role = "admin" || role = "superadmin"',
                        requestKey: null
                    }).catch(() => []);
                    const allAdmins = [...superusers, ...adminUsers];

                    const payload = JSON.stringify({
                        title: 'Neue Terminanfrage! 📬',
                        body: `${name} hat eine Anfrage gestellt (${date}).`,
                        url: '/dashboard'
                    });

                    const sentEndpoints = new Set();
                    for (const admin of allAdmins) {
                        let subs = admin.push_subscriptions;
                        if (typeof subs === 'string') { try { subs = JSON.parse(subs); } catch(e){} }
                        if (Array.isArray(subs) && subs.length > 0) {
                            const deadEndpoints = new Set();
                            for (const sub of subs) {
                                if (!sub || !sub.endpoint || sentEndpoints.has(sub.endpoint)) continue;
                                sentEndpoints.add(sub.endpoint);
                                try {
                                    await sendPushWithTimeout(sub, payload, {}, 3500);
                                } catch (pErr) {
                                    if (isDeadSubscription(pErr)) {
                                        console.warn(`[NOTIFY-REQUEST] Ungültige/abgelaufene Subscription für ${admin.id}, wird bereinigt.`);
                                        deadEndpoints.add(sub.endpoint);
                                    } else {
                                        console.warn(`[NOTIFY-REQUEST] Push-Fehler für ${admin.id}:`, pErr.statusCode || pErr.name, pErr.message);
                                    }
                                }
                            }
                            if (deadEndpoints.size > 0) {
                                const colName = admin.collectionName || (admin.role ? 'users' : '_superusers');
                                await cleanupDeadPushSubscriptions(pbAdmin, colName, admin.id, deadEndpoints);
                            }
                        }
                    }
                    console.log(`[NOTIFY-REQUEST] Push-Benachrichtigungen verarbeitet (${sentEndpoints.size} Endpoints benachrichtigt).`);
                } catch (pushErr) {
                    console.warn("[NOTIFY-REQUEST] Push-Fehler:", pushErr.message);
                }
            }
        } catch (bgErr) {
            console.error("[NOTIFY-REQUEST] Schwerer Hintergrundfehler:", bgErr);
        }
    })();
});

// KI Sprachnotiz-Transkription (Gemini 3.5 Flash)
app.post('/api/emails/ai/transcribe', requireAuth, async (req, res) => { // Behält den Namen für Kompatibilität
    try {
        const { audioBase64, mimeType, prompt: customPrompt, inputText } = req.body;
        if (!audioBase64 && !inputText) return res.status(400).json({ error: "Kein Audio oder Text gesendet." });
        if (!process.env.GEMINI_API_KEY) return res.status(500).json({ error: "Gemini API Key fehlt im Server." });

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const candidateAudioModels = ["gemini-3.8-flash", "gemini-3.5-flash", "gemini-flash-latest", "gemini-2.5-flash"];
        let resultText = "";
        let lastAudioErr = null;

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

        for (const mName of candidateAudioModels) {
            try {
                const model = genAI.getGenerativeModel({ model: mName });
                const resGen = await model.generateContent(contentParts);
                resultText = resGen.response.text();
                if (resultText) break;
            } catch (aErr) {
                console.warn(`[KI Diktat] Fehler bei Modell ${mName}:`, aErr.message);
                lastAudioErr = aErr;
            }
        }

        if (!resultText) {
            throw new Error(lastAudioErr?.message || "Kein Text generiert.");
        }

        res.json({ success: true, text: resultText });
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
        const candidateReceiptModels = ["gemini-3.8-flash", "gemini-2.5-flash", "gemini-1.5-flash"];

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
  "is_installment": false,
  "installment_current": "",
  "installment_total_count": "",
  "installment_total_amount": ""
}`;

        const imagePart = { inlineData: { data: imageBase64, mimeType: mimeType || 'image/jpeg' } };

        let lastErr = null;
        let responseText = null;

        for (const mName of candidateReceiptModels) {
            try {
                const receiptModel = genAI.getGenerativeModel({ model: mName });
                const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error(`Timeout 10s für Modell ${mName}`)), 10000));
                const result = await Promise.race([
                    receiptModel.generateContent([prompt, imagePart]),
                    timeoutPromise
                ]);
                responseText = result.response.text();
                if (responseText) break;
            } catch (err) {
                console.warn(`[KI Receipt] Modell ${mName} fehlgeschlagen:`, err.message);
                lastErr = err;
            }
        }

        if (!responseText) {
            throw lastErr || new Error("Kein KI-Modell konnte den Beleg verarbeiten.");
        }
        
        // JSON extrem sicher parsen (falls die KI Text VOR dem JSON sendet)
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        const cleanJson = jsonMatch ? jsonMatch[0] : responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        res.json(JSON.parse(cleanJson));
    } catch (error) {
        console.error("[KI Receipt] Fehler:", error);
        res.status(500).json({ error: "KI Fehler: " + (error.message || "Unbekannter Fehler") });
    }
});

// KI Anfrage- & Terminverarbeitung (Gemini 2.5 Flash mit persistentem PocketBase Caching)
app.post(['/api/emails/ai/process-inquiry', '/api/ai/process-inquiry'], requireAuth, async (req, res) => {
    try {
        const { raw_text, inquiry_id, force_refresh } = req.body;

        if (!raw_text || typeof raw_text !== 'string' || !raw_text.trim()) {
            return res.status(400).json({ error: "Feld raw_text ist erforderlich." });
        }

        const trimmedText = raw_text.trim();
        const contentHash = crypto.createHash('sha256').update(trimmedText).digest('hex');
        const pbAdmin = await getAdminPb();

        // 1. Caching & Idempotenz Prüfung
        if (!force_refresh) {
            if (inquiry_id) {
                try {
                    const existing = await pbAdmin.collection('inquiries').getOne(inquiry_id, { requestKey: null });
                    if (existing.ai_processed && existing.ai_result_cache) {
                        return res.json({
                            success: true,
                            cached: true,
                            inquiry_id: existing.id,
                            result: existing.ai_result_cache
                        });
                    }
                } catch {}
            }

            try {
                const cached = await pbAdmin.collection('inquiries').getFirstListItem(
                    `content_hash = "${contentHash}" && ai_processed = true`,
                    { requestKey: null }
                );
                if (cached && cached.ai_result_cache) {
                    return res.json({
                        success: true,
                        cached: true,
                        inquiry_id: cached.id,
                        result: cached.ai_result_cache
                    });
                }
            } catch {}
        }

        // 2. Gemini API Call
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) return res.status(500).json({ error: "GEMINI_API_KEY ist serverseitig nicht konfiguriert." });

        const genAI = new GoogleGenerativeAI(apiKey);
        const candidateModels = ["gemini-3.8-flash", "gemini-3.5-flash", "gemini-flash-latest", "gemini-2.5-flash", "gemini-3.5-flash-lite"];

        const nowIso = new Date().toISOString();
        const nowFormatted = new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' });

        const prompt = `Du bist ein intelligenter KI-Assistent für das Assistenz- und Betreuungsunternehmen "Seniorenassistenz Jenzsch" (OrgaFlow).
Analysiere die folgende unstrukturierte Kundenanfrage (z. B. aus einer E-Mail, einem Kontaktformular oder einer Notiz).

Aktueller Zeitpunkt: ${nowFormatted} (${nowIso}).
Konvertiere relative Datums- oder Zeitangaben (z. B. "nächsten Dienstag 14 Uhr", "übermorgen Vormittag") basierend auf diesem aktuellen Zeitpunkt in ein valides ISO-8601 Datum.

Antworte AUSSCHLIESSLICH mit einem validen JSON-Objekt in folgendem Format:
{
  "clientName": "Vollständiger Name des Anfragenden / Klienten",
  "contactInfo": {
    "email": "E-Mail oder leer",
    "phone": "Telefonnummer oder leer"
  },
  "category": "Erstberatung | Begleitung | Alltagshilfe | Verhinderungspflege | Sonstiges",
  "urgency": "low | medium | high",
  "appointmentRequested": true oder false,
  "preferredDate": "Valides ISO-8601 Datum/Uhrzeit (z. B. 2026-09-10T10:00:00.000Z) oder null",
  "summary": "Prägnante Zusammenfassung des Anliegens in 1-2 Sätzen",
  "suggestedResponse": "Freundlicher und professioneller E-Mail-Antwortentwurf für eine Seniorenassistenz"
}

Text der Anfrage:
"""
${trimmedText}
"""`;

        let aiResult = null;
        for (const modelName of candidateModels) {
            try {
                const model = genAI.getGenerativeModel({
                    model: modelName,
                    generationConfig: {
                        responseMimeType: "application/json"
                    }
                });
                const result = await model.generateContent(prompt);
                const responseText = result.response.text();
                const jsonMatch = responseText.match(/\{[\s\S]*\}/);
                aiResult = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);
                break;
            } catch (err) {
                console.warn(`[KI Process Inquiry] Modell ${modelName} fehlgeschlagen (${err.status || err.message}). Versuche nächstes...`);
            }
        }

        if (!aiResult) {
            return res.status(500).json({ error: "Kein KI-Modell konnte die Anfrage analysieren (Quota erschöpft)." });
        }

        // 3. Automatischer Terminentwurf bei Terminwunsch (status: 'pending')
        let appointmentId = null;
        if (aiResult.appointmentRequested && aiResult.preferredDate) {
            try {
                const appDate = new Date(aiResult.preferredDate);
                if (!isNaN(appDate.getTime())) {
                    const newApp = await pbAdmin.collection('appointments').create({
                        appointment: appDate.toISOString(),
                        description: `[ANFRAGE: ${aiResult.category}] ${aiResult.summary} (Klient: ${aiResult.clientName})`,
                        is_private: false,
                        status: 'pending',
                        notes: `KI-generierter Terminentwurf aus Kundenanfrage.\n\nKategorie: ${aiResult.category}\nDringlichkeit: ${aiResult.urgency}\nKontakt: ${aiResult.contactInfo?.phone || '-'} / ${aiResult.contactInfo?.email || '-'}\n\nAntwortentwurf:\n${aiResult.suggestedResponse}`
                    });
                    appointmentId = newApp.id;
                }
            } catch (appErr) {
                console.warn('[AI Inquiry] Konnte Terminentwurf nicht automatisch anlegen:', appErr.message);
            }
        }

        // 4. Persistentes Caching in PocketBase
        let savedInquiryId = inquiry_id;
        const inquiryData = {
            raw_text: trimmedText,
            content_hash: contentHash,
            ai_processed: true,
            ai_result_cache: aiResult,
            sender_name: aiResult.clientName || '',
            sender_email: aiResult.contactInfo?.email || '',
            sender_phone: aiResult.contactInfo?.phone || '',
            urgency: aiResult.urgency || 'medium',
            summary: aiResult.summary || '',
            draft_reply: aiResult.suggestedResponse || '',
            status: 'new',
            ...(appointmentId ? { appointment_id: appointmentId } : {})
        };

        if (inquiry_id) {
            try {
                await pbAdmin.collection('inquiries').update(inquiry_id, inquiryData);
            } catch {
                const created = await pbAdmin.collection('inquiries').create(inquiryData);
                savedInquiryId = created.id;
            }
        } else {
            const created = await pbAdmin.collection('inquiries').create(inquiryData);
            savedInquiryId = created.id;
        }

        res.json({
            success: true,
            cached: false,
            inquiry_id: savedInquiryId,
            appointment_id: appointmentId,
            result: aiResult
        });
    } catch (error) {
        console.error("[KI Process Inquiry] Fehler:", error);
        res.status(500).json({ error: "Fehler bei der KI-Anfragenverarbeitung: " + error.message });
    }
});

// --- KI MARKETING-ASSETS GENERATOR MIT POCKETBASE CACHE ---
app.post(['/api/emails/ai/generate-marketing', '/api/ai/generate-marketing'], async (req, res) => {
    try {
        const { format = 'poster', target_audience = 'Angehörige', prompt_override, context = '', force_refresh = false } = req.body || {};
        const pbAdmin = await getAdminPb();

        const rawHashInput = `${format}|${target_audience}|${prompt_override || ''}|${context}`.trim();
        const contentHash = crypto.createHash('sha256').update(rawHashInput).digest('hex');

        // 1. Cache-Prüfung in PocketBase
        if (!force_refresh) {
            try {
                const cachedAsset = await pbAdmin.collection('marketing_assets').getFirstListItem(
                    `source_hash = "${contentHash}"`,
                    { requestKey: null }
                );
                if (cachedAsset && cachedAsset.content_json) {
                    return res.json({
                        success: true,
                        cached: true,
                        id: cachedAsset.id,
                        format: cachedAsset.format,
                        content: cachedAsset.content_json,
                        source_hash: contentHash
                    });
                }
            } catch {}
        }

        // 2. Gemini API aufrufen
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: "GEMINI_API_KEY ist serverseitig nicht konfiguriert." });
        }

        const genAI = new GoogleGenerativeAI(apiKey);

        let formatGuidance = "";
        if (format === 'poster' || format === 'flyer') {
            formatGuidance = `Schema:
{
  "headline": "Prägnante Hauptüberschrift",
  "subheadline": "Einfühlsamer Untertitel",
  "bulletpoints": ["Punkt 1", "Punkt 2", "Punkt 3", "Punkt 4"],
  "highlight_box": "Besonderer Hinweis (z.B. 131 € Entlastungsbetrag § 45b SGB XI)",
  "cta": "Handlungsaufforderung (z.B. Jetzt Erstgespräch vereinbaren)",
  "contacts": "Kontaktdaten mit Telefon und E-Mail"
}`;
        } else if (format === 'social_sheet') {
            formatGuidance = `Schema (Array mit min. 2 Social-Media Posts):
[
  {
    "platform": "Instagram / Facebook",
    "hook": "Aufmerksamkeitsstarker Einstiegssatz",
    "text": "Einfühlsamer Post-Text",
    "cta": "Call to action",
    "hashtags": "#Hashtags"
  }
]`;
        } else if (format === 'insert') {
            formatGuidance = `Schema:
{
  "title": "Titel der Einleger-/Postkarte",
  "subtitle": "Untertitel",
  "benefits": ["Vorteil 1", "Vorteil 2", "Vorteil 3"],
  "footer": "Kontaktdaten"
}`;
        } else if (format === 'factsheet') {
            formatGuidance = `Schema:
{
  "title": "Übersicht: Finanzierung & Entlastungsleistungen (§ 45b SGB XI)",
  "section1_title": "1. Was ist der Entlastungsbetrag?",
  "section1_text": "Erklärung zu 131 € monatlich ab Pflegegrad 1",
  "section2_title": "2. Wofür kann der Betrag verwendet werden?",
  "section2_items": ["Leistung 1", "Leistung 2", "Leistung 3"],
  "section3_title": "3. Wie erfolgt die Abrechnung?",
  "section3_text": "Direktabrechnung mit der Pflegekasse ohne Vorkasse"
}`;
        } else if (format === 'voucher') {
            formatGuidance = `Schema:
{
  "title": "Gutschein für ein persönliches Kennenlernen",
  "value": "100% Kostenfrei & Unverbindlich",
  "description": "Erklärung des Angebots",
  "code": "GUTSCHEIN-KENNENLERNEN-2026",
  "validity": "Gültigkeitsbereich"
}`;
        } else {
            formatGuidance = `Schema:
{
  "title": "Titel",
  "body": "Inhaltstext",
  "cta": "Handlungsaufforderung"
}`;
        }

        const prompt = `Du bist ein hochqualifizierter deutscher Werbetexter und Marketing-Spezialist für die Seniorenassistenz Jenzsch (Standorte: Halle Saale und Lutherstadt Wittenberg).
Deine Texte sind einfühlsam, seriös, vertrauensbildend und rechtlich präzise (z.B. Erwähnung des Entlastungsbetrags § 45b SGB XI mit 131 €/Monat, Verhinderungspflege § 39 SGB XI, keine starre Vertragsbindung).
Zielgruppe: ${target_audience}.
Format: ${format}.
Zusatzkontext: ${context || 'Kein Zusatzkontext'}.

Erstelle für das gewünschte Werbemittel-Format professionelle Inhalte. Antworte AUSSCHLIESSLICH im folgenden JSON-Format ohne Markdown-Codeblöcke:
${formatGuidance}`;

        const candidateModels = ['gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-flash-latest', 'gemini-2.5-flash'];
        let resultJson = null;
        let usedModel = '';
        let lastError = null;

        for (const modelName of candidateModels) {
            try {
                const model = genAI.getGenerativeModel({
                    model: modelName,
                    generationConfig: {
                        responseMimeType: "application/json"
                    }
                });
                const result = await model.generateContent(prompt);
                const responseText = result.response.text();
                const jsonMatch = responseText.match(/(\{|\[)[\s\S]*(\}|\])/);
                resultJson = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);
                usedModel = modelName;
                break;
            } catch (err) {
                lastError = err;
                console.warn(`[AI Marketing] Modell ${modelName} fehlgeschlagen:`, err?.message || err);
            }
        }

        if (!resultJson) {
            return res.status(500).json({ error: `Gemini API Fehler: ${lastError?.message || 'Keine Antwort generiert'}` });
        }

        // 3. In PocketBase marketing_assets cachen/speichern
        const title = `Marketing-Vorlage (${format.toUpperCase()} - ${target_audience})`;
        let savedRecord = null;
        try {
            let existing = null;
            try {
                existing = await pbAdmin.collection('marketing_assets').getFirstListItem(
                    `format = "${format}"`,
                    { requestKey: null }
                );
            } catch {}

            const updateData = {
                title,
                format,
                content_json: resultJson,
                source_hash: contentHash,
                target_audience,
                headline: resultJson.headline || resultJson.title || '',
                body_text: resultJson.subheadline || resultJson.description || resultJson.section1_text || '',
                call_to_action: resultJson.cta || resultJson.call_to_action || '',
                contact_info: resultJson.contacts || resultJson.footer || ''
            };

            if (existing) {
                savedRecord = await pbAdmin.collection('marketing_assets').update(existing.id, updateData);
            } else {
                savedRecord = await pbAdmin.collection('marketing_assets').create(updateData);
            }
        } catch (dbErr) {
            console.error('[AI Marketing] Speichern in PocketBase fehlgeschlagen:', dbErr);
        }

        res.json({
            success: true,
            cached: false,
            model: usedModel,
            id: savedRecord?.id || null,
            format,
            content: resultJson,
            source_hash: contentHash
        });
    } catch (error) {
        console.error("[AI Marketing] Fehler:", error);
        res.status(500).json({ error: "Fehler bei der Werbemittel-Generierung: " + error.message });
    }
});

const forecastMemoryCache = new Map();

// --- KI FINANZPROGNOSE SPEKULATION (GEMINI 3.8 FLASH) ---
app.post(['/api/emails/ai/forecast-speculation', '/api/ai/forecast-speculation'], async (req, res) => {
    try {
        const {
            historical_data = [],
            company_info = {},
            monthly_contract_costs = 0,
            force_refresh = false
        } = req.body || {};

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: "GEMINI_API_KEY ist serverseitig nicht konfiguriert." });
        }

        const pbAdmin = await getAdminPb();
        const rawHashInput = JSON.stringify({ historical_data, company_info, monthly_contract_costs });
        const contentHash = crypto.createHash('sha256').update(rawHashInput).digest('hex');

        // 1. In-Memory Caching Prüfung
        if (!force_refresh && forecastMemoryCache.has(contentHash)) {
            const memCached = forecastMemoryCache.get(contentHash);
            if (Date.now() - memCached.timestamp < 3600 * 1000) {
                return res.json({
                    success: true,
                    cached: true,
                    model: `${memCached.model} (cached)`,
                    data: memCached.data
                });
            }
        }

        // 2. PocketBase Caching Prüfung
        if (!force_refresh) {
            try {
                const cached = await pbAdmin.collection('marketing_assets').getFirstListItem(
                    `format = "factsheet" && source_hash = "${contentHash}"`,
                    { requestKey: null }
                );
                if (cached && cached.content_json) {
                    forecastMemoryCache.set(contentHash, {
                        data: cached.content_json,
                        model: 'gemini-3.8-flash',
                        timestamp: Date.now()
                    });
                    return res.json({
                        success: true,
                        cached: true,
                        model: 'gemini-3.8-flash (cached)',
                        data: cached.content_json
                    });
                }
            } catch {}
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const now = new Date();
        const currentMonthName = now.toLocaleString('de-DE', { month: 'long', year: 'numeric' });

        const prompt = `Du bist ein hochqualifizierter Senior Chief Financial Officer (CFO), Steuerexperte (deutsches Steuerrecht: EStG, GewStG, UStG) und Business Intelligence Analyst.
Deine Aufgabe ist es, für ein deutsches inhabergeführtes Einzelunternehmen im Bereich der mobilen Seniorenassistenz und Alltagsbegleitung ("Seniorenassistenz Jenzsch" in Sachsen-Anhalt: Halle Saale & Lutherstadt Wittenberg) eine hochpräzise, realitätsnahe und spekulative 12-Monats-Zukunftsprognose zu berechnen.

Kerninformationen der Branche & des Betriebs:
- Kerngeschäft: Betreuungs- und Entlastungsleistungen nach § 45b SGB XI (Entlastungsbetrag 131 €/Monat je Pflegebedürftigem ab Pflegegrad 1), Verhinderungspflege nach § 39 SGB XI und private Selbstzahlerleistungen.
- Abrechnung: Großteils Direktabrechnung mit Pflegekassen via Abtretungserklärung sowie Privatrechnungen.
- Typische Saisonalität:
  * Leicht gedämpfte Nachfrage im Hochsommer (Juli/August durch Urlaubszeiten pflegender Angehöriger).
  * Spürbarer Jahresendspurt (Oktober bis Dezember), da Restansprüche des Jahresbudgets der Pflegekassen ausgeschöpft werden.
  * Stabile Basisauslastung in den Wintermonaten (Januar bis April).
- Steuern:
  * Gewerbesteuer: Freibetrag 24.500 € Gewerbeertrag; Steuermesszahl 3,5%, Hebesatz ca. 400%.
  * Gewerbesteuer-Anrechnung auf ESt nach § 35 EStG (bis Faktor 4,0).
  * Einkommensteuer nach Grundtarif § 32a EStG (Grundfreibetrag ca. 11.784 €).
  * Umsatzsteuer nach Regelbesteuerung (19%), sofern nicht umsatzsteuerfreie Pflegeleistungen vorliegen.

Hier sind die realen historischen Finanzdaten der vergangenen Monate sowie die fixen Vertragskosten:
Aktueller Zeitpunkt: ${currentMonthName} (${now.toISOString()}).

Historische Monatsdaten:
${JSON.stringify(historical_data, null, 2)}

Monatliche private Fixkosten aus Verträgen: ${monthly_contract_costs} Euro.
Unternehmenskontext: ${JSON.stringify(company_info)}

Berechne jetzt für die kommenden 12 rollierenden Monate die präzise Zukunftsspekulation.
Antworte AUSSCHLIESSLICH im folgenden JSON-Format ohne Markdown-Codeblöcke:
{
  "forecast_months": [
    {
      "month": "Oktober 2026",
      "monthShort": "Okt",
      "monthIndex": 9,
      "year": 2026,
      "bwaRevenue": 7500.00,
      "bwaExpenses": 1800.00,
      "bwaProfit": 5700.00,
      "bwaTaxes": 950.00,
      "bwaNetAfterTaxes": 4750.00,
      "personalIncome": 250.00,
      "personalContracts": 850.00,
      "personalVariableExpenses": 1200.00,
      "personalTotalExpenses": 2050.00,
      "totalNetIncome": 5000.00,
      "totalCashflow": 2950.00,
      "confidence_score": 92,
      "key_drivers": "Hohe Nachfrage nach Verhinderungspflege und stabile Bestandsklienten"
    }
  ],
  "strategic_analysis": {
    "summary_headline": "Stabile Ertragslage mit solidem freien Cashflow-Polster",
    "growth_trajectory": "Moderates organisches Wachstum von ca. 8-12% p.a.",
    "seasonal_patterns": "Typischer Peak im Q4 vor Jahreswechsel, Sommerdelle im Juli/August",
    "liquidity_risks": [
      "Quartalsweise USt-Zahllast erfordert ca. 1.200 € Rücklage",
      "KfZ-Wartung im Frühjahr einplanen"
    ],
    "optimization_tips": [
      "Abrechnungsturnus mit Pflegekassen auf 14-tägig verkürzen",
      "Verhinderungspflege-Budgets aktiv im September bei Angehörigen ansprechen"
    ],
    "confidence_overall": 89
  }
}`;

        const candidateModels = ['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.1-pro-preview', 'gemini-2.5-flash'];
        let resultJson = null;
        let usedModel = '';
        let lastError = null;

        for (const modelName of candidateModels) {
            try {
                const model = genAI.getGenerativeModel({
                    model: modelName,
                    generationConfig: {
                        responseMimeType: "application/json",
                        temperature: 0.2
                    }
                });
                const result = await model.generateContent(prompt);
                const responseText = result.response.text();
                const jsonMatch = responseText.match(/\{[\s\S]*\}/);
                resultJson = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);
                usedModel = modelName;
                break;
            } catch (err) {
                lastError = err;
                console.warn(`[AI Forecast Speculation] Modell ${modelName} fehlgeschlagen:`, err?.message || err);
            }
        }

        if (!resultJson) {
            return res.status(500).json({ error: `Gemini API Fehler: ${lastError?.message || 'Keine Antwort generiert'}` });
        }

        // Cache in PocketBase & Memory
        forecastMemoryCache.set(contentHash, {
            data: resultJson,
            model: usedModel,
            timestamp: Date.now()
        });

        try {
            await pbAdmin.collection('marketing_assets').create({
                title: `Finanzprognose-Spekulation ${usedModel} (${new Date().toLocaleDateString('de-DE')})`,
                format: 'factsheet',
                content_json: resultJson,
                source_hash: contentHash,
                target_audience: 'Geschäftsleitung',
                headline: resultJson.strategic_analysis?.summary_headline || 'KI Finanzprognose',
                body_text: resultJson.strategic_analysis?.growth_trajectory || ''
            });
        } catch (dbErr) {
            console.warn('[AI Forecast Speculation] Cache-Speicherung in PocketBase übersprungen:', dbErr?.message || dbErr);
        }

        res.json({
            success: true,
            cached: false,
            model: usedModel,
            data: resultJson
        });

    } catch (error) {
        console.error("[AI Forecast Speculation] Fehler:", error);
        res.status(500).json({ error: "Fehler bei der Finanzspekulation: " + error.message });
    }
});

// --- AUTH-HELPER FÜR SUPERADMIN / SUPERUSER ACCESS (HRBAC) ---
async function verifySuperadminAccess(req, res, next) {
    try {
        const ip = req.ip || req.connection?.remoteAddress || '';
        const isLocalhost = ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1' || ip === 'localhost';
        const isCronTrigger = req.body?.triggeredBy === 'pb_cron_weekly_digest';

        if (isLocalhost && isCronTrigger) {
            req.authInfo = { isSuperuser: true, role: 'superuser' };
            return next();
        }

        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            if (isLocalhost && process.env.NODE_ENV !== 'production') {
                req.authInfo = { isSuperuser: true, role: 'superadmin' };
                return next();
            }
            return res.status(401).json({ error: 'Nicht autorisiert: Bearer-Token erforderlich.' });
        }

        const token = authHeader.replace('Bearer ', '').trim();
        const pbUrl = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090';
        const pb = new PocketBase(pbUrl);
        pb.authStore.save(token, null);

        let authModel = null;
        let isSuperuser = false;

        try {
            const refreshSuper = await pb.collection('_superusers').authRefresh();
            authModel = refreshSuper.record;
            isSuperuser = true;
        } catch {
            try {
                const refreshUser = await pb.collection('users').authRefresh();
                authModel = refreshUser.record;
            } catch {
                return res.status(401).json({ error: 'Ungültiger oder abgelaufener Authentifizierungs-Token.' });
            }
        }

        if (!isSuperuser) {
            const role = authModel?.role;
            if (role !== 'superadmin' && role !== 'owner') {
                return res.status(403).json({ error: 'Zugriff verweigert: Nur für Inhaber und Superadmins (HRBAC).' });
            }
        }

        req.authInfo = { isSuperuser, role: isSuperuser ? 'superuser' : authModel.role, user: authModel };
        next();
    } catch (e) {
        return res.status(500).json({ error: 'Authentifizierungsprüfung fehlgeschlagen: ' + e.message });
    }
}

// --- WÖCHENTLICHE AUTO-UPDATE-SCHLEIFE (FEEDBACK-TO-PROMPT ENGINE) ---
app.post(['/api/emails/admin/system-prompts/generate', '/api/admin/system-prompts/generate'], verifySuperadminAccess, async (req, res) => {
    try {
        console.log("[API] Wöchentlicher Feedback-to-Prompt Digest angefordert...");
        const result = await generateWeeklyFeedbackDigest({
            days: req.body?.days || 7,
            forceCreate: req.body?.forceCreate !== false,
            includeChat: req.body?.includeChat !== false,
            includeProposals: req.body?.includeProposals !== false,
            includeInquiries: req.body?.includeInquiries !== false,
            includeAppointmentRequests: req.body?.includeAppointmentRequests !== false
        });
        res.json(result);
    } catch (err) {
        console.error("[API] Fehler beim Generieren des Feedback-Digests:", err);
        res.status(500).json({ error: "Fehler bei der Prompt-Synthese: " + err.message });
    }
});

// --- EINZEL-FEEDBACK-TO-PROMPT ENGINE (SUPERADMIN) ---
app.post(['/api/emails/admin/feedback-prompt/generate', '/api/admin/feedback-prompt/generate'], verifySuperadminAccess, async (req, res) => {
    try {
        console.log("[API] Einzel-Feedback-to-Prompt angefordert für:", req.body?.sender || req.body?.id);
        const result = await generateSingleFeedbackPrompt({
            source: req.body?.source || 'feedback',
            id: req.body?.id,
            sender: req.body?.sender,
            message: req.body?.message,
            rating: req.body?.rating,
            context: req.body?.context,
            adminInstruction: req.body?.adminInstruction,
            saveAsSystemPrompt: req.body?.saveAsSystemPrompt === true
        });
        res.json(result);
    } catch (err) {
        console.error("[API] Fehler beim Generieren des Einzel-Feedback-Prompts:", err);
        res.status(500).json({ error: "Fehler bei der Prompt-Erstellung: " + err.message });
    }
});

// --- AUTOMATISIERTER LÖSUNGS- UND MASSNAHMEN-ASSISTENT (1-CLICK) ---
app.post(['/api/emails/admin/generate-solution', '/api/emails/generate-solution', '/api/emails/v1/generate-solution', '/api/v1/generate-solution', '/api/admin/generate-solution'], async (req, res) => {
    try {
        const { title, description, category, context, format } = req.body || {};
        console.log("[API] Generierung eines Lösungs- und Maßnahmenkonzepts für:", title || category);
        const result = await generateSolutionConcept({
            title,
            description,
            category,
            context,
            format
        });
        res.json(result);
    } catch (err) {
        console.error("[API] Fehler beim Generieren des Lösungskonzepts:", err);
        res.status(500).json({ error: "Fehler bei der Lösungsgenerierung: " + err.message });
    }
});

// --- SUPERADMIN FEEDBACK REACTION & REPLY ---
app.post(['/api/emails/admin/feedback-react', '/api/admin/feedback-react'], async (req, res) => {
    try {
        const { id, source = 'feedback', newStatus, adminNotes, replyMessage, recipientEmail } = req.body;
        console.log("[API] Superadmin-Reaktion auf", source, id, "Status:", newStatus);

        const pbUrl = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090';
        const pbAdmin = new PocketBase(pbUrl);
        await pbAdmin.collection('_superusers').authWithPassword(
            process.env.PB_ADMIN_EMAIL,
            process.env.PB_ADMIN_PASSWORD
        );

        let updatedRecord = null;
        if (id) {
            if (source === 'feedback') {
                const updatePayload = {};
                if (newStatus) updatePayload.status = newStatus;
                if (replyMessage) updatePayload.admin_reply = replyMessage;
                if (adminNotes) updatePayload.admin_notes = adminNotes;
                try {
                    updatedRecord = await pbAdmin.collection('feedbacks').update(id, updatePayload, { requestKey: null });
                } catch (fbErr) {
                    console.warn('[Feedback React] Initial update failed, retrying with fallback status:', fbErr.message);
                    if (newStatus === 'In Bearbeitung' || newStatus === 'In Arbeit') {
                        updatePayload.status = 'Gelesen';
                    } else if (newStatus === 'Gelöst' || newStatus === 'Archiviert') {
                        updatePayload.status = 'Archieviert';
                    }
                    delete updatePayload.admin_reply;
                    delete updatePayload.admin_notes;
                    updatedRecord = await pbAdmin.collection('feedbacks').update(id, updatePayload, { requestKey: null });
                }
            } else if (source === 'inquiry') {
                const updatePayload = {};
                if (newStatus) {
                    const mapped = (newStatus === 'Neu' || newStatus === 'new') ? 'new' :
                        (newStatus === 'In Bearbeitung' || newStatus === 'In Arbeit' || newStatus === 'in_progress') ? 'in_progress' :
                        (newStatus === 'Gelöst' || newStatus === 'converted') ? 'converted' :
                        (newStatus === 'Archiviert' || newStatus === 'rejected') ? 'rejected' : newStatus;
                    updatePayload.status = mapped;
                }
                if (replyMessage) updatePayload.draft_reply = replyMessage;
                try {
                    updatedRecord = await pbAdmin.collection('inquiries').update(id, updatePayload, { requestKey: null });
                } catch (inqErr) {
                    console.warn('[Feedback React] Inquiry update error:', inqErr.message);
                }
            } else if (source === 'chat') {
                try {
                    updatedRecord = await pbAdmin.collection('live_chat').update(id, { status: newStatus }, { requestKey: null });
                } catch (chatErr) {
                    // live_chat might not have a status field yet
                }
            } else if (source === 'appointment_request') {
                const updatePayload = {};
                if (newStatus) updatePayload.status = newStatus;
                try {
                    updatedRecord = await pbAdmin.collection('appointment_requests').update(id, updatePayload, { requestKey: null });
                } catch (appErr) {
                    console.warn('[Feedback React] Appointment request update error:', appErr.message);
                }
            }
        }

        // Optional: E-Mail-Antwort direkt an den Kunden senden falls E-Mail vorhanden
        if (recipientEmail && replyMessage) {
            const smtpHost = process.env.SMTP_HOST || 'mail.ihre-seniorenassistenz.com';
            const smtpPort = parseInt(process.env.SMTP_PORT || '465');
            const smtpUser = process.env.SMTP_USER || 'service@ihre-seniorenassistenz.com';
            const smtpPass = process.env.SMTP_PASS;

            if (smtpPass) {
                try {
                    const transporter = nodemailer.createTransport({
                        host: smtpHost,
                        port: smtpPort,
                        secure: smtpPort === 465,
                        auth: { user: smtpUser, pass: smtpPass }
                    });

                    const subject = 'Rückmeldung zu Ihrem Feedback – Seniorenassistenz';
                    const htmlBody = `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #262626; max-width: 600px; padding: 20px;">
                        <h2 style="color: #4f46e5; margin-bottom: 16px;">Vielen Dank für Ihre Rückmeldung</h2>
                        <p>${replyMessage.replace(/\n/g, '<br/>')}</p>
                        <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;" />
                        <p style="font-size: 12px; color: #737373;">Seniorenassistenz Jenzsch • Geschäftsleitung & Kundenservice</p>
                    </div>`;

                    await transporter.sendMail({
                        from: `"Seniorenassistenz Kundenservice" <${smtpUser}>`,
                        to: recipientEmail,
                        subject: subject,
                        html: htmlBody,
                        text: replyMessage
                    });
                    console.log("[Feedback React] Antwort-Mail erfolgreich an", recipientEmail, "versendet.");
                } catch (mailErr) {
                    console.warn("[Feedback React] SMTP Fehler beim Senden der Antwort:", mailErr.message);
                }
            }
        }

        res.json({ success: true, updatedRecord });
    } catch (err) {
        console.error("[API] Fehler bei Feedback-Reaktion:", err);
        res.status(500).json({ error: "Fehler beim Aktualisieren: " + err.message });
    }
});

// --- KI KALENDER-ZUSAMMENFASSUNG FÜR AUFTRAGSANFRAGEN ---
async function generateCalendarSummaryForRequest(requestRecord, pbAdmin) {
    if (!requestRecord) return null;
    if (requestRecord.ai_summary && requestRecord.ai_summary.trim()) {
        return requestRecord.ai_summary;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.warn("[AI Summary] GEMINI_API_KEY nicht gesetzt.");
        return null;
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const candidateModels = ["gemini-3.8-flash", "gemini-3.5-flash", "gemini-flash-latest", "gemini-2.5-flash", "gemini-3.5-flash-lite"];

    const senderName = requestRecord.sender_name || 'Unbekannt';
    const rawText = requestRecord.request_text || '';
    const dateStr = requestRecord.date ? new Date(requestRecord.date).toLocaleDateString('de-DE') : '';
    const timeStr = requestRecord.time ? (typeof requestRecord.time === 'string' && requestRecord.time.includes('T') ? new Date(requestRecord.time).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : requestRecord.time) : '';
    const addressStr = `${requestRecord.street || ''} ${requestRecord.zip_city || ''}`.trim();
    const phoneStr = requestRecord.phone || '';
    const emailStr = requestRecord.email || '';

    const prompt = `Du bist ein intelligenter Disponent für das Seniorenbetreuungsunternehmen "Seniorenassistenz Jenzsch".
Analysiere die folgende Kundenanfrage und fasse sie prägnant, strukturiert und übersichtlich für den Google Kalender / OrgaFlow Terminkalender zusammen.
Entferne alle Höflichkeitsfloskeln ("Sehr geehrte Damen und Herren", "Ich freue mich über Rückmeldung") und irrelevante Details.

Absender: ${senderName}
Telefon: ${phoneStr}
E-Mail: ${emailStr}
Adresse/Ort: ${addressStr}
Terminwunsch: ${dateStr} ${timeStr}
Originaltext der Kundenanfrage:
"""
${rawText}
"""

Antworte AUSSCHLIESSLICH im folgenden JSON-Format (keine Codeblöcke):
{
  "title": "Prägnanter Kalendertitel (max. 8 Worte, z. B. 'Erstgespräch Fr. Müller (Einkauf & Arzt)')",
  "task": "Was genau getan werden soll (1-2 präzise Sätze)",
  "location": "Wo der Termin stattfindet (z. B. 'Dreyhauptstraße 2, Halle' oder 'Beim Klienten')",
  "contact": "Name Klient/in bzw. Ansprechpartner & Telefonnummer",
  "notes": "Besonderheiten (z. B. Rollator, Hörgerät, Schlüssel bei Nachbarn, bevorzugte Tage)",
  "summary_text": "📌 Titel: [Titel]\\n🎯 Anliegen: [Aufgabe]\\n📍 Ort: [Ort]\\n👤 Kontakt: [Kontakt]\\nℹ️ Besonderheiten: [Notes]"
}`;

    for (const modelName of candidateModels) {
        try {
            const model = genAI.getGenerativeModel({
                model: modelName,
                generationConfig: { responseMimeType: "application/json" }
            });
            const result = await model.generateContent(prompt);
            const responseText = result.response.text();
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);
            const summaryText = parsed.summary_text || parsed.task || responseText;

            if (summaryText && pbAdmin && requestRecord.id) {
                try {
                    await pbAdmin.collection('appointment_requests').update(requestRecord.id, {
                        ai_summary: summaryText
                    }, { requestKey: null });
                } catch (uErr) {
                    console.warn("[AI Summary] Konnte ai_summary in PB nicht speichern:", uErr.message);
                }
            }
            return summaryText;
        } catch (err) {
            console.warn(`[AI Summary] Modell ${modelName} fehlgeschlagen (${err.status || err.message}). Versuche nächstes Modell...`);
        }
    }
    console.error("[AI Summary] Alle KI-Modelle fehlgeschlagen.");
    return null;
}

app.post(['/api/emails/ai/summarize-request', '/api/ai/summarize-request', '/api/emails/summarize-request'], requireAuth, async (req, res) => {
    try {
        const { id, raw_text, sender_name, street, zip_city, phone } = req.body;
        const pbAdmin = await getAdminPb();

        let record = null;
        if (id) {
            try {
                record = await pbAdmin.collection('appointment_requests').getOne(id, { requestKey: null });
            } catch (e) {}
        }

        if (!record && raw_text) {
            record = {
                id: null,
                sender_name: sender_name || '',
                request_text: raw_text,
                street: street || '',
                zip_city: zip_city || '',
                phone: phone || ''
            };
        }

        if (!record) {
            return res.status(400).json({ error: "Anfrage nicht gefunden oder kein Text übergeben." });
        }

        // Wenn schon vorhanden und kein force-refresh
        if (record.id && record.ai_summary && !req.body.force) {
            return res.json({ success: true, summary: record.ai_summary, cached: true });
        }

        const summary = await generateCalendarSummaryForRequest(record, pbAdmin);
        res.json({ success: true, summary: summary || record.request_text });
    } catch (err) {
        console.error("[AI Summary API] Fehler:", err);
        res.status(500).json({ error: err.message || "Fehler bei der KI-Zusammenfassung" });
    }
});

// --- GOOGLE KONTAKT- & ORTS-ERMITTLUNG (GEMINI SEARCH GROUNDING) ---
app.post(['/api/contacts/google-lookup', '/api/emails/contacts/google-lookup', '/api/ai/google-contact-lookup'], requireAuth, async (req, res) => {
    try {
        const { query, location, type, context } = req.body;
        if (!query && !location) {
            return res.status(400).json({ error: "Suchbegriff oder Ort erforderlich." });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: "GEMINI_API_KEY ist serverseitig nicht konfiguriert." });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const searchModels = ["gemini-3.8-flash", "gemini-3.5-flash", "gemini-flash-latest", "gemini-3.5-flash-lite"];

        const prompt = `Du bist ein Disponent und Daten-Assistent für ein deutsches Dienstleistungsunternehmen.
Führe über Google Search eine gezielte Websuche durch, um reale und aktuelle Kontaktdaten für den folgenden Suchauftrag zu ermitteln.

Suchbegriff / Name: "${query || ''}"
Ort / Region: "${location || ''}"
Typ der Anfrage: "${type || 'allgemein'}" (z.B. Arzt, Praxis, Krankenhaus, Pflegeheim, Behörde, Adresse)
Zusätzlicher Text-Kontext: "${context || ''}"

Ermittle die offizielle Anschrift (Straße, Hausnummer, PLZ, Ort), Telefonnummer, E-Mail-Adresse und Webseite.
Falls es sich um eine Person / einen Arzt handelt: Trenne Vorname und Nachname sauber und bestimme die Anrede ("Herr" oder "Frau").
Falls es sich um eine Praxis, Klinik, Behörde oder ein Unternehmen handelt: Fülle "company_name" mit dem offiziellen Namen aus.
Gib bis zu 3 relevante Treffer zurück.

Antworte AUSSCHLIESSLICH mit einem validen JSON-Objekt (kein Markdown-Präfix, keine Erklärungen):
{
  "results": [
    {
      "company_name": "Offizieller Praxis-, Firmen- oder Einrichtungsname",
      "name_first": "Vorname (falls Person/Arzt)",
      "name_last": "Nachname (falls Person/Arzt)",
      "salutation": "Herr, Frau oder Keine Angabe",
      "street": "Straße ohne Hausnummer",
      "housenr": "Hausnummer",
      "zip": "Postleitzahl",
      "city": "Stadt",
      "phone": "Telefonnummer",
      "email": "E-Mail-Adresse",
      "website": "Webseite",
      "category": "Arzt / Praxis / Klinik / Dienstleister / Sonstiges",
      "description": "Kurzbeschreibung (z.B. Fachrichtung oder Standort)"
    }
  ]
}`;

        let text = '';
        // 1. Zuerst mit Search Tool versuchen
        for (const modelName of searchModels) {
            try {
                const model = genAI.getGenerativeModel({
                    model: modelName,
                    tools: [{ googleSearch: {} }]
                });
                const result = await model.generateContent(prompt);
                text = result.response.text();
                if (text) break;
            } catch (searchErr) {
                console.warn(`[Google Contact Lookup] Search Tool auf ${modelName} nicht verfügbar (${searchErr.status || searchErr.message}). Versuche nächstes...`);
            }
        }

        // 2. Fallback: Falls Search-Tool Quota erschöpft ist, über KI-Wissen im JSON-Modus abfragen
        if (!text) {
            console.log("[Google Contact Lookup] Verwende Fallback über KI-Wissensdatenbank (ohne Search-Tool)...");
            for (const modelName of searchModels) {
                try {
                    const model = genAI.getGenerativeModel({
                        model: modelName,
                        generationConfig: { responseMimeType: "application/json" }
                    });
                    const result = await model.generateContent(prompt);
                    text = result.response.text();
                    if (text) break;
                } catch (fallbackErr) {
                    console.warn(`[Google Contact Lookup] Fallback auf ${modelName} fehlgeschlagen:`, fallbackErr.status || fallbackErr.message);
                }
            }
        }

        if (!text) {
            return res.json({ success: true, results: [] });
        }

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            return res.json({ success: true, results: [] });
        }
        const parsed = JSON.parse(jsonMatch[0]);
        res.json({ success: true, results: parsed.results || [] });
    } catch (err) {
        console.error("[Google Contact Lookup] Fehler:", err);
        res.status(500).json({ error: "Fehler bei der Google-Kontaktermittlung: " + err.message });
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

// --- GOOGLE ROUTES API PROXY ---
// Berechnet Fahrtzeit und Distanz zwischen zwei Adressen via Google Routes API (computeRoutes)
const routesCache = new Map();

app.get(['/api/vma/config', '/api/emails/vma/config'], requireAuth, (req, res) => {
    const googleKey = process.env.GOOGLE_ROUTES_API_KEY || process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_API_KEY || '';
    res.json({
        success: true,
        provider: googleKey ? 'google_routes' : (process.env.TRAVELTIME_API_KEY ? 'traveltime' : 'none'),
        hasGoogleKey: !!googleKey,
        cacheEntries: routesCache.size
    });
});

app.post([
    '/api/vma/duration',
    '/api/emails/vma/duration',
    '/api/google-routes/compute',
    '/api/emails/google-routes/compute',
    '/api/emails/traveltime/duration', 
    '/api/traveltime/duration', 
    '/portal/traveltime/duration',
    '/api/emails/portal/traveltime/duration'
], requireAuth, async (req, res) => {
    try {
        const { origin, destination } = req.body;
        if (!origin || !destination) {
            return res.status(400).json({ error: "Start- und Zieladresse sind erforderlich." });
        }

        const cleanOrigin = origin.trim();
        const cleanDest = destination.trim();
        const cacheKey = `${cleanOrigin.toLowerCase()}|${cleanDest.toLowerCase()}`;

        if (routesCache.has(cacheKey)) {
            return res.json({
                success: true,
                ...routesCache.get(cacheKey),
                cached: true
            });
        }

        const googleApiKey = process.env.GOOGLE_ROUTES_API_KEY || process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_API_KEY;

        // 1. BEVORZUGT: Google Routes API (v2 computeRoutes)
        if (googleApiKey) {
            try {
                const googleResponse = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Goog-Api-Key': googleApiKey,
                        'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.description'
                    },
                    body: JSON.stringify({
                        origin: { address: cleanOrigin },
                        destination: { address: cleanDest },
                        travelMode: "DRIVE",
                        routingPreference: "TRAFFIC_AWARE",
                        languageCode: "de"
                    })
                });

                if (googleResponse.ok) {
                    const googleData = await googleResponse.json();
                    if (googleData.routes && googleData.routes.length > 0) {
                        const route = googleData.routes[0];
                        const durationSec = parseInt((route.duration || '0s').replace('s', ''), 10) || 0;
                        const durationMin = Math.ceil(durationSec / 60);
                        const distanceKm = Math.round(((route.distanceMeters || 0) / 1000) * 10) / 10;

                        const result = {
                            duration: durationMin,
                            distance: distanceKm,
                            provider: 'google_routes'
                        };
                        routesCache.set(cacheKey, result);
                        return res.json({ success: true, ...result });
                    }
                } else {
                    const errBody = await googleResponse.text().catch(() => '');
                    console.warn(`[Google Routes API] ${googleResponse.status}:`, errBody);
                }
            } catch (gErr) {
                console.error("[Google Routes API] Fehler:", gErr);
            }
        }

        // 2. FALLBACK: TravelTime API falls noch konfiguriert
        const appId = process.env.TRAVELTIME_APP_ID || 'c7ac9a66';
        const apiKey = process.env.TRAVELTIME_API_KEY;

        if (apiKey) {
            try {
                const geocode = async (address) => {
                    const response = await fetch(`https://api.traveltimeapp.com/v4/geocoding/search?query=${encodeURIComponent(address)}`, {
                        method: 'GET',
                        headers: {
                            'X-Application-Id': appId,
                            'X-Api-Key': apiKey,
                            'Accept': 'application/json',
                            'Accept-Language': 'de-DE'
                        }
                    });
                    const data = await response.json();
                    if (!response.ok) return null;
                    return data.features?.[0]?.geometry?.coordinates;
                };

                const originCoords = await geocode(cleanOrigin);
                const destCoords = await geocode(cleanDest);

                if (originCoords && destCoords) {
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
                        const out = {
                            duration: Math.ceil(result.travel_time / 60),
                            distance: Math.round((result.distance / 1000) * 10) / 10,
                            provider: 'traveltime_fallback'
                        };
                        routesCache.set(cacheKey, out);
                        return res.json({ success: true, ...out });
                    }
                }
            } catch (ttErr) {
                console.error("[TravelTime Fallback] Fehler:", ttErr);
            }
        }

        // 3. Plausibler Standardwert für OrgaFlow-Einsatzorte (30 Min, 15 km), um Blockaden der Abrechnung zu verhindern
        const fallback = {
            duration: 30,
            distance: 15,
            provider: 'standard_estimate'
        };
        routesCache.set(cacheKey, fallback);
        return res.json({
            success: true,
            ...fallback,
            notice: "Hinweis: Keine Routen-API konfiguriert oder Adresse nicht auflösbar. Geschätzter Wert hinterlegt."
        });

    } catch (error) {
        console.error("[Routes Proxy] Unerwarteter Fehler:", error);
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
        const { userId, title, body, url } = req.body || {};
        
        if (!userId || !title) return res.status(400).json({ success: false, error: "Fehlende Parameter." });
        if (!process.env.VAPID_PUBLIC_KEY) return res.json({ success: false, error: "VAPID Keys fehlen auf dem Server." });

        const pbAdmin = await getAdminPb();
        
        let targetUser;
        try { targetUser = await pbAdmin.collection('_superusers').getOne(userId, { requestKey: null }); } catch (e) {}
        if (!targetUser) {
            try { targetUser = await pbAdmin.collection('users').getOne(userId, { requestKey: null }); } catch (e) {}
        }

        if (!targetUser || !targetUser.push_subscriptions) {
            return res.json({ success: false, error: "Keine Abonnements gefunden." });
        }

        let subs = targetUser.push_subscriptions;
        if (typeof subs === 'string') { try { subs = JSON.parse(subs); } catch(e){} }
        if (!Array.isArray(subs) || subs.length === 0) {
            return res.json({ success: false, error: "Keine aktiven Abonnements hinterlegt." });
        }

        const payload = JSON.stringify({ title, body, url: url || '/' });

        // Asynchrone Ausführung mit striktem Promise.race Timeout-Schutz (max. 3500 ms)
        const executePush = async () => {
            const pushResults = [];
            const deadEndpoints = new Set();
            for (const sub of subs) {
                if (!sub || !sub.endpoint) continue;
                try {
                    await sendPushWithTimeout(sub, payload, {}, 3500);
                    pushResults.push({ status: "success" });
                } catch (e) {
                    console.error('[PUSH] Apple/Google Fehler:', e.statusCode || e.name, e.body || e.message);
                    pushResults.push({ status: "error", error: e.body || e.message });
                    if (isDeadSubscription(e)) {
                        deadEndpoints.add(sub.endpoint);
                    }
                }
            }

            if (deadEndpoints.size > 0) {
                try {
                    const col = targetUser.collectionName || (targetUser.role ? 'users' : '_superusers');
                    await cleanupDeadPushSubscriptions(pbAdmin, col, targetUser.id, deadEndpoints);
                } catch (cleanUpErr) {
                    console.warn('[PUSH] Cleanup Error:', cleanUpErr.message);
                }
            }
            return { success: true, pushResults };
        };

        const timeoutRace = new Promise((resolve) => {
            setTimeout(() => {
                resolve({ 
                    success: true, 
                    queued: true, 
                    message: "Push-Versand wird im Hintergrund weitergeführt (Timeout-Schutz aktiv)." 
                });
            }, 3500);
        });

        const result = await Promise.race([executePush(), timeoutRace]);
        return res.json(result);
    } catch (error) {
        console.error("[PUSH] Fehler abgefangen:", error);
        // Fehlertoleranz: Niemals 500 werfen, UI darf nicht blockieren
        return res.json({ success: false, error: error.message || "Fehler beim Senden der Push-Benachrichtigung." });
    }
});

// =========================================================================
// 📅 GOOGLE KALENDER OAUTH & LIVE-SYNCHRONISATION ROUTEN
// =========================================================================

// 1. Google OAuth Auth-URL anfordern
app.get(['/api/google-calendar/auth-url', '/api/emails/google-calendar/auth-url'], requireAuth, async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: 'Nicht authentifiziert.' });

        const pbAdmin = await getAdminPb();
        const redirectOverride = req.query.redirect_uri ? String(req.query.redirect_uri) : null;
        const url = await generateAuthUrl(userId, redirectOverride, pbAdmin);

        res.json({ success: true, url });
    } catch (err) {
        console.error('[Google Calendar] Fehler beim Erstellen der Auth-URL:', err);
        res.status(400).json({ error: err.message || 'Fehler beim Erstellen der Auth-URL.' });
    }
});

// 2. Google OAuth Callback (von Google nach Login aufgerufen)
app.get(['/api/google-calendar/callback', '/api/emails/google-calendar/callback'], async (req, res) => {
    const { code, state, error } = req.query;

    if (error) {
        console.warn('[Google Calendar] OAuth-Fehler vom Benutzer abgebrochen:', error);
        return res.status(400).send(`
            <!DOCTYPE html>
            <html>
            <head><meta charset="utf-8"><title>Abgebrochen</title><style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f8fafc;color:#1e293b;}.box{background:white;padding:2rem;border-radius:1rem;border:1px solid #e2e8f0;text-align:center;max-width:400px;}</style></head>
            <body>
                <div class="box">
                    <h2>⚠️ Verbindung abgebrochen</h2>
                    <p>${error}</p>
                    <script>if(window.opener){window.opener.postMessage({type:'GOOGLE_CALENDAR_ERROR',error:'${error}'},'*');setTimeout(()=>window.close(),1500);}</script>
                </div>
            </body>
            </html>
        `);
    }

    if (!code || !state) {
        return res.status(400).send('Fehlende OAuth-Parameter (Code oder State fehlt).');
    }

    try {
        const pbAdmin = await getAdminPb();
        const result = await handleOAuthCallback(String(code), String(state), pbAdmin);

        return res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>Google Kalender verknüpft</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f8fafc; color: #1e293b; }
                    .card { background: white; padding: 2.5rem; border-radius: 1.5rem; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.07); text-align: center; max-width: 440px; border: 1px solid #e2e8f0; }
                    .icon { font-size: 3rem; margin-bottom: 1rem; }
                    h1 { font-size: 1.25rem; font-weight: 800; margin: 0 0 0.5rem; color: #0f172a; }
                    p { font-size: 0.875rem; color: #64748b; margin: 0 0 1rem; line-height: 1.5; }
                    .email { font-weight: 700; color: #4338ca; }
                </style>
            </head>
            <body>
                <div class="card">
                    <div class="icon">✅</div>
                    <h1>Google Kalender verbunden!</h1>
                    <p>Erfolgreich verknüpft mit <br><span class="email">${result.googleEmail || 'Ihrem Google-Konto'}</span>.<br><br>Dieses Fenster schließt sich automatisch...</p>
                </div>
                <script>
                    if (window.opener) {
                        window.opener.postMessage({ type: 'GOOGLE_CALENDAR_CONNECTED', email: '${result.googleEmail}' }, '*');
                        setTimeout(() => window.close(), 1200);
                    } else {
                        setTimeout(() => { window.location.href = '/appointments?google_success=1'; }, 1500);
                    }
                </script>
            </body>
            </html>
        `);
    } catch (err) {
        console.error('[Google Calendar] Callback Fehler:', err);
        return res.status(500).send(`
            <!DOCTYPE html>
            <html>
            <head><meta charset="utf-8"><title>Fehler</title><style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f8fafc;color:#1e293b;}.box{background:white;padding:2rem;border-radius:1rem;border:1px solid #fecdd3;text-align:center;max-width:400px;}</style></head>
            <body>
                <div class="box">
                    <h2>❌ Fehler bei der Verknüpfung</h2>
                    <p>${err.message}</p>
                    <script>if(window.opener){window.opener.postMessage({type:'GOOGLE_CALENDAR_ERROR',error:'${err.message}'},'*');setTimeout(()=>window.close(),3000);}</script>
                </div>
            </body>
            </html>
        `);
    }
});

// 3. Status der Google-Kalender-Verknüpfung abfragen
app.get(['/api/google-calendar/status', '/api/emails/google-calendar/status'], requireAuth, async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: 'Nicht authentifiziert.' });

        const pbAdmin = await getAdminPb();
        const creds = await getGoogleCredentials(userId, pbAdmin);
        const hasCredentials = Boolean(creds.clientId && creds.clientSecret);

        let config = null;
        try {
            config = await pbAdmin.collection('user_calendar_configs').getFirstListItem(`user = "${userId}"`);
        } catch (e) {}

        const isConnected = Boolean(config && config.access_token && config.sync_enabled !== false);

        res.json({
            success: true,
            hasCredentials,
            connected: isConnected,
            googleEmail: config?.google_email || '',
            calendarId: config?.calendar_id || 'primary',
            syncEnabled: config?.sync_enabled ?? false,
            lastSync: config?.last_sync || null
        });
    } catch (err) {
        console.error('[Google Calendar] Status-Fehler:', err);
        res.status(500).json({ error: err.message || 'Fehler beim Abrufen des Status.' });
    }
});

// 4. Manuelle Komplett-Synchronisation aller anstehenden Termine
app.post(['/api/google-calendar/sync-all', '/api/emails/google-calendar/sync-all'], requireAuth, async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: 'Nicht authentifiziert.' });

        const pbAdmin = await getAdminPb();
        const stats = await syncAllUpcomingAppointments(userId, pbAdmin);

        res.json({ success: true, ...stats });
    } catch (err) {
        console.error('[Google Calendar] Sync-All Fehler:', err);
        res.status(500).json({ error: err.message || 'Fehler beim Synchronisieren aller Termine.' });
    }
});

// 5. Einzelnen Termin synchronisieren (Create, Update oder Delete)
app.post(['/api/google-calendar/sync-appointment', '/api/emails/google-calendar/sync-appointment'], requireAuth, async (req, res) => {
    const { appointmentId, action, googleEventId } = req.body;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Nicht authentifiziert.' });

    try {
        const pbAdmin = await getAdminPb();

        if (action === 'delete') {
            if (googleEventId) {
                await deleteAppointmentFromGoogle(googleEventId, userId, pbAdmin);
            }
            return res.json({ success: true, deleted: true });
        }

        if (!appointmentId) return res.status(400).json({ error: 'appointmentId fehlt.' });

        const event = await syncAppointmentToGoogle(appointmentId, userId, pbAdmin);
        res.json({ success: true, event });
    } catch (err) {
        console.error('[Google Calendar] Sync-Appointment Fehler:', err);
        res.status(500).json({ error: err.message || 'Fehler beim Termin-Sync.' });
    }
});

// 6. Google-Verknüpfung trennen
app.post(['/api/google-calendar/disconnect', '/api/emails/google-calendar/disconnect'], requireAuth, async (req, res) => {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Nicht authentifiziert.' });

    try {
        const pbAdmin = await getAdminPb();
        const result = await disconnectGoogleCalendar(userId, pbAdmin);
        res.json(result);
    } catch (err) {
        console.error('[Google Calendar] Disconnect Fehler:', err);
        res.status(500).json({ error: err.message || 'Fehler beim Trennen.' });
    }
});

// 7. Externe Google-Kalender Termine abrufen (Nur-Lese-Ansicht)
app.get(['/api/google-calendar/events', '/api/emails/google-calendar/events'], requireAuth, async (req, res) => {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Nicht authentifiziert.' });

    try {
        const { timeMin, timeMax } = req.query;
        const pbAdmin = await getAdminPb();
        const events = await fetchExternalGoogleEvents(userId, pbAdmin, timeMin, timeMax);
        res.json({ success: true, events });
    } catch (err) {
        console.error('[Google Calendar] Fehler bei /events:', err);
        res.status(500).json({ error: err.message || 'Fehler beim Laden der Google-Termine.' });
    }
});

// 7. Google API Credentials speichern (via UI Modal)
app.post(['/api/google-calendar/config', '/api/emails/google-calendar/config'], requireAuth, async (req, res) => {
    const { clientId, clientSecret, syncEnabled } = req.body;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Nicht authentifiziert.' });

    try {
        const pbAdmin = await getAdminPb();
        let config = null;
        try {
            config = await pbAdmin.collection('user_calendar_configs').getFirstListItem(`user = "${userId}"`);
        } catch (e) {}

        const updateData = {};
        if (clientId !== undefined) updateData.client_id = clientId.trim();
        if (clientSecret !== undefined) updateData.client_secret = clientSecret.trim();
        if (syncEnabled !== undefined) updateData.sync_enabled = Boolean(syncEnabled);

        if (config) {
            await pbAdmin.collection('user_calendar_configs').update(config.id, updateData);
        } else {
            await pbAdmin.collection('user_calendar_configs').create({
                user: userId,
                calendar_id: 'primary',
                ...updateData
            });
        }

        res.json({ success: true });
    } catch (err) {
        console.error('[Google Calendar] Config Save Fehler:', err);
        res.status(500).json({ error: err.message || 'Fehler beim Speichern der Konfiguration.' });
    }
});

// --- ALLGEMEINER E-MAIL-VERSAND (RECHNUNGEN, ERINNERUNGEN, NACHRICHTEN) ---
// Unterstützt Google Mail OAuth2 (direkt über den verknüpften Gmail-Account)
// mit automatischem Fallback auf Firmen-SMTP / .env SMTP
app.post(['/api/emails/send', '/api/send'], requireAuth, async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: 'Nicht authentifiziert.' });

        const { to, cc, bcc, subject, text, html, attachments, fromName } = req.body;
        if (!to || !subject) {
            return res.status(400).json({ error: 'Empfänger (to) und Betreff (subject) sind erforderlich.' });
        }

        const pbAdmin = await getAdminPb();

        // 1. Prüfen, ob Google OAuth2 für diesen User aktiv ist
        let googleConfig = null;
        try {
            googleConfig = await pbAdmin.collection('user_calendar_configs').getFirstListItem(`user = "${userId}"`);
        } catch (e) {}

        let lastGmailError = null;
        if (googleConfig && googleConfig.sync_enabled && googleConfig.refresh_token) {
            try {
                console.log(`[EMAIL SEND] Sende E-Mail via Google Mail OAuth2 für User ${userId} (${googleConfig.google_email})...`);
                const result = await sendEmailViaGmailOAuth2({
                    userId,
                    to,
                    cc,
                    bcc,
                    subject,
                    text,
                    html,
                    attachments,
                    pbAdmin,
                    fromName: fromName || process.env.SMTP_FROM_NAME || 'Ihre Seniorenassistenz'
                });

                console.log(`[EMAIL SEND] E-Mail erfolgreich via Gmail gesendet! Message-ID: ${result.messageId}`);

                // Archivierung in mailbox_messages
                try {
                    await pbAdmin.collection('mailbox_messages').create({
                        folder: "Sent",
                        message_id: result.messageId || `sent-gmail-${Date.now()}`,
                        subject: subject,
                        from_address: result.from || googleConfig.google_email,
                        to_address: to,
                        date: new Date().toISOString(),
                        body_text: text || '',
                        body_html: html || '',
                        is_read: true,
                        send_by: userId,
                        user: userId
                    });
                } catch (archErr) {
                    console.warn('[EMAIL SEND] Archivierung in mailbox_messages fehlgeschlagen:', archErr.message);
                }

                return res.json({ success: true, messageId: result.messageId, provider: 'gmail' });
            } catch (gmailErr) {
                lastGmailError = gmailErr.message;
                console.warn(`[EMAIL SEND] Gmail OAuth2 fehlgeschlagen (${gmailErr.message}). Versuche SMTP-Fallback...`);
            }
        }

        // 2. Fallback auf Firmen-SMTP oder .env SMTP
        let smtpUser = process.env.SMTP_USER;
        let smtpPass = process.env.SMTP_PASS;
        let smtpHost = process.env.SMTP_HOST || 'smtp.strato.de';
        let smtpPort = parseInt(process.env.SMTP_PORT) || 465;

        try {
            const userRecord = await pbAdmin.collection('users').getOne(userId);
            const userCompany = Array.isArray(userRecord.company) ? userRecord.company[0] : userRecord.company;
            if (userCompany) {
                const configs = await pbAdmin.collection('userMailConfigs').getFullList({ filter: `company = "${userCompany}"`, requestKey: null });
                if (configs.length > 0 && configs[0].smtp_user) {
                    smtpUser = configs[0].smtp_user;
                    smtpPass = configs[0].smtp_password;
                    smtpHost = configs[0].smtp_host || smtpHost;
                    smtpPort = parseInt(configs[0].smtp_port) || smtpPort;
                }
            }
        } catch (e) {}

        if (!smtpUser || !smtpPass) {
            return res.status(400).json({
                error: 'Weder Google Mail noch ein SMTP-Server ist konfiguriert. Bitte verknüpfen Sie Ihr Google-Konto im Kalender oder hinterlegen Sie SMTP-Zugangsdaten in den Firmeneinstellungen.'
            });
        }

        console.log(`[EMAIL SEND] Sende E-Mail via SMTP (${smtpHost}:${smtpPort}) als ${smtpUser}...`);
        const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: smtpPort,
            secure: smtpPort === 465,
            auth: { user: smtpUser, pass: smtpPass }
        });

        const formattedAttachments = (attachments || []).map(att => ({
            filename: att.filename,
            content: att.content,
            encoding: att.encoding || 'base64'
        }));

        const senderDisplayName = fromName || process.env.SMTP_FROM_NAME || 'Ihre Seniorenassistenz';
        const info = await transporter.sendMail({
            from: `"${senderDisplayName}" <${smtpUser}>`,
            to,
            cc,
            bcc,
            subject,
            text,
            html,
            attachments: formattedAttachments
        });

        console.log(`[EMAIL SEND] E-Mail erfolgreich via SMTP gesendet! Message-ID: ${info.messageId}`);

        // Archivierung in mailbox_messages
        try {
            await pbAdmin.collection('mailbox_messages').create({
                folder: "Sent",
                message_id: info.messageId || `sent-smtp-${Date.now()}`,
                subject: subject,
                from_address: smtpUser,
                to_address: to,
                date: new Date().toISOString(),
                body_text: text || '',
                body_html: html || '',
                is_read: true,
                send_by: userId,
                user: userId
            });
        } catch (archErr) {
            console.warn('[EMAIL SEND] Archivierung in mailbox_messages fehlgeschlagen:', archErr.message);
        }

        return res.json({ success: true, messageId: info.messageId, provider: 'smtp' });

    } catch (err) {
        console.error('[EMAIL SEND] Fehler beim E-Mail-Versand:', err);
        if (lastGmailError && (lastGmailError.includes('insufficient authentication scopes') || lastGmailError.includes('scopes'))) {
            return res.status(403).json({
                error: 'Ihr Google-Konto hat noch keine E-Mail-Berechtigung: Bitte öffnen Sie im Kalender "Google Kalender & Mail", trennen Sie die Verbindung kurz und verbinden Sie sie neu, um den E-Mail-Versand freizugeben.'
            });
        }
        return res.status(500).json({ error: err.message || 'Fehler beim Senden der E-Mail.' });
    }
});

// --- E-MAIL INBOX ABFRAGEN (IMAP) ---
app.get(['/api/emails/inbox', '/api/inbox'], requireAuth, async (req, res) => {
    let client = null;
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: 'Nicht authentifiziert.' });

        const pbAdmin = await getAdminPb();
        let imapUser = null;
        let imapPass = null;
        let imapHost = process.env.IMAP_HOST || 'imap.ionos.de';
        let imapPort = parseInt(process.env.IMAP_PORT) || 993;

        try {
            const userRecord = await pbAdmin.collection('users').getOne(userId);
            const userCompany = Array.isArray(userRecord.company) ? userRecord.company[0] : userRecord.company;
            if (userCompany) {
                const configs = await pbAdmin.collection('userMailConfigs').getFullList({ filter: `company = "${userCompany}"`, requestKey: null });
                if (configs.length > 0) {
                    const cfg = configs[0];
                    imapUser = cfg.imap_user || cfg.smtp_user;
                    imapPass = cfg.imap_password || cfg.smtp_password;
                    imapHost = cfg.imap_host || imapHost;
                    imapPort = parseInt(cfg.imap_port) || imapPort;
                }
            }
        } catch (e) {}

        // Fallback auf .env
        if (!imapUser || !imapPass) {
            imapUser = process.env.IMAP_USER || process.env.EMAIL_USER || process.env.SMTP_USER;
            imapPass = process.env.IMAP_PASS || process.env.EMAIL_PASS || process.env.SMTP_PASSWORD || process.env.SMTP_PASS;
            imapHost = process.env.IMAP_HOST || imapHost;
            imapPort = parseInt(process.env.IMAP_PORT) || imapPort;
        }

        if (!imapUser || !imapPass) {
            console.log(`[EMAIL INBOX] Keine IMAP-Zugangsdaten konfiguriert für User ${userId}.`);
            return res.json({ success: true, data: [], message: 'Keine IMAP-Zugangsdaten hinterlegt.' });
        }

        console.log(`[EMAIL INBOX] Verbinde mit IMAP (${imapHost}:${imapPort}) für ${imapUser}...`);
        client = new ImapFlow({
            host: imapHost,
            port: imapPort,
            secure: imapPort === 993,
            auth: {
                user: imapUser,
                pass: imapPass
            },
            logger: false,
            emitLogs: false
        });

        try {
            await client.connect();
        } catch (connErr) {
            console.warn(`[EMAIL INBOX] IMAP-Verbindung fehlgeschlagen (${connErr.message}).`);
            return res.json({ success: true, data: [], warning: connErr.message });
        }

        const lock = await client.getMailboxLock('INBOX');
        const emails = [];

        try {
            const status = await client.status('INBOX', { messages: true });
            const total = status.messages || 0;

            if (total > 0) {
                const fromSeq = Math.max(1, total - 29);
                const range = `${fromSeq}:*`;

                for await (let message of client.fetch(range, { envelope: true, source: true, flags: true })) {
                    let parsed = null;
                    try {
                        if (message.source) {
                            parsed = await simpleParser(message.source);
                        }
                    } catch (pErr) {
                        console.warn('[IMAP] Mail parsing error für UID', message.uid, pErr.message);
                    }

                    const attachments = [];
                    if (parsed && Array.isArray(parsed.attachments)) {
                        for (const att of parsed.attachments) {
                            if (att.content && att.size < 5 * 1024 * 1024) {
                                attachments.push({
                                    filename: att.filename || 'anhang',
                                    content: att.content.toString('base64'),
                                    contentType: att.contentType || 'application/octet-stream'
                                });
                            }
                        }
                    }

                    emails.push({
                        uid: String(message.uid),
                        subject: parsed?.subject || message.envelope?.subject || '(Kein Betreff)',
                        from: parsed?.from?.text || message.envelope?.from?.[0]?.address || '',
                        to: parsed?.to?.text || message.envelope?.to?.[0]?.address || '',
                        date: parsed?.date ? parsed.date.toISOString() : (message.envelope?.date ? new Date(message.envelope.date).toISOString() : new Date().toISOString()),
                        text: parsed?.text || '',
                        html: parsed?.html || '',
                        is_read: message.flags ? message.flags.has('\\Seen') : false,
                        attachments
                    });
                }
            }
        } finally {
            lock.release();
            await client.logout().catch(() => {});
        }

        console.log(`[EMAIL INBOX] ${emails.length} E-Mails erfolgreich via IMAP geladen.`);
        return res.json({ success: true, data: emails });

    } catch (err) {
        console.error('[EMAIL INBOX] Unerwarteter Fehler:', err);
        if (client && client.usable) {
            await client.logout().catch(() => {});
        }
        return res.json({ success: true, data: [], error: err.message });
    }
});

// --- E-MAIL ALS GELESEN MARKIEREN ---
app.post(['/api/emails/mark-read', '/api/mark-read'], requireAuth, async (req, res) => {
    try {
        const { uid } = req.body || {};
        if (!uid) return res.status(400).json({ success: false, error: 'UID erforderlich' });

        const pbAdmin = await getAdminPb();
        try {
            const records = await pbAdmin.collection('mailbox_messages').getFullList({
                filter: `message_id = "${uid}"`,
                requestKey: null
            });
            for (const rec of records) {
                await pbAdmin.collection('mailbox_messages').update(rec.id, { is_read: true });
            }
        } catch (e) {}

        return res.json({ success: true });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

// --- DOKUMENTE & BRIEFE PDF-GENERIERUNG (DIN 5008, RECHNUNGEN, ARBEITSZEITNACHWEISE) ---
function sanitizePdfDocumentText(text) {
    if (!text) return '';
    return String(text)
        .replace(/[\u201C\u201D\u201E\u00AB\u00BB]/g, '"')
        .replace(/[\u2018\u2019\u201A\u2039\u203A]/g, "'")
        .replace(/[\u2013\u2014\u2015]/g, '-')
        .replace(/[\u2022\u25CF\u25AA\u25AB\u2023]/g, '-')
        .replace(/\u2026/g, '...')
        .replace(/\u00A0/g, ' ')
        .replace(/\u2192/g, '->')
        .replace(/[\u2713\u2714]/g, '[x]')
        .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDE4F]|\uD83D[\uDE80-\uDEFF]|\uD83E[\uDD00-\uDDFF]/g, '');
}

function cleanBase64DocumentImage(base64Str) {
    if (!base64Str) return null;
    try {
        const clean = base64Str.replace(/^data:image\/[a-zA-Z0-9+]+;base64,/, '').trim();
        if (!clean) return null;
        return Buffer.from(clean, 'base64');
    } catch (e) {
        console.warn("Fehler beim Konvertieren von Base64 zu Buffer:", e);
        return null;
    }
}

app.post(['/api/emails/generate-pdf', '/api/generate-pdf', '/generate-pdf'], async (req, res) => {
    try {
        const { templateJson, data, isTimesheet } = req.body || {};
        if (!templateJson) {
            return res.status(400).json({ error: "templateJson ist erforderlich." });
        }

        const fields = templateJson.fields || [];
        const tableField = fields.find(f => f.type === 'table');

        const pageHeight = templateJson.orientation === 'landscape' ? 794 : 1123;
        
        const headerThreshold = templateJson.marginTop ?? 250;
        const calculatedBottomMargin = templateJson.marginBottom ?? 150;
        const footerTop = pageHeight - calculatedBottomMargin;

        const doc = new PDFTableDocument({
            size: templateJson.orientation === 'landscape' ? [1123, 794] : [794, 1123],
            margins: { 
                top: Math.max(headerThreshold, 50), 
                left: tableField ? tableField.x : 50, 
                right: tableField ? Math.max((templateJson.orientation === 'landscape' ? 1123 : 794) - (tableField.x + tableField.w), 20) : 50, 
                bottom: calculatedBottomMargin 
            },
            autoFirstPage: true
        });

        const origFillColor = doc.fillColor.bind(doc);
        const origFont = doc.font.bind(doc);
        const origFontSize = doc.fontSize.bind(doc);

        let lastColor = null;
        let lastFont = null;
        let lastFontSize = null;

        doc.fillColor = function(...args) {
            if (args.length > 0) { lastColor = args; return origFillColor(...args); }
            return doc._fillColor;
        };

        doc.font = function(...args) {
            if (args.length > 0 && args[0] !== undefined) { lastFont = args; return origFont(args[0], args[1], args[2]); }
            return doc._font;
        };

        doc.fontSize = function(...args) {
            if (args.length > 0) { lastFontSize = args; return origFontSize(...args); }
            return doc._fontSize;
        };

        const buffers = [];
        doc.on('data', b => buffers.push(b));
        doc.on('end', () => {
            const pdfData = Buffer.concat(buffers);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'attachment; filename="dokument.pdf"');
            res.send(pdfData);
        });
        doc.on('error', (err) => {
            console.error('[PDF-GEN] Fehler:', err);
            if (!res.headersSent) res.status(500).json({ error: err.message });
        });

        const drawAbsoluteFields = (filterCondition) => {
            const origAddPage = doc.addPage.bind(doc);
            doc.addPage = (() => doc); 
            const prevX = doc.x;
            const prevY = doc.y;
            
            const prevColorArgs = lastColor;
            const prevFontArgs = lastFont;
            const prevFontSizeArgs = lastFontSize;

            for (const field of fields.filter(filterCondition)) {
                const relativeY = (field.y ?? 0) % pageHeight;

                if (field.type === 'text') {
                    const isBold = field.style?.fontWeight === 'bold';
                    doc.font(isBold ? 'Helvetica-Bold' : 'Helvetica');
                    
                    const textOptions = {
                        width: field.w,
                        align: field.style?.textAlign || 'left',
                        lineGap: 2
                    };
                    if (field.h) {
                        textOptions.height = field.h;
                    }
                    
                    doc.fontSize(field.style?.fontSize || 12);
                    doc.fillColor(field.style?.color || '#000000');
                    doc.text(sanitizePdfDocumentText(field.content || ''), field.x, relativeY, textOptions);
                       
                } else if (field.type === 'logo') {
                    const imgBuffer = cleanBase64DocumentImage(field.imageBase64 || data?.companyLogoBase64);
                    if (imgBuffer) {
                        try {
                            doc.image(imgBuffer, field.x, relativeY, {
                                fit: [field.w, field.h],
                                align: 'center',
                                valign: 'center'
                            });
                        } catch (e) {
                            console.warn("Konnte Bild nicht rendern", e);
                        }
                    }
                }
            }
            
            if (prevColorArgs) origFillColor.apply(doc, prevColorArgs);
            if (prevFontArgs) origFont.apply(doc, prevFontArgs);
            if (prevFontSizeArgs) origFontSize.apply(doc, prevFontSizeArgs);
            
            lastColor = prevColorArgs;
            lastFont = prevFontArgs;
            lastFontSize = prevFontSizeArgs;

            doc.x = prevX;
            doc.y = prevY;
            doc.addPage = origAddPage;
        };

        const headerFields = fields.filter(f => f.type !== 'table' && (f.y % pageHeight) < headerThreshold);
        const footerFields = fields.filter(f => f.type !== 'table' && (f.y % pageHeight) >= footerTop);
        const bodyFields = fields.filter(f => f.type !== 'table' && (f.y % pageHeight) >= headerThreshold && (f.y % pageHeight) < footerTop);

        doc.on('pageAdded', () => {
            drawAbsoluteFields(f => (headerFields.includes(f) || footerFields.includes(f)) && f.style?.repeatOnAllPages !== false);
        });

        drawAbsoluteFields(f => headerFields.includes(f) || footerFields.includes(f));

        const bodyFieldsBeforeTable = tableField ? bodyFields.filter(f => f.y < tableField.y) : bodyFields;
        const bodyFieldsAfterTable = tableField ? bodyFields.filter(f => f.y >= tableField.y) : [];

        const drawBodyFields = (fieldsToRender, isAfterTable = false) => {
            if (fieldsToRender.length === 0) return;

            const sortedBodyFields = [...fieldsToRender].sort((a, b) => {
                if (Math.abs(a.y - b.y) < 10) return a.x - b.x;
                return a.y - b.y;
            });

            let cursorY = doc.y > headerThreshold ? doc.y + 30 : headerThreshold;
            let currentBlockCanvasY = sortedBodyFields[0].y;
            if (!isAfterTable && currentBlockCanvasY > cursorY) {
                cursorY = currentBlockCanvasY;
            }
            let currentBlockPdfY = cursorY;
            let maxCanvasBottomSoFar = sortedBodyFields[0].y;
            let maxDocYForCurrentLine = cursorY;
            let currentMaxPage = doc.page;

            for (const field of sortedBodyFields) {
                const canvasGapToBottom = field.y - maxCanvasBottomSoFar;
                
                if (canvasGapToBottom >= 0) {
                    if (field !== sortedBodyFields[0]) {
                        cursorY = maxDocYForCurrentLine + canvasGapToBottom;
                        currentBlockCanvasY = field.y;
                        currentBlockPdfY = cursorY;
                    }
                } else {
                    cursorY = currentBlockPdfY + (field.y - currentBlockCanvasY);
                }
                
                maxCanvasBottomSoFar = Math.max(maxCanvasBottomSoFar, field.y + (field.h || 50));

                const isDynamicText = field.type === 'text' && field.style?.dynamicHeight;
                const needsPageBreak = isDynamicText 
                    ? cursorY > (pageHeight - calculatedBottomMargin) 
                    : cursorY + (field.h || 50) > (pageHeight - calculatedBottomMargin);

                if (needsPageBreak) {
                    doc.addPage();
                    cursorY = doc.page.margins.top;
                    currentBlockPdfY = cursorY - (field.y - currentBlockCanvasY);
                    maxDocYForCurrentLine = cursorY;
                    currentMaxPage = doc.page;
                }

                if (field.type === 'text') {
                    const isBold = field.style?.fontWeight === 'bold';
                    doc.font(isBold ? 'Helvetica-Bold' : 'Helvetica')
                       .fontSize(field.style?.fontSize || 12)
                       .fillColor(field.style?.color || '#000000');
                       
                    const textOpts = { width: field.w, align: field.style?.textAlign || 'left', lineGap: 2 };
                    if (field.h && !field.style?.dynamicHeight) textOpts.height = field.h;

                    doc.text(sanitizePdfDocumentText(field.content || ''), field.x, cursorY, textOpts);
                    
                    if (doc.page !== currentMaxPage) {
                        currentMaxPage = doc.page;
                        maxDocYForCurrentLine = doc.y;
                    } else {
                        maxDocYForCurrentLine = Math.max(maxDocYForCurrentLine, doc.y);
                    }
                } else if (field.type === 'logo') {
                    const imgBuffer = cleanBase64DocumentImage(field.imageBase64 || data?.companyLogoBase64);
                    if (imgBuffer) {
                        try {
                            doc.image(imgBuffer, field.x, cursorY, { fit: [field.w, field.h], align: 'center', valign: 'center' });
                            if (doc.page !== currentMaxPage) {
                                currentMaxPage = doc.page;
                                maxDocYForCurrentLine = doc.y;
                            } else {
                                maxDocYForCurrentLine = Math.max(maxDocYForCurrentLine, cursorY + field.h);
                            }
                        } catch (e) {
                            console.warn("Konnte Bild in bodyFields nicht rendern", e);
                        }
                    }
                }
            }
            
            doc.y = maxDocYForCurrentLine;
        };

        if (tableField) {
            drawBodyFields(bodyFieldsBeforeTable, false);

            const tableConf = tableField.tableConfig || {};
            const columns = Array.isArray(tableConf.columns) ? tableConf.columns : [];
            const positions = isTimesheet ? data?.timesheetPositions : data?.invoicePositions;
            
            if (positions && positions.length > 0 && columns.length > 0) {
                const tableData = {
                    headers: columns.map(c => ({
                        label: sanitizePdfDocumentText(c.name || ''),
                        property: c.type,
                        width: ((Number(c.width) || 10) / 100) * tableField.w,
                        renderer: null,
                        align: c.align || 'left'
                    })),
                    datas: positions.map((pos, idx) => {
                        let row = {};
                        for (const col of columns) {
                            if (col.type === 'total') {
                                row[col.type] = (Number(pos.total) || 0).toLocaleString('de-DE', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' €';
                            } else if (col.type === 'price') {
                                row[col.type] = sanitizePdfDocumentText(String(pos.price || ''));
                            } else if (col.type === 'duration') {
                                row[col.type] = sanitizePdfDocumentText(String(pos.duration || ''));
                            } else if (col.type === 'date') {
                                row[col.type] = sanitizePdfDocumentText(String(pos.date || ''));
                            } else if (col.type === 'pos') {
                                row[col.type] = String(pos.pos ?? (idx + 1));
                            } else if (col.type === 'title') {
                                row[col.type] = sanitizePdfDocumentText(String(pos.title || ''));
                            } else {
                                row[col.type] = sanitizePdfDocumentText(String(pos[col.type] ?? ''));
                            }
                        }
                        return row;
                    }),
                };

                const startY = Math.max(tableField.y, doc.y > headerThreshold ? doc.y + 20 : doc.y);
                doc.x = tableField.x;
                doc.y = startY;

                doc.strokeColor(tableConf.borderColor || '#cbd5e1').lineWidth(tableConf.borderWidth || 1);

                doc.table(tableData, {
                    prepareHeader: () => doc.font('Helvetica-Bold').fontSize(tableConf.fontSize || 10).fillColor(tableConf.headerTextColor || '#000000'),
                    prepareRow: () => doc.font('Helvetica').fontSize(tableConf.fontSize || 10).fillColor(tableField.style?.color || '#000000'),
                    width: tableField.w,
                    x: tableField.x,
                    padding: tableConf.cellPadding || 5,
                    columnSpacing: 5,
                    hideHeader: !tableConf.showHeaders,
                    divider: { 
                        header: { disabled: !(tableConf.showBorderHeader ?? true), width: tableConf.borderWidth || 1, opacity: 1 }, 
                        horizontal: { disabled: !(tableConf.showBorderRows ?? true), width: (tableConf.borderWidth || 1) * 0.5, opacity: 1 } 
                    }
                }).then(() => {
                    let currentY = doc.y;
                    
                    if (!isTimesheet && (tableConf.includeTotalNetto !== false || tableConf.includeTotalTax !== false || tableConf.includeTotalBrutto !== false)) {
                        if (currentY + 75 > (pageHeight - calculatedBottomMargin)) {
                            doc.addPage();
                            currentY = doc.page.margins.top;
                        }

                        currentY += 15;
                        const fWidth = tableConf.footerWidth || 200;
                        const footerX = tableField.x + tableField.w - fWidth;
                        
                        doc.moveTo(footerX, currentY - 5)
                           .lineTo(tableField.x + tableField.w, currentY - 5)
                           .strokeColor(tableConf.borderColor || '#cbd5e1')
                           .lineWidth(tableConf.borderWidth || 1)
                           .stroke();

                        doc.fontSize(tableConf.fontSize || 10).fillColor(tableField.style?.color || '#000000');
                        
                        const alignLabel = tableConf.footerTextAlign === 'left' ? 'left' : (tableConf.footerTextAlign === 'center' ? 'center' : 'left');
                        const alignValue = tableConf.footerTextAlign === 'left' ? 'right' : (tableConf.footerTextAlign === 'center' ? 'center' : 'right');
                        
                        if (tableConf.includeTotalNetto !== false) {
                            doc.text('Netto:', footerX, currentY, { width: fWidth / 2, align: alignLabel });
                            doc.text((data?.netto || 0).toLocaleString('de-DE', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' €', footerX + fWidth / 2, currentY, { width: fWidth / 2, align: alignValue });
                            currentY += 15;
                        }
                        if (tableConf.includeTotalTax !== false) {
                            doc.text(`MwSt (${data?.taxRate || 0}%):`, footerX, currentY, { width: fWidth / 2, align: alignLabel });
                            doc.text((data?.tax_sum || 0).toLocaleString('de-DE', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' €', footerX + fWidth / 2, currentY, { width: fWidth / 2, align: alignValue });
                            currentY += 15;
                        }
                        if (tableConf.includeTotalBrutto !== false) {
                            doc.font('Helvetica-Bold');
                            doc.text('Gesamt:', footerX, currentY, { width: fWidth / 2, align: alignLabel });
                            doc.text((data?.brutto || 0).toLocaleString('de-DE', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' €', footerX + fWidth / 2, currentY, { width: fWidth / 2, align: alignValue });
                            doc.font('Helvetica');
                            currentY += 15;
                        }
                    }

                    doc.y = currentY;
                    drawBodyFields(bodyFieldsAfterTable, true);
                    doc.end();
                }).catch((err) => {
                    console.error("[PDF-GEN] Fehler beim Zeichnen der Tabelle:", err);
                    if (!res.headersSent) res.status(500).json({ error: err.message });
                });
            } else {
                drawBodyFields(bodyFieldsAfterTable, true);
                doc.end();
            }
        } else {
            drawBodyFields(bodyFieldsBeforeTable, false);
            doc.end();
        }
    } catch (err) {
        console.error("[PDF-GEN] Allgemeiner Fehler:", err);
        if (!res.headersSent) res.status(500).json({ error: err.message });
    }
});

// --- WERBEMITTEL PDF-GENERIERUNG (FLYER, PLAKAT, BEILEGER, INFOBLATT, GUTSCHEIN) ---
function sanitizeMarketingPdfText(text) {
    if (!text) return '';
    return String(text)
        .replace(/[\u201C\u201D\u201E\u00AB\u00BB]/g, '"')
        .replace(/[\u2018\u2019\u201A\u2039\u203A]/g, "'")
        .replace(/[\u2013\u2014\u2015]/g, '-')
        .replace(/[\u2022\u25CF\u25AA\u25AB\u2023]/g, '-')
        .replace(/\u2026/g, '...')
        .replace(/\u00A0/g, ' ')
        .replace(/\u2192/g, '->')
        .replace(/[\u2713\u2714]/g, '[x]')
        .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDE4F]|\uD83D[\uDE80-\uDEFF]|\uD83E[\uDD00-\uDDFF]/g, '');
}

function cleanBase64MarketingImage(base64Str) {
    if (!base64Str) return null;
    try {
        const clean = base64Str.replace(/^data:image\/[a-zA-Z0-9+]+;base64,/, '').trim();
        if (!clean) return null;
        return Buffer.from(clean, 'base64');
    } catch {
        return null;
    }
}

const MM_TO_PT = 2.83464567;

app.post(['/api/emails/generate-marketing-pdf', '/api/generate-marketing-pdf', '/generate-marketing-pdf'], async (req, res) => {
    try {
        const { format, formatData, sheets } = req.body || {};
        let doc;
        let filename = 'Werbemittel.pdf';

        if (format === 'flyer') {
            filename = 'Flyer-Seniorenassistenz-Wickelfalz.pdf';
            doc = new PDFDocument({
                size: [841.89, 595.28], // A4 Landscape
                margins: { top: 0, left: 0, right: 0, bottom: 0 },
                autoFirstPage: false
            });

            const sheetList = Array.isArray(sheets) && sheets.length > 0 ? sheets : [];

            for (let i = 0; i < sheetList.length; i++) {
                const sheet = sheetList[i];
                doc.addPage({
                    size: [841.89, 595.28],
                    margins: { top: 0, left: 0, right: 0, bottom: 0 }
                });

                const elements = [...(sheet.elements || [])].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

                for (const el of elements) {
                    const x = (el.x || 0) * MM_TO_PT;
                    const y = (el.y || 0) * MM_TO_PT;
                    const w = Math.max(1, (el.w || 10) * MM_TO_PT);
                    const r = Math.max(0, (el.borderRadius || 0) * MM_TO_PT);
                    const pad = Math.max(0, (el.padding || 0) * MM_TO_PT);
                    let h = (el.h > 0 ? el.h : 20) * MM_TO_PT;

                    if (el.type === 'text' && el.content) {
                        const isBold = el.fontWeight === 'bold' || el.fontWeight === '900';
                        doc.font(isBold ? 'Helvetica-Bold' : 'Helvetica');
                        doc.fontSize(el.fontSize || 10);
                        const textW = Math.max(10, w - 2 * pad);
                        const textHeight = doc.heightOfString(sanitizeMarketingPdfText(el.content), { width: textW, lineGap: 1.5 });
                        if (!el.h || el.h === 0) {
                            h = textHeight + 2 * pad;
                        }
                    }

                    if (el.bgColor && el.bgColor !== 'transparent') {
                        doc.save();
                        doc.fillColor(el.bgColor);
                        if (r > 0) doc.roundedRect(x, y, w, h, r).fill();
                        else doc.rect(x, y, w, h).fill();

                        if (el.borderWidth && el.borderWidth > 0 && el.borderColor) {
                            doc.lineWidth(el.borderWidth * MM_TO_PT);
                            doc.strokeColor(el.borderColor);
                            if (r > 0) doc.roundedRect(x, y, w, h, r).stroke();
                            else doc.rect(x, y, w, h).stroke();
                        }
                        doc.restore();
                    }

                    if (el.type === 'text' && el.content) {
                        doc.save();
                        const isBold = el.fontWeight === 'bold' || el.fontWeight === '900';
                        doc.font(isBold ? 'Helvetica-Bold' : 'Helvetica');
                        doc.fontSize(el.fontSize || 10);
                        doc.fillColor(el.color || '#000000');

                        const textX = x + pad;
                        const textY = y + pad;
                        const textW = Math.max(10, w - 2 * pad);

                        doc.text(sanitizeMarketingPdfText(el.content), textX, textY, {
                            width: textW,
                            align: el.textAlign || 'left',
                            lineGap: 1.5
                        });
                        doc.restore();
                    } else if (el.type === 'image') {
                        let imgBuffer = null;
                        if (el.content?.startsWith('data:image')) {
                            imgBuffer = cleanBase64MarketingImage(el.content);
                        } else if (el.content === '/favicon.png' || el.content?.includes('favicon.png')) {
                            const possiblePaths = [
                                path.resolve(__dirname, '../frontend/static/favicon.png'),
                                path.resolve(__dirname, '../backend/pb_public/favicon.png'),
                                path.resolve(__dirname, '../frontend/pb_public/favicon.png')
                            ];
                            for (const p of possiblePaths) {
                                if (fs.existsSync(p)) {
                                    try { imgBuffer = fs.readFileSync(p); break; } catch (e) {}
                                }
                            }
                        }
                        if (imgBuffer) {
                            try {
                                doc.image(imgBuffer, x, y, {
                                    fit: [w, h],
                                    align: el.textAlign === 'center' ? 'center' : (el.textAlign === 'right' ? 'right' : 'left'),
                                    valign: 'center'
                                });
                            } catch (e) {
                                console.warn("Konnte Flyer-Bild nicht rendern:", e);
                            }
                        }
                    }
                }
            }
        } else if (format === 'poster') {
            filename = 'Plakat-Aushang-A4.pdf';
            doc = new PDFDocument({
                size: 'A4',
                margins: { top: 40, left: 45, right: 45, bottom: 40 }
            });

            const pData = formatData?.poster || {};

            doc.save();
            doc.fillColor('#fef3c7');
            doc.roundedRect(170, 40, 255, 24, 12).fill();
            doc.font('Helvetica-Bold').fontSize(9).fillColor('#b45309');
            doc.text('OFFIZIELLE SENIORENASSISTENZ', 170, 47, { width: 255, align: 'center' });
            doc.restore();

            doc.font('Helvetica-Bold').fontSize(24).fillColor('#0f172a');
            doc.text(sanitizeMarketingPdfText(pData.headline || 'Gemeinsam statt einsam'), 45, 80, { width: 505, align: 'center', lineGap: 3 });

            doc.font('Helvetica').fontSize(13).fillColor('#475569');
            doc.text(sanitizeMarketingPdfText(pData.subheadline || 'Ihre vertrauensvolle Unterstützung im Alltag'), 45, 145, { width: 505, align: 'center' });

            doc.save();
            doc.strokeColor('#f59e0b').lineWidth(2);
            doc.moveTo(150, 185).lineTo(445, 185).stroke();
            doc.restore();

            doc.font('Helvetica-Bold').fontSize(11).fillColor('#64748b');
            doc.text('UNSERE LEISTUNGEN FÜR SIE:', 50, 205);

            let currentY = 225;
            const bullets = Array.isArray(pData.bulletpoints) ? pData.bulletpoints : [
                'Begleitung zu Arztterminen & Behörden',
                'Hilfe bei Anträgen & Papierkram',
                'Gemeinsame Spaziergänge & Alltagsfreude',
                'Entlastung für pflegende Angehörige'
            ];

            for (const bp of bullets) {
                doc.save();
                doc.fillColor('#f8fafc').strokeColor('#e2e8f0').lineWidth(1);
                doc.roundedRect(50, currentY, 495, 36, 8).fillAndStroke();

                doc.font('Helvetica-Bold').fontSize(11).fillColor('#059669');
                doc.text('[x]', 65, currentY + 11);

                doc.font('Helvetica-Bold').fontSize(11).fillColor('#1e293b');
                doc.text(sanitizeMarketingPdfText(bp), 90, currentY + 11, { width: 440 });
                doc.restore();
                currentY += 44;
            }

            currentY += 10;
            doc.save();
            doc.fillColor('#312e81');
            doc.roundedRect(50, currentY, 495, 80, 12).fill();

            doc.font('Helvetica-Bold').fontSize(9).fillColor('#a5b4fc');
            doc.text('PFLEGEKASSEN-VORTEIL', 50, currentY + 15, { width: 495, align: 'center' });

            doc.font('Helvetica-Bold').fontSize(14).fillColor('#ffffff');
            doc.text(sanitizeMarketingPdfText(pData.highlight_box || 'Bis zu 131 € monatlich über den Entlastungsbetrag ab Pflegegrad 1 erstattungsfähig!'), 70, currentY + 34, { width: 455, align: 'center', lineGap: 2 });
            doc.restore();

            currentY += 100;
            doc.save();
            doc.fillColor('#f8fafc').strokeColor('#cbd5e1').lineWidth(1.5);
            doc.roundedRect(50, currentY, 495, 110, 12).fillAndStroke();

            doc.font('Helvetica-Bold').fontSize(11).fillColor('#1e1b4b');
            doc.text('JETZT KOSTENFREIEN BERATUNGSTERMIN VEREINBAREN', 50, currentY + 14, { width: 495, align: 'center' });

            doc.font('Helvetica-Bold').fontSize(11).fillColor('#0f172a');
            doc.text('Tommy Jenzsch (Halle): 0151 57515432   ·   Doreen Jenzsch (Wittenberg): 0160 7303830', 50, currentY + 40, { width: 495, align: 'center' });

            doc.font('Helvetica').fontSize(10).fillColor('#475569');
            doc.text('E-Mail: info@ihre-seniorenassistenz.com   ·   Web: www.ihre-seniorenassistenz.com', 50, currentY + 65, { width: 495, align: 'center' });

            doc.font('Helvetica').fontSize(8.5).fillColor('#94a3b8');
            doc.text('Anerkannter Dienst für Angebote zur Unterstützung im Alltag gem. § 45a SGB XI', 50, currentY + 88, { width: 495, align: 'center' });
            doc.restore();

        } else if (format === 'factsheet') {
            filename = 'Infoblatt-Pflegekassen-A4.pdf';
            doc = new PDFDocument({
                size: 'A4',
                margins: { top: 45, left: 50, right: 50, bottom: 45 }
            });

            const fData = formatData?.factsheet || {};

            doc.font('Helvetica-Bold').fontSize(18).fillColor('#0f172a');
            doc.text(sanitizeMarketingPdfText(fData.title || 'Information zum Entlastungsbetrag (§ 45b SGB XI)'), 50, 45, { width: 350 });

            doc.font('Helvetica').fontSize(9).fillColor('#64748b');
            doc.text('Information für Klienten, Angehörige & Betreuer', 50, 75);

            doc.font('Helvetica-Bold').fontSize(9).fillColor('#312e81');
            doc.text('Seniorenassistenz Jenzsch\nHalle (Saale) & Wittenberg', 400, 45, { width: 145, align: 'right' });

            doc.save();
            doc.strokeColor('#4f46e5').lineWidth(2);
            doc.moveTo(50, 95).lineTo(545, 95).stroke();
            doc.restore();

            let y = 115;
            doc.font('Helvetica-Bold').fontSize(12).fillColor('#1e1b4b');
            doc.text(sanitizeMarketingPdfText(fData.section1_title || '1. Wer hat Anspruch?'), 50, y);
            y += 18;
            doc.font('Helvetica').fontSize(10).fillColor('#334155');
            doc.text(sanitizeMarketingPdfText(fData.section1_text || 'Jede Person mit einem anerkannten Pflegegrad (1 bis 5) hat Anspruch auf den monatlichen Entlastungsbetrag von bis zu 131 Euro.'), 50, y, { width: 495, lineGap: 3 });
            y = doc.y + 20;

            doc.font('Helvetica-Bold').fontSize(12).fillColor('#1e1b4b');
            doc.text(sanitizeMarketingPdfText(fData.section2_title || '2. Welche Leistungen können genutzt werden?'), 50, y);
            y += 18;
            const items = Array.isArray(fData.section2_items) ? fData.section2_items : [
                'Alltagsbegleitung (Einkäufe, Arztfahrten, Botengänge)',
                'Unterstützung bei Behörden- und Kassenanträgen',
                'Mobilisation & geistige Aktivierung im gewohnten Umfeld',
                'Entlastung von pflegenden Angehörigen'
            ];
            for (const it of items) {
                doc.font('Helvetica').fontSize(10).fillColor('#334155');
                doc.text('•  ' + sanitizeMarketingPdfText(it), 65, y, { width: 480, lineGap: 2 });
                y = doc.y + 6;
            }
            y += 14;

            doc.font('Helvetica-Bold').fontSize(12).fillColor('#1e1b4b');
            doc.text(sanitizeMarketingPdfText(fData.section3_title || '3. Wie erfolgt die Abrechnung?'), 50, y);
            y += 18;
            doc.font('Helvetica').fontSize(10).fillColor('#334155');
            doc.text(sanitizeMarketingPdfText(fData.section3_text || 'Die Abrechnung erfolgt transparent: Als anerkannter Dienst können wir entweder direkt mit Ihrer Pflegekasse abrechnen oder Sie reichen unsere Monatsrechnung zur Erstattung ein.'), 50, y, { width: 495, lineGap: 3 });
            y = doc.y + 35;

            doc.save();
            doc.strokeColor('#e2e8f0').lineWidth(1);
            doc.moveTo(50, 740).lineTo(545, 740).stroke();

            doc.font('Helvetica').fontSize(8.5).fillColor('#64748b');
            doc.text('Seniorenassistenz Jenzsch  ·  Dreyhauptstr. 2, 06108 Halle (Saale)  ·  Tel: 0345 / 213 895 20  ·  info@ihre-seniorenassistenz.com', 50, 755, { width: 495, align: 'center' });
            doc.restore();

        } else if (format === 'insert') {
            filename = 'Beileger-Postkarte-A6.pdf';
            doc = new PDFDocument({
                size: [297.64, 419.53],
                margins: { top: 20, left: 20, right: 20, bottom: 20 }
            });

            const iData = formatData?.insert || {};

            doc.save();
            doc.strokeColor('#312e81').lineWidth(2);
            doc.roundedRect(12, 12, 273.64, 395.53, 10).stroke();
            doc.restore();

            doc.font('Helvetica-Bold').fontSize(8).fillColor('#4f46e5');
            doc.text('SENIORENASSISTENZ JENZSCH', 20, 26, { width: 257.64, align: 'center' });

            doc.font('Helvetica-Bold').fontSize(14).fillColor('#0f172a');
            doc.text(sanitizeMarketingPdfText(iData.title || 'Ihr persönlicher Begleiter im Alltag'), 20, 45, { width: 257.64, align: 'center', lineGap: 2 });

            doc.font('Helvetica').fontSize(9).fillColor('#475569');
            doc.text(sanitizeMarketingPdfText(iData.subtitle || 'Für mehr Lebensqualität und Selbstbestimmung zu Hause.'), 20, 85, { width: 257.64, align: 'center' });

            doc.save();
            doc.strokeColor('#e2e8f0').lineWidth(1);
            doc.moveTo(35, 120).lineTo(262, 120).stroke();
            doc.restore();

            let y = 135;
            const benefits = Array.isArray(iData.benefits) ? iData.benefits : [
                'Persönlich, herzlich & zuverlässig',
                'Abrechnung über alle Pflegekassen möglich',
                'Flexible Termine nach Ihren Wünschen',
                'Keine Mindestvertragslaufzeit'
            ];
            for (const b of benefits) {
                doc.save();
                doc.font('Helvetica-Bold').fontSize(9).fillColor('#059669');
                doc.text('✓', 30, y);
                doc.font('Helvetica-Bold').fontSize(9).fillColor('#1e293b');
                doc.text(sanitizeMarketingPdfText(b), 48, y, { width: 220, lineGap: 2 });
                doc.restore();
                y += 30;
            }

            doc.save();
            doc.fillColor('#f8fafc');
            doc.roundedRect(20, 315, 257.64, 75, 8).fill();

            doc.font('Helvetica-Bold').fontSize(9).fillColor('#0f172a');
            doc.text('Rufen Sie uns unverbindlich an:', 20, 325, { width: 257.64, align: 'center' });

            doc.font('Helvetica-Bold').fontSize(10).fillColor('#312e81');
            doc.text('0151 57515432  (Halle)\n0160 7303830  (Wittenberg)', 20, 342, { width: 257.64, align: 'center', lineGap: 2 });

            doc.font('Helvetica').fontSize(7.5).fillColor('#64748b');
            doc.text(sanitizeMarketingPdfText(iData.footer || 'www.ihre-seniorenassistenz.com'), 20, 375, { width: 257.64, align: 'center' });
            doc.restore();

        } else if (format === 'voucher') {
            filename = 'Gutschein-Kennenlernen-A6.pdf';
            doc = new PDFDocument({
                size: [419.53, 297.64],
                margins: { top: 20, left: 20, right: 20, bottom: 20 }
            });

            const vData = formatData?.voucher || {};

            doc.save();
            doc.fillColor('#fffbeb');
            doc.roundedRect(10, 10, 399.53, 277.64, 12).fill();

            doc.strokeColor('#f59e0b').lineWidth(1.5).dash(4, { space: 3 });
            doc.roundedRect(15, 15, 389.53, 267.64, 10).stroke();
            doc.restore();

            doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#92400e');
            doc.text('EINLADUNG ZUM KENNENLERNEN', 20, 32, { width: 379.53, align: 'center' });

            doc.font('Helvetica-Bold').fontSize(16).fillColor('#0f172a');
            doc.text(sanitizeMarketingPdfText(vData.title || 'Gutschein für ein kostenfreies Erstgespräch'), 20, 52, { width: 379.53, align: 'center' });

            doc.save();
            doc.fillColor('#f59e0b');
            doc.roundedRect(140, 85, 140, 28, 14).fill();
            doc.font('Helvetica-Bold').fontSize(12).fillColor('#ffffff');
            doc.text(sanitizeMarketingPdfText(vData.value || '100% Kostenfrei'), 140, 93, { width: 140, align: 'center' });
            doc.restore();

            doc.font('Helvetica').fontSize(9).fillColor('#475569');
            doc.text(sanitizeMarketingPdfText(vData.description || 'Lernen Sie uns und unsere Angebote bei einer gemütlichen Tasse Kaffee unverbindlich kennen.'), 40, 128, { width: 339.53, align: 'center', lineGap: 3 });

            doc.save();
            doc.fillColor('#ffffff').strokeColor('#fde68a').lineWidth(1);
            doc.roundedRect(120, 180, 180, 36, 8).fillAndStroke();

            doc.font('Courier-Bold').fontSize(13).fillColor('#0f172a');
            doc.text(sanitizeMarketingPdfText(vData.code || 'HALLO-ORGAFLOW'), 120, 192, { width: 180, align: 'center' });
            doc.restore();

            doc.font('Helvetica').fontSize(7.5).fillColor('#64748b');
            doc.text(sanitizeMarketingPdfText(vData.validity || 'Gültig für Neukunden in Halle (Saale) & Wittenberg · Tel: 0151 57515432'), 20, 240, { width: 379.53, align: 'center' });
        } else {
            return res.status(400).json({ error: 'Unbekanntes Werbemittel-Format.' });
        }

        const buffers = [];
        doc.on('data', b => buffers.push(b));
        doc.on('end', () => {
            const pdfData = Buffer.concat(buffers);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.send(pdfData);
        });
        doc.on('error', (err) => {
            console.error('PDF Generation Error:', err);
            if (!res.headersSent) res.status(500).json({ error: err.message });
        });
        doc.end();
    } catch (e) {
        console.error("Fehler beim Generieren des Werbemittel-PDFs:", e);
        if (!res.headersSent) res.status(500).json({ error: e.message || 'PDF Generierung fehlgeschlagen.' });
    }
});

// Startet den Realtime-Hintergrund-Dienst für Live-Synchronisation
async function initGoogleCalendarRealtime() {
    try {
        const pbAdmin = await getAdminPb();
        pbAdmin.collection('appointments').subscribe('*', async (e) => {
            try {
                if (e.action === 'delete') {
                    const eventIdToDelete = e.record.google_event_id || ('orga' + Buffer.from(e.record.id).toString('hex'));
                    if (eventIdToDelete && e.record.user) {
                        await deleteAppointmentFromGoogle(eventIdToDelete, e.record.user, pbAdmin);
                    }
                } else if (e.action === 'create' || e.action === 'update') {
                    if (e.record.user && !isRecentSelfUpdate(e.record.id)) {
                        await syncAppointmentToGoogle(e.record.id, e.record.user, pbAdmin);
                    }
                }
            } catch (err) {
                console.error('[Google Calendar Realtime Sync Error]', err.message);
            }
        }, { requestKey: null });
        console.log('📅 Google Calendar Realtime-Synchronisation erfolgreich aktiv.');
    } catch (err) {
        console.warn('[Google Calendar Realtime] Initialisierung übersprungen/verzögert:', err.message);
    }
}
setTimeout(initGoogleCalendarRealtime, 2500);

const PORT = process.env.PORT || 3000;
// Host weglassen, damit der Service unter localhost und IPv4/IPv6 erreichbar ist
app.listen(PORT, () => {
    console.log(`✉️ Email Microservice läuft erfolgreich auf http://localhost:${PORT}`);
});