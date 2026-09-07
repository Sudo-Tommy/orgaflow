<script lang="ts">
    import { onMount } from "svelte";
    import { scrollToSection } from "$lib/services/navigationService";
    import { landingCmsStore } from "$lib/services/landingCmsStore.svelte";
    import LandingAppointmentModal from "./LandingAppointmentModal.svelte";
    import LandingKostenModal from "./LandingKostenModal.svelte";
    import LandingLeistungenModal from "./LandingLeistungenModal.svelte";

    // svelte-ignore non_reactive_update
    let appModal: ReturnType<typeof LandingAppointmentModal>;
    // svelte-ignore non_reactive_update
    let kostenModal: ReturnType<typeof LandingKostenModal>;
    // svelte-ignore non_reactive_update
    let leistungenModal: ReturnType<typeof LandingLeistungenModal>;

    onMount(() => {
        landingCmsStore.init();
    });

    let hero = $derived(landingCmsStore.content.hero);
</script>

<div class="w-full bg-gradient-to-b from-white via-amber-50/30 to-brand-50/50 dark:from-slate-950 dark:via-slate-900/60 dark:to-slate-950 pt-20 pb-24 px-4 flex flex-col items-center text-center border-b border-brand-100 dark:border-slate-800 relative overflow-hidden transition-colors">
    <!-- Subtiler Sonnenschimmer im Hintergrund -->
    <div class="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-96 bg-amber-200/40 dark:bg-amber-500/10 rounded-full blur-[120px] pointer-events-none z-0"></div>

    <div class="relative z-10 flex flex-col items-center w-full">
        <span class="bg-brand-100 dark:bg-amber-950/70 text-brand-800 dark:text-amber-300 border border-brand-200/60 dark:border-amber-800/60 font-bold tracking-wider uppercase text-xs px-4 py-1.5 rounded-full mb-6 shadow-2xs">
            {hero.badge || "Wir sind an Ihrer Seite"}
        </span>
        <h1 class="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-8 text-neutral-950 dark:text-white max-w-4xl leading-tight">
            {hero.title || "Zuhause wohlfühlen. Selbstbestimmt bleiben."}
        </h1>
        <p class="text-xl md:text-2xl text-neutral-600 dark:text-slate-300 max-w-3xl mb-12 leading-relaxed">
            {hero.subtitle || "Wir unterstützen Sie im Formular-Dschungel, begleiten Sie zum Arzt und schaffen Ordnung im Alltag. Persönlich, verlässlich und liebevoll. Damit Sie das Leben wieder genießen und Ihre Liebsten entspannt aufatmen können."}
        </p>
        
        <div class="flex flex-col sm:flex-row gap-4 justify-center">
            <button onclick={() => appModal?.open()} class="orga-button-primary w-full sm:w-auto min-h-[44px] cursor-pointer">
                {hero.cta_primary || "Kostenloses Kennenlernen"}
            </button>
            <button onclick={() => leistungenModal?.open()} class="orga-button-ghost w-full sm:w-auto min-h-[44px] bg-white dark:bg-slate-800 border-2 border-brand-100 dark:border-slate-700 text-neutral-800 dark:text-slate-200 shadow-xs hover:border-brand-300 dark:hover:border-slate-600 cursor-pointer">
                {hero.cta_secondary || "Was wir für Sie tun können"}
            </button>
            <a href="/portal" class="orga-button-ghost w-full sm:w-auto min-h-[44px] bg-indigo-50 dark:bg-indigo-950/60 border-2 border-indigo-200 dark:border-indigo-800 text-indigo-800 dark:text-indigo-300 shadow-xs hover:bg-indigo-100 dark:hover:bg-indigo-900/40 flex items-center justify-center gap-2 cursor-pointer">🔐 Zum Portal</a>
        </div>
        
        <!-- Wichtige Info: Vertragsfreiheit -->
        <div class="mt-8 flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-sm sm:text-base font-bold text-neutral-700 dark:text-slate-300">
            <div class="flex items-center gap-2">
                <span class="text-emerald-500 text-xl leading-none">✓</span> Keine Vertragsbindung
            </div>
            <div class="flex items-center gap-2">
                <span class="text-emerald-500 text-xl leading-none">✓</span> Arbeit nach Auftrag
            </div>
            <div class="flex items-center gap-2">
                <span class="text-emerald-500 text-xl leading-none">✓</span> Einzelabrechnung möglich
            </div>
        </div>
    </div>
    
    <!-- Eyecatcher: Kostenübernahme -->
    <div id="kosten" class="relative z-10 mt-12 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-amber-200/80 dark:border-amber-800/60 rounded-3xl p-5 md:p-6 max-w-3xl mx-auto shadow-xl shadow-amber-900/5 dark:shadow-none flex flex-col sm:flex-row items-center gap-5 text-left transition-all hover:shadow-2xl hover:border-brand-300 dark:hover:border-amber-600 hover:-translate-y-1 cursor-pointer group" onclick={() => kostenModal?.open()} role="button" tabindex="0" onkeydown={(e) => e.key === 'Enter' && kostenModal?.open()}>
        <div class="w-14 h-14 bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/60 dark:to-amber-800/40 text-amber-700 dark:text-amber-300 rounded-full flex items-center justify-center text-3xl shrink-0 shadow-inner group-hover:scale-110 transition-transform duration-300 border border-amber-200 dark:border-amber-700/60">💡</div>
        <div class="flex-1 text-center sm:text-left">
            <h3 class="font-black text-brand-900 dark:text-amber-300 text-lg sm:text-xl mb-1.5">Verlässliche Hilfe, die Ihnen zusteht: Die Pflegekasse zahlt!</h3>
            <p class="text-sm sm:text-base text-neutral-700 dark:text-slate-300 font-medium leading-relaxed">Ob monatlicher <strong class="text-brand-900 dark:text-amber-300 font-bold">Entlastungsbetrag (131 € ab Pflegegrad 1)</strong> oder <strong class="text-teal-700 dark:text-teal-300 font-bold">Verhinderungspflege (§ 39 SGB XI)</strong>: Als anerkannter Dienstleister rechnen wir direkt mit Ihrer Pflegekasse ab – meist <strong class="text-brand-700 dark:text-amber-400 font-black">ohne einen einzigen Cent Zuzahlung</strong>.</p>
        </div>
        <button class="shrink-0 w-full sm:w-auto mt-4 sm:mt-0 px-6 py-3 min-h-[44px] bg-white dark:bg-slate-800 border-2 border-brand-200 dark:border-amber-700/60 text-brand-800 dark:text-amber-300 font-bold rounded-xl shadow-xs text-sm flex items-center justify-center gap-2 group-hover:bg-brand-50 dark:group-hover:bg-slate-700 transition-colors pointer-events-none">
            Anspruch prüfen <span class="text-lg group-hover:translate-x-1 transition-transform">→</span>
        </button>
    </div>
</div>

<LandingAppointmentModal bind:this={appModal} />
<LandingKostenModal bind:this={kostenModal} />
<LandingLeistungenModal bind:this={leistungenModal} />