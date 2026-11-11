import { pb } from '$lib/services/pocketbase';
import { orgaStore } from '$lib/stores/orgaStore.svelte';
import { toastStore } from '$lib/services/toastService.svelte';
import { impersonationService } from '$lib/services/impersonationService.svelte';

export class EmployeeTokenService {
    /**
     * Generiert einen kryptografisch sicheren QR-Code-Zugangslink mit konfigurierbarer Gültigkeit
     */
    async generateQuickAccessToken(employeeId: string, validityHours: number = 168): Promise<{ token: string; expiresAt: string; directUrl: string } | null> {
        try {
            const randomBytes = new Uint8Array(24);
            if (typeof window !== 'undefined' && window.crypto) {
                window.crypto.getRandomValues(randomBytes);
            } else {
                for (let i = 0; i < 24; i++) randomBytes[i] = Math.floor(Math.random() * 256);
            }
            const token = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');

            let expiresAtIso: string | null = null;
            if (validityHours > 0) {
                const d = new Date(Date.now() + validityHours * 3600 * 1000);
                expiresAtIso = d.toISOString();
            }

            await pb.collection('users').update(employeeId, {
                quick_access_token: token,
                token_expires_at: expiresAtIso
            });

            const origin = typeof window !== 'undefined' ? window.location.origin : '';
            const directUrl = `${origin}/mitarbeiter?token=${encodeURIComponent(token)}`;

            await orgaStore.users.init();
            toastStore.success('QR-Code-Zugang erfolgreich generiert.');
            return {
                token: token,
                expiresAt: expiresAtIso || '',
                directUrl: directUrl
            };
        } catch (err: any) {
            console.error('Fehler beim Erzeugen des QR-Tokens:', err);
            toastStore.error(err?.message || 'Token-Generierung fehlgeschlagen.');
            return null;
        }
    }

    /**
     * Widerruft den Schnellzugang eines Mitarbeiters sofort
     */
    async revokeQuickAccessToken(employeeId: string): Promise<boolean> {
        try {
            await pb.collection('users').update(employeeId, {
                quick_access_token: '',
                token_expires_at: null
            });

            await orgaStore.users.init();
            toastStore.info('QR-Zugang wurde erfolgreich widerrufen.');
            return true;
        } catch (err: any) {
            console.error('Fehler beim Widerrufen des Tokens:', err);
            toastStore.error(err?.message || 'Widerruf fehlgeschlagen.');
            return false;
        }
    }

    /**
     * Führt den schnellen QR-Token-Login durch und speichert die Session
     */
    async loginWithQrToken(token: string): Promise<{ success: boolean; message?: string }> {
        try {
            const cleanToken = token.trim();
            const endpoints = [
                `/api/orgaflow/auth/employee-token?token=${encodeURIComponent(cleanToken)}`,
                '/api/emails/portal/employee-auth-token',
                '/api/auth/employee-token'
            ];

            let lastError = 'Ungültiger oder abgelaufener Token.';

            for (const ep of endpoints) {
                try {
                    const res = await fetch(ep, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ token: cleanToken })
                    });

                    if (res.ok) {
                        const data = await res.json();
                        if (data.token) {
                            impersonationService.clearSessionBackup();
                            pb.authStore.save(data.token, data.record || null);
                            return { success: true };
                        }
                    } else if (res.status !== 404) {
                        const data = await res.json().catch(() => null);
                        if (data?.message || data?.error) {
                            lastError = data.message || data.error;
                        }
                    }
                } catch {
                    // Weiter zum nächsten Endpunkt
                }
            }

            return { success: false, message: lastError };
        } catch (err: any) {
            console.error('QR Login Error:', err);
            return { success: false, message: err?.message || 'Netzwerkfehler beim Anmelden.' };
        }
    }
}

export const employeeTokenService = new EmployeeTokenService();
