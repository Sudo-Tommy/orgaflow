/**
 * Hilfsfunktionen für die Folgetermin-Erstellung (FollowUp)
 */

/**
 * Berechnet die Folgetermin-Beschreibung basierend auf dem Ausgangstermin.
 * Hängt ' - Folgetermin' an, verhindert Dopplungen und nutzt bei leerer Beschreibung den Klienten als Fallback.
 */
export function computeFollowUpDescription(sourceDescription?: string | null, clientName?: string | null): string {
    const raw = (sourceDescription || '').replace(/\[BLOCK\]/g, '').trim();
    
    if (!raw) {
        return clientName ? `Folgetermin: ${clientName}` : 'Folgetermin';
    }
    
    // Prüfen, ob der Text bereits auf "Folgetermin" endet (z. B. "Check-Up - Folgetermin")
    const endsWithFollowUp = /(?:[\s\-_–—]+)?Folgetermin$/i.test(raw);
    if (endsWithFollowUp) {
        return raw;
    }
    
    // Prüfen, ob der Text bereits mit "Folgetermin:" beginnt
    if (/^Folgetermin:/i.test(raw)) {
        return raw;
    }

    return `${raw} - Folgetermin`;
}

/**
 * Formatiert ein Date-Objekt in das lokale Datumsformat YYYY-MM-DD
 */
export function getLocalDateString(date: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Berechnet die Endzeit (HH:mm) aus Startzeit und Dauer in Minuten
 */
export function calculateEndTime(startTime: string, durationMinutes: number): string {
    if (!startTime) return "10:30";
    const [h, m] = startTime.split(":").map(Number);
    const totalMinutes = h * 60 + m + durationMinutes;
    const endH = Math.floor(totalMinutes / 60) % 24;
    const endM = totalMinutes % 60;
    return `${endH.toString().padStart(2, "0")}:${endM.toString().padStart(2, "0")}`;
}

/**
 * Prüft auf Terminkollisionen für einen Mitarbeiter im gewählten Zeitfenster
 */
export function checkAppointmentCollision(
    appointments: any[],
    targetDate: string,
    startTime: string,
    endTime: string,
    selectedUserId?: string
): string | null {
    if (!targetDate || !startTime || !endTime || !appointments) return null;
    const proposedStart = new Date(`${targetDate}T${startTime}:00`).getTime();
    const proposedEnd = new Date(`${targetDate}T${endTime}:00`).getTime();

    const conflicts = appointments.filter((app: any) => {
        if (!app.appointment) return false;
        const appUser = Array.isArray(app.user) ? app.user[0] : app.user;
        if (selectedUserId && appUser && appUser !== selectedUserId) return false;

        const timeRecords = app.expand?.time_record || [];
        if (timeRecords.length > 0) {
            return timeRecords.some((tr: any) => {
                if (!tr.start || !tr.end) return false;
                const trStart = new Date(tr.start).getTime();
                const trEnd = new Date(tr.end).getTime();
                return proposedStart < trEnd && proposedEnd > trStart;
            });
        } else {
            const appStart = new Date(app.appointment).getTime();
            const appEnd = appStart + 90 * 60 * 1000;
            return proposedStart < appEnd && proposedEnd > appStart;
        }
    });

    if (conflicts.length > 0) {
        const conflict = conflicts[0];
        const timeStr = conflict.appointment ? new Date(conflict.appointment).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '';
        return `Kollision: Es existiert bereits ein Termin um ${timeStr} Uhr (${conflict.description || 'Belegt'}).`;
    }
    return null;
}

/**
 * Extrahiert Startzeit (HH:mm) und Dauer (Minuten) aus einem Ausgangstermin
 */
export function extractStartTimeAndDuration(sourceApp: any): { startTime: string; durationMinutes: number } {
    let startTime = "09:00";
    let durationMinutes = 90;

    const firstTr = sourceApp?.expand?.time_record?.[0];
    if (firstTr?.start) {
        const s = new Date(firstTr.start);
        startTime = `${s.getHours().toString().padStart(2, '0')}:${s.getMinutes().toString().padStart(2, '0')}`;
        if (firstTr.end) {
            const diffMin = Math.round((new Date(firstTr.end).getTime() - s.getTime()) / 60000);
            if (diffMin > 0) durationMinutes = diffMin;
        }
    } else if (sourceApp?.appointment) {
        const s = new Date(sourceApp.appointment);
        startTime = `${s.getHours().toString().padStart(2, '0')}:${s.getMinutes().toString().padStart(2, '0')}`;
    }
    return { startTime, durationMinutes };
}
