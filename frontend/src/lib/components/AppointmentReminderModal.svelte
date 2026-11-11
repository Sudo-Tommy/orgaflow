<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    import { googleCalendarService, type GoogleCalendarStatus } from "$lib/services/googleCalendarService";
    import { toastStore } from "$lib/services/toastService.svelte";
    import { hapticFeedback } from "$lib/services/hapticFeedback";
    import PdfPreviewModal from "$lib/components/PdfPreviewModal.svelte";
    import AppointmentReminderRecipientBar from "./appointmentReminder/AppointmentReminderRecipientBar.svelte";
    import AppointmentReminderParamsEditor from "./appointmentReminder/AppointmentReminderParamsEditor.svelte";
    import AppointmentReminderMessageEditor from "./appointmentReminder/AppointmentReminderMessageEditor.svelte";
    import AppointmentReminderAttachments from "./appointmentReminder/AppointmentReminderAttachments.svelte";
    import {
        sendAppointmentReminderEmail,
        openWhatsAppReminder
    } from "./appointmentReminder/appointmentReminderDispatch";
    import {
        buildReminderMessage,
        buildInitialReminderState,
        generateReminderAiDraft,
        getRecipientForMethod,
        toggleContactRecipient,
        fetchUpcomingAppointments
    } from "./appointmentReminder/appointmentReminderMessageBuilder";

    let dialog: HTMLDialogElement;
    let googleStatus = $state<GoogleCalendarStatus | null>(null);
    let appointment = $state<any>(null);
    let client = $state<any>(null);

    let method = $state<'email' | 'whatsapp'>('email');
    let recipient = $state("");
    let cc = $state("");
    let bcc = $state("");
    let showCcBcc = $state(false);
    let subject = $state("");
    let message = $state("");
    let isSending = $state(false);
    let appDate = $state("");
    let appTime = $state("");
    let appDesc = $state("");
    let appLocation = $state("");
    let appReport = $state("");
    let includeReport = $state(false);
    let generatedBody = $state<string | null>(null);

    let availableContacts = $state<any[]>([]);
    let showContactDropdown = $state(false);
    let selectedContactRefs = $state<any[]>([]);
    let futureAppointments = $state<any[]>([]);
    let selectedFutureAppIds = $state<string[]>([]);
    let includeFutureApps = $state(false);
    let attachments = $state<File[]>([]);
    let pdfPreviewModal = $state<ReturnType<typeof PdfPreviewModal>>();
    let isGenerating = $state(false);

    function updateCurrentMessage() {
        message = buildReminderMessage({
            selectedContacts: selectedContactRefs,
            recipient,
            method,
            client,
            appointment,
            appDate,
            appTime,
            generatedBody
        });
    }

    function toggleRecipient(contact: any, isChecked: boolean) {
        hapticFeedback.tap();
        const res = toggleContactRecipient({ method, contact, isChecked, recipient, selectedContactRefs });
        recipient = res.recipient;
        selectedContactRefs = res.selectedContactRefs;
        updateCurrentMessage();
    }

    export function open(app: any, cl: any) {
        appointment = app;
        client = cl;
        const initial = buildInitialReminderState(app, cl);
        method = initial.method;
        recipient = initial.recipient;
        subject = initial.subject;
        appDate = initial.appDate;
        appTime = initial.appTime;
        appDesc = initial.appDesc;
        appLocation = initial.appLocation;
        appReport = initial.appReport;
        includeReport = initial.includeReport;
        availableContacts = initial.availableContacts;
        selectedContactRefs = initial.selectedContactRefs;
        generatedBody = null;
        message = initial.message;
        cc = "";
        bcc = "";
        showCcBcc = false;
        attachments = [];
        includeFutureApps = false;

        fetchUpcomingAppointments(cl?.id, app?.id).then(res => {
            futureAppointments = res;
            selectedFutureAppIds = res.map((a: any) => a.id);
        });

        googleCalendarService.getStatus().then(s => googleStatus = s).catch(() => {});
        dialog?.showModal();
    }

    export function close() {
        dialog?.close();
        appointment = null;
        client = null;
    }

    function changeMethod(newMethod: 'email' | 'whatsapp') {
        hapticFeedback.selection();
        method = newMethod;
        recipient = getRecipientForMethod(client, method);
        selectedContactRefs = [];
        if (recipient) {
            const isEmail = method === 'email';
            const matched = availableContacts.find(c => (isEmail ? c.email : c.phone) === recipient);
            if (matched) selectedContactRefs = [matched];
        }
        updateCurrentMessage();
    }

    async function handleGenerateAi() {
        isGenerating = true;
        generatedBody = null;
        hapticFeedback.tap();
        try {
            generatedBody = await generateReminderAiDraft({
                appDate, appTime, appDesc, appLocation, selectedContactRefs, client
            });
            updateCurrentMessage();
            hapticFeedback.success();
        } catch (err: any) {
            toastStore.error(err.message || "KI-Vorschlag fehlgeschlagen.");
            hapticFeedback.error();
        } finally {
            isGenerating = false;
        }
    }

    async function handleSend(e: Event) {
        e.preventDefault();
        if (!recipient) {
            toastStore.warning(method === 'email' ? 'Bitte E-Mail angeben.' : 'Bitte Telefonnummer angeben.');
            return;
        }
        isSending = true;
        try {
            if (method === 'email') {
                await sendAppointmentReminderEmail({
                    recipient, cc, bcc, subject, message, appDate, appTime, appLocation,
                    appDesc, appReport, includeReport, futureAppointments,
                    selectedFutureAppIds, includeFutureApps, attachments, appointment
                });
                toastStore.success("Nachricht per E-Mail versendet!");
            } else {
                openWhatsAppReminder(recipient, message);
                toastStore.success("WhatsApp wird geöffnet...");
            }
            hapticFeedback.success();
            close();
        } catch (err: any) {
            hapticFeedback.error();
            toastStore.error("Fehler beim Senden: " + err.message);
        } finally {
            isSending = false;
        }
    }
</script>

<dialog 
    bind:this={dialog} 
    class="p-0 bg-transparent backdrop:bg-black/50 backdrop:backdrop-blur-sm w-full max-w-lg mx-auto my-auto rounded-3xl" 
    onclick={(e) => { if (e.target === dialog) close(); }}
>
    <div class="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-7 md:p-8 w-full relative shadow-2xl border border-neutral-100 dark:border-slate-800">
        <button 
            type="button"
            aria-label="Schließen" 
            title="Schließen" 
            onclick={close} 
            class="absolute top-4 right-4 sm:top-5 sm:right-5 w-11 h-11 bg-neutral-100 dark:bg-slate-800 hover:bg-neutral-200 dark:hover:bg-slate-700 text-neutral-600 dark:text-slate-300 rounded-full flex items-center justify-center transition-colors touch-manipulation cursor-pointer"
        >
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        
        <h2 class="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white mb-1 flex items-center gap-2">
            <span>✉️</span> 
            <span>Nachricht / Terminerinnerung</span>
        </h2>
        <p class="text-xs sm:text-sm text-neutral-500 dark:text-slate-400 mb-4 sm:mb-6">
            Senden Sie eine Benachrichtigung zum Termin an den Klienten.
        </p>

        <form onsubmit={handleSend} class="space-y-4">
            <AppointmentReminderRecipientBar
                bind:method
                bind:recipient
                bind:cc
                bind:bcc
                bind:showCcBcc
                bind:showContactDropdown
                {isSending}
                {availableContacts}
                onChangeMethod={changeMethod}
                onToggleRecipient={toggleRecipient}
            />

            {#if method === 'email'}
                <div>
                    <label for="rem-subject" class="block text-[11px] font-bold text-neutral-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Betreff *</label>
                    <input id="rem-subject" type="text" bind:value={subject} class="orga-input-clear min-h-12 touch-manipulation" required disabled={isSending} />
                </div>
                <AppointmentReminderParamsEditor bind:appDate bind:appTime bind:appLocation bind:appDesc {isSending} />
            {/if}

            <AppointmentReminderMessageEditor
                bind:message
                {method}
                {isSending}
                {isGenerating}
                onGenerateAi={handleGenerateAi}
            />

            {#if method === 'email'}
                <AppointmentReminderAttachments 
                    {client} 
                    bind:attachments 
                    {isSending} 
                    onPreviewDoc={(record, filename) => pdfPreviewModal?.open(pb.files.getURL(record, filename), filename, filename)} 
                />
            {/if}

            <div class="pt-4 flex flex-col-reverse sm:flex-row justify-end gap-3 border-t border-neutral-100 dark:border-slate-800 mt-6">
                <button type="button" onclick={close} class="orga-button-ghost w-full sm:w-auto min-h-12 py-3 touch-manipulation cursor-pointer" disabled={isSending}>Abbrechen</button>
                <button type="submit" class="orga-button-primary w-full sm:w-auto min-h-12 py-3 touch-manipulation cursor-pointer {method === 'whatsapp' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}" disabled={isSending}>
                    {isSending ? 'Wird verarbeitet...' : (method === 'email' ? 'E-Mail senden ✉️' : 'WhatsApp öffnen 💬')}
                </button>
            </div>
        </form>
    </div>
</dialog>

<PdfPreviewModal bind:this={pdfPreviewModal} />