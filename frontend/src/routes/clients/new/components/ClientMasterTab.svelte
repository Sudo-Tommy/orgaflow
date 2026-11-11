<script lang="ts">
    import type { ClientFormData } from "../types";
    import { User, Phone } from "lucide-svelte";
    import AddressInputGroup from "$lib/components/common/AddressInputGroup.svelte";

    interface Props {
        formData: ClientFormData;
        isLoading: boolean;
    }

    let { formData = $bindable(), isLoading }: Props = $props();
</script>

<div class="space-y-6 animate-enter">
    <!-- PERSÖNLICHE DATEN -->
    <div>
        <h3 class="text-xs font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <User class="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Persönliche Angaben</span>
        </h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
                <label for="new-salutation" class="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">Anrede</label>
                <select id="new-salutation" bind:value={formData.salutation} class="orga-input-clear min-h-[44px] py-2 text-sm" disabled={isLoading}>
                    <option value="Divers">Divers</option>
                    <option value="Frau">Frau</option>
                    <option value="Herr">Herr</option>
                    <option value="Keine Angabe">Keine Angabe</option>
                </select>
            </div>
            <div>
                <label for="new-firstname" class="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                    Vorname <span class="text-indigo-600 dark:text-indigo-400 font-normal text-[11px]">(empfohlen)</span>
                </label>
                <input id="new-firstname" type="text" bind:value={formData.name_first} placeholder="z. B. Marianne" class="orga-input-clear min-h-[44px] py-2 text-sm" disabled={isLoading} />
            </div>
            <div class="sm:col-span-2">
                <label for="new-lastname" class="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                    Nachname <span class="text-indigo-600 dark:text-indigo-400 font-normal text-[11px]">(empfohlen)</span>
                </label>
                <input id="new-lastname" type="text" bind:value={formData.name_last} placeholder="z. B. Schmidt" class="orga-input-clear min-h-[44px] py-2 text-sm" disabled={isLoading} />
            </div>

            <div class="sm:col-span-2">
                <label for="new-birthdate" class="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">Geburtsdatum</label>
                <input id="new-birthdate" type="date" bind:value={formData.birthdate} class="orga-input-clear min-h-[44px] py-2 text-sm" disabled={isLoading} />
            </div>
            <div>
                <label for="new-marital-status" class="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">Familienstand</label>
                <select id="new-marital-status" bind:value={formData.marital_status} class="orga-input-clear min-h-[44px] py-2 text-sm" disabled={isLoading}>
                    <option value="Geschieden">Geschieden</option>
                    <option value="Keine Angabe">Keine Angabe</option>
                    <option value="Ledig">Ledig</option>
                    <option value="Verheiratet">Verheiratet</option>
                    <option value="Verwitwet">Verwitwet</option>
                </select>
            </div>
            <div>
                <label for="new-nationality" class="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">Nationalität</label>
                <input id="new-nationality" type="text" bind:value={formData.nationality} placeholder="Deutsch" class="orga-input-clear min-h-[44px] py-2 text-sm" disabled={isLoading} />
            </div>
        </div>
    </div>

    <!-- KONTAKTDATEN -->
    <div class="pt-5 border-t border-slate-100 dark:border-slate-800">
        <h3 class="text-xs font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Phone class="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Erreichbarkeit</span>
        </h3>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
                <label for="new-phone" class="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">Festnetz</label>
                <input id="new-phone" type="tel" bind:value={formData.phone} placeholder="0351 123456" class="orga-input-clear min-h-[44px] py-2 text-sm" disabled={isLoading} />
            </div>
            <div>
                <label for="new-handy" class="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">Mobiltelefon</label>
                <input id="new-handy" type="tel" bind:value={formData.handy} placeholder="0172 1234567" class="orga-input-clear min-h-[44px] py-2 text-sm" disabled={isLoading} />
            </div>
            <div>
                <label for="new-email" class="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">E-Mail-Adresse</label>
                <input id="new-email" type="email" bind:value={formData.email} placeholder="klient@beispiel.de" class="orga-input-clear min-h-[44px] py-2 text-sm" disabled={isLoading} />
            </div>
        </div>
    </div>

    <!-- WOHNANSCHRIFT -->
    <div class="pt-5 border-t border-slate-100 dark:border-slate-800">
        <AddressInputGroup
            bind:street={formData.street}
            bind:housenr={formData.housenr}
            bind:zip={formData.zip}
            bind:city={formData.city}
            idPrefix="new"
            title="Wohnanschrift"
            disabled={isLoading}
            searchQueryName={`${formData.name_first || ''} ${formData.name_last || ''}`.trim()}
        />
    </div>
</div>
