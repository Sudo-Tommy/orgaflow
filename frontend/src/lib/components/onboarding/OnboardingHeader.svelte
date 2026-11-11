<script lang="ts">
    import { Check, ShieldCheck } from 'lucide-svelte';

    let { 
        currentStep = 1
    } = $props<{
        currentStep: number;
        companyName?: string;
        roleLabel?: string;
    }>();

    const STEPS = [
        { num: 1, label: 'Persönliches' },
        { num: 2, label: 'Kontakt & Login' },
        { num: 3, label: 'Finanzen & Steuern' },
        { num: 4, label: 'Signatur & Abschluss' }
    ];
</script>

<header class="w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 relative sm:sticky sm:top-0 z-20 py-3 px-4 sm:px-6 shadow-2xs">
    <div class="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <!-- Logo & Context: Nur Seniorenassistenz Jenzsch & Onboarding -->
        <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white font-black text-sm shadow-md shrink-0">
                SJ
            </div>
            <div>
                <div class="flex items-center gap-2 flex-wrap">
                    <h1 class="text-sm sm:text-base font-black tracking-tight text-slate-900 dark:text-white">
                        Seniorenassistenz Jenzsch
                    </h1>
                    <span class="text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-200 dark:border-indigo-800">
                        Onboarding
                    </span>
                </div>
            </div>
        </div>

        <!-- Secure Badge -->
        <div class="hidden sm:flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800/60">
            <ShieldCheck class="w-3.5 h-3.5" />
            <span>Gesicherte SSL-Einmalverbindung</span>
        </div>
    </div>

    <!-- Stepper Indicator -->
    <div class="max-w-4xl mx-auto mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/60">
        <div class="grid grid-cols-4 gap-2 sm:gap-4">
            {#each STEPS as step}
                {@const isDone = currentStep > step.num}
                {@const isCurrent = currentStep === step.num}
                <div class="flex flex-col items-center sm:items-start gap-1">
                    <div class="flex items-center gap-2 w-full">
                        <div class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors
                            {isDone 
                                ? 'bg-emerald-500 text-white' 
                                : isCurrent 
                                    ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-200 dark:ring-indigo-900' 
                                    : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}"
                        >
                            {#if isDone}
                                <Check class="w-3.5 h-3.5 stroke-[3]" />
                            {:else}
                                <span>{step.num}</span>
                            {/if}
                        </div>
                        <div class="hidden sm:block flex-1 h-1 rounded-full 
                            {isDone ? 'bg-emerald-500' : isCurrent ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-800'}"
                        ></div>
                    </div>
                    <span class="text-[11px] sm:text-xs font-semibold text-center sm:text-left truncate max-w-full
                        {isCurrent ? 'text-indigo-600 dark:text-indigo-400' : isDone ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400'}"
                    >
                        {step.label}
                    </span>
                </div>
            {/each}
        </div>
    </div>
</header>
