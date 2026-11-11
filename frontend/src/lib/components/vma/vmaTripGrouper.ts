export function groupAppointmentsIntoTrips(appointments: any[]): any[][] {
    const validAppointments = appointments.filter(app => {
        const desc = (app.description || "").toLowerCase();
        const isBlocked = desc.includes('[block]');
        const isExclusion = desc.includes('wochenende') || desc.includes('geschlossen');
        const hasTasks = app.tasks && (Array.isArray(app.tasks) ? app.tasks.length > 0 : !!app.tasks);
        const hasClient = app.client && (Array.isArray(app.client) ? app.client.length > 0 : !!app.client);
        const hasDuration = app.expand?.time_record && app.expand.time_record.some((tr: any) => tr.start && tr.end);
        if ((isBlocked && isExclusion) || (!hasTasks && !hasClient)) return false;
        return hasDuration;
    }).sort((a: any, b: any) => new Date(a.appointment).getTime() - new Date(b.appointment).getTime());

    if (validAppointments.length === 0) return [];

    const trips: any[][] = [];
    let currentTrip: any[] = [];
    for (let i = 0; i < validAppointments.length; i++) {
        const app = validAppointments[i];
        if (currentTrip.length === 0) {
            currentTrip.push(app);
        } else {
            const lastApp = currentTrip[currentTrip.length - 1];
            let lastEnd = new Date(lastApp.appointment);
            if (lastApp.expand?.time_record?.length > 0) {
                const latest = lastApp.expand.time_record.reduce((max: any, curr: any) =>
                    (curr.end && new Date(curr.end).getTime() > new Date(max.end || 0).getTime()) ? curr : max
                );
                if (latest.end) lastEnd = new Date(latest.end);
            } else {
                lastEnd.setHours(lastEnd.getHours() + 1);
            }

            const lastDateStr = new Date(lastApp.appointment).toLocaleDateString('en-CA');
            const currDateStr = new Date(app.appointment).toLocaleDateString('en-CA');
            const isSameDay = lastDateStr === currDateStr;
            const diffDays = Math.round((new Date(currDateStr).getTime() - new Date(lastDateStr).getTime()) / (1000 * 60 * 60 * 24));
            const isNextDay = diffDays === 1;
            const isSameTitle = app.description === lastApp.description;
            const gapHours = (new Date(app.appointment).getTime() - lastEnd.getTime()) / (1000 * 60 * 60);
            const descLower = (app.description || "").toLowerCase();
            const isTravelKeyword = descLower.includes('reise') || descLower.includes('begleitung') || descLower.includes('aufenthalt') || descLower.includes('übernachtung');
            const isContinuousTrip = isSameTitle && isNextDay && (gapHours < 12 || isTravelKeyword);

            if (isSameDay || (isNextDay && isContinuousTrip)) {
                currentTrip.push(app);
            } else {
                trips.push(currentTrip);
                currentTrip = [app];
            }
        }
    }
    if (currentTrip.length > 0) trips.push(currentTrip);
    return trips;
}
