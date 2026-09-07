<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    import { sendEmail } from "$lib/services/emailService";
    import { googleCalendarService, type GoogleCalendarStatus } from "$lib/services/googleCalendarService";
    import { toastStore } from "$lib/services/toastService.svelte";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import { buildPrioritizedContacts } from "$lib/services/contactPickerService";
    import { resolveCompanyData, resolveUserData, buildEmailHeader, buildEmailFooter, buildTextSignature, getPortalButtonRegex, getPortalButtonHtml } from "$lib/services/emailCompanyService";

    // svelte-ignore non_reactive_update
    let dialog: HTMLDialogElement;
    let googleStatus = $state<GoogleCalendarStatus | null>(null);
    let invoices = $state<any[]>([]);
    let invoice = $derived(invoices[0] || null);
    
    let emailTo = $state("");
    let cc = $state("");
    let bcc = $state("");
    let showCcBcc = $state(false);
    let emailSubject = $state("");
    let emailText = $state("");
    let isEmailSending = $state(false);
    let successMsg = $state("");
    let errorMsg = $state("");
    
    let isMahnungMode = $state(false);
    let mahnungLevel = $state(1);

    let linkedAppointments = $state<any[]>([]);
    let includeReports = $state(true);
    
    let availableContacts = $state<any[]>([]);
    let showContactDropdown = $state(false);
    let selectedContactRefs = $state<any[]>([]);

    let availablePdfs = $state<{record: any, filename: string}[]>([]);
    let selectedPdfFiles = $state<{record: any, filename: string}[]>([]);
    let futureAppointments = $state<any[]>([]);
    let selectedFutureAppIds = $state<string[]>([]);
    let includeFutureApps = $state(false);

    function buildAvailableContacts(targetClients?: any[]) {
        return buildPrioritizedContacts(targetClients);
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
        let newSalutation = "";
        let isClientOnly = false;

        if (selectedContactRefs.length > 0) {
            if (selectedContactRefs.length === 1) {
                newSalutation = selectedContactRefs[0].salutation;
            } else if (selectedContactRefs.length === 2) {
                const first = selectedContactRefs[0].salutation.replace(',', '');
                const second = selectedContactRefs[1].salutation.replace(',', '');
                newSalutation = `${first},\n${second.charAt(0).toLowerCase() + second.slice(1)},`;
            } else {
                newSalutation = "Sehr geehrte Damen und Herren,";
            }
            isClientOnly = selectedContactRefs.every(c => c.isClient);
        } else {
            const clientObj = Array.isArray(invoice?.expand?.client) ? invoice.expand.client[0] : invoice?.expand?.client;
            const emailsCount = emailTo.split(',').map(e => e.trim()).filter(Boolean).length;
            if (emailsCount > 1) {
                newSalutation = "Sehr geehrte Damen und Herren,";
                isClientOnly = false;
            } else if (clientObj) {
                newSalutation = clientObj.salutation === 'Herr' ? `Sehr geehrter Herr ${clientObj.name_last},` : 
                                (clientObj.salutation === 'Frau' ? `Sehr geehrte Frau ${clientObj.name_last},` : 
                                `Guten Tag ${clientObj.name_first || ''} ${clientObj.name_last || ''},`.trim());
                isClientOnly = true;
            } else {
                newSalutation = "Sehr geehrte Damen und Herren,";
            }
        }

        const clientNamesSet = new Set<string>();
        for (const inv of invoices) {
            const cObj = Array.isArray(inv?.expand?.client) ? inv.expand.client[0] : inv?.expand?.client;
            if (cObj && cObj.name_first) {
                clientNamesSet.add(`${cObj.name_first} ${cObj.name_last}`.trim());
            }
        }
        const clientNames = Array.from(clientNamesSet);
        let clientsString = "";
        if (clientNames.length === 1) {
            clientsString = clientNames[0];
        } else if (clientNames.length > 1) {
            const last = clientNames.pop();
            clientsString = clientNames.join(", ") + " und " + last;
        }

        const isMultipleInvoices = invoices.length > 1;
        const isMultipleClients = clientNames.length > 1;
        
        let bodyText = "";
        if (isMahnungMode) {
            if (mahnungLevel === 1) {
                bodyText = `bei der Überprüfung unserer Zahlungseingänge haben wir festgestellt, dass die angehängte Rechnung noch nicht beglichen wurde.\n\nSicherlich haben Sie diese im Alltagsstress nur übersehen. Wir möchten Sie hiermit freundlich an die Zahlung erinnern und bitten Sie, den offenen Betrag in den nächsten Tagen zu überweisen.\n\nSollte sich unsere Nachricht mit Ihrer Zahlung überschnitten haben, betrachten Sie dieses Schreiben bitte als gegenstandslos.\n\nMit freundlichen Grüßen\nIhre Seniorenassistenz`;
            } else if (mahnungLevel === 2) {
                bodyText = `wir konnten leider noch immer keinen Zahlungseingang für die angehängte Rechnung feststellen.\n\nWir bitten Sie nachdrücklich, den noch offenen Rechnungsbetrag umgehend zu überweisen, um weitere Schritte zu vermeiden.\n\nSollte sich unsere Nachricht mit Ihrer Zahlung überschnitten haben, betrachten Sie dieses Schreiben bitte als gegenstandslos.\n\nMit freundlichen Grüßen\nIhre Seniorenassistenz`;
            } else {
                bodyText = `trotz unserer bisherigen Erinnerungen konnten wir keinen Zahlungseingang für die angehängte Rechnung feststellen.\n\nWir fordern Sie hiermit letztmalig auf, den offenen Betrag umgehend zu überweisen. Sollte die Zahlung nicht fristgerecht eingehen, sehen wir uns leider gezwungen, weitere rechtliche Schritte einzuleiten.\n\nMit freundlichen Grüßen\nIhre Seniorenassistenz`;
            }
        } else {
            if (isClientOnly) {
                bodyText = `anbei erhalten Sie ${isMultipleInvoices ? 'Ihre Rechnungen' : 'Ihre Rechnung'} sowie ggf. zugehörige Arbeitszeitnachweise als PDF-Dokument${isMultipleInvoices ? 'e' : ''}.\n\nIhre Rechnungen und Dokumente können Sie ab sofort auch jederzeit sicher in unserem neuen Klienten-Portal einsehen:\n👉 https://www.ihre-seniorenassistenz.com/portal \n\nMit freundlichen Grüßen\nIhre Seniorenassistenz`;
            } else {
                const clientPhrase = isMultipleClients ? `die Klienten ${clientsString}` : (clientsString || 'den Klienten');
                bodyText = `anbei erhalten Sie ${isMultipleInvoices ? 'die Rechnungen' : 'die Rechnung'} sowie ggf. zugehörige Arbeitszeitnachweise für ${clientPhrase} als PDF-Dokument${isMultipleInvoices ? 'e' : ''}.\n\nDie Rechnungen und Dokumente können ab sofort auch jederzeit sicher im neuen Klienten-Portal eingesehen werden:\n👉 https://www.ihre-seniorenassistenz.com/portal \n\nMit freundlichen Grüßen\nIhre Seniorenassistenz`;
            }
        }
            
        emailText = `${newSalutation}\n\n${bodyText}`;
    }

    export function open(invData: any | any[], fileField: string = 'pdf', isMahnung: boolean = false, mLevel: number = 1) {
        const invList = Array.isArray(invData) ? invData : [invData];
        invoices = invList;
        isMahnungMode = isMahnung;
        mahnungLevel = mLevel;
        
        // Empfänger ermitteln (Aus dem Client-Objekt, falls vorhanden)
        const client = Array.isArray(invoice?.expand?.client) ? invoice.expand.client[0] : invoice?.expand?.client;
        let emails = [];
        if (client?.expand?.caregiver?.email) emails.push(client.expand.caregiver.email);
        else if (client?.email) emails.push(client.email);
        if (client?.mailing_list && Array.isArray(client.mailing_list)) {
            emails = [...emails, ...client.mailing_list];
        }
        emailTo = [...new Set(emails)].filter(Boolean).join(", ");
        
        successMsg = "";
        errorMsg = "";
        cc = "";
        bcc = "";
        showCcBcc = false;
        showContactDropdown = false;
        googleCalendarService.getStatus().then(s => googleStatus = s).catch(() => {});

        availablePdfs = [];
        selectedPdfFiles = [];
        for (const inv of invList) {
            if (inv?.[fileField]) {
                const files = Array.isArray(inv[fileField]) ? inv[fileField] : [inv[fileField]];
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

        availableContacts = buildAvailableContacts(targetClients);
        selectedContactRefs = [];
        if (emailTo) {
            const matched = availableContacts.find(c => c.email === emailTo);
            if (matched) selectedContactRefs = [matched];
        }
        
        const defaultRef = invoices.map(i => i.invoice_nr).filter(Boolean).join(', ') || 'Neu';
        
        if (isMahnungMode) {
            const levelText = mahnungLevel === 1 ? 'Zahlungserinnerung' : (mahnungLevel === 2 ? '2. Mahnung' : 'Letzte Mahnung');
            emailSubject = invoices.length > 1 ? `${levelText} für Ihre Dokumente (Ref: ${defaultRef})` : `${levelText} zur Rechnung ${defaultRef}`;
        } else {
            emailSubject = invoices.length > 1 ? `Ihre Dokumente (Ref: ${defaultRef})` : `Ihre Dokumente: Rechnung ${defaultRef}`;
        }
        
        updateMessage();

        // Termine und Berichte laden
        linkedAppointments = [];
        includeReports = true;
        
        let allAppIds: string[] = [];
        for (const inv of invList) {
            const appIds = Array.isArray(inv?.appointments) ? inv.appointments : (inv?.appointments ? [inv.appointments] : []);
            allAppIds = [...allAppIds, ...appIds];
        }
        const appIds = [...new Set(allAppIds)];
        
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
        invoices = [];
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
            
            // Lade alle angehängten PDFs der Rechnungen herunter und wandle sie um
            for (const pdf of selectedPdfFiles) {
                let fileUrl = pb.files.getURL(pdf.record, pdf.filename);
                if (pb.authStore.token) fileUrl += (fileUrl.includes('?') ? '&' : '?') + 'token=' + pb.authStore.token;
                const response = await fetch(fileUrl);
                const blob = await response.blob();
                const base64 = await blobToBase64(blob);
                attachments.push({
                    filename: pdf.filename,
                    content: base64,
                    encoding: 'base64'
                });
            }

            const compData = resolveCompanyData(orgaStore);
            const { compName, compStreet, compCity, compWeb, compLogo } = compData;
            const senderEmail = googleStatus?.connected ? googleStatus.googleEmail : undefined;
            const userData = resolveUserData(undefined, undefined, senderEmail);
            const { userName, userEmail, userPhone } = userData;

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

            const textEmail = `${emailText.trim()}${reportsText}${futureAppsText}${buildTextSignature(userData, compData)}`;

            const htmlEmail = `
                <div style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; color: #374151; max-width: 650px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);">
                    ${buildEmailHeader(compData)}
                    <div style="padding: 35px 30px; font-size: 15px; line-height: 1.7; color: #1f2937; background-color: #ffffff;">
                        ${emailText.trim().replace(/\n/g, '<br>').replace(getPortalButtonRegex(), getPortalButtonHtml())}
                        
                        ${reportsHtml}
                        ${futureAppsHtml}
                    </div>
                    ${buildEmailFooter(userData, compData)}
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
            for (const inv of invoices) {
                if (inv?.id && inv.collectionName === 'invoices') {
                    let newStatus: any = 'Eingereicht';
                    try {
                        await pb.collection('invoices').update(inv.id, { status: newStatus }, { requestKey: null });
                    } catch (fallbackErr) {
                        // Fallback, falls 'Eingereicht' in der Datenbank als Status nicht existiert
                        newStatus = 'Offen' as any;
                        await pb.collection('invoices').update(inv.id, { status: newStatus }, { requestKey: null });
                    }
                    if (orgaStore.invoices) {
                        const idx = orgaStore.invoices.data.findIndex((i: any) => i.id === inv.id);
                        if (idx !== -1) {
                            orgaStore.invoices.data[idx] = { ...orgaStore.invoices.data[idx], status: newStatus };
                        }
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

<dialog bind:this={dialog} class="p-0 bg-transparent backdrop:bg-slate-950/65 backdrop:backdrop-blur-md w-full max-w-4xl m-0 sm:m-auto max-h-none sm:max-h-fit rounded-none sm:rounded-3xl" onclick={(e) => { if (e.target === dialog) close(); }}>
    <div class="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 sm:rounded-3xl w-full h-dvh sm:h-auto sm:max-h-[90dvh] relative shadow-2xl flex flex-col overflow-hidden border border-slate-200/80 dark:border-slate-800">
        <div class="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-5 sm:px-8 py-5 border-b border-slate-200/80 dark:border-slate-800 shrink-0 flex items-center justify-between sticky top-0 z-20 shadow-sm">
            <h2 class="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3"><span class="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-inner text-lg">✉️</span> Dokumente versenden</h2>
            <button aria-label="Schließen" title="Schließen" onclick={close} class="w-10 h-10 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full flex items-center justify-center transition-colors active:scale-95 cursor-pointer">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        </div>

        <div class="p-5 sm:p-8 overflow-y-auto custom-scrollbar flex-1 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">
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
            {#if googleStatus?.connected}
                <div class="flex items-center gap-2.5 p-3 rounded-xl bg-blue-50/80 border border-blue-200/90 text-xs text-blue-950 shadow-xs">
                    <span class="text-base shrink-0">✉️</span>
                    <div class="flex-1 min-w-0 leading-relaxed">
                        <span class="font-bold text-blue-900">Versand via Google Mail (OAuth2):</span>
                        <span class="text-blue-700 ml-1">E-Mail wird direkt über <strong>{googleStatus.googleEmail}</strong> versendet und liegt automatisch in Ihrem Google-Ordner <em>„Gesendet“</em>.</span>
                    </div>
                </div>
            {/if}
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
                            <div class="absolute top-full right-0 mt-1 w-72 bg-white border border-neutral-200 shadow-xl rounded-xl z-50 max-h-72 overflow-y-auto custom-scrollbar p-1.5">
                                {#if availableContacts.some(c => c.isDirect && c.email)}
                                    <div class="px-2 py-1 text-[11px] font-black text-brand-700 bg-brand-50 rounded-md mb-1 uppercase tracking-wider flex items-center justify-between">
                                        <span>⭐ Direkte Klienten-Kontakte</span>
                                    </div>
                                    {#each availableContacts.filter(c => c.isDirect && c.email) as c}
                                        <label class="flex items-center gap-2.5 p-2 hover:bg-brand-50/60 bg-brand-50/25 rounded-lg cursor-pointer transition-colors mb-0.5 border border-brand-100/70">
                                            <input type="checkbox" checked={emailTo.includes(c.email)} onchange={(e) => toggleRecipient(c, e.currentTarget.checked)} class="w-4 h-4 text-brand-600 border-neutral-300 rounded focus:ring-brand-500" />
                                            <div class="min-w-0 flex-1">
                                                <p class="text-xs font-bold text-neutral-900 truncate">{c.name}</p>
                                                <p class="text-[10px] text-brand-600 font-semibold truncate">{c.email}</p>
                                            </div>
                                        </label>
                                    {/each}
                                    <div class="border-t border-neutral-200 my-1.5"></div>
                                    <div class="px-2 py-1 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                                        <span>Weitere Adressbuch-Kontakte</span>
                                    </div>
                                {/if}
                                {#each availableContacts.filter(c => !c.isDirect && c.email) as c}
                                    <label class="flex items-center gap-2.5 p-2 hover:bg-neutral-50 rounded-lg cursor-pointer transition-colors">
                                        <input type="checkbox" checked={emailTo.includes(c.email)} onchange={(e) => toggleRecipient(c, e.currentTarget.checked)} class="w-4 h-4 text-indigo-600 border-neutral-300 rounded focus:ring-indigo-500" />
                                        <div class="min-w-0 flex-1">
                                            <p class="text-xs font-medium text-neutral-800 truncate">{c.name}</p>
                                            <p class="text-[10px] text-neutral-500 truncate">{c.email}</p>
                                        </div>
                                    </label>
                                {/each}
                                {#if availableContacts.filter(c => c.email).length === 0}
                                    <p class="text-xs text-neutral-500 p-2 text-center">Keine E-Mails gefunden</p>
                                {/if}
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
                    {#if availablePdfs.length > 0}
                        {#each availablePdfs as pdf}
                            <label class="flex items-center gap-3 p-3 bg-white rounded-xl border border-neutral-200 cursor-pointer hover:border-indigo-300 transition-colors shadow-sm">
                                <input type="checkbox" checked={selectedPdfFiles.some(f => f.filename === pdf.filename && f.record.id === pdf.record.id)} onchange={() => {
                                    if (selectedPdfFiles.some(f => f.filename === pdf.filename && f.record.id === pdf.record.id)) {
                                        selectedPdfFiles = selectedPdfFiles.filter(f => !(f.filename === pdf.filename && f.record.id === pdf.record.id));
                                    } else {
                                        selectedPdfFiles = [...selectedPdfFiles, pdf];
                                    }
                                }} class="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500" disabled={isEmailSending || !!successMsg} />
                                <span class="text-sm font-medium text-neutral-800">{pdf.filename}</span>
                            </label>
                        {/each}
                    {:else}
                        <p class="text-sm text-neutral-500 italic">Keine Dokumente gefunden.</p>
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