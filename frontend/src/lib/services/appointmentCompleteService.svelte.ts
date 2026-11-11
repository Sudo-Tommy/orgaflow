import { pb } from "$lib/services/pocketbase";
import { orgaStore } from "$lib/stores/orgaStore.svelte";
import { toastStore } from "$lib/services/toastService.svelte";
import { confirmStore } from "$lib/services/confirmService.svelte";
import { hapticFeedback } from "$lib/services/hapticFeedback";
import { refreshAppointmentInStore } from "$lib/components/appointmentDetail/appointmentDetailService";
import { rbacService } from "$lib/services/rbacService.svelte";

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
            const appId = this.appointment.id;
            const startIso = new Date(`${this.appDate}T${this.startTime}:00`).toISOString();
            const endD = new Date(`${this.appDate}T${this.endTime}:00`);
            if (this.endTime < this.startTime) endD.setDate(endD.getDate() + 1);
            const endIso = endD.toISOString();

            let trIds = Array.isArray(this.appointment.time_record) ? [...this.appointment.time_record] : [];
            const existingTrId = this.appointment.expand?.time_record?.[0]?.id || trIds[0];
            
            if (existingTrId) {
                try {
                    await pb.collection('time_records').update(existingTrId, { start: startIso, end: endIso });
                } catch {
                    const newTr = await pb.collection('time_records').create({ start: startIso, end: endIso });
                    trIds = [newTr.id];
                }
            } else {
                const newTr = await pb.collection('time_records').create({ start: startIso, end: endIso });
                trIds = [newTr.id];
            }

            let drIds = Array.isArray(this.appointment.drive_record) ? [...this.appointment.drive_record] : [];
            if (this.driveKm > 0) {
                const existingDrId = this.appointment.expand?.drive_record?.[0]?.id || drIds[0];
                if (existingDrId) {
                    await pb.collection('drive_records').update(existingDrId, { km: this.driveKm });
                } else {
                    const newDr = await pb.collection('drive_records').create({ km: this.driveKm, date: startIso });
                    drIds = [newDr.id];
                }
            }

            const updatePayload: any = {
                client: this.selectedClientId ? [this.selectedClientId] : [],
                ...(rbacService.canAccessFinances || this.billingType ? { billing_type: this.billingType } : {}),
                tasks: this.selectedTasks,
                report: this.report.trim(),
                time_record: trIds,
                drive_record: drIds,
                status: 'beendet',
                finished_at: new Date().toISOString()
            };

            await pb.collection('appointments').update(appId, updatePayload, { requestKey: null });
            await refreshAppointmentInStore(appId);
            
            toastStore.success("Termin erfolgreich als beendet markiert!");
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
            await pb.collection('appointments').update(app.id, {
                status: 'geplant',
                finished_at: null
            }, { requestKey: null });
            await refreshAppointmentInStore(app.id);
            toastStore.success("Termin wiedereröffnet (Status: Geplant).");
            hapticFeedback.success();
        } catch (err: any) {
            console.error("Fehler beim Wiedereröffnen:", err);
            toastStore.error("Fehler beim Wiedereröffnen des Termins.");
            hapticFeedback.error();
        }
    }
}

export const appointmentCompleteService = new AppointmentCompleteService();
