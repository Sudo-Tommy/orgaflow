<script lang="ts">
    import LandingAppointmentModal from "./LandingAppointmentModal.svelte";
    import { landingCmsStore } from "$lib/services/landingCmsStore.svelte";
    import type LandingAppointmentModalType from "./LandingAppointmentModal.svelte";

    let modal: LandingAppointmentModalType;

    let appt = $derived(landingCmsStore.content.appointment);
</script>

<div id="terminanfrage" class="w-full max-w-4xl mx-auto px-4 py-20">
    <div class="bg-white dark:bg-slate-900 rounded-3xl p-8 md:p-12 shadow-2xl dark:shadow-black/50 relative overflow-hidden border border-amber-100/50 dark:border-slate-800 transition-colors">
        <!-- Dekorativer Blob im Hintergrund -->
        <div class="absolute top-0 right-0 w-64 h-64 bg-orange-100/50 dark:bg-amber-500/10 rounded-full blur-3xl -mr-20 -mt-20 z-0 pointer-events-none"></div>
        
        <div class="relative z-10 text-center mb-10">
            <h2 class="text-3xl md:text-4xl font-bold text-neutral-900 dark:text-white mb-4">
                {appt?.headline || "Kaffee steht bereit! Wann dürfen wir kommen?"}
            </h2>
            <p class="text-lg text-neutral-600 dark:text-slate-300 max-w-xl mx-auto">
                {appt?.subtitle || "Suchen Sie sich ganz entspannt einen Wunschtermin im Kalender aus. Wir beißen nicht – und freuen uns darauf, Sie kennenzulernen!"}
            </p>
        </div>

        <div class="relative z-10 text-center w-full">
            <button onclick={() => modal?.open()} class="orga-button-primary px-10 py-4 text-lg shadow-brand-600/30 hover:-translate-y-1 transition-all duration-300 w-full min-h-[48px] cursor-pointer">
                <span>{appt?.button_text || "📅 Termin online anfragen"}</span>
            </button>
        </div>
    </div>
</div>

<LandingAppointmentModal bind:this={modal} />