import { Preferences } from '@capacitor/preferences';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

const PREF_BIOMETRIC_KEY = 'orga_biometric_lock_enabled';
const PREF_PIN_HASH_KEY = 'orga_app_pin_hash';

/**
 * Verwaltet die optionale App-Sperre (Biometrie / PIN) beim Öffnen oder Reaktivieren.
 */
class BiometricService {
    private isEnabled = false;
    private isLockedState = false;
    private initialized = false;

    async init(): Promise<void> {
        if (this.initialized || typeof window === 'undefined') return;
        this.initialized = true;

        try {
            const { value } = await Preferences.get({ key: PREF_BIOMETRIC_KEY });
            this.isEnabled = value === 'true';

            if (this.isEnabled) {
                // Bei App-Start sperren
                this.isLockedState = true;
            }

            // Beim Reaktivieren der App aus dem Hintergrund prüfen
            if (Capacitor.isNativePlatform()) {
                App.addListener('appStateChange', (state) => {
                    if (!state.isActive && this.isEnabled) {
                        this.isLockedState = true;
                    }
                });
            }
        } catch (e) {
            console.warn('Biometrie-Status konnte nicht geladen werden:', e);
        }
    }

    get isLockActive(): boolean {
        return this.isEnabled && this.isLockedState;
    }

    get isConfigured(): boolean {
        return this.isEnabled;
    }

    async setEnabled(enabled: boolean): Promise<void> {
        this.isEnabled = enabled;
        await Preferences.set({
            key: PREF_BIOMETRIC_KEY,
            value: enabled ? 'true' : 'false'
        });
        if (!enabled) {
            this.isLockedState = false;
        }
    }

    async setPin(pin: string): Promise<void> {
        // Einfacher Hash zum Vergleichen des PINs
        const encoder = new TextEncoder();
        const data = encoder.encode(pin);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        await Preferences.set({ key: PREF_PIN_HASH_KEY, value: hashHex });
    }

    async verifyPin(pin: string): Promise<boolean> {
        try {
            const { value } = await Preferences.get({ key: PREF_PIN_HASH_KEY });
            if (!value) {
                this.isLockedState = false;
                return true;
            }
            const encoder = new TextEncoder();
            const data = encoder.encode(pin);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

            if (hashHex === value) {
                this.isLockedState = false;
                return true;
            }
            return false;
        } catch (e) {
            return false;
        }
    }

    unlock(): void {
        this.isLockedState = false;
    }
}

export const biometricService = new BiometricService();
