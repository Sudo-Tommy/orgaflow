import { Preferences } from '@capacitor/preferences';
import { App } from '@capacitor/app';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { NativeBiometric } from '@capgo/capacitor-native-biometric';
import { pb } from '$lib/services/pocketbase';

const PREF_BIOMETRIC_KEY = 'orga_biometric_lock_enabled';
const PREF_PIN_HASH_KEY = 'orga_app_pin_hash';
const PREF_TIMEOUT_KEY = 'orga_lock_timeout_sec';
const PREF_USE_BIOMETRY_KEY = 'orga_use_device_biometry';

interface AppSecurityPlugin {
    setScreenProtection(options: { enabled: boolean }): Promise<void>;
}

const AppSecurity = registerPlugin<AppSecurityPlugin>('AppSecurity');

async function sha256(text: string): Promise<string> {
    const data = new TextEncoder().encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
}

/**
 * Verwaltet App-Sperre mit Fingerabdruck/Gesichtserkennung, PIN-Rückfall und konfigurierbarer Sperrzeit.
 */
class BiometricService {
    private isEnabled = false;
    private isLockedState = false;
    private initialized = false;
    private useBiometry = true;
    private timeoutSec = 0;
    private backgroundedAt: number | null = null;
    private onLockChangeCb: ((locked: boolean) => void) | null = null;

    async init(): Promise<void> {
        if (this.initialized || typeof window === 'undefined') return;
        this.initialized = true;

        try {
            const [{ value: enabledVal }, { value: timeoutVal }, { value: bioVal }] = await Promise.all([
                Preferences.get({ key: PREF_BIOMETRIC_KEY }),
                Preferences.get({ key: PREF_TIMEOUT_KEY }),
                Preferences.get({ key: PREF_USE_BIOMETRY_KEY })
            ]);

            this.isEnabled = enabledVal === 'true';
            this.useBiometry = bioVal !== 'false';

            const userRec: any = pb.authStore.record || pb.authStore.model;
            if (typeof userRec?.lock_timeout_sec === 'number') {
                this.timeoutSec = Math.max(0, userRec.lock_timeout_sec);
            } else if (timeoutVal) {
                this.timeoutSec = Math.max(0, Number(timeoutVal) || 0);
            }

            if (this.isEnabled) {
                this.isLockedState = true;
                this.syncScreenProtection(true);
            }

            if (Capacitor.isNativePlatform()) {
                App.addListener('appStateChange', (state) => {
                    if (!this.isEnabled) return;
                    if (!state.isActive) {
                        this.backgroundedAt = Date.now();
                        if (this.timeoutSec === 0) {
                            this.setLocked(true);
                        }
                    } else if (this.timeoutSec > 0 && this.backgroundedAt !== null) {
                        const elapsedSec = (Date.now() - this.backgroundedAt) / 1000;
                        this.backgroundedAt = null;
                        if (elapsedSec >= this.timeoutSec) {
                            this.setLocked(true);
                        }
                    } else {
                        this.backgroundedAt = null;
                    }
                });
            }
        } catch (e) {
            console.warn('Biometrie-Status konnte nicht geladen werden:', e);
        }
    }

    onLockChange(cb: (locked: boolean) => void): void {
        this.onLockChangeCb = cb;
    }

    private setLocked(locked: boolean): void {
        this.isLockedState = locked;
        if (!locked) this.backgroundedAt = null;
        this.onLockChangeCb?.(locked);
    }

    private async syncScreenProtection(enabled: boolean): Promise<void> {
        if (!Capacitor.isNativePlatform()) return;
        try {
            await AppSecurity.setScreenProtection({ enabled });
        } catch {
            // Optionales natives Plugin
        }
    }

    get isLockActive(): boolean {
        return this.isEnabled && this.isLockedState;
    }

    get isConfigured(): boolean {
        return this.isEnabled;
    }

    get lockTimeoutSeconds(): number {
        return this.timeoutSec;
    }

    get biometryPreferred(): boolean {
        return this.useBiometry;
    }

    async isBiometryHardwareAvailable(): Promise<boolean> {
        if (!Capacitor.isNativePlatform()) return false;
        try {
            const res = await NativeBiometric.isAvailable({ useFallback: false });
            return Boolean(res?.isAvailable);
        } catch {
            return false;
        }
    }

    async authenticateBiometric(): Promise<boolean> {
        if (!Capacitor.isNativePlatform() || !this.useBiometry) return false;
        try {
            const available = await this.isBiometryHardwareAvailable();
            if (!available) return false;
            await NativeBiometric.verifyIdentity({
                title: 'Seniorenassistenz entsperren',
                subtitle: 'Biometrische Sicherheitsabfrage',
                reason: 'Bitte per Fingerabdruck oder Gesicht bestätigen',
                negativeButtonText: 'PIN verwenden',
                useFallback: false,
                maxAttempts: 3
            });
            this.setLocked(false);
            return true;
        } catch {
            return false;
        }
    }

    async setEnabled(enabled: boolean): Promise<void> {
        this.isEnabled = enabled;
        await Preferences.set({ key: PREF_BIOMETRIC_KEY, value: enabled ? 'true' : 'false' });
        await this.syncScreenProtection(enabled);
        if (!enabled) this.setLocked(false);
    }

    async setBiometryPreferred(useBio: boolean): Promise<void> {
        this.useBiometry = useBio;
        await Preferences.set({ key: PREF_USE_BIOMETRY_KEY, value: useBio ? 'true' : 'false' });
    }

    async setTimeoutSeconds(seconds: number): Promise<void> {
        this.timeoutSec = Math.max(0, Math.round(seconds));
        await Preferences.set({ key: PREF_TIMEOUT_KEY, value: String(this.timeoutSec) });
        const user: any = pb.authStore.record || pb.authStore.model;
        if (user?.id && !pb.authStore.isSuperuser) {
            try {
                const updated = await pb.collection('users').update(user.id, { lock_timeout_sec: this.timeoutSec });
                pb.authStore.save(pb.authStore.token, updated);
            } catch {
                // Lokal bereits gesichert
            }
        }
    }

    async hasPin(): Promise<boolean> {
        const { value } = await Preferences.get({ key: PREF_PIN_HASH_KEY });
        return Boolean(value);
    }

    async setPin(pin: string): Promise<void> {
        const hashHex = await sha256(pin);
        await Preferences.set({ key: PREF_PIN_HASH_KEY, value: hashHex });
    }

    async verifyPin(pin: string): Promise<boolean> {
        try {
            const { value } = await Preferences.get({ key: PREF_PIN_HASH_KEY });
            if (!value) {
                this.setLocked(false);
                return true;
            }
            const hashHex = await sha256(pin);
            if (hashHex === value) {
                this.setLocked(false);
                return true;
            }
            return false;
        } catch {
            return false;
        }
    }

    unlock(): void {
        this.setLocked(false);
    }
}

export const biometricService = new BiometricService();
