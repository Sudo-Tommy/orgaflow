<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    import { sendEmail } from "$lib/services/emailService";
    import { toastStore } from "$lib/services/toastService.svelte";
  import { orgaStore } from "$lib/stores/orgaStore.svelte";

    // svelte-ignore non_reactive_update
    let dialog: HTMLDialogElement;
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

    let availableContacts = $state<any[]>([]);
    let showContactDropdown = $state(false);
    let selectedContactRefs = $state<any[]>([]);
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

    function updateMessage() {
        let newSalutation = "";
        if (selectedContactRefs.length === 1) {
            newSalutation = selectedContactRefs[0].salutation;
        } else if (selectedContactRefs.length === 2) {
            const first = selectedContactRefs[0].salutation.replace(',', '');
            const second = selectedContactRefs[1].salutation.replace(',', '');
            newSalutation = `${first},\n${second.charAt(0).toLowerCase() + second.slice(1)},`;
        } else if (selectedContactRefs.length >= 3) {
            newSalutation = "Sehr geehrte Damen und Herren,";
        } else {
            const recipientRecord = client?.expand?.caregiver || client;
            newSalutation = recipientRecord?.salutation === 'Herr' ? `Sehr geehrter Herr ${recipientRecord.name_last},` : 
                            (recipientRecord?.salutation === 'Frau' ? `Sehr geehrte Frau ${recipientRecord.name_last},` : 
                            `Guten Tag ${recipientRecord?.name_first || ''} ${recipientRecord?.name_last || ''},`.trim());
        }
        
        const isClientOnly = selectedContactRefs.length > 0 ? selectedContactRefs.every(c => c.isClient) : (client?.expand?.caregiver ? false : true);
        const clientName = `${client?.name_first || ''} ${client?.name_last || ''}`.trim();
        const isPast = appointment?.appointment && new Date(appointment.appointment) < new Date();
        
        const baseText = isPast
            ? (isClientOnly ? `hiermit erhalten Sie eine Nachricht zu unserem gemeinsamen Termin vom ${appDate}.` : `hiermit erhalten Sie eine Nachricht zu unserem Termin mit ${clientName} vom ${appDate}.`)
            : (isClientOnly ? `hiermit möchten wir Sie an unseren gemeinsamen Termin am ${appDate} um ${appTime} erinnern.` : `hiermit möchten wir Sie an unseren Termin mit ${clientName} am ${appDate} um ${appTime} erinnern.`);
            
        message = `${newSalutation}\n\n${baseText}\n\nIhre Termine können Sie auch jederzeit im Klienten-Portal einsehen:\n👉 https://www.ihre-seniorenassistenz.com/portal\n\nWir freuen uns auf Sie!`;
    }

    export function open(app: any, cl: any) {
        appointment = app;
        client = cl;
        
        // Automatische Vorwahl der Methode: Hat der Klient kein E-Mail, aber eine Handynummer, wird direkt WhatsApp vorgeschlagen
        method = cl?.email ? 'email' : (cl?.handy || cl?.phone ? 'whatsapp' : 'email');
        recipient = method === 'email' ? (cl?.email || "") : (cl?.handy || cl?.phone || "");
        
        const dateStr = app?.appointment ? new Date(app.appointment).toLocaleDateString('de-DE') : 'Unbekannt';
        const timeStr = app?.appointment ? new Date(app.appointment).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : 'Unbekannt';
        
        cc = "";
        bcc = "";
        showCcBcc = false;
        const isPast = app?.appointment && new Date(app.appointment) < new Date();
        subject = isPast ? `Nachricht zu Ihrem Termin am ${dateStr}` : `Terminerinnerung: ${dateStr}`;
        
        appDate = dateStr;
        appTime = timeStr !== 'Unbekannt' ? `${timeStr} Uhr` : timeStr;
        appDesc = app?.description || 'Keine weitere Beschreibung';

        let locationStr = "";
        if (app.expand?.appointment_at?.[0]) {
            const contact = app.expand.appointment_at[0];
            const namePart = [contact.company_name, `${contact.name_first} ${contact.name_last}`.trim()].filter(Boolean).join(' - ');
            const addressPart = `${contact.street || ''} ${contact.housenr || ''}`.trim();
            const cityPart = `${contact.zip || ''} ${contact.city || ''}`.trim();
            locationStr = [namePart, addressPart, cityPart].filter(Boolean).join(', ');
        } else if (app.location_address) {
            locationStr = app.location_address;
        }
        appLocation = locationStr;
        appReport = app?.report || "";
        includeReport = !!appReport;

        availableContacts = buildAvailableContacts();
        selectedContactRefs = [];
        if (recipient) {
            const isEmail = method === 'email';
            const matched = availableContacts.find(c => (isEmail ? c.email : c.phone) === recipient);
            if (matched) selectedContactRefs = [matched];
        }

        updateMessage();
        
        futureAppointments = [];
        selectedFutureAppIds = [];
        includeFutureApps = false;

        if (cl?.id) {
            const now = new Date();
            now.setHours(0,0,0,0);
            const nowStr = now.toISOString().split('T')[0] + ' 00:00:00';
            
            pb.collection('appointments').getFullList({
                filter: `client ~ '${cl.id}' && appointment >= '${nowStr}' && id != '${app.id}'`,
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
        appointment = null;
        client = null;
    }

    function changeMethod(newMethod: 'email' | 'whatsapp') {
        method = newMethod;
        recipient = method === 'email' ? (client?.email || "") : (client?.handy || client?.phone || "");
        selectedContactRefs = [];
        if (recipient) {
            const isEmail = method === 'email';
            const matched = availableContacts.find(c => (isEmail ? c.email : c.phone) === recipient);
            if (matched) selectedContactRefs = [matched];
        }
        updateMessage();
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
                let rawUser = appointment?.expand?.user;
                const assignedUser = Array.isArray(rawUser) ? rawUser[0] : rawUser;
                const sendingUser = pb.authStore.model;

                let finalUserName = 'Ihre Seniorenassistenz';
                if (assignedUser && (assignedUser.name_first || assignedUser.name_last)) {
                    finalUserName = `${assignedUser.name_first || ''} ${assignedUser.name_last || ''}`.trim();
                } else if (sendingUser && (sendingUser.name_first || sendingUser.name_last)) {
                    finalUserName = `${sendingUser.name_first || ''} ${sendingUser.name_last || ''}`.trim();
                }
                const finalUserEmail = assignedUser?.email || sendingUser?.email || 'info@ihre-seniorenassistenz.com';
                const finalUserPhone = assignedUser?.handy || assignedUser?.tel || sendingUser?.handy || sendingUser?.tel || '0151 57515432';

                let compName = 'Ihre Seniorenassistenz';
                let compStreet = 'Dreyhauptstraße 2';
                let compCity = '06108 Halle (Saale)';
                let compWeb = 'www.ihre-seniorenassistenz.com';
                let compLogo = '';
                let companyId: string | null = null;
                const compSource = assignedUser || sendingUser;
                if (compSource && compSource.company) {
                    companyId = Array.isArray(compSource.company) ? compSource.company[0] : compSource.company;
                    const comp = orgaStore.company?.data?.find((c: any) => c.id === companyId);
                    if (comp) {
                        compName = comp.name || compName;
                        compStreet = `${comp.street || ''} ${comp.housenr || ''}`.trim() || compStreet;
                        compCity = `${comp.zip || ''} ${comp.city || ''}`.trim() || compCity;
                        compWeb = comp.website || compWeb;
                        if (comp.logo) {
                            const logoFilename = Array.isArray(comp.logo) ? comp.logo[0] : comp.logo;
                            const rawUrl = (pb.files as any).getUrl ? (pb.files as any).getUrl(comp, logoFilename) : (pb.files as any).getURL(comp, logoFilename);
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

                let reportHtml = '';
                let reportText = '';

                if (method === 'email' && includeReport && appReport) {
                    reportHtml = `
                        <div style="background-color: #f8fafc; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 25px 0;">
                            <h3 style="margin-top: 0; color: #111827; font-size: 16px; margin-bottom: 12px;">Besuchsbericht:</h3>
                            <div style="font-size: 14px; color: #4b5563; line-height: 1.6;">
                                ${appReport.replace(/\n/g, '<br>')}
                            </div>
                        </div>
                    `;
                    reportText = `\n\n--- BESUCHSBERICHT ---\n${appReport}\n`;
                }

                let futureAppsHtml = '';
                let futureAppsText = '';

                if (method === 'email' && includeFutureApps && selectedFutureAppIds.length > 0) {
                    const selectedApps = futureAppointments.filter(a => selectedFutureAppIds.includes(a.id));
                    if (selectedApps.length > 0) {
                        futureAppsHtml += `
                            <div style="background-color: #f8fafc; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 25px 0;">
                                <h3 style="margin-top: 0; color: #111827; font-size: 16px; margin-bottom: 12px;">Ihre nächsten Termine</h3>
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

                const textEmail = `${message.trim()}\n${reportText}\n${futureAppsText}\n--\n${finalUserName}\n${compName}\n${compStreet}, ${compCity}\nTelefon: ${finalUserPhone}\nE-Mail: ${finalUserEmail}\nWeb: ${compWeb}`;

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
                            ${message.trim().replace(/\n/g, '<br>').replace(/(?:<br>|\s)*(?:👉\s*)?(?:&lt;|<)?\s*https?:\/\/(?:www\.)?ihre-seniorenassistenz\.com\/portal\/?\s*(?:&gt;|>)?/gi, '<br><table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 15px 0;"><tr><td align="center" bgcolor="#c66a4d" style="border-radius: 8px;"><a href="https://www.ihre-seniorenassistenz.com/portal" style="display: inline-block; padding: 12px 24px; color: #ffffff; text-decoration: none; font-weight: bold; font-family: Arial, sans-serif; font-size: 15px;">Zum Klienten-Portal</a></td></tr></table><br>')}
                            
                            <div style="background-color: #f8fafc; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 25px 0;">
                                <h3 style="margin-top: 0; color: #111827; font-size: 16px; margin-bottom: 12px;">Ihre Termindaten:</h3>
                                <table cellpadding="0" cellspacing="0" style="font-size: 14px; color: #4b5563; width: 100%;">
                                    <tr>
                                        <td style="padding: 4px 0; width: 80px;"><strong>Datum:</strong></td>
                                        <td style="padding: 4px 0;">${appDate}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 4px 0;"><strong>Uhrzeit:</strong></td>
                                        <td style="padding: 4px 0;">${appTime}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 4px 0; vertical-align: top;"><strong>Ort:</strong></td>
                                        <td style="padding: 4px 0;">${appLocation ? appLocation.replace(/, /g, '<br>') : 'Beim Klienten zu Hause'}</td>
                                    </tr>
                                    <tr>
                                        <td colspan="2" style="padding-top: 12px;"><strong>Anliegen / Beschreibung:</strong><br><div style="margin-top: 4px; padding: 10px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 6px;">${appDesc.replace(/\n/g, '<br>')}</div></td>
                                    </tr>
                                </table>
                            </div>
                            ${reportHtml}
                            ${futureAppsHtml}
                        </div>
                        <div style="background-color: #f8fafc; padding: 30px; border-top: 1px solid #e5e7eb;">
                            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size: 14px; color: #4b5563;">
                                <tr>
                                    <td valign="top" style="padding-bottom: 20px;">
                                        <strong style="color: #111827; font-size: 16px;">${finalUserName}</strong><br>
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
                                                    <div style="margin-bottom: 4px;">📞 <a href="tel:${finalUserPhone}" style="color: #c66a4d; text-decoration: none; font-weight: 500;">${finalUserPhone}</a></div>
                                                    <div style="margin-bottom: 4px;">✉️ <a href="mailto:${finalUserEmail}" style="color: #c66a4d; text-decoration: none; font-weight: 500;">${finalUserEmail}</a></div>
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
                    to: recipient,
                    cc: cc || undefined,
                    bcc: bcc || undefined,
                    subject: subject,
                    text: textEmail,
                    html: htmlEmail
                });

            try {
                if (pb.authStore.model) {
                    let fullTo = recipient;
                    if (cc) fullTo += `, CC: ${cc}`;
                    if (bcc) fullTo += `, BCC: ${bcc}`;
                    
                    await pb.collection('mailbox_messages').create({
                        send_by: pb.authStore.model.id,
                        company: companyId,
                        folder: 'Sent',
                        from_address: `${finalUserName} <${finalUserEmail}>`,
                        to_address: fullTo,
                        subject: subject,
                        body_text: textEmail,
                        body_html: htmlEmail,
                        date: new Date().toISOString(),
                        is_read: true
                    });
                }
            } catch (e) { console.warn("E-Mail konnte nicht im Postfach gespeichert werden", e); }

                toastStore.success("Nachricht per E-Mail versendet!");
                close();
            } else if (method === 'whatsapp') {
                // Säubert die Telefonnummer für WhatsApp (entfernt Leerzeichen, etc.) und erzwingt Vorwahl
                let cleanPhone = recipient.replace(/[^0-9+]/g, '');
                if (cleanPhone.startsWith('0')) cleanPhone = '+49' + cleanPhone.substring(1);
                
                const waText = encodeURIComponent(message);
                const waUrl = `https://wa.me/${cleanPhone.replace('+', '')}?text=${waText}`;
                window.open(waUrl, '_blank');
                toastStore.success("WhatsApp wird geöffnet...");
                close();
            }
        } catch (err: any) {
            console.error(err);
            toastStore.error("Fehler beim Senden: " + err.message);
        } finally {
            isSending = false;
        }
    }
</script>

<dialog bind:this={dialog} class="p-0 bg-transparent backdrop:bg-black/50 backdrop:backdrop-blur-sm w-full max-w-lg mx-auto my-auto rounded-3xl" onclick={(e) => { if (e.target === dialog) close(); }}>
    <div class="bg-white rounded-3xl p-6 md:p-8 w-full relative shadow-2xl">
        <button aria-label="Schließen" title="Schließen" onclick={close} class="absolute top-5 right-5 w-10 h-10 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-full flex items-center justify-center transition-colors">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        
        <h2 class="text-xl sm:text-2xl font-bold text-neutral-900 mb-2 flex items-center gap-2"><span>✉️</span> Nachricht / Termin-Erinnerung</h2>
        <p class="text-sm text-neutral-500 mb-6">Senden Sie eine Benachrichtigung zum Termin an den Klienten.</p>

        <form onsubmit={handleSend} class="space-y-4">
            <!-- Toggle E-Mail vs WhatsApp -->
            <div class="flex gap-2 p-1 bg-neutral-100 rounded-lg">
                <button type="button" onclick={() => changeMethod('email')} class="flex-1 py-2 text-sm font-bold rounded-md transition-colors {method === 'email' ? 'bg-white shadow-sm text-indigo-600' : 'text-neutral-500 hover:text-neutral-700'}">✉️ E-Mail</button>
                <button type="button" onclick={() => changeMethod('whatsapp')} class="flex-1 py-2 text-sm font-bold rounded-md transition-colors {method === 'whatsapp' ? 'bg-white shadow-sm text-emerald-600' : 'text-neutral-500 hover:text-neutral-700'}">💬 WhatsApp</button>
            </div>

            <div>
                <div class="flex items-center justify-between mb-1.5">
                    <label for="rem-recipient" class="block text-sm font-semibold text-neutral-700">{method === 'email' ? 'E-Mail Adresse' : 'Handynummer'}</label>
                    {#if method === 'email'}
                        <button type="button" onclick={() => showCcBcc = !showCcBcc} class="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors">{showCcBcc ? '− CC / BCC ausblenden' : '+ CC / BCC hinzufügen'}</button>
                    {/if}
                </div>
                <div class="flex flex-col sm:flex-row gap-2">
                    <input id="rem-recipient" type="text" bind:value={recipient} class="orga-input-clear py-3 sm:py-2.5 text-sm flex-1" required disabled={isSending} />
                <div class="relative flex-1 sm:flex-none sm:w-auto">
                    <button type="button" onclick={() => showContactDropdown = !showContactDropdown} class="orga-input-clear w-full bg-white border-neutral-200 shadow-sm cursor-pointer text-sm font-medium py-3 sm:py-2.5 flex justify-between items-center" disabled={isSending}>
                        <span>+ Adressbuch</span><span class="text-[10px] ml-2">▼</span>
                    </button>
                    {#if showContactDropdown}
                        <!-- svelte-ignore a11y_consider_explicit_label -->
                        <button type="button" class="fixed inset-0 z-40 w-full h-full cursor-default" onclick={() => showContactDropdown = false} tabindex="-1"></button>
                        <div class="absolute top-full right-0 mt-1 w-64 bg-white border border-neutral-200 shadow-xl rounded-xl z-50 max-h-60 overflow-y-auto custom-scrollbar p-1">
                            {#each availableContacts.filter(c => method === 'email' ? c.email : c.phone) as c}
                                <label class="flex items-center gap-3 p-2 hover:bg-neutral-50 rounded-lg cursor-pointer transition-colors"><input type="checkbox" checked={recipient.includes(method === 'email' ? c.email : c.phone)} onchange={(e) => toggleRecipient(c, e.currentTarget.checked)} class="w-4 h-4 text-indigo-600 border-neutral-300 rounded focus:ring-indigo-500" /><div class="min-w-0"><p class="text-sm font-bold text-neutral-900 truncate">{c.name}</p><p class="text-[10px] text-neutral-500 truncate">{method === 'email' ? c.email : c.phone}</p></div></label>
                            {/each}
                            {#if availableContacts.filter(c => method === 'email' ? c.email : c.phone).length === 0}<p class="text-xs text-neutral-500 p-2 text-center">Keine {method === 'email' ? 'E-Mails' : 'Nummern'} gefunden</p>{/if}
                        </div>
                    {/if}
                </div>
                </div>
            </div>
            
            {#if method === 'email' && showCcBcc}
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-enter">
                    <div>
                        <label for="rem-cc" class="block text-sm font-semibold text-neutral-700 mb-1.5">CC (Kopie)</label>
                        <input id="rem-cc" type="text" bind:value={cc} class="orga-input-clear py-3 sm:py-2.5 text-sm" disabled={isSending} placeholder="z.B. angehoeriger@mail.de" />
                    </div>
                    <div>
                        <label for="rem-bcc" class="block text-sm font-semibold text-neutral-700 mb-1.5">BCC (Blindkopie)</label>
                        <input id="rem-bcc" type="text" bind:value={bcc} class="orga-input-clear py-3 sm:py-2.5 text-sm" disabled={isSending} placeholder="z.B. info@mail.de" />
                    </div>
                </div>
            {/if}

            {#if method === 'email'}
                <div>
                    <label for="rem-subject" class="block text-sm font-semibold text-neutral-700 mb-1.5">Betreff</label>
                    <input id="rem-subject" type="text" bind:value={subject} class="orga-input-clear py-3 sm:py-2.5 text-sm" required disabled={isSending} />
                </div>

                <div class="p-4 bg-indigo-50 border border-indigo-100 rounded-xl animate-enter">
                    <h3 class="font-bold text-indigo-900 text-sm mb-1">Sichtbare Termindaten anpassen</h3>
                    <p class="text-xs text-indigo-700 mb-4">Ändern Sie die Daten nur für diese E-Mail, ohne den Original-Termin zu überschreiben.</p>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label for="rem-app-date" class="block text-xs font-semibold text-indigo-800 mb-1.5">Datum</label>
                            <input id="rem-app-date" type="text" bind:value={appDate} class="orga-input-clear py-3 sm:py-2.5 text-sm bg-white border-indigo-200" disabled={isSending} />
                        </div>
                        <div>
                            <label for="rem-app-time" class="block text-xs font-semibold text-indigo-800 mb-1.5">Uhrzeit</label>
                            <input id="rem-app-time" type="text" bind:value={appTime} class="orga-input-clear py-3 sm:py-2.5 text-sm bg-white border-indigo-200" disabled={isSending} />
                        </div>
                    </div>
                    <div class="mb-4">
                        <label for="rem-app-location" class="block text-xs font-semibold text-indigo-800 mb-1.5">Ort</label>
                        <textarea id="rem-app-location" bind:value={appLocation} rows="2" class="orga-input-clear py-3 sm:py-2.5 text-sm resize-none custom-scrollbar bg-white border-indigo-200" disabled={isSending}></textarea>
                    </div>
                    <div>
                        <label for="rem-app-desc" class="block text-xs font-semibold text-indigo-800 mb-1.5">Anliegen / Beschreibung</label>
                        <textarea id="rem-app-desc" bind:value={appDesc} rows="2" class="orga-input-clear py-3 sm:py-2.5 text-sm resize-none custom-scrollbar bg-white border-indigo-200" disabled={isSending}></textarea>
                    </div>
                </div>
            {/if}

            <div>
                <label for="rem-message" class="block text-sm font-semibold text-neutral-700 mb-1.5">Nachricht</label>
                <textarea id="rem-message" bind:value={message} rows="6" class="orga-input-clear py-3 sm:py-2.5 text-sm resize-none custom-scrollbar" required disabled={isSending}></textarea>
            </div>

            {#if appReport}
                <div class="pt-4 mt-2 border-t border-neutral-100">
                    <div class="flex items-center justify-between mb-3">
                        <h3 class="text-sm font-bold text-neutral-900 flex items-center gap-2"><span>📝</span> Besuchsbericht anhängen</h3>
                        <label class="flex items-center gap-2 text-sm font-semibold text-neutral-700 cursor-pointer">
                            <input type="checkbox" bind:checked={includeReport} class="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500" disabled={isSending} />
                            Anhängen
                        </label>
                    </div>
                    {#if includeReport}
                        <div class="p-3 bg-white border border-neutral-200 rounded-xl max-h-40 overflow-y-auto custom-scrollbar text-sm text-neutral-700 whitespace-pre-wrap">
                            {appReport}
                        </div>
                    {/if}
                </div>
            {/if}

            {#if method === 'email' && futureAppointments.length > 0}
                <div class="pt-4 mt-2 border-t border-neutral-100">
                    <div class="flex items-center justify-between mb-3">
                        <h3 class="text-sm font-bold text-neutral-900 flex items-center gap-2"><span>📅</span> Folgetermine übermitteln</h3>
                        <label class="flex items-center gap-2 text-sm font-semibold text-neutral-700 cursor-pointer">
                            <input type="checkbox" bind:checked={includeFutureApps} class="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500" disabled={isSending} />
                            Anhängen
                        </label>
                    </div>
                    
                    {#if includeFutureApps}
                        <div class="space-y-2 max-h-48 overflow-y-auto custom-scrollbar p-1 pr-2">
                            {#each futureAppointments as app}
                                <label class="flex items-start gap-3 p-3 bg-white rounded-xl border border-neutral-200 cursor-pointer hover:border-indigo-300 transition-colors shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/20">
                                    <input type="checkbox" checked={selectedFutureAppIds.includes(app.id)} onchange={() => {
                                        if(selectedFutureAppIds.includes(app.id)) selectedFutureAppIds = selectedFutureAppIds.filter(id => id !== app.id);
                                        else selectedFutureAppIds = [...selectedFutureAppIds, app.id];
                                    }} class="w-5 h-5 mt-0.5 text-indigo-600 rounded focus:ring-indigo-500" disabled={isSending} />
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

            <div class="pt-4 flex flex-col-reverse sm:flex-row justify-end gap-3 border-t border-neutral-100 mt-6">
                <button type="button" onclick={close} class="orga-button-ghost w-full sm:w-auto py-3 sm:py-2.5" disabled={isSending}>Abbrechen</button>
                <button type="submit" class="orga-button-primary w-full sm:w-auto py-3 sm:py-2.5 {method === 'whatsapp' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30' : 'shadow-indigo-600/30'}" disabled={isSending}>
                    {isSending ? 'Wird verarbeitet...' : (method === 'email' ? 'E-Mail senden ✉️' : 'WhatsApp öffnen 💬')}
                </button>
            </div>
        </form>
    </div>
</dialog>