export const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

export function isSameDay(d1: Date | null, d2: Date | null): boolean {
    if (!d1 || !d2) return false;
    return d1.getDate() === d2.getDate() && 
           d1.getMonth() === d2.getMonth() && 
           d1.getFullYear() === d2.getFullYear();
}

export function formatTime(dateStr: string): string {
    try {
        return new Date(dateStr).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    } catch {
        return '--:--';
    }
}

export function getAppsForDate(visibleAppointments: any[], date: Date): any[] {
    return visibleAppointments.filter((app: any) => {
        if (!app.appointment) return false;
        if (app.is_private === true || app.is_visible === false) return false;
        return isSameDay(new Date(app.appointment), date);
    }).sort((a: any, b: any) => new Date(a.appointment).getTime() - new Date(b.appointment).getTime());
}

export function computeCalendarDays(currentDate: Date, getApps: (d: Date) => any[]): any[] {
    const y = currentDate.getFullYear();
    const m = currentDate.getMonth();
    const days = [];

    const firstDay = new Date(y, m, 1);
    let startDay = firstDay.getDay() || 7; 
    startDay -= 1; 

    const prevMonthLastDay = new Date(y, m, 0).getDate();
    for (let i = startDay - 1; i >= 0; i--) {
        const d = new Date(y, m - 1, prevMonthLastDay - i);
        days.push({ date: d, isCurrentMonth: false, apps: getApps(d) });
    }
    const lastDay = new Date(y, m + 1, 0).getDate();
    for (let i = 1; i <= lastDay; i++) {
        const d = new Date(y, m, i);
        days.push({ date: d, isCurrentMonth: true, apps: getApps(d) });
    }
    const remaining = 42 - days.length; 
    for (let i = 1; i <= remaining; i++) {
        const d = new Date(y, m + 1, i);
        days.push({ date: d, isCurrentMonth: false, apps: getApps(d) });
    }
    return days;
}

export function computeWeekDays(selectedDate: Date, currentDate: Date, getApps: (d: Date) => any[]): any[] {
    const anchor = selectedDate || currentDate;
    const d = new Date(anchor);
    const day = d.getDay() || 7;
    const monday = new Date(d);
    monday.setDate(d.getDate() - (day - 1));
    const list = [];
    for (let i = 0; i < 7; i++) {
        const dayDate = new Date(monday);
        dayDate.setDate(monday.getDate() + i);
        list.push({
            date: dayDate,
            isCurrentMonth: dayDate.getMonth() === currentDate.getMonth(),
            apps: getApps(dayDate)
        });
    }
    return list;
}
