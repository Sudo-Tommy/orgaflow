<script lang="ts">
    import { caregiverPortal } from '$lib/services/caregiverPortalService.svelte';
    import { orgaStore } from '$lib/stores/orgaStore.svelte';
    import { appointmentModalService } from '$lib/services/appointmentModalService.svelte';
    import { isAppointmentOwner } from '$lib/components/calendar/calendarUtils';
    import CaregiverDateFilterBar from './CaregiverDateFilterBar.svelte';
    import CaregiverAppointmentCard from './CaregiverAppointmentCard.svelte';
    import CaregiverAppointmentModal from './CaregiverAppointmentModal.svelte';
    import CaregiverCalendarView from './CaregiverCalendarView.svelte';
    import { Calendar, List, Plus } from 'lucide-svelte';
    import type { AppointmentRecord } from '$lib/types/orgaTypes';

    let appointmentModal = $state<ReturnType<typeof CaregiverAppointmentModal>>();
    let activePreviewAppt = $state<AppointmentRecord | null>(null);
    let currentTab = $state<'list' | 'calendar'>('list');

    const currentUserId = $derived(caregiverPortal.currentUserId);
    const assignedIds = $derived(caregiverPortal.assignedClientIds);

    const myAppointments = $derived.by(() => {
        if (!currentUserId) return [];
        return ((orgaStore.appointments.data || []) as AppointmentRecord[]).filter(a => {
            if (a.is_private || a.status === 'abgesagt' || String(a.description || '').toUpperCase().includes('[BLOCK]')) return false;
            const users = Array.isArray(a.user) ? a.user : (a.user ? [a.user] : []);
            if (a.assigned_to === currentUserId || users.includes(currentUserId)) return true;
            const raw = a.client as any;
            if (Array.isArray(raw)) return raw.some(c => assignedIds.has(typeof c === 'string' ? c : c?.id));
            return typeof raw === 'string' ? assignedIds.has(raw) : (raw?.id ? assignedIds.has(raw.id) : false);
        });
    });

    const appointmentDates = $derived(myAppointments.map(a => a.appointment || ''));

    const filteredAppointments = $derived.by(() => {
        const now = new Date(), todayStr = now.toISOString().slice(0, 10);
        const tom = new Date(now); tom.setDate(tom.getDate() + 1); const tomorrowStr = tom.toISOString().slice(0, 10);
        const eow = new Date(now); eow.setDate(eow.getDate() + (7 - (now.getDay() || 7))); const endOfWeekStr = eow.toISOString().slice(0, 10);

        let list = [...myAppointments];
        if (caregiverPortal.selectedClientId) {
            list = list.filter(a => {
                const raw = a.client as any;
                if (Array.isArray(raw)) return raw.some(c => (typeof c === 'string' ? c : c?.id) === caregiverPortal.selectedClientId);
                return typeof raw === 'string' ? raw === caregiverPortal.selectedClientId : raw?.id === caregiverPortal.selectedClientId;
            });
        }
        if (caregiverPortal.filterMode === 'today') list = list.filter(a => (a.appointment || '').startsWith(todayStr));
        else if (caregiverPortal.filterMode === 'tomorrow') list = list.filter(a => (a.appointment || '').startsWith(tomorrowStr));
        else if (caregiverPortal.filterMode === 'week') list = list.filter(a => (a.appointment || '').slice(0, 10) >= todayStr && (a.appointment || '').slice(0, 10) <= endOfWeekStr);
        else if (caregiverPortal.selectedDateStr) list = list.filter(a => (a.appointment || '').startsWith(caregiverPortal.selectedDateStr));

        return list.sort((a, b) => (a.appointment || '').localeCompare(b.appointment || ''));
    });

    $effect(() => {
        if (!activePreviewAppt && filteredAppointments.length > 0) activePreviewAppt = filteredAppointments[0];
    });

    function handleOpenModal(appt: AppointmentRecord) {
        activePreviewAppt = appt;
        appointmentModal?.open(appt);
    }
</script>

<div class="space-y-4 pb-24">
    <!-- Kopfzeile mit Ansichten-Umschalter und Aktion -->
    <div class="flex items-center justify-between gap-3 flex-wrap">
        <div>
            <h2 class="text-sm sm:text-base font-black text-slate-900 dark:text-white">Meine Einsätze & Termine</h2>
            <p class="text-[11px] text-slate-500 dark:text-slate-400">Einsätze dokumentieren, planen und mit Google abgleichen</p>
        </div>
        <div class="flex items-center gap-2">
            <!-- Ansichtsumschalter: Liste vs. Kalender -->
            <div class="bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl flex text-xs font-bold">
                <button
                    type="button"
                    onclick={() => currentTab = 'list'}
                    class="px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer {currentTab === 'list' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs' : 'text-slate-500'}"
                >
                    <List class="w-3.5 h-3.5" />
                    <span>Liste</span>
                </button>
                <button
                    type="button"
                    onclick={() => currentTab = 'calendar'}
                    class="px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer {currentTab === 'calendar' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs' : 'text-slate-500'}"
                >
                    <Calendar class="w-3.5 h-3.5" />
                    <span>Kalender</span>
                </button>
            </div>

            <button
                type="button"
                onclick={() => appointmentModalService.openNew()}
                class="min-h-10 px-3.5 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer transition-all shrink-0"
            >
                <Plus class="w-4 h-4" />
                <span class="hidden sm:inline">Neuer Termin</span>
            </button>
        </div>
    </div>

    {#if currentTab === 'calendar'}
        <CaregiverCalendarView onOpenModal={handleOpenModal} />
    {:else}
        <CaregiverDateFilterBar {appointmentDates} />

        {#if orgaStore.appointments?.isLoading}
            <div class="text-center py-16 text-slate-400 font-medium animate-pulse">Lade Einsätze...</div>
        {:else if filteredAppointments.length === 0}
            <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center shadow-xs">
                <div class="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-3">
                    <Calendar class="w-6 h-6" />
                </div>
                <h3 class="text-base font-bold text-slate-900 dark:text-white">Keine Einsätze gefunden</h3>
                <p class="text-xs sm:text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                    {#if caregiverPortal.selectedClientId}Für diesen Klienten liegen im gewählten Zeitraum keine Termine vor.
                    {:else if caregiverPortal.filterMode === 'today'}Für heute sind keine Einsätze zugewiesen. Genießen Sie den Tag!
                    {:else}In diesem Zeitraum sind derzeit keine Termine hinterlegt.{/if}
                </p>
            </div>
        {:else}
            <div class="grid grid-cols-1 landscape:grid-cols-12 lg:grid-cols-12 gap-4">
                <div class="landscape:col-span-7 lg:col-span-7 space-y-3">
                    {#each filteredAppointments as appt (appt.id)}
                        {@const isDirect = isAppointmentOwner(appt, currentUserId) || appt.assigned_to === currentUserId}
                        <div role="button" tabindex="0" onclick={() => activePreviewAppt = appt} onkeydown={(e) => { if (e.key === 'Enter') activePreviewAppt = appt; }} class="text-left w-full cursor-pointer focus:outline-hidden">
                            <CaregiverAppointmentCard appointment={appt} isDirectOwner={isDirect} onOpenModal={handleOpenModal} />
                        </div>
                    {/each}
                </div>

                <div class="hidden landscape:block lg:block landscape:col-span-5 lg:col-span-5">
                    {#if activePreviewAppt}
                        <div class="sticky top-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-4">
                            <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                                <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Detailansicht</span>
                                <span class="text-xs font-bold px-2 py-0.5 rounded-full {activePreviewAppt.status === 'Erledigt' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'}">
                                    {activePreviewAppt.status || 'Offen'}
                                </span>
                            </div>
                            <div>
                                <h4 class="text-base font-black text-slate-900 dark:text-white">{activePreviewAppt.title || 'Betreuungstermin'}</h4>
                                <p class="text-xs text-indigo-600 dark:text-indigo-400 font-semibold mt-0.5">{activePreviewAppt.description || 'Pflege- & Betreuungseinsatz'}</p>
                            </div>
                            {#if activePreviewAppt.notes}
                                <div class="p-3 bg-amber-50/70 dark:bg-amber-950/30 rounded-2xl text-xs text-amber-900 dark:text-amber-200 border border-amber-200/60">
                                    <strong>Hinweise:</strong> {activePreviewAppt.notes}
                                </div>
                            {/if}
                            {#if activePreviewAppt.report}
                                <div class="p-3 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-2xl text-xs text-emerald-900 dark:text-emerald-200 border border-emerald-200/60">
                                    <strong>Dokumentierter Bericht:</strong>
                                    <p class="mt-1 whitespace-pre-wrap">{activePreviewAppt.report}</p>
                                </div>
                            {/if}
                            <button type="button" onclick={() => handleOpenModal(activePreviewAppt!)} class="w-full min-h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-colors">
                                <span>Einsatz bearbeiten & dokumentieren</span>
                            </button>
                        </div>
                    {/if}
                </div>
            </div>
        {/if}
    {/if}
</div>

<CaregiverAppointmentModal bind:this={appointmentModal} />
