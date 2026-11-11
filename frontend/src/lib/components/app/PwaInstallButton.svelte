<script lang="ts">
    import { onMount } from 'svelte';
    import { Capacitor } from '@capacitor/core';
    import { Download } from 'lucide-svelte';

    let {
        variant = 'compact'
    }: {
        variant?: 'compact' | 'full';
    } = $props();

    let deferredPrompt: any = $state(null);
    let canInstall = $state(false);

    onMount(() => {
        // Nicht anzeigen, wenn bereits nativ oder als PWA Standalone installiert
        if (Capacitor.isNativePlatform()) return;
        if (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone) {
            return;
        }

        const handlePrompt = (e: Event) => {
            e.preventDefault();
            deferredPrompt = e;
            canInstall = true;
        };

        window.addEventListener('beforeinstallprompt', handlePrompt);
        window.addEventListener('appinstalled', () => {
            canInstall = false;
            deferredPrompt = null;
        });

        return () => {
            window.removeEventListener('beforeinstallprompt', handlePrompt);
        };
    });

    async function installPwa() {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            canInstall = false;
        }
        deferredPrompt = null;
    }
</script>

{#if canInstall}
    {#if variant === 'full'}
        <button
            type="button"
            onclick={installPwa}
            class="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 font-semibold text-xs hover:bg-indigo-100 dark:hover:bg-indigo-900/40 active:scale-98 transition-all"
        >
            <span class="flex items-center gap-2">
                <Download class="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>App auf PC installieren</span>
            </span>
            <span class="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-md bg-indigo-200/60 dark:bg-indigo-800 text-indigo-800 dark:text-indigo-200">
                1-Klick
            </span>
        </button>
    {:else}
        <button
            type="button"
            onclick={installPwa}
            title="Seniorenassistenz als App auf Ihrem PC installieren"
            class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200/70 dark:border-indigo-800/50 active:scale-95 transition-all"
        >
            <Download class="w-3.5 h-3.5" />
            <span class="hidden sm:inline">App installieren</span>
        </button>
    {/if}
{/if}
