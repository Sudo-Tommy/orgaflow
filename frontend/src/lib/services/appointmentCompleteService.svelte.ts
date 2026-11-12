import { pb } from "$lib/services/pocketbase";
import { orgaStore } from "$lib/stores/orgaStore.svelte";
import { toastStore } from "$lib/services/toastService.svelte";
import { confirmStore } from "$lib/services/confirmService.svelte";
import { hapticFeedback } from "$lib/services/hapticFeedback";
import { refreshAppointmentInStore } from "$lib/components/appointmentDetail/appointmentDetailService";
import { rbacService } from "$lib/services/rbacService.svelte";
import { connectionManager } from "$lib/services/connectionManager.svelte";
import { queueOfflineMutation } from "$lib/services/offlineDb";
import { saveAppointmentCompletion } from "$lib/services/sync/offlineAppointmentHelper";

function getLocalDateStr(date: Date) {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
function getLocalTimeStr(date: Date) {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
function roundTimeTo15Min(timeStr: string): string {
    const [h, m] = timeStr.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return timeStr;
    const roundedM = Math.round(m / 15) * 15;
    const d = new Date();
    d.setHours(h, roundedM, 0, 0);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export class AppointmentCompleteService {
    isOpen = $state(false);
    isLoading = $state(false);
    showFollowUp = $state(false);
    errorMsg = $state("");
    appointment = $state<any>(null);

    selectedClientId = $state("");
    billingType = $state<string>("");
    selectedTasks = $state<string[]>([]);
    appDate = $state("");
    startTime = $state("");
    endTime = $state("");
    driveKm = $state<number>(0);
    report = $state("");
    confirmFuture = $state(false);

    isFuture = $derived.by(() => {
        if (!this.appointment?.appointment) return false;
        return new Date(this.appointment.appointment).getTime() > Date.now();
    });

    canSubmit = $derived.by(() => {
        if (!this.selectedClientId) return false;
        if (rbacService.canAccessFinances && !this.billingType) return false;
        if (!this.selectedTasks || this.selectedTasks.length === 0) return false;
        if (!this.startTime || !this.endTime) return false;
        if (this.isFuture && !this.confirmFuture) return false;
        return true;
    });

    async open(appOrId: any) {
        this.errorMsg = "";
        this.confirmFuture = false;
        this.showFollowUp = false;
        this.isLoading = true;
        this.isOpen = true;

        try {
            let app = appOrId;
            if (typeof appOrId === 'string') {
                app = orgaStore.appointments?.getById(appOrId) || orgaStore.appointments?.data?.find((a: any) => a.id === appOrId);
                if (!app) {
                    app = await pb.collection('appointments').getOne(appOrId, { expand: 'client,tasks,time_record,drive_record,user' });
                }
            }
            this.appointment = app;
            this.selectedClientId = Array.isArray(app?.client) && app.client[0]
                ? (typeof app.client[0] === 'object' ? app.client[0].id : app.client[0])
                : (typeof app?.client === 'string' ? app.client : (app?.expand?.client?.id || ""));
            this.billingType = app?.billing_type || (app?.expand?.client?.billing_type || "");

            const rawTasks = app?.tasks || [];
            this.selectedTasks = Array.isArray(rawTasks)
                ? rawTasks.map((t: any) => typeof t === 'string' ? t : t?.id).filter(Boolean)
                : [];

            const d = app?.appointment ? new Date(app.appointment) : new Date();
            this.appDate = getLocalDateStr(d);

            const tr = app?.expand?.time_record?.[0];
            if (tr?.start && tr?.end) {
                this.startTime = roundTimeTo15Min(getLocalTimeStr(new Date(tr.start)));
                this.endTime = roundTimeTo15Min(getLocalTimeStr(new Date(tr.end)));
            } else {
                this.startTime = roundTimeTo15Min(getLocalTimeStr(d));
                const endD = new Date(d);
                endD.setHours(endD.getHours() + 1);
                this.endTime = roundTimeTo15Min(getLocalTimeStr(endD));
            }

            const dr = app?.expand?.drive_record?.[0];
            this.driveKm = dr?.km || dr?.distance_km || (app?.route_distance ? Math.round(app.route_distance / 100) / 10 : 0);
            this.report = app?.report || app?.notes || "";
        } catch (err: any) {
            console.error(err);
            this.errorMsg = "Termin konnte nicht geladen werden.";
        } finally {
            this.isLoading = false;
        }
    }

    close() {
        this.isOpen = false;
        this.showFollowUp = false;
        this.appointment = null;
        this.errorMsg = "";
    }

    async submit() {
        if (!this.canSubmit || !this.appointment) return;
        this.isLoading = true;
        this.errorMsg = "";

        try {
            const startIso = new Date(`${this.appDate}T${this.startTime}:00`).toISOString();
            const endD = new Date(`${this.appDate}T${this.endTime}:00`);
            if (this.endTime < this.startTime) endD.setDate(endD.getDate() + 1);

            const mode = await saveAppointmentCompletion({
                appointment: this.appointment,
                existingTrId: this.appointment.expand?.time_record?.[0]?.id || (Array.isArray(this.appointment.time_record) ? this.appointment.time_record[0] : undefined),
                existingDrId: this.appointment.expand?.drive_record?.[0]?.id || (Array.isArray(this.appointment.drive_record) ? this.appointment.drive_record[0] : undefined),
                startIso,
                endIso: endD.toISOString(),
                driveKm: this.driveKm,
                isOnline: connectionManager.isOnline,
                appointmentPayload: {
                    client: this.selectedClientId ? [this.selectedClientId] : [],
                    ...(rbacService.canAccessFinances || this.billingType ? { billing_type: this.billingType } : {}),
                    tasks: this.selectedTasks,
                    report: this.report.trim(),
                    status: 'beendet',
                    finished_at: new Date().toISOString()
                }
            });

            if (mode === 'offline') {
                toastStore.info("Offline gespeichert – wird automatisch gesendet, sobald wieder Empfang besteht.");
            } else {
                toastStore.success("Termin erfolgreich als beendet markiert!");
            }
            hapticFeedback.success();
            this.showFollowUp = true;
        } catch (err: any) {
            console.error("Fehler beim Beenden:", err);
            this.errorMsg = err.message || "Fehler beim Speichern.";
            hapticFeedback.error();
        } finally {
            this.isLoading = false;
        }
    }

    createFollowUp() {
        if (!this.appointment) return;
        const app = this.appointment;
        this.close();
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('open-follow-up-modal', { detail: app }));
        }
    }

    async reopen(appOrId: any) {
        let app = appOrId;
        if (typeof appOrId === 'string') {
            app = orgaStore.appointments?.getById(appOrId) || orgaStore.appointments?.data?.find((a: any) => a.id === appOrId);
        }
        if (!app) return;

        const ok = await confirmStore.ask(
            "Möchten Sie diesen Termin wiedereröffnen? Der Status wird auf 'geplant' zurückgesetzt.",
            "Termin wiedereröffnen?",
            "Wiedereröffnen",
            "Abbrechen"
        );
        if (!ok) return;

        try {
            if (!connectionManager.isOnline) {
                await queueOfflineMutation('appointments', 'update', app.id, { status: 'geplant', finished_at: null }, { label: 'Termin wiedereröffnen' });
                orgaStore.appointments.optimisticUpdate(app.id, { status: 'geplant' } as any);
                toastStore.info("Offline vorgemerkt – wird beim nächsten Empfang gesendet.");
                return;
            }
            await pb.collection('appointments').update(app.id, { status: 'geplant', finished_at: null }, { requestKey: null });
            await refreshAppointmentInStore(app.id);
            toastStore.success("Termin wiedereröffnet (Status: Geplant).");
            hapticFeedback.success();
        } catch {
            toastStore.error("Fehler beim Wiedereröffnen des Termins.");
            hapticFeedback.error();
        }
    }
}

export const appointmentCompleteService = new AppointmentCompleteService();
