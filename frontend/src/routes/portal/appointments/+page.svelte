<script lang="ts">
    import { onMount } from "svelte";
    import { pb } from "$lib/services/pocketbase";

    let appointments = $state<any[]>([]); // Wird vom Kalender als Prop genutzt
    let clients = $state<any[]>([]);
    let isLoading = $state(true);
    let errorMsg = $state("");
    let selectedClientId = $state("");
    let selectedAppointment = $state<any>(null);

    let isAdminMode = $state(false);
    let isContactMode = $state(false);

    let uniqueClients = $derived.by(() => {
        if (isAdminMode) return clients;
        if (isContactMode) {
            const map = new Map();
            appointments.forEach(app => {
                if (app.expand?.client) {
                    const c = Array.isArray(app.expand.client) ? app.expand.client[0] : app.expand.client;
                    if (c && !map.has(c.id)) {
                        map.set(c.id, c);
                    }
                }
            });
            // Alphabetisch sortieren
            return Array.from(map.values()).sort((a, b) => (a.name_first || '').localeCompare(b.name_first || ''));
        }
        return [];
    });

    let visibleAppointments = $derived.by(() => {
        if (!selectedClientId) return appointments;
        return appointments.filter(app => {
            if (!app.client) return false;
            if (Array.isArray(app.client)) return app.client.includes(selectedClientId);
            return app.client === selectedClientId;
        });
    });

    // --- Kalender Logik ---
    let currentDate = $state(new Date());
    const weekdays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

    function isSameDay(d1: Date, d2: Date) {
        return d1.getDate() === d2.getDate() && d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear();
    }

    function getAppsForDate(date: Date): any[] {
        return visibleAppointments.filter((app: any) => {
            if (!app.appointment) return false;
            return isSameDay(new Date(app.appointment), date);
        }).sort((a: any, b: any) => new Date(a.appointment).getTime() - new Date(b.appointment).getTime());
    }

    function groupAppointmentsByDay(appointments: any[]) {
        const grouped = appointments.reduce((acc, app) => {
            const dateKey = new Date(app.appointment).toDateString();
            if (!acc[dateKey]) {
                acc[dateKey] = [];
            }
            acc[dateKey].push(app);
            return acc;
        }, {} as Record<string, any[]>);
        return Object.entries(grouped);
    }

    let calendarDays = $derived.by(() => {
        const y = currentDate.getFullYear();
        const m = currentDate.getMonth();
        const days = [];

        const firstDay = new Date(y, m, 1);
        let startDay = firstDay.getDay();
        if (startDay === 0) startDay = 7; // Sonntag ist 0, wir wollen Montag als 1
        startDay -= 1; // Montag ist 0

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
        const remaining = 42 - days.length; // 6 Wochen * 7 Tage
        for (let i = 1; i <= remaining; i++) {
            const d = new Date(y, m + 1, i);
            days.push({ date: d, isCurrentMonth: false, apps: getAppsForDate(d) });
        }
        return days;
    });

    let listAppointments = $derived.by(() => {
        if (!calendarDays.length) return [];
        
        const startDate = calendarDays[0].date;
        const endDate = new Date(calendarDays[calendarDays.length - 1].date);
        endDate.setHours(23, 59, 59, 999);

        return visibleAppointments
            .filter(app => {
                if (!app.appointment) return false;
                const appDate = new Date(app.appointment);
                return appDate >= startDate && appDate <= endDate;
            })
            .sort((a, b) => new Date(a.appointment).getTime() - new Date(b.appointment).getTime());
    });

    const apiBaseUrl = (typeof window !== 'undefined' && !window.location.hostname.includes('ihre-seniorenassistenz.com')) ? `http://${window.location.hostname}:3000/portal` : '/api/emails/portal';

    onMount(() => {
        if (typeof localStorage !== 'undefined') {
            isAdminMode = localStorage.getItem('portal_admin_mode') === 'true';

            // Prüfen, ob es sich um einen Kontakt-Login handelt
            const token = localStorage.getItem('portal_token');
            if (token) {
                try {
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    if (payload.type === 'contact') {
                        isContactMode = true;
                    }
                } catch(e) { /* Ignorieren, wenn Token ungültig */ }
            }
        }
        if (isAdminMode) {
            loadClients();
        }
        loadAppointments();
    });

    async function loadClients() {
        try {
            const token = localStorage.getItem('portal_token') || pb.authStore.token;
            const res = await fetch(`${apiBaseUrl}/clients`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                clients = data.clients;
            }
        } catch (err) {
            console.error("Konnte Klienten nicht laden", err);
        }
    }

    async function loadAppointments() {
        isLoading = true;
        errorMsg = "";
        try {
            const token = localStorage.getItem('portal_token') || pb.authStore.token;
            let url = `${apiBaseUrl}/appointments`;
            
            
            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            
            if (!res.ok) throw new Error(data.error || "Fehler beim Laden der Termine.");
            
            appointments = data.appointments || [];
        } catch (err: any) {
            errorMsg = err.message;
        } finally {
            isLoading = false;
        }
    }

    function getDuration(startStr: string, endStr: string) {
        if (!startStr || !endStr) return "-";
        const diffMs = new Date(endStr).getTime() - new Date(startStr).getTime();
        if (diffMs < 0) return "Fehler";
        const diffMins = Math.round(diffMs / 60000);
        const hours = Math.floor(diffMins / 60);
        const mins = diffMins % 60;
        if (hours === 0) return `${mins} min`;
        return `${hours}h ${mins}m`;
    }

    function nextMonth() {
        currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    }
    function prevMonth() {
        currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    }
    function today() {
        currentDate = new Date();
    }

    let monthName = $derived(currentDate.toLocaleString('de-DE', { month: 'long' }));
    let year = $derived(currentDate.getFullYear());
</script>

<svelte:head><title>Meine Termine - Klienten-Portal</title></svelte:head>

<div class="w-full max-w-4xl mx-auto animate-enter">
    <div class="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
            <h1 class="text-2xl md:text-3xl font-black text-brand-950 tracking-tight mb-2">Ihre Termine</h1>
            <p class="text-neutral-500 font-medium">Hier sehen Sie alle geplanten und kürzlich vergangenen Einsätze im Detail.</p>
        </div>
        
        <!-- Admin Filter Control -->
        {#if isAdminMode || (isContactMode && uniqueClients.length > 1)}
            <div class="bg-indigo-50/50 border border-indigo-200 p-3 rounded-xl flex items-center gap-3 shadow-sm shrink-0 w-full md:w-auto">
                <span class="text-xl hidden sm:block">{isAdminMode ? '🛡️' : '👥'}</span>
                <div class="w-full md:w-auto">
                    <label for="client-filter" class="block text-xs font-bold text-indigo-900 mb-1">Ansicht filtern {isAdminMode ? '(God Mode)' : ''}</label>
                    <select id="client-filter" bind:value={selectedClientId} class="text-sm font-semibold text-indigo-800 bg-white border border-indigo-200 rounded-lg px-3 py-1.5 outline-none cursor-pointer w-full">
                        <option value="">Alle Termine anzeigen</option>
                        {#each uniqueClients as c}
                            <option value={c.id}>{c.name_first} {c.name_last}</option>
                        {/each}
                    </select>
                </div>
            </div>
        {/if}
    </div>

    {#if errorMsg}
        <div class="bg-rose-50 text-rose-700 p-4 rounded-xl mb-6 text-sm font-bold border border-rose-100 flex items-center gap-2">
            <span class="text-lg">⚠️</span> {errorMsg}
        </div>
    {/if}

    <div class="orga-card-white p-4 sm:p-6 animate-enter delay-100">
        <!-- Kalender Toolbar -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div class="flex items-center gap-2">
                <button onclick={today} class="px-3 py-1.5 text-sm font-bold text-neutral-600 bg-white border border-neutral-200 hover:bg-neutral-100 rounded-lg shadow-sm transition-colors shrink-0">Heute</button>
                <div class="flex items-center bg-white border border-neutral-200 rounded-lg p-0.5 shadow-sm shrink-0">
                    <button onclick={prevMonth} class="p-1.5 text-neutral-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors" aria-label="Vorheriger Monat">
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <span class="w-28 text-center font-bold text-neutral-800 text-sm">{monthName} {year}</span>
                    <button onclick={nextMonth} class="p-1.5 text-neutral-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors" aria-label="Nächster Monat">
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" /></svg>
                    </button>
                </div>
            </div>
        </div>

        <!-- Kalender Grid -->
        <div class="orga-calendar-header">
            {#each weekdays as day}
                <div class="py-2.5 text-center text-[10px] sm:text-xs font-bold text-neutral-500 uppercase tracking-wider border-r border-neutral-100 last:border-0">{day}</div>
            {/each}
        </div>

        <div class="orga-calendar-grid">
            {#each calendarDays as day}
                <div class="orga-calendar-day group md:min-h-30 lg:min-h-35 {!day.isCurrentMonth ? 'opacity-50 bg-neutral-50/50' : ''}">
                    <div class="flex justify-end items-start w-full">
                        <span class="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center text-[10px] sm:text-xs font-bold rounded-full {isSameDay(day.date, new Date()) ? 'bg-brand-600 text-white shadow-md' : 'text-neutral-700'}">
                            {day.date.getDate()}
                        </span>
                    </div>
                    
                    <div class="flex-col gap-1.5 mt-2 flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-0.5 pb-0.5 hidden md:flex">
                        {#each day.apps as app}
                            <button type="button" onclick={() => selectedAppointment = app} class="cursor-pointer w-full text-left block px-2 py-1.5 rounded-lg border border-transparent shadow-sm hover:shadow-md transition-all hover:-translate-y-px {app.is_private ? 'bg-rose-50 hover:border-rose-200 text-rose-800' : 'bg-indigo-50 hover:border-indigo-200 text-indigo-800'}" title={app.description}>
                                <div class="flex items-center gap-1 mb-0.5">
                                    <span class="font-bold text-[11px] leading-none">{new Date(app.appointment).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</span>
                                    {#if app.is_private}<span class="text-[9px]">🔒</span>{/if}
                                </div>
                                <div class="text-xs font-semibold truncate text-neutral-900">
                                    {app.expand?.client?.[0] ? app.expand.client[0].name_first + ' ' + app.expand.client[0].name_last : 'Kein Klient'}
                                </div>
                                <div class="text-[10px] truncate opacity-80 mt-0.5">{app.description || 'Termin'}</div>
                            </button>
                        {/each}
                    </div>
                    <!-- Mobile Dots -->
                    <div class="flex md:hidden flex-wrap gap-1 justify-center mt-1.5">
                        {#each day.apps.slice(0, 4) as app}
                            <button onclick={() => selectedAppointment = app} class="w-2 h-2 rounded-full shadow-sm {app.is_private ? 'bg-rose-500' : 'bg-indigo-500'}" title={app.description}></button>
                        {/each}
                    </div>
                </div>
            {/each}
        </div>
    </div>
</div>

<!-- Read-Only Detail Modal -->
{#if selectedAppointment}
    <!-- svelte-ignore a11y_interactive_supports_focus -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onclick={() => selectedAppointment = null} role="dialog" aria-modal="true">
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div class="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col relative overflow-hidden shadow-2xl animate-enter" onclick={(e) => e.stopPropagation()}>
            <div class="bg-neutral-50/50 px-6 py-5 border-b border-neutral-200 flex items-center justify-between shrink-0 sticky top-0 z-20">
                <h2 class="text-xl font-bold text-neutral-900 truncate pr-10">Termindetails</h2>
                <button aria-label="Schließen" onclick={() => selectedAppointment = null} class="absolute top-4 right-4 w-8 h-8 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-full flex items-center justify-center transition-colors"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            {#if selectedAppointment}
                {@const app = selectedAppointment}
                {@const locationContact = app.expand?.appointment_at?.[0]}
                {@const locationText = locationContact ? `${locationContact.company_name || ''} ${locationContact.name_first || ''} ${locationContact.name_last || ''}`.trim() : app.location_address}
                {@const client = (isContactMode || isAdminMode) ? app.expand?.client?.[0] : null}
                {@const user = app.expand?.user}
                <div class="p-6 overflow-y-auto custom-scrollbar">
                <div class="p-5 sm:p-6 border-b border-neutral-100 flex flex-col items-start gap-4 bg-neutral-50/50 rounded-t-2xl">
                    <div class="flex items-start gap-4">
                        <div class="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xl shrink-0 shadow-inner">📅</div>
                        <div class="min-w-0">
                            <h3 class="font-bold text-lg text-neutral-900 leading-tight mb-1.5 truncate" title={app.description || 'Betreuungstermin'}>{app.description || 'Betreuungstermin'}</h3>
                            <div class="flex flex-col gap-1.5">
                                <p class="text-sm font-semibold text-neutral-600 flex items-center gap-2"><span class="shrink-0">🕒</span><span class="truncate">{new Date(app.appointment).toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })} um {new Date(app.appointment).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr</span></p>
                                {#if locationText}<p class="text-sm font-semibold text-neutral-600 flex items-start gap-2"><span class="shrink-0">📍</span><span title={locationText}>{locationText}</span></p>{/if}
                            </div>
                        </div>
                    </div>
                    {#if user}<div class="bg-white px-3 py-2 rounded-xl border border-neutral-200 shadow-sm flex items-center gap-3 shrink-0 self-start"><div class="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 font-bold flex items-center justify-center text-xs">{(user.name_first?.charAt(0) || '')}</div><div><p class="text-[10px] uppercase tracking-wider font-bold text-neutral-400">Assistent/in</p><p class="text-sm font-bold text-neutral-800">{user.name_first} {user.name_last}</p>{#if client}<p class="text-xs text-indigo-700 font-semibold mt-1 pt-1 border-t border-neutral-100">für {client.name_first} {client.name_last}</p>{/if}</div></div>{/if}
                </div>
                <div class="p-5 sm:p-6 bg-white rounded-b-2xl">
                    <div class="flex flex-col gap-8">
                        <div class="space-y-6">{#if app.expand?.tasks && app.expand.tasks.length > 0}<div><h4 class="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 flex items-center gap-1.5"><span>📋</span> Geplante/Erbrachte Leistungen</h4><ul class="space-y-2">{#each app.expand.tasks as task}<li class="flex items-start gap-2 text-sm text-neutral-700 bg-neutral-50 px-3 py-2 rounded-lg border border-neutral-100"><span class="text-emerald-500 mt-0.5 font-bold">✓</span><span class="font-medium">{task.title}</span></li>{/each}</ul></div>{/if}{#if !(app.expand?.tasks?.length > 0) && !app.report}<p class="text-sm text-neutral-400 italic bg-neutral-50 p-4 rounded-xl border border-neutral-100 text-center">Noch keine detaillierten Dokumentationen vorhanden.</p>{/if}</div>
                        <div class="space-y-6">{#if app.report}<div><h4 class="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 flex items-center gap-1.5"><span>📝</span> Besuchsbericht</h4><div class="bg-amber-50/50 border border-amber-100 p-4 rounded-xl text-sm text-neutral-800 whitespace-pre-wrap leading-relaxed shadow-sm">{app.report}</div></div>{/if}</div>
                    </div>
                </div>
            </div>
            {/if}
        </div>
    </div>
{/if}