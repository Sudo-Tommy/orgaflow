import { getAdminPb } from '../pb.js';
import { ensureLexOfficeSchema } from './lexofficeSchemaService.js';
import { syncCompanyWithLexOffice } from './lexofficeSyncService.js';
import { decryptApiKey } from './lexofficeCrypto.js';
import { lexofficeRequest, fetchLexOfficeProfile } from './lexofficeHttpClient.js';

let schedulerTimer = null;
let keepAliveTimer = null;
let isRunningDailySync = false;
let isVerifyingConnection = false;
let lastDailySyncDate = '';

function getBerlinTimeParts(date = new Date()) {
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Europe/Berlin',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
    const parts = formatter.formatToParts(date);
    const m = {};
    for (const p of parts) m[p.type] = p.value;
    return {
        dateStr: `${m.year}-${m.month}-${m.day}`,
        hour: m.hour,
        minute: m.minute
    };
}

/**
 * Prüft und hält bestehende LexOffice-Verbindungen je Firma aktiv (Keep-Alive & Self-Healing),
 * strikt getrennt nach Standort/Firma (keine Vermischung zwischen Standorten).
 */
export async function verifyAndHealLexOfficeConnections(pbInstance = null) {
    if (isVerifyingConnection) return;
    isVerifyingConnection = true;
    try {
        const pb = pbInstance || await getAdminPb();
        await ensureLexOfficeSchema(pb);

        const allConfigs = await pb.collection('lexoffice_configs').getFullList({ requestKey: null }).catch(() => []);

        for (const cfg of allConfigs) {
            if (!cfg.company || !cfg.encrypted_api_key || cfg.status === 'disconnected') continue;
            try {
                const apiKey = decryptApiKey(cfg);
                const profile = await fetchLexOfficeProfile(apiKey);
                if (profile && (cfg.status !== 'connected' || cfg.last_error)) {
                    await pb.collection('lexoffice_configs').update(cfg.id, {
                        status: 'connected',
                        last_error: '',
                        lexoffice_org_id: profile.organizationId || cfg.lexoffice_org_id || '',
                        lexoffice_company_name: profile.companyName || cfg.lexoffice_company_name || 'LexOffice Account'
                    }, { requestKey: null }).catch(() => {});
                }
            } catch (err) {
                if (err.status === 401) {
                    await pb.collection('lexoffice_configs').update(cfg.id, {
                        status: 'error',
                        last_error: err.message || 'Zugangsschlüssel ungültig'
                    }, { requestKey: null }).catch(() => {});
                }
            }
        }
    } catch (err) {
        console.warn('[LexOffice KeepAlive] Hinweis:', err.message);
    } finally {
        isVerifyingConnection = false;
    }
}

export async function runDailyLexOfficeSync(actor = { userName: 'Automatischer 16:00-Sync', userRole: 'system' }) {
    if (isRunningDailySync) return;
    isRunningDailySync = true;
    try {
        const pb = await getAdminPb();
        await verifyAndHealLexOfficeConnections(pb);

        const activeConfigs = await pb.collection('lexoffice_configs').getFullList({
            filter: 'status = "connected"',
            requestKey: null
        }).catch(() => []);

        for (const cfg of activeConfigs) {
            if (!cfg.company) continue;
            try {
                await syncCompanyWithLexOffice(pb, cfg.company, {
                    includeAllYears: false,
                    userName: actor.userName,
                    userRole: actor.userRole
                });
            } catch (err) {
                console.warn(`[LexOffice 16-Uhr-Sync] Standort ${cfg.company}:`, err.message);
            }
        }
    } catch (err) {
        console.warn('[LexOffice Scheduler] Fehler beim 16:00-Uhr-Sync:', err.message);
    } finally {
        isRunningDailySync = false;
    }
}

function checkDailySchedule() {
    const { dateStr, hour, minute } = getBerlinTimeParts();
    if (hour === '16' && minute === '00' && lastDailySyncDate !== dateStr) {
        lastDailySyncDate = dateStr;
        console.log(`⏰ [LexOffice Scheduler] 16:00 Uhr erreicht (${dateStr}). Starte täglichen LexOffice-Abgleich...`);
        runDailyLexOfficeSync().catch((err) => {
            console.error('[LexOffice Scheduler] Unerwarteter Fehler im 16-Uhr-Lauf:', err);
        });
    }
}

export async function registerLexOfficeWebhooks(apiKey, companyId, webhookSecret) {
    const publicBaseUrl = process.env.PUBLIC_WEBHOOK_BASE_URL || '';
    if (!publicBaseUrl.startsWith('https://')) {
        return { registered: false, reason: 'Keine öffentliche HTTPS-Webhook-URL konfiguriert.' };
    }

    const callbackUrl = `${publicBaseUrl.replace(/\/$/, '')}/api/emails/lexoffice/webhook/${encodeURIComponent(companyId)}?token=${encodeURIComponent(webhookSecret)}`;
    const events = [
        'invoice.created',
        'invoice.changed',
        'invoice.status.changed',
        'credit-note.created',
        'voucher.created',
        'voucher.changed',
        'voucher.deleted'
    ];

    try {
        const existing = await lexofficeRequest(apiKey, '/event-subscriptions').catch(() => ({ content: [] }));
        const currentList = Array.isArray(existing?.content) ? existing.content : [];

        for (const eventType of events) {
            const alreadyExists = currentList.some((s) => s.eventType === eventType && s.callbackUrl === callbackUrl);
            if (!alreadyExists) {
                await lexofficeRequest(apiKey, '/event-subscriptions', {
                    method: 'POST',
                    body: { eventType, callbackUrl }
                }).catch(() => {});
            }
        }
        return { registered: true };
    } catch {
        return { registered: false };
    }
}

export function initLexOfficeService() {
    if (schedulerTimer) clearInterval(schedulerTimer);
    if (keepAliveTimer) clearInterval(keepAliveTimer);

    verifyAndHealLexOfficeConnections().catch(() => {});
    schedulerTimer = setInterval(checkDailySchedule, 30 * 1000);
    keepAliveTimer = setInterval(() => {
        verifyAndHealLexOfficeConnections().catch(() => {});
    }, 15 * 60 * 1000);

    console.log('⏰ LexOffice Synchronisation & 15-Min-KeepAlive (firmenspezifisch getrennt) aktiv.');
}
