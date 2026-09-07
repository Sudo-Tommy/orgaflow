<script lang="ts">
    import { onMount } from "svelte";
    import { fade, slide } from "svelte/transition";
    import { 
        X, 
        RefreshCw, 
        ExternalLink, 
        Check, 
        AlertCircle, 
        ShieldCheck, 
        Settings, 
        Calendar as CalendarIcon, 
        Loader2, 
        Link2Off, 
        HelpCircle, 
        ChevronDown, 
        MapPin, 
        Smartphone 
    } from "lucide-svelte";
    import { googleCalendarService, type GoogleCalendarStatus } from "$lib/services/googleCalendarService";
    import { toastStore } from "$lib/services/toastService.svelte";
    import { confirmStore } from "$lib/services/confirmService.svelte";

    // svelte-ignore non_reactive_update
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
    let showGuide = $state(false);
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
                // Automatischen Sync nach Verknüpfung starten
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

    function formatLastSync(isoStr: string | null) {
        if (!isoStr) return 'Noch nie synchronisiert';
        try {
            const d = new Date(isoStr);
            return d.toLocaleString('de-DE', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }) + ' Uhr';
        } catch {
            return isoStr;
        }
    }
</script>

<dialog
    bind:this={dialog}
    class="bg-transparent backdrop:bg-neutral-950/60 backdrop:backdrop-blur-sm p-0 m-auto max-w-xl w-full text-left outline-none"
    onclose={close}
>
    {#if isOpen}
        <div 
            transition:fade={{ duration: 150 }}
            class="bg-white rounded-3xl shadow-2xl border border-neutral-100 overflow-hidden flex flex-col max-h-[90vh]"
        >
            <!-- Header -->
            <div class="px-6 py-5 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/60 shrink-0">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-2xl bg-white border border-neutral-200/80 shadow-sm flex items-center justify-center shrink-0">
                        <!-- Google G Icon -->
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
                    class="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-500 hover:text-neutral-800 flex items-center justify-center transition-colors active:scale-95 cursor-pointer"
                >
                    <X class="w-4 h-4" />
                </button>
            </div>

            <!-- Content Area -->
            <div class="p-6 overflow-y-auto space-y-6">
                {#if isLoading}
                    <div class="py-12 flex flex-col items-center justify-center gap-3 text-neutral-400">
                        <Loader2 class="w-8 h-8 animate-spin text-brand-600" />
                        <span class="text-sm font-medium">Lade Kalender-Status...</span>
                    </div>
                {:else if status.connected}
                    <!-- ==================================================== -->
                    <!-- VERBUNDEN STATUS-KARTE                                -->
                    <!-- ==================================================== -->
                    <div class="bg-emerald-50/70 border-2 border-emerald-200/80 rounded-2xl p-5 relative overflow-hidden">
                        <div class="flex items-start justify-between gap-4">
                            <div class="flex items-center gap-3.5">
                                <div class="w-12 h-12 rounded-2xl bg-white shadow-sm border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
                                    <Check class="w-6 h-6 stroke-[2.5]" />
                                </div>
                                <div>
                                    <div class="flex items-center gap-1.5 flex-wrap">
                                        <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                            <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                            Verbunden
                                        </span>
                                        <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">📅 Kalender</span>
                                        <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">✉️ Gmail-Versand</span>
                                    </div>
                                    <p class="text-sm font-black text-neutral-900 mt-1.5 truncate max-w-xs">{status.googleEmail || 'Google-Konto'}</p>
                                </div>
                            </div>
                        </div>

                        <!-- Info & Zeitstempel -->
                        <div class="mt-4 pt-4 border-t border-emerald-200/60 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-neutral-600 gap-2">
                            <span>Letzte Synchronisation:</span>
                            <span class="font-bold text-neutral-800">{formatLastSync(status.lastSync)}</span>
                        </div>
                    </div>

                    <!-- Live Sync Schalter -->
                    <div class="flex items-center justify-between p-4 rounded-2xl border border-neutral-200 bg-neutral-50/60">
                        <div class="pr-4">
                            <p class="text-sm font-bold text-neutral-900">Echtzeit-Synchronisation</p>
                            <p class="text-xs text-neutral-500 mt-0.5">Termine beim Anlegen, Ändern oder Löschen in OrgaFlow sofort übertragen.</p>
                        </div>
                        <button 
                            type="button" 
                            role="switch" 
                            aria-checked={status.syncEnabled}
                            aria-label="Echtzeit-Synchronisation umschalten"
                            onclick={handleToggleLiveSync}
                            class="w-12 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 shadow-inner {status.syncEnabled ? 'bg-emerald-600' : 'bg-neutral-300'}"
                        >
                            <span class="w-5 h-5 rounded-full bg-white absolute top-0.5 left-0.5 transition-transform shadow-md {status.syncEnabled ? 'translate-x-6' : 'translate-x-0'}"></span>
                        </button>
                    </div>

                    <!-- Haupt-Aktionen -->
                    <div class="space-y-2.5">
                        <!-- Komplett Sync Button -->
                        <button 
                            type="button" 
                            onclick={handleSyncAll}
                            disabled={isSyncing}
                            class="orga-button-primary w-full py-3.5 justify-center text-sm shadow-brand-900/15 cursor-pointer disabled:opacity-60"
                        >
                            {#if isSyncing}
                                <Loader2 class="w-4 h-4 animate-spin" />
                                <span>Synchronisiere Termine...</span>
                            {:else}
                                <RefreshCw class="w-4 h-4" />
                                <span>Jetzt alle anstehenden Termine synchronisieren</span>
                            {/if}
                        </button>

                        <div class="grid grid-cols-2 gap-2.5">
                            <a 
                                href="https://calendar.google.com" 
                                target="_blank" 
                                rel="noreferrer"
                                class="orga-button-ghost justify-center py-2.5 text-xs text-neutral-700 hover:text-neutral-900 inline-flex items-center gap-1.5"
                            >
                                <ExternalLink class="w-3.5 h-3.5" />
                                <span>Google Kalender öffnen</span>
                            </a>

                            <button 
                                type="button" 
                                onclick={handleDisconnect}
                                class="orga-button-ghost justify-center py-2.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 inline-flex items-center gap-1.5 cursor-pointer"
                            >
                                <Link2Off class="w-3.5 h-3.5" />
                                <span>Verbindung trennen</span>
                            </button>
                        </div>
                    </div>
                {:else}
                    <!-- ==================================================== -->
                    <!-- NICHT VERBUNDEN STATUS                                -->
                    <!-- ==================================================== -->
                    <div class="text-center space-y-4">
                        <div class="w-16 h-16 rounded-3xl bg-blue-50 text-blue-600 border border-blue-200/80 mx-auto flex items-center justify-center shadow-sm">
                            <CalendarIcon class="w-8 h-8" />
                        </div>
                        <div class="max-w-md mx-auto">
                            <h4 class="text-lg font-black text-neutral-900">Termine automatisch synchronisieren</h4>
                            <p class="text-xs text-neutral-500 mt-1 leading-relaxed">
                                Verknüpfen Sie Ihren Google Kalender, damit alle Einsätze, Besuche und Termine live auf Ihrem Smartphone und Computer erscheinen.
                            </p>
                        </div>
                    </div>

                    <!-- Feature Highlights -->
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div class="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200/80 text-center">
                            <Smartphone class="w-5 h-5 text-brand-600 mx-auto mb-1.5" />
                            <p class="text-xs font-bold text-neutral-900">Überall abrufbar</p>
                            <p class="text-[10px] text-neutral-500 mt-0.5">Auf Android, iPhone & PC in Ihrer Kalender-App</p>
                        </div>
                        <div class="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200/80 text-center">
                            <RefreshCw class="w-5 h-5 text-emerald-600 mx-auto mb-1.5" />
                            <p class="text-xs font-bold text-neutral-900">Echtzeit-Sync</p>
                            <p class="text-[10px] text-neutral-500 mt-0.5">Änderungen werden sofort automatisch übertragen</p>
                        </div>
                        <div class="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200/80 text-center">
                            <MapPin class="w-5 h-5 text-amber-600 mx-auto mb-1.5" />
                            <p class="text-xs font-bold text-neutral-900">Mit Navigation</p>
                            <p class="text-[10px] text-neutral-500 mt-0.5">Klienten-Adresse direkt für Google Maps verlinkt</p>
                        </div>
                    </div>

                    <!-- Haupt-Verbindungs-Button -->
                    {#if status.hasCredentials}
                        <button 
                            type="button" 
                            onclick={handleConnect}
                            disabled={isConnecting}
                            class="w-full py-4 px-6 rounded-2xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-sm shadow-xl shadow-neutral-900/15 flex items-center justify-center gap-3 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
                        >
                            {#if isConnecting}
                                <Loader2 class="w-5 h-5 animate-spin" />
                                <span>Öffne Google-Login...</span>
                            {:else}
                                <svg class="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                                </svg>
                                <span>Mit Google Kalender verknüpfen</span>
                            {/if}
                        </button>
                    {:else}
                        <div class="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
                            <AlertCircle class="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                                <p class="font-bold">Google API Anmeldedaten erforderlich</p>
                                <p class="mt-0.5 text-amber-800">
                                    Bevor Mitarbeiter ihren Google Kalender verbinden können, muss einmalig eine Google Cloud OAuth-Client-ID hinterlegt werden.
                                </p>
                            </div>
                        </div>
                    {/if}
                {/if}

                <!-- ==================================================== -->
                <!-- API CREDENTIALS KONFIGURATION (Accordion)           -->
                <!-- ==================================================== -->
                <div class="border-t border-neutral-100 pt-4">
                    <button 
                        type="button" 
                        onclick={() => showConfigForm = !showConfigForm}
                        class="flex items-center justify-between w-full text-xs font-bold text-neutral-500 hover:text-neutral-800 py-1 transition-colors cursor-pointer"
                    >
                        <span class="flex items-center gap-1.5">
                            <Settings class="w-3.5 h-3.5" />
                            <span>Google Cloud OAuth-Anmeldedaten konfigurieren</span>
                        </span>
                        <ChevronDown class="w-4 h-4 transition-transform duration-200 {showConfigForm ? 'rotate-180' : ''}" />
                    </button>

                    {#if showConfigForm}
                        <form onsubmit={(e) => { e.preventDefault(); handleSaveCredentials(); }} autocomplete="off" class="mt-4 space-y-4 bg-neutral-50 p-4 rounded-2xl border border-neutral-200">
                            <div>
                                <label for="g-client-id" class="block text-[11px] font-bold text-neutral-600 uppercase tracking-wider mb-1">
                                    Google Client-ID
                                </label>
                                <input 
                                    id="g-client-id" 
                                    type="text"
                                    autocomplete="off"
                                    bind:value={clientIdInput} 
                                    placeholder="z.B. 123456789-abc.apps.googleusercontent.com" 
                                    class="orga-input-clear py-2 px-3 text-xs font-mono"
                                />
                            </div>

                            <div>
                                <label for="g-client-secret" class="block text-[11px] font-bold text-neutral-600 uppercase tracking-wider mb-1">
                                    Google Client-Secret
                                </label>
                                <input 
                                    id="g-client-secret" 
                                    type="password" 
                                    autocomplete="new-password"
                                    bind:value={clientSecretInput} 
                                    placeholder="GOCSPX-..." 
                                    class="orga-input-clear py-2 px-3 text-xs font-mono"
                                />
                            </div>

                            <div class="flex items-center justify-between pt-1">
                                <button 
                                    type="button" 
                                    onclick={() => showGuide = !showGuide}
                                    class="text-xs text-brand-600 hover:text-brand-800 font-bold inline-flex items-center gap-1 cursor-pointer"
                                >
                                    <HelpCircle class="w-3.5 h-3.5" />
                                    <span>Woher erhalte ich diese Daten?</span>
                                </button>

                                <button 
                                    type="submit"
                                    class="orga-button-primary py-2 px-4 text-xs cursor-pointer"
                                >
                                    Speichern
                                </button>
                            </div>

                            {#if showGuide}
                                <div transition:slide={{ duration: 150 }} class="text-[11px] text-neutral-600 space-y-1.5 p-3 rounded-xl bg-white border border-neutral-200/80 mt-2">
                                    <p class="font-bold text-neutral-900 mb-1">Kurzanleitung Google Cloud Console:</p>
                                    <p>1. Öffne die <a href="https://console.cloud.google.com/apis/credentials" target="_blank" class="text-brand-600 font-bold underline">Google Cloud Console</a> und wähle dein Projekt.</p>
                                    <p>2. Aktiviere unter <em>APIs &amp; Dienste &rarr; Bibliothek</em>:
                                       <br>&bull; <strong>Google Calendar API</strong> (für Termine)
                                       <br>&bull; <strong>Gmail API</strong> (für Rechnungs- &amp; Mail-Versand)
                                    </p>
                                    <p>3. Erstelle Anmeldedaten &rarr; <strong>OAuth-Client-ID</strong> &rarr; Anwendungstyp: <strong>Webanwendung</strong>.</p>
                                    <p>4. Trage als <strong>Autorisierte Weiterleitungs-URI</strong> ein:<br>
                                       <code class="bg-neutral-100 px-1 py-0.5 rounded font-mono text-[10px] text-neutral-800">https://ihre-seniorenassistenz.com/api/google-calendar/callback</code>
                                    </p>
                                    <p>5. Kopiere Client-ID und Client-Secret in die obigen Felder.</p>
                                </div>
                            {/if}
                        </form>
                    {/if}
                </div>
            </div>

            <!-- Footer -->
            <div class="px-6 py-4 border-t border-neutral-100 flex items-center justify-end bg-neutral-50/40 shrink-0">
                <button type="button" onclick={close} class="orga-button-ghost py-2 px-5 text-xs font-bold cursor-pointer">
                    Schließen
                </button>
            </div>
        </div>
    {/if}
</dialog>
