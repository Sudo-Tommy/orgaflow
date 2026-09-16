<script lang="ts">
    import { orgaStore } from '$lib/stores/orgaStore.svelte';
    import { pb } from '$lib/services/pocketbase';
    import { toastStore } from '$lib/services/toastService.svelte';
    import { 
        Calendar, Clock, MapPin, Phone, Navigation, CheckCircle2, 
        Circle, ChevronRight, AlertCircle, FileText, CheckSquare
    } from 'lucide-svelte';

    let filterMode = $state<'today' | 'tomorrow' | 'week' | 'all'>('today');

    const currentUser = $derived(pb.authStore.model);
    const currentUserId = $derived(currentUser?.id);

    // Alle dem aktuellen Mitarbeiter zugewiesenen Einsätze
    let myAppointments = $derived.by(() => {
        if (!currentUserId) return [];
        const appts = orgaStore.appointments.data || [];
        return appts.filter(a => a.assigned_to === currentUserId || a.user === currentUserId);
    });

    // Gefilterte Termine nach Zeitraum
    let filteredAppointments = $derived.by(() => {
        const now = new Date();
        const todayStr = now.toISOString().slice(0, 10);
        
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().slice(0, 10);

        const endOfWeek = new Date(now);
        endOfWeek.setDate(endOfWeek.getDate() + (7 - (now.getDay() || 7)));
        const endOfWeekStr = endOfWeek.toISOString().slice(0, 10);

        let list = [...myAppointments];

        if (filterMode === 'today') {
            list = list.filter(a => (a.appointment || '').startsWith(todayStr));
        } else if (filterMode === 'tomorrow') {
            list = list.filter(a => (a.appointment || '').startsWith(tomorrowStr));
        } else if (filterMode === 'week') {
            list = list.filter(a => {
                const dateStr = (a.appointment || '').slice(0, 10);
                return dateStr >= todayStr && dateStr <= endOfWeekStr;
            });
        }

        // Sortierung aufsteigend nach Datum/Uhrzeit
        return list.sort((a, b) => (a.appointment || '').localeCompare(b.appointment || ''));
    });

    // Checklisten-Punkt umschalten
    async function toggleChecklistItem(appointmentId: string, itemIndex: number) {
        const appt = orgaStore.appointments.data.find(a => a.id === appointmentId);
        if (!appt) return;

        let list = Array.isArray(appt.checklist) ? [...appt.checklist] : [];
        if (list[itemIndex]) {
            list[itemIndex].done = !list[itemIndex].done;
            try {
                await pb.collection('appointments').update(appointmentId, {
                    checklist: list
                });
                await orgaStore.appointments.init();
            } catch (err: any) {
                toastStore.error('Checkliste konnte nicht aktualisiert werden.');
            }
        }
    }

    function openMapsNavigation(address?: string) {
        if (!address) {
            toastStore.warning('Keine Adresse für die Navigation hinterlegt.');
            return;
        }
        const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
        window.open(url, '_blank');
    }

    function callClient(phone?: string) {
        if (!phone) {
            toastStore.warning('Keine Telefonnummer hinterlegt.');
            return;
        }
        window.location.href = `tel:${phone.replace(/\s+/g, '')}`;
    }
</script>

<div class="space-y-4 pb-20">
    
    <!-- Filter Bar (Mindestens 44px Touch-Targets) -->
    <div class="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1">
        {#each [
            { id: 'today', label: 'Heute' },
            { id: 'tomorrow', label: 'Morgen' },
            { id: 'week', label: 'Diese Woche' },
            { id: 'all', label: 'Alle Einsätze' }
        ] as filter}
            <button
                type="button"
                onclick={() => filterMode = filter.id as any}
                class="min-h-11 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 {
                    filterMode === filter.id 
                        ? 'bg-indigo-600 text-white shadow-xs' 
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }"
            >
                {filter.label}
            </button>
        {/each}
    </div>

    <!-- Termine Liste -->
    {#if orgaStore.appointments?.isLoading}
        <div class="text-center py-16 text-slate-400 font-medium animate-pulse">Lade Einsätze...</div>
    {:else if filteredAppointments.length === 0}
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center shadow-xs">
            <div class="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-3">
                <Calendar class="w-6 h-6" />
            </div>
            <h3 class="text-base font-bold text-slate-900 dark:text-white">Keine Einsätze gefunden</h3>
            <p class="text-xs sm:text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                {#if filterMode === 'today'}
                    Für heute sind keine Einsätze zugewiesen. Genießen Sie den Tag!
                {:else}
                    In diesem Zeitraum sind derzeit keine Termine hinterlegt.
                {/if}
            </p>
        </div>
    {:else}
        <div class="space-y-4">
            {#each filteredAppointments as appt (appt.id)}
                {@const expClient = appt.expand?.client?.[0] || (Array.isArray(appt.expand?.client) ? appt.expand.client[0] : appt.expand?.client)}
                {@const clientName = expClient ? `${expClient.name_last}, ${expClient.name_first}` : 'Direkter Betreuungseinsatz'}
                {@const address = appt.location_address || (expClient ? `${expClient.street || ''} ${expClient.housenr || ''}, ${expClient.zip || ''} ${expClient.city || ''}`.trim() : '')}
                {@const phone = expClient?.phone || expClient?.handy}
                {@const dateObj = appt.appointment ? new Date(appt.appointment) : null}
                {@const isChecklistEmpty = !Array.isArray(appt.checklist) || appt.checklist.length === 0}

                <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs transition-all hover:border-indigo-300 dark:hover:border-indigo-700 space-y-4">
                    
                    <!-- Header mit Uhrzeit & Klient -->
                    <div class="flex items-start justify-between gap-3">
                        <div class="flex items-start gap-3 min-w-0">
                            <!-- Zeit-Badge -->
                            <div class="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900 flex flex-col items-center justify-center shrink-0">
                                <span class="text-xs font-black">
                                    {dateObj ? dateObj.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                </span>
                                <span class="text-[10px] font-bold text-slate-500 dark:text-slate-400">Uhr</span>
                            </div>

                            <div class="min-w-0">
                                <h3 class="text-base font-black text-slate-900 dark:text-white truncate">
                                    {clientName}
                                </h3>
                                <p class="text-xs text-indigo-600 dark:text-indigo-400 font-bold mt-0.5">
                                    {appt.description || 'Pflege- & Betreuungstermin'}
                                </p>
                                {#if dateObj}
                                    <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                        📅 {dateObj.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })}
                                    </p>
                                {/if}
                            </div>
                        </div>

                        {#if expClient?.level_of_care}
                            <span class="text-xs font-bold px-2.5 py-1 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 shrink-0">
                                PG {expClient.level_of_care}
                            </span>
                        {/if}
                    </div>

                    <!-- Adresse & Notizen -->
                    {#if address}
                        <div class="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <MapPin class="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                            <span class="font-medium">{address}</span>
                        </div>
                    {/if}

                    {#if appt.notes}
                        <div class="text-xs text-slate-600 dark:text-slate-400 bg-amber-50/60 dark:bg-amber-950/20 p-3 rounded-2xl border border-amber-200/60 dark:border-amber-900/40">
                            <strong class="text-amber-800 dark:text-amber-300 block mb-0.5">Hinweise zum Einsatz:</strong>
                            <span>{appt.notes}</span>
                        </div>
                    {/if}

                    <!-- Checkliste für den Einsatz -->
                    {#if !isChecklistEmpty}
                        <div class="space-y-2 pt-1">
                            <div class="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                <CheckSquare class="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                                <span>Aufgaben-Checkliste</span>
                            </div>
                            <div class="space-y-1.5">
                                {#each appt.checklist as item, idx}
                                    <button 
                                        type="button"
                                        onclick={() => toggleChecklistItem(appt.id, idx)}
                                        class="w-full min-h-11 px-3 py-2 rounded-xl flex items-center gap-3 text-left transition-colors {item.done ? 'bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 line-through' : 'bg-slate-50 dark:bg-slate-800/40 text-slate-800 dark:text-slate-200 hover:bg-slate-100'}"
                                    >
                                        {#if item.done}
                                            <CheckCircle2 class="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                        {:else}
                                            <Circle class="w-5 h-5 text-slate-400 shrink-0" />
                                        {/if}
                                        <span class="text-xs font-semibold select-none">{item.text || item.title || item}</span>
                                    </button>
                                {/each}
                            </div>
                        </div>
                    {/if}

                    <!-- Ergonomische Außendienst-Aktionen (Mindestens 44x44 px) -->
                    <div class="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <button
                            type="button"
                            onclick={() => openMapsNavigation(address)}
                            class="min-h-12 px-4 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-xs sm:text-sm font-bold transition-all shadow-xs flex items-center justify-center gap-2"
                        >
                            <Navigation class="w-4 h-4" />
                            <span>Navigation</span>
                        </button>

                        <button
                            type="button"
                            onclick={() => callClient(phone)}
                            disabled={!phone}
                            class="min-h-12 px-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-[0.98] text-slate-800 dark:text-slate-100 text-xs sm:text-sm font-bold transition-all border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-2 disabled:opacity-40"
                        >
                            <Phone class="w-4 h-4 text-emerald-500" />
                            <span>Anrufen</span>
                        </button>
                    </div>

                </div>
            {/each}
        </div>
    {/if}

</div>
