<script lang="ts">
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import { sortAlphabetical } from "$lib/utils/sortHelper";
    import { autoGrow } from "$lib/actions/autoGrow";
    import InlineSignaturePicker from "$lib/components/clients/InlineSignaturePicker.svelte";

    let { editState } = $props<{ editState: any }>();

    let sortedContacts = $derived.by(() => {
        return sortAlphabetical(orgaStore.contacts?.data || [], (c: any) => {
            return c.company_name ? `${c.company_name} - ${c.name_last || ''}` : `${c.name_last || ''} ${c.name_first || ''}`;
        });
    });
</script>

<div class="space-y-6 animate-enter">
    <!-- Erben-Zuordnung -->
    <div class="bg-teal-50/50 dark:bg-teal-950/20 p-5 rounded-2xl border border-teal-200/80 dark:border-teal-900/60">
        <div class="flex items-center justify-between mb-4">
            <div>
                <h3 class="text-sm font-bold text-teal-950 dark:text-teal-200 flex items-center gap-2">
                    <span>⚖️</span> Gesetzlicher Erbe / Bevollmächtigter
                </h3>
                <p class="text-xs text-teal-700 dark:text-teal-400 mt-0.5">Zuständige Person für Nachlass, rechtliche Vertretung und Postempfang</p>
            </div>
            <div class="flex bg-white/80 dark:bg-slate-800/80 p-1 rounded-xl border border-teal-200 dark:border-teal-900/60">
                <button
                    type="button"
                    onclick={() => editState.inheritorMode = 'direct'}
                    class="px-3 py-1 text-xs font-bold rounded-lg transition-colors min-h-[36px] cursor-pointer {editState.inheritorMode === 'direct' ? 'bg-teal-600 text-white shadow-xs' : 'text-neutral-600 dark:text-slate-300'}"
                >
                    Direkteingabe
                </button>
                <button
                    type="button"
                    onclick={() => editState.inheritorMode = 'contact'}
                    class="px-3 py-1 text-xs font-bold rounded-lg transition-colors min-h-[36px] cursor-pointer {editState.inheritorMode === 'contact' ? 'bg-teal-600 text-white shadow-xs' : 'text-neutral-600 dark:text-slate-300'}"
                >
                    Aus Kontakten
                </button>
            </div>
        </div>

        {#if editState.inheritorMode === 'contact'}
            <div class="mb-4">
                <label for="inheritor-contact" class="block text-sm font-semibold text-neutral-800 dark:text-slate-200 mb-1.5">Kontakt aus Adressbuch wählen</label>
                <select
                    id="inheritor-contact"
                    value={editState.formData.inheritor}
                    onchange={(e) => editState.handleContactSelected((e.target as HTMLSelectElement).value)}
                    class="orga-input-clear text-base bg-white dark:bg-slate-900 dark:text-white dark:border-slate-700 min-h-[44px]"
                    disabled={editState.isLoading}
                >
                    <option value="">Keinen Kontakt verknüpfen</option>
                    {#each sortedContacts as c (c.id)}
                        <option value={c.id}>{c.name_first} {c.name_last} {c.company_name ? `(${c.company_name})` : ''}</option>
                    {/each}
                </select>
            </div>
        {/if}

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
                <label for="inh-name" class="block text-sm font-semibold text-neutral-800 dark:text-slate-200 mb-1.5">Name des Erben / Bevollmächtigten *</label>
                <input id="inh-name" type="text" bind:value={editState.formData.inheritor_name} placeholder="z. B. Sandra Meier" class="orga-input-clear text-base bg-white dark:bg-slate-900 dark:text-white dark:border-slate-700 min-h-[44px]" disabled={editState.isLoading} />
            </div>
            <div>
                <label for="inh-relation" class="block text-sm font-semibold text-neutral-800 dark:text-slate-200 mb-1.5">Verwandtschaftsverhältnis</label>
                <select id="inh-relation" bind:value={editState.formData.inheritor_relation} class="orga-input-clear text-base bg-white dark:bg-slate-900 dark:text-white dark:border-slate-700 min-h-[44px]" disabled={editState.isLoading}>
                    <option value="Ehepartner/in">Ehepartner/in</option>
                    <option value="Enkel/in">Enkel/in</option>
                    <option value="Gesetzl. Betreuer/in">Gesetzl. Betreuer/in</option>
                    <option value="Rechtsanwalt / Nachlasspfleger">Rechtsanwalt / Nachlasspfleger</option>
                    <option value="Sohn">Sohn</option>
                    <option value="Sonstige/r">Sonstige/r</option>
                    <option value="Tochter">Tochter</option>
                </select>
            </div>
            <div>
                <label for="inh-phone" class="block text-sm font-semibold text-neutral-800 dark:text-slate-200 mb-1.5">Telefonnummer</label>
                <input id="inh-phone" type="tel" inputmode="tel" bind:value={editState.formData.inheritor_phone} placeholder="0171..." class="orga-input-clear text-base bg-white dark:bg-slate-900 dark:text-white dark:border-slate-700 min-h-[44px]" disabled={editState.isLoading} />
            </div>
            <div>
                <label for="inh-email" class="block text-sm font-semibold text-neutral-800 dark:text-slate-200 mb-1.5">E-Mail-Adresse</label>
                <input id="inh-email" type="email" inputmode="email" bind:value={editState.formData.inheritor_email} placeholder="erbe@beispiel.de" class="orga-input-clear text-base bg-white dark:bg-slate-900 dark:text-white dark:border-slate-700 min-h-[44px]" disabled={editState.isLoading} />
            </div>
        </div>

        <div class="mt-4 pt-3 border-t border-teal-200/60 dark:border-teal-900/60">
            <label class="flex items-center gap-3 cursor-pointer select-none min-h-[44px]">
                <input type="checkbox" bind:checked={editState.formData.inheritor_has_power_of_attorney} class="w-5 h-5 rounded-md text-teal-600 focus:ring-teal-500 border-neutral-300 dark:border-slate-700 dark:bg-slate-900" />
                <span class="text-sm font-bold text-neutral-900 dark:text-slate-200">Vorsorgevollmacht / Erbschein liegt schriftlich vor</span>
            </label>
        </div>

        <div class="mt-3">
            <label for="inh-notes" class="block text-xs font-semibold text-neutral-700 dark:text-slate-300 mb-1">Hinweise zum Erben / zur Vollmacht</label>
            <textarea use:autoGrow id="inh-notes" bind:value={editState.formData.inheritor_notes} placeholder="z. B. Aktenzeichen Nachlassgericht, Urkundennummer..." class="auto-grow orga-input-clear text-sm bg-white dark:bg-slate-900 dark:text-white dark:border-slate-700 resize-none overflow-hidden min-h-[64px]" disabled={editState.isLoading}></textarea>
        </div>

        <div class="mt-4">
            <InlineSignaturePicker
                bind:value={editState.formData.inheritor_signature}
                label="Unterschrift d. Vertretung / Bevollmächtigten"
                helperText="Wird für Vollmachten und Schreiben aus den Vorlagen verwendet"
                disabled={editState.isLoading}
            />
        </div>
    </div>

    <!-- Angaben für Verhinderungspflege (§ 39 SGB XI) -->
    <div class="bg-neutral-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-neutral-200 dark:border-slate-700">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div>
                <h3 class="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                    <span>🤝</span> Private Pflegeperson für Verhinderungspflege (§ 39 SGB XI)
                </h3>
                <p class="text-xs text-neutral-500 dark:text-slate-400">Für Kostenerstattungsanträge bei der Pflegekasse</p>
            </div>
            <button
                type="button"
                onclick={() => editState.copyClientAddressToCareperson()}
                class="text-xs font-bold text-indigo-700 dark:text-indigo-300 hover:text-indigo-900 dark:hover:text-indigo-200 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 px-3 py-1.5 rounded-lg transition-colors border border-indigo-200 dark:border-indigo-800 shrink-0 self-start sm:self-auto cursor-pointer min-h-[36px]"
            >
                Wohnanschrift d. Klienten übernehmen
            </button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div class="md:col-span-2">
                <label for="cp-name" class="block text-sm font-semibold text-neutral-700 dark:text-slate-300 mb-1.5">Name d. Pflegeperson</label>
                <input id="cp-name" type="text" bind:value={editState.formData.careperson_name} placeholder={editState.formData.inheritor_name || "Name der Pflegeperson"} class="orga-input-clear text-base bg-white dark:bg-slate-900 dark:text-white dark:border-slate-700 min-h-[44px]" disabled={editState.isLoading} />
            </div>
            <div>
                <label for="cp-rel" class="block text-sm font-semibold text-neutral-700 dark:text-slate-300 mb-1.5">Verhältnis</label>
                <input id="cp-rel" type="text" bind:value={editState.formData.careperson_relation} class="orga-input-clear text-base bg-white dark:bg-slate-900 dark:text-white dark:border-slate-700 min-h-[44px]" disabled={editState.isLoading} />
            </div>
            <div>
                <label for="cp-birth" class="block text-sm font-semibold text-neutral-700 dark:text-slate-300 mb-1.5">Geburtsdatum</label>
                <input id="cp-birth" type="date" bind:value={editState.formData.careperson_birthdate} class="orga-input-clear text-base bg-white dark:bg-slate-900 dark:text-white dark:border-slate-700 min-h-[44px]" disabled={editState.isLoading} />
            </div>
            <div class="md:col-span-3">
                <label for="cp-street" class="block text-sm font-semibold text-neutral-700 dark:text-slate-300 mb-1.5">Straße</label>
                <input id="cp-street" type="text" bind:value={editState.formData.careperson_street} class="orga-input-clear text-base bg-white dark:bg-slate-900 dark:text-white dark:border-slate-700 min-h-[44px]" disabled={editState.isLoading} />
            </div>
            <div>
                <label for="cp-housenr" class="block text-sm font-semibold text-neutral-700 dark:text-slate-300 mb-1.5">Hausnr.</label>
                <input id="cp-housenr" type="text" bind:value={editState.formData.careperson_housenr} class="orga-input-clear text-base bg-white dark:bg-slate-900 dark:text-white dark:border-slate-700 min-h-[44px]" disabled={editState.isLoading} />
            </div>
            <div>
                <label for="cp-zip" class="block text-sm font-semibold text-neutral-700 dark:text-slate-300 mb-1.5">PLZ</label>
                <input id="cp-zip" type="text" inputmode="numeric" bind:value={editState.formData.careperson_zip} class="orga-input-clear text-base bg-white dark:bg-slate-900 dark:text-white dark:border-slate-700 min-h-[44px]" disabled={editState.isLoading} />
            </div>
            <div class="md:col-span-3">
                <label for="cp-city" class="block text-sm font-semibold text-neutral-700 dark:text-slate-300 mb-1.5">Ort</label>
                <input id="cp-city" type="text" bind:value={editState.formData.careperson_city} class="orga-input-clear text-base bg-white dark:bg-slate-900 dark:text-white dark:border-slate-700 min-h-[44px]" disabled={editState.isLoading} />
            </div>
        </div>

        <div class="mt-4">
            <InlineSignaturePicker
                bind:value={editState.formData.careperson_signature}
                label="Unterschrift der Pflegeperson"
                helperText="Wird für Anträge (z. B. Verhinderungspflege § 39) in den Vorlagen verwendet"
                disabled={editState.isLoading}
            />
        </div>
    </div>
</div>
