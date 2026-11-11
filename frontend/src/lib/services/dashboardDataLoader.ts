import { pb } from "$lib/services/pocketbase";
import { googleCalendarService } from "$lib/services/googleCalendarService";
import { sortPersons } from "$lib/utils/sortHelper";

/**
 * Lädt Google-Kalendertermine für das Dashboard.
 */
export async function fetchDashboardGoogleEvents(
	isAdmin: boolean,
	dashboardUserFilter: 'mine' | 'all' | string,
	myUserId?: string
): Promise<any[]> {
	try {
		const now = new Date();
		const timeMin = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toISOString();
		const timeMax = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 9).toISOString();
		const targetUser = (!isAdmin || dashboardUserFilter === 'mine') ? myUserId : dashboardUserFilter;
		return await googleCalendarService.getExternalEvents(timeMin, timeMax, targetUser);
	} catch (err) {
		console.warn('[Dashboard] Google-Termine konnten nicht geladen werden:', err);
		return [];
	}
}

/**
 * Lädt die Benutzerliste für das Dashboard (mandanten- bzw. firmengefiltert) - alphabetisch nach Nachname sortiert.
 */
export async function fetchDashboardUsers(isSuperAdmin: boolean): Promise<any[]> {
	try {
		const users = await pb.collection('users').getFullList({ requestKey: null });
		const myCompanyId = (pb.authStore.record || pb.authStore.model)?.company;
		let filtered = users;
		if (!isSuperAdmin && myCompanyId) {
			filtered = users.filter((u: any) => {
				const uc = Array.isArray(u.company) ? u.company : [u.company];
				return uc.includes(myCompanyId);
			});
		} else if (!isSuperAdmin && !myCompanyId) {
			return [];
		}
		return sortPersons(filtered);
	} catch {
		return [];
	}
}
