<script lang="ts">
    import { WEEKDAYS, isSameDay, formatTime } from "./portalCalendarHelpers";

    interface Props {
        calendarDays: any[];
        selectedDate: Date;
        onSelectDay: (date: Date) => void;
        onSelectAppointment: (app: any) => void;
    }

    let { calendarDays, selectedDate, onSelectDay, onSelectAppointment }: Props = $props();
</script>

<!-- Wochentage Leiste -->
<div class="grid grid-cols-7 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/70">
    {#each WEEKDAYS as day}
        <div class="py-2 sm:py-2.5 text-center text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {day}
        </div>
    {/each}
</div>

<!-- Tage Raster -->
<div class="grid grid-cols-7 auto-rows-fr bg-slate-200 dark:bg-slate-800 gap-px border-b border-slate-200/80 dark:border-slate-800">
    {#each calendarDays as day}
        {@const isToday = isSameDay(day.date, new Date())}
        {@const isSelected = isSameDay(day.date, selectedDate)}
        <div
            role="button"
            tabindex="0"
            onclick={() => onSelectDay(day.date)}
            onkeydown={(e) => { if (e.key === 'Enter') onSelectDay(day.date); }}
            class="bg-white dark:bg-slate-900 min-h-[58px] sm:min-h-[75px] md:min-h-[96px] p-1 sm:p-2 cursor-pointer transition-colors hover:bg-indigo-50/50 dark:hover:bg-slate-800/70 flex flex-col relative touch-manipulation {isSelected ? 'ring-2 ring-inset ring-indigo-500 z-10 bg-indigo-50/30 dark:bg-indigo-950/30' : ''} {!day.isCurrentMonth ? 'opacity-35 bg-slate-50/50 dark:bg-slate-900/40' : ''}"
        >
            <div class="flex justify-between items-center w-full">
                <span class="w-6 h-6 sm:w-7 sm:h-7 mx-auto sm:mx-0 sm:ml-auto flex items-center justify-center text-[11px] sm:text-xs font-bold rounded-full transition-transform active:scale-90 {isToday ? 'bg-indigo-600 text-white shadow-xs' : (isSelected ? 'text-indigo-600 dark:text-indigo-400 font-black' : 'text-slate-800 dark:text-slate-200')}">
                    {day.date.getDate()}
                </span>
            </div>

            <!-- Mobile Dots -->
            <div class="flex md:hidden flex-row justify-center items-center gap-1 mt-1 sm:mt-1.5 flex-wrap">
                {#each day.apps.slice(0, 3) as app}
                    <span 
                        class="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-indigo-600 dark:bg-indigo-400 shadow-2xs shrink-0" 
                        title="{formatTime(app.appointment)} - {app.description || 'Termin'}">
                    </span>
                {/each}
                {#if day.apps.length > 3}
                    <span class="text-[8px] font-extrabold text-indigo-600 dark:text-indigo-400 leading-none">
                        +{day.apps.length - 3}
                    </span>
                {/if}
            </div>

            <!-- Desktop Termin-Pills -->
            <div class="hidden md:flex flex-col gap-1 mt-1.5 flex-1">
                {#each day.apps as app}
                    <button
                        type="button"
                        onclick={(e) => { e.stopPropagation(); onSelectAppointment(app); }}
                        class="w-full text-left px-1.5 py-1 rounded-md border bg-indigo-50 dark:bg-indigo-950/60 border-indigo-100 dark:border-indigo-800/50 text-indigo-900 dark:text-indigo-200 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 transition-colors shadow-2xs truncate cursor-pointer touch-manipulation min-h-[28px]"
                        title="{formatTime(app.appointment)} - {app.description || 'Termin'}"
                    >
                        <span class="font-bold text-[9px] mr-1">{formatTime(app.appointment)}</span>
                        <span class="text-[10px] font-semibold truncate">{app.description || app.title || 'Termin'}</span>
                    </button>
                {/each}
            </div>
        </div>
    {/each}
</div>
