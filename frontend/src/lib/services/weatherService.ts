/**
 * weatherService.ts
 * 
 * Standort- und wetterbasierter Dienst für das OrgaFlow Dashboard.
 * Nutzt die DSGVO-konforme, kostenlose Open-Meteo API mit intelligentem
 * GPS-Erkennungs- und Unternehmensstandort-Fallback sowie 1-stündigem Caching.
 */

import { orgaStore } from '$lib/stores/orgaStore.svelte';

export interface WeatherData {
    locationName: string;
    isDeviceLocation: boolean;
    current: {
        temp: number;
        apparentTemp: number;
        weatherCode: number;
        weatherDesc: string;
        windSpeed: number;
        humidity: number;
    };
    today: {
        tempMin: number;
        tempMax: number;
        precipitationProb: number;
    };
    days: Array<{
        date: string;
        weekday: string;
        tempMin: number;
        tempMax: number;
        weatherCode: number;
        weatherDesc: string;
        precipitationProb: number;
    }>;
    hourlyToday: Array<{
        time: string;
        temp: number;
        weatherCode: number;
        precipitationProb: number;
    }>;
    lastUpdated: number;
}

const CACHE_KEY = 'orgaflow_weather_data';
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 Stunde

export function getWeatherDescription(code: number): { text: string; iconType: 'sun' | 'cloud-sun' | 'cloud' | 'rain' | 'snow' | 'thunder' | 'fog' } {
    if (code === 0) return { text: 'Sonnig', iconType: 'sun' };
    if (code === 1 || code === 2) return { text: 'Heiter bis wolkig', iconType: 'cloud-sun' };
    if (code === 3) return { text: 'Bedeckt', iconType: 'cloud' };
    if (code === 45 || code === 48) return { text: 'Neblig', iconType: 'fog' };
    if (code >= 51 && code <= 55) return { text: 'Leichter Niesel', iconType: 'rain' };
    if (code >= 61 && code <= 65) return { text: code === 65 ? 'Starker Regen' : 'Regen', iconType: 'rain' };
    if (code >= 71 && code <= 77) return { text: 'Schneefall', iconType: 'snow' };
    if (code >= 80 && code <= 82) return { text: 'Regenschauer', iconType: 'rain' };
    if (code >= 85 && code <= 86) return { text: 'Schneeschauer', iconType: 'snow' };
    if (code >= 95) return { text: 'Gewitter', iconType: 'thunder' };
    return { text: 'Wechselhaft', iconType: 'cloud-sun' };
}

async function getDeviceCoordinates(): Promise<{ lat: number; lon: number } | null> {
    if (typeof window === 'undefined' || !navigator.geolocation) return null;
    return new Promise((resolve) => {
        const timeout = setTimeout(() => resolve(null), 4000);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                clearTimeout(timeout);
                resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude });
            },
            () => {
                clearTimeout(timeout);
                resolve(null);
            },
            { enableHighAccuracy: false, timeout: 4000, maximumAge: 300000 }
        );
    });
}

async function getFallbackCoordinates(): Promise<{ lat: number; lon: number; cityName: string }> {
    const defaultFallback = { lat: 51.1657, lon: 10.4515, cityName: 'Deutschland' };
    const company = orgaStore.company?.data?.[0];
    const city = company?.city?.trim();
    if (!city) return defaultFallback;

    try {
        const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=de&format=json`);
        if (res.ok) {
            const data = await res.json();
            if (data.results && data.results.length > 0) {
                return {
                    lat: data.results[0].latitude,
                    lon: data.results[0].longitude,
                    cityName: data.results[0].name || city
                };
            }
        }
    } catch (e) {
        console.warn('[WeatherService] Geocoding lookup failed:', e);
    }
    return { ...defaultFallback, cityName: city };
}

async function getCityFromCoordinates(lat: number, lon: number): Promise<string> {
    try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=12`, {
            headers: { 'Accept-Language': 'de' }
        });
        if (res.ok) {
            const data = await res.json();
            return data.address?.city || data.address?.town || data.address?.village || data.address?.municipality || 'Mein Standort';
        }
    } catch (e) {
        console.warn('[WeatherService] Reverse geocoding failed:', e);
    }
    return 'Mein Standort';
}

export async function fetchWeatherData(force = false): Promise<WeatherData> {
    if (!force && typeof window !== 'undefined') {
        try {
            const cached = localStorage.getItem(CACHE_KEY);
            if (cached) {
                const parsed: WeatherData = JSON.parse(cached);
                if (Date.now() - parsed.lastUpdated < CACHE_DURATION_MS) {
                    return parsed;
                }
            }
        } catch {}
    }

    let coords = await getDeviceCoordinates();
    let isDeviceLocation = true;
    let cityName = '';

    if (coords) {
        cityName = await getCityFromCoordinates(coords.lat, coords.lon);
    } else {
        const fallback = await getFallbackCoordinates();
        coords = { lat: fallback.lat, lon: fallback.lon };
        isDeviceLocation = false;
        cityName = fallback.cityName;
    }

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&hourly=temperature_2m,precipitation_probability,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Wetterdaten konnten nicht abgerufen werden.');
    const raw = await res.json();

    const currentCode = raw.current?.weather_code ?? 0;
    const currentDesc = getWeatherDescription(currentCode).text;

    const days: WeatherData['days'] = [];
    const weekdays = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
    if (raw.daily?.time) {
        for (let i = 0; i < Math.min(3, raw.daily.time.length); i++) {
            const d = new Date(raw.daily.time[i]);
            const code = raw.daily.weather_code[i] ?? 0;
            days.push({
                date: raw.daily.time[i],
                weekday: i === 0 ? 'Heute' : i === 1 ? 'Morgen' : weekdays[d.getDay()],
                tempMin: Math.round(raw.daily.temperature_2m_min[i] ?? 0),
                tempMax: Math.round(raw.daily.temperature_2m_max[i] ?? 0),
                weatherCode: code,
                weatherDesc: getWeatherDescription(code).text,
                precipitationProb: raw.daily.precipitation_probability_max?.[i] ?? 0
            });
        }
    }

    const hourlyToday: WeatherData['hourlyToday'] = [];
    const nowHour = new Date().getHours();
    if (raw.hourly?.time) {
        for (let i = nowHour; i < Math.min(nowHour + 8, raw.hourly.time.length); i++) {
            const t = raw.hourly.time[i];
            const hourStr = t.split('T')[1]?.slice(0, 5) || `${i}:00`;
            hourlyToday.push({
                time: hourStr,
                temp: Math.round(raw.hourly.temperature_2m[i] ?? 0),
                weatherCode: raw.hourly.weather_code[i] ?? 0,
                precipitationProb: raw.hourly.precipitation_probability[i] ?? 0
            });
        }
    }

    const result: WeatherData = {
        locationName: cityName,
        isDeviceLocation,
        current: {
            temp: Math.round(raw.current?.temperature_2m ?? 0),
            apparentTemp: Math.round(raw.current?.apparent_temperature ?? 0),
            weatherCode: currentCode,
            weatherDesc: currentDesc,
            windSpeed: Math.round(raw.current?.wind_speed_10m ?? 0),
            humidity: Math.round(raw.current?.relative_humidity_2m ?? 0)
        },
        today: {
            tempMin: days[0]?.tempMin ?? Math.round(raw.current?.temperature_2m ?? 0),
            tempMax: days[0]?.tempMax ?? Math.round(raw.current?.temperature_2m ?? 0),
            precipitationProb: days[0]?.precipitationProb ?? 0
        },
        days,
        hourlyToday,
        lastUpdated: Date.now()
    };

    if (typeof window !== 'undefined') {
        try {
            localStorage.setItem(CACHE_KEY, JSON.stringify(result));
        } catch {}
    }

    return result;
}
