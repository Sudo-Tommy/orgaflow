import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getAdminPb } from '../services/pb.js';
import { encryptApiKey, generateWebhookSecret, verifyWebhookToken } from '../services/lexoffice/lexofficeCrypto.js';
import { fetchLexOfficeProfile } from '../services/lexoffice/lexofficeHttpClient.js';
import { ensureLexOfficeSchema, writeLexOfficeAuditLog } from '../services/lexoffice/lexofficeSchemaService.js';
import { syncCompanyWithLexOffice } from '../services/lexoffice/lexofficeSyncService.js';
import { pushOrUpdateSingleInvoiceInLexOffice, handleInvoiceStornoOrDeleteInLexOffice } from '../services/lexoffice/lexofficeLifecycleService.js';
import { computeLiveFinanceSummary } from '../services/lexoffice/lexofficeAccountingService.js';
import { registerLexOfficeWebhooks, verifyAndHealLexOfficeConnections } from '../services/lexoffice/lexofficeScheduler.js';

const router = Router();

function requireLexOfficePermission(req, res, next) {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Bitte melden Sie sich erneut an.' });
    const role = String(user.role || '').toLowerCase();
    const email = String(user.email || '').toLowerCase();
    const isSuper = user.collectionName === '_superusers' || ['owner', 'superadmin', 'developer'].includes(role) || email.includes('jenzsch');
    if (!isSuper && role !== 'admin') {
        return res.status(403).json({ error: 'Zugriff verweigert: Nur Inhaber, Admins und Entwickler dürfen die LexOffice-Synchronisation nutzen.' });
    }
    req.isLexOfficeSuper = isSuper;
    next();
}

function canAccessCompany(req, companyId) {
    if (req.isLexOfficeSuper) return true;
    const rawComp = req.user?.company;
    if (!rawComp) return false;
    return Array.isArray(rawComp) ? rawComp.includes(companyId) : String(rawComp).includes(companyId);
}

function formatSafeConfig(cfg) {
    return {
        companyId: cfg.company,
        status: cfg.status || 'disconnected',
        connected: cfg.status === 'connected',
        needsReconnect: cfg.status === 'error',
        lexofficeCompanyName: cfg.lexoffice_company_name || '',
        lexofficeEmail: cfg.lexoffice_email || '',
        keyHint: cfg.key_hint || '••••',
        lastError: cfg.last_error || '',
        lastSync: cfg.last_sync || null,
        lastSyncStats: cfg.last_sync_stats || null
    };
}

function getActorName(user) {
    return `${user?.name_first || ''} ${user?.name_last || ''}`.trim() || user?.email || 'Admin';
}

router.get(['/api/lexoffice/status', '/api/emails/lexoffice/status'], requireAuth, requireLexOfficePermission, async (req, res) => {
    try {
        const pb = await getAdminPb();
        await ensureLexOfficeSchema(pb);
        let allConfigs = await pb.collection('lexoffice_configs').getFullList({ requestKey: null }).catch(() => []);
        if (allConfigs.some((c) => c.status !== 'connected')) {
            await verifyAndHealLexOfficeConnections(pb);
            allConfigs = await pb.collection('lexoffice_configs').getFullList({ requestKey: null }).catch(() => []);
        }
        const visible = allConfigs.filter((c) => canAccessCompany(req, c.company)).map(formatSafeConfig);
        const financeSummary = await computeLiveFinanceSummary(pb, req.query.companyId || null);
        res.json({ success: true, configs: visible, financeSummary });
    } catch (err) {
        res.status(500).json({ error: err.message || 'Status konnte nicht geladen werden.' });
    }
});

router.post(['/api/lexoffice/connect', '/api/emails/lexoffice/connect'], requireAuth, requireLexOfficePermission, async (req, res) => {
    try {
        const { companyId, apiKey } = req.body || {};
        if (!apiKey || typeof apiKey !== 'string') {
            return res.status(400).json({ error: 'Bitte geben Sie Ihren gültigen LexOffice-Schlüssel ein.' });
        }

        const cleanKey = apiKey.trim();
        const profile = await fetchLexOfficeProfile(cleanKey);
        const pb = await getAdminPb();
        await ensureLexOfficeSchema(pb);

        let targetCompanyId = companyId;
        if (profile?.organizationId) {
            const existingByOrg = await pb.collection('lexoffice_configs').getFirstListItem(
                `lexoffice_org_id = "${profile.organizationId}"`,
                { requestKey: null }
            ).catch(() => null);

            if (existingByOrg && existingByOrg.company !== targetCompanyId) {
                if (req.isLexOfficeSuper) {
                    targetCompanyId = existingByOrg.company;
                } else {
                    return res.status(400).json({
                        error: `Dieser LexOffice-Account („${profile.companyName || 'LexOffice'}“) gehört zu einem anderen Standort.`
                    });
                }
            }
        }

        if (!targetCompanyId || !canAccessCompany(req, targetCompanyId)) {
            return res.status(403).json({ error: 'Keine Berechtigung für diesen Standort.' });
        }

        const encrypted = encryptApiKey(cleanKey);
        const webhookSecret = generateWebhookSecret();
        const payload = {
            company: targetCompanyId,
            ...encrypted,
            webhook_secret: webhookSecret,
            lexoffice_org_id: profile?.organizationId || '',
            lexoffice_company_name: profile?.companyName || 'LexOffice Account',
            lexoffice_email: profile?.created?.userEmail || profile?.created?.userName || '',
            status: 'connected',
            last_error: ''
        };

        const existing = await pb.collection('lexoffice_configs').getFirstListItem(`company = "${targetCompanyId}"`, { requestKey: null }).catch(() => null);
        const saved = existing
            ? await pb.collection('lexoffice_configs').update(existing.id, payload, { requestKey: null })
            : await pb.collection('lexoffice_configs').create(payload, { requestKey: null });

        await registerLexOfficeWebhooks(cleanKey, targetCompanyId, webhookSecret).catch(() => {});
        await writeLexOfficeAuditLog(pb, {
            userName: getActorName(req.user), userRole: req.user.role || 'admin',
            action: 'LEXOFFICE_CONNECTED',
            details: `LexOffice-Verbindung für Standort ${targetCompanyId} (${payload.lexoffice_company_name}) hergestellt.`
        });

        res.json({ success: true, config: formatSafeConfig(saved), message: `Erfolgreich mit „${payload.lexoffice_company_name}“ verbunden!` });
    } catch (err) {
        res.status(err.status === 401 ? 401 : 400).json({ error: err.message || 'Verbindung fehlgeschlagen.' });
    }
});

router.post(['/api/lexoffice/disconnect', '/api/emails/lexoffice/disconnect'], requireAuth, requireLexOfficePermission, async (req, res) => {
    try {
        const { companyId } = req.body || {};
        if (!companyId || !canAccessCompany(req, companyId)) return res.status(403).json({ error: 'Keine Berechtigung für diesen Standort.' });
        const pb = await getAdminPb();
        await ensureLexOfficeSchema(pb);
        const existing = await pb.collection('lexoffice_configs').getFirstListItem(`company = "${companyId}"`, { requestKey: null }).catch(() => null);
        if (existing) await pb.collection('lexoffice_configs').delete(existing.id, { requestKey: null });
        await writeLexOfficeAuditLog(pb, {
            userName: getActorName(req.user), userRole: req.user.role || 'admin',
            action: 'LEXOFFICE_DISCONNECTED', details: `LexOffice-Verbindung für Standort ${companyId} getrennt.`
        });
        res.json({ success: true, message: 'LexOffice-Verbindung wurde sicher getrennt.' });
    } catch (err) {
        res.status(500).json({ error: err.message || 'Trennen der Verbindung fehlgeschlagen.' });
    }
});

router.post(['/api/lexoffice/sync', '/api/emails/lexoffice/sync'], requireAuth, requireLexOfficePermission, async (req, res) => {
    try {
        const { companyId, includeAllYears = false } = req.body || {};
        const pb = await getAdminPb();
        await ensureLexOfficeSchema(pb);

        let targetCompanyIds = [];
        if (companyId && companyId !== 'all') {
            if (!canAccessCompany(req, companyId)) return res.status(403).json({ error: 'Keine Berechtigung für diesen Standort.' });
            targetCompanyIds = [companyId];
        } else {
            const configs = await pb.collection('lexoffice_configs').getFullList({ filter: 'status = "connected"', requestKey: null }).catch(() => []);
            targetCompanyIds = configs.filter((c) => canAccessCompany(req, c.company)).map((c) => c.company);
        }

        if (targetCompanyIds.length === 0) {
            return res.status(400).json({ error: 'Noch keine aktive LexOffice-Verbindung vorhanden. Bitte zuerst verbinden.', needsConnect: true });
        }

        const totals = { created: 0, updated: 0, pushed: 0, expensesSynced: 0, pdfsSynced: 0, paidCount: 0 };
        for (const cid of targetCompanyIds) {
            const resSync = await syncCompanyWithLexOffice(pb, cid, {
                includeAllYears,
                userName: getActorName(req.user),
                userRole: req.user.role || 'admin'
            });
            totals.created += resSync.stats.created;
            totals.updated += resSync.stats.updated;
            totals.pushed += resSync.stats.pushed;
            totals.expensesSynced += resSync.stats.expensesSynced || 0;
            totals.pdfsSynced += resSync.stats.pdfsSynced;
            totals.paidCount += resSync.stats.paidCount || 0;
        }

        const financeSummary = await computeLiveFinanceSummary(pb, companyId);
        const paidMsg = totals.paidCount > 0 ? `${totals.paidCount} Rechnungen als bezahlt markiert, ` : '';
        res.json({
            success: true,
            stats: totals,
            financeSummary,
            message: `LexOffice-Abgleich: ${paidMsg}${totals.updated} aktualisiert, ${totals.created} importiert, ${totals.pushed} übertragen${totals.expensesSynced > 0 ? `, ${totals.expensesSynced} Ausgaben abgeglichen` : ''}.`
        });
    } catch (err) {
        res.status(err.status === 401 ? 401 : 500).json({
            error: err.message || 'Fehler beim LexOffice-Abgleich.',
            needsReconnect: Boolean(err.needsReconnect || err.status === 401)
        });
    }
});

router.post(['/api/lexoffice/invoice-action', '/api/emails/lexoffice/invoice-action'], requireAuth, async (req, res) => {
    try {
        const { action = 'sync', invoiceId, invoiceData, replacementInvoiceId } = req.body || {};
        const pb = await getAdminPb();
        await ensureLexOfficeSchema(pb);
        const actor = { userName: getActorName(req.user), userRole: req.user?.role || 'user' };

        if (action === 'delete' || action === 'storno') {
            const targetInv = invoiceData || (invoiceId ? await pb.collection('invoices').getOne(invoiceId, { expand: 'client', requestKey: null }).catch(() => null) : null);
            const result = await handleInvoiceStornoOrDeleteInLexOffice(pb, targetInv, action, actor);
            if (replacementInvoiceId) {
                await pushOrUpdateSingleInvoiceInLexOffice(pb, replacementInvoiceId, actor).catch(() => {});
            }
            return res.json({ success: true, ...result });
        }

        if (invoiceId) {
            const result = await pushOrUpdateSingleInvoiceInLexOffice(pb, invoiceId, actor);
            return res.json({ success: true, ...result });
        }
        res.json({ success: false, reason: 'missing_invoice_id' });
    } catch (err) {
        res.status(500).json({ error: err.message || 'Einzel-Abgleich fehlgeschlagen.' });
    }
});

router.post(['/api/lexoffice/webhook/:companyId', '/api/emails/lexoffice/webhook/:companyId'], async (req, res) => {
    try {
        const { companyId } = req.params;
        const token = req.query.token || req.headers['x-lexoffice-token'];
        const pb = await getAdminPb();
        const cfg = await pb.collection('lexoffice_configs').getFirstListItem(`company = "${companyId}"`, { requestKey: null }).catch(() => null);
        if (!cfg || !verifyWebhookToken(token, cfg.webhook_secret)) {
            return res.status(401).json({ error: 'Ungültiger Webhook-Sicherheitsschlüssel.' });
        }
        syncCompanyWithLexOffice(pb, companyId, { userName: 'LexOffice Echtzeit-Webhook', userRole: 'system' }).catch(() => {});
        res.status(200).json({ received: true });
    } catch {
        res.status(500).json({ error: 'Webhook-Verarbeitungsfehler' });
    }
});

export default router;
