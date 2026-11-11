/**
 * appointmentStatusHelper.ts
 * Zentraler Helper zur Statusermittlung und Validierung von Terminen.
 * Erkennt beendete Termine und ermittelt Pflichtangaben sowie fehlende Daten.
 */
import { rbacService } from "$lib/services/rbacService.svelte";

export interface MissingAppointmentItem {
    key: 'client' | 'billing' | 'report' | 'time' | 'tasks' | 'drive';
    label: string;
    icon: string;
    hint: string;
}

export function isWorkAppointment(app: any): boolean {
    if (!app) return false;
    if (app.is_private === true || app.is_private === 'true' || app.type === 'private') return false;
    if (app.is_blocked === true || app.is_blocked === 'true') return false;
    const text = `${app.title || ''} ${app.description || ''} ${app.summary || ''}`.toUpperCase();
    if (text.includes('[BLOCK]')) return false;
    if (app.status === 'abgesagt') return false;
    return true;
}

export function checkHasTasks(app: any): boolean {
    if (!app) return false;
    const hasExpandTasks = Array.isArray(app.expand?.tasks) && app.expand.tasks.length > 0;
    const hasDirectTasks = Array.isArray(app.tasks) && app.tasks.length > 0;
    const hasChecklist = Array.isArray(app.checklist) && app.checklist.length > 0;
    return hasExpandTasks || hasDirectTasks || hasChecklist;
}

export function checkHasEndedTimeRecord(app: any): boolean {
    if (!app) return false;
    const trs = app.expand?.time_record;
    if (!Array.isArray(trs) || trs.length === 0) return false;
    return trs.some((tr: any) => Boolean(tr.start && tr.end));
}

export function checkHasClient(app: any): boolean {
    if (!app) return false;
    if (Array.isArray(app.client) && app.client.length > 0) return true;
    if (typeof app.client === 'string' && app.client.trim().length > 0) return true;
    if (app.expand?.client) return true;
    return false;
}

/**
 * Ein Termin gilt als beendet, wenn er in der Vergangenheit liegt und entweder
 * explizit 'beendet' bzw. abgerechnet ist ODER Leistungen UND eine abgeschlossene Zeiterfassung besitzt.
 * Termine in der Zukunft dürfen NIEMALS als beendet gelten!
 */
export function isAppointmentEnded(app: any): boolean {
    if (!app) return false;
    if (app.settled) return true;
    const appTime = app.appointment ? new Date(app.appointment).getTime() : 0;
    if (appTime > Date.now()) return false;
    if (app.status === 'beendet') return true;
    if (isWorkAppointment(app) && checkHasTasks(app) && checkHasEndedTimeRecord(app)) return true;
    return false;
}

export function isAppointmentOverdue(app: any): boolean {
    if (!app || !isWorkAppointment(app)) return false;
    if (isAppointmentEnded(app) || app.status === 'abgesagt') return false;
    const appTime = app.appointment ? new Date(app.appointment).getTime() : 0;
    return appTime > 0 && appTime < Date.now();
}

/**
 * Ein Termin ist wirklich abrechnungsbereit ('Bereit'), wenn:
 * 1. Er in der Vergangenheit liegt (keine Zukunftstermine)
 * 2. Er nicht bereits abgerechnet ist
 * 3. Klient, Abrechnungsart, Leistungen und abgeschlossene Zeiterfassung vorliegen
 */
export function isAppointmentSettlementReady(app: any): boolean {
    if (!app || !isWorkAppointment(app) || app.settled) return false;
    const appTime = app.appointment ? new Date(app.appointment).getTime() : 0;
    if (appTime > Date.now()) return false;
    return checkHasClient(app) &&
           Boolean(app.billing_type && String(app.billing_type).trim() !== '') &&
           checkHasTasks(app) &&
           checkHasEndedTimeRecord(app);
}

export function isDeveloperUser(user: any): boolean {
    if (!user) return false;
    const role = user.role || '';
    const email = (user.email || '').toLowerCase();
    return role === 'developer' || role === 'superadmin' || email === 't.jenzsch@ihre-seniorenassistenz.com';
}

export function canManageAppointmentCompletion(app: any, userId?: string, isSuper = false, isAdmin = false): boolean {
    if (!app) return false;
    if (isSuper || isAdmin) return true;
    if (!userId) return false;
    if (app.user === userId) return true;
    if (Array.isArray(app.user) && app.user.includes(userId)) return true;
    if (app.assigned_to === userId) return true;
    return false;
}

export function validateAppointmentForCompletion(app: any): { isValid: boolean; missing: MissingAppointmentItem[] } {
    const missing: MissingAppointmentItem[] = [];
    if (!app) return { isValid: false, missing };

    if (!checkHasClient(app)) {
        missing.push({ key: 'client', label: 'Klient fehlt', icon: '👤', hint: 'Einen Klienten zuweisen' });
    }
    if (rbacService.canAccessFinances && (!app.billing_type || String(app.billing_type).trim() === '')) {
        missing.push({ key: 'billing', label: 'Abrechnungsart fehlt', icon: '💶', hint: 'Abrechnungsart (z.B. EL, 45a) wählen' });
    }
    if (!checkHasTasks(app)) {
        missing.push({ key: 'tasks', label: 'Leistungen fehlen', icon: '📋', hint: 'Mindestens eine Leistung angeben' });
    }
    if (!checkHasEndedTimeRecord(app)) {
        missing.push({ key: 'time', label: 'Zeiterfassung fehlt', icon: '⏱️', hint: 'Arbeitszeit mit Start und Ende erfassen' });
    }

    return { isValid: missing.length === 0, missing };
}

export function getAppointmentMissingItems(app: any): MissingAppointmentItem[] {
    if (!app || !isWorkAppointment(app) || app.status === 'abgesagt') return [];
    const now = Date.now();
    const appTime = app.appointment ? new Date(app.appointment).getTime() : 0;
    if (appTime > now) return [];

    const { missing } = validateAppointmentForCompletion(app);
    const hasReport = Boolean((app.report || '').trim() || (app.notes || '').trim() || (app.internal_notes || '').trim());
    if (!hasReport) {
        missing.push({ key: 'report', label: 'Besuchsbericht fehlt', icon: '📝', hint: 'Bericht oder Dokumentation des Termins eintragen' });
    }
    const hasDrives = Array.isArray(app.expand?.drive_record) && app.expand.drive_record.length > 0;
    if (!hasDrives) {
        missing.push({ key: 'drive', label: 'Fahrten / KM fehlen', icon: '🚗', hint: 'Gefahrene Kilometer erfassen' });
    }
    // Hinweis: Checklisten-To-Dos sind rein optional und gelten niemals als fehlend.
    return missing;
}
