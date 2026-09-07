<script lang="ts">
    import { ChevronLeft, ChevronRight } from "lucide-svelte";

    let { visibleAppointments, onSelectAppointment } = $props<{
        visibleAppointments: any[];
        onSelectAppointment: (app: any) => void;
    }>();

    let currentDate = $state(new Date());
    const weekdays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

    function isSameDay(d1: Date, d2: Date) {
        return d1.getDate() === d2.getDate() && d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear();
    }

    function getAppsForDate(date: Date): any[] {
        return visibleAppointments.filter((app: any) => {
            if (!app.appointment) return false;
            if (app.is_private === true || app.is_visible === false) return false;
            return isSameDay(new Date(app.appointment), date);
        }).sort((a: any, b: any) => new Date(a.appointment).getTime() - new Date(b.appointment).getTime());
    }

    let calendarDays = $derived.by(() => {
        const y = currentDate.getFullYear();
        const m = currentDate.getMonth();
        const days = [];

        const firstDay = new Date(y, m, 1);
        let startDay = firstDay.getDay() || 7; 
        startDay -= 1; 

        const prevMonthLastDay = new Date(y, m, 0).getDate();
        for (let i = startDay - 1; i >= 0; i--) {
            const d = new Date(y, m - 1, prevMonthLastDay - i);
            days.push({ date: d, isCurrentMonth: false, apps: getAppsForDate(d) });
        }
        const lastDay = new Date(y, m + 1, 0).getDate();
        for (let i = 1; i <= lastDay; i++) {
            const d = new Date(y, m, i);
            days.push({ date: d, isCurrentMonth: true, apps: getAppsForDate(d) });
        }
        const remaining = 42 - days.length; 
        for (let i = 1; i <= remaining; i++) {
            const d = new Date(y, m + 1, i);
            days.push({ date: d, isCurrentMonth: false, apps: getAppsForDate(d) });
        }
        return days;
    });

    function nextMonth() { currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1); }
    function prevMonth() { currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1); }
    function today() { currentDate = new Date(); }

    let monthName = $derived(currentDate.toLocaleString('de-DE', { month: 'long' }));
    let year = $derived(currentDate.getFullYear());
</script>

<div class="bg-white dark:bg-slate-900 p-4 sm:p-8 rounded-3xl border border-neutral-100 dark:border-slate-800 shadow-xl overflow-hidden">
    <!-- Kalender Toolbar -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h3 class="text-lg font-black text-neutral-900 dark:text-white hidden sm:block">Kalenderübersicht</h3>
        <div class="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
            <button onclick={today} class="px-5 min-h-[44px] text-sm font-bold text-neutral-600 dark:text-slate-200 bg-neutral-50 dark:bg-slate-800 hover:bg-neutral-100 dark:hover:bg-slate-700 rounded-2xl transition-colors shrink-0 border border-neutral-200 dark:border-slate-700 shadow-sm active:scale-95 focus-visible:ring-2 focus-visible:ring-brand-500 outline-none cursor-pointer">Heute</button>
            <div class="flex items-center bg-neutral-50 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-2xl p-1 shadow-sm shrink-0">
                <button onclick={prevMonth} class="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center text-neutral-500 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-colors shadow-sm focus-visible:ring-2 focus-visible:ring-brand-500 outline-none cursor-pointer" aria-label="Vorheriger Monat">
                    <ChevronLeft class="w-5 h-5" />
                </button>
                <span class="w-32 text-center font-black text-neutral-800 dark:text-slate-100 text-sm tracking-wide">{monthName} {year}</span>
                <button onclick={nextMonth} class="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center text-neutral-500 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-colors shadow-sm focus-visible:ring-2 focus-visible:ring-brand-500 outline-none cursor-pointer" aria-label="Nächster Monat">
                    <ChevronRight class="w-5 h-5" />
                </button>
            </div>
        </div>
    </div>

    <!-- Wochentage -->
    <div class="grid grid-cols-7 gap-1 sm:gap-2 mb-2 text-center">
        {#each weekdays as day}
            <span class="text-xs font-black uppercase tracking-wider text-neutral-400 dark:text-slate-400 py-1">{day}</span>
        {/each}
    </div>

    <!-- Tage Grid -->
    <div class="grid grid-cols-7 gap-1 sm:gap-2 auto-rows-fr">
        {#each calendarDays as day}
            <div class="min-h-20 sm:min-h-28 p-1 sm:p-2.5 rounded-2xl border transition-colors flex flex-col {day.isCurrentMonth ? 'bg-white dark:bg-slate-800/80 border-neutral-100 dark:border-slate-700/60 hover:border-neutral-200 dark:hover:border-slate-600 shadow-xs' : 'bg-neutral-50/50 dark:bg-slate-950/40 border-transparent opacity-35'}">
                <div class="flex justify-between items-center mb-1">
                    <span class="text-xs sm:text-sm font-black {isSameDay(day.date, new Date()) ? 'w-6 h-6 sm:w-7 sm:h-7 bg-brand-600 text-white rounded-full flex items-center justify-center shadow-md shadow-brand-600/30' : 'text-neutral-700 dark:text-slate-200'}">
                        {day.date.getDate()}
                    </span>
                </div>
                
                <!-- Termin Chips (Nur Desktop) -->
                <div class="flex-col gap-1.5 flex-1 min-h-0 overflow-y-auto custom-scrollbar hidden md:flex">
                    {#each day.apps as app}
                        <button type="button" onclick={() => onSelectAppointment(app)} class="w-full text-left px-2.5 py-2 rounded-xl border shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 active:scale-95 focus-visible:ring-2 focus-visible:ring-brand-500 outline-none bg-indigo-50 dark:bg-indigo-950/60 border-indigo-100 dark:border-indigo-800/50 text-indigo-800 dark:text-indigo-200 cursor-pointer" title={app.description}>
                            <div class="flex items-center gap-1.5 mb-1">
                                <span class="font-black text-[10px]">{new Date(app.appointment).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <div class="text-[10px] font-semibold truncate leading-tight opacity-90">{app.description || 'Termin'}</div>
                        </button>
                    {/each}
                </div>
                
                <!-- Mobile Dots (Nur Mobile) -->
                <div class="flex md:hidden flex-wrap gap-1.5 justify-center mt-auto pb-1">
                    {#each day.apps.slice(0, 4) as app}
                        <button type="button" onclick={() => onSelectAppointment(app)} class="w-3.5 h-3.5 rounded-full shadow-sm transition-transform active:scale-150 bg-indigo-500 cursor-pointer" title={app.description}></button>
                    {/each}
                    {#if day.apps.length > 4}
                        <span class="text-[9px] font-black text-neutral-400 dark:text-slate-400 pt-px">+{day.apps.length - 4}</span>
                    {/if}
                </div>
            </div>
        {/each}
    </div>
</div>
