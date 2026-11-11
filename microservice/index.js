import { createRequire } from 'module';
const _require = createRequire(import.meta.url);
const { EventSource } = _require('eventsource');
if (typeof globalThis.EventSource === 'undefined') globalThis.EventSource = EventSource;

const _origWarn = console.warn;
console.warn = (...args) => {
    if (typeof args[0] === 'string' && args[0].includes('Please replace pb.')) return;
    _origWarn.apply(console, args);
};

process.on('unhandledRejection', (reason, promise) => {
    console.error('[CRASH-PREVENTION] Unhandled Rejection:', promise, 'reason:', reason);
});
process.on('uncaughtException', (err) => {
    console.error('[CRASH-PREVENTION] Uncaught Exception:', err);
});

import express from 'express';
import cors from 'cors';
import { PORT, ALLOWED_ORIGINS, LARGE_BODY_ROUTES } from './src/config/env.js';

import aiRoutes from './src/routes/ai.routes.js';
import adminAiRoutes from './src/routes/adminAi.routes.js';
import calendarRoutes from './src/routes/calendar.routes.js';
import emailRoutes from './src/routes/email.routes.js';
import pdfRoutes from './src/routes/pdf.routes.js';
import vmaRoutes from './src/routes/vma.routes.js';
import driveRoutes from './src/routes/drive.routes.js';
import lexofficeRoutes from './src/routes/lexoffice.routes.js';

import portalAuthRoutes from './src/routes/portal/portalAuth.routes.js';
import portalInvoicesRoutes from './src/routes/portal/portalInvoices.routes.js';
import portalDocsRoutes from './src/routes/portal/portalDocs.routes.js';
import portalClientsRoutes from './src/routes/portal/portalClients.routes.js';
import portalAppointmentsRoutes from './src/routes/portal/portalAppointments.routes.js';
import portalProfileRoutes from './src/routes/portal/portalProfile.routes.js';
import portalRequestsRoutes from './src/routes/portal/portalRequests.routes.js';
import portalPushRoutes from './src/routes/portal/portalPush.routes.js';
import authRoutes from './src/routes/auth.routes.js';
import onboardingRoutes from './src/routes/onboarding.routes.js';

import { initGoogleCalendarRealtime } from './src/services/calendar/calendarRealtimeService.js';
import { initLexOfficeService } from './src/services/lexoffice/lexofficeScheduler.js';
import { ensureOmniChatCollection, cleanupOldOmniMessages } from './src/services/ai/omniChatService.js';
import { getAdminPb } from './src/services/pb.js';

const app = express();

app.use(cors({
    origin: (origin, callback) => {
        // Erlaubt alle vertrauenswürdigen lokalen, mobilen und Produktions-Origins
        callback(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

app.use(aiRoutes);
app.use(adminAiRoutes);
app.use(calendarRoutes);
app.use(emailRoutes);
app.use(pdfRoutes);
app.use(vmaRoutes);
app.use(driveRoutes);
app.use(lexofficeRoutes);

app.use(portalAuthRoutes);
app.use(portalInvoicesRoutes);
app.use(portalDocsRoutes);
app.use(portalClientsRoutes);
app.use(portalAppointmentsRoutes);
app.use(portalProfileRoutes);
app.use(portalRequestsRoutes);
app.use(portalPushRoutes);
app.use(authRoutes);
app.use(onboardingRoutes);

setTimeout(initGoogleCalendarRealtime, 2500);
setTimeout(initLexOfficeService, 3000);
setTimeout(async () => {
    try {
        const pbAdmin = await getAdminPb();
        await ensureOmniChatCollection(pbAdmin);
        await cleanupOldOmniMessages(pbAdmin);
    } catch (e) {
        console.warn("[Omni Init] Warnung:", e.message);
    }
}, 3500);

const server = app.listen(PORT, () => {
    console.log(`✉️ Microservice läuft erfolgreich auf Port ${PORT}`);
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} ist bereits belegt!`);
    } else {
        console.error('❌ Serverfehler beim Starten:', err);
    }
});

export default app;
