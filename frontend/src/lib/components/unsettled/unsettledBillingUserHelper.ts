import { getAppointmentPayerCategory } from "./unsettledPayerHelper";
import { isAppReady } from "./unsettledHelper";

export interface BillingUserOption {
    id: string;
    name: string;
    initials: string;
    count: number;
    role?: string;
}

export type BillingUserFilter = "all" | "unassigned" | string;

/**
 * Returns a human-friendly display name for a user (Vorname Nachname).
 */
export function getUserDisplayName(user: any): string {
    if (!user) return "Nicht zugewiesen";
    const first = (user.name_first || "").trim();
    const last = (user.name_last || "").trim();
    if (first && last) return `${first} ${last}`;
    if (first) return first;
    if (last) return last;
    return user.username || user.email || "Mitarbeiter";
}

/**
 * Extracts 2 initials for a user avatar/badge.
 */
export function getUserInitials(user: any): string {
    if (!user) return "??";
    const first = (user.name_first || "").trim();
    const last = (user.name_last || "").trim();
    const f = first ? first[0].toUpperCase() : "";
    const l = last ? last[0].toUpperCase() : "";
    if (f && l) return `${f}${l}`;
    if (f) return f;
    const name = user.username || "";
    return name ? name.substring(0, 2).toUpperCase() : "MA";
}

/**
 * Resolves the billing user ID for an appointment.
 * Priority: app.billing_user -> client.billing_user -> fallback by payer/assignee
 */
export function getAppointmentBillingUserId(app: any, clientObj?: any, users?: any[]): string | undefined {
    if (app?.billing_user) {
        return typeof app.billing_user === "string" ? app.billing_user : app.billing_user.id;
    }
    if (app?.expand?.billing_user?.id) {
        return app.expand.billing_user.id;
    }

    const client = clientObj || app?.expand?.client?.[0];
    if (client?.billing_user) {
        return typeof client.billing_user === "string" ? client.billing_user : client.billing_user.id;
    }

    // Legacy Fallback (Doreen für Kasse, Tommy für Privat) falls Users übergeben
    if (users && users.length > 0) {
        const category = getAppointmentPayerCategory(app, client);
        if (category === "privat") {
            const tommy = users.find(u => (u.name_first || "").toLowerCase().includes("tommy"));
            if (tommy) return tommy.id;
        } else {
            const doreen = users.find(u => (u.name_first || "").toLowerCase().includes("doreen"));
            if (doreen) return doreen.id;
        }
    }

    if (app?.user) {
        return typeof app.user === "string" ? app.user : app.user.id;
    }

    return undefined;
}

/**
 * Finds user record in the list of users by ID.
 */
export function findUserById(userId: string | undefined, users: any[] = []): any | null {
    if (!userId) return null;
    return users.find(u => u.id === userId) || null;
}

/**
 * Builds and sorts all billing user options alphabetically per rule 'alphabetical-select.md'.
 * Counts appointments matching the specified status and month filters to guarantee consistent tab badges.
 */
export function getBillingUserOptions(
    appointments: any[] = [],
    users: any[] = [],
    statusFilter: "all" | "ready" | "incomplete" = "all",
    monthFilter: string = "all"
): { options: BillingUserOption[]; unassignedCount: number; totalCount: number } {
    const userMap = new Map<string, BillingUserOption>();
    
    // Initialisiere alle vorhandenen aktiven Mitarbeiter (außer Portal-Klienten)
    for (const u of users) {
        if (!u.id || u.role === "client") continue;
        const name = getUserDisplayName(u);
        userMap.set(u.id, {
            id: u.id,
            name,
            initials: getUserInitials(u),
            count: 0,
            role: u.role
        });
    }

    const matchingApps = appointments.filter(app => {
        if (statusFilter === "ready" && !isAppReady(app)) return false;
        if (statusFilter === "incomplete" && isAppReady(app)) return false;
        if (monthFilter !== "all" && (!app.appointment || !app.appointment.startsWith(monthFilter))) return false;
        return true;
    });

    let unassignedCount = 0;

    for (const app of matchingApps) {
        const assignedId = getAppointmentBillingUserId(app, undefined, users);
        if (assignedId && userMap.has(assignedId)) {
            userMap.get(assignedId)!.count++;
        } else if (assignedId) {
            const fallbackUser = users.find(u => u.id === assignedId) || app.expand?.billing_user || app.expand?.user;
            const name = getUserDisplayName(fallbackUser);
            userMap.set(assignedId, {
                id: assignedId,
                name,
                initials: getUserInitials(fallbackUser),
                count: 1,
                role: fallbackUser?.role
            });
        } else {
            unassignedCount++;
        }
    }

    // Rule: alphabetical-select.md - strikt alphabetisch nach angezeigtem Namen
    const sortedOptions = Array.from(userMap.values()).sort((a, b) => 
        a.name.localeCompare(b.name, "de", { sensitivity: "base" })
    );

    return {
        options: sortedOptions,
        unassignedCount,
        totalCount: matchingApps.length
    };
}

/**
 * Calculates counts for ready, incomplete, and total appointments for the active employee and month filter.
 */
export function calculateStatusCounts(
    appointments: any[] = [],
    billingUserFilter: BillingUserFilter = "all",
    monthFilter: string = "all",
    users: any[] = []
): { ready: number; incomplete: number; all: number } {
    const userApps = appointments.filter((app: any) => {
        if (monthFilter !== "all" && (!app.appointment || !app.appointment.startsWith(monthFilter))) return false;
        if (billingUserFilter === "unassigned") return !getAppointmentBillingUserId(app, undefined, users);
        if (billingUserFilter !== "all") return getAppointmentBillingUserId(app, undefined, users) === billingUserFilter;
        return true;
    });
    const ready = userApps.filter(a => isAppReady(a)).length;
    return { ready, incomplete: userApps.length - ready, all: userApps.length };
}
