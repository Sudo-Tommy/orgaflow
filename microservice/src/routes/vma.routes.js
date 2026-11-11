import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getAdminPb } from '../services/pb.js';
import { PB_URL } from '../config/env.js';
import { computeRouteDuration, getVmaConfig } from '../services/vma/vmaRouteService.js';

const router = Router();

router.get(['/api/vma/config', '/api/emails/vma/config'], requireAuth, (req, res) => {
    res.json(getVmaConfig());
});

router.post([
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
        const data = await computeRouteDuration(origin, destination);
        res.json({ success: true, ...data });
    } catch (err) {
        console.error("[VMA Duration Route] Fehler:", err);
        res.status(500).json({ error: "Fehler bei der Routenberechnung: " + err.message });
    }
});

router.get(['/api/vma/settlements/check', '/api/emails/vma/settlements/check'], requireAuth, async (req, res) => {
    try {
        const userId = req.query.userId || req.user?.id;
        const year = parseInt(req.query.year, 10);
        const month = req.query.month !== undefined && req.query.month !== '' ? parseInt(req.query.month, 10) : null;

        if (!userId || isNaN(year)) {
            return res.status(400).json({ error: "userId und year sind erforderlich." });
        }

        const adminPb = await getAdminPb();
        let filter = `user = "${userId}" && year = ${year}`;
        if (month !== null && !isNaN(month)) filter += ` && month = ${month}`;

        const records = await adminPb.collection('vma_settlements').getFullList({ filter, sort: '-created', requestKey: null });
        if (records.length > 0) {
            const r = records[0];
            return res.json({
                exists: true,
                settlement: {
                    id: r.id, user: r.user, period: r.period, year: r.year, month: r.month,
                    total_km: r.total_km, total_travel_costs: r.total_travel_costs, total_vma: r.total_vma,
                    total_accommodation: r.total_accommodation, total_incidentals: r.total_incidentals,
                    total_amount: r.total_amount, details: r.details, status: r.status || 'entwurf',
                    pdf_file: r.pdf_file,
                    pdf_url: r.pdf_file ? `${PB_URL}/api/files/vma_settlements/${r.id}/${r.pdf_file}` : null,
                    created: r.created, updated: r.updated
                }
            });
        }
        return res.json({ exists: false, settlement: null });
    } catch (err) {
        console.error("[VMA Settlements Check] Fehler:", err);
        return res.status(500).json({ error: "Fehler bei der Vorab-Prüfung: " + err.message });
    }
});

router.get(['/api/vma/settlements', '/api/emails/vma/settlements'], requireAuth, async (req, res) => {
    try {
        const adminPb = await getAdminPb();
        const isPrivileged = req.user?.role === 'superadmin' || req.user?.role === 'developer' || req.user?.role === 'owner' || req.user?.role === 'admin';
        const targetUserId = (isPrivileged && req.query.userId) ? req.query.userId : (req.query.userId || req.user?.id);
        const filter = targetUserId ? `user = "${targetUserId}"` : undefined;

        const records = await adminPb.collection('vma_settlements').getFullList({ filter, sort: '-year,-month,-created', requestKey: null });
        const settlements = records.map(r => ({
            id: r.id, user: r.user, period: r.period, year: r.year, month: r.month,
            total_km: r.total_km, total_travel_costs: r.total_travel_costs, total_vma: r.total_vma,
            total_accommodation: r.total_accommodation, total_incidentals: r.total_incidentals,
            total_amount: r.total_amount, status: r.status || 'entwurf', pdf_file: r.pdf_file,
            pdf_url: r.pdf_file ? `${PB_URL}/api/files/vma_settlements/${r.id}/${r.pdf_file}` : null,
            detailsCount: Array.isArray(r.details) ? r.details.length : 0, created: r.created, updated: r.updated
        }));

        res.json({ success: true, settlements });
    } catch (err) {
        console.error("[VMA Settlements List] Fehler:", err);
        res.status(500).json({ error: "Fehler beim Abrufen der VMA-Abrechnungen: " + err.message });
    }
});

export default router;
