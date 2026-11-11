<script lang="ts">
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import ClientLinkContactModal from "$lib/components/clients/ClientLinkContactModal.svelte";
    import ClientLinkHomeModal from "$lib/components/clients/ClientLinkHomeModal.svelte";
    import AppointmentModal from "$lib/components/AppointmentModal.svelte";
    import AppointmentDetailModal from "$lib/components/AppointmentDetailModal.svelte";
    import ContactModal from "$lib/components/contacts/ContactModal.svelte";
    import RetirementHomeModal from "$lib/components/RetirementHomeModal.svelte";
    import MultiAppointmentReminderModal from "$lib/components/MultiAppointmentReminderModal.svelte";
    import PdfPreviewModal from "$lib/components/PdfPreviewModal.svelte";
    import InvoiceEmailModal from "$lib/components/invoices/InvoiceEmailModal.svelte";
    import DocumentGeneratorModal from "$lib/components/DocumentGeneratorModal.svelte";
    import ClientEditContactRelationModal from "./ClientEditContactRelationModal.svelte";
    import ClientInvoicesWidget from "./ClientInvoicesWidget.svelte";
    import ClientAppointmentsSection from "./relations/ClientAppointmentsSection.svelte";
    import ClientContactsSection from "./relations/ClientContactsSection.svelte";
    import ClientRetirementHomesSection from "./relations/ClientRetirementHomesSection.svelte";
    import ClientDocumentsSection from "./relations/ClientDocumentsSection.svelte";
    import { pb } from "$lib/services/pocketbase";
    import { rbacService } from "$lib/services/rbacService.svelte";
    import { toastStore } from "$lib/services/toastService.svelte";
    import { confirmStore } from "$lib/services/confirmService.svelte";
    import { hapticFeedback } from "$lib/services/hapticFeedback";

    let { clientId } = $props<{ clientId: string }>();

    let clientData = $derived(orgaStore.clients?.getById(clientId));
    let appointments = $derived((orgaStore.appointments?.data || []).filter((a: any) => Array.isArray(a.client) ? a.client.includes(clientId) : a.client === clientId));
    let contacts = $derived.by(() => {
        const ids = Array.isArray(clientData?.contacts) ? clientData.contacts : (clientData?.contacts ? [clientData.contacts] : []);
        return (orgaStore.contacts?.data || []).filter((c: any) => ids.includes(c.id));
    });
    let retirementHomes = $derived.by(() => {
        const ids = Array.isArray(clientData?.retirement_homes) ? clientData.retirement_homes : (clientData?.retirement_homes ? [clientData.retirement_homes] : []);
        return (orgaStore.retirement_homes?.data || []).filter((h: any) => ids.includes(h.id));
    });
    let documents = $derived((orgaStore.document_templates?.data || []).filter((d: any) => d.client === clientId));

    // Modal references
    // svelte-ignore non_reactive_update
    let linkContactModal: ReturnType<typeof ClientLinkContactModal>;
    // svelte-ignore non_reactive_update
    let linkHomeModal: ReturnType<typeof ClientLinkHomeModal>;
    // svelte-ignore non_reactive_update
    let appointmentModal: ReturnType<typeof AppointmentModal>;
    // svelte-ignore non_reactive_update
    let detailModal: ReturnType<typeof AppointmentDetailModal>;
    // svelte-ignore non_reactive_update
    let contactModal: ReturnType<typeof ContactModal>;
    // svelte-ignore non_reactive_update
    let homeModal: ReturnType<typeof RetirementHomeModal>;
    // svelte-ignore non_reactive_update
    let multiReminderModal: ReturnType<typeof MultiAppointmentReminderModal>;
    // svelte-ignore non_reactive_update
    let pdfPreviewModal: ReturnType<typeof PdfPreviewModal>;
    // svelte-ignore non_reactive_update
    let emailModal: ReturnType<typeof InvoiceEmailModal>;
    // svelte-ignore non_reactive_update
    let docGenModal: ReturnType<typeof DocumentGeneratorModal>;
    // svelte-ignore non_reactive_update
    let relationEditModal: ReturnType<typeof ClientEditContactRelationModal>;

    let isUploading = $state(false);

    async function refreshClient() {
        const updatedClient = await pb.collection('clients').getOne(clientId, { 
            expand: 'insurance,retirement_homes,contacts,caregiver,inheritor', 
            requestKey: null 
        }) as any;
        const index = orgaStore.clients?.data.findIndex((c: any) => c.id === clientId) ?? -1;
        if (index !== -1 && orgaStore.clients) orgaStore.clients.data[index] = updatedClient;
    }

    async function uploadDocuments(e: Event) {
        const input = e.target as HTMLInputElement;
        if (!input.files || input.files.length === 0) return;
        isUploading = true;
        try {
            let currentExistingFiles = [...(clientData?.documents ?? [])];
            let successCount = 0;
            for (let i = 0; i < input.files.length; i++) {
                const file = input.files[i];
                const formData = new FormData();
                for (const existing of currentExistingFiles) { formData.append('documents', existing); }
                formData.append('documents', file);
                const updatedRecord = await pb.collection('clients').update(clientId, formData);
                currentExistingFiles = updatedRecord.documents || [];
                successCount++;
            }
            setTimeout(refreshClient, 400);
            toastStore.success(`${successCount} Dokument(e) erfolgreich hochgeladen.`);
        } catch (err: any) {
            console.error(err);
            toastStore.error(err?.status === 413 ? "Datei zu groß (max. 1MB)." : "Fehler beim Hochladen.");
        } finally {
            isUploading = false;
            input.value = '';
        }
    }

    function previewDocument(e: Event, docFileName: string) {
        e.preventDefault();
        if (!clientData) return;
        let url = pb.files.getURL(clientData as any, docFileName);
        if (pb.authStore.token) url += (url.includes('?') ? '&' : '?') + 'token=' + pb.authStore.token;
        const lowerName = docFileName.toLowerCase();
        if (lowerName.endsWith('.pdf') || /\.(jpg|jpeg|png|gif|webp)$/i.test(lowerName)) {
            pdfPreviewModal?.open(url, 'Klienten-Akte', docFileName);
        } else {
            window.open(url, '_blank');
        }
    }

    async function deleteDocument(filename: string) {
        if (!(await confirmStore.ask(`Möchten Sie das Dokument '${filename}' wirklich löschen?`, "Dokument löschen?", "Löschen", "Abbrechen", true))) return;
        try {
            const existingFiles = clientData?.documents ?? [];
            const formData = new FormData();
            for (const existing of existingFiles) { if (existing !== filename) formData.append('documents', existing); }
            if (existingFiles.length === 1 && existingFiles[0] === filename) formData.append('documents', '');
            await pb.collection('clients').update(clientId, formData);
            setTimeout(refreshClient, 400);
            toastStore.info("Dokument wurde gelöscht.");
        } catch (err) { console.error(err); toastStore.error("Fehler beim Löschen des Dokuments."); }
    }

    async function renameDocument(oldFileName: string) {
        const extMatch = oldFileName.match(/\.([^.]+)$/);
        const ext = extMatch ? `.${extMatch[1]}` : '';
        let baseName = ext ? oldFileName.substring(0, oldFileName.lastIndexOf('.')) : oldFileName;
        baseName = baseName.replace(/_[a-zA-Z0-9]{10}$/, '');

        let newName = prompt("Neuer Dateiname:", baseName);
        if (!newName || !newName.trim()) return;
        newName = newName.trim();
        if (!newName.toLowerCase().endsWith(ext.toLowerCase())) newName += ext;

        isUploading = true;
        try {
            let url = pb.files.getURL(clientData as any, oldFileName);
            if (pb.authStore.token) url += (url.includes('?') ? '&' : '?') + 'token=' + pb.authStore.token;
            const response = await fetch(url);
            if (!response.ok) throw new Error("Datei konnte nicht geladen werden.");
            const blob = await response.blob();
            const newFile = new File([blob], newName, { type: blob.type });

            const existingFiles = clientData?.documents ?? [];
            const formData = new FormData();
            for (const existing of existingFiles) { if (existing !== oldFileName) formData.append('documents', existing); }
            formData.append('documents', newFile);
            await pb.collection('clients').update(clientId, formData);
            setTimeout(refreshClient, 400);
            toastStore.success(`Dokument in '${newName}' umbenannt.`);
        } catch (err) { console.error(err); toastStore.error("Fehler beim Umbenennen."); }
        finally { isUploading = false; }
    }

    async function unlinkContact(contactId: string, contactName: string) {
        if (!(await confirmStore.ask(`Verknüpfung zu "${contactName}" aufheben?`, "Verknüpfung aufheben?", "Aufheben", "Abbrechen", true))) return;
        try {
            const existingIds = Array.isArray(clientData?.contacts) ? clientData.contacts : (clientData?.contacts ? [clientData.contacts] : []);
            const updatedContacts = existingIds.filter((id: string) => id !== contactId);
            const currentRelations = { ...(clientData?.contact_relations || {}) };
            delete currentRelations[contactId];
            await pb.collection('clients').update(clientId, { contacts: updatedContacts, contact_relations: currentRelations });
            setTimeout(refreshClient, 300);
            hapticFeedback.tap();
            toastStore.success(`Verknüpfung zu "${contactName}" aufgehoben.`);
        } catch (err) { console.error(err); toastStore.error("Fehler beim Aufheben der Verknüpfung."); }
    }

    async function unlinkRetirementHome(homeId: string, homeName: string) {
        if (!(await confirmStore.ask(`Verknüpfung zum Pflegeheim "${homeName}" aufheben?`, "Verknüpfung aufheben?", "Aufheben", "Abbrechen", true))) return;
        try {
            const existingIds = Array.isArray(clientData?.retirement_homes) ? clientData.retirement_homes : (clientData?.retirement_homes ? [clientData.retirement_homes] : []);
            await pb.collection('clients').update(clientId, { retirement_homes: existingIds.filter((id: string) => id !== homeId) });
            setTimeout(refreshClient, 300);
            hapticFeedback.tap();
            toastStore.success(`Verknüpfung zu "${homeName}" aufgehoben.`);
        } catch (err) { console.error(err); toastStore.error("Fehler beim Aufheben."); }
    }
</script>

<div class="grid grid-cols-1 md:grid-cols-2 gap-6 h-full content-start">
    <ClientAppointmentsSection 
        {appointments}
        onNewAppointment={() => appointmentModal?.open({ preselectedClient: clientId })}
        onSendReminders={() => multiReminderModal?.open(appointments, clientData)}
        onOpenDetail={(appId) => detailModal?.open(appId)}
    />

    {#if rbacService.canAccessFinances}
        <ClientInvoicesWidget client={clientData} />
    {/if}

    <ClientContactsSection 
        {contacts}
        {clientData}
        onLinkContact={() => linkContactModal?.open()}
        onOpenContact={(c) => contactModal?.open(c)}
        onEditRelation={(c, rel) => relationEditModal?.open(c, rel)}
        onUnlinkContact={unlinkContact}
    />

    <ClientRetirementHomesSection 
        {retirementHomes}
        onLinkHome={() => linkHomeModal?.open()}
        onOpenHome={(h) => homeModal?.open(h)}
        onUnlinkHome={unlinkRetirementHome}
    />

    <ClientDocumentsSection 
        {clientData}
        {documents}
        {isUploading}
        onSendEmail={() => emailModal?.open(clientData, 'documents')}
        onUploadFile={uploadDocuments}
        onOpenDocGen={() => {
            const empId = Array.isArray(clientData?.assigned_employee) ? clientData.assigned_employee[0] : clientData?.assigned_employee;
            docGenModal?.open('', 2, clientId, 'all', empId);
        }}
        onPreviewDoc={previewDocument}
        onRenameDoc={renameDocument}
        onDeleteDoc={deleteDocument}
    />
</div>

<ClientLinkContactModal bind:this={linkContactModal} client={clientData} />
<ClientLinkHomeModal bind:this={linkHomeModal} client={clientData} />
<AppointmentModal bind:this={appointmentModal} />
<AppointmentDetailModal bind:this={detailModal} />
<ContactModal bind:this={contactModal} />
<RetirementHomeModal bind:this={homeModal} />
<MultiAppointmentReminderModal bind:this={multiReminderModal} />
<PdfPreviewModal bind:this={pdfPreviewModal} />
<InvoiceEmailModal bind:this={emailModal} />
<DocumentGeneratorModal bind:this={docGenModal} />
<ClientEditContactRelationModal bind:this={relationEditModal} {clientId} />