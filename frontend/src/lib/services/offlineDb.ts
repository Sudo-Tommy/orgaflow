import Dexie, { type Table } from 'dexie';
import type { OfflineQueueItem, CachedRecord } from '$lib/types/pocketbase';
import { pb } from './pocketbase';

export class OrgaOfflineDatabase extends Dexie {
    cachedRecords!: Table<CachedRecord, string>;
    syncQueue!: Table<OfflineQueueItem, string>;

    constructor() {
        super('OrgaFlow_OfflineDB');
        this.version(1).stores({
            cachedRecords: 'id, collection, cachedAt, updatedAt',
            syncQueue: 'id, collection, timestamp, retryCount'
        });
    }
}

export const offlineDb: OrgaOfflineDatabase | null = 
    typeof window !== 'undefined' ? new OrgaOfflineDatabase() : null;

export async function getCachedCollection<T>(collection: string): Promise<T[]> {
    if (!offlineDb) return [];
    try {
        const rows = await offlineDb.cachedRecords.where('collection').equals(collection).toArray();
        return rows.map(r => r.data as T);
    } catch {
        return [];
    }
}

function toCloneable<T>(val: T): T {
    if (!val || typeof val !== 'object') return val;
    try {
        return JSON.parse(JSON.stringify(val));
    } catch {
        const copy: any = {};
        for (const [k, v] of Object.entries(val as any)) {
            if (typeof v !== 'function' && typeof v !== 'symbol') {
                try {
                    copy[k] = JSON.parse(JSON.stringify(v));
                } catch {
                    copy[k] = String(v);
                }
            }
        }
        return copy;
    }
}

export async function setCachedCollection<T extends { id: string; updated?: string }>(
    collection: string,
    items: T[]
): Promise<void> {
    if (!offlineDb || !items.length) return;
    try {
        const now = Date.now();
        const records: CachedRecord<T>[] = items.map(item => ({
            id: `${collection}_${item.id}`,
            collection,
            data: toCloneable(item),
            cachedAt: now,
            updatedAt: item.updated || ''
        }));
        await offlineDb.transaction('rw', offlineDb.cachedRecords, async () => {
            // Alte Einträge der Collection entfernen und neu schreiben
            await offlineDb!.cachedRecords.where('collection').equals(collection).delete();
            await offlineDb!.cachedRecords.bulkPut(records);
        });
    } catch (err) {
        console.warn(`Fehler beim Schreiben des Caches für ${collection}:`, err);
    }
}

export async function updateCachedRecord<T extends { id: string; updated?: string }>(
    collection: string,
    item: T
): Promise<void> {
    if (!offlineDb || !item?.id) return;
    try {
        await offlineDb.cachedRecords.put({
            id: `${collection}_${item.id}`,
            collection,
            data: toCloneable(item),
            cachedAt: Date.now(),
            updatedAt: item.updated || ''
        });
    } catch (err) {
        console.warn(`Fehler beim Aktualisieren des Caches für ${collection}:`, err);
    }
}

export async function removeCachedRecord(collection: string, id: string): Promise<void> {
    if (!offlineDb) return;
    try {
        await offlineDb.cachedRecords.delete(`${collection}_${id}`);
    } catch (err) {
        console.warn(`Fehler beim Löschen aus dem Cache für ${collection}:`, err);
    }
}

export async function clearOfflineCache(): Promise<void> {
    if (!offlineDb) return;
    try {
        await offlineDb.cachedRecords.clear();
    } catch (err) {
        console.warn('Fehler beim Leeren des Offline-Caches:', err);
    }
}

export async function queueOfflineMutation(
    collection: string,
    action: 'create' | 'update' | 'delete',
    recordId?: string,
    data?: any
): Promise<void> {
    if (!offlineDb) return;
    const item: OfflineQueueItem = {
        id: `queue_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        collection,
        action,
        recordId,
        data,
        timestamp: Date.now(),
        retryCount: 0
    };
    await offlineDb.syncQueue.put(item);
}

export async function processSyncQueue(): Promise<{ processed: number; failed: number }> {
    if (!offlineDb || (typeof navigator !== 'undefined' && !navigator.onLine)) {
        return { processed: 0, failed: 0 };
    }

    const queue = await offlineDb.syncQueue.orderBy('timestamp').toArray();
    if (!queue.length) return { processed: 0, failed: 0 };

    let processed = 0;
    let failed = 0;

    for (const item of queue) {
        try {
            if (item.action === 'create' && item.data) {
                await pb.collection(item.collection).create(item.data);
            } else if (item.action === 'update' && item.recordId && item.data) {
                await pb.collection(item.collection).update(item.recordId, item.data);
            } else if (item.action === 'delete' && item.recordId) {
                await pb.collection(item.collection).delete(item.recordId);
            }
            await offlineDb.syncQueue.delete(item.id);
            processed++;
        } catch (err: any) {
            failed++;
            if (item.retryCount >= 5) {
                console.error(`Sync-Eintrag ${item.id} nach 5 Versuchen fehlgeschlagen:`, err);
                await offlineDb.syncQueue.delete(item.id);
            } else {
                await offlineDb.syncQueue.update(item.id, {
                    retryCount: item.retryCount + 1,
                    error: err?.message || 'Sync-Fehler'
                });
            }
        }
    }
    return { processed, failed };
}

// Globaler Online-Listener zur automatischen Abarbeitung der Sync-Queue
if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
        processSyncQueue().then(({ processed }) => {
            if (processed > 0) {
                console.info(`[Offline-Sync] ${processed} Offline-Aktionen erfolgreich synchronisiert.`);
            }
        });
    });
}
