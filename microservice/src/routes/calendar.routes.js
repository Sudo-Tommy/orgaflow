import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getAdminPb } from '../services/pb.js';
import {
    generateAuthUrl, handleOAuthCallback, syncAppointmentToGoogle,
    deleteAppointmentFromGoogle, syncAllUpcomingAppointments,
    disconnectGoogleCalendar, getGoogleCredentials, fetchExternalGoogleEvents,
    getValidAccessToken, resolveEffectiveUserId, APP_DISPLAY_NAME
} from '../../googleCalendarService.js';
import { getOAuthSuccessHtml, getOAuthErrorHtml } from '../services/calendar/calendarHtmlTemplates.js';

const router = Router();

function setNoCache(res) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
}

router.get(['/api/google-calendar/auth-url', '/api/emails/google-calendar/auth-url'], requireAuth, async (req, res) => {
    setNoCache(res);
    try {
        const pb = await getAdminPb();
        const url = await generateAuthUrl(req.user.id, req.query.redirect_uri ? String(req.query.redirect_uri) : null, pb);
        res.json({ success: true, url });
    } catch (err) { res.status(400).json({ error: err.message }); }
});

router.get(['/api/google-calendar/callback', '/api/emails/google-calendar/callback'], async (req, res) => {
    setNoCache(res);
    const { code, state, error } = req.query;
    if (error || !code || !state) return res.status(400).send(getOAuthErrorHtml(error || 'Fehlende OAuth-Parameter.'));
    try {
        const pb = await getAdminPb();
        const result = await handleOAuthCallback(String(code), String(state), pb);
        res.send(getOAuthSuccessHtml(result.googleEmail));
    } catch (err) { res.status(500).send(getOAuthErrorHtml(err.message)); }
});

router.get(['/api/google-calendar/status', '/api/emails/google-calendar/status'], requireAuth, async (req, res) => {
    setNoCache(res);
    try {
        const pb = await getAdminPb();
        const userId = req.user.id;
        const creds = await getGoogleCredentials(userId, pb);
        const tokenInfo = await getValidAccessToken(userId, pb);
        const config = await pb.collection('user_calendar_configs')
            .getFirstListItem(`user = "${userId}"`, { requestKey: null }).catch(() => null);
        res.json({
            success: true,
            appName: APP_DISPLAY_NAME,
            hasCredentials: Boolean(creds.clientId && creds.clientSecret),
            connected: Boolean(tokenInfo?.accessToken && config?.sync_enabled !== false),
            googleEmail: config?.google_email || '',
            calendarId: config?.calendar_id || 'primary',
            syncEnabled: config?.sync_enabled ?? false,
            lastSync: config?.last_sync || null
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post(['/api/google-calendar/sync-all', '/api/emails/google-calendar/sync-all'], requireAuth, async (req, res) => {
    try {
        const pb = await getAdminPb();
        res.json({ success: true, ...(await syncAllUpcomingAppointments(req.user.id, pb)) });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post(['/api/google-calendar/sync-appointment', '/api/emails/google-calendar/sync-appointment'], requireAuth, async (req, res) => {
    const { appointmentId, action, googleEventId } = req.body;
    try {
        const pb = await getAdminPb();
        if (action === 'delete') {
            if (googleEventId) await deleteAppointmentFromGoogle(googleEventId, req.user.id, pb);
            return res.json({ success: true, deleted: true });
        }
        if (!appointmentId) return res.status(400).json({ error: 'appointmentId fehlt.' });
        res.json({ success: true, event: await syncAppointmentToGoogle(appointmentId, req.user.id, pb) });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post(['/api/google-calendar/disconnect', '/api/emails/google-calendar/disconnect'], requireAuth, async (req, res) => {
    try {
        const pb = await getAdminPb();
        res.json(await disconnectGoogleCalendar(req.user.id, pb));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get(['/api/google-calendar/events', '/api/emails/google-calendar/events'], requireAuth, async (req, res) => {
    try {
        const isSuperAdmin = req.user?.role === 'superadmin' || req.user?.role === 'developer' || req.user?.role === 'owner' || req.user?.collectionName === '_superusers';
        const isAdmin = isSuperAdmin || req.user?.role === 'admin';
        let targetUserId = req.user?.id;
        if (isSuperAdmin && req.query.userId) {
            targetUserId = req.query.userId;
        } else if (isAdmin && req.query.userId) {
            targetUserId = req.query.userId;
        }
        const pb = await getAdminPb();
        res.json({ success: true, events: await fetchExternalGoogleEvents(targetUserId, pb, req.query.timeMin, req.query.timeMax) });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post(['/api/google-calendar/config', '/api/emails/google-calendar/config'], requireAuth, async (req, res) => {
    try {
        const pb = await getAdminPb();
        const userId = req.user.id;
        const isSuperAdmin = req.user?.role === 'superadmin' || req.user?.role === 'developer' || req.user?.role === 'owner' || req.user?.collectionName === '_superusers';
        const existing = await pb.collection('user_calendar_configs').getFirstListItem(`user = "${userId}"`, { requestKey: null }).catch(() => null);
        const data = {};
        if (isSuperAdmin) {
            if (req.body.clientId !== undefined) data.client_id = req.body.clientId.trim();
            if (req.body.clientSecret !== undefined) data.client_secret = req.body.clientSecret.trim();
        }
        if (req.body.syncEnabled !== undefined) data.sync_enabled = Boolean(req.body.syncEnabled);
        if (existing) await pb.collection('user_calendar_configs').update(existing.id, data, { requestKey: null });
        else await pb.collection('user_calendar_configs').create({ user: userId, calendar_id: 'primary', ...data }, { requestKey: null });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
