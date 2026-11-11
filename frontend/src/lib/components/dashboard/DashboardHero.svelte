<script lang="ts">
    import { pb } from '$lib/services/pocketbase';
    import ClientDetailModal from '$lib/components/clients/ClientDetailModal.svelte';
    import WeatherWidget from '$lib/components/dashboard/WeatherWidget.svelte';
    import DashboardBirthdays from '$lib/components/dashboard/DashboardBirthdays.svelte';
    import { getDashboardGreeting, getSpecialDayName } from '$lib/services/greetingService';
    import { loadAiGreeting } from '$lib/services/greetingAiService';
    import { fetchWeatherData } from '$lib/services/weatherService';
    import { orgaStore } from '$lib/stores/orgaStore.svelte';
    import { notificationStore } from '$lib/services/notificationStore.svelte';
    import { onMount } from 'svelte';
    import { Calendar, Clock, AlertCircle, Inbox, Dices } from 'lucide-svelte';

    interface Props {
        todaysAppointmentsCount?: number;
        hasBlockedDayToday?: boolean;
        missingFollowUpsCount?: number;
        unhandledInquiriesCount?: number;
        onOpenFollowUps?: () => void;
        onOpenInquiries?: () => void;
        onScrollToAppointments?: () => void;
    }

    let {
        todaysAppointmentsCount = 0,
        hasBlockedDayToday = false,
        missingFollowUpsCount = 0,
        unhandledInquiriesCount = 0,
        onOpenFollowUps,
        onOpenInquiries,
        onScrollToAppointments
    }: Props = $props();

    let detailModal = $state<ReturnType<typeof ClientDetailModal> | null>(null);
    const initialUser = pb.authStore.record || pb.authStore.model;
    let userName = $state(initialUser?.name_first || initialUser?.name || 'Benutzer');
    let greetingData = $state(getDashboardGreeting());
    let isRegenerating = $state(false);

    let totalIncomingCount = $derived(notificationStore.totalIncomingCount);

    const now = new Date();
    const formattedDate = new Intl.DateTimeFormat('de-DE', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    }).format(now);

    function cleanGreeting(text: string, name: string): string {
        if (!text) return 'Hallo';
        let clean = text.trim();
        if (name) {
            const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            clean = clean.replace(new RegExp(`[,\\s!]+${escaped}[,!\\s]*$`, 'gi'), '').trim();
            clean = clean.replace(new RegExp(`^${escaped}[,!\\s]+`, 'gi'), '').trim();
        }
        return clean.replace(/[,!.\s]+$/, '').trim() || 'Hallo';
    }

    async function updateGreeting(force = false) {
        const user = pb.authStore.record || pb.authStore.model;
        userName = user?.name_first || user?.name || 'Benutzer';
        const userId = user?.id || '';
        const currentAppointmentsCount = todaysAppointmentsCount;

        try {
            let weatherStr = '';
            try {
                const w = await fetchWeatherData(false);
                if (w) weatherStr = `${w.current.temp}°C ${w.current.weatherDesc} (${w.locationName})`;
            } catch {}

            const clients = orgaStore.clients?.data || [];
            const bdaysToday = clients.filter((c: any) => {
                if (!c.birthdate) return false;
                const parts = (c.birthdate || '').trim().split(' ')[0].split('T')[0].split(/[.-]/);
                if (parts.length < 3) return false;
                const bDay = parseInt(parts[0].length === 4 ? parts[2] : parts[0], 10);
                const bMonth = parseInt(parts[1], 10) - 1;
                return bDay === now.getDate() && bMonth === now.getMonth();
            }).length;

            greetingData = await loadAiGreeting(userName, userId, {
                weekday: new Intl.DateTimeFormat('de-DE', { weekday: 'long' }).format(now),
                weather: weatherStr,
                todaysAppointmentsCount: currentAppointmentsCount,
                hasBlockedDayToday,
                birthdaysTodayCount: bdaysToday,
                isSpecialDay: getSpecialDayName(now) || undefined
            }, force);
        } catch (e) {
            console.warn('[DashboardHero] Begrüßung Fallback aktiv:', e);
        }
    }

    async function handleRegenerate() {
        if (isRegenerating) return;
        isRegenerating = true;
        try {
            await updateGreeting(true);
        } finally {
            isRegenerating = false;
        }
    }

    onMount(async () => {
        await updateGreeting(false);
    });
</script>

<div class="relative overflow-hidden rounded-3xl bg-gradient-to-br from-white via-slate-50 to-indigo-50/40 dark:from-slate-900 dark:via-slate-900/95 dark:to-indigo-950/40 border border-slate-200/80 dark:border-slate-800 shadow-xl p-5 sm:p-6 mb-8 transition-all">
    <div class="absolute -top-24 -left-24 w-80 h-80 bg-indigo-500/10 dark:bg-indigo-500/15 rounded-full blur-3xl pointer-events-none"></div>
    <div class="absolute -bottom-24 -right-24 w-80 h-80 bg-cyan-500/10 dark:bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

    <div class="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <!-- 1. LINKE SPALTE: BEGRÜSSUNG & TAGES-CHIPS -->
        <div class="flex-1 min-w-0">
            <div class="flex items-start gap-4">
                <div class="text-3xl sm:text-4xl select-none animate-waving-hand origin-bottom-right drop-shadow-sm shrink-0 mt-0.5">
                    {greetingData.emoji}
                </div>
                <div class="min-w-0 flex-1">
                    <h2 class="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                        {cleanGreeting(greetingData.greeting, userName)}, <span class="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 dark:from-indigo-400 dark:via-cyan-400 dark:to-teal-300 drop-shadow-xs">{userName}</span>!
                    </h2>
                    <div class="flex items-center gap-2 mt-1">
                        <p class="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 max-w-xl leading-relaxed transition-opacity duration-200 {isRegenerating ? 'opacity-40' : 'opacity-100'}">
                            {greetingData.subGreeting}
                        </p>
                        <button
                            type="button"
                            onclick={handleRegenerate}
                            disabled={isRegenerating}
                            class="inline-flex items-center justify-center p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                            title="Neuen Spruch würfeln"
                            aria-label="Neuen Spruch würfeln"
                        >
                            <Dices class="w-3.5 h-3.5 {isRegenerating ? 'animate-spin text-indigo-500' : 'hover:rotate-12 transition-transform'}" />
                        </button>
                    </div>
                </div>
            </div>

            <!-- Tages-Fokus Status Chips -->
            <div class="flex items-center gap-2 mt-4 flex-wrap">
                <!-- Datum -->
                <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/60 shadow-2xs">
                    <Calendar class="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                    <span>{formattedDate}</span>
                </span>

                <!-- Heutige Termine -->
                <button
                    type="button"
                    onclick={onScrollToAppointments}
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer {todaysAppointmentsCount > 0 ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60 hover:bg-indigo-100 hover:border-indigo-300 shadow-2xs active:scale-95' : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-700/60'}"
                    title={hasBlockedDayToday && todaysAppointmentsCount === 0 ? 'Keine Arbeitseinsätze heute (Tag ist blockiert)' : 'Zu den heutigen Terminen scrollen'}
                >
                    <Clock class="w-3.5 h-3.5 {todaysAppointmentsCount > 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}" />
                    <span>
                        {#if todaysAppointmentsCount > 0}
                            {todaysAppointmentsCount} {todaysAppointmentsCount === 1 ? 'Termin' : 'Termine'} heute
                        {:else if hasBlockedDayToday}
                            0 Termine heute (Blockiert)
                        {:else}
                            0 Termine heute
                        {/if}
                    </span>
                </button>

                <!-- Offene Nachbereitungen -->
                {#if missingFollowUpsCount > 0}
                    <button
                        type="button"
                        onclick={onOpenFollowUps}
                        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/80 hover:bg-amber-100 hover:border-amber-300 transition-all shadow-2xs active:scale-95 cursor-pointer"
                        title="Offene Nachbereitungen anzeigen"
                    >
                        <AlertCircle class="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 animate-pulse" />
                        <span>{missingFollowUpsCount} {missingFollowUpsCount === 1 ? 'Nachbereitung' : 'Nachbereitungen'} offen</span>
                    </button>
                {/if}

                <!-- Offene Eingänge / Anfragen -->
                {#if totalIncomingCount > 0}
                    <button
                        type="button"
                        onclick={onOpenInquiries}
                        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800/80 hover:bg-rose-100 hover:border-rose-300 transition-all shadow-2xs active:scale-95 cursor-pointer"
                        title="Eingangszentrale öffnen: Kundenanfragen, Support & Vorschläge"
                    >
                        <Inbox class="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 animate-pulse" />
                        <span>{totalIncomingCount} neue {totalIncomingCount === 1 ? 'Eingang' : 'Eingänge'}</span>
                    </button>
                {/if}
            </div>

            <!-- Wetteransicht -->
            <div class="mt-2.5 flex items-center">
                <WeatherWidget />
            </div>
        </div>

        <!-- 2. RECHTE SPALTE: GEBURTSTAGS-RADAR -->
        <DashboardBirthdays onOpenClient={(id) => detailModal?.open(id)} />
    </div>
</div>

<ClientDetailModal bind:this={detailModal} />

<style>
    .animate-waving-hand {
        animation: wave 2.5s infinite;
    }
    @keyframes wave {
        0% { transform: rotate(0deg); }
        10% { transform: rotate(14deg); }
        20% { transform: rotate(-8deg); }
        30% { transform: rotate(14deg); }
        40% { transform: rotate(-4deg); }
        50% { transform: rotate(10deg); }
        60%, 100% { transform: rotate(0deg); }
    }
</style>
