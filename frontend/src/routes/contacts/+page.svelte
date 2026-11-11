<script lang="ts">
    import { onMount } from "svelte";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import { pb } from "$lib/services/pocketbase";
    import { toastStore } from "$lib/services/toastService.svelte";
    import ContactModal from "$lib/components/contacts/ContactModal.svelte";
    import RetirementHomeModal from "$lib/components/RetirementHomeModal.svelte";
    import ClientPortalAccessModal from "$lib/components/portal/ClientPortalAccessModal.svelte";
    import ShareQrModal from "$lib/components/dashboard/ShareQrModal.svelte";
    import GoogleContactSelectionModal from "$lib/components/contacts/GoogleContactSelectionModal.svelte";
    import ContactsPageHeader from "$lib/components/contacts/list/ContactsPageHeader.svelte";
    import ContactsKpiBar from "$lib/components/contacts/list/ContactsKpiBar.svelte";
    import ContactsFilterBar from "$lib/components/contacts/list/ContactsFilterBar.svelte";
    import SuspectedHomesBanner from "$lib/components/contacts/list/SuspectedHomesBanner.svelte";
    import ContactsEmptyState from "$lib/components/contacts/list/ContactsEmptyState.svelte";
    import ContactsGridView from "$lib/components/contacts/list/ContactsGridView.svelte";
    import ContactsTableView from "$lib/components/contacts/list/ContactsTableView.svelte";
    import HomesListView from "$lib/components/contacts/list/HomesListView.svelte";
    import type { ClientRecord } from "$lib/types/orgaTypes";
    import {
        downloadAllVCards,
        getContactType,
        isSuspectedRetirementHome,
        convertContactToRetirementHome
    } from "$lib/components/contacts/contactDetailHelpers";
    import {
        getLinkedContactIds,
        filterAndSortContacts,
        filterHomes
    } from "$lib/components/contacts/list/contactsListHelpers";

    let activeTab = $state<"contacts" | "homes">("contacts");
    let searchQuery = $state("");
    let contactFilterChip = $state<"all" | "caregiver" | "relative" | "other" | "unassigned" | "linked" | "unlinked" | "portal" | "phone" | "email">("all");
    let homeFilterChip = $state<"all" | "unverified" | "verified" | "portal">("all");
    let sortBy = $state<"name_asc" | "name_desc" | "company" | "city" | "updated">("name_asc");
    let viewMode = $state<"table" | "grid">("table");

    onMount(async () => {
        await Promise.allSettled([
            orgaStore.contacts.init(),
            orgaStore.retirement_homes.init(),
            orgaStore.clients.init()
        ]);
    });

    // svelte-ignore non_reactive_update
    let contactModal: ReturnType<typeof ContactModal>;
    // svelte-ignore non_reactive_update
    let homeModal: ReturnType<typeof RetirementHomeModal>;
    // svelte-ignore non_reactive_update
    let portalAccessModal: ReturnType<typeof ClientPortalAccessModal>;
    // svelte-ignore non_reactive_update
    let shareQrModal: ReturnType<typeof ShareQrModal>;
    // svelte-ignore non_reactive_update
    let googleContactModal: ReturnType<typeof GoogleContactSelectionModal>;

    let linkedContactIds = $derived(getLinkedContactIds(orgaStore.clients?.data || [], orgaStore.retirement_homes?.data || []));
    const clientsList = $derived(((orgaStore.clients?.data || []) as ClientRecord[]));

    let totalContactsCount = $derived(orgaStore.contacts?.data?.length || 0);
    let caregiverCount = $derived((orgaStore.contacts?.data || []).filter((c: any) => getContactType(c, clientsList) === 'caregiver').length);
    let relativeCount = $derived((orgaStore.contacts?.data || []).filter((c: any) => getContactType(c, clientsList) === 'relative').length);
    let otherCount = $derived((orgaStore.contacts?.data || []).filter((c: any) => getContactType(c, clientsList) === 'other').length);
    let unassignedCount = $derived((orgaStore.contacts?.data || []).filter((c: any) => getContactType(c, clientsList) === 'unassigned').length);
    let suspectedRetirementHomes = $derived((orgaStore.contacts?.data || []).filter(isSuspectedRetirementHome));
    let linkedContactsCount = $derived((orgaStore.contacts?.data || []).filter((c: any) => linkedContactIds.has(c.id)).length);
    let portalContactsCount = $derived((orgaStore.contacts?.data || []).filter((c: any) => !!c.portal_active).length);
    let totalHomesCount = $derived(orgaStore.retirement_homes?.data?.length || 0);
    let unverifiedHomesCount = $derived((orgaStore.retirement_homes?.data || []).filter((h: any) => !h.is_verified).length);

    let filteredContacts = $derived(filterAndSortContacts(
        orgaStore.contacts?.data || [],
        contactFilterChip,
        searchQuery,
        sortBy,
        clientsList,
        linkedContactIds
    ));

    let filteredHomes = $derived(filterHomes(
        orgaStore.retirement_homes?.data || [],
        homeFilterChip,
        searchQuery
    ));

    async function toggleContactPortalActive(contact: any, event?: Event) {
        event?.stopPropagation();
        const nextState = !contact.portal_active;
        try {
            const updatePayload: Record<string, any> = { portal_active: nextState };
            if (nextState) {
                if (!contact.portal_pin) updatePayload.portal_pin = Math.floor(100000 + Math.random() * 900000).toString();
                if (!contact.portal_code) updatePayload.portal_code = 'OF-' + Math.random().toString(36).substring(2, 8).toUpperCase();
            }
            await pb.collection('contacts').update(contact.id, updatePayload);
            if (orgaStore.contacts) await orgaStore.contacts.init();
            const displayName = [contact.name_first, contact.name_last].filter(Boolean).join(' ') || contact.company_name || 'Kontakt';
            if (nextState) toastStore.success(`Portal-Zugang für „${displayName}“ erfolgreich freigegeben.`);
            else toastStore.info(`Portal-Zugang für „${displayName}“ wurde gesperrt.`);
        } catch (err: any) {
            toastStore.error(err.message || "Fehler beim Umschalten der Portal-Freigabe.");
        }
    }

    async function toggleVerification(home: any, event?: Event) {
        event?.stopPropagation();
        const nextState = !home.is_verified;
        try {
            await pb.collection('retirement_homes').update(home.id, { is_verified: nextState });
            if (orgaStore.retirement_homes) await orgaStore.retirement_homes.init();
            if (nextState) toastStore.success(`Pflegeheim „${home.name}“ als überprüft markiert.`);
            else toastStore.info(`Pflegeheim „${home.name}“ als unüberprüft markiert.`);
        } catch (err: any) {
            toastStore.error(err.message || "Fehler beim Aktualisieren des Prüfstatus.");
        }
    }

    async function handleGoogleSearchClick() {
        if (!googleContactModal) return;
        const result = await googleContactModal.open({ query: searchQuery || '', type: 'doctor' });
        if (result && orgaStore.contacts) await orgaStore.contacts.init();
    }
</script>

<ContactsPageHeader 
    {activeTab}
    filteredContactsCount={filteredContacts.length}
    onGoogleSearch={handleGoogleSearchClick}
    onExportVCard={() => downloadAllVCards(filteredContacts, "OrgaFlow_Kontakte.vcf")}
    onShareQr={() => shareQrModal?.open(undefined, 'contact')}
    onNewContact={() => contactModal?.open()}
    onNewHome={() => homeModal?.open()}
/>

<ContactsKpiBar 
    {totalContactsCount}
    {linkedContactsCount}
    {portalContactsCount}
    {totalHomesCount}
    {unverifiedHomesCount}
/>

<ContactsFilterBar 
    bind:activeTab
    bind:searchQuery
    bind:sortBy
    bind:viewMode
    bind:contactFilterChip
    bind:homeFilterChip
    {totalContactsCount}
    {caregiverCount}
    {relativeCount}
    {otherCount}
    {unassignedCount}
    {linkedContactsCount}
    {portalContactsCount}
    {totalHomesCount}
    {unverifiedHomesCount}
/>

<div class="animate-enter delay-200">
    {#if activeTab === 'contacts'}
        {#if suspectedRetirementHomes.length > 0}
            <SuspectedHomesBanner 
                {suspectedRetirementHomes}
                onConvertAll={async () => {
                    for (const c of suspectedRetirementHomes) { await convertContactToRetirementHome(c); }
                    activeTab = 'homes';
                }}
            />
        {/if}

        {#if orgaStore.contacts?.isLoading}
            <div class="text-center py-16 text-slate-500 font-bold animate-pulse">Lade Kontakte...</div>
        {:else if filteredContacts.length === 0}
            <ContactsEmptyState 
                {searchQuery}
                onClearSearch={() => searchQuery = ''}
                onNewContact={() => contactModal?.open()}
                onGoogleSearch={handleGoogleSearchClick}
            />
        {:else if viewMode === 'grid'}
            <ContactsGridView 
                {filteredContacts}
                {clientsList}
                onOpenContact={(contact) => contactModal?.open(contact)}
                onTogglePortalActive={toggleContactPortalActive}
                onOpenPortalAccess={(contact) => portalAccessModal?.open(contact, 'contact')}
                onOpenShareQr={(contact) => shareQrModal?.open(contact, 'contact')}
                onConvertToRetirementHome={(contact) => convertContactToRetirementHome(contact, { onCompleted: () => activeTab = 'homes' })}
            />
        {:else}
            <ContactsTableView 
                {filteredContacts}
                {clientsList}
                onOpenContact={(contact) => contactModal?.open(contact)}
                onTogglePortalActive={toggleContactPortalActive}
                onOpenPortalAccess={(contact) => portalAccessModal?.open(contact, 'contact')}
                onOpenShareQr={(contact) => shareQrModal?.open(contact, 'contact')}
                onConvertToRetirementHome={(contact) => convertContactToRetirementHome(contact, { onCompleted: () => activeTab = 'homes' })}
            />
        {/if}
    {:else}
        {#if orgaStore.retirement_homes?.isLoading}
            <div class="text-center py-16 text-slate-500 font-bold animate-pulse">Lade Einrichtungen...</div>
        {:else}
            <HomesListView 
                {filteredHomes}
                {viewMode}
                {searchQuery}
                onOpenHome={(home) => homeModal?.open(home)}
                onToggleVerification={toggleVerification}
            />
        {/if}
    {/if}
</div>

<!-- Modale -->
<ContactModal bind:this={contactModal} />
<RetirementHomeModal bind:this={homeModal} />
<ClientPortalAccessModal bind:this={portalAccessModal} />
<ShareQrModal bind:this={shareQrModal} />
<GoogleContactSelectionModal bind:this={googleContactModal} />