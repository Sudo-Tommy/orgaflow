<script lang="ts">
    import type { AppointmentWithClient } from "$lib/types/appointment";
    import AppointmentCard from "./AppointmentCard.svelte";
    import CalendarTile from "./CalendarTile.svelte";
    import { sortAppointmentsPrioritizingOwner } from "./calendarUtils";

    let {
        appointments = [],
        currentUserId,
        viewFormat = 'card',
        onSelectAppointment
    } = $props<{
        appointments: AppointmentWithClient[];
        currentUserId?: string;
        viewFormat?: 'card' | 'tile';
        onSelectAppointment?: (app: AppointmentWithClient) => void;
    }>();

    let sortedAppointments = $derived(
        sortAppointmentsPrioritizingOwner([...appointments], currentUserId)
    );
</script>

<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
    {#each sortedAppointments as appointment (appointment.id)}
        {#if viewFormat === 'tile'}
            <CalendarTile
                {appointment}
                {currentUserId}
                onSelect={onSelectAppointment}
            />
        {:else}
            <AppointmentCard
                {appointment}
                {currentUserId}
                onSelect={onSelectAppointment}
            />
        {/if}
    {:else}
        <div class="col-span-full text-center py-8 text-neutral-400 dark:text-slate-500 italic text-sm">
            Keine Termine im ausgewählten Zeitraum vorhanden.
        </div>
    {/each}
</div>
