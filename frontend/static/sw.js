const CACHE_NAME = 'orgaflow-core-v2';
const STATIC_ASSETS = [
    '/',
    '/manifest.json',
    '/favicon.png'
];

// 1. Service Worker Installation: Core Assets cachen
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(async (cache) => {
            for (const asset of STATIC_ASSETS) {
                try {
                    await cache.add(asset);
                } catch (err) {
                    console.warn('[SW] Konnte Asset nicht cachen:', asset, err?.message);
                }
            }
        }).then(() => self.skipWaiting())
    );
});

// 2. Aktivierung: Veraltete Caches bereinigen
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            );
        }).then(() => self.clients.claim())
    );
});

// 3. Fetch Handler: Network-First mit Cache-Fallback (ideal für dynamische PB-Apps)
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Pocketbase API & Live-Chat Aufrufe nicht im Cache abfangen (werden über Dexie/SWR gehandhabt)
    // Auch im lokalen Dev-Modus oder bei Vite/SvelteKit-Build-Chunks niemals intervenieren
    if (
        url.pathname.startsWith('/api/') || 
        request.method !== 'GET' ||
        url.hostname === 'localhost' ||
        url.hostname === '127.0.0.1' ||
        url.port === '5173' ||
        url.pathname.startsWith('/.svelte-kit/') ||
        url.pathname.startsWith('/@') ||
        url.pathname.startsWith('/src/') ||
        url.pathname.includes('node_modules')
    ) {
        return;
    }

    event.respondWith(
        fetch(request)
            .then((response) => {
                // Gültige Antworten in den Cache spiegeln
                if (response.status === 200 && (url.origin === location.origin)) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(request, responseClone);
                    });
                }
                return response;
            })
            .catch(async () => {
                // Fallback auf den Cache bei Offline-Zustand
                const cachedResponse = await caches.match(request);
                if (cachedResponse) {
                    return cachedResponse;
                }
                // Fallback auf Startseite bei HTML-Navigation
                if (request.mode === 'navigate') {
                    const home = await caches.match('/');
                    if (home) return home;
                }
                return new Response('Offline - Seite nicht im Zwischenspeicher', {
                    status: 503,
                    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
                });
            })
    );
});

// 4. Push-Notifications
self.addEventListener('push', function(event) {
    if (!event.data) return;
    try {
        const payload = event.data.json();
        const options = {
            body: payload.body || 'Neue Benachrichtigung',
            icon: '/favicon.png',
            badge: '/favicon.png',
            data: { url: payload.url || '/' },
            vibrate: [150, 50, 150]
        };

        event.waitUntil(
            self.registration.showNotification(payload.title || 'OrgaFlow', options)
        );
    } catch (err) {
        console.error('[SW] Fehler bei Push-Benachrichtigung:', err);
    }
});

// 5. Klick auf Push-Notification
self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    const urlToOpen = event.notification.data?.url || '/';
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then((clientList) => {
            for (const client of clientList) {
                if (client.url === urlToOpen && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});