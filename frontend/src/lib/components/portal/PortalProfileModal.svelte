<script lang="ts">
    import { toastStore } from "$lib/services/toastService.svelte";
    import { X, User } from "lucide-svelte";

    let dialog: HTMLDialogElement | undefined = $state();
    let isLoading = $state(false);
    let errorMsg = $state("");
    let successMsg = $state("");

    let formData = $state({
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
        successMsg = "";
        dialog?.showModal();
        
        // Lade die aktuellen Daten des Nutzers
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
                }
            }
        } catch (e) {
            console.error("Fehler beim Laden des Profils");
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
        successMsg = "";
        try {
            const token = localStorage.getItem('portal_token') || sessionStorage.getItem('portal_token');
            const apiBaseUrl = (typeof window !== 'undefined' && !window.location.hostname.includes('ihre-seniorenassistenz.com')) ? `http://${window.location.hostname}:3000/portal` : '/api/emails/portal';
            
            const res = await fetch(`${apiBaseUrl}/profile`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
            
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Fehler beim Speichern");
            
            toastStore.success("Profil erfolgreich aktualisiert!");
            close();
        } catch (err: any) {
            errorMsg = err.message || "Es ist ein Fehler aufgetreten.";
        } finally {
            isLoading = false;
        }
    }
</script>

<dialog bind:this={dialog} class="p-0 bg-transparent backdrop:bg-black/50 backdrop:backdrop-blur-sm w-full max-w-2xl m-0 sm:m-auto max-h-none sm:max-h-fit rounded-none sm:rounded-3xl" onclick={(e) => { if (e.target === dialog) close(); }}>
    <div class="bg-white sm:rounded-3xl w-full h-dvh sm:h-auto sm:max-h-[90dvh] flex flex-col relative overflow-hidden shadow-2xl">
        <div class="px-6 md:px-8 py-5 border-b border-neutral-100 shrink-0 sticky top-0 bg-white/95 backdrop-blur-md z-20 flex justify-between items-center">
            <h2 class="text-xl sm:text-2xl font-bold text-neutral-900 flex items-center gap-2"><User class="w-6 h-6 text-emerald-600" /> Mein Profil</h2>
            <button aria-label="Schließen" onclick={close} class="w-10 h-10 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-full flex items-center justify-center transition-colors">
                <X class="w-5 h-5" />
            </button>
        </div>
        
        <div class="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8">
            {#if errorMsg}<div class="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm font-medium border border-red-100 animate-enter">{errorMsg}</div>{/if}
            
            <form id="portalProfileForm" onsubmit={(e) => { e.preventDefault(); saveProfile(); }} class="space-y-5 pb-2">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><label for="prof-first" class="block text-sm font-semibold text-neutral-700 mb-1.5">Vorname</label><input id="prof-first" type="text" bind:value={formData.name_first} class="orga-input-clear py-2.5 text-sm" disabled={isLoading} required /></div>
                    <div><label for="prof-last" class="block text-sm font-semibold text-neutral-700 mb-1.5">Nachname</label><input id="prof-last" type="text" bind:value={formData.name_last} class="orga-input-clear py-2.5 text-sm" disabled={isLoading} required /></div>
                </div>
                <div><label for="prof-email" class="block text-sm font-semibold text-neutral-700 mb-1.5">E-Mail</label><input id="prof-email" type="email" bind:value={formData.email} class="orga-input-clear py-2.5 text-sm" disabled={isLoading} required /></div>
                <div><label for="prof-phone" class="block text-sm font-semibold text-neutral-700 mb-1.5">Telefon / Mobil</label><input id="prof-phone" type="text" bind:value={formData.phone} class="orga-input-clear py-2.5 text-sm" disabled={isLoading} /></div>
                
                <div class="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-4 border-t border-neutral-100">
                    <div class="sm:col-span-3"><label for="prof-street" class="block text-sm font-semibold text-neutral-700 mb-1.5">Straße</label><input id="prof-street" type="text" bind:value={formData.street} class="orga-input-clear py-2.5 text-sm" disabled={isLoading} /></div>
                    <div><label for="prof-housenr" class="block text-sm font-semibold text-neutral-700 mb-1.5">Hausnr.</label><input id="prof-housenr" type="text" bind:value={formData.housenr} class="orga-input-clear py-2.5 text-sm" disabled={isLoading} /></div>
                    <div><label for="prof-zip" class="block text-sm font-semibold text-neutral-700 mb-1.5">PLZ</label><input id="prof-zip" type="text" bind:value={formData.zip} class="orga-input-clear py-2.5 text-sm" disabled={isLoading} /></div>
                    <div class="sm:col-span-3"><label for="prof-city" class="block text-sm font-semibold text-neutral-700 mb-1.5">Stadt</label><input id="prof-city" type="text" bind:value={formData.city} class="orga-input-clear py-2.5 text-sm" disabled={isLoading} /></div>
                </div>
            </form>
        </div>
        <div class="p-4 sm:p-6 border-t border-neutral-100 bg-white/95 backdrop-blur-md shrink-0 sticky bottom-0 z-20 pb-[max(env(safe-area-inset-bottom,0px),1rem)]">
            <div class="flex flex-col-reverse sm:flex-row justify-end gap-3">
                <button type="button" onclick={close} class="orga-button-ghost w-full sm:w-auto py-3 sm:py-2.5" disabled={isLoading}>Abbrechen</button>
                <button type="submit" form="portalProfileForm" class="orga-button-primary bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20 w-full sm:w-auto py-3 sm:py-2.5" disabled={isLoading}>{isLoading ? "Speichert..." : "Profil speichern"}</button>
            </div>
        </div>
    </div>
</dialog>