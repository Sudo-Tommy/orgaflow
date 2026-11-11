import type { HandleClientError } from '@sveltejs/kit';
import '$lib/services/nativeApiShim';

export const handleError: HandleClientError = async ({ error }) => {
    const message = error instanceof Error ? error.message : String(error);
    const isChunkOrMimeError =
        message.includes('Failed to fetch dynamically imported module') ||
        message.includes('Expected a JavaScript-or-Wasm module script') ||
        message.includes('Importing a module script failed') ||
        message.includes('error loading dynamically imported module');

    if (isChunkOrMimeError && typeof window !== 'undefined') {
        const reloadKey = 'orga_chunk_reload_timestamp';
        const lastReload = Number(sessionStorage.getItem(reloadKey) || 0);
        const now = Date.now();

        // Prevent infinite reload loop if server is unreachable
        if (!lastReload || now - lastReload > 10000) {
            sessionStorage.setItem(reloadKey, String(now));
            window.location.reload();
            return;
        }
    }

    console.error('[OrgaFlow Client Error]:', error);
};

export const init = async () => {
    // SvelteKit client init hook
};
