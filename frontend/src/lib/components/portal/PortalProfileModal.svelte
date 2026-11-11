<script lang="ts">
    import { toastStore } from "$lib/services/toastService.svelte";
    import { pb } from "$lib/services/pocketbase";
    import { X, User } from "lucide-svelte";
    import PortalPersonalDataForm, { type ProfileFormData } from "./profile/PortalPersonalDataForm.svelte";
    import PortalSignatureSection from "./profile/PortalSignatureSection.svelte";
    import PortalPinChangeSection from "./profile/PortalPinChangeSection.svelte";

    let dialog: HTMLDialogElement | undefined = $state();
    let signatureSection: ReturnType<typeof PortalSignatureSection> | undefined = $state();
    let isLoading = $state(false);
    let errorMsg = $state("");
    let existingSignUrl = $state("");

    let formData = $state<ProfileFormData>({
        name_first: "",
        name_last: "",
        email: "",
        phone: "",
        street: "",
        housenr: "",
        zip: "",
        city: ""
    });

    export async function open() {
        errorMsg = "";
        signatureSection?.reset();
        dialog?.showModal();
        
        isLoading = true;
        try {
            const token = localStorage.getItem('portal_token') || sessionStorage.getItem('portal_token');
            const apiBaseUrl = (typeof window !== 'undefined' && !window.location.hostname.includes('ihre-seniorenassistenz.com')) ? `http://${window.location.hostname}:3000/portal` : '/api/emails/portal';
            
            const res = await fetch(`${apiBaseUrl}/profile`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) {
                const data = await res.json();
                if (data.success && data.profile) {
                    formData = {
                        name_first: data.profile.name_first || "",
                        name_last: data.profile.name_last || "",
                        email: data.profile.email || "",
                        phone: data.profile.phone || data.profile.handy || "",
                        street: data.profile.street || "",
                        housenr: data.profile.housenr || "",
                        zip: data.profile.zip || "",
                        city: data.profile.city || ""
                    };

                    if (data.profile.signUrl) {
                        existingSignUrl = data.profile.signUrl;
                    } else if (data.profile.sign) {
                        existingSignUrl = pb.files.getURL(data.profile, data.profile.sign);
                    } else {
                        existingSignUrl = "";
                    }
                }
            }
        } catch (e) {
            console.error("Fehler beim Laden des Profils", e);
            errorMsg = "Profildaten konnten nicht geladen werden.";
        } finally {
            isLoading = false;
        }
    }

    export function close() {
        dialog?.close();
    }

    async function saveProfile() {
        isLoading = true;
        errorMsg = "";
        try {
            const token = localStorage.getItem('portal_token') || sessionStorage.getItem('portal_token');
            const apiBaseUrl = (typeof window !== 'undefined' && !window.location.hostname.includes('ihre-seniorenassistenz.com')) ? `http://${window.location.hostname}:3000/portal` : '/api/emails/portal';
            
            const sigData = signatureSection?.getSignatureData() || {};
            const payload: any = {
                ...formData,
                ...sigData
            };

            const res = await fetch(`${apiBaseUrl}/profile`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Fehler beim Speichern");
            
            if (data.profile?.signUrl) {
                existingSignUrl = data.profile.signUrl;
            } else if (sigData.delete_signature) {
                existingSignUrl = "";
            }

            toastStore.success("Profil & Unterschrift erfolgreich aktualisiert!");
            close();
        } catch (err: any) {
            errorMsg = err.message || "Es ist ein Fehler aufgetreten.";
        } finally {
            isLoading = false;
        }
    }
</script>

<dialog 
    bind:this={dialog} 
    class="zero-inner-scroll-modal p-0 bg-transparent backdrop:bg-slate-950/60 backdrop:backdrop-blur-sm w-full max-w-2xl mx-auto my-6 sm:my-10 rounded-3xl" 
    onclick={(e) => { if (e.target === dialog) close(); }}
>
    <div class="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-neutral-100 dark:border-slate-800 rounded-3xl w-full flex flex-col relative shadow-2xl">
        <!-- Modal Kopfzeile -->
        <div class="px-6 md:px-8 py-5 border-b border-neutral-100 dark:border-slate-800 shrink-0 sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md z-20 flex justify-between items-center rounded-t-3xl">
            <h2 class="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <User class="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                <span>Ihr Profil</span>
            </h2>
            <button 
                type="button"
                aria-label="Schließen" 
                onclick={close} 
                class="w-11 h-11 min-w-[44px] min-h-[44px] bg-neutral-100 dark:bg-slate-800 hover:bg-neutral-200 dark:hover:bg-slate-700 text-neutral-600 dark:text-slate-300 rounded-full flex items-center justify-center transition-colors cursor-pointer touch-manipulation active:scale-95"
            >
                <X class="w-5 h-5" />
            </button>
        </div>
        
        <!-- Modal Inhalt -->
        <div class="flex-1 p-6 md:p-8 space-y-6 bg-neutral-50/50 dark:bg-slate-950/50">
            {#if errorMsg}
                <div class="bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-300 p-4 rounded-xl text-sm font-medium border border-red-100 dark:border-red-900/60 animate-enter">
                    {errorMsg}
                </div>
            {/if}
            
            <form id="portalProfileForm" onsubmit={(e) => { e.preventDefault(); saveProfile(); }} class="space-y-5 pb-2">
                <!-- Persönliche Daten -->
                <PortalPersonalDataForm bind:formData {isLoading} />

                <!-- Unterschrift Bereich -->
                <PortalSignatureSection 
                    bind:this={signatureSection}
                    {existingSignUrl}
                    onSignDeleted={() => { existingSignUrl = ""; }}
                />
            </form>

            <!-- PIN Ändern Bereich -->
            <PortalPinChangeSection />
        </div>

        <!-- Modal Fußleiste -->
        <div class="p-4 sm:p-6 border-t border-neutral-100 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shrink-0 sticky bottom-0 z-20 pb-[max(env(safe-area-inset-bottom,0px),1rem)]">
            <div class="flex flex-col-reverse sm:flex-row justify-end gap-3">
                <button 
                    type="button" 
                    onclick={close} 
                    class="orga-button-ghost w-full sm:w-auto min-h-[44px] py-3 sm:py-2.5 dark:text-slate-300 dark:hover:bg-slate-800 touch-manipulation cursor-pointer" 
                    disabled={isLoading}
                >
                    Abbrechen
                </button>
                <button 
                    type="submit" 
                    form="portalProfileForm" 
                    class="orga-button-primary bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20 w-full sm:w-auto min-h-[44px] py-3 sm:py-2.5 cursor-pointer touch-manipulation" 
                    disabled={isLoading}
                >
                    {isLoading ? "Speichert..." : "Profil & Unterschrift speichern"}
                </button>
            </div>
        </div>
    </div>
</dialog>