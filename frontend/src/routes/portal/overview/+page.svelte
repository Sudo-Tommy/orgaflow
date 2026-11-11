<script lang="ts">
    import { onMount } from "svelte";
    import PortalAppointmentDetail from "$lib/components/portal/PortalAppointmentDetail.svelte";
    import PortalCalendarGrid from "$lib/components/portal/PortalCalendarGrid.svelte";
    import PortalInvoiceList from "$lib/components/portal/PortalInvoiceList.svelte";
    import PortalDocumentList from "$lib/components/portal/PortalDocumentList.svelte";
    import PdfPreviewModal from "$lib/components/PdfPreviewModal.svelte";
    import LandingAppointmentModal from "$lib/components/LandingAppointmentModal.svelte";
    import FeedbackModal from "$lib/components/feedback/FeedbackModal.svelte";
    import PortalProfileModal from "$lib/components/portal/PortalProfileModal.svelte";
    import PortalNewClientModal from "$lib/components/portal/PortalNewClientModal.svelte";
    import PortalClientEditModal from "$lib/components/portal/PortalClientEditModal.svelte";
    import PortalContactModal from "$lib/components/portal/PortalContactModal.svelte";
    import PortalOverviewHeader from "$lib/components/portal/PortalOverviewHeader.svelte";
    import PortalOverviewDashboard from "$lib/components/portal/PortalOverviewDashboard.svelte";
    import PortalClientContactsView from "$lib/components/portal/PortalClientContactsView.svelte";
    import PortalMailingListDialog from "$lib/components/portal/PortalMailingListDialog.svelte";
    import PortalHistoryDialog from "$lib/components/portal/PortalHistoryDialog.svelte";
    import { usePortalOverviewController } from "$lib/components/portal/usePortalOverviewController.svelte";

    const ctrl = usePortalOverviewController();

    let pdfPreviewModal = $state<ReturnType<typeof PdfPreviewModal>>();
    let appointmentModal = $state<ReturnType<typeof LandingAppointmentModal>>();
    let feedbackModal = $state<ReturnType<typeof FeedbackModal>>();
    let profileModal = $state<ReturnType<typeof PortalProfileModal>>();
    let newClientModal = $state<ReturnType<typeof PortalNewClientModal>>();
    let clientEditModal = $state<ReturnType<typeof PortalClientEditModal>>();
    let contactModal = $state<ReturnType<typeof PortalContactModal>>();
    let mailingDialog = $state<ReturnType<typeof PortalMailingListDialog>>();
    let historyDialog = $state<ReturnType<typeof PortalHistoryDialog>>();

    onMount(() => { ctrl.parseUserFromAuth(); });

    function openAppointmentModal(targetClient?: any) {
        const cl = targetClient || ctrl.activeClientRecord || (ctrl.myClients.length > 0 ? ctrl.myClients[0] : null);
        const compId = Array.isArray(cl?.company) ? cl.company[0] : cl?.company;
        appointmentModal?.open({
            clientId: cl?.id,
            clientName: cl ? `${cl.name_first || ''} ${cl.name_last || ''}`.trim() || cl.name : undefined,
            companyId: compId,
            role: (ctrl.userType === 'contact' ? 'contact' : (ctrl.myClients.length > 1 ? 'caregiver' : 'client')) as any,
            senderName: `${ctrl.userFirstName} ${ctrl.userLastName}`.trim() || ctrl.userName,
            email: ctrl.userEmail,
            availableClients: ctrl.myClients.map(c => ({ 
                id: c.id, 
                name: `${c.name_first || ''} ${c.name_last || ''}`.trim() || c.name, 
                company: Array.isArray(c.company) ? c.company[0] : c.company 
            }))
        });
    }
</script>

<svelte:head><title>Übersicht - Klienten-Portal</title></svelte:head>

<div class="w-full max-w-5xl mx-auto animate-enter pb-10">
    <PortalOverviewHeader formalGreeting={ctrl.formalGreeting} userType={ctrl.userType} bind:activeTab={ctrl.activeTab} overdueInvoicesCount={ctrl.overdueInvoices.length} documentsCount={ctrl.documents.length} onOpenProfile={() => profileModal?.open()} onOpenMailingList={() => mailingDialog?.open()} onLogout={ctrl.handleLogout} />

    {#if ctrl.errorMsg}
        <div class="bg-rose-50 text-rose-700 p-5 rounded-2xl mb-8 text-sm font-bold border border-rose-200 flex items-center gap-3"><span>⚠️</span> {ctrl.errorMsg}</div>
    {/if}

    {#if ctrl.isLoading}
        <div class="flex flex-col items-center justify-center py-24 animate-pulse">
            <div class="w-14 h-14 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-5"></div>
            <p class="text-slate-600 font-medium">Lade Ihre persönliche Übersicht...</p>
        </div>
    {:else if ctrl.activeTab === 'overview'}
        <PortalOverviewDashboard nextAppointment={ctrl.nextAppointment} nextClientName={ctrl.nextClientName} userType={ctrl.userType} pastAppointments={ctrl.pastAppointments} onSelectAppointment={(app) => ctrl.selectedAppointment = app} onRequestAppointment={() => openAppointmentModal()} onOpenNewClient={() => newClientModal?.open()} onNavigateTab={(t) => ctrl.activeTab = t} onOpenHistory={() => historyDialog?.open()} />
    {:else if ctrl.activeTab === 'calendar'}
        <PortalCalendarGrid visibleAppointments={ctrl.appointments} onSelectAppointment={(app) => ctrl.selectedAppointment = app} onRequestAppointment={() => openAppointmentModal()} />
    {:else if ctrl.activeTab === 'invoices'}
        <PortalInvoiceList invoices={ctrl.invoices} companyInfo={ctrl.companyInfo} onPreview={(url, title, file) => pdfPreviewModal?.open(url, title, file)} />
    {:else if ctrl.activeTab === 'documents'}
        <PortalDocumentList documents={ctrl.documents} myClients={ctrl.myClients} userType={ctrl.userType} onPreview={(url, title, file) => pdfPreviewModal?.open(url, title, file)} onRefresh={ctrl.loadData} />
    {:else if ctrl.activeTab === 'clients'}
        <PortalClientContactsView
            myClients={ctrl.myClients}
            filteredMyClients={ctrl.filteredMyClients}
            bind:selectedContactClientId={ctrl.selectedContactClientId}
            bind:clientSearchQuery={ctrl.clientSearchQuery}
            activeClientRecord={ctrl.activeClientRecord}
            appointments={ctrl.appointments}
            onSelectAppointment={(app) => ctrl.selectedAppointment = app}
            onRequestAppointment={() => openAppointmentModal(ctrl.activeClientRecord)}
            onEditClient={(c) => clientEditModal?.open(c)}
            onAddContact={() => contactModal?.open(ctrl.activeClientRecord?.id)}
            onEditContact={(c) => contactModal?.open(ctrl.activeClientRecord?.id, c)}
            onDeleteContact={(id) => ctrl.deletePortalContact(ctrl.activeClientRecord?.id, id)}
        />
    {/if}
</div>

{#if ctrl.selectedAppointment}
    <PortalAppointmentDetail appointment={ctrl.selectedAppointment} onClose={() => ctrl.selectedAppointment = null} isContactMode={true} />
{/if}

<PdfPreviewModal bind:this={pdfPreviewModal} />
<LandingAppointmentModal bind:this={appointmentModal} />
<FeedbackModal bind:this={feedbackModal} />
<PortalProfileModal bind:this={profileModal} />
<PortalNewClientModal bind:this={newClientModal} />
<PortalClientEditModal bind:this={clientEditModal} onSave={ctrl.loadData} />
<PortalContactModal bind:this={contactModal} onSave={ctrl.loadData} />
<PortalMailingListDialog bind:this={mailingDialog} userEmail={ctrl.userEmail} apiBaseUrl={ctrl.apiBaseUrl} getAuthToken={ctrl.getAuthToken} />
<PortalHistoryDialog bind:this={historyDialog} pastAppointments={ctrl.pastAppointments} userType={ctrl.userType} onSelectAppointment={(app) => ctrl.selectedAppointment = app} />
