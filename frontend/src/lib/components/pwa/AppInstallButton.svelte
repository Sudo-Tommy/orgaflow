<script lang="ts">
  import { onMount } from 'svelte';
  import { Download, Smartphone, X, ExternalLink } from 'lucide-svelte';
  import { portal } from '$lib/actions/portal';
  import { Capacitor } from '@capacitor/core';

  // Direkter Download-Link für die echte APK vom eigenen PocketBase-Server
  const APK_DOWNLOAD_URL = '/downloads/seniorenassistenz.apk';
  const GITHUB_RELEASES_PAGE = 'https://github.com/Sudo-Tommy/orgaflow/releases';

  function checkIsAppInstalled(): boolean {
    if (typeof window === 'undefined') return false;

    // 1. Nativ via Capacitor (Android APK / iOS)
    if (Capacitor.isNativePlatform()) return true;
    if (Boolean((window as any).Capacitor?.isNativePlatform?.())) return true;

    // 2. Installierte PWA (Standalone, Fullscreen oder Minimal-UI)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      window.matchMedia('(display-mode: minimal-ui)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://');

    if (isStandalone) return true;

    // 3. Startparameter von installierten Web-Apps
    if (window.location.search.includes('source=pwa') || window.location.search.includes('mode=pwa')) {
      return true;
    }

    return false;
  }

  let isInstalled = $state(checkIsAppInstalled());
  let deferredPrompt = $state<any>(null);
  let showInfoModal = $state(false);
  let isIos = $state(false);

  onMount(() => {
    if (checkIsAppInstalled()) {
      isInstalled = true;
      return;
    }

    // iOS-Erkennung für spezifische Installations-Hinweise
    const userAgent = window.navigator.userAgent.toLowerCase();
    isIos = /iphone|ipad|ipod/.test(userAgent);

    // Auf Chromium beforeinstallprompt hören
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      deferredPrompt = e;
      isInstalled = false;
    };

    const handleAppInstalled = () => {
      isInstalled = true;
      deferredPrompt = null;
      showInfoModal = false;
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  });

  async function handleInstallClick() {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice?.outcome === 'accepted') {
          isInstalled = true;
          deferredPrompt = null;
          return;
        }
      } catch {
        // Fallback to modal
      }
    }
    showInfoModal = true;
  }
</script>

{#if !isInstalled}
  <div class="mt-2.5 flex justify-center w-full">
    <button
      type="button"
      onclick={handleInstallClick}
      class="min-h-10 px-4 py-2 bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 hover:from-indigo-700 hover:to-violet-800 text-white border border-indigo-400/30 text-xs sm:text-sm font-bold rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95 touch-manipulation"
      title="Seniorenassistenz als App installieren oder APK herunterladen"
    >
      <Download class="w-4 h-4 animate-bounce" />
      <span>App herunterladen</span>
    </button>
  </div>
{/if}

<!-- Installations- und Download-Modal -->
{#if showInfoModal && !isInstalled}
  <div 
    use:portal
    class="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-enter"
    role="dialog"
    aria-modal="true"
  >
    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl relative text-left">
      <button
        type="button"
        onclick={() => showInfoModal = false}
        class="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl transition-colors cursor-pointer"
        aria-label="Schließen"
      >
        <X class="w-5 h-5" />
      </button>

      <div class="flex items-center gap-3.5 mb-5">
        <div class="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
          <Smartphone class="w-6 h-6" />
        </div>
        <div>
          <h3 class="text-base sm:text-lg font-black text-slate-900 dark:text-white">OrgaFlow App herunterladen</h3>
          <p class="text-xs text-slate-500 dark:text-slate-400">Installation für Android & Tablet</p>
        </div>
      </div>

      <div class="space-y-4 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
        <!-- Option 1: Direkter Download der Android APK -->
        <div class="p-4 bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/60 dark:from-indigo-950/50 dark:via-slate-900 dark:to-purple-950/40 rounded-2xl border-2 border-indigo-300 dark:border-indigo-700/80 space-y-2.5">
          <div class="flex items-center justify-between">
            <span class="text-xs font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
              Direkte Android APK (Empfohlen)
            </span>
            <span class="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
              Neuester Build
            </span>
          </div>
          <p class="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
            Laden Sie die fertige Android-Installationsdatei direkt auf Ihr Gerät herunter.
          </p>
          <a
            href={APK_DOWNLOAD_URL}
            download="Seniorenassistenz.apk"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl font-black text-sm text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] shadow-md transition-all touch-manipulation"
          >
            <Download class="w-4 h-4" />
            <span>Seniorenassistenz APK herunterladen (1-Klick)</span>
          </a>
          <p class="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
            💡 <em>Hinweis:</em> Falls Android nachfragt, wählen Sie bei der Installation bitte <strong>„Trotzdem installieren“</strong> bzw. erlauben Sie <em>„Unbekannte Apps installieren“</em>.
          </p>
        </div>

        <!-- Option 2: Schnelle Browser-Installation (PWA) -->
        <div class="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-1.5">
          <p class="font-bold text-xs text-slate-800 dark:text-slate-200">Alternative: Direkt im Browser installieren</p>
          {#if isIos}
            <ol class="list-decimal list-inside space-y-1 text-xs text-slate-600 dark:text-slate-400">
              <li>Tippen Sie in Safari auf das <strong>Teilen-Symbol</strong> (Quadrat mit Pfeil).</li>
              <li>Wählen Sie <strong>„Zum Home-Bildschirm“</strong>.</li>
            </ol>
          {:else}
            <ol class="list-decimal list-inside space-y-1 text-xs text-slate-600 dark:text-slate-400">
              <li>Tippen Sie oben rechts auf die <strong>3 Punkte</strong> Ihres Browsers.</li>
              <li>Wählen Sie <strong>„App installieren“</strong> oder <strong>„Zum Startbildschirm hinzufügen“</strong>.</li>
            </ol>
          {/if}
        </div>
      </div>

      <div class="mt-5 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3">
        <a
          href={GITHUB_RELEASES_PAGE}
          target="_blank"
          rel="noopener noreferrer"
          class="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-medium"
        >
          <span>Alle Versionen auf GitHub</span>
          <ExternalLink class="w-3 h-3" />
        </a>
        <button
          type="button"
          onclick={() => showInfoModal = false}
          class="min-h-10 px-5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-colors cursor-pointer"
        >
          Schließen
        </button>
      </div>
    </div>
  </div>
{/if}
