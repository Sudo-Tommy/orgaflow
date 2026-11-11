<script lang="ts">
    import { onMount } from 'svelte';
    import { Camera } from '@capacitor/camera';
    import { Geolocation } from '@capacitor/geolocation';
    import { PushNotifications } from '@capacitor/push-notifications';
    import { Preferences } from '@capacitor/preferences';
    import { Capacitor } from '@capacitor/core';
    import { Camera as CameraIcon, MapPin, Bell, ShieldCheck, Check } from 'lucide-svelte';

    const ONBOARDING_KEY = 'orga_mobile_onboarded_v1';

    let isOpen = $state(false);
    let isProcessing = $state(false);

    onMount(async () => {
        if (!Capacitor.isNativePlatform()) return;
        try {
            const { value } = await Preferences.get({ key: ONBOARDING_KEY });
            if (value !== 'true') {
                isOpen = true;
            }
        } catch (e) {}
    });

    async function handleGrantPermissions() {
        isProcessing = true;
        try {
            // 1. Kamera
            try {
                await Camera.requestPermissions({ permissions: ['camera', 'photos'] });
            } catch (e) {}

            // 2. Standort
            try {
                await Geolocation.requestPermissions({ permissions: ['location'] });
            } catch (e) {}

            // 3. Benachrichtigungen
            try {
                await PushNotifications.requestPermissions();
            } catch (e) {}

            await Preferences.set({ key: ONBOARDING_KEY, value: 'true' });
            isOpen = false;
        } finally {
            isProcessing = false;
        }
    }

    async function handleDismiss() {
        await Preferences.set({ key: ONBOARDING_KEY, value: 'true' });
        isOpen = false;
    }
</script>

{#if isOpen}
    <div 
        class="fixed inset-0 z-[9990] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4"
        data-modal-open="true"
        role="dialog"
    >
        <div class="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col gap-5 text-slate-800 dark:text-slate-100">
            <!-- Header -->
            <div class="flex items-center gap-3">
                <div class="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <ShieldCheck class="w-6 h-6" />
                </div>
                <div>
                    <h3 class="text-lg font-bold">Willkommen in Ihrer App</h3>
                    <p class="text-xs text-slate-500 dark:text-slate-400">Seniorenassistenz optimal einrichten</p>
                </div>
            </div>

            <!-- Beschreibung -->
            <p class="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Damit Sie Belege scannen, Fahrten schnell erfassen und keine Termine verpassen, benötigt die App Ihre Zustimmung:
            </p>

            <!-- Funktions-Karten -->
            <div class="flex flex-col gap-2.5">
                <div class="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                    <div class="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300">
                        <CameraIcon class="w-4 h-4" />
                    </div>
                    <div class="text-xs">
                        <span class="font-bold block">Kamera & Belege</span>
                        <span class="text-slate-500 dark:text-slate-400">Belege mehrseitig fotografieren & als PDF bündeln</span>
                    </div>
                </div>

                <div class="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                    <div class="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-300">
                        <MapPin class="w-4 h-4" />
                    </div>
                    <div class="text-xs">
                        <span class="font-bold block">1-Klick-Standort</span>
                        <span class="text-slate-500 dark:text-slate-400">Start- und Zieladresse im Fahrtenbuch übernehmen</span>
                    </div>
                </div>

                <div class="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                    <div class="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-300">
                        <Bell class="w-4 h-4" />
                    </div>
                    <div class="text-xs">
                        <span class="font-bold block">Termin-Hinweise</span>
                        <span class="text-slate-500 dark:text-slate-400">Erinnerungen vor anstehenden Klientenbesuchen</span>
                    </div>
                </div>
            </div>

            <!-- Aktionen -->
            <div class="flex flex-col gap-2 pt-2">
                <button
                    type="button"
                    onclick={handleGrantPermissions}
                    disabled={isProcessing}
                    class="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 active:scale-98 transition-all disabled:opacity-50"
                >
                    <Check class="w-4 h-4" />
                    <span>{isProcessing ? 'Wird eingerichtet...' : 'Jetzt freigeben'}</span>
                </button>

                <button
                    type="button"
                    onclick={handleDismiss}
                    class="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 active:scale-98 transition-all"
                >
                    Später in den Einstellungen
                </button>
            </div>
        </div>
    </div>
{/if}
