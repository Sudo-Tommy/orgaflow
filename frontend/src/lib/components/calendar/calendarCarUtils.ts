import { getAppointmentTimeRecords, isAppointmentOwner } from "./calendarEntityUtils";

export function isCarBooking(app: any): boolean {
    if (!app) return false;
    if (app.vehicleId || app.vehicleName || app.type === 'car_booking') return true;
    const text = `${app.title || ''} ${app.description || ''} ${app.summary || ''} ${app.notes || ''}`.toLowerCase();
    return (
        text.includes('booking tarif flex') ||
        text.includes('teilauto-buchung') ||
        text.includes('teilauto buchung') ||
        text.includes('teilauto') ||
        text.includes('tarif flex') ||
        (text.includes('booking') && text.includes('flex')) ||
        text.includes('carsharing')
    );
}

export function getCarBookingLabel(app: any): string {
    if (app?.vehicleName) return app.vehicleName;
    const text = `${app.title || ''} ${app.description || ''} ${app.summary || ''} ${app.notes || ''}`.toLowerCase();
    if (text.includes('teilauto')) return 'teilAuto';
    if (text.includes('tarif flex')) return 'Tarif Flex';
    if (text.includes('booking')) return 'Booking';
    return 'Fahrzeug';
}

export function getCarBookingTimes(app: any): { start: string; end: string; full: string } {
    let startStr = '';
    let endStr = '';

    const trs = getAppointmentTimeRecords(app);
    const tr = trs[0];
    if (tr?.start && tr?.end) {
        startStr = new Date(tr.start).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
        endStr = new Date(tr.end).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    } else if (app.appointment) {
        startStr = new Date(app.appointment).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
        if (app.duration) {
            const endMs = new Date(app.appointment).getTime() + (Number(app.duration) * 60 * 1000);
            endStr = new Date(endMs).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
        }
    }

    const full = startStr && endStr ? `${startStr} – ${endStr}` : (startStr || '');
    return { start: startStr, end: endStr, full };
}

export function isAppInCarBooking(app: any, carBookings: any[], currentUserId?: string): boolean {
    if (!carBookings || carBookings.length === 0) return false;
    if (!app?.appointment) return false;
    // Buchungs-Badge soll nur für die eigenen Termine gelten
    if (currentUserId && !isAppointmentOwner(app, currentUserId)) return false;

    const appStart = new Date(app.appointment).getTime();
    if (isNaN(appStart)) return false;

    for (const car of carBookings) {
        // Das Fahrzeug muss dem aktuellen Nutzer gehören
        if (currentUserId && !isAppointmentOwner(car, currentUserId)) continue;

        const carStart = new Date(car.appointment).getTime();
        const tr = car.expand?.time_record?.[0];
        let carEnd = tr?.end ? new Date(tr.end).getTime() : (carStart + 8 * 60 * 60 * 1000);
        if (isNaN(carEnd)) carEnd = carStart + 8 * 60 * 60 * 1000;
        
        if (appStart >= (carStart - 15 * 60 * 1000) && appStart <= (carEnd + 15 * 60 * 1000)) {
            return true;
        }
    }
    return false;
}
