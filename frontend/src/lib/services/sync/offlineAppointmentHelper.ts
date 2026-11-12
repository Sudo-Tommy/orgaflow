import { pb } from '$lib/services/pocketbase';
import { queueOfflineMutation } from '$lib/services/offlineDb';
import { orgaStore } from '$lib/stores/orgaStore.svelte';
import { refreshAppointmentInStore } from '$lib/components/appointmentDetail/appointmentDetailService';

export interface CompletionSaveParams {
    appointment: any;
    existingTrId?: string;
    existingDrId?: string;
    startIso: string;
    endIso: string;
    driveKm: number;
    appointmentPayload: Record<string, any>;
    isOnline: boolean;
}

export async function queueAppointmentCompletionOffline(p: Omit<CompletionSaveParams, 'isOnline'>): Promise<void> {
    const appId = p.appointment.id;

    if (p.existingTrId) {
        await queueOfflineMutation('time_records', 'update', p.existingTrId, {
            start: p.startIso,
            end: p.endIso
        }, { label: 'Zeiterfassung' });
    } else {
        await queueOfflineMutation('time_records', 'create', undefined, {
            start: p.startIso,
            end: p.endIso
        }, {
            label: 'Zeiterfassung',
            parentLink: { parentCollection: 'appointments', parentId: appId, parentField: 'time_record' }
        });
    }

    if (p.driveKm > 0) {
        if (p.existingDrId) {
            await queueOfflineMutation('drive_records', 'update', p.existingDrId, { km: p.driveKm }, { label: 'Fahrtenbuch' });
        } else {
            await queueOfflineMutation('drive_records', 'create', undefined, {
                km: p.driveKm,
                date: p.startIso
            }, {
                label: 'Fahrtenbuch',
                parentLink: { parentCollection: 'appointments', parentId: appId, parentField: 'drive_record' }
            });
        }
    }

    const safePayload = { ...p.appointmentPayload };
    delete safePayload.time_record;
    delete safePayload.drive_record;

    await queueOfflineMutation('appointments', 'update', appId, safePayload, { label: 'Terminabschluss' });
    orgaStore.appointments.optimisticUpdate(appId, { ...safePayload, status: 'beendet' });
}

/**
 * Speichert den Terminabschluss online und fällt bei Funkloch nahtlos auf die Offline-Queue zurück.
 * Gibt true zurück, wenn lokal gepuffert (offline), false wenn direkt online gespeichert.
 */
export async function saveAppointmentCompletion(p: CompletionSaveParams): Promise<'online' | 'offline'> {
    if (!p.isOnline) {
        await queueAppointmentCompletionOffline(p);
        return 'offline';
    }

    const appId = p.appointment.id;
    try {
        let trIds = Array.isArray(p.appointment.time_record) ? [...p.appointment.time_record] : [];
        if (p.existingTrId) {
            try {
                await pb.collection('time_records').update(p.existingTrId, { start: p.startIso, end: p.endIso });
            } catch {
                const newTr = await pb.collection('time_records').create({ start: p.startIso, end: p.endIso });
                trIds = [newTr.id];
            }
        } else {
            const newTr = await pb.collection('time_records').create({ start: p.startIso, end: p.endIso });
            trIds = [newTr.id];
        }

        let drIds = Array.isArray(p.appointment.drive_record) ? [...p.appointment.drive_record] : [];
        if (p.driveKm > 0) {
            if (p.existingDrId) {
                await pb.collection('drive_records').update(p.existingDrId, { km: p.driveKm });
            } else {
                const newDr = await pb.collection('drive_records').create({ km: p.driveKm, date: p.startIso });
                drIds = [newDr.id];
            }
        }

        await pb.collection('appointments').update(appId, {
            ...p.appointmentPayload,
            time_record: trIds,
            drive_record: drIds
        }, { requestKey: null });
        await refreshAppointmentInStore(appId);
        return 'online';
    } catch (err: any) {
        if (typeof navigator !== 'undefined' && (!navigator.onLine || err?.status === 0)) {
            await queueAppointmentCompletionOffline(p);
            return 'offline';
        }
        throw err;
    }
}
