<script lang="ts">
    import GpsAddressButton from "$lib/components/common/GpsAddressButton.svelte";
    import { validateGermanAddress, parseGermanAddress } from "$lib/services/addressValidationService";
    import { CheckCircle2, AlertTriangle, AlertCircle } from "lucide-svelte";

    interface Props {
        street?: string;
        housenr?: string;
        zip?: string;
        city?: string;
        idPrefix?: string;
        title?: string;
        disabled?: boolean;
        searchQueryName?: string;
        showGps?: boolean;
        class?: string;
    }

    let {
        street = $bindable(""),
        housenr = $bindable(""),
        zip = $bindable(""),
        city = $bindable(""),
        idPrefix = "addr",
        title = "Wohnanschrift",
        disabled = false,
        searchQueryName = "",
        showGps = true,
        class: extraClass = ""
    }: Props = $props();

    const hasAddressInput = $derived(
        Boolean(street?.trim() || housenr?.trim() || zip?.trim() || city?.trim())
    );

    const validation = $derived(
        validateGermanAddress(street || "", housenr || "", zip || "", city || "")
    );

    function handleAddressCaptured(address: string) {
        const parsed = parseGermanAddress(address);
        street = parsed.street;
        housenr = parsed.housenr;
        zip = parsed.zip;
        city = parsed.city;
    }

    const mapsQuery = $derived(
        [
            searchQueryName,
            `${street || ""} ${housenr || ""}`.trim(),
            `${zip || ""} ${city || ""}`.trim()
        ].filter(Boolean).join(", ")
    );
</script>

<div class="space-y-3 {extraClass}">
    <div class="flex flex-wrap items-center justify-between gap-2">
        <h3 class="text-xs font-bold text-neutral-400 dark:text-slate-400 uppercase tracking-wider">
            {title}
        </h3>

        <div class="flex items-center gap-2">
            {#if (street || city) && mapsQuery}
                <a
                    href="https://www.google.com/maps/search/?api=1&query={encodeURIComponent(mapsQuery)}"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1.5 rounded-xl border border-blue-200 dark:border-blue-800 shadow-2xs min-h-[36px]"
                    title="Adresse auf Google Maps öffnen"
                >
                    <span>🗺️</span>
                    <span class="hidden sm:inline">Karte öffnen</span>
                </a>
            {/if}

            {#if showGps}
                <GpsAddressButton
                    label="Standort erfassen"
                    variant="button"
                    onAddressCaptured={handleAddressCaptured}
                    {disabled}
                />
            {/if}
        </div>
    </div>

    <!-- Live Reactive German Address Validation Pill -->
    {#if hasAddressInput}
        <div class="pt-0.5">
            {#if validation.isValid && validation.warnings.length === 0}
                <div class="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                    <CheckCircle2 class="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>Adresse vollständig</span>
                </div>
            {:else if validation.isValid && validation.warnings.length > 0}
                <div class="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-3 py-1 rounded-full border border-amber-200 dark:border-amber-800">
                    <AlertTriangle class="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>Hinweis: {validation.warnings.join(" • ")}</span>
                </div>
            {:else}
                <div class="inline-flex items-center gap-1.5 text-xs font-medium text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 px-3 py-1 rounded-full border border-rose-200 dark:border-rose-800">
                    <AlertCircle class="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                    <span>Bitte prüfen: {validation.errors.join(" • ")}</span>
                </div>
            {/if}
        </div>
    {/if}

    <!-- 4-Field Responsive Address Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-4 gap-3.5 sm:gap-4 landscape:gap-2.5">
        <div class="sm:col-span-3">
            <label for="{idPrefix}-street" class="block text-sm font-semibold text-neutral-700 dark:text-slate-300 mb-1.5">
                Straße
            </label>
            <input
                id="{idPrefix}-street"
                type="text"
                bind:value={street}
                placeholder="Musterstraße"
                autocomplete="street-address"
                class="orga-input-clear text-base sm:text-sm min-h-[44px] landscape:min-h-[38px]"
                {disabled}
            />
        </div>

        <div>
            <label for="{idPrefix}-housenr" class="block text-sm font-semibold text-neutral-700 dark:text-slate-300 mb-1.5">
                Hausnr.
            </label>
            <input
                id="{idPrefix}-housenr"
                type="text"
                bind:value={housenr}
                placeholder="12 a"
                class="orga-input-clear text-base sm:text-sm min-h-[44px] landscape:min-h-[38px]"
                {disabled}
            />
        </div>

        <div>
            <label for="{idPrefix}-zip" class="block text-sm font-semibold text-neutral-700 dark:text-slate-300 mb-1.5">
                PLZ
            </label>
            <input
                id="{idPrefix}-zip"
                type="text"
                inputmode="numeric"
                bind:value={zip}
                placeholder="12345"
                autocomplete="postal-code"
                class="orga-input-clear text-base sm:text-sm min-h-[44px] landscape:min-h-[38px]"
                {disabled}
            />
        </div>

        <div class="sm:col-span-3">
            <label for="{idPrefix}-city" class="block text-sm font-semibold text-neutral-700 dark:text-slate-300 mb-1.5">
                Stadt / Ort
            </label>
            <input
                id="{idPrefix}-city"
                type="text"
                bind:value={city}
                placeholder="Musterstadt"
                autocomplete="address-level2"
                class="orga-input-clear text-base sm:text-sm min-h-[44px] landscape:min-h-[38px]"
                {disabled}
            />
        </div>
    </div>
</div>
