<script lang="ts">
    import DriveRecordModal from "$lib/components/DriveRecordModal.svelte";
    import ExpenditureModal from "$lib/components/ExpenditureModal.svelte";
    import AppointmentModal from "$lib/components/AppointmentModal.svelte";
    import MultiAppointmentReminderModal from "$lib/components/MultiAppointmentReminderModal.svelte";
    import TimeRecordModal from "$lib/components/TimeRecordModal.svelte";
    import AiReportModal from "$lib/components/AiReportModal.svelte";
    import ClientDetailModal from "$lib/components/clients/ClientDetailModal.svelte";
    import FollowUpAppointmentModal from "$lib/components/FollowUpAppointmentModal.svelte";
    import PdfPreviewModal from "$lib/components/PdfPreviewModal.svelte";
    import AppointmentRequestDetailModal from "./AppointmentRequestDetailModal.svelte";
    import AppointmentRequestsModal from "$lib/components/AppointmentRequestsModal.svelte";
    import AppointmentCancelModal from "./AppointmentCancelModal.svelte";

    interface Props {
        appointment: any;
        onRefresh: () => void;
        onBeforeEdit?: () => void;
        onReopenAfterEdit?: () => void;
        onAiSave: (text: string, type: 'family' | 'internal', blobs?: Blob[]) => void;
    }

    let { appointment, onRefresh, onBeforeEdit, onReopenAfterEdit, onAiSave }: Props = $props();

    let driveModal: ReturnType<typeof DriveRecordModal>;
    let expenditureModal: ReturnType<typeof ExpenditureModal>;
    let editModal: ReturnType<typeof AppointmentModal>;
    let timeModal: ReturnType<typeof TimeRecordModal>;
    let reminderModal: ReturnType<typeof MultiAppointmentReminderModal>;
    let aiModal: ReturnType<typeof AiReportModal>;
    let clientDetailModal: ReturnType<typeof ClientDetailModal>;
    let followUpModal: ReturnType<typeof FollowUpAppointmentModal>;
    let pdfPreviewModal: ReturnType<typeof PdfPreviewModal>;
    let requestDetailModal: ReturnType<typeof AppointmentRequestDetailModal>;
    let allRequestsModal: ReturnType<typeof AppointmentRequestsModal>;
    let cancelModal: ReturnType<typeof AppointmentCancelModal>;

    export function openDrive(record?: any) { driveModal?.open(record); }
    export function openExpenditure(exp?: any) { expenditureModal?.open(exp); }
    export function openEdit(app?: any) {
        onBeforeEdit?.();
        editModal?.open(app || appointment);
    }
    export function openTime(record?: any) { timeModal?.open(record); }
    export function openReminder(app: any, client: any, initialType?: any) { reminderModal?.open(app, client, initialType); }
    export function openAi(type: 'family' | 'internal', app: any, client: any) { aiModal?.open(type, app, client); }
    export function openClient(id: string) { clientDetailModal?.open(id); }
    export function openFollowUp(app: any) { followUpModal?.open(app); }
    export function openPdf(url: string, title: string, filename: string) { pdfPreviewModal?.open(url, title, filename); }
    export function openRequest(app?: any) { requestDetailModal?.open(app || appointment); }
    export function openAllRequests() { allRequestsModal?.open(); }
    export function openCancel() { cancelModal?.open(); }

    function handleEditSaved() {
        onRefresh();
        onReopenAfterEdit?.();
    }

    function handleEditClosed() {
        onReopenAfterEdit?.();
    }
</script>

<DriveRecordModal bind:this={driveModal} {appointment} />
<ExpenditureModal bind:this={expenditureModal} {appointment} onSaved={onRefresh} />
<AppointmentModal bind:this={editModal} onSaved={handleEditSaved} onClose={handleEditClosed} />
<TimeRecordModal bind:this={timeModal} {appointment} onSaved={onRefresh} />
<MultiAppointmentReminderModal bind:this={reminderModal} />
<AiReportModal bind:this={aiModal} onSave={onAiSave} />
<ClientDetailModal bind:this={clientDetailModal} />
<FollowUpAppointmentModal bind:this={followUpModal} />
<PdfPreviewModal bind:this={pdfPreviewModal} />
<AppointmentRequestDetailModal bind:this={requestDetailModal} onOpenAllRequests={openAllRequests} />
<AppointmentRequestsModal bind:this={allRequestsModal} />
<AppointmentCancelModal bind:this={cancelModal} {appointment} onSaved={onRefresh} />

