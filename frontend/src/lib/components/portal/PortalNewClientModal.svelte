<script lang="ts">
    import { toastStore } from "$lib/services/toastService.svelte";
    import { X, UserPlus, Send, Loader2 } from "lucide-svelte";
    import { onMount } from "svelte";
    import { pb } from "$lib/services/pocketbase";

    let dialog: HTMLDialogElement | undefined = $state();
    let isLoading = $state(false);
    let errorMsg = $state("");
    let successMsg = $state("");

    let formData = $state({
        company: "",
        salutation: "Keine Angabe",
        name_first: "",
        name_last: "",
        birthdate: "",
        marital_status: "",
        nationality: "",
        street: "",
        housenr: "",
        zip: "",
        city: "",
        email: "",
        phone: "",
        handy: "",
        level_of_care: "",
        insurance_nr: "",
        insurance: "",
        retirement_homes: "",
        notes: ""
    });
    
    let companies = $state<any[]>([]);
    let insurances = $state<any[]>([]);
    let homes = $state<any[]>([]);

    onMount(() => {
        Promise.all([
            pb.collection('company').getFullList({ sort: 'city', requestKey: null }).catch(()=>[]),
            pb.collection('insurancies').getFullList({ sort: 'name', requestKey: null }).catch(()=>[]),
            pb.collection('retirement_homes').getFullList({ sort: 'name', requestKey: null }).catch(()=>[])
        ]).then(([comps, ins, hms]) => {
            companies = comps;
            insurances = ins;
            homes = hms;
        });
    });

    export function open() {
        errorMsg = "";
        successMsg = "";
        formData = {
            company: companies.length > 0 ? companies[0].id : "",
            salutation: "Keine Angabe",
            name_first: "",
            name_last: "",
            birthdate: "",
            marital_status: "",
            nationality: "",
            street: "",
            housenr: "",
            zip: "",
            city: "",
            email: "",
            phone: "",
            handy: "",
            level_of_care: "",
            insurance_nr: "",
            insurance: "",
            retirement_homes: "",
            notes: ""
        };
        dialog?.showModal();
    }

    export function close() {
        dialog?.close();
    }

    async function submitRequest() {
        isLoading = true;
        errorMsg = "";
        successMsg = "";

        try {
            const token = localStorage.getItem('portal_token') || sessionStorage.getItem('portal_token');
            const apiBaseUrl = (typeof window !== 'undefined' && !window.location.hostname.includes('ihre-seniorenassistenz.com')) ? `http://${window.location.hostname}:3000/portal` : '/api/emails/portal';
            
            const res = await fetch(`${apiBaseUrl}/new-client`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
            
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Fehler beim Senden der Anfrage");
            
            successMsg = "Die Anfrage zur Neuaufnahme wurde erfolgreich versendet! Wir prüfen diese und melden uns in Kürze.";
            toastStore.success("Aufnahme-Anfrage erfolgreich versendet.");
            
            setTimeout(() => {
                close();
            }, 3000);
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
            <h2 class="text-xl sm:text-2xl font-bold text-neutral-900 flex items-center gap-2"><UserPlus class="w-6 h-6 text-brand-600" /> Klienten-Aufnahme</h2>
            <button aria-label="Schließen" onclick={close} class="w-10 h-10 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-full flex items-center justify-center transition-colors">
                <X class="w-5 h-5" />
            </button>
        </div>
        
        <div class="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8">
            {#if successMsg}
                <div class="bg-emerald-50 text-emerald-800 p-6 rounded-2xl border border-emerald-200 text-center animate-enter my-4 shadow-sm">
                    <span class="text-4xl block mb-4">✅</span>
                    <h3 class="text-lg font-bold mb-2">Anfrage übermittelt!</h3>
                    <p class="font-medium text-sm">{successMsg}</p>
                </div>
            {:else}
                <p class="text-sm text-neutral-500 mb-6 leading-relaxed">Füllen Sie dieses Formular aus, um uns die Basisdaten eines neuen Klienten (z.B. als gesetzlicher Betreuer) für eine mögliche Aufnahme zu übermitteln.</p>

                {#if errorMsg}<div class="bg-rose-50 text-rose-700 p-4 rounded-xl mb-6 text-sm font-bold border border-rose-200 animate-enter">{errorMsg}</div>{/if}
                
                <form id="newClientForm" onsubmit={(e) => { e.preventDefault(); submitRequest(); }} class="space-y-5 pb-2">
                    <div class="p-4 bg-brand-50 border border-brand-100 rounded-xl mb-6">
                        <label for="nc-company" class="block text-sm font-semibold text-brand-900 mb-1.5">Zuständiger Standort / Firma *</label>
                        <select id="nc-company" bind:value={formData.company} class="orga-input-clear bg-white border-brand-200 cursor-pointer" required disabled={isLoading}>
                            <option value="">Bitte Standort wählen...</option>
                            {#each companies as comp}
                                <option value={comp.id}>{comp.city} {comp.name ? `(${comp.name})` : ''}</option>
                            {/each}
                        </select>
                    </div>

                    <h3 class="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">Persönliche Daten des Klienten</h3>
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div><label for="nc-salutation" class="block text-sm font-semibold text-neutral-700 mb-1.5">Anrede</label><select id="nc-salutation" bind:value={formData.salutation} class="orga-input-clear cursor-pointer" disabled={isLoading}><option value="Keine Angabe">Keine Angabe</option><option value="Herr">Herr</option><option value="Frau">Frau</option><option value="Divers">Divers</option></select></div>
                        <div><label for="nc-first" class="block text-sm font-semibold text-neutral-700 mb-1.5">Vorname *</label><input id="nc-first" type="text" bind:value={formData.name_first} class="orga-input-clear py-2.5 text-sm" disabled={isLoading} required /></div>
                        <div><label for="nc-last" class="block text-sm font-semibold text-neutral-700 mb-1.5">Nachname *</label><input id="nc-last" type="text" bind:value={formData.name_last} class="orga-input-clear py-2.5 text-sm" disabled={isLoading} required /></div>
                        
                        <div><label for="nc-birthdate" class="block text-sm font-semibold text-neutral-700 mb-1.5">Geburtsdatum</label><input id="nc-birthdate" type="date" bind:value={formData.birthdate} class="orga-input-clear py-2.5 text-sm" disabled={isLoading} /></div>
                        <div><label for="nc-marital" class="block text-sm font-semibold text-neutral-700 mb-1.5">Familienstand</label><select id="nc-marital" bind:value={formData.marital_status} class="orga-input-clear cursor-pointer" disabled={isLoading}><option value="">Keine Angabe</option><option value="Ledig">Ledig</option><option value="Verheiratet">Verheiratet</option><option value="Geschieden">Geschieden</option><option value="Verwitwet">Verwitwet</option></select></div>
                        <div><label for="nc-nationality" class="block text-sm font-semibold text-neutral-700 mb-1.5">Nationalität</label><input id="nc-nationality" type="text" bind:value={formData.nationality} class="orga-input-clear py-2.5 text-sm" disabled={isLoading} /></div>
                    </div>
                    
                    <h3 class="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3 pt-4 border-t border-neutral-100 mt-2">Kontaktdaten & Adresse</h3>
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                        <div><label for="nc-email" class="block text-sm font-semibold text-neutral-700 mb-1.5">E-Mail</label><input id="nc-email" type="email" bind:value={formData.email} class="orga-input-clear py-2.5 text-sm" disabled={isLoading} /></div>
                        <div><label for="nc-phone" class="block text-sm font-semibold text-neutral-700 mb-1.5">Festnetz</label><input id="nc-phone" type="text" bind:value={formData.phone} class="orga-input-clear py-2.5 text-sm" disabled={isLoading} /></div>
                        <div><label for="nc-handy" class="block text-sm font-semibold text-neutral-700 mb-1.5">Mobil (Handy)</label><input id="nc-handy" type="text" bind:value={formData.handy} class="orga-input-clear py-2.5 text-sm" disabled={isLoading} /></div>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
                        <div class="sm:col-span-3"><label for="nc-street" class="block text-sm font-semibold text-neutral-700 mb-1.5">Straße</label><input id="nc-street" type="text" bind:value={formData.street} class="orga-input-clear py-2.5 text-sm" disabled={isLoading} /></div>
                        <div><label for="nc-housenr" class="block text-sm font-semibold text-neutral-700 mb-1.5">Hausnr.</label><input id="nc-housenr" type="text" bind:value={formData.housenr} class="orga-input-clear py-2.5 text-sm" disabled={isLoading} /></div>
                        <div><label for="nc-zip" class="block text-sm font-semibold text-neutral-700 mb-1.5">PLZ</label><input id="nc-zip" type="text" bind:value={formData.zip} class="orga-input-clear py-2.5 text-sm" disabled={isLoading} /></div>
                        <div class="sm:col-span-3"><label for="nc-city" class="block text-sm font-semibold text-neutral-700 mb-1.5">Stadt</label><input id="nc-city" type="text" bind:value={formData.city} class="orga-input-clear py-2.5 text-sm" disabled={isLoading} /></div>
                    </div>

                    <h3 class="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3 pt-4 border-t border-neutral-100 mt-2">Kranken- & Pflegekasse</h3>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div><label for="nc-insurance" class="block text-sm font-semibold text-neutral-700 mb-1.5">Krankenkasse</label><select id="nc-insurance" bind:value={formData.insurance} class="orga-input-clear cursor-pointer py-2.5 text-sm" disabled={isLoading}><option value="">Keine / Unbekannt</option>{#each insurances as ins}<option value={ins.id}>{ins.name}</option>{/each}</select></div>
                        <div><label for="nc-insurance-nr" class="block text-sm font-semibold text-neutral-700 mb-1.5">Versicherungs-Nr.</label><input id="nc-insurance-nr" type="text" bind:value={formData.insurance_nr} class="orga-input-clear py-2.5 text-sm" disabled={isLoading} /></div>
                        <div><label for="nc-carelevel" class="block text-sm font-semibold text-neutral-700 mb-1.5">Pflegegrad</label><select id="nc-carelevel" bind:value={formData.level_of_care} class="orga-input-clear cursor-pointer py-2.5 text-sm" disabled={isLoading}><option value="">Keiner / Unbekannt</option><option value="0">Grad 0</option><option value="1">Grad 1</option><option value="2">Grad 2</option><option value="3">Grad 3</option><option value="4">Grad 4</option><option value="5">Grad 5</option></select></div>
                        <div><label for="nc-home" class="block text-sm font-semibold text-neutral-700 mb-1.5">Wohnt in Pflegeheim</label><select id="nc-home" bind:value={formData.retirement_homes} class="orga-input-clear cursor-pointer py-2.5 text-sm" disabled={isLoading}><option value="">Nein / Zuhause</option>{#each homes as home}<option value={home.id}>{home.name}</option>{/each}</select></div>
                    </div>

                    <h3 class="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3 pt-4 border-t border-neutral-100 mt-2">Weitere Informationen</h3>
                    <div><label for="nc-notes" class="block text-sm font-semibold text-neutral-700 mb-1.5">Grund der Anfrage / Besonderheiten (Pflegegrad etc.)</label><textarea id="nc-notes" bind:value={formData.notes} rows="4" class="orga-input-clear py-2.5 text-sm resize-y custom-scrollbar" placeholder="Beschreiben Sie kurz die Situation oder besondere Anforderungen..." disabled={isLoading}></textarea></div>
                </form>
            {/if}
        </div>
        {#if !successMsg}
        <div class="p-4 sm:p-6 border-t border-neutral-100 bg-white/95 backdrop-blur-md shrink-0 sticky bottom-0 z-20 pb-[max(env(safe-area-inset-bottom,0px),1rem)]">
            <div class="flex flex-col-reverse sm:flex-row justify-end gap-3">
                <button type="button" onclick={close} class="orga-button-ghost w-full sm:w-auto py-3 sm:py-2.5" disabled={isLoading}>Abbrechen</button>
                <button type="submit" form="newClientForm" class="orga-button-primary shadow-brand-600/20 w-full sm:w-auto py-3 sm:py-2.5 flex items-center justify-center gap-2" disabled={isLoading || !formData.name_first || !formData.name_last || !formData.company}>
                    {#if isLoading}<Loader2 class="w-4 h-4 animate-spin" />{:else}<Send class="w-4 h-4" />{/if}
                    {isLoading ? "Übermittelt..." : "Aufnahme anfragen"}
                </button>
            </div>
        </div>
        {/if}
    </div>
</dialog>