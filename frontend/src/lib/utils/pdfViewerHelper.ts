import { Capacitor } from '@capacitor/core';
import { toastStore } from '$lib/services/toastService.svelte';
import { pb } from '$lib/services/pocketbase';
import { PROD_ORIGIN, isNativeApp } from '$lib/services/apiConfig';

/**
 * Löst relative Pfade in absolute URLs auf und ergänzt bei Bedarf das PocketBase Auth-Token.
 */
export function getAbsoluteFileUrl(url: string | null | undefined): string {
    if (!url || typeof url !== 'string') return '';
    if (url.startsWith('blob:') || url.startsWith('data:')) return url;

    let absoluteUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        const cleanPath = url.startsWith('/') ? url : `/${url}`;
        if (typeof window !== 'undefined' && !window.location.hostname.includes('ihre-seniorenassistenz.com')) {
            absoluteUrl = `${PROD_ORIGIN}${cleanPath}`;
        } else if (typeof window !== 'undefined') {
            absoluteUrl = `${window.location.origin}${cleanPath}`;
        } else {
            absoluteUrl = `${PROD_ORIGIN}${cleanPath}`;
        }
    }

    // Auth-Token anhängen, falls geschützte PocketBase-Datei
    if (pb?.authStore?.token && absoluteUrl.includes('/api/files/') && !absoluteUrl.includes('token=')) {
        const separator = absoluteUrl.includes('?') ? '&' : '?';
        absoluteUrl = `${absoluteUrl}${separator}token=${pb.authStore.token}`;
    }

    return absoluteUrl;
}

/**
 * Öffnet ein PDF zuverlässig auf allen Plattformen:
 * - Nativ auf Android/iOS: Übergabe an den nativen Android Intent Viewer via '_system'
 * - Web/Desktop: Öffnen im neuen Tab
 */
export function openPdfDocument(url: string | null | undefined, title?: string): void {
    if (!url) {
        toastStore.error('Kein Dokument vorhanden.');
        return;
    }

    const targetUrl = getAbsoluteFileUrl(url);

    // 1. Native mobile Plattform (Capacitor Android APK)
    if (isNativeApp()) {
        try {
            // '_system' öffnet den Android-System-Dialog (Chrome, Google PDF Viewer, Adobe)
            window.open(targetUrl, '_system');
            toastStore.info('Dokument wird geöffnet...');
            return;
        } catch (e) {
            console.warn('Fehler bei nativem PDF-Intent:', e);
        }
    }

    // 2. Mobiler Webbrowser
    const isMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile) {
        window.open(targetUrl, '_blank');
        return;
    }

    // 3. Desktop Webbrowser
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
}

/**
 * Erzeugt eine URL für den Google Docs Embedded Viewer für mobile In-App Voransichten.
 */
export function getGoogleDocsViewerUrl(url: string): string {
    const abs = getAbsoluteFileUrl(url);
    return `https://docs.google.com/viewer?embedded=true&url=${encodeURIComponent(abs)}`;
}
