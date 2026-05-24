<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    import { sendEmail } from "$lib/services/emailService";
    import { toastStore } from "$lib/services/toastService.svelte";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";

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
    let showContactDropdown = $state(false);
    let selectedContactRefs = $state<any[]>([]);

    let selectedPdfFiles = $state<string[]>([]);
    let futureAppointments = $state<any[]>([]);
    let selectedFutureAppIds = $state<string[]>([]);
    let includeFutureApps = $state(false);

    function buildAvailableContacts() {
        let list: any[] = [];
        const add = (name: string, email: string, phone: string, salutation: string, isClient: boolean = false) => {
            if (email || phone) list.push({ name, email, phone, salutation, isClient });
        };
        orgaStore.clients?.data?.forEach((c: any) => {
            let sal = c.salutation === 'Herr' ? `Sehr geehrter Herr ${c.name_last}` : (c.salutation === 'Frau' ? `Sehr geehrte Frau ${c.name_last}` : `Guten Tag ${c.name_first} ${c.name_last}`);
            add(`${c.name_first} ${c.name_last} (Klient)`, c.email, c.phone || c.handy, sal + ',', true);
        });
        orgaStore.contacts?.data?.forEach((c: any) => {
            let sal = c.salutation === 'Herr' ? `Sehr geehrter Herr ${c.name_last}` : (c.salutation === 'Frau' ? `Sehr geehrte Frau ${c.name_last}` : `Guten Tag ${c.name_first} ${c.name_last}`);
            add(`${c.name_first} ${c.name_last} (${c.company_name || 'Kontakt'})`, c.email, c.phone, sal + ',', false);
        });
        orgaStore.retirement_homes?.data?.forEach((h: any) => {
            add(`${h.name} (Pflegeheim)`, h.email, h.phone, `Sehr geehrte Damen und Herren vom ${h.name},`, false);
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
        updateMessage();
    }

    function updateMessage() {
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

        const isClientOnly = selectedContactRefs.every(c => c.isClient);
        const clientObj = Array.isArray(invoice?.expand?.client) ? invoice.expand.client[0] : invoice?.expand?.client;
        const clientName = clientObj ? `${clientObj.name_first} ${clientObj.name_last}`.trim() : '';
        
        const bodyText = isClientOnly 
            ? `anbei erhalten Sie Ihre Rechnung sowie ggf. zugehörige Arbeitszeitnachweise als PDF-Dokument.\n\nIhre Rechnungen und Dokumente können Sie ab sofort auch jederzeit sicher in unserem neuen Klienten-Portal einsehen:\n👉 https://www.ihre-seniorenassistenz.com/portal \n\nMit freundlichen Grüßen\nIhre Seniorenassistenz`
            : `anbei erhalten Sie die Rechnung sowie ggf. zugehörige Arbeitszeitnachweise für ${clientName} als PDF-Dokument.\n\nDie Rechnungen und Dokumente können ab sofort auch jederzeit sicher im neuen Klienten-Portal eingesehen werden:\n👉 https://www.ihre-seniorenassistenz.com/portal \n\nMit freundlichen Grüßen\nIhre Seniorenassistenz`;
            
        emailText = `${newSalutation}\n\n${bodyText}`;
    }

    export function open(inv: any) {
        invoice = inv;
        
        // Empfänger ermitteln (Aus dem Client-Objekt, falls vorhanden)
        const client = Array.isArray(invoice?.expand?.client) ? invoice.expand.client[0] : invoice?.expand?.client;
        emailTo = client?.email || "";
        
        successMsg = "";
        errorMsg = "";
        cc = "";
        bcc = "";
        showCcBcc = false;
        showContactDropdown = false;

        if (inv?.pdf) {
            selectedPdfFiles = Array.isArray(inv.pdf) ? [...inv.pdf] : [inv.pdf];
        } else {
            selectedPdfFiles = [];
        }
        
        availableContacts = buildAvailableContacts();
        selectedContactRefs = [];
        if (emailTo) {
            const matched = availableContacts.find(c => c.email === emailTo);
            if (matched) selectedContactRefs = [matched];
        }
        
        emailSubject = `Ihre Dokumente (Ref: ${invoice?.invoice_nr || 'Neu'})`;
        
        let initialSalutation = "Guten Tag,";
        if (selectedContactRefs.length > 0) {
            initialSalutation = selectedContactRefs[0].salutation;
        } else if (client) {
            initialSalutation = client.salutation === 'Herr' ? `Sehr geehrter Herr ${client.name_last},` : (client.salutation === 'Frau' ? `Sehr geehrte Frau ${client.name_last},` : `Guten Tag ${client.name_first} ${client.name_last},`);
        }
        
        const defaultBody = `anbei erhalten Sie Ihre Rechnung sowie ggf. zugehörige Arbeitszeitnachweise als PDF-Dokument.\n\nIhre Rechnungen und Dokumente können Sie ab sofort auch jederzeit sicher in unserem neuen Klienten-Portal einsehen:\n👉 https://www.ihre-seniorenassistenz.com/portal \n\nMit freundlichen Grüßen\nIhre Seniorenassistenz`;
        emailText = `${initialSalutation}\n\n${defaultBody}`;
        
        if (selectedContactRefs.length > 0) {
            updateMessage();
        }

        // Termine und Berichte laden
        linkedAppointments = [];
        includeReports = true;
        
        const appIds = Array.isArray(invoice?.appointments) ? invoice.appointments : (invoice?.appointments ? [invoice.appointments] : []);
        
        if (appIds.length > 0) {
            const filterStr = appIds.map((id:string) => `id='${id}'`).join(' || ');
            pb.collection('appointments').getFullList({ filter: filterStr, sort: 'appointment', requestKey: null }).then(res => {
                linkedAppointments = res.map((a: any) => ({
                    id: a.id, date: a.appointment, description: a.description, report: a.report || ''
                }));
            }).catch(e => console.error("Konnte Termine nicht laden", e));
        }
        
        if (client?.id) {
            // Future appointments
            const now = new Date();
            now.setHours(0,0,0,0);
            const yyyy = now.getFullYear();
            const mm = String(now.getMonth() + 1).padStart(2, '0');
            const dd = String(now.getDate()).padStart(2, '0');
            const nowStr = `${yyyy}-${mm}-${dd} 00:00:00`;
            
            pb.collection('appointments').getFullList({
                filter: `client ~ '${client.id}' && appointment >= '${nowStr}'`,
                sort: 'appointment',
                requestKey: null
            }).then(res => {
                futureAppointments = res;
                selectedFutureAppIds = res.map((a:any) => a.id);
            }).catch(()=>{});
        }
        
        dialog?.showModal();
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
        if (selectedPdfFiles.length === 0) {
            errorMsg = "Bitte wählen Sie mindestens ein Dokument zum Senden aus.";
            return;
        }

        isEmailSending = true;
        errorMsg = "";
        successMsg = "";
        try {
            const attachments = [];
            
            // Lade alle angehängten PDFs der Rechnung herunter und wandle sie um
            for (const pdfFilename of selectedPdfFiles) {
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

            let compName = 'Ihre Seniorenassistenz';
            let compStreet = 'Dreyhauptstraße 2';
            let compCity = '06108 Halle (Saale)';
            let compWeb = 'www.ihre-seniorenassistenz.com';
            let compLogo = '';
            let companyId: string | null = null;
            if (user && user.company) {
                companyId = Array.isArray(user.company) ? user.company[0] : user.company;
                const comp = orgaStore.company?.data?.find((c: any) => c.id === companyId);
                if (comp) {
                    compName = comp.name || compName;
                    compStreet = `${comp.street || ''} ${comp.housenr || ''}`.trim() || compStreet;
                    compCity = `${comp.zip || ''} ${comp.city || ''}`.trim() || compCity;
                    compWeb = comp.website || compWeb;
                    if (comp.logo) {
                        const logoFilename = Array.isArray(comp.logo) ? comp.logo[0] : comp.logo;
                        const rawUrl = pb.files.getURL(comp, logoFilename);
                        try {
                            const parsedUrl = new URL(rawUrl, 'https://ihre-seniorenassistenz.com');
                            if (parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1') { parsedUrl.protocol = 'https:'; parsedUrl.hostname = 'ihre-seniorenassistenz.com'; parsedUrl.port = ''; }
                            compLogo = parsedUrl.toString();
                        } catch (e) {
                            compLogo = rawUrl;
                        }
                    }
                }
            }

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

            const textEmail = `${emailText.trim()}${reportsText}${futureAppsText}\n\n--\n${userName}\n${compName}\n${compStreet}, ${compCity}\nTelefon: ${userPhone}\nE-Mail: ${userEmail}\nWeb: ${compWeb}`;

            const htmlEmail = `
                <div style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; color: #374151; max-width: 650px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);">
                    <div style="background-color: #fdf8f6; padding: 30px; border-bottom: 3px solid #c66a4d;">
                        <table width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                                <td valign="middle">
                                    <h1 style="color: #954028; margin: 0; font-size: 24px; letter-spacing: -0.5px; font-weight: 800;">${compName}</h1>
                                    <p style="color: #c66a4d; margin: 4px 0 0 0; font-size: 14px; font-weight: 600;">Alltagshilfe • Betreuung • Organisation</p>
                                </td>
                                ${compLogo ? `<td valign="middle" align="right" style="width: 100px;"><img src="${compLogo}" alt="Logo" width="100" style="max-height: 60px; max-width: 100px; object-fit: contain; border-radius: 6px;" /></td>` : ''}
                            </tr>
                        </table>
                    </div>
                    <div style="padding: 35px 30px; font-size: 15px; line-height: 1.7; color: #1f2937; background-color: #ffffff;">
                        ${emailText.trim().replace(/\n/g, '<br>').replace(/(?:<br>|\s)*(?:👉\s*)?(?:&lt;|<)?\s*https?:\/\/(?:www\.)?ihre-seniorenassistenz\.com\/portal\/?\s*(?:&gt;|>)?/gi, '<br><table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 15px 0;"><tr><td align="center" bgcolor="#c66a4d" style="border-radius: 8px;"><a href="https://www.ihre-seniorenassistenz.com/portal" style="display: inline-block; padding: 12px 24px; color: #ffffff; text-decoration: none; font-weight: bold; font-family: Arial, sans-serif; font-size: 15px;">Zum Klienten-Portal</a></td></tr></table><br>')}
                        
                        ${reportsHtml}
                        ${futureAppsHtml}
                    </div>
                    <div style="background-color: #f8fafc; padding: 30px; border-top: 1px solid #e5e7eb;">
                        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size: 14px; color: #4b5563;">
                            <tr>
                                <td valign="top" style="padding-bottom: 20px;">
                                    <strong style="color: #111827; font-size: 16px;">${userName}</strong><br>
                                    <span style="color: #c66a4d; font-weight: 600; font-size: 13px;">Ihre Ansprechperson</span>
                                </td>
                            </tr>
                            <tr>
                                <td valign="top">
                                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size: 13px; color: #4b5563; line-height: 1.6;">
                                        <tr>
                                            <td width="50%" valign="top" style="padding-right: 15px; border-right: 1px solid #e5e7eb;">
                                                <strong style="color: #374151; font-size: 14px;">${compName}</strong><br>
                                                ${compStreet}<br>
                                                ${compCity}
                                            </td>
                                            <td width="50%" valign="top" style="padding-left: 20px;">
                                                <div style="margin-bottom: 4px;">📞 <a href="tel:${userPhone}" style="color: #c66a4d; text-decoration: none; font-weight: 500;">${userPhone}</a></div>
                                                <div style="margin-bottom: 4px;">✉️ <a href="mailto:${userEmail}" style="color: #c66a4d; text-decoration: none; font-weight: 500;">${userEmail}</a></div>
                                                <div>🌐 <a href="${compWeb.startsWith('http') ? compWeb : 'https://' + compWeb}" style="color: #c66a4d; text-decoration: none; font-weight: 500;">${compWeb.replace(/^https?:\/\//, '')}</a></div>
                                            </td>
                                        </tr>
                                    </table>
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

        try {
            if (invoice?.id) {
                let newStatus: any = 'Eingereicht';
                try {
                    await pb.collection('invoices').update(invoice.id, { status: newStatus }, { requestKey: null });
                } catch (fallbackErr) {
                    // Fallback, falls 'Eingereicht' in der Datenbank als Status nicht existiert
                    newStatus = 'Offen' as any;
                    await pb.collection('invoices').update(invoice.id, { status: newStatus }, { requestKey: null });
                }
                if (orgaStore.invoices) {
                    const idx = orgaStore.invoices.data.findIndex((i: any) => i.id === invoice.id);
                    if (idx !== -1) {
                        orgaStore.invoices.data[idx] = { ...orgaStore.invoices.data[idx], status: newStatus };
                    }
                }
            }
        } catch (e) { console.warn("Status der Rechnung konnte nicht aktualisiert werden", e); }

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

<dialog bind:this={dialog} class="p-0 bg-transparent backdrop:bg-black/50 backdrop:backdrop-blur-sm w-full max-w-4xl mx-auto my-auto rounded-3xl" onclick={(e) => { if (e.target === dialog) close(); }}>
    <div class="bg-neutral-50 sm:rounded-3xl w-full h-dvh sm:h-auto sm:max-h-[90dvh] relative shadow-2xl flex flex-col overflow-hidden">
        <div class="bg-white px-5 sm:px-8 py-5 border-b border-neutral-200 shrink-0 flex items-center justify-between sticky top-0 z-20 shadow-sm">
            <h2 class="text-xl sm:text-2xl font-bold text-neutral-900 flex items-center gap-3"><span class="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-inner text-lg">✉️</span> Dokumente versenden</h2>
            <button aria-label="Schließen" title="Schließen" onclick={close} class="w-10 h-10 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-full flex items-center justify-center transition-colors active:scale-95">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        </div>

        <div class="p-5 sm:p-8 overflow-y-auto custom-scrollbar flex-1 bg-white">
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

        <form onsubmit={(e) => { e.preventDefault(); sendInvoiceEmail(); }} class="space-y-5">
            <div>
                <div class="flex items-center justify-between mb-1.5">
                    <label for="email-to" class="block text-sm font-semibold text-neutral-700">Empfänger (An)</label>
                    <button type="button" onclick={() => showCcBcc = !showCcBcc} class="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors">{showCcBcc ? '− CC / BCC ausblenden' : '+ CC / BCC hinzufügen'}</button>
                </div>
                <div class="flex flex-col sm:flex-row gap-2">
                    <input id="email-to" type="text" bind:value={emailTo} class="orga-input-clear w-full flex-1 py-3 sm:py-2.5 text-sm" placeholder="mail@beispiel.de, zweite@mail.de" required disabled={isEmailSending || !!successMsg} />
                    
                    <div class="relative flex-1 sm:flex-none sm:w-auto">
                        <button type="button" onclick={() => showContactDropdown = !showContactDropdown} class="orga-input-clear w-full bg-white border-neutral-200 shadow-sm cursor-pointer text-sm font-medium py-3 sm:py-2.5 flex justify-between items-center" disabled={isEmailSending || !!successMsg}>
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
                    <div>
                        <label for="email-cc" class="block text-sm font-bold text-neutral-700 mb-1.5">CC (Kopie)</label>
                        <input id="email-cc" type="text" bind:value={cc} placeholder="kollege@beispiel.de" class="orga-input-clear w-full py-3 sm:py-2.5 text-sm" disabled={isEmailSending || !!successMsg} />
                    </div>
                    <div>
                        <label for="email-bcc" class="block text-sm font-bold text-neutral-700 mb-1.5">BCC (Blindkopie)</label>
                        <input id="email-bcc" type="text" bind:value={bcc} placeholder="privat@beispiel.de" class="orga-input-clear w-full py-3 sm:py-2.5 text-sm" disabled={isEmailSending || !!successMsg} />
                    </div>
                </div>
            {/if}
            
            <div>
                <label for="email-subject" class="block text-sm font-semibold text-neutral-700 mb-1.5">Betreff</label>
                <input id="email-subject" type="text" bind:value={emailSubject} class="orga-input-clear py-3 sm:py-2.5 text-sm" required disabled={isEmailSending || !!successMsg} />
            </div>
            <div>
                <label for="email-text" class="block text-sm font-semibold text-neutral-700 mb-1.5">Nachricht</label>
                <textarea id="email-text" bind:value={emailText} rows="6" class="orga-input-clear py-3 sm:py-2.5 text-sm resize-y custom-scrollbar" required disabled={isEmailSending || !!successMsg}></textarea>
            </div>
            
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4 mt-2 border-t border-neutral-100">
                <!-- Besuchsberichte -->
                {#if linkedAppointments.length > 0}
                    <div>
                        <div class="flex items-center justify-between mb-3">
                            <h3 class="text-sm font-bold text-neutral-900 flex items-center gap-2"><span>📝</span> Besuchsberichte</h3>
                            <label class="flex items-center gap-2 text-sm font-semibold text-neutral-700 cursor-pointer">
                                <input type="checkbox" bind:checked={includeReports} class="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500" disabled={isEmailSending || !!successMsg} />
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
                                        <textarea bind:value={app.report} rows="3" class="orga-input-clear text-sm resize-y custom-scrollbar w-full border-neutral-200 bg-neutral-50 focus:bg-white transition-colors" placeholder="Kein Bericht vorhanden. Hier tippen, um einen hinzuzufügen..." disabled={isEmailSending || !!successMsg}></textarea>
                                        {#if app.report}
                                            <div class="flex justify-end mt-1">
                                                <button type="button" onclick={() => saveReportToDb(app.id, app.report)} class="text-[10px] flex items-center gap-1 uppercase tracking-wider text-indigo-600 hover:text-indigo-800 font-bold transition-colors" disabled={isEmailSending || !!successMsg}><svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg> Sichern</button>
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
                                <input type="checkbox" bind:checked={includeFutureApps} class="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500" disabled={isEmailSending || !!successMsg} />
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
                                        }} class="w-5 h-5 mt-0.5 text-indigo-600 rounded focus:ring-indigo-500" disabled={isEmailSending || !!successMsg} />
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
            
            <!-- PDFs anhängen -->
            <div class="pt-4 mt-4 border-t border-neutral-100">
                <h3 class="text-sm font-bold text-neutral-900 flex items-center gap-2 mb-3"><span>📎</span> Dokumente zum Senden auswählen</h3>
                <div class="space-y-2">
                    {#if invoice?.pdf && invoice.pdf.length > 0}
                        {#each invoice.pdf as pdfFile}
                            <label class="flex items-center gap-3 p-3 bg-white rounded-xl border border-neutral-200 cursor-pointer hover:border-indigo-300 transition-colors shadow-sm">
                                <input type="checkbox" checked={selectedPdfFiles.includes(pdfFile)} onchange={() => {
                                    if (selectedPdfFiles.includes(pdfFile)) selectedPdfFiles = selectedPdfFiles.filter(f => f !== pdfFile);
                                    else selectedPdfFiles = [...selectedPdfFiles, pdfFile];
                                }} class="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500" disabled={isEmailSending || !!successMsg} />
                                <span class="text-sm font-medium text-neutral-800">{pdfFile}</span>
                            </label>
                        {/each}
                    {:else}
                        <p class="text-sm text-neutral-500 italic">Keine PDF an dieser Rechnung gefunden.</p>
                    {/if}
                </div>
            </div>

            <div class="pt-4 flex flex-col-reverse sm:flex-row justify-end gap-3 border-t border-neutral-100 mt-6">
                <button type="button" onclick={close} class="orga-button-ghost w-full sm:w-auto py-3 sm:py-2.5" disabled={isEmailSending}>Abbrechen</button>
                <button type="submit" class="orga-button-primary shadow-indigo-600/20 w-full sm:w-auto py-3 sm:py-2.5" disabled={isEmailSending || !!successMsg || selectedPdfFiles.length === 0}>
                    {isEmailSending ? 'Wird gesendet...' : 'E-Mail senden ✉️'}
                </button>
            </div>
        </form>
        </div>
    </div>
</dialog>