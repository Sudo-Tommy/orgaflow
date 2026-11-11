<script lang="ts">
    import type { AppointmentWithClient } from "$lib/types/appointment";
    import { isCarBooking, isAppointmentOwner, getCarBookingLabel, getDisplayTime, getAppointmentClient, getAppointmentClientName } from "./calendarUtils";

    let { 
        appointment, 
        currentUserId,
        onSelect 
    } = $props<{ 
        appointment: AppointmentWithClient;
        currentUserId?: string;
        onSelect?: (app: AppointmentWithClient) => void;
    }>();

    let isOwner = $derived(isAppointmentOwner(appointment, currentUserId));
    let hasVehicle = $derived(!!appointment.vehicleId || isCarBooking(appointment));
    let vehicleName = $derived(appointment.vehicleName || getCarBookingLabel(appointment));
    let client = $derived(getAppointmentClient(appointment));
    let clientName = $derived(getAppointmentClientName(appointment));
    let hasClientRel = $derived(
        Boolean(
            (Array.isArray(appointment.client) && appointment.client.length > 0) ||
            (typeof appointment.client === 'string' && appointment.client.trim() !== '' && appointment.client !== '[]')
        )
    );
</script>

{#if hasVehicle}
    {#if isOwner}
        <button
            type="button"
            onclick={() => onSelect?.(appointment)}
            class="w-full text-left inline-flex items-center justify-between px-3 py-2 text-xs font-semibold bg-blue-100 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200 border border-blue-200 dark:border-blue-800 rounded-xl min-h-[44px] hover:bg-blue-200/80 dark:hover:bg-blue-900/60 transition-colors shadow-xs cursor-pointer"
        >
            <span class="inline-flex items-center gap-1.5 truncate">
                <span>🚘</span>
                <span class="font-bold truncate">{vehicleName}</span>
                {#if clientName}
                    <span class="text-[11px] opacity-80 truncate">({clientName})</span>
                {/if}
            </span>
            <span class="text-[10px] font-bold shrink-0 ml-2 opacity-75">{getDisplayTime(appointment)}</span>
        </button>
    {:else}
        <!-- Fremde Buchung: Anonym, schraffiert/transparent, ohne Badge-Inhalt -->
        <div class="opacity-40 bg-slate-200 dark:bg-slate-800 pointer-events-none rounded-xl p-2.5 text-xs italic text-slate-700 dark:text-slate-300 min-h-[44px] flex items-center justify-between border border-dashed border-slate-300 dark:border-slate-700">
            <span class="font-medium">Fahrzeug belegt</span>
            <span class="text-[10px] not-italic">{getDisplayTime(appointment)}</span>
        </div>
    {/if}
{:else}
    <button
        type="button"
        onclick={() => onSelect?.(appointment)}
        class="w-full text-left p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-400 bg-white dark:bg-slate-800 transition-all text-xs font-semibold min-h-[44px] flex flex-col justify-center cursor-pointer shadow-xs"
    >
        <div class="flex items-center justify-between w-full">
            <span class="font-bold text-slate-900 dark:text-white truncate">
                {clientName || (appointment.type === 'internal' || !hasClientRel ? (appointment.title || appointment.description || 'Interner Termin') : 'Klient nicht zugeordnet')}
            </span>
            <span class="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold ml-2 shrink-0">
                {getDisplayTime(appointment)}
            </span>
        </div>
        {#if appointment.description && appointment.description !== clientName}
            <span class="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5 font-normal">
                {appointment.description}
            </span>
        {/if}
    </button>
{/if}
