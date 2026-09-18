<script lang="ts">
    import type { BudgetTimeFilter } from '$lib/types/budget';
    import {
        ChevronLeft,
        ChevronRight,
        CalendarDays
    } from 'lucide-svelte';

    let {
        selectedYear = $bindable(),
        selectedMonth = $bindable(),
        timeFilter = $bindable(),
        availableYears,
        monthsWithData,
        monthsWithUnpaid,
        onPrevMonth,
        onNextMonth,
        onGoToday,
        onSetMonth
    } = $props<{
        selectedYear: number;
        selectedMonth: number;
        timeFilter: BudgetTimeFilter;
        availableYears: number[];
        monthsWithData: Set<number>;
        monthsWithUnpaid: Set<number>;
        onPrevMonth: () => void;
        onNextMonth: () => void;
        onGoToday: () => void;
        onSetMonth: (m: number) => void;
    }>();

    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;

    // Einheitliche Monatsbezeichnungen ohne länderspezifische Formatierungs-Überraschungen
    const monthShortNames = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
    const monthFullNames = [
        'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
        'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
    ];

    // Menschenlesbare Bezeichnung des ausgewählten Monats
    let selectedMonthName = $derived(
        monthFullNames[selectedMonth - 1] || new Date(selectedYear, selectedMonth - 1, 1).toLocaleString('de-DE', { month: 'long' })
    );

    // Mobiler Auto-Scroll für die horizontale Monatsleiste
    let monthPillsContainer = $state<HTMLElement | null>(null);

    function scrollToSelectedMonth() {
        if (!monthPillsContainer) return;
        const activeBtn = monthPillsContainer.querySelector(`[data-month="${selectedMonth}"]`) as HTMLElement;
        if (activeBtn) {
            activeBtn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }
    }

    $effect(() => {
        if (selectedMonth && monthPillsContainer) {
            scrollToSelectedMonth();
        }
    });
</script>

<div class="rounded-2xl border border-slate-200/90 bg-white p-3 sm:p-4.5 shadow-xs dark:border-slate-800 dark:bg-slate-900/95 space-y-3">
    <!-- Obere Steuerungszeile: Monat ◀ ▶, Jahr, Heute, Ansichtsmodi -->
    <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <!-- Links: Monats-Navigator mit ◀, Aktueller Monat Label, ▶ -->
        <div class="flex items-center justify-between sm:justify-start gap-1 bg-slate-100/90 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs">
            <button
                type="button"
                onclick={onPrevMonth}
                class="min-h-[42px] min-w-[42px] flex items-center justify-center rounded-xl text-slate-600 hover:text-indigo-600 hover:bg-white active:scale-95 transition-all dark:text-slate-300 dark:hover:bg-slate-700 cursor-pointer"
                title="Vorheriger Monat"
            >
                <ChevronLeft class="h-5 w-5" />
            </button>

            <!-- Aktiver Monat & Jahr Anzeige -->
            <div class="flex items-center gap-2 px-2 sm:px-3 py-1">
                <CalendarDays class="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span class="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100 min-w-[130px] sm:min-w-[160px] text-center tracking-tight">
                    {selectedMonthName} {selectedYear}
                </span>
            </div>

            <button
                type="button"
                onclick={onNextMonth}
                class="min-h-[42px] min-w-[42px] flex items-center justify-center rounded-xl text-slate-600 hover:text-indigo-600 hover:bg-white active:scale-95 transition-all dark:text-slate-300 dark:hover:bg-slate-700 cursor-pointer"
                title="Nächster Monat"
            >
                <ChevronRight class="h-5 w-5" />
            </button>

            <!-- Schnelltaste "Heute" -->
            <button
                type="button"
                onclick={onGoToday}
                class="min-h-[42px] px-3.5 rounded-xl text-xs font-bold text-indigo-600 hover:bg-white hover:shadow-xs transition-all dark:text-indigo-400 dark:hover:bg-slate-700 ml-1 cursor-pointer whitespace-nowrap"
                title="Zum heutigen Monat springen"
            >
                Heute
            </button>
        </div>

        <!-- Rechts: Jahr-Dropdown & Zeit-Modi -->
        <div class="flex flex-wrap items-center justify-between sm:justify-end gap-2">
            <!-- Jahr-Auswahl -->
            <div class="relative">
                <select
                    bind:value={selectedYear}
                    onchange={() => { timeFilter = 'month'; }}
                    aria-label="Haushaltsjahr auswählen"
                    class="min-h-[42px] rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-bold text-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer shadow-xs"
                >
                    {#each availableYears as yr}
                        <option value={yr}>Jahr {yr}</option>
                    {/each}
                </select>
            </div>

            <!-- Zeitraum-Umschalter: Dieser Monat | Letzter Monat | Quartal | Jahr -->
            <div class="inline-flex rounded-xl bg-slate-100/90 p-1 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/70 shadow-xs">
                <button
                    type="button"
                    onclick={() => {
                        timeFilter = 'this_month';
                        const now = new Date();
                        selectedYear = now.getFullYear();
                        selectedMonth = now.getMonth() + 1;
                    }}
                    class="min-h-[38px] px-3 py-1 text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap {timeFilter === 'this_month' || (timeFilter === 'month' && selectedYear === currentYear && selectedMonth === currentMonth)
                        ? 'bg-white text-indigo-600 shadow-xs dark:bg-slate-900 dark:text-indigo-400 font-bold'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'}"
                >
                    Dieser Monat
                </button>
                <button
                    type="button"
                    onclick={() => {
                        timeFilter = 'last_month';
                        const now = new Date();
                        let y = now.getFullYear();
                        let m = now.getMonth();
                        if (m === 0) { m = 12; y--; }
                        selectedYear = y;
                        selectedMonth = m;
                    }}
                    class="min-h-[38px] px-3 py-1 text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap {timeFilter === 'last_month'
                        ? 'bg-white text-indigo-600 shadow-xs dark:bg-slate-900 dark:text-indigo-400 font-bold'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'}"
                >
                    Letzter Monat
                </button>
                <button
                    type="button"
                    onclick={() => (timeFilter = 'quarter')}
                    class="min-h-[38px] px-3 py-1 text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap {timeFilter === 'quarter'
                        ? 'bg-white text-indigo-600 shadow-xs dark:bg-slate-900 dark:text-indigo-400 font-bold'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'}"
                >
                    Quartal
                </button>
                <button
                    type="button"
                    onclick={() => (timeFilter = 'year')}
                    class="min-h-[38px] px-3 py-1 text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap {timeFilter === 'year'
                        ? 'bg-white text-indigo-600 shadow-xs dark:bg-slate-900 dark:text-indigo-400 font-bold'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'}"
                >
                    Jahr
                </button>
            </div>
        </div>
    </div>

    <!-- Untere Leiste: Die 12 Monate Jan - Dez als großzügige Klick-Pills (auf Desktop immer vollständig im 12-Spalten-Grid sichtbar, auf Mobilgeräten sauber horizontal scrollend ohne Abschneiden) -->
    <div
        bind:this={monthPillsContainer}
        class="flex md:grid md:grid-cols-12 items-center gap-1.5 lg:gap-2 overflow-x-auto md:overflow-visible py-2 px-1 sm:px-1.5 -mx-1 sm:mx-0 no-scrollbar scroll-smooth touch-pan-x snap-x"
    >
        {#each Array.from({ length: 12 }) as _, i}
            {@const mNum = i + 1}
            {@const mName = monthShortNames[i]}
            {@const mFullName = monthFullNames[i]}
            {@const isSelected = (timeFilter === 'month' || timeFilter === 'this_month') && selectedMonth === mNum}
            {@const isCurrentCalendarMonth = selectedYear === currentYear && mNum === currentMonth}
            {@const hasData = monthsWithData.has(mNum)}
            {@const hasUnpaid = monthsWithUnpaid.has(mNum)}
            <button
                type="button"
                data-month={mNum}
                onclick={() => onSetMonth(mNum)}
                title={hasUnpaid ? `Achtung: Im ${mFullName} existieren noch unbezahlte Posten / Raten!` : (hasData ? `Buchungen im ${mFullName} vorhanden` : `Monat ${mFullName}`)}
                class="relative min-h-[52px] sm:min-h-[56px] min-w-[62px] md:min-w-0 md:w-full shrink-0 md:shrink flex flex-col items-center justify-center rounded-2xl px-2 py-2 transition-all duration-150 active:scale-95 touch-manipulation snap-center cursor-pointer {isSelected
                    ? 'bg-gradient-to-b from-indigo-600 to-indigo-700 text-white font-bold shadow-md shadow-indigo-500/25 ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-900 scale-[1.02] z-10'
                    : hasUnpaid
                    ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 dark:text-amber-200 border border-amber-500/30 hover:border-amber-500/50 shadow-2xs'
                    : hasData
                    ? 'bg-slate-100/90 hover:bg-indigo-50/70 text-slate-800 hover:text-indigo-600 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:bg-slate-700/80 border border-slate-200/60 dark:border-slate-700/60 shadow-2xs'
                    : 'bg-slate-50/70 hover:bg-slate-100 text-slate-400 hover:text-slate-600 dark:bg-slate-800/40 dark:text-slate-500 dark:hover:bg-slate-800/70 border border-transparent'}"
            >
                <span class="text-xs sm:text-sm font-bold tracking-tight leading-tight">{mName}</span>
                <span class="text-[10px] sm:text-[11px] font-semibold leading-none mt-1 {isSelected ? 'text-indigo-100' : hasUnpaid ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-slate-400 dark:text-slate-500'}">
                    {mNum < 10 ? `0${mNum}` : mNum}
                </span>

                <!-- Indikatorpunkt: Bernstein/Rot für unbezahlte Rückstände, Blau für gebuchte Daten -->
                {#if hasUnpaid}
                    <span class="absolute top-1.5 right-1.5 flex h-2 w-2" title="Unbezahlte Raten/Buchungen!">
                        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span class="relative inline-flex rounded-full h-2 w-2 bg-amber-500 ring-2 ring-white dark:ring-slate-900"></span>
                    </span>
                {:else if hasData && !isSelected}
                    <span class="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-indigo-500/90 shadow-xs shadow-indigo-500/50" title="Buchungen vorhanden"></span>
                {/if}

                <!-- Feiner "Heute"-Marker wenn dieser Monat der reale Kalendermonat ist -->
                {#if isCurrentCalendarMonth && !isSelected}
                    <span class="absolute bottom-1 h-0.5 w-3 rounded-full bg-indigo-500/70" title="Aktueller Kalendermonat"></span>
                {/if}
            </button>
        {/each}
    </div>
</div>
