<script lang="ts">
    import { onMount } from 'svelte';
    import AppointmentDetailModal from './AppointmentDetailModal.svelte';
    import BulkBlockModal from './BulkBlockModal.svelte';
    import { pb } from "$lib/services/pocketbase";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import { toastStore } from "$lib/services/toastService.svelte";
    
    let { appointments = [], clients = [], onNewAppointment, isWidget = false } = $props<{ appointments: any[], clients: any[], isWidget?: boolean, onNewAppointment?: (date: Date) => void }>();

    let viewMode = $state<"month" | "week">("month");
    let currentDate = $state(new Date());
    let selectedDate = $state<Date | null>(new Date());
    let selectedClientId = $state<string>("all");

    let currentUser = $state(pb.authStore.record || pb.authStore.model);
    
    const checkIsSuperuser = (u: any) => pb.authStore.isSuperuser || (pb.authStore as any).isAdmin || u?.collectionName === '_superusers';
    let isSuperAdmin = $derived(checkIsSuperuser(currentUser) || currentUser?.role === 'superadmin' || currentUser?.role === 'admin');
    let isGodMode = $derived(checkIsSuperuser(currentUser) || currentUser?.role === 'superadmin');
    
    let users = $state<any[]>([]);
    // svelte-ignore state_referenced_locally
    let selectedUserId = $state<string>((checkIsSuperuser(currentUser) || currentUser?.role === 'superadmin' || currentUser?.role === 'admin') ? "all" : (currentUser?.id || "all"));
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
            unsub();
        };
    });

    // Filtert die Termine basierend auf dem gewählten Klienten
    let filteredAppointments = $derived.by(() => {
        let list = appointments;

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
            list = list.filter((app: any) => app.user === selectedUserId);
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

    // svelte-ignore non_reactive_update
    let detailModal: ReturnType<typeof AppointmentDetailModal>;
    // svelte-ignore non_reactive_update
    let bulkBlockModal: ReturnType<typeof BulkBlockModal>;

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
</script>

<div class="orga-calendar-wrapper {isUpdating ? 'opacity-50 pointer-events-none transition-opacity' : ''}">
    <!-- Toolbar -->
    <div class="orga-calendar-toolbar flex-wrap {isWidget ? 'p-3 sm:p-4' : 'p-4 md:p-6'}">
        <div class="flex items-center gap-2 max-w-fit">
            <button onclick={today} class="px-3 py-1.5 text-sm font-bold text-neutral-600 bg-white border border-neutral-200 hover:bg-neutral-100 rounded-lg shadow-sm transition-colors shrink-0">Heute</button>
            <div class="flex items-center bg-white border border-neutral-200 rounded-lg p-0.5 shadow-sm shrink-0">
                <!-- svelte-ignore a11y_consider_explicit_label -->
                <button onclick={prev} class="p-1.5 text-neutral-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" /></svg></button>
                <span class="w-28 text-center font-bold text-neutral-800 text-sm">{monthName} {year}</span>
                <!-- svelte-ignore a11y_consider_explicit_label -->
                <button onclick={next} class="p-1.5 text-neutral-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" /></svg></button>
            </div>
        </div>
        
        <div class="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-3 mt-3 lg:mt-0">
            <!-- Ansicht-Toggle -->
            <div class="flex bg-neutral-100 p-1 rounded-lg border border-neutral-200 shadow-inner shrink-0">
                <button onclick={() => viewMode = 'month'} class="px-3 py-1 text-xs font-bold rounded-md transition-colors {viewMode === 'month' ? 'bg-white shadow-sm text-indigo-600' : 'text-neutral-500 hover:text-neutral-700'}">Monat</button>
                <button onclick={() => viewMode = 'week'} class="px-3 py-1 text-xs font-bold rounded-md transition-colors {viewMode === 'week' ? 'bg-white shadow-sm text-indigo-600' : 'text-neutral-500 hover:text-neutral-700'}">Woche</button>
            </div>
            {#if isGodMode}
                <select bind:value={selectedCompanyId} class="bg-indigo-50 border border-indigo-200 text-sm font-bold text-indigo-700 rounded-lg px-3 py-1.5 shadow-sm focus:ring-2 focus:ring-indigo-500/20 outline-none w-full sm:w-auto cursor-pointer">
                    <option value="all">🏢 Alle Firmen</option>
                    {#each orgaStore.company?.data || [] as comp}
                        <option value={comp.id}>{comp.city} {comp.name ? `(${comp.name})` : ''}</option>
                    {/each}
                </select>
            {/if}
            <!-- Klienten-Filter -->
            <select bind:value={selectedClientId} class="bg-white border border-neutral-200 text-sm font-semibold text-neutral-700 rounded-lg px-3 py-1.5 shadow-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none w-full sm:w-auto cursor-pointer">
                <option value="all">Alle Klienten</option>
                {#each clients as c (c.id)}
                    <option value={c.id}>{c.name_first} {c.name_last}</option>
                {/each}
            </select>
            {#if isSuperAdmin}
                <select bind:value={selectedUserId} class="bg-white border border-neutral-200 text-sm font-semibold text-neutral-700 rounded-lg px-3 py-1.5 shadow-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none w-full sm:w-auto cursor-pointer">
                    <option value="all">Alle Mitarbeiter</option>
                <option value={currentUser?.id}>Meine Termine</option>
                    {#each users as u (u.id)}
                    {#if u.id !== currentUser?.id}
                            <option value={u.id}>{u.name_first} {u.name_last}</option>
                        {/if}
                    {/each}
                </select>
                <button type="button" onclick={() => bulkBlockModal?.open()} class="bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 text-sm font-bold rounded-lg px-3 py-1.5 shadow-sm transition-colors flex items-center gap-1.5 shrink-0" title="Mehrere Tage auf einmal sperren">
                    <span>🚫</span> <span class="hidden xl:inline">Serien-Sperre</span>
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
                        <div class="py-2.5 text-center text-[10px] sm:text-xs font-bold text-neutral-500 uppercase tracking-wider border-r border-neutral-100 last:border-0">{day}</div>
                    {/each}
                </div>

                <div class="orga-calendar-grid">
                    {#each calendarDays as day}
                        <!-- svelte-ignore a11y_click_events_have_key_events -->
                        <!-- svelte-ignore a11y_no_static_element_interactions -->
                        <div ondrop={(e) => handleDropOnMonthDay(e, day.date)} ondragover={(e) => e.preventDefault()} onclick={() => selectDay(day.date)} class="orga-calendar-day group md:min-h-30 lg:min-h-35 {selectedDate && isSameDay(day.date, selectedDate) ? 'ring-2 ring-inset ring-indigo-500/50 z-10 bg-indigo-50/20' : ''} {!day.isCurrentMonth ? 'opacity-50 bg-neutral-50/50' : ''} {isDragging ? 'hover:ring-2 hover:ring-inset hover:ring-indigo-400' : ''}">
                            <div class="flex justify-between items-start w-full">
                                <button onclick={(e) => { e.stopPropagation(); onNewAppointment?.(day.date); }} class="hidden md:flex w-6 h-6 mt-0.5 ml-0.5 items-center justify-center text-neutral-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors opacity-0 group-hover:opacity-100" title="Neuer Termin">
                                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg>
                                </button>
                                <span class="w-6 h-6 sm:w-7 sm:h-7 mx-auto sm:mx-0 sm:ml-auto flex items-center justify-center text-[10px] sm:text-xs font-bold rounded-full {isSameDay(day.date, now) ? 'bg-brand-600 text-white shadow-md' : 'text-neutral-700'}">
                                    {day.date.getDate()}
                                </span>
                            </div>
                            <!-- Mobile Variante: Nur farbige Punkte -->
                            <div class="flex-wrap gap-1 justify-center sm:justify-end mt-1.5 px-0.5 {isWidget ? 'flex' : 'flex md:hidden'}">
                                {#each day.apps.slice(0, 4) as app}
                                    {@const cColor = getCompanyColor(app)}
                                    <span class="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full shadow-sm {cColor ? '' : (app.is_private ? 'bg-rose-500' : 'bg-indigo-500')}" style="{cColor ? `background-color: ${cColor};` : ''}" title={app.description || 'Termin'}></span>
                                {/each}
                                {#if day.apps.length > 4}
                                    <span class="text-[8px] font-bold text-neutral-400">+{day.apps.length - 4}</span>
                                {/if}
                            </div>
                            <!-- Desktop Variante: Echte Terminkarten im Tages-Feld -->
                            <div class="flex-col gap-1.5 mt-2 flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-0.5 pb-0.5 {isWidget ? 'hidden' : 'hidden md:flex'}">
                                {#each day.apps as app}
                                    {@const locationContact = app.expand?.appointment_at?.[0]}
                                    {@const locationText = locationContact ? `${locationContact.company_name || ''} ${locationContact.name_first || ''} ${locationContact.name_last || ''}`.trim() : app.location_address}
                                    {@const cColor = getCompanyColor(app)}
                                    {#if app.description?.includes('[BLOCK]')}
                                        <button type="button" onclick={(e) => { e.stopPropagation(); detailModal?.open(app.id); }} class="w-full text-left block px-2 py-1.5 rounded-lg bg-neutral-100 border border-neutral-200 text-neutral-600 shadow-sm hover:shadow-md transition-all">
                                            <div class="font-bold text-[11px] flex items-center gap-1">🚫 Blockiert</div>
                                            {#if app.description.replace('[BLOCK]', '').trim()}
                                                <div class="text-[10px] truncate opacity-80 mt-0.5">{app.description.replace('[BLOCK]', '').trim()}</div>
                                            {/if}
                                        </button>
                                    {:else}
                                        <button type="button" draggable="true" ondragstart={(e) => handleDragStart(e, app.id)} ondragend={handleDragEnd} onclick={(e) => { e.stopPropagation(); detailModal?.open(app.id); }} class="cursor-grab active:cursor-grabbing w-full text-left block px-2 py-1.5 rounded-lg border border-transparent shadow-sm hover:shadow-md transition-all hover:-translate-y-px {cColor ? 'hover:brightness-95' : (app.is_private ? 'bg-rose-50 hover:border-rose-200 text-rose-800' : 'bg-indigo-50 hover:border-indigo-200 text-indigo-800')} {draggedAppId === app.id ? 'opacity-40' : ''}" style="{cColor ? `background-color: color-mix(in srgb, ${cColor} 10%, white); border-left: 3px solid ${cColor}; color: color-mix(in srgb, ${cColor} 90%, black);` : ''}" title={app.description}>
                                            <div class="flex items-center gap-1 mb-0.5">
                                                <span class="font-bold text-[11px] leading-none">{getDisplayTime(app)}</span>
                                                {#if app.is_private}<span class="text-[9px]">🔒</span>{/if}
                                            </div>
                                            <div class="text-xs font-semibold truncate text-neutral-900">
                                                {#if isSuperAdmin && app.expand?.user}
                                                    <span class="inline-block align-text-bottom text-[9px] font-bold text-neutral-500 bg-neutral-200/50 border border-neutral-200 px-1 py-0.5 rounded mr-1" title="{app.expand.user.name_first} {app.expand.user.name_last}">👤 {app.expand.user.name_first}</span>
                                                {/if}
                                                {app.expand?.client?.[0] ? app.expand.client[0].name_first + ' ' + app.expand.client[0].name_last : 'Kein Klient'}
                                            </div>
                                            {#if app.expand?.client?.[0]?.notes}
                                                <div class="mt-0.5 px-1.5 py-0.5 bg-sky-100/60 border border-sky-200/60 text-sky-800 rounded text-[9px] font-medium leading-tight truncate" title={app.expand.client[0].notes}>
                                                    👤 {app.expand.client[0].notes}
                                                </div>
                                            {/if}
                                            <div class="text-[10px] truncate opacity-80 mt-0.5">{app.description || 'Termin'}</div>
                                            {#if app.notes || app.internal_notes}
                                                <div class="mt-1 px-1.5 py-1 bg-amber-100/60 border border-amber-200/60 text-amber-800 rounded text-[9px] font-medium leading-tight truncate" title={app.notes || app.internal_notes}>
                                                    🔒 {app.notes || app.internal_notes}
                                                </div>
                                            {/if}
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
                        <button onclick={() => onNewAppointment?.(selectedDate as Date)} class="text-indigo-600 hover:text-indigo-800 text-sm sm:text-lg font-bold transition-colors">+</button>
                    </div>
                    
                    {#if selectedDayAppointments.length === 0}
                        <p class="text-[10px] sm:text-xs text-neutral-500 italic mt-2 text-center">Keine Termine</p>
                    {:else}
                        <div class="flex flex-col gap-2 overflow-y-auto custom-scrollbar pr-1 max-h-60 md:max-h-100">
                            {#each selectedDayAppointments as app}
                                    {@const locationContact = app.expand?.appointment_at?.[0]}
                                    {@const locationText = locationContact ? `${locationContact.company_name || ''} ${locationContact.name_first || ''} ${locationContact.name_last || ''}`.trim() : app.location_address}
                                    {#if app.description?.includes('[BLOCK]')}
                                        <button type="button" onclick={(e) => { e.stopPropagation(); detailModal?.open(app.id); }} class="w-full text-left block bg-neutral-100 p-2 sm:p-3 rounded-lg border border-neutral-200 hover:border-neutral-300 hover:shadow-md transition-all group">
                                            <div class="flex justify-between items-start mb-1">
                                                <span class="text-[10px] sm:text-xs font-bold text-neutral-600">Ganztägig</span>
                                            </div>
                                            <p class="text-[10px] sm:text-xs text-neutral-800 font-medium line-clamp-2">🚫 {app.description.replace('[BLOCK]', '').trim() || 'Blockiert'}</p>
                                        </button>
                                    {:else}
                                        <button type="button" onclick={(e) => { e.stopPropagation(); detailModal?.open(app.id); }} class="w-full text-left block bg-white p-2 sm:p-3 rounded-lg border border-neutral-200 hover:border-indigo-300 hover:shadow-md transition-all group">
                                            <div class="flex justify-between items-start mb-1 gap-2">
                                                <span class="text-[10px] sm:text-xs font-bold shrink-0 {app.is_private ? 'text-rose-600' : 'text-indigo-600'}">
                                                    {getDisplayTime(app)}
                                                </span>
                                                <div class="flex items-center gap-1.5 min-w-0 justify-end text-right">
                                                    {#if isSuperAdmin && app.expand?.user}
                                                        <span class="hidden sm:inline-block text-[9px] font-bold text-neutral-500 bg-neutral-100 border border-neutral-200 px-1.5 py-0.5 rounded-md truncate max-w-25" title="{app.expand.user.name_first} {app.expand.user.name_last}">👤 {app.expand.user.name_first}</span>
                                                    {/if}
                                                    {#if app.expand?.client?.[0]}
                                                        <span class="inline-block text-[9px] font-bold text-neutral-600 bg-neutral-100 border border-neutral-200 px-1.5 py-0.5 rounded-md truncate max-w-32.5 sm:max-w-40" title="{app.expand.client[0].name_first} {app.expand.client[0].name_last}">{app.expand.client[0].name_first} {app.expand.client[0].name_last}</span>
                                                    {/if}
                                                </div>
                                            </div>
                                            <p class="text-[10px] sm:text-xs text-neutral-800 font-medium line-clamp-2">
                                                {app.description || 'Ohne Beschreibung'}
                                            </p>
                                            {#if locationText}
                                                {@const mapsQuery = locationContact ? `${locationContact.company_name || ''} ${locationContact.name_first || ''} ${locationContact.name_last || ''}, ${locationContact.street || ''} ${locationContact.housenr || ''}, ${locationContact.zip || ''} ${locationContact.city || ''}` : locationText}
                                                <a href="https://www.google.com/maps/search/?api=1&query={encodeURIComponent(mapsQuery)}" target="_blank" rel="noopener noreferrer" onclick={(e) => e.stopPropagation()} class="mt-1.5 px-2 py-1 bg-blue-100/60 border border-blue-200/60 text-blue-800 rounded text-[10px] font-medium leading-tight line-clamp-2 flex items-center gap-1 hover:bg-blue-100">
                                                    <span class="text-xs">📍</span> <span class="truncate">{locationText}</span>
                                                </a>
                                            {/if}
                                            {#if app.expand?.client?.[0]?.notes}
                                                <div class="mt-1.5 px-2 py-1 bg-sky-100/60 border border-sky-200/60 text-sky-800 rounded text-[10px] font-medium leading-tight line-clamp-2" title={app.expand.client[0].notes}>
                                                    👤 {app.expand.client[0].notes}
                                                </div>
                                            {/if}
                                            {#if app.notes || app.internal_notes}
                                                <div class="mt-1.5 px-2 py-1 bg-amber-100/60 border border-amber-200/60 text-amber-800 rounded text-[10px] font-medium leading-tight line-clamp-2" title={app.notes || app.internal_notes}>
                                                    🔒 {app.notes || app.internal_notes}
                                                </div>
                                            {/if}
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
                                    {@const locationContact = app.expand?.appointment_at?.[0]}
                                    {@const locationText = locationContact ? `${locationContact.company_name || ''} ${locationContact.name_first || ''} ${locationContact.name_last || ''}`.trim() : app.location_address}
                                    {@const cColor = getCompanyColor(app)}
                                    {#if app.description?.includes('[BLOCK]')}
                                        <button type="button" onclick={(e) => { e.stopPropagation(); detailModal?.open(app.id); }} class="text-left absolute left-0.5 right-0.5 sm:left-1 sm:right-1 rounded-md p-1 sm:p-1.5 text-[10px] sm:text-xs overflow-hidden transition-all border shadow-sm hover:shadow-md hover:z-20 bg-neutral-100 border-neutral-200 text-neutral-700" style="top: {getAppTop(app)}px; height: {getAppHeight(app)}px;" title={app.description}>
                                            <div class="font-bold flex items-center gap-1 mb-0.5">🚫 Blockiert</div>
                                            <div class="truncate opacity-75">{app.description.replace('[BLOCK]', '').trim()}</div>
                                        </button>
                                    {:else}
                                        <button type="button" draggable="true" ondragstart={(e) => handleDragStart(e, app.id)} ondragend={handleDragEnd} onclick={(e) => { e.stopPropagation(); detailModal?.open(app.id); }} class="cursor-grab active:cursor-grabbing text-left absolute left-0.5 right-0.5 sm:left-1 sm:right-1 rounded-md p-1 sm:p-1.5 text-[10px] sm:text-xs overflow-hidden transition-all border shadow-sm hover:shadow-md hover:z-20 {cColor ? 'hover:brightness-95' : (app.is_private ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-indigo-50 border-indigo-200 text-indigo-800')} {draggedAppId === app.id ? 'opacity-40 z-50 pointer-events-none' : ''}" style="top: {getAppTop(app)}px; height: {getAppHeight(app)}px; {cColor ? `background-color: color-mix(in srgb, ${cColor} 15%, white); border-color: color-mix(in srgb, ${cColor} 40%, white); color: color-mix(in srgb, ${cColor} 90%, black); border-left: 3px solid ${cColor};` : ''}" title={app.description}>
                                            <div class="font-bold flex items-center gap-1 mb-0.5">
                                                <span>{getDisplayTime(app)}</span>
                                                {#if app.is_private}<span class="text-[8px] sm:text-[10px]">🔒</span>{/if}
                                            </div>
                                            <div class="truncate font-semibold text-neutral-900">
                                                {#if isSuperAdmin && app.expand?.user}
                                                    <span class="inline-block align-text-bottom text-[9px] font-bold text-neutral-500 bg-neutral-200/50 border border-neutral-200 px-1 py-0.5 rounded mr-1" title="{app.expand.user.name_first} {app.expand.user.name_last}">👤 {app.expand.user.name_first}</span>
                                                {/if}
                                                {app.expand?.client?.[0] ? app.expand.client[0].name_first + ' ' + app.expand.client[0].name_last : 'Kein Klient'}
                                            </div>
                                            {#if app.expand?.client?.[0]?.notes}
                                                <div class="mt-0.5 px-1 py-0.5 bg-sky-100/60 border border-sky-200/60 text-sky-800 rounded text-[9px] font-medium leading-tight truncate" title={app.expand.client[0].notes}>
                                                    👤 {app.expand.client[0].notes}
                                                </div>
                                            {/if}
                                            <div class="truncate opacity-75">{app.description || 'Termin'}</div>
                                            {#if app.notes || app.internal_notes}
                                                <div class="mt-0.5 px-1 py-0.5 bg-amber-100/60 border border-amber-200/60 text-amber-800 rounded text-[9px] font-medium leading-tight truncate" title={app.notes || app.internal_notes}>
                                                    🔒 {app.notes || app.internal_notes}
                                                </div>
                                            {/if}
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
        <!-- Wird auf dem Desktop ausgeblendet (md:hidden), da die Termine dort ohnehin im Kalender selbst stehen -->
        <div class="p-6 bg-neutral-50/50 border-t border-neutral-100 flex-1 md:hidden">
            <div class="flex items-center justify-between mb-4">
                <h3 class="text-sm font-bold text-neutral-900 flex items-center gap-2"><span>📅</span> Termine für den {selectedDate.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}</h3>
                <button onclick={() => onNewAppointment?.(selectedDate as Date)} class="text-indigo-600 hover:text-indigo-800 text-sm font-bold transition-colors">+ Hinzufügen</button>
            </div>
            {#if selectedDayAppointments.length === 0}
                <p class="text-sm text-neutral-500 italic">Keine Termine an diesem Tag.</p>
            {:else}
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {#each selectedDayAppointments as app}
                            {@const locationContact = app.expand?.appointment_at?.[0]}
                            {@const locationText = locationContact ? `${locationContact.company_name || ''} ${locationContact.name_first || ''} ${locationContact.name_last || ''}`.trim() : app.location_address}
                            {#if app.description?.includes('[BLOCK]')}
                                <button type="button" onclick={(e) => { e.stopPropagation(); detailModal?.open(app.id); }} class="w-full text-left block bg-neutral-100 p-4 rounded-xl border border-neutral-200 hover:border-neutral-300 hover:shadow-md transition-all group">
                                    <div class="flex justify-between items-start mb-2">
                                        <span class="text-sm font-bold text-neutral-600">Ganztägig blockiert</span>
                                    </div>
                                    <p class="text-sm text-neutral-800 font-medium line-clamp-2">🚫 {app.description.replace('[BLOCK]', '').trim() || 'Urlaub / Blockiert'}</p>
                                </button>
                            {:else}
                                <button type="button" onclick={(e) => { e.stopPropagation(); detailModal?.open(app.id); }} class="w-full text-left block bg-white p-4 rounded-xl border border-neutral-200 hover:border-indigo-300 hover:shadow-md transition-all group">
                                    <div class="flex justify-between items-start mb-2 gap-2">
                                        <span class="text-sm font-bold shrink-0 {app.is_private ? 'text-rose-600' : 'text-indigo-600'}">{getDisplayTime(app)} Uhr</span>
                                        <div class="flex items-center gap-1.5 min-w-0 justify-end text-right">
                                            {#if isSuperAdmin && app.expand?.user}
                                                <span class="hidden sm:inline-block text-[10px] sm:text-xs font-bold text-neutral-500 bg-neutral-100 border border-neutral-200 px-2 py-0.5 rounded-md truncate max-w-37.5" title="{app.expand.user.name_first} {app.expand.user.name_last}">👤 {app.expand.user.name_first}</span>
                                            {/if}
                                            {#if app.expand?.client?.[0]}
                                                <span class="inline-block text-[10px] sm:text-xs font-bold text-neutral-600 bg-neutral-100 border border-neutral-200 px-2 py-0.5 rounded-md truncate max-w-37.5 sm:max-w-48" title="{app.expand.client[0].name_first} {app.expand.client[0].name_last}">{app.expand.client[0].name_first} {app.expand.client[0].name_last}</span>
                                            {/if}
                                        </div>
                                    </div>
                                    <p class="text-sm text-neutral-800 font-medium line-clamp-2">{app.description || 'Keine Beschreibung'}</p>
                                    {#if locationText}
                                        {@const mapsQuery = locationContact ? `${locationContact.company_name || ''} ${locationContact.name_first || ''} ${locationContact.name_last || ''}, ${locationContact.street || ''} ${locationContact.housenr || ''}, ${locationContact.zip || ''} ${locationContact.city || ''}` : locationText}
                                        <a href="https://www.google.com/maps/search/?api=1&query={encodeURIComponent(mapsQuery)}" target="_blank" rel="noopener noreferrer" onclick={(e) => e.stopPropagation()} class="mt-2 px-2.5 py-1.5 bg-blue-100/60 border border-blue-200/60 text-blue-800 rounded-md text-xs font-medium leading-tight line-clamp-2 flex items-center gap-1.5 hover:bg-blue-100">
                                            <span class="text-sm">📍</span> <span class="truncate">{locationText}</span>
                                        </a>
                                    {/if}
                                    {#if app.expand?.client?.[0]?.notes}
                                        <div class="mt-2 px-2.5 py-1.5 bg-sky-100/60 border border-sky-200/60 text-sky-800 rounded-md text-xs font-medium leading-tight line-clamp-2" title={app.expand.client[0].notes}>
                                            👤 {app.expand.client[0].notes}
                                        </div>
                                    {/if}
                                    {#if app.notes || app.internal_notes}
                                        <div class="mt-2 px-2.5 py-1.5 bg-amber-100/60 border border-amber-200/60 text-amber-800 rounded-md text-xs font-medium leading-tight line-clamp-2" title={app.notes || app.internal_notes}>
                                            🔒 {app.notes || app.internal_notes}
                                        </div>
                                    {/if}
                                </button>
                            {/if}
                    {/each}
                </div>
            {/if}
        </div>
    {/if}
</div>

<AppointmentDetailModal bind:this={detailModal} />
<BulkBlockModal bind:this={bulkBlockModal} />