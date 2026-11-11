<script lang="ts">
    import { autoGrow } from "$lib/actions/autoGrow";
    import AddressInputGroup from "$lib/components/common/AddressInputGroup.svelte";

    let { editState } = $props<{ editState: any }>();
</script>

<div class="space-y-6 animate-enter">
    <!-- Identität -->
    <div>
        <h3 class="text-xs font-bold text-neutral-400 dark:text-slate-400 uppercase tracking-wider mb-3">1. Persönliche Daten</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
                <label for="edit-salutation" class="block text-sm font-semibold text-neutral-700 dark:text-slate-300 mb-1.5">Anrede</label>
                <select id="edit-salutation" bind:value={editState.formData.salutation} class="orga-input-clear text-base min-h-[44px]" disabled={editState.isLoading}>
                    <option value="Keine Angabe">Keine Angabe</option>
                    <option value="Divers">Divers</option>
                    <option value="Frau">Frau</option>
                    <option value="Herr">Herr</option>
                </select>
            </div>
            <div>
                <label for="edit-firstname" class="block text-sm font-semibold text-neutral-700 dark:text-slate-300 mb-1.5">Vorname</label>
                <input id="edit-firstname" type="text" bind:value={editState.formData.name_first} class="orga-input-clear text-base min-h-[44px]" disabled={editState.isLoading} />
            </div>
            <div>
                <label for="edit-lastname" class="block text-sm font-semibold text-neutral-700 dark:text-slate-300 mb-1.5">Nachname</label>
                <input id="edit-lastname" type="text" bind:value={editState.formData.name_last} class="orga-input-clear text-base min-h-[44px]" disabled={editState.isLoading} />
            </div>
            <div>
                <div class="flex items-center justify-between mb-1.5">
                    <label for="edit-birthdate" class="block text-sm font-semibold text-neutral-700 dark:text-slate-300">Geburtsdatum</label>
                    {#if editState.age !== null && editState.age >= 0}
                        <span class="text-xs font-bold text-neutral-500 dark:text-slate-400 bg-neutral-100 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 px-2 py-0.5 rounded-md">{editState.age} Jahre</span>
                    {/if}
                </div>
                <input id="edit-birthdate" type="date" bind:value={editState.formData.birthdate} class="orga-input-clear text-base min-h-[44px]" disabled={editState.isLoading} />
            </div>
            <div>
                <label for="edit-nationality" class="block text-sm font-semibold text-neutral-700 dark:text-slate-300 mb-1.5">Staatsangehörigkeit</label>
                <input id="edit-nationality" type="text" bind:value={editState.formData.nationality} placeholder="Deutsch" class="orga-input-clear text-base min-h-[44px]" disabled={editState.isLoading} />
            </div>
            <div>
                <label for="edit-marital-status" class="block text-sm font-semibold text-neutral-700 dark:text-slate-300 mb-1.5">Familienstand</label>
                <select id="edit-marital-status" bind:value={editState.formData.marital_status} class="orga-input-clear text-base min-h-[44px]" disabled={editState.isLoading}>
                    <option value="Keine Angabe">Keine Angabe</option>
                    <option value="Geschieden">Geschieden</option>
                    <option value="Ledig">Ledig</option>
                    <option value="Verheiratet">Verheiratet</option>
                    <option value="Verwitwet">Verwitwet</option>
                </select>
            </div>
        </div>
    </div>

    <!-- Erreichbarkeit -->
    <div class="pt-5 border-t border-neutral-200 dark:border-slate-800">
        <h3 class="text-xs font-bold text-neutral-400 dark:text-slate-400 uppercase tracking-wider mb-3">2. Kontaktdaten & Status</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
                <label for="edit-phone" class="block text-sm font-semibold text-neutral-700 dark:text-slate-300 mb-1.5">Telefon (Festnetz)</label>
                <input id="edit-phone" type="tel" inputmode="tel" bind:value={editState.formData.phone} class="orga-input-clear text-base min-h-[44px]" disabled={editState.isLoading} />
            </div>
            <div>
                <label for="edit-handy" class="block text-sm font-semibold text-neutral-700 dark:text-slate-300 mb-1.5">Mobiltelefon / Handy</label>
                <input id="edit-handy" type="tel" inputmode="tel" bind:value={editState.formData.handy} class="orga-input-clear text-base min-h-[44px]" disabled={editState.isLoading} />
            </div>
            <div>
                <label for="edit-email" class="block text-sm font-semibold text-neutral-700 dark:text-slate-300 mb-1.5">E-Mail-Adresse</label>
                <input id="edit-email" type="email" inputmode="email" bind:value={editState.formData.email} class="orga-input-clear text-base min-h-[44px]" disabled={editState.isLoading} />
            </div>
            <div>
                <label for="edit-status" class="block text-sm font-semibold text-neutral-700 dark:text-slate-300 mb-1.5">Klienten-Status</label>
                <select id="edit-status" bind:value={editState.formData.status} class="orga-input-clear text-base font-bold min-h-[44px]" disabled={editState.isLoading}>
                    <option value="Aktiv">🟢 Aktiv</option>
                    <option value="Inaktiv">🟡 Inaktiv</option>
                    <option value="Verstorben">⚫ Verstorben</option>
                </select>
            </div>
        </div>
    </div>

    <!-- Wohnanschrift -->
    <div class="pt-5 border-t border-neutral-200 dark:border-slate-800">
        <AddressInputGroup
            bind:street={editState.formData.street}
            bind:housenr={editState.formData.housenr}
            bind:zip={editState.formData.zip}
            bind:city={editState.formData.city}
            idPrefix="edit"
            title="3. Wohnanschrift"
            disabled={editState.isLoading}
            searchQueryName={`${editState.formData.name_first || ''} ${editState.formData.name_last || ''}`.trim()}
        />
    </div>

    <!-- Interne Notizen -->
    <div class="pt-5 border-t border-neutral-200 dark:border-slate-800">
        <h3 class="text-xs font-bold text-neutral-400 dark:text-slate-400 uppercase tracking-wider mb-2">4. Interne Betreuungsnotizen</h3>
        <textarea use:autoGrow id="edit-notes" bind:value={editState.formData.notes} placeholder="Schlüsselhinterlegung, Besonderheiten, Verhaltenshinweise..." class="auto-grow orga-input-clear text-base resize-none overflow-hidden min-h-[96px]" disabled={editState.isLoading}></textarea>
    </div>
</div>
