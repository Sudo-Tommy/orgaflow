/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

const sw = self as unknown as ServiceWorkerGlobalScope;

import { build, files, version } from '$service-worker';

// Eindeutiger Cache-Name pro App-Build-Version
const CACHE_NAME = `orgaflow-cache-${version}`;

// Zu cachende statische Kern-Dateien (Build-Chunks, Favicons, Manifest, CSS/Bilder)
const ASSETS_TO_CACHE = [...build, ...files];

sw.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(ASSETS_TO_CACHE))
            .then(() => sw.skipWaiting())
    );
});

sw.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => {
                return Promise.all(
                    keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
                );
            })
            .then(() => sw.clients.claim())
    );
});

sw.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // 1. Nicht-GET Anfragen niemals abfangen
    if (event.request.method !== 'GET') {
        return;
    }

    // 2. STRIKTER AUSSCHLUSS: Niemals API-Routen, SSE-Streams oder PocketBase cachen
    if (
        url.pathname.startsWith('/api') ||
        url.pathname.startsWith('/_') ||
        url.pathname.includes('/realtime') ||
        url.searchParams.has('auth')
    ) {
        return;
    }

    // 3. Cache-First fuer bekannte, versionierte Build-Assets und Icons
    if (ASSETS_TO_CACHE.includes(url.pathname)) {
        event.respondWith(
            caches.match(event.request).then((cached) => {
                return cached || fetch(event.request);
            })
        );
        return;
    }

    // 4. Network-First mit Cache-Fallback fuer Seiten-Navigationen (HTML)
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .then((networkResponse) => {
                    if (networkResponse.status === 200) {
                        const copy = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
                    }
                    return networkResponse;
                })
                .catch(async () => {
                    const cachedResponse = await caches.match(event.request);
                    if (cachedResponse) return cachedResponse;
                    const offlineFallback = await caches.match('/');
                    return (
                        offlineFallback ||
                        new Response('OrgaFlow ist offline. Bitte prüfen Sie Ihre Internetverbindung.', {
                            status: 503,
                            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
                        })
                    );
                })
        );
    }
});

