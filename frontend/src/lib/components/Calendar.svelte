<script lang="ts">
    import { onMount } from 'svelte';
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import CalendarHeader from './calendar/CalendarHeader.svelte';
    import CalendarFilterBar from './calendar/CalendarFilterBar.svelte';
    import CalendarMonthView from './calendar/CalendarMonthView.svelte';
    import CalendarWeekView from './calendar/CalendarWeekView.svelte';
    import CalendarDayList from './calendar/CalendarDayList.svelte';
    import CalendarModals from './calendar/CalendarModals.svelte';
    import { createCalendarState } from './calendar/calendarState.svelte';

    let { appointments = [], clients = [], onNewAppointment, isWidget = false } = $props<{
        appointments: any[]; clients: any[]; isWidget?: boolean; onNewAppointment?: (date: Date) => void;
    }>();

    const cal = createCalendarState(() => appointments);
    onMount(() => cal.init());
    let modals: ReturnType<typeof CalendarModals>;
    export function openGoogleModal() { modals?.openGoogle(); }
    export function openDetail(id: string) { modals?.openDetail(id); }
</script>

{#snippet dayList(widgetMode: boolean)}
    <CalendarDayList
        selectedDate={cal.selectedDate!}
        appointments={cal.selectedDayAppointments}
        isWidget={widgetMode}
        canEdit={cal.canEdit}
        isSuperAdmin={cal.isSuperAdmin}
        currentUser={cal.currentUser}
        onNewAppointment={cal.canEdit ? onNewAppointment : undefined}
        onOpenDetail={(id) => modals?.openDetail(id)}
        onOpenGoogleDetail={(evt) => modals?.openGoogleDetail(evt)}
        onToggleVisibility={cal.toggleVisibility}
    />
{/snippet}

<div class="orga-calendar-wrapper {isWidget ? 'border-0 shadow-none rounded-none' : ''} {cal.isUpdating ? 'opacity-50 pointer-events-none transition-opacity' : ''}">
    <CalendarHeader
        currentDate={cal.currentDate} viewMode={cal.viewMode} isSubmitting={cal.isSubmitting} {isWidget}
        canEdit={cal.canEdit} showFilterBar={cal.showFilterBar} hasActiveFilters={cal.hasActiveFilters}
        onPrev={cal.prev} onNext={cal.next} onToday={cal.today} onViewModeChange={(m) => cal.viewMode = m}
        onNewAppointment={cal.canEdit && onNewAppointment ? () => onNewAppointment(cal.selectedDate || cal.currentDate) : undefined}
        onSync={cal.syncCalendar} onExport={cal.exportIcal} onPrint={cal.printCalendar}
        onToggleFilters={() => cal.showFilterBar = !cal.showFilterBar}
        onOpenSettings={cal.canEdit ? () => modals?.openGoogle() : undefined}
        onBulkBlock={cal.isSuperAdmin ? () => modals?.openBulkBlock() : undefined}
        onBulkVisibility={cal.isSuperAdmin ? () => modals?.openBulkVisibility(cal.filteredAppointments) : undefined}
    />

    <CalendarFilterBar
        show={cal.showFilterBar} {clients} users={cal.users} isSuperAdmin={cal.isSuperAdmin} canEdit={cal.canEdit}
        currentUser={cal.currentUser} googleStatus={cal.googleStatus} googleEventsCount={cal.filteredAppointments.filter((a: any) => Boolean(a.google_event_id)).length}
        hasActiveFilters={cal.hasActiveFilters} onReset={cal.resetFilters}
        bind:selectedClientId={cal.selectedClientId} bind:selectedUserId={cal.selectedUserId} bind:showGoogleEvents={cal.showGoogleEvents}
    />

    {#if cal.viewMode === 'month'}
        <div class="{isWidget ? 'flex flex-col xl:flex-row' : 'flex flex-col'} w-full">
            <div class="flex-1 min-w-0 {isWidget ? 'border-b xl:border-b-0 xl:border-r border-neutral-100 dark:border-slate-800' : 'border-transparent'}">
                <CalendarMonthView
                    calendarDays={cal.calendarDays} selectedDate={cal.selectedDate} now={cal.now}
                    {isWidget} canEdit={cal.canEdit} isSuperAdmin={cal.isSuperAdmin} currentUser={cal.currentUser}
                    companies={orgaStore.company?.data || []} draggedAppId={cal.draggedAppId} isDragging={cal.isDragging}
                    onSelectDay={(d) => cal.selectedDate = d} onNewAppointment={cal.canEdit ? onNewAppointment : undefined}
                    onOpenDetail={(id) => modals?.openDetail(id)} onOpenGoogleDetail={(evt) => modals?.openGoogleDetail(evt)}
                    onToggleVisibility={cal.toggleVisibility} onDragStart={cal.handleDragStart} onDragEnd={cal.handleDragEnd}
                    onDrop={(e, d) => { e.preventDefault(); cal.handleDrop(d); }}
                />
            </div>
            {#if isWidget && cal.selectedDate}{@render dayList(true)}{/if}
        </div>
    {:else}
        <CalendarWeekView
            calendarDays={cal.calendarDays} selectedDate={cal.selectedDate} now={cal.now} canEdit={cal.canEdit}
            isSuperAdmin={cal.isSuperAdmin} currentUser={cal.currentUser} companies={orgaStore.company?.data || []}
            draggedAppId={cal.draggedAppId} isDragging={cal.isDragging} onSelectDay={(d) => cal.selectedDate = d}
            onOpenDetail={(id) => modals?.openDetail(id)} onOpenGoogleDetail={(evt) => modals?.openGoogleDetail(evt)}
            onToggleVisibility={cal.toggleVisibility} onDragStart={cal.handleDragStart} onDragEnd={cal.handleDragEnd}
            onDrop={(e, d) => {
                const r = (e.currentTarget as HTMLElement).getBoundingClientRect(), total = Math.max(0, e.clientY - r.top) / 64;
                const h = Math.floor(total); cal.handleDrop(d, h, Math.round(Math.round((total - h) * 60) / 15) * 15);
            }}
        />
    {/if}

    {#if cal.selectedDate && !isWidget}{@render dayList(false)}{/if}
</div>

<CalendarModals bind:this={modals} />
