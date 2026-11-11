<script lang="ts">
    import { getProcessSteps } from "$lib/services/landingContentService";
    import { landingCmsStore } from "$lib/services/landingCmsStore.svelte";

    const defaultSteps = getProcessSteps();

    let headline = $derived(landingCmsStore.content.process?.headline || "Unser gemeinsamer Weg");
    let subtitle = $derived(landingCmsStore.content.process?.subtitle || "Ganz entspannt und völlig ohne Hektik: So sieht ein typischer Ablauf aus, wenn wir zum Beispiel gemeinsam Ihren Arztbesuch oder den Formular-Dschungel meistern.");
    let steps = $derived.by(() => {
        const raw = landingCmsStore.content.process?.steps;
        if (Array.isArray(raw) && raw.length > 0) {
            return raw;
        }
        return defaultSteps;
    });
</script>

<div class="w-full bg-amber-50/40 dark:bg-slate-900/40 py-20 px-4 border-y border-amber-100/50 dark:border-slate-800 transition-colors">
    <div class="max-w-5xl mx-auto text-center mb-16">
        <h2 class="text-3xl md:text-4xl font-bold text-neutral-900 dark:text-white mb-4">{headline}</h2>
        <p class="text-lg text-neutral-500 dark:text-slate-400 max-w-2xl mx-auto">{subtitle}</p>
    </div>

    <div class="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-6">
        {#each steps as step, i}
            <div class="orga-card-white p-6 relative">
                <!-- Verbindungslinie auf Desktop -->
                {#if i !== steps.length - 1}
                    <div class="hidden md:block absolute top-1/2 -right-3 w-6 h-0.5 bg-amber-200 dark:bg-slate-700"></div>
                {/if}
                
                <div class="text-sm font-bold text-brand-600 dark:text-amber-400 mb-2 uppercase tracking-wider">
                    {step.step}
                </div>
                <h3 class="text-xl font-bold mb-3 text-neutral-900 dark:text-white">{step.title}</h3>
                <p class="text-neutral-600 dark:text-slate-300 text-md leading-relaxed">
                    {step.text}
                </p>
            </div>
        {/each}
    </div>
</div>