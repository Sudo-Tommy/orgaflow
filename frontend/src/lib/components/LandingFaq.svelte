<script lang="ts">
    import { getFaqs } from "$lib/services/landingContentService";
    import { landingCmsStore } from "$lib/services/landingCmsStore.svelte";

    const defaultFaqs = getFaqs();

    let headline = $derived(landingCmsStore.content.faq?.headline || "Häufige Fragen kurz erklärt");
    let subtitle = $derived(landingCmsStore.content.faq?.subtitle || "");

    let faqs = $derived.by(() => {
        const raw = landingCmsStore.content.faq;
        const items = Array.isArray(raw) ? raw : (raw?.items || []);
        if (items.length > 0) {
            return items.map(f => ({
                question: f.q,
                answerLines: [f.a]
            }));
        }
        return defaultFaqs;
    });
</script>

<div class="w-full max-w-5xl mx-auto px-4 py-20 text-left transition-colors">
    <div class="bg-amber-50/60 dark:bg-slate-900/80 border border-amber-100/60 dark:border-slate-800 rounded-[2.5rem] p-8 md:p-14 shadow-xl dark:shadow-none">
        <h2 class="text-3xl md:text-4xl font-bold text-brand-950 dark:text-white mb-4 text-center">{headline}</h2>
        {#if subtitle}
            <p class="text-neutral-600 dark:text-slate-400 text-center mb-10 max-w-xl mx-auto text-sm">{subtitle}</p>
        {:else}
            <div class="mb-8"></div>
        {/if}
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-12">
            {#each faqs as faq, i}
                <div>
                    <div class="flex items-center gap-3 mb-4">
                        <div class="w-10 h-10 bg-amber-200 dark:bg-slate-800 text-amber-800 dark:text-amber-300 border border-amber-300/40 dark:border-slate-700 rounded-full flex items-center justify-center font-bold shrink-0 shadow-2xs">{i + 1}</div>
                        <h3 class="text-2xl font-bold text-brand-950 dark:text-white">{faq.question}</h3>
                    </div>
                    {#each faq.answerLines as line}
                        <p class="text-neutral-700 dark:text-slate-300 leading-relaxed text-lg mb-4">{@html line}</p>
                    {/each}
                </div>
            {/each}
        </div>
    </div>
</div>