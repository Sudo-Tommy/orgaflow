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
        // Native Push-Benachrichtigungen via FCM erfordern zwingend eine gültige google-services.json.
        // Da kein Firebase-Projekt im Build hinterlegt ist, darf PushNotifications.register()
        // keinesfalls nativ aufgerufen werden, da Android andernfalls hart mit IllegalStateException abstürzt.
        console.info('Native FCM Push deaktiviert (keine google-services.json konfiguriert).');
        return false;
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
