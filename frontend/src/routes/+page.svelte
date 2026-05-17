<script lang="ts">
    import LandingHeader from '$lib/components/LandingHeader.svelte';
    import LandingHero from '$lib/components/LandingHero.svelte';
    import LandingServices from '$lib/components/LandingServices.svelte';
    import LandingProcess from '$lib/components/LandingProcess.svelte';
    import LandingTeam from '$lib/components/LandingTeam.svelte';
    import LandingCooperation from '$lib/components/LandingCooperation.svelte';
    import LandingQuality from '$lib/components/LandingQuality.svelte';
    import LandingFaq from '$lib/components/LandingFaq.svelte';
    import LandingAppointmentForm from '$lib/components/LandingAppointmentForm.svelte';
    import LandingFooter from '$lib/components/LandingFooter.svelte';
</script>

<svelte:head>
    <title>Ihre Seniorenassistenz - Alltagshilfe, Betreuung & Organisation</title>
    <meta name="description" content="Professionelle und liebevolle Seniorenassistenz in Halle (Saale) und Wittenberg. Wir unterstützen Sie im Alltag, bei Behördengängen und bieten eine verlässliche Betreuung." />
</svelte:head>

<div class="flex flex-col min-h-screen bg-white">
    <LandingHeader />
    <main class="flex-1">
        <LandingHero />
        <LandingServices />
        <LandingProcess />
        <LandingTeam />
        <LandingCooperation />
        <LandingQuality />
        <LandingFaq />
        <LandingAppointmentForm />
    </main>
    <LandingFooter />
</div>