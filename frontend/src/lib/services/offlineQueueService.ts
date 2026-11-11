import { offlineDb, processSyncQueue, queueOfflineMutation } from './offlineDb';
import type { OfflineQueueItem } from '$lib/types/pocketbase';

export interface QueuedSignaturePayload {
    clientId: string;
    signatureDataUrl: string;
    documentType?: string;
    targetField?: string;
    meta?: Record<string, any>;
}

/**
 * Service zur Verwaltung und Absicherung von Offline-Signaturen und kritischen Formularen.
 * Nutzt die lokale IndexedDB (Dexie) als Ausfallsicherung bei Funkloechern im Aussendienst.
 */
class OfflineQueueService {
    private isDraining = false;

    /**
     * Speichert eine digitale Klienten-Unterschrift bei Verbindungsabbruch sicher lokal ab.
     */
    async queueSignature(payload: QueuedSignaturePayload): Promise<void> {
        if (!offlineDb) return;
        const queueItem: OfflineQueueItem = {
            id: `sig_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            collection: 'clients',
            action: 'update',
            recordId: payload.clientId,
            data: {
                [payload.targetField || 'sign']: payload.signatureDataUrl,
                _offline_meta: {
                    savedAt: new Date().toISOString(),
                    documentType: payload.documentType || 'standard',
                    ...payload.meta
                }
            },
            timestamp: Date.now(),
            retryCount: 0
        };
        await offlineDb.syncQueue.put(queueItem);
        console.info(`[OfflineQueue] Unterschrift fuer Klient ${payload.clientId} lokal zwischengespeichert.`);
    }

    /**
     * Speichert eine beliebige Formulardaten-Aktion in der Offline-Queue.
     */
    async queueAction(
        collection: string,
        action: 'create' | 'update' | 'delete',
        data?: any,
        recordId?: string
    ): Promise<void> {
        await queueOfflineMutation(collection, action, recordId, data);
    }

    /**
     * Ermittelt die Anzahl ausstehender Offline-Aktionen.
     */
    async getPendingCount(): Promise<number> {
        if (!offlineDb) return 0;
        try {
            return await offlineDb.syncQueue.count();
        } catch {
            return 0;
        }
    }

    /**
     * Uebertragt alle lokal gepufferten Aktionen an das Backend (PocketBase / Microservice).
     */
    async drainQueue(): Promise<{ processed: number; failed: number }> {
        if (this.isDraining) return { processed: 0, failed: 0 };
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
            return { processed: 0, failed: 0 };
        }

        this.isDraining = true;
        try {
            const result = await processSyncQueue();
            if (result.processed > 0) {
                console.info(`[OfflineQueue] ${result.processed} Aktionen erfolgreich synchronisiert.`);
            }
            return result;
        } finally {
            this.isDraining = false;
        }
    }

    /**
     * Holt alle aktuell wartenden Warteschlangen-Elemente (z. B. fuer Status-Badges).
     */
    async getPendingItems(): Promise<OfflineQueueItem[]> {
        if (!offlineDb) return [];
        try {
            return await offlineDb.syncQueue.orderBy('timestamp').toArray();
        } catch {
            return [];
        }
    }
}

export const offlineQueueService = new OfflineQueueService();

