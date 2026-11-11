/**
 * feedbackCaptureService.ts
 * 
 * Dienst für hochpräzise Bildschirm- und Modulkontext-Erfassung in OrgaFlow.
 * Unterstützt intelligente Aufnahmen (echte Pixel-Screenshots auf Desktops,
 * farb- und themenbereinigter DOM-Snapshot als Fallback und auf Mobilgeräten).
 */

import { isMobileDevice, normalizeClonedDocument } from './feedbackCanvasUtils';

export * from './feedbackCanvasUtils';

export interface CapturedContext {
    activeModal: string | null;
    currentPath: string;
    viewport: { width: number; height: number };
    timestamp: string;
    userAgent: string;
}

/**
 * Ermittelt den aktuellen Kontext, insbesondere wenn ein modaler Dialog geöffnet ist.
 */
export function getOpenDialogContext(): CapturedContext {
    if (typeof window === 'undefined') {
        return {
            activeModal: null,
            currentPath: '',
            viewport: { width: 0, height: 0 },
            timestamp: new Date().toISOString(),
            userAgent: ''
        };
    }

    let activeModalTitle: string | null = null;
    const dialogs = Array.from(document.querySelectorAll<HTMLDialogElement>('dialog[open]'))
        .filter(d => d.id !== 'feedback-dialog');

    if (dialogs.length > 0) {
        const topDialog = dialogs[dialogs.length - 1];
        const heading = topDialog.querySelector('h1, h2, h3, [role="heading"]');
        if (heading && heading.textContent?.trim()) {
            activeModalTitle = heading.textContent.trim().replace(/\s+/g, ' ');
        } else {
            activeModalTitle = topDialog.getAttribute('aria-label') || 'Geöffneter Modaldialog';
        }
    } else {
        const customModal = document.querySelector('[role="dialog"]:not(#feedback-dialog)');
        if (customModal) {
            const heading = customModal.querySelector('h1, h2, h3, [role="heading"]');
            if (heading && heading.textContent?.trim()) {
                activeModalTitle = heading.textContent.trim().replace(/\s+/g, ' ');
            }
        }
    }

    return {
        activeModal: activeModalTitle,
        currentPath: window.location.pathname + window.location.search,
        viewport: {
            width: window.innerWidth,
            height: window.innerHeight
        },
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent
    };
}

/**
 * Erstellt einen echten Pixel-Screenshot des aktuellen Browser-Tabs via Screen Capture API.
 */
export async function captureRealScreen(): Promise<string> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices || typeof navigator.mediaDevices.getDisplayMedia !== 'function') {
        throw new Error('Die native Bildschirmaufnahme wird von diesem Browser nicht unterstützt.');
    }

    // @ts-ignore preferCurrentTab & selfBrowserSurface sind Teil des modernen WHATWG-Standards
    const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: 'browser' },
        audio: false,
        preferCurrentTab: true,
        selfBrowserSurface: 'include',
        systemAudio: 'exclude',
        surfaceSwitching: 'include'
    } as any);

    try {
        const video = document.createElement('video');
        video.srcObject = stream;
        video.autoplay = true;
        video.muted = true;
        video.playsInline = true;

        await new Promise<void>((resolve, reject) => {
            const checkReady = () => {
                if (video.videoWidth > 0 && video.videoHeight > 0) {
                    setTimeout(resolve, 60);
                } else {
                    requestAnimationFrame(checkReady);
                }
            };
            video.onloadedmetadata = () => {
                video.play().then(() => checkReady()).catch(reject);
            };
            video.onerror = (e) => reject(e);
            setTimeout(() => resolve(), 1200);
        });

        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || window.innerWidth;
        canvas.height = video.videoHeight || window.innerHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas 2D-Kontext nicht verfügbar.');

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/png');
    } finally {
        stream.getTracks().forEach(track => track.stop());
    }
}

/**
 * Erstellt einen themen- und farbbereinigten DOM-Snapshot ohne UI-Artefakte.
 */
export async function captureFallbackDom(): Promise<string> {
    const html2canvasModule = await import('html2canvas-pro');
    const html2canvas = html2canvasModule.default || html2canvasModule;

    const toastEl = document.getElementById('global-toast-container');
    const floatBtn = document.getElementById('feedback-widget-button');
    const prevToastVis = toastEl ? toastEl.style.visibility : '';
    const prevBtnVis = floatBtn ? floatBtn.style.visibility : '';

    if (toastEl) toastEl.style.visibility = 'hidden';
    if (floatBtn) floatBtn.style.visibility = 'hidden';

    const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
    const rootBg = isDark ? '#090d16' : '#ffffff';

    try {
        const targetRoot = document.documentElement || document.body;
        const canvas = await html2canvas(targetRoot, {
            width: window.innerWidth,
            height: window.innerHeight,
            scale: Math.min(window.devicePixelRatio || 1, 2),
            useCORS: true,
            allowTaint: true,
            logging: false,
            backgroundColor: rootBg,
            scrollX: window.scrollX,
            scrollY: window.scrollY,
            onclone: (clonedDoc: Document) => {
                normalizeClonedDocument(clonedDoc);
            },
            ignoreElements: (element: Element) => {
                if (element.id === 'feedback-widget-button' || element.closest?.('#feedback-widget-button')) return true;
                if (element.id === 'feedback-dialog' || element.closest?.('#feedback-dialog')) return true;
                if (element.id === 'global-toast-container' || element.closest?.('#global-toast-container')) return true;
                if (element.hasAttribute?.('data-feedback-ignore') || element.closest?.('[data-feedback-ignore]')) return true;
                return false;
            }
        });
        return canvas.toDataURL('image/png');
    } finally {
        if (toastEl) toastEl.style.visibility = prevToastVis;
        if (floatBtn) floatBtn.style.visibility = prevBtnVis;
    }
}

/**
 * Intelligente Screenshot-Erfassung:
 * - Desktop: Echter Pixel-Screenshot (GPU-Puffercapture) mit automatischem DOM-Fallback
 * - Mobilgeräte: Direkter DOM-Snapshot mit Farb- und Themennormalisierung
 */
export async function captureSmartFeedbackScreen(): Promise<string> {
    if (!isMobileDevice() && typeof navigator !== 'undefined' && navigator.mediaDevices && typeof navigator.mediaDevices.getDisplayMedia === 'function') {
        try {
            return await captureRealScreen();
        } catch (err: any) {
            console.info('Echte Bildschirmaufnahme nicht genutzt oder abgebrochen, nutze DOM-Snapshot:', err);
            return await captureFallbackDom();
        }
    }
    return await captureFallbackDom();
}
