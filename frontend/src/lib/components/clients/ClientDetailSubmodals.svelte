<script lang="ts">
    import ClientEditModal from "./ClientEditModal.svelte";
    import AiReportModal from "$lib/components/AiReportModal.svelte";
    import TextEditorModal from "$lib/components/ui/TextEditorModal.svelte";
    import ClientPortalAccessModal from "$lib/components/portal/ClientPortalAccessModal.svelte";
    import QuickAccessMailModal from "$lib/components/portal/QuickAccessMailModal.svelte";
    import ClientBudgetModal from "./ClientBudgetModal.svelte";
    import ClientLinkInsuranceModal from "./ClientLinkInsuranceModal.svelte";
    import ClientLinkContactModal from "./ClientLinkContactModal.svelte";
    import ClientLinkHomeModal from "./ClientLinkHomeModal.svelte";
    import ClientEditContactRelationModal from "./ClientEditContactRelationModal.svelte";
    import AppointmentModal from "$lib/components/AppointmentModal.svelte";
    import AppointmentDetailModal from "$lib/components/AppointmentDetailModal.svelte";
    import ContactModal from "$lib/components/contacts/ContactModal.svelte";
    import RetirementHomeModal from "$lib/components/RetirementHomeModal.svelte";
    import MultiAppointmentReminderModal from "$lib/components/MultiAppointmentReminderModal.svelte";
    import PdfPreviewModal from "$lib/components/PdfPreviewModal.svelte";
    import InvoiceEmailModal from "$lib/components/invoices/InvoiceEmailModal.svelte";
    import DocumentGeneratorModal from "$lib/components/DocumentGeneratorModal.svelte";
    import InvoiceDetailModal from "$lib/components/invoices/InvoiceDetailModal.svelte";

    interface Props {
        client: any;
        usedVHP: number;
        usedEntlastung: number;
        onAiSave: (text: string, type: 'family' | 'internal') => void;
    }

    let { client, usedVHP, usedEntlastung, onAiSave }: Props = $props();

    let editModal = $state<ReturnType<typeof ClientEditModal>>();
    let aiModal = $state<ReturnType<typeof AiReportModal>>();
    let portalAccessModal = $state<ReturnType<typeof ClientPortalAccessModal>>();
    let quickMailModal = $state<ReturnType<typeof QuickAccessMailModal>>();
    let budgetModal = $state<ReturnType<typeof ClientBudgetModal>>();
    let linkInsuranceModal = $state<ReturnType<typeof ClientLinkInsuranceModal>>();
    let linkContactModal = $state<ReturnType<typeof ClientLinkContactModal>>();
    let linkHomeModal = $state<ReturnType<typeof ClientLinkHomeModal>>();
    let relationEditModal = $state<ReturnType<typeof ClientEditContactRelationModal>>();
    let appointmentModal = $state<ReturnType<typeof AppointmentModal>>();
    let appointmentDetailModal = $state<ReturnType<typeof AppointmentDetailModal>>();
    let contactModal = $state<ReturnType<typeof ContactModal>>();
    let homeModal = $state<ReturnType<typeof RetirementHomeModal>>();
    let multiReminderModal = $state<ReturnType<typeof MultiAppointmentReminderModal>>();
    let pdfPreviewModal = $state<ReturnType<typeof PdfPreviewModal>>();
    let emailModal = $state<ReturnType<typeof InvoiceEmailModal>>();
    let docGenModal = $state<ReturnType<typeof DocumentGeneratorModal>>();
    let invoiceDetailModal = $state<ReturnType<typeof InvoiceDetailModal>>();
    let textEditorModal = $state<ReturnType<typeof TextEditorModal>>();

    export function openEdit(c = client) { editModal?.open(c); }
    export function openAi(type: 'family' | 'internal' = 'internal') { aiModal?.open(type); }
    export function openPortal(c = client) { portalAccessModal?.open(c); }
    export function openQuickMail(c = client) { quickMailModal?.open(c); }
    export function openBudget(c = client) { budgetModal?.open(c); }
    export function openLinkContact() { linkContactModal?.open(); }
    export function openLinkHome() { linkHomeModal?.open(); }
    export function openRelationEdit(contact: any, relData: any) { relationEditModal?.open(contact, relData); }
    export function openAppointment(opts?: any) { appointmentModal?.open(opts); }
    export function openAppointmentDetail(id: string) { appointmentDetailModal?.open(id); }
    export function openContact(c: any) { contactModal?.open(c); }
    export function openHome(h: any) { homeModal?.open(h); }
    export function openMultiReminder(apps: any[], c = client) { multiReminderModal?.open(apps, c); }
    export function openDocGen(docId: string, step: number, clientId: string, docType?: string, empId?: string) {
        docGenModal?.open(docId, step, clientId, docType, empId);
    }
    export function openInvoiceDetail(id: string) { invoiceDetailModal?.open(id); }
    export function openTextEditor(text: string, onSave: (t: string) => Promise<void> | void, opts?: any) {
        textEditorModal?.open(text, onSave, opts);
    }

    export function getPdfPreviewModal() { return pdfPreviewModal; }
    export function getDocGenModal() { return docGenModal; }
</script>

{#if client}
    <ClientEditModal bind:this={editModal} {client} />
    <AiReportModal bind:this={aiModal} onSave={onAiSave} />
    <ClientPortalAccessModal bind:this={portalAccessModal} />
    <QuickAccessMailModal bind:this={quickMailModal} />
    <ClientBudgetModal bind:this={budgetModal} usedGemeinsamerJahresbetrag={usedVHP} usedEntlastungsleistungen={usedEntlastung} />
    <ClientLinkInsuranceModal bind:this={linkInsuranceModal} client={client} />
    <ClientLinkContactModal
        bind:this={linkContactModal}
        client={client}
        onCreateNewContact={(onSaved) => contactModal?.open(null, { targetClient: client, onSaved })}
    />
    <ClientLinkHomeModal bind:this={linkHomeModal} client={client} />
    <ClientEditContactRelationModal bind:this={relationEditModal} clientId={client.id} />
    <AppointmentModal bind:this={appointmentModal} />
    <AppointmentDetailModal bind:this={appointmentDetailModal} />
    <ContactModal bind:this={contactModal} />
    <RetirementHomeModal bind:this={homeModal} />
    <MultiAppointmentReminderModal bind:this={multiReminderModal} />
    <PdfPreviewModal bind:this={pdfPreviewModal} />
    <InvoiceEmailModal bind:this={emailModal} />
    <DocumentGeneratorModal bind:this={docGenModal} />
    <InvoiceDetailModal bind:this={invoiceDetailModal} />
    <TextEditorModal bind:this={textEditorModal} />
{/if}
