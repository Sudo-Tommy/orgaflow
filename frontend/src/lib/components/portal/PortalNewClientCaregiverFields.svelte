<script lang="ts">
    import { Users, Calendar, ShieldCheck, Copy } from "lucide-svelte";
    import { hapticFeedback } from "$lib/services/hapticFeedback";

    interface Props {
        formData: any;
        isLoading: boolean;
        onCopyClientAddress: () => void;
    }

    let { formData = $bindable(), isLoading, onCopyClientAddress }: Props = $props();
</script>

<!-- 1. GESETZLICHER BETREUER / BEVOLLMÄCHTIGTE PERSON -->
<div class="pt-4 border-t border-neutral-100 dark:border-slate-800 mt-2 space-y-4">
    <div class="flex items-center justify-between">
        <label for="nc-has-caregiver" class="flex items-center gap-2 cursor-pointer select-none">
            <input 
                id="nc-has-caregiver"
                type="checkbox" 
                bind:checked={formData.has_caregiver}
                class="w-4 h-4 rounded-md text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-600 dark:bg-slate-800"
                disabled={isLoading}
            />
            <span class="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Users class="w-4 h-4 text-indigo-500" />
                Gesetzlicher Betreuer / Bevollmächtigte Person angeben
            </span>
        </label>
    </div>

    {#if formData.has_caregiver}
        <div class="bg-indigo-50/50 dark:bg-indigo-950/20 p-4 sm:p-5 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 space-y-4 animate-enter">
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                    <label for="cg-relation" class="block text-xs font-bold text-neutral-700 dark:text-slate-300 mb-1">Rolle / Verhältnis *</label>
                    <select id="cg-relation" bind:value={formData.caregiver_relation} class="orga-input-clear text-xs py-2 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 cursor-pointer" disabled={isLoading}>
                        <option value="Angehörige(r) / Kind">Angehörige(r) / Kind</option>
                        <option value="Ehepartner / Lebenspartner">Ehepartner / Lebenspartner</option>
                        <option value="Gesetzlicher Betreuer">Gesetzlicher Betreuer</option>
                        <option value="Sonstige(r)">Sonstige(r)</option>
                        <option value="Vorsorgebevollmächtigte(r)">Vorsorgebevollmächtigte(r)</option>
                    </select>
                </div>
                <div>
                    <label for="cg-salutation" class="block text-xs font-bold text-neutral-700 dark:text-slate-300 mb-1">Anrede</label>
                    <select id="cg-salutation" bind:value={formData.caregiver_salutation} class="orga-input-clear text-xs py-2 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 cursor-pointer" disabled={isLoading}>
                        <option value="Frau">Frau</option>
                        <option value="Herr">Herr</option>
                        <option value="Keine Angabe">Keine Angabe</option>
                    </select>
                </div>
                <div>
                    <label for="cg-company" class="block text-xs font-bold text-neutral-700 dark:text-slate-300 mb-1">Büro / Organisation (optional)</label>
                    <input id="cg-company" type="text" bind:value={formData.caregiver_company} placeholder="z. B. Betreuungsbüro..." class="orga-input-clear text-xs py-2 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100" disabled={isLoading} />
                </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                    <label for="cg-first" class="block text-xs font-bold text-neutral-700 dark:text-slate-300 mb-1">Vorname Betreuer *</label>
                    <input id="cg-first" type="text" bind:value={formData.caregiver_name_first} class="orga-input-clear text-xs py-2 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100" disabled={isLoading} required={formData.has_caregiver} />
                </div>
                <div>
                    <label for="cg-last" class="block text-xs font-bold text-neutral-700 dark:text-slate-300 mb-1">Nachname Betreuer *</label>
                    <input id="cg-last" type="text" bind:value={formData.caregiver_name_last} class="orga-input-clear text-xs py-2 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100" disabled={isLoading} required={formData.has_caregiver} />
                </div>
                <div>
                    <label for="cg-phone" class="block text-xs font-bold text-neutral-700 dark:text-slate-300 mb-1">Telefon / Mobil *</label>
                    <input id="cg-phone" type="text" bind:value={formData.caregiver_phone} class="orga-input-clear text-xs py-2 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100" disabled={isLoading} required={formData.has_caregiver} />
                </div>
                <div>
                    <label for="cg-email" class="block text-xs font-bold text-neutral-700 dark:text-slate-300 mb-1">E-Mail</label>
                    <input id="cg-email" type="email" bind:value={formData.caregiver_email} class="orga-input-clear text-xs py-2 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100" disabled={isLoading} />
                </div>
            </div>

            <div class="flex items-center justify-between pt-1">
                <span class="text-xs font-semibold text-slate-600 dark:text-slate-400">Anschrift des Betreuers</span>
                <button type="button" onclick={() => { hapticFeedback.tap(); onCopyClientAddress(); }} class="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer">
                    <Copy class="w-3 h-3" /> Adresse vom Klienten kopieren
                </button>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div class="sm:col-span-3">
                    <input type="text" bind:value={formData.caregiver_street} placeholder="Straße" class="orga-input-clear text-xs py-2 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100" disabled={isLoading} />
                </div>
                <div>
                    <input type="text" bind:value={formData.caregiver_housenr} placeholder="Nr." class="orga-input-clear text-xs py-2 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100" disabled={isLoading} />
                </div>
                <div>
                    <input type="text" bind:value={formData.caregiver_zip} placeholder="PLZ" class="orga-input-clear text-xs py-2 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100" disabled={isLoading} />
                </div>
                <div class="sm:col-span-3">
                    <input type="text" bind:value={formData.caregiver_city} placeholder="Stadt" class="orga-input-clear text-xs py-2 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100" disabled={isLoading} />
                </div>
            </div>

            <div class="pt-2">
                <label for="cg-poa" class="flex items-center gap-2 cursor-pointer select-none">
                    <input id="cg-poa" type="checkbox" bind:checked={formData.caregiver_has_power_of_attorney} class="w-4 h-4 rounded text-indigo-600" disabled={isLoading} />
                    <span class="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                        <ShieldCheck class="w-3.5 h-3.5 text-emerald-500" />
                        Betreuerausweis / Vollmacht liegt vor
                    </span>
                </label>
            </div>
        </div>
    {/if}
</div>

<!-- 2. DIREKTER TERMINWUNSCH / ERSTGESPRÄCH -->
<div class="pt-4 border-t border-neutral-100 dark:border-slate-800 mt-2 space-y-4">
    <label for="nc-request-app" class="flex items-center gap-2 cursor-pointer select-none">
        <input 
            id="nc-request-app"
            type="checkbox" 
            bind:checked={formData.request_appointment} 
            class="w-4 h-4 rounded-md text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-600 dark:bg-slate-800"
            disabled={isLoading}
        />
        <span class="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <Calendar class="w-4 h-4 text-emerald-500" />
            Direkt Termin anfragen (z. B. Kennenlerngespräch / Ersttermin)
        </span>
    </label>

    {#if formData.request_appointment}
        <div class="bg-emerald-50/50 dark:bg-emerald-950/20 p-4 sm:p-5 rounded-2xl border border-emerald-200 dark:border-emerald-900/40 space-y-3 animate-enter">
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                    <label for="ap-service" class="block text-xs font-bold text-neutral-700 dark:text-slate-300 mb-1">Gewünschte Leistung</label>
                    <select id="ap-service" bind:value={formData.appointment_service} class="orga-input-clear text-xs py-2 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 cursor-pointer" disabled={isLoading}>
                        <option value="Alltagsbegleitung">Alltagsbegleitung</option>
                        <option value="Arztbegleitung">Arztbegleitung</option>
                        <option value="Behördengang">Behördengang</option>
                        <option value="Entlastung im Haushalt">Entlastung im Haushalt</option>
                        <option value="Kennenlerngespräch / Erstberatung">Kennenlerngespräch / Erstberatung</option>
                    </select>
                </div>
                <div>
                    <label for="ap-date" class="block text-xs font-bold text-neutral-700 dark:text-slate-300 mb-1">Wunschdatum</label>
                    <input id="ap-date" type="date" bind:value={formData.appointment_date} class="orga-input-clear text-xs py-2 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100" disabled={isLoading} />
                </div>
                <div>
                    <label for="ap-time" class="block text-xs font-bold text-neutral-700 dark:text-slate-300 mb-1">Wunschzeit</label>
                    <input id="ap-time" type="time" bind:value={formData.appointment_time} class="orga-input-clear text-xs py-2 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100" disabled={isLoading} />
                </div>
            </div>
            <div>
                <label for="ap-notes" class="block text-xs font-bold text-neutral-700 dark:text-slate-300 mb-1">Anmerkung zum Termin (optional)</label>
                <input id="ap-notes" type="text" bind:value={formData.appointment_notes} placeholder="Besonderheiten, Abholort oder Wünsche..." class="orga-input-clear text-xs py-2 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100" disabled={isLoading} />
            </div>
        </div>
    {/if}
</div>
