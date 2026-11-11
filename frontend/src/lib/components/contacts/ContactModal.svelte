<script lang="ts">
    import ClientPortalAccessModal from "$lib/components/portal/ClientPortalAccessModal.svelte";
    import QuickAccessMailModal from "$lib/components/portal/QuickAccessMailModal.svelte";
    import GoogleContactSelectionModal from "./GoogleContactSelectionModal.svelte";
    import type { ContactRecord, ClientRecord } from "$lib/types/orgaTypes";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import { createContactModalState, type ContactModalOpenOptions } from "./contactModalState.svelte";
    import ContactDetailHeaderCard from "./ContactDetailHeaderCard.svelte";
    import ContactEditForm from "./ContactEditForm.svelte";
    import {
        getInitials,
        formatFullName,
        getFormattedAddress,
        buildGoogleMapsUrl,
        classifyPhoneNumber,
        getContactType,
        getContactTypeConfig
    } from "./contactDetailHelpers";
    import { X } from "lucide-svelte";

    // svelte-ignore non_reactive_update
    let dialog: HTMLDialogElement;
    // svelte-ignore non_reactive_update
    let portalAccessModal: ReturnType<typeof ClientPortalAccessModal>;
    // svelte-ignore non_reactive_update
    let quickMailModal: ReturnType<typeof QuickAccessMailModal>;
    // svelte-ignore non_reactive_update
    let googleLookupModal: ReturnType<typeof GoogleContactSelectionModal>;

    const contactState = createContactModalState();

    // Berechnete Header-Werte für Glance & Edit
    const initials = $derived(getInitials(contactState.name_first, contactState.name_last, contactState.company_name));
    const fullName = $derived(formatFullName(contactState.name_first, contactState.name_last, contactState.salutation));
    const address = $derived(getFormattedAddress(contactState.street, contactState.housenr, contactState.zip, contactState.city));
    const mapsUrl = $derived(address ? buildGoogleMapsUrl(contactState.company_name || fullName, address) : "");
    const phoneInfo = $derived(classifyPhoneNumber(contactState.phone));
    const whatsappDirectUrl = $derived(phoneInfo ? `https://wa.me/${phoneInfo.waNumber}` : "");
    const whatsappShareUrl = $derived(phoneInfo ? `https://api.whatsapp.com/send?phone=${phoneInfo.waNumber}` : "");

    const contactType = $derived(
        contactState.contact_type || (contactState.currentRecord ? getContactType(contactState.currentRecord, (orgaStore.clients?.data || []) as ClientRecord[]) : 'unassigned')
    );
    const typeConfig = $derived(getContactTypeConfig(contactType as any));

    export function open(record?: ContactRecord | null, options?: ContactModalOpenOptions) {
        contactState.open(record, dialog, options);
    }

    export function close() {
        contactState.close(dialog);
    }

    export async function attemptClose() {
        await contactState.attemptClose(dialog);
    }

    async function handleGoogleLookupTrigger(query: string) {
        if (!googleLookupModal) return;
        const result = await googleLookupModal.open({
            query: query || contactState.company_name || `${contactState.name_first} ${contactState.name_last}`.trim(),
            location: contactState.city || '',
            type: 'general'
        });
        if (result) {
            contactState.prefillData(result);
        }
    }

    function handleOpenMail() {
        const target = contactState.currentRecord || {
            id: contactState.editId,
            name_first: contactState.name_first,
            name_last: contactState.name_last,
            company_name: contactState.company_name,
            email: contactState.email,
            portal_code: contactState.portal_code,
            portal_pin: contactState.portal_pin
        };
        quickMailModal?.open(target);
    }
</script>

<dialog 
    bind:this={dialog} 
    class="zero-inner-scroll-modal custom-scrollbar p-0 bg-transparent backdrop:bg-slate-950/65 backdrop:backdrop-blur-md w-full max-w-3xl mx-auto my-4 sm:my-8 landscape:my-2 rounded-3xl z-50 border-none outline-none" 
    onclick={(e) => { if (e.target === dialog) attemptClose(); }}
>
    <div class="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-3xl w-full relative shadow-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col">
        <!-- Header -->
        <div class="bg-white/95 dark:bg-slate-900/95 px-5 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between shrink-0 sticky top-0 z-30 gap-3 backdrop-blur-md rounded-t-3xl">
            <div>
                <h2 class="text-base sm:text-xl font-black text-slate-900 dark:text-slate-100 leading-tight">
                    {contactState.editId ? 'Kontakt-Akte' : (contactState.isInheritorMode ? 'Neue Pflegeperson anlegen' : 'Neuer Kontakt')}
                </h2>
                <p class="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {contactState.editId ? 'Alle Daten im Blick & direkt an Ort und Stelle editierbar' : (contactState.isInheritorMode ? 'Wird direkt als Kontakt angelegt und verknüpft' : 'Neuen Ansprechpartner, Betreuer oder Arzt anlegen')}
                </p>
            </div>
            <button 
                aria-label="Schließen" 
                onclick={attemptClose} 
                class="w-9 h-9 sm:w-10 sm:h-10 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full flex items-center justify-center transition-colors cursor-pointer shrink-0"
            >
                <X class="w-4 h-4 stroke-[2.5]" />
            </button>
        </div>

        <!-- Content (Glance & Edit in voller Höhe ohne inneren Scrollbar) -->
        <div class="p-4 sm:p-6 landscape:p-4 space-y-5 bg-slate-50/50 dark:bg-slate-900/50 rounded-b-3xl">
            {#if contactState.errorMsg}
                <div class="bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-300 p-4 rounded-2xl text-xs sm:text-sm font-medium border border-red-200 dark:border-red-900/60 flex items-center gap-2">
                    <span class="text-base">⚠️</span>
                    <span>{contactState.errorMsg}</span>
                </div>
            {/if}

            <!-- 1-Tap Schnell-Aktionen & Profil-Header -->
            <ContactDetailHeaderCard 
                state={contactState}
                {initials}
                {fullName}
                {typeConfig}
                {phoneInfo}
                {whatsappDirectUrl}
                {whatsappShareUrl}
                {mapsUrl}
                {address}
                onOpenPortal={() => portalAccessModal?.open(contactState.currentRecord, 'contact')}
                onOpenMail={handleOpenMail}
            />

            <!-- Formularfelder direkt editierbar (Glance & Edit) -->
            <ContactEditForm 
                state={contactState} 
                {dialog}
                onCancel={attemptClose}
                onGoogleLookup={handleGoogleLookupTrigger} 
            />
        </div>
    </div>
</dialog>

<ClientPortalAccessModal bind:this={portalAccessModal} />
<QuickAccessMailModal bind:this={quickMailModal} />
<GoogleContactSelectionModal bind:this={googleLookupModal} />
