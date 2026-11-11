<script lang="ts">
    import { MapPin, Building2, ExternalLink, Edit3, Check, X } from "lucide-svelte";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import AppointmentContactAddressPicker from "./AppointmentContactAddressPicker.svelte";

    interface Props {
        appointment: any;
        client?: any;
        onSaveAddress: (address: string, contactId?: string) => Promise<boolean>;
    }

    let { appointment, client, onSaveAddress }: Props = $props();

    let isEditing = $state(false);
    let isSaving = $state(false);
    let addressValue = $state("");
    let contactSearchQuery = $state("");
    let isContactSearchOpen = $state(false);
    let selectedContactId = $state<string>("");

    let linkedContact = $derived.by(() => {
        if (!appointment?.expand?.appointment_at) return null;
        const list = appointment.expand.appointment_at;
        return Array.isArray(list) ? list[0] : list;
    });

    let clientAddressStr = $derived.by(() => {
        if (!client) return "";
        const parts = [
            client.street ? `${client.street} ${client.housenr || ''}`.trim() : '',
            client.city ? `${client.zip || ''} ${client.city}`.trim() : ''
        ].filter(Boolean);
        return parts.join(', ');
    });

    let allContacts = $derived((orgaStore.contacts?.data || []) as any[]);

    let filteredContacts = $derived.by(() => {
        const q = contactSearchQuery.toLowerCase().trim();
        const matches = allContacts.filter(c => {
            if (!q) return true;
            const name = `${c.name_first || ''} ${c.name_last || ''}`.toLowerCase();
            const comp = (c.company_name || '').toLowerCase();
            const cat = (c.category || '').toLowerCase();
            const city = (c.city || '').toLowerCase();
            return name.includes(q) || comp.includes(q) || cat.includes(q) || city.includes(q);
        });

        return matches
            .sort((a, b) => {
                const labelA = `${a.company_name || ''} ${a.name_last || ''} ${a.name_first || ''}`.trim();
                const labelB = `${b.company_name || ''} ${b.name_last || ''} ${b.name_first || ''}`.trim();
                return labelA.localeCompare(labelB, 'de', { sensitivity: 'base' });
            })
            .slice(0, 8);
    });

    function startEdit() {
        addressValue = appointment?.location_address || "";
        selectedContactId = linkedContact?.id || "";
        contactSearchQuery = "";
        isContactSearchOpen = false;
        isEditing = true;
    }

    function selectContact(contact: any) {
        selectedContactId = contact.id;
        const addrParts = [
            contact.street ? `${contact.street} ${contact.housenr || ''}`.trim() : '',
            contact.city ? `${contact.zip || ''} ${contact.city}`.trim() : ''
        ].filter(Boolean);
        addressValue = addrParts.join(', ');
        isContactSearchOpen = false;
        contactSearchQuery = "";
    }

    function copyClientAddress() {
        if (!clientAddressStr) return;
        addressValue = clientAddressStr;
        selectedContactId = "";
    }

    async function handleSave() {
        isSaving = true;
        const ok = await onSaveAddress(addressValue.trim(), selectedContactId);
        isSaving = false;
        if (ok) isEditing = false;
    }
</script>

<div class="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-3.5">
    <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
        <div class="flex items-center gap-2">
            <span class="w-7 h-7 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
                <MapPin class="w-4 h-4" />
            </span>
            <h3 class="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Ort & Zieladresse
            </h3>
        </div>
        {#if !isEditing}
            <button
                type="button"
                onclick={startEdit}
                class="min-h-11 px-3 py-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 touch-manipulation"
            >
                <Edit3 class="w-3.5 h-3.5" />
                <span>{appointment?.location_address ? 'Bearbeiten' : 'Adresse eintragen'}</span>
            </button>
        {/if}
    </div>

    {#if !isEditing}
        {#if appointment?.location_address}
            <div class="space-y-2">
                {#if linkedContact}
                    <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-bold">
                        <Building2 class="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                        <span>{linkedContact.company_name || `${linkedContact.name_first} ${linkedContact.name_last}`}</span>
                    </div>
                {/if}
                <div class="flex items-start justify-between gap-3">
                    <p class="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        {appointment.location_address}
                    </p>
                    <a
                        href="https://www.google.com/maps/search/?api=1&query={encodeURIComponent(appointment.location_address)}"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="min-h-11 px-3 py-1 text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 rounded-xl border border-blue-200 dark:border-blue-800 shrink-0 flex items-center gap-1 transition-colors touch-manipulation"
                        title="In Google Maps öffnen"
                    >
                        <ExternalLink class="w-3.5 h-3.5" />
                        <span>Maps</span>
                    </a>
                </div>
            </div>
        {:else}
            <div class="py-2 text-xs text-slate-500 dark:text-slate-400 italic flex items-center justify-between">
                <span>Keine separate Zieladresse eingetragen.</span>
                <button type="button" onclick={startEdit} class="min-h-11 font-bold text-blue-600 not-italic cursor-pointer hover:underline touch-manipulation flex items-center">
                    Jetzt festlegen
                </button>
            </div>
        {/if}
    {:else}
        <div class="space-y-3 pt-1">
            <div class="space-y-1.5">
                <div class="flex items-center justify-between">
                    <label for="dest-address-input" class="text-[11px] font-bold text-slate-500 dark:text-slate-400">Einsatzort / Zieladresse</label>
                    {#if clientAddressStr}
                        <button
                            type="button"
                            onclick={copyClientAddress}
                            class="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer touch-manipulation"
                        >
                            Vom Klienten übernehmen
                        </button>
                    {/if}
                </div>
                <div class="relative">
                    <input
                        id="dest-address-input"
                        type="text"
                        bind:value={addressValue}
                        placeholder="z.B. Calvinstr. 3, 06110 Halle..."
                        class="orga-input-clear min-h-11 py-2 text-xs font-semibold w-full pr-8"
                        disabled={isSaving}
                    />
                    {#if addressValue}
                        <button
                            type="button"
                            onclick={() => { addressValue = ''; selectedContactId = ''; }}
                            class="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                        >
                            <X class="w-3.5 h-3.5" />
                        </button>
                    {/if}
                </div>
            </div>

            <AppointmentContactAddressPicker
                bind:isOpen={isContactSearchOpen}
                contacts={filteredContacts}
                bind:searchQuery={contactSearchQuery}
                onSelect={selectContact}
            />

            <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                    type="button"
                    onclick={() => isEditing = false}
                    class="min-h-11 px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer touch-manipulation"
                    disabled={isSaving}
                >
                    Abbrechen
                </button>
                <button
                    type="button"
                    onclick={handleSave}
                    class="orga-button-primary min-h-11 px-4 py-1.5 text-xs font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5 touch-manipulation"
                    disabled={isSaving}
                >
                    <Check class="w-3.5 h-3.5" />
                    <span>{isSaving ? 'Speichert...' : 'Speichern'}</span>
                </button>
            </div>
        </div>
    {/if}
</div>
