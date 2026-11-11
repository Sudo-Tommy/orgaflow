<script lang="ts">
    import {
        isBlock,
        getBlockText,
        getDisplayTime,
        getCardTitle,
        getCardSubtitle,
        getCardStateClasses,
        isAppInCarBooking,
        isCarBooking,
        isAppointmentOwner
    } from './calendarUtils';
    import AppointmentStatusBadge from './AppointmentStatusBadge.svelte';
    import { appointmentCompleteService } from '$lib/services/appointmentCompleteService.svelte';
    import { rbacService } from '$lib/services/rbacService.svelte';
    import { startTimeTracking } from '$lib/components/appointmentDetail/appointmentTrackingService';
    import { timeTrackingStore } from '$lib/stores/timeTracking.svelte';
    import { User, MapPin, Car, Play, CheckCircle2, RotateCcw } from 'lucide-svelte';

    interface Props {
        app: any;
        canEdit?: boolean;
        isSuperAdmin?: boolean;
        currentUser?: any;
        carBookings?: any[];
        onOpenDetail: (appId: string) => void;
        onOpenGoogleDetail: (event: any) => void;
        onToggleVisibility: (app: any) => void;
    }

    let {
        app, canEdit = false, isSuperAdmin = false, currentUser = null,
        carBookings = [], onOpenDetail, onOpenGoogleDetail, onToggleVisibility
    }: Props = $props();

    const isOwner = $derived(isAppointmentOwner(app, currentUser?.id));
    const canManageVisibility = $derived(isSuperAdmin || isOwner);
</script>

{#snippet userTag()}
    {#if isOwner && isSuperAdmin}
        <span class="orga-pill-badge text-[9px] text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 px-1.5 py-0.5 truncate max-w-[95%] shrink-0">
            <User class="w-2.5 h-2.5 shrink-0" />
            <span class="truncate">Eigener</span>
        </span>
    {:else if isSuperAdmin && app.expand?.user && app.expand.user.id !== currentUser?.id}
        <span class="orga-pill-badge text-[9px] text-slate-600 dark:text-slate-400 bg-slate-200/70 dark:bg-slate-700/60 border border-slate-300 dark:border-slate-600 px-1.5 py-0.5 truncate max-w-[95%] shrink-0">
            <User class="w-2.5 h-2.5 shrink-0" />
            <span class="truncate">{app.expand.user.name_first}</span>
        </span>
    {/if}
{/snippet}

{#if isBlock(app)}
    <button type="button" onclick={canEdit ? () => onOpenDetail(app.id) : undefined} class="w-full text-left flex items-center bg-rose-50/50 dark:bg-rose-950/40 p-2 sm:p-3 rounded-xl border border-rose-100 dark:border-rose-900/50 hover:border-rose-300 transition-colors gap-3 {getCardStateClasses(app, currentUser?.id, isSuperAdmin)}">
        <div class="w-14 shrink-0 flex flex-col items-center justify-center gap-0.5">
            {@render userTag()}
            <span class="text-base opacity-80">🚫</span>
        </div>
        <div class="flex-1 min-w-0 flex flex-col justify-center">
            <div class="flex justify-between items-center">
                <p class="text-[11px] sm:text-xs text-rose-900 dark:text-rose-200 font-bold truncate pr-2">{getBlockText(app)}</p>
                {#if canManageVisibility}
                    <!-- svelte-ignore a11y_click_events_have_key_events -->
                    <!-- svelte-ignore a11y_no_static_element_interactions -->
                    <span onclick={(e) => { e.stopPropagation(); onToggleVisibility(app); }} class="shrink-0 hover:scale-125 transition-transform text-xs opacity-60 hover:opacity-100 cursor-pointer" title={app.is_visible ? "Für alle sichtbar" : "Nur für Sie & Admins sichtbar"}>{app.is_visible ? '👁️' : '🙈'}</span>
                {/if}
            </div>
            {#if app.notes && app.notes.trim()}
                <div class="px-2 py-0.5 rounded-lg bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200/90 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 text-[10px] flex items-start gap-1 mt-1 leading-snug shadow-2xs" title={app.notes.trim()}>
                    <span class="text-[10px] shrink-0 select-none">📌</span>
                    <span class="line-clamp-2 font-medium break-words">{app.notes.trim()}</span>
                </div>
            {/if}
        </div>
    </button>
{:else if isCarBooking(app) && !isOwner && !isSuperAdmin}
    <div class="w-full p-2.5 sm:p-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-100/60 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 opacity-40 pointer-events-none flex items-center justify-between text-xs italic">
        <span>Fahrzeug belegt</span>
        <span class="text-[10px] not-italic">{getDisplayTime(app)}</span>
    </div>
{:else}
    <div 
        role="button" 
        tabindex="0"
        onclick={canEdit ? () => onOpenDetail(app.id) : undefined} 
        onkeydown={(e) => { if (canEdit && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onOpenDetail(app.id); } }}
        class="{canEdit ? 'hover:border-indigo-300 dark:hover:border-indigo-500 hover:shadow-md cursor-pointer' : 'cursor-default'} w-full text-left flex {isOwner ? 'bg-white dark:bg-slate-800 border-neutral-200 dark:border-slate-700 shadow-sm border-l-4 border-l-indigo-600' : 'bg-neutral-50/70 dark:bg-slate-800/50 border-neutral-100 dark:border-slate-800 opacity-75 hover:opacity-100'} p-2.5 sm:p-3 rounded-xl border transition-all gap-3 {getCardStateClasses(app, currentUser?.id, isSuperAdmin)}"
    >
        <div class="w-14 sm:w-16 shrink-0 flex flex-col items-center justify-center bg-neutral-50 dark:bg-slate-700/60 rounded-lg border border-neutral-100/50 dark:border-slate-600/50 py-1.5 gap-1">
            {@render userTag()}
            <span class="text-[11px] sm:text-xs font-black {app.is_private ? 'text-rose-600 dark:text-rose-400' : (isOwner ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400')} text-center leading-tight">
                {getDisplayTime(app)}
            </span>
        </div>
        <div class="flex-1 min-w-0 flex flex-col justify-center py-0.5">
            <div class="flex items-start justify-between mb-1 gap-2">
                <span class="text-xs font-bold text-neutral-900 dark:text-white truncate {app.status === 'abgesagt' ? 'line-through text-slate-400 dark:text-slate-500' : ''}">{getCardTitle(app, !currentUser?.id, currentUser, isSuperAdmin)}</span>
                <div class="flex items-center gap-1 shrink-0 text-[10px] opacity-70">
                    {#if app.google_event_id || app.is_google}<span title="Mit Google Kalender synchronisiert">📅</span>{/if}
                    {#if app.status === 'abgesagt'}<span class="text-rose-600 font-bold" title="Abgesagt{app.cancellation_reason ? ': ' + app.cancellation_reason : ''}">🚫</span>{/if}
                    {#if canManageVisibility}
                        <!-- svelte-ignore a11y_click_events_have_key_events -->
                        <!-- svelte-ignore a11y_no_static_element_interactions -->
                        <span onclick={(e) => { e.stopPropagation(); onToggleVisibility(app); }} class="hover:scale-125 transition-transform mr-0.5 cursor-pointer" title={app.is_visible ? "Für alle sichtbar (Klick zum Einschränken)" : "Nur für Sie & Admins sichtbar (Klick zum Freigeben)"}>{app.is_visible ? '👁️' : '🙈'}</span>
                    {/if}
                    {#if app.is_private}<span>🔒</span>{/if}
                    {#if app.settled && rbacService.canAccessFinances}<span class="text-emerald-600 font-bold">✓</span>{/if}
                </div>
            </div>
            {#if getCardSubtitle(app, !currentUser?.id, currentUser, isSuperAdmin)}
                <p class="text-[10px] sm:text-[11px] text-neutral-500 dark:text-slate-400 line-clamp-1 leading-snug">{getCardSubtitle(app, !currentUser?.id, currentUser, isSuperAdmin)}</p>
            {/if}
            {#if app.status === 'abgesagt' && app.cancellation_reason}
                <p class="text-[10px] sm:text-[11px] text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1 mt-0.5 truncate" title="Ausfallgrund: {app.cancellation_reason}">
                    <span class="shrink-0">⚠️</span>
                    <span class="truncate">Ausfallgrund: {app.cancellation_reason}</span>
                </p>
            {/if}
            {#if app.notes && app.notes.trim()}
                <div class="px-2 py-1 rounded-lg bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200/90 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 text-[10px] sm:text-[11px] flex items-start gap-1.5 mt-1 leading-snug shadow-2xs pointer-events-auto" title={app.notes.trim()}>
                    <span class="text-xs shrink-0 select-none">📌</span>
                    <span class="line-clamp-2 font-medium break-words">{app.notes.trim()}</span>
                </div>
            {/if}
            <div class="flex items-center gap-1.5 flex-wrap mt-1.5">
                {#if isAppInCarBooking(app, carBookings, currentUser?.id)}
                    <span class="orga-pill-badge text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border border-rose-200/80 dark:border-rose-800/60" title="teilAuto für diesen Termin gebucht">
                        <Car class="w-3 h-3 text-rose-600 dark:text-rose-400 shrink-0" />
                        <span>teilAuto</span>
                    </span>
                {/if}
                {#if app.location_address || app.expand?.appointment_at?.[0]}
                    {@const dest = app.location_address || `${app.expand?.appointment_at?.[0]?.street || ''} ${app.expand?.appointment_at?.[0]?.housenr || ''}, ${app.expand?.appointment_at?.[0]?.city || ''}`}
                    <a 
                        href="https://www.google.com/maps/dir/?api=1&destination={encodeURIComponent(dest)}"
                        target="_blank" 
                        rel="noopener noreferrer"
                        onclick={(e) => e.stopPropagation()}
                        class="orga-pill-action text-blue-700 hover:text-blue-900 dark:text-blue-300 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 truncate max-w-32"
                        title="Routenführung in Google Maps öffnen"
                    >
                        <MapPin class="w-3 h-3 text-blue-600 dark:text-blue-400 shrink-0" />
                        <span>Route</span>
                    </a>
                {/if}
                <AppointmentStatusBadge {app} {onOpenDetail} compact={true} />
                {#if canEdit && !app.settled && app.status !== 'abgesagt'}
                    {#if timeTrackingStore.appointmentId === app.id}
                        <span class="orga-pill-badge text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700">
                            <span class="relative flex h-2 w-2 shrink-0">
                                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            <span>Läuft</span>
                        </span>
                    {:else if app.status !== 'beendet'}
                        <button
                            type="button"
                            onclick={(e) => { e.stopPropagation(); startTimeTracking(app.id, app.time_record || []); }}
                            class="orga-pill-action text-indigo-700 hover:text-indigo-900 dark:text-indigo-300 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/70 border border-indigo-200 dark:border-indigo-800"
                            title="Einsatz jetzt vor Ort starten (Zeiterfassung)"
                        >
                            <Play class="w-3 h-3 fill-indigo-600 dark:fill-indigo-400 text-indigo-600 dark:text-indigo-400 shrink-0" />
                            <span>Start</span>
                        </button>
                    {/if}
                    {#if app.status === 'beendet'}
                        <button
                            type="button"
                            onclick={(e) => { e.stopPropagation(); appointmentCompleteService.reopen(app); }}
                            class="orga-pill-action text-slate-600 hover:text-slate-900 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600"
                            title="Termin wiedereröffnen"
                        >
                            <RotateCcw class="w-3 h-3 text-slate-500 dark:text-slate-400 shrink-0" />
                            <span>Wiedereröffnen</span>
                        </button>
                    {:else}
                        <button
                            type="button"
                            onclick={(e) => { e.stopPropagation(); appointmentCompleteService.open(app); }}
                            class="orga-pill-action text-emerald-700 hover:text-emerald-900 dark:text-emerald-300 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/70 border border-emerald-300 dark:border-emerald-700"
                            title="Diesen Termin abschließen"
                        >
                            <CheckCircle2 class="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span>Beenden</span>
                        </button>
                    {/if}
                {/if}
            </div>
        </div>
    </div>
{/if}
