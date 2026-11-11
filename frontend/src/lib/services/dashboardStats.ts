import { isAppointmentOwner, sortAppointmentsPrioritizingOwner } from "$lib/components/calendar/calendarUtils";
import { isAppointmentEnded } from "./appointmentStatusHelper";

/**
 * Filtert Termine für den heutigen Tag unter Berücksichtigung von PB & Google-Terminen sowie Benutzerfiltern.
 */
export function filterAppointmentsForToday(
	pbAppointments: any[],
	googleEvents: any[],
	isAdmin: boolean,
	dashboardUserFilter: 'mine' | 'all' | string,
	myUserId?: string
): any[] {
	const today = new Date();

	const pbApps = pbAppointments.filter((app: any) => {
		if (!app.appointment) return false;
		const d = new Date(app.appointment);
		const isToday = d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
		if (!isToday) return false;

		if (!isAdmin || dashboardUserFilter === 'mine') {
			return isAppointmentOwner(app, myUserId);
		}
		if (dashboardUserFilter === 'all') return true;
		return isAppointmentOwner(app, dashboardUserFilter);
	});

	const gApps = googleEvents.filter((g: any) => {
		if (!g.appointment) return false;
		const start = new Date(g.appointment);
		const end = g.expand?.time_record?.[0]?.end ? new Date(g.expand.time_record[0].end) : start;
		const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
		const s = new Date(start.getFullYear(), start.getMonth(), start.getDate());
		const e = new Date(end.getFullYear(), end.getMonth(), end.getDate());
		const inRange = t >= s && t <= e;
		if (!inRange) return false;

		if (!isAdmin || dashboardUserFilter === 'mine') {
			return !g.user || isAppointmentOwner(g, myUserId);
		}
		if (dashboardUserFilter === 'all') return true;
		return isAppointmentOwner(g, dashboardUserFilter);
	});

	return sortAppointmentsPrioritizingOwner([...pbApps, ...gApps], myUserId);
}

/**
 * Filtert Termine für die kommenden 7 Tage.
 */
export function filterUpcoming7DaysAppointments(
	pbAppointments: any[],
	googleEvents: any[],
	isAdmin: boolean,
	dashboardUserFilter: 'mine' | 'all' | string,
	myUserId?: string
): any[] {
	const today = new Date();
	today.setHours(23, 59, 59, 999);
	const in7Days = new Date();
	in7Days.setDate(in7Days.getDate() + 7);
	in7Days.setHours(23, 59, 59, 999);

	const pbApps = pbAppointments.filter((app: any) => {
		if (!app.appointment) return false;
		const d = new Date(app.appointment);
		const isUpcoming = d.getTime() > today.getTime() && d.getTime() <= in7Days.getTime();
		if (!isUpcoming) return false;

		if (!isAdmin || dashboardUserFilter === 'mine') {
			return isAppointmentOwner(app, myUserId);
		}
		if (dashboardUserFilter === 'all') return true;
		return isAppointmentOwner(app, dashboardUserFilter);
	});

	const gApps = googleEvents.filter((g: any) => {
		if (!g.appointment) return false;
		const d = new Date(g.appointment);
		const isUpcoming = d.getTime() > today.getTime() && d.getTime() <= in7Days.getTime();
		if (!isUpcoming) return false;

		if (!isAdmin || dashboardUserFilter === 'mine') {
			return !g.user || isAppointmentOwner(g, myUserId);
		}
		if (dashboardUserFilter === 'all') return true;
		return isAppointmentOwner(g, dashboardUserFilter);
	});

	return sortAppointmentsPrioritizingOwner([...pbApps, ...gApps], myUserId);
}

/**
 * Filtert offene Rechnungen im Scope des Benutzers.
 */
export function getOpenInvoices(
	invoices: any[],
	isSuperAdmin: boolean,
	myUserId?: string,
	canAccessFinances: boolean = false,
	isRecordInScope: (rec: any) => boolean = () => true
): any[] {
	if (!canAccessFinances) return [];
	return invoices.filter((inv: any) => {
		if (!isRecordInScope(inv)) return false;
		const isMyInvoice = isSuperAdmin || inv.user === myUserId || (Array.isArray(inv.user) && inv.user.includes(myUserId));
		return isMyInvoice && inv.status !== 'Abgeschlossen' && inv.status !== 'Storniert' && inv.status !== 'Abgelehnt';
	});
}

/**
 * Ermittelt monatliche geleistete Stunden und gefahrene Kilometer.
 */
export function getMonthlyStats(
	appointments: any[],
	isAdmin: boolean,
	myUserId?: string,
	isRecordInScope: (rec: any) => boolean = () => true
): { hours: number; kms: number } {
	let hours = 0;
	let kms = 0;

	const today = new Date();
	const currentMonth = today.getMonth();
	const currentYear = today.getFullYear();

	appointments.forEach((app: any) => {
		if (!app.appointment) return;
		if (!isRecordInScope(app)) return;
		if (!isAdmin && app.user !== myUserId) return;

		const d = new Date(app.appointment);
		if (d.getTime() > today.getTime()) return;

		if (d.getMonth() === currentMonth && d.getFullYear() === currentYear && isWorkAppointment(app)) {
			if (app.expand?.time_record) {
				app.expand.time_record.forEach((tr: any) => {
					if (tr.start && tr.end) {
						const diffMs = new Date(tr.end).getTime() - new Date(tr.start).getTime();
						if (diffMs > 0) hours += diffMs / 3600000;
					}
				});
			}
			if (app.expand?.drive_record) {
				app.expand.drive_record.forEach((dr: any) => { kms += (dr.km || 0); });
			}
		}
	});

	return { hours, kms };
}

/**
 * Prüft, ob ein Termin ein blockierter Zeitraum / Sperrzeit ist.
 */
export function isBlock(app: any): boolean {
	if (!app) return false;
	if (app.is_blocked === true || app.is_blocked === 'true') return true;
	const text = `${app.title || ''} ${app.description || ''} ${app.summary || ''}`.toUpperCase();
	return text.includes('[BLOCK]');
}

/**
 * Liefert den lesbaren Text einer Sperrzeit ohne das [BLOCK]-Präfix.
 */
export function getBlockText(app: any): string {
	if (!app) return 'Sperrzeit / Abwesend';
	const text = app.title || app.description || app.summary || '';
	const cleaned = text.replace(/\[BLOCK\]/gi, '').trim();
	return cleaned || 'Sperrzeit / Abwesend';
}

/**
 * Prüft, ob ein Termin als privat markiert ist.
 */
export function isPrivateAppointment(app: any): boolean {
	if (!app) return false;
	return app.is_private === true || app.is_private === 'true' || app.type === 'private';
}

/**
 * Prüft, ob ein Termin ein regulärer Arbeitseinsatz ist (weder blockiert, noch privat, noch abgesagt).
 */
export function isWorkAppointment(app: any): boolean {
	if (!app) return false;
	if (isPrivateAppointment(app)) return false;
	if (isBlock(app)) return false;
	if (app.status === 'abgesagt') return false;
	return true;
}

/**
 * Filtert unvollständige Nachbereitungen vergangener Termine.
 */
export function getMissingFollowUps(
	appointments: any[],
	isAdmin: boolean,
	myUserId?: string,
	isRecordInScope: (rec: any) => boolean = () => true
): any[] {
	const now = Date.now();
	return appointments.filter((app: any) => {
		if (!isRecordInScope(app)) return false;
		if ((!isAdmin && app.user !== myUserId) || app.settled) return false;
		if (!isWorkAppointment(app) || !app.appointment) return false;

		const isPast = new Date(app.appointment).getTime() < now;
		if (!isPast) return false;

		// Laufende Termine ignorieren
		if (app.expand?.time_record?.some((tr: any) => tr.start && !tr.end)) return false;

		const isMissingReport = !app.report && !app.notes && !app.internal_notes;
		const isMissingTime = !app.expand?.time_record || app.expand.time_record.length === 0;
		const isMissingTasks = !app.expand?.tasks || app.expand.tasks.length === 0;

		return isMissingReport || isMissingTime || isMissingTasks;
	}).sort((a: any, b: any) => {
		const isMineA = isAppointmentOwner(a, myUserId);
		const isMineB = isAppointmentOwner(b, myUserId);
		if (isMineA !== isMineB) return isMineA ? -1 : 1;
		return new Date(b.appointment).getTime() - new Date(a.appointment).getTime();
	});
}

/**
 * Filtert nicht abgerechnete Termine der Vergangenheit (Zukunft ist strikt ausgeschlossen).
 */
export function getUnsettledAppointments(
	appointments: any[],
	isAdmin: boolean,
	myUserId?: string,
	isRecordInScope: (rec: any) => boolean = () => true
): any[] {
	const now = Date.now();
	return appointments.filter((app: any) => {
		if (!isRecordInScope(app) || app.settled || !isWorkAppointment(app) || !app.appointment) return false;
		const appTime = new Date(app.appointment).getTime();
		if (isNaN(appTime) || appTime > now) return false;
		const assignedUser = app.billing_user || (Array.isArray(app.user) ? app.user[0] : app.user);
		if (!isAdmin && assignedUser !== myUserId) return false;
		return true;
	}).sort((a: any, b: any) => {
		const isMineA = (a.billing_user || a.user) === myUserId;
		const isMineB = (b.billing_user || b.user) === myUserId;
		if (isMineA !== isMineB) return isMineA ? -1 : 1;
		return new Date(b.appointment).getTime() - new Date(a.appointment).getTime();
	});
}
