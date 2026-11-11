<script lang="ts">
    import type { WizardStepId, WizardStep } from "../types";
    import { rbacService } from "$lib/services/rbacService.svelte";
    import { Check } from "lucide-svelte";

    interface Props {
        activeTab: WizardStepId;
        onSelectTab: (tab: WizardStepId) => void;
        hasMasterData: boolean;
        hasCareData: boolean;
        hasInheritorData: boolean;
        hasBillingData: boolean;
    }

    let { 
        activeTab, 
        onSelectTab, 
        hasMasterData, 
        hasCareData, 
        hasInheritorData, 
        hasBillingData 
    }: Props = $props();

    const steps = $derived<WizardStep[]>([
        { id: "master", title: "Stammdaten", subtitle: "Name & Adresse", icon: "👤", stepNumber: 1 },
        { id: "care", title: "Pflege & Kasse", subtitle: "Grad & Zuweisung", icon: "🩺", stepNumber: 2 },
        { id: "inheritor", title: "Kontakte", subtitle: "Bezugspersonen & Rollen", icon: "🤝", stepNumber: 3 },
        rbacService.canAccessFinances
            ? { id: "billing", title: "Konditionen", subtitle: "Tarif & Signatur", icon: "💶", stepNumber: 4 }
            : { id: "billing", title: "Abschluss", subtitle: "Notizen & Signatur", icon: "✍️", stepNumber: 4 }
    ]);

    function isStepCompleted(id: WizardStepId): boolean {
        if (id === "master") return hasMasterData;
        if (id === "care") return hasCareData;
        if (id === "inheritor") return hasInheritorData;
        if (id === "billing") return hasBillingData;
        return false;
    }
</script>

<nav aria-label="Fortschritt der Neukundenaufnahme" class="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs p-1.5 sm:p-2 mb-6 grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
    {#each steps as step (step.id)}
        {@const isActive = activeTab === step.id}
        {@const completed = isStepCompleted(step.id)}
        <button
            type="button"
            onclick={() => onSelectTab(step.id)}
            class="p-2 sm:p-3 rounded-xl sm:rounded-2xl transition-all duration-150 flex items-center justify-start gap-2.5 sm:gap-3 text-left min-h-[44px] cursor-pointer {isActive 
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 ring-2 ring-indigo-400/40' 
                : completed 
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 border border-emerald-200/80 dark:border-emerald-800/60 hover:bg-emerald-100/70' 
                    : 'bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'}"
            aria-current={isActive ? "step" : undefined}
        >
            <div class="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center text-xs font-black shrink-0 transition-transform {isActive 
                ? 'bg-white/20 text-white scale-105' 
                : completed 
                    ? 'bg-emerald-600 text-white' 
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'}">
                {#if completed && !isActive}
                    <Check class="w-4 h-4" />
                {:else}
                    <span>{step.stepNumber}</span>
                {/if}
            </div>

            <div class="min-w-0 flex-1">
                <div class="flex items-center gap-1.5">
                    <span class="text-xs sm:text-sm font-bold truncate leading-tight">{step.title}</span>
                </div>
                <p class="text-[10px] sm:text-[11px] truncate mt-0.5 {isActive ? 'text-indigo-100' : completed ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-400 dark:text-slate-500'}">
                    {step.subtitle}
                </p>
            </div>
        </button>
    {/each}
</nav>
