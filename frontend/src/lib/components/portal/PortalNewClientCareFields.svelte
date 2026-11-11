<script lang="ts">
    import { autoGrow } from "$lib/actions/autoGrow";

    interface Props {
        formData: any;
        isLoading: boolean;
        insurances: any[];
        homes: any[];
        onOpenNewHomeModal: () => void;
    }

    let {
        formData = $bindable(),
        isLoading,
        insurances,
        homes,
        onOpenNewHomeModal
    }: Props = $props();
</script>

<h3 class="text-xs font-bold text-neutral-400 dark:text-slate-400 uppercase tracking-wider mb-3 pt-4 border-t border-neutral-100 dark:border-slate-800 mt-2">
    Kranken- & Pflegekasse
</h3>
<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
    <div>
        <label for="nc-insurance" class="block text-sm font-semibold text-neutral-700 dark:text-slate-300 mb-1.5">
            Krankenkasse
        </label>
        <select
            id="nc-insurance"
            bind:value={formData.insurance}
            class="orga-input-clear cursor-pointer py-2.5 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
            disabled={isLoading}
        >
            <option value="">Keine / Unbekannt</option>
            <option value="other" class="font-bold text-brand-600 dark:text-brand-400">➕ andere / neue Krankenkasse...</option>
            {#each insurances as ins}
                <option value={ins.id}>{ins.name}</option>
            {/each}
        </select>
    </div>
    <div>
        <label for="nc-insurance-nr" class="block text-sm font-semibold text-neutral-700 dark:text-slate-300 mb-1.5">
            Versicherungs-Nr.
        </label>
        <input
            id="nc-insurance-nr"
            type="text"
            bind:value={formData.insurance_nr}
            class="orga-input-clear py-2.5 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
            disabled={isLoading}
        />
    </div>

    {#if formData.insurance === "other"}
        <div class="sm:col-span-2 bg-brand-50/50 dark:bg-brand-950/30 p-4 rounded-xl border border-brand-200 dark:border-brand-900/50 animate-enter space-y-3">
            <div>
                <label for="nc-other-name" class="block text-xs font-bold text-brand-900 dark:text-brand-300 mb-1">
                    Name der neuen Krankenkasse *
                </label>
                <input
                    id="nc-other-name"
                    type="text"
                    bind:value={formData.other_insurance_name}
                    placeholder="z. B. Techniker Krankenkasse, DAK..."
                    class="orga-input-clear bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 py-2 text-sm"
                    required
                    disabled={isLoading}
                />
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div class="sm:col-span-2">
                    <label for="nc-other-street" class="block text-[11px] font-semibold text-neutral-600 dark:text-slate-400 mb-0.5">
                        Straße / Anschrift (optional)
                    </label>
                    <input
                        id="nc-other-street"
                        type="text"
                        bind:value={formData.other_insurance_street}
                        placeholder="Straße oder Postfach"
                        class="orga-input-clear bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 py-1.5 text-xs"
                        disabled={isLoading}
                    />
                </div>
                <div>
                    <label for="nc-other-city" class="block text-[11px] font-semibold text-neutral-600 dark:text-slate-400 mb-0.5">
                        PLZ & Ort (optional)
                    </label>
                    <input
                        id="nc-other-city"
                        type="text"
                        bind:value={formData.other_insurance_city}
                        placeholder="PLZ und Ort"
                        class="orga-input-clear bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 py-1.5 text-xs"
                        disabled={isLoading}
                    />
                </div>
            </div>
        </div>
    {/if}

    <div>
        <label for="nc-carelevel" class="block text-sm font-semibold text-neutral-700 dark:text-slate-300 mb-1.5">
            Pflegegrad
        </label>
        <select
            id="nc-carelevel"
            bind:value={formData.level_of_care}
            class="orga-input-clear cursor-pointer py-2.5 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
            disabled={isLoading}
        >
            <option value="">Keiner / Unbekannt</option>
            <option value="0">Grad 0</option>
            <option value="1">Grad 1</option>
            <option value="2">Grad 2</option>
            <option value="3">Grad 3</option>
            <option value="4">Grad 4</option>
            <option value="5">Grad 5</option>
        </select>
    </div>
    <div>
        <label for="nc-home" class="block text-sm font-semibold text-neutral-700 dark:text-slate-300 mb-1.5">
            Wohnt in Pflegeheim
        </label>
        <select
            id="nc-home"
            bind:value={formData.retirement_homes}
            onchange={(e) => {
                if (e.currentTarget.value === '__new_home__') {
                    formData.retirement_homes = '';
                    onOpenNewHomeModal();
                }
            }}
            class="orga-input-clear cursor-pointer py-2.5 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 min-h-[44px]"
            disabled={isLoading}
        >
            <option value="">Nein / Zuhause</option>
            <option value="__new_home__" class="font-bold text-teal-600 dark:text-teal-400">+ Neues Pflegeheim anlegen</option>
            {#each homes as home}
                <option value={home.id}>{home.name}</option>
            {/each}
        </select>
    </div>
</div>

<h3 class="text-xs font-bold text-neutral-400 dark:text-slate-400 uppercase tracking-wider mb-3 pt-4 border-t border-neutral-100 dark:border-slate-800 mt-2">
    Weitere Informationen
</h3>
<div>
    <label for="nc-notes" class="block text-sm font-semibold text-neutral-700 dark:text-slate-300 mb-1.5">
        Grund der Anfrage / Besonderheiten (Benötigt Rollstuhl, Schwerhörig etc.)
    </label>
    <textarea
        use:autoGrow
        id="nc-notes"
        bind:value={formData.notes}
        rows="3"
        class="auto-grow orga-input-clear py-2.5 text-sm resize-none overflow-hidden min-h-20 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
        placeholder="Beschreiben Sie kurz die Situation oder besondere Anforderungen..."
        disabled={isLoading}
    ></textarea>
</div>
