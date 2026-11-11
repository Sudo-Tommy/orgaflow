<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    import { toastStore } from "$lib/services/toastService.svelte";
    import { confirmStore } from "$lib/services/confirmService.svelte";
    import { employeeService } from "$lib/services/employeeService.svelte";
    import { ClientDetailState } from "$lib/services/clientDetailState.svelte";
    import { unlinkClientContact, unlinkClientRetirementHome, updateClientField } from "$lib/services/clientDetailActions";
    import { rbacService } from "$lib/services/rbacService.svelte";

    import ClientDetailHeader from "./ClientDetailHeader.svelte";
    import ClientDetailTabBar, { type ClientDetailTab } from "./ClientDetailTabBar.svelte";
    import ClientDetailOverviewTab from "./ClientDetailOverviewTab.svelte";
    import ClientDetailBudgetTab from "./ClientDetailBudgetTab.svelte";
    import ClientDetailAppointmentsTab from "./ClientDetailAppointmentsTab.svelte";
    import ClientDocumentsTab from "./ClientDocumentsTab.svelte";
    import ClientDetailNetworkTab from "./ClientDetailNetworkTab.svelte";
    import ClientDetailSubmodals from "./ClientDetailSubmodals.svelte";
    import CarepersonSignatureModal from "./CarepersonSignatureModal.svelte";

    let dialog: HTMLDialogElement;
    const s = new ClientDetailState();
    let submodals = $state<ReturnType<typeof ClientDetailSubmodals>>();
    let carepersonSigModal = $state<ReturnType<typeof CarepersonSignatureModal>>();

    let activeTab = $state<ClientDetailTab>('overview');
    let isChangingEmployee = $state(false);
    let isDeleting = $state(false);

    let canDelete = $derived(pb.authStore.isSuperuser || pb.authStore.model?.role === 'developer' || pb.authStore.model?.role === 'superadmin' || pb.authStore.model?.role === 'admin');

    export function open(id: string, initialTab: ClientDetailTab = 'overview') {
        s.init(id);
        activeTab = (initialTab === 'budget' && !rbacService.canAccessFinances) ? 'overview' : initialTab;
        isChangingEmployee = false;
        dialog?.showModal();
    }
    export function close() {
        dialog?.close();
        s.clientId = null;
        isChangingEmployee = false;
    }

    function handleKeyDown(e: KeyboardEvent) {
        if (!dialog?.open) return;
        if (e.key === 'Escape') { close(); return; }
        const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
        const tabMap: Record<string, ClientDetailTab> = {
            '1': 'overview',
            ...(rbacService.canAccessFinances ? { '2': 'budget' as ClientDetailTab } : {}),
            '3': 'appointments',
            '4': 'documents',
            '5': 'network'
        };
        if (tabMap[e.key]) { e.preventDefault(); activeTab = tabMap[e.key]; }
    }

    function handleAiSave(newText: string, type: 'family' | 'internal') {
        const header = `\n\n--- ${type === 'internal' ? 'Interne Notiz' : 'Bericht'} vom ${new Date().toLocaleDateString('de-DE')} ---\n`;
        s.notes = (s.notes ? s.notes.trim() : '') + header + newText.trim();
        s.saveNotes();
    }
    function openNotesEditor() {
        submodals?.openTextEditor(s.notes, async (t: string) => { s.notes = t; await s.saveNotes(); }, {
            title: "Klienten-Notizen",
            subtitle: `${s.client?.name_first || ''} ${s.client?.name_last || ''}`,
            onAiDictate: () => submodals?.openAi('internal')
        });
    }
    async function handleAssignEmployee(empId: string) {
        if (!s.client) return;
        await employeeService.assignEmployeeToClient(s.client.id, empId || null, true);
        isChangingEmployee = false;
    }
    async function handleUnlinkEmployee() {
        if (!s.client) return;
        if (await confirmStore.ask("Zuweisung aufheben?", "Zuweisung aufheben", "Aufheben", "Abbrechen", true)) {
            await employeeService.assignEmployeeToClient(s.client.id, null, false);
            isChangingEmployee = false;
        }
    }
    async function handleDeleteClient() {
        if (!s.client) return;
        if (await confirmStore.ask(`Akte von ${s.client.name_first} ${s.client.name_last} wirklich löschen?`, "Klienten löschen?", "Löschen", "Abbrechen", true)) {
            isDeleting = true;
            try {
                await pb.collection('clients').delete(s.client.id);
                toastStore.success("Klient gelöscht.");
                close();
            } catch (err) { toastStore.error("Fehler beim Löschen."); } finally { isDeleting = false; }
        }
    }
</script>

<svelte:window onkeydown={handleKeyDown} />

<dialog bind:this={dialog} class="zero-inner-scroll-modal p-0 bg-transparent backdrop:bg-slate-950/80 backdrop:backdrop-blur-md w-full max-w-xl sm:max-w-2xl md:max-w-3xl mx-auto my-auto rounded-3xl outline-none border-none shadow-2xl" onclick={(e) => { if (e.target === dialog) close(); }}>
    <div class="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-3xl w-full flex flex-col relative shadow-2xl border border-slate-200/80 dark:border-slate-800">
        <!-- Header with Streamlined Quick Actions & Badges -->
        <ClientDetailHeader
            client={s.client}
            clientId={s.clientId}
            clientAge={s.clientAge}
            clientCompletion={s.clientCompletion}
            {canDelete}
            canEdit={rbacService.canEditClient(s.client)}
            canPlanAppointment={rbacService.canPlanAppointmentForClient(s.client)}
            canCreateInvoice={rbacService.canAccessInvoices}
            {isDeleting}
            onNewAppointment={() => submodals?.openAppointment({ preselectedClient: s.client?.id })}
            onNewInvoice={() => submodals?.openDocGen('', 1, s.client?.id || '', 'rechnung', s.assignedEmployee?.id)}
            onEdit={() => submodals?.openEdit(s.client)}
            onQuickMail={() => submodals?.openQuickMail(s.client)}
            onPortalAccess={() => submodals?.openPortal(s.client)}
            onDelete={handleDeleteClient}
            onClose={close}
        />

        <!-- Compact Tab Bar -->
        <ClientDetailTabBar
            {activeTab}
            onTabChange={(t) => activeTab = t}
            hasBudgetWarning={s.bData.hasBudgetWarning}
            appointmentsCount={s.appointments.length}
            documentsCount={s.totalDocumentsCount}
            networkCount={s.contacts.length + s.retirementHomes.length}
        />

        <!-- Tab Content View (Zero-Inner-Scroll) -->
        <div class="p-3.5 sm:p-5 pb-6 flex-1">
            {#if activeTab === 'overview'}
                <ClientDetailOverviewTab
                    client={s.client}
                    nextAppointment={s.nextAppointment}
                    totalAvailableBudget={s.bData.totalAvailableBudget}
                    currentYear={s.currentYear}
                    openInvoicesCount={s.openInvoices.length}
                    openInvoicesTotal={s.openInvoicesTotal}
                    totalDocumentsCount={s.totalDocumentsCount}
                    uploadedCount={s.uploadedDocuments.length}
                    systemCount={s.systemDocuments.length}
                    careLevel={s.bData.careLevel}
                    assignedEmployee={s.assignedEmployee}
                    availableEmployees={s.availableEmployees}
                    {isChangingEmployee}
                    primaryContactInfo={s.primaryContactInfo}
                    contactsCount={s.contacts.length}
                    bind:notes={s.notes}
                    isNotesSaving={s.isNotesSaving}
                    mailingList={s.mailingList}
                    isMailingListSaving={s.isMailingListSaving}
                    contacts={s.contacts}
                    onTabChange={(t) => activeTab = t}
                    onEdit={() => submodals?.openEdit(s.client)}
                    onAssignEmployee={handleAssignEmployee}
                    onUnlinkEmployee={handleUnlinkEmployee}
                    onToggleChangingEmployee={() => isChangingEmployee = !isChangingEmployee}
                    onInlineUpdate={async (f, v) => { if (s.client) await updateClientField(s.client.id, f, v); }}
                    onOpenNetworkTab={() => activeTab = 'network'}
                    onLinkContact={() => submodals?.openLinkContact()}
                    onOpenNotesEditor={openNotesEditor}
                    onAiDictate={() => submodals?.openAi('internal')}
                    onSaveNotes={() => s.saveNotes()}
                    onAddEmail={(e) => s.addEmail(e)}
                    onRemoveEmail={(e) => s.removeEmail(e)}
                    onOpenContactSignature={(contact, role) => carepersonSigModal?.open(contact, role, s.client)}
                />
            {:else if activeTab === 'budget' && rbacService.canAccessFinances}
                <ClientDetailBudgetTab
                    client={s.client}
                    currentYear={s.currentYear}
                    totalAvailableBudget={s.bData.totalAvailableBudget}
                    hasBudgetWarning={s.bData.hasBudgetWarning}
                    careLevel={s.bData.careLevel}
                    remainingEntlastung={s.bData.remainingEntlastung}
                    usedEntlastungsleistungen={s.bData.usedEntlastung}
                    annualMaxEntlastung={s.bData.annualMaxEntlastung}
                    hasManualEntlastung={s.bData.hasManualEntlastung}
                    entlastungPercent={s.bData.entlastungPercent}
                    remainingVHP={s.bData.remainingVHP}
                    usedGemeinsamerJahresbetrag={s.bData.usedVHP}
                    annualMaxVHP={s.bData.annualMaxVHP}
                    vhpPercent={s.bData.vhpPercent}
                    previousYearRemainingBudget={s.bData.previousYearRemainingBudget}
                    clientInvoices={s.clientInvoices}
                    filteredInvoices={s.filteredInvoices}
                    invoiceFilter={s.invoiceFilter}
                    onOpenBudgetModal={() => submodals?.openBudget(s.client)}
                    onSetInvoiceFilter={(f) => s.invoiceFilter = f}
                    onNewInvoice={() => submodals?.openDocGen('', 1, s.client?.id || '', 'rechnung', s.assignedEmployee?.id)}
                    onOpenInvoiceDetail={(id) => submodals?.openInvoiceDetail(id)}
                />
            {:else if activeTab === 'appointments'}
                <ClientDetailAppointmentsTab
                    client={s.client}
                    appointments={s.appointments}
                    upcomingAppointments={s.upcomingAppointments}
                    filteredAppointments={s.filteredAppointments}
                    appointmentFilter={s.appointmentFilter}
                    appointmentSearch={s.appointmentSearch}
                    onSetFilter={(f) => s.appointmentFilter = f}
                    onSearchChange={(v) => s.appointmentSearch = v}
                    onOpenMultiReminder={() => submodals?.openMultiReminder(s.appointments, s.client)}
                    onNewAppointment={() => submodals?.openAppointment({ preselectedClient: s.client?.id })}
                    onOpenAppointmentDetail={(id) => submodals?.openAppointmentDetail(id)}
                />
            {:else if activeTab === 'documents'}
                <ClientDocumentsTab
                    client={s.client}
                    clientId={s.clientId || ''}
                    systemDocuments={s.systemDocuments}
                    pdfPreviewModal={submodals?.getPdfPreviewModal()}
                    docGenModal={submodals?.getDocGenModal()}
                />
            {:else if activeTab === 'network'}
                <ClientDetailNetworkTab
                    client={s.client}
                    contacts={s.contacts}
                    retirementHomes={s.retirementHomes}
                    getContactRelationData={(cid) => s.client?.contact_relations?.[cid] || null}
                    onLinkContact={() => submodals?.openLinkContact()}
                    onOpenContact={(c) => submodals?.openContact(c)}
                    onEditRelation={(c, r) => submodals?.openRelationEdit(c, r)}
                    onUnlinkContact={async (cid, name) => await unlinkClientContact(s.client, cid, name)}
                    onLinkHome={() => submodals?.openLinkHome()}
                    onOpenHome={(h) => submodals?.openHome(h)}
                    onUnlinkHome={async (hid, name) => await unlinkClientRetirementHome(s.client, hid, name)}
                />
            {/if}
        </div>
    </div>
</dialog>

<ClientDetailSubmodals
    bind:this={submodals}
    client={s.client}
    usedVHP={s.bData.usedVHP}
    usedEntlastung={s.bData.usedEntlastung}
    onAiSave={handleAiSave}
/>

<CarepersonSignatureModal bind:this={carepersonSigModal} />
