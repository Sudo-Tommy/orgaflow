<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    import { getAppointmentClientName, isAppointmentOwner } from "$lib/components/calendar/calendarUtils";
    import { isBlock, isPrivateAppointment, isWorkAppointment, getBlockText } from "$lib/services/dashboardStats";
    import AppointmentStatusBadge from "$lib/components/calendar/AppointmentStatusBadge.svelte";
    import { appointmentCompleteService } from "$lib/services/appointmentCompleteService.svelte";
    import { startTimeTracking } from "$lib/components/appointmentDetail/appointmentTrackingService";
    import { timeTrackingStore } from "$lib/stores/timeTracking.svelte";
    import { triggerHaptic } from "$lib/services/hapticFeedback";
    import { swipeAction } from "$lib/actions/swipeAction";
    import { MapPin, User, Lock, Ban, Play, CheckCircle2, RotateCcw, Zap, Search } from "lucide-svelte";

    interface Props {
        app: any;
        isSelected: boolean;
        isAdmin: boolean;
        isSuperAdmin: boolean;
        appointmentViewTab: 'today' | 'upcoming';
        onToggleSelect: (appId: string) => void;
        onOpenDetail: (id: string) => void;
        onOpenFollowUp: (app: any) => void;
    }

    let {
        app,
        isSelected,
        isAdmin,
        isSuperAdmin,
        appointmentViewTab,
        onToggleSelect,
        onOpenDetail,
        onOpenFollowUp
    }: Props = $props();

    const isCancelled = $derived(app.status === 'abgesagt');
    const isEnded = $derived(app.status === 'beendet');
    const isBlocked = $derived(isBlock(app));
    const isPrivate = $derived(isPrivateAppointment(app));
    const isWork = $derived(isWorkAppointment(app));
    const locationContact = $derived(app.expand?.appointment_at?.[0]);
    const locationText = $derived(locationContact ? `${locationContact.company_name || ''} ${locationContact.name_first || ''} ${locationContact.name_last || ''}`.trim() : app.location_address);
    const destinationAddress = $derived(
        app.location_address ||
        (locationContact ? `${locationContact.street || ''} ${locationContact.housenr || ''}, ${locationContact.zip || ''} ${locationContact.city || ''}`.trim() : '') ||
        locationText
    );
    const clientName = $derived(isBlocked ? getBlockText(app) : getAppointmentClientName(app));
    const isMine = $derived(isAppointmentOwner(app, pb.authStore.model?.id));
    const canManage = $derived(isWork && (isMine || isAdmin || isSuperAdmin));
    const appTitleOrDesc = $derived((app.title || app.description || '').trim());
    const isTrackingThis = $derived(timeTrackingStore.appointmentId === app.id);
</script>

<div 
    role="button"
    tabindex="0"
    use:swipeAction={{
        onSwipeLeft: () => { triggerHaptic('selection'); onOpenDetail(app.id); },
        onSwipeRight: () => { triggerHaptic('tap'); onToggleSelect(app.id); }
    }}
    onclick={() => { triggerHaptic('tap'); onToggleSelect(app.id); }}
    onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggleSelect(app.id); } }}
    class="p-3.5 rounded-2xl border transition-all duration-200 shadow-xs hover:shadow-md space-y-2 cursor-pointer text-left w-full group focus:outline-none focus:ring-2 focus:ring-indigo-500 touch-manipulation active:scale-[0.99] {isSelected ? 'ring-2 ring-indigo-500/40 bg-indigo-50/25 dark:bg-indigo-950/25 shadow-md' : (isCancelled ? 'opacity-60 bg-slate-100/70 dark:bg-slate-900/40 border-rose-200 dark:border-rose-900/60' : (isBlocked ? 'bg-slate-50/70 dark:bg-slate-900/50 border-dashed border-slate-300 dark:border-slate-700 hover:border-slate-400' : (isPrivate ? 'bg-purple-50/40 dark:purple-950/20 border-dashed border-purple-200 dark:border-purple-800' : (isMine ? 'border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 bg-white dark:bg-slate-900 border-l-4 border-l-indigo-600' : 'border-slate-200/80 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/60'))))}"
>
    <!-- 1. Beschreibung / Titel ÜBER der Uhrzeit -->
    {#if appTitleOrDesc && appTitleOrDesc !== clientName}
        <div class="mb-1">
            <h4 class="text-sm font-bold text-slate-900 dark:text-white leading-snug flex items-center gap-1.5 {isSelected ? 'break-words' : 'truncate'}">
                <span class="text-xs shrink-0">📝</span>
                <span class="{isSelected ? 'break-words' : 'truncate'}">{appTitleOrDesc}</span>
            </h4>
        </div>
    {/if}

    <!-- 2. Uhrzeit und harmonisierte Badges -->
    <div class="flex items-center gap-1.5 flex-wrap">
        <span class="orga-pill-badge text-xs font-bold {isBlocked ? 'text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700' : (isPrivate ? 'text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 border-purple-200 dark:border-purple-800' : 'text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border-indigo-100 dark:border-indigo-800')} border">
            {#if appointmentViewTab === 'upcoming' && app.appointment}
                {new Date(app.appointment).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })} · 
            {/if}
            {app.appointment ? new Date(app.appointment).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '--:--'} Uhr
        </span>
        {#if isCancelled}
            <span class="orga-pill-badge bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                <Ban class="w-3 h-3 text-rose-600 dark:text-rose-400 shrink-0" />
                <span>Abgesagt</span>
            </span>
        {:else if isBlocked}
            <span class="orga-pill-badge bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600">
                <Ban class="w-3 h-3 text-slate-500 shrink-0" />
                <span>Sperrzeit</span>
            </span>
        {:else if isPrivate}
            <span class="orga-pill-badge bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                <Lock class="w-3 h-3 text-purple-600 dark:text-purple-400 shrink-0" />
                <span>Privat</span>
            </span>
        {/if}
        {#if isMine}
            <span class="orga-pill-badge bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800">
                <User class="w-3 h-3 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span>{isBlocked ? 'Eigener Eintrag' : 'Eigener Termin'}</span>
            </span>
        {/if}
        {#if isTrackingThis}
            <span class="orga-pill-badge text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700">
                <span class="relative flex h-2 w-2 shrink-0">
                    <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>Läuft</span>
            </span>
        {/if}
        <AppointmentStatusBadge {app} {onOpenDetail} />
    </div>

    <!-- 3. Klient & Details dezent darunter -->
    <div class="mt-1 flex items-center gap-1.5 {appTitleOrDesc && appTitleOrDesc !== clientName ? 'text-xs font-semibold text-slate-600 dark:text-slate-300' : 'text-sm font-bold text-slate-900 dark:text-white'} truncate">
        {#if !isBlocked}<span>👤</span>{/if}
        <span class="truncate {isCancelled ? 'line-through text-slate-400 dark:text-slate-500' : ''}">{clientName || 'Termin'}</span>
    </div>

    <!-- Interne Notiz direkt auf der Karte (Glance-and-Edit) -->
    {#if app.notes && app.notes.trim()}
        <div class="px-2.5 py-1.5 rounded-xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200/90 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-1.5 mt-1 shadow-2xs">
            <span class="text-xs shrink-0 select-none">📌</span>
            <span class="{isSelected ? 'break-words' : 'line-clamp-2'} font-medium leading-relaxed">{app.notes.trim()}</span>
        </div>
    {/if}

    {#if isCancelled && app.cancellation_reason}
        <p class="text-xs text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1 mt-0.5 truncate" title="Ausfallgrund: {app.cancellation_reason}">
            <span class="shrink-0">⚠️</span>
            <span class="truncate">Ausfallgrund: {app.cancellation_reason}</span>
        </p>
    {/if}

    <!-- 4. Ort & 1-Klick Navigation -->
    {#if locationText && !isBlocked}
        <div class="flex items-center justify-between gap-1 text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
            <span class="truncate">📍 {locationText}</span>
            {#if destinationAddress}
                <a 
                    href="https://www.google.com/maps/dir/?api=1&destination={encodeURIComponent(destinationAddress)}"
                    target="_blank" 
                    rel="noopener noreferrer"
                    onclick={(e) => e.stopPropagation()}
                    class="orga-pill-action text-blue-700 hover:text-blue-900 dark:text-blue-300 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 shrink-0"
                    title="Navigation in Google Maps starten"
                >
                    <MapPin class="w-3 h-3 text-blue-600 dark:text-blue-400 shrink-0" />
                    <span>Route</span>
                </a>
            {/if}
        </div>
    {/if}

    <!-- 5. Aktions-Buttons: Nach Kartenauswahl sichtbar -->
    {#if isSelected}
        <div class="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex-wrap">
            {#if canManage && !isCancelled && !app.settled}
                {#if isEnded}
                    <button 
                        type="button" 
                        onclick={(e) => { e.stopPropagation(); appointmentCompleteService.reopen(app); }}
                        class="py-2 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1 min-h-[44px] cursor-pointer"
                    >
                        <RotateCcw class="w-3.5 h-3.5" /> <span>Wiedereröffnen</span>
                    </button>
                {:else}
                    {#if !isTrackingThis}
                        <button 
                            type="button" 
                            onclick={(e) => { e.stopPropagation(); startTimeTracking(app.id, app.time_record || []); }}
                            class="py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold rounded-xl transition-colors flex items-center justify-center gap-1 min-h-[44px] cursor-pointer shadow-xs"
                            title="Einsatz vor Ort starten (Stoppuhr)"
                        >
                            <Play class="w-3.5 h-3.5 fill-white text-white" /> <span>Start</span>
                        </button>
                    {/if}
                    <button 
                        type="button" 
                        onclick={(e) => { e.stopPropagation(); appointmentCompleteService.open(app); }}
                        class="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold rounded-xl transition-colors flex items-center justify-center gap-1.5 min-h-[44px] cursor-pointer shadow-xs"
                    >
                        <CheckCircle2 class="w-3.5 h-3.5" /> <span>Beenden</span>
                    </button>
                {/if}
            {/if}
            {#if isWork && canManage}
                <button 
                    type="button" 
                    onclick={(e) => { e.stopPropagation(); onOpenFollowUp(app); }}
                    class="py-2 px-3 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 min-h-[44px] cursor-pointer"
                >
                    <Zap class="w-3.5 h-3.5" /> <span>Folge</span>
                </button>
            {/if}
            <button 
                type="button" 
                onclick={(e) => { e.stopPropagation(); onOpenDetail(app.id); }}
                class="{isWork ? 'py-2 px-3' : 'flex-1 py-2 px-3'} bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 min-h-[44px] cursor-pointer"
            >
                <Search class="w-3.5 h-3.5" /> <span>Details</span>
            </button>
        </div>
    {/if}
</div>
