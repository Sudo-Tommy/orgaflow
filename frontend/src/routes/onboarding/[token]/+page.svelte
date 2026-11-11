<script lang="ts">
    import { onMount } from 'svelte';
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';
    import { loginUser } from '$lib/services/login';
    import { onboardingService, type OnboardingTokenInfo, type OnboardingFormData } from '$lib/services/onboardingService';
    import { toastStore } from '$lib/services/toastService.svelte';
    import OnboardingHeader from '$lib/components/onboarding/OnboardingHeader.svelte';
    import OnboardingStepPersonal from '$lib/components/onboarding/OnboardingStepPersonal.svelte';
    import OnboardingStepContact from '$lib/components/onboarding/OnboardingStepContact.svelte';
    import OnboardingStepFinance from '$lib/components/onboarding/OnboardingStepFinance.svelte';
    import OnboardingStepReviewSign from '$lib/components/onboarding/OnboardingStepReviewSign.svelte';
    import OnboardingSuccessStep from '$lib/components/onboarding/OnboardingSuccessStep.svelte';
    import { ShieldAlert, ArrowLeft } from 'lucide-svelte';

    const token = $page.params.token || '';

    let isLoading = $state(true);
    let tokenInfo = $state<OnboardingTokenInfo | null>(null);
    let currentStep = $state(1);
    let isSubmitting = $state(false);
    let submissionResult = $state<{ name: string; email: string; role: string } | null>(null);

    let formData = $state<OnboardingFormData>({
        name_first: '',
        name_last: '',
        email: '',
        password: '',
        date_birth: '',
        birth_place: '',
        nationality: 'Deutsch',
        gender: 'keine_angabe',
        employment_type: 'Vollzeit',
        street: '',
        housenr: '',
        zip: '',
        city: '',
        tel: '',
        handy: '',
        bank_iban: '',
        bank_bic: '',
        bank_name: '',
        bank_owner: '',
        tax_id: '',
        tax_class: '1',
        social_security_nr: '',
        health_insurance: '',
        drivers_license: 'B',
        has_car: false,
        willing_to_travel: true,
        qualifications: '',
        sign: '',
        avatar: ''
    });

    onMount(async () => {
        if (!token) {
            isLoading = false;
            return;
        }
        tokenInfo = await onboardingService.validateToken(token);
        isLoading = false;
    });

    async function handleSubmit() {
        isSubmitting = true;
        try {
            const res = await onboardingService.submitRegistration(token, $state.snapshot(formData));
            submissionResult = {
                name: res.name || `${formData.name_first} ${formData.name_last}`,
                email: res.email || formData.email,
                role: res.role || tokenInfo?.role || 'employee'
            };
            toastStore.success('Mitarbeiterprofil erfolgreich angelegt!');

            try {
                const loginRes = await loginUser(formData.email.trim().toLowerCase(), formData.password);
                if (loginRes.success) {
                    await goto('/dashboard');
                    return;
                }
            } catch (authErr) {
                console.warn('[Onboarding] Auto-Login Hinweis:', authErr);
            }

            currentStep = 5;
        } catch (err: any) {
            toastStore.error(err.message || 'Fehler beim Absenden des Formulars.');
        } finally {
            isSubmitting = false;
        }
    }

</script>

<svelte:head>
    <title>Seniorenassistenz Jenzsch - Onboarding</title>
</svelte:head>

<div class="w-full min-h-full bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col">
    {#if isLoading}
        <div class="flex-1 flex flex-col items-center justify-center p-8 space-y-3">
            <div class="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p class="text-xs font-semibold text-slate-500 animate-pulse">Sicherer Einladungslink wird überprüft...</p>
        </div>
    {:else if !tokenInfo?.valid}
        <div class="flex-1 flex items-center justify-center p-4">
            <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-xl text-center space-y-5 animate-enter">
                <div class="w-16 h-16 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
                    <ShieldAlert class="w-8 h-8" />
                </div>
                <div>
                    <h2 class="text-xl font-bold text-slate-900 dark:text-white">Einladungslink nicht mehr gültig</h2>
                    <p class="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                        {tokenInfo?.message || 'Dieser Link ist ungültig, abgelaufen oder wurde bereits verwendet.'}
                    </p>
                </div>
                <div class="pt-2">
                    <a 
                        href="/login" 
                        class="min-h-11 w-full py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl inline-flex items-center justify-center gap-2 transition-colors"
                    >
                        <ArrowLeft class="w-4 h-4" />
                        <span>Zurück zum Login</span>
                    </a>
                </div>
            </div>
        </div>
    {:else}
        <!-- Gültiger Token: Stepper Formular -->
        <OnboardingHeader 
            {currentStep} 
        />

        <main class="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6 pb-48 sm:pb-56 pb-[calc(14rem+env(safe-area-inset-bottom,4rem))] space-y-6">
            {#if currentStep === 1}
                <OnboardingStepPersonal 
                    bind:data={formData} 
                    onNext={() => currentStep = 2} 
                />
            {:else if currentStep === 2}
                <OnboardingStepContact 
                    bind:data={formData} 
                    onNext={() => currentStep = 3} 
                    onBack={() => currentStep = 1} 
                />
            {:else if currentStep === 3}
                <OnboardingStepFinance 
                    bind:data={formData} 
                    onNext={() => currentStep = 4} 
                    onBack={() => currentStep = 2} 
                />
            {:else if currentStep === 4}
                <OnboardingStepReviewSign 
                    bind:data={formData} 
                    {isSubmitting}
                    onSubmit={handleSubmit} 
                    onBack={() => currentStep = 3} 
                    onEditStep={(s) => currentStep = s} 
                />
            {:else if currentStep === 5}
                <OnboardingSuccessStep 
                    name={submissionResult?.name || ''} 
                    email={submissionResult?.email || ''} 
                    role={submissionResult?.role || 'employee'} 
                />
            {/if}
        </main>
    {/if}
</div>

