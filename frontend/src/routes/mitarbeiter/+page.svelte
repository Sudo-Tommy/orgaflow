<script lang="ts">
    import { onMount } from 'svelte';
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';
    import { pb } from '$lib/services/pocketbase';
    import { employeeService } from '$lib/services/employeeService.svelte';
    import { orgaStore } from '$lib/stores/orgaStore.svelte';
    import { toastStore } from '$lib/services/toastService.svelte';
    import { loginUser } from '$lib/services/login';
    import CaregiverAppointmentsTab from '$lib/components/mitarbeiter/CaregiverAppointmentsTab.svelte';
    import CaregiverClientsTab from '$lib/components/mitarbeiter/CaregiverClientsTab.svelte';
    import CaregiverContactsTab from '$lib/components/mitarbeiter/CaregiverContactsTab.svelte';
    import CaregiverProfileTab from '$lib/components/mitarbeiter/CaregiverProfileTab.svelte';
    import { 
        Calendar, Users, BookOpen, User, QrCode, Lock, 
        Mail, ArrowRight, ShieldCheck, CheckCircle2, AlertCircle, Loader2
    } from 'lucide-svelte';

    type TabType = 'appointments' | 'clients' | 'contacts' | 'profile';
    let activeTab = $state<TabType>('appointments');

    let isVerifyingToken = $state(false);
    let tokenError = $state('');

    // Fallback Login Formular
    let loginEmail = $state('');
    let loginPassword = $state('');
    let manualToken = $state('');
    let loginMode = $state<'token' | 'password'>('token');
    let isSubmittingLogin = $state(false);

    const currentUser = $derived(pb.authStore.model);
    const isAuthenticated = $derived(pb.authStore.isValid && !!currentUser);

    onMount(async () => {
        // 1. Prüfe auf QR-Code Schnellzugangs-Token in der URL
        const tokenParam = $page.url.searchParams.get('token');
        if (tokenParam) {
            isVerifyingToken = true;
            tokenError = '';
            try {
                const result = await employeeService.loginWithQrToken(tokenParam);
                if (result.success) {
                    toastStore.success(`Erfolgreich angemeldet als ${pb.authStore.model?.name_first || 'Mitarbeiter'}!`);
                    // Entferne Token aus der Browser-Adresszeile
                    await goto('/mitarbeiter', { replaceState: true });
                    await initPortalStores();
                } else {
                    tokenError = result.message || 'Ungültiger oder abgelaufener QR-Code-Token.';
                }
            } catch (err: any) {
                tokenError = err?.message || 'Verbindung zum Authentifizierungsserver fehlgeschlagen.';
            } finally {
                isVerifyingToken = false;
            }
            return;
        }

        // 2. Falls bereits eingeloggt: Daten initialisieren
        if (isAuthenticated) {
            await initPortalStores();
        }
    });

    async function initPortalStores() {
        await Promise.allSettled([
            orgaStore.appointments.init(),
            orgaStore.clients.init(),
            orgaStore.contacts.init(),
            orgaStore.users.init()
        ]);
    }

    async function handleManualTokenLogin(e: Event) {
        e.preventDefault();
        if (!manualToken.trim()) return;

        isSubmittingLogin = true;
        try {
            const result = await employeeService.loginWithQrToken(manualToken.trim());
            if (result.success) {
                toastStore.success('Erfolgreich eingeloggt!');
                await initPortalStores();
            } else {
                toastStore.error(result.message || 'Ungültiger Token.');
            }
        } finally {
            isSubmittingLogin = false;
        }
    }

    async function handlePasswordLogin(e: Event) {
        e.preventDefault();
        if (!loginEmail.trim() || !loginPassword.trim()) return;

        isSubmittingLogin = true;
        try {
            const result = await loginUser(loginEmail.trim(), loginPassword.trim());
            if (result.success) {
                toastStore.success('Erfolgreich angemeldet!');
                await initPortalStores();
            } else {
                toastStore.error(result.error || 'Anmeldung fehlgeschlagen.');
            }
        } finally {
            isSubmittingLogin = false;
        }
    }

    function handleLogout() {
        pb.authStore.clear();
        toastStore.info('Sie wurden erfolgreich abgemeldet.');
        goto('/mitarbeiter');
    }
</script>

<svelte:head>
    <title>Mitarbeiter-Portal | OrgaFlow</title>
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
</svelte:head>

<div class="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-indigo-600 selection:text-white antialiased">

    <!-- === ZUSTAND 1: TOKEN-VERIFIKATION LÄUFT === -->
    {#if isVerifyingToken}
        <div class="min-h-screen flex flex-col items-center justify-center p-6 text-center">
            <div class="w-16 h-16 rounded-3xl bg-indigo-600 text-white flex items-center justify-center shadow-lg mb-4 animate-bounce">
                <QrCode class="w-8 h-8" />
            </div>
            <h2 class="text-xl font-bold text-slate-900 dark:text-white">QR-Code Zugang wird geprüft...</h2>
            <p class="text-sm text-slate-500 mt-1 max-w-xs">Ihre Sitzung wird verschlüsselt authentifiziert. Einen Moment bitte.</p>
            <div class="mt-6 flex items-center gap-2 text-indigo-600 text-xs font-semibold">
                <Loader2 class="w-4 h-4 animate-spin" />
                <span>Sicherheitsprüfung aktiv</span>
            </div>
        </div>

    <!-- === ZUSTAND 2: NICHT EINGELOGGT (LOGIN-SCREEN) === -->
    {:else if !isAuthenticated}
        <div class="min-h-screen flex flex-col justify-center items-center p-4 sm:p-6 max-w-md mx-auto w-full">
            
            <!-- Branding Header -->
            <div class="text-center mb-8">
                <div class="w-16 h-16 rounded-3xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-xl shadow-indigo-500/20 mx-auto mb-4">
                    <QrCode class="w-8 h-8" />
                </div>
                <h1 class="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Mitarbeiter-Portal</h1>
                <p class="text-xs text-slate-500 mt-1 font-medium">OrgaFlow Außendienst & Pflegeassistenz</p>
            </div>

            <!-- Token Error Notice -->
            {#if tokenError}
                <div class="w-full mb-5 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 text-xs flex items-start gap-2.5">
                    <AlertCircle class="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                    <div>
                        <strong class="block font-bold">Zugang fehlgeschlagen</strong>
                        <span>{tokenError}</span>
                    </div>
                </div>
            {/if}

            <!-- Card -->
            <div class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-lg shadow-slate-200/50 dark:shadow-none space-y-5">
                
                <!-- Toggle Mode -->
                <div class="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl text-xs font-bold">
                    <button
                        type="button"
                        onclick={() => loginMode = 'token'}
                        class="flex-1 py-2 rounded-xl transition-all {loginMode === 'token' ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs' : 'text-slate-500'}"
                    >
                        QR-Code / Token
                    </button>
                    <button
                        type="button"
                        onclick={() => loginMode = 'password'}
                        class="flex-1 py-2 rounded-xl transition-all {loginMode === 'password' ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs' : 'text-slate-500'}"
                    >
                        E-Mail & Passwort
                    </button>
                </div>

                <!-- Modus 1: Token Login -->
                {#if loginMode === 'token'}
                    <form onsubmit={handleManualTokenLogin} class="space-y-4">
                        <div class="p-3 bg-indigo-50/60 dark:bg-indigo-950/30 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 text-xs text-indigo-900 dark:text-indigo-300">
                            <strong>Tipp:</strong> Scannen Sie Ihren QR-Code mit der Smartphone-Kamera oder fügen Sie den Zugangslink hier ein.
                        </div>

                        <div class="space-y-1.5">
                            <label for="token-input" class="block text-xs font-bold text-slate-700 dark:text-slate-300">Zugangs-Token</label>
                            <input 
                                id="token-input"
                                type="text"
                                bind:value={manualToken}
                                placeholder="Token einfügen..."
                                required
                                class="w-full min-h-12 px-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-mono focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmittingLogin || !manualToken.trim()}
                            class="w-full min-h-12 px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-sm font-bold transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {#if isSubmittingLogin}
                                <Loader2 class="w-4 h-4 animate-spin" />
                                <span>Wird verifiziert...</span>
                            {:else}
                                <span>Direkt einloggen</span>
                                <ArrowRight class="w-4 h-4" />
                            {/if}
                        </button>
                    </form>
                {:else}
                    <!-- Modus 2: Passwort Login -->
                    <form onsubmit={handlePasswordLogin} class="space-y-4">
                        <div class="space-y-1.5">
                            <label for="login-email" class="block text-xs font-bold text-slate-700 dark:text-slate-300">E-Mail</label>
                            <input 
                                id="login-email"
                                type="email"
                                bind:value={loginEmail}
                                placeholder="name@beispiel.de"
                                required
                                class="w-full min-h-12 px-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>

                        <div class="space-y-1.5">
                            <label for="login-password" class="block text-xs font-bold text-slate-700 dark:text-slate-300">Passwort</label>
                            <input 
                                id="login-password"
                                type="password"
                                bind:value={loginPassword}
                                placeholder="••••••••"
                                required
                                class="w-full min-h-12 px-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmittingLogin || !loginEmail.trim() || !loginPassword.trim()}
                            class="w-full min-h-12 px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-sm font-bold transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {#if isSubmittingLogin}
                                <Loader2 class="w-4 h-4 animate-spin" />
                                <span>Anmeldung läuft...</span>
                            {:else}
                                <span>Anmelden</span>
                                <ArrowRight class="w-4 h-4" />
                            {/if}
                        </button>
                    </form>
                {/if}

            </div>

            <div class="mt-8 text-center text-xs text-slate-400">
                <span>OrgaFlow • GoBD- & DSGVO-konforme Pflegeplattform</span>
            </div>
        </div>

    <!-- === ZUSTAND 3: EINGELOGGT (DAS MITARBEITER-PORTAL) === -->
    {:else}
        <!-- Top App Bar -->
        <header class="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-3 shrink-0">
            <div class="max-w-2xl mx-auto flex items-center justify-between gap-3">
                <div class="flex items-center gap-2.5 min-w-0">
                    <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white font-black text-sm flex items-center justify-center shadow-xs shrink-0">
                        {currentUser?.name_first ? currentUser.name_first[0] : 'M'}
                    </div>
                    <div class="min-w-0">
                        <h1 class="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                            {currentUser?.name_first || 'Mitarbeiter'} {currentUser?.name_last || ''}
                        </h1>
                        <span class="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span>{currentUser?.status || 'Aktiv im Dienst'}</span>
                        </span>
                    </div>
                </div>

                <div class="flex items-center gap-1.5">
                    <span class="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900">
                        {currentUser?.employment_type || 'Außendienst'}
                    </span>
                </div>
            </div>
        </header>

        <!-- Main View Area -->
        <main class="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-5">
            {#if activeTab === 'appointments'}
                <CaregiverAppointmentsTab />
            {:else if activeTab === 'clients'}
                <CaregiverClientsTab />
            {:else if activeTab === 'contacts'}
                <CaregiverContactsTab />
            {:else if activeTab === 'profile'}
                <CaregiverProfileTab onLogout={handleLogout} />
            {/if}
        </main>

        <!-- Fixed Bottom Navigation (Touch-Ergonomie min. 44x44 px / h-14) -->
        <nav class="fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 pb-[env(safe-area-inset-bottom,0px)] shadow-lg">
            <div class="max-w-2xl mx-auto flex items-center justify-around px-2">
                
                <button
                    type="button"
                    onclick={() => activeTab = 'appointments'}
                    class="flex-1 min-h-14 py-2 flex flex-col items-center justify-center gap-1 transition-colors relative {activeTab === 'appointments' ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-600'}"
                >
                    <Calendar class="w-5 h-5" />
                    <span class="text-[11px]">Einsätze</span>
                    {#if activeTab === 'appointments'}
                        <div class="absolute bottom-1 w-8 h-1 bg-indigo-600 dark:bg-indigo-400 rounded-full"></div>
                    {/if}
                </button>

                <button
                    type="button"
                    onclick={() => activeTab = 'clients'}
                    class="flex-1 min-h-14 py-2 flex flex-col items-center justify-center gap-1 transition-colors relative {activeTab === 'clients' ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-600'}"
                >
                    <Users class="w-5 h-5" />
                    <span class="text-[11px]">Klienten</span>
                    {#if activeTab === 'clients'}
                        <div class="absolute bottom-1 w-8 h-1 bg-indigo-600 dark:bg-indigo-400 rounded-full"></div>
                    {/if}
                </button>

                <button
                    type="button"
                    onclick={() => activeTab = 'contacts'}
                    class="flex-1 min-h-14 py-2 flex flex-col items-center justify-center gap-1 transition-colors relative {activeTab === 'contacts' ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-600'}"
                >
                    <BookOpen class="w-5 h-5" />
                    <span class="text-[11px]">Kontakte</span>
                    {#if activeTab === 'contacts'}
                        <div class="absolute bottom-1 w-8 h-1 bg-indigo-600 dark:bg-indigo-400 rounded-full"></div>
                    {/if}
                </button>

                <button
                    type="button"
                    onclick={() => activeTab = 'profile'}
                    class="flex-1 min-h-14 py-2 flex flex-col items-center justify-center gap-1 transition-colors relative {activeTab === 'profile' ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-600'}"
                >
                    <User class="w-5 h-5" />
                    <span class="text-[11px]">Profil</span>
                    {#if activeTab === 'profile'}
                        <div class="absolute bottom-1 w-8 h-1 bg-indigo-600 dark:bg-indigo-400 rounded-full"></div>
                    {/if}
                </button>

            </div>
        </nav>
    {/if}

</div>
