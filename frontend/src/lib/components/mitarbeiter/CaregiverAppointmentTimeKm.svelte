<script lang="ts">
    import { Clock, Car, Plus, Minus } from 'lucide-svelte';

    interface Props {
        durationMinutes: number;
        kilometers: number;
    }

    let { durationMinutes = $bindable(60), kilometers = $bindable(0) }: Props = $props();

    function adjustDuration(delta: number) {
        durationMinutes = Math.max(0, durationMinutes + delta);
    }

    function adjustKm(delta: number) {
        kilometers = Math.max(0, Math.round((kilometers + delta) * 10) / 10);
    }
</script>

<div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
    <!-- Dauer / Zeiterfassung -->
    <div class="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-2">
        <div class="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
            <span class="flex items-center gap-1.5">
                <Clock class="w-3.5 h-3.5 text-indigo-500" />
                <span>Einsatzdauer</span>
            </span>
            <span class="text-indigo-600 dark:text-indigo-400 font-extrabold">{durationMinutes} Min. ({Math.floor(durationMinutes / 60)}h {durationMinutes % 60}m)</span>
        </div>

        <div class="flex items-center gap-2">
            <button
                type="button"
                onclick={() => adjustDuration(-15)}
                class="min-h-11 min-w-11 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="15 Minuten weniger"
            >
                <Minus class="w-4 h-4" />
            </button>
            <input 
                type="number"
                min="0"
                step="5"
                bind:value={durationMinutes}
                class="w-full min-h-11 text-center font-bold text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
            />
            <button
                type="button"
                onclick={() => adjustDuration(15)}
                class="min-h-11 min-w-11 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="15 Minuten mehr"
            >
                <Plus class="w-4 h-4" />
            </button>
        </div>

        <!-- Schnellwahl-Buttons -->
        <div class="flex items-center gap-1.5 flex-wrap pt-1">
            {#each [30, 45, 60, 90, 120] as mins}
                <button
                    type="button"
                    onclick={() => durationMinutes = mins}
                    class="min-h-8 px-2 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer {
                        durationMinutes === mins
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:bg-slate-100'
                    }"
                >
                    {mins}m
                </button>
            {/each}
        </div>
    </div>

    <!-- Fahrstrecke / Kilometer -->
    <div class="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-2">
        <div class="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
            <span class="flex items-center gap-1.5">
                <Car class="w-3.5 h-3.5 text-indigo-500" />
                <span>Fahrstrecke (Fahrtenbuch)</span>
            </span>
            <span class="text-indigo-600 dark:text-indigo-400 font-extrabold">{kilometers} km</span>
        </div>

        <div class="flex items-center gap-2">
            <button
                type="button"
                onclick={() => adjustKm(-1)}
                class="min-h-11 min-w-11 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="1 Kilometer weniger"
            >
                <Minus class="w-4 h-4" />
            </button>
            <input 
                type="number"
                min="0"
                step="0.5"
                bind:value={kilometers}
                class="w-full min-h-11 text-center font-bold text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
            />
            <button
                type="button"
                onclick={() => adjustKm(1)}
                class="min-h-11 min-w-11 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="1 Kilometer mehr"
            >
                <Plus class="w-4 h-4" />
            </button>
        </div>

        <!-- Schnellwahl km -->
        <div class="flex items-center gap-1.5 flex-wrap pt-1">
            {#each [0, 5, 10, 15, 25] as kmPreset}
                <button
                    type="button"
                    onclick={() => kilometers = kmPreset}
                    class="min-h-8 px-2 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer {
                        kilometers === kmPreset
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:bg-slate-100'
                    }"
                >
                    {kmPreset} km
                </button>
            {/each}
        </div>
    </div>
</div>
