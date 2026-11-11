<script lang="ts">
    import { toastStore } from "$lib/services/toastService.svelte";
    import { buildPrioritizedContacts } from "$lib/services/contactPickerService";
    import { autoGrow } from "$lib/actions/autoGrow";
    import { requestAiAppointmentReminder } from "$lib/services/appointmentReminderService";
    import MultiAppointmentSelector from "./appointmentReminder/MultiAppointmentSelector.svelte";
    import ReminderRecipientPicker from "./appointmentReminder/ReminderRecipientPicker.svelte";
    import ReminderTypeSelector from "./appointmentReminder/ReminderTypeSelector.svelte";
    import { sendMultiAppointmentMessage } from "./appointmentReminder/multiAppointmentSender";
    import { 
        buildMultiSalutation, 
        buildMultiMessageText, 
        buildDefaultSubject, 
        formatSelectedText,
        type AppointmentMessageType 
    } from "./appointmentReminder/multiAppointmentReminderHelper";
    import { Bold, Italic, Underline } from 'lucide-svelte';

    let dialog: HTMLDialogElement;
    let client = $state<any>(null);
    let availableAppointments = $state<any[]>([]);
    let selectedAppointmentIds = $state<string[]>([]);
    let messageType = $state<AppointmentMessageType>('reminder');

    let method = $state<'email' | 'whatsapp'>('email');
    let recipient = $state("");
    let cc = $state("");
    let bcc = $state("");
    let showCcBcc = $state(false);
    let subject = $state("");
    let isSubjectCustom = $state(false);
    let message = $state("");
    let isSending = $state(false);
    
    let availableContacts = $state<any[]>([]);
    let showContactDropdown = $state(false);
    let selectedContactRefs = $state<any[]>([]);

    let isGenerating = $state(false);
    let generatedBody = $state<string | null>(null);
    let textareaRef = $state<HTMLTextAreaElement | null>(null);

    function toggleRecipient(contact: any, isChecked: boolean) {
        const isEmail = method === 'email';
        const contactVal = isEmail ? contact.email : contact.phone;
        if (!contactVal) return;
        let currentVals = recipient.split(',').map(e => e.trim()).filter(Boolean);
        if (isChecked) {
            if (!currentVals.includes(contactVal)) currentVals.push(contactVal);
            if (!selectedContactRefs.find(c => (isEmail ? c.email : c.phone) === contactVal)) selectedContactRefs.push(contact);
        } else {
            currentVals = currentVals.filter(e => e !== contactVal);
            selectedContactRefs = selectedContactRefs.filter(c => (isEmail ? c.email : c.phone) !== contactVal);
        }
        recipient = currentVals.join(', ');
        updateMessage();
    }

    export function open(apps: any[] | any, cl: any, initialType: AppointmentMessageType = 'reminder') {
        client = cl;
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const rawList = Array.isArray(apps) ? apps : (apps ? [apps] : []);
        
        const futureApps = rawList.filter(a => new Date(a.appointment) >= now);
        availableAppointments = (futureApps.length > 0 && initialType !== 'report') ? futureApps : [...rawList];
        if (availableAppointments.length === 0 && rawList.length > 0) availableAppointments = [...rawList];
        
        selectedAppointmentIds = availableAppointments.map(a => a.id);
        messageType = initialType;

        const caregiver = cl?.expand?.caregiver;
        let emails: string[] = [];
        if (caregiver?.email) emails.push(caregiver.email);
        else if (cl?.email) emails.push(cl.email);
        if (cl?.mailing_list && Array.isArray(cl.mailing_list)) emails = [...emails, ...cl.mailing_list];

        const emailStr = [...new Set(emails)].filter(Boolean).join(", ");
        const phoneStr = caregiver?.handy || caregiver?.phone || cl?.handy || cl?.phone || "";
        method = emailStr ? 'email' : (phoneStr ? 'whatsapp' : 'email');
        recipient = method === 'email' ? emailStr : phoneStr;

        cc = ""; bcc = ""; showCcBcc = false; isSubjectCustom = false;
        
        availableContacts = buildPrioritizedContacts(client);
        selectedContactRefs = [];
        if (recipient) {
            const isEmail = method === 'email';
            const matched = availableContacts.find(c => (isEmail ? c.email : c.phone) === recipient);
            if (matched) selectedContactRefs = [matched];
        }
        
        generatedBody = null;
        syncSubject();
        updateMessage();
        dialog?.showModal();
    }

    export function close() {
        dialog?.close();
        client = null;
        availableAppointments = [];
    }

    function syncSubject() {
        if (!isSubjectCustom) {
            const selectedApps = availableAppointments.filter(a => selectedAppointmentIds.includes(a.id));
            subject = buildDefaultSubject(messageType, client, selectedApps);
        }
    }

    function handleTypeChange(newType: AppointmentMessageType) {
        messageType = newType;
        generatedBody = null;
        isSubjectCustom = false;
        syncSubject();
        updateMessage();
    }

    function changeMethod(newMethod: 'email' | 'whatsapp') {
        method = newMethod;
        if (method === 'email') {
            let emails: string[] = [];
            if (client?.expand?.caregiver?.email) emails.push(client.expand.caregiver.email);
            else if (client?.email) emails.push(client.email);
            if (client?.mailing_list && Array.isArray(client.mailing_list)) emails = [...emails, ...client.mailing_list];
            recipient = [...new Set(emails)].filter(Boolean).join(", ");
        } else {
            recipient = client?.expand?.caregiver?.handy || client?.expand?.caregiver?.phone || client?.handy || client?.phone || "";
        }
        selectedContactRefs = [];
        if (recipient) {
            const isEmail = method === 'email';
            const matched = availableContacts.find(c => (isEmail ? c.email : c.phone) === recipient);
            if (matched) selectedContactRefs = [matched];
        }
        updateMessage();
    }

    function updateMessage() {
        const salutation = buildMultiSalutation(client, selectedContactRefs, method, recipient);
        message = buildMultiMessageText(client, availableAppointments, selectedAppointmentIds, selectedContactRefs, salutation, generatedBody, messageType);
    }

    function applyFormat(type: 'bold' | 'italic' | 'underline') {
        if (!textareaRef) return;
        const res = formatSelectedText(message, type, method, textareaRef.selectionStart, textareaRef.selectionEnd);
        if (!res) return;
        message = res.newText;
        setTimeout(() => {
            textareaRef?.focus();
            textareaRef?.setSelectionRange(res.newStart, res.newEnd);
        }, 10);
    }

    function handleToggle(id: string) {
        selectedAppointmentIds = selectedAppointmentIds.includes(id) ? selectedAppointmentIds.filter(i => i !== id) : [...selectedAppointmentIds, id];
        generatedBody = null;
        syncSubject();
        updateMessage();
    }

    async function generateAiMessage() {
        isGenerating = true;
        generatedBody = null;
        try {
            const selectedApps = availableAppointments.filter(a => selectedAppointmentIds.includes(a.id));
            generatedBody = await requestAiAppointmentReminder({ selectedApps, client, selectedContactRefs, messageType });
            updateMessage();
        } catch (err: any) {
            toastStore.error(err.message || "KI-Vorschlag konnte nicht generiert werden.");
        } finally { isGenerating = false; }
    }

    async function handleSend(e: Event) {
        e.preventDefault();
        if (!recipient) { toastStore.warning(method === 'email' ? 'Bitte E-Mail angeben.' : 'Bitte Telefonnummer angeben.'); return; }
        if (selectedAppointmentIds.length === 0) { toastStore.warning('Bitte mindestens einen Termin auswählen.'); return; }

        isSending = true;
        try {
            const successText = await sendMultiAppointmentMessage({
                method, recipient, cc, bcc, subject, message, messageType, availableAppointments, selectedAppointmentIds
            });
            toastStore.success(successText);
            close();
        } catch (err: any) {
            toastStore.error(err.message || 'Fehler beim Senden der Nachricht.');
        } finally { isSending = false; }
    }
</script>

<dialog bind:this={dialog} class="p-0 bg-transparent backdrop:bg-black/60 backdrop:backdrop-blur-sm w-full max-w-2xl mx-auto my-6 sm:my-10 rounded-3xl zero-inner-scroll-modal" onclick={(e) => { if (e.target === dialog) close(); }}>
    <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 w-full relative shadow-2xl border border-neutral-100 dark:border-slate-800">
        <button aria-label="Schließen" onclick={close} class="absolute top-5 right-5 min-w-[44px] min-h-[44px] bg-neutral-100 hover:bg-neutral-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-neutral-600 dark:text-neutral-300 rounded-full flex items-center justify-center transition-colors cursor-pointer touch-manipulation">✕</button>

        <h2 class="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-1 flex items-center gap-2 pr-10">
            <span>{messageType === 'report' ? '📋' : messageType === 'change' ? '🔄' : messageType === 'info' ? 'ℹ️' : '📅'}</span>
            <span>{messageType === 'report' ? 'Besuchsbericht übermitteln' : messageType === 'change' ? 'Terminänderung mitteilen' : messageType === 'info' ? 'Termin-Information senden' : 'Terminerinnerung versenden'}</span>
        </h2>
        {#if client}<p class="text-sm font-semibold text-neutral-600 dark:text-neutral-400 mb-5">Klient: {client.name_first} {client.name_last}</p>{/if}

        <form onsubmit={handleSend} class="space-y-5">
            <ReminderTypeSelector activeType={messageType} onSelectType={handleTypeChange} disabled={isSending || isGenerating} />

            <MultiAppointmentSelector {availableAppointments} {selectedAppointmentIds} {messageType} onToggle={handleToggle} />

            <ReminderRecipientPicker 
                bind:method bind:recipient bind:cc bind:bcc bind:showCcBcc 
                {isSending} {availableContacts} bind:showContactDropdown 
                onChangeMethod={changeMethod} onToggleRecipient={toggleRecipient} 
                onToggleCcBcc={() => showCcBcc = !showCcBcc} 
                onToggleContactDropdown={() => showContactDropdown = !showContactDropdown} 
            />

            {#if method === 'email'}
                <div>
                    <label for="multi-rem-subject" class="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Betreff *</label>
                    <input id="multi-rem-subject" type="text" bind:value={subject} oninput={() => isSubjectCustom = true} class="orga-input-clear py-3 text-sm min-h-11 touch-manipulation" placeholder="Betreff der Nachricht" required disabled={isSending} />
                </div>
            {/if}

            <div>
                <div class="flex items-center justify-between mb-2 flex-wrap gap-2">
                    <label for="multi-rem-message" class="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Nachricht *</label>
                    <div class="flex items-center gap-2">
                        <div class="flex items-center gap-1 bg-white dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-lg p-0.5 shadow-sm">
                            <button type="button" onclick={() => applyFormat('bold')} class="min-w-8 min-h-8 flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-slate-700 rounded text-xs font-bold touch-manipulation" title="Fett"><Bold class="w-3.5 h-3.5"/></button>
                            <button type="button" onclick={() => applyFormat('italic')} class="min-w-8 min-h-8 flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-slate-700 rounded text-xs italic touch-manipulation" title="Kursiv"><Italic class="w-3.5 h-3.5"/></button>
                            {#if method === 'email'}<button type="button" onclick={() => applyFormat('underline')} class="min-w-8 min-h-8 flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-slate-700 rounded text-xs underline touch-manipulation" title="Unterstrichen"><Underline class="w-3.5 h-3.5"/></button>{/if}
                        </div>
                        <button type="button" onclick={generateAiMessage} disabled={isSending || isGenerating} class="min-h-9 text-xs font-bold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer touch-manipulation">
                            {#if isGenerating}<div class="w-3 h-3 border-2 border-brand-200 border-t-brand-700 rounded-full animate-spin"></div>{:else}<span>✨</span> KI-Vorschlag{/if}
                        </button>
                    </div>
                </div>
                <textarea id="multi-rem-message" bind:this={textareaRef} bind:value={message} use:autoGrow rows="6" class="auto-grow orga-input-clear min-h-36 py-4 text-sm" required disabled={isSending || isGenerating}></textarea>
            </div>

            <div class="pt-4 flex flex-col-reverse sm:flex-row justify-end gap-3 border-t border-neutral-100 dark:border-slate-800">
                <button type="button" onclick={close} class="orga-button-ghost w-full sm:w-auto min-h-11 py-3 cursor-pointer touch-manipulation" disabled={isSending}>Abbrechen</button>
                <button type="submit" class="orga-button-primary w-full sm:w-auto min-h-11 py-3 px-8 shadow-indigo-600/30 cursor-pointer touch-manipulation" disabled={isSending || selectedAppointmentIds.length === 0}>
                    {#if isSending}<div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>{/if}
                    <span>{method === 'email' ? 'E-Mail senden' : 'In WhatsApp öffnen'}</span>
                </button>
            </div>
        </form>
    </div>
</dialog>