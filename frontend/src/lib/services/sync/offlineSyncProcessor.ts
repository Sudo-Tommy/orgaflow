import { pb } from '$lib/services/pocketbase';
import { offlineDb, updateCachedRecord } from '$lib/services/offlineDb';
import { resolveSyncConflict } from '$lib/services/sync/conflictResolver';
import { toastStore } from '$lib/services/toastService.svelte';
import type { OfflineQueueItem } from '$lib/types/pocketbase';

async function buildPayload(item: OfflineQueueItem): Promise<any> {
    if (!item.fileLinks?.length || !offlineDb) return item.data;

    const fd = new FormData();
    if (item.data && typeof item.data === 'object') {
        for (const [k, v] of Object.entries(item.data)) {
            if (v !== undefined && v !== null) fd.append(k, String(v));
        }
    }
    for (const link of item.fileLinks) {
        const stored = await offlineDb.pendingFiles.get(link.pendingFileId);
        if (stored) {
            fd.append(link.field, stored.blob, stored.fileName);
        }
    }
    return fd;
}

async function cleanupItemFiles(item: OfflineQueueItem): Promise<void> {
    if (!offlineDb || !item.fileLinks?.length) return;
    for (const link of item.fileLinks) {
        await offlineDb.pendingFiles.delete(link.pendingFileId).catch(() => {});
    }
}

async function attachToParent(item: OfflineQueueItem, createdId: string): Promise<void> {
    if (!item.parentLink || !createdId) return;
    try {
        const { parentCollection, parentId, parentField } = item.parentLink;
        const parent = await pb.collection(parentCollection).getOne(parentId, { requestKey: null });
        const cur = Array.isArray(parent[parentField]) ? parent[parentField] : [];
        if (!cur.includes(createdId)) {
            await pb.collection(parentCollection).update(parentId, {
                [parentField]: [...cur, createdId]
            });
        }
    } catch (e) {
        console.warn('[OfflineSync] Eltern-Verknüpfung fehlgeschlagen:', e);
    }
}

export async function executeSyncQueue(): Promise<{ processed: number; failed: number; conflicts: string[] }> {
    if (!offlineDb || (typeof navigator !== 'undefined' && !navigator.onLine)) {
        return { processed: 0, failed: 0, conflicts: [] };
    }

    const queue = await offlineDb.syncQueue.orderBy('timestamp').toArray();
    if (!queue.length) return { processed: 0, failed: 0, conflicts: [] };

    let processed = 0;
    let failed = 0;
    const conflicts: string[] = [];

    for (const item of queue) {
        try {
            if (item.action === 'update' && item.recordId && item.data) {
                try {
                    const currentServer = await pb.collection(item.collection).getOne(item.recordId, { requestKey: null });
                    const decision = resolveSyncConflict(currentServer?.updated, item.timestamp, item.label || item.collection);
                    if (decision.winner === 'server') {
                        await updateCachedRecord(item.collection, currentServer as any);
                        if (decision.message) {
                            conflicts.push(decision.message);
                            toastStore.info(decision.message);
                        }
                        await offlineDb.syncLog.put({
                            id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                            collection: item.collection,
                            action: 'update',
                            status: 'conflict_server_won',
                            message: decision.message || 'Server-Version war neuer.',
                            timestamp: Date.now()
                        });
                        await cleanupItemFiles(item);
                        await offlineDb.syncQueue.delete(item.id);
                        processed++;
                        continue;
                    }
                } catch {
                    // Record nicht abrufbar -> reguläres Update versuchen
                }
            }

            const payload = await buildPayload(item);
            if (item.action === 'create' && payload) {
                const created = await pb.collection(item.collection).create(payload);
                await attachToParent(item, created.id);
            } else if (item.action === 'update' && item.recordId && payload) {
                await pb.collection(item.collection).update(item.recordId, payload);
            } else if (item.action === 'delete' && item.recordId) {
                await pb.collection(item.collection).delete(item.recordId);
            }

            await cleanupItemFiles(item);
            await offlineDb.syncQueue.delete(item.id);
            processed++;
        } catch (err: any) {
            failed++;
            if (item.retryCount >= 5) {
                await cleanupItemFiles(item);
                await offlineDb.syncQueue.delete(item.id);
            } else {
                await offlineDb.syncQueue.update(item.id, {
                    retryCount: item.retryCount + 1,
                    error: err?.message || 'Sync-Fehler'
                });
            }
        }
    }

    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('orga-offline-queue-changed'));
    }
    return { processed, failed, conflicts };
}
