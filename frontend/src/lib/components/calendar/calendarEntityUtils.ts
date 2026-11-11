import { orgaStore } from "$lib/stores/orgaStore.svelte";

/**
 * Löst den Klienten eines Termins zuverlässig auf.
 * Priorität:
 * 1. app.expand.client (Array oder Objekt)
 * 2. Fallback: Suche in orgaStore.clients anhand der Klienten-ID in app.client
 */
export function getAppointmentClient(app: any): any {
    if (!app) return null;

    // 1. Prüfung über app.expand?.client
    const expanded = Array.isArray(app.expand?.client) ? app.expand.client[0] : app.expand?.client;
    if (expanded && (expanded.name_first || expanded.name_last)) {
        return expanded;
    }

    // 2. Fallback: Klienten-ID aus app.client oder expanded.id auflösen und im Store suchen
    const rawClient = app.client;
    let clientId: string | null = expanded?.id || null;
    if (!clientId) {
        if (Array.isArray(rawClient) && rawClient.length > 0) {
            clientId = typeof rawClient[0] === 'string' ? rawClient[0] : rawClient[0]?.id;
        } else if (typeof rawClient === 'string' && rawClient.trim() !== '' && rawClient !== '[]') {
            if (rawClient.startsWith('[')) {
                try {
                    const parsed = JSON.parse(rawClient);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        clientId = typeof parsed[0] === 'string' ? parsed[0] : parsed[0]?.id;
                    }
                } catch {}
            } else {
                clientId = rawClient;
            }
        }
    }

    if (clientId && orgaStore.clients) {
        const found = orgaStore.clients.getById(clientId);
        if (found) return found;
        const foundInData = orgaStore.clients.data?.find((c: any) => c.id === clientId);
        if (foundInData) return foundInData;
    }

    // 3. Letzter Fallback: expandiertes Objekt zurückgeben
    if (expanded && expanded.id) {
        return expanded;
    }

    return null;
}

export function getAppointmentClientName(app: any): string {
    const client = getAppointmentClient(app);
    if (!client) return '';
    const fullName = `${client.name_first || ''} ${client.name_last || ''}`.trim();
    if (fullName) return fullName;
    if (client.company_name) return client.company_name;
    if (client.name) return client.name;
    return '';
}

/**
 * Löst die Zeiterfassungen (time_records) eines Termins zuverlässig auf.
 */
export function getAppointmentTimeRecords(app: any): any[] {
    if (!app) return [];

    const exp = app.expand?.time_record;
    if (Array.isArray(exp) && exp.length > 0) {
        return exp;
    }
    if (exp && typeof exp === 'object' && exp.id) {
        return [exp];
    }

    let ids: string[] = [];
    const raw = app.time_record;
    if (Array.isArray(raw)) {
        ids = raw.filter((id: any) => typeof id === 'string' && id.trim() !== '');
    } else if (typeof raw === 'string' && raw.trim() !== '' && raw !== '[]') {
        if (raw.startsWith('[')) {
            try {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) ids = parsed;
            } catch {}
        } else {
            ids = [raw];
        }
    }

    if (ids.length > 0 && orgaStore.time_records) {
        const found = ids.map(id => orgaStore.time_records.getById(id) || orgaStore.time_records.data?.find((tr: any) => tr.id === id)).filter(Boolean);
        if (found.length > 0) return found;
    }

    if (app.id && orgaStore.time_records?.data) {
        const matching = orgaStore.time_records.data.filter((tr: any) =>
            tr.appointment === app.id ||
            (Array.isArray(tr.appointment) && tr.appointment.includes(app.id))
        );
        if (matching.length > 0) return matching;
    }

    return [];
}

/**
 * Löst alle Leistungen (tasks) für einen Termin zuverlässig auf.
 */
export function getAppointmentTasks(app: any): any[] {
    if (!app) return [];

    const exp = app.expand?.tasks;
    if (Array.isArray(exp) && exp.length > 0) {
        return exp;
    }
    if (exp && typeof exp === 'object' && exp.id) {
        return [exp];
    }

    let ids: string[] = [];
    const raw = app.tasks;
    if (Array.isArray(raw)) {
        ids = raw.map((id: any) => typeof id === 'string' ? id : id?.id).filter(Boolean);
    } else if (typeof raw === 'string' && raw.trim() !== '' && raw !== '[]') {
        if (raw.startsWith('[')) {
            try {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) ids = parsed.map((id: any) => typeof id === 'string' ? id : id?.id).filter(Boolean);
            } catch {}
        } else {
            ids = [raw];
        }
    }

    if (ids.length > 0 && orgaStore.tasks) {
        const found = ids.map(id => orgaStore.tasks.getById(id) || orgaStore.tasks.data?.find((t: any) => t.id === id)).filter(Boolean);
        if (found.length > 0) return found;
    }

    return [];
}

/**
 * Extrahiert alle Benutzer-IDs der dem Termin zugewiesenen Betreuer/Mitarbeiter.
 */
export function getAppointmentUserIds(app: any): string[] {
    if (!app) return [];
    const ids = new Set<string>();

    const raw = app.user;
    if (typeof raw === 'string' && raw.trim() && raw !== '[]') {
        if (raw.startsWith('[')) {
            try {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    for (const item of parsed) {
                        const id = typeof item === 'string' ? item : item?.id;
                        if (id) ids.add(id);
                    }
                }
            } catch {
                ids.add(raw);
            }
        } else {
            ids.add(raw);
        }
    } else if (Array.isArray(raw)) {
        for (const item of raw) {
            const id = typeof item === 'string' ? item : item?.id;
            if (id) ids.add(id);
        }
    } else if (raw && typeof raw === 'object' && raw.id) {
        ids.add(raw.id);
    }

    const exp = app.expand?.user;
    if (Array.isArray(exp)) {
        for (const item of exp) {
            if (item?.id) ids.add(item.id);
        }
    } else if (exp && typeof exp === 'object' && exp.id) {
        ids.add(exp.id);
    }

    return Array.from(ids);
}

export function isAppointmentCaregiver(app: any, currentUserId?: string | null): boolean {
    if (!app || !currentUserId) return false;
    const userIds = getAppointmentUserIds(app);
    return userIds.includes(currentUserId);
}

export function isAppointmentOwner(app: any, currentUserId?: string): boolean {
    if (!app || !currentUserId) return false;
    
    if (app.userId === currentUserId || app.user === currentUserId || app.assigned_to === currentUserId) return true;

    const raw = app.user;
    if (Array.isArray(raw)) {
        if (raw.some((item: any) => (typeof item === 'string' ? item : item?.id) === currentUserId)) return true;
    } else if (typeof raw === 'string' && raw.trim() !== '' && raw !== '[]') {
        if (raw.startsWith('[')) {
            try {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.some((item: any) => (typeof item === 'string' ? item : item?.id) === currentUserId)) {
                    return true;
                }
            } catch {}
        }
    }

    if (Array.isArray(app.assigned_to)) {
        if (app.assigned_to.some((item: any) => (typeof item === 'string' ? item : item?.id) === currentUserId)) return true;
    }

    const expUser = app.expand?.user;
    if (Array.isArray(expUser)) {
        if (expUser.some((u: any) => u?.id === currentUserId || u === currentUserId)) return true;
    } else if (expUser && (expUser.id === currentUserId || expUser === currentUserId)) {
        return true;
    }

    return false;
}
