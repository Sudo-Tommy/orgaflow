<script lang="ts">
    import { onMount } from 'svelte';
    import { caregiverPortal } from '$lib/services/caregiverPortalService.svelte';
    import { orgaStore } from '$lib/stores/orgaStore.svelte';
    import { toastStore } from '$lib/services/toastService.svelte';
    import { googleCalendarService, type GoogleCalendarStatus } from '$lib/services/googleCalendarService';
    import { isSameDay, matchesAppointmentDate } from '$lib/components/calendar/calendarUtils';
    import { ChevronLeft, ChevronRight, Calendar as CalIcon, RefreshCw, Clock, MapPin, ExternalLink } from 'lucide-svelte';
    import type { AppointmentRecord } from '$lib/types/orgaTypes';

    interface Props { onOpenModal: (appt: AppointmentRecord) => void; }
    let { onOpenModal }: Props = $props();

    const currentUserId = $derived(caregiverPortal.currentUserId);
    const assignedIds = $derived(caregiverPortal.assignedClientIds);

    let viewMode = $state<'month' | 'week'>('month'), currentDate = $state(new Date()), selectedDate = $state(new Date());
    let googleStatus = $state<GoogleCalendarStatus | null>(null), googleEvents = $state<any[]>([]), isLoadingGoogle = $state(false);
    const weekDays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

    const myAppointments = $derived.by(() => {
        if (!currentUserId) return [];
        return ((orgaStore.appointments.data || []) as AppointmentRecord[]).filter(a => {
            if (a.is_private || a.status === 'abgesagt' || String(a.description || '').toUpperCase().includes('[BLOCK]')) return false;
            const users = Array.isArray(a.user) ? a.user : (a.user ? [a.user] : []);
            if (a.assigned_to === currentUserId || users.includes(currentUserId)) return true;
            const raw = a.client as any;
            if (Array.isArray(raw)) return raw.some(c => assignedIds.has(typeof c === 'string' ? c : c?.id));
            return typeof raw === 'string' ? assignedIds.has(raw) : (raw?.id ? assignedIds.has(raw.id) : false);
        });
    });

    async function loadGoogleData() {
        if (!currentUserId) return;
        isLoadingGoogle = true;
        try {
            googleStatus = await googleCalendarService.getStatus();
            if (googleStatus.connected) {
                const s = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1).toISOString();
                const e = new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 0).toISOString();
                googleEvents = await googleCalendarService.getExternalEvents(s, e, currentUserId);
            } else { googleEvents = []; }
        } catch { googleEvents = []; }
        finally { isLoadingGoogle = false; }
    }

    onMount(() => { loadGoogleData(); });

    async function handleConnectGoogle() {
        try {
            const res = await googleCalendarService.openOAuthPopup();
            if (res.success) {
                toastStore.success('Google Kalender erfolgreich verknüpft!');
                await loadGoogleData();
            }
        } catch (e: any) { toastStore.error(e.message || 'Google-Verbindung abgebrochen'); }
    }

    function getEventsForDate(d: Date) {
        const orga = myAppointments.filter(a => matchesAppointmentDate(a, d));
        const goog = googleEvents.filter(g => g.appointment && isSameDay(new Date(g.appointment), d));
        return { orga, goog, total: orga.length + goog.length };
    }

    const calendarGrid = $derived.by(() => {
        const y = currentDate.getFullYear(), m = currentDate.getMonth(), days = [];
        if (viewMode === 'month') {
            const first = (new Date(y, m, 1).getDay() + 6) % 7, prevLast = new Date(y, m, 0).getDate();
            for (let i = first - 1; i >= 0; i--) { const d = new Date(y, m - 1, prevLast - i); days.push({ date: d, isCurrentMonth: false, ...getEventsForDate(d) }); }
            const daysInMonth = new Date(y, m + 1, 0).getDate();
            for (let i = 1; i <= daysInMonth; i++) { const d = new Date(y, m, i); days.push({ date: d, isCurrentMonth: true, ...getEventsForDate(d) }); }
            const rem = (7 - (days.length % 7)) % 7;
            for (let i = 1; i <= rem; i++) { const d = new Date(y, m + 1, i); days.push({ date: d, isCurrentMonth: false, ...getEventsForDate(d) }); }
        } else {
            const curr = new Date(currentDate), monday = new Date(curr);
            monday.setDate(curr.getDate() - ((curr.getDay() + 6) % 7));
            for (let i = 0; i < 7; i++) { const d = new Date(monday); d.setDate(monday.getDate() + i); days.push({ date: d, isCurrentMonth: d.getMonth() === m, ...getEventsForDate(d) }); }
        }
        return days;
    });

    const selectedDayEvents = $derived(getEventsForDate(selectedDate));
    const titleLabel = $derived(currentDate.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' }));

    function navigate(delta: number) {
        const next = new Date(currentDate);
        if (viewMode === 'month') next.setMonth(next.getMonth() + delta);
        else next.setDate(next.getDate() + (delta * 7));
        currentDate = next;
        loadGoogleData();
    }
</script>

<div class="space-y-4">
    <!-- Google OAuth Status Banner -->
    <div class="p-3.5 sm:p-4 rounded-3xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 {googleStatus?.connected ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800' : 'bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800'}">
        <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 {googleStatus?.connected ? 'bg-emerald-500 text-white' : 'bg-indigo-600 text-white'}">
                <CalIcon class="w-5 h-5" />
            </div>
            <div>
                <p class="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>{googleStatus?.connected ? 'Google Kalender verknüpft' : 'Eigener Google Kalender'}</span>
                    {#if googleStatus?.connected}<span class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-200/80 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200 font-black">Aktiv</span>{/if}
                </p>
                <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {googleStatus?.connected ? googleStatus.googleEmail : 'Verbinde deinen Google-Account, um Dienst- und Privattermine abzugleichen.'}
                </p>
            </div>
        </div>
        <div class="flex items-center gap-2 self-end sm:self-auto">
            {#if googleStatus?.connected}
                <button type="button" onclick={loadGoogleData} disabled={isLoadingGoogle} class="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50">
                    <RefreshCw class="w-3.5 h-3.5 {isLoadingGoogle ? 'animate-spin' : ''}" />
                    <span class="hidden sm:inline">Aktualisieren</span>
                </button>
            {:else}
                <button type="button" onclick={handleConnectGoogle} class="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs cursor-pointer">Mit Google verbinden</button>
            {/if}
        </div>
    </div>

    <!-- Kalenderleiste mit Monats-/Wochenumschalter & Navigation -->
    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xs space-y-4">
        <div class="flex items-center justify-between flex-wrap gap-2">
            <div class="flex items-center gap-2">
                <h3 class="text-base sm:text-lg font-black text-slate-900 dark:text-white capitalize">{titleLabel}</h3>
                <button type="button" onclick={() => { currentDate = new Date(); selectedDate = new Date(); }} class="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 cursor-pointer">Heute</button>
            </div>
            <div class="flex items-center gap-2">
                <div class="bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl flex text-xs font-bold">
                    <button type="button" class="px-2.5 py-1 rounded-xl transition-all cursor-pointer {viewMode === 'month' ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs' : 'text-slate-500'}" onclick={() => viewMode = 'month'}>Monat</button>
                    <button type="button" class="px-2.5 py-1 rounded-xl transition-all cursor-pointer {viewMode === 'week' ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs' : 'text-slate-500'}" onclick={() => viewMode = 'week'}>Woche</button>
                </div>
                <div class="flex items-center gap-1">
                    <button type="button" onclick={() => navigate(-1)} class="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"><ChevronLeft class="w-4 h-4" /></button>
                    <button type="button" onclick={() => navigate(1)} class="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"><ChevronRight class="w-4 h-4" /></button>
                </div>
            </div>
        </div>

        <div class="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-slate-400">
            {#each weekDays as d}<div>{d}</div>{/each}
        </div>

        <div class="grid grid-cols-7 gap-1">
            {#each calendarGrid as cell}
                {@const isToday = isSameDay(cell.date, new Date())}
                {@const isSelected = isSameDay(cell.date, selectedDate)}
                <button type="button" onclick={() => selectedDate = cell.date} class="min-h-14 sm:min-h-16 p-1 rounded-2xl flex flex-col items-center justify-between transition-all cursor-pointer border {isSelected ? 'border-indigo-600 ring-2 ring-indigo-500/30 bg-indigo-50/40 dark:bg-indigo-950/30' : (isToday ? 'border-amber-400 bg-amber-50/20 dark:bg-amber-950/10' : 'border-slate-100 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/40')} {!cell.isCurrentMonth ? 'opacity-40' : ''}">
                    <span class="text-xs font-bold {isToday ? 'w-5 h-5 rounded-full bg-amber-400 text-slate-900 flex items-center justify-center font-black' : (cell.isCurrentMonth ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400')}">{cell.date.getDate()}</span>
                    <div class="flex items-center gap-1 flex-wrap justify-center py-0.5">
                        {#each cell.orga.slice(0, 2) as o}<span class="w-1.5 h-1.5 rounded-full {o.status === 'Erledigt' ? 'bg-emerald-500' : 'bg-indigo-600'}"></span>{/each}
                        {#if cell.orga.length > 2}<span class="text-[9px] font-bold text-slate-400">+{cell.orga.length - 2}</span>{/if}
                        {#if cell.goog.length > 0}<span class="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>{/if}
                    </div>
                </button>
            {/each}
        </div>
    </div>

    <!-- Terminliste des ausgewählten Tages (Zero-Inner-Scroll) -->
    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xs space-y-3">
        <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <span>Termine am {selectedDate.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long' })}</span>
            <span class="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">{selectedDayEvents.total} Einträge</span>
        </h4>

        {#if selectedDayEvents.total === 0}
            <p class="text-xs text-slate-400 py-3 text-center">Keine Einsätze oder Google-Termine für diesen Tag hinterlegt.</p>
        {:else}
            <div class="space-y-2.5">
                {#each selectedDayEvents.orga as appt}
                    <button type="button" onclick={() => onOpenModal(appt)} class="w-full text-left p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 bg-slate-50/50 dark:bg-slate-800/30 transition-all flex items-start justify-between gap-3 cursor-pointer group">
                        <div class="space-y-1 min-w-0">
                            <div class="flex items-center gap-2 flex-wrap">
                                <span class="text-xs font-black text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">{appt.title || 'Betreuungseinsatz'}</span>
                                <span class="text-[10px] font-bold px-2 py-0.5 rounded-full {appt.status === 'Erledigt' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'}">{appt.status || 'Offen'}</span>
                            </div>
                            <p class="text-xs text-slate-600 dark:text-slate-300">{appt.description || 'Pflege & Assistenz'}</p>
                            <div class="flex items-center gap-3 text-[11px] text-slate-400 pt-0.5">
                                <span class="flex items-center gap-1"><Clock class="w-3 h-3" />{(appt.appointment || '').slice(11, 16) || 'Ganztägig'}</span>
                                {#if appt.location_address}<span class="flex items-center gap-1 truncate"><MapPin class="w-3 h-3 shrink-0" />{appt.location_address}</span>{/if}
                            </div>
                        </div>
                        <span class="text-xs font-bold text-indigo-600 dark:text-indigo-400 shrink-0 mt-1">Dokumentieren →</span>
                    </button>
                {/each}

                {#each selectedDayEvents.goog as g}
                    <div class="p-3.5 rounded-2xl border border-cyan-100 dark:border-cyan-900/40 bg-cyan-50/30 dark:bg-cyan-950/20 flex items-start justify-between gap-3">
                        <div class="space-y-1 min-w-0">
                            <div class="flex items-center gap-2">
                                <span class="text-xs font-bold text-cyan-900 dark:text-cyan-200">🗓️ {g.title || 'Google Termin'}</span>
                                <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-900 text-cyan-800 dark:text-cyan-300">Google Kalender</span>
                            </div>
                            {#if g.notes}<p class="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-line">{g.notes}</p>{/if}
                            <div class="flex items-center gap-3 text-[11px] text-slate-400 pt-0.5">
                                <span class="flex items-center gap-1"><Clock class="w-3 h-3" />{(g.appointment || '').slice(11, 16) || 'Ganztägig'}</span>
                                {#if g.location_address}<span class="flex items-center gap-1 truncate"><MapPin class="w-3 h-3 shrink-0" />{g.location_address}</span>{/if}
                            </div>
                        </div>
                        {#if g.htmlLink}<a href={g.htmlLink} target="_blank" rel="noopener noreferrer" class="p-1.5 rounded-xl hover:bg-cyan-100 dark:hover:bg-cyan-900/60 text-cyan-700 dark:text-cyan-300 transition-colors shrink-0"><ExternalLink class="w-4 h-4" /></a>{/if}
                    </div>
                {/each}
            </div>
        {/if}
    </div>
</div>
