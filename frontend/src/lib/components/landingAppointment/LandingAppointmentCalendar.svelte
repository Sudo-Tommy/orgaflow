<script lang="ts">
    import { MapPin, Calendar } from "lucide-svelte";
    import { sortAlphabetical } from "$lib/utils/sortHelper";

    let { modalState } = $props<{ modalState: any }>();

    let sortedCompanies = $derived.by(() => {
        return sortAlphabetical(modalState.companies || [], (c: any) => `${c.city || ''} ${c.name || ''}`);
    });
</script>

<div class="space-y-5">
    <!-- 1. Standort / Betreuungsregion -->
    <div class="p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 shadow-xs">
        <div class="flex items-center justify-between mb-2">
            <label for="req-company" class="block text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <MapPin class="w-4 h-4 text-brand-600 dark:text-brand-400" />
                <span>1. Betreuungsstandort *</span>
            </label>
            {#if modalState.isFixedCompany}
                <span class="text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                    Zugewiesen
                </span>
            {/if}
        </div>
        <p class="text-xs text-slate-500 dark:text-slate-400 mb-3">
            {modalState.isFixedCompany ? "Ihr fester Betreuungsstandort ist automatisch hinterlegt." : "Bitte wählen Sie Ihre Region, um verfügbare Tage zu laden."}
        </p>
        <select
            id="req-company"
            bind:value={modalState.company_id}
            class="orga-input-clear bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 cursor-pointer w-full text-sm font-semibold shadow-xs min-h-[44px]"
            required
            disabled={modalState.isLoading || modalState.isFixedCompany}
        >
            {#each sortedCompanies as comp (comp.id)}
                <option value={comp.id}>{comp.city} {comp.name ? `(${comp.name})` : ""}</option>
            {/each}
        </select>
    </div>

    <!-- 2. Wunschdatum & Monatskalender -->
    <div class="p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 shadow-xs">
        <div class="flex items-center justify-between mb-4">
            <h3 class="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Calendar class="w-4 h-4 text-brand-600 dark:text-brand-400" />
                <span>2. Wunschdatum *</span>
            </h3>
            <div class="flex items-center gap-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-1 shadow-xs">
                <button
                    type="button"
                    onclick={() => modalState.prevMonth()}
                    class="w-8 h-8 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-300 font-bold transition-colors cursor-pointer"
                    aria-label="Vorheriger Monat"
                >◀</button>
                <span class="text-xs font-bold text-slate-900 dark:text-slate-100 w-20 sm:w-24 text-center">
                    {modalState.currentDate.toLocaleString("de-DE", { month: "short", year: "numeric" })}
                </span>
                <button
                    type="button"
                    onclick={() => modalState.nextMonth()}
                    class="w-8 h-8 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-300 font-bold transition-colors cursor-pointer"
                    aria-label="Nächster Monat"
                >▶</button>
            </div>
        </div>

        <div class="grid grid-cols-7 gap-1 text-center mb-2">
            {#each ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"] as day}
                <div class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider py-1">
                    {day}
                </div>
            {/each}
        </div>

        <div class="grid grid-cols-7 gap-1 sm:gap-1.5">
            {#each modalState.calendarDays as day}
                {@const isPast = day.date.getTime() < new Date().setHours(0, 0, 0, 0)}
                {@const dateStr = new Date(day.date.getTime() - day.date.getTimezoneOffset() * 60000).toISOString().split("T")[0]}
                {@const isOccupied = modalState.occupiedDates.includes(dateStr)}
                {@const dayTimes = modalState.occupiedTimesByDate[dateStr] || []}
                {@const isSelected = modalState.selectedDate && day.date.getTime() === modalState.selectedDate.getTime()}
                <button
                    type="button"
                    disabled={isPast || isOccupied}
                    onclick={() => (modalState.selectedDate = day.date)}
                    class="aspect-square min-h-[44px] flex flex-col items-center justify-start pt-1 sm:pt-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all border shadow-xs {isPast
                        ? 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-600'
                        : isOccupied
                          ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-400 dark:text-rose-300 border-rose-200/60 dark:border-rose-900/40 cursor-not-allowed'
                          : 'bg-white dark:bg-slate-800 cursor-pointer hover:bg-amber-50 dark:hover:bg-slate-700 hover:text-amber-800 dark:hover:text-amber-300 hover:border-amber-300 dark:hover:border-slate-600 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700'} {!day.isCurrentMonth && !isOccupied && !isPast ? 'opacity-50 text-slate-400' : ''} {isSelected && !isOccupied && !isPast ? 'bg-amber-600! dark:bg-amber-600! text-white! border-amber-700! dark:border-amber-500! shadow-md scale-105 ring-2 ring-amber-500/30' : ''}"
                >
                    <span class={isOccupied ? "line-through decoration-rose-400 decoration-2" : ""}>{day.date.getDate()}</span>
                    {#if isOccupied}
                        <span class="text-[7px] sm:text-[8px] font-black uppercase tracking-normal mt-0.5 text-rose-500 dark:text-rose-400 truncate max-w-full px-0.5 leading-none">Belegt</span>
                    {:else if dayTimes.length > 0 && !isPast}
                        <div class="flex flex-col gap-px mt-0.5 items-center w-full px-0">
                            {#each dayTimes.slice(0, 2) as t}
                                <span class="text-[7px] sm:text-[8px] leading-tight font-bold line-through {isSelected ? 'text-amber-100 decoration-amber-100' : 'text-rose-500 dark:text-rose-400 decoration-rose-500 opacity-70'}">{t}</span>
                            {/each}
                            {#if dayTimes.length > 2}
                                <span class="text-[7px] sm:text-[8px] leading-tight font-bold {isSelected ? 'text-amber-100' : 'text-rose-500 dark:text-rose-400'}">...</span>
                            {/if}
                        </div>
                    {/if}
                </button>
            {/each}
        </div>

        <!-- Tages-Detailinfo -->
        {#if modalState.selectedDate}
            {@const selDateStr = new Date(modalState.selectedDate.getTime() - modalState.selectedDate.getTimezoneOffset() * 60000).toISOString().split("T")[0]}
            {@const selTimes = modalState.occupiedTimesByDate[selDateStr] || []}
            <div class="mt-5 border-t border-slate-200 dark:border-slate-700/80 pt-4 animate-enter">
                <h4 class="font-bold text-slate-900 dark:text-white text-xs sm:text-sm mb-2 flex items-center gap-1.5">
                    <span>📅</span> Gewählt: {modalState.selectedDate.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "long", year: "numeric" })}
                </h4>
                {#if selTimes.length > 0}
                    <div class="bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-900/60 rounded-xl p-3 shadow-xs">
                        <p class="text-xs font-bold text-rose-800 dark:text-rose-300 mb-2">Bereits vergebene Zeiten:</p>
                        <div class="flex flex-wrap gap-1.5">
                            {#each selTimes as t}
                                <span class="text-xs font-bold bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-800 px-2.5 py-1 rounded-lg shadow-xs line-through opacity-80">{t} Uhr</span>
                            {/each}
                        </div>
                        <p class="text-[11px] text-rose-700 dark:text-rose-300 mt-2.5 font-medium leading-tight">
                            💡 Wählen Sie nach Möglichkeit eine Wunsch-Uhrzeit außerhalb der belegten Zeiten.
                        </p>
                    </div>
                {:else}
                    <div class="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-900/50 rounded-xl p-3 shadow-xs flex items-center gap-2.5">
                        <span class="text-xl">✨</span>
                        <div>
                            <p class="text-xs font-bold text-emerald-800 dark:text-emerald-300">Ganztägig verfügbar</p>
                            <p class="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Buchen Sie völlig frei Ihre gewünschte Uhrzeit.</p>
                        </div>
                    </div>
                {/if}
            </div>
        {/if}
    </div>
</div>
