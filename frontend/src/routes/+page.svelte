<script lang="ts">
    import { onMount } from 'svelte';
    import LandingHero from '$lib/components/LandingHero.svelte';
    import LandingServices from '$lib/components/LandingServices.svelte';
    import LandingProcess from '$lib/components/LandingProcess.svelte';
    import LandingTeam from '$lib/components/LandingTeam.svelte';
    import LandingCooperation from '$lib/components/LandingCooperation.svelte';
    import LandingQuality from '$lib/components/LandingQuality.svelte';
    import LandingFaq from '$lib/components/LandingFaq.svelte';
    import LandingAppointmentForm from '$lib/components/LandingAppointmentForm.svelte';
    import LandingFooter from '$lib/components/LandingFooter.svelte';
    import { themeService } from '$lib/services/themeService.svelte';
    import { landingCmsStore } from '$lib/services/landingCmsStore.svelte';

    let isDarkMode = $derived(themeService.isDark);

    onMount(() => {
        landingCmsStore.init();
    });
</script>

<svelte:head>
    <title>Seniorenassistenz OrgaFlow – Ihre Seniorenassistenz | Alltagshilfe, Betreuung &amp; Organisation</title>
    <meta property="og:title" content="Seniorenassistenz OrgaFlow – Ihre Seniorenassistenz" />
    <meta name="description" content="Seniorenassistenz OrgaFlow: Professionelle und liebevolle Seniorenassistenz in Halle (Saale) und Wittenberg. Wir unterstützen Sie im Alltag, bei Behördengängen und bieten eine verlässliche Betreuung." />
</svelte:head>

<div id="landing-page-root" class="flex flex-col min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors selection:bg-amber-500 selection:text-white relative">
    <!-- Schwebender Design-Umschalter (Tag/Nacht) -->
    <div class="fixed top-4 right-4 sm:top-6 sm:right-6 z-50">
        <button 
            onclick={() => themeService.toggle()} 
            class="w-12 h-12 rounded-2xl flex items-center justify-center bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border border-neutral-200 dark:border-slate-800 text-neutral-700 dark:text-amber-400 hover:scale-105 active:scale-95 shadow-lg shadow-neutral-900/10 dark:shadow-black/30 transition-all text-xl cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-500 outline-none" 
            aria-label="Tag- und Nachtmodus umschalten" 
            title={isDarkMode ? "Zum hellen Modus wechseln" : "Zum dunklen Modus wechseln"}
        >
            {isDarkMode ? '☀️' : '🌙'}
        </button>
    </div>

    <main class="flex-1">
        {#if landingCmsStore.meta.hero?.is_active ?? true}
            <LandingHero />
        {/if}
        {#if landingCmsStore.meta.services?.is_active ?? true}
            <LandingServices />
        {/if}
        {#if landingCmsStore.meta.process?.is_active ?? true}
            <LandingProcess />
        {/if}
        {#if landingCmsStore.meta.team?.is_active ?? true}
            <LandingTeam />
        {/if}
        {#if landingCmsStore.meta.cooperation?.is_active ?? true}
            <LandingCooperation />
        {/if}
        {#if landingCmsStore.meta.quality?.is_active ?? true}
            <LandingQuality />
        {/if}
        {#if landingCmsStore.meta.faq?.is_active ?? true}
            <LandingFaq />
        {/if}
        {#if landingCmsStore.meta.appointment?.is_active ?? true}
            <LandingAppointmentForm />
        {/if}
    </main>
    <LandingFooter />
</div>
