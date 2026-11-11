<script lang="ts">
    import { toastStore } from "$lib/services/toastService.svelte";
    import { X, UserCircle } from "lucide-svelte";
    import { onMount } from "svelte";
    import { pb } from "$lib/services/pocketbase";
    import NewNursingHomeModal from "./NewNursingHomeModal.svelte";

    let { onSave } = $props<{ onSave?: () => void }>();

    let dialog: HTMLDialogElement | undefined = $state();
    let newHomeModal: ReturnType<typeof NewNursingHomeModal> | undefined = $state();
    let isLoading = $state(false);
    let errorMsg = $state("");
    let insurances = $state<any[]>([]);
    let homes = $state<any[]>([]);

    let currentClientId = $state("");
    let formData = $state({
        name_first: "", name_last: "", email: "", phone: "", handy: "",
        street: "", housenr: "", zip: "", city: "",
        birthdate: "", level_of_care: "0", insurance_nr: "",
        insurance: "", other_insurance_name: "",
        retirement_homes: ""
    });

    async function loadOptions() {
        try {
            const [insRes, homesRes] = await Promise.all([
                pb.collection('insurancies').getFullList({ sort: 'name', requestKey: null }).catch(() => []),
                pb.collection('retirement_homes').getFullList({ sort: 'name', requestKey: null })
                    .catch(() => pb.collection('nursing_homes').getFullList({ sort: 'name', requestKey: null }).catch(() => []))
            ]);
            insurances = insRes;
            homes = homesRes;
        } catch {}
    }

    onMount(() => {
        loadOptions();
    });

    export function open(client: any) {
        errorMsg = "";
        currentClientId = client.id;
        let insId = client.insurance;
        if (Array.isArray(insId)) insId = insId[0];

        let homeId = client.retirement_homes || client.nursing_home;
        if (Array.isArray(homeId)) homeId = homeId[0];

        formData = {
            name_first: client.name_first || "",
            name_last: client.name_last || "",
            email: client.email || "",
            phone: client.phone || "",
            handy: client.handy || "",
            street: client.street || "",
            housenr: client.housenr || "",
            zip: client.zip || "",
            city: client.city || "",
            birthdate: client.birthdate ? client.birthdate.split(' ')[0] : "",
            level_of_care: client.level_of_care || "0",
            insurance_nr: client.insurance_nr || "",
            insurance: insId || "",
            other_insurance_name: "",
            retirement_homes: homeId || ""
        };
        loadOptions();
        dialog?.showModal();
    }

    export function close() { dialog?.close(); }

    async function saveClient() {
        if (formData.insurance === 'other' && !formData.other_insurance_name.trim()) {
            errorMsg = "Bitte geben Sie den Namen der neuen Krankenkasse an.";
            return;
        }
        isLoading = true; errorMsg = "";
        try {
            const token = localStorage.getItem('portal_token') || sessionStorage.getItem('portal_token');
            const apiBaseUrl = (typeof window !== 'undefined' && !window.location.hostname.includes('ihre-seniorenassistenz.com')) ? `http://${window.location.hostname}:3000/portal` : '/api/emails/portal';
            
            const res = await fetch(`${apiBaseUrl}/clients/${currentClientId}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Fehler beim Speichern");
            
            toastStore.success("Klientendaten erfolgreich aktualisiert!");
            if (onSave) onSave();
            close();
        } catch (err: any) {
            errorMsg = err.message || "Es ist ein Fehler aufgetreten.";
        } finally {
            isLoading = false;
        }
    }
</script>

<dialog bind:this={dialog} class="zero-inner-scroll-modal p-0 bg-transparent backdrop:bg-slate-950/60 backdrop:backdrop-blur-sm w-full max-w-2xl mx-auto my-6 sm:my-10 rounded-3xl" onclick={(e) => { if (e.target === dialog) close(); }}>
    <div class="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-neutral-100 dark:border-slate-800 rounded-3xl w-full flex flex-col relative shadow-2xl">
        <div class="px-6 md:px-8 py-5 border-b border-neutral-100 dark:border-slate-800 shrink-0 sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md z-20 flex justify-between items-center rounded-t-3xl">
            <h2 class="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white flex items-center gap-2"><UserCircle class="w-6 h-6 text-brand-600 dark:text-brand-400" /> Klienten-Akte bearbeiten</h2>
            <button aria-label="Schließen" onclick={close} class="w-11 h-11 min-w-[44px] min-h-[44px] bg-neutral-100 dark:bg-slate-800 hover:bg-neutral-200 dark:hover:bg-slate-700 text-neutral-600 dark:text-slate-300 rounded-full flex items-center justify-center transition-colors cursor-pointer">
                <X class="w-5 h-5" />
            </button>
        </div>
        
        <div class="flex-1 p-6 md:p-8 bg-neutral-50/50 dark:bg-slate-950/50">
            {#if errorMsg}<div class="bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 p-4 rounded-xl mb-6 text-sm font-medium border border-rose-100 dark:border-rose-900/60 animate-enter">{errorMsg}</div>{/if}
            
            <form id="portalClientEditForm" onsubmit={(e) => { e.preventDefault(); saveClient(); }} class="space-y-5 pb-2">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><label for="ce-first" class="block text-sm font-semibold text-neutral-700 dark:text-slate-300 mb-1.5">Vorname *</label><input id="ce-first" type="text" bind:value={formData.name_first} class="orga-input-clear py-2.5 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100" disabled={isLoading} required /></div>
                    <div><label for="ce-last" class="block text-sm font-semibold text-neutral-700 dark:text-slate-300 mb-1.5">Nachname *</label><input id="ce-last" type="text" bind:value={formData.name_last} class="orga-input-clear py-2.5 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100" disabled={isLoading} required /></div>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><label for="ce-email" class="block text-sm font-semibold text-neutral-700 dark:text-slate-300 mb-1.5">E-Mail</label><input id="ce-email" type="email" bind:value={formData.email} class="orga-input-clear py-2.5 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100" disabled={isLoading} /></div>
                    <div><label for="ce-phone" class="block text-sm font-semibold text-neutral-700 dark:text-slate-300 mb-1.5">Telefon / Mobil</label><input id="ce-phone" type="text" bind:value={formData.phone} class="orga-input-clear py-2.5 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100" disabled={isLoading} /></div>
                </div>
                
                <div class="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-4 border-t border-neutral-100 dark:border-slate-800">
                    <div class="sm:col-span-3"><label for="ce-street" class="block text-sm font-semibold text-neutral-700 dark:text-slate-300 mb-1.5">Straße</label><input id="ce-street" type="text" bind:value={formData.street} class="orga-input-clear py-2.5 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100" disabled={isLoading} /></div>
                    <div><label for="ce-housenr" class="block text-sm font-semibold text-neutral-700 dark:text-slate-300 mb-1.5">Hausnr.</label><input id="ce-housenr" type="text" bind:value={formData.housenr} class="orga-input-clear py-2.5 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100" disabled={isLoading} /></div>
                    <div><label for="ce-zip" class="block text-sm font-semibold text-neutral-700 dark:text-slate-300 mb-1.5">PLZ</label><input id="ce-zip" type="text" bind:value={formData.zip} class="orga-input-clear py-2.5 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100" disabled={isLoading} /></div>
                    <div class="sm:col-span-3"><label for="ce-city" class="block text-sm font-semibold text-neutral-700 dark:text-slate-300 mb-1.5">Stadt</label><input id="ce-city" type="text" bind:value={formData.city} class="orga-input-clear py-2.5 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100" disabled={isLoading} /></div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-neutral-100 dark:border-slate-800">
                    <div>
                        <label for="ce-birth" class="block text-sm font-semibold text-neutral-700 dark:text-slate-300 mb-1.5">Geburtsdatum</label>
                        <input id="ce-birth" type="date" bind:value={formData.birthdate} class="orga-input-clear py-2.5 text-sm bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100" disabled={isLoading} />
                    </div>
                    <div>
                        <label for="ce-level" class="block text-sm font-semibold text-neutral-700 dark:text-slate-300 mb-1.5">Pflegegrad</label>
                        <select id="ce-level" bind:value={formData.level_of_care} class="orga-input-clear py-2.5 text-sm bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100" disabled={isLoading}>
                            <option value="0">Kein Pflegegrad / Unbekannt</option>
                            <option value="1">Pflegegrad 1</option>
                            <option value="2">Pflegegrad 2</option>
                            <option value="3">Pflegegrad 3</option>
                            <option value="4">Pflegegrad 4</option>
                            <option value="5">Pflegegrad 5</option>
                        </select>
                    </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-neutral-100 dark:border-slate-800">
                    <div>
                        <label for="ce-insurance" class="block text-sm font-semibold text-neutral-700 dark:text-slate-300 mb-1.5">Krankenkasse</label>
                        <select id="ce-insurance" bind:value={formData.insurance} class="orga-input-clear py-2.5 text-sm bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 cursor-pointer" disabled={isLoading}>
                            <option value="">Keine / Unbekannt</option>
                            <option value="other" class="font-bold text-brand-600 dark:text-brand-400">➕ andere / neue Krankenkasse...</option>
                            {#each insurances as ins}
                                <option value={ins.id}>{ins.name}</option>
                            {/each}
                        </select>
                    </div>
                    <div>
                        <label for="ce-ins-nr" class="block text-sm font-semibold text-neutral-700 dark:text-slate-300 mb-1.5">Versicherungs-Nr.</label>
                        <input id="ce-ins-nr" type="text" bind:value={formData.insurance_nr} placeholder="z. B. Z123456789" class="orga-input-clear py-2.5 text-sm bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100" disabled={isLoading} />
                    </div>
                    {#if formData.insurance === 'other'}
                        <div class="sm:col-span-2 bg-brand-50/50 dark:bg-brand-950/30 p-3.5 rounded-xl border border-brand-200 dark:border-brand-900/50 animate-enter">
                            <label for="ce-other-ins" class="block text-xs font-bold text-brand-900 dark:text-brand-300 mb-1">Name der neuen Krankenkasse *</label>
                            <input id="ce-other-ins" type="text" bind:value={formData.other_insurance_name} placeholder="z. B. Techniker Krankenkasse, DAK..." class="orga-input-clear bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 py-2 text-sm" required disabled={isLoading} />
                        </div>
                    {/if}
                </div>

                <div class="pt-4 border-t border-neutral-100 dark:border-slate-800">
                    <label for="ce-home" class="block text-sm font-semibold text-neutral-700 dark:text-slate-300 mb-1.5">Wohnsituation / Pflegeheim</label>
                    <select
                        id="ce-home"
                        bind:value={formData.retirement_homes}
                        onchange={(e) => {
                            if (e.currentTarget.value === '__new_home__') {
                                formData.retirement_homes = '';
                                newHomeModal?.open();
                            }
                        }}
                        class="orga-input-clear py-2.5 text-sm bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 cursor-pointer min-h-[44px]"
                        disabled={isLoading}
                    >
                        <option value="">Ambulant / Eigenes Zuhause</option>
                        <option value="__new_home__" class="font-bold text-teal-600 dark:text-teal-400">+ Neues Pflegeheim anlegen</option>
                        {#each homes as home}
                            <option value={home.id}>{home.name}</option>
                        {/each}
                    </select>
                </div>
            </form>
        </div>
        <div class="p-4 sm:p-6 border-t border-neutral-100 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shrink-0 sticky bottom-0 z-20 pb-[max(env(safe-area-inset-bottom,0px),1rem)]">
            <div class="flex flex-col-reverse sm:flex-row justify-end gap-3">
                <button type="button" onclick={close} class="orga-button-ghost w-full sm:w-auto min-h-[44px] py-3 sm:py-2.5 dark:text-slate-300 dark:hover:bg-slate-800" disabled={isLoading}>Abbrechen</button>
                <button type="submit" form="portalClientEditForm" class="orga-button-primary w-full sm:w-auto min-h-[44px] py-3 sm:py-2.5 cursor-pointer" disabled={isLoading}>{isLoading ? "Speichert..." : "Daten speichern"}</button>
            </div>
        </div>
    </div>
</dialog>

<NewNursingHomeModal 
    bind:this={newHomeModal} 
    onCreated={(home) => { 
        homes = [home, ...homes]; 
        formData.retirement_homes = home.id; 
    }} 
/>