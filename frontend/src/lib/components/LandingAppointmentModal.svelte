<script module lang="ts">
    export type { OpenAppointmentOptions } from "./landingAppointment/landingAppointmentTypes";
</script>

<script lang="ts">
    import { onMount } from "svelte";
    import { X } from "lucide-svelte";
    import PdfPreviewModal from "$lib/components/PdfPreviewModal.svelte";
    import DoctorAuthoritySelectionModal from "./contacts/DoctorAuthoritySelectionModal.svelte";
    import LandingAppointmentCalendar from "./landingAppointment/LandingAppointmentCalendar.svelte";
    import LandingAppointmentFormContent from "./landingAppointment/LandingAppointmentFormContent.svelte";
    import { createLandingAppointmentState } from "./landingAppointment/landingAppointmentState.svelte";
    import { submitLandingAppointment } from "./landingAppointment/landingAppointmentActions";
    import type { OpenAppointmentOptions } from "./landingAppointment/landingAppointmentTypes";

    // svelte-ignore non_reactive_update
    let dialog: HTMLDialogElement;
    let isOpen = $state(false);
    let pdfPreviewModal = $state<ReturnType<typeof PdfPreviewModal>>();
    let doctorAuthorityModal = $state<ReturnType<typeof DoctorAuthoritySelectionModal>>();

    const modalState = createLandingAppointmentState();

    onMount(() => {
        modalState.loadCompanies();
    });

    $effect(() => {
        if (modalState.company_id) {
            modalState.loadOccupiedDates(modalState.company_id);
        }
    });

    export function open(options?: OpenAppointmentOptions) {
        modalState.open(options);
        isOpen = true;
        try {
            if (!dialog?.open) dialog?.showModal();
        } catch (e) {
            console.warn("[LandingAppointmentModal] Fehler beim Öffnen:", e);
        }
    }

    export function close() {
        isOpen = false;
        try {
            if (dialog?.open) dialog.close();
        } catch (e) {
            console.warn("[LandingAppointmentModal] Fehler beim Schließen:", e);
        }
    }

    async function openDoctorAuthorityPicker() {
        modalState.isDoctorAppointmentManual = true;
        const selected = await doctorAuthorityModal?.open({
            clientId: modalState.selectedPortalClient,
            locationHint: modalState.zip_city || 'Halle (Saale)'
        });
        if (selected) {
            modalState.selectedDoctorOrAuthority = selected;
        }
    }

    function previewAttachment(file: File) {
        if (pdfPreviewModal) {
            const url = URL.createObjectURL(file);
            pdfPreviewModal.open(url, file.name, file.name);
        }
    }

    function handleSubmit(e: Event) {
        e.preventDefault();
        submitLandingAppointment(modalState, close);
    }
</script>

<dialog
    bind:this={dialog}
    class="zero-inner-scroll-modal p-0 bg-transparent backdrop:bg-slate-950/70 backdrop:backdrop-blur-sm w-full max-w-3xl mx-auto my-auto rounded-3xl border-none shadow-2xl z-[9999]"
    onclick={(e) => { if (e.target === dialog) { e.stopPropagation(); close(); } }}
    oncancel={(e) => { e.preventDefault(); close(); }}
>
    <div class="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-3xl w-full flex flex-col relative shadow-2xl border border-slate-200/80 dark:border-slate-800">
        <!-- Header -->
        <div class="bg-white/95 dark:bg-slate-900/95 px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 z-20 shadow-xs backdrop-blur-md rounded-t-3xl">
            <div class="flex items-center gap-3.5 sm:gap-4">
                <div class="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200/60 dark:border-amber-800/60 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold shadow-inner text-xl sm:text-2xl shrink-0">
                    📅
                </div>
                <div>
                    <h2 class="text-lg sm:text-2xl font-black text-slate-900 dark:text-white leading-tight">
                        {modalState.isPortalUser ? "Termin online anfragen" : "Termin online vereinbaren"}
                    </h2>
                    <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                        {modalState.isPortalUser ? "Direkte Anfrage für Ihre persönliche Seniorenassistenz" : "Kostenlos und unverbindlich. Wir melden uns umgehend bei Ihnen."}
                    </p>
                </div>
            </div>
            <button
                aria-label="Schließen"
                onclick={close}
                class="w-10 h-10 min-w-[44px] min-h-[44px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full flex items-center justify-center transition-colors shadow-xs shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500 outline-none"
            >
                <X class="w-5 h-5" />
            </button>
        </div>

        <!-- Body -->
        <div class="p-4 sm:p-6 md:p-8">
            {#if modalState.successMsg}
                <div class="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 p-8 rounded-3xl border border-emerald-200 dark:border-emerald-800 text-center animate-enter my-8 shadow-md">
                    <span class="text-5xl block mb-4">✅</span>
                    <h3 class="text-2xl font-black mb-2 text-emerald-900 dark:text-emerald-100">
                        Anfrage erfolgreich übermittelt!
                    </h3>
                    <p class="font-medium text-base text-emerald-800 dark:text-emerald-300 max-w-md mx-auto">
                        {modalState.successMsg}
                    </p>
                    <button
                        type="button"
                        onclick={close}
                        class="mt-8 orga-button-primary w-full sm:w-auto min-h-[44px] px-8 py-3 text-sm font-bold mx-auto cursor-pointer"
                    >
                        Fenster schließen
                    </button>
                </div>
            {:else}
                {#if modalState.errorMsg}
                    <div class="bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 p-4 rounded-2xl border border-rose-200 dark:border-rose-900 text-center mb-6 font-bold animate-enter shadow-xs">
                        {modalState.errorMsg}
                    </div>
                {/if}

                <form onsubmit={handleSubmit} class="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 pb-4">
                    <!-- Honeypot -->
                    <div aria-hidden="true" style="position:absolute;left:-9999px;top:-9999px;width:1px;height:1px;overflow:hidden;pointer-events:none;">
                        <label for="req-website-field">Website (bitte leer lassen)</label>
                        <input id="req-website-field" type="text" name="website" bind:value={modalState.website} tabindex="-1" autocomplete="off" />
                    </div>

                    <div class="lg:col-span-5">
                        <LandingAppointmentCalendar {modalState} />
                    </div>

                    <div class="lg:col-span-7 flex flex-col">
                        <LandingAppointmentFormContent
                            {modalState}
                            openDoctorAuthorityPicker={openDoctorAuthorityPicker}
                            onClearDoctorAuthority={() => {
                                modalState.selectedDoctorOrAuthority = null;
                                modalState.isDoctorAppointmentManual = null;
                            }}
                            previewAttachment={previewAttachment}
                            onSubmit={handleSubmit}
                        />
                    </div>
                </form>
            {/if}
        </div>
    </div>
</dialog>

<PdfPreviewModal bind:this={pdfPreviewModal} />
<DoctorAuthoritySelectionModal bind:this={doctorAuthorityModal} />
