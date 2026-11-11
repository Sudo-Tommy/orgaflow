<script lang="ts">
    import { Search, Plus, Share2, Calendar, Clock, Car, ExternalLink, AlertTriangle } from "lucide-svelte";
    import { rbacService } from "$lib/services/rbacService.svelte";
    import { isAppointmentEnded } from "$lib/services/appointmentStatusHelper";

    interface Props {
        client: any;
        appointments: any[];
        upcomingAppointments: any[];
        filteredAppointments: any[];
        appointmentFilter: 'all' | 'upcoming' | 'open' | 'settled' | 'cancelled';
        appointmentSearch: string;
        onSetFilter: (filter: 'all' | 'upcoming' | 'open' | 'settled' | 'cancelled') => void;
        onSearchChange: (val: string) => void;
        onOpenMultiReminder: () => void;
        onNewAppointment: () => void;
        onOpenAppointmentDetail: (id: string) => void;
    }

    let {
        client,
        appointments,
        upcomingAppointments,
        filteredAppointments,
        appointmentFilter,
        appointmentSearch,
        onSetFilter,
        onSearchChange,
        onOpenMultiReminder,
        onNewAppointment,
        onOpenAppointmentDetail
    }: Props = $props();
</script>

<div class="space-y-4 sm:space-y-5 animate-enter">
    <!-- Top Filter & Actions Bar -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <!-- Filter Pills -->
        <div class="flex items-center gap-1.5 flex-wrap">
            <button
                type="button"
                onclick={() => onSetFilter('all')}
                class="px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer {appointmentFilter === 'all' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-white dark:bg-slate-800 text-neutral-600 dark:text-slate-300 border border-neutral-200 dark:border-slate-700'}"
            >
                Alle ({appointments.length})
            </button>
            <button
                type="button"
                onclick={() => onSetFilter('upcoming')}
                class="px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer {appointmentFilter === 'upcoming' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-white dark:bg-slate-800 text-neutral-600 dark:text-slate-300 border border-neutral-200 dark:border-slate-700'}"
            >
                Anstehend ({upcomingAppointments.length})
            </button>
            {#if rbacService.canAccessFinances}
                <button
                    type="button"
                    onclick={() => onSetFilter('open')}
                    class="px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer {appointmentFilter === 'open' ? 'bg-amber-600 text-white shadow-xs' : 'bg-white dark:bg-slate-800 text-neutral-600 dark:text-slate-300 border border-neutral-200 dark:border-slate-700'}"
                >
                    Nicht abgerechnet
                </button>
                <button
                    type="button"
                    onclick={() => onSetFilter('settled')}
                    class="px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer {appointmentFilter === 'settled' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-white dark:bg-slate-800 text-neutral-600 dark:text-slate-300 border border-neutral-200 dark:border-slate-700'}"
                >
                    Abgerechnet ✓
                </button>
            {/if}
            <button
                type="button"
                onclick={() => onSetFilter('cancelled')}
                class="px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer {appointmentFilter === 'cancelled' ? 'bg-rose-600 text-white shadow-xs' : 'bg-white dark:bg-slate-800 text-neutral-600 dark:text-slate-300 border border-neutral-200 dark:border-slate-700'}"
            >
                Abgesagt
            </button>
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center gap-2 shrink-0">
            <button
                type="button"
                onclick={onOpenMultiReminder}
                class="orga-button-ghost py-1.5 px-3 text-xs font-bold border border-neutral-200 dark:border-slate-700 dark:text-slate-200 cursor-pointer"
                title="Terminübersicht per E-Mail senden"
            >
                <Share2 class="w-3.5 h-3.5" />
                <span>Übersicht senden</span>
            </button>

            <button
                type="button"
                onclick={onNewAppointment}
                class="orga-button-primary py-1.5 px-3.5 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
                <Plus class="w-3.5 h-3.5" />
                <span>Neuer Termin</span>
            </button>
        </div>
    </div>

    <!-- Search Input -->
    <div class="relative">
        <Search class="w-4 h-4 text-neutral-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
            type="text"
            value={appointmentSearch}
            oninput={(e) => onSearchChange(e.currentTarget.value)}
            placeholder="Termine nach Titel oder Notizen durchsuchen..."
            class="orga-input-clear pl-10 pr-4 py-2 text-xs w-full bg-white dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl placeholder:text-neutral-400"
        />
    </div>

    <!-- Appointments List -->
    {#if filteredAppointments.length === 0}
        <div class="text-center py-12 border-2 border-dashed border-neutral-200 dark:border-slate-700 rounded-3xl bg-neutral-50/50 dark:bg-slate-800/30">
            <Calendar class="w-8 h-8 text-neutral-300 dark:text-slate-600 mx-auto mb-2" />
            <p class="text-neutral-600 dark:text-slate-200 font-bold text-xs">Keine Termine gefunden</p>
            <p class="text-neutral-400 dark:text-slate-500 text-[11px] mt-0.5">Passen Sie Ihre Suchfilter an oder planen Sie einen neuen Termin.</p>
            <button
                type="button"
                onclick={onNewAppointment}
                class="orga-button-primary mt-3 px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
            >
                <Plus class="w-3 h-3" /> Termin anlegen
            </button>
        </div>
    {:else}
        <div class="space-y-2.5">
            {#each filteredAppointments as app}
                {@const isCancelled = app.status === 'abgesagt'}
                <button
                    type="button"
                    onclick={() => onOpenAppointmentDetail(app.id)}
                    class="w-full text-left bg-white dark:bg-slate-800/80 p-3.5 sm:p-4 rounded-xl border border-neutral-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-md transition-all group flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer {isCancelled ? 'opacity-60 bg-slate-100/50 dark:bg-slate-900/40' : ''}"
                >
                    <div class="flex items-start gap-3 min-w-0 flex-1">
                        <!-- Status dot -->
                        <div class="w-2.5 h-2.5 mt-1 rounded-full {isCancelled ? 'bg-rose-500 ring-2 ring-rose-400/20' : (app.settled ? 'bg-emerald-500' : 'bg-amber-400')} shrink-0"></div>

                        <div class="min-w-0 flex-1">
                            <div class="flex items-center gap-2 flex-wrap">
                                <p class="text-xs sm:text-sm font-black transition-colors truncate {isCancelled ? 'line-through text-slate-400' : 'text-neutral-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400'}">
                                    {app.description || 'Termin ohne Beschreibung'}
                                </p>
                                {#if isCancelled}
                                    <span class="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300">Abgesagt</span>
                                {/if}
                                {#if app.is_series}
                                    <span class="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">Serie</span>
                                {/if}
                                {#if app.is_private}
                                    <span class="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300">Privat</span>
                                {/if}
                            </div>

                            {#if isCancelled && app.cancellation_reason}
                                <p class="text-[11px] text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1 mt-0.5 truncate">
                                    <AlertTriangle class="w-3 h-3 shrink-0" />
                                    <span>Ausfallgrund: {app.cancellation_reason}</span>
                                </p>
                            {/if}

                            <div class="flex items-center gap-2.5 text-[11px] text-neutral-500 dark:text-slate-400 mt-1 font-medium flex-wrap">
                                <span class="font-semibold text-neutral-800 dark:text-slate-200">
                                    📅 {app.appointment ? new Date(app.appointment).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Kein Datum'}
                                    {app.appointment ? `• ${new Date(app.appointment).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr` : ''}
                                </span>

                                {#if app.expand?.time_record}
                                    {@const totalMins = app.expand.time_record.reduce((acc: number, tr: any) => {
                                        if (tr.start && tr.end) {
                                            return acc + Math.round((new Date(tr.end).getTime() - new Date(tr.start).getTime()) / 60000);
                                        }
                                        return acc;
                                    }, 0)}
                                    {#if totalMins > 0}
                                        <span class="flex items-center gap-1 text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-1 py-0.5 rounded font-bold text-[10px]">
                                            <Clock class="w-3 h-3" /> {Math.floor(totalMins / 60)}h {totalMins % 60}m
                                        </span>
                                    {/if}
                                {/if}

                                {#if app.expand?.drive_record}
                                    {@const totalKm = app.expand.drive_record.reduce((acc: number, dr: any) => acc + (dr.km || 0), 0)}
                                    {#if totalKm > 0}
                                        <span class="flex items-center gap-1 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-1 py-0.5 rounded font-bold text-[10px]">
                                            <Car class="w-3 h-3" /> {totalKm} km
                                        </span>
                                    {/if}
                                {/if}
                            </div>
                        </div>
                    </div>

                    <div class="flex items-center gap-2 self-end sm:self-center shrink-0">
                        {#if isCancelled}
                            <span class="px-2 py-0.5 text-[11px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 rounded-lg">Abgesagt</span>
                        {:else if rbacService.canAccessFinances}
                            {#if app.settled}
                                <span class="px-2 py-0.5 text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 rounded-lg">✓ Abgerechnet</span>
                            {:else}
                                <span class="px-2 py-0.5 text-[11px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 rounded-lg">Offen</span>
                            {/if}
                        {:else if isAppointmentEnded(app)}
                            <span class="px-2 py-0.5 text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 rounded-lg">✓ Beendet</span>
                        {:else}
                            <span class="px-2 py-0.5 text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg">Geplant</span>
                        {/if}
                        <ExternalLink class="w-3.5 h-3.5 text-neutral-400 group-hover:text-indigo-600 transition-colors" />
                    </div>
                </button>
            {/each}
        </div>
    {/if}
</div>
