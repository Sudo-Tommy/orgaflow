<script lang="ts">
    import { scrollToSection } from "$lib/services/navigationService";
    import LandingAppointmentModal from "./LandingAppointmentModal.svelte";
    import LandingKostenModal from "./LandingKostenModal.svelte";
    import LandingLeistungenModal from "./LandingLeistungenModal.svelte";

    // svelte-ignore non_reactive_update
    let appModal: ReturnType<typeof LandingAppointmentModal>;
    // svelte-ignore non_reactive_update
    let kostenModal: ReturnType<typeof LandingKostenModal>;
    // svelte-ignore non_reactive_update
    let leistungenModal: ReturnType<typeof LandingLeistungenModal>;
</script>

<div class="w-full bg-linear-to-b from-white to-brand-50 pt-20 pb-24 px-4 flex flex-col items-center text-center border-b border-brand-100 relative overflow-hidden">
    <!-- Subtiler Sonnenschimmer im Hintergrund -->
    <div class="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-96 bg-amber-200/40 rounded-full blur-[120px] pointer-events-none z-0"></div>

    <div class="relative z-10 flex flex-col items-center w-full">
        <span class="bg-brand-100 text-brand-800 font-bold tracking-wider uppercase text-xs px-4 py-1.5 rounded-full mb-6">Wir sind an Ihrer Seite</span>
        <h1 class="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-8 text-neutral-950 max-w-4xl leading-tight">
            Zuhause wohlfühlen.<br> <span class="text-brand-600">Selbstbestimmt</span> bleiben.
        </h1>
        <p class="text-xl md:text-2xl text-neutral-600 max-w-3xl mb-12 leading-relaxed">
            Wir jonglieren Ihren Papierkram, begleiten Sie zum Arzt und zaubern Ordnung in den Alltag. Persönlich, verlässlich und liebevoll. Damit Sie das Leben wieder genießen und Ihre Liebsten entspannt aufatmen können.
        </p>
        
        <div class="flex flex-col sm:flex-row gap-4 justify-center">
            <button onclick={() => appModal?.open()} class="orga-button-primary w-full sm:w-auto">Kostenloses Kennenlernen</button>
            <button onclick={() => leistungenModal?.open()} class="orga-button-ghost w-full sm:w-auto bg-white border-2 border-brand-100 shadow-sm hover:border-brand-300">Was wir für Sie tun können</button>
            <a href="/portal" class="orga-button-ghost w-full sm:w-auto bg-indigo-50 border-2 border-indigo-200 text-indigo-800 shadow-sm hover:bg-indigo-100 flex items-center justify-center gap-2">🔐 Zum Portal</a>
        </div>
        
        <!-- Wichtige Info: Vertragsfreiheit -->
        <div class="mt-8 flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-sm sm:text-base font-bold text-neutral-700">
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
    <div class="relative z-10 mt-12 bg-white/80 backdrop-blur-md border border-amber-200/80 rounded-2xl p-5 md:p-6 max-w-3xl mx-auto shadow-xl shadow-amber-900/5 flex flex-col sm:flex-row items-center gap-5 text-left transition-all hover:shadow-2xl hover:border-brand-300 hover:-translate-y-1 cursor-pointer group" onclick={() => kostenModal?.open()} role="button" tabindex="0" onkeydown={(e) => e.key === 'Enter' && kostenModal?.open()}>
        <div class="w-14 h-14 bg-linear-to-br from-amber-100 to-amber-200 text-amber-700 rounded-full flex items-center justify-center text-3xl shrink-0 shadow-inner group-hover:scale-110 transition-transform duration-300">💡</div>
        <div class="flex-1 text-center sm:text-left">
            <h3 class="font-black text-brand-900 text-lg sm:text-xl mb-1.5">Gute Neuigkeiten: Die Kasse zahlt!</h3>
            <p class="text-sm sm:text-base text-neutral-700 font-medium leading-relaxed">Da wir als Betreuungsdienst anerkannt sind, können wir oft direkt abrechnen. So kostet Sie unsere wertvolle Hilfe in den meisten Fällen <strong class="text-brand-700 font-black">keinen einzigen Cent</strong> aus eigener Tasche.</p>
        </div>
        <button class="shrink-0 w-full sm:w-auto mt-4 sm:mt-0 px-6 py-3 bg-white border-2 border-brand-200 text-brand-800 font-bold rounded-xl shadow-sm text-sm flex items-center justify-center gap-2 group-hover:bg-brand-50 transition-colors pointer-events-none">
            Mehr erfahren <span class="text-lg group-hover:translate-x-1 transition-transform">→</span>
        </button>
    </div>
</div>

<LandingAppointmentModal bind:this={appModal} />
<LandingKostenModal bind:this={kostenModal} />
<LandingLeistungenModal bind:this={leistungenModal} />