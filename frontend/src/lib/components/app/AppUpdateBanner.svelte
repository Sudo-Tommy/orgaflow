<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { appUpdateService } from '$lib/services/appUpdateService';
    import { DownloadCloud, X, ArrowUpCircle, CheckCircle2 } from 'lucide-svelte';
    import { App as CapApp } from '@capacitor/app';
    import { Capacitor } from '@capacitor/core';

    let availableVersion = $state<string | null>(null);
    let downloadUrl = $state(appUpdateService.defaultDownloadUrl);
    let isDismissed = $state(false);
    let isDownloading = $state(false);
    let appStateListener: any = null;
    let pollTimer: any = null;

    async function checkForUpdates() {
        try {
            const result = await appUpdateService.checkUpdate();
            if (result.hasUpdate && result.availableVersion) {
                availableVersion = result.availableVersion;
                if (result.downloadUrl) {
                    downloadUrl = result.downloadUrl;
                }
            } else {
                availableVersion = null;
            }
        } catch {
            // Offline oder Fehler ignorieren
        }
    }

    onMount(async () => {
        await checkForUpdates();

        if (Capacitor.isNativePlatform()) {
            try {
                appStateListener = await CapApp.addListener('appStateChange', (state) => {
                    if (state.isActive) {
                        checkForUpdates();
                    }
                });
            } catch {}

            // Alle 5 Minuten im Hintergrund auf neue Versionen prüfen
            pollTimer = setInterval(checkForUpdates, 5 * 60 * 1000);
        }
    });

    onDestroy(() => {
        if (appStateListener?.remove) {
            appStateListener.remove();
        }
        if (pollTimer) {
            clearInterval(pollTimer);
        }
    });

    function handleDownload() {
        isDownloading = true;
        appUpdateService.openDownload(downloadUrl);
        setTimeout(() => {
            isDownloading = false;
            isDismissed = true;
        }, 4000);
    }
</script>

{#if availableVersion && !isDismissed}
    <aside 
        aria-label="App-Aktualisierung"
        class="fixed top-3 left-3 right-3 sm:left-auto sm:right-6 sm:w-96 z-[9980] bg-gradient-to-r from-indigo-700 via-indigo-600 to-violet-700 text-white rounded-2xl p-4 shadow-2xl shadow-indigo-950/50 border border-indigo-400/40 flex items-center gap-3.5 animate-in fade-in slide-in-from-top-4"
    >
        <div class="p-2.5 rounded-xl bg-white/15 text-white shrink-0 shadow-inner">
            <ArrowUpCircle class="w-6 h-6 animate-pulse" />
        </div>

        <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
                <span class="text-xs font-black tracking-wide leading-tight">Neues App-Update bereit</span>
                <span class="px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-white/20 text-white">v{availableVersion}</span>
            </div>
            <p class="text-[11px] text-indigo-100/90 truncate mt-0.5">
                {isDownloading ? 'Download wird gestartet...' : 'Wichtige Verbesserungen & Fixes'}
            </p>
        </div>

        <div class="flex items-center gap-1.5 shrink-0">
            <button
                type="button"
                onclick={handleDownload}
                disabled={isDownloading}
                class="px-3 py-1.5 rounded-xl bg-white text-indigo-700 font-bold text-xs hover:bg-indigo-50 active:scale-95 transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-75"
            >
                {#if isDownloading}
                    <CheckCircle2 class="w-3.5 h-3.5 text-emerald-600 animate-spin" />
                    <span>Lade...</span>
                {:else}
                    <DownloadCloud class="w-3.5 h-3.5" />
                    <span>Update</span>
                {/if}
            </button>

            <button
                type="button"
                onclick={() => isDismissed = true}
                class="p-1.5 rounded-lg text-indigo-200 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
                aria-label="Später erinnern"
                title="Später erinnern"
            >
                <X class="w-4 h-4" />
            </button>
        </div>
    </aside>
{/if}
