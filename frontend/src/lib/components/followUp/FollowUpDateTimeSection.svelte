<script lang="ts">
    import { getLocalDateString } from "./followUpHelpers";

    interface Props {
        targetDate: string;
        startTime: string;
        durationMinutes: number;
        endTime: string;
        sourceAppointment: any;
        collisionWarning: string | null;
    }

    let {
        targetDate = $bindable(),
        startTime = $bindable(),
        durationMinutes = $bindable(),
        endTime,
        sourceAppointment,
        collisionWarning
    }: Props = $props();

    function applyRhythm(daysOffset: number) {
        let base = sourceAppointment?.appointment ? new Date(sourceAppointment.appointment) : new Date();
        if (isNaN(base.getTime())) base = new Date();
        const next = new Date(base);
        next.setDate(next.getDate() + daysOffset);
        targetDate = getLocalDateString(next);
    }

    function applyTimeSlot(slotTime: string, duration?: number) {
        startTime = slotTime;
        if (duration) durationMinutes = duration;
    }

    function getOffsetDays(dateStr: string): number | null {
        if (!dateStr || !sourceAppointment?.appointment) return null;
        const diff = new Date(dateStr).getTime() - new Date(sourceAppointment.appointment).getTime();
        return Math.round(diff / 86400000);
    }

    const currentOffset = $derived(getOffsetDays(targetDate));
</script>

{#if collisionWarning}
    <div class="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-xs font-medium rounded-xl border border-amber-200 dark:border-amber-800 flex items-start gap-2 shadow-2xs">
        <span class="text-base leading-none">⚠️</span>
        <span>{collisionWarning}</span>
    </div>
{/if}

<!-- 1. Rhythmus / Datum wählen -->
<div>
    <span class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
        1. Rhythmus & Datum wählen
    </span>
    <div class="grid grid-cols-3 gap-2 mb-2.5">
        <button 
            type="button" 
            onclick={() => applyRhythm(7)}
            class="p-2.5 rounded-xl border text-xs font-bold text-center transition-all active:scale-95 flex flex-col items-center justify-center gap-0.5 shadow-2xs min-h-[44px] cursor-pointer {currentOffset === 7 ? 'bg-indigo-600 text-white border-indigo-600 shadow-indigo-600/30' : 'bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700'}"
        >
            <span>+1 Woche</span>
            <span class="text-[10px] font-normal opacity-80">Gleicher Tag</span>
        </button>
        <button 
            type="button" 
            onclick={() => applyRhythm(14)}
            class="p-2.5 rounded-xl border text-xs font-bold text-center transition-all active:scale-95 flex flex-col items-center justify-center gap-0.5 shadow-2xs min-h-[44px] cursor-pointer {currentOffset === 14 ? 'bg-indigo-600 text-white border-indigo-600 shadow-indigo-600/30' : 'bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700'}"
        >
            <span>+2 Wochen</span>
            <span class="text-[10px] font-normal opacity-80">14 Tage</span>
        </button>
        <button 
            type="button" 
            onclick={() => applyRhythm(21)}
            class="p-2.5 rounded-xl border text-xs font-bold text-center transition-all active:scale-95 flex flex-col items-center justify-center gap-0.5 shadow-2xs min-h-[44px] cursor-pointer {currentOffset === 21 ? 'bg-indigo-600 text-white border-indigo-600 shadow-indigo-600/30' : 'bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700'}"
        >
            <span>+3 Wochen</span>
            <span class="text-[10px] font-normal opacity-80">21 Tage</span>
        </button>
        <button 
            type="button" 
            onclick={() => applyRhythm(1)}
            class="p-2.5 rounded-xl border text-xs font-bold text-center transition-all active:scale-95 flex flex-col items-center justify-center gap-0.5 shadow-2xs min-h-[44px] cursor-pointer {currentOffset === 1 ? 'bg-indigo-600 text-white border-indigo-600 shadow-indigo-600/30' : 'bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700'}"
        >
            <span>Morgen</span>
            <span class="text-[10px] font-normal opacity-80">+1 Tag</span>
        </button>
        <button 
            type="button" 
            onclick={() => applyRhythm(2)}
            class="p-2.5 rounded-xl border text-xs font-bold text-center transition-all active:scale-95 flex flex-col items-center justify-center gap-0.5 shadow-2xs min-h-[44px] cursor-pointer {currentOffset === 2 ? 'bg-indigo-600 text-white border-indigo-600 shadow-indigo-600/30' : 'bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700'}"
        >
            <span>In 2 Tagen</span>
            <span class="text-[10px] font-normal opacity-80">+2 Tage</span>
        </button>
        <button 
            type="button" 
            onclick={() => applyRhythm(28)}
            class="p-2.5 rounded-xl border text-xs font-bold text-center transition-all active:scale-95 flex flex-col items-center justify-center gap-0.5 shadow-2xs min-h-[44px] cursor-pointer {currentOffset === 28 ? 'bg-indigo-600 text-white border-indigo-600 shadow-indigo-600/30' : 'bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700'}"
        >
            <span>In 4 Wochen</span>
            <span class="text-[10px] font-normal opacity-80">28 Tage</span>
        </button>
    </div>
    <div class="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 p-2.5 sm:p-3 rounded-xl border border-slate-200 dark:border-slate-700 min-h-[44px]">
        <span class="text-base shrink-0">📅</span>
        <input 
            type="date" 
            aria-label="Folgetermin Datum"
            bind:value={targetDate} 
            class="bg-transparent text-sm font-bold text-slate-900 dark:text-slate-100 w-full outline-none cursor-pointer"
        />
    </div>
</div>

<!-- 2. Startzeit & Zeitfenster -->
<div>
    <span class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
        2. Zeitfenster & Uhrzeit
    </span>
    <div class="grid grid-cols-3 gap-2 mb-2.5">
        <button 
            type="button" 
            onclick={() => applyTimeSlot("09:00", 180)}
            class="py-2 px-2.5 rounded-xl border text-xs font-bold transition-all active:scale-95 min-h-[42px] cursor-pointer {startTime === '09:00' && durationMinutes === 180 ? 'bg-indigo-600 text-white border-indigo-600 shadow-indigo-600/30' : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'}"
        >
            Vormittags (09-12)
        </button>
        <button 
            type="button" 
            onclick={() => applyTimeSlot("14:00", 180)}
            class="py-2 px-2.5 rounded-xl border text-xs font-bold transition-all active:scale-95 min-h-[42px] cursor-pointer {startTime === '14:00' && durationMinutes === 180 ? 'bg-indigo-600 text-white border-indigo-600 shadow-indigo-600/30' : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'}"
        >
            Nachmittags (14-17)
        </button>
        <button 
            type="button" 
            onclick={() => applyTimeSlot("11:00", 90)}
            class="py-2 px-2.5 rounded-xl border text-xs font-bold transition-all active:scale-95 min-h-[42px] cursor-pointer {startTime === '11:00' && durationMinutes === 90 ? 'bg-indigo-600 text-white border-indigo-600 shadow-indigo-600/30' : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'}"
        >
            Mittags (11-12:30)
        </button>
    </div>

    <div class="grid grid-cols-2 gap-3 mb-2.5">
        <div>
            <span class="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase block mb-1">Startzeit</span>
            <input 
                type="time" 
                aria-label="Startzeit"
                bind:value={startTime} 
                class="orga-input-clear min-h-[44px] text-sm font-bold"
            />
        </div>
        <div>
            <span class="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase block mb-1">Berechnetes Ende</span>
            <div class="p-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 flex items-center justify-between min-h-[44px]">
                <span>{endTime} Uhr</span>
                <span class="text-xs font-normal text-slate-400">({durationMinutes / 60} Std.)</span>
            </div>
        </div>
    </div>

    <div class="flex items-center gap-1.5 flex-wrap">
        <span class="text-xs text-slate-500 dark:text-slate-400 font-medium mr-1">Dauer:</span>
        {#each [60, 90, 120, 180] as d}
            <button 
                type="button" 
                onclick={() => durationMinutes = d}
                class="px-3 py-1.5 rounded-xl text-xs font-bold transition-colors min-h-[36px] cursor-pointer {durationMinutes === d ? 'bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800 shadow-2xs' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'}"
            >
                {d / 60}h
            </button>
        {/each}
    </div>
</div>
