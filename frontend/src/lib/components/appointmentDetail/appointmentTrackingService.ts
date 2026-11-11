import { pb } from "$lib/services/pocketbase";
import { orgaStore } from "$lib/stores/orgaStore.svelte";
import { toastStore } from "$lib/services/toastService.svelte";
import { confirmStore } from "$lib/services/confirmService.svelte";
import { refreshAppointmentInStore } from "./appointmentDetailService";
import { timeTrackingStore, extractClientFromAppointment } from "$lib/stores/timeTracking.svelte";
import { isAppointmentCaregiver } from "../calendar/calendarUtils";
import { appointmentCompleteService } from "$lib/services/appointmentCompleteService.svelte";

export async function startTimeTracking(appId: string, existingTrIds: string[]): Promise<boolean> {
    try {
        let app = orgaStore.appointments?.getById(appId) || orgaStore.appointments?.data?.find((a: any) => a.id === appId);
        if (!app) {
            try { app = await pb.collection('appointments').getOne(appId, { expand: 'user,client' }); } catch {}
        }
        const currentUserId = pb.authStore.record?.id || pb.authStore.model?.id;
        if (!isAppointmentCaregiver(app, currentUserId)) {
            toastStore.error("Die Zeiterfassung kann nur vom zugewiesenen Betreuer gestartet werden.");
            return false;
        }

        const newRecord = await pb.collection('time_records').create({ start: new Date().toISOString(), end: null });
        if (orgaStore.time_records) orgaStore.time_records.data.unshift(newRecord as any);
        
        let rawExisting: any[] = [];
        if (app?.time_record) {
            if (Array.isArray(app.time_record)) rawExisting = app.time_record;
            else if (typeof app.time_record === 'string') {
                try { rawExisting = JSON.parse(app.time_record); } catch { rawExisting = [app.time_record]; }
            }
        }
        const allExistingIds = Array.from(new Set([
            ...existingTrIds,
            ...(Array.isArray(rawExisting) ? rawExisting : [rawExisting]).map((x: any) => typeof x === 'string' ? x : x?.id)
        ])).filter(Boolean);

        if (!allExistingIds.includes(newRecord.id)) allExistingIds.push(newRecord.id);

        await pb.collection('appointments').update(appId, { time_record: allExistingIds });
        if (app) app.time_record = allExistingIds;
        await refreshAppointmentInStore(appId);

        const { id: resolvedClientId, name: resolvedClientName } = extractClientFromAppointment(app);
        timeTrackingStore.setActiveSessionDirectly({
            activeEntryId: newRecord.id,
            startTime: newRecord.start,
            startTimeMs: new Date(newRecord.start).getTime(),
            clientId: resolvedClientId,
            clientName: resolvedClientName,
            serviceType: app?.service_type || '',
            appointmentId: appId,
            userId: currentUserId,
            isPaused: false,
            totalPausedMs: 0
        });

        toastStore.success("Zeiterfassung gestartet.");
        return true;
    } catch { toastStore.error("Fehler beim Starten der Zeiterfassung."); return false; }
}

export async function stopTimeTracking(recordId: string, appId: string): Promise<boolean> {
    try {
        const updated = await pb.collection('time_records').update(recordId, { end: new Date().toISOString() });
        if (orgaStore.time_records) {
            const idx = orgaStore.time_records.data.findIndex((t: any) => t.id === recordId);
            if (idx !== -1) orgaStore.time_records.data[idx] = updated as any;
        }
        if (timeTrackingStore.activeEntryId === recordId) timeTrackingStore.clearActiveSession();
        await refreshAppointmentInStore(appId);
        toastStore.success("Zeiterfassung beendet.");
        appointmentCompleteService.open(appId);
        return true;
    } catch { toastStore.error("Fehler beim Stoppen der Zeiterfassung."); return false; }
}

export async function removeTimeRecord(recordId: string, appId: string): Promise<boolean> {
    if (!(await confirmStore.ask("Zeiteintrag wirklich löschen?", "Zeit löschen?", "Löschen", "Abbrechen", true))) return false;
    try {
        await pb.collection('time_records').delete(recordId);
        if (orgaStore.time_records) {
            orgaStore.time_records.data = orgaStore.time_records.data.filter((t: any) => t.id !== recordId);
        }
        if (timeTrackingStore.activeEntryId === recordId) timeTrackingStore.clearActiveSession();
        const app = orgaStore.appointments?.data.find((a: any) => a.id === appId);
        if (app?.time_record) {
            let rawExisting: any[] = [];
            if (Array.isArray(app.time_record)) rawExisting = app.time_record;
            else if (typeof app.time_record === 'string') {
                try { rawExisting = JSON.parse(app.time_record); } catch { rawExisting = [app.time_record]; }
            }
            if (Array.isArray(rawExisting)) {
                const cleaned = rawExisting.map((x: any) => typeof x === 'string' ? x : x?.id).filter(id => id && id !== recordId);
                await pb.collection('appointments').update(appId, { time_record: cleaned });
                app.time_record = cleaned;
            }
        }
        await refreshAppointmentInStore(appId);
        toastStore.info("Zeiterfassung gelöscht.");
        return true;
    } catch { toastStore.error("Fehler beim Löschen."); return false; }
}

export async function toggleAppointmentTask(taskId: string, appId: string, currentTaskIds?: string[]): Promise<boolean> {
    const app = orgaStore.appointments?.data.find((a: any) => a.id === appId);
    let existingIds: string[] = [];
    const rawTasks: any = app?.tasks;
    if (rawTasks) {
        if (Array.isArray(rawTasks)) {
            existingIds = rawTasks.map((t: any) => typeof t === 'string' ? t : t?.id).filter(Boolean);
        } else if (typeof rawTasks === 'string' && rawTasks.trim() && rawTasks !== '[]') {
            try {
                const parsed = JSON.parse(rawTasks);
                if (Array.isArray(parsed)) existingIds = parsed.map((t: any) => typeof t === 'string' ? t : t?.id).filter(Boolean);
                else existingIds = [rawTasks];
            } catch { existingIds = [rawTasks]; }
        }
    }
    if (currentTaskIds && currentTaskIds.length > 0) {
        for (const id of currentTaskIds) {
            if (id && !existingIds.includes(id)) existingIds.push(id);
        }
    }

    const newIds = existingIds.includes(taskId) ? existingIds.filter(id => id !== taskId) : [...existingIds, taskId];
    try {
        await pb.collection('appointments').update(appId, { tasks: newIds });
        if (app) {
            app.tasks = newIds;
            if (app.expand) {
                const allTasks = orgaStore.tasks?.data || [];
                app.expand.tasks = newIds.map(id => allTasks.find((t: any) => t.id === id) || { id, title: 'Leistung' });
            }
        }
        await refreshAppointmentInStore(appId);
        toastStore.success("Leistungen aktualisiert.");
        return true;
    } catch (err: any) {
        console.error("toggleAppointmentTask error:", err);
        toastStore.error("Fehler beim Aktualisieren.");
        return false;
    }
}

export async function removeDriveRecord(id: string, appId: string): Promise<void> {
    if (!(await confirmStore.ask("Fahrteintrag wirklich löschen?", "Fahrt löschen?", "Löschen", "Abbrechen", true))) return;
    try {
        await pb.collection('drive_records').delete(id);
        await refreshAppointmentInStore(appId);
        toastStore.info("Fahrt gelöscht.");
    } catch { toastStore.error("Fehler beim Löschen der Fahrt."); }
}

export async function removeExpenditure(id: string, appId: string): Promise<void> {
    if (!(await confirmStore.ask("Ausgabe wirklich löschen?", "Ausgabe löschen?", "Löschen", "Abbrechen", true))) return;
    try {
        await pb.collection('expenditure').delete(id);
        await refreshAppointmentInStore(appId);
        toastStore.info("Ausgabe gelöscht.");
    } catch { toastStore.error("Fehler beim Löschen."); }
}

export async function deleteVoiceRecord(appId: string, existing: string[], filename: string): Promise<void> {
    if (!(await confirmStore.ask("Möchten Sie diese Sprachnotiz löschen?", "Sprachnotiz löschen?", "Löschen", "Abbrechen", true))) return;
    try {
        const fd = new FormData();
        for (const vr of existing || []) { if (vr !== filename) fd.append('voice_records', vr); }
        if (existing.length === 1 && existing[0] === filename) fd.append('voice_records', '');
        await pb.collection('appointments').update(appId, fd);
        await refreshAppointmentInStore(appId);
        toastStore.info("Sprachnotiz gelöscht.");
    } catch { toastStore.error("Fehler beim Löschen."); }
}

function resolveAudioMime(file: File): string {
    if (file.type && file.type !== 'application/octet-stream') return file.type;
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    const mimeMap: Record<string, string> = {
        m4a: 'audio/mp4', mp3: 'audio/mpeg', ogg: 'audio/ogg',
        opus: 'audio/ogg', wav: 'audio/wav', aac: 'audio/aac',
        flac: 'audio/flac', webm: 'audio/webm', mp4: 'audio/mp4'
    };
    return mimeMap[ext] ?? 'audio/mpeg';
}

export async function uploadVoiceRecords(appId: string, existing: string[], files: FileList | null): Promise<void> {
    if (!files?.length) return;
    try {
        const fd = new FormData();
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const safe = new File([file], file.name, { type: resolveAudioMime(file) });
            fd.append('voice_records+', safe);
        }
        await pb.collection('appointments').update(appId, fd);
        await refreshAppointmentInStore(appId);
        toastStore.success("Audio hinzugefügt.");
    } catch (err: any) {
        console.error("Audio-Upload Fehler:", err);
        toastStore.error("Fehler beim Upload. Bitte prüfen Sie das Dateiformat.");
    }
}
