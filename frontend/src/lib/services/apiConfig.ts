import { Capacitor } from '@capacitor/core';
import { dev } from '$app/environment';

export const PROD_ORIGIN = 'https://www.ihre-seniorenassistenz.com';

/**
 * Prüft, ob die Anwendung nativ auf Android oder iOS (Capacitor Container) läuft.
 */
export function isNativeApp(): boolean {
    if (typeof window === 'undefined') return false;
    return Capacitor.isNativePlatform() || Boolean((window as any).Capacitor?.isNativePlatform?.());
}

/**
 * Liefert den korrekten URL-Präfix für API- und Backend-Endpunkte.
 * Verhindert auf mobilen Endgeräten den fatalen Fehler 'connection refused' auf localhost.
 */
export function getApiBaseUrl(path: string = ''): string {
    const cleanPath = path ? (path.startsWith('/') ? path : `/${path}`) : '';

    // 1. Native mobile App (Android APK / iOS)
    if (isNativeApp()) {
        return `${PROD_ORIGIN}${cleanPath}`;
    }

    // 2. Lokale Entwicklung
    if (dev) {
        if (cleanPath.startsWith('/api/emails')) {
            return `http://127.0.0.1:3000${cleanPath}`;
        }
        return cleanPath;
    }

    // 3. Web-Produktion
    if (typeof window !== 'undefined' && window.location.hostname.includes('ihre-seniorenassistenz.com')) {
        return cleanPath;
    }

    // 4. Externer LAN-Zugriff (z.B. Test per IP 192.168.x.x)
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        return `${PROD_ORIGIN}${cleanPath}`;
    }

    return cleanPath;
}

/**
 * Liefert die URL für den Node.js E-Mail- und Dokumenten-Microservice.
 */
export function getMicroserviceUrl(subpath: string = ''): string {
    const cleanSub = subpath ? (subpath.startsWith('/') ? subpath : `/${subpath}`) : '';
    return getApiBaseUrl(`/api/emails${cleanSub}`);
}

/**
 * Ermittelt eine Basis-URL für den Microservice (ohne Pfad), die z.B. vor /api/emails/... gehängt werden kann.
 * Auf nativen Mobilgeräten: https://www.ihre-seniorenassistenz.com
 * Lokal im dev: http://localhost:3000
 * Im Web: ''
 */
export function getMicroserviceHost(): string {
    if (isNativeApp()) {
        return PROD_ORIGIN;
    }
    if (dev) {
        return 'http://localhost:3000';
    }
    return '';
}
