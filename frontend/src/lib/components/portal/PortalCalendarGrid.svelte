<script lang="ts">
    import { ChevronLeft, ChevronRight, Plus } from "lucide-svelte";
    import {
        getAppsForDate,
        computeCalendarDays,
        computeWeekDays
    } from "./calendar/portalCalendarHelpers";
    import PortalCalendarMonthView from "./calendar/PortalCalendarMonthView.svelte";
    import PortalCalendarWeekView from "./calendar/PortalCalendarWeekView.svelte";
    import PortalCalendarDayAgenda from "./calendar/PortalCalendarDayAgenda.svelte";

    let { 
        visibleAppointments = [], 
        onSelectAppointment,
        onRequestAppointment
    } = $props<{
        visibleAppointments: any[];
        onSelectAppointment: (app: any) => void;
        onRequestAppointment?: (date?: Date) => void;
    }>();

    let currentDate = $state(new Date());
    let selectedDate = $state<Date>(new Date());
    let viewMode = $state<'month' | 'week'>('month');

    function getApps(date: Date): any[] {
        return getAppsForDate(visibleAppointments, date);
    }

    let calendarDays = $derived.by(() => {
        return computeCalendarDays(currentDate, getApps);
    });

    let weekDays = $derived.by(() => {
        return computeWeekDays(selectedDate, currentDate, getApps);
    });

    let selectedDayAppointments = $derived.by(() => {
        if (!selectedDate) return [];
        return getApps(selectedDate);
    });

    function nextPeriod() {
        if (viewMode === 'month') {
            currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
        } else {
            const nextW = new Date(selectedDate || currentDate);
            nextW.setDate(nextW.getDate() + 7);
            selectedDate = nextW;
            currentDate = nextW;
        }
    }

    function prevPeriod() {
        if (viewMode === 'month') {
            currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
        } else {
            const prevW = new Date(selectedDate || currentDate);
            prevW.setDate(prevW.getDate() - 7);
            selectedDate = prevW;
            currentDate = prevW;
        }
    }

    function today() {
        const now = new Date();
        currentDate = now;
        selectedDate = now;
    }

    function handleSelectDay(date: Date) {
        selectedDate = date;
        if (date.getMonth() !== currentDate.getMonth()) {
            currentDate = new Date(date.getFullYear(), date.getMonth(), 1);
        }
    }

    let monthName = $derived(
        (viewMode === 'month' ? currentDate : (selectedDate || currentDate)).toLocaleString('de-DE', { month: 'long' })
    );
    let year = $derived(
        (viewMode === 'month' ? currentDate : (selectedDate || currentDate)).getFullYear()
    );
</script>

<div class="orga-card-white overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 flex flex-col">
    <!-- Kalender Toolbar -->
    <div class="p-3 sm:p-4 border-b border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <!-- Titel & Icon -->
        <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-base shadow-2xs">
                🗓️
            </div>
            <div>
                <h2 class="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">Kalenderübersicht</h2>
                <p class="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">Alle geplanten Termine auf einen Blick</p>
            </div>
        </div>

        <!-- Navigation & Aktionen -->
        <div class="flex items-center justify-between md:justify-end gap-2 flex-wrap sm:flex-nowrap">
            <!-- Monat Navigation Pill -->
            <div class="flex items-center bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 rounded-xl p-0.5 shadow-2xs shrink-0">
                <button
                    type="button"
                    onclick={prevPeriod}
                    class="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer active:scale-95 touch-manipulation min-h-[44px] min-w-[44px]"
                    aria-label="Vorheriger Zeitraum"
                    title="Zurück"
                >
                    <ChevronLeft class="w-4.5 h-4.5" />
                </button>

                <span class="w-28 sm:w-32 text-center font-bold text-slate-800 dark:text-slate-100 text-xs sm:text-sm truncate select-none px-1">
                    {monthName} {year}
                </span>

                <button
                    type="button"
                    onclick={nextPeriod}
                    class="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer active:scale-95 touch-manipulation min-h-[44px] min-w-[44px]"
                    aria-label="Nächster Zeitraum"
                    title="Vor"
                >
                    <ChevronRight class="w-4.5 h-4.5" />
                </button>
            </div>

            <!-- Heute Button -->
            <button
                type="button"
                onclick={today}
                class="inline-flex h-9 px-3 items-center justify-center text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60 rounded-xl shadow-2xs transition-colors shrink-0 cursor-pointer active:scale-95 min-h-[44px] touch-manipulation"
                title="Zum heutigen Tag springen"
            >
                Heute
            </button>

            <!-- Ansichtsumschalter (Monat / Woche) -->
            <div class="flex bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-inner shrink-0">
                <button
                    type="button"
                    onclick={() => viewMode = 'month'}
                    class="h-8 px-2.5 sm:px-3 text-xs font-bold rounded-lg transition-all cursor-pointer min-h-[44px] touch-manipulation flex items-center justify-center {viewMode === 'month' ? 'bg-white dark:bg-slate-700 shadow-xs text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}"
                >
                    Monat
                </button>
                <button
                    type="button"
                    onclick={() => viewMode = 'week'}
                    class="h-8 px-2.5 sm:px-3 text-xs font-bold rounded-lg transition-all cursor-pointer min-h-[44px] touch-manipulation flex items-center justify-center {viewMode === 'week' ? 'bg-white dark:bg-slate-700 shadow-xs text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}"
                >
                    Woche
                </button>
            </div>

            {#if onRequestAppointment}
                <button
                    type="button"
                    onclick={() => onRequestAppointment(selectedDate)}
                    class="hidden sm:inline-flex h-9 px-3 items-center gap-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors shrink-0 cursor-pointer active:scale-95 min-h-[44px] touch-manipulation"
                    title="Neuen Termin anfragen"
                >
                    <Plus class="w-4 h-4" />
                    <span>Termin anfragen</span>
                </button>
            {/if}
        </div>
    </div>

    <!-- Kalender-Ansicht: Monat oder Woche -->
    {#if viewMode === 'month'}
        <PortalCalendarMonthView
            {calendarDays}
            {selectedDate}
            onSelectDay={handleSelectDay}
            {onSelectAppointment}
        />
    {:else}
        <PortalCalendarWeekView
            {weekDays}
            {selectedDate}
            onSelectDay={handleSelectDay}
            {onSelectAppointment}
        />
    {/if}

    <!-- Ausgewählte Tagesansicht / Agenda -->
    <PortalCalendarDayAgenda
        {selectedDate}
        {selectedDayAppointments}
        {onSelectAppointment}
        {onRequestAppointment}
    />
</div>
