import { redirect, type Handle } from '@sveltejs/kit';
import PocketBase from 'pocketbase';

export const handle: Handle = async ({ event, resolve }) => {
    const pbUrl = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090';
    event.locals.pb = new PocketBase(pbUrl);
    
    // Auth-Zustand aus Cookie laden
    event.locals.pb.authStore.loadFromCookie(event.request.headers.get('cookie') || '');
    
    try {
        if (event.locals.pb.authStore.isValid) {
            await event.locals.pb.collection('users').authRefresh();
            event.locals.user = event.locals.pb.authStore.model;
        } else {
            event.locals.user = null;
        }
    } catch (_) {
        event.locals.pb.authStore.clear();
        event.locals.user = null;
    }

    const path = event.url.pathname;
    const user = event.locals.user;

    // Route-Guarding auf Basis von Pfadsegmenten und Rollen
    if (path.startsWith('/owner') && user?.role !== 'owner') {
        throw redirect(303, '/login');
    }
    
    if (path.startsWith('/admin')) {
        if (!user || (user.role !== 'admin' && user.role !== 'owner')) {
            throw redirect(303, '/login');
        }
    }

    if (path.startsWith('/caregiver') && !user) {
        throw redirect(303, '/login');
    }

    // Sicherheits-Header mitsenden
    const response = await resolve(event);
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');

    // Cookie synchronisieren falls gültig
    if (event.locals.pb.authStore.isValid) {
        response.headers.append('set-cookie', event.locals.pb.authStore.exportToCookie({ httpOnly: false, sameSite: 'lax', path: '/' }));
    }

    return response;
};
