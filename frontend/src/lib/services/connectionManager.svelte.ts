import { Capacitor } from '@capacitor/core';
import { Network } from '@capacitor/network';
import { pb } from './pocketbase';
import { orgaStore } from '$lib/stores/orgaStore.svelte';
import { offlineQueueService } from './offlineQueueService';
import { toastStore } from '$lib/services/toastService.svelte';

/**
 * Zentraler Verbindungs- und Standby-Manager (Mobile Resilienz).
 * Nutzt @capacitor/network + Browser-Events und synchronisiert Offline-Warteschlangen automatisch.
 */
class ConnectionManager {
    isOnline = $state(typeof navigator !== 'undefined' ? navigator.onLine : true);
    isReconnecting = $state(false);
    pendingCount = $state(0);
    lastOnlineAt = $state<number | null>(Date.now());

    private isInitialized = false;
    private reconnectTimeout: any = null;

    init() {
        if (this.isInitialized || typeof window === 'undefined') return;
        this.isInitialized = true;

        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());
        window.addEventListener('orga-offline-queue-changed', () => this.updatePendingCount());
        document.addEventListener('visibilitychange', () => this.handleVisibilityChange());

        if (Capacitor.isNativePlatform()) {
            Network.getStatus()
                .then((st) => {
                    this.isOnline = st.connected;
                    if (st.connected) this.scheduleReconnect(400);
                })
                .catch(() => {});

            Network.addListener('networkStatusChange', (st) => {
                if (st.connected && !this.isOnline) this.handleOnline();
                else if (!st.connected && this.isOnline) this.handleOffline();
                else this.isOnline = st.connected;
            }).catch(() => {});
        }

        this.updatePendingCount();
    }

    private handleOnline() {
        this.isOnline = true;
        this.lastOnlineAt = Date.now();
        this.scheduleReconnect(300);
    }

    private handleOffline() {
        this.isOnline = false;
        this.updatePendingCount();
    }

    private handleVisibilityChange() {
        if (document.visibilityState === 'visible') {
            const elapsed = this.lastOnlineAt ? Date.now() - this.lastOnlineAt : 0;
            if (elapsed > 30000 || !this.isOnline) {
                this.scheduleReconnect(500);
            }
        }
    }

    private scheduleReconnect(delayMs = 500) {
        if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = setTimeout(() => {
            this.reconnect();
        }, delayMs);
    }

    async reconnect() {
        if (this.isReconnecting || typeof navigator === 'undefined') return;
        if (Capacitor.isNativePlatform()) {
            try {
                const st = await Network.getStatus();
                this.isOnline = st.connected;
                if (!st.connected) return;
            } catch {}
        } else if (!navigator.onLine) {
            return;
        }

        this.isReconnecting = true;
        try {
            if (pb.authStore.isValid && pb.authStore.record) {
                try {
                    const collName = pb.authStore.record.collectionName || 'users';
                    await pb.collection(collName).authRefresh({ expand: 'company' });
                } catch {}
            }

            const drainRes = await offlineQueueService.drainQueue();
            if (drainRes.processed > 0) {
                toastStore.success(
                    drainRes.processed === 1
                        ? '1 Offline-Änderung erfolgreich gesendet.'
                        : `${drainRes.processed} Offline-Änderungen erfolgreich gesendet.`
                );
            }

            for (const store of Object.values(orgaStore)) {
                if (typeof (store as any).init === 'function') {
                    (store as any).init(true).catch(() => {});
                }
            }

            this.isOnline = true;
            this.lastOnlineAt = Date.now();
        } catch (err) {
            console.warn('[ConnectionManager] Reconnect-Versuch fehlgeschlagen:', err);
        } finally {
            this.isReconnecting = false;
            await this.updatePendingCount();
        }
    }

    async updatePendingCount() {
        this.pendingCount = await offlineQueueService.getPendingCount();
    }
}

export const connectionManager = new ConnectionManager();
