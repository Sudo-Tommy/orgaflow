<script lang="ts">
  import { onMount } from 'svelte';
  import { Download, Smartphone, X, CheckCircle2 } from 'lucide-svelte';

  let isInstalled = $state(false);
  let deferredPrompt = $state<any>(null);
  let showInfoModal = $state(false);
  let isIos = $state(false);

  onMount(() => {
    // 1. Prüfen, ob die App bereits im Standalone-Modus (installiert) läuft
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://');

    if (isStandalone) {
      isInstalled = true;
      return;
    }

    // 2. iOS-Erkennung für spezifische Installations-Hinweise
    const userAgent = window.navigator.userAgent.toLowerCase();
    isIos = /iphone|ipad|ipod/.test(userAgent);

    // 3. Auf Chromium beforeinstallprompt hören
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      deferredPrompt = e;
      isInstalled = false;
    };

    // 4. Bei erfolgreicher Installation Button sofort ausblenden
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
        }
      } catch {
        showInfoModal = true;
      }
    } else {
      showInfoModal = true;
    }
  }
</script>

{#if !isInstalled}
  <button
    type="button"
    onclick={handleInstallClick}
    class="min-h-11 px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white border border-indigo-500/30 text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer active:scale-95 touch-manipulation"
    title="OrgaFlow als App auf Ihrem Gerät installieren"
  >
    <Download class="w-4 h-4 animate-bounce" />
    <span>App herunterladen</span>
  </button>
{/if}

<!-- Hilfs-Modal für Browser ohne direkten Prompt (z. B. Safari / iOS) -->
{#if showInfoModal && !isInstalled}
  <div 
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-enter"
    role="dialog"
    aria-modal="true"
  >
    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl relative text-left">
      <button
        type="button"
        onclick={() => showInfoModal = false}
        class="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl transition-colors cursor-pointer"
        aria-label="Schließen"
      >
        <X class="w-5 h-5" />
      </button>

      <div class="flex items-center gap-3 mb-4">
        <div class="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
          <Smartphone class="w-6 h-6" />
        </div>
        <div>
          <h3 class="text-base font-black text-slate-900 dark:text-white">OrgaFlow App installieren</h3>
          <p class="text-xs text-slate-500">Schneller Zugriff & Offline-Nutzung</p>
        </div>
      </div>

      <div class="space-y-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
        {#if isIos}
          <div class="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-2">
            <p class="font-bold text-slate-800 dark:text-slate-200">So installieren Sie OrgaFlow auf dem iPhone/iPad:</p>
            <ol class="list-decimal list-inside space-y-1 text-xs">
              <li>Tippen Sie unten in Safari auf das <strong>Teilen-Symbol</strong> (Quadrat mit Pfeil nach oben).</li>
              <li>Wählen Sie <strong>„Zum Home-Bildschirm“</strong> aus.</li>
              <li>Tippen Sie oben rechts auf <strong>„Hinzufügen“</strong>.</li>
            </ol>
          </div>
        {:else}
          <div class="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-2">
            <p class="font-bold text-slate-800 dark:text-slate-200">Installation im Browser:</p>
            <ol class="list-decimal list-inside space-y-1 text-xs">
              <li>Öffnen Sie das Browsermenü (drei Punkte oben rechts).</li>
              <li>Wählen Sie <strong>„App installieren“</strong> oder <strong>„Zum Startbildschirm hinzufügen“</strong>.</li>
              <li>Bestätigen Sie den Vorgang mit <strong>„Installieren“</strong>.</li>
            </ol>
          </div>
        {/if}

        <p class="text-xs text-slate-400">
          Nach der Installation startet OrgaFlow direkt als eigenständige Vollbild-App ohne Browserleisten.
        </p>
      </div>

      <div class="mt-6 flex justify-end">
        <button
          type="button"
          onclick={() => showInfoModal = false}
          class="min-h-11 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
        >
          Verstanden
        </button>
      </div>
    </div>
  </div>
{/if}

