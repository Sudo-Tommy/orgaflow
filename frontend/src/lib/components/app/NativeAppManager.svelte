<script lang="ts">
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { App as CapApp } from '@capacitor/app';
    import { Capacitor } from '@capacitor/core';
    import { backButtonHandler } from '$lib/services/backButtonHandler';
    import { biometricService } from '$lib/services/biometricService';
    import { pushNotificationService } from '$lib/services/pushNotificationService';
    import { reminderScheduler } from '$lib/services/reminders/reminderScheduler';
    import { shareImportService } from '$lib/services/shareImportService.svelte';
    import { syncTodayWidget } from '$lib/services/widget/widgetSync';
    import { tripRecorder } from '$lib/services/trips/tripRecorder.svelte';
    import { orgaStore } from '$lib/stores/orgaStore.svelte';
    import MobileOnboardingModal from './MobileOnboardingModal.svelte';
    import AppUpdateBanner from './AppUpdateBanner.svelte';
    import IncomingShareModal from './IncomingShareModal.svelte';
    import { Lock, Check, Fingerprint } from 'lucide-svelte';

    let { isLoggedIn = false }: { isLoggedIn: boolean } = $props();

    let pinInput = $state('');
    let pinError = $state(false);
    let isLocked = $state(false);
    let canUseBiometrics = $state(false);
    let isPromptingBio = $state(false);

    async function tryBiometricUnlock() {
        if (!canUseBiometrics || !biometricService.biometryPreferred || isPromptingBio) return;
        isPromptingBio = true;
        try {
            const ok = await biometricService.authenticateBiometric();
            if (ok) {
                isLocked = false;
                pinInput = '';
                pinError = false;
            }
        } finally {
            isPromptingBio = false;
        }
    }

    function handleDeepLink(rawUrl?: string) {
        if (!rawUrl || !rawUrl.startsWith('orgaflow://')) return;
        const route = rawUrl.replace('orgaflow://', '').replace(/\/+$/, '');
        if (route === 'termine/heute') {
            goto('/calendar');
        } else if (route === 'beleg/neu') {
            goto('/bwa?newReceipt=1');
        } else if (route === 'fahrt/start') {
            tripRecorder.startTrip();
        }
    }

    onMount(async () => {
        if (Capacitor.isNativePlatform()) {
            backButtonHandler.init();
            await biometricService.init();
            canUseBiometrics = await biometricService.isBiometryHardwareAvailable();
            biometricService.onLockChange((locked) => {
                isLocked = locked;
                if (locked) tryBiometricUnlock();
            });
            isLocked = biometricService.isLockActive;
            if (isLocked) tryBiometricUnlock();

            CapApp.addListener('appUrlOpen', (ev) => handleDeepLink(ev?.url)).catch(() => {});
            CapApp.getLaunchUrl().then((res) => handleDeepLink(res?.url)).catch(() => {});
        }
    });

    $effect(() => {
        if (isLoggedIn) {
            pushNotificationService.registerDevice();
            if (Capacitor.isNativePlatform()) {
                reminderScheduler.initListeners();
                shareImportService.init();
            }
        }
    });

    $effect(() => {
        if (isLoggedIn && Capacitor.isNativePlatform()) {
            const apps = orgaStore.appointments?.data || [];
            const clients = orgaStore.clients?.data || [];
            syncTodayWidget(apps, clients);
            if (apps.length > 0) {
                reminderScheduler.scheduleReschedule(apps, clients);
            }
        }
    });

    async function handleUnlock() {
        if (!pinInput) return;
        const valid = await biometricService.verifyPin(pinInput);
        if (valid) {
            isLocked = false;
            pinInput = '';
            pinError = false;
        } else {
            pinError = true;
            pinInput = '';
        }
    }
</script>

{#if isLoggedIn}
    <MobileOnboardingModal />
    <IncomingShareModal />
{/if}

<AppUpdateBanner />

{#if isLocked}
    <div
        class="fixed inset-0 z-[10000] bg-slate-950 flex items-center justify-center p-4"
        data-modal-open="true"
        role="dialog"
    >
        <div class="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col items-center gap-5 text-center text-slate-100">
            <div class="w-16 h-16 rounded-3xl bg-indigo-950 border border-indigo-800/80 flex items-center justify-center text-indigo-400">
                <Lock class="w-8 h-8" />
            </div>

            <div>
                <h2 class="text-lg font-bold">Seniorenassistenz</h2>
                <p class="text-xs text-slate-400 mt-1">App ist geschützt</p>
            </div>

            {#if canUseBiometrics && biometricService.biometryPreferred}
                <button
                    type="button"
                    onclick={tryBiometricUnlock}
                    disabled={isPromptingBio}
                    class="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/25 active:scale-98 transition-all cursor-pointer"
                >
                    <Fingerprint class="w-5 h-5" />
                    <span>Mit Fingerabdruck / Gesicht entsperren</span>
                </button>
            {/if}

            <form onsubmit={(e) => { e.preventDefault(); handleUnlock(); }} class="w-full flex flex-col gap-3">
                <input
                    type="password"
                    inputmode="numeric"
                    pattern="[0-9]*"
                    maxlength="6"
                    bind:value={pinInput}
                    placeholder="Oder Sicherheits-PIN eingeben"
                    class="w-full py-3.5 px-4 text-center tracking-widest text-base font-bold rounded-2xl bg-slate-800 border {pinError ? 'border-rose-500 text-rose-400' : 'border-slate-700 text-white'} focus:outline-hidden focus:border-indigo-500"
                />

                {#if pinError}
                    <span class="text-xs text-rose-400 font-medium">Ungültiger PIN. Bitte erneut versuchen.</span>
                {/if}

                <button
                    type="submit"
                    class="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 active:scale-98 transition-all cursor-pointer"
                >
                    <Check class="w-4 h-4" />
                    <span>Mit PIN entsperren</span>
                </button>
            </form>
        </div>
    </div>
{/if}
