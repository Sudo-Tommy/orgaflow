<script lang="ts">
    import { Building, Phone, Mail, MapPin } from "lucide-svelte";
    import { autoGrow } from "$lib/actions/autoGrow";

    interface Props {
        formData: any;
        isLoading: boolean;
        relationshipOptions: string[];
    }

    let { formData = $bindable(), isLoading, relationshipOptions }: Props = $props();
</script>

<!-- Beziehung / Rolle -->
<div>
    <label for="pcf-role" class="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
        Beziehung / Funktion *
    </label>
    <select
        id="pcf-role"
        bind:value={formData.relationship}
        class="orga-input-clear py-2.5 text-sm"
        disabled={isLoading}
    >
        {#each relationshipOptions as opt}
            <option value={opt}>{opt}</option>
        {/each}
    </select>
</div>

<!-- Name / Firma -->
<div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
    <div>
        <label for="pcf-first" class="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
            Vorname
        </label>
        <input
            id="pcf-first"
            type="text"
            bind:value={formData.name_first}
            placeholder="z. B. Sabine"
            class="orga-input-clear py-2.5 text-sm"
            disabled={isLoading}
        />
    </div>
    <div>
        <label for="pcf-last" class="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
            Nachname
        </label>
        <input
            id="pcf-last"
            type="text"
            bind:value={formData.name_last}
            placeholder="z. B. Müller"
            class="orga-input-clear py-2.5 text-sm"
            disabled={isLoading}
        />
    </div>
</div>

<div>
    <label for="pcf-company" class="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
        <Building class="w-3.5 h-3.5 text-slate-400" />
        Firma / Praxis / Institution (optional)
    </label>
    <input
        id="pcf-company"
        type="text"
        bind:value={formData.company_name}
        placeholder="z. B. Hausarztpraxis Dr. Schmidt oder Betreuungsbüro"
        class="orga-input-clear py-2.5 text-sm"
        disabled={isLoading}
    />
</div>

<!-- Erreichbarkeit -->
<div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
    <div>
        <label for="pcf-phone" class="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
            <Phone class="w-3.5 h-3.5 text-slate-400" />
            Telefon / Mobilnummer
        </label>
        <input
            id="pcf-phone"
            type="tel"
            bind:value={formData.phone}
            placeholder="z. B. 0170 1234567"
            class="orga-input-clear py-2.5 text-sm"
            disabled={isLoading}
        />
    </div>
    <div>
        <label for="pcf-email" class="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
            <Mail class="w-3.5 h-3.5 text-slate-400" />
            E-Mail-Adresse
        </label>
        <input
            id="pcf-email"
            type="email"
            bind:value={formData.email}
            placeholder="z. B. kontakt@example.de"
            class="orga-input-clear py-2.5 text-sm"
            disabled={isLoading}
        />
    </div>
</div>

<!-- Anschrift -->
<div class="pt-2 border-t border-slate-100 dark:border-slate-800">
    <p class="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
        <MapPin class="w-3.5 h-3.5 text-slate-400" /> Anschrift (optional)
    </p>
    <div class="grid grid-cols-3 gap-3 mb-3">
        <div class="col-span-2">
            <input
                type="text"
                bind:value={formData.street}
                placeholder="Straße"
                class="orga-input-clear py-2.5 text-sm"
                disabled={isLoading}
            />
        </div>
        <div>
            <input
                type="text"
                bind:value={formData.housenr}
                placeholder="Nr."
                class="orga-input-clear py-2.5 text-sm"
                disabled={isLoading}
            />
        </div>
    </div>
    <div class="grid grid-cols-3 gap-3">
        <div>
            <input
                type="text"
                bind:value={formData.zip}
                placeholder="PLZ"
                class="orga-input-clear py-2.5 text-sm"
                disabled={isLoading}
            />
        </div>
        <div class="col-span-2">
            <input
                type="text"
                bind:value={formData.city}
                placeholder="Ort"
                class="orga-input-clear py-2.5 text-sm"
                disabled={isLoading}
            />
        </div>
    </div>
</div>

<!-- Notizen / Erreichbarkeit -->
<div>
    <label for="pcf-notes" class="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
        Hinweise zur Erreichbarkeit / Notizen
    </label>
    <textarea
        use:autoGrow
        id="pcf-notes"
        bind:value={formData.notes}
        rows="2"
        placeholder="z. B. Schlüssel vor Ort vorhanden, erreichbar Mo-Fr ab 14 Uhr..."
        class="auto-grow orga-input-clear py-2.5 text-sm resize-none overflow-hidden min-h-16"
        disabled={isLoading}
    ></textarea>
</div>
