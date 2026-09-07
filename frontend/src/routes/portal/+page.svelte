<script lang="ts">
    import { goto } from "$app/navigation";
    import { page } from "$app/stores";
    import { onMount } from "svelte";
    import { pb } from "$lib/services/pocketbase";

    let email = $state("");
    let pin = $state("");
    let showPin = $state(false);
    let showNumpad = $state(false);
    let isLoading = $state(false);
    let isAutoLoggingIn = $state(false);
    let errorMsg = $state("");
    let stayLoggedIn = $state(true);

    let isSuperAdmin = $derived(pb.authStore.isSuperuser || pb.authStore.model?.role === 'superadmin' || pb.authStore.model?.role === 'admin');

    const apiBaseUrl = (typeof window !== 'undefined' && !window.location.hostname.includes('ihre-seniorenassistenz.com')) 
        ? `http://${window.location.hostname}:3000/portal` 
        : '/api/emails/portal';

    onMount(() => {
        // Prüfe auf vorhandene PocketBase-Session
        if (pb.authStore.isValid) {
            goto('/portal/overview');
            return;
        }

        // Prüfe auf vorhandenen gültigen Portal-Token
        const existingToken = localStorage.getItem('portal_token');
        if (existingToken) {
            goto('/portal/overview');
            return;
        }

        // 📲 QR-Code Direkt-Login über URL-Parameter (?auth=sec_...)
        const authCode = $page.url.searchParams.get('auth');
        if (authCode) {
            handleCodeLogin(authCode);
        }
    });

    // 1-Klick QR-Code-Login
    async function handleCodeLogin(code: string) {
        isAutoLoggingIn = true;
        isLoading = true;
        errorMsg = "";

        try {
            const response = await fetch(`${apiBaseUrl}/auth-with-code`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code })
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error || "Zugangskarte konnte nicht verifiziert werden.");
            }

            if (result.token) {
                localStorage.setItem('portal_token', result.token);
                localStorage.setItem('portal_stay_logged_in', 'true');
                goto('/portal/overview');
            }
        } catch (err: any) {
            console.error("QR Auth Error:", err);
            errorMsg = err.message || "Der QR-Code ist ungültig oder abgelaufen.";
            isAutoLoggingIn = false;
        } finally {
            isLoading = false;
        }
    }

    // Manueller PIN-Login (E-Mail + 6-stellige PIN)
    async function handlePinLogin(e?: Event) {
        if (e) e.preventDefault();
        isLoading = true;
        errorMsg = "";

        try {
            const response = await fetch(`${apiBaseUrl}/auth-with-pin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    email: email.trim(), 
                    pin: pin.trim() 
                })
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error || "Login fehlgeschlagen. Bitte prüfen Sie Ihre Eingaben.");
            }

            if (result.token) {
                localStorage.setItem('portal_token', result.token);
                if (stayLoggedIn) localStorage.setItem('portal_stay_logged_in', 'true');
                else localStorage.removeItem('portal_stay_logged_in');
                goto('/portal/overview');
            }
        } catch (err: any) {
            console.error("PIN Auth Error:", err);
            errorMsg = err.message || "Login fehlgeschlagen. Bitte prüfen Sie E-Mail und PIN.";
        } finally {
            isLoading = false;
        }
    }

    // Touch-Ziffernblock Eingaben
    function appendDigit(digit: string) {
        if (pin.length < 12) {
            pin += digit;
        }
    }

    function deleteLastDigit() {
        if (pin.length > 0) {
            pin = pin.slice(0, -1);
        }
    }

    function clearPin() {
        pin = "";
    }

    function enterAsAdmin() {
        if (pb.authStore.isValid) {
            localStorage.setItem('portal_token', pb.authStore.token);
            localStorage.setItem('portal_admin_mode', 'true');
            goto('/portal/overview');
        } else {
            errorMsg = "Sie müssen als Admin im Haupt-Dashboard angemeldet sein, um diese Funktion zu nutzen.";
        }
    }
</script>

<svelte:head><title>Login - Klienten-Portal</title></svelte:head>

<div class="w-full max-w-lg mx-auto animate-enter px-2 sm:px-4 py-4 sm:py-8">
    
    <!-- HEADER -->
    <div class="text-center mb-6 sm:mb-8">
        <div class="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 bg-gradient-to-tr from-brand-900 to-indigo-700 text-white rounded-3xl flex items-center justify-center text-3xl sm:text-4xl shadow-xl shadow-brand-900/10">
            🪪
        </div>
        <h1 class="text-2xl sm:text-3xl font-black text-brand-950 dark:text-white tracking-tight mb-2">Klienten-Portal</h1>
        <p class="text-neutral-500 dark:text-slate-400 font-medium text-sm sm:text-base max-w-sm mx-auto">
            Ihre persönliche Übersicht für Betreuungstermine, Berichte und Rechnungen.
        </p>
    </div>

    <!-- QR-CODE LADEZUSTAND -->
    {#if isAutoLoggingIn}
        <div class="bg-white dark:bg-slate-900 p-8 sm:p-12 rounded-3xl border border-neutral-200 dark:border-slate-800 shadow-xl shadow-neutral-900/5 text-center">
            <div class="w-14 h-14 border-4 border-indigo-200 dark:border-indigo-800 border-t-indigo-600 rounded-full animate-spin mx-auto mb-5"></div>
            <h2 class="text-xl font-black text-brand-950 dark:text-white mb-2">Zugangskarte erkannt</h2>
            <p class="text-sm font-medium text-neutral-500 dark:text-slate-400 max-w-xs mx-auto">
                Sie werden automatisch angemeldet. Einen kleinen Moment bitte...
            </p>
        </div>
    {:else}
        <!-- ANMELDE-KARTE -->
        <div class="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-neutral-200 dark:border-slate-800 shadow-xl shadow-neutral-900/5">
            
            {#if errorMsg}
                <div class="bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 p-4 rounded-2xl mb-6 text-sm font-semibold border border-rose-200 dark:border-rose-900/60 flex items-start gap-3 animate-enter">
                    <span class="text-xl leading-none shrink-0">⚠️</span>
                    <div class="flex-1">
                        <p>{errorMsg}</p>
                    </div>
                </div>
            {/if}

            <form onsubmit={handlePinLogin} class="space-y-5">
                
                <!-- E-MAIL -->
                <div>
                    <label for="email" class="block text-sm font-bold text-neutral-800 dark:text-slate-200 mb-1.5 flex items-center justify-between">
                        <span>Ihre E-Mail-Adresse</span>
                        <span class="text-xs font-normal text-neutral-400 dark:text-slate-400">wie auf der Zugangskarte</span>
                    </label>
                    <input 
                        id="email" 
                        type="email" 
                        inputmode="email"
                        autocomplete="email"
                        bind:value={email} 
                        required 
                        class="orga-input-clear py-3.5 text-base sm:text-base font-medium dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100" 
                        placeholder="beispiel@email.de" 
                        disabled={isLoading} 
                    />
                </div>

                <!-- PIN EINGABE -->
                <div>
                    <div class="flex items-center justify-between mb-1.5">
                        <label for="pin" class="block text-sm font-bold text-neutral-800 dark:text-slate-200">
                            Ihre persönliche PIN
                        </label>
                        <button 
                            type="button" 
                            onclick={() => showPin = !showPin}
                            class="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors cursor-pointer">
                            {showPin ? 'PIN verbergen' : 'PIN anzeigen'}
                        </button>
                    </div>

                    <div class="relative">
                        <input 
                            id="pin" 
                            type={showPin ? "text" : "password"} 
                            inputmode="numeric"
                            autocomplete="current-password"
                            bind:value={pin} 
                            required 
                            class="orga-input-clear py-3.5 text-xl sm:text-2xl font-mono tracking-widest text-center dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100" 
                            placeholder="••••••" 
                            disabled={isLoading} 
                        />
                    </div>

                    <!-- TOGGLE FÜR TOUCH-NUMPAD -->
                    <div class="mt-2 flex items-center justify-between">
                        <button 
                            type="button" 
                            onclick={() => showNumpad = !showNumpad}
                            class="text-xs font-bold text-neutral-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1.5 transition-colors cursor-pointer">
                            <span>{showNumpad ? '▼' : '▲'}</span>
                            <span>{showNumpad ? 'Ziffernblock ausblenden' : 'Großen Touch-Ziffernblock einblenden'}</span>
                        </button>

                        {#if pin}
                            <button 
                                type="button" 
                                onclick={clearPin}
                                class="text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-slate-200 cursor-pointer">
                                Löschen
                            </button>
                        {/if}
                    </div>

                    <!-- GROSSES SENIOREN-TOUCH-NUMPAD -->
                    {#if showNumpad}
                        <div class="mt-3 p-3 bg-neutral-50 dark:bg-slate-800 rounded-2xl border border-neutral-200 dark:border-slate-700 animate-enter grid grid-cols-3 gap-2 sm:gap-3">
                            {#each ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as num}
                                <button 
                                    type="button" 
                                    onclick={() => appendDigit(num)}
                                    class="h-13 sm:h-14 bg-white dark:bg-slate-700 border border-neutral-200 dark:border-slate-600 rounded-xl text-xl sm:text-2xl font-black font-mono text-neutral-800 dark:text-white hover:bg-neutral-100 dark:hover:bg-slate-600 hover:border-neutral-300 active:scale-95 transition-all shadow-sm flex items-center justify-center cursor-pointer">
                                    {num}
                                </button>
                            {/each}
                            <button 
                                type="button" 
                                onclick={deleteLastDigit}
                                class="h-13 sm:h-14 bg-neutral-200/70 dark:bg-slate-600 border border-neutral-300 dark:border-slate-500 rounded-xl text-lg font-bold text-neutral-700 dark:text-slate-200 hover:bg-neutral-300 dark:hover:bg-slate-500 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
                                title="Letzte Ziffer löschen">
                                ⌫
                            </button>
                            <button 
                                type="button" 
                                onclick={() => appendDigit('0')}
                                class="h-13 sm:h-14 bg-white dark:bg-slate-700 border border-neutral-200 dark:border-slate-600 rounded-xl text-xl sm:text-2xl font-black font-mono text-neutral-800 dark:text-white hover:bg-neutral-100 dark:hover:bg-slate-600 hover:border-neutral-300 active:scale-95 transition-all shadow-sm flex items-center justify-center cursor-pointer">
                                0
                            </button>
                            <button 
                                type="button" 
                                onclick={() => handlePinLogin()}
                                disabled={isLoading || !email || !pin}
                                class="h-13 sm:h-14 bg-emerald-600 text-white rounded-xl text-sm font-black hover:bg-emerald-700 active:scale-95 transition-all shadow-sm flex items-center justify-center cursor-pointer">
                                ✓ OK
                            </button>
                        </div>
                    {/if}
                </div>

                <!-- ANGEMELDET BLEIBEN -->
                <label class="flex items-center gap-3 p-3 sm:p-3.5 border border-neutral-200 dark:border-slate-700 rounded-2xl cursor-pointer hover:border-brand-300 dark:hover:border-brand-500/50 transition-colors bg-neutral-50/50 dark:bg-slate-800/50">
                    <input 
                        type="checkbox" 
                        bind:checked={stayLoggedIn} 
                        class="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500" 
                        disabled={isLoading} 
                    />
                    <div>
                        <span class="font-bold text-neutral-900 dark:text-white text-xs sm:text-sm block">Angemeldet bleiben</span>
                        <span class="text-[11px] sm:text-xs text-neutral-500 dark:text-slate-400 block">Auf diesem Gerät dauerhaft eingeloggt bleiben.</span>
                    </div>
                </label>

                <!-- SUBMIT BUTTON -->
                <button 
                    type="submit" 
                    disabled={isLoading || !email || !pin} 
                    class="orga-button-primary w-full py-4 shadow-brand-600/20 text-base font-black rounded-2xl flex items-center justify-center gap-2 cursor-pointer">
                    {#if isLoading}
                        <div class="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
                        <span>Anmelden...</span>
                    {:else}
                        <span>Im Portal anmelden &rarr;</span>
                    {/if}
                </button>
            </form>
        </div>

        <!-- FUSSBEREICH MIT HINWEIS -->
        <div class="mt-6 text-center space-y-3">
            <div class="p-4 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-2xl border border-indigo-100/80 dark:border-indigo-900/50 text-xs text-neutral-600 dark:text-slate-300 leading-relaxed max-w-md mx-auto">
                <p class="font-bold text-indigo-950 dark:text-indigo-300 mb-1">📱 Haben Sie ein Smartphone oder Tablet?</p>
                <p class="text-neutral-500 dark:text-slate-400">
                    Scannen Sie einfach den QR-Code auf Ihrer ausgedruckten <strong>Zugangskarte</strong> mit der Kamera. Sie sind damit sofort und ohne Tastatur im Portal angemeldet.
                </p>
            </div>

            <p class="text-xs text-neutral-400 dark:text-slate-400">
                Zugangskarte verlegt? Wenden Sie sich bitte an Ihre persönliche Seniorenassistenz.
            </p>

            {#if isSuperAdmin}
                <div class="pt-2">
                    <button 
                        type="button" 
                        onclick={enterAsAdmin} 
                        class="mx-auto px-4 py-2 bg-neutral-100 dark:bg-slate-800 hover:bg-neutral-200 dark:hover:bg-slate-700 text-neutral-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors border border-neutral-200 dark:border-slate-700 shadow-sm flex items-center gap-2 cursor-pointer">
                        <span>🛡️</span> Als Admin testweise betreten
                    </button>
                </div>
            {/if}
        </div>
    {/if}
</div>
