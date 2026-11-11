<script lang="ts">
    import { isCarBooking, getCarBookingLabel, isAppointmentOwner, sortAppointmentsPrioritizingOwner } from './calendarUtils';
    import CalendarCarBeam from './CalendarCarBeam.svelte';
    import CalendarDayItem from './CalendarDayItem.svelte';

    interface Props {
        selectedDate: Date;
        appointments: any[];
        isWidget?: boolean;
        canEdit?: boolean;
        isSuperAdmin?: boolean;
        currentUser?: any;
        onNewAppointment?: (date: Date) => void;
        onOpenDetail: (appId: string) => void;
        onOpenGoogleDetail: (event: any) => void;
        onToggleVisibility: (app: any) => void;
    }

    let {
        selectedDate, appointments, isWidget = false, canEdit = false, isSuperAdmin = false,
        currentUser = null, onNewAppointment, onOpenDetail, onOpenGoogleDetail, onToggleVisibility
    }: Props = $props();

    let carBookings = $derived(appointments.filter((a: any) => isCarBooking(a)));
    let regularAppointments = $derived(sortAppointmentsPrioritizingOwner(appointments.filter((a: any) => !isCarBooking(a)), currentUser?.id));
    let isCarOwner = $derived(carBookings.some(c => isAppointmentOwner(c, currentUser?.id)) || isSuperAdmin);
</script>

<div class="{isWidget ? 'w-full xl:w-80 2xl:w-96 shrink-0 bg-neutral-50/50 dark:bg-slate-900/50 p-3 sm:p-4 flex flex-col border-t xl:border-t-0 xl:border-l border-neutral-200/60 dark:border-slate-800' : 'bg-neutral-50/50 dark:bg-slate-900/50 border-t border-neutral-200 dark:border-slate-800 flex-1 flex flex-col h-full relative'}">
    <div class="flex items-center justify-between mb-3 border-b border-neutral-200/60 dark:border-slate-800 pb-2 {isWidget ? '' : 'sticky top-0 bg-neutral-50/95 dark:bg-slate-900/95 backdrop-blur-md z-10 py-3 px-4 sm:px-6'}">
        <h3 class="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
            <span>📅</span>
            <span>{selectedDate.toLocaleDateString('de-DE', { weekday: isWidget ? undefined : 'short', day: '2-digit', month: 'long' })}</span>
        </h3>
        {#if canEdit}
            <button type="button" onclick={() => onNewAppointment?.(selectedDate)} class="{isWidget ? 'text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 text-sm sm:text-lg font-bold' : 'w-7 h-7 sm:w-8 sm:h-8 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center justify-center font-bold shadow-sm cursor-pointer'}" title="Neuer Termin">+</button>
        {/if}
    </div>

    {#if appointments.length === 0}
        <div class="flex flex-col items-center justify-center py-6 opacity-60">
            <span class="text-2xl mb-1">{isWidget ? '📌' : '🍃'}</span>
            <p class="text-xs text-neutral-500 dark:text-slate-400 font-medium">Keine Termine</p>
        </div>
    {:else}
        <div class="flex flex-row gap-2.5 sm:gap-3.5 pr-1 {isWidget ? '' : 'p-4 sm:p-6'}">
            {#if carBookings.length > 0}
                <CalendarCarBeam {carBookings} {currentUser} {isSuperAdmin} {onOpenDetail} {onOpenGoogleDetail} />
            {/if}

            <div class="flex-1 flex flex-col gap-2 min-w-0">
                {#if regularAppointments.length === 0}
                    <div class="flex flex-col items-center justify-center py-8 px-4 rounded-xl border border-dashed {isCarOwner ? 'border-rose-200 dark:border-rose-900/50 bg-rose-50/40 dark:bg-rose-950/20' : 'border-neutral-200 dark:border-slate-800 bg-neutral-100/40 dark:bg-slate-800/30'} text-center my-auto">
                        <span class="text-2xl mb-1">🚗</span>
                        <p class="text-xs font-bold {isCarOwner ? 'text-rose-900 dark:text-rose-200' : 'text-neutral-700 dark:text-neutral-300'}">{isCarOwner ? `Fahrzeug reserviert (${getCarBookingLabel(carBookings[0])})` : 'Fahrzeug belegt'}</p>
                        <p class="text-[11px] {isCarOwner ? 'text-rose-600 dark:text-rose-400' : 'text-neutral-500 dark:text-neutral-400'} mt-0.5">{isCarOwner ? 'Keine weiteren Termine für diesen Tag erfasst.' : 'Keine eigenen Termine für diesen Tag erfasst.'}</p>
                        {#if canEdit}
                            <button type="button" onclick={() => onNewAppointment?.(selectedDate)} class="mt-2 text-xs font-bold {isCarOwner ? 'text-rose-700 dark:text-rose-300' : 'text-indigo-600 dark:text-indigo-400'} hover:underline cursor-pointer">
                                + Termin für diesen Tag erfassen
                            </button>
                        {/if}
                    </div>
                {:else}
                    {#each regularAppointments as app (app.id || app.appointment)}
                        <CalendarDayItem
                            {app}
                            {canEdit}
                            {isSuperAdmin}
                            {currentUser}
                            {carBookings}
                            {onOpenDetail}
                            {onOpenGoogleDetail}
                            {onToggleVisibility}
                        />
                    {/each}
                {/if}
            </div>
        </div>
    {/if}
</div>
