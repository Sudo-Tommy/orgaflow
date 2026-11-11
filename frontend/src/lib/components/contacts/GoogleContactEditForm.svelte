<script lang="ts">
    import type { GoogleContactFormData } from './useGoogleContactSelection.svelte';

    let { form = $bindable() }: { form: GoogleContactFormData } = $props();
</script>

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
                bind:value={form.companyName} 
                placeholder="z. B. Hausarztpraxis Dr. Wiermann"
                class="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-hidden focus:border-blue-500 bg-white"
            />
        </div>

        <!-- Anrede -->
        <div>
            <label for="salutation_select" class="block font-bold text-neutral-700 mb-1">Anrede</label>
            <select 
                id="salutation_select"
                bind:value={form.salutation}
                class="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-hidden focus:border-blue-500 bg-white"
            >
                <option value="Keine Angabe">Keine Angabe</option>
                <option value="Herr">Herr</option>
                <option value="Frau">Frau</option>
            </select>
        </div>

        <!-- Vorname -->
        <div>
            <label for="name_first_input" class="block font-bold text-neutral-700 mb-1">Vorname</label>
            <input 
                id="name_first_input"
                type="text" 
                bind:value={form.nameFirst} 
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
                bind:value={form.nameLast} 
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
                bind:value={form.street} 
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
                bind:value={form.houseNr} 
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
                bind:value={form.zip} 
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
                bind:value={form.city} 
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
                bind:value={form.phone} 
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
                bind:value={form.email} 
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
                bind:value={form.notes} 
                placeholder="Zusatzangaben..."
                class="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-hidden focus:border-blue-500 bg-white text-xs"
            />
        </div>
    </div>
</div>
