import { pb } from "$lib/services/pocketbase";
import { orgaStore } from "$lib/stores/orgaStore.svelte";
import { toastStore } from "$lib/services/toastService.svelte";
import { googleCalendarService, type GoogleCalendarStatus } from "$lib/services/googleCalendarService";
import { matchesAppointmentDate, isSameDay, generateIcs, sortAppointmentsPrioritizingOwner, isAppointmentOwner } from "./calendarUtils";
import { moveAppointment, syncAllCalendarData, toggleAppVisibility, subscribeRealtimeAppointments } from "./calendarSyncService";
import type { AppointmentRecord } from "$lib/types/orgaTypes";

export function createCalendarState(getRawAppointments: () => any[]) {
    const initialUser = pb.authStore.record || pb.authStore.model;
    let currentUser = $state(initialUser), users = $state<any[]>([]);
    let viewMode = $state<"month" | "week">("month"), currentDate = $state(new Date()), selectedDate = $state<Date | null>(new Date());
    let selectedClientId = $state("all"), selectedUserId = $state(initialUser?.id || "all"), selectedCompanyId = $state("all");
    let googleStatus = $state<GoogleCalendarStatus | null>(null), externalGoogleEvents = $state<any[]>([]), showGoogleEvents = $state(true);
    let isSubmitting = $state(false), showFilterBar = $state(false), isUpdating = $state(false), isDragging = $state(false);
    let draggedAppId = $state<string | null>(null), now = $state(new Date());

    const isGodMode = $derived(pb.authStore.isSuperuser || currentUser?.collectionName === '_superusers' || currentUser?.role === 'superadmin' || currentUser?.role === 'developer');
    const isSuperAdmin = $derived(isGodMode || currentUser?.role === 'admin');
    const canEdit = $derived(Boolean(currentUser?.id));
    const myCompId = $derived.by(() => { const c = currentUser?.company; return Array.isArray(c) ? c[0] : (typeof c === 'string' && c.startsWith('[') ? JSON.parse(c)[0] : c); });
    const hasActiveFilters = $derived(selectedClientId !== 'all' || (isSuperAdmin && selectedUserId !== (currentUser?.id || 'all')) || !showGoogleEvents);

    const filteredAppointments = $derived.by(() => {
        const raw = isSuperAdmin ? (orgaStore.appointments?.data || []) : (getRawAppointments() || orgaStore.appointments?.data || []);
        const seen = new Set<string>();
        let list = raw.filter((a: any) => !a?.id || !seen.has(a.id) ? (seen.add(a.id), true) : false);
        const filterComp = !isGodMode && myCompId ? myCompId : selectedCompanyId;
        if (filterComp !== "all" && filterComp) {
            list = list.filter((a: any) => (Array.isArray(a.expand?.user?.company) ? a.expand.user.company.includes(filterComp) : a.expand?.user?.company === filterComp) || isAppointmentOwner(a, currentUser?.id));
        }
        const myUserId = currentUser?.id;
        if (!isSuperAdmin && myUserId) {
            list = list.filter((a: any) => isAppointmentOwner(a, myUserId) || a.is_visible || a.description?.includes('[BLOCK]'));
        }
        if (!showGoogleEvents) {
            list = list.filter((a: any) => !a.google_event_id);
        }
        if (selectedClientId !== "all") list = list.filter((a: any) => a.client === selectedClientId || a.client?.includes?.(selectedClientId));
        if (selectedUserId !== "all") list = list.filter((a: any) => isAppointmentOwner(a, selectedUserId) || a.description?.includes('[BLOCK]'));
        return list;
    });

    function getAppsForDate(d: Date): any[] {
        let list = filteredAppointments.filter((a: any) => matchesAppointmentDate(a, d));
        if (showGoogleEvents && externalGoogleEvents.length) {
            list = [...list, ...externalGoogleEvents.filter((g: any) => {
                if (!g.appointment || !isSameDay(new Date(g.appointment), d)) return false;
                if (selectedUserId !== "all" && g.user !== selectedUserId) return false;
                return true;
            })];
        }
        return sortAppointmentsPrioritizingOwner(list, currentUser?.id);
    }

    const calendarDays = $derived.by(() => {
        const y = currentDate.getFullYear(), m = currentDate.getMonth(), days = [];
        if (viewMode === "month") {
            const first = (new Date(y, m, 1).getDay() + 6) % 7, prevLast = new Date(y, m, 0).getDate();
            for (let i = first - 1; i >= 0; i--) days.push({ date: new Date(y, m - 1, prevLast - i), isCurrentMonth: false, apps: getAppsForDate(new Date(y, m - 1, prevLast - i)) });
            for (let i = 1; i <= new Date(y, m + 1, 0).getDate(); i++) days.push({ date: new Date(y, m, i), isCurrentMonth: true, apps: getAppsForDate(new Date(y, m, i)) });
            for (let i = 1; days.length < 42; i++) days.push({ date: new Date(y, m + 1, i), isCurrentMonth: false, apps: getAppsForDate(new Date(y, m + 1, i)) });
        } else {
            const mon = new Date(currentDate); mon.setDate(mon.getDate() - ((mon.getDay() + 6) % 7));
            for (let i = 0; i < 7; i++) { const d = new Date(mon); d.setDate(mon.getDate() + i); days.push({ date: d, isCurrentMonth: d.getMonth() === m, apps: getAppsForDate(d) }); }
        }
        return days;
    });

    const selectedDayAppointments = $derived.by(() => selectedDate ? getAppsForDate(selectedDate) : []);

    async function loadGoogle() {
        if (!canEdit || (!googleStatus?.connected && !isSuperAdmin)) return;
        try {
            const y = currentDate.getFullYear(), m = currentDate.getMonth();
            const target = isSuperAdmin ? selectedUserId : (currentUser?.id || 'me');
            externalGoogleEvents = await googleCalendarService.getExternalEvents(
                new Date(y, m - 1, 1).toISOString(),
                new Date(y, m + 2, 0).toISOString(),
                target
            );
            if (orgaStore.appointments) {
                const refreshed = await pb.collection('appointments').getFullList<AppointmentRecord>({
                    expand: 'user,client,appointment_at,drive_record,time_record,tasks,expenditures',
                    sort: 'appointment',
                    requestKey: null
                });
                orgaStore.appointments.data = refreshed;
            }
        } catch { }
    }

    return {
        get viewMode() { return viewMode; }, set viewMode(v) { viewMode = v; },
        get currentDate() { return currentDate; }, get selectedDate() { return selectedDate; }, set selectedDate(v) { selectedDate = v; },
        get selectedClientId() { return selectedClientId; }, set selectedClientId(v) { selectedClientId = v; },
        get selectedUserId() { return selectedUserId; }, set selectedUserId(v) { selectedUserId = v; loadGoogle(); },
        get showGoogleEvents() { return showGoogleEvents; }, set showGoogleEvents(v) { showGoogleEvents = v; },
        get showFilterBar() { return showFilterBar; }, set showFilterBar(v) { showFilterBar = v; },
        get isSubmitting() { return isSubmitting; }, set isSubmitting(v) { isSubmitting = v; },
        get isUpdating() { return isUpdating; }, get draggedAppId() { return draggedAppId; }, get isDragging() { return isDragging; },
        get now() { return now; }, get users() { return users; }, get currentUser() { return currentUser; },
        get isSuperAdmin() { return isSuperAdmin; }, get canEdit() { return canEdit; },
        get hasActiveFilters() { return hasActiveFilters; }, get googleStatus() { return googleStatus; },
        get externalGoogleEvents() { return externalGoogleEvents; }, get filteredAppointments() { return filteredAppointments; },
        get calendarDays() { return calendarDays; }, get selectedDayAppointments() { return selectedDayAppointments; },
        resetFilters: () => { selectedClientId = 'all'; selectedUserId = currentUser?.id || 'all'; showGoogleEvents = true; loadGoogle(); toastStore.info("Filter zurückgesetzt."); },
        next: () => { currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + (viewMode === 'month' ? 1 : 0), currentDate.getDate() + (viewMode === 'week' ? 7 : 0)); loadGoogle(); },
        prev: () => { currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - (viewMode === 'month' ? 1 : 0), currentDate.getDate() - (viewMode === 'week' ? 7 : 0)); loadGoogle(); },
        today: () => { currentDate = new Date(); selectedDate = new Date(); loadGoogle(); },
        handleDragStart: (e: DragEvent, id: string) => { draggedAppId = id; isDragging = true; e.dataTransfer?.setData('text/plain', id); },
        handleDragEnd: () => { draggedAppId = null; isDragging = false; },
        handleDrop: async (d: Date, h?: number, m?: number) => {
            if (!draggedAppId) return;
            const appId = draggedAppId; draggedAppId = null; isDragging = false; isUpdating = true;
            const app = orgaStore.appointments?.getById(appId), orig = new Date((app?.appointment as string) || ''), target = new Date(d);
            target.setHours(h ?? (isNaN(orig.getTime()) ? 12 : orig.getHours()), m ?? (isNaN(orig.getTime()) ? 0 : orig.getMinutes()), 0, 0);
            try { await moveAppointment(appId, target); toastStore.success("Termin erfolgreich verschoben."); }
            catch { toastStore.error("Der Termin konnte nicht verschoben werden."); }
            finally { isUpdating = false; }
        },
        toggleVisibility: (app: any) => toggleAppVisibility(app),
        syncCalendar: () => syncAllCalendarData(canEdit, isSuperAdmin, loadGoogle),
        printCalendar: () => typeof window !== 'undefined' && window.print(),
        exportIcal: () => {
            const blob = generateIcs(filteredAppointments);
            if (!blob) { toastStore.info("Keine Termine zum Exportieren vorhanden."); return; }
            const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `Termine_${new Date().toISOString().slice(0, 10)}.ics`; a.click(); toastStore.success("Termine exportiert.");
        },
        init: () => {
            const unsubAuth = pb.authStore.onChange(() => {
                currentUser = pb.authStore.record || pb.authStore.model;
                if (currentUser?.id && selectedUserId === 'all') {
                    selectedUserId = currentUser.id;
                }
            });
            const timer = setInterval(() => { now = new Date(); }, 60000);
            const unsubPb = subscribeRealtimeAppointments();
            if (canEdit) googleCalendarService.getStatus().then(s => { googleStatus = s; if (s?.connected || isSuperAdmin) loadGoogle(); });
            if (isSuperAdmin) pb.collection('users').getFullList({ requestKey: null }).then(res => { users = res; }).catch(() => { });
            return () => { clearInterval(timer); unsubAuth(); unsubPb(); };
        }
    };
}
