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
    import FollowUpAppointmentModal from "$lib/components/FollowUpAppointmentModal.svelte";
    import { googleCalendarService } from "$lib/services/googleCalendarService";
    import { toastStore } from "$lib/services/toastService.svelte";
    import { confirmStore } from "$lib/services/confirmService.svelte";
    import { slide, fade } from "svelte/transition";
    import { 
        X, Calendar, Clock, User, MapPin, CheckCircle2, Lock, Unlock, Eye, EyeOff, Repeat, Trash2, Edit3, MessageSquare, 
        Stethoscope, Navigation, FileText, Play, Square, ListTodo, Car, Banknote, Paperclip, Bot, FileSignature, Mic, MicOff, ChevronUp, ChevronDown,
        Save, RotateCw, PhoneCall, Copy, ExternalLink, Sparkles, Check, AlertCircle, ShieldCheck, UserCheck, Search, MoreVertical, ChevronRight
    } from "lucide-svelte";

    let dialog: HTMLDialogElement;
    let appId = $state<string | null>(null);
    let appointment = $derived(appId ? orgaStore.appointments?.getById(appId) : null);

    // Aktiver Tab / Filter für ergonomische Navigation
    type TabType = 'all' | 'overview' | 'time' | 'tasks' | 'report' | 'travel' | 'map';
    let currentTab = $state<TabType>('all');
    let showMobileMoreMenu = $state(false);
    let showMobileMapEmbed = $state(false);

    // States for editable appointment internal notes
    let isEditingInternalNotes = $state(false);
    let internalNotesValue = $state("");

    // States for editable appointment description
    let isEditingDescription = $state(false);
    let descriptionValue = $state("");

    // Klient & Betreuer Auflösung
    let client = $derived(appointment?.expand?.client?.[0] || null);
    let fullClient = $derived(client ? orgaStore.clients?.getById(client.id) : null);

    let assignedUser = $derived.by(() => {
        if (!appointment) return null;
        if (appointment.expand?.user) {
            return Array.isArray(appointment.expand.user) ? appointment.expand.user[0] : appointment.expand.user;
        }
        const uid = Array.isArray(appointment.user) ? appointment.user[0] : appointment.user;
        if (uid) return orgaStore.users?.getById(uid) || null;
        return null;
    });

    let timeRecords = $derived(appointment?.expand?.time_record || []);
    let runningTimeRecord = $derived(timeRecords.find((r: any) => r.start && !r.end));
    let driveRecords = $derived(appointment?.expand?.drive_record || []);
    let tasks = $derived(appointment?.expand?.tasks || []);
    let expenditures = $derived(appointment?.expand?.expenditures || []);
    let isSuperAdmin = $derived(pb.authStore.isSuperuser || pb.authStore.model?.role === 'superadmin' || pb.authStore.model?.role === 'admin');

    // Live-Stoppuhr Ticker für aktive Zeiterfassung
    let elapsedSeconds = $state(0);
    let timerInterval: any = null;

    $effect(() => {
        if (runningTimeRecord && runningTimeRecord.start) {
            const startTime = new Date(runningTimeRecord.start).getTime();
            const tick = () => {
                elapsedSeconds = Math.max(0, Math.floor((Date.now() - startTime) / 1000));
            };
            tick();
            timerInterval = setInterval(tick, 1000);
            return () => {
                if (timerInterval) clearInterval(timerInterval);
            };
        } else {
            elapsedSeconds = 0;
            if (timerInterval) {
                clearInterval(timerInterval);
                timerInterval = null;
            }
        }
    });

    function formatElapsed(totalSecs: number): string {
        const hours = Math.floor(totalSecs / 3600);
        const mins = Math.floor((totalSecs % 3600) / 60);
        const secs = totalSecs % 60;
        const pad = (n: number) => n.toString().padStart(2, '0');
        if (hours > 0) {
            return `${pad(hours)}:${pad(mins)}:${pad(secs)}`;
        }
        return `${pad(mins)}:${pad(secs)}`;
    }

    let totalRecordedMinutes = $derived.by(() => {
        let total = 0;
        for (const r of timeRecords) {
            if (r.start && r.end) {
                const diffMs = new Date(r.end).getTime() - new Date(r.start).getTime();
                if (diffMs > 0) total += Math.round(diffMs / 60000);
            }
        }
        return total;
    });

    function formatMinutes(mins: number): string {
        const hours = Math.floor(mins / 60);
        const remainingMins = mins % 60;
        if (hours === 0) return `${remainingMins} min`;
        return `${hours}h ${remainingMins > 0 ? `${remainingMins}m` : ''}`.trim();
    }

    // Routen- & Standort-Zustände (für PC- und Mobil-Routenkarte)
    let userLocation = $state<{ lat: number; lng: number } | null>(null);
    let isLocatingUser = $state(false);
    let locationError = $state<string | null>(null);
    let startPointMode = $state<'device' | 'company'>('device');

    let companyAddress = $derived.by(() => {
        const comp = orgaStore.company?.data?.[0];
        if (!comp) return '';
        const street = `${comp.street || ''} ${comp.housenr || ''}`.trim();
        const city = `${comp.zip || ''} ${comp.city || ''}`.trim();
        return [street, city].filter(Boolean).join(', ');
    });

    let destinationAddress = $derived.by(() => {
        if (!appointment) return '';
        // 1. Kontakt / Arzt / Anlaufstelle
        const firstContact = appointment.expand?.appointment_at?.[0];
        if (firstContact?.street) {
            const addr = `${firstContact.street} ${firstContact.housenr || ''}`.trim();
            const city = `${firstContact.zip || ''} ${firstContact.city || ''}`.trim();
            return [addr, city].filter(Boolean).join(', ');
        }
        // 2. Explizite Ort / Zieladresse
        if (appointment.location_address) {
            return appointment.location_address.trim();
        }
        // 3. Beim Klienten
        if (appointment.use_client_address && fullClient?.street) {
            const addr = `${fullClient.street} ${fullClient.housenr || ''}`.trim();
            const city = `${fullClient.zip || ''} ${fullClient.city || ''}`.trim();
            return [addr, city].filter(Boolean).join(', ');
        }
        // 4. Klienten-Adresse allgemein falls vorhanden
        if (fullClient?.street && fullClient?.city) {
            const addr = `${fullClient.street} ${fullClient.housenr || ''}`.trim();
            const city = `${fullClient.zip || ''} ${fullClient.city || ''}`.trim();
            return [addr, city].filter(Boolean).join(', ');
        }
        return '';
    });

    let routeEmbedUrl = $derived.by(() => {
        if (!destinationAddress) return '';
        const d = encodeURIComponent(destinationAddress);
        if (startPointMode === 'device' && userLocation) {
            const s = encodeURIComponent(`${userLocation.lat},${userLocation.lng}`);
            return `https://maps.google.com/maps?saddr=${s}&daddr=${d}&output=embed`;
        } else if (startPointMode === 'company' && companyAddress) {
            const s = encodeURIComponent(companyAddress);
            return `https://maps.google.com/maps?saddr=${s}&daddr=${d}&output=embed`;
        } else {
            return `https://maps.google.com/maps?saddr=Current+Location&daddr=${d}&output=embed`;
        }
    });

    let googleMapsNavUrl = $derived.by(() => {
        if (!destinationAddress) return '';
        const d = encodeURIComponent(destinationAddress);
        if (startPointMode === 'device' && userLocation) {
            const s = encodeURIComponent(`${userLocation.lat},${userLocation.lng}`);
            return `https://www.google.com/maps/dir/?api=1&origin=${s}&destination=${d}`;
        }
        if (startPointMode === 'company' && companyAddress) {
            const s = encodeURIComponent(companyAddress);
            return `https://www.google.com/maps/dir/?api=1&origin=${s}&destination=${d}`;
        }
        return `https://www.google.com/maps/dir/?api=1&destination=${d}`;
    });

    function fetchDeviceLocation() {
        if (typeof window === 'undefined' || !navigator?.geolocation) {
            locationError = "Geolocation wird vom Browser nicht unterstützt.";
            return;
        }
        isLocatingUser = true;
        locationError = null;
        navigator.geolocation.getCurrentPosition(
            (position) => {
                userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                isLocatingUser = false;
            },
            (err) => {
                console.warn("Standort konnte nicht ermittelt werden:", err.message);
                locationError = "Standort-Zugriff nicht gestattet oder nicht verfügbar.";
                isLocatingUser = false;
            },
            { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
        );
    }

    function toggleStartPointMode() {
        if (startPointMode === 'device') {
            startPointMode = 'company';
        } else {
            startPointMode = 'device';
            if (!userLocation) {
                fetchDeviceLocation();
            }
        }
    }

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
    /** @type {ReturnType<typeof FollowUpAppointmentModal>} */
    let followUpModal = $state() as any;

    let currentAppIdForReport = $state<string | null>(null);
    let report = $state("");
    let isReportSaving = $state(false);
    let audioInput = $state<HTMLInputElement>();

    let isTimeLoading = $state(false);

    // Leistungen (Tasks) Suche & Dialog
    let taskDialog: HTMLDialogElement;
    let newTaskTitle = $state("");
    let newTaskDescription = $state("");
    let isTasksExpanded = $state(false);
    let isTaskLoading = $state(false);
    let taskSearchQuery = $state("");

    let filteredAvailableTasks = $derived.by(() => {
        const allTasks = (orgaStore.tasks?.data || []).slice().sort((a: any, b: any) => a.title.localeCompare(b.title));
        if (!taskSearchQuery.trim()) return allTasks;
        const q = taskSearchQuery.toLowerCase().trim();
        return allTasks.filter((t: any) => t.title?.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q));
    });

    // Web Speech API Sprachdiktat
    let isListening = $state(false);
    let recognition: any = null;

    function toggleSpeechRecognition() {
        if (typeof window === 'undefined') return;
        const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRec) {
            toastStore.info("Live-Sprachdiktat wird von diesem Browser nicht unterstützt (Chrome, Edge & Safari empfohlen).");
            return;
        }

        if (isListening) {
            recognition?.stop();
            isListening = false;
            return;
        }

        try {
            recognition = new SpeechRec();
            recognition.lang = 'de-DE';
            recognition.continuous = true;
            recognition.interimResults = false;

            recognition.onstart = () => {
                isListening = true;
                toastStore.info("Diktat aktiv: Bitte sprechen Sie Ihren Besuchsbericht ein...");
            };

            recognition.onresult = (event: any) => {
                let transcript = '';
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    if (event.results[i].isFinal) {
                        transcript += event.results[i][0].transcript;
                    }
                }
                if (transcript.trim()) {
                    report = (report ? report.trim() + ' ' : '') + transcript.trim();
                }
            };

            recognition.onerror = (event: any) => {
                console.warn("Speech recognition error:", event.error);
                isListening = false;
                if (event.error !== 'no-speech') {
                    toastStore.error("Diktat unterbrochen: " + event.error);
                }
            };

            recognition.onend = () => {
                isListening = false;
            };

            recognition.start();
        } catch (e) {
            console.error(e);
            isListening = false;
        }
    }

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
        if (appointment && !isEditingDescription) {
            descriptionValue = appointment.description?.replace('[BLOCK]', '').trim() || "";
        }
    });

    function autoResize(node: HTMLTextAreaElement) {
        function resize() {
            node.style.height = 'auto';
            node.style.height = `${node.scrollHeight}px`;
        }
        node.addEventListener('input', resize);
        setTimeout(resize, 0);
        return { destroy: () => node.removeEventListener('input', resize) };
    }

    export function open(id: string) {
        appId = id;
        currentTab = 'all';
        showMobileMoreMenu = false;
        showMobileMapEmbed = false;
        isEditingInternalNotes = false;
        isEditingDescription = false;
        isTasksExpanded = false;
        taskSearchQuery = "";
        if (!userLocation && startPointMode === 'device') {
            fetchDeviceLocation();
        }
        dialog?.showModal();
        setTimeout(() => document.querySelectorAll('textarea').forEach(ta => ta.dispatchEvent(new Event('input'))), 50);
    }

    async function saveInternalNotes() {
        if (!appointment) return;
        try {
            await pb.collection('appointments').update(appointment.id, { notes: internalNotesValue });
            await updateAppointmentStore();
            isEditingInternalNotes = false;
            toastStore.success("Interne Notizen gespeichert.");
        } catch (err) {
            console.error(err);
            toastStore.error("Fehler beim Speichern der Notizen.");
        }
    }

    async function saveDescription() {
        if (!appointment) return;
        try {
            const finalDesc = appointment.description?.includes('[BLOCK]') ? `[BLOCK] ${descriptionValue}` : descriptionValue;
            await pb.collection('appointments').update(appointment.id, { description: finalDesc });
            await updateAppointmentStore();
            isEditingDescription = false;
            toastStore.success("Termin-Beschreibung gespeichert.");
        } catch (err) {
            console.error(err);
            toastStore.error("Fehler beim Speichern der Beschreibung.");
        }
    }

    async function toggleSettled() {
        if (!appointment) return;
        const newStatus = !appointment.settled;
        try {
            await pb.collection('appointments').update(appointment.id, { settled: newStatus });
            await updateAppointmentStore();
            if (newStatus) {
                toastStore.success("Termin als abgerechnet markiert.");
            } else {
                toastStore.info("Abrechnungsstatus auf 'Offen' gesetzt.");
            }
        } catch (err) {
            console.error(err);
            toastStore.error("Fehler beim Aktualisieren des Abrechnungsstatus.");
        }
    }

    async function togglePrivate() {
        if (!appointment) return;
        const newStatus = !appointment.is_private;
        try {
            await pb.collection('appointments').update(appointment.id, { is_private: newStatus });
            await updateAppointmentStore();
            toastStore.success(newStatus ? "Termin als privat markiert." : "Termin als beruflich markiert.");
        } catch (err) {
            console.error(err);
            toastStore.error("Fehler beim Ändern des Status.");
        }
    }

    async function toggleClientVisibility() {
        if (!appointment) return;
        const newStatus = !appointment.is_visible;
        try {
            await pb.collection('appointments').update(appointment.id, { is_visible: newStatus });
            await updateAppointmentStore();
            toastStore.success(newStatus ? "Im Klienten-Portal sichtbar." : "Im Klienten-Portal verborgen.");
        } catch (err) {
            console.error(err);
            toastStore.error("Fehler beim Ändern der Sichtbarkeit.");
        }
    }

    async function copyToClipboard(text: string, label: string = "Text") {
        if (!text || typeof navigator === 'undefined' || !navigator.clipboard) return;
        try {
            await navigator.clipboard.writeText(text);
            toastStore.success(`${label} kopiert.`);
        } catch {
            toastStore.info(`${label} konnte nicht kopiert werden.`);
        }
    }

    async function updateAppointmentStore() {
        if (!appointment) return;
        setTimeout(async () => {
            const updatedApp = await pb.collection('appointments').getOne(appointment.id, { 
                expand: 'user,client,drive_record,time_record,tasks,expenditures,appointment_at', 
                requestKey: null 
            }) as any;
            const index = orgaStore.appointments?.data.findIndex(a => a.id === appointment!.id) ?? -1;
            if (index !== -1 && orgaStore.appointments) orgaStore.appointments.data[index] = updatedApp;
        }, 400);
    }

    export function close() { 
        if (isListening) {
            recognition?.stop();
            isListening = false;
        }
        showMobileMoreMenu = false;
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
        try { 
            await pb.collection('time_records').delete(id); 
            await updateAppointmentStore(); 
            toastStore.info("Zeiterfassung gelöscht."); 
        } catch (err) { 
            console.error(err); 
            toastStore.error("Fehler beim Löschen."); 
        } finally { 
            isTimeLoading = false; 
        }
    }

    async function toggleTask(taskId: string) {
        if (!appointment) return;
        const currentTaskIds = tasks.map((t: any) => t.id);
        const newIds = currentTaskIds.includes(taskId) ? currentTaskIds.filter((id: string) => id !== taskId) : [...currentTaskIds, taskId];
        try {
            await pb.collection('appointments').update(appointment.id, { tasks: newIds });
            await updateAppointmentStore();
            toastStore.success("Leistungen aktualisiert.");
        } catch (err) { 
            console.error(err); 
            toastStore.error("Fehler beim Aktualisieren der Leistungen."); 
        }
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
            toastStore.success("Besuchsbericht gespeichert.");
        } catch(err) {
            console.error(err);
            toastStore.error("Fehler beim Speichern des Berichts.");
        } finally {
            isReportSaving = false;
        }
    }

    async function handleAiSave(newText: string, type: 'family' | 'internal', blobs?: Blob[]) {
        const dateHeader = `\n\n--- Dokumentation vom ${new Date().toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })} Uhr ---\n`;
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
                let currentApp = await pb.collection('appointments').update(appointment.id, payload);
                let currentVoiceRecords = currentApp.voice_records || [];
                
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
            toastStore.success("Bericht und Notizen aktualisiert.");
        } catch(err) {
            console.error(err);
            toastStore.error("Fehler beim Speichern.");
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
            if (hasHugeFile) toastStore.info("Upload läuft...");

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
            toastStore.success("Audio-Aufnahme erfolgreich hinzugefügt.");
        } catch (err: any) {
            console.error(err);
            toastStore.error("Fehler beim Hochladen der Audio-Datei.");
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
        } catch (err) { 
            console.error(err); 
            toastStore.error("Fehler beim Erstellen der Leistung."); 
        } finally { 
            isTaskLoading = false; 
        }
    }

    async function deleteTask(taskId: string) {
        if (!(await confirmStore.ask("Möchten Sie diese Leistung wirklich aus dem Gesamtsystem löschen?", "Leistung löschen?", "Löschen", "Abbrechen", true))) return;
        isTaskLoading = true;
        try {
            await pb.collection('tasks').delete(taskId);
            if (appointment && tasks.some((t: any) => t.id === taskId)) {
                const currentTaskIds = tasks.map((t: any) => t.id).filter((id: string) => id !== taskId);
                await pb.collection('appointments').update(appointment.id, { tasks: currentTaskIds });
                await updateAppointmentStore();
            }
            toastStore.info("Leistung gelöscht.");
        } catch (err) { 
            console.error(err); 
            toastStore.error("Fehler beim Löschen."); 
        } finally { 
            isTaskLoading = false; 
        }
    }

    async function deleteSeries() {
        if (!appointment || !appointment.is_series || !appointment.series_id) return;
        if (!(await confirmStore.ask("Möchten Sie diesen und ALLE zukünftigen Termine dieser Serie löschen?", "Komplette Serie löschen?", "Ja, Serie löschen", "Abbrechen", true))) return;

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

<dialog 
    bind:this={dialog} 
    class="p-0 bg-transparent backdrop:bg-slate-950/65 backdrop:backdrop-blur-md w-full max-w-5xl m-0 sm:m-auto rounded-none sm:rounded-3xl h-dvh sm:h-auto overflow-hidden shadow-2xl touch-manipulation" 
    onclick={(e) => { if (e.target === dialog) close(); }}
>
    <div class="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 sm:rounded-3xl w-full h-full sm:max-h-[92dvh] flex flex-col relative overflow-hidden border border-slate-200/80 dark:border-slate-800" style="padding-bottom: env(safe-area-inset-bottom);">
        
        <!-- Header mit Live-Status und Aktionen (Desktop + optimierte Mobile-Bar) -->
        <div class="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/90 dark:border-slate-800 shrink-0 sticky top-0 z-30 shadow-xs">
            
            <!-- Mobile Header Top Row (< 640px) -->
            <div class="flex sm:hidden items-center justify-between px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800 gap-2">
                <div class="flex items-center gap-2.5 min-w-0">
                    <button 
                        type="button"
                        aria-label="Schließen" 
                        onclick={close} 
                        class="w-10 h-10 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700 cursor-pointer"
                    >
                        <X class="w-5 h-5" />
                    </button>
                    <div class="min-w-0">
                        <h2 class="text-base font-black text-slate-900 dark:text-slate-100 truncate leading-tight flex items-center gap-1.5">
                            Termin-Details
                            {#if runningTimeRecord}
                                <span class="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                            {/if}
                        </h2>
                        <p class="text-[11px] text-slate-500 dark:text-slate-400 font-semibold truncate">
                            {appointment?.appointment ? new Date(appointment.appointment as string).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' }) : ''} 
                            {appointment?.appointment ? `• ${new Date(appointment.appointment as string).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr` : ''}
                        </p>
                    </div>
                </div>

                <div class="flex items-center gap-1.5 shrink-0">
                    <!-- Schneller Folgetermin -->
                    {#if appointment?.user === pb.authStore.model?.id || (Array.isArray(appointment?.user) && appointment?.user.includes(pb.authStore.model?.id)) || isSuperAdmin}
                        <button 
                            type="button" 
                            onclick={() => followUpModal?.open(appointment)}
                            class="h-10 px-3 text-indigo-700 dark:text-indigo-300 active:bg-indigo-600 active:text-white rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center gap-1 text-xs font-bold border border-indigo-200 dark:border-indigo-800 cursor-pointer"
                        >
                            <span>⚡</span>
                            <span>Folge</span>
                        </button>
                    {/if}

                    <!-- Mobiles Menü für weitere Aktionen -->
                    <button 
                        type="button" 
                        onclick={() => showMobileMoreMenu = !showMobileMoreMenu} 
                        class="w-10 h-10 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl flex items-center justify-center border border-slate-200 dark:border-slate-700 cursor-pointer"
                        title="Weitere Aktionen"
                    >
                        <MoreVertical class="w-4 h-4" />
                    </button>
                </div>
            </div>

            <!-- Mobiles Ausklapp-Menü für Sekundär-Aktionen -->
            {#if showMobileMoreMenu}
                <div transition:slide class="sm:hidden bg-slate-50 dark:bg-slate-800/90 px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex flex-wrap gap-2 text-xs">
                    <button 
                        onclick={() => { showMobileMoreMenu = false; reminderModal?.open(appointment, fullClient); }} 
                        class="min-h-10 px-3 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-2 active:scale-95"
                    >
                        <MessageSquare class="w-4 h-4 text-brand-600 dark:text-brand-400" /> Nachricht / SMS
                    </button>
                    <button 
                        onclick={() => { showMobileMoreMenu = false; editModal?.open(appointment); }} 
                        class="min-h-10 px-3 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-2 active:scale-95"
                    >
                        <Edit3 class="w-4 h-4 text-brand-600 dark:text-brand-400" /> Termin bearbeiten
                    </button>
                    {#if appointment?.google_event_link}
                        <a 
                            href={appointment.google_event_link} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            class="min-h-10 px-3 bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 font-bold rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center gap-2 active:scale-95"
                        >
                            <Calendar class="w-4 h-4" /> Google Kalender
                        </a>
                    {:else}
                        <button 
                            onclick={() => googleCalendarService.syncAppointment(appointment!.id, 'upsert').then(() => toastStore.success('Sync ausgelöst.')).catch(() => toastStore.error('Sync fehlgeschlagen.'))}
                            class="min-h-10 px-3 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-2 active:scale-95"
                        >
                            <RotateCw class="w-4 h-4" /> Google Sync
                        </button>
                    {/if}
                    {#if appointment?.is_series && appointment?.series_id}
                        <button 
                            onclick={() => { showMobileMoreMenu = false; deleteSeries(); }} 
                            class="min-h-10 px-3 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-bold rounded-xl border border-rose-200 dark:border-rose-900/60 flex items-center gap-2 active:scale-95"
                        >
                            <Repeat class="w-4 h-4" /> Serie löschen
                        </button>
                    {/if}
                    <button 
                        onclick={() => { showMobileMoreMenu = false; deleteAppointment(); }} 
                        class="min-h-10 px-3 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-bold rounded-xl border border-rose-200 dark:border-rose-900/60 flex items-center gap-2 active:scale-95"
                    >
                        <Trash2 class="w-4 h-4" /> Termin löschen
                    </button>
                </div>
            {/if}

            <!-- Desktop Header Top Row (>= 640px) -->
            <div class="hidden sm:flex items-center justify-between px-6 py-4 gap-3">
                <div class="flex items-center gap-4 min-w-0">
                    <div class="relative w-12 h-12 rounded-2xl {runningTimeRecord ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500/30' : 'bg-brand-50 dark:bg-slate-800 text-brand-600 dark:text-brand-400'} flex items-center justify-center font-bold shadow-xs shrink-0">
                        <Calendar class="w-6 h-6" />
                        {#if runningTimeRecord}
                            <span class="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span class="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white dark:border-slate-900"></span>
                            </span>
                        {/if}
                    </div>
                    <div class="min-w-0">
                        <h2 class="text-xl font-black text-slate-900 dark:text-slate-100 truncate">
                            Termin-Details
                        </h2>
                        <p class="text-sm text-slate-600 dark:text-slate-400 font-semibold truncate mt-0.5 flex items-center gap-1.5">
                            <Clock class="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            {appointment?.appointment ? new Date(appointment.appointment as string).toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }) : ''} 
                            {appointment?.appointment ? `um ${new Date(appointment.appointment as string).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr` : ''}
                        </p>
                    </div>
                </div>

                <div class="flex items-center gap-1.5 shrink-0">
                    {#if appointment}
                        {#if appointment?.user === pb.authStore.model?.id || (Array.isArray(appointment?.user) && appointment?.user.includes(pb.authStore.model?.id)) || isSuperAdmin}
                            <button 
                                type="button" 
                                onclick={() => followUpModal?.open(appointment)}
                                class="h-10 px-3 text-indigo-700 dark:text-indigo-300 hover:text-white hover:bg-indigo-600 rounded-xl transition-all active:scale-95 bg-indigo-50 dark:bg-indigo-950/40 flex items-center gap-1.5 shadow-2xs border border-indigo-200 dark:border-indigo-800 hover:border-indigo-600 cursor-pointer"
                                title="Schnellen Folgetermin vereinbaren"
                            >
                                <span class="text-sm">⚡</span>
                                <span class="text-xs font-bold">Folgetermin</span>
                            </button>
                        {/if}

                        {#if appointment.google_event_link}
                            <a 
                                href={appointment.google_event_link} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                class="w-10 h-10 text-emerald-700 dark:text-emerald-400 hover:text-white hover:bg-emerald-600 rounded-xl transition-all active:scale-95 bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center shadow-2xs border border-emerald-200 dark:border-emerald-800 hover:border-emerald-600"
                                title="In Google Kalender öffnen"
                            >
                                <Calendar class="w-4 h-4" />
                            </a>
                        {:else}
                            <button 
                                onclick={() => googleCalendarService.syncAppointment(appointment!.id, 'upsert').then(() => toastStore.success('Google Sync erfolgreich.')).catch(() => toastStore.error('Sync fehlgeschlagen.'))}
                                class="w-10 h-10 text-slate-500 dark:text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-slate-800 rounded-xl transition-all active:scale-95 bg-slate-100 dark:bg-slate-800 flex items-center justify-center shadow-2xs border border-slate-200 dark:border-slate-700 cursor-pointer"
                                title="Mit Google Kalender synchronisieren"
                            >
                                <RotateCw class="w-4 h-4" />
                            </button>
                        {/if}

                        <button onclick={() => reminderModal?.open(appointment, fullClient)} class="w-10 h-10 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-slate-800 rounded-xl transition-all active:scale-95 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs cursor-pointer" title="Erinnerung / SMS senden"><MessageSquare class="w-4 h-4" /></button>
                        <button onclick={() => editModal?.open(appointment)} class="w-10 h-10 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-slate-800 rounded-xl transition-all active:scale-95 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs cursor-pointer" title="Termin bearbeiten"><Edit3 class="w-4 h-4" /></button>
                        
                        {#if appointment.is_series && appointment.series_id}
                            <button onclick={deleteSeries} class="w-10 h-10 flex items-center justify-center text-rose-600 hover:text-white hover:bg-rose-600 rounded-xl transition-all active:scale-95 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 shadow-2xs cursor-pointer" title="Komplette Serie löschen">
                                <Repeat class="w-4 h-4" />
                            </button>
                        {/if}
                        <button onclick={deleteAppointment} class="w-10 h-10 flex items-center justify-center text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-all active:scale-95 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs cursor-pointer" title="Diesen Termin löschen"><Trash2 class="w-4 h-4" /></button>
                    {/if}
                    <div class="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>
                    <button aria-label="Schließen" onclick={close} class="w-10 h-10 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl flex items-center justify-center transition-all active:scale-95 border border-slate-200 dark:border-slate-700 shadow-2xs cursor-pointer"><X class="w-5 h-5" /></button>
                </div>
            </div>

            <!-- Interaktive Status-Pills (horizontal scrollbar auf Mobilgeräten) -->
            <div class="px-3.5 sm:px-6 py-2 bg-slate-100/70 dark:bg-slate-800/60 border-t border-slate-200/80 dark:border-slate-700/60 flex items-center gap-2 overflow-x-auto custom-scrollbar text-xs">
                <!-- Abrechnungs-Status Toggle -->
                <button 
                    type="button" 
                    onclick={toggleSettled} 
                    class="px-3 py-1.5 text-xs font-bold rounded-xl transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer shrink-0 border shadow-2xs {appointment?.settled ? 'bg-emerald-100 text-emerald-900 border-emerald-300' : 'bg-amber-100 text-amber-900 border-amber-300'}"
                    title="Klicken zum Umschalten des Abrechnungsstatus"
                >
                    {#if appointment?.settled}
                        <CheckCircle2 class="w-3.5 h-3.5 text-emerald-700" /> Abgerechnet
                    {:else}
                        <AlertCircle class="w-3.5 h-3.5 text-amber-700" /> Nicht abgerechnet
                    {/if}
                </button>

                <!-- Privat / Beruflich Toggle -->
                <button 
                    type="button" 
                    onclick={togglePrivate} 
                    class="px-3 py-1.5 text-xs font-bold rounded-xl transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer shrink-0 border shadow-2xs {appointment?.is_private ? 'bg-rose-100 text-rose-900 border-rose-300' : 'bg-white text-neutral-700 border-neutral-200'}"
                    title="Klicken zum Wechseln zwischen Privat und Beruflich"
                >
                    {#if appointment?.is_private}
                        <Lock class="w-3.5 h-3.5 text-rose-600" /> Privat
                    {:else}
                        <Unlock class="w-3.5 h-3.5 text-neutral-500" /> Beruflich
                    {/if}
                </button>

                <!-- Klienten-Portal Sichtbarkeit Toggle -->
                <button 
                    type="button" 
                    onclick={toggleClientVisibility} 
                    class="px-3 py-1.5 text-xs font-bold rounded-xl transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer shrink-0 border shadow-2xs {appointment?.is_visible ? 'bg-sky-100 text-sky-900 border-sky-300' : 'bg-white text-neutral-600 border-neutral-200'}"
                    title="Klicken zum Ändern der Sichtbarkeit im Klienten-Portal"
                >
                    {#if appointment?.is_visible}
                        <Eye class="w-3.5 h-3.5 text-sky-600" /> Portal: Sichtbar
                    {:else}
                        <EyeOff class="w-3.5 h-3.5 text-neutral-400" /> Portal: Verborgen
                    {/if}
                </button>

                {#if appointment?.is_series}
                    <span class="px-3 py-1.5 text-xs font-bold rounded-xl bg-brand-100 text-brand-900 border border-brand-200 flex items-center gap-1.5 shrink-0">
                        <Repeat class="w-3.5 h-3.5 text-brand-600" /> Serie
                    </span>
                {/if}
            </div>

            <!-- Segmented Mobile & Desktop Tab Navigation -->
            <div class="flex items-center gap-1 px-3 sm:px-6 py-2 overflow-x-auto custom-scrollbar text-xs font-bold border-t border-neutral-100">
                <button 
                    type="button" 
                    onclick={() => currentTab = 'all'} 
                    class="min-h-10 px-3.5 py-2 rounded-xl transition-all shrink-0 cursor-pointer flex items-center gap-1.5 active:scale-95 {currentTab === 'all' ? 'bg-neutral-900 text-white shadow-xs' : 'text-neutral-700 bg-neutral-100 active:bg-neutral-200'}"
                >
                    <Sparkles class="w-3.5 h-3.5" />
                    <span>Alle</span>
                </button>
                <button 
                    type="button" 
                    onclick={() => currentTab = 'overview'} 
                    class="min-h-10 px-3.5 py-2 rounded-xl transition-all shrink-0 cursor-pointer flex items-center gap-1.5 active:scale-95 {currentTab === 'overview' ? 'bg-neutral-900 text-white shadow-xs' : 'text-neutral-700 bg-neutral-100 active:bg-neutral-200'}"
                >
                    <User class="w-3.5 h-3.5" />
                    <span>Klient</span>
                </button>
                <button 
                    type="button" 
                    onclick={() => currentTab = 'time'} 
                    class="min-h-10 px-3.5 py-2 rounded-xl transition-all shrink-0 cursor-pointer flex items-center gap-1.5 active:scale-95 {currentTab === 'time' ? 'bg-neutral-900 text-white shadow-xs' : 'text-neutral-700 bg-neutral-100 active:bg-neutral-200'}"
                >
                    <Clock class="w-3.5 h-3.5" />
                    <span>Zeiten</span>
                    {#if runningTimeRecord}
                        <span class="px-1.5 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] animate-pulse font-mono">Live</span>
                    {:else if totalRecordedMinutes > 0}
                        <span class="px-1.5 py-0.5 rounded-full bg-neutral-200 text-neutral-800 text-[10px]">{formatMinutes(totalRecordedMinutes)}</span>
                    {/if}
                </button>
                <button 
                    type="button" 
                    onclick={() => currentTab = 'tasks'} 
                    class="min-h-10 px-3.5 py-2 rounded-xl transition-all shrink-0 cursor-pointer flex items-center gap-1.5 active:scale-95 {currentTab === 'tasks' ? 'bg-neutral-900 text-white shadow-xs' : 'text-neutral-700 bg-neutral-100 active:bg-neutral-200'}"
                >
                    <ListTodo class="w-3.5 h-3.5" />
                    <span>Aufgaben</span>
                    {#if tasks.length > 0}
                        <span class="px-1.5 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[10px]">{tasks.length}</span>
                    {/if}
                </button>
                <button 
                    type="button" 
                    onclick={() => currentTab = 'report'} 
                    class="min-h-10 px-3.5 py-2 rounded-xl transition-all shrink-0 cursor-pointer flex items-center gap-1.5 active:scale-95 {currentTab === 'report' ? 'bg-neutral-900 text-white shadow-xs' : 'text-neutral-700 bg-neutral-100 active:bg-neutral-200'}"
                >
                    <FileText class="w-3.5 h-3.5" />
                    <span>Bericht</span>
                    {#if appointment?.voice_records?.length}
                        <span class="px-1.5 py-0.5 rounded-full bg-brand-200 text-brand-900 text-[10px]">{appointment.voice_records.length}</span>
                    {/if}
                </button>
                <button 
                    type="button" 
                    onclick={() => currentTab = 'travel'} 
                    class="min-h-10 px-3.5 py-2 rounded-xl transition-all shrink-0 cursor-pointer flex items-center gap-1.5 active:scale-95 {currentTab === 'travel' ? 'bg-neutral-900 text-white shadow-xs' : 'text-neutral-700 bg-neutral-100 active:bg-neutral-200'}"
                >
                    <Car class="w-3.5 h-3.5" />
                    <span>Fahrten</span>
                    {#if totalKm > 0}
                        <span class="px-1.5 py-0.5 rounded-full bg-emerald-200 text-emerald-900 text-[10px]">{totalKm} km</span>
                    {/if}
                </button>
                {#if destinationAddress}
                    <button 
                        type="button" 
                        onclick={() => currentTab = 'map'} 
                        class="min-h-10 px-3.5 py-2 rounded-xl transition-all shrink-0 cursor-pointer flex items-center gap-1.5 active:scale-95 {currentTab === 'map' ? 'bg-neutral-900 text-white shadow-xs' : 'text-neutral-700 bg-neutral-100 active:bg-neutral-200'}"
                    >
                        <Navigation class="w-3.5 h-3.5" />
                        <span>Anfahrt</span>
                    </button>
                {/if}
            </div>
        </div>

        <!-- Scrollbarer Dialog-Inhalt mit Mobile Touch Optimization -->
        <div class="p-3.5 sm:p-6 overflow-y-auto custom-scrollbar flex-1 space-y-4 sm:space-y-6">
            {#if !appointment}
                <div class="flex flex-col items-center justify-center py-20">
                    <div class="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-3"></div>
                    <p class="text-sm font-bold text-neutral-500">Termin-Details werden geladen...</p>
                </div>
            {:else}
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                    
                    <!-- Spalte 1: Klient, Betreuer, Anlaufstelle, Route -->
                    {#if currentTab === 'all' || currentTab === 'overview' || currentTab === 'map'}
                        <div class="{currentTab === 'overview' || currentTab === 'map' ? 'lg:col-span-3 max-w-2xl mx-auto w-full' : 'lg:col-span-1'} space-y-4 sm:space-y-6">
                            
                            <!-- 1. Zugewiesener Klient Karte -->
                            {#if client}
                                <div class="bg-white rounded-2xl p-4 sm:p-5 border border-neutral-200/90 shadow-xs">
                                    <div class="flex items-center justify-between mb-3.5 border-b border-neutral-100 pb-2.5">
                                        <h3 class="text-xs font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
                                            <User class="w-4 h-4 text-emerald-600" /> Klient
                                        </h3>
                                        {#if fullClient?.care_level}
                                            <span class="px-2.5 py-1 text-xs font-black rounded-lg bg-purple-50 text-purple-800 border border-purple-200">
                                                {fullClient.care_level}
                                            </span>
                                        {/if}
                                    </div>

                                    <div class="flex items-start gap-3.5 mb-4">
                                        <div class="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-800 font-black flex items-center justify-center text-lg shadow-inner shrink-0 border border-emerald-200">
                                            {(client.name_first?.charAt(0) || '')}{(client.name_last?.charAt(0) || '')}
                                        </div>
                                        <div class="min-w-0 flex-1">
                                            <p class="text-lg font-black text-neutral-900 leading-snug truncate">
                                                {client.name_first} {client.name_last}
                                            </p>
                                            {#if fullClient?.street || fullClient?.city}
                                                <p class="text-xs sm:text-sm text-neutral-600 mt-1 leading-relaxed">
                                                    {fullClient.street || ''} {fullClient.housenr || ''}<br>
                                                    {fullClient.zip || ''} {fullClient.city || ''}
                                                </p>
                                            {/if}
                                        </div>
                                    </div>

                                    <!-- Wichtige Notizen zum Klienten (Warnung/Hinweise) -->
                                    {#if fullClient?.notes || client?.notes}
                                        <div transition:slide class="bg-amber-50 border border-amber-200/90 p-3.5 rounded-xl mb-4 text-xs sm:text-sm shadow-2xs">
                                            <p class="text-[11px] font-black text-amber-900 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                                <AlertCircle class="w-3.5 h-3.5 text-amber-700 shrink-0" /> Wichtige Klienten-Hinweise
                                            </p>
                                            <p class="text-amber-950 font-medium leading-relaxed whitespace-pre-wrap">{fullClient?.notes || client?.notes}</p>
                                        </div>
                                    {/if}

                                    <!-- Schnellaktionen Klient (Große Touch-Targets auf Mobile) -->
                                    <div class="flex flex-col gap-2 pt-2 border-t border-neutral-100">
                                        {#if fullClient?.phone || fullClient?.handy}
                                            <a 
                                                href="tel:{fullClient.handy || fullClient.phone}" 
                                                class="min-h-12 w-full px-4 bg-emerald-600 active:bg-emerald-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-sm shadow-sm active:scale-98"
                                                title="Klienten direkt anrufen"
                                            >
                                                <PhoneCall class="w-4 h-4" /> 
                                                <span>Klienten anrufen ({fullClient.handy || fullClient.phone})</span>
                                            </a>
                                        {/if}

                                        {#if fullClient?.street || fullClient?.city}
                                            <a 
                                                href="https://www.google.com/maps/dir/?api=1&destination={encodeURIComponent(`${fullClient.street || ''} ${fullClient.housenr || ''}, ${fullClient.zip || ''} ${fullClient.city || ''}`)}" 
                                                target="_blank" 
                                                rel="noopener noreferrer" 
                                                class="min-h-12 w-full px-4 bg-blue-50 active:bg-blue-100 text-blue-700 font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-sm border border-blue-200 active:scale-98"
                                                title="Navigation zum Klienten starten"
                                            >
                                                <Navigation class="w-4 h-4 text-blue-600" /> 
                                                <span>In Google Maps navigieren</span>
                                            </a>
                                        {/if}

                                        <button 
                                            type="button" 
                                            onclick={() => clientDetailModal?.open(client.id)} 
                                            class="min-h-11 w-full px-4 bg-neutral-100 active:bg-neutral-200 text-neutral-800 font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-xs sm:text-sm border border-neutral-200 active:scale-98"
                                        >
                                            <FileSignature class="w-4 h-4 text-neutral-600" /> Klienten-Akte öffnen
                                        </button>
                                    </div>
                                </div>
                            {/if}

                            <!-- 2. Zugewiesener Betreuer / Mitarbeiter -->
                            <div class="bg-white rounded-2xl p-4 sm:p-5 border border-neutral-200/90 shadow-xs">
                                <div class="flex items-center justify-between mb-3 border-b border-neutral-100 pb-2">
                                    <h3 class="text-xs font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
                                        <UserCheck class="w-4 h-4 text-indigo-600" /> Betreuer / Mitarbeiter
                                    </h3>
                                    {#if assignedUser?.role}
                                        <span class="px-2 py-0.5 text-[10px] font-bold rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase">
                                            {assignedUser.role}
                                        </span>
                                    {/if}
                                </div>

                                {#if assignedUser}
                                    <div class="flex items-center gap-3">
                                        <div class="w-11 h-11 rounded-xl bg-indigo-100 text-indigo-800 font-black flex items-center justify-center text-sm shrink-0 border border-indigo-200">
                                            {(assignedUser.name_first?.charAt(0) || '')}{(assignedUser.name_last?.charAt(0) || '')}
                                        </div>
                                        <div class="min-w-0 flex-1">
                                            <p class="text-sm font-bold text-neutral-900 truncate">
                                                {assignedUser.name_first} {assignedUser.name_last}
                                            </p>
                                            {#if assignedUser.email}
                                                <p class="text-xs text-neutral-500 truncate">{assignedUser.email}</p>
                                            {/if}
                                        </div>
                                    </div>
                                {:else}
                                    <div class="bg-neutral-50 border border-dashed border-neutral-200 p-3.5 rounded-xl text-center">
                                        <p class="text-xs text-neutral-500 font-medium">Kein spezifischer Betreuer hinterlegt.</p>
                                    </div>
                                {/if}
                            </div>

                            <!-- 3. Termin-Beschreibung & Interne Notizen -->
                            <div class="space-y-3 sm:space-y-4">
                                <!-- Beschreibung -->
                                <div class="bg-white p-4 rounded-2xl border border-blue-200/90 shadow-2xs">
                                    <div class="flex justify-between items-center mb-2">
                                        <p class="text-[10px] font-black text-blue-800 uppercase tracking-widest flex items-center gap-1">
                                            <FileText class="w-3.5 h-3.5 text-blue-600" /> Termin-Beschreibung
                                        </p>
                                        {#if !isEditingDescription}
                                            <button onclick={() => isEditingDescription = true} class="text-blue-700 active:text-blue-900 text-xs font-bold flex items-center gap-1 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                                                <Edit3 class="w-3.5 h-3.5" /> Bearbeiten
                                            </button>
                                        {/if}
                                    </div>
                                    {#if isEditingDescription}
                                        <div transition:slide>
                                            <textarea use:autoResize bind:value={descriptionValue} rows="2" class="orga-input-clear w-full text-base sm:text-sm min-h-20 bg-neutral-50 border-blue-300 focus:border-blue-500 rounded-xl" placeholder="Beschreibung des Termins..."></textarea>
                                            <div class="flex gap-2 mt-2 justify-end">
                                                <button onclick={() => { isEditingDescription = false; descriptionValue = appointment?.description?.replace('[BLOCK]', '').trim() || ""; }} class="min-h-10 px-3 text-xs font-bold text-neutral-600 bg-neutral-100 rounded-xl">Abbrechen</button>
                                                <button onclick={saveDescription} class="min-h-10 px-4 text-xs font-bold text-white bg-blue-600 rounded-xl shadow-xs">Speichern</button>
                                            </div>
                                        </div>
                                    {:else}
                                        <p class="text-sm text-neutral-800 font-medium leading-relaxed whitespace-pre-wrap">{descriptionValue || 'Keine Beschreibung vorhanden.'}</p>
                                    {/if}
                                </div>

                                <!-- Interne Notizen -->
                                <div class="bg-white p-4 rounded-2xl border border-rose-200/90 shadow-2xs">
                                    <div class="flex justify-between items-center mb-2">
                                        <p class="text-[10px] font-black text-rose-800 uppercase tracking-widest flex items-center gap-1">
                                            <ShieldCheck class="w-3.5 h-3.5 text-rose-600" /> Interne Team-Notizen
                                        </p>
                                        {#if !isEditingInternalNotes}
                                            <button onclick={() => isEditingInternalNotes = true} class="text-rose-700 active:text-rose-900 text-xs font-bold flex items-center gap-1 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                                                <Edit3 class="w-3.5 h-3.5" /> Bearbeiten
                                            </button>
                                        {/if}
                                    </div>
                                    {#if isEditingInternalNotes}
                                        <div transition:slide>
                                            <textarea use:autoResize bind:value={internalNotesValue} rows="2" class="orga-input-clear w-full text-base sm:text-sm min-h-20 bg-neutral-50 border-rose-300 focus:border-rose-500 rounded-xl" placeholder="Interne Hinweise für das Betreuer-Team..."></textarea>
                                            <div class="flex gap-2 mt-2 justify-end">
                                                <button onclick={() => { isEditingInternalNotes = false; internalNotesValue = appointment?.notes || ""; }} class="min-h-10 px-3 text-xs font-bold text-neutral-600 bg-neutral-100 rounded-xl">Abbrechen</button>
                                                <button onclick={saveInternalNotes} class="min-h-10 px-4 text-xs font-bold text-white bg-rose-600 rounded-xl shadow-xs">Speichern</button>
                                            </div>
                                        </div>
                                    {:else}
                                        {#if internalNotesValue}
                                            <p class="text-sm text-neutral-800 font-medium leading-relaxed whitespace-pre-wrap">{internalNotesValue}</p>
                                        {:else}
                                            <p class="text-xs text-neutral-400 italic">Keine internen Notizen hinterlegt.</p>
                                        {/if}
                                    {/if}
                                </div>
                            </div>

                            <!-- 4. Arzt / Anlaufstelle / Zielort -->
                            {#if appointment?.expand?.appointment_at}
                                {#each appointment.expand.appointment_at as contact}
                                    <div class="bg-white rounded-2xl p-4 sm:p-5 border border-blue-100 shadow-xs">
                                        <h3 class="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2.5 border-b border-neutral-100 pb-2 flex items-center gap-1.5">
                                            <Stethoscope class="w-4 h-4 text-blue-600" /> Anlaufstelle / Kontakt
                                        </h3>
                                        <p class="text-sm font-bold text-neutral-900">
                                            {#if contact.company_name}{contact.company_name}<br>{/if}
                                            {contact.name_first} {contact.name_last}
                                        </p>
                                        <p class="text-xs text-neutral-600 mt-1 mb-3">
                                            {contact.street || ''} {contact.housenr || ''}<br>
                                            {contact.zip || ''} {contact.city || ''}
                                        </p>
                                        <div class="flex flex-col gap-2 mb-3 text-xs">
                                            {#if contact.phone}
                                                <a href="tel:{contact.phone}" class="min-h-11 px-3 bg-neutral-100 rounded-xl text-neutral-800 active:bg-neutral-200 flex items-center gap-2 font-bold">
                                                    <span>📞</span> {contact.phone}
                                                </a>
                                            {/if}
                                            {#if contact.email}
                                                <a href="mailto:{contact.email}" class="min-h-11 px-3 bg-neutral-100 rounded-xl text-neutral-800 active:bg-neutral-200 flex items-center gap-2 font-bold">
                                                    <span>✉️</span> {contact.email}
                                                </a>
                                            {/if}
                                        </div>
                                        <a href="https://www.google.com/maps/dir/?api=1&destination={encodeURIComponent(`${contact.street || ''} ${contact.housenr || ''}, ${contact.zip || ''} ${contact.city || ''}`)}" 
                                           target="_blank" rel="noopener noreferrer" class="w-full min-h-12 flex justify-center items-center gap-2 bg-blue-600 active:bg-blue-700 text-white font-bold px-4 rounded-xl text-sm shadow-sm">
                                            <Navigation class="w-4 h-4" /> Navigation starten
                                        </a>
                                    </div>
                                {/each}
                            {:else if appointment?.location_address}
                                <div class="bg-white rounded-2xl p-4 border border-neutral-200/90 shadow-xs">
                                    <h3 class="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                        <MapPin class="w-4 h-4 text-blue-600" /> Ort / Zieladresse
                                    </h3>
                                    <p class="text-xs sm:text-sm text-neutral-800 font-bold mb-3">{appointment.location_address}</p>
                                    <a href="https://www.google.com/maps/dir/?api=1&destination={encodeURIComponent(appointment.location_address)}" target="_blank" rel="noopener noreferrer" class="w-full min-h-12 flex justify-center items-center gap-2 bg-blue-600 active:bg-blue-700 text-white font-bold px-4 rounded-xl text-sm shadow-sm">
                                        <Navigation class="w-4 h-4" /> In Google Maps öffnen
                                    </a>
                                </div>
                            {/if}

                            <!-- 5. Routenkarte zum Zielort (Touch-sicher auf Mobilgeräten) -->
                            {#if destinationAddress}
                                <div class="bg-white rounded-2xl p-4 border border-neutral-200/90 shadow-xs">
                                    <div class="flex items-center justify-between mb-3 border-b border-neutral-100 pb-2">
                                        <h3 class="text-xs font-bold text-neutral-600 uppercase tracking-wider flex items-center gap-1.5">
                                            <Navigation class="w-4 h-4 text-blue-600" /> Route zum Zielort
                                        </h3>
                                        <button 
                                            type="button" 
                                            onclick={() => copyToClipboard(destinationAddress, "Zieladresse")}
                                            class="text-xs font-bold text-neutral-700 active:text-neutral-900 flex items-center gap-1 bg-neutral-100 px-2.5 py-1 rounded-lg"
                                            title="Adresse kopieren"
                                        >
                                            <Copy class="w-3 h-3" /> Kopieren
                                        </button>
                                    </div>

                                    <!-- Startpunkt Umschalter -->
                                    <div class="flex items-center justify-between gap-2 mb-3 text-xs bg-neutral-50 p-2.5 rounded-xl border border-neutral-200/80">
                                        <div class="flex items-center gap-2 min-w-0">
                                            <span class="text-base">{startPointMode === 'device' ? '📱' : '🏢'}</span>
                                            <div class="min-w-0">
                                                <span class="font-bold text-neutral-800 text-xs">Start: </span>
                                                <span class="text-xs text-neutral-600 truncate inline-block max-w-35 align-bottom">
                                                    {#if isLocatingUser}
                                                        <span class="text-blue-600 animate-pulse">GPS suchen...</span>
                                                    {:else if startPointMode === 'device'}
                                                        {userLocation ? 'GPS-Standort' : 'Gerätestandort'}
                                                    {:else}
                                                        Büro / Firma
                                                    {/if}
                                                </span>
                                            </div>
                                        </div>
                                        <div class="flex items-center gap-1.5 shrink-0">
                                            <button 
                                                type="button" 
                                                onclick={toggleStartPointMode} 
                                                class="text-xs font-bold px-2.5 py-1 rounded-lg bg-white active:bg-neutral-100 text-neutral-800 border border-neutral-200 cursor-pointer"
                                            >
                                                {startPointMode === 'device' ? '🏢 Büro' : '📱 GPS'}
                                            </button>
                                            {#if startPointMode === 'device'}
                                                <button 
                                                    type="button" 
                                                    onclick={fetchDeviceLocation} 
                                                    class="p-1.5 rounded-lg bg-white active:bg-neutral-100 text-neutral-600 border border-neutral-200"
                                                    title="GPS neu ermitteln"
                                                >
                                                    <RotateCw class="w-3.5 h-3.5 {isLocatingUser ? 'animate-spin text-blue-600' : ''}" />
                                                </button>
                                            {/if}
                                        </div>
                                    </div>

                                    <!-- Mobil: Touch-sichere Karten-Steuerung (verhindert Scroll-Fallen) -->
                                    <div class="sm:hidden mb-3">
                                        {#if !showMobileMapEmbed}
                                            <button 
                                                type="button" 
                                                onclick={() => showMobileMapEmbed = true}
                                                class="w-full min-h-12 flex items-center justify-center gap-2 bg-neutral-100 text-neutral-700 font-bold rounded-xl text-xs border border-neutral-200 active:bg-neutral-200"
                                            >
                                                🗺️ Interaktive Kartenansicht laden
                                            </button>
                                        {:else}
                                            <div class="w-full h-52 rounded-xl overflow-hidden border border-neutral-200 relative mb-2">
                                                <iframe
                                                    title="Route mobil"
                                                    src={routeEmbedUrl}
                                                    class="w-full h-full border-0"
                                                    loading="lazy"
                                                ></iframe>
                                            </div>
                                        {/if}
                                    </div>

                                    <!-- Desktop: Stets geladene Karte -->
                                    <div class="hidden sm:block w-full h-44 rounded-xl overflow-hidden border border-neutral-200 bg-neutral-100 relative mb-3">
                                        {#if routeEmbedUrl}
                                            <iframe
                                                title="Route zum Zielort"
                                                src={routeEmbedUrl}
                                                class="w-full h-full border-0"
                                                loading="lazy"
                                            ></iframe>
                                        {/if}
                                    </div>

                                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                                        <span class="text-neutral-600 truncate text-xs font-medium">🏁 {destinationAddress}</span>
                                        <a 
                                            href={googleMapsNavUrl} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            class="w-full sm:w-auto min-h-11 flex items-center justify-center gap-1.5 text-xs font-bold text-blue-700 bg-blue-50 active:bg-blue-100 px-4 py-2 rounded-xl border border-blue-200"
                                        >
                                            <ExternalLink class="w-4 h-4" /> Navigation in Maps starten
                                        </a>
                                    </div>
                                </div>
                            {/if}
                        </div>
                    {/if}

                    <!-- Spalte 2 & 3: Zeiterfassung, Aufgaben, Bericht, Fahrten -->
                    {#if currentTab === 'all' || currentTab === 'time' || currentTab === 'tasks' || currentTab === 'report' || currentTab === 'travel'}
                        <div class="{currentTab === 'all' ? 'lg:col-span-2' : 'lg:col-span-3 max-w-2xl mx-auto w-full'} space-y-4 sm:space-y-6">
                            
                            <!-- 1. Zeiterfassung -->
                            {#if currentTab === 'all' || currentTab === 'time'}
                                <div class="bg-white rounded-2xl p-4 sm:p-5 border border-neutral-200/90 shadow-xs">
                                    <div class="flex items-center justify-between mb-4 border-b border-neutral-100 pb-2.5">
                                        <div class="flex items-center gap-2">
                                            <h3 class="text-xs font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
                                                <Clock class="w-4 h-4 text-indigo-600" /> Zeiterfassung
                                            </h3>
                                            {#if totalRecordedMinutes > 0}
                                                <span class="px-2 py-0.5 text-xs font-black rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                                                    {formatMinutes(totalRecordedMinutes)}
                                                </span>
                                            {/if}
                                        </div>
                                        <button onclick={() => timeModal?.open()} class="min-h-10 px-3 bg-neutral-100 active:bg-neutral-200 rounded-xl text-xs font-bold border border-neutral-200">
                                            + Manuell
                                        </button>
                                    </div>
                                    
                                    {#if runningTimeRecord}
                                        <!-- Aktive Stoppuhr auf Mobile & Desktop -->
                                        <div transition:slide class="mb-5 bg-gradient-to-r from-emerald-600 to-teal-700 p-4 sm:p-6 rounded-2xl text-white shadow-lg shadow-emerald-600/20 flex flex-col sm:flex-row items-center justify-between gap-4">
                                            <div class="flex items-center gap-4 text-center sm:text-left w-full sm:w-auto">
                                                <div class="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl shrink-0">
                                                    ⏱️
                                                </div>
                                                <div class="min-w-0 flex-1">
                                                    <div class="flex items-center justify-center sm:justify-start gap-2">
                                                        <span class="relative flex h-3 w-3">
                                                            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                                            <span class="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                                                        </span>
                                                        <p class="text-xs font-bold uppercase tracking-wider text-emerald-100">Live-Zeiterfassung aktiv</p>
                                                    </div>
                                                    <p class="text-3xl sm:text-4xl font-black font-mono tracking-tight mt-0.5">
                                                        {formatElapsed(elapsedSeconds)}
                                                    </p>
                                                    <p class="text-xs text-emerald-100 font-medium mt-0.5">
                                                        Start: {new Date(runningTimeRecord.start).toLocaleTimeString('de-DE', {hour:'2-digit', minute:'2-digit'})} Uhr
                                                    </p>
                                                </div>
                                            </div>
                                            <button 
                                                type="button" 
                                                onclick={() => stopTracking(runningTimeRecord.id)} 
                                                disabled={isTimeLoading} 
                                                class="min-h-13 w-full sm:w-auto px-6 bg-white active:bg-rose-50 text-rose-600 font-black rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 text-base shrink-0 border border-white/50"
                                            >
                                                <Square class="w-5 h-5 fill-current" /> Zeiterfassung stoppen
                                            </button>
                                        </div>
                                    {:else}
                                        <div transition:slide class="mb-5 flex justify-center">
                                            <button 
                                                type="button" 
                                                onclick={startTracking} 
                                                disabled={isTimeLoading} 
                                                class="min-h-14 w-full sm:w-auto sm:px-8 text-base font-black rounded-2xl shadow-brand-600/20 bg-emerald-600 active:bg-emerald-700 text-white flex items-center justify-center gap-2.5 active:scale-98"
                                            >
                                                <Play class="w-6 h-6 fill-current" /> Zeiterfassung jetzt starten
                                            </button>
                                        </div>
                                    {/if}

                                    <!-- Abgeschlossene Zeitintervalle -->
                                    {#if timeRecords.filter((r: any) => r.start && r.end).length > 0}
                                        <h4 class="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-2.5 pl-1">
                                            Erfasste Zeiten ({timeRecords.filter((r: any) => r.start && r.end).length})
                                        </h4>
                                        <div class="space-y-2.5">
                                            {#each timeRecords.filter((r: any) => r.start && r.end) as record}
                                                <div class="flex items-center justify-between p-3.5 rounded-xl border border-neutral-200 bg-neutral-50/80 active:border-neutral-300 transition-all shadow-2xs">
                                                    <div class="flex items-center gap-2.5">
                                                        <span class="w-2.5 h-2.5 rounded-full bg-brand-500"></span>
                                                        <div>
                                                            <p class="text-xs sm:text-sm font-bold text-neutral-900">
                                                                {record.start ? new Date(record.start).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '...'} – {record.end ? new Date(record.end).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '...'} Uhr
                                                            </p>
                                                            <p class="text-[11px] text-neutral-500 font-medium">
                                                                {new Date(record.start).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div class="text-right flex items-center gap-2 sm:gap-3">
                                                        <span class="text-brand-800 font-black text-xs sm:text-sm bg-brand-100/70 px-2.5 py-1 rounded-lg border border-brand-200/50">
                                                            {getDuration(record.start, record.end)}
                                                        </span>
                                                        <div class="flex gap-1">
                                                            <button onclick={() => timeModal?.open(record)} class="w-9 h-9 flex items-center justify-center text-neutral-400 active:text-brand-600 bg-white rounded-lg border border-neutral-200" title="Bearbeiten"><Edit3 class="w-4 h-4" /></button>
                                                            <button onclick={() => deleteTime(record.id)} class="w-9 h-9 flex items-center justify-center text-neutral-400 active:text-rose-600 bg-white rounded-lg border border-neutral-200" title="Löschen"><Trash2 class="w-4 h-4" /></button>
                                                        </div>
                                                    </div>
                                                </div>
                                            {/each}
                                        </div>
                                    {:else if !runningTimeRecord}
                                        <p class="text-center text-xs font-medium text-neutral-400 py-6 bg-neutral-50 rounded-xl border border-dashed border-neutral-200">
                                            Noch keine Zeiten für diesen Termin erfasst.
                                        </p>
                                    {/if}
                                </div>
                            {/if}

                            <!-- 2. Leistungen (Tasks) -->
                            {#if currentTab === 'all' || currentTab === 'tasks'}
                                <div class="bg-white rounded-2xl p-4 sm:p-5 border border-neutral-200/90 shadow-xs">
                                    <div class="flex items-center justify-between mb-3.5 border-b border-neutral-100 pb-2.5">
                                        <div class="flex items-center gap-2">
                                            <h3 class="text-xs font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
                                                <ListTodo class="w-4 h-4 text-amber-600" /> Erbrachte Leistungen
                                            </h3>
                                            {#if tasks.length > 0}
                                                <span class="px-2 py-0.5 text-xs font-black rounded-md bg-amber-100 text-amber-900 border border-amber-300">
                                                    {tasks.length}
                                                </span>
                                            {/if}
                                        </div>
                                        <button
                                            type="button"
                                            class="min-h-10 px-3 text-xs font-bold text-neutral-700 bg-neutral-100 active:bg-neutral-200 rounded-xl flex items-center gap-1.5 border border-neutral-200"
                                            onclick={() => (isTasksExpanded = !isTasksExpanded)}
                                            aria-expanded={isTasksExpanded}
                                        >
                                            {#if isTasksExpanded}
                                                Schließen <ChevronUp class="w-3.5 h-3.5" />
                                            {:else}
                                                + Auswählen <ChevronDown class="w-3.5 h-3.5" />
                                            {/if}
                                        </button>
                                    </div>

                                    <!-- Erbrachte Leistungen Tags -->
                                    {#if tasks.length > 0}
                                        <div class="flex flex-wrap gap-2 mb-3">
                                            {#each tasks as t}
                                                <div class="flex items-center rounded-xl border bg-amber-50 border-amber-300 shadow-2xs overflow-hidden min-h-10">
                                                    <span class="px-3.5 py-1.5 text-xs font-bold text-amber-950 flex items-center gap-1.5">
                                                        <Check class="w-3.5 h-3.5 text-amber-700" /> {t.title}
                                                    </span>
                                                    {#if isTasksExpanded}
                                                        <button 
                                                            type="button" 
                                                            onclick={() => toggleTask(t.id)} 
                                                            class="h-full px-2.5 text-amber-700 active:text-rose-600 active:bg-rose-50 border-l border-amber-200"
                                                            title="Leistung abwählen"
                                                        >
                                                            <X class="w-3.5 h-3.5" />
                                                        </button>
                                                    {/if}
                                                </div>
                                            {/each}
                                        </div>
                                    {:else if !isTasksExpanded}
                                        <p class="text-center text-xs font-medium text-neutral-400 py-5 bg-neutral-50 rounded-xl border border-dashed border-neutral-200">
                                            Keine Leistungen für diesen Termin ausgewählt.
                                        </p>
                                    {/if}

                                    <!-- Ausgeklappter Leistungskatalog -->
                                    {#if isTasksExpanded}
                                        <div transition:slide={{ duration: 200 }} class="mt-4 pt-3 border-t border-neutral-100 space-y-3">
                                            <!-- Suche im Leistungskatalog -->
                                            <div class="relative">
                                                <Search class="w-4 h-4 text-neutral-400 absolute left-3 top-3.5" />
                                                <input 
                                                    type="text" 
                                                    bind:value={taskSearchQuery} 
                                                    placeholder="Leistungen durchsuchen..." 
                                                    class="w-full text-base sm:text-xs pl-9 pr-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:border-amber-400 focus:outline-none" 
                                                />
                                            </div>

                                            <div class="flex flex-wrap gap-2 max-h-56 overflow-y-auto custom-scrollbar p-1">
                                                {#each filteredAvailableTasks as t}
                                                    {@const isSelected = tasks.some((pt: any) => pt.id === t.id)}
                                                    <button 
                                                        type="button"
                                                        onclick={() => toggleTask(t.id)} 
                                                        class="min-h-11 px-3.5 py-2 rounded-xl border text-xs sm:text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer {isSelected ? 'bg-amber-500 text-white border-amber-600 shadow-2xs' : 'bg-white text-neutral-800 border-neutral-200 active:bg-amber-50'}"
                                                    >
                                                        {#if isSelected}
                                                            <Check class="w-4 h-4" />
                                                        {/if}
                                                        <span>{t.title}</span>
                                                    </button>
                                                {/each}
                                            </div>

                                            <!-- Neue Leistung schnell anlegen -->
                                            <div class="flex gap-2 pt-2 border-t border-neutral-100">
                                                <input 
                                                    type="text" 
                                                    bind:value={newTaskTitle} 
                                                    placeholder="Neue Leistung..." 
                                                    class="orga-input-clear text-base sm:text-xs flex-1 min-h-11" 
                                                    onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); openTaskModal(); } }} 
                                                    disabled={isTaskLoading} 
                                                />
                                                <button 
                                                    type="button" 
                                                    onclick={openTaskModal} 
                                                    disabled={!newTaskTitle.trim() || isTaskLoading} 
                                                    class="min-h-11 px-4 bg-amber-500 active:bg-amber-600 text-white font-bold rounded-xl text-xs shrink-0 shadow-xs"
                                                >
                                                    + Neu
                                                </button>
                                            </div>
                                        </div>
                                    {/if}
                                </div>
                            {/if}

                            <!-- 3. Besuchsbericht & Live-Diktat (Mobile-First) -->
                            {#if currentTab === 'all' || currentTab === 'report'}
                                <div class="bg-white rounded-2xl p-4 sm:p-5 border border-neutral-200/90 shadow-xs">
                                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3.5 border-b border-neutral-100 pb-2.5">
                                        <div class="flex items-center gap-2">
                                            <h3 class="text-xs font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
                                                <FileText class="w-4 h-4 text-brand-600" /> Besuchsbericht
                                            </h3>
                                            {#if report !== (appointment?.report || '')}
                                                <span class="px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-100 text-amber-900">
                                                    Ungespeichert
                                                </span>
                                            {/if}
                                        </div>

                                        <div class="flex items-center gap-2 flex-wrap">
                                            <!-- Live-Diktat Button (Groß & Prominent für Mobile) -->
                                            <button 
                                                type="button" 
                                                onclick={toggleSpeechRecognition} 
                                                class="min-h-11 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 active:scale-95 border {isListening ? 'bg-rose-600 text-white border-rose-700 shadow-md animate-pulse' : 'bg-neutral-100 text-neutral-800 active:bg-rose-50 border-neutral-200'}"
                                                title="Spracheingabe / Diktat starten oder beenden"
                                            >
                                                {#if isListening}
                                                    <MicOff class="w-4 h-4" /> <span>Diktat stoppen</span>
                                                {:else}
                                                    <Mic class="w-4 h-4 text-rose-600" /> <span>🎙️ Diktieren</span>
                                                {/if}
                                            </button>

                                            <!-- Audio anheften -->
                                            <input type="file" accept="audio/*,.m4a,audio/mp4,audio/x-m4a,video/mp4" multiple class="hidden" bind:this={audioInput} onchange={uploadAudio} />
                                            <button 
                                                type="button" 
                                                onclick={() => audioInput?.click()} 
                                                class="min-h-11 px-3.5 rounded-xl text-xs font-bold text-neutral-700 bg-neutral-100 active:bg-brand-50 border border-neutral-200 flex items-center gap-1.5 active:scale-95" 
                                                title="Audio-Aufnahme hochladen"
                                            >
                                                <Paperclip class="w-4 h-4" /> <span>Audio</span>
                                            </button>

                                            <!-- KI-Assistent -->
                                            <button 
                                                type="button" 
                                                onclick={() => aiModal?.open('family', appointment, fullClient)} 
                                                class="min-h-11 px-3.5 rounded-xl text-xs font-bold text-white bg-brand-600 active:bg-brand-700 shadow-xs flex items-center gap-1.5 active:scale-95"
                                            >
                                                <Bot class="w-4 h-4" /> <span>KI</span>
                                            </button>
                                        </div>
                                    </div>

                                    <div class="space-y-4">
                                        <div>
                                            <textarea 
                                                use:autoResize 
                                                bind:value={report} 
                                                rows="4" 
                                                class="orga-input-clear min-h-32 text-base sm:text-sm leading-relaxed w-full bg-neutral-50/70 border-neutral-200 focus:bg-white rounded-xl" 
                                                placeholder="Bericht über den Betreuungseinsatz einsprechen oder eintippen..." 
                                                disabled={isReportSaving}
                                            ></textarea>
                                        </div>

                                        <!-- Gespeicherte Sprachnotizen / Memos -->
                                        {#if appointment?.voice_records && appointment.voice_records.length > 0}
                                            <div transition:slide class="bg-neutral-50 rounded-2xl p-3.5 border border-neutral-200/90 shadow-2xs space-y-2">
                                                <h4 class="text-xs font-black text-neutral-700 uppercase tracking-wider flex items-center gap-1.5">
                                                    <Mic class="w-3.5 h-3.5 text-brand-600" /> Angehängte Sprachmemos ({appointment.voice_records.length})
                                                </h4>
                                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                    {#each appointment.voice_records as vr}
                                                        <div class="flex items-center justify-between bg-white p-2.5 rounded-xl border border-neutral-200 shadow-2xs gap-2">
                                                            <audio controls src={pb.files.getURL(appointment, vr)} class="h-9 w-full min-w-0"></audio>
                                                            <button onclick={() => deleteVoiceRecord(vr)} class="w-9 h-9 shrink-0 flex items-center justify-center text-neutral-400 active:text-rose-600 active:bg-rose-50 rounded-lg" title="Löschen">
                                                                <Trash2 class="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    {/each}
                                                </div>
                                            </div>
                                        {/if}

                                        <div class="flex justify-end pt-1">
                                            <button 
                                                type="button" 
                                                onclick={saveReport} 
                                                disabled={isReportSaving || report === (appointment?.report || '')} 
                                                class="min-h-12 w-full sm:w-auto px-8 text-sm font-bold bg-brand-600 active:bg-brand-700 text-white rounded-xl shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
                                            >
                                                <Save class="w-4 h-4" /> {isReportSaving ? 'Speichert...' : 'Bericht speichern'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            {/if}

                            <!-- 4. Fahrten & Sonderausgaben -->
                            {#if currentTab === 'all' || currentTab === 'travel'}
                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                                    <!-- Fahrten -->
                                    <div class="bg-white rounded-2xl p-4 sm:p-5 border border-neutral-200/90 shadow-xs flex flex-col justify-between">
                                        <div>
                                            <div class="flex items-center justify-between mb-3 border-b border-neutral-100 pb-2">
                                                <h3 class="text-xs font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
                                                    <Car class="w-4 h-4 text-emerald-600" /> Fahrtenbuch
                                                </h3>
                                                <button onclick={() => driveModal?.open()} class="min-h-10 px-3 text-xs font-bold text-emerald-800 bg-emerald-50 active:bg-emerald-100 rounded-xl border border-emerald-200">
                                                    + Fahrt
                                                </button>
                                            </div>

                                            {#if driveRecords.length === 0}
                                                <p class="text-center text-xs font-medium text-neutral-400 py-5 bg-neutral-50 rounded-xl border border-dashed border-neutral-200">
                                                    Keine Fahrten hinterlegt.
                                                </p>
                                            {:else}
                                                <div class="space-y-2 mb-3">
                                                    {#each driveRecords as drive}
                                                        <div class="flex items-center justify-between p-3 rounded-xl border border-neutral-200 bg-neutral-50 text-xs">
                                                            <div>
                                                                <p class="font-bold text-neutral-800 text-xs sm:text-sm">{drive.type || 'Fahrt'}</p>
                                                                {#if drive.lump_sum}
                                                                    <p class="text-[11px] text-neutral-500 font-medium">Pauschale: {drive.lump_sum.toFixed(2).replace('.', ',')} €</p>
                                                                {/if}
                                                            </div>
                                                            <div class="flex items-center gap-2">
                                                                <span class="font-black text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200">
                                                                    {drive.km || 0} km
                                                                </span>
                                                                <button onclick={() => driveModal?.open(drive)} class="w-8 h-8 flex items-center justify-center text-neutral-400 active:text-emerald-600 bg-white rounded-lg border border-neutral-200"><Edit3 class="w-3.5 h-3.5" /></button>
                                                                <button onclick={() => deleteDrive(drive.id)} class="w-8 h-8 flex items-center justify-center text-neutral-400 active:text-rose-600 bg-white rounded-lg border border-neutral-200"><Trash2 class="w-3.5 h-3.5" /></button>
                                                            </div>
                                                        </div>
                                                    {/each}
                                                </div>
                                            {/if}
                                        </div>

                                        {#if driveRecords.length > 0}
                                            <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex justify-between items-center text-xs font-bold text-emerald-950 mt-2">
                                                <span>Gesamte Fahrtstrecke:</span>
                                                <span class="text-sm font-black text-emerald-800">{totalKm} km</span>
                                            </div>
                                        {/if}
                                    </div>

                                    <!-- Sonderausgaben -->
                                    <div class="bg-white rounded-2xl p-4 sm:p-5 border border-neutral-200/90 shadow-xs flex flex-col justify-between">
                                        <div>
                                            <div class="flex items-center justify-between mb-3 border-b border-neutral-100 pb-2">
                                                <h3 class="text-xs font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
                                                    <Banknote class="w-4 h-4 text-rose-600" /> Sonderausgaben
                                                </h3>
                                                <button onclick={() => expenditureModal?.open()} class="min-h-10 px-3 text-xs font-bold text-rose-800 bg-rose-50 active:bg-rose-100 rounded-xl border border-rose-200">
                                                    + Ausgabe
                                                </button>
                                            </div>

                                            {#if expenditures.length === 0}
                                                <p class="text-center text-xs font-medium text-neutral-400 py-5 bg-neutral-50 rounded-xl border border-dashed border-neutral-200">
                                                    Keine Sonderausgaben.
                                                </p>
                                            {:else}
                                                <div class="space-y-2 mb-3">
                                                    {#each expenditures as exp}
                                                        <div class="flex items-center justify-between p-3 rounded-xl border border-neutral-200 bg-neutral-50 text-xs">
                                                            <p class="font-bold text-neutral-800 text-xs sm:text-sm truncate">{exp.titel || 'Ausgabe'}</p>
                                                            <div class="flex items-center gap-2 shrink-0">
                                                                <span class="font-black text-rose-800 bg-rose-100 px-2.5 py-1 rounded-lg border border-rose-200">
                                                                    {exp.sum ? exp.sum.toFixed(2).replace('.', ',') : '0,00'} €
                                                                </span>
                                                                <button onclick={() => expenditureModal?.open(exp)} class="w-8 h-8 flex items-center justify-center text-neutral-400 active:text-rose-600 bg-white rounded-lg border border-neutral-200"><Edit3 class="w-3.5 h-3.5" /></button>
                                                                <button onclick={() => deleteExpenditure(exp.id)} class="w-8 h-8 flex items-center justify-center text-neutral-400 active:text-rose-600 bg-white rounded-lg border border-neutral-200"><Trash2 class="w-3.5 h-3.5" /></button>
                                                            </div>
                                                        </div>
                                                    {/each}
                                                </div>
                                            {/if}
                                        </div>

                                        {#if expenditures.length > 0}
                                            <div class="bg-rose-50 border border-rose-200 rounded-xl p-3 flex justify-between items-center text-xs font-bold text-rose-950 mt-2">
                                                <span>Gesamte Auslagen:</span>
                                                <span class="text-sm font-black text-rose-800">{totalExpenditure.toFixed(2).replace('.', ',')} €</span>
                                            </div>
                                        {/if}
                                    </div>
                                </div>
                            {/if}
                        </div>
                    {/if}
                </div>
            {/if}
        </div>

        <!-- Sticky Mobile Bottom Bar bei laufender Zeiterfassung -->
        {#if runningTimeRecord}
            <div transition:slide class="sm:hidden bg-gradient-to-r from-emerald-600 to-teal-700 px-4 py-2.5 flex items-center justify-between text-white shadow-xl shrink-0 z-40">
                <div class="flex items-center gap-2.5 min-w-0">
                    <span class="relative flex h-3 w-3">
                        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                        <span class="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                    </span>
                    <div class="min-w-0">
                        <p class="text-[10px] uppercase tracking-wider text-emerald-100 font-bold">Zeiterfassung aktiv</p>
                        <p class="text-base font-black font-mono leading-none">{formatElapsed(elapsedSeconds)}</p>
                    </div>
                </div>
                <button 
                    type="button" 
                    onclick={() => stopTracking(runningTimeRecord.id)} 
                    disabled={isTimeLoading}
                    class="h-10 px-4 bg-white active:bg-rose-50 text-rose-600 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-sm shrink-0"
                >
                    <Square class="w-3.5 h-3.5 fill-current" /> Stopp
                </button>
            </div>
        {/if}
    </div>
    
    <DriveRecordModal bind:this={driveModal} {appointment} />
    <ExpenditureModal bind:this={expenditureModal} {appointment} />
    <AppointmentModal bind:this={editModal} />
    <TimeRecordModal bind:this={timeModal} {appointment} />
    <AppointmentReminderModal bind:this={reminderModal} />
    <AiReportModal bind:this={aiModal} onSave={handleAiSave} />
    <ClientDetailModal bind:this={clientDetailModal} />
    <FollowUpAppointmentModal bind:this={followUpModal} />

    <!-- Dialog zur Leistungserstellung (Mobile optimiert) -->
    <dialog bind:this={taskDialog} class="p-0 bg-transparent backdrop:bg-black/75 backdrop:backdrop-blur-md w-full max-w-sm mx-auto my-auto rounded-3xl" onclick={(e) => { if (e.target === taskDialog) taskDialog?.close(); }}>
        <div class="bg-white rounded-3xl w-full relative overflow-hidden shadow-2xl flex flex-col">
            <div class="bg-white px-5 py-4 border-b border-neutral-100 flex items-center justify-between shrink-0 sticky top-0 z-10 gap-3">
                <h2 class="text-base font-black text-neutral-900 truncate">Neue Leistung definieren</h2>
                <button aria-label="Schließen" onclick={() => taskDialog?.close()} class="w-10 h-10 bg-neutral-100 active:bg-neutral-200 text-neutral-600 rounded-full flex items-center justify-center shrink-0"><X class="w-4 h-4" /></button>
            </div>
            <div class="p-5 overflow-y-auto custom-scrollbar">
                <p class="text-xs text-neutral-500 mb-4 font-medium leading-relaxed">Möchten Sie für <strong>"{newTaskTitle}"</strong> noch Details oder Abrechnungshinweise hinterlegen?</p>
                <form onsubmit={(e) => { e.preventDefault(); createAndLinkTask(); }} class="space-y-4">
                    <textarea use:autoResize bind:value={newTaskDescription} rows="2" class="orga-input-clear text-base sm:text-xs w-full rounded-xl" placeholder="Optionale nähere Beschreibung..."></textarea>
                    <div class="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2 border-t border-neutral-100">
                        <button type="button" onclick={() => taskDialog?.close()} class="min-h-11 px-4 text-xs font-bold text-neutral-600 bg-neutral-100 rounded-xl" disabled={isTaskLoading}>Abbrechen</button>
                        <button type="submit" class="min-h-11 px-6 text-xs font-bold text-white bg-amber-500 active:bg-amber-600 rounded-xl shadow-sm" disabled={isTaskLoading}><Save class="w-4 h-4" /> {isTaskLoading ? "Speichert..." : "Speichern"}</button>
                    </div>
                </form>
            </div>
        </div>
    </dialog>
</dialog>