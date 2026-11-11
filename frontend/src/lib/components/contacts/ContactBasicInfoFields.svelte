<script lang="ts">
    import type { ContactModalState } from "./contactModalState.svelte";
    import AddressInputGroup from "$lib/components/common/AddressInputGroup.svelte";

    interface Props {
        state: ContactModalState;
        onGoogleLookup?: (query: string) => void;
    }

    let { state, onGoogleLookup }: Props = $props();
</script>

<!-- Kontakttyp / Rolle (Pflichtfeld) mit OrgaFlow-Theming & Barrierefreiheit -->
<div class="space-y-2">
    <div class="flex items-center justify-between">
        <span class="block text-sm font-bold text-slate-800 dark:text-slate-200">
            Kategorie / Rolle <span class="text-rose-500">*</span>
        </span>
        {#if !state.contact_type}
            <span class="text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-800 animate-pulse">
                Bitte auswählen
            </span>
        {/if}
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 landscape:gap-2">
        <!-- Betreuer / Pflege -->
        <button
            type="button"
            onclick={() => state.contact_type = 'caregiver'}
            class="min-h-[56px] landscape:min-h-[48px] p-3 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-center justify-between gap-3 {state.contact_type === 'caregiver' ? 'border-violet-600 dark:border-violet-500 bg-violet-50/70 dark:bg-violet-950/40 text-violet-950 dark:text-violet-100 shadow-sm ring-2 ring-violet-500/20' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 hover:border-violet-300 dark:hover:border-violet-700 hover:bg-violet-50/30'}"
            disabled={state.isLoading}
        >
            <div class="flex items-center gap-2.5 min-w-0">
                <span class="text-2xl shrink-0">🩺</span>
                <div class="min-w-0">
                    <p class="text-xs sm:text-sm font-bold truncate">Betreuer / Pflege</p>
                    <p class="text-[10px] text-slate-500 dark:text-slate-400 truncate">Gesetzl. Betreuung & Pflege</p>
                </div>
            </div>
            <div class="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 {state.contact_type === 'caregiver' ? 'border-violet-600 bg-violet-600 text-white' : 'border-slate-300 dark:border-slate-600'}">
                {#if state.contact_type === 'caregiver'}
                    <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>
                {/if}
            </div>
        </button>

        <!-- Angehörige -->
        <button
            type="button"
            onclick={() => state.contact_type = 'relative'}
            class="min-h-[56px] landscape:min-h-[48px] p-3 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-center justify-between gap-3 {state.contact_type === 'relative' ? 'border-amber-500 dark:border-amber-400 bg-amber-50/70 dark:bg-amber-950/40 text-amber-950 dark:text-amber-100 shadow-sm ring-2 ring-amber-500/20' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 hover:border-amber-300 dark:hover:border-amber-700 hover:bg-amber-50/30'}"
            disabled={state.isLoading}
        >
            <div class="flex items-center gap-2.5 min-w-0">
                <span class="text-2xl shrink-0">👥</span>
                <div class="min-w-0">
                    <p class="text-xs sm:text-sm font-bold truncate">Angehörige</p>
                    <p class="text-[10px] text-slate-500 dark:text-slate-400 truncate">Partner, Kind, Familie</p>
                </div>
            </div>
            <div class="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 {state.contact_type === 'relative' ? 'border-amber-500 bg-amber-500 text-white' : 'border-slate-300 dark:border-slate-600'}">
                {#if state.contact_type === 'relative'}
                    <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>
                {/if}
            </div>
        </button>

        <!-- Sonstige -->
        <button
            type="button"
            onclick={() => state.contact_type = 'other'}
            class="min-h-[56px] landscape:min-h-[48px] p-3 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-center justify-between gap-3 {state.contact_type === 'other' ? 'border-cyan-500 dark:border-cyan-400 bg-cyan-50/70 dark:bg-cyan-950/40 text-cyan-950 dark:text-cyan-100 shadow-sm ring-2 ring-cyan-500/20' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 hover:border-cyan-300 dark:hover:border-cyan-700 hover:bg-cyan-50/30'}"
            disabled={state.isLoading}
        >
            <div class="flex items-center gap-2.5 min-w-0">
                <span class="text-2xl shrink-0">🏢</span>
                <div class="min-w-0">
                    <p class="text-xs sm:text-sm font-bold truncate">Sonstige</p>
                    <p class="text-[10px] text-slate-500 dark:text-slate-400 truncate">Arzt, Praxis, Behörde</p>
                </div>
            </div>
            <div class="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 {state.contact_type === 'other' ? 'border-cyan-500 bg-cyan-500 text-white' : 'border-slate-300 dark:border-slate-600'}">
                {#if state.contact_type === 'other'}
                    <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>
                {/if}
            </div>
        </button>
    </div>
</div>

<!-- Basisdaten: 2-Spalten-Raster responsiv & landscape-optimiert -->
<div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4 landscape:gap-2.5">
    <div>
        <label for="contact-salutation" class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Anrede</label>
        <select id="contact-salutation" bind:value={state.salutation} class="orga-input-clear min-h-[44px] landscape:min-h-[38px]" disabled={state.isLoading}>
            <option value="Keine Angabe">Keine Angabe</option>
            <option value="Herr">Herr</option>
            <option value="Frau">Frau</option>
            <option value="Divers">Divers</option>
        </select>
    </div>

    <div>
        <div class="flex items-center justify-between mb-1">
            <label for="contact-company" class="block text-sm font-semibold text-slate-700 dark:text-slate-300 truncate">
                Firma / Praxis (optional)
            </label>
            {#if onGoogleLookup}
                <button
                    type="button"
                    onclick={() => onGoogleLookup(state.company_name || `${state.name_first} ${state.name_last}`.trim())}
                    class="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 cursor-pointer bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 px-2 py-0.5 rounded-lg border border-blue-200 dark:border-blue-800 transition-colors shadow-2xs shrink-0"
                    title="Firma, Arzt oder Praxis auf Google suchen"
                    disabled={state.isLoading}
                >
                    <span>🔍</span> Schnellsuche
                </button>
            {/if}
        </div>
        <input 
            id="contact-company" 
            type="text" 
            bind:value={state.company_name} 
            placeholder="z. B. Hausarztpraxis Dr. med. Muster" 
            class="orga-input-clear min-h-[44px] landscape:min-h-[38px]" 
            disabled={state.isLoading} 
        />
    </div>

    <div>
        <label for="contact-first" class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Vorname</label>
        <input id="contact-first" type="text" bind:value={state.name_first} placeholder="Vorname" autocomplete="given-name" class="orga-input-clear min-h-[44px] landscape:min-h-[38px]" disabled={state.isLoading} />
    </div>

    <div>
        <label for="contact-last" class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Nachname</label>
        <input id="contact-last" type="text" bind:value={state.name_last} placeholder="Nachname" autocomplete="family-name" class="orga-input-clear min-h-[44px] landscape:min-h-[38px]" disabled={state.isLoading} />
    </div>

    <div>
        <label for="contact-birthdate" class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Geburtsdatum</label>
        <input id="contact-birthdate" type="date" bind:value={state.birthdate} class="orga-input-clear min-h-[44px] landscape:min-h-[38px]" disabled={state.isLoading} />
    </div>

    <div>
        <label for="contact-email" class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">E-Mail-Adresse</label>
        <input id="contact-email" type="email" bind:value={state.email} placeholder="name@beispiel.de" inputmode="email" autocomplete="email" class="orga-input-clear min-h-[44px] landscape:min-h-[38px]" disabled={state.isLoading} />
    </div>

    <div class="sm:col-span-2">
        <label for="contact-phone" class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Telefonnummer</label>
        <input id="contact-phone" type="tel" bind:value={state.phone} placeholder="z. B. 0170 1234567 oder 089 12345" inputmode="tel" autocomplete="tel" class="orga-input-clear min-h-[44px] landscape:min-h-[38px]" disabled={state.isLoading} />
    </div>
</div>

<!-- Anschrift: Flexibles 4-Spalten-Raster mit Validierung & GPS -->
<div class="pt-2 border-t border-slate-100 dark:border-slate-800">
    <AddressInputGroup
        bind:street={state.street}
        bind:housenr={state.housenr}
        bind:zip={state.zip}
        bind:city={state.city}
        idPrefix="contact"
        title="Anschrift"
        disabled={state.isLoading}
        searchQueryName={`${state.company_name ? state.company_name + ' ' : ''}${state.name_first || ''} ${state.name_last || ''}`.trim()}
    />
</div>
