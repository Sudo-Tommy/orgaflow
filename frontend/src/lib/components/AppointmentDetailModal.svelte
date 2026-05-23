<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import DriveRecordModal from "$lib/components/DriveRecordModal.svelte";
    import ExpenditureModal from "$lib/components/ExpenditureModal.svelte";
    import AppointmentModal from "$lib/components/AppointmentModal.svelte";
    import AppointmentReminderModal from "$lib/components/AppointmentReminderModal.svelte";
    import TimeRecordModal from "$lib/components/TimeRecordModal.svelte";
    import AiReportModal from "$lib/components/AiReportModal.svelte";
    import ClientDetailModal from "$lib/components/ClientDetailModal.svelte";
    import { toastStore } from "$lib/services/toastService.svelte";
    import { confirmStore } from "$lib/services/confirmService.svelte";

    let dialog: HTMLDialogElement;
    let appId = $state<string | null>(null);
    let appointment = $derived(appId ? orgaStore.appointments?.getById(appId) : null);

    let client = $derived(appointment?.expand?.client?.[0] || null);
    let fullClient = $derived(client ? orgaStore.clients?.getById(client.id) : null);
    let timeRecords = $derived(appointment?.expand?.time_record || []);
    let runningTimeRecord = $derived(timeRecords.find((r: any) => r.start && !r.end));
    let driveRecords = $derived(appointment?.expand?.drive_record || []);
    let tasks = $derived(appointment?.expand?.tasks || []);
    let expenditures = $derived(appointment?.expand?.expenditures || []);
    let isSuperAdmin = $derived(pb.authStore.isSuperuser || pb.authStore.model?.role === 'superadmin' || pb.authStore.model?.role === 'admin');

    function getDuration(startStr: string, endStr: string) {
        if (!startStr || !endStr) return "-";
        const diffMs = new Date(endStr).getTime() - new Date(startStr).getTime();
        if (diffMs < 0) return "Fehlerhafte Zeiten";
        const diffMins = Math.round(diffMs / 60000);
        const hours = Math.floor(diffMins / 60);
        const mins = diffMins % 60;
        if (hours === 0) return `${mins} min`;
        return `${hours}h ${mins}m`;
    }

    let totalKm = $derived(driveRecords.reduce((sum: number, r: any) => sum + (r.km || 0), 0));
    let totalExpenditure = $derived(expenditures.reduce((sum: number, e: any) => sum + (e.sum || 0), 0));

    /** @type {ReturnType<typeof DriveRecordModal>} */
    let driveModal = $state() as any;
    /** @type {ReturnType<typeof ExpenditureModal>} */
    let expenditureModal = $state() as any;
    /** @type {ReturnType<typeof AppointmentModal>} */
    let editModal = $state() as any;
    /** @type {ReturnType<typeof TimeRecordModal>} */
    let timeModal = $state() as any;
    /** @type {ReturnType<typeof AppointmentReminderModal>} */
    let reminderModal = $state() as any;
    /** @type {ReturnType<typeof AiReportModal>} */
    let aiModal = $state() as any;
    /** @type {ReturnType<typeof ClientDetailModal>} */
    let clientDetailModal = $state() as any;

    let currentAppIdForReport = $state<string | null>(null);
    let report = $state("");
    let notes = $state("");
    let isReportSaving = $state(false);
    // svelte-ignore non_reactive_update
    let audioInput: HTMLInputElement;
    let activeNoteTab = $state<'family' | 'internal'>('internal');

    let isTimeLoading = $state(false);

    // svelte-ignore non_reactive_update
    let taskDialog: HTMLDialogElement;
    let newTaskTitle = $state("");
    let newTaskDescription = $state("");
    let isTaskLoading = $state(false);

    $effect(() => {
        if (appointment && appointment.id !== currentAppIdForReport) {
            report = appointment.report || "";
            notes = appointment.notes || appointment.internal_notes || "";
            currentAppIdForReport = appointment.id;
        }
    });

    export function open(id: string) {
        appId = id;
        dialog?.showModal();
    }

    async function updateAppointmentStore() {
        if (!appointment) return;
        setTimeout(async () => {
            const updatedApp = await pb.collection('appointments').getOne(appointment.id, { expand: 'user,client,drive_record,time_record,tasks,expenditures,appointment_at', requestKey: null }) as any;
            const index = orgaStore.appointments?.data.findIndex(a => a.id === appointment!.id) ?? -1;
            if (index !== -1 && orgaStore.appointments) orgaStore.appointments.data[index] = updatedApp;
        }, 400);
    }

    export function close() {
        dialog?.close();
        appId = null;
        currentAppIdForReport = null;
    }

    async function startTracking() {
        if (!appointment) return;
        isTimeLoading = true;
        try {
            const payload = { start: new Date().toISOString(), end: null };
            const newRecord = await pb.collection('time_records').create(payload);
            const existing = appointment.time_record || [];
            await pb.collection('appointments').update(appointment.id, { time_record: [...existing, newRecord.id] });
            await updateAppointmentStore();
            toastStore.success("Zeiterfassung gestartet.");
        } catch (err) {
            console.error(err);
            toastStore.error("Fehler beim Starten der Zeiterfassung.");
        } finally {
            isTimeLoading = false;
        }
    }

    async function stopTracking(recordId: string) {
        if (!appointment) return;
        isTimeLoading = true;
        try {
            const payload = { end: new Date().toISOString() };
            await pb.collection('time_records').update(recordId, payload);
            await updateAppointmentStore();
            toastStore.success("Zeiterfassung beendet.");
        } catch (err) {
            console.error(err);
            toastStore.error("Fehler beim Stoppen der Zeiterfassung.");
        } finally {
            isTimeLoading = false;
        }
    }

    async function deleteTime(id: string) {
        if (!(await confirmStore.ask("Wollen Sie diesen Zeiteintrag wirklich löschen?", "Zeit löschen?", "Löschen", "Abbrechen", true))) return;
        isTimeLoading = true;
        try { await pb.collection('time_records').delete(id); await updateAppointmentStore(); toastStore.info("Zeiterfassung gelöscht."); } 
        catch (err) { console.error(err); toastStore.error("Fehler beim Löschen."); } finally { isTimeLoading = false; }
    }

    async function toggleTask(taskId: string) {
        if (!appointment) return;
        const currentTaskIds = tasks.map((t: any) => t.id);
        const newIds = currentTaskIds.includes(taskId) ? currentTaskIds.filter((id: string) => id !== taskId) : [...currentTaskIds, taskId];
        try {
            await pb.collection('appointments').update(appointment.id, { tasks: newIds });
            await updateAppointmentStore();
            toastStore.success("Leistungen aktualisiert.");
        } catch (err) { console.error(err); toastStore.error("Fehler beim Aktualisieren der Leistungen."); }
    }
    
    async function deleteDrive(id: string) {
        if (!(await confirmStore.ask("Wollen Sie diesen Fahrteintrag wirklich löschen?", "Fahrt löschen?", "Löschen", "Abbrechen", true))) return;
        try {
            await pb.collection('drive_records').delete(id);
            await updateAppointmentStore();
            toastStore.info("Fahrt gelöscht.");
        } catch (err) {
            console.error(err);
            toastStore.error("Fehler beim Löschen der Fahrt.");
        }
    }

    async function deleteExpenditure(id: string) {
        if (!(await confirmStore.ask("Wollen Sie diese Ausgabe wirklich löschen?", "Ausgabe löschen?", "Löschen", "Abbrechen", true))) return;
        try {
            await pb.collection('expenditure').delete(id);
            await updateAppointmentStore();
            toastStore.info("Ausgabe gelöscht.");
        } catch (err) {
            console.error(err);
            toastStore.error("Fehler beim Löschen der Ausgabe.");
        }
    }

    async function saveReport() {
        if (!appointment) return;
        isReportSaving = true;
        try {
            await pb.collection('appointments').update(appointment.id, { report, notes, internal_notes: notes });
            await updateAppointmentStore();
            toastStore.success("Notizen gespeichert.");
        } catch(err) {
            console.error(err);
            toastStore.error("Fehler beim Speichern. Fehlt das Feld 'notes' in der DB?");
        } finally {
            isReportSaving = false;
        }
    }

    async function handleAiSave(newText: string, type: 'family' | 'internal', blobs?: Blob[]) {
        const dateHeader = `\n\n--- KI Notiz vom ${new Date().toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })} Uhr ---\n`;
        const formattedText = dateHeader + newText.trim();
        
        if (type === 'family') {
            report = (report ? report.trim() : '') + formattedText;
        } else {
            notes = (notes ? notes.trim() : '') + formattedText;
        }
        
        if (!appointment) return;
        isReportSaving = true;
        try {
            if (blobs && blobs.length > 0) {
                // Zuerst Text-Felder updaten
                let currentApp = await pb.collection('appointments').update(appointment.id, { report, notes, internal_notes: notes });
                let currentVoiceRecords = currentApp.voice_records || [];
                
                // Dann Audio-Blobs einzeln hochladen
                for (let i = 0; i < blobs.length; i++) {
                    const blob = blobs[i];
                    const ext = blob.type.includes('webm') ? 'webm' : 'mp3';
                    const fd = new FormData();
                    for (const vr of currentVoiceRecords) fd.append('voice_records', vr);
                    fd.append('voice_records', blob, `Sprachnotiz_${Date.now()}_${i}.${ext}`);
                    const updated = await pb.collection('appointments').update(appointment.id, fd);
                    currentVoiceRecords = updated.voice_records || [];
                }
            } else {
                await pb.collection('appointments').update(appointment.id, { report, notes, internal_notes: notes });
            }
            
            await updateAppointmentStore();
            toastStore.success("Notizen und Sprachnotizen aktualisiert.");
        } catch(err) {
            console.error(err);
            toastStore.error("Fehler beim Speichern der Notizen.");
        } finally {
            isReportSaving = false;
        }
    }

    async function uploadAudio(e: Event) {
        const input = e.target as HTMLInputElement;
        if (!input.files || input.files.length === 0 || !appointment) return;
        isReportSaving = true;
        try {
            let hasHugeFile = false;
            for (const file of input.files) {
                if (file.size > 50 * 1024 * 1024) hasHugeFile = true;
            }
            if (hasHugeFile) toastStore.info("Upload läuft. Große Dateien können je nach Internetverbindung einige Zeit in Anspruch nehmen.");

            let currentExisting = [...(appointment.voice_records || [])];
            for (let i = 0; i < input.files.length; i++) {
                const file = input.files[i];
                const fd = new FormData();
                for (const vr of currentExisting) {
                    fd.append('voice_records', vr);
                }
                fd.append('voice_records', file);
                const updatedRecord = await pb.collection('appointments').update(appointment.id, fd);
                currentExisting = updatedRecord.voice_records || [];
            }
            await updateAppointmentStore();
            toastStore.success("Audio-Datei hochgeladen.");
        } catch (err: any) {
            console.error(err);
            if (err?.status === 413 || err?.message?.includes('413')) {
                toastStore.error("Datei zu groß! Der Webserver (z.B. NGINX) blockiert Uploads über 1MB.");
            } else {
                toastStore.error("Fehler beim Hochladen der Audio-Datei.");
            }
        } finally {
            isReportSaving = false;
            input.value = '';
        }
    }

    async function deleteVoiceRecord(filename: string) {
        if (!appointment || !(await confirmStore.ask("Möchten Sie diese Sprachnotiz wirklich löschen?", "Sprachnotiz löschen?", "Löschen", "Abbrechen", true))) return;
        isReportSaving = true;
        try {
            const formData = new FormData();
            const existing = appointment.voice_records || [];
            for (const vr of existing) {
                if (vr !== filename) formData.append('voice_records', vr);
            }
            if (existing.length === 1 && existing[0] === filename) {
                formData.append('voice_records', '');
            }

            await pb.collection('appointments').update(appointment.id, formData);
            await updateAppointmentStore();
            toastStore.info("Sprachnotiz gelöscht.");
        } catch (err) {
            console.error(err);
            toastStore.error("Fehler beim Löschen.");
        } finally {
            isReportSaving = false;
        }
    }

    function openTaskModal() {
        if (!newTaskTitle.trim()) return;
        newTaskDescription = "";
        taskDialog?.showModal();
    }

    async function createAndLinkTask() {
        if (!appointment) return;
        isTaskLoading = true;
        try {
            const newTask = await pb.collection('tasks').create({ title: newTaskTitle, description: newTaskDescription });
            const currentTaskIds = tasks.map((t: any) => t.id);
            await pb.collection('appointments').update(appointment.id, { tasks: [...currentTaskIds, newTask.id] });
            await updateAppointmentStore();
            newTaskTitle = "";
            taskDialog?.close();
            toastStore.success("Leistung hinzugefügt.");
        } catch (err) { console.error(err); toastStore.error("Fehler beim Erstellen der Leistung."); } finally { isTaskLoading = false; }
    }

    async function deleteTask(taskId: string) {
        if (!(await confirmStore.ask("Möchten Sie diese Leistung wirklich aus dem System löschen?", "Leistung löschen?", "Löschen", "Abbrechen", true))) return;
        isTaskLoading = true;
        try {
            await pb.collection('tasks').delete(taskId);
            if (appointment && tasks.some((t: any) => t.id === taskId)) {
                const currentTaskIds = tasks.map((t: any) => t.id).filter((id: string) => id !== taskId);
                await pb.collection('appointments').update(appointment.id, { tasks: currentTaskIds });
                await updateAppointmentStore();
            }
            toastStore.info("Leistung gelöscht.");
        } catch (err) { console.error(err); toastStore.error("Fehler beim Löschen der Leistung."); } finally { isTaskLoading = false; }
    }

    async function deleteSeries() {
        if (!appointment || !appointment.is_series || !appointment.series_id) return;
        if (!(await confirmStore.ask("Möchten Sie diesen und ALLE zukünftigen Termine dieser Serie wirklich löschen?", "Komplette Serie löschen?", "Ja, Serie löschen", "Abbrechen", true))) return;

        try {
            const appDate = new Date(appointment.appointment || new Date());
            appDate.setHours(0,0,0,0);
            const futureApps = await pb.collection('appointments').getFullList({
                filter: `series_id = '${appointment.series_id}' && appointment >= '${appDate.toISOString()}'`,
                requestKey: null
            });
            
            const promises = [];
            for (const a of futureApps) {
                if (a.time_record) {
                    for (const trId of a.time_record) promises.push(pb.collection('time_records').delete(trId).catch(()=>{}));
                }
                promises.push(pb.collection('appointments').delete(a.id));
            }

            const chunkSize = 20;
            for (let i = 0; i < promises.length; i += chunkSize) {
                await Promise.all(promises.slice(i, i + chunkSize));
            }
            
            if (orgaStore.appointments) {
                const deletedIds = futureApps.map((a:any) => a.id);
                orgaStore.appointments.data = orgaStore.appointments.data.filter((a:any) => !deletedIds.includes(a.id));
            }
            toastStore.info(`Komplette Terminserie gelöscht (${futureApps.length} Termine).`);
            close();
        } catch (err) {
            toastStore.error("Fehler beim Löschen der Serie.");
        }
    }

    async function deleteAppointment() {
        if (!appointment || !(await confirmStore.ask(appointment.is_series ? "Möchten Sie nur diesen einzelnen Termin löschen?" : "Möchten Sie diesen Termin wirklich löschen?", "Termin löschen?", "Löschen", "Abbrechen", true))) return;

        try {
            await pb.collection('appointments').delete(appointment.id); 
            close(); 
            toastStore.info("Termin gelöscht."); 
        } catch (err) { 
            toastStore.error("Fehler beim Löschen."); 
        }
    }
</script>

<dialog bind:this={dialog} class="p-0 bg-transparent backdrop:bg-black/50 backdrop:backdrop-blur-sm w-full max-w-5xl mx-auto my-auto rounded-3xl" onclick={(e) => { if (e.target === dialog) close(); }}>
    <div class="bg-brand-50 rounded-3xl w-full max-h-[90vh] flex flex-col relative overflow-hidden shadow-2xl">
        
        <div class="bg-white px-4 sm:px-6 py-4 sm:py-5 border-b border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between shrink-0 sticky top-0 z-20 gap-3">
            <div class="flex items-center gap-3 sm:gap-4 min-w-0 pr-8 sm:pr-0">
                <div class="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 hidden sm:flex items-center justify-center font-bold shadow-sm shrink-0">📅</div>
                <div class="min-w-0">
                    <h2 class="text-lg sm:text-xl font-bold text-neutral-900 flex items-center gap-2 truncate">
                        Termin-Details {#if appointment?.is_private}<span class="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-100 text-rose-700 shrink-0">Privat</span>{/if}
                        {#if appointment?.is_series}<span class="px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-100 text-indigo-700 shrink-0">🔁 Serie</span>{/if}
                        {#if appointment?.settled}<span class="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-700 shrink-0">✓ Abgerechnet</span>{/if}
                    </h2>
                    <p class="text-[10px] sm:text-xs text-neutral-500 font-medium truncate">
                        {appointment?.appointment ? new Date(appointment.appointment).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }) : ''} 
                        {appointment?.appointment ? `um ${new Date(appointment.appointment).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr` : ''}
                    </p>
                </div>
            </div>
            <div class="flex items-center gap-1 sm:gap-2 shrink-0 self-end sm:self-auto">
                {#if appointment}
                    {#if appointment.is_series && appointment.series_id}
                        <button onclick={deleteSeries} class="p-1.5 sm:p-2 text-rose-500 hover:text-white hover:bg-rose-600 rounded-lg transition-colors bg-rose-50 flex items-center gap-1.5 shadow-sm border border-rose-100 hover:border-rose-600" title="Serie löschen (Dieser & alle zukünftigen)">
                            <svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            <span class="text-[10px] sm:text-xs font-bold hidden md:block">Serie löschen</span>
                        </button>
                    {/if}
                    <button onclick={() => reminderModal?.open(appointment, fullClient)} class="p-1.5 sm:p-2 text-neutral-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors bg-neutral-100 sm:bg-transparent" title="Termin-Erinnerung senden"><svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg></button>
                    <button onclick={() => editModal?.open(appointment)} class="p-1.5 sm:p-2 text-neutral-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors bg-neutral-100 sm:bg-transparent" title="Termin bearbeiten"><svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                    <button onclick={deleteAppointment} class="p-1.5 sm:p-2 text-neutral-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors bg-neutral-100 sm:bg-transparent" title="Einzelnen Termin löschen"><svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                {/if}
                <div class="w-px h-6 bg-neutral-200 mx-0 sm:mx-1 hidden sm:block"></div>
                <button aria-label="Schließen" onclick={close} class="absolute top-4 right-4 sm:relative sm:top-0 sm:right-0 w-8 h-8 sm:w-8 sm:h-8 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-full flex items-center justify-center transition-colors shadow-sm sm:shadow-none"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
        </div>

        <div class="p-6 overflow-y-auto custom-scrollbar">
            {#if !appointment}
                <div class="flex justify-center py-12"><div class="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div></div>
            {:else}
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div class="lg:col-span-1 space-y-6">
                     
                     {#if client}
                         <div class="orga-card-white p-5 relative overflow-hidden group">
                             <div class="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full blur-2xl -mr-8 -mt-8 z-0"></div>
                             <h3 class="text-sm font-bold text-neutral-900 mb-3 border-b border-neutral-100 pb-2 relative z-10">Zugeordneter Klient</h3>
                             <div class="relative z-10">
                                 <div class="flex items-center gap-3 mb-4">
                                     <div class="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-sm shadow-inner shrink-0">{(client.name_first?.charAt(0) || '')}{(client.name_last?.charAt(0) || '')}</div>
                                     <div class="min-w-0">
                                         <p class="text-sm font-bold text-neutral-900 leading-tight truncate">{client.name_first} {client.name_last}</p>
                                         {#if fullClient?.street || fullClient?.city}
                                             <p class="text-xs text-neutral-600 mt-0.5 truncate">{fullClient.street || ''} {fullClient.housenr || ''}, {fullClient.zip || ''} {fullClient.city || ''}</p>
                                         {/if}
                                     </div>
                                 </div>
                                 <div class="flex flex-col gap-2">
                                     <button type="button" onclick={() => clientDetailModal?.open(client.id)} class="w-full flex justify-center items-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold py-2.5 px-4 rounded-xl transition-colors text-xs border border-emerald-200 shadow-sm active:scale-95">
                                         📂 Klienten-Akte öffnen
                                     </button>
                                     {#if fullClient?.street || fullClient?.city}
                                         <a href="https://www.google.com/maps/search/?api=1&query={encodeURIComponent(`${fullClient.name_first} ${fullClient.name_last}, ${fullClient.street || ''} ${fullClient.housenr || ''}, ${fullClient.zip || ''} ${fullClient.city || ''}`)}" target="_blank" rel="noopener noreferrer" class="w-full flex justify-center items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold py-2.5 px-4 rounded-xl transition-colors text-xs border border-blue-200 shadow-sm active:scale-95">
                                             🗺️ Navigation zum Klienten
                                         </a>
                                     {/if}
                                 </div>
                             </div>
                         </div>
                     {/if}
                     
                     {#if appointment?.expand?.appointment_at}
                         {#each appointment.expand.appointment_at as contact}
                             <div class="orga-card-white p-5 relative overflow-hidden group">
                                 <div class="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full blur-2xl -mr-8 -mt-8 z-0 pointer-events-none transition-transform duration-500 group-hover:scale-150"></div>
                                 <h3 class="text-sm font-bold text-neutral-900 mb-3 border-b border-neutral-100 pb-2 relative z-10 flex items-center gap-2">
                                     <span class="text-blue-600">🩺</span> Arzt / Anlaufstelle
                                 </h3>
                                 <div class="relative z-10">
                                     <p class="text-sm font-bold text-neutral-900 leading-tight">
                                         {#if contact.company_name}{contact.company_name}<br>{/if}
                                         {contact.name_first} {contact.name_last}
                                     </p>
                                     <p class="text-xs text-neutral-600 mt-1 mb-3">
                                         {contact.street || ''} {contact.housenr || ''}<br>
                                         {contact.zip || ''} {contact.city || ''}
                                     </p>
                                     <div class="flex flex-col gap-1.5 mb-4">
                                         {#if contact.phone}<a href="tel:{contact.phone}" class="text-xs text-neutral-600 hover:text-indigo-600 flex items-center gap-1.5"><span class="text-indigo-400">📞</span> {contact.phone}</a>{/if}
                                         {#if contact.email}<a href="mailto:{contact.email}" class="text-xs text-neutral-600 hover:text-emerald-600 flex items-center gap-1.5"><span class="text-emerald-400">✉️</span> {contact.email}</a>{/if}
                                     </div>
                                     <a href="https://www.google.com/maps/search/?api=1&query={encodeURIComponent(`${contact.company_name ? contact.company_name + ' ' : ''}${contact.name_first} ${contact.name_last}, ${contact.street || ''} ${contact.housenr || ''}, ${contact.zip || ''} ${contact.city || ''}`)}" 
                                        target="_blank" rel="noopener noreferrer" class="w-full flex justify-center items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold py-2.5 px-4 rounded-xl transition-colors text-xs border border-blue-200 shadow-sm active:scale-95">
                                         🗺️ Navigation starten
                                     </a>
                                 </div>
                             </div>
                         {/each}
                     {:else if appointment?.location_address}
                         <div class="orga-card-white p-5 relative overflow-hidden">
                             <div class="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full blur-2xl -mr-8 -mt-8 z-0 pointer-events-none"></div>
                             <h3 class="text-sm font-bold text-neutral-900 mb-3 border-b border-neutral-100 pb-2 relative z-10 flex items-center gap-2">
                                 <span class="text-blue-600">📍</span> Zieladresse / Ort
                             </h3>
                             <div class="relative z-10">
                                 <p class="text-sm text-neutral-900 font-bold leading-snug">{appointment.location_address.split(',')[0]}</p>
                                 {#if appointment.location_address.includes(',')}
                                     <p class="text-xs text-neutral-600 mt-1 mb-4">{appointment.location_address.substring(appointment.location_address.indexOf(',') + 1).trim()}</p>
                                 {:else}
                                     <div class="mb-4"></div>
                                 {/if}
                                 <a href="https://www.google.com/maps/search/?api=1&query={encodeURIComponent(appointment.location_address)}" target="_blank" rel="noopener noreferrer" class="w-full flex justify-center items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold py-2.5 px-4 rounded-xl transition-colors text-xs border border-blue-200 shadow-sm active:scale-95">
                                     🗺️ Auf Karte anzeigen
                                 </a>
                             </div>
                         </div>
                     {/if}
                     
                        <div class="orga-card-white p-5">
                            <h3 class="text-sm font-bold text-neutral-900 mb-2 border-b border-neutral-100 pb-2">Beschreibung</h3>
                            <p class="text-sm text-neutral-700">{appointment.description || 'Keine Beschreibung vorhanden.'}</p>
                        </div>

                        
                    </div>

                    

                    <div class="lg:col-span-2 space-y-6">
                        <div class="orga-card-white p-5">
                            <div class="flex items-center justify-between mb-4 border-b border-neutral-100 pb-2"><h3 class="text-sm font-bold text-neutral-900 flex items-center gap-2"><span class="text-indigo-600">⏱️</span> Zeiterfassung</h3><button onclick={() => timeModal?.open()} class="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors">+ Manuell</button></div>
                            
                            {#if runningTimeRecord}
                                <div class="mb-5 bg-emerald-50 p-4 rounded-xl border border-emerald-200 shadow-sm flex items-center justify-between animate-pulse"><div><p class="text-sm font-bold text-emerald-800">Zeiterfassung läuft...</p><p class="text-xs text-emerald-600">Gestartet um {new Date(runningTimeRecord.start).toLocaleTimeString('de-DE', {hour:'2-digit', minute:'2-digit'})} Uhr</p></div><button type="button" onclick={() => stopTracking(runningTimeRecord.id)} disabled={isTimeLoading} class="orga-button-primary bg-rose-600 hover:bg-rose-700 shadow-rose-600/20 py-2 px-4 text-sm">Stopp</button></div>
                            {:else}
                                <div class="mb-5 flex justify-center"><button type="button" onclick={startTracking} disabled={isTimeLoading} class="orga-button-primary py-3 px-6 text-base shadow-indigo-600/20">⏱️ Zeiterfassung starten</button></div>
                            {/if}

                            {#if timeRecords.filter((r: any) => r.start && r.end).length > 0}
                                <h4 class="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Abgeschlossene Zeiten</h4>
                                <div class="space-y-2">
                                    {#each timeRecords.filter((r: any) => r.start && r.end) as record}
                                    <div class="flex items-center justify-between p-3 rounded-lg border border-neutral-100 bg-white hover:border-indigo-200 transition-colors group">
                                        <div><p class="text-sm font-bold text-neutral-900 flex items-center gap-2"><span class="w-1.5 h-1.5 rounded-full bg-indigo-400"></span> {record.start ? new Date(record.start).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '...'} - {record.end ? new Date(record.end).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '...'} Uhr</p></div>
                                        <div class="text-right flex items-center gap-3"><p class="text-indigo-700 font-bold text-sm">{getDuration(record.start, record.end)}</p><div class="flex gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity"><button onclick={() => timeModal?.open(record)} class="text-xs text-indigo-600 hover:text-indigo-800 font-semibold" title="Bearbeiten">✎</button><button onclick={() => deleteTime(record.id)} class="text-xs text-rose-500 hover:text-rose-700 font-semibold" title="Löschen">✕</button></div></div>
                                    </div>
                                    {/each}
                                </div>
                            {:else if !runningTimeRecord}
                                <p class="text-center text-xs text-neutral-400 italic py-2">Keine Zeiten erfasst.</p>
                            {/if}
                        </div>

                        <div class="orga-card-white p-5">
                            <div class="flex items-center justify-between mb-4 border-b border-neutral-100 pb-2"><h3 class="text-sm font-bold text-neutral-900 flex items-center gap-2"><span class="text-amber-500">📋</span> Leistungen</h3></div>
                            <div class="flex flex-wrap gap-1.5 mb-4">
                                {#each orgaStore.tasks?.data || [] as t}
                                    <div class="flex items-center rounded-md border transition-all {tasks.some((pt: any) => pt.id === t.id) ? 'bg-amber-100 border-amber-300 shadow-sm' : 'bg-white border-neutral-200 hover:border-amber-200 hover:bg-amber-50'} overflow-hidden">
                                        <button onclick={() => toggleTask(t.id)} class="px-2.5 py-1 text-xs font-semibold {tasks.some((pt: any) => pt.id === t.id) ? 'text-amber-800' : 'text-neutral-600'}">{t.title}</button>
                                        {#if isSuperAdmin}
                                            <button onclick={() => deleteTask(t.id)} disabled={isTaskLoading} class="px-1.5 py-1 text-xs text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition-colors border-l {tasks.some((pt: any) => pt.id === t.id) ? 'border-amber-300' : 'border-neutral-200'}" title="Leistung komplett aus dem System löschen">✕</button>
                                        {/if}
                                    </div>
                                {/each}
                            </div>
                            <div class="flex gap-2"><input type="text" bind:value={newTaskTitle} placeholder="Neue Leistung anlegen..." class="orga-input-clear py-3 sm:py-1.5 text-xs flex-1" onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); openTaskModal(); } }} disabled={isTaskLoading} /><button type="button" onclick={openTaskModal} disabled={!newTaskTitle.trim() || isTaskLoading} class="orga-button-primary bg-amber-500 hover:bg-amber-600 shadow-amber-500/20 py-3 sm:py-1.5 px-3 text-xs shrink-0">+</button></div>
                        </div>

                        <div class="orga-card-white p-5">
                            <div class="flex items-center justify-between mb-4 border-b border-neutral-100 pb-2"><h3 class="text-sm font-bold text-neutral-900 flex items-center gap-2"><span class="text-emerald-500">🚗</span> Fahrten</h3><button onclick={() => driveModal?.open()} class="text-xs font-bold text-emerald-600 hover:text-emerald-800 transition-colors">+ Hinzufügen</button></div>
                            {#if driveRecords.length === 0}<p class="text-center text-xs text-neutral-400 italic py-2">Keine Fahrten hinterlegt.</p>{:else}<div class="space-y-2 mb-3">{#each driveRecords as drive}<div class="flex items-center justify-between p-3 rounded-lg border border-neutral-100 bg-neutral-50 hover:border-emerald-200 transition-colors group"><div><p class="text-sm font-bold text-neutral-900 flex items-center gap-2"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> {drive.type || 'Fahrt'}</p>{#if drive.lump_sum}<p class="text-xs text-neutral-500 pl-3.5">Pauschale: {drive.lump_sum} €</p>{/if}</div><div class="text-right flex items-center gap-3"><p class="text-emerald-700 font-bold text-sm">{drive.km || 0} km</p><div class="flex gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity"><button onclick={() => driveModal?.open(drive)} class="text-xs text-neutral-400 hover:text-emerald-600 font-semibold" title="Bearbeiten">✎</button><button onclick={() => deleteDrive(drive.id)} class="text-xs text-rose-500 hover:text-rose-700 font-semibold" title="Löschen">✕</button></div></div></div>{/each}</div>
                                <div class="bg-emerald-50 rounded-lg p-3 flex justify-between items-center"><p class="text-xs font-bold text-emerald-900">Gesamte Strecke</p><p class="text-sm font-bold text-emerald-700">{totalKm} km</p></div>
                            {/if}
                        </div>

                        <div class="orga-card-white p-5">
                            <div class="flex items-center justify-between mb-4 border-b border-neutral-100 pb-2"><h3 class="text-sm font-bold text-neutral-900 flex items-center gap-2"><span class="text-rose-500">💶</span> Sonderausgaben</h3><button onclick={() => expenditureModal?.open()} class="text-xs font-bold text-rose-600 hover:text-rose-800 transition-colors">+ Hinzufügen</button></div>
                            {#if expenditures.length === 0}<p class="text-center text-xs text-neutral-400 italic py-2">Keine Ausgaben hinterlegt.</p>{:else}
                                <div class="space-y-2 mb-3">{#each expenditures as exp}<div class="flex items-center justify-between p-3 rounded-lg border border-neutral-100 bg-neutral-50 hover:border-rose-200 transition-colors group"><p class="text-sm font-bold text-neutral-900 flex items-center gap-2"><span class="w-1.5 h-1.5 rounded-full bg-rose-400"></span> {exp.titel || 'Ausgabe'}</p><div class="text-right flex items-center gap-3"><p class="text-rose-700 font-bold text-sm">{exp.sum ? exp.sum.toFixed(2).replace('.', ',') : '0,00'} €</p><div class="flex gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity"><button onclick={() => expenditureModal?.open(exp)} class="text-xs text-neutral-400 hover:text-rose-600 font-semibold" title="Bearbeiten">✎</button><button onclick={() => deleteExpenditure(exp.id)} class="text-xs text-rose-500 hover:text-rose-700 font-semibold" title="Löschen">✕</button></div></div></div>{/each}</div>
                                <div class="bg-rose-50 rounded-lg p-3 flex justify-between items-center"><p class="text-xs font-bold text-rose-900">Gesamtsumme</p><p class="text-sm font-bold text-rose-700">{totalExpenditure.toFixed(2).replace('.', ',')} €</p></div>
                            {/if}
                        </div>

                        <!-- Besuchsbericht / Report -->
                        <div class="orga-card-white p-5">
                            <div class="flex items-center justify-between mb-4 border-b border-neutral-100 pb-2">
                                <h3 class="text-sm font-bold text-neutral-900 flex items-center gap-2">
                                <span class="text-indigo-600">📝</span> Bericht & Notizen
                                </h3>
                            <div class="flex items-center gap-2">
                                <input type="file" accept="audio/*,.m4a,audio/mp4,audio/x-m4a,video/mp4" multiple class="hidden" bind:this={audioInput} onchange={uploadAudio} />
                                <button onclick={() => audioInput.click()} class="text-xs font-bold text-neutral-600 hover:text-indigo-600 bg-neutral-100 hover:bg-neutral-200 px-2 sm:px-3 py-1.5 rounded-lg transition-colors shadow-sm" title="Audio-Datei hochladen">
                                    📎 Audio
                                </button>
                                <button onclick={() => aiModal?.open(activeNoteTab, appointment, fullClient)} class="text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2 sm:px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm">
                                    <span>🤖</span> Gemini
                                </button>
                            </div>
                            </div>
                            <div class="flex flex-col gap-3">
                            <div class="flex bg-neutral-100 p-1 rounded-lg border border-neutral-200 shadow-inner shrink-0">
                                <button onclick={() => activeNoteTab = 'internal'} class="flex-1 px-3 py-2 text-xs font-bold rounded-md transition-colors {activeNoteTab === 'internal' ? 'bg-white shadow-sm text-indigo-600' : 'text-neutral-500 hover:text-neutral-700'}">🔒 Intern (Team)</button>
                                <button onclick={() => activeNoteTab = 'family'} class="flex-1 px-3 py-2 text-xs font-bold rounded-md transition-colors {activeNoteTab === 'family' ? 'bg-white shadow-sm text-indigo-600' : 'text-neutral-500 hover:text-neutral-700'}">📝 Bericht</button>
                            </div>
                            
                            {#if activeNoteTab === 'internal'}
                                <textarea bind:value={notes} class="orga-input-clear resize-y min-h-30 text-sm" placeholder="Interne Notizen, Todo's, Auffälligkeiten für das Team..." disabled={isReportSaving}></textarea>
                            {:else}
                                <textarea bind:value={report} class="orga-input-clear resize-y min-h-30 text-sm" placeholder="Ausführlicher Bericht für Angehörige / Pflegekasse..." disabled={isReportSaving}></textarea>
                            {/if}
                            
                            {#if appointment?.voice_records && appointment.voice_records.length > 0}
                                <div class="bg-indigo-50/50 rounded-xl p-3 border border-indigo-100 mt-1">
                                    <h4 class="text-[10px] font-bold text-indigo-800 uppercase tracking-wider mb-2 flex items-center gap-1"><span>🎙️</span> Gespeicherte Sprachnotizen</h4>
                                    <div class="flex flex-col gap-2">
                                        {#each appointment.voice_records as vr}
                                            <div class="flex items-center justify-between bg-white p-2 rounded-lg border border-indigo-100 shadow-sm">
                                                <audio controls src={pb.files.getURL(appointment, vr)} class="h-8 max-w-50 sm:max-w-62.5"></audio>
                                                <button onclick={() => deleteVoiceRecord(vr)} class="w-8 h-8 flex items-center justify-center text-neutral-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors" title="Sprachnotiz löschen">✕</button>
                                            </div>
                                        {/each}
                                    </div>
                                </div>
                            {/if}
                                <div class="flex justify-end mt-1">
                                <button onclick={saveReport} disabled={isReportSaving || (report === (appointment?.report || '') && notes === (appointment?.notes || appointment?.internal_notes || ''))} class="orga-button-primary py-2 px-5 text-xs w-full sm:w-auto">
                                        {isReportSaving ? 'Speichert...' : 'Speichern'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            {/if}
        </div>
    </div>
    
    <DriveRecordModal bind:this={driveModal} {appointment} />
    <ExpenditureModal bind:this={expenditureModal} {appointment} />
    <AppointmentModal bind:this={editModal} />
    <TimeRecordModal bind:this={timeModal} {appointment} />
    <AppointmentReminderModal bind:this={reminderModal} />
    <AiReportModal bind:this={aiModal} onSave={handleAiSave} />
    <ClientDetailModal bind:this={clientDetailModal} />

    
    
    <dialog bind:this={taskDialog} class="p-0 bg-transparent backdrop:bg-black/50 backdrop:backdrop-blur-sm w-full max-w-sm mx-auto my-auto rounded-3xl" onclick={(e) => { if (e.target === taskDialog) taskDialog?.close(); }}>
        <div class="bg-white rounded-3xl p-6 w-full relative">
            <button aria-label="Schließen" onclick={() => taskDialog?.close()} class="absolute top-4 right-4 w-8 h-8 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-full flex items-center justify-center transition-colors">✕</button>
            <h2 class="text-lg font-bold text-neutral-900 mb-2">Details zur Leistung</h2>
            <p class="text-xs text-neutral-500 mb-4">"{newTaskTitle}" genauer beschreiben?</p>
            <form onsubmit={(e) => { e.preventDefault(); createAndLinkTask(); }} class="space-y-3">
                <textarea bind:value={newTaskDescription} rows="3" class="orga-input-clear resize-none text-sm" placeholder="Optionale Beschreibung..."></textarea>
                <div class="flex justify-end gap-2 mt-2">
                    <button type="button" onclick={() => taskDialog?.close()} class="orga-button-ghost py-3 sm:py-1.5 px-3 text-xs" disabled={isTaskLoading}>Abbrechen</button>
                    <button type="submit" class="orga-button-primary bg-amber-500 hover:bg-amber-600 shadow-amber-500/20 py-3 sm:py-1.5 px-4 text-xs" disabled={isTaskLoading}>{isTaskLoading ? "Speichert..." : "Speichern"}</button>
                </div>
            </form>
        </div>
    </dialog>
</dialog>