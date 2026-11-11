<script lang="ts">
    import { getCooperationScenarios } from "$lib/services/landingContentService";
    import { landingCmsStore } from "$lib/services/landingCmsStore.svelte";

    const defaultScenarios = getCooperationScenarios();

    let headline = $derived(landingCmsStore.content.cooperation?.headline || "Das Dreamteam für Angehörige & Betreuer");
    let subtitle = $derived(landingCmsStore.content.cooperation?.subtitle || "Wir drängen uns nicht auf, sondern springen genau da ein, wo der Schuh drückt. So wird aus Familie endlich wieder echte Familienzeit.");
    let partnerBadges = $derived(landingCmsStore.content.cooperation?.partner_badges || []);
    let scenarios = $derived.by(() => {
        const raw = landingCmsStore.content.cooperation?.scenarios;
        if (Array.isArray(raw) && raw.length > 0) {
            return raw;
        }
        return defaultScenarios;
    });
</script>

<div class="w-full max-w-6xl mx-auto px-4 py-10 mb-20 text-center transition-colors">
    <h2 class="text-3xl md:text-4xl font-bold text-neutral-900 dark:text-white mb-4">{headline}</h2>
    <p class="text-lg text-neutral-500 dark:text-slate-400 max-w-2xl mx-auto mb-10">{subtitle}</p>

    <!-- Partnerkassen Badges Kapseln -->
    {#if partnerBadges.length > 0}
        <div class="flex flex-wrap justify-center items-center gap-2 mb-14 max-w-4xl mx-auto">
            <span class="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-slate-500 mr-2">Anerkannt bei:</span>
            {#each partnerBadges as badge}
                <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-100/70 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60 shadow-2xs">
                    {badge}
                </span>
            {/each}
        </div>
    {/if}

    <div class="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
        {#each scenarios as scenario}
            <div class="orga-card-white border-2 border-amber-50 dark:border-slate-800 p-8 hover:border-amber-200 dark:hover:border-slate-700 transition-colors">
                <div class="inline-block bg-amber-100/50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60 text-xs font-bold px-3 py-1 rounded-full mb-4">
                    {scenario.tag}
                </div>
                <h3 class="text-xl font-bold text-neutral-900 dark:text-white mb-3">{scenario.title}</h3>
                <p class="text-neutral-600 dark:text-slate-300 leading-relaxed">
                    {scenario.text}
                </p>
            </div>
        {/each}
    </div>
</div>