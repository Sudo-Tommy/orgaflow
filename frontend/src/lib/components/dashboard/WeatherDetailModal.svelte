<script lang="ts">
    import { tick } from 'svelte';
    import { RefreshCw, CloudRain, Wind, Sun, CloudSun, Cloud, CloudSnow, CloudLightning, ArrowUp, ArrowDown } from 'lucide-svelte';
    import { fetchWeatherData, getWeatherDescription, type WeatherData } from '$lib/services/weatherService';

    let dialog = $state<HTMLDialogElement | null>(null);
    let isOpen = $state(false);
    let isRefreshing = $state(false);
    let weather = $state<WeatherData | null>(null);

    export function open(data: WeatherData | null) {
        weather = data;
        isOpen = true;
        tick().then(() => {
            if (dialog && !dialog.open) dialog.showModal();
        });
    }

    export function close() {
        isOpen = false;
        if (dialog?.open) dialog.close();
    }

    async function handleRefresh() {
        isRefreshing = true;
        try {
            weather = await fetchWeatherData(true);
        } finally {
            isRefreshing = false;
        }
    }
</script>

{#snippet weatherIcon(code: number, sizeClass = 'w-6 h-6')}
    {@const desc = getWeatherDescription(code)}
    {#if desc.iconType === 'sun'}
        <Sun class="{sizeClass} text-amber-500 animate-spin-slow" />
    {:else if desc.iconType === 'cloud-sun'}
        <CloudSun class="{sizeClass} text-amber-400" />
    {:else if desc.iconType === 'rain'}
        <CloudRain class="{sizeClass} text-cyan-400" />
    {:else if desc.iconType === 'snow'}
        <CloudSnow class="{sizeClass} text-sky-200" />
    {:else if desc.iconType === 'thunder'}
        <CloudLightning class="{sizeClass} text-purple-400" />
    {:else}
        <Cloud class="{sizeClass} text-slate-400" />
    {/if}
{/snippet}

<dialog
    bind:this={dialog}
    class="zero-inner-scroll-modal p-0 bg-transparent border-0 w-full max-w-xl rounded-3xl shadow-2xl backdrop:bg-neutral-900/60 backdrop:backdrop-blur-sm text-slate-900 dark:text-slate-100 my-4 sm:my-8 landscape:my-2 mx-auto z-50 outline-none"
    oncancel={(e) => { e.preventDefault(); close(); }}
    onclick={(e) => { if (e.target === dialog) close(); }}
>
    {#if isOpen && weather}
        <div class="bg-white dark:bg-slate-900 border border-neutral-100 dark:border-slate-800 rounded-3xl flex flex-col shadow-2xl overflow-hidden transition-colors">
            <!-- Header Bild-3-Design -->
            <div class="p-6 bg-gradient-to-r from-sky-500/10 via-indigo-500/5 to-transparent border-b border-neutral-100 dark:border-slate-800 flex items-start justify-between gap-4 shrink-0">
                <div class="flex items-center gap-3">
                    <div class="w-11 h-11 rounded-2xl bg-sky-600 text-white flex items-center justify-center shadow-lg shadow-sky-500/20 text-lg shrink-0">
                        🌤️
                    </div>
                    <div>
                        <div class="flex items-center gap-2">
                            <span class="text-[10px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-300 bg-sky-100/80 dark:bg-sky-950/60 px-2 py-0.5 rounded-md">
                                {weather.isDeviceLocation ? 'Geräte-GPS' : 'Zentrale'}
                            </span>
                            <span class="text-[10px] font-semibold text-neutral-400 dark:text-slate-400">
                                Touren-Wetter
                            </span>
                        </div>
                        <h3 class="text-lg font-bold text-neutral-900 dark:text-white mt-1 line-clamp-2">
                            {weather.locationName}
                        </h3>
                    </div>
                </div>
                <div class="flex items-center gap-1.5 shrink-0">
                    <button
                        type="button"
                        onclick={handleRefresh}
                        disabled={isRefreshing}
                        class="w-8 h-8 rounded-full bg-neutral-100 dark:bg-slate-800 hover:bg-neutral-200 dark:hover:bg-slate-700 text-neutral-600 dark:text-slate-300 flex items-center justify-center transition-colors text-sm cursor-pointer"
                        title="Wetterdaten jetzt aktualisieren"
                    >
                        <RefreshCw class="w-3.5 h-3.5 {isRefreshing ? 'animate-spin text-sky-600' : ''}" />
                    </button>
                    <button 
                        type="button" 
                        onclick={close} 
                        class="w-8 h-8 rounded-full bg-neutral-100 dark:bg-slate-800 hover:bg-neutral-200 dark:hover:bg-slate-700 text-neutral-500 dark:text-slate-300 flex items-center justify-center transition-colors text-sm cursor-pointer" 
                        title="Schließen"
                    >
                        ✕
                    </button>
                </div>
            </div>

            <!-- Body Bild-3-Design Kacheln -->
            <div class="p-6 space-y-4">
                <!-- Aktueller Status Hero -->
                <div class="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/60 via-white to-sky-50/40 dark:from-indigo-950/40 dark:via-slate-900 dark:to-sky-950/20 border border-indigo-100 dark:border-indigo-950/60 flex items-center justify-between">
                    <div class="flex items-center gap-4">
                        {@render weatherIcon(weather.current.weatherCode, 'w-12 h-12')}
                        <div>
                            <div class="text-3xl font-black text-slate-900 dark:text-white leading-none">
                                {weather.current.temp}°C
                            </div>
                            <div class="text-xs font-bold text-slate-700 dark:text-slate-300 mt-1">
                                {weather.current.weatherDesc}
                            </div>
                            <div class="text-[11px] text-slate-500 dark:text-slate-400">
                                Gefühlt wie {weather.current.apparentTemp}°C
                            </div>
                        </div>
                    </div>
                    <div class="space-y-1.5 text-right text-xs">
                        <div class="flex items-center justify-end gap-1 font-bold text-slate-600 dark:text-slate-400">
                            <ArrowDown class="w-3.5 h-3.5 text-sky-500" /> {weather.today.tempMin}°C
                            <ArrowUp class="w-3.5 h-3.5 text-amber-500 ml-1" /> {weather.today.tempMax}°C
                        </div>
                        <div class="flex items-center justify-end gap-1.5 text-[11px] text-cyan-700 dark:text-cyan-400 font-semibold">
                            <CloudRain class="w-3.5 h-3.5" />
                            <span>{weather.today.precipitationProb}% Regen</span>
                        </div>
                        <div class="flex items-center justify-end gap-1.5 text-[11px] text-slate-500">
                            <Wind class="w-3.5 h-3.5" />
                            <span>{weather.current.windSpeed} km/h Wind</span>
                        </div>
                    </div>
                </div>

                <!-- Heute im Stundenverlauf -->
                {#if weather.hourlyToday.length > 0}
                    <div>
                        <h4 class="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Heutiger Verlauf</h4>
                        <div class="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
                            {#each weather.hourlyToday as h}
                                <div class="flex flex-col items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 min-w-[62px] shrink-0 text-center">
                                    <span class="text-[10px] font-semibold text-slate-500">{h.time}</span>
                                    <div class="my-1">
                                        {@render weatherIcon(h.weatherCode, 'w-5 h-5')}
                                    </div>
                                    <span class="text-xs font-black text-slate-800 dark:text-slate-200">{h.temp}°</span>
                                    <span class="text-[9px] font-bold text-cyan-600 dark:text-cyan-400 mt-0.5">{h.precipitationProb}%</span>
                                </div>
                            {/each}
                        </div>
                    </div>
                {/if}

                <!-- 3-Tage Tourenvorschau -->
                <div>
                    <h4 class="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">3-Tage Touren-Ausblick</h4>
                    <div class="space-y-2">
                        {#each weather.days as day}
                            <div class="p-3.5 rounded-2xl bg-neutral-50 dark:bg-slate-800/60 border border-neutral-100 dark:border-slate-800 flex items-center justify-between">
                                <div class="flex items-center gap-3">
                                    {@render weatherIcon(day.weatherCode, 'w-6 h-6')}
                                    <div>
                                        <div class="text-xs font-bold text-slate-900 dark:text-slate-100">{day.weekday}</div>
                                        <div class="text-[11px] text-slate-500">{day.weatherDesc}</div>
                                    </div>
                                </div>
                                <div class="flex items-center gap-4 text-right">
                                    <div class="flex items-center gap-1 text-[11px] font-bold text-cyan-600 dark:text-cyan-400">
                                        <CloudRain class="w-3.5 h-3.5" />
                                        <span>{day.precipitationProb}%</span>
                                    </div>
                                    <div class="text-xs font-bold text-slate-700 dark:text-slate-300">
                                        <span class="text-slate-400">{day.tempMin}°</span> / <span class="font-black text-slate-900 dark:text-white">{day.tempMax}°C</span>
                                    </div>
                                </div>
                            </div>
                        {/each}
                    </div>
                </div>
            </div>

            <!-- Footer Bild-3-Design -->
            <div class="p-4 bg-neutral-50 dark:bg-slate-900/80 border-t border-neutral-100 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
                <button 
                    type="button" 
                    onclick={close} 
                    class="orga-button-ghost py-2.5 px-4 text-xs dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
                >
                    Schließen
                </button>
                <button 
                    type="button" 
                    onclick={handleRefresh}
                    disabled={isRefreshing}
                    class="orga-button-primary py-2.5 px-5 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-sky-600/20"
                >
                    <RefreshCw class="w-3.5 h-3.5 {isRefreshing ? 'animate-spin' : ''}" />
                    <span>Aktualisieren</span>
                </button>
            </div>
        </div>
    {/if}
</dialog>
