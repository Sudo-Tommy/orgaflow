<script lang="ts">
    import { caregiverPortal } from '$lib/services/caregiverPortalService.svelte';
    import { orgaStore } from '$lib/stores/orgaStore.svelte';
    import { Clock, Calendar, CheckCircle2, Car, TrendingUp } from 'lucide-svelte';
    import type { AppointmentRecord } from '$lib/types/orgaTypes';

    let selectedPeriod = $state<'month' | 'week'>('month');

    const currentUserId = $derived(caregiverPortal.currentUserId);
    const assignedIds = $derived(caregiverPortal.assignedClientIds);

    // Alle erledigten Einsätze des Mitarbeiters
    const completedAppointments = $derived.by(() => {
        if (!currentUserId) return [];
        const appts = orgaStore.appointments.data || [];
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
        
        const currentDay = now.getDay() || 7;
        const monday = new Date(now);
        monday.setDate(now.getDate() - currentDay + 1);
        const startOfWeek = monday.toISOString().slice(0, 10);

        const filterStart = selectedPeriod === 'month' ? startOfMonth : startOfWeek;

        return appts
            .filter(a => {
                const isCaregiver = a.assigned_to === currentUserId || a.user === currentUserId;
                const isFinished = a.status === 'Erledigt' || a.settled;
                const dateStr = (a.appointment || '').slice(0, 10);
                return isCaregiver && isFinished && dateStr >= filterStart;
            })
            .sort((a, b) => (b.appointment || '').localeCompare(a.appointment || ''));
    });

    // Statistik-Berechnung
    const stats = $derived.by(() => {
        let totalMinutes = 0;
        let totalKm = 0;

        for (const a of completedAppointments) {
            const rawCl = a.checklist;
            if (rawCl && typeof rawCl === 'object' && !Array.isArray(rawCl)) {
                totalMinutes += Number(rawCl.recorded_minutes || 60);
                totalKm += Number(rawCl.recorded_km || 0);
            } else {
                totalMinutes += 60; // Standardfall 1h
            }
        }

        const hours = Math.floor(totalMinutes / 60);
        const remainingMinutes = totalMinutes % 60;

        return {
            totalHours: `${hours}h ${remainingMinutes}m`,
            totalCount: completedAppointments.length,
            totalKm: Math.round(totalKm * 10) / 10
        };
    });
</script>

<div class="space-y-4 pb-24">
    
    <!-- Perioden-Umschalter -->
    <div class="flex items-center justify-between gap-3">
        <h2 class="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Clock class="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span>Stundenzettel & Nachweise</span>
        </h2>

        <div class="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
                type="button"
                onclick={() => selectedPeriod = 'week'}
                class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer {
                    selectedPeriod === 'week' 
                        ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-2xs' 
                        : 'text-slate-500 hover:text-slate-700'
                }"
            >
                Diese Woche
            </button>
            <button
                type="button"
                onclick={() => selectedPeriod = 'month'}
                class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer {
                    selectedPeriod === 'month' 
                        ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-2xs' 
                        : 'text-slate-500 hover:text-slate-700'
                }"
            >
                Dieser Monat
            </button>
        </div>
    </div>

    <!-- Statistik Kacheln -->
    <div class="grid grid-cols-3 gap-2.5">
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 shadow-2xs text-center space-y-1">
            <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Geleistet</span>
            <span class="text-base sm:text-lg font-black text-indigo-600 dark:text-indigo-400 block">{stats.totalHours}</span>
            <span class="text-[10px] text-slate-500">Arbeitszeit</span>
        </div>

        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 shadow-2xs text-center space-y-1">
            <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Einsätze</span>
            <span class="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 block">{stats.totalCount}</span>
            <span class="text-[10px] text-slate-500">Abgeschlossen</span>
        </div>

        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 shadow-2xs text-center space-y-1">
            <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Fahrten</span>
            <span class="text-base sm:text-lg font-black text-purple-600 dark:text-purple-400 block">{stats.totalKm}</span>
            <span class="text-[10px] text-slate-500">Kilometer</span>
        </div>
    </div>

    <!-- Liste der dokumentierten Einsätze -->
    {#if completedAppointments.length === 0}
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center shadow-xs">
            <div class="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 class="w-6 h-6" />
            </div>
            <h3 class="text-base font-bold text-slate-900 dark:text-white">Keine Einträge im Zeitraum</h3>
            <p class="text-xs sm:text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                Sobald Sie Einsätze als "Erledigt" dokumentieren, erscheinen diese hier übersichtlich im Stundenzettel.
            </p>
        </div>
    {:else}
        <div class="space-y-2.5">
            <span class="text-xs font-bold text-slate-400 uppercase tracking-wider block px-1">
                Dokumentierte Tätigkeitsnachweise ({completedAppointments.length})
            </span>

            {#each completedAppointments as appt}
                {@const dateObj = appt.appointment ? new Date(appt.appointment) : null}
                {@const rawCl = appt.checklist}
                {@const minutes = rawCl && typeof rawCl === 'object' && !Array.isArray(rawCl) ? (rawCl.recorded_minutes || 60) : 60}
                {@const km = rawCl && typeof rawCl === 'object' && !Array.isArray(rawCl) ? (rawCl.recorded_km || 0) : 0}
                {@const hasSign = rawCl && typeof rawCl === 'object' && !Array.isArray(rawCl) && !!rawCl.signature}

                <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 shadow-2xs flex items-center justify-between gap-3">
                    <div class="min-w-0">
                        <div class="flex items-center gap-2">
                            <span class="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {appt.title || 'Betreuungseinsatz'}
                            </span>
                            {#if hasSign}
                                <span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                    ✍️ Signiert
                                </span>
                            {/if}
                        </div>
                        <span class="text-[11px] text-slate-400 block mt-0.5">
                            📅 {dateObj ? dateObj.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' }) : ''} • {appt.description || 'Pflegeleistung'}
                        </span>
                    </div>

                    <div class="flex items-center gap-3 shrink-0 text-right">
                        <div>
                            <span class="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 block">{minutes} Min.</span>
                            {#if km > 0}
                                <span class="text-[10px] text-slate-400 block">{km} km</span>
                            {/if}
                        </div>
                        <CheckCircle2 class="w-5 h-5 text-emerald-500 shrink-0" />
                    </div>
                </div>
            {/each}
        </div>
    {/if}

</div>
