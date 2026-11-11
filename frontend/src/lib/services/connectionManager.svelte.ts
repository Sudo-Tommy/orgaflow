import { pb } from './pocketbase';
import { orgaStore } from '$lib/stores/orgaStore.svelte';
import { offlineQueueService } from './offlineQueueService';

/**
 * Zentraler Verbindungs- und Standby-Manager (Mobile Resilienz).
 * Erkennt Funkloecher, Standby-Erwachen und Netzwechsel auf Smartphones/Tablets
 * und reaktiviert SSE-Realtime-Streams sowie die Authentifizierung automatisch.
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

        window.addEventListener('online', this.handleOnline.bind(this));
        window.addEventListener('offline', this.handleOffline.bind(this));
        document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));

        // Initialen Stand der Queue pruefen
        this.updatePendingCount();
    }

    private handleOnline() {
        this.isOnline = true;
        this.lastOnlineAt = Date.now();
        console.info('[ConnectionManager] Verbindung wiederhergestellt (online).');
        this.scheduleReconnect(300);
    }

    private handleOffline() {
        this.isOnline = false;
        console.warn('[ConnectionManager] Keine Internetverbindung (offline).');
        this.updatePendingCount();
    }

    private handleVisibilityChange() {
        if (document.visibilityState === 'visible') {
            const timeSinceLastOnline = this.lastOnlineAt ? Date.now() - this.lastOnlineAt : 0;
            // Nach mehr als 30 Sekunden Standby oder wenn offline war, Reconnect ausfuehren
            if (timeSinceLastOnline > 30000 || !this.isOnline) {
                console.info('[ConnectionManager] App aus Standby erwacht. Pruefe Verbindungen...');
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

    /**
     * Fuehrt eine vollstaendige Wiederverbindungs- und Synchronisations-Sequenz aus.
     */
    async reconnect() {
        if (this.isReconnecting || typeof navigator === 'undefined' || !navigator.onLine) {
            return;
        }

        this.isReconnecting = true;
        try {
            // 1. PocketBase Auth validieren/auffrischen
            if (pb.authStore.isValid && pb.authStore.record) {
                try {
                    const collName = pb.authStore.record.collectionName || 'users';
                    await pb.collection(collName).authRefresh({ expand: 'company' });
                } catch (authErr: any) {
                    if (authErr?.status === 401 || authErr?.status === 403) {
                        console.warn('[ConnectionManager] Session abgelaufen oder ungueltig.');
                    }
                }
            }

            // 2. Abgerissene Realtime-Verbindungen & Sammlungen frisch synchronisieren
            const stores = Object.values(orgaStore);
            for (const store of stores) {
                if (typeof (store as any).init === 'function') {
                    // forceRefresh = true, um Realtime-Sub neu aufzubauen
                    (store as any).init(true).catch(() => {});
                }
            }

            // 3. Offline-Warteschlange (z.B. Signaturen) leeren
            const drainRes = await offlineQueueService.drainQueue();
            if (drainRes.processed > 0) {
                console.info(`[ConnectionManager] ${drainRes.processed} Offline-Vorgaenge nach Standby synchronisiert.`);
            }

            this.isOnline = true;
            this.lastOnlineAt = Date.now();
        } catch (err) {
            console.warn('[ConnectionManager] Reconnect-Versuch fehlgeschlagen:', err);
        } finally {
            this.isReconnecting = false;
            this.updatePendingCount();
        }
    }

    async updatePendingCount() {
        this.pendingCount = await offlineQueueService.getPendingCount();
    }
}

export const connectionManager = new ConnectionManager();

