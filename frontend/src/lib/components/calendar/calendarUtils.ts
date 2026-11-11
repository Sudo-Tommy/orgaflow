export * from "./calendarEntityUtils";
export * from "./calendarCarUtils";
export * from "./calendarGeometryUtils";

import { isAppointmentOwner, getAppointmentClientName, getAppointmentTimeRecords } from "./calendarEntityUtils";
import { isCarBooking, getCarBookingLabel, getCarBookingTimes } from "./calendarCarUtils";

export const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

export function isBlock(app: any): boolean {
    return Boolean(app.description?.includes('[BLOCK]'));
}

export function getBlockText(app: any): string {
    return app.description?.replace('[BLOCK]', '').trim() || 'Sperrzeit / Abwesend';
}

/**
 * Sortiert Termine so, dass eigene Termine des Benutzers VORRANGIG an oberster Stelle stehen:
 * 1. Sperrzeiten ([BLOCK]) an oberster Position
 * 2. Eigene Termine des Benutzers (isAppointmentOwner)
 * 3. Termine anderer Kollegen
 * Innerhalb der Gruppen chronologisch aufsteigend nach Uhrzeit.
 */
export function sortAppointmentsPrioritizingOwner(appointments: any[], currentUserId?: string): any[] {
    if (!appointments || appointments.length === 0) return [];
    return [...appointments].sort((a: any, b: any) => {
        const blockA = isBlock(a) ? 1 : 0;
        const blockB = isBlock(b) ? 1 : 0;
        if (blockA !== blockB) return blockB - blockA;

        if (currentUserId) {
            const isMineA = isAppointmentOwner(a, currentUserId) ? 1 : 0;
            const isMineB = isAppointmentOwner(b, currentUserId) ? 1 : 0;
            if (isMineA !== isMineB) return isMineB - isMineA;
        }

        const timeA = a.appointment ? new Date(a.appointment).getTime() : 0;
        const timeB = b.appointment ? new Date(b.appointment).getTime() : 0;
        return timeA - timeB;
    });
}

export function getCompanyColor(app: any, isSuperAdmin: boolean, companies: any[] = []): string | null {
    if (!isSuperAdmin || !companies?.length) return null;
    let uCompId = app.expand?.user?.company || app.expand?.client?.[0]?.company?.[0];
    if (!uCompId) return null;
    if (Array.isArray(uCompId)) uCompId = uCompId[0];
    else if (typeof uCompId === 'string' && uCompId.startsWith('[')) {
        try { uCompId = JSON.parse(uCompId)[0]; } catch {}
    }
    const comp = companies.find(c => c.id === uCompId);
    return comp?.calendar_color || comp?.primary_color || null;
}

export function getDisplayTime(app: any): string {
    if (app.is_google) {
        if (app.is_all_day) return 'Ganztägig';
        const start = app.appointment ? new Date(app.appointment).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '';
        const end = app.end_time ? new Date(app.end_time).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '';
        return start && end ? `${start} – ${end}` : (start || 'Google');
    }
    if (isCarBooking(app)) {
        const times = getCarBookingTimes(app);
        return times.full || (app.appointment ? new Date(app.appointment).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '');
    }
    const trs = getAppointmentTimeRecords(app);
    const validTr = trs.find((r: any) => r.start && r.end);
    if (validTr) {
        const start = new Date(validTr.start).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
        const end = new Date(validTr.end).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
        return `${start} – ${end}`;
    }
    const runningTr = trs.find((r: any) => r.start && !r.end);
    if (runningTr) {
        const start = new Date(runningTr.start).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
        return `${start} (Live)`;
    }
    if (app.appointment) {
        const start = new Date(app.appointment).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
        if (app.appointment_end) {
            const end = new Date(app.appointment_end).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
            return `${start} – ${end}`;
        }
        return start;
    }
    return '';
}

export function getCardTitle(app: any, isGuest = false, currentUser: any = null, isGodMode = false): string {
    if (app.is_google) return app.description || app.title || 'Privater Termin';
    if (isGuest) return "Belegt";
    if (isCarBooking(app)) {
        const isOwner = isAppointmentOwner(app, currentUser?.id) || isGodMode;
        if (!isOwner) return "Fahrzeug belegt";
        return app.description || app.title || `Fahrzeug (${getCarBookingLabel(app)})`;
    }
    if (app.is_private && app.user !== currentUser?.id && !isGodMode) return "Privater Termin";
    if (isBlock(app)) return getBlockText(app);

    const clientName = getAppointmentClientName(app);
    if (clientName) return clientName;

    const hasClientRel = Boolean(
        (Array.isArray(app.client) && app.client.length > 0) ||
        (typeof app.client === 'string' && app.client.trim() !== '' && app.client !== '[]')
    );

    if (app.type === 'internal' || !hasClientRel) {
        return app.title || app.description || 'Interner Termin';
    }
    
    return 'Klient nicht zugeordnet';
}

export function getCardSubtitle(app: any, isGuest = false, currentUser: any = null, isGodMode = false): string {
    if (app.is_google) {
        if (isGodMode && app.expand?.user && app.expand.user.id !== currentUser?.id) {
            return `🗓️ Google (${app.expand.user.name_first || app.expand.user.email})`;
        }
        return "🗓️ Google Kalender";
    }
    if (isCarBooking(app)) {
        const isOwner = isAppointmentOwner(app, currentUser?.id) || isGodMode;
        if (!isOwner) return "";
        return app.notes || app.description || '';
    }
    if (isGuest || (app.is_private && app.user !== currentUser?.id && !isGodMode)) return "";
    if (isBlock(app)) return "Sperrzeit";
    return app.description || '';
}

export function getCardStateClasses(app: any, currentUserId?: string, isSuperAdmin = false): string {
    const classes = [];
    if (isCarBooking(app) && currentUserId && !isAppointmentOwner(app, currentUserId) && !isSuperAdmin) {
        classes.push('opacity-40 pointer-events-none');
        return classes.join(' ');
    }
    if (app.status === 'abgesagt') classes.push('opacity-50 saturate-50 line-through');
    else if (app.settled) classes.push('grayscale opacity-60');
    else if (currentUserId && !isAppointmentOwner(app, currentUserId)) classes.push('opacity-60 saturate-50 hover:opacity-100 hover:saturate-100');
    return classes.join(' ');
}
