import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
try { dotenv.config({ path: resolve(__dirname, '../../../.env') }); } catch {}
try { dotenv.config({ path: resolve(__dirname, '../../../../.env') }); } catch {}

export const APP_DISPLAY_NAME = 'Seniorenassistenz OrgaFlow';

export const DEFAULT_SCOPES = [
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/drive.readonly'
].join(' ');

let lastGoogleApiCallTime = 0;
const MIN_API_GAP_MS = 500;
let googleApiQueue = Promise.resolve();

export function scheduleGoogleApiCall(fn) {
    const scheduled = googleApiQueue.then(async () => {
        const elapsed = Date.now() - lastGoogleApiCallTime;
        if (elapsed < MIN_API_GAP_MS) await new Promise(r => setTimeout(r, MIN_API_GAP_MS - elapsed));
        lastGoogleApiCallTime = Date.now();
        return await fn();
    });
    googleApiQueue = scheduled.catch(() => {});
    return scheduled;
}

export async function fetchWithRetry(url, options, maxRetries = 3) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        const res = await scheduleGoogleApiCall(() => fetch(url, options));
        if (res.status === 403 || res.status === 429) {
            const errData = await res.clone().json().catch(() => ({}));
            const isRateLimit = res.status === 429 ||
                errData?.error?.errors?.some(e => e.reason === 'rateLimitExceeded' || e.reason === 'userRateLimitExceeded') ||
                errData?.error?.message?.includes('Rate Limit') || errData?.error?.message?.includes('Quota exceeded');
            if (isRateLimit && attempt < maxRetries) {
                await new Promise(r => setTimeout(r, (attempt + 1) * 2000));
                continue;
            }
        }
        return res;
    }
    return scheduleGoogleApiCall(() => fetch(url, options));
}

// Jeder Nutzer bleibt strikt bei seiner eigenen User-ID - keine Vermischung mit Inhaber/Admin!
export async function resolveEffectiveUserId(userId, pbAdmin) {
    if (!userId) return null;
    if (!pbAdmin) return userId;
    const u = await pbAdmin.collection('users').getOne(userId, { requestKey: null }).catch(() => null);
    return u?.id || userId;
}

async function findFallbackConfig(pbAdmin) {
    if (!pbAdmin) return null;
    return await pbAdmin.collection('user_calendar_configs').getFirstListItem(
        'client_id != "" && client_secret != ""',
        { sort: '-updated', requestKey: null }
    ).catch(() => null);
}

// Client-ID und Secret für OAuth dürfen aus der App-Konfiguration stammen, Tokens NIE!
export async function getGoogleCredentials(userId, pbAdmin) {
    let clientId = (process.env.GOOGLE_CLIENT_ID || '').trim();
    let clientSecret = (process.env.GOOGLE_CLIENT_SECRET || '').trim();
    let redirectUri = (process.env.GOOGLE_REDIRECT_URI || '').trim();

    if (pbAdmin) {
        if (userId) {
            const cfg = await pbAdmin.collection('user_calendar_configs')
                .getFirstListItem(`user = "${userId}"`, { requestKey: null }).catch(() => null);
            if (cfg?.client_id) clientId = cfg.client_id.trim();
            if (cfg?.client_secret) clientSecret = cfg.client_secret.trim();
        }
        if (!clientId || !clientSecret) {
            const fb = await findFallbackConfig(pbAdmin);
            if (fb?.client_id && !clientId) clientId = fb.client_id.trim();
            if (fb?.client_secret && !clientSecret) clientSecret = fb.client_secret.trim();
        }
    }

    if (!redirectUri) {
        const baseUrl = (process.env.APP_BASE_URL || `http://localhost:${process.env.PORT || 3000}`).replace(/\/$/, '');
        redirectUri = `${baseUrl}/api/google-calendar/callback`;
    }

    const projectId = clientId.includes('-') ? clientId.split('-')[0] : '';
    return { clientId, clientSecret, redirectUri, projectId, appName: APP_DISPLAY_NAME };
}

export async function generateAuthUrl(userId, redirectUrlOverride, pbAdmin) {
    if (!userId) throw new Error('Benutzer-ID fehlt für OAuth-Autorisierung.');
    const effectiveUserId = await resolveEffectiveUserId(userId, pbAdmin);
    const creds = await getGoogleCredentials(effectiveUserId, pbAdmin);
    if (!creds.clientId) throw new Error('Google Client-ID ist nicht konfiguriert.');

    const redirectUri = redirectUrlOverride || creds.redirectUri;
    const statePayload = Buffer.from(JSON.stringify({
        userId: effectiveUserId, redirectUri, appName: APP_DISPLAY_NAME, timestamp: Date.now()
    })).toString('base64url');

    const params = new URLSearchParams({
        client_id: creds.clientId, redirect_uri: redirectUri, response_type: 'code',
        scope: DEFAULT_SCOPES, access_type: 'offline', include_granted_scopes: 'true',
        prompt: 'consent', state: statePayload
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function handleOAuthCallback(code, state, pbAdmin, onConnectedCallback) {
    let stateData = {};
    try { stateData = JSON.parse(Buffer.from(state, 'base64url').toString('utf8')); }
    catch { throw new Error('Ungültiger OAuth-State-Parameter.'); }

    const effectiveUserId = await resolveEffectiveUserId(stateData.userId, pbAdmin);
    if (!effectiveUserId) throw new Error('Benutzer-ID fehlt im OAuth-Status.');

    const creds = await getGoogleCredentials(effectiveUserId, pbAdmin);
    if (!creds.clientId || !creds.clientSecret) throw new Error('Google OAuth Credentials fehlen.');

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            code, client_id: creds.clientId, client_secret: creds.clientSecret,
            redirect_uri: stateData.redirectUri || creds.redirectUri, grant_type: 'authorization_code'
        })
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || tokenData.error) {
        throw new Error(tokenData.error_description || tokenData.error || 'Token-Austausch mit Google fehlgeschlagen.');
    }

    let googleEmail = '';
    try {
        const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` }
        });
        if (userRes.ok) googleEmail = (await userRes.json()).email || '';
    } catch {}

    const expiryDate = Date.now() + ((Number(tokenData.expires_in) || 3599) * 1000);
    const existingConfig = await pbAdmin.collection('user_calendar_configs')
        .getFirstListItem(`user = "${effectiveUserId}"`, { requestKey: null }).catch(() => null);

    const payload = {
        user: effectiveUserId,
        google_email: googleEmail || existingConfig?.google_email || '',
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || existingConfig?.refresh_token || '',
        expiry_date: expiryDate,
        calendar_id: existingConfig?.calendar_id || 'primary',
        sync_enabled: true,
        last_sync: new Date().toISOString(),
        client_id: existingConfig?.client_id || creds.clientId,
        client_secret: existingConfig?.client_secret || creds.clientSecret
    };

    if (existingConfig) await pbAdmin.collection('user_calendar_configs').update(existingConfig.id, payload, { requestKey: null });
    else await pbAdmin.collection('user_calendar_configs').create(payload, { requestKey: null });

    if (typeof onConnectedCallback === 'function') {
        onConnectedCallback(effectiveUserId, pbAdmin).catch(err => console.error('[Google OAuth] Sync-Fehler:', err));
    }
    return { success: true, googleEmail: payload.google_email, userId: effectiveUserId };
}

// Gibt NUR DANN einen Access Token zurück, wenn DIESER konkrete User verbunden ist! Niemals Fallback auf andere Nutzer!
export async function getValidAccessToken(userId, pbAdmin, forceRefresh = false) {
    if (!pbAdmin || !userId) return null;
    const effectiveUserId = await resolveEffectiveUserId(userId, pbAdmin);
    if (!effectiveUserId) return null;

    const config = await pbAdmin.collection('user_calendar_configs')
        .getFirstListItem(`user = "${effectiveUserId}"`, { requestKey: null }).catch(() => null);
    if (!config || (!config.refresh_token && !config.access_token)) return null;

    const expiry = Number(config.expiry_date) || 0;
    if (!forceRefresh && config.access_token && (expiry > (Date.now() + 4 * 60 * 1000) || !config.refresh_token)) {
        return { accessToken: config.access_token, config };
    }
    if (!config.refresh_token) return null;

    const creds = await getGoogleCredentials(effectiveUserId, pbAdmin);
    try {
        const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: creds.clientId, client_secret: creds.clientSecret,
                refresh_token: config.refresh_token, grant_type: 'refresh_token'
            })
        });
        const refreshData = await refreshRes.json();
        if (!refreshRes.ok || refreshData.error) return null;

        const newExpiry = Date.now() + ((Number(refreshData.expires_in) || 3599) * 1000);
        const updatePayload = { access_token: refreshData.access_token, expiry_date: newExpiry };
        if (refreshData.refresh_token) updatePayload.refresh_token = refreshData.refresh_token;

        await pbAdmin.collection('user_calendar_configs').update(config.id, updatePayload, { requestKey: null });
        config.access_token = refreshData.access_token;
        config.expiry_date = newExpiry;
        return { accessToken: refreshData.access_token, config };
    } catch {
        return null;
    }
}

export async function disconnectGoogleCalendar(userId, pbAdmin) {
    if (!pbAdmin || !userId) return { success: false };
    try {
        const effectiveUserId = await resolveEffectiveUserId(userId, pbAdmin);
        const config = await pbAdmin.collection('user_calendar_configs')
            .getFirstListItem(`user = "${effectiveUserId}"`, { requestKey: null }).catch(() => null);
        if (!config) return { success: true };
        if (config.access_token) {
            await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(config.access_token)}`, {
                method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            }).catch(() => {});
        }
        await pbAdmin.collection('user_calendar_configs').update(config.id, {
            access_token: '', refresh_token: '', expiry_date: 0, sync_enabled: false
        }, { requestKey: null });
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
}
