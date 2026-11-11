<script lang="ts">
    import { MapPin, Phone, Mail, Lock, Eye, EyeOff, ArrowLeft, ArrowRight } from 'lucide-svelte';
    import type { OnboardingFormData } from '$lib/services/onboardingService';

    let { 
        data = $bindable<OnboardingFormData>(),
        onNext,
        onBack
    } = $props<{
        data: OnboardingFormData;
        onNext: () => void;
        onBack: () => void;
    }>();

    let passwordConfirm = $state('');
    let showPassword = $state(false);
    let localError = $state('');

    function handleSubmit(e: SubmitEvent) {
        e.preventDefault();
        localError = '';

        if (!data.street?.trim() || !data.housenr?.trim()) {
            localError = 'Bitte Straße und Hausnummer angeben.';
            return;
        }
        if (!data.zip?.trim() || !data.city?.trim()) {
            localError = 'Bitte Postleitzahl und Wohnort angeben.';
            return;
        }
        if (!data.handy?.trim()) {
            localError = 'Bitte eine Mobilfunknummer für die Einsatzplanung angeben.';
            return;
        }
        if (!data.email?.trim() || !data.email.includes('@')) {
            localError = 'Bitte eine gültige E-Mail-Adresse angeben.';
            return;
        }
        if (!data.password || data.password.length < 8) {
            localError = 'Das Passwort muss mindestens 8 Zeichen lang sein.';
            return;
        }
        if (data.password !== passwordConfirm) {
            localError = 'Die beiden Passwörter stimmen nicht überein.';
            return;
        }

        onNext();
    }
</script>

<form onsubmit={handleSubmit} class="space-y-6">
    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-sm space-y-6">
        <div>
            <h2 class="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <MapPin class="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <span>2. Anschrift, Erreichbarkeit & Login</span>
            </h2>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Deine Kontaktdaten für Einsatzorte sowie deine Zugangsdaten für OrgaFlow.
            </p>
        </div>

        {#if localError}
            <div class="p-3.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 rounded-2xl text-xs font-semibold text-red-600 dark:text-red-400">
                {localError}
            </div>
        {/if}

        <!-- Adresse: Straße & Hausnummer -->
        <div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div class="sm:col-span-3">
                <label for="street" class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Straße <span class="text-red-500">*</span>
                </label>
                <input 
                    id="street"
                    type="text" 
                    bind:value={data.street} 
                    placeholder="z. B. Hauptstraße"
                    required
                    class="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500" 
                />
            </div>
            <div>
                <label for="housenr" class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Hausnr. <span class="text-red-500">*</span>
                </label>
                <input 
                    id="housenr"
                    type="text" 
                    bind:value={data.housenr} 
                    placeholder="12 b"
                    required
                    class="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500" 
                />
            </div>
        </div>

        <!-- PLZ & Ort -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
                <label for="zip" class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Postleitzahl <span class="text-red-500">*</span>
                </label>
                <input 
                    id="zip"
                    type="text" 
                    bind:value={data.zip} 
                    placeholder="06108"
                    required
                    class="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500" 
                />
            </div>
            <div class="sm:col-span-2">
                <label for="city" class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Wohnort <span class="text-red-500">*</span>
                </label>
                <input 
                    id="city"
                    type="text" 
                    bind:value={data.city} 
                    placeholder="Halle (Saale)"
                    required
                    class="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500" 
                />
            </div>
        </div>

        <!-- Telefonie -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
                <label for="handy" class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Mobiltelefon <span class="text-red-500">*</span>
                </label>
                <input 
                    id="handy"
                    type="tel" 
                    bind:value={data.handy} 
                    placeholder="0170 1234567"
                    required
                    class="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500" 
                />
            </div>
            <div>
                <label for="tel" class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Festnetz (Optional)
                </label>
                <input 
                    id="tel"
                    type="tel" 
                    bind:value={data.tel} 
                    placeholder="0345 987654"
                    class="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500" 
                />
            </div>
        </div>

        <!-- Login-Bereich -->
        <div class="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
            <h3 class="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Lock class="w-3.5 h-3.5 text-indigo-500" />
                <span>Zugangsdaten für deinen Mitarbeiter-Login</span>
            </h3>

            <div>
                <label for="email" class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    E-Mail-Adresse (Benutzername) <span class="text-red-500">*</span>
                </label>
                <input 
                    id="email"
                    type="email" 
                    bind:value={data.email} 
                    placeholder="dein.name@beispiel.de"
                    required
                    class="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500" 
                />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label for="password" class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Passwort wählen (mind. 8 Zeichen) <span class="text-red-500">*</span>
                    </label>
                    <div class="relative">
                        <input 
                            id="password"
                            type={showPassword ? 'text' : 'password'} 
                            bind:value={data.password} 
                            placeholder="Mindestens 8 Zeichen"
                            required
                            class="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500 pr-10" 
                        />
                        <button 
                            type="button" 
                            onclick={() => showPassword = !showPassword}
                            class="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        >
                            {#if showPassword}
                                <EyeOff class="w-4 h-4" />
                            {:else}
                                <Eye class="w-4 h-4" />
                            {/if}
                        </button>
                    </div>
                </div>

                <div>
                    <label for="password_confirm" class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Passwort wiederholen <span class="text-red-500">*</span>
                    </label>
                    <input 
                        id="password_confirm"
                        type={showPassword ? 'text' : 'password'} 
                        bind:value={passwordConfirm} 
                        placeholder="Gleiches Passwort bestätigen"
                        required
                        class="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500" 
                    />
                </div>
            </div>
        </div>
    </div>

    <!-- Stepper Buttons -->
    <div class="flex items-center justify-between gap-4 pt-3 pb-8 sm:pb-12 flex-wrap sm:flex-nowrap">
        <button 
            type="button" 
            onclick={onBack}
            class="min-h-12 w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 cursor-pointer"
        >
            <ArrowLeft class="w-4 h-4" />
            <span>Zurück</span>
        </button>

        <button 
            type="submit" 
            class="min-h-12 w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer touch-manipulation active:scale-95"
        >
            <span>Weiter zu Finanzen & Steuern</span>
            <ArrowRight class="w-4 h-4" />
        </button>
    </div>
</form>

