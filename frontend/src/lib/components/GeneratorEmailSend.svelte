<script lang="ts">
import { pb } from "$lib/services/pocketbase";
import { sendEmail } from "$lib/services/emailService";
import { toastStore } from "$lib/services/toastService.svelte";
import { orgaStore } from "$lib/stores/orgaStore.svelte";
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
    let showContactDropdown = $state(false);
let linkedAppointments = $state<any[]>([]);
let includeReports = $state(true);
    let availableContacts = $state<any[]>([]);
    let currentSalutations = $state<string[]>([]);
    let selectedContactRefs = $state<any[]>([]);

let futureAppointments = $state<any[]>([]);
let selectedFutureAppIds = $state<string[]>([]);
let includeFutureApps = $state(false);

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

function buildAvailableContacts() {
    let list: any[] = [];
    const add = (name: string, email: string, phone: string, salutation: string) => {
        if (email || phone) list.push({ name, email, phone, salutation });
    };
    orgaStore.clients?.data?.forEach((c: any) => {
        let sal = c.salutation === 'Herr' ? `Sehr geehrter Herr ${c.name_last}` : (c.salutation === 'Frau' ? `Sehr geehrte Frau ${c.name_last}` : `Guten Tag ${c.name_first} ${c.name_last}`);
        add(`${c.name_first} ${c.name_last} (Klient)`, c.email, c.phone || c.handy, sal + ',');
    });
    orgaStore.contacts?.data?.forEach((c: any) => {
        let sal = c.salutation === 'Herr' ? `Sehr geehrter Herr ${c.name_last}` : (c.salutation === 'Frau' ? `Sehr geehrte Frau ${c.name_last}` : `Guten Tag ${c.name_first} ${c.name_last}`);
        add(`${c.name_first} ${c.name_last} (${c.company_name || 'Kontakt'})`, c.email, c.phone, sal + ',');
    });
    orgaStore.retirement_homes?.data?.forEach((h: any) => {
        add(`${h.name} (Pflegeheim)`, h.email, h.phone, `Sehr geehrte Damen und Herren vom ${h.name},`);
    });
    const unique: any[] = [];
    const seen = new Set();
    for (const item of list) {
        const key = `${item.email}-${item.phone}`;
        if (!seen.has(key)) { seen.add(key); unique.push(item); }
    }
    return unique.sort((a, b) => a.name.localeCompare(b.name));
}

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
    updateSalutation();
}

function updateSalutation() {
    if (selectedContactRefs.length === 0) return;
    let newSalutation = "";
    if (selectedContactRefs.length === 1) {
        newSalutation = selectedContactRefs[0].salutation;
    } else if (selectedContactRefs.length === 2) {
        const first = selectedContactRefs[0].salutation.replace(',', '');
        const second = selectedContactRefs[1].salutation.replace(',', '');
        newSalutation = `${first},\n${second.charAt(0).toLowerCase() + second.slice(1)},`;
    } else {
        newSalutation = "Sehr geehrte Damen und Herren,";
    }
    const parts = emailText.split('\n\n');
    if (parts.length > 1) {
        parts[0] = newSalutation;
        emailText = parts.join('\n\n');
    } else {
        emailText = `${newSalutation}\n\n${emailText}`;
    }
}

onMount(() => {
    emailTo = getRecipientEmail();
    emailSubject = `Ihre Dokumente: ${pdfFilename.replace('.pdf', '')}`;
    
    availableContacts = buildAvailableContacts();
    selectedContactRefs = [];
    if (emailTo) {
        const matched = availableContacts.find(c => c.email === emailTo);
        if (matched) selectedContactRefs = [matched];
    }
    
    let initialSalutation = "Guten Tag,";
    if (selectedContactRefs.length > 0) {
        initialSalutation = selectedContactRefs[0].salutation;
    } else if (service.client) {
        initialSalutation = service.client.salutation === 'Herr' ? `Sehr geehrter Herr ${service.client.name_last},` : (service.client.salutation === 'Frau' ? `Sehr geehrte Frau ${service.client.name_last},` : `Guten Tag ${service.client.name_first} ${service.client.name_last},`);
    }

    if (service.isInvoice) {
        emailText = `${initialSalutation}\n\nanbei erhalten Sie Ihre Rechnung sowie ggf. zugehörige Arbeitszeitnachweise als PDF-Dokument.\n\nIhre Rechnungen und Dokumente können Sie ab sofort auch jederzeit sicher in unserem neuen Klienten-Portal einsehen:\n👉 https://www.ihre-seniorenassistenz.com/portal\n\nMit freundlichen Grüßen\nIhre Seniorenassistenz`;
    } else {
        emailText = `${initialSalutation}\n\nanbei erhalten Sie die gewünschten Dokumente.\n\nMit freundlichen Grüßen\nIhre Seniorenassistenz`;
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

    if (service.client?.id) {
        const now = new Date();
        now.setHours(0,0,0,0);
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const nowStr = `${yyyy}-${mm}-${dd} 00:00:00`;
        
        pb.collection('appointments').getFullList({
            filter: `client ~ '${service.client.id}' && appointment >= '${nowStr}'`,
            sort: 'appointment',
            requestKey: null
        }).then(res => {
            futureAppointments = res;
            selectedFutureAppIds = res.map((a:any) => a.id);
        }).catch(()=>{});
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
        
        let futureAppsHtml = '';
        let futureAppsText = '';

        if (includeFutureApps && selectedFutureAppIds.length > 0) {
            const selectedApps = futureAppointments.filter(a => selectedFutureAppIds.includes(a.id));
            if (selectedApps.length > 0) {
                futureAppsHtml += `
                    <div style="margin-top: 30px; border-top: 2px dashed #e5e7eb; padding-top: 20px;">
                        <h2 style="color: #954028; font-size: 20px; margin-bottom: 15px;">Ihre nächsten Termine</h2>
                        <table cellpadding="0" cellspacing="0" style="font-size: 14px; color: #4b5563; width: 100%; border-collapse: collapse;">
                `;
                futureAppsText += `\n\n--- IHRE NÄCHSTEN TERMINE ---\n`;

                for (const app of selectedApps) {
                    const dateStr = new Date(app.appointment).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
                    const timeStr = new Date(app.appointment).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
                    
                    futureAppsHtml += `
                        <tr>
                            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; width: 150px; vertical-align: top;">
                                <strong style="color: #111827;">${dateStr}</strong><br>
                                <span style="color: #6b7280; font-size: 13px;">${timeStr} Uhr</span>
                            </td>
                            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; vertical-align: top; line-height: 1.5;">
                                ${app.description || 'Termin'}
                            </td>
                        </tr>
                    `;
                    futureAppsText += `• ${dateStr} um ${timeStr} Uhr: ${app.description || 'Termin'}\n`;
                }
                futureAppsHtml += `</table></div>`;
            }
        }

        const textEmail = `${emailText.trim()}${reportsText}${futureAppsText}\n\n--\n${userName}\nIhre Seniorenassistenz\nDreyhauptstraße 2, 06108 Halle (Saale)\nTelefon: ${userPhone}\nE-Mail: ${userEmail}\nWeb: www.ihre-seniorenassistenz.com`;

        const htmlEmail = `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #374151; max-width: 650px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                <div style="background-color: #fdf8f6; padding: 25px 30px; border-bottom: 3px solid #c66a4d;">
                    <h1 style="color: #954028; margin: 0; font-size: 24px; letter-spacing: -0.5px;">Ihre Seniorenassistenz</h1>
                    <p style="color: #c66a4d; margin: 4px 0 0 0; font-size: 14px; font-weight: 500;">Alltagshilfe • Betreuung • Organisation</p>
                </div>
                <div style="padding: 30px; font-size: 15px; line-height: 1.6; color: #1f2937; background-color: #ffffff;">
                    ${emailText.trim().replace(/\n/g, '<br>').replace(/(?:<br>|\s)*(?:👉\s*)?(?:&lt;|<)?\s*https?:\/\/(?:www\.)?ihre-seniorenassistenz\.com\/portal\/?\s*(?:&gt;|>)?/gi, '<br><table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 15px 0;"><tr><td align="center" bgcolor="#c66a4d" style="border-radius: 8px;"><a href="https://www.ihre-seniorenassistenz.com/portal" style="display: inline-block; padding: 12px 24px; color: #ffffff; text-decoration: none; font-weight: bold; font-family: Arial, sans-serif; font-size: 15px;">Zum Klienten-Portal</a></td></tr></table><br>')}
                    
                    ${reportsHtml}
                    ${futureAppsHtml}
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
<div class="border border-neutral-200 rounded-xl p-4 sm:p-6 bg-neutral-50/50">
    <h4 class="font-bold text-neutral-800 mb-4 flex items-center gap-2 text-lg"><span>✉️</span> Direkt als E-Mail versenden</h4>
    <div class="space-y-5">
        <div>
            <div class="flex items-center justify-between mb-1.5">
                <label for="genEmailTo" class="block text-sm font-bold text-neutral-700">Empfänger (An)</label>
                <button type="button" onclick={() => showCcBcc = !showCcBcc} class="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors">{showCcBcc ? '− CC / BCC ausblenden' : '+ CC / BCC hinzufügen'}</button>
            </div>
            <div class="flex flex-col sm:flex-row gap-2">
                <input id="genEmailTo" type="email" bind:value={emailTo} class="orga-input-clear py-3 sm:py-2.5 text-sm flex-1" disabled={isEmailSending} />
                
                <div class="relative flex-1 sm:flex-none sm:w-auto">
                    <button type="button" onclick={() => showContactDropdown = !showContactDropdown} class="orga-input-clear w-full bg-white border-neutral-200 shadow-sm cursor-pointer text-sm font-medium py-3 sm:py-2.5 flex justify-between items-center" disabled={isEmailSending}>
                        <span>+ Adressbuch</span><span class="text-[10px] ml-2">▼</span>
                    </button>
                    {#if showContactDropdown}
                        <!-- svelte-ignore a11y_consider_explicit_label -->
                        <button type="button" class="fixed inset-0 z-40 w-full h-full cursor-default" onclick={() => showContactDropdown = false} tabindex="-1"></button>
                        <div class="absolute top-full right-0 mt-1 w-64 bg-white border border-neutral-200 shadow-xl rounded-xl z-50 max-h-60 overflow-y-auto custom-scrollbar p-1">
                            {#each availableContacts.filter(c => c.email) as c}
                                <label class="flex items-center gap-3 p-2 hover:bg-neutral-50 rounded-lg cursor-pointer transition-colors"><input type="checkbox" checked={emailTo.includes(c.email)} onchange={(e) => toggleRecipient(c, e.currentTarget.checked)} class="w-4 h-4 text-indigo-600 border-neutral-300 rounded focus:ring-indigo-500" /><div class="min-w-0"><p class="text-sm font-bold text-neutral-900 truncate">{c.name}</p><p class="text-[10px] text-neutral-500 truncate">{c.email}</p></div></label>
                            {/each}
                            {#if availableContacts.filter(c => c.email).length === 0}<p class="text-xs text-neutral-500 p-2 text-center">Keine E-Mails gefunden</p>{/if}
                        </div>
                    {/if}
                </div>
            </div>
        </div>
        
        {#if showCcBcc}
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 animate-enter">
                <div><label for="genEmailCc" class="block text-sm font-bold text-neutral-700 mb-1.5">CC (Kopie)</label><input id="genEmailCc" type="text" bind:value={cc} class="orga-input-clear py-3 sm:py-2.5 text-sm" disabled={isEmailSending} /></div>
                <div><label for="genEmailBcc" class="block text-sm font-bold text-neutral-700 mb-1.5">BCC (Blindkopie)</label><input id="genEmailBcc" type="text" bind:value={bcc} class="orga-input-clear py-3 sm:py-2.5 text-sm" disabled={isEmailSending} /></div>
            </div>
        {/if}

        <div><label for="genEmailSubject" class="block text-sm font-bold text-neutral-700 mb-1.5">Betreff</label><input id="genEmailSubject" type="text" bind:value={emailSubject} class="orga-input-clear py-3 sm:py-2.5 text-sm" disabled={isEmailSending} /></div>
        <div><label for="genEmailText" class="block text-sm font-bold text-neutral-700 mb-1.5">Nachricht</label><textarea id="genEmailText" bind:value={emailText} rows="6" class="orga-input-clear py-3 sm:py-2.5 text-sm resize-y custom-scrollbar" disabled={isEmailSending}></textarea></div>
        
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4 mt-2 border-t border-neutral-100">
            <!-- Besuchsberichte -->
            {#if linkedAppointments.length > 0}
                <div>
                    <div class="flex items-center justify-between mb-3">
                        <h3 class="text-sm font-bold text-neutral-900 flex items-center gap-2"><span>📝</span> Besuchsberichte</h3>
                        <label class="flex items-center gap-2 text-sm font-semibold text-neutral-700 cursor-pointer">
                            <input type="checkbox" bind:checked={includeReports} class="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500" disabled={isEmailSending || !!emailSuccessMsg} />
                            Anhängen
                        </label>
                    </div>
                    {#if includeReports}
                        <div class="space-y-3 max-h-60 overflow-y-auto custom-scrollbar p-1 pr-2">
                            {#each linkedAppointments as app}
                                <div class="bg-white border border-indigo-100 p-4 rounded-xl flex flex-col gap-2 transition-all shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/20">
                                    <div class="flex items-center justify-between mb-1">
                                        <div class="flex items-center gap-2">
                                            <span class="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs">📅</span>
                                            <span class="text-sm font-bold text-neutral-900">{app.date ? new Date(app.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''}</span>
                                            <span class="text-xs text-neutral-500 font-medium">{app.date ? new Date(app.date).toLocaleTimeString('de-DE', {hour: '2-digit', minute:'2-digit'}) : ''} Uhr</span>
                                        </div>
                                        <span class="text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded truncate max-w-32 font-bold uppercase tracking-wider">{app.description || 'Termin'}</span>
                                    </div>
                                    <textarea bind:value={app.report} rows="3" class="orga-input-clear text-sm resize-y custom-scrollbar w-full border-neutral-200 bg-neutral-50 focus:bg-white transition-colors" placeholder="Kein Bericht vorhanden. Hier tippen, um einen hinzuzufügen..." disabled={isEmailSending || !!emailSuccessMsg}></textarea>
                                    {#if app.report}
                                        <div class="flex justify-end mt-1">
                                            <button type="button" onclick={() => saveReportToDb(app.id, app.report)} class="text-[10px] flex items-center gap-1 uppercase tracking-wider text-indigo-600 hover:text-indigo-800 font-bold transition-colors" disabled={isEmailSending || !!emailSuccessMsg}><svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg> Sichern</button>
                                        </div>
                                    {/if}
                                </div>
                            {/each}
                        </div>
                    {/if}
                </div>
            {/if}
            
            <!-- Folgetermine -->
            {#if futureAppointments.length > 0}
                <div>
                    <div class="flex items-center justify-between mb-3">
                        <h3 class="text-sm font-bold text-neutral-900 flex items-center gap-2"><span>📅</span> Folgetermine</h3>
                        <label class="flex items-center gap-2 text-sm font-semibold text-neutral-700 cursor-pointer">
                            <input type="checkbox" bind:checked={includeFutureApps} class="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500" disabled={isEmailSending || !!emailSuccessMsg} />
                            Anhängen
                        </label>
                    </div>
                    
                    {#if includeFutureApps}
                        <div class="space-y-2 max-h-60 overflow-y-auto custom-scrollbar p-1 pr-2">
                            {#each futureAppointments as app}
                                <label class="flex items-start gap-3 p-3 bg-white rounded-xl border border-neutral-200 cursor-pointer hover:border-indigo-300 transition-colors shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/20">
                                    <input type="checkbox" checked={selectedFutureAppIds.includes(app.id)} onchange={() => {
                                        if(selectedFutureAppIds.includes(app.id)) selectedFutureAppIds = selectedFutureAppIds.filter(id => id !== app.id);
                                        else selectedFutureAppIds = [...selectedFutureAppIds, app.id];
                                    }} class="w-5 h-5 mt-0.5 text-indigo-600 rounded focus:ring-indigo-500" disabled={isEmailSending || !!emailSuccessMsg} />
                                    <div class="min-w-0 flex-1">
                                        <p class="text-sm font-bold text-neutral-900">{new Date(app.appointment).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })} um {new Date(app.appointment).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr</p>
                                        <p class="text-xs text-neutral-500 truncate">{app.description || 'Termin'}</p>
                                    </div>
                                </label>
                            {/each}
                        </div>
                    {/if}
                </div>
            {/if}
        </div>

        <div class="flex flex-wrap gap-2 pt-4 mt-2 border-t border-neutral-100">
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
