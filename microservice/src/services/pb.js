import PocketBase from 'pocketbase';
import { createRequire } from 'module';
import { PB_URL } from '../config/env.js';

if (typeof globalThis.EventSource === 'undefined') {
    try {
        const _require = createRequire(import.meta.url);
        const { EventSource } = _require('eventsource');
        if (EventSource) globalThis.EventSource = EventSource;
    } catch {}
}
let pbAdminInstance = null;

export async function getAdminPb() {
    if (pbAdminInstance && pbAdminInstance.authStore.isValid) {
        return pbAdminInstance;
    }
    
    const adminEmail = process.env.PB_ADMIN_EMAIL;
    const adminPass = process.env.PB_ADMIN_PASSWORD;
    if (!adminEmail || !adminPass) {
        throw new Error("PB_ADMIN_EMAIL und PB_ADMIN_PASSWORD fehlen in .env");
    }

    const pb = new PocketBase(PB_URL);
    pb.autoCancellation(false);

    try {
        await pb.collection('_superusers').authWithPassword(adminEmail, adminPass);
        pbAdminInstance = pb;
        return pbAdminInstance;
    } catch (err) {
        pbAdminInstance = null;
        throw err;
    }
}

export function createClientPb(token = null) {
    const client = new PocketBase(PB_URL);
    client.autoCancellation(false);
    if (token) client.authStore.save(token, null);
    return client;
}

