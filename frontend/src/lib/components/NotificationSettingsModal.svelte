<script lang="ts">
    import { toastStore } from "$lib/services/toastService.svelte";
    import { isNativeApp } from "$lib/services/apiConfig";
    import { reminderScheduler } from "$lib/services/reminders/reminderScheduler";
    import { LocalNotifications } from "@capacitor/local-notifications";
    import NotificationTopicsList from "./notifications/NotificationTopicsList.svelte";
    import ReminderSettings from "./settings/ReminderSettings.svelte";
    import { isWebPushSubscribed, syncWebPushPrefs, unsubscribeWebPush, subscribeWebPush, sendWebTestPush } from "./notifications/webPushHelper";
    import { onMount } from "svelte";

    let dialog: HTMLDialogElement;
    let isLoading = $state(false);
    let isSubscribed = $state(false);
    let isSupported = $state(true);
    let isNative = $state(false);
    let nativePermissionGranted = $state(false);
    let prefs = $state({ requests: true, emails: true, chats: true, updates: true });
    let prefsTimeout: any;

    onMount(() => {
        const stored = localStorage.getItem('orga_notify_prefs');
        if (stored) { try { prefs = { ...prefs, ...JSON.parse(stored) }; } catch {} }
    });

    $effect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('orga_notify_prefs', JSON.stringify(prefs));
            if (isSubscribed && !isNative) {
                clearTimeout(prefsTimeout);
                prefsTimeout = setTimeout(() => { syncWebPushPrefs($state.snapshot(prefs)).catch(() => {}); }, 1000);
            }
        }
    });

    export async function open() {
        isNative = isNativeApp();
        if (isNative) {
            isSupported = true;
            try {
                const perm = await LocalNotifications.checkPermissions();
                nativePermissionGranted = perm.display === 'granted';
            } catch {
                nativePermissionGranted = false;
            }
        } else if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            isSupported = false;
        } else {
            try { isSubscribed = await isWebPushSubscribed(); } catch {}
        }
        dialog?.showModal();
    }

    export function close() { dialog?.close(); }

    async function requestNativePermission() {
        nativePermissionGranted = await reminderScheduler.requestPermissions();
        if (nativePermissionGranted) toastStore.success('Benachrichtigungen für diese App aktiviert.');
        else toastStore.warning('Bitte erlauben Sie Benachrichtigungen in den Handy-Einstellungen.');
    }

    async function togglePush() {
        isLoading = true;
        try {
            if (isSubscribed) {
                await unsubscribeWebPush();
                isSubscribed = false;
                toastStore.info("Push-Benachrichtigungen deaktiviert.");
            } else {
                const status = await subscribeWebPush($state.snapshot(prefs));
                if (status !== 'granted') {
                    toastStore.warning("Berechtigung für Benachrichtigungen wurde im Browser blockiert.");
                    return;
                }
                isSubscribed = true;
                toastStore.success('Gerät für Benachrichtigungen gekoppelt!');
            }
        } catch {
            toastStore.error('Fehler beim Ändern der Push-Einstellungen.');
        } finally {
            isLoading = false;
        }
    }

    async function testPush() {
        isLoading = true;
        try {
            const data = await sendWebTestPush();
            if (data?.pushResults) {
                const errors = data.pushResults.filter((r: any) => r.status === 'error');
                if (errors.length > 0) toastStore.error(`Apple/Google hat blockiert: ${errors[0].error}`);
                else toastStore.success('Signal erfolgreich abgeliefert!');
            } else {
                toastStore.warning(data?.error || 'Antwort unklar.');
            }
        } catch {
            toastStore.error('Fehler beim Senden des Test-Signals.');
        } finally {
            isLoading = false;
        }
    }
</script>

<dialog bind:this={dialog} class="zero-inner-scroll-modal p-0 bg-transparent backdrop:bg-black/50 backdrop:backdrop-blur-sm w-full max-w-lg mx-auto my-6 sm:my-10 rounded-3xl" onclick={(e) => { if (e.target === dialog) close(); }}>
    <div class="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-3xl w-full flex flex-col relative shadow-2xl border border-slate-200 dark:border-slate-800">
        <div class="p-5 sm:p-6 shrink-0 relative border-b border-neutral-100 dark:border-slate-800">
            <button aria-label="Schließen" onclick={close} class="absolute top-5 right-5 w-10 h-10 bg-neutral-100 dark:bg-slate-800 hover:bg-neutral-200 dark:hover:bg-slate-700 text-neutral-600 dark:text-slate-300 rounded-full flex items-center justify-center transition-colors z-10 active:scale-95 cursor-pointer"><svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
            <h2 class="text-xl font-bold text-neutral-900 dark:text-white mb-1 flex items-center gap-2"><span>🔔</span> Benachrichtigungen</h2>
            <p class="text-sm text-neutral-500 dark:text-slate-400">Passen Sie an, worüber dieses Gerät Sie informieren darf.</p>
        </div>

        <div class="flex-1 p-5 sm:p-6 bg-neutral-50/30 dark:bg-slate-950/40 space-y-4">
        {#if isNative}
            <div class="rounded-2xl p-4 border flex items-center justify-between gap-3 {nativePermissionGranted ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800' : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'}">
                <div>
                    <p class="font-bold text-sm">{nativePermissionGranted ? 'Geräte-Benachrichtigungen aktiv' : 'Freigabe auf dem Handy nötig'}</p>
                    <p class="text-xs opacity-80 mt-0.5">{nativePermissionGranted ? 'Erinnerungen erscheinen zuverlässig – auch offline.' : 'Tippen Sie auf Erlauben für Termin-Hinweise.'}</p>
                </div>
                {#if !nativePermissionGranted}
                    <button type="button" onclick={requestNativePermission} class="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shrink-0 cursor-pointer">Erlauben</button>
                {/if}
            </div>
            <ReminderSettings />
        {:else if !isSupported}
            <div class="bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900 p-4 rounded-xl text-rose-700 dark:text-rose-300 text-sm font-medium mb-6">Ihr aktueller Browser unterstützt keine Push-Benachrichtigungen. (Nutzen Sie Safari auf iOS ab Version 16.4 oder Google Chrome).</div>
        {:else}
            <div class="bg-neutral-50 dark:bg-slate-800 rounded-2xl p-4 sm:p-5 border border-neutral-100 dark:border-slate-700 flex items-center justify-between gap-4 mb-6">
                <div>
                    <p class="font-bold text-neutral-900 dark:text-white text-sm">Push-Benachrichtigungen (Gerät)</p>
                    <p class="text-xs text-neutral-500 dark:text-slate-400 mt-0.5">{isSubscribed ? 'Aktiviert für dieses Gerät' : 'Auf diesem Gerät deaktiviert'}</p>
                </div>
                <button type="button" aria-label="Push-Benachrichtigungen ein- oder ausschalten" onclick={togglePush} disabled={isLoading} class="relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none {isSubscribed ? 'bg-emerald-500' : 'bg-neutral-300 dark:bg-slate-600'} disabled:opacity-50" role="switch" aria-checked={isSubscribed}><span class="pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out {isSubscribed ? 'translate-x-5' : 'translate-x-0'}"></span></button>
            </div>
            <NotificationTopicsList bind:prefs />
            {#if isSubscribed}
                <div class="mb-6 p-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 rounded-xl animate-enter">
                    <p class="text-xs text-blue-800 dark:text-blue-200 mb-3 font-medium">Testen Sie die Verbindung zum Server:</p>
                    <button type="button" onclick={testPush} disabled={isLoading} class="w-full py-2 bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 font-bold rounded-lg hover:bg-blue-100 transition-colors shadow-sm text-sm active:scale-95 cursor-pointer">📲 Test-Nachricht senden</button>
                </div>
            {/if}
        {/if}
        </div>

        <div class="border-t border-neutral-100 dark:border-slate-800 p-4 sm:p-5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md flex flex-row gap-2 sm:gap-3 shrink-0 justify-end rounded-b-3xl">
            <button type="button" onclick={close} aria-label="Speichern und Schließen" class="orga-button-primary shadow-indigo-600/20 flex-1 sm:flex-none py-3 sm:py-2.5 px-4 sm:px-6 active:scale-95 text-xs sm:text-sm flex justify-center items-center gap-1.5 cursor-pointer">
                <span>Speichern &amp; Schließen</span>
            </button>
        </div>
    </div>
</dialog>
