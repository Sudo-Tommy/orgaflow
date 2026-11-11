<script lang="ts">
    import { CheckCircle2, ArrowLeft, Send } from 'lucide-svelte';
    import type { OnboardingFormData } from '$lib/services/onboardingService';
    import OnboardingSignaturePad from './OnboardingSignaturePad.svelte';

    let { 
        data = $bindable<OnboardingFormData>(),
        isSubmitting = false,
        onSubmit,
        onBack,
        onEditStep
    } = $props<{
        data: OnboardingFormData;
        isSubmitting: boolean;
        onSubmit: () => void;
        onBack: () => void;
        onEditStep: (step: number) => void;
    }>();

    let hasSignature = $state(false);
    let confirmed = $state(false);
    let localError = $state('');

    function handleFormSubmit(e: SubmitEvent) {
        e.preventDefault();
        localError = '';

        if (!hasSignature || !data.sign) {
            localError = 'Bitte leiste deine digitale Unterschrift im vorgesehenen Feld.';
            return;
        }
        if (!confirmed) {
            localError = 'Bitte bestätige die Richtigkeit der eingegebenen Daten.';
            return;
        }

        onSubmit();
    }
</script>

<form onsubmit={handleFormSubmit} class="space-y-6">
    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-sm space-y-6">
        <div>
            <h2 class="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CheckCircle2 class="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <span>4. Datenprüfung & Digitale Unterschrift</span>
            </h2>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Überprüfe deine Angaben auf einen Blick und unterschreibe zur Bestätigung.
            </p>
        </div>

        {#if localError}
            <div class="p-3.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 rounded-2xl text-xs font-semibold text-red-600 dark:text-red-400">
                {localError}
            </div>
        {/if}

        <!-- Glance & Edit Zusammenfassung -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <!-- 1. Person -->
            <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex flex-col justify-between">
                <div class="space-y-1">
                    <div class="flex items-center justify-between">
                        <span class="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase">Persönliches</span>
                        <button type="button" onclick={() => onEditStep(1)} class="text-[11px] text-slate-400 hover:text-indigo-600 underline cursor-pointer">Ändern</button>
                    </div>
                    <p class="text-xs font-bold text-slate-900 dark:text-white">{data.name_first} {data.name_last}</p>
                    <p class="text-xs text-slate-600 dark:text-slate-400">Geboren: {data.date_birth || '—'} in {data.birth_place || '—'}</p>
                    <p class="text-xs text-slate-600 dark:text-slate-400">Anstellung: {data.employment_type || 'Vollzeit'}</p>
                </div>
            </div>

            <!-- 2. Kontakt & Login -->
            <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex flex-col justify-between">
                <div class="space-y-1">
                    <div class="flex items-center justify-between">
                        <span class="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase">Kontakt & Adresse</span>
                        <button type="button" onclick={() => onEditStep(2)} class="text-[11px] text-slate-400 hover:text-indigo-600 underline cursor-pointer">Ändern</button>
                    </div>
                    <p class="text-xs font-bold text-slate-900 dark:text-white">{data.street} {data.housenr}</p>
                    <p class="text-xs text-slate-600 dark:text-slate-400">{data.zip} {data.city}</p>
                    <p class="text-xs text-slate-600 dark:text-slate-400 truncate">E-Mail: {data.email}</p>
                    <p class="text-xs text-slate-600 dark:text-slate-400">Mobil: {data.handy}</p>
                </div>
            </div>

            <!-- 3. Finanzen -->
            <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex flex-col justify-between">
                <div class="space-y-1">
                    <div class="flex items-center justify-between">
                        <span class="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase">Steuer & Bank</span>
                        <button type="button" onclick={() => onEditStep(3)} class="text-[11px] text-slate-400 hover:text-indigo-600 underline cursor-pointer">Ändern</button>
                    </div>
                    <p class="text-xs font-bold text-slate-900 dark:text-white">Kasse: {data.health_insurance || '—'}</p>
                    <p class="text-xs text-slate-600 dark:text-slate-400">Steuer-ID: {data.tax_id || '—'}</p>
                    <p class="text-xs text-slate-600 dark:text-slate-400">Klasse: {data.tax_class || '1'}</p>
                    <p class="text-xs text-slate-600 dark:text-slate-400 truncate">IBAN: {data.bank_iban || 'Wird nachgereicht'}</p>
                </div>
            </div>
        </div>

        <!-- Digitale Unterschrift -->
        <OnboardingSignaturePad 
            bind:signature={data.sign as string} 
            bind:hasSignature 
        />

        <!-- Bestätigungs-Checkbox -->
        <div class="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50">
            <label class="inline-flex items-start gap-3 cursor-pointer">
                <input 
                    type="checkbox" 
                    bind:checked={confirmed}
                    required
                    class="w-4 h-4 mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-600"
                />
                <span class="text-xs font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
                    Ich bestätige hiermit die Richtigkeit und Vollständigkeit meiner gemachten Angaben. Mit dem Absenden wird mein Mitarbeiterkonto verbindlich angelegt.
                </span>
            </label>
        </div>
    </div>

    <!-- Stepper Buttons -->
    <div class="flex items-center justify-between gap-4 pt-3 pb-8 sm:pb-12 flex-wrap sm:flex-nowrap">
        <button 
            type="button" 
            onclick={onBack}
            disabled={isSubmitting}
            class="min-h-12 w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
            <ArrowLeft class="w-4 h-4" />
            <span>Zurück</span>
        </button>

        <button 
            type="submit" 
            disabled={isSubmitting}
            class="min-h-12 w-full sm:w-auto px-7 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold rounded-2xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer touch-manipulation active:scale-95 disabled:opacity-50"
        >
            {#if isSubmitting}
                <span>Wird übermittelt...</span>
            {:else}
                <Send class="w-4 h-4" />
                <span>Mitarbeiterprofil verbindlich anlegen</span>
            {/if}
        </button>
    </div>
</form>
