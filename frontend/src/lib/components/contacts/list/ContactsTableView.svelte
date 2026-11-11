<script lang="ts">
    import type { ClientRecord } from "$lib/types/orgaTypes";
    import ContactsDesktopTable from "./ContactsDesktopTable.svelte";
    import ContactsMobileList from "./ContactsMobileList.svelte";

    interface Props {
        filteredContacts: any[];
        clientsList: ClientRecord[];
        onOpenContact: (contact: any) => void;
        onTogglePortalActive: (contact: any, event?: Event) => void;
        onOpenPortalAccess: (contact: any) => void;
        onOpenShareQr: (contact: any) => void;
        onConvertToRetirementHome: (contact: any) => void;
    }

    let {
        filteredContacts,
        clientsList,
        onOpenContact,
        onTogglePortalActive,
        onOpenPortalAccess,
        onOpenShareQr,
        onConvertToRetirementHome
    }: Props = $props();
</script>

<div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
    <!-- Desktop Tabelle -->
    <div class="hidden md:block overflow-x-auto custom-scrollbar">
        <ContactsDesktopTable 
            {filteredContacts}
            {clientsList}
            {onOpenContact}
            {onTogglePortalActive}
            {onOpenPortalAccess}
            {onOpenShareQr}
            {onConvertToRetirementHome}
        />
    </div>

    <!-- Mobile Listen-Ansicht -->
    <div class="block md:hidden divide-y divide-slate-100 dark:divide-slate-800">
        <ContactsMobileList 
            {filteredContacts}
            {clientsList}
            {onOpenContact}
            {onTogglePortalActive}
            {onOpenPortalAccess}
            {onOpenShareQr}
            {onConvertToRetirementHome}
        />
    </div>
</div>
