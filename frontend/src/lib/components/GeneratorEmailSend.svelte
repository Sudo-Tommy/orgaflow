<script lang="ts">
import { pb } from "$lib/services/pocketbase";
import { orgaStore } from "$lib/stores/orgaStore.svelte";
import { sendEmail } from "$lib/services/emailService";
import { toastStore } from "$lib/services/toastService.svelte";
import { autoGrow } from "$lib/actions/autoGrow";
import { buildPrioritizedContacts } from "$lib/services/contactPickerService";
import { buildGeneratorEmailContent } from "$lib/services/generatorEmailHtmlBuilder";
import { getRecipientEmailFromService, buildDefaultEmailMessage, getInitialEmailSalutation } from "$lib/services/generatorRecipientHelper";
import { blobToBase64, markInvoiceAsSent } from "$lib/services/invoiceEmailSenderService";
import PdfPreviewModal from "$lib/components/PdfPreviewModal.svelte";
import GeneratorAppointmentReports from "./docGenerator/GeneratorAppointmentReports.svelte";
import GeneratorFutureAppointments from "./docGenerator/GeneratorFutureAppointments.svelte";
import { onMount } from "svelte";

let { service, pdfBlob, tsBlob, pdfFilename, tsFilename, onClose, onDownload } = $props<{
    service: any;
    pdfBlob: Blob | null;
    tsBlob: Blob | null;
    pdfFilename: string;
    tsFilename: string;
    onClose: () => void;
    onDownload: () => void;
}>();

let pdfPreviewModal: ReturnType<typeof PdfPreviewModal>;
let emailTo = $state("");
let emailSubject = $state("");
let emailText = $state("");
let isEmailSending = $state(false);
let emailSuccessMsg = $state("");
let cc = $state("");
let bcc = $state("");
let showCcBcc = $state(false);
let showContactDropdown = $state(false);
let linkedAppointments = $state<any[]>([]);
let includeReports = $state(true);
let availableContacts = $state<any[]>([]);
let selectedContactRefs = $state<any[]>([]);
let futureAppointments = $state<any[]>([]);
let selectedFutureAppIds = $state<string[]>([]);
let includeFutureApps = $state(false);

function toggleRecipient(contact: any, isChecked: boolean) {
    let currentEmails = emailTo.split(',').map(e => e.trim()).filter(Boolean);
    if (isChecked) {
        if (!currentEmails.includes(contact.email)) currentEmails.push(contact.email);
        if (!selectedContactRefs.find(c => c.email === contact.email)) selectedContactRefs.push(contact);
    } else {
        currentEmails = currentEmails.filter(e => e !== contact.email);
        selectedContactRefs = selectedContactRefs.filter(c => c.email !== contact.email);
    }
    emailTo = currentEmails.join(', ');
    const msg = buildDefaultEmailMessage(selectedContactRefs, service);
    if (msg) emailText = msg;
}

function previewDocument(e: Event, blob: Blob | null, filename: string) {
    e.preventDefault();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    pdfPreviewModal?.open(url, 'Dokumentenvorschau', filename);
}

onMount(() => {
    emailTo = getRecipientEmailFromService(service);
    emailSubject = `Ihre Dokumente: ${pdfFilename.replace('.pdf', '')}`;
    availableContacts = buildPrioritizedContacts(service?.client);
    selectedContactRefs = [];
    if (emailTo) {
        const matched = availableContacts.find(c => c.email === emailTo);
        if (matched) selectedContactRefs = [matched];
    }
    
    const initialSalutation = getInitialEmailSalutation(selectedContactRefs, service);
    emailText = `${initialSalutation}\n\nanbei erhalten Sie Ihre Dokumente als PDF.\n\nMit freundlichen Grüßen\nIhre Seniorenassistenz`;
    
    const appIds = service.selectedAppointmentIds || [];
    if (appIds.length > 0) {
        pb.collection('appointments').getFullList({ filter: appIds.map((id:string) => `id='${id}'`).join(' || '), sort: 'appointment', requestKey: null }).then(res => {
            linkedAppointments = res.map((a: any) => ({ id: a.id, date: a.appointment, description: a.description, report: a.report || '' }));
        }).catch(()=>{});
    }

    if (service.client?.id) {
        const now = new Date(); now.setHours(0,0,0,0);
        const nowStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} 00:00:00`;
        pb.collection('appointments').getFullList({ filter: `client ~ '${service.client.id}' && appointment >= '${nowStr}'`, sort: 'appointment', requestKey: null }).then(res => {
            futureAppointments = res;
            selectedFutureAppIds = res.map((a: any) => a.id);
        }).catch(()=>{});
    }
});

async function saveReportToDb(id: string, reportText: string) {
    try {
        await pb.collection('appointments').update(id, { report: reportText });
        toastStore.success("Bericht erfolgreich gespeichert.");
    } catch { toastStore.error("Fehler beim Speichern."); }
}

async function sendPdfViaEmail() {
    isEmailSending = true;
    try {
        const attachments = [];
        if (pdfBlob) attachments.push({ filename: pdfFilename, content: await blobToBase64(pdfBlob), encoding: 'base64' });
        if (tsBlob) attachments.push({ filename: tsFilename, content: await blobToBase64(tsBlob), encoding: 'base64' });

        const user = pb.authStore.model;
        const userName = user ? `${user.name_first || ''} ${user.name_last || ''}`.trim() : 'Ihre Seniorenassistenz';
        const userEmail = user?.email || 'info@ihre-seniorenassistenz.com';
        const userPhone = user?.handy || user?.tel || '0151 57515432';

        const { htmlEmail, textEmail } = buildGeneratorEmailContent({
            emailText, includeReports, linkedAppointments, includeFutureApps,
            futureAppointments, selectedFutureAppIds, userName, userEmail, userPhone,
            compName: 'Ihre Seniorenassistenz', compStreet: 'Dreyhauptstraße 2', compCity: '06108 Halle (Saale)',
            compWeb: 'www.ihre-seniorenassistenz.com', compLogo: ''
        });

        await sendEmail({ to: emailTo, cc: cc || undefined, bcc: bcc || undefined, subject: emailSubject, text: textEmail, html: htmlEmail, attachments, provider: 'ionos' });
        emailSuccessMsg = "E-Mail wurde erfolgreich versendet!";

        const targetInvoiceId = service?.generatedInvoiceId || service?.existingInvoiceId;
        if (targetInvoiceId) await markInvoiceAsSent(targetInvoiceId, emailTo, orgaStore);
    } catch (err: any) {
        toastStore.error("Fehler beim Senden: " + err.message);
    } finally { isEmailSending = false; }
}

function handleToggleFutureApp(id: string) {
    if (selectedFutureAppIds.includes(id)) selectedFutureAppIds = selectedFutureAppIds.filter(i => i !== id);
    else selectedFutureAppIds = [...selectedFutureAppIds, id];
}
</script>

{#if emailSuccessMsg}
<div class="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 p-6 rounded-xl text-center">
    <span class="text-3xl mb-2 block">📨</span>
    <p class="font-bold text-blue-900 dark:text-blue-200">{emailSuccessMsg}</p>
    <div class="pt-4 flex justify-end mt-4 border-t border-neutral-100 dark:border-slate-800">
        <button type="button" class="btn-primary" onclick={onClose}>Schließen</button>
    </div>
</div>
{:else}
<div class="space-y-4">
    <div class="p-3.5 bg-neutral-50 dark:bg-slate-800/80 border border-neutral-200/80 dark:border-slate-700/80 rounded-xl space-y-2">
        <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-neutral-500 dark:text-slate-400 uppercase tracking-wider">Dateianhänge ({pdfBlob && tsBlob ? 2 : 1})</span>
            <button type="button" class="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline" onclick={onDownload}>Auf PC speichern</button>
        </div>
        <div class="flex flex-wrap gap-2">
            {#if pdfBlob}
                <button type="button" onclick={(e) => previewDocument(e, pdfBlob, pdfFilename)} class="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-700 border border-neutral-200 dark:border-slate-600 rounded-lg text-xs font-bold text-neutral-800 dark:text-white hover:bg-neutral-50 dark:hover:bg-slate-600 transition-colors shadow-2xs">
                    <span>📄</span> <span class="max-w-[200px] truncate">{pdfFilename}</span>
                </button>
            {/if}
            {#if tsBlob}
                <button type="button" onclick={(e) => previewDocument(e, tsBlob, tsFilename)} class="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-700 border border-neutral-200 dark:border-slate-600 rounded-lg text-xs font-bold text-neutral-800 dark:text-white hover:bg-neutral-50 dark:hover:bg-slate-600 transition-colors shadow-2xs">
                    <span>⏱️</span> <span class="max-w-[200px] truncate">{tsFilename}</span>
                </button>
            {/if}
        </div>
    </div>

    <div>
        <div class="flex justify-between items-center mb-1">
            <label for="generator-email-to" class="block text-xs font-bold text-neutral-700 dark:text-slate-300">Empfänger</label>
            <div class="flex items-center gap-3">
                {#if availableContacts.length > 0}
                    <div class="relative">
                        <button type="button" class="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1" onclick={() => showContactDropdown = !showContactDropdown}>
                            <span>👥 Kontakte ({availableContacts.length})</span>
                        </button>
                        {#if showContactDropdown}
                            <div class="absolute right-0 top-6 w-64 bg-white dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-xl shadow-xl z-50 p-2 space-y-1">
                                {#each availableContacts as c}
                                    <label class="flex items-center gap-2 p-1.5 hover:bg-neutral-50 dark:hover:bg-slate-700 rounded-lg cursor-pointer text-xs">
                                        <input type="checkbox" checked={emailTo.includes(c.email)} onchange={(e) => toggleRecipient(c, e.currentTarget.checked)} class="rounded text-indigo-600" />
                                        <div class="min-w-0">
                                            <p class="font-bold text-neutral-800 dark:text-neutral-200 truncate">{c.name}</p>
                                            <p class="text-[10px] text-neutral-500 truncate">{c.email} ({c.type})</p>
                                        </div>
                                    </label>
                                {/each}
                            </div>
                        {/if}
                    </div>
                {/if}
                <button type="button" class="text-[11px] text-neutral-500 hover:text-neutral-800 dark:text-slate-400 dark:hover:text-white" onclick={() => showCcBcc = !showCcBcc}>
                    {showCcBcc ? 'CC/BCC ausblenden' : 'CC/BCC hinzufügen'}
                </button>
            </div>
        </div>
        <input id="generator-email-to" type="text" bind:value={emailTo} placeholder="empfaenger@beispiel.de" class="orga-input-clear text-sm" />
    </div>

    {#if showCcBcc}
        <div class="grid grid-cols-2 gap-3">
            <div>
                <label for="generator-email-cc" class="block text-xs font-bold text-neutral-500 dark:text-slate-400 mb-1">CC</label>
                <input id="generator-email-cc" type="text" bind:value={cc} class="orga-input-clear text-sm" />
            </div>
            <div>
                <label for="generator-email-bcc" class="block text-xs font-bold text-neutral-500 dark:text-slate-400 mb-1">BCC</label>
                <input id="generator-email-bcc" type="text" bind:value={bcc} class="orga-input-clear text-sm" />
            </div>
        </div>
    {/if}

    <div>
        <label for="generator-email-subject" class="block text-xs font-bold text-neutral-700 dark:text-slate-300 mb-1">Betreff</label>
        <input id="generator-email-subject" type="text" bind:value={emailSubject} class="orga-input-clear text-sm" />
    </div>

    <div>
        <label for="generator-email-text" class="block text-xs font-bold text-neutral-700 dark:text-slate-300 mb-1">Nachricht</label>
        <textarea id="generator-email-text" use:autoGrow bind:value={emailText} class="auto-grow orga-input-clear text-sm min-h-[100px]"></textarea>
    </div>

    {#if linkedAppointments.length > 0}
        <GeneratorAppointmentReports {linkedAppointments} bind:includeReports {isEmailSending} {emailSuccessMsg} onSaveReport={saveReportToDb} />
    {/if}

    {#if futureAppointments.length > 0}
        <GeneratorFutureAppointments {futureAppointments} {selectedFutureAppIds} bind:includeFutureApps {isEmailSending} {emailSuccessMsg} onToggleApp={handleToggleFutureApp} />
    {/if}

    <div class="pt-4 flex justify-between items-center border-t border-neutral-100 dark:border-slate-800">
        <button type="button" class="btn-secondary" onclick={onClose} disabled={isEmailSending}>Schließen</button>
        <button type="button" class="btn-primary flex items-center gap-2" onclick={sendPdfViaEmail} disabled={isEmailSending || !emailTo}>
            {#if isEmailSending}
                <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Wird gesendet...</span>
            {:else}
                <span>✉️ Jetzt versenden</span>
            {/if}
        </button>
    </div>
</div>
{/if}

<PdfPreviewModal bind:this={pdfPreviewModal} />
