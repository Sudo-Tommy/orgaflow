import { pb } from "$lib/services/pocketbase";
import { getMicroserviceUrl } from "$lib/services/apiConfig";

const VAPID_PUBLIC_KEY = "BDX77m5HXgMy7eT8QB86A4a6RCfeSr6KroakoYqsbSHAiTdPo3Bq3E3yUbIGhFYr8JQA9CzBPYQdr1j7IhUUVpw";

function urlB64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const buffer = new ArrayBuffer(rawData.length);
    const outputArray = new Uint8Array(buffer);
    for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
    return outputArray;
}

export async function isWebPushSubscribed(): Promise<boolean> {
    const reg = await navigator.serviceWorker.getRegistration('/sw.js');
    if (!reg) return false;
    return Boolean(await reg.pushManager.getSubscription());
}

export async function syncWebPushPrefs(prefs: any): Promise<void> {
    const user = pb.authStore.model;
    if (!user) return;
    const collection = pb.authStore.isSuperuser ? '_superusers' : 'users';
    const freshUser = await pb.collection(collection).getOne(user.id, { requestKey: null });
    let existingSubs = freshUser.push_subscriptions || [];
    if (typeof existingSubs === 'string') { try { existingSubs = JSON.parse(existingSubs); } catch { existingSubs = []; } }

    const reg = await navigator.serviceWorker.getRegistration('/sw.js');
    const sub = await reg?.pushManager.getSubscription();
    if (!sub) return;

    let updated = false;
    existingSubs = existingSubs.map((s: any) => {
        if (s.endpoint === sub.endpoint) {
            s.preferences = prefs;
            updated = true;
        }
        return s;
    });
    if (updated) await pb.collection(collection).update(user.id, { push_subscriptions: existingSubs });
}

export async function unsubscribeWebPush(): Promise<void> {
    const reg = await navigator.serviceWorker.getRegistration('/sw.js');
    const sub = await reg?.pushManager.getSubscription();
    if (!sub) return;
    await sub.unsubscribe();
    const user = pb.authStore.model;
    if (!user) return;
    const collection = pb.authStore.isSuperuser ? '_superusers' : 'users';
    const freshUser = await pb.collection(collection).getOne(user.id, { requestKey: null });
    let existingSubs = freshUser.push_subscriptions || [];
    if (typeof existingSubs === 'string') { try { existingSubs = JSON.parse(existingSubs); } catch { existingSubs = []; } }
    existingSubs = existingSubs.filter((s: any) => s.endpoint !== sub.endpoint);
    await pb.collection(collection).update(user.id, { push_subscriptions: existingSubs });
    freshUser.push_subscriptions = existingSubs;
    pb.authStore.save(pb.authStore.token, freshUser);
}

export async function subscribeWebPush(prefs: any): Promise<'granted' | 'denied'> {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return 'denied';

    await navigator.serviceWorker.register('/sw.js');
    const reg = await navigator.serviceWorker.getRegistration('/sw.js');
    const sub = await reg?.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlB64ToUint8Array(VAPID_PUBLIC_KEY)
    });
    const user = pb.authStore.model;
    if (user && sub) {
        const collection = pb.authStore.isSuperuser ? '_superusers' : 'users';
        const freshUser = await pb.collection(collection).getOne(user.id, { requestKey: null });
        let existingSubs = freshUser.push_subscriptions || [];
        if (typeof existingSubs === 'string') { try { existingSubs = JSON.parse(existingSubs); } catch { existingSubs = []; } }
        if (!existingSubs.some((s: any) => s.endpoint === sub.endpoint)) {
            const subJSON = JSON.parse(JSON.stringify(sub));
            subJSON.preferences = prefs;
            existingSubs.push(subJSON);
            await pb.collection(collection).update(user.id, { push_subscriptions: existingSubs });
            freshUser.push_subscriptions = existingSubs;
            pb.authStore.save(pb.authStore.token, freshUser);
        }
    }
    return 'granted';
}

export async function sendWebTestPush(): Promise<any> {
    const user = pb.authStore.model;
    if (!user) return null;
    const res = await fetch(getMicroserviceUrl('/portal/push'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${pb.authStore.token}` },
        body: JSON.stringify({
            userId: user.id,
            title: 'Test erfolgreich! 🚀',
            body: 'Dieses Gerät ist perfekt mit dem Server verbunden.',
            url: '/dashboard'
        })
    });
    return res.json();
}
