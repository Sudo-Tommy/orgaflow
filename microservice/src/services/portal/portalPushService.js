import webpush from 'web-push';
import { getAdminPb } from '../pb.js';

const vapidPublicKey = process.env.PUBLIC_VAPID_KEY || 'BDX77m5HXgMy7eT8QB86A4a6RCfeSr6KroakoYqsbSHAiTdPo3Bq3E3yUbIGhFYr8JQA9CzBPYQdr1j7IhUUVpw';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '_qNNnGj5QiPQXYIBZL5QnBhI4Vdnv0Gl-DxnjAWgTWY';
const vapidEmail = process.env.EMAIL_USER || 'admin@ihre-seniorenassistenz.com';

if (vapidPublicKey && vapidPrivateKey) {
    webpush.setVapidDetails(`mailto:${vapidEmail}`, vapidPublicKey, vapidPrivateKey);
}

export async function sendPushNotification({ userId, title, body, url, icon }) {
    if (!userId) {
        throw new Error('userId ist erforderlich');
    }

    const pb = await getAdminPb();
    let targetUser = null;
    let collectionName = 'users';

    try {
        targetUser = await pb.collection('users').getOne(userId, { requestKey: null });
    } catch {
        try {
            targetUser = await pb.collection('_superusers').getOne(userId, { requestKey: null });
            collectionName = '_superusers';
        } catch {
            throw new Error(`Benutzer mit ID "${userId}" nicht gefunden`);
        }
    }

    let subscriptions = targetUser.push_subscriptions || [];
    if (typeof subscriptions === 'string') {
        try { subscriptions = JSON.parse(subscriptions); } catch { subscriptions = []; }
    }

    if (!Array.isArray(subscriptions) || subscriptions.length === 0) {
        return {
            success: false,
            error: 'Kein Gerät für Push-Benachrichtigungen registriert.',
            pushResults: []
        };
    }

    const payload = JSON.stringify({
        title: title || 'OrgaFlow',
        body: body || '',
        url: url || '/dashboard',
        icon: icon || '/favicon.png'
    });

    const pushResults = [];
    const validSubscriptions = [];

    for (const sub of subscriptions) {
        if (!sub?.endpoint) continue;
        try {
            await webpush.sendNotification(sub, payload);
            pushResults.push({ endpoint: sub.endpoint, status: 'ok' });
            validSubscriptions.push(sub);
        } catch (err) {
            console.warn(`[PUSH] Fehler bei Zustellung an ${sub.endpoint}:`, err.message);
            pushResults.push({
                endpoint: sub.endpoint,
                status: 'error',
                error: err.message,
                statusCode: err.statusCode
            });
            if (err.statusCode !== 404 && err.statusCode !== 410) {
                validSubscriptions.push(sub);
            }
        }
    }

    if (validSubscriptions.length !== subscriptions.length) {
        try {
            await pb.collection(collectionName).update(userId, {
                push_subscriptions: validSubscriptions
            });
        } catch (updateErr) {
            console.warn('[PUSH] Bereinigung abgelaufener Abonnements fehlgeschlagen:', updateErr.message);
        }
    }

    return {
        success: pushResults.some(r => r.status === 'ok'),
        pushResults,
        deliveredCount: pushResults.filter(r => r.status === 'ok').length
    };
}
