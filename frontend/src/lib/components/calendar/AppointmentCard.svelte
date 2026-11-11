<!-- src/lib/components/calendar/AppointmentCard.svelte -->
<script lang="ts">
    import type { AppointmentWithClient } from "$lib/types/appointment";
    import { pb } from "$lib/services/pocketbase";
    import { rbacService } from "$lib/services/rbacService.svelte";
    import { isAppointmentEnded } from "$lib/services/appointmentStatusHelper";
    import { Clock, MapPin, AlertTriangle, Check, Lock } from "lucide-svelte";
    import { getAppointmentClient, getAppointmentClientName, isAppointmentOwner } from "./calendarUtils";

    let { 
        appointment,
        currentUserId,
        onSelect 
    } = $props<{ 
        appointment: AppointmentWithClient;
        currentUserId?: string;
        onSelect?: (app: AppointmentWithClient) => void;
    }>();

    let clientData = $derived(getAppointmentClient(appointment));
    let clientDisplayName = $derived(getAppointmentClientName(appointment));
    let isOwner = $derived(isAppointmentOwner(appointment, currentUserId || pb.authStore.model?.id));
    let hasClientRel = $derived(
        Boolean(
            (Array.isArray(appointment.client) && appointment.client.length > 0) ||
            (typeof appointment.client === 'string' && appointment.client.trim() !== '' && appointment.client !== '[]')
        )
    );
    let isInternal = $derived(appointment.type === 'internal' || !hasClientRel);
    let isUnresolved = $derived(hasClientRel && !clientData);
    let isCancelled = $derived(appointment.status === 'abgesagt');

    let appointmentDate = $derived(appointment.appointment ? new Date(appointment.appointment) : null);
    let locationText = $derived(
        appointment.expand?.appointment_at?.[0]
            ? `${appointment.expand.appointment_at[0].company_name || ''} ${appointment.expand.appointment_at[0].name_first || ''} ${appointment.expand.appointment_at[0].name_last || ''}`.trim()
            : (appointment.location_address || '')
    );
</script>

<div 
    role="button"
    tabindex="0"
    onclick={() => onSelect?.(appointment)}
    onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect?.(appointment); } }}
    class="p-3.5 rounded-2xl border transition-all text-left w-full group cursor-pointer shadow-xs hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[56px] {
        isCancelled ? 'opacity-60 bg-slate-100/70 dark:bg-slate-900/40 border-rose-200 dark:border-rose-900/60 ' : ''
    }{
        isOwner ? 'border-l-4 border-l-indigo-600 dark:border-l-indigo-500 ' : ''
    }{isUnresolved ? 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700/80 hover:border-amber-500' : (isInternal ? 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-400' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500')}"
>
    <div class="flex items-start justify-between gap-2 mb-2">
        <div class="flex items-center gap-1.5 flex-wrap">
            {#if isCancelled}
                <span class="orga-pill-badge bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                    🚫 Abgesagt
                </span>
            {/if}

            {#if isOwner}
                <span class="orga-pill-badge bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    👤 Eigener
                </span>
            {/if}

            {#if appointmentDate}
                <span class="orga-pill-badge {isInternal ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700' : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800'}">
                    <Clock class="w-3 h-3" />
                    {appointmentDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr
                </span>
            {/if}

            {#if isUnresolved}
                <span class="orga-pill-badge bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
                    <AlertTriangle class="w-3 h-3" />
                    Klient fehlt
                </span>
            {:else if isInternal}
                <span class="orga-pill-badge bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    Intern
                </span>
            {/if}
        </div>

        <div class="flex items-center gap-1.5 shrink-0">
            {#if appointment.google_event_id}
                <span class="text-xs" title="Synchronisiert mit Google Kalender">📅</span>
            {/if}
            {#if appointment.is_private}
                <span class="text-xs text-rose-500" title="Privat"><Lock class="w-3.5 h-3.5" /></span>
            {/if}
            {#if appointment.settled && rbacService.canAccessFinances}
                <span class="orga-pill-badge bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    <Check class="w-3 h-3" /> Abgerechnet
                </span>
            {:else if isAppointmentEnded(appointment)}
                <span class="orga-pill-badge bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    <Check class="w-3 h-3" /> Beendet
                </span>
            {/if}
        </div>
    </div>

    <!-- Header-Zeile: Exakt einmalige Darstellung des Klientennamens -->
    <h3 class="text-base font-semibold leading-snug truncate {isCancelled ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-white'}">
        {#if clientDisplayName}
            {clientDisplayName}
        {:else if isInternal}
            {appointment.title || appointment.description || 'Interner Termin'}
        {:else}
            <span class="text-amber-800 dark:text-amber-300 font-bold">Zuordnung fehlt</span>
        {/if}
    </h3>

    {#if isCancelled && appointment.cancellation_reason}
        <p class="text-xs text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1.5 mt-1 truncate" title="Ausfallgrund: {appointment.cancellation_reason}">
            <AlertTriangle class="w-3.5 h-3.5 shrink-0" />
            <span class="truncate">Ausfallgrund: {appointment.cancellation_reason}</span>
        </p>
    {/if}

    {#if appointment.description && appointment.description !== clientDisplayName}
        <p class="text-xs text-slate-600 dark:text-slate-300 line-clamp-1 mt-1 {isCancelled ? 'line-through opacity-75' : ''}">
            {appointment.description}
        </p>
    {/if}

    {#if locationText}
        <div class="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 truncate mt-2">
            <MapPin class="w-3.5 h-3.5 shrink-0 text-indigo-500" />
            <span class="truncate">{locationText}</span>
        </div>
    {/if}
</div>
