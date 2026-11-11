<script lang="ts">
    import { User, Calendar, MapPin, Globe, Camera, ArrowRight } from 'lucide-svelte';
    import type { OnboardingFormData } from '$lib/services/onboardingService';

    let { 
        data = $bindable<OnboardingFormData>(),
        onNext
    } = $props<{
        data: OnboardingFormData;
        onNext: () => void;
    }>();

    // Alphabetisch sortiert nach Anzeigetext gem. alphabetical-select.md
    const GENDER_OPTIONS = [
        { value: 'divers', label: 'Divers' },
        { value: 'keine_angabe', label: 'Keine Angabe' },
        { value: 'männlich', label: 'Männlich' },
        { value: 'weiblich', label: 'Weiblich' }
    ];

    // Alphabetisch sortiert nach Anzeigetext gem. alphabetical-select.md
    const EMPLOYMENT_OPTIONS = [
        { value: 'Freiberuflich', label: 'Freiberuflich' },
        { value: 'Minijob', label: 'Minijob (Geringfügig)' },
        { value: 'Praktikum', label: 'Praktikum' },
        { value: 'Teilzeit', label: 'Teilzeit' },
        { value: 'Vollzeit', label: 'Vollzeit' },
        { value: 'Werkstudent', label: 'Werkstudent' }
    ];

    let fileInput: HTMLInputElement;
    let localError = $state('');

    function handleAvatarChange(e: Event) {
        const files = (e.target as HTMLInputElement).files;
        if (files && files[0]) {
            const file = files[0];
            if (file.size > 5 * 1024 * 1024) {
                localError = 'Das Bild darf maximal 5 MB groß sein.';
                return;
            }
            const reader = new FileReader();
            reader.onload = () => {
                data.avatar = reader.result as string;
                localError = '';
            };
            reader.readAsDataURL(file);
        }
    }

    function handleSubmit(e: SubmitEvent) {
        e.preventDefault();
        localError = '';
        if (!data.name_first?.trim() || !data.name_last?.trim()) {
            localError = 'Bitte Vor- und Nachname angeben.';
            return;
        }
        if (!data.date_birth) {
            localError = 'Bitte das Geburtsdatum angeben.';
            return;
        }
        if (!data.birth_place?.trim()) {
            localError = 'Bitte den Geburtsort angeben.';
            return;
        }
        onNext();
    }
</script>

<form onsubmit={handleSubmit} class="space-y-6">
    <!-- Intro Card -->
    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-sm space-y-6">
        <div>
            <h2 class="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <User class="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <span>1. Persönliche Stammdaten</span>
            </h2>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Bitte trage deine persönlichen Angaben wie im Personalausweis ein.
            </p>
        </div>

        {#if localError}
            <div class="p-3.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 rounded-2xl text-xs font-semibold text-red-600 dark:text-red-400">
                {localError}
            </div>
        {/if}

        <!-- Profilbild optional -->
        <div class="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60">
            <div class="w-16 h-16 rounded-2xl overflow-hidden bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0 border border-slate-300 dark:border-slate-600">
                {#if data.avatar}
                    <img src={data.avatar} alt="Vorschau" class="w-full h-full object-cover" />
                {:else}
                    <User class="w-8 h-8 text-slate-400" />
                {/if}
            </div>
            <div class="flex-1 min-w-0">
                <span class="block text-xs font-bold text-slate-900 dark:text-white">Profilbild (Optional)</span>
                <span class="block text-[11px] text-slate-500">Für interne Team- & Terminanzeigen</span>
                <input 
                    type="file" 
                    accept="image/*" 
                    bind:this={fileInput} 
                    onchange={handleAvatarChange} 
                    class="hidden" 
                />
                <button 
                    type="button" 
                    onclick={() => fileInput.click()}
                    class="mt-2 min-h-9 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                    <Camera class="w-3.5 h-3.5" />
                    <span>{data.avatar ? 'Foto ändern' : 'Foto auswählen'}</span>
                </button>
            </div>
        </div>

        <!-- Name Inputs -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
                <label for="name_first" class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Vorname <span class="text-red-500">*</span>
                </label>
                <input 
                    id="name_first"
                    type="text" 
                    bind:value={data.name_first} 
                    placeholder="z. B. Max"
                    required
                    class="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500" 
                />
            </div>
            <div>
                <label for="name_last" class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Nachname <span class="text-red-500">*</span>
                </label>
                <input 
                    id="name_last"
                    type="text" 
                    bind:value={data.name_last} 
                    placeholder="z. B. Mustermann"
                    required
                    class="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500" 
                />
            </div>
        </div>

        <!-- Geburtsdatum & Geburtsort -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
                <label for="date_birth" class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Geburtsdatum <span class="text-red-500">*</span>
                </label>
                <div class="relative">
                    <input 
                        id="date_birth"
                        type="date" 
                        bind:value={data.date_birth} 
                        required
                        class="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500" 
                    />
                </div>
            </div>
            <div>
                <label for="birth_place" class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Geburtsort <span class="text-red-500">*</span>
                </label>
                <input 
                    id="birth_place"
                    type="text" 
                    bind:value={data.birth_place} 
                    placeholder="z. B. Berlin"
                    required
                    class="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500" 
                />
            </div>
        </div>

        <!-- Staatsangehörigkeit, Geschlecht & Beschäftigungsart -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
                <label for="nationality" class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Staatsangehörigkeit
                </label>
                <input 
                    id="nationality"
                    type="text" 
                    bind:value={data.nationality} 
                    placeholder="z. B. Deutsch"
                    class="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500" 
                />
            </div>
            <div>
                <label for="gender" class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Geschlecht
                </label>
                <select 
                    id="gender"
                    bind:value={data.gender}
                    class="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500"
                >
                    {#each GENDER_OPTIONS as opt}
                        <option value={opt.value}>{opt.label}</option>
                    {/each}
                </select>
            </div>
            <div>
                <label for="employment_type" class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Beschäftigungsart
                </label>
                <select 
                    id="employment_type"
                    bind:value={data.employment_type}
                    class="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500"
                >
                    {#each EMPLOYMENT_OPTIONS as opt}
                        <option value={opt.value}>{opt.label}</option>
                    {/each}
                </select>
            </div>
        </div>
    </div>

    <!-- Navigation Action -->
    <div class="flex justify-end pt-3 pb-8 sm:pb-12">
        <button 
            type="submit" 
            class="min-h-12 w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer touch-manipulation active:scale-95"
        >
            <span>Weiter zu Kontakt & Login</span>
            <ArrowRight class="w-4 h-4" />
        </button>
    </div>
</form>

