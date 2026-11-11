import { pb } from "$lib/services/pocketbase";
import { orgaStore } from "$lib/stores/orgaStore.svelte";
import type { TabType } from "./appointmentDetailTypes";
import { createAppointmentRouteState } from "./appointmentRouteState.svelte";
import { getAppointmentClient, getAppointmentTimeRecords, getAppointmentTasks, isAppointmentCaregiver } from "../calendar/calendarUtils";
import {
    fetchAppointmentTimeRecords,
    fetchAppointmentTasks,
    resolveAppointmentAddresses
} from "./appointmentDetailLoaders";

export function createAppointmentDetailState() {
    let appId = $state<string | null>(null);
    let currentTab = $state<TabType>('overview');
    let report = $state("");
    let isReportSaving = $state(false);
    let isTimeLoading = $state(false);
    let elapsedSeconds = $state(0);
    let timerInterval: any = null;
    let fetchedTimeRecords = $state<any[]>([]);
    let fetchedTasks = $state<any[]>([]);

    const appointment = $derived(appId ? orgaStore.appointments?.getById(appId) : null);
    const client = $derived.by(() => {
        if (!appointment) return null;
        return getAppointmentClient(appointment);
    });
    const fullClient = $derived.by(() => {
        if (!appointment) return null;
        const c = client;
        let cId = c?.id;
        if (!cId) {
            const raw: any = appointment.client;
            if (Array.isArray(raw) && raw.length > 0) cId = raw[0];
            else if (typeof raw === 'string' && raw.trim() !== '' && raw !== '[]') {
                if (raw.startsWith('[')) {
                    try { const p = JSON.parse(raw); if (Array.isArray(p)) cId = p[0]; } catch {}
                } else cId = raw;
            }
        }
        return cId ? orgaStore.clients?.getById(cId) || c : c;
    });

    const assignedUser = $derived.by(() => {
        if (!appointment) return null;
        if (appointment.expand?.user) return Array.isArray(appointment.expand.user) ? appointment.expand.user[0] : appointment.expand.user;
        const uid = Array.isArray(appointment.user) ? appointment.user[0] : appointment.user;
        return uid ? orgaStore.users?.getById(uid) || null : null;
    });

    const isAssignedCaregiver = $derived.by(() => {
        if (!appointment) return false;
        const currentUserId = pb.authStore.record?.id || pb.authStore.model?.id;
        return isAppointmentCaregiver(appointment, currentUserId);
    });

    const timeRecords = $derived.by(() => {
        if (!appointment) return [];
        const map = new Map<string, any>();
        for (const r of fetchedTimeRecords) if (r?.id) map.set(r.id, r);
        const helperRecords = getAppointmentTimeRecords(appointment);
        for (const r of helperRecords) if (r?.id && !map.has(r.id)) map.set(r.id, r);
        const exp = appointment.expand?.time_record;
        if (Array.isArray(exp)) {
            for (const r of exp) if (r?.id && !map.has(r.id)) map.set(r.id, r);
        } else if (exp && typeof exp === 'object' && exp.id && !map.has(exp.id)) {
            map.set(exp.id, exp);
        }
        return Array.from(map.values());
    });

    const runningTimeRecord = $derived(timeRecords.find((r: any) => r.start && !r.end));
    const driveRecords = $derived(appointment?.expand?.drive_record || []);

    const tasks = $derived.by(() => {
        if (!appointment) return [];
        const map = new Map<string, any>();
        for (const t of fetchedTasks) if (t?.id) map.set(t.id, t);
        const helperTasks = getAppointmentTasks(appointment);
        for (const t of helperTasks) if (t?.id && !map.has(t.id)) map.set(t.id, t);
        const exp = appointment.expand?.tasks;
        if (Array.isArray(exp)) {
            for (const t of exp) if (t?.id && !map.has(t.id)) map.set(t.id, t);
        } else if (exp && typeof exp === 'object' && exp.id && !map.has(exp.id)) {
            map.set(exp.id, exp);
        }
        return Array.from(map.values());
    });

    const expenditures = $derived(appointment?.expand?.expenditures || []);
    const isSuperAdmin = $derived(pb.authStore.isSuperuser || pb.authStore.model?.role === 'developer' || pb.authStore.model?.role === 'superadmin' || pb.authStore.model?.role === 'admin');

    const resolvedAddresses = $derived(resolveAppointmentAddresses(appointment, client, fullClient));
    const clientAddress = $derived(resolvedAddresses.clientAddress);
    const targetLocationAddress = $derived(resolvedAddresses.targetLocationAddress);
    const targetLocationTitle = $derived(resolvedAddresses.targetLocationTitle);
    const pickupAddress = $derived(resolvedAddresses.pickupAddress);

    const route = createAppointmentRouteState(
        () => appointment, () => pickupAddress, () => clientAddress, () => targetLocationAddress, () => targetLocationTitle, () => assignedUser
    );

    const totalRecordedMinutes = $derived.by(() => timeRecords.reduce((tot: number, r: any) => r.start && r.end ? tot + Math.max(0, Math.round((new Date(r.end).getTime() - new Date(r.start).getTime()) / 60000)) : tot, 0));
    const totalKm = $derived(driveRecords.reduce((sum: number, r: any) => sum + (r.km || 0), 0));
    const totalExpenditure = $derived(expenditures.reduce((sum: number, e: any) => sum + (e.sum || 0), 0));

    function startTimer() {
        if (runningTimeRecord?.start) {
            const startMs = new Date(runningTimeRecord.start).getTime();
            const tick = () => { elapsedSeconds = Math.max(0, Math.floor((Date.now() - startMs) / 1000)); };
            tick();
            if (timerInterval) clearInterval(timerInterval);
            timerInterval = setInterval(tick, 1000);
        } else {
            elapsedSeconds = 0;
            if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
        }
    }

    async function loadTimeRecords(id?: string) {
        const targetId = id || appId;
        if (!targetId) return;
        const app = orgaStore.appointments?.getById(targetId);
        fetchedTimeRecords = await fetchAppointmentTimeRecords(app);
        startTimer();
    }

    async function loadTasks(id?: string) {
        const targetId = id || appId;
        if (!targetId) return;
        const app = orgaStore.appointments?.getById(targetId);
        fetchedTasks = await fetchAppointmentTasks(app);
    }

    return {
        get appId() { return appId; }, set appId(v) { appId = v; },
        get currentTab() { return currentTab; }, set currentTab(v) { currentTab = v; },
        get report() { return report; }, set report(v) { report = v; },
        get isReportSaving() { return isReportSaving; }, set isReportSaving(v) { isReportSaving = v; },
        get isTimeLoading() { return isTimeLoading; }, set isTimeLoading(v) { isTimeLoading = v; },
        get elapsedSeconds() { return elapsedSeconds; },
        get appointment() { return appointment; }, get client() { return client; }, get fullClient() { return fullClient; },
        get assignedUser() { return assignedUser; }, get isAssignedCaregiver() { return isAssignedCaregiver; }, get timeRecords() { return timeRecords; },
        get runningTimeRecord() { return runningTimeRecord; }, get driveRecords() { return driveRecords; },
        get tasks() { return tasks; }, get expenditures() { return expenditures; }, get isSuperAdmin() { return isSuperAdmin; },
        get clientAddress() { return clientAddress; }, get targetLocationAddress() { return targetLocationAddress; },
        get targetLocationTitle() { return targetLocationTitle; },
        get totalRecordedMinutes() { return totalRecordedMinutes; }, get totalKm() { return totalKm; },
        get totalExpenditure() { return totalExpenditure; },
        route,
        startTimer,
        loadTimeRecords,
        loadTasks,
        openAppointment: (id: string) => {
            if (!id || id.startsWith('google_')) return;
            appId = id; currentTab = 'overview';
            fetchedTimeRecords = [];
            fetchedTasks = [];
            const app = orgaStore.appointments?.getById(id);
            report = app?.report || "";
            if (typeof window !== 'undefined') {
                route.isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent) || window.innerWidth < 768;
                if (route.isMobile && !route.userLocation) route.fetchGps();
            }
            startTimer(); route.updateRoute();

            loadTimeRecords(id);
            loadTasks(id);

            pb.collection('appointments').getOne(id, {
                expand: 'user,client,address,drive_record,time_record,tasks,expenditures,appointment_at',
                requestKey: null
            }).then((fresh: any) => {
                if (orgaStore.appointments) {
                    const idx = orgaStore.appointments.data.findIndex((a: any) => a.id === id);
                    if (idx !== -1) {
                        const existing = orgaStore.appointments.data[idx];
                        const merged = {
                            ...existing,
                            ...fresh,
                            expand: {
                                ...(existing?.expand || {}),
                                ...(fresh?.expand || {})
                            }
                        };
                        const copy = [...orgaStore.appointments.data];
                        copy[idx] = merged;
                        orgaStore.appointments.data = copy;
                    }
                }
                loadTimeRecords(id);
                loadTasks(id);
            }).catch(() => {});
        },
        closeAppointment: () => {
            appId = null;
            fetchedTimeRecords = [];
            fetchedTasks = [];
            if (timerInterval) clearInterval(timerInterval);
        }
    };
}
