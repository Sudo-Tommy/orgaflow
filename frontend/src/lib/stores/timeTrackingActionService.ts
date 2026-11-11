import { pb, withMutationTimeout } from "$lib/services/pocketbase";
import { toastStore } from "$lib/services/toastService.svelte";
import { logAuditEvent } from "$lib/services/auditService";
import { orgaStore } from "$lib/stores/orgaStore.svelte";
import { enqueuePending } from "./timeTrackingSyncHelper";

export interface StartTrackingResult {
    success: boolean;
    recordId?: string;
    startTimeIso?: string;
    startTimeMs?: number;
    clientId?: string;
    clientName?: string;
    serviceType?: string;
    appointmentId?: string;
}

export async function executeStartTracking(params: {
    targetClientId: string | { clientId: string; serviceType?: string; clientName?: string; appointmentId?: string };
    argServiceType?: string;
    argClientName?: string;
    argAppointmentId?: string;
}): Promise<StartTrackingResult> {
    const { targetClientId, argServiceType = '', argClientName = '', argAppointmentId = '' } = params;
    const eClientId = typeof targetClientId === 'object' ? targetClientId.clientId || '' : targetClientId || '';
    const eService = typeof targetClientId === 'object' ? targetClientId.serviceType || '' : argServiceType || '';
    const eName = typeof targetClientId === 'object' ? targetClientId.clientName || '' : argClientName || '';
    const eAppId = typeof targetClientId === 'object' ? targetClientId.appointmentId || '' : argAppointmentId || '';

    const now = new Date();
    const nowIso = now.toISOString();
    const nowMs = now.getTime();

    try {
        const payload: Record<string, any> = { start: nowIso, end: null };
        if (eService) payload.work_activity = eService;
        let recordId = 'local_' + Date.now();
        let isOnlineSave = false;

        if (typeof navigator !== 'undefined' && navigator.onLine) {
            try {
                const record = await withMutationTimeout(pb.collection('time_records').create(payload), 6000);
                recordId = record.id;
                isOnlineSave = true;
                if (orgaStore.time_records) orgaStore.time_records.data.unshift(record as any);
                if (eAppId) {
                    const app = await pb.collection('appointments').getOne(eAppId);
                    const existing = Array.isArray(app.time_record) ? app.time_record : (app.time_record ? [app.time_record] : []);
                    await withMutationTimeout(pb.collection('appointments').update(eAppId, { time_record: [...existing, record.id] }), 6000);
                }
            } catch (pbErr) {
                console.warn('[timeTrackingStore] Offline fallback activated:', pbErr);
            }
        }

        if (!isOnlineSave) {
            enqueuePending({ id: 'sync_' + Date.now(), type: 'create_start', timestamp: nowMs, recordId, payload, appointmentId: eAppId || undefined });
        }

        await logAuditEvent({
            action: 'ZEITERFASSUNG_START',
            route: typeof window !== 'undefined' ? window.location.pathname : '',
            details: { recordId, clientId: eClientId, clientName: eName, serviceType: eService, appointmentId: eAppId, startTime: nowIso }
        });

        toastStore.success(`Zeiterfassung gestartet${eName ? ` (${eName})` : ''}.`);
        return {
            success: true,
            recordId,
            startTimeIso: nowIso,
            startTimeMs: nowMs,
            clientId: eClientId,
            clientName: eName,
            serviceType: eService,
            appointmentId: eAppId
        };
    } catch (err: any) {
        toastStore.error(err.message || 'Fehler beim Starten der Zeiterfassung.');
        return { success: false };
    }
}

export async function executePauseTracking(recordId: string, clientId?: string | null, elapsedSeconds?: number): Promise<void> {
    await logAuditEvent({
        action: 'ZEITERFASSUNG_PAUSE',
        route: typeof window !== 'undefined' ? window.location.pathname : '',
        details: { recordId, clientId, elapsedSeconds, pausedAt: new Date().toISOString() }
    });
    toastStore.info('Zeiterfassung pausiert.');
}

export async function executeResumeTracking(recordId: string, clientId?: string | null, totalPausedMs?: number): Promise<void> {
    await logAuditEvent({
        action: 'ZEITERFASSUNG_FORTSETZUNG',
        route: typeof window !== 'undefined' ? window.location.pathname : '',
        details: { recordId, clientId, resumedAt: new Date().toISOString(), totalPausedSeconds: Math.floor((totalPausedMs || 0) / 1000) }
    });
    toastStore.info('Zeiterfassung fortgesetzt.');
}

export async function executeStopTracking(params: {
    recordId: string;
    clientId?: string | null;
    clientName?: string | null;
    appointmentId?: string | null;
    startTime?: string | null;
    startTimeMs?: number;
    serviceType?: string | null;
    recordedSeconds: number;
}): Promise<boolean> {
    const {
        recordId, clientId, clientName, appointmentId,
        startTime, startTimeMs, serviceType, recordedSeconds
    } = params;
    const nowIso = new Date().toISOString();

    try {
        let isOnlineUpdated = false;
        if (typeof navigator !== 'undefined' && navigator.onLine && recordId && !recordId.startsWith('local_')) {
            try {
                await withMutationTimeout(pb.collection('time_records').update(recordId, { end: nowIso }), 6000);
                isOnlineUpdated = true;
            } catch (e: any) {
                console.warn('[timeTrackingStore] Update time_record fehlgeschlagen:', e);
            }
        }

        if (!isOnlineUpdated) {
            enqueuePending({
                id: 'sync_' + Date.now(),
                type: 'stop',
                timestamp: startTimeMs || Date.now(),
                recordId,
                endTime: nowIso,
                appointmentId: appointmentId || undefined,
                payload: { start: startTime, work_activity: serviceType || '' }
            });
        }

        if (orgaStore.time_records) {
            const idx = orgaStore.time_records.data.findIndex((t: any) => t.id === recordId);
            if (idx !== -1) orgaStore.time_records.data[idx] = { ...orgaStore.time_records.data[idx], end: nowIso };
        }

        if (appointmentId) {
            try {
                const { refreshAppointmentInStore } = await import('$lib/components/appointmentDetail/appointmentDetailService');
                await refreshAppointmentInStore(appointmentId);
            } catch {}
        }

        await logAuditEvent({
            action: 'ZEITERFASSUNG_STOPP',
            route: typeof window !== 'undefined' ? window.location.pathname : '',
            details: {
                recordId, clientId, clientName,
                appointmentId, startTime, endTime: nowIso,
                totalDurationSeconds: recordedSeconds, formattedDuration: `${Math.floor(recordedSeconds / 60)} Min.`
            }
        });

        toastStore.success(`Zeiterfassung beendet (${Math.floor(recordedSeconds / 60)} Minuten erfasst).`);
        return true;
    } catch (err: any) {
        toastStore.error(err.message || 'Fehler beim Beenden der Zeiterfassung.');
        return false;
    }
}
