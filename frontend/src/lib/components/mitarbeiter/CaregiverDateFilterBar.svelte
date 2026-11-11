<script lang="ts">
    import { caregiverPortal, type DateFilterType } from '$lib/services/caregiverPortalService.svelte';
    import { orgaStore } from '$lib/stores/orgaStore.svelte';
    import { X, Calendar } from 'lucide-svelte';

    interface Props {
        appointmentDates: string[];
    }

    let { appointmentDates = [] }: Props = $props();

    // Generiere die 7 Wochentage der aktuellen Woche (Montag bis Sonntag)
    const weekDays = $derived.by(() => {
        const now = new Date();
        const currentDay = now.getDay() || 7; // Montag = 1, Sonntag = 7
        const monday = new Date(now);
        monday.setDate(now.getDate() - currentDay + 1);

        const days = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            const iso = d.toISOString().slice(0, 10);
            const count = appointmentDates.filter(ad => ad.startsWith(iso)).length;
            days.push({
                dateObj: d,
                iso,
                weekday: d.toLocaleDateString('de-DE', { weekday: 'short' }),
                dayNumber: d.getDate(),
                isToday: iso === new Date().toISOString().slice(0, 10),
                count
            });
        }
        return days;
    });

    const activeClient = $derived(
        caregiverPortal.selectedClientId ? orgaStore.clients.getById(caregiverPortal.selectedClientId) : null
    );

    function selectDay(iso: string) {
        caregiverPortal.selectedDateStr = iso;
        caregiverPortal.filterMode = 'all'; // Zeige diesen ausgewählten Tag
    }
</script>

<div class="space-y-2.5">
    <!-- Aktiver Klientenfilter falls von Klientenliste gesetzt -->
    {#if caregiverPortal.selectedClientId}
        <div class="flex items-center justify-between p-3 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-2xl text-xs font-bold text-indigo-700 dark:text-indigo-300 shadow-2xs">
            <span class="truncate">
                Filter aktiv: <strong>{activeClient ? `${activeClient.name_last}, ${activeClient.name_first}` : 'Klient'}</strong>
            </span>
            <button
                type="button"
                onclick={() => caregiverPortal.selectedClientId = null}
                class="min-h-8 px-2.5 py-1 bg-white dark:bg-slate-800 rounded-xl text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700 hover:bg-indigo-50 flex items-center gap-1 cursor-pointer transition-colors"
            >
                <X class="w-3.5 h-3.5" />
                <span>Aufheben</span>
            </button>
        </div>
    {/if}

    <!-- Hauptfilter-Pills -->
    <div class="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
        {#each [
            { id: 'today', label: 'Heute' },
            { id: 'tomorrow', label: 'Morgen' },
            { id: 'week', label: 'Diese Woche' },
            { id: 'all', label: 'Alle Einsätze' }
        ] as f}
            <button
                type="button"
                onclick={() => caregiverPortal.filterMode = f.id as DateFilterType}
                class="min-h-11 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer {
                    caregiverPortal.filterMode === f.id
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }"
            >
                {f.label}
            </button>
        {/each}
    </div>

    <!-- Horizontaler Wochenstreifen (Tages-Picker) -->
    <div class="grid grid-cols-7 gap-1 sm:gap-2 bg-slate-100/70 dark:bg-slate-900/60 p-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-800">
        {#each weekDays as day}
            {@const isSelected = caregiverPortal.selectedDateStr === day.iso && caregiverPortal.filterMode === 'all'}
            <button
                type="button"
                onclick={() => selectDay(day.iso)}
                class="min-h-12 py-1.5 px-1 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer relative {
                    isSelected
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : day.isToday
                        ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border border-indigo-300 dark:border-indigo-700 font-black'
                        : 'hover:bg-white/80 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300'
                }"
            >
                <span class="text-[10px] uppercase font-bold opacity-75">{day.weekday}</span>
                <span class="text-xs sm:text-sm font-black">{day.dayNumber}</span>
                {#if day.count > 0}
                    <span class="absolute top-1 right-1 w-2 h-2 rounded-full {isSelected ? 'bg-amber-300' : 'bg-emerald-500'}"></span>
                {/if}
            </button>
        {/each}
    </div>
</div>
