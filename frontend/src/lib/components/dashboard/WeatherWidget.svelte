<script lang="ts">
    import { onMount } from 'svelte';
    import { MapPin, CloudRain, Sun, CloudSun, Cloud, CloudSnow, CloudLightning, ArrowUp, ArrowDown } from 'lucide-svelte';
    import { fetchWeatherData, getWeatherDescription, type WeatherData } from '$lib/services/weatherService';
    import WeatherDetailModal from '$lib/components/dashboard/WeatherDetailModal.svelte';

    let weather = $state<WeatherData | null>(null);
    let isLoading = $state(true);
    let modalComp = $state<ReturnType<typeof WeatherDetailModal> | null>(null);

    async function loadWeather() {
        try {
            weather = await fetchWeatherData(false);
        } catch (e) {
            // Stilles Abfangen
        } finally {
            isLoading = false;
        }
    }

    function handleClick() {
        if (weather) {
            modalComp?.open(weather);
        }
    }

    onMount(() => {
        loadWeather();
    });
</script>

{#snippet weatherIcon(code: number, sizeClass = 'w-4 h-4')}
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

{#if isLoading}
    <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60 animate-pulse">
        <div class="w-4 h-4 rounded bg-slate-200 dark:bg-slate-800"></div>
        <div class="w-16 h-3 bg-slate-200 dark:bg-slate-800 rounded"></div>
    </div>
{:else if weather}
    <button
        type="button"
        onclick={handleClick}
        class="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/80 dark:bg-slate-900/80 hover:bg-white dark:hover:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 text-slate-700 dark:text-slate-300 shadow-2xs hover:shadow-xs active:scale-95 transition-all cursor-pointer group"
        title="Wetter & 3-Tage-Tourenausblick für Außentermine öffnen"
    >
        {@render weatherIcon(weather.current.weatherCode, 'w-4 h-4')}
        <span class="font-black text-slate-900 dark:text-white leading-none">{weather.current.temp}°C</span>
        <span class="font-bold text-slate-700 dark:text-slate-300 truncate max-w-[120px]">{weather.current.weatherDesc}</span>
        
        <span class="flex items-center gap-0.5 text-slate-500 font-medium">
            <MapPin class="w-3 h-3 text-indigo-500 shrink-0" />
            <span class="truncate max-w-[100px]">{weather.locationName}</span>
        </span>

        <span class="hidden sm:inline text-slate-300 dark:text-slate-700 font-normal">•</span>

        <span class="hidden sm:inline-flex items-center gap-0.5 text-[11px] text-slate-500 font-medium">
            <ArrowDown class="w-2.5 h-2.5 text-sky-500" />{weather.today.tempMin}°
            <ArrowUp class="w-2.5 h-2.5 text-amber-500 ml-0.5" />{weather.today.tempMax}°
        </span>

        <span class="text-slate-300 dark:text-slate-700 font-normal">•</span>

        <span class="text-cyan-600 dark:text-cyan-400 font-bold flex items-center gap-0.5 shrink-0">
            <CloudRain class="w-3 h-3" />
            <span>{weather.today.precipitationProb}%</span>
        </span>
    </button>
{/if}

<WeatherDetailModal bind:this={modalComp} />
