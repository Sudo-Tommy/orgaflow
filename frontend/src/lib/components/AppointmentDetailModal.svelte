<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import DriveRecordModal from "$lib/components/DriveRecordModal.svelte";
    import ExpenditureModal from "$lib/components/ExpenditureModal.svelte";
    import AppointmentModal from "$lib/components/AppointmentModal.svelte";
    import AppointmentReminderModal from "$lib/components/AppointmentReminderModal.svelte";
    import TimeRecordModal from "$lib/components/TimeRecordModal.svelte";
    import AiReportModal from "$lib/components/AiReportModal.svelte";
    import ClientDetailModal from "$lib/components/clients/ClientDetailModal.svelte";
    import { toastStore } from "$lib/services/toastService.svelte";
    import { confirmStore } from "$lib/services/confirmService.svelte";
    import { slide, fade } from "svelte/transition";
    import { 
        X, Calendar, Clock, User, MapPin, CheckCircle2, Lock, Eye, Repeat, Trash2, Edit3, MessageSquare, 
        Stethoscope, Navigation, FileText, Play, Square, ListTodo, Car, Banknote, Paperclip, Bot, FileSignature, Mic,

        Save

    } from "lucide-svelte";

    let dialog: HTMLDialogElement;
    let appId = $state<string | null>(null);
    let appointment = $derived(appId ? orgaStore.appointments?.getById(appId) : null);

    // States for editable appointment internal notes
    let isEditingInternalNotes = $state(false);
    let internalNotesValue = $state("");

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
    let isReportSaving = $state(false);
    // svelte-ignore non_reactive_update
    let audioInput: HTMLInputElement;

    let isTimeLoading = $state(false);

    // svelte-ignore non_reactive_update
    let taskDialog: HTMLDialogElement;
    let newTaskTitle = $state("");
    let newTaskDescription = $state("");
    let isTaskLoading = $state(false);

    $effect(() => {
        if (appointment && appointment.id !== currentAppIdForReport) {
            report = appointment.report || "";
            currentAppIdForReport = appointment.id;
        }
    });
    
    $effect(() => {
        if (appointment && !isEditingInternalNotes) {
            internalNotesValue = appointment.notes || "";
        }
    });

    export function open(id: string) {
        appId = id;
        isEditingInternalNotes = false; // Reset edit state on open
        dialog?.showModal();
    }

    async function saveInternalNotes() {
        if (!appointment) return;
        try {
            await pb.collection('appointments').update(appointment.id, { notes: internalNotesValue });
            await updateAppointmentStore();
            isEditingInternalNotes = false;
            toastStore.success("Interne Notizen zum Termin gespeichert.");
        } catch (err) {
            console.error(err);
            toastStore.error("Fehler beim Speichern der internen Notizen.");
        }
    }

    async function updateAppointmentStore() {
        if (!appointment) return;
        setTimeout(async () => {
            const updatedApp = await pb.collection('appointments').getOne(appointment.id, { expand: 'user,client,drive_record,time_record,tasks,expenditures,appointment_at', requestKey: null }) as any;
            const index = orgaStore.appointments?.data.findIndex(a => a.id === appointment!.id) ?? -1;
            if (index !== -1 && orgaStore.appointments) orgaStore.appointments.data[index] = updatedApp;
        }, 400);
    }

    export function close() { dialog?.close(); appId = null; currentAppIdForReport = null; }

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
            await pb.collection('appointments').update(appointment.id, { report });
            await updateAppointmentStore();
            toastStore.success("Notizen gespeichert.");
        } catch(err) {
            console.error(err);
            toastStore.error("Fehler beim Speichern.");
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
            internalNotesValue = (internalNotesValue ? internalNotesValue.trim() : '') + formattedText;
        }
        
        if (!appointment) return;
        isReportSaving = true;
        try {
            let payload: any = { report };
            if (type === 'internal') {
                payload.notes = internalNotesValue;
            }

            if (blobs && blobs.length > 0) {
                // Zuerst Text-Felder updaten
                let currentApp = await pb.collection('appointments').update(appointment.id, payload);
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
                await pb.collection('appointments').update(appointment.id, payload);
            }

            if (type === 'internal') {
                isEditingInternalNotes = false;
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
            const appDate = new Date(appointment.appointment as string || new Date());
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

<dialog bind:this={dialog} class="p-0 bg-transparent backdrop:bg-black/50 backdrop:backdrop-blur-sm w-full max-w-5xl m-0 sm:m-auto rounded-none sm:rounded-3xl h-dvh sm:h-auto overflow-hidden" onclick={(e) => { if (e.target === dialog) close(); }}>
    <div class="bg-brand-50 sm:rounded-3xl w-full h-full sm:max-h-[90dvh] flex flex-col relative overflow-hidden shadow-2xl">
        
        <div class="bg-white px-4 sm:px-6 py-4 sm:py-5 border-b border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between shrink-0 sticky top-0 z-20 gap-3">
            <div class="flex items-center gap-3 sm:gap-4 min-w-0 pr-8 sm:pr-0">
                <div class="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-brand-50 text-brand-600 hidden sm:flex items-center justify-center font-bold shadow-sm shrink-0"><Calendar class="w-6 h-6" /></div>
                <div class="min-w-0">
                    <h2 class="text-lg sm:text-2xl font-black text-neutral-900 flex items-center gap-3 truncate">
                        Termin-Details {#if appointment?.is_private}<span class="px-2.5 py-1 text-[10px] font-bold rounded-full bg-rose-100 text-rose-700 shrink-0 flex items-center gap-1"><Lock class="w-3 h-3" /> Privat</span>{/if}
                        {#if appointment?.is_series}<span class="px-2.5 py-1 text-[10px] font-bold rounded-full bg-brand-100 text-brand-700 shrink-0 flex items-center gap-1"><Repeat class="w-3 h-3" /> Serie</span>{/if}
                        {#if appointment?.settled}<span class="px-2.5 py-1 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-700 shrink-0 flex items-center gap-1"><CheckCircle2 class="w-3 h-3" /> Abgerechnet</span>{/if}
                        {#if appointment?.is_visible}<span class="px-2.5 py-1 text-[10px] font-bold rounded-full bg-sky-100 text-sky-700 shrink-0 flex items-center gap-1"><Eye class="w-3 h-3" /> Öffentlich</span>{/if}
                    </h2>
                    <p class="text-[11px] sm:text-sm text-neutral-500 font-medium truncate mt-0.5">
                        {appointment?.appointment ? new Date(appointment.appointment as string).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }) : ''} 
                        {appointment?.appointment ? `um ${new Date(appointment.appointment as string).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr` : ''}
                    </p>
                </div>
            </div>
            <div class="flex items-center gap-1 sm:gap-2 shrink-0 sm:self-auto">
                {#if appointment}
                    {#if appointment.is_series && appointment.series_id}
                        <button onclick={deleteSeries} class="p-2 sm:p-2.5 min-h-10 text-rose-500 hover:text-white hover:bg-rose-600 rounded-xl transition-all active:scale-95 bg-rose-50 flex items-center gap-1.5 shadow-sm border border-rose-100 hover:border-rose-600 focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none" title="Serie löschen (Dieser & alle zukünftigen)">
                            <Trash2 class="w-4 h-4 sm:w-5 sm:h-5" />
                            <span class="text-[11px] sm:text-xs font-bold hidden md:block">Serie löschen</span>
                        </button>
                    {/if}
                    <button onclick={() => reminderModal?.open(appointment, fullClient)} class="w-9 h-9 sm:w-12 sm:h-12 flex items-center justify-center text-neutral-500 hover:text-brand-600 hover:bg-brand-50 rounded-xl transition-all active:scale-95 bg-neutral-100 sm:bg-transparent focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none" title="Nachricht / Erinnerung senden"><MessageSquare class="w-5 h-5" /></button>
                    <button onclick={() => editModal?.open(appointment)} class="w-9 h-9 sm:w-12 sm:h-12 flex items-center justify-center text-neutral-500 hover:text-brand-600 hover:bg-brand-50 rounded-xl transition-all active:scale-95 bg-neutral-100 sm:bg-transparent focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none" title="Termin bearbeiten"><Edit3 class="w-5 h-5" /></button>
                    <button onclick={deleteAppointment} class="w-9 h-9 sm:w-12 sm:h-12 flex items-center justify-center text-neutral-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all active:scale-95 bg-neutral-100 sm:bg-transparent focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none" title="Einzelnen Termin löschen"><Trash2 class="w-5 h-5" /></button>
                {/if}
                <div class="w-px h-6 bg-neutral-200 mx-0 sm:mx-1 hidden sm:block"></div>
                <button aria-label="Schließen" onclick={close} class="absolute top-4 right-4 sm:relative sm:top-0 sm:right-0 w-9 h-9 sm:w-12 sm:h-12 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-full flex items-center justify-center transition-all active:scale-95 shadow-sm sm:shadow-none focus-visible:ring-2 focus-visible:ring-neutral-500 focus-visible:outline-none"><X class="w-5 h-5" /></button>
            </div>
        </div>

        <div class="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex-1">
            {#if !appointment}
                <div class="flex justify-center py-12"><div class="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div></div>
            {:else}
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div class="lg:col-span-1 space-y-6">
                     
                     {#if client}
                         <div class="orga-card-white p-5 relative overflow-hidden group">
                             <div class="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full blur-2xl -mr-8 -mt-8 z-0"></div>
                             <h3 class="text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-4 border-b border-neutral-100 pb-2 relative z-10 flex items-center gap-1.5"><User class="w-3.5 h-3.5" /> Zugeordneter Klient</h3>
                             <div class="relative z-10">
                                 <div class="flex items-center gap-3 mb-4">
                                     <div class="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 font-black flex items-center justify-center text-sm shadow-inner shrink-0 border border-emerald-200/50">{(client.name_first?.charAt(0) || '')}{(client.name_last?.charAt(0) || '')}</div>
                                     <div class="min-w-0">
                                         <p class="text-base font-bold text-neutral-900 leading-tight truncate">{client.name_first} {client.name_last}</p>
                                         {#if fullClient?.street || fullClient?.city}
                                             <p class="text-xs text-neutral-600 mt-0.5 truncate">{fullClient.street || ''} {fullClient.housenr || ''}, {fullClient.zip || ''} {fullClient.city || ''}</p>
                                         {/if}
                                     </div>
                                 </div>
                                 
                                 {#if fullClient?.notes || client?.notes}
                                     <div transition:slide class="bg-amber-50 border border-amber-200 px-4 py-3 rounded-2xl shadow-inner mb-4">
                                         <p class="text-[10px] font-black text-amber-800 uppercase tracking-widest mb-1">Wichtige Notizen zum Klienten</p>
                                         <p class="text-sm text-amber-900 font-medium leading-relaxed whitespace-pre-wrap">{fullClient?.notes || client?.notes}</p>
                                     </div>
                                 {/if}

                                 <div class="bg-rose-50 border border-rose-200 px-4 py-3 rounded-2xl shadow-sm mb-5 transition-all">
                                     <div class="flex justify-between items-center mb-1">
                                         <p class="text-[10px] font-black text-rose-800 uppercase tracking-widest">Interne Termin-Notizen</p>
                                        {#if !isEditingInternalNotes}
                                            <button onclick={() => isEditingInternalNotes = true} class="text-rose-700 hover:text-rose-900 text-[11px] font-bold flex items-center gap-1 transition-colors bg-white/50 px-2 py-1 rounded-md">
                                                 <Edit3 class="w-3.5 h-3.5" />
                                                 Bearbeiten
                                             </button>
                                         {/if}
                                     </div>
                                    {#if isEditingInternalNotes}
                                        <div transition:slide>
                                            <textarea bind:value={internalNotesValue} class="orga-input-clear w-full text-sm min-h-24 bg-white/80 border-rose-300 focus:border-rose-500 focus:ring-rose-500/20" placeholder="Zusätzliche Infos, Aufgaben für das Team..."></textarea>
                                            <div class="flex gap-2 mt-3 justify-end">
                                                <button onclick={() => { isEditingInternalNotes = false; internalNotesValue = appointment?.notes || ""; }} class="text-xs font-bold text-neutral-600 hover:text-neutral-900 px-3 py-1.5 bg-white rounded-lg shadow-sm">Abbrechen</button>
                                                <button onclick={saveInternalNotes} class="text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 px-4 py-1.5 rounded-lg shadow-sm shadow-rose-600/20">Speichern</button>
                                            </div>
                                         </div>
                                     {:else}
                                        {#if internalNotesValue}
                                            <p transition:fade class="text-sm text-rose-900 font-medium leading-relaxed whitespace-pre-wrap mt-1.5">{internalNotesValue}</p>
                                         {:else}
                                             <p transition:fade class="text-xs text-rose-400/80 italic mt-1">Keine internen Notizen vorhanden.</p>
                                         {/if}
                                     {/if}
                                 </div>
                                 
                                 <div class="flex flex-col gap-2.5">
                                     <button type="button" onclick={() => clientDetailModal?.open(client.id)} class="w-full min-h-12 flex justify-center items-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold px-4 rounded-xl transition-all text-sm border border-emerald-200 shadow-sm active:scale-95 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none">
                                         <FileSignature class="w-4 h-4" /> Klienten-Akte öffnen
                                     </button>
                                     {#if fullClient?.street || fullClient?.city}
                                         <a href="https://www.google.com/maps/search/?api=1&query={encodeURIComponent(`${fullClient.name_first} ${fullClient.name_last}, ${fullClient.street || ''} ${fullClient.housenr || ''}, ${fullClient.zip || ''} ${fullClient.city || ''}`)}" target="_blank" rel="noopener noreferrer" class="w-full min-h-12 flex justify-center items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold px-4 rounded-xl transition-all text-sm border border-blue-200 shadow-sm active:scale-95 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none">
                                             <Navigation class="w-4 h-4" /> Navigation zum Klienten
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
                                 <h3 class="text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-4 border-b border-neutral-100 pb-2 relative z-10 flex items-center gap-1.5">
                                     <Stethoscope class="w-3.5 h-3.5" /> Arzt / Anlaufstelle
                                 </h3>
                                 <div class="relative z-10">
                                     <p class="text-base font-bold text-neutral-900 leading-tight">
                                         {#if contact.company_name}{contact.company_name}<br>{/if}
                                         {contact.name_first} {contact.name_last}
                                     </p>
                                     <p class="text-sm text-neutral-600 mt-1 mb-4">
                                         {contact.street || ''} {contact.housenr || ''}<br>
                                         {contact.zip || ''} {contact.city || ''}
                                     </p>
                                     <div class="flex flex-col gap-1.5 mb-4">
                                         {#if contact.phone}<a href="tel:{contact.phone}" class="text-xs text-neutral-600 hover:text-indigo-600 flex items-center gap-1.5"><span class="text-indigo-400">📞</span> {contact.phone}</a>{/if}
                                         {#if contact.email}<a href="mailto:{contact.email}" class="text-xs text-neutral-600 hover:text-emerald-600 flex items-center gap-1.5"><span class="text-emerald-400">✉️</span> {contact.email}</a>{/if}
                                     </div>
                                     <a href="https://www.google.com/maps/search/?api=1&query={encodeURIComponent(`${contact.company_name ? contact.company_name + ' ' : ''}${contact.name_first} ${contact.name_last}, ${contact.street || ''} ${contact.housenr || ''}, ${contact.zip || ''} ${contact.city || ''}`)}" 
                                        target="_blank" rel="noopener noreferrer" class="w-full min-h-12 flex justify-center items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold px-4 rounded-xl transition-all text-sm border border-blue-200 shadow-sm active:scale-95 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none">
                                         <Navigation class="w-4 h-4" /> Navigation starten
                                     </a>
                                 </div>
                             </div>
                         {/each}
                     {:else if appointment?.location_address}
                         <div class="orga-card-white p-5 relative overflow-hidden">
                             <div class="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full blur-2xl -mr-8 -mt-8 z-0 pointer-events-none"></div>
                             <h3 class="text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-4 border-b border-neutral-100 pb-2 relative z-10 flex items-center gap-1.5">
                                 <MapPin class="w-3.5 h-3.5" /> Zieladresse / Ort
                             </h3>
                             <div class="relative z-10">
                                 <p class="text-base text-neutral-900 font-bold leading-snug">{appointment.location_address.split(',')[0]}</p>
                                 {#if appointment.location_address.includes(',')}
                                     <p class="text-sm text-neutral-600 mt-1 mb-5">{appointment.location_address.substring(appointment.location_address.indexOf(',') + 1).trim()}</p>
                                 {:else}
                                     <div class="mb-5"></div>
                                 {/if}
                                 <a href="https://www.google.com/maps/search/?api=1&query={encodeURIComponent(appointment.location_address)}" target="_blank" rel="noopener noreferrer" class="w-full min-h-12 flex justify-center items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold px-4 rounded-xl transition-all text-sm border border-blue-200 shadow-sm active:scale-95 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none">
                                     <MapPin class="w-4 h-4" /> Auf Karte anzeigen
                                 </a>
                             </div>
                         </div>
                     {/if}
                     
                        <div class="orga-card-white p-5">
                            <h3 class="text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-3 border-b border-neutral-100 pb-2 flex items-center gap-1.5"><FileText class="w-3.5 h-3.5" /> Beschreibung</h3>
                            <p class="text-sm text-neutral-800 leading-relaxed font-medium">{appointment.description || 'Keine Beschreibung vorhanden.'}</p>
                        </div>

                        
                    </div>

                    

                    <div class="lg:col-span-2 space-y-6">
                        <div class="orga-card-white p-5">
                            <div class="flex items-center justify-between mb-4 border-b border-neutral-100 pb-2"><h3 class="text-[11px] font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5"><Clock class="w-3.5 h-3.5" /> Zeiterfassung</h3><button onclick={() => timeModal?.open()} class="orga-button-ghost bg-white min-h-10 px-4 text-xs font-bold shadow-sm focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none">+ Manuell eintragen</button></div>
                            
                            {#if runningTimeRecord}
                                <div transition:slide class="mb-6 bg-emerald-50 p-5 rounded-2xl border border-emerald-200 shadow-sm flex items-center justify-between"><div><p class="text-sm font-black text-emerald-900 flex items-center gap-2"><span class="relative flex h-3 w-3"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span class="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span></span> Zeiterfassung läuft...</p><p class="text-sm text-emerald-700 font-medium mt-1">Gestartet um {new Date(runningTimeRecord.start).toLocaleTimeString('de-DE', {hour:'2-digit', minute:'2-digit'})} Uhr</p></div><button type="button" onclick={() => stopTracking(runningTimeRecord.id)} disabled={isTimeLoading} class="orga-button-primary bg-rose-600 hover:bg-rose-700 shadow-rose-600/20 min-h-14 px-6 text-sm flex items-center gap-2"><Square class="w-4 h-4 fill-current" /> Stopp</button></div>
                            {:else}
                                <div transition:slide class="mb-6 flex justify-center"><button type="button" onclick={startTracking} disabled={isTimeLoading} class="orga-button-primary min-h-16 w-full md:w-auto md:px-10 text-lg sm:text-sm shadow-brand-600/20"><Play class="w-6 h-6 sm:w-5 sm:h-5 fill-current" /> Zeiterfassung starten</button></div>
                            {/if}

                            {#if timeRecords.filter((r: any) => r.start && r.end).length > 0}
                                <h4 class="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-3 pl-1">Abgeschlossene Zeiten</h4>
                                <div class="space-y-3 pb-2">
                                    {#each timeRecords.filter((r: any) => r.start && r.end) as record}
                                    <div class="flex items-center justify-between p-4 rounded-xl border border-neutral-200 bg-neutral-50 hover:border-brand-300 transition-all shadow-sm group">
                                        <div><p class="text-sm font-bold text-neutral-900 flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-brand-400"></span> {record.start ? new Date(record.start).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '...'} - {record.end ? new Date(record.end).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '...'} Uhr</p></div>
                                        <div class="text-right flex items-center gap-4"><p class="text-brand-700 font-black text-sm bg-brand-100/50 px-3 py-1 rounded-lg border border-brand-200/50">{getDuration(record.start, record.end)}</p>
                                            <div class="flex gap-1.5 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                                                <button onclick={() => timeModal?.open(record)} class="w-10 h-10 flex items-center justify-center text-neutral-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none" title="Bearbeiten"><Edit3 class="w-4 h-4" /></button>
                                                <button onclick={() => deleteTime(record.id)} class="w-10 h-10 flex items-center justify-center text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none" title="Löschen"><Trash2 class="w-4 h-4" /></button>
                                            </div>
                                        </div>
                                    </div>
                                    {/each}
                                </div>
                            {:else if !runningTimeRecord}
                                <p class="text-center text-sm font-medium text-neutral-400 py-6 bg-neutral-50 rounded-xl border border-dashed border-neutral-200">Noch keine Zeiten erfasst.</p>
                            {/if}
                        </div>

                        <div class="orga-card-white p-5">
                            <div class="flex items-center justify-between mb-4 border-b border-neutral-100 pb-2"><h3 class="text-[11px] font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5"><ListTodo class="w-3.5 h-3.5" /> Leistungen</h3></div>
                            <div class="flex flex-wrap gap-2.5 mb-6">
                                {#each (orgaStore.tasks?.data || []).slice().sort((a: any, b: any) => a.title.localeCompare(b.title)) as t}
                                    <div class="flex items-center rounded-xl border-2 transition-all active:scale-95 focus-within:ring-2 focus-within:ring-amber-500 {tasks.some((pt: any) => pt.id === t.id) ? 'bg-amber-100 border-amber-400 shadow-sm ring-1 ring-amber-500/20' : 'bg-white border-neutral-200 hover:border-amber-300 hover:bg-amber-50'} overflow-hidden h-12 sm:h-10">
                                        <button onclick={() => toggleTask(t.id)} class="px-5 sm:px-4 h-full text-sm sm:text-xs font-bold {tasks.some((pt: any) => pt.id === t.id) ? 'text-amber-900' : 'text-neutral-700'} focus:outline-none">{t.title}</button>
                                        {#if isSuperAdmin}
                                            <button onclick={() => deleteTask(t.id)} disabled={isTaskLoading} class="w-11 sm:w-10 h-full flex items-center justify-center text-neutral-400 hover:text-rose-600 hover:bg-rose-100 transition-colors border-l {tasks.some((pt: any) => pt.id === t.id) ? 'border-amber-300' : 'border-neutral-200'} focus:outline-none" title="Leistung komplett aus dem System löschen"><X class="w-4 h-4 sm:w-3.5 sm:h-3.5" /></button>
                                        {/if}
                                    </div>
                                {/each}
                            </div>
                            <div class="flex gap-2.5"><div class="relative flex-1"><input type="text" bind:value={newTaskTitle} placeholder="Neue Leistung anlegen..." class="orga-input-clear min-h-14 sm:min-h-12 text-base sm:text-sm w-full" onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); openTaskModal(); } }} disabled={isTaskLoading} /></div><button type="button" onclick={openTaskModal} disabled={!newTaskTitle.trim() || isTaskLoading} class="orga-button-primary bg-amber-500 hover:bg-amber-600 shadow-amber-500/20 min-h-14 sm:min-h-12 px-5 text-sm shrink-0">Hinzufügen</button></div>
                        </div>

                        <div class="orga-card-white p-5">
                            <div class="flex items-center justify-between mb-4 border-b border-neutral-100 pb-2"><h3 class="text-[11px] font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5"><Car class="w-3.5 h-3.5" /> Fahrten</h3><button onclick={() => driveModal?.open()} class="orga-button-ghost bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 border-emerald-200 min-h-10 px-4 text-xs font-bold shadow-sm focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none">+ Fahrt eintragen</button></div>
                            {#if driveRecords.length === 0}<p class="text-center text-sm font-medium text-neutral-400 py-6 bg-neutral-50 rounded-xl border border-dashed border-neutral-200">Keine Fahrten hinterlegt.</p>{:else}<div class="space-y-3 mb-4">{#each driveRecords as drive}<div class="flex items-center justify-between p-4 rounded-xl border border-neutral-200 bg-neutral-50 hover:border-emerald-300 transition-all shadow-sm group"><div><p class="text-sm font-bold text-neutral-900 flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-emerald-400"></span> {drive.type || 'Fahrt'}</p>{#if drive.lump_sum}<p class="text-xs font-medium text-neutral-500 pl-4 mt-0.5">Pauschale: {drive.lump_sum.toFixed(2).replace('.', ',')} €</p>{/if}</div><div class="text-right flex items-center gap-4"><p class="text-emerald-700 font-black text-sm bg-emerald-100/50 px-3 py-1 rounded-lg border border-emerald-200/50">{drive.km || 0} km</p>
                                <div class="flex gap-1.5 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                                    <button onclick={() => driveModal?.open(drive)} class="w-10 h-10 flex items-center justify-center text-neutral-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none" title="Bearbeiten"><Edit3 class="w-4 h-4" /></button>
                                    <button onclick={() => deleteDrive(drive.id)} class="w-10 h-10 flex items-center justify-center text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none" title="Löschen"><Trash2 class="w-4 h-4" /></button>
                                </div></div></div>{/each}</div>
                                <div class="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex justify-between items-center shadow-inner"><p class="text-xs font-bold text-emerald-800 uppercase tracking-wider">Gesamte Strecke</p><p class="text-lg font-black text-emerald-700">{totalKm} km</p></div>
                            {/if}
                        </div>

                        <div class="orga-card-white p-5">
                            <div class="flex items-center justify-between mb-4 border-b border-neutral-100 pb-2"><h3 class="text-[11px] font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5"><Banknote class="w-3.5 h-3.5" /> Sonderausgaben</h3><button onclick={() => expenditureModal?.open()} class="orga-button-ghost bg-rose-50 text-rose-700 hover:bg-rose-100 hover:text-rose-800 border-rose-200 min-h-10 px-4 text-xs font-bold shadow-sm focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none">+ Ausgabe eintragen</button></div>
                            {#if expenditures.length === 0}<p class="text-center text-sm font-medium text-neutral-400 py-6 bg-neutral-50 rounded-xl border border-dashed border-neutral-200">Keine Ausgaben hinterlegt.</p>{:else}
                                <div class="space-y-3 mb-4">{#each expenditures as exp}<div class="flex items-center justify-between p-4 rounded-xl border border-neutral-200 bg-neutral-50 hover:border-rose-300 transition-all shadow-sm group"><p class="text-sm font-bold text-neutral-900 flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-rose-400"></span> {exp.titel || 'Ausgabe'}</p><div class="text-right flex items-center gap-4"><p class="text-rose-700 font-black text-sm bg-rose-100/50 px-3 py-1 rounded-lg border border-rose-200/50">{exp.sum ? exp.sum.toFixed(2).replace('.', ',') : '0,00'} €</p>
                                <div class="flex gap-1.5 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                                    <button onclick={() => expenditureModal?.open(exp)} class="w-10 h-10 flex items-center justify-center text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none" title="Bearbeiten"><Edit3 class="w-4 h-4" /></button>
                                    <button onclick={() => deleteExpenditure(exp.id)} class="w-10 h-10 flex items-center justify-center text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none" title="Löschen"><Trash2 class="w-4 h-4" /></button>
                                </div></div></div>{/each}</div>
                                <div class="bg-rose-50 border border-rose-100 rounded-xl p-4 flex justify-between items-center shadow-inner"><p class="text-xs font-bold text-rose-800 uppercase tracking-wider">Gesamtsumme</p><p class="text-lg font-black text-rose-700">{totalExpenditure.toFixed(2).replace('.', ',')} €</p></div>
                            {/if}
                        </div>

                        <!-- Besuchsbericht / Report -->
                        <div class="orga-card-white p-5">
                            <div class="flex items-center justify-between mb-4 border-b border-neutral-100 pb-2">
                                <h3 class="text-[11px] font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
                                <FileText class="w-3.5 h-3.5" /> Besuchsbericht
                                </h3>
                            <div class="flex items-center gap-2">
                                <input type="file" accept="audio/*,.m4a,audio/mp4,audio/x-m4a,video/mp4" multiple class="hidden" bind:this={audioInput} onchange={uploadAudio} />
                                <button onclick={() => audioInput.click()} class="text-xs font-bold text-neutral-700 hover:text-brand-700 bg-neutral-100 hover:bg-brand-50 border border-transparent hover:border-brand-200 min-h-10 px-3 sm:px-4 rounded-xl transition-all shadow-sm flex items-center gap-1.5 active:scale-95 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none" title="Audio-Datei hochladen">
                                    <Paperclip class="w-3.5 h-3.5" /> <span class="hidden sm:inline">Audio anheften</span>
                                </button>
                                <button onclick={() => aiModal?.open('family', appointment, fullClient)} class="text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-brand-600/20 min-h-10 px-3 sm:px-4 rounded-xl flex items-center gap-1.5 transition-all shadow-sm active:scale-95 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none">
                                    <Bot class="w-3.5 h-3.5" /> <span class="hidden sm:inline">KI-Assistent</span>
                                </button>
                            </div>
                            </div>
                            <div class="flex flex-col gap-5">
                            
                            <div>
                                <h4 class="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2.5 flex items-center gap-1.5 pl-1"><FileText class="w-3.5 h-3.5" /> Offizieller Bericht</h4>
                                <textarea bind:value={report} class="orga-input-clear resize-y min-h-32 text-sm leading-relaxed" placeholder="Ausführlicher Bericht für Angehörige / Pflegekasse..." disabled={isReportSaving}></textarea>
                            </div>
                            
                            {#if appointment?.voice_records && appointment.voice_records.length > 0}
                                <div transition:slide class="bg-brand-50/50 rounded-2xl p-4 border border-brand-100 mt-2 shadow-inner">
                                    <h4 class="text-[10px] font-black text-brand-800 uppercase tracking-widest mb-3 flex items-center gap-1.5"><Mic class="w-3.5 h-3.5" /> Gespeicherte Sprachnotizen</h4>
                                    <div class="flex flex-col gap-3">
                                        {#each appointment.voice_records as vr}
                                            <div class="flex items-center justify-between bg-white p-3 rounded-xl border border-brand-100 shadow-sm">
                                                <audio controls src={pb.files.getURL(appointment, vr)} class="h-8 max-w-50 sm:max-w-62.5"></audio>
                                                <button onclick={() => deleteVoiceRecord(vr)} class="w-10 h-10 flex items-center justify-center text-neutral-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none" title="Sprachnotiz löschen"><Trash2 class="w-4 h-4" /></button>
                                            </div>
                                        {/each}
                                    </div>
                                </div>
                            {/if}
                                <div class="flex justify-end mt-2">
                                <button onclick={saveReport} disabled={isReportSaving || report === (appointment?.report || '')} class="orga-button-primary min-h-12 px-8 text-sm w-full sm:w-auto shadow-brand-600/20">
                                        <Save class="w-4 h-4" /> {isReportSaving ? 'Speichert...' : 'Bericht speichern'}
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
        <div class="bg-white rounded-3xl w-full relative overflow-hidden shadow-2xl flex flex-col">
            <div class="bg-white px-6 py-5 border-b border-neutral-100 flex items-center justify-between shrink-0 sticky top-0 z-10 gap-3">
                <h2 class="text-xl font-bold text-neutral-900 truncate">Details zur Leistung</h2>
                <button aria-label="Schließen" onclick={() => taskDialog?.close()} class="w-10 h-10 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-full flex items-center justify-center transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-neutral-500 focus-visible:outline-none shrink-0"><X class="w-5 h-5" /></button>
            </div>
            <div class="p-6 overflow-y-auto custom-scrollbar">
            <p class="text-sm text-neutral-500 mb-5 font-medium leading-relaxed">Möchten Sie für <strong>"{newTaskTitle}"</strong> noch weitere Details oder Abrechnungshinweise hinterlegen?</p>
            <form onsubmit={(e) => { e.preventDefault(); createAndLinkTask(); }} class="space-y-5 pb-2">
                <textarea bind:value={newTaskDescription} rows="4" class="orga-input-clear resize-none text-sm" placeholder="Optionale, genauere Beschreibung..."></textarea>
                <div class="flex flex-col-reverse sm:flex-row justify-end gap-3 mt-4 pt-4 border-t border-neutral-100">
                    <button type="button" onclick={() => taskDialog?.close()} class="orga-button-ghost min-h-12 px-6 w-full sm:w-auto" disabled={isTaskLoading}>Abbrechen</button>
                    <button type="submit" class="orga-button-primary bg-amber-500 hover:bg-amber-600 shadow-amber-500/20 min-h-12 px-8 w-full sm:w-auto" disabled={isTaskLoading}><Save class="w-4 h-4" /> {isTaskLoading ? "Speichert..." : "Speichern"}</button>
                </div>
            </form>
            </div>
        </div>
    </dialog>
</dialog>