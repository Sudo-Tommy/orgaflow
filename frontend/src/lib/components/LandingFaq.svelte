<script lang="ts">
    import { getFaqs } from "$lib/services/landingContentService";
    import { landingCmsStore } from "$lib/services/landingCmsStore.svelte";

    const defaultFaqs = getFaqs();
    let faqs = $derived.by(() => {
        const cmsFaqs = landingCmsStore.content.faq;
        if (Array.isArray(cmsFaqs) && cmsFaqs.length > 0) {
            return cmsFaqs.map(f => ({
                question: f.q,
                answerLines: [f.a]
            }));
        }
        return defaultFaqs;
    });
</script>

<div class="w-full max-w-5xl mx-auto px-4 py-20 text-left transition-colors">
    <div class="bg-amber-50/60 dark:bg-slate-900/80 border border-amber-100/60 dark:border-slate-800 rounded-[2.5rem] p-8 md:p-14 shadow-xl dark:shadow-none">
        <h2 class="text-3xl md:text-4xl font-bold text-brand-950 dark:text-white mb-10 text-center">Häufige Fragen kurz erklärt</h2>
        
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