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
    import { pb } from "$lib/services/pocketbase";
    import { toastStore } from "$lib/services/toastService.svelte";
    import { confirmStore } from "$lib/services/confirmService.svelte";

    let { clientId } = $props<{ clientId: string }>();

    // Dynamisches Filtern der geladenen Collections auf den aktuellen Klienten
    // Sollten die Tabellen noch keine Daten haben, wird durch `|| []` ein Fehler vermieden.
    
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
    
    let fileInput: HTMLInputElement;
    let isUploading = $state(false);

    async function uploadDocuments(e: Event) {
        const input = e.target as HTMLInputElement;
        if (!input.files || input.files.length === 0) return;
        isUploading = true;
        try {
            let currentExistingFiles = [...(clientData?.documents ?? [])];
            let successCount = 0;
            
            // Dateien einzeln hochladen, um den "413 Payload Too Large" Fehler zu vermeiden
            for (let i = 0; i < input.files.length; i++) {
                const file = input.files[i];
                const formData = new FormData();
                
                for (const existing of currentExistingFiles) {
                    formData.append('documents', existing);
                }
                formData.append('documents', file);
                
                const updatedRecord = await pb.collection('clients').update(clientId, formData);
                currentExistingFiles = updatedRecord.documents || [];
                successCount++;
            }
            
            setTimeout(async () => {
                const updatedClient = await pb.collection('clients').getOne(clientId, { expand: 'insurance,retirement_homes,contacts', requestKey: null }) as any;
                const index = orgaStore.clients?.data.findIndex((c: any) => c.id === clientId) ?? -1;
                if (index !== -1 && orgaStore.clients) orgaStore.clients.data[index] = updatedClient;
            }, 400);
            
            toastStore.success(`${successCount} Dokument(e) erfolgreich hochgeladen.`);
        } catch (err: any) {
            console.error(err);
            if (err?.status === 413 || err?.message?.includes('413')) {
                toastStore.error("Datei zu groß! Der Webserver blockiert Uploads über 1MB. Bitte Server-Limit anpassen.");
            } else {
                toastStore.error("Fehler beim Hochladen. Bitte überprüfen Sie Ihre Internetverbindung.");
            }
        } finally {
            isUploading = false;
            input.value = '';
        }
    }

    function previewDocument(e: Event, docFileName: string) {
        e.preventDefault();
        if (!clientData) return;
        const url = pb.files.getURL(clientData as any, docFileName);
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
            setTimeout(async () => {
                const updatedClient = await pb.collection('clients').getOne(clientId, { expand: 'insurance,retirement_homes,contacts', requestKey: null }) as any;
                const index = orgaStore.clients?.data.findIndex((c: any) => c.id === clientId) ?? -1;
                if (index !== -1 && orgaStore.clients) orgaStore.clients.data[index] = updatedClient;
            }, 400);
            toastStore.info("Dokument wurde gelöscht.");
        } catch (err) { console.error(err); toastStore.error("Fehler beim Löschen des Dokuments."); }
    }

    async function renameDocument(oldFileName: string) {
        // Extrahieren der Endung und des Basisnamens
        const extMatch = oldFileName.match(/\.([^.]+)$/);
        const ext = extMatch ? `.${extMatch[1]}` : '';
        let baseName = oldFileName;
        if (ext) baseName = oldFileName.substring(0, oldFileName.lastIndexOf('.'));
        
        // PocketBase Hash (_xxxxxxxxxx) am Ende des Namens entfernen, damit es schöner aussieht
        const pbHashRegex = /_[a-zA-Z0-9]{10}$/;
        if (pbHashRegex.test(baseName)) baseName = baseName.replace(pbHashRegex, '');

        let newName = prompt("Neuer Dateiname:", baseName);
        if (newName === null) return;
        
        newName = newName.trim();
        if (!newName) {
            toastStore.warning("Dateiname darf nicht leer sein.");
            return;
        }
        
        // Endung wieder anhängen, falls sie vom Nutzer gelöscht wurde
        if (!newName.toLowerCase().endsWith(ext.toLowerCase())) newName += ext;

        isUploading = true;
        try {
            // Dokument im Hintergrund herunterladen und neu benennen
            let url = pb.files.getURL(clientData as any, oldFileName);
            if (pb.authStore.token) url += (url.includes('?') ? '&' : '?') + 'token=' + pb.authStore.token;
            
            const response = await fetch(url);
            if (!response.ok) throw new Error("Datei konnte nicht geladen werden.");
            
            const blob = await response.blob();
            const newFile = new File([blob], newName, { type: blob.type });

            // Arrays im PocketBase-Format aktualisieren (alle bestehenden behalten, das alte weglassen, das neue hinzufügen)
            const existingFiles = clientData?.documents ?? [];
            const formData = new FormData();
            for (const existing of existingFiles) { if (existing !== oldFileName) formData.append('documents', existing); }
            formData.append('documents', newFile);
            
            await pb.collection('clients').update(clientId, formData);
            
            setTimeout(async () => {
                const updatedClient = await pb.collection('clients').getOne(clientId, { expand: 'insurance,retirement_homes,contacts', requestKey: null }) as any;
                const index = orgaStore.clients?.data.findIndex((c: any) => c.id === clientId) ?? -1;
                if (index !== -1 && orgaStore.clients) orgaStore.clients.data[index] = updatedClient;
            }, 400);
            
            toastStore.success(`Dokument erfolgreich in '${newName}' umbenannt.`);
        } catch (err) { 
            console.error(err); 
            toastStore.error("Fehler beim Umbenennen des Dokuments."); 
        } finally {
            isUploading = false;
        }
    }
</script>

<div class="grid grid-cols-1 md:grid-cols-2 gap-8 h-full content-start">
    
    <!-- Termine Section -->
    <div class="orga-card-white flex flex-col p-0!">
        <div class="p-6 border-b border-neutral-100 flex flex-wrap items-center justify-between gap-3 bg-neutral-50/50">
            <h3 class="text-base font-bold text-neutral-900 flex items-center gap-2">
                <span class="w-8 h-8 flex items-center justify-center bg-indigo-100 text-indigo-600 rounded-lg shadow-inner text-sm">📅</span> Termine
            </h3>
            <div class="flex items-center gap-2 shrink-0">
                <button onclick={() => multiReminderModal?.open(appointments, clientData)} aria-label="Termine bestätigen" title="Terminübersicht versenden" class="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-neutral-200 text-neutral-600 hover:text-indigo-600 hover:border-indigo-200 transition-colors shadow-sm">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                </button>
                <button onclick={() => appointmentModal?.open({ preselectedClient: clientId })} aria-label="Termin hinzufügen" title="Neuer Termin" class="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-neutral-200 text-neutral-600 hover:text-indigo-600 hover:border-indigo-200 transition-colors shadow-sm">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg>
                </button>
            </div>
        </div>
        <div class="flex-1 max-h-80 overflow-y-auto custom-scrollbar">
            {#if appointments.length === 0}
                <div class="text-center py-8 px-6">
                    <p class="text-neutral-400 text-sm mb-3">Keine anstehenden Termine.</p>
                    <button onclick={() => appointmentModal?.open({ preselectedClient: clientId })} class="text-indigo-600 hover:text-indigo-800 text-sm font-bold transition-colors">Jetzt planen &rarr;</button>
                </div>
            {:else}
                <div class="divide-y divide-neutral-100">
                    {#each appointments as app}
                        <button type="button" onclick={() => detailModal?.open(app.id)} class="w-full text-left group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 hover:bg-indigo-50/50 transition-colors cursor-pointer">
                            <div class="flex items-start gap-3 min-w-0 flex-1">
                                <div class="w-2.5 h-2.5 mt-1.5 rounded-full {app.settled ? 'bg-emerald-400' : 'bg-amber-400'} group-hover:scale-125 transition-transform shadow-sm shrink-0"></div>
                                <div class="min-w-0 flex-1">
                                    <p class="text-sm font-bold text-neutral-900 leading-snug truncate">{app.description || 'Termin ohne Beschreibung'}</p>
                                    
                                    <div class="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-neutral-500 mt-1">
                                        <div class="flex items-center gap-1.5 font-medium">
                                            <span class="text-sm leading-none">🕒</span>
                                            {#if app.appointment}
                                                {new Date(app.appointment).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })}, {new Date(app.appointment).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr
                                            {:else}
                                                Kein Datum
                                            {/if}
                                        </div>
                                        
                                        {#if app.is_private}
                                            <div class="flex items-center gap-1 text-rose-600 font-bold">
                                                <span class="leading-none">🔒</span> Privat
                                            </div>
                                        {/if}
                                        {#if app.is_series}
                                            <div class="flex items-center gap-1 text-indigo-600 font-bold">
                                                <span class="leading-none">🔁</span> Serie
                                            </div>
                                        {/if}
                                    </div>

                                    <!-- Backtracking: Visuelle Indikatoren für verbundene Daten (expand) -->
                            {#if app.expand?.time_record || app.expand?.drive_record || app.expand?.tasks || app.expand?.expenditures}
                                        <div class="flex gap-1.5 mt-2 flex-wrap">
                                        {#if app.expand?.time_record}
                                            <span class="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-md flex items-center gap-1 shadow-sm">⏱️ Zeit</span>
                                        {/if}
                                        {#if app.expand?.drive_record}
                                            <span class="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-md flex items-center gap-1 shadow-sm">🚗 Fahrt</span>
                                        {/if}
                                        {#if app.expand?.tasks}
                                            <span class="text-[10px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-md flex items-center gap-1 shadow-sm">📋 Tasks</span>
                                        {/if}
                                        {#if app.expand?.expenditures}
                                            <span class="text-[10px] font-bold bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded-md flex items-center gap-1 shadow-sm">💶 Ausgaben</span>
                                        {/if}
                                    </div>
                                {/if}
                                </div>
                            </div>
                            
                            {#if app.settled}
                                <div class="shrink-0 self-start sm:self-center pl-5 sm:pl-0">
                                    <span class="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">✓ Abgerechnet</span>
                                </div>
                            {/if}
                        </button>
                    {/each}
                </div>
            {/if}
        </div>
    </div>

    <!-- Kontakte Section -->
    <div class="orga-card-white flex flex-col p-0!">
        <div class="p-6 border-b border-neutral-100 flex flex-wrap items-center justify-between gap-3 bg-neutral-50/50">
            <h3 class="text-base font-bold text-neutral-900 flex items-center gap-2">
                <span class="w-8 h-8 flex items-center justify-center bg-emerald-100 text-emerald-600 rounded-lg shadow-inner text-sm">👥</span> Bezugspersonen
            </h3>
            <button onclick={() => linkContactModal?.open()} aria-label="Kontakt verknüpfen" title="Kontakt verknüpfen" class="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-neutral-200 text-neutral-600 hover:text-emerald-600 hover:border-emerald-200 transition-colors shadow-sm shrink-0">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg>
            </button>
        </div>
        <div class="p-6 flex-1 max-h-80 overflow-y-auto custom-scrollbar">
            {#if contacts.length === 0}
                <div class="text-center py-6">
                    <p class="text-neutral-400 text-sm mb-3">Keine Kontakte hinterlegt.</p>
                    <button onclick={() => linkContactModal?.open()} class="text-emerald-600 hover:text-emerald-800 text-sm font-bold transition-colors">Jetzt verknüpfen &rarr;</button>
                </div>
            {:else}
                <ul class="space-y-4">
                    {#each contacts as contact}
                        <button type="button" onclick={() => contactModal?.open(contact)} class="w-full text-left flex items-center gap-3 p-3 rounded-xl hover:bg-indigo-50/50 transition-colors border border-neutral-100 hover:border-indigo-200 cursor-pointer group shadow-sm hover:shadow-md">
                            <div class="w-10 h-10 rounded-full bg-neutral-200 flex items-center justify-center text-neutral-600 font-bold text-sm shrink-0 shadow-inner">
                                {(contact.name_first?.charAt(0) || contact.company_name?.charAt(0) || '?').toUpperCase()}
                            </div>
                            <div class="flex-1 min-w-0">
                                <p class="text-sm font-bold text-neutral-900 truncate">
                                    {#if contact.name_first || contact.name_last}{contact.name_first} {contact.name_last}{:else}{contact.company_name || 'Unbekannt'}{/if}
                                </p>
                                {#if contact.company_name && (contact.name_first || contact.name_last)}
                                    <p class="text-xs text-neutral-500 mt-0.5 truncate">{contact.company_name}</p>
                                {/if}
                            </div>
                            <div class="opacity-0 group-hover:opacity-100 transition-opacity text-indigo-600 px-2 text-xs font-bold uppercase tracking-wider">Details</div>
                        </button>
                    {/each}
                </ul>
            {/if}
        </div>
    </div>

    <!-- Pflegeheime Section -->
    <div class="orga-card-white flex flex-col p-0!">
        <div class="p-6 border-b border-neutral-100 flex flex-wrap items-center justify-between gap-3 bg-neutral-50/50">
            <h3 class="text-base font-bold text-neutral-900 flex items-center gap-2">
                <span class="w-8 h-8 flex items-center justify-center bg-teal-100 text-teal-600 rounded-lg shadow-inner text-sm">🏥</span> Pflegeheime
            </h3>
            <button onclick={() => linkHomeModal?.open()} aria-label="Pflegeheim verknüpfen" title="Pflegeheim verknüpfen" class="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-neutral-200 text-neutral-600 hover:text-teal-600 hover:border-teal-200 transition-colors shadow-sm shrink-0">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg>
            </button>
        </div>
        <div class="p-6 flex-1 max-h-80 overflow-y-auto custom-scrollbar">
            {#if retirementHomes.length === 0}
                <div class="text-center py-6">
                    <p class="text-neutral-400 text-sm mb-3">Keine Pflegeheime verknüpft.</p>
                    <button onclick={() => linkHomeModal?.open()} class="text-teal-600 hover:text-teal-800 text-sm font-bold transition-colors">Jetzt verknüpfen &rarr;</button>
                </div>
            {:else}
                <ul class="space-y-4">
                    {#each retirementHomes as home}
                        <button type="button" onclick={() => homeModal?.open(home)} class="w-full text-left flex items-center gap-3 p-3 rounded-xl hover:bg-teal-50/50 transition-colors border border-neutral-100 hover:border-teal-200 cursor-pointer group shadow-sm hover:shadow-md">
                            <div class="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600 font-bold text-lg shrink-0 shadow-inner">🏥</div>
                            <div class="flex-1 min-w-0">
                                <p class="text-sm font-bold text-neutral-900 truncate">{home.name}</p>
                                <p class="text-xs text-neutral-500 mt-0.5 truncate">{home.address || 'Keine Adresse'}</p>
                            </div>
                            <div class="opacity-0 group-hover:opacity-100 transition-opacity text-teal-600 px-2 text-xs font-bold uppercase tracking-wider">Details</div>
                        </button>
                    {/each}
                </ul>
            {/if}
        </div>
    </div>

    <!-- Dokumente Section -->
    <div class="orga-card-white flex flex-col p-0!">
        <div class="p-6 border-b border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-neutral-50/50">
            <h3 class="text-base font-bold text-neutral-900 flex items-center gap-2">
                <span class="w-8 h-8 flex items-center justify-center bg-amber-100 text-amber-600 rounded-lg shadow-inner text-sm">📄</span> Dokumente & Akte
            </h3>
            <div class="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <button onclick={() => emailModal?.open(clientData, 'documents')} class="orga-button-ghost py-1.5 px-3 text-xs font-bold hidden sm:block flex-1 sm:flex-none" title="Dokumente per E-Mail versenden">
                    ✉️ Senden
                </button>
                <input type="file" multiple bind:this={fileInput} onchange={uploadDocuments} class="hidden" disabled={isUploading} accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" />
                <button onclick={() => fileInput.click()} disabled={isUploading} class="orga-button-ghost py-1.5 px-3 text-xs font-bold flex-1 sm:flex-none" title="Einfache Datei hochladen">
                    {isUploading ? 'Lädt...' : '📎 Hochladen'}
                </button>
            <button onclick={() => docGenModal?.open('', 2, clientId)} class="orga-button-primary py-1.5 px-3 text-xs font-bold bg-neutral-900 hover:bg-neutral-800 shadow-neutral-900/20 flex-1 sm:flex-none" title="Dokument aus Vorlage generieren">
                ✨ Aus Vorlage
                </button>
            </div>
        </div>
        <div class="p-6 max-h-80 overflow-y-auto custom-scrollbar">
        {#if documents.length === 0 && (!clientData?.documents || clientData.documents.length === 0)}
                <div class="text-center py-10 border-2 border-dashed border-neutral-200 rounded-2xl bg-neutral-50/50">
                    <span class="text-3xl mb-2 block opacity-80">📂</span>
                    <p class="text-neutral-500 font-bold text-sm mb-1">Die Akte ist noch leer.</p>
                <p class="text-neutral-400 text-xs">Laden Sie Scans (PDF/Bilder) hoch oder erstellen Sie Vorlagen.</p>
                </div>
            {:else}
                <div class="space-y-6">
                    {#if clientData?.documents && clientData.documents.length > 0}
                        <div>
                        <h4 class="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">Hinterlegte Dokumente</h4>
                            <div class="grid grid-cols-1 gap-2">
                                {#each clientData.documents as docFileName}
                                    <div class="group flex items-center justify-between p-3 rounded-xl border border-neutral-100 hover:border-amber-200 hover:bg-amber-50/30 transition-all shadow-sm hover:shadow-md">
                                        <button type="button" onclick={(e) => previewDocument(e, docFileName)} class="flex items-center gap-3 min-w-0 flex-1 text-left">
                                            <div class="text-xl shrink-0 opacity-80 group-hover:scale-110 transition-transform duration-300">{docFileName.toLowerCase().endsWith('.pdf') ? '📕' : '🖼️'}</div>
                                            <div class="truncate"><p class="text-sm font-bold text-neutral-900 truncate" title={docFileName}>{docFileName}</p></div>
                                        </button>
                                <div class="flex items-center gap-1 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                            <button onclick={() => renameDocument(docFileName)} disabled={isUploading} class="p-2 text-neutral-400 hover:text-indigo-600 transition-colors disabled:opacity-50" title="Umbenennen"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                                            <button onclick={() => deleteDocument(docFileName)} disabled={isUploading} class="p-2 text-neutral-400 hover:text-rose-500 transition-colors disabled:opacity-50" title="Löschen"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                                        </div>
                                    </div>
                                {/each}
                            </div>
                        </div>
                    {/if}

                    {#if documents.length > 0}
                        <div>
                            <h4 class="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">System-Vorlagen</h4>
                            <div class="grid grid-cols-1 gap-2">
                                {#each documents as doc}
                            <a href="/documents/{doc.id}" class="group flex items-center gap-3 p-3 rounded-xl border border-neutral-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all cursor-pointer shadow-sm hover:shadow-md"><div class="text-xl shrink-0 opacity-80 group-hover:scale-110 transition-transform duration-300">📄</div><div class="flex-1 min-w-0"><p class="text-sm font-bold text-neutral-900 truncate">{doc.title || 'Dokument'}</p><p class="text-[10px] text-neutral-500 mt-0.5">{doc.created ? new Date(doc.created).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Unbekannt'}</p></div><span class="text-indigo-600 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity shrink-0"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" /></svg></span></a>
                                {/each}
                            </div>
                        </div>
                    {/if}
                </div>
            {/if}
        </div>
    </div>
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