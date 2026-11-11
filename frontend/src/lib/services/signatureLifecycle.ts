import { ScreenOrientation } from '@capacitor/screen-orientation';
import { Capacitor } from '@capacitor/core';
import { backButtonHandler } from '$lib/services/backButtonHandler';
import { biometricService } from '$lib/services/biometricService';

export interface SignatureSessionOptions {
    onClose: () => void;
}

/**
 * Manages native orientation locking and hardware back-button registration
 * for fullscreen signature capture.
 * Returns a synchronous teardown function to restore orientation and clean up handlers.
 */
export function activateSignatureSession(options: SignatureSessionOptions): () => void {
    if (Capacitor.isNativePlatform()) {
        ScreenOrientation.lock({ orientation: 'landscape' }).catch(() => {});
    }

    const unregisterBack = backButtonHandler.register(() => {
        // Guard: Do not dismiss signature modal if biometric lock screen is active above it
        if (biometricService.isLockActive) {
            return false;
        }
        options.onClose();
        return true;
    });

    return () => {
        if (Capacitor.isNativePlatform()) {
            ScreenOrientation.unlock().catch(() => {});
        }
        unregisterBack();
    };
}
