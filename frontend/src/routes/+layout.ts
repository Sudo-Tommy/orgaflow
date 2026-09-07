import type { LayoutLoad } from './$types';
import { pb } from '$lib/services/pocketbase';

// Deaktiviert Server-Side Rendering für unsere PocketBase-SPA
export const ssr = false;
// Verhindert Prerendering-Fehler bei geschützten Routen (da Auth dynamisch auf dem Client läuft)
export const prerender = false;
// Hängt konsequent einen Slash an URLs an (z.B. /dashboard/)
export const trailingSlash = 'always';

export const load: LayoutLoad = async () => {
    return {
        user: pb.authStore.model ? JSON.parse(JSON.stringify(pb.authStore.model)) : null
    };
};