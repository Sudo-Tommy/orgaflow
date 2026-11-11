import { pb, withMutationTimeout } from "$lib/services/pocketbase";
import { toastStore } from "$lib/services/toastService.svelte";
import type { TrackingSessionData } from "./timeTrackingTypes";

export interface PendingSyncItem {
    id: string;
    type: 'create_start' | 'stop';
    timestamp: number;
    recordId: string;
    payload?: any;
    appointmentId?: string;
    endTime?: string;
}

export const STORAGE_KEY = 'orgaflow_active_time_tracking';
export const PENDING_SYNC_KEY = 'orgaflow_pending_time_sync';

export function getPendingQueue(): PendingSyncItem[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem(PENDING_SYNC_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

export function savePendingQueue(queue: PendingSyncItem[]) {
    if (typeof window === 'undefined') return;
    try {
        if (queue.length > 0) {
            localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(queue));
        } else {
            localStorage.removeItem(PENDING_SYNC_KEY);
        }
    } catch (e) {
        console.warn('[timeTrackingStore] Fehler beim Speichern der Sync-Queue:', e);
    }
}

export function enqueuePending(item: PendingSyncItem) {
    const queue = getPendingQueue();
    queue.push(item);
    savePendingQueue(queue);
}

export async function processPendingSync(
    getActiveId: () => string | null,
    setActiveId: (id: string) => void,
    persist: () => void
): Promise<number> {
    if (typeof window === 'undefined' || !navigator.onLine) return 0;
    const queue = getPendingQueue();
    if (queue.length === 0) return 0;

    const remaining: PendingSyncItem[] = [];
    let syncCount = 0;

    for (const item of queue) {
        try {
            if (item.type === 'create_start') {
                const created = await withMutationTimeout(
                    pb.collection('time_records').create(item.payload),
                    8000
                );
                if (getActiveId() === item.recordId) {
                    setActiveId(created.id);
                    persist();
                }
                if (item.appointmentId) {
                    try {
                        const app = await pb.collection('appointments').getOne(item.appointmentId);
                        const existing = Array.isArray(app.time_record) ? app.time_record : (app.time_record ? [app.time_record] : []);
                        await withMutationTimeout(
                            pb.collection('appointments').update(item.appointmentId, {
                                time_record: [...existing, created.id]
                            }),
                            8000
                        );
                    } catch (appErr) {
                        console.warn('[timeTrackingStore] Offline-Link zu Termin fehlgeschlagen:', appErr);
                    }
                }
                syncCount++;
            } else if (item.type === 'stop') {
                if (item.recordId.startsWith('local_')) {
                    const finalPayload = {
                        start: item.payload?.start || new Date(item.timestamp).toISOString(),
                        end: item.endTime || new Date().toISOString(),
                        work_activity: item.payload?.work_activity || ''
                    };
                    const created = await withMutationTimeout(
                        pb.collection('time_records').create(finalPayload),
                        8000
                    );
                    if (item.appointmentId) {
                        try {
                            const app = await pb.collection('appointments').getOne(item.appointmentId);
                            const existing = Array.isArray(app.time_record) ? app.time_record : (app.time_record ? [app.time_record] : []);
                            await withMutationTimeout(
                                pb.collection('appointments').update(item.appointmentId, {
                                    time_record: [...existing, created.id]
                                }),
                                8000
                            );
                        } catch (appErr) {
                            console.warn('[timeTrackingStore] Offline-Stop-Link fehlgeschlagen:', appErr);
                        }
                    }
                } else {
                    await withMutationTimeout(
                        pb.collection('time_records').update(item.recordId, {
                            end: item.endTime
                        }),
                        8000
                    );
                }
                syncCount++;
            }
        } catch (err: any) {
            console.warn('[timeTrackingStore] Sync fehlgeschlagen:', item, err);
            const isNotFound = err?.status === 404 || err?.response?.status === 404;
            if (!isNotFound) {
                remaining.push(item);
            }
        }
    }

    savePendingQueue(remaining);
    if (syncCount > 0) {
        toastStore.success(`${syncCount} offline erfasste Zeit${syncCount > 1 ? 'en' : ''} synchronisiert.`);
    }
    return syncCount;
}

export function persistSessionToStorage(data: TrackingSessionData | null) {
    if (typeof window === 'undefined') return;
    if (data && data.activeEntryId && data.startTime) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } else {
        localStorage.removeItem(STORAGE_KEY);
    }
}

export function restoreSessionFromStorage(): TrackingSessionData | null {
    if (typeof window === 'undefined') return null;
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved) as TrackingSessionData;
            if (parsed && parsed.activeEntryId && parsed.startTimeMs) {
                return parsed;
            }
        }
    } catch (e) {
        console.warn('[timeTrackingStore] Wiederherstellung fehlgeschlagen:', e);
    }
    return null;
}
