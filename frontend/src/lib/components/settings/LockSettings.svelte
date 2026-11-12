<script lang="ts">
    import { onMount } from 'svelte';
    import { Capacitor } from '@capacitor/core';
    import { Fingerprint, Lock, ShieldCheck, KeyRound } from 'lucide-svelte';
    import { biometricService } from '$lib/services/biometricService';
    import { toastStore } from '$lib/services/toastService.svelte';

    let isNative = $state(false);
    let isEnabled = $state(false);
    let useBiometry = $state(true);
    let hwAvailable = $state(false);
    let hasPin = $state(false);
    let timeoutSec = $state(0);
    let newPin = $state('');
    let isSaving = $state(false);

    const timeoutChoices = [
        { sec: 0, label: 'Sofort beim Verlassen' },
        { sec: 60, label: 'Nach 1 Minute' },
        { sec: 300, label: 'Nach 5 Minuten' },
        { sec: 900, label: 'Nach 15 Minuten' }
    ];

    onMount(async () => {
        isNative = Capacitor.isNativePlatform();
        await biometricService.init();
        isEnabled = biometricService.isConfigured;
        useBiometry = biometricService.biometryPreferred;
        timeoutSec = biometricService.lockTimeoutSeconds;
        hasPin = await biometricService.hasPin();
        hwAvailable = await biometricService.isBiometryHardwareAvailable();
    });

    async function toggleLock() {
        if (!isEnabled && !hasPin && !hwAvailable) {
            toastStore.warning('Bitte legen Sie zuerst einen 4- bis 6-stelligen Sicherheits-PIN fest.');
            return;
        }
        if (!isEnabled && !hasPin && newPin.length < 4) {
            toastStore.warning('Bitte geben Sie unten zuerst einen Notfall-PIN (mind. 4 Ziffern) ein.');
            return;
        }
        isSaving = true;
        try {
            if (!isEnabled && newPin.length >= 4) {
                await biometricService.setPin(newPin);
                hasPin = true;
                newPin = '';
            }
            const next = !isEnabled;
            await biometricService.setEnabled(next);
            isEnabled = next;
            toastStore.success(next ? 'App-Sperre aktiviert.' : 'App-Sperre deaktiviert.');
        } finally {
            isSaving = false;
        }
    }

    async function savePin() {
        if (!/^\d{4,6}$/.test(newPin)) {
            toastStore.warning('Der PIN muss aus 4 bis 6 Ziffern bestehen.');
            return;
        }
        isSaving = true;
        try {
            await biometricService.setPin(newPin);
            hasPin = true;
            newPin = '';
            toastStore.success('Sicherheits-PIN gespeichert.');
        } finally {
            isSaving = false;
        }
    }

    async function selectTimeout(sec: number) {
        timeoutSec = sec;
        await biometricService.setTimeoutSeconds(sec);
        toastStore.success('Sperrzeit gespeichert.');
    }

    async function toggleBiometry() {
        useBiometry = !useBiometry;
        await biometricService.setBiometryPreferred(useBiometry);
        toastStore.success(useBiometry ? 'Fingerabdruck / Gesicht aktiv.' : 'Nur PIN-Abfrage aktiv.');
    }
</script>

<div class="orga-card-white p-6 md:p-8 dark:bg-slate-900 dark:border-slate-800">
    <div class="flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4 mb-5">
        <div class="flex items-center gap-3">
            <span class="w-9 h-9 flex items-center justify-center bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl">
                <Fingerprint class="w-5 h-5" />
            </span>
            <div>
                <h2 class="text-lg font-bold text-slate-900 dark:text-slate-100">App-Sperre &amp; Biometrie</h2>
                <p class="text-xs text-slate-500 dark:text-slate-400">Schützt Klientendaten vor unbefugtem Zugriff</p>
            </div>
        </div>
        <button type="button" onclick={toggleLock} disabled={isSaving} class="px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer {isEnabled ? 'bg-emerald-600 text-white hover:bg-emerald-500' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-300'}">
            {isEnabled ? 'Aktiv' : 'Einschalten'}
        </button>
    </div>

    <div class="space-y-5">
        {#if isNative}
            <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 flex items-center justify-between gap-3">
                <div class="flex items-center gap-2.5">
                    <ShieldCheck class="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <div>
                        <span class="text-sm font-bold text-slate-800 dark:text-slate-100 block">Fingerabdruck / Gesicht zuerst</span>
                        <span class="text-xs text-slate-500 dark:text-slate-400">{hwAvailable ? 'Sensor auf diesem Gerät bereit – PIN dient als Rückfall' : 'Kein Biometrie-Sensor eingerichtet – nutzt PIN'}</span>
                    </div>
                </div>
                <input type="checkbox" checked={useBiometry} onchange={toggleBiometry} disabled={!hwAvailable} class="w-5 h-5 accent-indigo-600 rounded" />
            </div>
        {/if}

        <div>
            <p class="text-sm font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-1.5">
                <Lock class="w-4 h-4 text-slate-400" />
                <span>Sperren nach Inaktivität</span>
            </p>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {#each timeoutChoices as choice}
                    <button type="button" onclick={() => selectTimeout(choice.sec)} class="px-3 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer {timeoutSec === choice.sec ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100'}">
                        {choice.label}
                    </button>
                {/each}
            </div>
        </div>

        <div class="pt-3 border-t border-slate-100 dark:border-slate-800">
            <label for="app-lock-pin" class="text-sm font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-1.5">
                <KeyRound class="w-4 h-4 text-slate-400" />
                <span>{hasPin ? 'Sicherheits-PIN ändern (Rückfall)' : 'Sicherheits-PIN festlegen (4–6 Ziffern)'}</span>
            </label>
            <div class="flex items-center gap-2 max-w-xs">
                <input id="app-lock-pin" type="password" inputmode="numeric" maxlength="6" bind:value={newPin} placeholder="z. B. 2468" class="orga-input-clear py-2 px-3 text-sm tracking-widest dark:bg-slate-800 dark:border-slate-700" />
                <button type="button" onclick={savePin} disabled={isSaving || newPin.length < 4} class="px-4 py-2 rounded-xl bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer disabled:opacity-50">
                    Speichern
                </button>
            </div>
        </div>
    </div>
</div>
