import Dexie, { type Table } from 'dexie';
import type { OfflineQueueItem, CachedRecord, PendingOfflineFile, SyncLogEntry, OfflineParentLink } from '$lib/types/pocketbase';

export class OrgaOfflineDatabase extends Dexie {
    cachedRecords!: Table<CachedRecord, string>;
    syncQueue!: Table<OfflineQueueItem, string>;
    pendingFiles!: Table<PendingOfflineFile, string>;
    syncLog!: Table<SyncLogEntry, string>;

    constructor() {
        super('OrgaFlow_OfflineDB');
        this.version(1).stores({
            cachedRecords: 'id, collection, cachedAt, updatedAt',
            syncQueue: 'id, collection, timestamp, retryCount'
        });
        this.version(2).stores({
            cachedRecords: 'id, collection, cachedAt, updatedAt',
            syncQueue: 'id, collection, timestamp, retryCount',
            pendingFiles: 'id, queueId, createdAt',
            syncLog: 'id, timestamp'
        });
    }
}

export const offlineDb: OrgaOfflineDatabase | null =
    typeof window !== 'undefined' ? new OrgaOfflineDatabase() : null;

export async function getCachedCollection<T>(collection: string): Promise<T[]> {
    if (!offlineDb) return [];
    try {
        const rows = await offlineDb.cachedRecords.where('collection').equals(collection).toArray();
        return rows.map((r) => r.data as T);
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
                try { copy[k] = JSON.parse(JSON.stringify(v)); } catch { copy[k] = String(v); }
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
        const records: CachedRecord<T>[] = items.map((item) => ({
            id: `${collection}_${item.id}`,
            collection,
            data: toCloneable(item),
            cachedAt: now,
            updatedAt: item.updated || ''
        }));
        await offlineDb.transaction('rw', offlineDb.cachedRecords, async () => {
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
    data?: any,
    options?: { label?: string; parentLink?: OfflineParentLink }
): Promise<void> {
    if (!offlineDb) return;
    const queueId = `queue_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const fileLinks: { field: string; pendingFileId: string; append?: boolean }[] = [];
    let cleanData: Record<string, any> | undefined = undefined;

    if (typeof FormData !== 'undefined' && data instanceof FormData) {
        cleanData = {};
        for (const [key, value] of data.entries()) {
            if (value instanceof Blob) {
                const fileId = `file_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
                const fileName = (value as File).name || `upload_${Date.now()}.bin`;
                await offlineDb.pendingFiles.put({
                    id: fileId,
                    queueId,
                    fileName,
                    mimeType: value.type || 'application/octet-stream',
                    blob: value,
                    createdAt: Date.now()
                });
                fileLinks.push({ field: key, pendingFileId: fileId, append: key.endsWith('+') });
            } else {
                cleanData[key] = value;
            }
        }
    } else if (data) {
        cleanData = toCloneable(data);
    }

    const item: OfflineQueueItem = {
        id: queueId,
        collection,
        action,
        recordId,
        data: cleanData,
        fileLinks: fileLinks.length ? fileLinks : undefined,
        parentLink: options?.parentLink,
        label: options?.label,
        timestamp: Date.now(),
        retryCount: 0
    };
    await offlineDb.syncQueue.put(item);
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('orga-offline-queue-changed'));
    }
}

export async function processSyncQueue(): Promise<{ processed: number; failed: number; conflicts: string[] }> {
    const { executeSyncQueue } = await import('$lib/services/sync/offlineSyncProcessor');
    return executeSyncQueue();
}
