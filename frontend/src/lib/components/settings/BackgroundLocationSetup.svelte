<script lang="ts">
    import { onMount } from 'svelte';
    import { Capacitor, registerPlugin } from '@capacitor/core';
    import { BatteryCharging, MapPin, CheckCircle2, Smartphone } from 'lucide-svelte';
    import { tripRecorder } from '$lib/services/trips/tripRecorder.svelte';
    import { toastStore } from '$lib/services/toastService.svelte';

    interface AppSecurityPlugin {
        isIgnoringBatteryOptimizations(): Promise<{ ignoring: boolean }>;
        requestBatteryOptimizationExemption(): Promise<void>;
    }
    const AppSecurity = registerPlugin<AppSecurityPlugin>('AppSecurity');

    let isNative = $state(false);
    let ignoringBattery = $state(false);

    async function refreshStatus() {
        if (!Capacitor.isNativePlatform()) return;
        try {
            const res = await AppSecurity.isIgnoringBatteryOptimizations();
            ignoringBattery = Boolean(res?.ignoring);
        } catch {}
    }

    onMount(() => {
        isNative = Capacitor.isNativePlatform();
        if (isNative) refreshStatus();
    });

    async function requestBattery() {
        await AppSecurity.requestBatteryOptimizationExemption().catch(() => {});
        setTimeout(refreshStatus, 1000);
        toastStore.info('Bitte bestätigen Sie „Zulassen“, damit Fahrten & Erinnerungen im Standby aktiv bleiben.');
    }
</script>

{#if isNative}
    <div class="orga-card-white p-6 md:p-8 dark:bg-slate-900 dark:border-slate-800 space-y-4">
        <div class="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <span class="w-9 h-9 flex items-center justify-center bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-xl">
                <Smartphone class="w-5 h-5" />
            </span>
            <div>
                <h2 class="text-lg font-bold text-slate-900 dark:text-slate-100">Fahrtenbuch &amp; Akku-Schutz</h2>
                <p class="text-xs text-slate-500 dark:text-slate-400">Damit Aufzeichnungen auf Samsung-Geräten bei gesperrtem Bildschirm laufen</p>
            </div>
        </div>

        <div class="grid grid-cols-1 gap-3">
            <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 flex items-center justify-between gap-3">
                <div class="flex items-center gap-2.5">
                    <MapPin class="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <div>
                        <span class="text-sm font-bold text-slate-800 dark:text-slate-100 block">1. Standort „Immer zulassen“</span>
                        <span class="text-xs text-slate-500 dark:text-slate-400">Für Kilometer-Erfassung bei ausgeschaltetem Display</span>
                    </div>
                </div>
                <button type="button" onclick={() => tripRecorder.openLocationSettings()} class="px-3 py-2 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-xs font-bold shrink-0 cursor-pointer">
                    Prüfen
                </button>
            </div>

            <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 flex items-center justify-between gap-3">
                <div class="flex items-center gap-2.5">
                    <BatteryCharging class="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <div>
                        <span class="text-sm font-bold text-slate-800 dark:text-slate-100 block">2. Akku-Optimierung ausnehmen</span>
                        <span class="text-xs text-slate-500 dark:text-slate-400">{ignoringBattery ? 'Bereits optimal eingerichtet' : 'Verhindert das Stoppen durch Energiesparmodus'}</span>
                    </div>
                </div>
                {#if ignoringBattery}
                    <span class="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                        <CheckCircle2 class="w-4 h-4" /> Aktiv
                    </span>
                {:else}
                    <button type="button" onclick={requestBattery} class="px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shrink-0 cursor-pointer">
                        Freigeben
                    </button>
                {/if}
            </div>

            <p class="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed px-1">
                <strong>Samsung-Tipp:</strong> Unter <em>Einstellungen → Akku → Grenzen für Hintergrundnutzung → Nie automatisch in Standby</em> können Sie „Seniorenassistenz“ zusätzlich fest hinterlegen.
            </p>
        </div>
    </div>
{/if}
