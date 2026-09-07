<script lang="ts">
    import { getServices } from "$lib/services/landingContentService";
    import { landingCmsStore } from "$lib/services/landingCmsStore.svelte";

    const defaultServices = getServices();
    let services = $derived.by(() => {
        const cms = landingCmsStore.content.services;
        if (Array.isArray(cms) && cms.length > 0) {
            return cms.map((s, idx) => ({
                iconPath: defaultServices[idx % defaultServices.length]?.iconPath || "M12 6v6m0 0v6m0-6h6m-6 0H6",
                icon: s.icon,
                title: s.title,
                description: s.desc
            }));
        }
        return defaultServices.map(s => ({
            ...s,
            icon: ''
        }));
    });
</script>

<div id="leistungen" class="w-full max-w-6xl mx-auto px-4 py-20 transition-colors">
    <div class="text-center mb-16">
        <h2 class="text-3xl md:text-4xl font-bold text-neutral-900 dark:text-white mb-4">Ihre persönliche Task-Force für den Alltag</h2>
        <p class="text-lg text-neutral-500 dark:text-slate-400 max-w-2xl mx-auto">Egal ob Formular-Dschungel, Großeinkauf oder einfach nur jemand, der zuhört. Wir passen uns voll und ganz Ihren Wünschen an.</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
        {#each services as svc}
            <div class="orga-card-white p-8 md:p-10 group hover:-translate-y-2 transition-all duration-300 hover:shadow-2xl border-t-4 border-t-transparent hover:border-t-brand-600 dark:hover:border-t-amber-500 relative overflow-hidden">
                <!-- Dekorativer Hover-Glow -->
                <div class="absolute top-0 right-0 w-32 h-32 bg-amber-100/50 dark:bg-amber-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform duration-700 group-hover:scale-150 z-0 pointer-events-none"></div>
                <div class="relative z-10">
                    <div class="w-14 h-14 bg-amber-50 dark:bg-slate-800 text-brand-800 dark:text-amber-400 border border-amber-100 dark:border-slate-700 rounded-2xl flex items-center justify-center mb-6 shadow-inner group-hover:bg-brand-800 group-hover:text-white dark:group-hover:bg-amber-600 dark:group-hover:text-white transition-colors duration-300">
                        {#if svc.icon}
                            <span class="text-2xl">{svc.icon}</span>
                        {:else}
                            <svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d={svc.iconPath} /></svg>
                        {/if}
                    </div>
                    <h3 class="text-xl font-bold mb-3 text-neutral-900 dark:text-white">{svc.title}</h3>
                    <p class="text-neutral-600 dark:text-slate-300 leading-relaxed text-base">{svc.description}</p>
                </div>
            </div>
        {/each}
    </div>
</div>