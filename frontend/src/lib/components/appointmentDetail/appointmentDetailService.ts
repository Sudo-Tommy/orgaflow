import { pb } from "$lib/services/pocketbase";
import { orgaStore } from "$lib/stores/orgaStore.svelte";
import { toastStore } from "$lib/services/toastService.svelte";
import { googleCalendarService } from "$lib/services/googleCalendarService";

export async function refreshAppointmentInStore(appId: string, syncGoogle = true) {
    try {
        const updated = await pb.collection('appointments').getOne(appId, {
            expand: 'user,client,drive_record,time_record,tasks,expenditures,appointment_at',
            requestKey: null
        });
        if (orgaStore.appointments?.data) {
            const idx = orgaStore.appointments.data.findIndex(a => a.id === appId);
            if (idx !== -1) {
                const existing = orgaStore.appointments.data[idx];
                orgaStore.appointments.data[idx] = {
                    ...existing,
                    ...updated,
                    expand: {
                        ...(existing?.expand || {}),
                        ...(updated?.expand || {})
                    }
                } as any;
            } else {
                orgaStore.appointments.data.unshift(updated as any);
            }
        }
        if (syncGoogle) {
            googleCalendarService.syncAppointment(appId, 'upsert').catch(() => {});
        }
    } catch {}
}

export async function saveAppointmentNotes(appId: string, notes: string): Promise<boolean> {
    try {
        await pb.collection('appointments').update(appId, { notes });
        await refreshAppointmentInStore(appId);
        toastStore.success("Notizen gespeichert.");
        return true;
    } catch { toastStore.error("Fehler beim Speichern der Notizen."); return false; }
}

export async function saveAppointmentDescription(appId: string, desc: string, isBlock: boolean): Promise<boolean> {
    try {
        await pb.collection('appointments').update(appId, { description: isBlock ? `[BLOCK] ${desc}` : desc });
        await refreshAppointmentInStore(appId);
        toastStore.success("Beschreibung gespeichert.");
        return true;
    } catch { toastStore.error("Fehler beim Speichern der Beschreibung."); return false; }
}

export async function toggleAppointmentSettled(appId: string, currentSettled: boolean): Promise<boolean> {
    const newStatus = !currentSettled;
    try {
        await pb.collection('appointments').update(appId, { settled: newStatus });
        await refreshAppointmentInStore(appId);
        toastStore.success(newStatus ? "Termin als abgerechnet markiert." : "Abrechnungsstatus auf 'Offen'.");
        return newStatus;
    } catch { toastStore.error("Fehler beim Aktualisieren."); return currentSettled; }
}

export async function toggleAppointmentPrivate(appId: string, currentPrivate: boolean): Promise<boolean> {
    const newStatus = !currentPrivate;
    try {
        await pb.collection('appointments').update(appId, { is_private: newStatus });
        await refreshAppointmentInStore(appId);
        toastStore.success(newStatus ? "Termin als privat markiert." : "Termin als beruflich markiert.");
        return newStatus;
    } catch { toastStore.error("Fehler beim Ändern."); return currentPrivate; }
}

export async function toggleAppointmentVisibility(appId: string, currentVisible: boolean): Promise<boolean> {
    const newStatus = !currentVisible;
    try {
        await pb.collection('appointments').update(appId, { is_visible: newStatus });
        await refreshAppointmentInStore(appId);
        toastStore.success(newStatus ? "Im Portal sichtbar." : "Im Portal verborgen.");
        return newStatus;
    } catch { toastStore.error("Fehler beim Ändern."); return currentVisible; }
}

export async function saveVisitReport(appId: string, report: string): Promise<boolean> {
    try {
        await pb.collection('appointments').update(appId, { report });
        await refreshAppointmentInStore(appId);
        toastStore.success("Besuchsbericht gespeichert.");
        return true;
    } catch { toastStore.error("Fehler beim Speichern des Berichts."); return false; }
}

export async function saveBillingType(appId: string, billingType: string): Promise<boolean> {
    try {
        await pb.collection('appointments').update(appId, { billing_type: billingType });
        await refreshAppointmentInStore(appId);
        toastStore.success(billingType ? `Abrechnungsart (${billingType}) gespeichert.` : "Abrechnungsart zurückgesetzt.");
        return true;
    } catch {
        toastStore.error("Fehler beim Speichern der Abrechnungsart.");
        return false;
    }
}

export async function setAppointmentStatus(appId: string, status: 'geplant' | 'abgesagt', reason: string = ''): Promise<boolean> {
    const cleanReason = status === 'abgesagt' ? reason.trim() : '';
    try {
        orgaStore.appointments?.optimisticUpdate(appId, {
            status,
            cancellation_reason: cleanReason
        } as any);

        await pb.collection('appointments').update(appId, {
            status,
            cancellation_reason: cleanReason
        });
        await refreshAppointmentInStore(appId);
        toastStore.success(status === 'abgesagt' ? "Termin wurde als abgesagt markiert." : "Termin wurde reaktiviert.");
        return true;
    } catch {
        toastStore.error("Fehler beim Aktualisieren des Terminstatus.");
        return false;
    }
}

export async function saveAppointmentDateTime(appId: string, dateStr: string, startTime: string, endTime?: string): Promise<boolean> {
    try {
        const utcDateStr = new Date(`${dateStr}T${startTime || '12:00'}:00`).toISOString();
        let utcEndStr: string | null = null;
        if (startTime && endTime) {
            const endDate = new Date(`${dateStr}T${endTime}:00`);
            if (endTime < startTime) endDate.setDate(endDate.getDate() + 1);
            utcEndStr = endDate.toISOString();
        }
        const payload: Record<string, any> = { 
            appointment: utcDateStr,
            appointment_end: utcEndStr
        };

        const updatedApp = await pb.collection('appointments').update(appId, payload);
        const trIds = Array.isArray(updatedApp.time_record) ? updatedApp.time_record : (updatedApp.time_record ? [updatedApp.time_record] : []);
        if (trIds.length > 0) {
            const trPayload: Record<string, any> = { start: utcDateStr };
            if (utcEndStr) trPayload.end = utcEndStr;
            await pb.collection('time_records').update(trIds[0], trPayload).catch(() => {});
        }
        await refreshAppointmentInStore(appId);
        toastStore.success("Terminzeit erfolgreich aktualisiert.");
        return true;
    } catch {
        toastStore.error("Fehler beim Speichern von Datum/Uhrzeit.");
        return false;
    }
}

export async function saveAppointmentUser(appId: string, userId: string): Promise<boolean> {
    try {
        await pb.collection('appointments').update(appId, { user: userId });
        await refreshAppointmentInStore(appId);
        toastStore.success("Betreuer erfolgreich geändert.");
        return true;
    } catch {
        toastStore.error("Fehler beim Ändern des Betreuers.");
        return false;
    }
}

export async function saveAppointmentClient(appId: string, clientId: string): Promise<boolean> {
    try {
        await pb.collection('appointments').update(appId, { client: clientId ? [clientId] : [] });
        await refreshAppointmentInStore(appId);
        toastStore.success(clientId ? "Klient erfolgreich zugewiesen." : "Klientenzuweisung entfernt.");
        return true;
    } catch {
        toastStore.error("Fehler beim Aktualisieren des Klienten.");
        return false;
    }
}

export async function saveAppointmentAddress(appId: string, address: string, contactId?: string): Promise<boolean> {
    try {
        const payload: Record<string, any> = { location_address: address };
        if (contactId !== undefined) {
            payload.appointment_at = contactId ? [contactId] : [];
        }
        await pb.collection('appointments').update(appId, payload);
        await refreshAppointmentInStore(appId);
        toastStore.success("Einsatzort erfolgreich gespeichert.");
        return true;
    } catch {
        toastStore.error("Fehler beim Speichern der Adresse.");
        return false;
    }
}

export async function saveAppointmentPickupAddress(appId: string, pickupAddress: string): Promise<boolean> {
    try {
        await pb.collection('appointments').update(appId, { pickup_address: pickupAddress });
        await refreshAppointmentInStore(appId);
        toastStore.success("Abholort erfolgreich gespeichert.");
        return true;
    } catch {
        toastStore.error("Fehler beim Speichern des Abholorts.");
        return false;
    }
}

export async function saveAppointmentRouteMetrics(appId: string, distance: number, duration: number): Promise<boolean> {
    try {
        await pb.collection('appointments').update(appId, { route_distance: distance, route_duration: duration });
        return true;
    } catch {
        return false;
    }
}

export async function cycleBillingType(appId: string, currentType: string): Promise<string> {
    const cycleMap: Record<string, string> = {
        '': 'EL',
        'EL': 'Kombi',
        'Kombi': 'Privat',
        'Privat': '45a',
        '45a': 'VHP',
        'VHP': ''
    };
    const nextType = cycleMap[currentType || ''] ?? '';
    await saveBillingType(appId, nextType);
    return nextType;
}


