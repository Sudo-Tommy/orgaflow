<script lang="ts">
    import { toastStore } from "$lib/services/toastService.svelte";
    import { X, UserPlus, Send, Loader2 } from "lucide-svelte";
    import { onMount } from "svelte";
    import { pb } from "$lib/services/pocketbase";
    import NewNursingHomeModal from "./NewNursingHomeModal.svelte";
    import PortalNewClientPersonalFields from "./PortalNewClientPersonalFields.svelte";
    import PortalNewClientCareFields from "./PortalNewClientCareFields.svelte";
    import PortalNewClientCaregiverFields from "./PortalNewClientCaregiverFields.svelte";
    import { createDefaultNewClientFormData, type PortalNewClientFormData } from "./portalNewClientDefaults";

    let dialog: HTMLDialogElement | undefined = $state();
    let newHomeModal: ReturnType<typeof NewNursingHomeModal> | undefined = $state();
    let isLoading = $state(false);
    let errorMsg = $state("");
    let successMsg = $state("");

    let formData = $state<PortalNewClientFormData>(createDefaultNewClientFormData());

    let companies = $state<any[]>([]);
    let insurances = $state<any[]>([]);
    let homes = $state<any[]>([]);

    onMount(() => {
        Promise.all([
            pb.collection("company").getFullList({ sort: "city", requestKey: null }).catch(() => []),
            pb.collection("insurancies").getFullList({ sort: "name", requestKey: null }).catch(() => []),
            pb.collection("retirement_homes").getFullList({ sort: "name", requestKey: null }).catch(() => []),
        ]).then(([comps, ins, hms]) => {
            companies = comps;
            insurances = ins;
            homes = hms;
        });
    });

    export function open() {
        errorMsg = "";
        successMsg = "";
        const defaultComp = companies.length > 0 ? companies[0].id : "";
        formData = createDefaultNewClientFormData(defaultComp);
        dialog?.showModal();
    }

    export function close() {
        dialog?.close();
    }

    function copyClientAddressToCaregiver() {
        formData.caregiver_street = formData.street;
        formData.caregiver_housenr = formData.housenr;
        formData.caregiver_zip = formData.zip;
        formData.caregiver_city = formData.city;
        toastStore.info("Adresse des Klienten übernommen.");
    }

    async function submitRequest() {
        if (formData.insurance === "other" && !formData.other_insurance_name.trim()) {
            errorMsg = "Bitte geben Sie den Namen der neuen Krankenkasse an.";
            return;
        }

        if (formData.has_caregiver && (!formData.caregiver_name_first.trim() || !formData.caregiver_name_last.trim())) {
            errorMsg = "Bitte geben Sie Vor- und Nachname der Betreuungsperson an.";
            return;
        }

        isLoading = true;
        errorMsg = "";
        successMsg = "";

        try {
            const token = localStorage.getItem("portal_token") || sessionStorage.getItem("portal_token");
            const apiBaseUrl = typeof window !== "undefined" && !window.location.hostname.includes("ihre-seniorenassistenz.com")
                ? `http://${window.location.hostname}:3000/portal`
                : "/api/emails/portal";

            const res = await fetch(`${apiBaseUrl}/new-client`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(formData),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Fehler beim Senden der Anfrage");

            successMsg = formData.request_appointment
                ? "Die Aufnahme und der Terminwunsch wurden erfolgreich übermittelt! Wir prüfen die Angaben und melden uns umgehend."
                : "Die Anfrage zur Neuaufnahme wurde erfolgreich versendet! Wir prüfen diese und melden uns in Kürze.";
            toastStore.success("Anfrage erfolgreich übermittelt.");
        } catch (err: any) {
            errorMsg = err.message || "Es ist ein Fehler aufgetreten.";
        } finally {
            isLoading = false;
        }
    }
</script>

<dialog
    bind:this={dialog}
    class="zero-inner-scroll-modal p-0 bg-transparent backdrop:bg-slate-950/60 backdrop:backdrop-blur-sm w-full max-w-3xl mx-auto my-6 sm:my-10 rounded-2xl sm:rounded-3xl"
    onclick={(e) => { if (e.target === dialog) close(); }}
>
    <div class="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-neutral-100 dark:border-slate-800 sm:rounded-3xl w-full relative shadow-2xl">
        <div class="px-6 md:px-8 py-5 border-b border-neutral-100 dark:border-slate-800 shrink-0 sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md z-20 flex justify-between items-center rounded-t-3xl">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold shrink-0">
                    <UserPlus class="w-5 h-5" />
                </div>
                <div>
                    <h2 class="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white">Neuen Klienten anmelden</h2>
                    <p class="text-xs text-neutral-500 dark:text-slate-400 font-medium">Neuaufnahme unverbindlich anfragen</p>
                </div>
            </div>
            <button
                aria-label="Schließen"
                onclick={close}
                class="w-11 h-11 min-w-[44px] min-h-[44px] bg-neutral-100 dark:bg-slate-800 hover:bg-neutral-200 dark:hover:bg-slate-700 text-neutral-600 dark:text-slate-300 rounded-full flex items-center justify-center transition-colors cursor-pointer"
            >
                <X class="w-5 h-5" />
            </button>
        </div>

        <div class="p-6 md:p-8 bg-neutral-50/50 dark:bg-slate-950/50">
            {#if successMsg}
                <div class="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 p-6 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 text-center animate-enter my-4 shadow-sm">
                    <span class="text-4xl block mb-4">✅</span>
                    <h3 class="text-lg font-bold mb-2">Anfrage übermittelt!</h3>
                    <p class="font-medium text-sm">{successMsg}</p>
                </div>
            {:else}
                <p class="text-sm text-neutral-500 dark:text-slate-400 mb-6 leading-relaxed">
                    Füllen Sie dieses Formular aus, um uns die Basisdaten eines neuen Klienten für eine mögliche Aufnahme zu übermitteln.
                </p>

                {#if errorMsg}
                    <div class="bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 p-4 rounded-xl mb-6 text-sm font-bold border border-rose-200 dark:border-rose-900/60 animate-enter">
                        {errorMsg}
                    </div>
                {/if}

                <form id="newClientForm" onsubmit={(e) => { e.preventDefault(); submitRequest(); }} class="space-y-5 pb-2">
                    <PortalNewClientPersonalFields bind:formData {isLoading} {companies} />
                    <PortalNewClientCareFields 
                        bind:formData 
                        {isLoading} 
                        {insurances} 
                        {homes} 
                        onOpenNewHomeModal={() => newHomeModal?.open()} 
                    />
                    <PortalNewClientCaregiverFields 
                        bind:formData 
                        {isLoading} 
                        onCopyClientAddress={copyClientAddressToCaregiver} 
                    />
                </form>
            {/if}
        </div>

        {#if !successMsg}
            <div class="p-4 sm:p-6 border-t border-neutral-100 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shrink-0 sticky bottom-0 z-20 pb-[max(env(safe-area-inset-bottom,0px),1rem)] rounded-b-3xl">
                <div class="flex flex-col-reverse sm:flex-row justify-end gap-3">
                    <button type="button" onclick={close} class="orga-button-ghost w-full sm:w-auto min-h-[44px] py-3 sm:py-2.5 dark:text-slate-300 dark:hover:bg-slate-800" disabled={isLoading}>
                        Abbrechen
                    </button>
                    <button
                        type="submit"
                        form="newClientForm"
                        class="orga-button-primary shadow-brand-600/20 w-full sm:w-auto min-h-[44px] py-3 sm:py-2.5 flex items-center justify-center gap-2 cursor-pointer"
                        disabled={isLoading || !formData.name_first || !formData.name_last || !formData.company}
                    >
                        {#if isLoading}<Loader2 class="w-4 h-4 animate-spin" />{:else}<Send class="w-4 h-4" />{/if}
                        {isLoading ? "Übermittelt..." : "Aufnahme anfragen"}
                    </button>
                </div>
            </div>
        {/if}
    </div>
</dialog>

<NewNursingHomeModal 
    bind:this={newHomeModal} 
    onCreated={(home) => { 
        homes = [home, ...homes]; 
        formData.retirement_homes = home.id; 
    }} 
/>
