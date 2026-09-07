<script lang="ts">
    import { pb } from '$lib/services/pocketbase';
    import { orgaStore } from '$lib/stores/orgaStore.svelte';
    import { toastStore } from '$lib/services/toastService.svelte';
    import { resolveMatchingInquiriesForContact } from '$lib/services/contactPickerService';

    let isOpen = $state(false);
    let isLoading = $state(false);
    let isSaving = $state(false);
    let dialog = $state<HTMLDialogElement>();

    $effect(() => {
        if (isOpen && dialog && !dialog.open) {
            dialog.showModal();
        } else if (!isOpen && dialog && dialog.open) {
            dialog.close();
        }
    });

    // Such-Parameter
    let searchQuery = $state('');
    let searchLocation = $state('');
    let searchType = $state<'doctor' | 'location' | 'general'>('doctor');
    let searchContext = $state('');

    // Gefundene Ergebnisse
    interface GoogleContactResult {
        company_name: string;
        name_first: string;
        name_last: string;
        salutation: "Herr" | "Frau" | "Divers" | "Keine Angabe";
        street: string;
        housenr: string;
        zip: string;
        city: string;
        phone: string;
        email: string;
        website: string;
        category?: string;
        description?: string;
    }

    let results = $state<GoogleContactResult[]>([]);
    let selectedIndex = $state<number>(0);

    // Editierbares Kontakt-Formular für die finale Übernahme
    let formCompanyName = $state('');
    let formSalutation = $state<"Herr" | "Frau" | "Divers" | "Keine Angabe">('Keine Angabe');
    let formNameFirst = $state('');
    let formNameLast = $state('');
    let formStreet = $state('');
    let formHouseNr = $state('');
    let formZip = $state('');
    let formCity = $state('');
    let formPhone = $state('');
    let formEmail = $state('');
    let formNotes = $state('');

    // Callbacks für den Aufrufer
    let resolveCallback: ((contact: any | null) => void) | null = null;

    export function open(params: {
        query: string;
        location?: string;
        type?: 'doctor' | 'location' | 'general';
        context?: string;
    }): Promise<any | null> {
        searchQuery = params.query || '';
        searchLocation = params.location || '';
        searchType = params.type || 'doctor';
        searchContext = params.context || '';
        results = [];
        selectedIndex = 0;
        isOpen = true;

        if (dialog && !dialog.open) {
            dialog.showModal();
        }

        // Automatische Suche sofort ausführen
        performSearch();

        return new Promise((resolve) => {
            resolveCallback = resolve;
        });
    }

    export function close(result: any | null = null) {
        isOpen = false;
        if (dialog && dialog.open) {
            dialog.close();
        }
        if (resolveCallback) {
            resolveCallback(result);
            resolveCallback = null;
        }
    }

    async function performSearch() {
        if (!searchQuery && !searchLocation) return;
        isLoading = true;
        try {
            const microserviceUrl = import.meta.env.DEV ? 'http://localhost:3000' : '';
            const res = await fetch(`${microserviceUrl}/api/contacts/google-lookup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${pb.authStore.token}`
                },
                body: JSON.stringify({
                    query: searchQuery,
                    location: searchLocation,
                    type: searchType,
                    context: searchContext
                })
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || `Server meldete Status ${res.status}`);
            }

            const data = await res.json();
            results = data.results || [];

            if (results.length > 0) {
                selectResult(0);
            } else {
                toastStore.info("Keine direkten Treffer auf Google gefunden. Sie können die Daten manuell eingeben oder den Suchbegriff anpassen.");
                // Formular mit vorhandenem Suchbegriff vorbefüllen
                formCompanyName = searchType === 'doctor' ? '' : searchQuery;
                formNameLast = searchType === 'doctor' ? searchQuery.replace(/^(?:Dr\.?|Herr|Frau|Praxis|Arzt)\s+/i, '').trim() : '';
                formCity = searchLocation;
            }
        } catch (err: any) {
            console.error("Google Lookup Fehler:", err);
            toastStore.error("Google-Suche fehlgeschlagen: " + (err.message || ''));
        } finally {
            isLoading = false;
        }
    }

    function selectResult(index: number) {
        if (!results[index]) return;
        selectedIndex = index;
        const r = results[index];

        formCompanyName = r.company_name || '';
        formSalutation = (r.salutation as any) || 'Keine Angabe';
        formNameFirst = r.name_first || '';
        formNameLast = r.name_last || '';
        formStreet = r.street || '';
        formHouseNr = r.housenr || '';
        formZip = r.zip || '';
        formCity = r.city || '';
        formPhone = r.phone || '';
        formEmail = r.email || '';
        
        const noteParts: string[] = [];
        if (r.category) noteParts.push(`Kategorie: ${r.category}`);
        if (r.description) noteParts.push(r.description);
        if (r.website) noteParts.push(`Webseite: ${r.website}`);
        formNotes = noteParts.join(' | ');
    }

    async function handleSaveContact() {
        // Validierung: Mindestens Name oder Firmenname erforderlich
        if (!formCompanyName && !formNameLast) {
            toastStore.warning("Bitte geben Sie mindestens einen Nachnamen oder eine Praxis-/Einrichtungsbezeichnung ein.");
            return;
        }

        isSaving = true;
        try {
            const payload: any = {
                salutation: formSalutation,
                company_name: formCompanyName.trim(),
                name_first: formNameFirst.trim(),
                name_last: formNameLast.trim(),
                street: formStreet.trim(),
                housenr: formHouseNr.trim(),
                zip: formZip.trim(),
                city: formCity.trim(),
                phone: formPhone.trim(),
                email: formEmail.trim(),
                notes: formNotes.trim()
            };

            const createdContact = await pb.collection('contacts').create(payload, { requestKey: null });
            resolveMatchingInquiriesForContact(createdContact);

            // In OrgaStore registrieren falls noch nicht gelistet
            if (orgaStore.contacts?.data) {
                const exists = orgaStore.contacts.data.some((c: any) => c.id === createdContact.id);
                if (!exists) {
                    orgaStore.contacts.data = [createdContact as any, ...orgaStore.contacts.data];
                }
            }

            const displayName = formCompanyName || `${formNameFirst} ${formNameLast}`.trim();
            toastStore.success(`Kontakt "${displayName}" erfolgreich angelegt & verknüpft!`);

            close(createdContact);
        } catch (err: any) {
            console.error("Fehler beim Anlegen des Kontakts:", err);
            toastStore.error("Kontakt konnte nicht gespeichert werden: " + (err.message || ''));
        } finally {
            isSaving = false;
        }
    }
</script>

<dialog 
    bind:this={dialog}
    class="p-0 bg-transparent backdrop:bg-black/60 backdrop:backdrop-blur-xs w-full max-w-2xl mx-auto my-auto rounded-2xl border-0 overflow-visible z-[999999]"
    onclick={(e) => { if (e.target === dialog) close(null); }}
    oncancel={(e) => { e.preventDefault(); close(null); }}
>
    {#if isOpen}
    <div class="bg-white rounded-2xl shadow-2xl border border-neutral-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        <!-- Header -->
        <div class="p-5 border-b border-neutral-100 flex items-center justify-between bg-gradient-to-r from-blue-50/80 via-neutral-50 to-white">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center text-xl shadow-2xs">
                    {#if searchType === 'location'}
                        📍
                    {:else}
                        🩺
                    {/if}
                </div>
                <div>
                    <h2 class="text-base font-bold text-neutral-900 flex items-center gap-2">
                        <span>{searchType === 'location' ? 'Ort / Zieladresse via Google ermitteln' : 'Kontakt / Arzt via Google ermitteln'}</span>
                        <span class="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-extrabold border border-blue-200">Google Search Live</span>
                    </h2>
                    <p class="text-xs text-neutral-500">
                        {searchType === 'location' 
                            ? 'Erstelle direkt aus der Zieladresse der Anfrage einen neuen Kontakt für das System.'
                            : 'In der Anfrage erwähnt, aber noch nicht in OrgaFlow vorhanden. Prüfen und direkt anlegen.'}
                    </p>
                </div>
            </div>
            <button 
                type="button" 
                onclick={() => close(null)}
                class="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
                title="Schließen"
            >✕</button>
        </div>

        <!-- Suchleiste & Filter -->
        <div class="p-4 bg-neutral-50 border-b border-neutral-200 flex flex-col sm:flex-row items-center gap-2">
            <div class="flex-1 w-full relative">
                <input 
                    type="text" 
                    bind:value={searchQuery} 
                    placeholder={searchType === 'location' ? 'Ort, Einrichtung oder Straße...' : 'Arztname, Praxis oder Einrichtung...'}
                    class="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-neutral-300 bg-white focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-2xs font-medium"
                    onkeydown={(e) => e.key === 'Enter' && performSearch()}
                />
                <span class="absolute left-2.5 top-2.5 text-neutral-400 text-xs">🔍</span>
            </div>
            <div class="w-full sm:w-48 relative">
                <input 
                    type="text" 
                    bind:value={searchLocation} 
                    placeholder="Stadt / PLZ..."
                    class="w-full pl-7 pr-3 py-2 text-xs rounded-xl border border-neutral-300 bg-white focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-2xs font-medium"
                    onkeydown={(e) => e.key === 'Enter' && performSearch()}
                />
                <span class="absolute left-2.5 top-2.5 text-neutral-400 text-xs">📍</span>
            </div>
            <button 
                type="button" 
                onclick={performSearch}
                disabled={isLoading}
                class="w-full sm:w-auto px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap active:scale-95"
            >
                {#if isLoading}
                    <svg class="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg>
                    <span>Sucht...</span>
                {:else}
                    <span>Google-Suche</span>
                {/if}
            </button>
        </div>

        <!-- Content Area -->
        <div class="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
            
            {#if isLoading}
                <div class="py-12 flex flex-col items-center justify-center text-center">
                    <div class="w-12 h-12 rounded-full border-3 border-blue-500 border-t-transparent animate-spin mb-3"></div>
                    <p class="text-sm font-bold text-neutral-700">Google wird durchsucht...</p>
                    <p class="text-xs text-neutral-400 mt-0.5">Ermittle Anschrift, Telefonnummer und Kontaktdaten via Google Search Grounding</p>
                </div>
            {:else}

                <!-- Treffer-Auswahlkarten -->
                {#if results.length > 0}
                    <div>
                        <span class="text-[11px] font-extrabold uppercase tracking-wider text-neutral-500 block mb-2">
                            Gefundene Google-Ergebnisse ({results.length}):
                        </span>
                        <div class="grid grid-cols-1 gap-2">
                            {#each results as res, idx}
                                <button 
                                    type="button" 
                                    onclick={() => selectResult(idx)}
                                    class="w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 {selectedIndex === idx ? 'border-blue-500 bg-blue-50/50 shadow-xs ring-1 ring-blue-500/30' : 'border-neutral-200 hover:border-neutral-300 bg-white'}"
                                >
                                    <div class="space-y-1">
                                        <div class="flex items-center gap-2">
                                            <span class="font-bold text-sm text-neutral-900">
                                                {res.company_name || `${res.name_first || ''} ${res.name_last || ''}`.trim()}
                                            </span>
                                            {#if res.category}
                                                <span class="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-600 border border-neutral-200">
                                                    {res.category}
                                                </span>
                                            {/if}
                                        </div>
                                        {#if res.company_name && (res.name_first || res.name_last)}
                                            <p class="text-xs text-neutral-600 font-medium">
                                                Ansprechpartner / Arzt: {res.salutation !== 'Keine Angabe' ? `${res.salutation} ` : ''}{res.name_first} {res.name_last}
                                            </p>
                                        {/if}
                                        <p class="text-xs text-neutral-500 flex items-center gap-1">
                                            <span>📍</span>
                                            <span>{res.street} {res.housenr}, {res.zip} {res.city}</span>
                                        </p>
                                        <div class="flex flex-wrap items-center gap-3 text-xs text-neutral-600 pt-0.5">
                                            {#if res.phone}
                                                <span class="flex items-center gap-1 font-mono text-[11px]">📞 {res.phone}</span>
                                            {/if}
                                            {#if res.email}
                                                <span class="flex items-center gap-1 text-[11px] text-blue-600">✉️ {res.email}</span>
                                            {/if}
                                            {#if res.website}
                                                <a href={res.website} target="_blank" rel="noopener noreferrer" class="flex items-center gap-1 text-[11px] text-brand-600 hover:underline" onclick={(e) => e.stopPropagation()}>
                                                    🌐 Website
                                                </a>
                                            {/if}
                                        </div>
                                    </div>
                                    <div class="shrink-0">
                                        <span class="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold {selectedIndex === idx ? 'bg-blue-600 text-white' : 'border border-neutral-300 text-neutral-400'}">
                                            {selectedIndex === idx ? '✓' : ''}
                                        </span>
                                    </div>
                                </button>
                            {/each}
                        </div>
                    </div>
                {/if}

                <!-- Editierbares Kontaktformular zur Bestätigung -->
                <div class="mt-4 pt-4 border-t border-neutral-200">
                    <span class="text-[11px] font-extrabold uppercase tracking-wider text-neutral-500 block mb-3">
                        Kontaktdaten für die Übernahme prüfen & bearbeiten:
                    </span>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <!-- Praxis- / Einrichtungsname -->
                        <div class="sm:col-span-2">
                            <label for="company_name_input" class="block font-bold text-neutral-700 mb-1">Praxis- / Einrichtungs- / Firmenname</label>
                            <input 
                                id="company_name_input"
                                type="text" 
                                bind:value={formCompanyName} 
                                placeholder="z. B. Hausarztpraxis Dr. Wiermann"
                                class="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-hidden focus:border-blue-500 bg-white"
                            />
                        </div>

                        <!-- Anrede -->
                        <div>
                            <label for="salutation_select" class="block font-bold text-neutral-700 mb-1">Anrede</label>
                            <select 
                                id="salutation_select"
                                bind:value={formSalutation}
                                class="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-hidden focus:border-blue-500 bg-white"
                            >
                                <option value="Keine Angabe">Keine Angabe</option>
                                <option value="Herr">Herr</option>
                                <option value="Frau">Frau</option>
                                <option value="Divers">Divers</option>
                            </select>
                        </div>

                        <!-- Vorname -->
                        <div>
                            <label for="name_first_input" class="block font-bold text-neutral-700 mb-1">Vorname</label>
                            <input 
                                id="name_first_input"
                                type="text" 
                                bind:value={formNameFirst} 
                                placeholder="Vorname"
                                class="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-hidden focus:border-blue-500 bg-white"
                            />
                        </div>

                        <!-- Nachname -->
                        <div class="sm:col-span-2">
                            <label for="name_last_input" class="block font-bold text-neutral-700 mb-1">Nachname</label>
                            <input 
                                id="name_last_input"
                                type="text" 
                                bind:value={formNameLast} 
                                placeholder="Nachname"
                                class="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-hidden focus:border-blue-500 bg-white"
                            />
                        </div>

                        <!-- Straße -->
                        <div>
                            <label for="street_input" class="block font-bold text-neutral-700 mb-1">Straße</label>
                            <input 
                                id="street_input"
                                type="text" 
                                bind:value={formStreet} 
                                placeholder="Straße"
                                class="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-hidden focus:border-blue-500 bg-white"
                            />
                        </div>

                        <!-- Hausnummer -->
                        <div>
                            <label for="housenr_input" class="block font-bold text-neutral-700 mb-1">Hausnummer</label>
                            <input 
                                id="housenr_input"
                                type="text" 
                                bind:value={formHouseNr} 
                                placeholder="Hausnr."
                                class="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-hidden focus:border-blue-500 bg-white"
                            />
                        </div>

                        <!-- PLZ -->
                        <div>
                            <label for="zip_input" class="block font-bold text-neutral-700 mb-1">Postleitzahl</label>
                            <input 
                                id="zip_input"
                                type="text" 
                                bind:value={formZip} 
                                placeholder="PLZ"
                                class="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-hidden focus:border-blue-500 bg-white"
                            />
                        </div>

                        <!-- Stadt -->
                        <div>
                            <label for="city_input" class="block font-bold text-neutral-700 mb-1">Stadt / Ort</label>
                            <input 
                                id="city_input"
                                type="text" 
                                bind:value={formCity} 
                                placeholder="Stadt"
                                class="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-hidden focus:border-blue-500 bg-white"
                            />
                        </div>

                        <!-- Telefon -->
                        <div>
                            <label for="phone_input" class="block font-bold text-neutral-700 mb-1">Telefon</label>
                            <input 
                                id="phone_input"
                                type="text" 
                                bind:value={formPhone} 
                                placeholder="Telefonnummer"
                                class="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-hidden focus:border-blue-500 bg-white font-mono"
                            />
                        </div>

                        <!-- E-Mail -->
                        <div>
                            <label for="email_input" class="block font-bold text-neutral-700 mb-1">E-Mail</label>
                            <input 
                                id="email_input"
                                type="email" 
                                bind:value={formEmail} 
                                placeholder="praxis@beispiel.de"
                                class="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-hidden focus:border-blue-500 bg-white"
                            />
                        </div>

                        <!-- Notizen -->
                        <div class="sm:col-span-2">
                            <label for="notes_input" class="block font-bold text-neutral-700 mb-1">Notizen / Zusatzinfo</label>
                            <input 
                                id="notes_input"
                                type="text" 
                                bind:value={formNotes} 
                                placeholder="Zusatzangaben..."
                                class="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-hidden focus:border-blue-500 bg-white text-xs"
                            />
                        </div>
                    </div>
                </div>
            {/if}
        </div>

        <!-- Footer Actions -->
        <div class="p-4 bg-neutral-50 border-t border-neutral-200 flex flex-wrap items-center justify-between gap-2">
            <button 
                type="button" 
                onclick={() => close(null)}
                class="px-3 py-2 text-xs font-bold text-neutral-600 hover:text-neutral-800 hover:bg-neutral-200/60 rounded-xl transition-colors cursor-pointer"
            >
                Ohne Kontakt fortfahren
            </button>

            <div class="flex items-center gap-2">
                <button 
                    type="button" 
                    onclick={() => close(null)}
                    class="px-3 py-2 text-xs font-bold text-neutral-500 hover:text-neutral-700 rounded-xl transition-colors cursor-pointer"
                >
                    Abbrechen
                </button>
                <button 
                    type="button" 
                    onclick={handleSaveContact}
                    disabled={isSaving}
                    class="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1.5 active:scale-95"
                >
                    {#if isSaving}
                        <svg class="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg>
                        <span>Speichert...</span>
                    {:else}
                        <span>✓</span>
                        <span>Als Kontakt anlegen & verknüpfen</span>
                    {/if}
                </button>
            </div>
        </div>

    </div>
    {/if}
</dialog>
