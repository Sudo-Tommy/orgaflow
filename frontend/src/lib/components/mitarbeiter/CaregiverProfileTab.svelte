<script lang="ts">
    import { onMount } from 'svelte';
    import { pb } from '$lib/services/pocketbase';
    import { themeService } from '$lib/services/themeService.svelte';
    import { toastStore } from '$lib/services/toastService.svelte';
    import { googleCalendarService, type GoogleCalendarStatus } from '$lib/services/googleCalendarService';
    import { 
        User, Award, Phone, ShieldAlert, LogOut, Sun, Moon, 
        Clock, MapPin, Briefcase, Mail, Calendar as CalendarIcon, RefreshCw, Unlink
    } from 'lucide-svelte';

    interface Props {
        onLogout?: () => void;
    }

    let { onLogout }: Props = $props();

    const user = $derived(pb.authStore.model);
    let isDarkMode = $derived(themeService.isDark);

    let googleStatus = $state<GoogleCalendarStatus | null>(null);
    let isSyncing = $state(false);
    let isConnecting = $state(false);

    async function loadGoogleStatus() {
        try {
            googleStatus = await googleCalendarService.getStatus();
        } catch {
            googleStatus = null;
        }
    }

    onMount(() => {
        loadGoogleStatus();
    });

    async function handleConnectGoogle() {
        isConnecting = true;
        try {
            const res = await googleCalendarService.openOAuthPopup();
            if (res.success) {
                toastStore.success('Google Kalender erfolgreich verknüpft!');
                await loadGoogleStatus();
            }
        } catch (e: any) {
            toastStore.error(e.message || 'Verbindung fehlgeschlagen');
        } finally {
            isConnecting = false;
        }
    }

    async function handleDisconnectGoogle() {
        if (!confirm('Möchtest du deinen Google Kalender wirklich trennen? Deine Termine in OrgaFlow bleiben erhalten.')) return;
        try {
            await googleCalendarService.disconnect();
            toastStore.info('Google-Verbindung getrennt');
            await loadGoogleStatus();
        } catch (e: any) {
            toastStore.error(e.message || 'Fehler beim Trennen');
        }
    }

    async function handleSyncAll() {
        isSyncing = true;
        try {
            const res = await googleCalendarService.syncAll();
            toastStore.success(`${res.synced} Termine mit Google synchronisiert`);
            await loadGoogleStatus();
        } catch (e: any) {
            toastStore.error(e.message || 'Sync fehlgeschlagen');
        } finally {
            isSyncing = false;
        }
    }
</script>

<div class="space-y-4 pb-24">
    <!-- Profil Header Card -->
    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs relative overflow-hidden">
        <div class="flex items-center gap-4">
            <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white font-black text-2xl flex items-center justify-center shadow-md shrink-0">
                {user?.name_first ? user.name_first[0] : 'M'}{user?.name_last ? user.name_last[0] : ''}
            </div>
            <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2 flex-wrap">
                    <h2 class="text-base sm:text-lg font-black text-slate-900 dark:text-white truncate">
                        {user?.name_first || 'Mitarbeiter'} {user?.name_last || ''}
                    </h2>
                    <span class="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                        {user?.status || 'Aktiv im Dienst'}
                    </span>
                </div>
                <p class="text-xs text-slate-500 truncate mt-0.5">{user?.email}</p>
                <div class="flex items-center gap-2 mt-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                    <Briefcase class="w-3.5 h-3.5" />
                    <span>{user?.employment_type || 'Vollzeit'} • Rolle: {user?.role || 'Pflege- & Betreuungskraft'}</span>
                </div>
            </div>
        </div>
    </div>

    <!-- Google Kalender Verknüpfung (OAuth2 - Eigener Account) -->
    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-3">
        <div class="flex items-center justify-between">
            <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <CalendarIcon class="w-4 h-4" />
                </div>
                <div>
                    <h3 class="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Google Kalender (OAuth2)</h3>
                    <p class="text-[11px] text-slate-500">Dein persönlicher Kalender-Abgleich</p>
                </div>
            </div>
            <span class="text-[11px] font-bold px-2.5 py-1 rounded-full {googleStatus?.connected ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}">
                {googleStatus?.connected ? 'Verbunden' : 'Nicht verbunden'}
            </span>
        </div>

        {#if googleStatus?.connected}
            <div class="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl space-y-1">
                <span class="text-[10px] text-slate-400 font-bold block uppercase">Verknüpftes Google-Konto:</span>
                <span class="text-xs font-bold text-slate-800 dark:text-slate-200 break-all">{googleStatus.googleEmail || 'Google-Konto aktiv'}</span>
                {#if googleStatus.lastSync}
                    <span class="text-[10px] text-slate-400 block pt-1">Letzter Abgleich: {new Date(googleStatus.lastSync).toLocaleString('de-DE')}</span>
                {/if}
            </div>

            <div class="grid grid-cols-2 gap-2 pt-1">
                <button
                    type="button"
                    onclick={handleSyncAll}
                    disabled={isSyncing}
                    class="min-h-10 px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
                >
                    <RefreshCw class="w-3.5 h-3.5 {isSyncing ? 'animate-spin' : ''}" />
                    <span>{isSyncing ? 'Synchronisiere...' : 'Jetzt abgleichen'}</span>
                </button>
                <button
                    type="button"
                    onclick={handleDisconnectGoogle}
                    class="min-h-10 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 hover:text-rose-600 text-slate-600 dark:text-slate-400 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                    <Unlink class="w-3.5 h-3.5" />
                    <span>Trennen</span>
                </button>
            </div>
        {:else}
            <p class="text-xs text-slate-500 dark:text-slate-400">
                Verbinde deinen persönlichen oder geschäftlichen Google Kalender per sicherem Google-OAuth2-Login, um deine Einsätze automatisch in deinen Kalender zu übertragen.
            </p>
            <button
                type="button"
                onclick={handleConnectGoogle}
                disabled={isConnecting}
                class="w-full min-h-11 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-colors disabled:opacity-50"
            >
                <CalendarIcon class="w-4 h-4" />
                <span>{isConnecting ? 'Verbinde mit Google...' : 'Mit Google verbinden (OAuth2)'}</span>
            </button>
        {/if}
    </div>

    <!-- Notfallkontakt Außendienst -->
    {#if user?.emergency_contacts}
        <div class="bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 rounded-3xl p-4 sm:p-5 shadow-xs space-y-1.5">
            <div class="flex items-center gap-2 text-xs font-bold text-rose-700 dark:text-rose-300 uppercase tracking-wider">
                <ShieldAlert class="w-4 h-4" />
                <span>Notfallkontakt im Außendienst</span>
            </div>
            <p class="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">{user.emergency_contacts}</p>
        </div>
    {/if}

    <!-- Qualifikationen -->
    {#if user?.qualifications}
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xs space-y-2">
            <div class="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                <Award class="w-4 h-4" />
                <span>Qualifikationen & Nachweise</span>
            </div>
            <p class="text-xs sm:text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl">{user.qualifications}</p>
        </div>
    {/if}

    <!-- Kontaktdaten -->
    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xs space-y-2.5">
        <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider">Erreichbarkeit & Anschrift</h3>
        <div class="space-y-2 text-xs sm:text-sm">
            <div class="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                <Phone class="w-4 h-4 text-emerald-500 shrink-0" />
                <div>
                    <span class="text-[10px] text-slate-400 block font-bold">Diensttelefon / Mobil</span>
                    <span class="font-bold text-slate-800 dark:text-slate-200">{user?.handy || user?.tel || 'Nicht hinterlegt'}</span>
                </div>
            </div>
            <div class="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                <Mail class="w-4 h-4 text-indigo-500 shrink-0" />
                <div>
                    <span class="text-[10px] text-slate-400 block font-bold">Dienstliche E-Mail</span>
                    <span class="font-bold text-slate-800 dark:text-slate-200">{user?.email || 'Nicht hinterlegt'}</span>
                </div>
            </div>
            {#if user?.street || user?.city}
                <div class="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                    <MapPin class="w-4 h-4 text-slate-400 shrink-0" />
                    <div>
                        <span class="text-[10px] text-slate-400 block font-bold">Wohnort</span>
                        <span class="font-bold text-slate-800 dark:text-slate-200">{user?.street || ''} {user?.housenr || ''}, {user?.zip || ''} {user?.city || ''}</span>
                    </div>
                </div>
            {/if}
        </div>
    </div>

    <!-- App-Einstellungen & Abmelden -->
    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xs space-y-3">
        <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider">App-Einstellungen</h3>
        <div class="grid grid-cols-2 gap-2.5">
            <button
                type="button"
                onclick={() => themeService.toggle()}
                class="min-h-12 px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
                {#if isDarkMode}
                    <Sun class="w-4 h-4 text-amber-400" />
                    <span>Heller Modus</span>
                {:else}
                    <Moon class="w-4 h-4 text-slate-600" />
                    <span>Dunkler Modus</span>
                {/if}
            </button>
            <button
                type="button"
                onclick={onLogout}
                class="min-h-12 px-4 py-2.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 text-xs sm:text-sm font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
                <LogOut class="w-4 h-4" />
                <span>Abmelden</span>
            </button>
        </div>
    </div>
</div>
