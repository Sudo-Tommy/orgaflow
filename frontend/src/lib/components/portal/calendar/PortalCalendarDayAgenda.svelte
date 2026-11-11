<script lang="ts">
    import { Clock, MapPin, User, Plus } from "lucide-svelte";
    import { formatTime } from "./portalCalendarHelpers";

    interface Props {
        selectedDate: Date;
        selectedDayAppointments: any[];
        onSelectAppointment: (app: any) => void;
        onRequestAppointment?: (date?: Date) => void;
    }

    let {
        selectedDate,
        selectedDayAppointments,
        onSelectAppointment,
        onRequestAppointment
    }: Props = $props();

    const selectedDateFormatted = $derived(
        selectedDate.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
    );
</script>

<div class="p-3 sm:p-5 bg-slate-50/70 dark:bg-slate-900/70 border-t border-slate-200/80 dark:border-slate-800 flex flex-col">
    <!-- Kopfzeile der Tagesansicht -->
    <div class="flex items-center justify-between gap-3 mb-3 pb-2 border-b border-slate-200/80 dark:border-slate-800 flex-wrap">
        <div class="flex items-center gap-2">
            <span class="text-base sm:text-lg">📅</span>
            <div>
                <h3 class="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-tight">
                    {selectedDateFormatted}
                </h3>
                <p class="text-[11px] text-slate-500 dark:text-slate-400">
                    {#if selectedDayAppointments.length === 0}
                        Keine Termine an diesem Tag
                    {:else}
                        {selectedDayAppointments.length} geplante{selectedDayAppointments.length === 1 ? 'r' : ''} Termin{selectedDayAppointments.length === 1 ? '' : 'e'}
                    {/if}
                </p>
            </div>
        </div>

        <div class="flex items-center gap-2">
            {#if selectedDayAppointments.length > 0}
                <span class="px-2.5 py-1 bg-indigo-100 dark:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 text-indigo-800 dark:text-indigo-200 rounded-lg text-xs font-bold shadow-2xs">
                    {selectedDayAppointments.length} Termin{selectedDayAppointments.length === 1 ? '' : 'e'}
                </span>
            {/if}
            {#if onRequestAppointment}
                <button
                    type="button"
                    onclick={() => onRequestAppointment(selectedDate)}
                    class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1 active:scale-95 cursor-pointer min-h-[44px] touch-manipulation"
                >
                    <Plus class="w-3.5 h-3.5" />
                    <span>Termin anfragen</span>
                </button>
            {/if}
        </div>
    </div>

    <!-- Termin-Karten für den Tag -->
    {#if selectedDayAppointments.length === 0}
        <div class="py-6 sm:py-8 px-4 flex flex-col items-center justify-center text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-800/40">
            <span class="text-3xl mb-2">🍃</span>
            <p class="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
                Keine Termine an diesem Tag geplant
            </p>
            <p class="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-4">
                Wählen Sie einen anderen Tag im Kalender oder fragen Sie direkt einen neuen Wunschtermin bei uns an.
            </p>
            {#if onRequestAppointment}
                <button
                    type="button"
                    onclick={() => onRequestAppointment(selectedDate)}
                    class="px-4 py-2 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/80 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 active:scale-95 cursor-pointer min-h-[44px] touch-manipulation"
                >
                    <span>📅</span>
                    <span>Neuen Termin für diesen Tag anfragen</span>
                </button>
            {/if}
        </div>
    {:else}
        <div class="space-y-2.5">
            {#each selectedDayAppointments as app}
                {@const locationContact = app.expand?.appointment_at?.[0]}
                {@const locationText = locationContact ? `${locationContact.company_name || ''} ${locationContact.name_first || ''} ${locationContact.name_last || ''}`.trim() : app.location_address}
                {@const caregiver = app.expand?.user}
                <div
                    role="button"
                    tabindex="0"
                    onclick={() => onSelectAppointment(app)}
                    onkeydown={(e) => { if (e.key === 'Enter') onSelectAppointment(app); }}
                    class="p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/90 hover:border-indigo-300 dark:hover:border-indigo-700/80 hover:shadow-md transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group active:scale-[0.99] touch-manipulation min-h-[44px]"
                >
                    <div class="flex items-start gap-3 min-w-0">
                        <div class="px-2.5 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800/50 rounded-xl flex items-center gap-1.5 shrink-0 text-indigo-700 dark:text-indigo-300">
                            <Clock class="w-3.5 h-3.5" />
                            <span class="text-xs font-extrabold">{formatTime(app.appointment)} Uhr</span>
                        </div>

                        <div class="min-w-0 flex-1">
                            <h4 class="text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                {app.description || app.title || 'Betreuungs- / Alltagshilfe-Termin'}
                            </h4>

                            <div class="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                                {#if caregiver}
                                    <div class="flex items-center gap-1">
                                        <User class="w-3 h-3 text-slate-400" />
                                        <span>Betreuung: <strong class="text-slate-700 dark:text-slate-300 font-semibold">{caregiver.name_first} {caregiver.name_last || ''}</strong></span>
                                    </div>
                                {/if}

                                {#if locationText}
                                    <div class="flex items-center gap-1 truncate max-w-xs">
                                        <MapPin class="w-3 h-3 text-slate-400 shrink-0" />
                                        <span class="truncate">{locationText}</span>
                                    </div>
                                {/if}
                            </div>
                        </div>
                    </div>

                    <div class="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <span class="text-xs font-bold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-1 py-1 px-2.5 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/40 border border-indigo-100/60 dark:border-indigo-800/40 min-h-[32px]">
                            <span>Details</span>
                            <span>→</span>
                        </span>
                    </div>
                </div>
            {/each}
        </div>
    {/if}
</div>
