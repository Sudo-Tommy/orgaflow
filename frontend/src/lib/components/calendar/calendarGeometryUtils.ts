import { getAppointmentTimeRecords } from "./calendarEntityUtils";
import { isCarBooking } from "./calendarCarUtils";

export const HOUR_HEIGHT = 64;

export function isSameDay(d1: Date, d2: Date): boolean {
    return d1.getDate() === d2.getDate() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getFullYear() === d2.getFullYear();
}

export function getAppTop(app: any, hourHeight = HOUR_HEIGHT): number {
    const d = new Date(app.appointment || 0);
    return (d.getHours() * hourHeight) + (d.getMinutes() / 60 * hourHeight);
}

export function getAppHeight(app: any, hourHeight = HOUR_HEIGHT): number {
    let durationMinutes = Number(app.duration) || 60;
    if (app.appointment && app.appointment_end) {
        const s = new Date(app.appointment).getTime();
        const e = new Date(app.appointment_end).getTime();
        if (!isNaN(s) && !isNaN(e) && e > s) {
            durationMinutes = Math.round((e - s) / 60000);
        }
    }
    const trs = getAppointmentTimeRecords(app);
    if (isCarBooking(app)) {
        let hasValidTime = false;
        let earliestStart = Infinity;
        let latestEnd = -Infinity;
        trs.forEach((tr: any) => {
            if (tr?.start) {
                const s = new Date(tr.start).getTime();
                if (!isNaN(s)) {
                    hasValidTime = true;
                    const e = tr.end ? new Date(tr.end).getTime() : s + (durationMinutes * 60000);
                    if (s < earliestStart) earliestStart = s;
                    if (e > latestEnd) latestEnd = e;
                }
            }
        });
        if (hasValidTime && latestEnd > earliestStart) {
            durationMinutes = Math.round((latestEnd - earliestStart) / 60000);
        }
    } else if (trs.length > 0) {
        let earliestStart = Infinity;
        let latestEnd = 0;
        let hasValidTime = false;
        trs.forEach((tr: any) => {
            if (tr.start && tr.end) {
                const s = new Date(tr.start).getTime();
                const e = new Date(tr.end).getTime();
                if (!isNaN(s) && !isNaN(e)) {
                    hasValidTime = true;
                    if (s < earliestStart) earliestStart = s;
                    if (e > latestEnd) latestEnd = e;
                }
            }
        });
        if (hasValidTime && latestEnd > earliestStart) {
            durationMinutes = Math.round((latestEnd - earliestStart) / 60000);
        }
    }
    if (durationMinutes > 600 && app.is_multiday) {
        durationMinutes = 600;
    }
    return Math.max(30, Math.min(1440, durationMinutes)) / 60 * hourHeight - 2;
}

export function matchesAppointmentDate(app: any, targetDate: Date): boolean {
    if (!app.appointment) return false;
    const appDate = new Date(app.appointment);

    if (!app.is_multiday && !app.recurrence_rule) {
        return isSameDay(appDate, targetDate);
    }

    const target = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const start = new Date(appDate.getFullYear(), appDate.getMonth(), appDate.getDate());
    if (target < start) return false;

    if (app.is_multiday) {
        const tr = getAppointmentTimeRecords(app)[0];
        let end = start;
        if (tr?.end) {
            const trEnd = new Date(tr.end);
            end = new Date(trEnd.getFullYear(), trEnd.getMonth(), trEnd.getDate());
        } else if (app.appointment_end) {
            const appEnd = new Date(app.appointment_end);
            end = new Date(appEnd.getFullYear(), appEnd.getMonth(), appEnd.getDate());
        }
        return target >= start && target <= end;
    }

    if (app.recurrence_rule) {
        const untilMatch = app.recurrence_rule.match(/UNTIL=(\d{4})(\d{2})(\d{2})/);
        if (untilMatch) {
            const untilDate = new Date(parseInt(untilMatch[1]), parseInt(untilMatch[2]) - 1, parseInt(untilMatch[3]), 23, 59, 59);
            if (target > untilDate) return false;
        }

        const byDayMatch = app.recurrence_rule.match(/BYDAY=([A-Z,]+)/);
        if (byDayMatch) {
            const allowedDays = byDayMatch[1].split(',');
            const dayCodeMap = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
            return allowedDays.includes(dayCodeMap[target.getDay()]);
        }
        return target.getDay() === start.getDay();
    }

    return isSameDay(appDate, targetDate);
}

export function generateIcs(appointments: any[]): Blob | null {
    if (!appointments || appointments.length === 0) return null;
    const formatIcsDate = (dateStr: string) => new Date(dateStr).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//OrgaFlow//Terminkalender//DE',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH'
    ];

    for (const a of appointments) {
        if (!a.appointment) continue;
        const startDate = new Date(a.appointment);
        const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
        const title = (a.description || 'Termin').replace(/\n/g, ' ');
        const location = (a.location_address || '').replace(/\n/g, ' ');

        icsContent.push(
            'BEGIN:VEVENT',
            `UID:${a.id}@orgaflow`,
            `DTSTAMP:${formatIcsDate(new Date().toISOString())}`,
            `DTSTART:${formatIcsDate(startDate.toISOString())}`,
            `DTEND:${formatIcsDate(endDate.toISOString())}`,
            `SUMMARY:${title}`,
            location ? `LOCATION:${location}` : '',
            'END:VEVENT'
        );
    }
    icsContent.push('END:VCALENDAR');
    return new Blob([icsContent.filter(Boolean).join('\r\n')], { type: 'text/calendar;charset=utf-8' });
}
