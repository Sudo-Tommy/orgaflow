<script lang="ts">
    interface Props {
        formData: any;
        isLoading: boolean;
        companies: any[];
    }

    let { formData = $bindable(), isLoading, companies }: Props = $props();
</script>

<div class="p-4 bg-brand-50/70 dark:bg-brand-950/40 border border-brand-100 dark:border-brand-900/50 rounded-xl mb-6">
    <label for="nc-company" class="block text-sm font-semibold text-brand-900 dark:text-brand-300 mb-1.5">
        Zuständiger Standort / Firma *
    </label>
    <select
        id="nc-company"
        bind:value={formData.company}
        class="orga-input-clear bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 border-brand-200 cursor-pointer"
        required
        disabled={isLoading}
    >
        <option value="">Bitte Standort wählen...</option>
        {#each companies as comp}
            <option value={comp.id}>{comp.city} {comp.name ? `(${comp.name})` : ""}</option>
        {/each}
    </select>
</div>

<h3 class="text-xs font-bold text-neutral-400 dark:text-slate-400 uppercase tracking-wider mb-3">
    Persönliche Daten des Klienten
</h3>
<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
    <div>
        <label for="nc-salutation" class="block text-sm font-semibold text-neutral-700 dark:text-slate-300 mb-1.5">Anrede</label>
        <select id="nc-salutation" bind:value={formData.salutation} class="orga-input-clear dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 cursor-pointer" disabled={isLoading}>
            <option value="Divers">Divers</option>
            <option value="Frau">Frau</option>
            <option value="Herr">Herr</option>
            <option value="Keine Angabe">Keine Angabe</option>
        </select>
    </div>
    <div>
        <label for="nc-first" class="block text-sm font-semibold text-neutral-700 dark:text-slate-300 mb-1.5">Vorname *</label>
        <input id="nc-first" type="text" bind:value={formData.name_first} class="orga-input-clear py-2.5 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100" disabled={isLoading} required />
    </div>
    <div>
        <label for="nc-last" class="block text-sm font-semibold text-neutral-700 dark:text-slate-300 mb-1.5">Nachname *</label>
        <input id="nc-last" type="text" bind:value={formData.name_last} class="orga-input-clear py-2.5 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100" disabled={isLoading} required />
    </div>
    <div>
        <label for="nc-birthdate" class="block text-sm font-semibold text-neutral-700 dark:text-slate-300 mb-1.5">Geburtsdatum</label>
        <input id="nc-birthdate" type="date" bind:value={formData.birthdate} class="orga-input-clear py-2.5 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100" disabled={isLoading} />
    </div>
    <div>
        <label for="nc-marital" class="block text-sm font-semibold text-neutral-700 dark:text-slate-300 mb-1.5">Familienstand</label>
        <select id="nc-marital" bind:value={formData.marital_status} class="orga-input-clear dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 cursor-pointer" disabled={isLoading}>
            <option value="">Keine Angabe</option>
            <option value="Geschieden">Geschieden</option>
            <option value="Ledig">Ledig</option>
            <option value="Verheiratet">Verheiratet</option>
            <option value="Verwitwet">Verwitwet</option>
        </select>
    </div>
    <div>
        <label for="nc-nationality" class="block text-sm font-semibold text-neutral-700 dark:text-slate-300 mb-1.5">Nationalität</label>
        <input id="nc-nationality" type="text" bind:value={formData.nationality} class="orga-input-clear py-2.5 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100" disabled={isLoading} />
    </div>
</div>

<h3 class="text-xs font-bold text-neutral-400 dark:text-slate-400 uppercase tracking-wider mb-3 pt-4 border-t border-neutral-100 dark:border-slate-800 mt-2">
    Kontaktdaten & Adresse
</h3>
<div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
    <div>
        <label for="nc-email" class="block text-sm font-semibold text-neutral-700 dark:text-slate-300 mb-1.5">E-Mail</label>
        <input id="nc-email" type="email" bind:value={formData.email} class="orga-input-clear py-2.5 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100" disabled={isLoading} />
    </div>
    <div>
        <label for="nc-phone" class="block text-sm font-semibold text-neutral-700 dark:text-slate-300 mb-1.5">Festnetz</label>
        <input id="nc-phone" type="text" bind:value={formData.phone} class="orga-input-clear py-2.5 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100" disabled={isLoading} />
    </div>
    <div>
        <label for="nc-handy" class="block text-sm font-semibold text-neutral-700 dark:text-slate-300 mb-1.5">Mobil (Handy)</label>
        <input id="nc-handy" type="text" bind:value={formData.handy} class="orga-input-clear py-2.5 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100" disabled={isLoading} />
    </div>
</div>
<div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
    <div class="sm:col-span-3">
        <label for="nc-street" class="block text-sm font-semibold text-neutral-700 dark:text-slate-300 mb-1.5">Straße</label>
        <input id="nc-street" type="text" bind:value={formData.street} class="orga-input-clear py-2.5 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100" disabled={isLoading} />
    </div>
    <div>
        <label for="nc-housenr" class="block text-sm font-semibold text-neutral-700 dark:text-slate-300 mb-1.5">Hausnr.</label>
        <input id="nc-housenr" type="text" bind:value={formData.housenr} class="orga-input-clear py-2.5 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100" disabled={isLoading} />
    </div>
    <div>
        <label for="nc-zip" class="block text-sm font-semibold text-neutral-700 dark:text-slate-300 mb-1.5">PLZ</label>
        <input id="nc-zip" type="text" bind:value={formData.zip} class="orga-input-clear py-2.5 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100" disabled={isLoading} />
    </div>
    <div class="sm:col-span-3">
        <label for="nc-city" class="block text-sm font-semibold text-neutral-700 dark:text-slate-300 mb-1.5">Stadt</label>
        <input id="nc-city" type="text" bind:value={formData.city} class="orga-input-clear py-2.5 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100" disabled={isLoading} />
    </div>
</div>
