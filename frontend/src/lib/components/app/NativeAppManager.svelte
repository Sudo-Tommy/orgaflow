<script lang="ts">
    import { onMount } from 'svelte';
    import { Capacitor } from '@capacitor/core';
    import { backButtonHandler } from '$lib/services/backButtonHandler';
    import { biometricService } from '$lib/services/biometricService';
    import { pushNotificationService } from '$lib/services/pushNotificationService';
    import MobileOnboardingModal from './MobileOnboardingModal.svelte';
    import AppUpdateBanner from './AppUpdateBanner.svelte';
    import { Lock, KeyRound, Check } from 'lucide-svelte';

    let { isLoggedIn = false }: { isLoggedIn: boolean } = $props();

    let pinInput = $state('');
    let pinError = $state(false);
    let isLocked = $state(false);

    onMount(async () => {
        if (Capacitor.isNativePlatform()) {
            backButtonHandler.init();
            await biometricService.init();
            isLocked = biometricService.isLockActive;
        }
    });

    $effect(() => {
        if (isLoggedIn) {
            pushNotificationService.registerDevice();
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

<!-- Mobile Onboarding Modal (Ersteinrichtung nach Login) -->
{#if isLoggedIn}
    <MobileOnboardingModal />
{/if}

<!-- APK Update Banner -->
<AppUpdateBanner />

<!-- Biometrische App-Sperre / PIN-Eingabe falls aktiv -->
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
                <p class="text-xs text-slate-400 mt-1">App ist durch Sicherheits-PIN gesperrt</p>
            </div>

            <form onsubmit={(e) => { e.preventDefault(); handleUnlock(); }} class="w-full flex flex-col gap-3">
                <div class="relative">
                    <input
                        type="password"
                        inputmode="numeric"
                        pattern="[0-9]*"
                        maxlength="6"
                        bind:value={pinInput}
                        placeholder="PIN eingeben"
                        class="w-full py-3.5 px-4 text-center tracking-widest text-lg font-bold rounded-2xl bg-slate-800 border {pinError ? 'border-rose-500 text-rose-400' : 'border-slate-700 text-white'} focus:outline-hidden focus:border-indigo-500"
                    />
                </div>

                {#if pinError}
                    <span class="text-xs text-rose-400 font-medium">Ungültiger PIN. Bitte erneut versuchen.</span>
                {/if}

                <button
                    type="submit"
                    class="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 active:scale-98 transition-all"
                >
                    <Check class="w-4 h-4" />
                    <span>Entsperren</span>
                </button>
            </form>
        </div>
    </div>
{/if}
