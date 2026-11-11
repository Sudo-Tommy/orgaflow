import { pb } from "$lib/services/pocketbase";
import { findUserById, getUserDisplayName } from "./unsettledBillingUserHelper";

/**
 * Checks if current user is allowed to reassign the billing user for a given appointment.
 * Admins/Owners: always allowed.
 * Regular users: allowed if appointment is unassigned, or currently assigned to themselves.
 */
export function canReassignBillingUser(app: any, currentUserId?: string, isAdmin: boolean = false): boolean {
    if (isAdmin) return true;
    if (!currentUserId) return false;
    const currentBillingUser = app?.billing_user || app?.expand?.billing_user?.id;
    if (!currentBillingUser) return true; // Unzugewiesen -> darf übernommen werden
    return currentBillingUser === currentUserId; // Eigener Termin -> darf abgetreten werden
}

export async function markSingleAsSettled(
    app: any,
    confirmStore: any,
    toastStore: any,
    orgaStore: any
): Promise<boolean> {
    const clientName = app.expand?.client?.[0] ? `${app.expand.client[0].name_first} ${app.expand.client[0].name_last}`.trim() : 'Termin';
    const dateStr = new Date(app.appointment).toLocaleDateString('de-DE');
    if (!(await confirmStore.ask(`Möchten Sie den Termin für "${clientName}" vom ${dateStr} als "abgerechnet" markieren?`, "Termin abrechnen?", "Abrechnen", "Abbrechen", false))) {
        return false;
    }

    try {
        await pb.collection('appointments').update(app.id, { settled: true });
        toastStore.success("Termin erfolgreich als abgerechnet markiert.");
        if (orgaStore.appointments) await orgaStore.appointments.init();
        return true;
    } catch {
        toastStore.error("Fehler beim Aktualisieren des Termins.");
        return false;
    }
}

export async function markSelectedAsSettled(
    selectedIds: string[],
    metrics: { selectedHours: number; selectedKm: number },
    confirmStore: any,
    toastStore: any,
    orgaStore: any
): Promise<boolean> {
    if (selectedIds.length === 0) return false;
    const msg = `Möchten Sie ${selectedIds.length} Termine (${metrics.selectedHours.toFixed(1)} Std. / ${metrics.selectedKm.toFixed(0)} km) als "abgerechnet" markieren?`;
    if (!(await confirmStore.ask(msg, "Termine abrechnen?", "Jetzt abrechnen", "Abbrechen", false))) return false;

    try {
        const promises = selectedIds.map(id => pb.collection('appointments').update(id, { settled: true }));
        for (let i = 0; i < promises.length; i += 20) await Promise.all(promises.slice(i, i + 20));
        toastStore.success(`${selectedIds.length} Termine erfolgreich als abgerechnet markiert.`);
        if (orgaStore.appointments) await orgaStore.appointments.init();
        return true;
    } catch {
        toastStore.error("Fehler beim Aktualisieren der Termine.");
        return false;
    }
}

export async function updateAppBillingType(
    app: any,
    newType: string,
    toastStore: any,
    orgaStore: any
): Promise<void> {
    const previousType = app.billing_type;
    try {
        await pb.collection('appointments').update(app.id, { billing_type: newType || null });
        app.billing_type = newType;
        toastStore.success(`Abrechnungsart auf "${newType || 'Standard'}" gesetzt.`);
        if (orgaStore.appointments) await orgaStore.appointments.init();
    } catch {
        app.billing_type = previousType;
        toastStore.error("Abrechnungsart konnte nicht gespeichert werden.");
    }
}

export async function updateAppBillingUser(
    app: any,
    newUserId: string | null,
    users: any[],
    confirmStore: any,
    toastStore: any,
    orgaStore: any
): Promise<boolean> {
    const targetUser = findUserById(newUserId || undefined, users);
    const targetName = targetUser ? getUserDisplayName(targetUser) : "Nicht zugewiesen";

    // Serientermin-Behandlung per Q12 / A12
    let updateSeries = false;
    if (app.is_series && app.series_id) {
        updateSeries = await confirmStore.ask(
            `Dieser Termin gehört zu einer Serie. Möchten Sie alle offenen Termine dieser Serie "${targetName}" zuweisen?`,
            "Serientermine zuweisen?",
            "Alle offenen Termine der Serie",
            "Nur diesen Termin",
            false
        );
    }

    // Sofortige In-Memory-Mutation für reaktives Svelte 5 State
    app.billing_user = newUserId || null;
    if (app.expand) app.expand.billing_user = targetUser || null;
    if (orgaStore.appointments?.optimisticUpdate) {
        orgaStore.appointments.optimisticUpdate(app.id, { billing_user: newUserId || null, expand: { ...(app.expand || {}), billing_user: targetUser || null } });
    }

    try {
        if (updateSeries && app.series_id) {
            const seriesApps = (orgaStore.appointments?.data || []).filter(
                (a: any) => a.series_id === app.series_id && !a.settled
            );
            for (const sApp of seriesApps) {
                sApp.billing_user = newUserId || null;
                if (sApp.expand) sApp.expand.billing_user = targetUser || null;
                if (orgaStore.appointments?.optimisticUpdate) {
                    orgaStore.appointments.optimisticUpdate(sApp.id, { billing_user: newUserId || null, expand: { ...(sApp.expand || {}), billing_user: targetUser || null } });
                }
            }
            const promises = seriesApps.map((a: any) =>
                pb.collection('appointments').update(a.id, { billing_user: newUserId || null })
            );
            for (let i = 0; i < promises.length; i += 20) await Promise.all(promises.slice(i, i + 20));
            toastStore.success(`${seriesApps.length} Termine der Serie an "${targetName}" zugewiesen.`);
        } else {
            await pb.collection('appointments').update(app.id, { billing_user: newUserId || null });
            toastStore.success(`Termin an "${targetName}" zugewiesen.`);
        }

        return true;
    } catch {
        toastStore.error("Mitarbeiter-Zuweisung konnte nicht gespeichert werden.");
        return false;
    }
}

export async function updateBatchBillingUser(
    appIds: string[],
    newUserId: string | null,
    users: any[],
    toastStore: any,
    orgaStore: any
): Promise<boolean> {
    if (appIds.length === 0) return false;
    const targetUser = findUserById(newUserId || undefined, users);
    const targetName = targetUser ? getUserDisplayName(targetUser) : "Nicht zugewiesen";

    // Sofortige In-Memory-Mutation im Store via optimisticUpdate
    if (orgaStore.appointments?.optimisticUpdate) {
        for (const id of appIds) {
            orgaStore.appointments.optimisticUpdate(id, { billing_user: newUserId || null, expand: { billing_user: targetUser || null } });
        }
    }

    try {
        const promises = appIds.map(id => pb.collection('appointments').update(id, { billing_user: newUserId || null }));
        for (let i = 0; i < promises.length; i += 20) await Promise.all(promises.slice(i, i + 20));
        toastStore.success(`${appIds.length} Termine erfolgreich an "${targetName}" zugewiesen.`);
        return true;
    } catch {
        toastStore.error("Fehler bei der Zuweisung der ausgewählten Termine.");
        return false;
    }
}

export async function updateGroupBillingUser(
    groupApps: any[],
    clientId: string | undefined,
    newUserId: string | null,
    users: any[],
    toastStore: any,
    orgaStore: any
): Promise<boolean> {
    if (!groupApps || groupApps.length === 0) return false;
    const targetUser = findUserById(newUserId || undefined, users);
    const targetName = targetUser ? getUserDisplayName(targetUser) : "Nicht zugewiesen";

    // 1. Sofortige In-Memory-Mutation auf den Terminen via optimisticUpdate
    for (const app of groupApps) {
        app.billing_user = newUserId || null;
        if (app.expand) app.expand.billing_user = targetUser || null;
        if (orgaStore.appointments?.optimisticUpdate) {
            orgaStore.appointments.optimisticUpdate(app.id, { billing_user: newUserId || null, expand: { ...(app.expand || {}), billing_user: targetUser || null } });
        }
    }

    // 2. Sofortige Mutation des Standard-Abrechners am Klienten
    if (clientId && orgaStore.clients?.optimisticUpdate) {
        const cl = orgaStore.clients.getById ? orgaStore.clients.getById(clientId) : undefined;
        orgaStore.clients.optimisticUpdate(clientId, { billing_user: newUserId || null, expand: { ...(cl?.expand || {}), billing_user: targetUser || null } });
    }

    try {
        // 3. In PocketBase speichern
        const promises = groupApps.map(app => pb.collection('appointments').update(app.id, { billing_user: newUserId || null }));
        for (let i = 0; i < promises.length; i += 20) await Promise.all(promises.slice(i, i + 20));

        if (clientId) {
            try {
                await pb.collection('clients').update(clientId, { billing_user: newUserId || null });
            } catch (err) {
                console.warn("[unsettledActions] Could not update client default billing_user:", err);
            }
        }

        toastStore.success(`Alle ${groupApps.length} Termine des Klienten an "${targetName}" zugewiesen.`);
        return true;
    } catch {
        toastStore.error("Fehler bei der Zuweisung der Kliententermine.");
        return false;
    }
}
