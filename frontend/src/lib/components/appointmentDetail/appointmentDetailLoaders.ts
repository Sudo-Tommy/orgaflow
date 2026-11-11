import { pb } from "$lib/services/pocketbase";
import { orgaStore } from "$lib/stores/orgaStore.svelte";
import { cleanAddressForRouting } from "./appointmentRouteService";

export async function fetchAppointmentTimeRecords(app: any): Promise<any[]> {
    if (!app) return [];
    let trIds: string[] = [];
    const rawTr: any = app?.time_record;
    if (Array.isArray(rawTr)) {
        trIds = rawTr.map((tid: any) => typeof tid === 'string' ? tid : tid?.id).filter(Boolean);
    } else if (typeof rawTr === 'string' && rawTr.trim() !== '' && rawTr !== '[]') {
        if (rawTr.startsWith('[')) {
            try {
                const p = JSON.parse(rawTr);
                if (Array.isArray(p)) trIds = p.map((x: any) => typeof x === 'string' ? x : x?.id).filter(Boolean);
            } catch {}
        } else trIds = [rawTr];
    }

    if (app?.expand?.time_record) {
        const exp = Array.isArray(app.expand.time_record) ? app.expand.time_record : [app.expand.time_record];
        for (const r of exp) if (r?.id && !trIds.includes(r.id)) trIds.push(r.id);
    }

    if (trIds.length === 0) return [];

    try {
        const filterStr = trIds.map(tid => `id = '${tid}'`).join(' || ');
        const records = await pb.collection('time_records').getFullList({ filter: filterStr, requestKey: null });
        if (orgaStore.time_records) {
            for (const rec of records) {
                const exIdx = orgaStore.time_records.data.findIndex((t: any) => t.id === rec.id);
                if (exIdx === -1) orgaStore.time_records.data.push(rec as any);
                else orgaStore.time_records.data[exIdx] = rec as any;
            }
        }
        return records;
    } catch (err) {
        console.warn('Failed to load time records:', err);
        return [];
    }
}

export async function fetchAppointmentTasks(app: any): Promise<any[]> {
    if (!app) return [];
    let taskIds: string[] = [];
    const raw: any = app?.tasks;
    if (Array.isArray(raw)) {
        taskIds = raw.map((tid: any) => typeof tid === 'string' ? tid : tid?.id).filter(Boolean);
    } else if (typeof raw === 'string' && raw.trim() !== '' && raw !== '[]') {
        if (raw.startsWith('[')) {
            try {
                const p = JSON.parse(raw);
                if (Array.isArray(p)) taskIds = p.map((x: any) => typeof x === 'string' ? x : x?.id).filter(Boolean);
            } catch {}
        } else taskIds = [raw];
    }

    if (app?.expand?.tasks) {
        const exp = Array.isArray(app.expand.tasks) ? app.expand.tasks : [app.expand.tasks];
        for (const r of exp) if (r?.id && !taskIds.includes(r.id)) taskIds.push(r.id);
    }

    if (!orgaStore.tasks?.data || orgaStore.tasks.data.length === 0) {
        try {
            const all = await pb.collection('tasks').getFullList({ sort: '-created', requestKey: null });
            if (orgaStore.tasks) orgaStore.tasks.data = all as any;
        } catch (err) {
            console.warn('Failed to load all tasks:', err);
        }
    }

    if (taskIds.length === 0) return [];

    const foundFromStore: any[] = [];
    const missingIds: string[] = [];
    for (const tid of taskIds) {
        const found = orgaStore.tasks?.data.find((t: any) => t.id === tid);
        if (found) foundFromStore.push(found);
        else missingIds.push(tid);
    }

    if (missingIds.length > 0) {
        try {
            const filterStr = missingIds.map(tid => `id = '${tid}'`).join(' || ');
            const extra = await pb.collection('tasks').getFullList({ filter: filterStr, requestKey: null });
            if (orgaStore.tasks) {
                for (const r of extra) {
                    if (!orgaStore.tasks.data.some((t: any) => t.id === r.id)) {
                        orgaStore.tasks.data.push(r as any);
                    }
                }
            }
            return [...foundFromStore, ...extra];
        } catch {
            return foundFromStore;
        }
    }
    return foundFromStore;
}

export function resolveAppointmentAddresses(appointment: any, client: any, fullClient: any) {
    const c = fullClient || client;
    const clientAddress = c ? [c.street ? `${c.street} ${c.housenr || ''}` : '', c.city ? `${c.zip || ''} ${c.city}` : ''].filter(Boolean).join(', ') : '';

    let targetLocationAddress = '';
    let targetLocationTitle = 'Zielort';
    if (appointment) {
        const contact = Array.isArray(appointment.expand?.appointment_at) ? appointment.expand.appointment_at[0] : appointment.expand?.appointment_at;
        if (contact?.street) {
            targetLocationAddress = [`${contact.street} ${contact.housenr || ''}`.trim(), `${contact.zip || ''} ${contact.city || ''}`.trim()].filter(Boolean).join(', ');
        } else if (appointment.location_address) {
            targetLocationAddress = cleanAddressForRouting(appointment.location_address);
        }
        targetLocationTitle = contact?.company_name || `${contact?.name_first || ''} ${contact?.name_last || ''}`.trim() || appointment.location_address?.split(',')[0].trim() || 'Zielort';
    }

    const pickupAddress = appointment?.pickup_address ? cleanAddressForRouting(appointment.pickup_address) : clientAddress;

    return {
        clientAddress,
        targetLocationAddress,
        targetLocationTitle,
        pickupAddress
    };
}
