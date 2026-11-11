<script lang="ts">
    import { getQualityFeatures } from "$lib/services/landingContentService";
    import { landingCmsStore } from "$lib/services/landingCmsStore.svelte";

    const defaultFeatures = getQualityFeatures();

    let headline = $derived(landingCmsStore.content.quality?.headline || "Auf uns können Sie bauen");
    let subtitle = $derived(landingCmsStore.content.quality?.subtitle || "Ihre Sicherheit, Ihr Lächeln und Ihr gutes Gefühl sind unser wichtigster Antrieb.");
    let features = $derived.by(() => {
        const raw = landingCmsStore.content.quality?.features;
        if (Array.isArray(raw) && raw.length > 0) {
            return raw;
        }
        return defaultFeatures;
    });
</script>

<div class="w-full max-w-6xl mx-auto px-4 py-20 text-left transition-colors">
    <div class="bg-orange-50/70 dark:bg-slate-900/80 text-neutral-900 dark:text-slate-100 rounded-[2.5rem] p-8 md:p-14 shadow-xl border border-orange-100/60 dark:border-slate-800">
        <div class="text-center mb-12">
            <h2 class="text-3xl md:text-4xl font-bold text-brand-950 dark:text-white mb-4">{headline}</h2>
            <p class="text-neutral-600 dark:text-slate-300 text-lg">{subtitle}</p>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-10">
            {#each features as feature}
                <div>
                    <h3 class="text-xl font-bold text-brand-800 dark:text-amber-400 mb-3">{feature.title}</h3>
                    <p class="text-neutral-600 dark:text-slate-300 leading-relaxed">{feature.text}</p>
                </div>
            {/each}
        </div>
    </div>
</div>