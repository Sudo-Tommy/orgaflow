<script lang="ts">
    import { onMount } from 'svelte';
    import { appUpdateService } from '$lib/services/appUpdateService';
    import { DownloadCloud, X } from 'lucide-svelte';

    let availableVersion = $state<string | null>(null);
    let downloadUrl = $state(appUpdateService.defaultDownloadUrl);
    let isDismissed = $state(false);

    onMount(async () => {
        const result = await appUpdateService.checkUpdate();
        if (result.hasUpdate && result.availableVersion) {
            availableVersion = result.availableVersion;
            if (result.downloadUrl) {
                downloadUrl = result.downloadUrl;
            }
        }
    });

    function handleDownload() {
        appUpdateService.openDownload(downloadUrl);
        isDismissed = true;
    }
</script>

{#if availableVersion && !isDismissed}
    <aside 
        aria-label="App-Aktualisierung"
        class="fixed top-3 left-3 right-3 sm:left-auto sm:right-6 sm:w-96 z-[9980] bg-indigo-600 text-white rounded-2xl p-4 shadow-xl shadow-indigo-950/40 border border-indigo-400/30 flex items-center gap-3 animate-in fade-in slide-in-from-top-4"
    >
        <div class="p-2.5 rounded-xl bg-white/10 text-white shrink-0">
            <DownloadCloud class="w-5 h-5" />
        </div>

        <div class="flex-1 min-w-0">
            <div class="text-xs font-bold leading-tight">Neues App-Update ({availableVersion})</div>
            <div class="text-[11px] text-indigo-100/90 truncate">Neue Funktionen & Verbesserungen bereit</div>
        </div>

        <div class="flex items-center gap-1.5 shrink-0">
            <button
                type="button"
                onclick={handleDownload}
                class="px-3 py-1.5 rounded-xl bg-white text-indigo-700 font-bold text-xs hover:bg-indigo-50 active:scale-95 transition-all shadow-sm"
            >
                Laden
            </button>

            <button
                type="button"
                onclick={() => isDismissed = true}
                class="p-1.5 rounded-lg text-indigo-200 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Später erinnern"
            >
                <X class="w-4 h-4" />
            </button>
        </div>
    </aside>
{/if}
