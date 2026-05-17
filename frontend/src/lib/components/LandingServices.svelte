<script lang="ts">
    import { getServices } from "$lib/services/landingContentService";
    const services = getServices();
</script>

<div id="leistungen" class="w-full max-w-6xl mx-auto px-4 py-20">
    <div class="text-center mb-16">
        <h2 class="text-3xl md:text-4xl font-bold text-neutral-900 mb-4">Ihre persönliche Task-Force für den Alltag</h2>
        <p class="text-lg text-neutral-500 max-w-2xl mx-auto">Egal ob Papierkrieg, Großeinkauf oder einfach nur jemand, der zuhört (und den besten Kuchen der Stadt mitbringt). Wir passen uns voll und ganz Ihren Wünschen an.</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
        {#each services as svc}
            <div class="orga-card-white p-8 md:p-10 group hover:-translate-y-2 transition-all duration-300 hover:shadow-2xl border-t-4 border-t-transparent hover:border-t-brand-600 relative overflow-hidden">
                <!-- Dekorativer Hover-Glow -->
                <div class="absolute top-0 right-0 w-32 h-32 bg-amber-100/50 rounded-full blur-3xl -mr-10 -mt-10 transition-transform duration-700 group-hover:scale-150 z-0 pointer-events-none"></div>
                <div class="relative z-10">
                    <div class="w-14 h-14 bg-amber-50 text-brand-800 rounded-2xl flex items-center justify-center mb-6 shadow-inner group-hover:bg-brand-800 group-hover:text-white transition-colors duration-300">
                        <svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d={svc.iconPath} /></svg>
                    </div>
                    <h3 class="text-xl font-bold mb-3 text-neutral-900">{svc.title}</h3>
                    <p class="text-neutral-600 leading-relaxed text-base">{svc.description}</p>
                </div>
            </div>
        {/each}
    </div>
</div>