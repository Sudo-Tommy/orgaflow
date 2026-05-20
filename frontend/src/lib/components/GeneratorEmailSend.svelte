<script lang="ts">
import { pb } from "$lib/services/pocketbase";
import { sendEmail } from "$lib/services/emailService";
import { toastStore } from "$lib/services/toastService.svelte";
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

let emailTo = $state("");
let emailSubject = $state("");
let emailText = $state("");
let isEmailSending = $state(false);
let emailSuccessMsg = $state("");

    let cc = $state("");
    let bcc = $state("");
    let showCcBcc = $state(false);
let linkedAppointments = $state<any[]>([]);
let includeReports = $state(true);
    let availableContacts = $state<any[]>([]);
    let currentSalutations = $state<string[]>([]);

function getRecipientEmail() {
    if (service.recipientType === 'client') return service.client?.email || "";
    if (service.recipientType === 'contact') {
        const contact = service.client?.expand?.contacts?.find((c:any) => c.id === service.recipientId);
        return contact?.email || "";
    }
    if (service.recipientType === 'insurance') return service.client?.expand?.insurance?.email || "";
    if (service.recipientType === 'home') {
        const home = service.client?.expand?.retirement_homes?.find((h:any) => h.id === service.recipientId);
        return home?.email || "";
    }
    return "";
}

onMount(() => {
    emailTo = getRecipientEmail();
    emailSubject = `Ihre Dokumente: ${pdfFilename.replace('.pdf', '')}`;
    
    if (service.isInvoice) {
        const client = service.client;
        emailText = `Guten Tag${client?.name_last ? ` ${client.salutation === 'Herr' ? 'Herr' : (client.salutation === 'Frau' ? 'Frau' : '')} ${client.name_last}` : ''},\n\nanbei erhalten Sie Ihre Rechnung sowie ggf. zugehörige Arbeitszeitnachweise als PDF-Dokument.\n\nIhre Rechnungen und Dokumente können Sie ab sofort auch jederzeit sicher in unserem neuen Klienten-Portal einsehen:\n👉 <https://www.ihre-seniorenassistenz.com/portal\n\nMit> freundlichen Grüßen\nIhre Seniorenassistenz`;
    } else {
        emailText = `Guten Tag,\n\nanbei erhalten Sie die gewünschten Dokumente.\n\nMit freundlichen Grüßen\nIhre Seniorenassistenz`;
    }
    
    linkedAppointments = [];
    includeReports = true;
    const appIds = service.selectedAppointmentIds || [];
    
    if (appIds.length > 0) {
        const filterStr = appIds.map((id:string) => `id='${id}'`).join(' || ');
        pb.collection('appointments').getFullList({ filter: filterStr, sort: 'appointment', requestKey: null }).then(res => {
            linkedAppointments = res.map((a: any) => ({
                id: a.id, date: a.appointment, description: a.description, report: a.report || ''
            }));
        }).catch(e => console.error("Konnte Termine nicht laden", e));
    }
});

async function saveReportToDb(id: string, reportText: string) {
    try {
        await pb.collection('appointments').update(id, { report: reportText });
        toastStore.success("Bericht erfolgreich in der Datenbank gespeichert.");
    } catch (err) {
        toastStore.error("Fehler beim Speichern in der Datenbank.");
    }
}

function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === 'string') resolve(reader.result.split(',')[1]);
            else reject(new Error("Failed to convert blob to base64"));
        };
        reader.readAsDataURL(blob);
    });
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

        let reportsHtml = '';
        let reportsText = '';

        if (includeReports && linkedAppointments.some(a => a.report?.trim())) {
            reportsHtml += `
                <div style="margin-top: 30px; border-top: 2px dashed #e5e7eb; padding-top: 20px;">
                    <h2 style="color: #954028; font-size: 20px; margin-bottom: 15px;">Ihre Besuchsberichte</h2>
            `;
            reportsText += `\n\n--- IHRE BESUCHSBERICHTE ---\n`;

            for (const app of linkedAppointments) {
                if (!app.report?.trim()) continue;
                
                const dateStr = new Date(app.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
                const timeStr = new Date(app.date).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
                
                reportsHtml += `
                    <div style="background-color: #f8fafc; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 15px;">
                        <div style="border-bottom: 1px solid #e5e7eb; padding-bottom: 10px; margin-bottom: 10px;">
                            <strong style="color: #111827; font-size: 16px;">Termin am ${dateStr} um ${timeStr} Uhr</strong><br>
                            <span style="color: #6b7280; font-size: 13px;">${app.description || 'Betreuungstermin'}</span>
                        </div>
                        <div style="color: #374151; font-size: 14px; line-height: 1.6;">
                            ${app.report.replace(/\n/g, '<br>')}
                        </div>
                    </div>
                `;
                reportsText += `\nTermin am ${dateStr} um ${timeStr} Uhr\n${app.description || 'Betreuungstermin'}\n\n${app.report}\n\n`;
            }
            reportsHtml += `</div>`;
        }

        const textEmail = `${emailText.trim()}${reportsText}\n\n--\n${userName}\nIhre Seniorenassistenz\nDreyhauptstraße 2, 06108 Halle (Saale)\nTelefon: ${userPhone}\nE-Mail: ${userEmail}\nWeb: www.ihre-seniorenassistenz.com`;

        const htmlEmail = `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #374151; max-width: 650px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                <div style="background-color: #fdf8f6; padding: 25px 30px; border-bottom: 3px solid #c66a4d;">
                    <h1 style="color: #954028; margin: 0; font-size: 24px; letter-spacing: -0.5px;">Ihre Seniorenassistenz</h1>
                    <p style="color: #c66a4d; margin: 4px 0 0 0; font-size: 14px; font-weight: 500;">Alltagshilfe • Betreuung • Organisation</p>
                </div>
                <div style="padding: 30px; font-size: 15px; line-height: 1.6; color: #1f2937; background-color: #ffffff;">
                    ${emailText.trim().replace(/\n/g, '<br>').replace(/(?:<br>|\s)*(?:👉\s*)?(?:&lt;|<)?\s*https?:\/\/(?:www\.)?ihre-seniorenassistenz\.com\/portal\/?\s*(?:&gt;|>)?/gi, '<br><table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 15px 0;"><tr><td align="center" bgcolor="#c66a4d" style="border-radius: 8px;"><a href="https://www.ihre-seniorenassistenz.com/portal" style="display: inline-block; padding: 12px 24px; color: #ffffff; text-decoration: none; font-weight: bold; font-family: Arial, sans-serif; font-size: 15px;">Zum Klienten-Portal</a></td></tr></table><br>')}
                    
                    ${reportsHtml}
                </div>
                <div style="background-color: #f8fafc; padding: 25px 30px; border-top: 1px solid #e5e7eb;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 13px; color: #4b5563;">
                        <tr>
                            <td style="padding-bottom: 15px;">
                                <strong style="color: #111827; font-size: 16px;">${userName}</strong><br>
                                <span style="color: #c66a4d;">Ihre Ansprechperson</span>
                            </td>
                        </tr>
                        <tr>
                            <td style="line-height: 1.6;">
                                <strong>Ihre Seniorenassistenz</strong><br>
                                Dreyhauptstraße 2<br>
                                06108 Halle (Saale)<br><br>
                                📞 <a href="tel:${userPhone}" style="color: #c66a4d; text-decoration: none;">${userPhone}</a><br>
                                ✉️ <a href="mailto:${userEmail}" style="color: #c66a4d; text-decoration: none;">${userEmail}</a><br>
                                🌐 <a href="https://www.ihre-seniorenassistenz.com" style="color: #c66a4d; text-decoration: none;">www.ihre-seniorenassistenz.com</a>
                            </td>
                        </tr>
                    </table>
                </div>
            </div>
        `;

        await sendEmail({ 
            to: emailTo, 
            cc: cc || undefined,
            bcc: bcc || undefined,
            subject: emailSubject, 
            text: textEmail, 
            html: htmlEmail, 
            attachments 
        });
        
        try {
            if (pb.authStore.model) {
                let fullTo = emailTo;
                if (cc) fullTo += `, CC: ${cc}`;
                if (bcc) fullTo += `, BCC: ${bcc}`;
                
                await pb.collection('mailbox_messages').create({
                    user: pb.authStore.model.id,
                    folder: 'Sent',
                    from_address: `${userName} <${userEmail}>`,
                    to_address: fullTo,
                    subject: emailSubject,
                    body_text: textEmail,
                    body_html: htmlEmail,
                    date: new Date().toISOString(),
                    is_read: true
                });
            }
        } catch (e) { console.warn("E-Mail konnte nicht im Postfach gespeichert werden", e); }

        emailSuccessMsg = "E-Mail wurde erfolgreich mit Anhang versendet!";
    } catch (err: any) {
        console.error(err);
        toastStore.error("Fehler beim Senden der E-Mail: " + err.message);
    } finally { 
        isEmailSending = false; 
    }
}
</script>

{#if emailSuccessMsg}
<div class="bg-blue-50 border border-blue-200 p-6 rounded-xl text-center">
    <span class="text-3xl mb-2 block">📨</span>
    <p class="font-bold text-blue-900">{emailSuccessMsg}</p>
</div>

<div class="pt-4 flex justify-end mt-4 border-t border-neutral-100">
    <button type="button" onclick={() => { onClose(); service.reset(); }} class="orga-button-primary w-full sm:w-auto py-3 sm:py-2.5 px-6">Fertig</button>
</div>
{:else}
<div class="border border-neutral-200 rounded-xl p-5 bg-neutral-50/50">
    <h4 class="font-bold text-neutral-800 mb-3 flex items-center gap-2"><span>✉️</span> Direkt als E-Mail versenden</h4>
    <div class="space-y-4">
        <div><label for="genEmailTo" class="block text-xs font-semibold text-neutral-600 mb-1">Empfänger (An)</label><input id="genEmailTo" type="email" bind:value={emailTo} class="orga-input-clear py-2 text-sm" disabled={isEmailSending} /></div>
        <div><label for="genEmailSubject" class="block text-xs font-semibold text-neutral-600 mb-1">Betreff</label><input id="genEmailSubject" type="text" bind:value={emailSubject} class="orga-input-clear py-2 text-sm" disabled={isEmailSending} /></div>
        <div><label for="genEmailText" class="block text-xs font-semibold text-neutral-600 mb-1">Nachricht</label><textarea id="genEmailText" bind:value={emailText} rows="4" class="orga-input-clear py-2 text-sm resize-none custom-scrollbar" disabled={isEmailSending}></textarea></div>
        
        {#if linkedAppointments.length > 0}
            <div class="pt-4 mt-2 border-t border-neutral-100">
                <div class="flex items-center justify-between mb-3">
                    <h3 class="text-sm font-bold text-neutral-900 flex items-center gap-2"><span>📝</span> Besuchsberichte</h3>
                    <label class="flex items-center gap-2 text-sm font-semibold text-neutral-700 cursor-pointer">
                        <input type="checkbox" bind:checked={includeReports} class="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500" disabled={isEmailSending} />
                            In E-Mail anhängen
                        </label>
                    </div>
                    
                    {#if includeReports}
                        <div class="space-y-3 max-h-60 overflow-y-auto custom-scrollbar p-1 pr-2">
                            {#each linkedAppointments as app}
                                <div class="bg-white border border-indigo-100 p-4 rounded-xl flex flex-col gap-2 transition-all shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-300">
                                    <div class="flex items-center justify-between mb-1">
                                        <div class="flex items-center gap-2">
                                            <span class="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs">📅</span>
                                            <span class="text-sm font-bold text-neutral-900">{app.date ? new Date(app.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''}</span>
                                            <span class="text-xs text-neutral-500 font-medium">{app.date ? new Date(app.date).toLocaleTimeString('de-DE', {hour: '2-digit', minute:'2-digit'}) : ''} Uhr</span>
                                        </div>
                                        <span class="text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded truncate max-w-32 font-bold uppercase tracking-wider">{app.description || 'Termin'}</span>
                                    </div>
                                    <textarea bind:value={app.report} rows="3" class="orga-input-clear text-sm resize-y custom-scrollbar w-full border-neutral-200 focus:border-indigo-300 bg-neutral-50 focus:bg-white transition-colors" placeholder="Kein Bericht vorhanden. Hier tippen, um einen hinzuzufügen..." disabled={isEmailSending}></textarea>
                                    {#if app.report}
                                        <div class="flex justify-end mt-1">
                                            <button type="button" onclick={() => saveReportToDb(app.id, app.report)} class="text-[10px] flex items-center gap-1 uppercase tracking-wider text-indigo-600 hover:text-indigo-800 font-bold transition-colors" disabled={isEmailSending}><svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg> In Datenbank sichern</button>
                                        </div>
                                    {/if}
                                </div>
                            {/each}
                        </div>
                    {/if}
                </div>
            {/if}

            <div class="flex flex-wrap gap-2 pt-2 mt-2 border-t border-neutral-100">
                <div class="flex items-center gap-2 bg-neutral-100 text-neutral-700 px-3 py-1.5 rounded-lg text-sm border border-neutral-200 shadow-sm animate-enter">
                    <span class="truncate max-w-50 font-medium">📎 {pdfFilename}</span>
                </div>
                {#if tsBlob}
                    <div class="flex items-center gap-2 bg-neutral-100 text-neutral-700 px-3 py-1.5 rounded-lg text-sm border border-neutral-200 shadow-sm animate-enter delay-100">
                        <span class="truncate max-w-50 font-medium">📎 {tsFilename}</span>
                    </div>
                {/if}
            </div>
        </div>
    </div>

    <div class="pt-4 flex flex-col-reverse sm:flex-row justify-between gap-3 mt-4 border-t border-neutral-100">
        <button type="button" onclick={onDownload} class="orga-button-ghost w-full sm:w-auto py-3 sm:py-2.5 px-6" disabled={isEmailSending}>Manuell herunterladen</button>
        <div class="flex flex-col-reverse sm:flex-row gap-3 w-full sm:w-auto">
            <button type="button" onclick={() => { onClose(); service.reset(); }} class="orga-button-ghost w-full sm:w-auto py-3 sm:py-2.5 px-6" disabled={isEmailSending}>Schließen</button>
            <button type="button" onclick={sendPdfViaEmail} class="orga-button-primary shadow-indigo-600/30 w-full sm:w-auto py-3 sm:py-2.5 px-6" disabled={isEmailSending || !emailTo}>
                {isEmailSending ? 'Wird gesendet...' : 'E-Mail senden ✉️'}
            </button>
        </div>
    </div>
{/if}
