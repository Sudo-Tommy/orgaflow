import type { AppointmentRecord, ClientRecord } from '$lib/types/pocketbase';

export interface ReminderPrefs {
    offsets: number[];
    dailyTime: string; // "HH:MM" oder ""
    afterEnd: boolean;
    absences: boolean;
}

export interface PlannedNotification {
    id: number;
    title: string;
    body: string;
    at: Date;
    extra: {
        kind: 'appointment' | 'after_end' | 'daily' | 'absence';
        appointmentId?: string;
        route: string;
    };
}

export const DEFAULT_REMINDER_PREFS: ReminderPrefs = {
    offsets: [60, 15],
    dailyTime: '07:00',
    afterEnd: true,
    absences: true
};

/**
 * Erzeugt eine stabile positive 31-Bit-ID für Android-Benachrichtigungen.
 */
export function hashNotificationId(key: string): number {
    let hash = 2166136261;
    for (let i = 0; i < key.length; i++) {
        hash ^= key.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return (hash & 0x3fffffff) || 1;
}

export function normalizeOffsets(offsets: unknown): number[] {
    if (!Array.isArray(offsets)) return [...DEFAULT_REMINDER_PREFS.offsets];
    const clean = offsets
        .map((n) => Math.round(Number(n)))
        .filter((n) => Number.isFinite(n) && n >= 1 && n <= 10080);
    return Array.from(new Set(clean)).sort((a, b) => b - a);
}

export function formatOffsetLabel(minutes: number): string {
    if (minutes >= 1440 && minutes % 1440 === 0) {
        const days = minutes / 1440;
        return days === 1 ? '1 Tag vorher' : `${days} Tage vorher`;
    }
    if (minutes >= 60 && minutes % 60 === 0) {
        const hours = minutes / 60;
        return hours === 1 ? '1 Stunde vorher' : `${hours} Stunden vorher`;
    }
    return `${minutes} Minuten vorher`;
}

function getClientLabel(app: AppointmentRecord, clientsMap: Map<string, ClientRecord>): string {
    const firstClientId = Array.isArray(app.client) ? app.client[0] : app.client;
    const expanded = (app.expand as any)?.client;
    const clientObj = Array.isArray(expanded) ? expanded[0] : expanded || (firstClientId ? clientsMap.get(firstClientId) : null);
    if (clientObj) {
        const name = `${clientObj.name_first || ''} ${clientObj.name_last || ''}`.trim();
        if (name) return name;
    }
    return app.description?.replace('[BLOCK]', '').trim() || 'Klientenbesuch';
}

function belongsToUser(app: AppointmentRecord, userId?: string): boolean {
    if (!userId) return true;
    if (!app.user && !app.assigned_to) return true;
    return app.user === userId || app.assigned_to === userId;
}

function formatTimeHHMM(d: Date): string {
    return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

export interface BuildReminderParams {
    appointments: AppointmentRecord[];
    clients?: ClientRecord[];
    userId?: string;
    prefs: ReminderPrefs;
    now?: Date;
    horizonDays?: number;
}

/**
 * Berechnet alle anstehenden lokalen Benachrichtigungen ohne Seiteneffekte.
 */
export function buildReminderNotifications(params: BuildReminderParams): PlannedNotification[] {
    const now = params.now ?? new Date();
    const horizonDays = params.horizonDays ?? 14;
    const horizonMs = now.getTime() + horizonDays * 86400_000;
    const offsets = normalizeOffsets(params.prefs.offsets);
    const clientsMap = new Map((params.clients || []).map((c) => [c.id, c]));
    const items: PlannedNotification[] = [];
    const byDay = new Map<string, AppointmentRecord[]>();

    for (const app of params.appointments) {
        if (!app.appointment || app.status === 'abgesagt') continue;
        if (!belongsToUser(app, params.userId)) continue;

        const start = new Date(app.appointment);
        if (Number.isNaN(start.getTime())) continue;

        const isAbsence = Boolean(app.description?.includes('[BLOCK]'));
        const label = getClientLabel(app, clientsMap);
        const dayKey = start.toISOString().slice(0, 10);

        if (isAbsence) {
            if (params.prefs.absences) {
                const triggerAt = new Date(start.getFullYear(), start.getMonth(), start.getDate() - 1, 18, 0, 0);
                if (triggerAt.getTime() > now.getTime() && triggerAt.getTime() <= horizonMs) {
                    items.push({
                        id: hashNotificationId(`absence:${app.id}`),
                        title: 'Abwesenheit / Urlaub morgen',
                        body: label,
                        at: triggerAt,
                        extra: { kind: 'absence', appointmentId: app.id, route: '/calendar' }
                    });
                }
            }
            continue;
        }

        if (start.getTime() <= horizonMs) {
            const list = byDay.get(dayKey) || [];
            list.push(app);
            byDay.set(dayKey, list);
        }

        for (const mins of offsets) {
            const at = new Date(start.getTime() - mins * 60_000);
            if (at.getTime() > now.getTime() && at.getTime() <= horizonMs) {
                items.push({
                    id: hashNotificationId(`appt:${app.id}:${mins}`),
                    title: `Termin in ${formatOffsetLabel(mins).replace(' vorher', '')}`,
                    body: `${formatTimeHHMM(start)} Uhr – ${label}`,
                    at,
                    extra: { kind: 'appointment', appointmentId: app.id, route: `/calendar?appointment=${app.id}` }
                });
            }
        }

        if (params.prefs.afterEnd) {
            const durMin = app.route_duration && app.route_duration > 15 ? app.route_duration : 60;
            const endAt = new Date(start.getTime() + durMin * 60_000);
            if (endAt.getTime() > now.getTime() && endAt.getTime() <= horizonMs) {
                items.push({
                    id: hashNotificationId(`after:${app.id}`),
                    title: 'Termin beendet',
                    body: `Fahrt & Beleg für ${label} erfassen?`,
                    at: endAt,
                    extra: { kind: 'after_end', appointmentId: app.id, route: `/calendar?appointment=${app.id}` }
                });
            }
        }
    }

    if (/^\d{2}:\d{2}$/.test(params.prefs.dailyTime || '')) {
        const [hh, mm] = params.prefs.dailyTime.split(':').map(Number);
        for (let dOffset = 0; dOffset < 7; dOffset++) {
            const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dOffset, hh, mm, 0);
            if (day.getTime() <= now.getTime()) continue;
            const key = day.toISOString().slice(0, 10);
            const dayAppts = (byDay.get(key) || []).sort(
                (a, b) => new Date(a.appointment!).getTime() - new Date(b.appointment!).getTime()
            );
            if (dayAppts.length === 0) continue;
            const first = dayAppts[0];
            const firstLabel = getClientLabel(first, clientsMap);
            const firstTime = formatTimeHHMM(new Date(first.appointment!));
            items.push({
                id: hashNotificationId(`daily:${key}`),
                title: `Tagesübersicht: ${dayAppts.length} ${dayAppts.length === 1 ? 'Termin' : 'Termine'}`,
                body: `Erster Termin um ${firstTime} Uhr (${firstLabel})`,
                at: day,
                extra: { kind: 'daily', route: '/calendar' }
            });
        }
    }

    return items.sort((a, b) => a.at.getTime() - b.at.getTime()).slice(0, 60);
}
