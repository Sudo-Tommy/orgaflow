import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';

const PROD_ORIGIN = 'https://www.ihre-seniorenassistenz.com';

const LOCAL_HOST_RE = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|10\.0\.2\.2)(:\d+)?(?=\/|$)/i;
const MICRO_PORT_RE = /^https?:\/\/[^/]+:3000(?=\/|$)/i;

/**
 * Wandelt Entwicklungs-/Relativ-URLs in Produktions-URLs um (nur in der nativen App).
 * - "/api/..." und andere Server-Pfade -> https://www.ihre-seniorenassistenz.com/...
 * - "http://localhost:3000/<pfad>" (Microservice-Dev) -> /api/emails/<pfad>
 * - "http://localhost:8090/..." (PocketBase-Dev) -> Produktionsserver
 */
export function rewriteNativeUrl(url: string): string {
    if (!url) return url;

    // Relative Server-Pfade (keine lokalen App-Assets)
    if (url.startsWith('/') && !url.startsWith('//')) {
        if (/^\/(api|downloads|uploads|_)\//.test(url) || url === '/api') {
            return `${PROD_ORIGIN}${url}`;
        }
        return url;
    }

    if (LOCAL_HOST_RE.test(url)) {
        // Die App selbst läuft unter https://localhost (ohne Port) -> nicht anfassen
        const isAppOrigin = /^https:\/\/localhost(?=\/|$)/i.test(url);
        if (isAppOrigin) {
            const path = url.replace(LOCAL_HOST_RE, '') || '/';
            return /^\/(api|downloads|uploads|_)\//.test(path) ? `${PROD_ORIGIN}${path}` : url;
        }
        const path = url.replace(LOCAL_HOST_RE, '') || '/';
        if (MICRO_PORT_RE.test(url)) {
            if (path.startsWith('/api/emails')) return `${PROD_ORIGIN}${path}`;
            if (path.startsWith('/api/')) return `${PROD_ORIGIN}/api/emails${path.slice(4)}`;
            return `${PROD_ORIGIN}/api/emails${path}`;
        }
        return `${PROD_ORIGIN}${path}`;
    }
    return url;
}

/**
 * window.open funktioniert im Android-WebView nicht zuverlässig. In der App wird jeder
 * externe Link (Google-Login, PDFs, Maps, WhatsApp, LexOffice ...) im System-Browser geöffnet.
 * Das zurückgegebene Pseudo-Fenster gilt als "geschlossen", sobald die App wieder im Vordergrund ist
 * (nötig für den Google-OAuth-Ablauf, der danach den Verbindungsstatus abfragt).
 */
function installNativeWindowOpen(): void {
    const originalOpen = window.open.bind(window);
    window.open = ((url?: string | URL, target?: string, features?: string) => {
        const href = url ? (url instanceof URL ? url.toString() : String(url)) : '';
        if (!href || href.startsWith('blob:') || href.startsWith('data:') || href.startsWith('javascript:')) {
            return originalOpen(url as any, target, features);
        }
        const resolved = href.startsWith('/') && !href.startsWith('//') ? rewriteNativeUrl(href) : rewriteNativeUrl(href);
        const finalUrl = /^[a-z][a-z0-9+.-]*:/i.test(resolved) ? resolved : `${PROD_ORIGIN}/${resolved.replace(/^\/+/, '')}`;

        const fake: any = { closed: false, close() { fake.closed = true; }, focus() {}, blur() {}, location: { href: finalUrl } };
        let wasHidden = false;
        let listener: { remove: () => void } | null = null;
        CapApp.addListener('appStateChange', ({ isActive }) => {
            if (!isActive) wasHidden = true;
            else if (wasHidden) { fake.closed = true; listener?.remove(); }
        }).then((h) => { listener = h; }).catch(() => {});

        Browser.open({ url: finalUrl }).catch(() => {
            try { originalOpen(finalUrl, '_system'); } catch { /* ignorieren */ }
            fake.closed = true;
        });
        return fake as Window;
    }) as typeof window.open;
}

/**
 * Installiert einmalig einen fetch-Wrapper, damit ALLE API-Aufrufe
 * (LexOffice, Google, Mail, KI, Portal, PocketBase ...) in der APK den Server erreichen.
 */
export function installNativeApiShim(): void {
    if (typeof window === 'undefined' || !Capacitor.isNativePlatform()) return;
    if (typeof window.fetch !== 'function') return;
    const w = window as any;
    if (w.__orgaNativeShim) return;
    w.__orgaNativeShim = true;
    installNativeWindowOpen();

    const originalFetch = window.fetch.bind(window);
    window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
        try {
            if (typeof input === 'string') {
                return originalFetch(rewriteNativeUrl(input), init);
            }
            if (input instanceof URL) {
                return originalFetch(rewriteNativeUrl(input.toString()), init);
            }
            if (typeof Request !== 'undefined' && input instanceof Request) {
                const next = rewriteNativeUrl(input.url);
                if (next !== input.url) return originalFetch(new Request(next, input), init);
            }
        } catch (e) {
            console.warn('[NativeApiShim] URL-Umschreibung fehlgeschlagen:', e);
        }
        return originalFetch(input as any, init);
    }) as typeof window.fetch;
}

installNativeApiShim();
