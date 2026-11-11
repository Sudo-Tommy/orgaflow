import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getAdminPb } from '../services/pb.js';
import { generateAuthUrl } from '../../googleCalendarService.js';
import {
    getDriveStatus, listDriveFiles, downloadDriveFile,
    importDriveFilesToClient, importDriveFilesToAppointment
} from '../services/drive/googleDriveService.js';

const router = Router();

function setNoCache(res) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
}

router.get(['/api/google-drive/status', '/api/emails/google-drive/status'], requireAuth, async (req, res) => {
    setNoCache(res);
    try {
        const pb = await getAdminPb();
        const status = await getDriveStatus(req.user.id, pb);
        res.json({ success: true, ...status });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get(['/api/google-drive/auth-url', '/api/emails/google-drive/auth-url'], requireAuth, async (req, res) => {
    setNoCache(res);
    try {
        const pb = await getAdminPb();
        const url = await generateAuthUrl(req.user.id, req.query.redirect_uri ? String(req.query.redirect_uri) : null, pb);
        res.json({ success: true, url });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.get(['/api/google-drive/files', '/api/emails/google-drive/files'], requireAuth, async (req, res) => {
    setNoCache(res);
    try {
        const pb = await getAdminPb();
        const folderId = req.query.folderId ? String(req.query.folderId) : undefined;
        const search = req.query.search ? String(req.query.search) : undefined;
        const pageToken = req.query.pageToken ? String(req.query.pageToken) : undefined;

        const result = await listDriveFiles(req.user.id, { folderId, search, pageToken }, pb);
        res.json({ success: true, ...result });
    } catch (err) {
        const errCode = err.code || err.message;
        const status = (errCode === 'GOOGLE_NOT_CONNECTED' || errCode === 'GOOGLE_AUTH_EXPIRED' || errCode === 'GOOGLE_SCOPE_MISSING')
            ? 401
            : (errCode === 'GOOGLE_DRIVE_API_DISABLED' ? 403 : 500);
        res.status(status).json({
            error: err.message,
            errorCode: errCode,
            activationUrl: err.activationUrl || null,
            consentScreenUrl: err.consentScreenUrl || null
        });
    }
});

router.get(['/api/google-drive/download/:fileId', '/api/emails/google-drive/download/:fileId'], requireAuth, async (req, res) => {
    try {
        const pb = await getAdminPb();
        const file = await downloadDriveFile(req.user.id, req.params.fileId, pb);
        res.setHeader('Content-Type', file.mimeType);
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.fileName)}"`);
        res.send(file.buffer);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post(['/api/google-drive/import-to-client', '/api/emails/google-drive/import-to-client'], requireAuth, async (req, res) => {
    const { clientId, fileIds } = req.body;
    if (!clientId || !Array.isArray(fileIds) || fileIds.length === 0) {
        return res.status(400).json({ error: 'clientId und fileIds erforderlich.' });
    }
    try {
        const pb = await getAdminPb();
        const result = await importDriveFilesToClient(req.user.id, clientId, fileIds, pb);
        res.json({ success: true, ...result });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post(['/api/google-drive/import-to-appointment', '/api/emails/google-drive/import-to-appointment'], requireAuth, async (req, res) => {
    const { appointmentId, fileIds } = req.body;
    if (!appointmentId || !Array.isArray(fileIds) || fileIds.length === 0) {
        return res.status(400).json({ error: 'appointmentId und fileIds erforderlich.' });
    }
    try {
        const pb = await getAdminPb();
        const result = await importDriveFilesToAppointment(req.user.id, appointmentId, fileIds, pb);
        res.json({ success: true, ...result });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
