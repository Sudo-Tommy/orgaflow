<script lang="ts">
    import { Calendar, Clock, User, MapPin, Plus, ChevronRight, FileText, CheckCircle2 } from "lucide-svelte";

    let {
        client,
        appointments = [],
        onSelectAppointment = () => {},
        onRequestAppointment = () => {}
    }: {
        client: any;
        appointments?: any[];
        onSelectAppointment?: (app: any) => void;
        onRequestAppointment?: () => void;
    } = $props();

    let appointmentFilter = $state<'upcoming' | 'past' | 'all'>('upcoming');

    // Zuordnung der Termine zum gewählten Klienten
    let clientAppointments = $derived.by(() => {
        if (!client?.id) return [];
        const targetId = client.id;

        return appointments.filter((app: any) => {
            if (!app.appointment) return false;
            if (app.is_private === true || app.is_visible === false) return false;

            // 1. Array von Client-IDs
            if (Array.isArray(app.client)) {
                if (app.client.includes(targetId)) return true;
            } else if (typeof app.client === 'string') {
                if (app.client === targetId) return true;
                if (app.client.startsWith('[') && app.client.includes(targetId)) return true;
            }

            // 2. Expand-Relation client oder client_id
            const expClient = app.expand?.client || app.expand?.client_id;
            if (expClient) {
                if (Array.isArray(expClient)) {
                    if (expClient.some((c: any) => c.id === targetId)) return true;
                } else if (expClient.id === targetId) {
                    return true;
                }
            }

            return false;
        });
    });

    let now = new Date();

    let upcomingAppointments = $derived.by(() => {
        return clientAppointments
            .filter((a: any) => new Date(a.appointment) >= now)
            .sort((a: any, b: any) => new Date(a.appointment).getTime() - new Date(b.appointment).getTime());
    });

    let pastAppointments = $derived.by(() => {
        return clientAppointments
            .filter((a: any) => new Date(a.appointment) < now)
            .sort((a: any, b: any) => new Date(b.appointment).getTime() - new Date(a.appointment).getTime());
    });

    let displayedAppointments = $derived.by(() => {
        if (appointmentFilter === 'upcoming') return upcomingAppointments;
        if (appointmentFilter === 'past') return pastAppointments;
        return [...clientAppointments].sort((a: any, b: any) => new Date(b.appointment).getTime() - new Date(a.appointment).getTime());
    });

    function formatAppointmentDate(dateStr: string) {
        const d = new Date(dateStr);
        return {
            weekday: d.toLocaleDateString('de-DE', { weekday: 'short' }),
            day: d.toLocaleDateString('de-DE', { day: '2-digit' }),
            month: d.toLocaleDateString('de-DE', { month: 'short' }).toUpperCase(),
            year: d.getFullYear(),
            time: d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
        };
    }
</script>

<div class="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-md">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
        <div>
            <div class="flex items-center gap-2.5">
                <span class="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-900 shadow-2xs">
                    <Calendar class="w-4 h-4" />
                </span>
                <h3 class="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100">
                    Termine des Klienten
                </h3>
                <span class="px-2.5 py-0.5 text-xs font-bold rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800">
                    {clientAppointments.length}
                </span>
            </div>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Geplante und vergangene Einsätze für {client.name_first || ''} {client.name_last || ''}
            </p>
        </div>

        <div class="flex items-center gap-2 self-start sm:self-auto">
            <button
                type="button"
                onclick={onRequestAppointment}
                class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
                <Plus class="w-4 h-4" />
                <span>Termin anfragen</span>
            </button>
        </div>
    </div>

    <!-- Filter Pills / Segmented Control -->
    <div class="flex items-center gap-2 my-5 overflow-x-auto custom-scrollbar">
        <button
            type="button"
            onclick={() => appointmentFilter = 'upcoming'}
            class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer border {appointmentFilter === 'upcoming' ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs' : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'}"
        >
            Anstehend ({upcomingAppointments.length})
        </button>
        <button
            type="button"
            onclick={() => appointmentFilter = 'past'}
            class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer border {appointmentFilter === 'past' ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs' : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'}"
        >
            Vergangen ({pastAppointments.length})
        </button>
        <button
            type="button"
            onclick={() => appointmentFilter = 'all'}
            class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer border {appointmentFilter === 'all' ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs' : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'}"
        >
            Alle ({clientAppointments.length})
        </button>
    </div>

    <!-- Appointments List -->
    {#if displayedAppointments.length === 0}
        <div class="py-12 text-center text-slate-400 dark:text-slate-500 rounded-2xl bg-slate-50/60 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60">
            <Calendar class="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2.5 opacity-70" />
            <p class="font-bold text-sm text-slate-700 dark:text-slate-300">
                {#if appointmentFilter === 'upcoming'}
                    Keine anstehenden Termine geplant.
                {:else if appointmentFilter === 'past'}
                    Keine vergangenen Termine vorhanden.
                {:else}
                    Bisher sind keine Termine für diesen Klienten hinterlegt.
                {/if}
            </p>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                Sie können jederzeit neue Einsätze anfragen oder sich an Ihre Seniorenassistenz wenden.
            </p>
            <button
                type="button"
                onclick={onRequestAppointment}
                class="mt-4 px-4 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800 text-xs font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
                <Plus class="w-3.5 h-3.5" />
                <span>Jetzt Termin anfragen</span>
            </button>
        </div>
    {:else}
        <div class="space-y-3">
            {#each displayedAppointments as app (app.id)}
                {@const dt = formatAppointmentDate(app.appointment)}
                {@const isPast = new Date(app.appointment) < now}
                {@const caregiver = app.expand?.user}
                <button
                    type="button"
                    onclick={() => onSelectAppointment(app)}
                    class="w-full text-left p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/90 hover:bg-indigo-50/40 dark:hover:bg-slate-800/60 hover:border-indigo-300 dark:hover:border-indigo-800/60 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group cursor-pointer shadow-2xs hover:shadow-md"
                >
                    <div class="flex items-start sm:items-center gap-4 min-w-0">
                        <!-- Date Badge -->
                        <div class="w-13 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex flex-col items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700 group-hover:border-indigo-200 transition-colors">
                            <span class="text-[9px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-wider leading-none">{dt.month}</span>
                            <span class="text-lg font-black text-slate-900 dark:text-slate-100 leading-tight">{dt.day}</span>
                            <span class="text-[9px] font-bold text-slate-400 leading-none">{dt.weekday}</span>
                        </div>

                        <!-- Details -->
                        <div class="min-w-0 flex-1">
                            <div class="flex items-center gap-2 flex-wrap">
                                <h4 class="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                    {app.description || 'Einsatz / Assistenztermin'}
                                </h4>
                                {#if app.report}
                                    <span class="px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800 flex items-center gap-1">
                                        <FileText class="w-2.5 h-2.5" /> Bericht
                                    </span>
                                {/if}
                            </div>

                            <div class="flex items-center gap-3 sm:gap-4 mt-1.5 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                                <span class="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                                    <Clock class="w-3.5 h-3.5 text-indigo-500" />
                                    {dt.time} Uhr
                                </span>

                                {#if caregiver}
                                    <span class="flex items-center gap-1">
                                        <User class="w-3.5 h-3.5 text-slate-400" />
                                        <span>Assistenz: <strong class="text-slate-700 dark:text-slate-200">{caregiver.name_first || ''} {caregiver.name_last || ''}</strong></span>
                                    </span>
                                {/if}

                                {#if app.location_address}
                                    <span class="flex items-center gap-1 truncate max-w-xs">
                                        <MapPin class="w-3.5 h-3.5 text-slate-400" />
                                        <span class="truncate">{app.location_address}</span>
                                    </span>
                                {/if}
                            </div>
                        </div>
                    </div>

                    <!-- Right Side: Status Badge & Chevron -->
                    <div class="flex items-center justify-between sm:justify-end gap-3 self-stretch sm:self-center pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                        <div>
                            {#if !isPast}
                                <span class="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                    Geplant
                                </span>
                            {:else}
                                <span class="px-2.5 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                                    <CheckCircle2 class="w-3 h-3 text-slate-400" />
                                    Erledigt
                                </span>
                            {/if}
                        </div>

                        <div class="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center transition-all text-slate-400 shrink-0 shadow-2xs">
                            <ChevronRight class="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                        </div>
                    </div>
                </button>
            {/each}
        </div>
    {/if}
</div>
