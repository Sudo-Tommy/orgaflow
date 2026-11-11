<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    import { sendEmail } from "$lib/services/emailService";
    import { toastStore } from "$lib/services/toastService.svelte";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import { buildPrioritizedContacts } from "$lib/services/contactPickerService";
    import { autoGrow } from "$lib/actions/autoGrow";
    import {
        buildReplyEmailPayload,
        fileToBase64,
        getInitialReplyText
    } from "./appointmentRequests/reply/requestReplyEmailBuilder";
    import RequestReplyContactPicker from "./appointmentRequests/reply/RequestReplyContactPicker.svelte";
    import RequestReplyCalendar from "./appointmentRequests/reply/RequestReplyCalendar.svelte";

    let dialog = $state<HTMLDialogElement>();
    let request = $state<any>(null);
    let status = $state<'accepted' | 'denied' | 'propose'>('accepted');
    
    let emailTo = $state("");
    let emailSubject = $state("");
    let emailText = $state("");
    let isEmailSending = $state(false);
    
    let attachments = $state<File[]>([]);
    let fileInput = $state<HTMLInputElement>();

    let propDate = $state("");
    let propTime = $state("");
    let availableContacts = $state<any[]>([]);

    export function open(req: any, newStatus: 'accepted' | 'denied' | 'propose', toEmail: string) {
        request = req;
        status = newStatus;
        emailTo = toEmail;
        
        const matchedClient = req?.expand?.client?.[0] || req?.expand?.client || 
            (req?.client && orgaStore.clients?.data?.find(c => c.id === (Array.isArray(req.client) ? req.client[0] : req.client))) ||
            (req?.sender_email && orgaStore.clients?.data?.find(c => c.email && c.email.toLowerCase() === req.sender_email.toLowerCase()));

        availableContacts = buildPrioritizedContacts(matchedClient);
        emailSubject = status === 'accepted' ? 'Ihre Terminanfrage wurde bestätigt' : 'Rückmeldung zu Ihrer Terminanfrage';
        emailText = getInitialReplyText(status, req?.sender_name || '');
        attachments = [];
        propDate = "";
        propTime = "";
        dialog?.showModal();
    }

    export function close() {
        dialog?.close();
    }

    function saveAsTemplate() {
        const template = emailText.replace(new RegExp(request?.sender_name || '', 'g'), '{{name}}');
        localStorage.setItem(`req_reply_template_${status}`, template);
        toastStore.success("Text als Standard-Vorlage für künftige Antworten gespeichert.");
    }

    function handleFileSelect(e: Event) {
        const input = e.target as HTMLInputElement;
        if (input.files) {
            attachments = [...attachments, ...Array.from(input.files)];
        }
        input.value = '';
    }

    function removeAttachment(index: number) {
        attachments = attachments.filter((_, i) => i !== index);
    }

    async function handleSend(e: Event) {
        e.preventDefault();
        if (!emailTo || !emailSubject || !emailText) {
            toastStore.warning('Bitte füllen Sie alle Pflichtfelder aus.');
            return;
        }

        if (status === 'propose' && (!propDate || !propTime)) {
            toastStore.warning('Bitte legen Sie ein Datum und eine Uhrzeit für den Vorschlag fest.');
            return;
        }

        isEmailSending = true;

        try {
            const user = pb.authStore.model;
            const companyList = orgaStore.company?.data;
            const { textEmail, htmlEmail, profile } = buildReplyEmailPayload({
                request,
                status,
                emailText,
                propDate,
                propTime,
                user,
                companyList
            });

            const attachmentPayload = await Promise.all(attachments.map(async (file) => ({
                filename: file.name,
                content: await fileToBase64(file),
                encoding: 'base64'
            })));

            await sendEmail({
                to: emailTo,
                subject: emailSubject,
                text: textEmail,
                html: htmlEmail,
                attachments: attachmentPayload.length > 0 ? attachmentPayload : undefined,
                provider: 'ionos'
            });

            toastStore.success("E-Mail wurde erfolgreich versendet!");
            close();
        } catch (err: any) {
            console.error(err);
            toastStore.error("Fehler beim Senden der E-Mail: " + err.message);
        } finally {
            isEmailSending = false;
        }
    }
</script>

<dialog bind:this={dialog} class="zero-inner-scroll-modal p-0 bg-transparent backdrop:bg-black/50 backdrop:backdrop-blur-sm w-full max-w-2xl mx-auto my-6 sm:my-10 rounded-3xl" onclick={(e) => { if (e.target === dialog) close(); }}>
    <div class="bg-white rounded-3xl p-6 md:p-8 w-full relative shadow-2xl">
        <button aria-label="Schließen" title="Schließen" onclick={close} class="absolute top-5 right-5 w-11 h-11 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-full flex items-center justify-center transition-colors touch-manipulation">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        
        <h2 class="text-2xl font-bold text-neutral-900 mb-2 flex items-center gap-2"><span>✉️</span> E-Mail Antwort ({status === 'accepted' ? 'Zusage' : 'Absage'})</h2>
        <p class="text-sm text-neutral-500 mb-6">Passen Sie die Nachricht an oder nutzen Sie Ihre Vorlage.</p>

        <form onsubmit={handleSend} class="space-y-4">
            <RequestReplyContactPicker bind:emailTo {availableContacts} disabled={isEmailSending} />

            <div>
                <label for="reply-subject" class="block text-sm font-bold text-neutral-700 mb-1.5">Betreff</label>
                <input id="reply-subject" type="text" bind:value={emailSubject} class="orga-input-clear min-h-[44px] py-2.5 text-sm touch-manipulation" required disabled={isEmailSending} />
            </div>

            <div>
                {#if status === 'propose'}
                    <RequestReplyCalendar bind:propDate bind:propTime requestCompany={request?.company} disabled={isEmailSending} />
                {/if}

                <div class="flex items-center justify-between mb-1.5">
                    <label for="reply-text" class="block text-sm font-bold text-neutral-700">Nachricht</label>
                    <button type="button" onclick={saveAsTemplate} class="text-xs font-bold text-brand-600 hover:text-brand-800 transition-colors py-2 touch-manipulation" title="Als Standard für zukünftige Antworten speichern">Als Vorlage speichern</button>
                </div>
                <textarea use:autoGrow id="reply-text" bind:value={emailText} class="auto-grow orga-input-clear py-3 text-sm resize-none overflow-hidden min-h-32" required disabled={isEmailSending}></textarea>
                <p class="text-[10px] text-neutral-400 mt-1">Die Termindaten des Klienten werden automatisch unten an die E-Mail angehängt.</p>
            </div>
            
            <div class="pt-2">
                <input type="file" bind:this={fileInput} multiple class="hidden" onchange={handleFileSelect} disabled={isEmailSending} />
                <button type="button" onclick={() => fileInput?.click()} class="flex items-center gap-2 text-sm font-bold text-neutral-600 hover:text-brand-600 transition-colors px-4 py-3 bg-neutral-50 hover:bg-brand-50 border border-neutral-200 hover:border-brand-200 rounded-xl min-h-[44px] touch-manipulation" disabled={isEmailSending}>
                    <span class="text-lg">📎</span> Dokumente / Dateien anhängen
                </button>
            </div>

            {#if attachments.length > 0}
                <div class="flex flex-wrap gap-2 pt-2">
                    {#each attachments as file, i}
                        <div class="flex items-center gap-2 bg-neutral-100 text-neutral-700 px-3 py-1.5 rounded-lg text-sm border border-neutral-200 shadow-sm animate-enter">
                            <span class="truncate max-w-50 font-medium">📎 {file.name}</span>
                            <button type="button" onclick={() => removeAttachment(i)} class="text-rose-500 hover:text-rose-700 font-bold ml-1 min-w-[32px] min-h-[32px] flex items-center justify-center touch-manipulation" disabled={isEmailSending} title="Anhang entfernen">✕</button>
                        </div>
                    {/each}
                </div>
            {/if}

            <div class="pt-4 flex flex-col-reverse sm:flex-row justify-end gap-3 border-t border-neutral-100 mt-6">
                <button type="button" onclick={close} class="orga-button-ghost w-full sm:w-auto min-h-[44px] py-2.5 touch-manipulation" disabled={isEmailSending}>Abbrechen</button>
                <button type="submit" class="orga-button-primary shadow-brand-600/20 w-full sm:w-auto min-h-[44px] py-2.5 touch-manipulation" disabled={isEmailSending}>
                    {isEmailSending ? 'Wird gesendet...' : 'E-Mail senden ✉️'}
                </button>
            </div>
        </form>
    </div>
</dialog>