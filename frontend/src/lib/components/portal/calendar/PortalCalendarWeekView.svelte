<script lang="ts">
    import { WEEKDAYS, isSameDay, formatTime } from "./portalCalendarHelpers";

    interface Props {
        weekDays: any[];
        selectedDate: Date;
        onSelectDay: (date: Date) => void;
        onSelectAppointment: (app: any) => void;
    }

    let { weekDays, selectedDate, onSelectDay, onSelectAppointment }: Props = $props();
</script>

<!-- Wochentage Leiste Woche -->
<div class="grid grid-cols-7 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/70">
    {#each weekDays as day}
        {@const isToday = isSameDay(day.date, new Date())}
        {@const isSelected = isSameDay(day.date, selectedDate)}
        <div 
            role="button"
            tabindex="0"
            onclick={() => onSelectDay(day.date)}
            onkeydown={(e) => { if (e.key === 'Enter') onSelectDay(day.date); }}
            class="py-2.5 px-1 text-center cursor-pointer transition-colors hover:bg-indigo-50/40 dark:hover:bg-slate-800/60 border-r border-slate-200/60 dark:border-slate-700/60 last:border-0 touch-manipulation {isSelected ? 'bg-indigo-50/60 dark:bg-indigo-950/40' : ''}"
        >
            <div class="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {WEEKDAYS[(day.date.getDay() || 7) - 1]}
            </div>
            <div class="w-6 h-6 sm:w-7 sm:h-7 mx-auto mt-1 flex items-center justify-center text-xs font-bold rounded-full {isToday ? 'bg-indigo-600 text-white shadow-xs' : (isSelected ? 'text-indigo-600 dark:text-indigo-400 font-black' : 'text-slate-800 dark:text-slate-200')}">
                {day.date.getDate()}
            </div>
        </div>
    {/each}
</div>

<!-- Wochen-Grid Spalten -->
<div class="grid grid-cols-7 bg-slate-200 dark:bg-slate-800 gap-px border-b border-slate-200/80 dark:border-slate-800 min-h-[140px] sm:min-h-[180px]">
    {#each weekDays as day}
        {@const isSelected = isSameDay(day.date, selectedDate)}
        <div
            role="button"
            tabindex="0"
            onclick={() => onSelectDay(day.date)}
            onkeydown={(e) => { if (e.key === 'Enter') onSelectDay(day.date); }}
            class="bg-white dark:bg-slate-900 p-1 sm:p-2 cursor-pointer transition-colors hover:bg-indigo-50/50 dark:hover:bg-slate-800/70 flex flex-col touch-manipulation {isSelected ? 'bg-indigo-50/30 dark:bg-indigo-950/30' : ''}"
        >
            {#if day.apps.length === 0}
                <div class="text-[10px] text-slate-400 text-center my-auto hidden sm:block">Keine Termine</div>
            {:else}
                <div class="flex flex-col gap-1.5 w-full">
                    {#each day.apps as app}
                        <button
                            type="button"
                            onclick={(e) => { e.stopPropagation(); onSelectAppointment(app); }}
                            class="w-full text-left p-1.5 rounded-lg border bg-indigo-50 dark:bg-indigo-950/60 border-indigo-100 dark:border-indigo-800/50 text-indigo-900 dark:text-indigo-200 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 transition-all shadow-2xs cursor-pointer active:scale-95 touch-manipulation min-h-[44px]"
                        >
                            <div class="font-bold text-[10px] text-indigo-700 dark:text-indigo-300">{formatTime(app.appointment)} Uhr</div>
                            <div class="text-[10px] font-semibold truncate mt-0.5 leading-tight">{app.description || app.title || 'Termin'}</div>
                        </button>
                    {/each}
                </div>
            {/if}
        </div>
    {/each}
</div>
