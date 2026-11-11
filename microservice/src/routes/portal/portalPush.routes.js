import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { sendPushNotification } from '../../services/portal/portalPushService.js';

const router = Router();

router.post(['/api/emails/portal/push', '/portal/push', '/api/push'], requireAuth, async (req, res) => {
    try {
        const { userId, title, body, url, icon } = req.body || {};
        const targetUserId = userId || req.user?.id;

        if (!targetUserId) {
            return res.status(400).json({ success: false, error: 'userId fehlt' });
        }

        const isSelf = req.user?.id === targetUserId;
        const isAdmin = req.user?.role === 'admin' || req.user?.role === 'superadmin' || req.user?.role === 'developer' || req.user?.role === 'owner' || req.user?.collectionName === '_superusers';

        if (!isSelf && !isAdmin) {
            return res.status(403).json({ success: false, error: 'Keine Berechtigung für Push-Versand an Dritte' });
        }

        const result = await sendPushNotification({
            userId: targetUserId,
            title,
            body,
            url,
            icon
        });

        if (!result.success && result.pushResults.length === 0) {
            return res.status(400).json(result);
        }

        res.json(result);
    } catch (err) {
        console.error('[PUSH ROUTE ERROR]', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

export default router;
