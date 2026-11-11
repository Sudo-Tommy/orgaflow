<script lang="ts">
    import ClientDetailKpiBar from "./ClientDetailKpiBar.svelte";
    import ClientMasterDataCard from "./ClientMasterDataCard.svelte";
    import ClientOverviewSidebar from "./ClientOverviewSidebar.svelte";

    interface Props {
        client: any;
        nextAppointment: any;
        totalAvailableBudget: number;
        currentYear: number;
        openInvoicesCount: number;
        openInvoicesTotal: number;
        totalDocumentsCount: number;
        uploadedCount: number;
        systemCount: number;
        careLevel: number;
        assignedEmployee: any;
        availableEmployees: any[];
        isChangingEmployee: boolean;
        primaryContactInfo: any;
        contactsCount: number;
        notes: string;
        isNotesSaving: boolean;
        mailingList: string[];
        isMailingListSaving: boolean;
        contacts: any[];
        onTabChange: (tab: 'overview' | 'budget' | 'appointments' | 'documents' | 'network') => void;
        onEdit: () => void;
        onAssignEmployee: (empId: string) => void;
        onUnlinkEmployee: () => void;
        onToggleChangingEmployee: () => void;
        onInlineUpdate: (field: string, val: string) => Promise<void>;
        onOpenNetworkTab: () => void;
        onLinkContact: () => void;
        onOpenNotesEditor: () => void;
        onAiDictate: () => void;
        onSaveNotes: () => void;
        onAddEmail: (email: string) => void;
        onRemoveEmail: (email: string) => void;
        onOpenContactSignature?: (contact: any, role: "careperson" | "inheritor" | "both") => void;
    }

    let {
        client,
        nextAppointment,
        totalAvailableBudget,
        currentYear,
        openInvoicesCount,
        openInvoicesTotal,
        totalDocumentsCount,
        uploadedCount,
        systemCount,
        careLevel,
        assignedEmployee,
        availableEmployees,
        isChangingEmployee,
        primaryContactInfo,
        contactsCount,
        notes = $bindable(),
        isNotesSaving,
        mailingList,
        isMailingListSaving,
        contacts,
        onTabChange,
        onEdit,
        onAssignEmployee,
        onUnlinkEmployee,
        onToggleChangingEmployee,
        onInlineUpdate,
        onOpenNetworkTab,
        onLinkContact,
        onOpenNotesEditor,
        onAiDictate,
        onSaveNotes,
        onAddEmail,
        onRemoveEmail,
        onOpenContactSignature
    }: Props = $props();
</script>

<div class="space-y-4 sm:space-y-5 animate-enter">
    <!-- Top 4 KPI Quick Stat Cards -->
    <ClientDetailKpiBar
        {nextAppointment}
        {totalAvailableBudget}
        {currentYear}
        {openInvoicesCount}
        {openInvoicesTotal}
        {totalDocumentsCount}
        {uploadedCount}
        {systemCount}
        {onTabChange}
    />

    <!-- 2-Column Responsive Layout -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
        <!-- Left: Stammdaten Card (7 cols) -->
        <div class="lg:col-span-7">
            <ClientMasterDataCard
                {client}
                {careLevel}
                {assignedEmployee}
                {availableEmployees}
                {isChangingEmployee}
                {onEdit}
                {onAssignEmployee}
                {onUnlinkEmployee}
                {onToggleChangingEmployee}
                {onInlineUpdate}
            />
        </div>

        <!-- Right: Primary Contact, Notes & Mailing List (5 cols) -->
        <div class="lg:col-span-5">
            <ClientOverviewSidebar
                {client}
                {primaryContactInfo}
                {contactsCount}
                bind:notes
                {isNotesSaving}
                {mailingList}
                {isMailingListSaving}
                {contacts}
                {onOpenNetworkTab}
                {onLinkContact}
                {onOpenNotesEditor}
                {onAiDictate}
                {onSaveNotes}
                {onAddEmail}
                {onRemoveEmail}
                {onOpenContactSignature}
            />
        </div>
    </div>
</div>
