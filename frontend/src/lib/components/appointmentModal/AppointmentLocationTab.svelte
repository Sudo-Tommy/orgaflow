<script lang="ts">
    import { MapPin, Building2, X, Navigation } from "lucide-svelte";
    import { hapticFeedback } from "$lib/services/hapticFeedback";
    import GpsAddressButton from "$lib/components/common/GpsAddressButton.svelte";
    import type { AppointmentModalState } from "./appointmentModalState.svelte";

    interface Props {
        state: AppointmentModalState;
    }
    let { state }: Props = $props();

    function setUseClientAddress(val: boolean) {
        hapticFeedback.tap();
        state.useClientAddress = val;
        if (val && state.selectedClientRecord) {
            state.updateLocationFromClient(state.selectedClientRecord);
        }
    }
</script>

<div class="space-y-5 animate-enter">
    <div class="space-y-2">
        <div class="flex items-center justify-between">
            <label for="app-location" class="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-slate-400 flex items-center gap-1.5">
                <MapPin class="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Zieladresse für diesen Termin</span>
            </label>
            {#if state.selectedClientRecord}
                <div class="flex items-center gap-2">
                    <span class="text-xs text-neutral-600 dark:text-slate-300 font-medium">Klientenadresse:</span>
                    <button
                        type="button"
                        aria-label="Adresse beim Klienten verwenden"
                        class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none touch-manipulation {state.useClientAddress ? 'bg-indigo-600' : 'bg-neutral-200 dark:bg-slate-700'}"
                        role="switch"
                        aria-checked={state.useClientAddress}
                        onclick={() => setUseClientAddress(!state.useClientAddress)}
                    >
                        <span class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 {state.useClientAddress ? 'translate-x-5' : 'translate-x-0'}"></span>
                    </button>
                </div>
            {/if}
        </div>

        <div class="relative">
            <input
                id="app-location"
                name="appLocation"
                type="text"
                bind:value={state.location_address}
                oninput={() => { state.selectedContactId = ""; }}
                class="orga-input-clear min-h-12 py-2.5 pr-10 text-sm"
                placeholder="z.B. Dr. Mustermann, Hauptstraße 10, 10115 Berlin"
                disabled={state.isLoading}
            />
            {#if state.location_address}
                <button
                    type="button"
                    onclick={() => { hapticFeedback.tap(); state.location_address = ""; state.useClientAddress = false; state.selectedContactId = ""; }}
                    class="absolute right-2.5 top-1/2 -translate-y-1/2 p-2 min-h-9 min-w-9 flex items-center justify-center text-neutral-400 hover:text-neutral-600 dark:hover:text-slate-200 cursor-pointer"
                    title="Adresse leeren"
                >
                    <X class="w-4 h-4" />
                </button>
            {/if}
        </div>

        <!-- 1-Click GPS Capture & Navigation Link -->
        <div class="flex flex-wrap items-center justify-between gap-2 pt-1">
            <GpsAddressButton
                variant="button"
                label="Standort erfassen"
                onAddressCaptured={(addr) => {
                    hapticFeedback.tap();
                    state.location_address = addr;
                    state.useClientAddress = false;
                    state.selectedContactId = "";
                }}
                disabled={state.isLoading}
            />
            {#if state.location_address}
                <a
                    href="https://maps.google.com/?q={encodeURIComponent(state.location_address)}"
                    target="_blank"
                    rel="noreferrer"
                    class="inline-flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold min-h-[36px]"
                >
                    <Navigation class="w-3.5 h-3.5" />
                    <span>In Google Maps öffnen</span>
                </a>
            {/if}
        </div>
    </div>

    <!-- Verknüpfter Kontakt -->
    {#if state.selectedContactRecord}
        <div class="flex items-center justify-between p-3 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 rounded-2xl text-xs">
            <div class="flex items-center gap-2 min-w-0">
                <Building2 class="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span class="text-blue-950 dark:text-blue-200 font-medium truncate">
                    Übernommener Kontakt: <strong class="font-bold">{state.selectedContactRecord.company_name || `${state.selectedContactRecord.name_first || ''} ${state.selectedContactRecord.name_last || ''}`}</strong>
                </span>
            </div>
            <button
                type="button"
                onclick={() => { hapticFeedback.tap(); state.selectedContactId = ""; }}
                class="min-h-9 px-2 text-[11px] text-blue-700 dark:text-blue-300 hover:underline font-semibold cursor-pointer shrink-0"
            >
                Lösen
            </button>
        </div>
    {/if}

    <!-- Kontakt-Sucher für Zieladressen (Ärzte, Apotheken, Partner) -->
    <div class="space-y-2 pt-2">
        <label for="contact-search-input" class="block text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-slate-400">
            Zieladresse aus Kontakten (Ärzte, Therapeuten, etc.)
        </label>
        <div class="relative">
            <input
                id="contact-search-input"
                type="text"
                bind:value={state.contactSearchQuery}
                onfocus={() => state.isContactSearchOpen = true}
                placeholder="+ Arzt / Praxis / Kontakt durchsuchen..."
                class="orga-input-clear min-h-12 pl-10 pr-10 text-sm bg-blue-50/30 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/50"
                disabled={state.isLoading}
            />
            <Building2 class="w-4 h-4 text-blue-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            {#if state.isContactSearchOpen || state.contactSearchQuery}
                <button
                    type="button"
                    onclick={() => { hapticFeedback.tap(); state.contactSearchQuery = ""; state.isContactSearchOpen = false; }}
                    class="absolute right-2.5 top-1/2 -translate-y-1/2 p-2 min-h-9 min-w-9 flex items-center justify-center text-neutral-400 hover:text-neutral-600 rounded-lg cursor-pointer"
                    title="Suche schließen"
                >
                    <X class="w-4 h-4" />
                </button>
            {/if}
        </div>

        {#if state.isContactSearchOpen}
            <div class="mt-2 bg-slate-50 dark:bg-slate-800/90 rounded-2xl border border-blue-200/80 dark:border-blue-900/60 p-2 space-y-1 max-h-60 overflow-y-auto shadow-lg">
                <button
                    type="button"
                    onclick={() => { hapticFeedback.tap(); state.selectedContactId = ""; state.isContactSearchOpen = false; }}
                    class="w-full text-left px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700 rounded-xl cursor-pointer flex items-center gap-2"
                >
                    <X class="w-3.5 h-3.5 text-slate-400" />
                    <span>Keine Kontakt-Adresse übernehmen</span>
                </button>
                {#if state.filteredContacts.length === 0}
                    <p class="text-xs text-neutral-400 dark:text-slate-500 p-3 text-center italic">Keine Kontakte gefunden</p>
                {:else}
                    {#each state.filteredContacts as contact (contact.id)}
                        <button
                            type="button"
                            onclick={() => { hapticFeedback.tap(); state.selectContact(contact); }}
                            class="w-full text-left px-3 py-2.5 bg-white dark:bg-slate-850 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-xl transition-colors border border-slate-100 dark:border-slate-800 cursor-pointer flex items-center justify-between gap-3"
                        >
                            <div class="min-w-0">
                                <p class="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                                    {contact.company_name || `${contact.name_first || ''} ${contact.name_last || ''}`.trim()}
                                </p>
                                <p class="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                    {[contact.street, contact.city].filter(Boolean).join(', ') || 'Keine Adresse hinterlegt'}
                                </p>
                            </div>
                            {#if contact.category}
                                <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 shrink-0">
                                    {contact.category}
                                </span>
                            {/if}
                        </button>
                    {/each}
                {/if}
            </div>
        {/if}
    </div>
</div>
