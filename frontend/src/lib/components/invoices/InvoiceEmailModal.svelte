<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import { googleCalendarService, type GoogleCalendarStatus } from "$lib/services/googleCalendarService";
    import { buildPrioritizedContacts } from "$lib/services/contactPickerService";
    import { sendInvoiceEmailPayload } from "$lib/services/invoiceEmailSenderService";
    import { generateEmailDefaultBody, generateEmailDefaultSubject, saveAppointmentReportToDb } from "$lib/services/invoiceEmailMessageHelper";
    import { recordDunningSent } from "$lib/services/invoiceQuickActions";
    import InvoiceEmailAttachmentsSection from "./InvoiceEmailAttachmentsSection.svelte";
    import InvoicePdfFileSelector from "./InvoicePdfFileSelector.svelte";
    import InvoiceDunningOptionsSection from "./InvoiceDunningOptionsSection.svelte";
    import InvoiceRecipientSelector from "./InvoiceRecipientSelector.svelte";
    import { autoGrow } from "$lib/actions/autoGrow";

    let dialog: HTMLDialogElement;
    let invoices = $state<any[]>([]);
    let invoice = $derived(invoices[0] || null);

    let isMahnungMode = $state(false);
    let mahnungLevel = $state(1);
    let dunningFee = $state(0);

    let emailTo = $state("");
    let emailSubject = $state("");
    let emailText = $state("");
    let isEmailSending = $state(false);
    let successMsg = $state("");
    let errorMsg = $state("");

    let cc = $state("");
    let bcc = $state("");
    let googleStatus = $state<GoogleCalendarStatus | null>(null);

    let linkedAppointments = $state<any[]>([]);
    let includeReports = $state(true);
    let availableContacts = $state<any[]>([]);
    let selectedContactRefs = $state<any[]>([]);

    let availablePdfs = $state<{record: any, filename: string}[]>([]);
    let selectedPdfFiles = $state<{record: any, filename: string}[]>([]);
    let futureAppointments = $state<any[]>([]);
    let selectedFutureAppIds = $state<string[]>([]);
    let includeFutureApps = $state(false);

    function updateMessage() {
        emailText = generateEmailDefaultBody(selectedContactRefs, emailTo, invoice, invoices, isMahnungMode, orgaStore, mahnungLevel, dunningFee);
    }

    function handleDunningChange(level: number, fee: number) {
        mahnungLevel = level;
        dunningFee = fee;
        emailSubject = generateEmailDefaultSubject(invoices, isMahnungMode, mahnungLevel);
        updateMessage();
    }

    export function open(
        invParam: any | any[], 
        mahnungOrFileField: boolean | string = false, 
        levelOrMahnung: number | boolean = 1, 
        fileField: string | number = 'pdf',
        customOptions?: { subject?: string; text?: string }
    ) {
        const invList = Array.isArray(invParam) ? invParam : [invParam];
        invoices = invList;

        let mahnung = false;
        let level = 1;
        let field = 'pdf';

        if (typeof mahnungOrFileField === 'string') {
            field = mahnungOrFileField;
            if (typeof levelOrMahnung === 'boolean') {
                mahnung = levelOrMahnung;
                level = typeof fileField === 'number' ? fileField : 1;
            }
        } else {
            mahnung = !!mahnungOrFileField;
            level = typeof levelOrMahnung === 'number' ? levelOrMahnung : 1;
            field = typeof fileField === 'string' ? fileField : 'pdf';
        }

        isMahnungMode = mahnung;
        mahnungLevel = level;
        dunningFee = 0;
        successMsg = "";
        errorMsg = "";
        googleCalendarService.getStatus().then(s => googleStatus = s).catch(() => {});

        availablePdfs = [];
        selectedPdfFiles = [];
        for (const inv of invList) {
            if (inv?.[field]) {
                const files = Array.isArray(inv[field]) ? inv[field] : [inv[field]];
                for (const f of files) {
                    availablePdfs.push({ record: inv, filename: f });
                    selectedPdfFiles.push({ record: inv, filename: f });
                }
            }
        }
        
        const targetClients = invList.map(inv => {
            if (Array.isArray(inv?.expand?.client)) return inv.expand.client[0];
            if (inv?.expand?.client) return inv.expand.client;
            if (inv?.client) {
                const cId = Array.isArray(inv.client) ? inv.client[0] : inv.client;
                return orgaStore.clients?.data?.find((c: any) => c.id === cId);
            }
            return null;
        }).filter(Boolean);

        availableContacts = buildPrioritizedContacts(targetClients);
        selectedContactRefs = [];
        
        const firstClient = targetClients[0];
        let emails: string[] = [];
        if (firstClient?.expand?.caregiver?.email) emails.push(firstClient.expand.caregiver.email);
        else if (firstClient?.email) emails.push(firstClient.email);
        if (firstClient?.mailing_list && Array.isArray(firstClient.mailing_list)) emails = [...emails, ...firstClient.mailing_list];
        emailTo = [...new Set(emails)].filter(Boolean).join(", ");

        if (emailTo) {
            const matched = availableContacts.find(c => c.email === emailTo);
            if (matched) selectedContactRefs = [matched];
        }
        
        emailSubject = customOptions?.subject || generateEmailDefaultSubject(invoices, isMahnungMode, mahnungLevel);
        if (customOptions?.text) {
            emailText = customOptions.text;
        } else {
            updateMessage();
        }

        let allAppIds: string[] = [];
        for (const inv of invList) {
            const appIds = Array.isArray(inv?.appointments) ? inv.appointments : (inv?.appointments ? [inv.appointments] : []);
            allAppIds = [...allAppIds, ...appIds];
        }
        const appIds = [...new Set(allAppIds)];
        if (appIds.length > 0) {
            const filterStr = appIds.map((id:string) => `id='${id}'`).join(' || ');
            pb.collection('appointments').getFullList({ filter: filterStr, sort: 'appointment', requestKey: null }).then(res => {
                linkedAppointments = res.map((a: any) => ({ id: a.id, date: a.appointment, description: a.description, report: a.report || '' }));
            }).catch(e => console.error("Konnte Termine nicht laden", e));
        }
        
        if (firstClient?.id) {
            const now = new Date();
            now.setHours(0,0,0,0);
            const nowStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} 00:00:00`;
            pb.collection('appointments').getFullList({ filter: `client ~ '${firstClient.id}' && appointment >= '${nowStr}'`, sort: 'appointment', requestKey: null }).then(res => {
                futureAppointments = res;
                selectedFutureAppIds = res.map((a:any) => a.id);
            }).catch(()=>{});
        }
        dialog?.showModal();
    }

    export function close() {
        dialog?.close();
        invoices = [];
    }

    async function sendInvoiceEmail() {
        if (selectedPdfFiles.length === 0) {
            errorMsg = "Bitte wählen Sie mindestens ein Dokument zum Senden aus.";
            return;
        }
        isEmailSending = true;
        errorMsg = "";
        successMsg = "";
        try {
            await sendInvoiceEmailPayload({
                selectedPdfFiles, googleStatus, orgaStore, includeReports,
                linkedAppointments, includeFutureApps, futureAppointments,
                selectedFutureAppIds, emailTo, cc, bcc, emailSubject, emailText, invoices
            });
            if (isMahnungMode) {
                await recordDunningSent(invoices, mahnungLevel, dunningFee);
            }
            successMsg = "E-Mail wurde erfolgreich versendet!";
            setTimeout(() => { close(); }, 2000);
        } catch (err: any) {
            errorMsg = "Fehler beim Senden: " + err.message;
        } finally {
            isEmailSending = false;
        }
    }
</script>

<dialog bind:this={dialog} class="p-0 bg-transparent backdrop:bg-slate-950/65 backdrop:backdrop-blur-md w-full max-w-2xl mx-auto my-6 sm:my-10 rounded-3xl zero-inner-scroll-modal" onclick={(e) => { if (e.target === dialog) close(); }}>
    <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-3xl p-6 sm:p-8 w-full relative shadow-2xl">
        <button aria-label="Schließen" title="Schließen" onclick={close} class="absolute top-5 right-5 w-10 h-10 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full flex items-center justify-center transition-colors cursor-pointer"><svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>

        <h2 class="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-2 pr-10">
            <span class="w-8 h-8 flex items-center justify-center bg-cyan-50 dark:bg-cyan-950/50 text-cyan-600 dark:text-cyan-400 rounded-lg shadow-inner text-sm">✉️</span>
            <span>{isMahnungMode ? (mahnungLevel === 1 ? '1. Zahlungserinnerung versenden' : (mahnungLevel === 2 ? '2. Mahnung versenden' : '3. Letzte Mahnung versenden')) : 'Rechnung per E-Mail versenden'}</span>
        </h2>
        <p class="text-sm text-slate-500 dark:text-slate-400 mb-4">{isMahnungMode ? 'Erinnern oder mahnen Sie den Kunden an die Begleichung der überfälligen Rechnung.' : 'Versenden Sie die Rechnung direkt als PDF-Anhang per E-Mail.'}</p>

        {#if successMsg}<div class="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 p-4 rounded-xl mb-4 text-sm font-semibold border border-emerald-200 dark:border-emerald-800 animate-enter flex items-center gap-2"><span>✅</span> {successMsg}</div>{/if}
        {#if errorMsg}<div class="bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 p-4 rounded-xl mb-4 text-sm font-semibold border border-rose-200 dark:border-rose-800 animate-enter flex items-center gap-2"><span>❌</span> {errorMsg}</div>{/if}

        <form onsubmit={(e) => { e.preventDefault(); sendInvoiceEmail(); }} class="space-y-4">
            {#if isMahnungMode}
                <InvoiceDunningOptionsSection
                    bind:mahnungLevel
                    bind:dunningFee
                    onChange={handleDunningChange}
                />
            {/if}

            <InvoiceRecipientSelector
                bind:emailTo
                bind:cc
                bind:bcc
                {availableContacts}
                bind:selectedContactRefs
                disabled={isEmailSending || !!successMsg}
                onRecipientToggled={updateMessage}
            />
            
            <div><label for="email-subject" class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Betreff</label><input id="email-subject" type="text" bind:value={emailSubject} class="orga-input-clear py-2.5 text-sm" required disabled={isEmailSending || !!successMsg} /></div>
            <div><label for="email-text" class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Nachricht</label><textarea use:autoGrow id="email-text" bind:value={emailText} rows="4" class="auto-grow orga-input-clear py-2.5 text-sm" required disabled={isEmailSending || !!successMsg}></textarea></div>
            <InvoiceEmailAttachmentsSection {linkedAppointments} bind:includeReports {futureAppointments} bind:selectedFutureAppIds bind:includeFutureApps {isEmailSending} {successMsg} onSaveReport={saveAppointmentReportToDb} />
            <InvoicePdfFileSelector {availablePdfs} bind:selectedPdfFiles disabled={isEmailSending || !!successMsg} />
            <div class="pt-4 flex flex-col-reverse sm:flex-row justify-end gap-3 border-t border-slate-100 dark:border-slate-800 mt-4">
                <button type="button" onclick={close} class="orga-button-ghost w-full sm:w-auto py-2.5" disabled={isEmailSending}>Abbrechen</button>
                <button type="submit" class="orga-button-primary shadow-violet-600/20 w-full sm:w-auto py-2.5" disabled={isEmailSending || !!successMsg || selectedPdfFiles.length === 0}>{isEmailSending ? 'Wird gesendet...' : 'E-Mail senden ✉️'}</button>
            </div>
        </form>
    </div>
</dialog>
