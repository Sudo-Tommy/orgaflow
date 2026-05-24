<script lang="ts">
    import { onMount } from 'svelte';
    import AppointmentDetailModal from './AppointmentDetailModal.svelte';
    import BulkBlockModal from './BulkBlockModal.svelte';
    import BulkVisibilityModal from './BulkVisibilityModal.svelte';
    import { pb } from "$lib/services/pocketbase";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import { toastStore } from "$lib/services/toastService.svelte";
    
    let { appointments = [], clients = [], onNewAppointment, isWidget = false } = $props<{ appointments: any[], clients: any[], isWidget?: boolean, onNewAppointment?: (date: Date) => void }>();

    let viewMode = $state<"month" | "week">("month");
    let currentDate = $state(new Date());
    let selectedDate = $state<Date | null>(new Date());
    let selectedClientId = $state<string>("all");

    let currentUser = $state(pb.authStore.record || pb.authStore.model);
    
    const checkIsSuperuser = (u: any) => pb.authStore.isSuperuser || u?.collectionName === '_superusers';
    let isGodMode = $derived(checkIsSuperuser(currentUser) || currentUser?.role === 'superadmin');
    let isSuperAdmin = $derived(isGodMode || currentUser?.role === 'admin');
    
    let isGuest = $derived(!currentUser || !currentUser.id);
    let canEdit = $derived(!isGuest);
    
    let users = $state<any[]>([]);
    // svelte-ignore state_referenced_locally
    let selectedUserId = $state<string>(isSuperAdmin ? "all" : (currentUser?.id || "all"));
    let selectedCompanyId = $state<string>("all");

    let myCompId = $derived.by(() => {
        let cId = currentUser?.company;
        if (Array.isArray(cId)) return cId[0];
        if (typeof cId === 'string' && cId.startsWith('[')) {
            try { return JSON.parse(cId)[0]; } catch {}
        }
        return cId;
    });

    function getCompanyColor(app: any) {
        if (!isSuperAdmin) return null;
        let uCompId = app.expand?.user?.company;
        if (!uCompId) return null;
        if (Array.isArray(uCompId)) uCompId = uCompId[0];
        else if (typeof uCompId === 'string' && uCompId.startsWith('[')) {
            try { uCompId = JSON.parse(uCompId)[0]; } catch {}
        }
        const comp = orgaStore.company?.data?.find(c => c.id === uCompId);
        return comp?.calendar_color || null;
    }

    // Echtzeit-Uhr für QOL-Features (Wochenansicht-Linie)
    let now = $state(new Date());
    onMount(() => {
        const unsub = pb.authStore.onChange(() => {
            currentUser = pb.authStore.record || pb.authStore.model;
        });

        const timeInterval = setInterval(() => now = new Date(), 60000); // Jede Minute aktualisieren

        if (typeof localStorage !== 'undefined') {
            const stored = localStorage.getItem('global_company_id');
            if (stored) selectedCompanyId = stored;
        }
        const handleSync = (e: any) => { selectedCompanyId = e.detail; };
        window.addEventListener('global-company-changed', handleSync);

        // Eigene Referenz für den Callback, damit beim Unsubscribe nicht die globale Verbindung getrennt wird!
        const realtimeCallback = async (e: any) => {
            if (orgaStore.appointments) {
                if (e.action === 'delete') {
                    orgaStore.appointments.data = orgaStore.appointments.data.filter((a: any) => a.id !== e.record.id);
                } else {
                    try {
                        const updatedApp = await pb.collection<any>('appointments').getOne(e.record.id, { expand: 'user,client,drive_record,time_record,tasks,expenditures,appointment_at', requestKey: null });
                        const idx = orgaStore.appointments.data.findIndex((a: any) => a.id === e.record.id);
                        const newData = [...orgaStore.appointments.data];
                        if (idx !== -1) newData[idx] = updatedApp;
                        else newData.push(updatedApp);
                        orgaStore.appointments.data = newData;
                    } catch (err) {}
                }
            }
        };
        
        pb.collection('appointments').subscribe('*', realtimeCallback);

        if (isSuperAdmin) {
            pb.collection('users').getFullList({ requestKey: null }).then(res => {
                if (isGodMode) {
                    users = res;
                } else if (myCompId) {
                    users = res.filter(u => {
                        let uc = u.company;
                        if (Array.isArray(uc)) return uc.includes(myCompId);
                        if (typeof uc === 'string' && uc.startsWith('[')) {
                            try { return JSON.parse(uc).includes(myCompId); } catch {}
                        }
                        return uc === myCompId || (uc && uc.includes(myCompId));
                    });
                }
            }).catch(() => {});
        }

        return () => {
            clearInterval(timeInterval);
            window.removeEventListener('global-company-changed', handleSync);
            pb.collection('appointments').unsubscribe('*');
            unsub();
        };
    });

    // Filtert die Termine basierend auf dem gewählten Klienten
    let filteredAppointments = $derived.by(() => {
        // Svelte 5 Reaktivität: Direkt an den Live-Store binden, falls vorhanden, sonst Fallback auf Props
        let list = orgaStore.appointments?.data || appointments;

        let filterCompId = selectedCompanyId;
        if (!isGodMode && myCompId) {
            filterCompId = myCompId; // Admins sehen zwingend nur ihre Firma
        }

        if (filterCompId !== "all" && filterCompId) {
            list = list.filter((app: any) => {
                let uCompId = app.expand?.user?.company;
                if (!uCompId) return false;
                if (Array.isArray(uCompId)) return uCompId.includes(filterCompId);
                if (typeof uCompId === 'string') {
                    if (uCompId.startsWith('[')) {
                        try { return JSON.parse(uCompId).includes(filterCompId); } catch {}
                    }
                    return uCompId === filterCompId || uCompId.includes(filterCompId);
                }
                return false;
            });
        }

        if (selectedClientId !== "all") {
            list = list.filter((app: any) => {
                if (!app.client) return false;
                if (Array.isArray(app.client)) return app.client.includes(selectedClientId);
                return app.client === selectedClientId;
            });
        }
        if (selectedUserId !== "all") {
            list = list.filter((app: any) => app.user === selectedUserId || (app.description && app.description.includes('[BLOCK]')));
        }
        return list;
    });

    function isSameDay(d1: Date, d2: Date) {
        return d1.getDate() === d2.getDate() &&
               d1.getMonth() === d2.getMonth() &&
               d1.getFullYear() === d2.getFullYear();
    }

    function getAppsForDate(date: Date): any[] {
        return filteredAppointments.filter((app: any) => {
            if (!app.appointment) return false;
            return isSameDay(new Date(app.appointment), date);
        }).sort((a: any, b: any) => new Date(a.appointment).getTime() - new Date(b.appointment).getTime());
    }

    // Berechnet das Raster (Grid) für den Kalender
    let calendarDays = $derived.by(() => {
        const y = currentDate.getFullYear();
        const m = currentDate.getMonth();
        const days = [];

        if (viewMode === "month") {
            const firstDay = new Date(y, m, 1);
            let startDay = firstDay.getDay();
            if (startDay === 0) startDay = 7;
            startDay -= 1;

            const prevMonthLastDay = new Date(y, m, 0).getDate();
            for (let i = startDay - 1; i >= 0; i--) {
                const d = new Date(y, m - 1, prevMonthLastDay - i);
                days.push({ date: d, isCurrentMonth: false, apps: getAppsForDate(d) });
            }
            const lastDay = new Date(y, m + 1, 0).getDate();
            for (let i = 1; i <= lastDay; i++) {
                const d = new Date(y, m, i);
                days.push({ date: d, isCurrentMonth: true, apps: getAppsForDate(d) });
            }
            const remaining = 42 - days.length;
            for (let i = 1; i <= remaining; i++) {
                const d = new Date(y, m + 1, i);
                days.push({ date: d, isCurrentMonth: false, apps: getAppsForDate(d) });
            }
        } else {
            // Wochenansicht
            const monday = new Date(currentDate);
            const day = monday.getDay();
            const diff = monday.getDate() - day + (day === 0 ? -6 : 1);
            monday.setDate(diff);
            for (let i = 0; i < 7; i++) {
                const d = new Date(monday);
                d.setDate(monday.getDate() + i);
                days.push({ date: d, isCurrentMonth: d.getMonth() === m, apps: getAppsForDate(d) });
            }
        }
        return days;
    });

    let selectedDayAppointments = $derived.by(() => {
        if (!selectedDate) return [];
        return getAppsForDate(selectedDate);
    });

    // Navigation
    function next() {
        currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + (viewMode === 'month' ? 1 : 0), currentDate.getDate() + (viewMode === 'week' ? 7 : 0));
    }
    function prev() {
        currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - (viewMode === 'month' ? 1 : 0), currentDate.getDate() - (viewMode === 'week' ? 7 : 0));
    }
    function today() {
        currentDate = new Date();
        selectedDate = new Date();
    }
    function selectDay(date: Date) {
        selectedDate = date;
    }

    // Auto-Scroll zur aktuellen Uhrzeit in der Wochenansicht
    let scrollContainer: HTMLElement | undefined = $state();
    $effect(() => {
        if (viewMode === 'week' && scrollContainer) {
            // Scrolle auf die aktuelle Stunde minus 1,5 Stunden für den perfekten Blickwinkel
            const targetScroll = (now.getHours() * 64) - 96;
            scrollContainer.scrollTop = Math.max(0, targetScroll);
        }
    });

    let monthName = $derived(currentDate.toLocaleString('de-DE', { month: 'long' }));
    let year = $derived(currentDate.getFullYear());
    const weekdays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

    // --- Wochenansicht Styling-Berechnungen ---
    const HOUR_HEIGHT = 64; // Höhe einer Stunde in Pixeln (entspricht h-16)

    function getDisplayTime(app: any) {
        if (app.expand?.time_record && app.expand.time_record.length > 0) {
            let earliestStart = Infinity;
            let latestEnd = 0;
            let hasValidTime = false;

            app.expand.time_record.forEach((tr: any) => {
                if (tr.start && tr.end) {
                    const startMs = new Date(tr.start).getTime();
                    const endMs = new Date(tr.end).getTime();
                    if (!isNaN(startMs) && !isNaN(endMs)) {
                        hasValidTime = true;
                        if (startMs < earliestStart) earliestStart = startMs;
                        if (endMs > latestEnd) latestEnd = endMs;
                    }
                }
            });

            if (hasValidTime) {
                const startStr = new Date(earliestStart).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
                const endStr = new Date(latestEnd).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
                return `${startStr} - ${endStr}`;
            }
        }
        if (!app.appointment) return '';
        return new Date(app.appointment).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    }

    function getAppTop(app: any) {
        let startTime = app.appointment ? new Date(app.appointment) : new Date();
        if (app.expand?.time_record && app.expand.time_record.length > 0) {
            let earliestStart = Infinity;
            app.expand.time_record.forEach((tr: any) => {
                if (tr.start) {
                    const ms = new Date(tr.start).getTime();
                    if (!isNaN(ms) && ms < earliestStart) earliestStart = ms;
                }
            });
            if (earliestStart !== Infinity) startTime = new Date(earliestStart);
        }
        if (isNaN(startTime.getTime())) return 0;
        return (startTime.getHours() * HOUR_HEIGHT) + ((startTime.getMinutes() / 60) * HOUR_HEIGHT);
    }

    function getAppHeight(app: any) {
        let durationMinutes = 60; // Standardmäßig 1 Stunde Platzbedarf
        if (app.expand?.time_record && app.expand.time_record.length > 0) {
            let earliestStart = Infinity;
            let latestEnd = 0;
            let hasValidTime = false;
            app.expand.time_record.forEach((tr: any) => {
                if (tr.start && tr.end) {
                    const startMs = new Date(tr.start).getTime();
                    const endMs = new Date(tr.end).getTime();
                    if (!isNaN(startMs) && !isNaN(endMs)) {
                        hasValidTime = true;
                        if (startMs < earliestStart) earliestStart = startMs;
                        if (endMs > latestEnd) latestEnd = endMs;
                    }
                }
            });
            if (hasValidTime) {
                const diffMs = latestEnd - earliestStart;
                if (diffMs > 0) durationMinutes = Math.round(diffMs / 60000);
            }
        }
        return Math.max(30, durationMinutes) / 60 * HOUR_HEIGHT - 2; // Mindestens 30 Min hoch, -2px für Abstand
    }

    // --- HELPER FÜR SAUBERE KARTEN & RBAC ---
    const isBlock = (app: any) => app.description?.includes('[BLOCK]');
    const getBlockText = (app: any) => app.description?.replace('[BLOCK]', '').trim() || 'Sperrzeit / Abwesend';

    function getCardTitle(app: any) {
        if (isGuest) return "Belegt";
        if (app.is_private && app.user !== currentUser?.id && !isGodMode) return "Privater Termin";
        if (isBlock(app)) return getBlockText(app);
        const clientName = app.expand?.client?.[0] ? `${app.expand.client[0].name_first} ${app.expand.client[0].name_last}` : '';
        return clientName || 'Interner Termin';
    }

    function getCardSubtitle(app: any) {
        if (isGuest || (app.is_private && app.user !== currentUser?.id && !isGodMode)) return "";
        if (isBlock(app)) return "Sperrzeit";
        return app.description || '';
    }

    function getCardStateClasses(app: any) {
        let classes = [];
        if (app.settled) classes.push('grayscale opacity-60');
        else if (currentUser?.id && app.user !== currentUser.id) classes.push('opacity-60 saturate-50 hover:opacity-100 hover:saturate-100');
        return classes.join(' ');
    }

    // svelte-ignore non_reactive_update
    let detailModal: ReturnType<typeof AppointmentDetailModal>;
    // svelte-ignore non_reactive_update
    let bulkBlockModal: ReturnType<typeof BulkBlockModal>;
    // svelte-ignore non_reactive_update
    let bulkVisibilityModal: ReturnType<typeof BulkVisibilityModal>;

    // --- Drag & Drop Logik ---
    let draggedAppId = $state<string | null>(null);
    let isDragging = $state(false);
    let isUpdating = $state(false);

    function handleDragStart(e: DragEvent, appId: string) {
        draggedAppId = appId;
        isDragging = true;
        if (e.dataTransfer) {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', appId);
        }
    }

    function handleDragEnd() {
        draggedAppId = null;
        isDragging = false;
    }

    async function updateAppointmentDate(appId: string, newDate: Date) {
        isUpdating = true;
        try {
            const app = orgaStore.appointments?.getById(appId);
            
            // Falls Zeiterfassungen am Termin hängen, verschieben wir diese um den exakt selben Zeit-Abstand mit!
            if (app && app.expand?.time_record && app.expand.time_record.length > 0) {
                const oldDate = new Date(app.appointment as string);
                const deltaMs = newDate.getTime() - oldDate.getTime();
                
                for (const tr of app.expand.time_record) {
                    const trPayload: any = {};
                    if (tr.start) trPayload.start = new Date(new Date(tr.start).getTime() + deltaMs).toISOString();
                    if (tr.end) trPayload.end = new Date(new Date(tr.end).getTime() + deltaMs).toISOString();
                    
                    if (Object.keys(trPayload).length > 0) {
                        await pb.collection('time_records').update(tr.id, trPayload);
                    }
                }
            }

            // PocketBase erwartet UTC. toISOString wandelt das lokale Datum in UTC um.
            await pb.collection('appointments').update(appId, { appointment: newDate.toISOString() });
            
            // Aktualisiere den Store, damit die UI sofort reagiert (inkl. der Relationen)
            const updatedApp = await pb.collection<any>('appointments').getOne(appId, { expand: 'user,client,drive_record,time_record,tasks,expenditures,appointment_at' });
            if (orgaStore.appointments) {
                const idx = orgaStore.appointments.data.findIndex(a => a.id === appId);
                if (idx !== -1) {
                    orgaStore.appointments.data[idx] = updatedApp;
                }
            }
            toastStore.success("Termin erfolgreich verschoben.");
        } catch (err) {
            console.error("Fehler beim Verschieben des Termins:", err);
            toastStore.error("Der Termin konnte nicht verschoben werden.");
        } finally {
            isUpdating = false;
        }
    }

    async function handleDropOnMonthDay(e: DragEvent, targetDate: Date) {
        e.preventDefault();
        if (!draggedAppId) return;
        const app = orgaStore.appointments?.getById(draggedAppId);
        draggedAppId = null;
        isDragging = false;
        if (!app) return;

        const originalDate = new Date((app.appointment as string) || '');
        const newDate = new Date(targetDate);
        
        // Behalte die ursprüngliche Uhrzeit bei (lokale Zeit)
        if (!isNaN(originalDate.getTime())) {
            newDate.setHours(originalDate.getHours(), originalDate.getMinutes(), 0, 0);
        } else {
            newDate.setHours(12, 0, 0, 0);
        }

        await updateAppointmentDate(app.id, newDate);
    }

    async function handleDropOnWeekDay(e: DragEvent, targetDate: Date) {
        e.preventDefault();
        if (!draggedAppId) return;
        const app = orgaStore.appointments?.getById(draggedAppId);
        draggedAppId = null;
        isDragging = false;
        if (!app) return;

        // Berechne die Uhrzeit anhand der Y-Position (1 Stunde = HOUR_HEIGHT)
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const y = Math.max(0, e.clientY - rect.top);
        
        const totalHours = y / HOUR_HEIGHT;
        const hours = Math.floor(totalHours);
        const minutes = Math.round((totalHours - hours) * 60);

        // Auf 15-Minuten-Intervalle runden (Snap to Grid)
        const snappedMinutes = Math.round(minutes / 15) * 15;

        const newDate = new Date(targetDate);
        newDate.setHours(hours, snappedMinutes, 0, 0);

        await updateAppointmentDate(app.id, newDate);
    }

    async function toggleVisibility(app: any) {
        try {
            const newValue = !app.is_visible;
            await pb.collection('appointments').update(app.id, { is_visible: newValue });
            if (orgaStore.appointments) {
                const newData = [...orgaStore.appointments.data];
                const idx = newData.findIndex(a => a.id === app.id);
                if (idx !== -1) {
                    newData[idx] = { ...newData[idx], is_visible: newValue };
                    orgaStore.appointments.data = newData;
                }
            }
            toastStore.success(newValue ? "Termin ist nun im Portal sichtbar 👁️" : "Termin ist nun versteckt 🙈");
        } catch (err) {
            console.error("Fehler beim Umschalten der Sichtbarkeit:", err);
            toastStore.error("Sichtbarkeit konnte nicht geändert werden.");
        }
    }
</script>

{#snippet statusIcons(app: any)}
    <div class="flex items-center gap-0.75 opacity-60 hover:opacity-100 shrink-0 text-[10px] transition-opacity cursor-help">
        {#if isSuperAdmin}
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <span onclick={(e) => { e.stopPropagation(); toggleVisibility(app); }} class="hover:scale-125 transition-transform cursor-pointer mr-0.5" title={app.is_visible ? "Öffentlich sichtbar (Klick zum Verbergen)" : "Unsichtbar (Klick zum Veröffentlichen)"}>
                {app.is_visible ? '👁️' : '🙈'}
            </span>
        {/if}
        {#if app.is_private}<span title="Privater Termin">🔒</span>{/if}
        {#if app.is_series}<span class="text-indigo-600" title="Wiederkehrender Serientermin">🔁</span>{/if}
        {#if app.settled}<span class="text-emerald-600" title="Bereits abgerechnet">✓</span>{/if}
        {#if app.expand?.time_record?.length > 0}<span title="Zeiterfassung liegt vor">⏱️</span>{/if}
        {#if app.expand?.drive_record?.length > 0}<span title="Fahrtenbuch-Eintrag liegt vor">🚗</span>{/if}
        {#if app.expand?.expenditures?.length > 0}<span title="Ausgaben/Kassenbon hinterlegt">💶</span>{/if}
        {#if app.expand?.tasks?.length > 0}<span title="Besuchsbericht/Aufgabe vorhanden">📝</span>{/if}
    </div>
{/snippet}

{#snippet userTag(app: any)}
    {#if isSuperAdmin && app.expand?.user && app.expand.user.id !== currentUser?.id}
        <span class="inline-block text-[8px] sm:text-[9px] font-bold text-neutral-500 bg-neutral-200/60 border border-neutral-200/80 px-1 py-0.5 rounded truncate max-w-[95%] shrink-0 text-center" title="Zugewiesen an: {app.expand.user.name_first} {app.expand.user.name_last}">
            👤 {app.expand.user.name_first}
        </span>
    {/if}
{/snippet}

<div class="orga-calendar-wrapper {isUpdating ? 'opacity-50 pointer-events-none transition-opacity' : ''}">
    <!-- Toolbar -->
    <div class="orga-calendar-toolbar flex-wrap {isWidget ? 'p-2 sm:p-3' : 'p-3 md:p-5'} gap-y-3">
        <div class="flex items-center gap-2 max-w-fit w-full sm:w-auto justify-between sm:justify-start">
            <div class="flex items-center bg-white border border-neutral-200 rounded-lg p-0.5 shadow-sm shrink-0">
                <!-- svelte-ignore a11y_consider_explicit_label -->
                <button onclick={prev} class="p-1 sm:p-1.5 text-neutral-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"><svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" /></svg></button>
                <span class="w-24 sm:w-28 text-center font-bold text-neutral-800 text-xs sm:text-sm truncate">{monthName} {year}</span>
                <!-- svelte-ignore a11y_consider_explicit_label -->
                <button onclick={next} class="p-1 sm:p-1.5 text-neutral-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"><svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" /></svg></button>
            </div>
            <button onclick={today} class="px-2.5 py-1.5 sm:px-3 sm:py-1.5 text-xs sm:text-sm font-bold text-neutral-600 bg-white border border-neutral-200 hover:bg-neutral-100 rounded-lg shadow-sm transition-colors shrink-0">Heute</button>
        </div>
        
        <div class="flex flex-row flex-wrap items-center gap-2 w-full lg:w-auto mt-1 lg:mt-0">
            <!-- Ansicht-Toggle -->
            <div class="flex bg-neutral-100 p-1 rounded-lg border border-neutral-200 shadow-inner shrink-0">
                <button onclick={() => viewMode = 'month'} class="px-2 sm:px-3 py-1 text-[10px] sm:text-xs font-bold rounded-md transition-colors {viewMode === 'month' ? 'bg-white shadow-sm text-indigo-600' : 'text-neutral-500 hover:text-neutral-700'}">Monat</button>
                <button onclick={() => viewMode = 'week'} class="px-2 sm:px-3 py-1 text-[10px] sm:text-xs font-bold rounded-md transition-colors {viewMode === 'week' ? 'bg-white shadow-sm text-indigo-600' : 'text-neutral-500 hover:text-neutral-700'}">Woche</button>
            </div>
            <!-- Klienten-Filter -->
            <select bind:value={selectedClientId} class="bg-white border border-neutral-200 text-xs sm:text-sm font-semibold text-neutral-700 rounded-lg px-2 py-1.5 sm:px-3 shadow-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none flex-1 sm:flex-none cursor-pointer truncate max-w-35 sm:max-w-50">
                <option value="all">Alle Klienten</option>
                {#each clients as c (c.id)}
                    <option value={c.id}>{c.name_first} {c.name_last}</option>
                {/each}
            </select>
            {#if isSuperAdmin}
                <select bind:value={selectedUserId} class="bg-white border border-neutral-200 text-xs sm:text-sm font-semibold text-neutral-700 rounded-lg px-2 py-1.5 sm:px-3 shadow-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none flex-1 sm:flex-none cursor-pointer truncate max-w-35 sm:max-w-50">
                    <option value="all">Alle Mitarbeiter</option>
                <option value={currentUser?.id}>Meine Termine</option>
                    {#each users as u (u.id)}
                    {#if u.id !== currentUser?.id}
                            <option value={u.id}>{u.name_first} {u.name_last}</option>
                        {/if}
                    {/each}
                </select>
                <button type="button" onclick={() => bulkBlockModal?.open()} class="bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs sm:text-sm font-bold rounded-lg px-2 py-1.5 sm:px-3 shadow-sm transition-colors flex items-center gap-1.5 shrink-0" title="Mehrere Tage auf einmal sperren">
                    <span>🚫</span> <span class="hidden sm:inline">Sperren</span>
                </button>
                <button type="button" onclick={() => bulkVisibilityModal?.open(filteredAppointments)} class="bg-white border border-sky-200 text-sky-600 hover:bg-sky-50 text-xs sm:text-sm font-bold rounded-lg px-2 py-1.5 sm:px-3 shadow-sm transition-colors flex items-center gap-1.5 shrink-0" title="Sichtbarkeit mehrerer Termine umschalten">
                    <span>👁️</span> <span class="hidden sm:inline">Sichtbarkeit</span>
                </button>
            {/if}
        </div>
    </div>

    {#if viewMode === 'month'}
        <!-- === MONATSANSICHT === -->
        <div class="{isWidget ? 'flex flex-col md:flex-row' : 'flex flex-col'} w-full">
            <!-- Linke Seite: Kalender-Raster -->
            <div class="flex-1 min-w-0 {isWidget ? 'border-b md:border-b-0 md:border-r border-neutral-100' : 'border-transparent'}">
                <div class="orga-calendar-header">
                    {#each weekdays as day}
                        <div class="py-2 text-center text-[10px] sm:text-xs font-bold text-neutral-500 uppercase tracking-wider border-r border-neutral-100 last:border-0">{day}</div>
                    {/each}
                </div>

                <div class="orga-calendar-grid">
                    {#each calendarDays as day}
                        <!-- svelte-ignore a11y_click_events_have_key_events -->
                        <!-- svelte-ignore a11y_no_static_element_interactions -->
                        <div ondrop={canEdit ? (e) => handleDropOnMonthDay(e, day.date) : null} ondragover={(e) => e.preventDefault()} onclick={() => selectDay(day.date)} class="orga-calendar-day group md:min-h-24 lg:min-h-32 {selectedDate && isSameDay(day.date, selectedDate) ? 'ring-2 ring-inset ring-indigo-500/50 z-10 bg-indigo-50/20' : ''} {!day.isCurrentMonth ? 'opacity-50 bg-neutral-50/50' : ''} {isDragging ? 'hover:ring-2 hover:ring-inset hover:ring-indigo-400' : ''}">
                            <div class="flex justify-between items-start w-full">
                                {#if canEdit}
                                    <button onclick={(e) => { e.stopPropagation(); onNewAppointment?.(day.date); }} class="hidden md:flex w-5 h-5 mt-0.5 ml-0.5 items-center justify-center text-neutral-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors opacity-0 group-hover:opacity-100" title="Neuer Termin">
                                        <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg>
                                    </button>
                                {:else}
                                    <div></div>
                                {/if}
                                <span class="w-6 h-6 sm:w-7 sm:h-7 mx-auto sm:mx-0 sm:ml-auto flex items-center justify-center text-[10px] sm:text-xs font-bold rounded-full {isSameDay(day.date, now) ? 'bg-brand-600 text-white shadow-md' : 'text-neutral-700'}">
                                    {day.date.getDate()}
                                </span>
                            </div>
                            <!-- Mobile Variante: Nur farbige Punkte -->
                            <div class="flex-wrap gap-0.75 justify-center mt-1 sm:mt-1.5 px-1 {isWidget ? 'flex' : 'flex md:hidden'}">
                                {#each day.apps.slice(0, 4) as app}
                                    {@const cColor = getCompanyColor(app)}
                                    <span class="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full shadow-sm {cColor ? '' : (app.is_private ? 'bg-rose-500' : 'bg-indigo-500')}" style="{cColor ? `background-color: ${cColor};` : ''}" title={app.description || 'Termin'}></span>
                                {/each}
                                {#if day.apps.length > 4}
                                    <span class="text-[8px] font-bold text-neutral-400">+{day.apps.length - 4}</span>
                                {/if}
                            </div>
                            <!-- Desktop Variante: Kompakte Chips -->
                            <div class="flex-col gap-1 mt-1.5 flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-0.5 pb-0.5 {isWidget ? 'hidden' : 'hidden md:flex'}">
                                {#each day.apps as app}
                                    {@const cColor = getCompanyColor(app)}
                                    {#if isBlock(app)}
                                        <button type="button" onclick={canEdit ? (e) => { e.stopPropagation(); detailModal?.open(app.id); } : (e) => e.stopPropagation()} class="w-full text-left block px-1.5 py-1 rounded-md bg-rose-50/50 border border-rose-100 text-rose-800 hover:bg-rose-100 transition-colors truncate {getCardStateClasses(app)}">
                                            <div class="flex justify-between items-center w-full">
                                                <div class="truncate"><span class="font-bold text-[9px] mr-1">🚫</span> <span class="text-[10px] font-semibold">{getBlockText(app)}</span></div>
                                                {#if isSuperAdmin}
                                                    <!-- svelte-ignore a11y_click_events_have_key_events -->
                                                    <!-- svelte-ignore a11y_no_static_element_interactions -->
                                                    <span onclick={(e) => { e.stopPropagation(); toggleVisibility(app); }} class="shrink-0 ml-1 hover:scale-125 transition-transform cursor-pointer text-[10px] opacity-60 hover:opacity-100" title={app.is_visible ? "Öffentlich" : "Versteckt"}>{app.is_visible ? '👁️' : '🙈'}</span>
                                                {/if}
                                            </div>
                                        </button>
                                    {:else}
                                        <button type="button" draggable={canEdit ? "true" : "false"} ondragstart={canEdit ? (e) => handleDragStart(e, app.id) : null} ondragend={handleDragEnd} onclick={canEdit ? (e) => { e.stopPropagation(); detailModal?.open(app.id); } : (e) => e.stopPropagation()} class="{canEdit ? 'cursor-grab active:cursor-grabbing hover:-translate-y-px hover:shadow-md' : 'cursor-default'} w-full text-left flex flex-col gap-0.5 px-1.5 py-1 rounded-md border border-transparent transition-all {cColor ? 'hover:brightness-95' : (app.is_private ? 'bg-rose-50 text-rose-800' : 'bg-indigo-50 text-indigo-800')} {draggedAppId === app.id ? 'opacity-40' : ''} {getCardStateClasses(app)}" style="{cColor ? `background-color: color-mix(in srgb, ${cColor} 10%, white); border-left: 2px solid ${cColor}; color: color-mix(in srgb, ${cColor} 90%, black);` : ''}" title={getCardSubtitle(app)}>
                                            <div class="flex items-center justify-between w-full">
                                                <span class="font-bold text-[9px] leading-none truncate pr-1">{getDisplayTime(app)}</span>
                                                {@render statusIcons(app)}
                                            </div>
                                            <div class="flex items-center gap-1 w-full mt-0.5">
                                                {@render userTag(app)}
                                                <span class="text-[10px] font-semibold truncate flex-1 leading-tight">{getCardTitle(app)}</span>
                                            </div>
                                        </button>
                                    {/if}
                                {/each}
                            </div>
                        </div>
                    {/each}
                </div>
            </div>

            <!-- Rechte Seite: Termine des Tages (Nur im Widget/Mobile-Modus) -->
            {#if isWidget && selectedDate}
                <div class="w-full md:w-60 lg:w-70 shrink-0 bg-neutral-50/50 p-3 sm:p-4 flex flex-col">
                    <div class="flex items-center justify-between mb-3 border-b border-neutral-200/60 pb-2">
                        <h3 class="text-[11px] sm:text-sm font-bold text-neutral-900 flex items-center gap-1.5">
                            <span>📅</span> 
                            <span class="hidden sm:inline">{selectedDate.toLocaleDateString('de-DE', { day: '2-digit', month: 'long' })}</span>
                            <span class="sm:hidden">{selectedDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}</span>
                        </h3>
                        {#if canEdit}
                            <button onclick={() => onNewAppointment?.(selectedDate as Date)} class="text-indigo-600 hover:text-indigo-800 text-sm sm:text-lg font-bold transition-colors">+</button>
                        {/if}
                    </div>
                    
                    {#if selectedDayAppointments.length === 0}
                        <p class="text-[10px] sm:text-xs text-neutral-500 italic mt-2 text-center">Keine Termine</p>
                    {:else}
                        <div class="flex flex-col gap-2 overflow-y-auto custom-scrollbar pr-1 max-h-60 md:max-h-100">
                            {#each selectedDayAppointments as app}
                                    {#if isBlock(app)}
                                        <button type="button" onclick={canEdit ? (e) => { e.stopPropagation(); detailModal?.open(app.id); } : (e) => e.stopPropagation()} class="w-full text-left flex items-center bg-rose-50/50 p-2 sm:p-3 rounded-xl border border-rose-100 hover:border-rose-300 transition-colors gap-3 {getCardStateClasses(app)}">
                                            <div class="w-14 sm:w-16 shrink-0 flex flex-col items-center justify-center gap-0.5">
                                                {@render userTag(app)}
                                                <span class="text-lg opacity-80">🚫</span>
                                            </div>
                                            <div class="flex-1 min-w-0 flex justify-between items-center">
                                                <p class="text-[11px] sm:text-xs text-rose-900 font-bold truncate pr-2">{getBlockText(app)}</p>
                                                {#if isSuperAdmin}
                                                    <!-- svelte-ignore a11y_click_events_have_key_events -->
                                                    <!-- svelte-ignore a11y_no_static_element_interactions -->
                                                    <span onclick={(e) => { e.stopPropagation(); toggleVisibility(app); }} class="shrink-0 hover:scale-125 transition-transform cursor-pointer text-xs opacity-60 hover:opacity-100" title={app.is_visible ? "Öffentlich" : "Versteckt"}>{app.is_visible ? '👁️' : '🙈'}</span>
                                                {/if}
                                            </div>
                                        </button>
                                    {:else}
                                        <button type="button" onclick={canEdit ? (e) => { e.stopPropagation(); detailModal?.open(app.id); } : (e) => e.stopPropagation()} class="{canEdit ? 'hover:border-indigo-300 hover:shadow-md' : 'cursor-default'} w-full text-left flex bg-white p-2.5 sm:p-3 rounded-xl border border-neutral-100 shadow-sm transition-all group gap-3 {getCardStateClasses(app)}">
                                            <!-- Links: Uhrzeit Kasten -->
                                            <div class="w-14 sm:w-16 shrink-0 flex flex-col items-center justify-center bg-neutral-50 rounded-lg border border-neutral-100/50 py-1.5 gap-1">
                                                {@render userTag(app)}
                                                <span class="text-[11px] sm:text-xs font-black {app.is_private ? 'text-rose-600' : 'text-indigo-600'} text-center flex flex-col leading-tight">
                                                    {#each getDisplayTime(app).split(' - ') as t, i}
                                                        <span>{t}</span>
                                                        {#if i === 0 && getDisplayTime(app).includes(' - ')}<span class="text-[8px] text-neutral-400 opacity-50 my-0.5 font-bold">bis</span>{/if}
                                                    {/each}
                                                </span>
                                            </div>
                                            
                                            <!-- Rechts: Inhalt -->
                                            <div class="flex-1 min-w-0 flex flex-col justify-center py-0.5">
                                                <div class="flex items-start justify-between mb-1 gap-2">
                                                    <span class="text-xs font-bold text-neutral-900 truncate">{getCardTitle(app)}</span>
                                                    {@render statusIcons(app)}
                                                </div>
                                                {#if getCardSubtitle(app)}
                                                    <p class="text-[10px] sm:text-[11px] text-neutral-500 line-clamp-1 mb-1.5 leading-snug">{getCardSubtitle(app)}</p>
                                                {/if}
                                                {#if app.expand?.appointment_at?.[0] || app.location_address}
                                                    <div class="flex items-center gap-1.5 mt-auto">
                                                        <span class="text-[9px] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded flex items-center gap-1 truncate max-w-32" title="Standort/Fahrtziel hinterlegt">📍 Route</span>
                                                    </div>
                                                {/if}
                                            </div>
                                        </button>
                                    {/if}
                            {/each}
                        </div>
                    {/if}
                </div>
            {/if}
        </div>
    {:else}
        <!-- === WOCHENANSICHT (Stunden-Raster) === -->
        <div class="flex border-b border-neutral-100 bg-neutral-50/80 z-20 sticky top-0">
            <div class="w-12 sm:w-16 flex-none border-r border-neutral-100"></div>
            <div class="flex-1 grid grid-cols-7">
                {#each calendarDays as day, i}
                    <!-- svelte-ignore a11y_click_events_have_key_events -->
                    <!-- svelte-ignore a11y_no_static_element_interactions -->
                    <div onclick={() => selectDay(day.date)} class="py-2 text-center border-r border-neutral-100 last:border-0 cursor-pointer hover:bg-neutral-100 transition-colors {selectedDate && isSameDay(day.date, selectedDate) ? 'bg-indigo-50/50' : ''}">
                        <div class="text-[10px] sm:text-xs font-bold {isSameDay(day.date, now) ? 'text-brand-500' : 'text-neutral-500'} uppercase tracking-wider">{weekdays[i]}</div>
                        <div class="text-sm sm:text-base font-bold {isSameDay(day.date, now) ? 'text-brand-600' : 'text-neutral-900'}">{day.date.getDate()}</div>
                    </div>
                {/each}
            </div>
        </div>
        
        <div class="flex overflow-y-auto custom-scrollbar relative h-125 md:h-150 bg-white scroll-smooth" bind:this={scrollContainer}>
            <div class="w-12 sm:w-16 flex-none border-r border-neutral-100 bg-neutral-50 sticky left-0 z-20">
                {#each Array(24) as _, hour}
                    <div class="h-16 border-b border-neutral-100 text-right pr-1 sm:pr-2 pt-1 text-[10px] sm:text-xs text-neutral-400 font-medium">{hour}:00</div>
                {/each}
            </div>
            <div class="flex-1 relative h-384">
                <div class="absolute inset-0 flex flex-col pointer-events-none z-0">
                    {#each Array(24) as _, hour}
                        <div class="h-16 border-b border-neutral-100 w-full shrink-0"></div>
                    {/each}
                </div>
                <div class="absolute inset-0 grid grid-cols-7 z-10">
                    {#each calendarDays as day}
                        <!-- Rote Echtzeit-Linie, wenn dieser Tag HEUTE ist -->
                        {#if isSameDay(day.date, now)}
                            <div class="absolute left-0 right-0 border-t-2 border-rose-500 z-30 pointer-events-none" style="top: {(now.getHours() * 64) + (now.getMinutes() / 60 * 64)}px;">
                                <div class="absolute -left-1.5 -top-1.5 w-3 h-3 bg-rose-500 rounded-full shadow-sm"></div>
                            </div>
                        {/if}
                        
                        <!-- svelte-ignore a11y_click_events_have_key_events -->
                        <!-- svelte-ignore a11y_no_static_element_interactions -->
                        <div ondrop={(e) => handleDropOnWeekDay(e, day.date)} ondragover={(e) => e.preventDefault()} onclick={() => selectDay(day.date)} class="relative border-r border-neutral-100 last:border-0 cursor-pointer hover:bg-neutral-50/30 transition-colors {selectedDate && isSameDay(day.date, selectedDate) ? 'bg-indigo-50/20' : ''} {isDragging ? 'hover:bg-indigo-50/50 outline-dashed outline-2 outline-indigo-200 -outline-offset-2' : ''}">
                            {#each day.apps as app}
                                    {@const cColor = getCompanyColor(app)}
                                    {#if isBlock(app)}
                                        <button type="button" onclick={canEdit ? (e) => { e.stopPropagation(); detailModal?.open(app.id); } : (e) => e.stopPropagation()} class="{canEdit ? 'hover:shadow-md hover:z-20' : 'cursor-default'} text-left absolute left-0.5 right-0.5 sm:left-1 sm:right-1 rounded-md p-1.5 overflow-hidden transition-all border shadow-sm bg-rose-50/80 border-rose-100 text-rose-800 backdrop-blur-sm {getCardStateClasses(app)}" style="top: {getAppTop(app)}px; height: {getAppHeight(app)}px;" title={getBlockText(app)}>
                                            <div class="flex justify-between items-start w-full">
                                                <div class="font-bold text-[10px] flex items-center gap-1 mb-0.5">🚫 Sperrzeit</div>
                                                {#if isSuperAdmin}
                                                    <!-- svelte-ignore a11y_click_events_have_key_events -->
                                                    <!-- svelte-ignore a11y_no_static_element_interactions -->
                                                    <span onclick={(e) => { e.stopPropagation(); toggleVisibility(app); }} class="shrink-0 hover:scale-125 transition-transform cursor-pointer text-[10px] opacity-60 hover:opacity-100" title={app.is_visible ? "Öffentlich" : "Versteckt"}>{app.is_visible ? '👁️' : '🙈'}</span>
                                                {/if}
                                            </div>
                                            <div class="truncate opacity-75 text-[10px]">{getBlockText(app)}</div>
                                        </button>
                                    {:else}
                                        <button type="button" draggable={canEdit ? "true" : "false"} ondragstart={canEdit ? (e) => handleDragStart(e, app.id) : null} ondragend={handleDragEnd} onclick={canEdit ? (e) => { e.stopPropagation(); detailModal?.open(app.id); } : (e) => e.stopPropagation()} class="{canEdit ? 'cursor-grab active:cursor-grabbing hover:shadow-md hover:z-20' : 'cursor-default'} flex flex-col text-left absolute left-0.5 right-0.5 sm:left-1 sm:right-1 rounded-md p-1.5 overflow-hidden transition-all border shadow-sm {cColor ? 'hover:brightness-95' : (app.is_private ? 'bg-rose-50/90 border-rose-200 text-rose-800' : 'bg-white/90 border-neutral-200 text-neutral-800')} backdrop-blur-md {draggedAppId === app.id ? 'opacity-40 z-50 pointer-events-none' : ''} {getCardStateClasses(app)}" style="top: {getAppTop(app)}px; height: {getAppHeight(app)}px; {cColor ? `background-color: color-mix(in srgb, ${cColor} 10%, white); border-color: color-mix(in srgb, ${cColor} 30%, white); color: color-mix(in srgb, ${cColor} 90%, black); border-left: 3px solid ${cColor};` : 'border-left: 3px solid #6366f1;'}" title={getCardSubtitle(app)}>
                                            <div class="flex items-start justify-between w-full gap-1">
                                                <span class="font-bold text-[9px] leading-none">{getDisplayTime(app)}</span>
                                                {@render statusIcons(app)}
                                            </div>
                                            <div class="mt-1 text-[11px] font-bold leading-tight line-clamp-2">{getCardTitle(app)}</div>
                                            {#if getCardSubtitle(app)}
                                                <div class="text-[9px] opacity-75 truncate mt-0.5 font-medium">{getCardSubtitle(app)}</div>
                                            {/if}
                                            <div class="mt-auto pt-1 flex items-center justify-between w-full">
                                                {@render userTag(app)}
                                                </div>
                                        </button>
                                    {/if}
                            {/each}
                        </div>
                    {/each}
                </div>
            </div>
        </div>
    {/if}

    <!-- Detail-Ansicht für den ausgewählten Tag -->
    {#if selectedDate && !isWidget}
        <!-- Wird auf dem Desktop ausgeblendet (md:hidden), da die Termine dort ohnehin im Kalender selbst stehen. Mobile Optimiert. -->
        <div class="bg-neutral-50/50 border-t border-neutral-200 flex-1 md:hidden flex flex-col h-full relative">
            <div class="sticky top-0 bg-neutral-50/95 backdrop-blur-md z-10 py-3 px-4 sm:px-6 border-b border-neutral-200/60 shadow-sm flex items-center justify-between">
                <h3 class="text-sm sm:text-base font-bold text-neutral-900 flex items-center gap-2">
                    <span class="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center shadow-inner text-sm sm:text-base">📅</span> 
                    {selectedDate.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: 'long' })}
                </h3>
                {#if canEdit}
                    <button onclick={() => onNewAppointment?.(selectedDate as Date)} class="w-7 h-7 sm:w-8 sm:h-8 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center justify-center font-bold transition-colors shadow-sm" title="Neuer Termin">+</button>
                {/if}
            </div>
            
            <div class="p-4 sm:p-6 overflow-y-auto custom-scrollbar">
                {#if selectedDayAppointments.length === 0}
                    <div class="flex flex-col items-center justify-center py-10 opacity-60">
                        <span class="text-4xl mb-3">🍃</span>
                        <p class="text-sm text-neutral-500 font-medium">Keine Termine an diesem Tag.</p>
                    </div>
                {:else}
                    <div class="flex flex-col gap-3">
                        {#each selectedDayAppointments as app}
                                {#if isBlock(app)}
                                    <button type="button" onclick={canEdit ? (e) => { e.stopPropagation(); detailModal?.open(app.id); } : (e) => e.stopPropagation()} class="w-full text-left flex items-center bg-rose-50/50 p-3 sm:p-4 rounded-xl border border-rose-100 hover:border-rose-300 transition-colors gap-4 {getCardStateClasses(app)}">
                                        <div class="w-16 sm:w-20 shrink-0 flex flex-col items-center justify-center gap-0.5">
                                            {@render userTag(app)}
                                            <span class="text-lg opacity-80">🚫</span>
                                        </div>
                                        <div class="flex-1 min-w-0 flex justify-between items-center">
                                            <p class="text-sm text-rose-900 font-bold truncate pr-2">{getBlockText(app)}</p>
                                            {#if isSuperAdmin}
                                                <!-- svelte-ignore a11y_click_events_have_key_events -->
                                                <!-- svelte-ignore a11y_no_static_element_interactions -->
                                                <span onclick={(e) => { e.stopPropagation(); toggleVisibility(app); }} class="shrink-0 hover:scale-125 transition-transform cursor-pointer text-sm opacity-60 hover:opacity-100" title={app.is_visible ? "Öffentlich" : "Versteckt"}>{app.is_visible ? '👁️' : '🙈'}</span>
                                            {/if}
                                        </div>
                                    </button>
                                {:else}
                                    <button type="button" onclick={canEdit ? (e) => { e.stopPropagation(); detailModal?.open(app.id); } : (e) => e.stopPropagation()} class="{canEdit ? 'hover:border-indigo-300 hover:shadow-md' : 'cursor-default'} w-full text-left flex bg-white p-3 sm:p-4 rounded-xl border border-neutral-100 shadow-sm transition-all group gap-3 sm:gap-4 {getCardStateClasses(app)}">
                                        <div class="w-16 sm:w-20 shrink-0 flex flex-col items-center justify-center bg-neutral-50 rounded-xl border border-neutral-100/50 py-2 sm:py-3 gap-1.5">
                                            {@render userTag(app)}
                                            <span class="text-xs sm:text-sm font-black {app.is_private ? 'text-rose-600' : 'text-indigo-600'} text-center flex flex-col leading-tight">
                                                {#each getDisplayTime(app).split(' - ') as t, i}
                                                    <span>{t}</span>
                                                    {#if i === 0 && getDisplayTime(app).includes(' - ')}<span class="text-[9px] sm:text-[10px] text-neutral-400 opacity-50 my-0.5 font-bold">bis</span>{/if}
                                                {/each}
                                            </span>
                                        </div>
                                        
                                        <div class="flex-1 min-w-0 flex flex-col justify-center">
                                            <div class="flex items-start justify-between mb-1.5 gap-2">
                                                <span class="text-sm font-bold text-neutral-900 truncate">{getCardTitle(app)}</span>
                                                {@render statusIcons(app)}
                                            </div>
                                            {#if getCardSubtitle(app)}
                                                <p class="text-xs text-neutral-500 line-clamp-2 leading-relaxed mb-2.5">{getCardSubtitle(app)}</p>
                                                {/if}
                                            {#if app.expand?.appointment_at?.[0] || app.location_address}
                                                <div class="flex items-center gap-2 mt-auto">
                                                    <span class="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded flex items-center gap-1.5 truncate max-w-48" title="Standort/Fahrtziel hinterlegt">📍 Route zeigen</span>
                                                </div>
                                            {/if}
                                        </div>
                                    </button>
                                {/if}
                        {/each}
                    </div>
                {/if}
            </div>
        </div>
    {/if}
</div>

<AppointmentDetailModal bind:this={detailModal} />
<BulkBlockModal bind:this={bulkBlockModal} />
<BulkVisibilityModal bind:this={bulkVisibilityModal} />