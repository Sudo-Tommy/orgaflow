/**
 * hapticFeedback.ts
 * Zentraler Haptik-Dienst für mobile Touch-Interaktionen.
 * Bietet spürbare Bestätigung bei Gesten, Statusänderungen und Tastenbetätigung.
 * Inklusive dauerhaftem Einstellungs-Toggle (localStorage).
 */

const STORAGE_KEY = 'orgaflow_haptics_enabled';

// Standardmäßig aktiviert, wenn nicht explizit ausgeschaltet
let hapticsEnabled: boolean = true;

if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEY);
    hapticsEnabled = stored !== null ? stored === 'true' : true;
}

export function isHapticsActive(): boolean {
    return hapticsEnabled;
}

export function setHapticsActive(enabled: boolean): void {
    hapticsEnabled = enabled;
    if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false');
    }
}

export type HapticType = 'tap' | 'swipe' | 'success' | 'warning' | 'error' | 'selection' | 'info' | 'heavy';

export function triggerHaptic(type: HapticType = 'tap'): void {
    if (!hapticsEnabled) return;
    if (typeof window === 'undefined' || typeof navigator === 'undefined' || !('vibrate' in navigator)) {
        return;
    }

    try {
        switch (type) {
            case 'tap':
                navigator.vibrate(8);
                break;
            case 'swipe':
                navigator.vibrate(12);
                break;
            case 'selection':
            case 'info':
                navigator.vibrate(15);
                break;
            case 'success':
                navigator.vibrate([15, 30, 25]);
                break;
            case 'warning':
                navigator.vibrate([25, 40, 25]);
                break;
            case 'error':
                navigator.vibrate([60, 40, 60]);
                break;
            case 'heavy':
                navigator.vibrate(40);
                break;
        }
    } catch {
        // Ignorieren falls Browser-Restriktionen oder Berechtigungen fehlen
    }
}

export const hapticFeedback = {
    tap: () => triggerHaptic('tap'),
    swipe: () => triggerHaptic('swipe'),
    success: () => triggerHaptic('success'),
    warning: () => triggerHaptic('warning'),
    error: () => triggerHaptic('error'),
    selection: () => triggerHaptic('selection'),
    info: () => triggerHaptic('info'),
    heavy: () => triggerHaptic('heavy'),
    isActive: isHapticsActive,
    setActive: setHapticsActive
};

