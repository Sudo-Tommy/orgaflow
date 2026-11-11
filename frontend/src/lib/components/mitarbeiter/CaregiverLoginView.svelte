<script lang="ts">
    import { QrCode, ArrowRight, AlertCircle, Loader2 } from 'lucide-svelte';

    let {
        isVerifyingToken = false,
        tokenError = '',
        manualToken = $bindable(''),
        loginEmail = $bindable(''),
        loginPassword = $bindable(''),
        loginMode = $bindable<'token' | 'password'>('token'),
        isSubmittingLogin = false,
        onSubmitToken,
        onSubmitPassword
    }: {
        isVerifyingToken: boolean;
        tokenError: string;
        manualToken: string;
        loginEmail: string;
        loginPassword: string;
        loginMode: 'token' | 'password';
        isSubmittingLogin: boolean;
        onSubmitToken: (e: Event) => void;
        onSubmitPassword: (e: Event) => void;
    } = $props();
</script>

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
{:else}
    <div class="min-h-screen flex flex-col justify-center items-center p-4 sm:p-6 max-w-md mx-auto w-full">
        <div class="text-center mb-8">
            <div class="w-16 h-16 rounded-3xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-xl shadow-indigo-500/20 mx-auto mb-4">
                <QrCode class="w-8 h-8" />
            </div>
            <h1 class="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Mitarbeiter-Portal</h1>
            <p class="text-xs text-slate-500 mt-1 font-medium">OrgaFlow Außendienst & Pflegeassistenz</p>
        </div>

        {#if tokenError}
            <div class="w-full mb-5 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 text-xs flex items-start gap-2.5">
                <AlertCircle class="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <div>
                    <strong class="block font-bold">Zugang fehlgeschlagen</strong>
                    <span>{tokenError}</span>
                </div>
            </div>
        {/if}

        <div class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-lg shadow-slate-200/50 dark:shadow-none space-y-5">
            <div class="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl text-xs font-bold">
                <button
                    type="button"
                    onclick={() => loginMode = 'token'}
                    class="flex-1 py-2 rounded-xl transition-all cursor-pointer {loginMode === 'token' ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs' : 'text-slate-500'}"
                >
                    QR-Code / Token
                </button>
                <button
                    type="button"
                    onclick={() => loginMode = 'password'}
                    class="flex-1 py-2 rounded-xl transition-all cursor-pointer {loginMode === 'password' ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs' : 'text-slate-500'}"
                >
                    E-Mail & Passwort
                </button>
            </div>

            {#if loginMode === 'token'}
                <form onsubmit={onSubmitToken} class="space-y-4">
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
                        class="w-full min-h-12 px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-sm font-bold transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
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
                <form onsubmit={onSubmitPassword} class="space-y-4">
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
                        class="w-full min-h-12 px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-sm font-bold transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                    >
                        {#if isSubmittingLogin}
                            <Loader2 class="w-4 h-4 animate-spin" />
                            <span>Wird angemeldet...</span>
                        {:else}
                            <span>Mit Passwort anmelden</span>
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
{/if}
