<script lang="ts">
    import { fade } from "svelte/transition";
    import { X, Loader2 } from "lucide-svelte";
    import { googleCalendarService, type GoogleCalendarStatus } from "$lib/services/googleCalendarService";
    import { toastStore } from "$lib/services/toastService.svelte";
    import { confirmStore } from "$lib/services/confirmService.svelte";
    import GoogleCalendarConnectedView from "./googleCalendar/GoogleCalendarConnectedView.svelte";
    import GoogleCalendarDisconnectedView from "./googleCalendar/GoogleCalendarDisconnectedView.svelte";
    import GoogleCalendarConfigForm from "./googleCalendar/GoogleCalendarConfigForm.svelte";

    let dialog: HTMLDialogElement;
    let isOpen = $state(false);
    let isLoading = $state(false);
    let isSyncing = $state(false);
    let isConnecting = $state(false);

    let status = $state<GoogleCalendarStatus>({
        connected: false,
        hasCredentials: false,
        googleEmail: '',
        calendarId: 'primary',
        syncEnabled: false,
        lastSync: null
    });

    let showConfigForm = $state(false);
    let clientIdInput = $state('');
    let clientSecretInput = $state('');

    export async function open() {
        isOpen = true;
        if (dialog) dialog.showModal();
        await loadStatus();
    }

    export function close() {
        isOpen = false;
        if (dialog) dialog.close();
    }

    async function loadStatus() {
        isLoading = true;
        try {
            status = await googleCalendarService.getStatus();
            if (!status.hasCredentials && !status.connected) {
                showConfigForm = true;
            }
        } catch (e: any) {
            console.error('Fehler beim Laden des Google Kalender Status:', e);
        } finally {
            isLoading = false;
        }
    }

    async function handleConnect() {
        isConnecting = true;
        try {
            const result = await googleCalendarService.openOAuthPopup();
            if (result.success) {
                toastStore.success(`Google Kalender erfolgreich verknüpft (${result.email || 'Konto'})!`);
                await loadStatus();
                handleSyncAll();
            }
        } catch (err: any) {
            toastStore.error(err.message || 'Verbindung zu Google fehlgeschlagen.');
        } finally {
            isConnecting = false;
        }
    }

    async function handleSyncAll() {
        if (isSyncing) return;
        isSyncing = true;
        try {
            const res = await googleCalendarService.syncAll();
            toastStore.success(`Synchronisation erfolgreich: ${res.synced} von ${res.total} Terminen im Google Kalender aktualisiert!`);
            await loadStatus();
        } catch (err: any) {
            toastStore.error(err.message || 'Fehler beim Synchronisieren.');
        } finally {
            isSyncing = false;
        }
    }

    async function handleToggleLiveSync() {
        const nextState = !status.syncEnabled;
        try {
            await googleCalendarService.saveConfig({ syncEnabled: nextState });
            status.syncEnabled = nextState;
            toastStore.info(nextState ? 'Automatische Live-Synchronisation aktiviert.' : 'Live-Synchronisation pausiert.');
        } catch (err: any) {
            toastStore.error('Einstellung konnte nicht gespeichert werden.');
        }
    }

    async function handleSaveCredentials() {
        if (!clientIdInput.trim()) {
            toastStore.error('Bitte eine Client-ID angeben.');
            return;
        }

        try {
            await googleCalendarService.saveConfig({
                clientId: clientIdInput.trim(),
                clientSecret: clientSecretInput.trim()
            });
            toastStore.success('Google API-Anmeldedaten erfolgreich hinterlegt!');
            await loadStatus();
            showConfigForm = false;
        } catch (err: any) {
            toastStore.error(err.message || 'Fehler beim Speichern der Anmeldedaten.');
        }
    }

    async function handleDisconnect() {
        const confirmed = await confirmStore.ask(
            "Möchten Sie die Verknüpfung zu Ihrem Google Kalender wirklich aufheben? Ihre Termine bleiben in OrgaFlow erhalten.",
            "Google Kalender trennen?",
            "Verbindung trennen",
            "Abbrechen",
            true
        );
        if (!confirmed) return;
        try {
            await googleCalendarService.disconnect();
            toastStore.info("Google Kalender wurde getrennt.");
            await loadStatus();
        } catch (err: any) {
            toastStore.error(err.message || "Fehler beim Trennen.");
        }
    }
</script>

<dialog
    bind:this={dialog}
    class="zero-inner-scroll-modal bg-transparent backdrop:bg-neutral-950/60 backdrop:backdrop-blur-sm p-0 mx-auto my-6 sm:my-10 max-w-xl w-full text-left outline-none"
    onclose={close}
>
    {#if isOpen}
        <div 
            transition:fade={{ duration: 150 }}
            class="bg-white rounded-3xl shadow-2xl border border-neutral-100 flex flex-col"
        >
            <!-- Header -->
            <div class="px-6 py-5 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/60 shrink-0">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-2xl bg-white border border-neutral-200/80 shadow-sm flex items-center justify-center shrink-0">
                        <svg class="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                        </svg>
                    </div>
                    <div>
                        <h3 class="font-black text-neutral-900 text-lg leading-tight">Google Kalender & Google Mail</h3>
                        <p class="text-xs text-neutral-500 font-medium">Termin-Sync & E-Mail-Versand via Google</p>
                    </div>
                </div>

                <button 
                    type="button" 
                    onclick={close}
                    class="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-500 hover:text-neutral-800 flex items-center justify-center transition-colors active:scale-95 cursor-pointer min-h-[44px] min-w-[44px] touch-manipulation"
                >
                    <X class="w-4 h-4" />
                </button>
            </div>

            <!-- Content Area -->
            <div class="p-6 space-y-6">
                {#if isLoading}
                    <div class="py-12 flex flex-col items-center justify-center gap-3 text-neutral-400">
                        <Loader2 class="w-8 h-8 animate-spin text-brand-600" />
                        <span class="text-sm font-medium">Lade Kalender-Status...</span>
                    </div>
                {:else if status.connected}
                    <GoogleCalendarConnectedView
                        {status}
                        {isSyncing}
                        onToggleLiveSync={handleToggleLiveSync}
                        onSyncAll={handleSyncAll}
                        onDisconnect={handleDisconnect}
                    />
                {:else}
                    <GoogleCalendarDisconnectedView
                        {status}
                        {isConnecting}
                        onConnect={handleConnect}
                    />
                {/if}

                <!-- API Credentials Accordion -->
                <GoogleCalendarConfigForm
                    {showConfigForm}
                    bind:clientIdInput
                    bind:clientSecretInput
                    onToggleConfig={() => showConfigForm = !showConfigForm}
                    onSave={handleSaveCredentials}
                />
            </div>

            <!-- Footer -->
            <div class="px-6 py-4 border-t border-neutral-100 flex items-center justify-end bg-neutral-50/40 shrink-0">
                <button type="button" onclick={close} class="orga-button-ghost py-2.5 px-5 text-xs font-bold cursor-pointer min-h-[44px] touch-manipulation">
                    Schließen
                </button>
            </div>
        </div>
    {/if}
</dialog>
