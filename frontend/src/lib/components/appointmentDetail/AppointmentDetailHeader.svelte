<script lang="ts">
    import { slide } from "svelte/transition";
    import { X, Calendar, Clock, Repeat, Trash2, MessageSquare, RotateCw, MoreVertical, FileText, MapPin, Ban, AlertTriangle } from "lucide-svelte";
    import { googleCalendarService } from "$lib/services/googleCalendarService";
    import { toastStore } from "$lib/services/toastService.svelte";
    import { isAppointmentFromRequest } from "$lib/services/appointmentRequestHelper";
    import AppointmentStatusPills from "./AppointmentStatusPills.svelte";

    interface Props {
        appointment: any;
        runningTimeRecord: any;
        isSuperAdmin: boolean;
        currentUserId?: string;
        client?: any;
        onClose: () => void;
        onToggleSettled: () => void;
        onTogglePrivate: () => void;
        onToggleVisibility: () => void;
        onOpenCancelModal: () => void;
        onOpenFollowUp: () => void;
        onOpenRequest?: () => void;
        onOpenReminder: () => void;
        onOpenEdit?: () => void;
        onToggleBillingType?: () => void;
        onDeleteSingle: () => void;
        onDeleteSeries: () => void;
        onSelectTab?: (tab: any) => void;
    }

    let {
        appointment, runningTimeRecord, isSuperAdmin, currentUserId, client,
        onClose, onToggleSettled, onTogglePrivate, onToggleVisibility, onOpenCancelModal,
        onOpenFollowUp, onOpenRequest, onOpenReminder, onOpenEdit, onToggleBillingType,
        onDeleteSingle, onDeleteSeries, onSelectTab
    }: Props = $props();

    let showMobileMore = $state(false);
    let canFollowUp = $derived(appointment?.user === currentUserId || (Array.isArray(appointment?.user) && appointment.user.includes(currentUserId)) || isSuperAdmin);
    let hasRequest = $derived(isAppointmentFromRequest(appointment));
    let clientName = $derived(client ? `${client.name_first || ''} ${client.name_last || ''}`.trim() : '');
    let isCancelled = $derived(appointment?.status === 'abgesagt');
</script>

<div class="bg-white dark:bg-slate-900 border-b border-neutral-100 dark:border-slate-800 shrink-0">
    <!-- Mobile Header (< 640px) -->
    <div class="sm:hidden px-4 pt-3.5 pb-2.5 bg-gradient-to-r from-indigo-500/10 via-sky-500/5 to-transparent border-b border-neutral-100 dark:border-slate-800 space-y-2">
        <div class="flex items-start justify-between gap-2.5 min-w-0">
            <div class="flex items-center gap-2.5 min-w-0 flex-1">
                <div class="w-9 h-9 rounded-xl {isCancelled ? 'bg-rose-500' : (runningTimeRecord ? 'bg-emerald-600' : 'bg-indigo-600')} text-white flex items-center justify-center text-sm shadow-md shrink-0">
                    {#if isCancelled}🚫{:else}📅{/if}
                </div>
                <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-1.5 flex-wrap">
                        <span class="text-[9px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 bg-indigo-100/80 dark:bg-indigo-950/60 px-1.5 py-0.2 rounded">
                            {isCancelled ? 'Abgesagt' : 'Termin'}
                        </span>
                        {#if clientName}
                            <span class="text-[10px] font-semibold text-neutral-400 dark:text-slate-400 truncate max-w-[130px]">
                                {clientName}
                            </span>
                        {/if}
                    </div>
                    <h3 class="text-sm font-bold text-neutral-900 dark:text-white truncate mt-0.5 {isCancelled ? 'line-through opacity-75' : ''}">
                        {appointment?.title || appointment?.description || clientName || 'Termin'}
                    </h3>
                </div>
            </div>
            <button 
                type="button" 
                aria-label="Schließen" 
                onclick={onClose} 
                class="w-8 h-8 rounded-full bg-neutral-100 dark:bg-slate-800 hover:bg-neutral-200 dark:hover:bg-slate-700 text-neutral-500 dark:text-slate-300 flex items-center justify-center transition-colors text-sm shrink-0 cursor-pointer"
            >✕</button>
        </div>

        <div class="flex items-center gap-1.5">
            {#if canFollowUp}
                <button type="button" onclick={onOpenFollowUp} class="flex-1 h-9 px-3 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-600 hover:text-white rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center gap-1 text-xs font-bold border border-indigo-200 dark:border-indigo-800 cursor-pointer transition-colors shadow-2xs">
                    <span>⚡</span> <span>Folge</span>
                </button>
            {/if}
            {#if hasRequest}
                <button type="button" onclick={onOpenRequest} class="flex-1 h-9 px-2.5 text-sky-700 dark:text-sky-300 hover:bg-sky-600 hover:text-white rounded-xl bg-sky-50 dark:bg-sky-950/50 flex items-center justify-center gap-1 text-xs font-bold border border-sky-200 dark:border-sky-800 cursor-pointer transition-colors shadow-2xs" title="Zur ursprünglichen Anfrage">
                    <span>📥</span> <span>Anfrage</span>
                </button>
            {/if}
            <button type="button" onclick={() => showMobileMore = !showMobileMore} class="h-9 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl flex items-center justify-center border border-slate-200 dark:border-slate-700 cursor-pointer transition-colors shadow-2xs shrink-0" title="Weitere Optionen">
                <MoreVertical class="w-4 h-4" />
            </button>
        </div>
    </div>

    <!-- Mobile More Menu -->
    {#if showMobileMore}
        <div transition:slide class="sm:hidden bg-slate-50 dark:bg-slate-800/90 px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex flex-wrap gap-2 text-xs">
            <button type="button" onclick={() => { showMobileMore = false; onOpenCancelModal(); }} class="min-h-10 px-3 {isCancelled ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200' : 'bg-white dark:bg-slate-800'} font-bold rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-2 cursor-pointer">
                <Ban class="w-4 h-4 text-rose-600" /> {isCancelled ? 'Status: Abgesagt' : 'Termin absagen'}
            </button>
            {#if hasRequest}
                <button type="button" onclick={() => { showMobileMore = false; onOpenRequest?.(); }} class="min-h-10 px-3 bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 font-bold rounded-xl border border-sky-200 dark:border-sky-800 flex items-center gap-2 cursor-pointer">
                    <span>📥</span> Zur Anfrage
                </button>
            {/if}
            <button type="button" onclick={() => { showMobileMore = false; onOpenReminder(); }} class="min-h-10 px-3 bg-white dark:bg-slate-800 font-bold rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-2 cursor-pointer"><MessageSquare class="w-4 h-4 text-brand-600" /> Nachricht / SMS</button>
            {#if appointment?.is_series && appointment?.series_id}<button type="button" onclick={() => { showMobileMore = false; onDeleteSeries(); }} class="min-h-10 px-3 bg-rose-50 text-rose-700 font-bold rounded-xl border border-rose-200 flex items-center gap-2 cursor-pointer"><Repeat class="w-4 h-4" /> Serie löschen</button>{/if}
            <button type="button" onclick={() => { showMobileMore = false; onDeleteSingle(); }} class="min-h-10 px-3 bg-rose-50 text-rose-700 font-bold rounded-xl border border-rose-200 flex items-center gap-2 cursor-pointer"><Trash2 class="w-4 h-4" /> Termin löschen</button>
        </div>
    {/if}

    <!-- Desktop Row (>= 640px) Bild-3-Design -->
    <div class="hidden sm:flex items-center justify-between px-6 py-4 bg-gradient-to-r from-indigo-500/10 via-sky-500/5 to-transparent border-b border-neutral-100 dark:border-slate-800 gap-3">
        <div class="flex items-center gap-3 sm:gap-4 min-w-0">
            <div class="relative w-11 h-11 rounded-2xl {isCancelled ? 'bg-rose-500 text-white shadow-rose-500/20' : (runningTimeRecord ? 'bg-emerald-600 text-white ring-2 ring-emerald-500/30' : 'bg-indigo-600 text-white shadow-indigo-500/20')} flex items-center justify-center font-bold shadow-lg text-lg shrink-0">
                {#if isCancelled}
                    <Ban class="w-5 h-5" />
                {:else}
                    <Calendar class="w-5 h-5" />
                {/if}
                {#if runningTimeRecord && !isCancelled}<span class="absolute -top-1 -right-1 flex h-3.5 w-3.5"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span class="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white dark:border-slate-900"></span></span>{/if}
            </div>
            <div class="min-w-0">
                <div class="flex items-center gap-2">
                    <span class="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 bg-indigo-100/80 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md">
                        {isCancelled ? 'Abgesagt' : 'Termin-Details'}
                    </span>
                    {#if clientName}
                        <span class="text-[10px] font-semibold text-neutral-400 dark:text-slate-400 truncate max-w-[200px]">
                            {clientName}
                        </span>
                    {/if}
                </div>
                <h2 class="text-lg font-bold text-neutral-900 dark:text-white truncate mt-0.5 {isCancelled ? 'line-through text-slate-400 dark:text-slate-500' : ''}">
                    {appointment?.title || appointment?.description || clientName || 'Termin-Details'}
                </h2>
                <div class="flex items-center gap-3 mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                    <span class="flex items-center gap-1 font-semibold">
                        <Clock class="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        {appointment?.appointment ? `${new Date(appointment.appointment).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })} · ${new Date(appointment.appointment).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}${appointment.appointment_end ? ` – ${new Date(appointment.appointment_end).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}` : ''} Uhr` : ''}
                    </span>
                    {#if appointment?.location_address}
                        <a 
                            href="https://www.google.com/maps/search/?api=1&query={encodeURIComponent(appointment.location_address)}"
                            target="_blank" 
                            rel="noopener noreferrer"
                            class="hover:text-indigo-600 dark:hover:text-indigo-400 font-medium truncate flex items-center gap-1 transition-colors cursor-pointer group"
                            title="Einsatzort in Google Maps öffnen"
                        >
                            <MapPin class="w-3.5 h-3.5 text-rose-500 shrink-0" />
                            <span class="truncate group-hover:underline">{appointment.location_address}</span>
                        </a>
                    {/if}
                </div>
            </div>
        </div>
        <div class="flex items-center gap-1.5 shrink-0">
            {#if canFollowUp}<button type="button" onclick={onOpenFollowUp} class="h-9 px-3 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-600 hover:text-white rounded-xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center gap-1 border border-indigo-200 dark:border-indigo-800 font-bold text-xs cursor-pointer shadow-xs"><span class="text-sm">⚡</span><span>Folgetermin</span></button>{/if}
            {#if hasRequest}<button type="button" onclick={onOpenRequest} class="h-9 px-3 text-sky-700 dark:text-sky-300 hover:bg-sky-600 hover:text-white rounded-xl bg-sky-50 dark:bg-sky-950/40 flex items-center gap-1 border border-sky-200 dark:border-sky-800 font-bold text-xs cursor-pointer shadow-xs" title="Zur ursprünglichen Anfrage"><span class="text-sm">📥</span><span>Anfrage</span></button>{/if}
            {#if appointment?.google_event_link}<a href={appointment.google_event_link} target="_blank" rel="noopener noreferrer" class="w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 flex items-center justify-center border border-emerald-200 dark:border-emerald-800 text-xs" title="Google Kalender"><Calendar class="w-4 h-4" /></a>{:else}<button type="button" onclick={() => googleCalendarService.syncAppointment(appointment.id, 'upsert').then(() => toastStore.success('Google Sync gestartet.')).catch(() => toastStore.error('Sync Fehler.'))} class="w-8 h-8 rounded-full bg-neutral-100 dark:bg-slate-800 text-neutral-500 flex items-center justify-center border border-neutral-200 dark:border-slate-700 text-xs cursor-pointer" title="Google Sync"><RotateCw class="w-3.5 h-3.5" /></button>{/if}
            <button type="button" onclick={onOpenReminder} class="w-8 h-8 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 bg-neutral-100 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 text-xs cursor-pointer" title="Nachricht senden"><MessageSquare class="w-3.5 h-3.5" /></button>
            {#if appointment?.is_series && appointment?.series_id}<button type="button" onclick={onDeleteSeries} class="w-8 h-8 rounded-full flex items-center justify-center text-rose-600 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs cursor-pointer" title="Serie löschen"><Repeat class="w-3.5 h-3.5" /></button>{/if}
            <button type="button" onclick={onDeleteSingle} class="w-8 h-8 rounded-full flex items-center justify-center text-rose-500 bg-neutral-100 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 text-xs cursor-pointer" title="Termin löschen"><Trash2 class="w-3.5 h-3.5" /></button>
            <div class="w-px h-5 bg-neutral-200 dark:border-slate-700 mx-1"></div>
            <button type="button" aria-label="Schließen" onclick={onClose} class="w-8 h-8 rounded-full bg-neutral-100 dark:bg-slate-800 hover:bg-neutral-200 dark:hover:bg-slate-700 text-neutral-500 dark:text-slate-300 flex items-center justify-center transition-colors text-sm shrink-0 cursor-pointer">✕</button>
        </div>
    </div>

    <!-- Status Pills -->
    <AppointmentStatusPills
        {appointment}
        {onToggleSettled}
        {onTogglePrivate}
        {onToggleVisibility}
        {onOpenCancelModal}
        {onSelectTab}
        {onToggleBillingType}
    />
</div>
