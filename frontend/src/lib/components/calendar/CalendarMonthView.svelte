<script lang="ts">
    import {
        WEEKDAYS,
        isSameDay,
        isBlock,
        isCarBooking,
        getCarBookingLabel,
        getBlockText,
        getDisplayTime,
        getCardTitle,
        getCardSubtitle,
        getCardStateClasses,
        getCompanyColor,
        isAppointmentOwner,
        getAppointmentTimeRecords
    } from './calendarUtils';
    import { isAppointmentEnded } from '$lib/services/appointmentStatusHelper';
    import { rbacService } from '$lib/services/rbacService.svelte';

    interface Props {
        calendarDays: any[];
        selectedDate: Date | null;
        now: Date;
        isWidget?: boolean;
        canEdit?: boolean;
        isSuperAdmin?: boolean;
        currentUser?: any;
        companies?: any[];
        draggedAppId?: string | null;
        isDragging?: boolean;
        onSelectDay: (d: Date) => void;
        onNewAppointment?: (d: Date) => void;
        onOpenDetail: (appId: string) => void;
        onOpenGoogleDetail: (event: any) => void;
        onToggleVisibility: (app: any) => void;
        onDragStart: (e: DragEvent, appId: string) => void;
        onDragEnd: () => void;
        onDrop: (e: DragEvent, d: Date) => void;
    }

    let {
        calendarDays,
        selectedDate,
        now,
        isWidget = false,
        canEdit = false,
        isSuperAdmin = false,
        currentUser = null,
        companies = [],
        draggedAppId = null,
        isDragging = false,
        onSelectDay,
        onNewAppointment,
        onOpenDetail,
        onOpenGoogleDetail: _onOpenGoogleDetail,
        onToggleVisibility,
        onDragStart,
        onDragEnd,
        onDrop
    }: Props = $props();
</script>

{#snippet statusIcons(app: any)}
    {@const canManageVisibility = isSuperAdmin || isAppointmentOwner(app, currentUser?.id)}
    <div class="flex items-center gap-0.75 opacity-60 hover:opacity-100 shrink-0 text-[10px] transition-opacity cursor-help">
        {#if app.status === 'abgesagt'}
            <span class="text-rose-600 font-bold" title="Abgesagt{app.cancellation_reason ? ': ' + app.cancellation_reason : ''}">🚫</span>
        {/if}
        {#if canManageVisibility}
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <span onclick={(e) => { e.stopPropagation(); onToggleVisibility(app); }} class="hover:scale-125 transition-transform cursor-pointer mr-0.5" title={app.is_visible ? "Öffentlich (Klick zum Verbergen)" : "Versteckt (Klick zum Freigeben)"}>
                {app.is_visible ? '👁️' : '🙈'}
            </span>
        {/if}
        {#if app.is_private}<span title="Privater Termin">🔒</span>{/if}
        {#if app.is_series}<span class="text-indigo-600" title="Serientermin">🔁</span>{/if}
        {#if app.settled && rbacService.canAccessFinances}
            <span class="text-emerald-600 font-bold" title="Abgerechnet">✓</span>
        {:else if isAppointmentEnded(app)}
            <span class="text-emerald-600 font-black text-xs" title={rbacService.canAccessFinances ? "Beendet (Abrechnungsbereit)" : "Beendet"}>✓</span>
        {/if}
        {#if app.google_event_id || app.is_google}<span title="Synchronisiert mit Google Kalender">📅</span>{/if}
        {#if getAppointmentTimeRecords(app).length > 0}<span title="Zeiterfassung">⏱️</span>{/if}
        {#if app.expand?.drive_record?.length > 0}<span title="Fahrtenbuch">🚗</span>{/if}
        {#if app.expand?.expenditures?.length > 0 && rbacService.canAccessFinances}<span title="Ausgaben">💶</span>{/if}
        {#if app.expand?.tasks?.length > 0}<span title="Besuchsbericht">📝</span>{/if}
    </div>
{/snippet}

<div class="flex-1 min-w-0 {isWidget ? 'border-b 2xl:border-b-0 2xl:border-r border-neutral-100' : 'border-transparent'}">
    <div class="orga-calendar-header">
        {#each WEEKDAYS as day}
            <div class="py-2 text-center text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-r border-slate-100 dark:border-slate-800 last:border-0">{day}</div>
        {/each}
    </div>

    <div class="orga-calendar-grid">
        {#each calendarDays as day}
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div ondrop={canEdit ? (e) => onDrop(e, day.date) : null} ondragover={(e) => e.preventDefault()} onclick={() => onSelectDay(day.date)} class="orga-calendar-day group {isWidget ? 'min-h-16 sm:min-h-20 p-1.5' : 'md:min-h-24 lg:min-h-32 p-1 sm:p-2'} {selectedDate && isSameDay(day.date, selectedDate) ? 'ring-2 ring-inset ring-indigo-500/50 z-10 bg-indigo-50/20' : ''} {!day.isCurrentMonth ? 'opacity-40 bg-slate-50/50 dark:bg-slate-900/40' : ''} {isDragging ? 'hover:ring-2 hover:ring-inset hover:ring-indigo-400' : ''}">
                <div class="flex justify-between items-start w-full">
                    {#if canEdit && !isWidget}
                        <button onclick={(e) => { e.stopPropagation(); onNewAppointment?.(day.date); }} class="hidden md:flex w-5 h-5 mt-0.5 ml-0.5 items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors opacity-0 group-hover:opacity-100" title="Neuer Termin">
                            <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg>
                        </button>
                    {:else}
                        <div></div>
                    {/if}
                    <span class="w-6 h-6 sm:w-7 sm:h-7 mx-auto sm:mx-0 sm:ml-auto flex items-center justify-center text-[11px] sm:text-xs font-bold rounded-full {isSameDay(day.date, now) ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-800 dark:text-slate-200'}">
                        {day.date.getDate()}
                    </span>
                </div>

                <div class="flex-wrap gap-1 justify-center mt-1 sm:mt-1.5 px-0.5 {isWidget ? 'flex' : 'flex md:hidden'}">
                    {#each day.apps.slice(0, 4) as app}
                        {@const cColor = getCompanyColor(app, isSuperAdmin, companies)}
                        {#if isCarBooking(app)}
                            {@const isOwner = isAppointmentOwner(app, currentUser?.id) || isSuperAdmin}
                            {#if isOwner}
                                <span class="text-[9px] leading-none" title={getCarBookingLabel(app)}>🚗</span>
                            {:else}
                                <span class="w-1.5 h-1.5 rounded-full bg-neutral-400/60 dark:bg-slate-500/60" title="Fahrzeug belegt"></span>
                            {/if}
                        {:else}
                            {@const isOwner = isAppointmentOwner(app, currentUser?.id)}
                            <span class="w-2 h-2 rounded-full shadow-2xs {cColor ? '' : (app.is_private ? 'bg-rose-500' : (isOwner ? 'bg-indigo-600 ring-1 ring-indigo-400' : 'bg-slate-400/70'))}" style="{cColor ? `background-color: ${cColor};` : ''}" title={app.description || 'Termin'}></span>
                        {/if}
                    {/each}
                    {#if day.apps.length > 4}
                        <span class="text-[8px] font-bold text-slate-400">+{day.apps.length - 4}</span>
                    {/if}
                </div>

                <div class="flex-col gap-1 mt-1.5 flex-1 min-h-0 pr-0.5 pb-0.5 {isWidget ? 'hidden' : 'hidden md:flex'}">
                    {#each day.apps as app}
                        {@const cColor = getCompanyColor(app, isSuperAdmin, companies)}
                        {#if isCarBooking(app)}
                            {@const isOwner = isAppointmentOwner(app, currentUser?.id) || isSuperAdmin}
                            <button
                                type="button"
                                disabled={!isOwner}
                                onclick={isOwner && canEdit ? (e) => { e.stopPropagation(); onOpenDetail(app.id); } : (e) => e.stopPropagation()}
                                class="w-full text-left flex flex-col gap-0.5 px-1.5 py-1 rounded-md border transition-all {isOwner 
                                    ? 'border-rose-300/80 dark:border-rose-800/80 bg-rose-50/90 dark:bg-rose-950/60 text-rose-900 dark:text-rose-100 hover:bg-rose-100 dark:hover:bg-rose-900/80 cursor-pointer shadow-xs border-l-2 border-l-rose-500' 
                                    : 'border-dashed border-neutral-300 dark:border-slate-700 bg-neutral-100/40 dark:bg-slate-800/40 text-neutral-600 dark:text-neutral-400 opacity-40 pointer-events-none cursor-default'}"
                                title={isOwner ? `Fahrzeugbuchung: ${app.description || app.title}` : 'Fahrzeug reserviert'}
                            >
                                <div class="flex items-center justify-between w-full">
                                    <span class="font-bold text-[9px] leading-none truncate pr-1 {isOwner ? 'text-rose-700 dark:text-rose-300' : 'text-neutral-600 dark:text-neutral-400'}">{getDisplayTime(app)}</span>
                                    {#if isOwner}
                                        <span class="text-[8px] font-extrabold bg-rose-200/90 dark:bg-rose-800 text-rose-900 dark:text-rose-100 px-1 rounded flex items-center gap-0.5">🚗 {getCarBookingLabel(app)}</span>
                                    {:else}
                                        <span class="text-[8px] font-bold bg-neutral-200 dark:bg-slate-700 text-neutral-600 dark:text-neutral-300 px-1 rounded">Belegt</span>
                                    {/if}
                                </div>
                                <span class="text-[10px] font-semibold truncate flex-1 leading-tight mt-0.5 {isOwner ? 'text-rose-950 dark:text-white' : 'text-neutral-600 dark:text-neutral-400'}">{isOwner ? (app.description || app.title) : 'Fahrzeug reserviert'}</span>
                            </button>
                        {:else if isBlock(app)}
                            <button type="button" onclick={canEdit ? (e) => { e.stopPropagation(); onOpenDetail(app.id); } : (e) => e.stopPropagation()} class="w-full text-left block px-1.5 py-1 rounded-md bg-rose-50/50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/50 text-rose-800 dark:text-rose-200 hover:bg-rose-100 transition-colors truncate {getCardStateClasses(app, currentUser?.id, isSuperAdmin)}">
                                <div class="flex justify-between items-center w-full">
                                    <div class="truncate"><span class="font-bold text-[9px] mr-1">🚫</span> <span class="text-[10px] font-semibold">{getBlockText(app)}</span></div>
                                    {#if isSuperAdmin}
                                        <!-- svelte-ignore a11y_click_events_have_key_events -->
                                        <!-- svelte-ignore a11y_no_static_element_interactions -->
                                        <span onclick={(e) => { e.stopPropagation(); onToggleVisibility(app); }} class="shrink-0 ml-1 hover:scale-125 transition-transform cursor-pointer text-[10px] opacity-60 hover:opacity-100" title={app.is_visible ? "Öffentlich" : "Versteckt"}>{app.is_visible ? '👁️' : '🙈'}</span>
                                    {/if}
                                </div>
                            </button>
                        {:else}
                            {@const isOwner = isAppointmentOwner(app, currentUser?.id)}
                            <button type="button" draggable={canEdit ? "true" : "false"} ondragstart={canEdit ? (e) => onDragStart(e, app.id) : null} ondragend={onDragEnd} onclick={canEdit ? (e) => { e.stopPropagation(); onOpenDetail(app.id); } : (e) => e.stopPropagation()} class="{canEdit ? 'cursor-grab active:cursor-grabbing hover:-translate-y-px hover:shadow-md' : 'cursor-default'} w-full text-left flex flex-col gap-0.5 px-1.5 py-1 rounded-md border transition-all {cColor ? 'text-slate-900 dark:text-white font-medium hover:brightness-95' : (app.is_private ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200' : (isOwner ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-900 dark:text-indigo-100 border-indigo-200/80 dark:border-indigo-800 font-bold border-l-2 border-l-indigo-600 shadow-2xs' : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-100 dark:border-slate-800 opacity-75 hover:opacity-100'))} {draggedAppId === app.id ? 'opacity-40' : ''} {getCardStateClasses(app, currentUser?.id, isSuperAdmin)}" style="{cColor ? `background-color: color-mix(in srgb, ${cColor} 15%, transparent); border-left: 2px solid ${cColor};` : ''}" title={getCardSubtitle(app, false, currentUser, isSuperAdmin)}>
                                <div class="flex items-center justify-between w-full">
                                    <span class="font-bold text-[9px] leading-none truncate pr-1 {isOwner ? 'text-indigo-700 dark:text-indigo-300 font-black' : 'text-slate-600 dark:text-slate-400'}">{getDisplayTime(app)}</span>
                                    {@render statusIcons(app)}
                                </div>
                                <div class="flex items-center gap-1 w-full mt-0.5">
                                    {#if isSuperAdmin && !isOwner && app.expand?.user}
                                        <span class="inline-block text-[8px] font-bold text-neutral-500 bg-neutral-200/60 px-1 py-0.5 rounded truncate max-w-[95%] shrink-0">👤 {app.expand.user.name_first}</span>
                                    {/if}
                                    <span class="text-[10px] {isOwner ? 'font-bold text-neutral-950 dark:text-white' : 'font-medium text-neutral-700 dark:text-slate-300'} {app.status === 'abgesagt' ? 'line-through text-slate-400 dark:text-slate-500' : ''} truncate flex-1 leading-tight">{getCardTitle(app, false, currentUser, isSuperAdmin)}</span>
                                </div>
                                {#if app.status === 'abgesagt' && app.cancellation_reason}
                                    <div class="text-[9px] text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1 truncate mt-0.5 leading-tight" title="Ausfallgrund: {app.cancellation_reason}">
                                        <span class="shrink-0">⚠️</span>
                                        <span class="truncate">{app.cancellation_reason}</span>
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
