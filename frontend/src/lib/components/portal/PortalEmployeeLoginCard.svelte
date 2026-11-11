<script lang="ts">
    import { goto } from "$app/navigation";
    import { loginUser } from "$lib/services/login";
    import { toastStore } from "$lib/services/toastService.svelte";

    let employeeEmail = $state("");
    let employeePassword = $state("");
    let showEmployeePassword = $state(false);
    let isEmployeeLoading = $state(false);
    let employeeErrorMsg = $state("");

    async function handleEmployeeLogin(e?: Event) {
        if (e) e.preventDefault();
        if (!employeeEmail.trim() || !employeePassword.trim()) {
            employeeErrorMsg = "Bitte geben Sie Ihre E-Mail-Adresse und Ihr Passwort ein.";
            return;
        }
        isEmployeeLoading = true;
        employeeErrorMsg = "";

        try {
            const result = await loginUser(employeeEmail.trim(), employeePassword.trim());
            if (result.success) {
                toastStore.success("Erfolgreich angemeldet! Willkommen im Dashboard.");
                await goto('/dashboard');
            } else {
                employeeErrorMsg = result.error || "Ungültige E-Mail-Adresse oder Passwort.";
            }
        } catch (err: any) {
            console.error("Mitarbeiter Login Error:", err);
            employeeErrorMsg = err?.message || "Verbindungsfehler beim Anmelden.";
        } finally {
            isEmployeeLoading = false;
        }
    }
</script>

<div class="text-center mb-6 sm:mb-8">
    <div class="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 bg-gradient-to-tr from-brand-900 to-indigo-700 text-white rounded-3xl flex items-center justify-center text-3xl sm:text-4xl shadow-xl shadow-brand-900/10">
        👥
    </div>
    <h1 class="text-2xl sm:text-3xl font-black text-brand-950 dark:text-white tracking-tight mb-2">Mitarbeiter-Login</h1>
    <p class="text-neutral-500 dark:text-slate-400 font-medium text-sm sm:text-base max-w-sm mx-auto">
        Melden Sie sich an, um direkt zu Ihrem Arbeits-Dashboard zu gelangen.
    </p>
</div>

<div class="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-neutral-200 dark:border-slate-800 shadow-xl shadow-neutral-900/5">
    {#if employeeErrorMsg}
        <div class="bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 p-4 rounded-2xl mb-6 text-sm font-semibold border border-rose-200 dark:border-rose-900/60 flex items-start gap-3 animate-enter">
            <span class="text-xl leading-none shrink-0">⚠️</span>
            <div class="flex-1">
                <p>{employeeErrorMsg}</p>
            </div>
        </div>
    {/if}

    <form onsubmit={handleEmployeeLogin} class="space-y-5">
        <div>
            <label for="employeeEmail" class="block text-sm font-bold text-neutral-800 dark:text-slate-200 mb-1.5">
                Mitarbeiter E-Mail-Adresse
            </label>
            <input 
                id="employeeEmail" 
                type="email" 
                inputmode="email"
                autocomplete="username"
                bind:value={employeeEmail} 
                required 
                class="orga-input-clear py-3.5 text-base font-medium dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 min-h-[44px]" 
                placeholder="vorname.nachname@ihre-seniorenassistenz.com" 
                disabled={isEmployeeLoading} 
            />
        </div>

        <div>
            <div class="flex items-center justify-between mb-1.5">
                <label for="employeePassword" class="block text-sm font-bold text-neutral-800 dark:text-slate-200">
                    Passwort
                </label>
                <button 
                    type="button" 
                    onclick={() => showEmployeePassword = !showEmployeePassword}
                    class="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors cursor-pointer min-h-[44px] py-2 px-1 touch-manipulation">
                    {showEmployeePassword ? 'Passwort verbergen' : 'Passwort anzeigen'}
                </button>
            </div>
            <input 
                id="employeePassword" 
                type={showEmployeePassword ? "text" : "password"} 
                autocomplete="current-password"
                bind:value={employeePassword} 
                required 
                class="orga-input-clear py-3.5 text-base font-medium dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 min-h-[44px]" 
                placeholder="••••••••" 
                disabled={isEmployeeLoading} 
            />
        </div>

        <button 
            type="submit" 
            disabled={isEmployeeLoading || !employeeEmail.trim() || !employeePassword.trim()} 
            class="orga-button-primary w-full min-h-[44px] min-w-[44px] py-4 shadow-brand-600/20 text-base font-black rounded-2xl flex items-center justify-center gap-2 cursor-pointer touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed">
            {#if isEmployeeLoading}
                <div class="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
                <span>Wird angemeldet...</span>
            {:else}
                <span>Zum Dashboard anmelden &rarr;</span>
            {/if}
        </button>
    </form>
</div>

<div class="mt-6 text-center">
    <p class="text-xs text-neutral-400 dark:text-slate-400">
        Passwort vergessen oder noch keinen Zugang? Wenden Sie sich bitte an Ihre Betriebsleitung.
    </p>
</div>
