<script lang="ts">
    import { CreditCard, Landmark, Shield, Car, ArrowLeft, ArrowRight } from 'lucide-svelte';
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

    // Alphabetisch sortiert nach Anzeigetext gem. alphabetical-select.md
    const TAX_CLASSES = [
        { value: '1', label: 'Steuerklasse 1 (Ledig / Alleinstehend)' },
        { value: '2', label: 'Steuerklasse 2 (Alleinerziehend)' },
        { value: '3', label: 'Steuerklasse 3 (Verheiratet - Allein-/Höherverdiener)' },
        { value: '4', label: 'Steuerklasse 4 (Verheiratet - Standard)' },
        { value: '5', label: 'Steuerklasse 5 (Verheiratet - Geringerverdiener)' },
        { value: '6', label: 'Steuerklasse 6 (Zweitjob / Nebenbeschäftigung)' }
    ];

    let localError = $state('');

    function handleSubmit(e: SubmitEvent) {
        e.preventDefault();
        localError = '';

        if (!data.tax_id?.trim()) {
            localError = 'Bitte die 11-stellige Steuer-Identifikationsnummer angeben.';
            return;
        }
        if (!data.health_insurance?.trim()) {
            localError = 'Bitte die gesetzliche oder private Krankenkasse angeben.';
            return;
        }

        onNext();
    }
</script>

<form onsubmit={handleSubmit} class="space-y-6">
    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-sm space-y-6">
        <div>
            <h2 class="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CreditCard class="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <span>3. Finanzen, Steuern & Mobilität</span>
            </h2>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Für die ordnungsgemäße Lohnabrechnung und mobile Einsatzplanung.
            </p>
        </div>

        {#if localError}
            <div class="p-3.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 rounded-2xl text-xs font-semibold text-red-600 dark:text-red-400">
                {localError}
            </div>
        {/if}

        <!-- Bankdaten (Optional) -->
        <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-4">
            <h3 class="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Landmark class="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Bankverbindung für Gehaltsauszahlung (Optional)</span>
            </h3>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label for="bank_iban" class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        IBAN
                    </label>
                    <input 
                        id="bank_iban"
                        type="text" 
                        bind:value={data.bank_iban} 
                        placeholder="DE89 3704 ..."
                        class="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono uppercase focus:ring-2 focus:ring-indigo-500" 
                    />
                </div>
                <div>
                    <label for="bank_bic" class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        BIC / SWIFT
                    </label>
                    <input 
                        id="bank_bic"
                        type="text" 
                        bind:value={data.bank_bic} 
                        placeholder="COBADEFFXXX"
                        class="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs uppercase focus:ring-2 focus:ring-indigo-500" 
                    />
                </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label for="bank_name" class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Name des Kreditinstituts
                    </label>
                    <input 
                        id="bank_name"
                        type="text" 
                        bind:value={data.bank_name} 
                        placeholder="z. B. Sparkasse / DKB"
                        class="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500" 
                    />
                </div>
                <div>
                    <label for="bank_owner" class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Kontoinhaber
                    </label>
                    <input 
                        id="bank_owner"
                        type="text" 
                        bind:value={data.bank_owner} 
                        placeholder="Vorname Nachname"
                        class="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500" 
                    />
                </div>
            </div>
        </div>

        <!-- Steuer & Sozialversicherung -->
        <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-4">
            <h3 class="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Shield class="w-4 h-4 text-violet-600 dark:text-violet-400" />
                <span>Steuer- und Sozialversicherungsdaten</span>
            </h3>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label for="tax_id" class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Steuer-Identifikationsnummer (11 Ziffern) <span class="text-red-500">*</span>
                    </label>
                    <input 
                        id="tax_id"
                        type="text" 
                        bind:value={data.tax_id} 
                        placeholder="12 345 678 901"
                        required
                        class="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono focus:ring-2 focus:ring-indigo-500" 
                    />
                </div>
                <div>
                    <label for="tax_class" class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Lohnsteuerklasse
                    </label>
                    <select 
                        id="tax_class"
                        bind:value={data.tax_class}
                        class="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500"
                    >
                        {#each TAX_CLASSES as opt}
                            <option value={opt.value}>{opt.label}</option>
                        {/each}
                    </select>
                </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label for="social_security_nr" class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Sozialversicherungsnummer (SVNR / Rentenvers.-Nr.)
                    </label>
                    <input 
                        id="social_security_nr"
                        type="text" 
                        bind:value={data.social_security_nr} 
                        placeholder="12 120590 A 012"
                        class="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono focus:ring-2 focus:ring-indigo-500" 
                    />
                </div>
                <div>
                    <label for="health_insurance" class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Krankenkasse <span class="text-red-500">*</span>
                    </label>
                    <input 
                        id="health_insurance"
                        type="text" 
                        bind:value={data.health_insurance} 
                        placeholder="z. B. TK, AOK, Barmer"
                        required
                        class="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500" 
                    />
                </div>
            </div>
        </div>

        <!-- Mobilität & Einsatzbereitschaft -->
        <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-4">
            <h3 class="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Car class="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                <span>Mobilität & Führerschein</span>
            </h3>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label for="drivers_license" class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Führerscheinklassen
                    </label>
                    <input 
                        id="drivers_license"
                        type="text" 
                        bind:value={data.drivers_license} 
                        placeholder="z. B. B, BE"
                        class="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500" 
                    />
                </div>
                <div class="flex flex-col justify-center space-y-2.5 pt-2">
                    <label class="inline-flex items-center gap-2.5 text-xs font-medium text-slate-800 dark:text-slate-200 cursor-pointer">
                        <input type="checkbox" bind:checked={data.has_car} class="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-600" />
                        <span>Eigener PKW vorhanden</span>
                    </label>
                    <label class="inline-flex items-center gap-2.5 text-xs font-medium text-slate-800 dark:text-slate-200 cursor-pointer">
                        <input type="checkbox" bind:checked={data.willing_to_travel} class="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-600" />
                        <span>Bereitschaft für Dienstfahrten / Klientenbesuche</span>
                    </label>
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
            <span>Weiter zur Prüfung & Signatur</span>
            <ArrowRight class="w-4 h-4" />
        </button>
    </div>
</form>

