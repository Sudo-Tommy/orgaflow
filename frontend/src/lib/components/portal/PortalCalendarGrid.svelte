<script lang="ts">
    import { ChevronLeft, ChevronRight, Lock } from "lucide-svelte";

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

<div class="bg-white p-4 sm:p-8 rounded-3xl border border-neutral-100 shadow-xl overflow-hidden">
    <!-- Kalender Toolbar -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h3 class="text-lg font-black text-neutral-900 hidden sm:block">Kalenderübersicht</h3>
        <div class="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
            <button onclick={today} class="px-5 min-h-12 text-sm font-bold text-neutral-600 bg-neutral-50 hover:bg-neutral-100 rounded-2xl transition-colors shrink-0 border border-neutral-200 shadow-sm active:scale-95 focus-visible:ring-2 focus-visible:ring-brand-500 outline-none">Heute</button>
            <div class="flex items-center bg-neutral-50 border border-neutral-200 rounded-2xl p-1 shadow-sm shrink-0">
                <button onclick={prevMonth} class="w-10 h-10 flex items-center justify-center text-neutral-500 hover:text-brand-600 hover:bg-white rounded-xl transition-colors shadow-sm focus-visible:ring-2 focus-visible:ring-brand-500 outline-none" aria-label="Vorheriger Monat">
                    <ChevronLeft class="w-5 h-5" />
                </button>
                <span class="w-32 text-center font-black text-neutral-800 text-sm tracking-wide">{monthName} {year}</span>
                <button onclick={nextMonth} class="w-10 h-10 flex items-center justify-center text-neutral-500 hover:text-brand-600 hover:bg-white rounded-xl transition-colors shadow-sm focus-visible:ring-2 focus-visible:ring-brand-500 outline-none" aria-label="Nächster Monat">
                    <ChevronRight class="w-5 h-5" />
                </button>
            </div>
        </div>
    </div>

    <!-- Kalender Grid -->
    <div class="grid grid-cols-7 border-b border-neutral-100 mb-2">
        {#each weekdays as day}
            <div class="py-3 text-center text-[10px] sm:text-xs font-black text-neutral-400 uppercase tracking-widest">{day}</div>
        {/each}
    </div>

    <div class="grid grid-cols-7 gap-1.5 sm:gap-2.5">
        {#each calendarDays as day}
            <div class="flex flex-col min-h-24 sm:min-h-32 lg:min-h-36 rounded-2xl sm:rounded-3xl p-1.5 sm:p-2.5 border transition-colors {isSameDay(day.date, new Date()) ? 'bg-brand-50/50 border-brand-200 shadow-inner' : 'bg-white border-neutral-100'} {!day.isCurrentMonth ? 'opacity-40 bg-neutral-50' : ''}">
                <div class="flex justify-end w-full mb-1 sm:mb-2">
                    <span class="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center text-[10px] sm:text-xs font-black rounded-full {isSameDay(day.date, new Date()) ? 'bg-brand-600 text-white shadow-md' : 'text-neutral-500'}">
                        {day.date.getDate()}
                    </span>
                </div>
                
                <!-- Termin Chips (Nur Desktop) -->
                <div class="flex-col gap-1.5 flex-1 min-h-0 overflow-y-auto custom-scrollbar hidden md:flex">
                    {#each day.apps as app}
                        <button type="button" onclick={() => onSelectAppointment(app)} class="w-full text-left px-2.5 py-2 rounded-xl border shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 active:scale-95 focus-visible:ring-2 focus-visible:ring-brand-500 outline-none {app.is_private ? 'bg-rose-50 border-rose-100 text-rose-800' : 'bg-indigo-50 border-indigo-100 text-indigo-800'}" title={app.description}>
                            <div class="flex items-center gap-1.5 mb-1">
                                <span class="font-black text-[10px]">{new Date(app.appointment).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</span>
                                {#if app.is_private}<Lock class="w-3 h-3 opacity-70" />{/if}
                            </div>
                            <div class="text-[10px] font-semibold truncate leading-tight opacity-90">{app.description || 'Termin'}</div>
                        </button>
                    {/each}
                </div>
                
                <!-- Mobile Dots (Nur Mobile) -->
                <div class="flex md:hidden flex-wrap gap-1.5 justify-center mt-auto pb-1">
                    {#each day.apps.slice(0, 4) as app}
                        <button type="button" onclick={() => onSelectAppointment(app)} class="w-2.5 h-2.5 rounded-full shadow-sm transition-transform active:scale-150 {app.is_private ? 'bg-rose-500' : 'bg-indigo-500'}" title={app.description}></button>
                    {/each}
                    {#if day.apps.length > 4}
                        <span class="text-[9px] font-black text-neutral-400 pt-px">+{day.apps.length - 4}</span>
                    {/if}
                </div>
            </div>
        {/each}
    </div>
</div>
