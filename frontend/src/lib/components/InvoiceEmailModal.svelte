<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    import { sendEmail } from "$lib/services/emailService";
    import { toastStore } from "$lib/services/toastService.svelte";

    // svelte-ignore non_reactive_update
    let dialog: HTMLDialogElement;
    let invoice = $state<any>(null);
    
    let emailTo = $state("");
    let cc = $state("");
    let bcc = $state("");
    let showCcBcc = $state(false);
    let emailSubject = $state("");
    let emailText = $state("");
    let isEmailSending = $state(false);
    let successMsg = $state("");
    let errorMsg = $state("");

    let linkedAppointments = $state<any[]>([]);
    let includeReports = $state(true);
    
    let availableContacts = $state<any[]>([]);
    let currentSalutations = $state<string[]>([]);

    export function open(inv: any) {
        invoice = inv;
        
        // Empfänger ermitteln (Aus dem Client-Objekt, falls vorhanden)
        const client = Array.isArray(invoice?.expand?.client) ? invoice.expand.client[0] : invoice?.expand?.client;
        emailTo = client?.email || "";
        
        const clientSalutation = client?.salutation === 'Herr' ? `Sehr geehrter Herr ${client.name_last}` : (client?.salutation === 'Frau' ? `Sehr geehrte Frau ${client.name_last}` : `Guten Tag ${client?.name_first || ''} ${client?.name_last || ''}`.trim());
        currentSalutations = client?.email ? [clientSalutation] : [];
        
        emailSubject = `Ihre Dokumente (Ref: ${invoice?.invoice_nr || 'Neu'})`;
        const defaultBody = `\n\nanbei erhalten Sie Ihre Rechnung sowie ggf. zugehörige Arbeitszeitnachweise als PDF-Dokument.\n\nIhre Rechnungen und Dokumente können Sie ab sofort auch jederzeit sicher in unserem neuen Klienten-Portal einsehen:\n👉 https://www.ihre-seniorenassistenz.com/portal \n\nMit freundlichen Grüßen\nIhre Seniorenassistenz`;
        emailText = `${currentSalutations.length > 0 ? currentSalutations.join(',\n') + ',' : 'Guten Tag,'}${defaultBody}`;
        
        successMsg = "";
        errorMsg = "";
        cc = "";
        bcc = "";
        showCcBcc = false;
        
        // Termine und Berichte laden
        linkedAppointments = [];
        includeReports = true;
        availableContacts = [];
        
        const appIds = Array.isArray(invoice?.appointments) ? invoice.appointments : (invoice?.appointments ? [invoice.appointments] : []);
        
        if (appIds.length > 0) {
            const filterStr = appIds.map((id:string) => `id='${id}'`).join(' || ');
            pb.collection('appointments').getFullList({ filter: filterStr, sort: 'appointment', requestKey: null }).then(res => {
                linkedAppointments = res.map((a: any) => ({
                    id: a.id, date: a.appointment, description: a.description, report: a.report || ''
                }));
            }).catch(e => console.error("Konnte Termine nicht laden", e));
        }
        
        // Kontakte und Pflegeheime aus der Akte laden
        if (client?.id) {
            pb.collection('clients').getOne(client.id, { expand: 'contacts,retirement_homes', requestKey: null }).then(fullClient => {
                let list: any[] = [];
                if (fullClient.expand?.contacts) {
                    fullClient.expand.contacts.forEach((c:any) => {
                        if (c.email) {
                            let sal = c.salutation === 'Herr' ? `Sehr geehrter Herr ${c.name_last}` : (c.salutation === 'Frau' ? `Sehr geehrte Frau ${c.name_last}` : `Guten Tag ${c.name_first} ${c.name_last}`);
                            list.push({ name: `${c.name_first} ${c.name_last} (${c.company_name || 'Kontakt'})`, email: c.email, salutation: sal });
                        }
                    });
                }
                if (fullClient.expand?.retirement_homes) {
                    fullClient.expand.retirement_homes.forEach((h:any) => {
                        if (h.email) list.push({ name: `${h.name} (Pflegeheim)`, email: h.email, salutation: `Sehr geehrte Damen und Herren vom ${h.name}` });
                    });
                }
                availableContacts = list;
            }).catch(()=>{});
        }
        
        dialog?.showModal();
    }

    function addRecipient(val: string) {
        if (!val) return;
        const [email, salutation] = val.split('|');
        const currentEmails = emailTo.split(',').map(e => e.trim()).filter(Boolean);
        
        if (!currentEmails.includes(email)) {
            emailTo = emailTo ? `${emailTo}, ${email}` : email;
            if (salutation && !currentSalutations.includes(salutation)) {
                currentSalutations.push(salutation);
                const parts = emailText.split('\n\n');
                if (parts.length > 1) {
                    parts[0] = currentSalutations.join(',\n') + ',';
                    emailText = parts.join('\n\n');
                } else {
                    emailText = `${currentSalutations.join(',\n')},\n\n${emailText}`;
                }
            }
        }
    }

    export function close() {
        dialog?.close();
        invoice = null;
    }

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

    async function sendInvoiceEmail() {
        if (!invoice || !invoice.pdf || invoice.pdf.length === 0) {
            errorMsg = "Keine PDF-Datei an dieser Rechnung gefunden.";
            return;
        }

        isEmailSending = true;
        errorMsg = "";
        successMsg = "";

        try {
            const attachments = [];
            
            // Lade alle angehängten PDFs der Rechnung herunter und wandle sie um
            for (const pdfFilename of invoice.pdf) {
                const fileUrl = pb.files.getURL(invoice, pdfFilename);
                const response = await fetch(fileUrl);
                const blob = await response.blob();
                const base64 = await blobToBase64(blob);
                attachments.push({
                    filename: pdfFilename,
                    content: base64,
                    encoding: 'base64'
                });
            }

            const user = pb.authStore.model;
            const userName = user ? `${user.name_first || ''} ${user.name_last || ''}`.trim() : 'Ihre Seniorenassistenz';
            const userEmail = user?.email || 'info@ihre-seniorenassistenz.com';
            const userPhone = user?.handy || user?.tel || '0151 57515432';

            // HTML & Text für die Besuchsberichte generieren
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

            successMsg = "E-Mail wurde erfolgreich mit Anhang versendet!";
            setTimeout(() => {
                close();
            }, 2500);
        } catch (err: any) {
            console.error(err);
            errorMsg = "Fehler beim Senden der E-Mail: " + err.message;
        } finally {
            isEmailSending = false;
        }
    }
</script>

<dialog bind:this={dialog} class="p-0 bg-transparent backdrop:bg-black/50 backdrop:backdrop-blur-sm w-full max-w-lg mx-auto my-auto rounded-3xl" onclick={(e) => { if (e.target === dialog) close(); }}>
    <div class="bg-white rounded-3xl p-6 md:p-8 w-full relative shadow-2xl">
        <button aria-label="Schließen" title="Schließen" onclick={close} class="absolute top-5 right-5 w-10 h-10 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-full flex items-center justify-center transition-colors">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        
        <h2 class="text-2xl font-bold text-neutral-900 mb-6 flex items-center gap-2"><span>✉️</span> Dokumente versenden</h2>

        {#if successMsg}
            <div class="bg-emerald-50 text-emerald-600 p-4 rounded-xl mb-6 text-sm font-medium border border-emerald-100 flex items-center gap-2 animate-enter">
                <span class="text-xl">✅</span> {successMsg}
            </div>
        {/if}
        {#if errorMsg}
            <div class="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm font-medium border border-red-100 animate-enter">
                {errorMsg}
            </div>
        {/if}

        <form onsubmit={(e) => { e.preventDefault(); sendInvoiceEmail(); }} class="space-y-4">
            <div>
                <div class="flex items-center justify-between mb-1.5">
                    <label for="email-to" class="block text-sm font-semibold text-neutral-700">Empfänger (An)</label>
                    <button type="button" onclick={() => showCcBcc = !showCcBcc} class="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors">{showCcBcc ? '− CC / BCC ausblenden' : '+ CC / BCC hinzufügen'}</button>
                </div>
                <div class="flex flex-col sm:flex-row gap-2">
                    <input id="email-to" type="text" bind:value={emailTo} class="orga-input-clear w-full flex-1 py-2 text-sm" placeholder="mail@beispiel.de, zweite@mail.de" required disabled={isEmailSending || !!successMsg} />
                    {#if availableContacts.length > 0}
                    <select class="orga-input-clear flex-1 sm:flex-none sm:w-auto bg-neutral-50 cursor-pointer sm:max-w-48 text-sm font-medium py-2" onchange={(e) => { addRecipient(e.currentTarget.value); e.currentTarget.value = ""; }} disabled={isEmailSending || !!successMsg}>
                        <option value="">+ Aus Akte wählen</option>
                        {#each availableContacts as c}
                            <option value="{c.email}|{c.salutation}">{c.name}</option>
                        {/each}
                    </select>
                    {/if}
                </div>
            </div>
            {#if showCcBcc}
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 animate-enter">
                    <div>
                        <label for="email-cc" class="block text-sm font-bold text-neutral-700 mb-1.5">CC (Kopie)</label>
                        <input id="email-cc" type="text" bind:value={cc} placeholder="kollege@beispiel.de" class="orga-input-clear w-full py-2 text-sm" disabled={isEmailSending || !!successMsg} />
                    </div>
                    <div>
                        <label for="email-bcc" class="block text-sm font-bold text-neutral-700 mb-1.5">BCC (Blindkopie)</label>
                        <input id="email-bcc" type="text" bind:value={bcc} placeholder="privat@beispiel.de" class="orga-input-clear w-full py-2 text-sm" disabled={isEmailSending || !!successMsg} />
                    </div>
                </div>
            {/if}
            <div>
                <label for="email-subject" class="block text-sm font-semibold text-neutral-700 mb-1.5">Betreff</label>
                <input id="email-subject" type="text" bind:value={emailSubject} class="orga-input-clear py-2 text-sm" required disabled={isEmailSending || !!successMsg} />
            </div>
            <div>
                <label for="email-text" class="block text-sm font-semibold text-neutral-700 mb-1.5">Nachricht</label>
                <textarea id="email-text" bind:value={emailText} rows="5" class="orga-input-clear py-2 text-sm resize-none" required disabled={isEmailSending || !!successMsg}></textarea>
            </div>
            
            {#if linkedAppointments.length > 0}
                <div class="pt-4 mt-2 border-t border-neutral-100">
                    <div class="flex items-center justify-between mb-3">
                        <h3 class="text-sm font-bold text-neutral-900 flex items-center gap-2"><span>📝</span> Besuchsberichte</h3>
                        <label class="flex items-center gap-2 text-sm font-semibold text-neutral-700 cursor-pointer">
                            <input type="checkbox" bind:checked={includeReports} class="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500" disabled={isEmailSending || !!successMsg} />
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
                                    <textarea bind:value={app.report} rows="3" class="orga-input-clear text-sm resize-y custom-scrollbar w-full border-neutral-200 focus:border-indigo-300 bg-neutral-50 focus:bg-white transition-colors" placeholder="Kein Bericht vorhanden. Hier tippen, um einen hinzuzufügen..." disabled={isEmailSending || !!successMsg}></textarea>
                                    {#if app.report}
                                        <div class="flex justify-end mt-1">
                                            <button type="button" onclick={() => saveReportToDb(app.id, app.report)} class="text-[10px] flex items-center gap-1 uppercase tracking-wider text-indigo-600 hover:text-indigo-800 font-bold transition-colors" disabled={isEmailSending || !!successMsg}><svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg> In Datenbank sichern</button>
                                        </div>
                                    {/if}
                                </div>
                            {/each}
                        </div>
                    {/if}
                </div>
            {/if}
            
                {#if invoice?.pdf && invoice.pdf.length > 0}
            <div class="flex flex-wrap gap-2 pt-2 mt-2 border-t border-neutral-100">
                {#each invoice.pdf as pdfFile}
                    <div class="flex items-center gap-2 bg-neutral-100 text-neutral-700 px-3 py-1.5 rounded-lg text-sm border border-neutral-200 shadow-sm animate-enter">
                        <span class="truncate max-w-50 font-medium">📎 {pdfFile}</span>
                    </div>
                {/each}
            </div>
                {:else}
            <div class="pt-2 mt-2 border-t border-neutral-100">
                <span class="text-sm text-neutral-500 italic">Keine PDF an dieser Rechnung gefunden.</span>
            </div>
                {/if}

            <div class="pt-4 flex flex-col-reverse sm:flex-row justify-end gap-3 border-t border-neutral-100 mt-6">
                <button type="button" onclick={close} class="orga-button-ghost w-full sm:w-auto py-3 sm:py-2.5" disabled={isEmailSending}>Abbrechen</button>
                <button type="submit" class="orga-button-primary shadow-indigo-600/20 w-full sm:w-auto py-3 sm:py-2.5" disabled={isEmailSending || !!successMsg || !invoice?.pdf?.length}>
                    {isEmailSending ? 'Wird gesendet...' : 'E-Mail senden ✉️'}
                </button>
            </div>
        </form>
    </div>
</dialog>