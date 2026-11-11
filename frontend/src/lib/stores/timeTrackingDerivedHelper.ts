import { orgaStore } from "$lib/stores/orgaStore.svelte";
import { isAppointmentCaregiver } from "$lib/components/calendar/calendarUtils";
import { extractClientFromAppointment } from "./timeTrackingClientHelper";

export function checkIsVisibleForCurrentUser(
    activeEntryId: string | null,
    isAuthValid: boolean,
    currentAuthUserId: string | null,
    appointmentId: string | null,
    userId: string | null
): boolean {
    if (!activeEntryId || !isAuthValid || !currentAuthUserId) return false;
    if (appointmentId && orgaStore.appointments) {
        const app = orgaStore.appointments.getById(appointmentId) || orgaStore.appointments.data?.find((a: any) => a.id === appointmentId);
        if (app) return isAppointmentCaregiver(app, currentAuthUserId);
    }
    return userId ? userId === currentAuthUserId : false;
}

export function resolveEffectiveClientName(
    clientName: string | null,
    appointmentId: string | null,
    clientId: string | null
): string {
    if (clientName?.trim() && clientName !== 'Kein Klient zugeordnet') return clientName;
    if (appointmentId && orgaStore.appointments) {
        const app = orgaStore.appointments.getById(appointmentId) || orgaStore.appointments.data?.find((a: any) => a.id === appointmentId);
        if (app) {
            const info = extractClientFromAppointment(app);
            if (info.name) return info.name;
        }
    }
    if (clientId && orgaStore.clients) {
        const c = orgaStore.clients.getById(clientId) || orgaStore.clients.data?.find((c: any) => c.id === clientId);
        if (c) return `${c.name_first || ''} ${c.name_last || ''}`.trim() || c.company_name || '';
    }
    return '';
}

export function resolveEffectiveClientId(
    clientId: string | null,
    appointmentId: string | null
): string {
    if (clientId) return clientId;
    if (appointmentId && orgaStore.appointments) {
        const app = orgaStore.appointments.getById(appointmentId) || orgaStore.appointments.data?.find((a: any) => a.id === appointmentId);
        if (app) return extractClientFromAppointment(app).id || '';
    }
    return '';
}

export function formatElapsedSeconds(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export function computeElapsedSeconds(
    activeEntryId: string | null,
    startTimeMs: number,
    totalPausedMs: number,
    isPaused: boolean,
    pausedAtMs?: number
): number {
    if (!activeEntryId || !startTimeMs) return 0;
    const refNow = isPaused && pausedAtMs ? pausedAtMs : Date.now();
    return Math.max(0, Math.floor((refNow - startTimeMs - totalPausedMs) / 1000));
}
