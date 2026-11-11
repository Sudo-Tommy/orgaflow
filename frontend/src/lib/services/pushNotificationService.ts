import { PushNotifications, type Token, type ActionPerformed } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { pb } from '$lib/services/pocketbase';
import { goto } from '$app/navigation';

/**
 * Service für native und Web-Push-Benachrichtigungen.
 * Registriert das Endgerät und speichert die Subskription in PocketBase.
 */
class PushNotificationService {
    private registered = false;

    /**
     * Initialisiert Push-Benachrichtigungen und erbittet Berechtigung.
     */
    async registerDevice(): Promise<boolean> {
        if (this.registered || typeof window === 'undefined') return false;

        if (Capacitor.isNativePlatform()) {
            return this.registerNativePush();
        } else {
            return this.registerWebPush();
        }
    }

    private async registerNativePush(): Promise<boolean> {
        try {
            // Push-Notifications erfordern Firebase (google-services.json).
            // Wenn diese Datei fehlt, wirft der Android-Native-Code beim Aufruf von register()
            // eine nicht abfangbare NullPointerException / IllegalStateException, die die App beendet.
            let perm = await PushNotifications.checkPermissions();
            if (perm.receive !== 'granted') {
                perm = await PushNotifications.requestPermissions();
            }

            if (perm.receive !== 'granted') {
                return false;
            }

            PushNotifications.addListener('registration', async (token: Token) => {
                this.registered = true;
                await this.saveTokenToPocketBase(token.value, 'native');
            });

            PushNotifications.addListener('registrationError', (error: any) => {
                console.warn('Native Push-Registrierung fehlgeschlagen:', error);
            });

            PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
                const data = action.notification.data;
                if (data?.url) {
                    goto(data.url);
                } else if (data?.appointmentId) {
                    goto('/appointments');
                }
            });

            try {
                await PushNotifications.register();
            } catch (regErr) {
                console.warn('PushNotifications.register abgefangen (Firebase evtl. unkonfiguriert):', regErr);
            }

            return true;
        } catch (error) {
            console.warn('Native Push-Notifications nicht verfügbar:', error);
            return false;
        }
    }

    private async registerWebPush(): Promise<boolean> {
        if (!('Notification' in window) || !('serviceWorker' in navigator)) {
            return false;
        }

        try {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') return false;

            const registration = await navigator.serviceWorker.ready;
            const sub = await registration.pushManager.getSubscription();
            if (sub) {
                await this.saveTokenToPocketBase(JSON.stringify(sub), 'web');
                this.registered = true;
                return true;
            }
            return false;
        } catch (e) {
            console.warn('Web-Push Registrierung fehlgeschlagen:', e);
            return false;
        }
    }

    private async saveTokenToPocketBase(token: string, platform: 'native' | 'web'): Promise<void> {
        const userId = pb.authStore.record?.id || (pb.authStore.model as any)?.id;
        if (!userId) return;

        try {
            // Prüfen ob bereits eingetragen
            const existing = await pb.collection('push_subscriptions').getList(1, 1, {
                filter: `user = "${userId}" && token = "${token}"`
            });

            if (existing.items.length === 0) {
                await pb.collection('push_subscriptions').create({
                    user: userId,
                    token,
                    platform,
                    device_name: navigator.userAgent.slice(0, 80),
                    active: true
                });
            }
        } catch (e) {
            // Kollektion existiert evtl. noch nicht serverseitig - still abfangen
            console.info('Push-Token konnte nicht in DB hinterlegt werden:', e);
        }
    }
}

export const pushNotificationService = new PushNotificationService();
