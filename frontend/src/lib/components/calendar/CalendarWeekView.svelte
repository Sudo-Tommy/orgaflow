<script lang="ts">
    import {
        WEEKDAYS,
        isSameDay,
        isBlock,
        isCarBooking,
        getCarBookingLabel,
        getBlockText,
        getDisplayTime,
        getAppTop,
        getAppHeight,
        getCardTitle,
        getCardSubtitle,
        getCardStateClasses,
        getCompanyColor,
        isAppointmentOwner
    } from './calendarUtils';

    interface Props {
        calendarDays: any[];
        selectedDate: Date | null;
        now: Date;
        canEdit?: boolean;
        isSuperAdmin?: boolean;
        currentUser?: any;
        companies?: any[];
        draggedAppId?: string | null;
        isDragging?: boolean;
        onSelectDay: (d: Date) => void;
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
        canEdit = false,
        isSuperAdmin = false,
        currentUser = null,
        companies = [],
        draggedAppId = null,
        isDragging = false,
        onSelectDay,
        onOpenDetail,
        onOpenGoogleDetail: _onOpenGoogleDetail,
        onToggleVisibility,
        onDragStart,
        onDragEnd,
        onDrop
    }: Props = $props();

    let scrollContainer: HTMLElement | undefined = $state();

    $effect(() => {
        if (scrollContainer) {
            const targetScroll = (now.getHours() * 64) - 96;
            scrollContainer.scrollTop = Math.max(0, targetScroll);
        }
    });
</script>

<div class="flex border-b border-neutral-100 bg-neutral-50/80 z-20 sticky top-0">
    <div class="w-12 sm:w-16 flex-none border-r border-neutral-100"></div>
    <div class="flex-1 grid grid-cols-7">
        {#each calendarDays as day, i}
            {@const isBlockedDay = day.apps.some((a: any) => isBlock(a))}
            {@const isFullDay = day.apps.filter((a: any) => !isBlock(a)).length >= 4}
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div onclick={() => onSelectDay(day.date)} class="py-2 text-center border-r border-neutral-100 last:border-0 cursor-pointer hover:bg-neutral-100 transition-colors {selectedDate && isSameDay(day.date, selectedDate) ? 'bg-indigo-50/50' : (isBlockedDay ? 'bg-rose-50/50' : (isFullDay ? 'bg-orange-50/40' : ''))}">
                <div class="text-[10px] sm:text-xs font-bold {isSameDay(day.date, now) ? 'text-brand-500' : (isBlockedDay ? 'text-rose-600' : (isFullDay ? 'text-orange-600' : 'text-neutral-500'))} uppercase tracking-wider">{WEEKDAYS[i]}</div>
                <div class="text-sm sm:text-base font-bold {isSameDay(day.date, now) ? 'text-brand-600' : (isBlockedDay ? 'text-rose-700' : (isFullDay ? 'text-orange-700' : 'text-neutral-900'))}">{day.date.getDate()}</div>
            </div>
        {/each}
    </div>
</div>

<div class="flex overflow-y-auto custom-scrollbar relative h-125 md:h-150 bg-white scroll-smooth" bind:this={scrollContainer}>
    <div class="w-12 sm:w-16 flex-none border-r border-neutral-100 bg-neutral-50 sticky left-0 z-20">
        {#each Array(24) as _, hour}
            <div class="h-16 border-b border-neutral-100 text-right pr-1 sm:pr-2 pt-1 text-[10px] sm:text-xs text-neutral-400 font-medium">{hour}:00</div>
        {/each}
    </div>
    <div class="flex-1 relative h-384">
        <div class="absolute inset-0 flex flex-col pointer-events-none z-0">
            {#each Array(24) as _, hour}
                <div class="h-16 border-b border-neutral-100 w-full shrink-0"></div>
            {/each}
        </div>
        <div class="absolute inset-0 grid grid-cols-7 z-10">
            {#each calendarDays as day}
                {@const isBlockedDay = day.apps.some((a: any) => isBlock(a))}
                {@const isFullDay = day.apps.filter((a: any) => !isBlock(a)).length >= 4}
                
                {#if isSameDay(day.date, now)}
                    <div class="absolute left-0 right-0 border-t-2 border-rose-500 z-30 pointer-events-none" style="top: {(now.getHours() * 64) + (now.getMinutes() / 60 * 64)}px;">
                        <div class="absolute -left-1.5 -top-1.5 w-3 h-3 bg-rose-500 rounded-full shadow-sm"></div>
                    </div>
                {/if}
                
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <div ondrop={(e) => onDrop(e, day.date)} ondragover={(e) => e.preventDefault()} onclick={() => onSelectDay(day.date)} class="relative border-r border-neutral-100 last:border-0 cursor-pointer hover:bg-neutral-50/30 transition-colors {selectedDate && isSameDay(day.date, selectedDate) ? 'bg-indigo-50/20' : (isBlockedDay ? 'bg-rose-50/50' : (isFullDay ? 'bg-orange-50/40' : 'bg-transparent'))} {isDragging ? 'hover:bg-indigo-50/50 outline-dashed outline-2 outline-indigo-200 -outline-offset-2' : ''}">
                    {#if day.apps.some((a: any) => isBlock(a))}
                        <div class="sticky top-1 z-30 px-0.5 sm:px-1 w-full flex flex-col gap-1 pt-1">
                            {#each day.apps.filter((a: any) => isBlock(a)) as app}
                                <button type="button" onclick={canEdit ? (e) => { e.stopPropagation(); onOpenDetail(app.id); } : (e) => e.stopPropagation()} class="{canEdit ? 'hover:shadow-md hover:z-40' : 'cursor-default'} text-left w-full rounded-md p-1.5 overflow-hidden transition-all border shadow-sm bg-rose-50/95 dark:bg-rose-950/80 border-rose-200 text-rose-800 backdrop-blur-md {getCardStateClasses(app, currentUser?.id)}" title={getBlockText(app)}>
                                    <div class="flex justify-between items-start w-full">
                                        <div class="font-bold text-[10px] flex items-center gap-1 mb-0.5">🚫 Sperrzeit</div>
                                        {#if isSuperAdmin}
                                            <span onclick={(e) => { e.stopPropagation(); onToggleVisibility(app); }} class="shrink-0 ml-1 hover:scale-125 transition-transform cursor-pointer text-[10px] opacity-60 hover:opacity-100" title={app.is_visible ? "Öffentlich" : "Versteckt"}>{app.is_visible ? '👁️' : '🙈'}</span>
                                        {/if}
                                    </div>
                                    <div class="truncate opacity-75 text-[10px]">{getBlockText(app)}</div>
                                </button>
                            {/each}
                        </div>
                    {/if}

                    {#each day.apps.filter((a: any) => !isBlock(a)) as app}
                        {@const cColor = getCompanyColor(app, isSuperAdmin, companies)}
                        {@const carBooking = isCarBooking(app)}
                        {@const isDirectOwner = isAppointmentOwner(app, currentUser?.id)}
                        {@const isOwner = isDirectOwner || isSuperAdmin}
                        <button
                            type="button"
                            draggable={canEdit && !carBooking ? "true" : "false"}
                            ondragstart={canEdit ? (e) => onDragStart(e, app.id) : null}
                            ondragend={onDragEnd}
                            disabled={carBooking && !isOwner}
                            onclick={canEdit && (!carBooking || isOwner) ? (e) => { e.stopPropagation(); onOpenDetail(app.id); } : (e) => e.stopPropagation()}
                            class="{canEdit && (!carBooking || isOwner) ? 'cursor-grab active:cursor-grabbing hover:shadow-md hover:z-30' : 'cursor-default'} {isDirectOwner ? 'z-10 ring-1 ring-indigo-500/20' : 'z-0'} flex flex-col text-left absolute left-0.5 right-0.5 sm:left-1 sm:right-1 rounded-md p-1.5 overflow-hidden transition-all border shadow-sm {carBooking ? (isOwner ? 'bg-rose-50/95 dark:bg-rose-950/80 border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-100' : 'bg-neutral-200/40 dark:bg-slate-800/40 border-dashed border-neutral-300 dark:border-slate-700 text-neutral-600 dark:text-neutral-400 opacity-40 pointer-events-none') : (cColor ? 'text-slate-900 font-medium' : (app.is_private ? 'bg-rose-50/90 border-rose-200 text-rose-800' : (isDirectOwner ? 'bg-white dark:bg-slate-900 border-indigo-200 dark:border-indigo-800 text-neutral-900 dark:text-white font-bold' : 'bg-white/75 dark:bg-slate-900/75 border-neutral-200 dark:border-slate-800 text-neutral-600 dark:text-neutral-400 opacity-70 hover:opacity-100')))} backdrop-blur-md {draggedAppId === app.id ? 'opacity-40 z-50 pointer-events-none' : ''} {getCardStateClasses(app, currentUser?.id, isSuperAdmin)}"
                            style="top: {getAppTop(app)}px; height: {getAppHeight(app)}px; {carBooking ? (isOwner ? 'border-left: 3px solid #e11d48;' : 'border-left: 3px solid #94a3b8;') : (cColor ? `background-color: color-mix(in srgb, ${cColor} 15%, transparent); border-color: color-mix(in srgb, ${cColor} 40%, transparent); border-left: 3px solid ${cColor};` : (isDirectOwner ? 'border-left: 3.5px solid #4f46e5;' : 'border-left: 3px solid #94a3b8;'))}"
                            title={carBooking ? (isOwner ? (app.description || app.title || 'Fahrzeugbuchung') : 'Fahrzeug reserviert') : getCardSubtitle(app, false, currentUser, isSuperAdmin)}
                        >
                            <div class="flex items-start justify-between w-full gap-1">
                                <span class="font-bold text-[9px] leading-none {isDirectOwner ? 'text-indigo-600 dark:text-indigo-400 font-black' : ''}">{getDisplayTime(app)}</span>
                                <div class="flex items-center gap-0.5 shrink-0">
                                    {#if app.google_event_id || app.is_google}
                                        <span class="text-[9px]" title="Synchronisiert mit Google Kalender">📅</span>
                                    {/if}
                                    {#if carBooking}
                                        {#if isOwner}
                                            <span class="text-[8px] font-extrabold bg-rose-200/90 dark:bg-rose-800 text-rose-900 dark:text-rose-100 px-1 rounded flex items-center gap-0.5">🚗 {getCarBookingLabel(app)}</span>
                                        {:else}
                                            <span class="text-[8px] font-bold bg-neutral-200 dark:bg-slate-700 text-neutral-600 dark:text-neutral-300 px-1 rounded">Belegt</span>
                                        {/if}
                                    {:else if isSuperAdmin && !isDirectOwner && app.expand?.user}
                                        <span class="text-[8px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1 rounded truncate max-w-16">👤 {app.expand.user.name_first}</span>
                                    {/if}
                                </div>
                            </div>
                            <div class="mt-1 text-[11px] font-bold leading-tight line-clamp-2">
                                {carBooking ? (isOwner ? (app.description || app.title) : 'Fahrzeug reserviert') : getCardTitle(app, false, currentUser, isSuperAdmin)}
                            </div>
                            {#if getCardSubtitle(app, false, currentUser, isSuperAdmin) && !carBooking}
                                <div class="text-[9px] opacity-75 truncate mt-0.5 font-medium">{getCardSubtitle(app, false, currentUser, isSuperAdmin)}</div>
                            {/if}
                        </button>
                    {/each}
                </div>
            {/each}
        </div>
    </div>
</div>
