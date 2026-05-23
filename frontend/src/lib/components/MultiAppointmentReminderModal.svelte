<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    import { sendEmail } from "$lib/services/emailService";
    import { toastStore } from "$lib/services/toastService.svelte";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";

    // svelte-ignore non_reactive_update
    let dialog: HTMLDialogElement;
    let client = $state<any>(null);
    let availableAppointments = $state<any[]>([]);
    let selectedAppointmentIds = $state<string[]>([]);

    let method = $state<'email' | 'whatsapp'>('email');
    let recipient = $state("");
    let cc = $state("");
    let bcc = $state("");
    let showCcBcc = $state(false);
    let subject = $state("");
    let message = $state("");
    let isSending = $state(false);
    
    let availableContacts = $state<any[]>([]);
    let showContactDropdown = $state(false);
    let selectedContactRefs = $state<any[]>([]);

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

    export function open(apps: any[], cl: any) {
        client = cl;
        
        // Nur zukünftige Termine filtern
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        availableAppointments = apps.filter(a => new Date(a.appointment) >= now).sort((a, b) => new Date(a.appointment).getTime() - new Date(b.appointment).getTime());
        selectedAppointmentIds = availableAppointments.map(a => a.id);

        const caregiver = cl?.expand?.caregiver;

        method = (caregiver?.email || cl?.email) ? 'email' : (caregiver?.handy || caregiver?.phone || cl?.handy || cl?.phone ? 'whatsapp' : 'email');
        recipient = method === 'email' ? (caregiver?.email || cl?.email || "") : (caregiver?.handy || caregiver?.phone || cl?.handy || cl?.phone || "");

        cc = "";
        bcc = "";
        showCcBcc = false;
        subject = `Ihre gebuchten Termine`;
        
        availableContacts = buildAvailableContacts();
        selectedContactRefs = [];
        if (recipient) {
            const isEmail = method === 'email';
            const matched = availableContacts.find(c => (isEmail ? c.email : c.phone) === recipient);
            if (matched) selectedContactRefs = [matched];
        }
        
        updateMessage();
        dialog?.showModal();
    }

    export function close() {
        dialog?.close();
        client = null;
        availableAppointments = [];
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
            // Fallback auf Klient
            const recipientRecord = client?.expand?.caregiver || client;
            newSalutation = recipientRecord?.salutation === 'Herr' ? `Sehr geehrter Herr ${recipientRecord.name_last},` : 
                            (recipientRecord?.salutation === 'Frau' ? `Sehr geehrte Frau ${recipientRecord.name_last},` : 
                            `Guten Tag ${recipientRecord?.name_first || ''} ${recipientRecord?.name_last || ''},`.trim());
        }

        const isClientOnly = selectedContactRefs.length > 0 ? selectedContactRefs.every(c => c.isClient) : false;
        const clientName = `${client?.name_first || ''} ${client?.name_last || ''}`.trim();
        const baseText = (!isClientOnly && clientName) ? `hiermit möchten wir Ihnen für ${clientName} die folgenden gebuchten Termine bestätigen:` : `hiermit möchten wir Ihnen die folgenden gebuchten Termine bestätigen:`;
        let msg = `${newSalutation}\n\n${baseText}\n\n`;
        
        const selectedApps = availableAppointments.filter(a => selectedAppointmentIds.includes(a.id));
        
        selectedApps.forEach(app => {
            const dateStr = new Date(app.appointment).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const timeStr = new Date(app.appointment).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
            msg += `• ${dateStr} um ${timeStr} Uhr: ${app.description || 'Termin'}\n`;
        });

        msg += `\nIhre Termine können Sie auch jederzeit im Klienten-Portal einsehen:\n👉 https://www.ihre-seniorenassistenz.com/portal\n\nWir freuen uns auf Sie!`;
        message = msg;
    }

    function handleToggle(id: string) {
        if (selectedAppointmentIds.includes(id)) {
            selectedAppointmentIds = selectedAppointmentIds.filter(i => i !== id);
        } else {
            selectedAppointmentIds = [...selectedAppointmentIds, id];
        }
        updateMessage();
    }

    async function handleSend(e: Event) {
        e.preventDefault();
        if (!recipient) {
            toastStore.warning(method === 'email' ? 'Bitte E-Mail angeben.' : 'Bitte Telefonnummer angeben.');
            return;
        }
        if (selectedAppointmentIds.length === 0) {
            toastStore.warning('Bitte mindestens einen Termin auswählen.');
            return;
        }

        isSending = true;

        try {
            if (method === 'email') {
                const sendingUser = pb.authStore.model;
                const finalUserName = sendingUser ? `${sendingUser.name_first || ''} ${sendingUser.name_last || ''}`.trim() : 'Ihre Seniorenassistenz';
                const finalUserEmail = sendingUser?.email || 'info@ihre-seniorenassistenz.com';
                const finalUserPhone = sendingUser?.handy || sendingUser?.tel || '0151 57515432';

                let compName = 'Ihre Seniorenassistenz';
                let compStreet = 'Dreyhauptstraße 2';
                let compCity = '06108 Halle (Saale)';
                let compWeb = 'www.ihre-seniorenassistenz.com';
                let compLogo = '';
                let companyId: string | null = null;
                if (sendingUser && sendingUser.company) {
                    companyId = Array.isArray(sendingUser.company) ? sendingUser.company[0] : sendingUser.company;
                    const comp = orgaStore.company?.data?.find((c: any) => c.id === companyId);
                    if (comp) {
                        compName = comp.name || compName;
                        compStreet = `${comp.street || ''} ${comp.housenr || ''}`.trim() || compStreet;
                        compCity = `${comp.zip || ''} ${comp.city || ''}`.trim() || compCity;
                        compWeb = comp.website || compWeb;
                        if (comp.logo) {
                            const logoFilename = Array.isArray(comp.logo) ? comp.logo[0] : comp.logo;
                            const logoUrl = (pb.files as any).getUrl ? (pb.files as any).getUrl(comp, logoFilename) : (pb.files as any).getURL(comp, logoFilename);
                            compLogo = logoUrl.startsWith('http') ? logoUrl.replace(/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?/, 'https://www.ihre-seniorenassistenz.com') : `https://www.ihre-seniorenassistenz.com${logoUrl}`;
                        }
                    }
                }

                const textEmail = `${message.trim()}\n\n--\n${finalUserName}\n${compName}\n${compStreet}, ${compCity}\nTelefon: ${finalUserPhone}\nE-Mail: ${finalUserEmail}\nWeb: ${compWeb}`;

                const selectedApps = availableAppointments.filter(a => selectedAppointmentIds.includes(a.id));
                let appsHtml = '';
                selectedApps.forEach(app => {
                    const dateStr = new Date(app.appointment).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
                    const timeStr = new Date(app.appointment).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
                    appsHtml += `
                        <tr>
                            <td style="padding: 6px 0; border-bottom: 1px solid #e5e7eb; width: 140px;"><strong>${dateStr}</strong><br><span style="color: #6b7280; font-size: 13px;">${timeStr} Uhr</span></td>
                            <td style="padding: 6px 0; border-bottom: 1px solid #e5e7eb;">${app.description || 'Termin'}</td>
                        </tr>
                    `;
                });

                const htmlMessage = message.split('\n\n').map(p => {
                    if (p.startsWith('•')) return ''; // Filtere Text-Liste raus für schöne HTML-Tabelle
                    return p.replace(/\n/g, '<br>');
                }).filter(Boolean).join('<br><br>');

                const htmlEmail = `
                    <div style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; color: #374151; max-width: 650px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);">
                        <div style="background-color: #fdf8f6; padding: 30px; border-bottom: 3px solid #c66a4d;">
                            <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td valign="middle">
                                        <h1 style="color: #954028; margin: 0; font-size: 24px; letter-spacing: -0.5px; font-weight: 800;">${compName}</h1>
                                        <p style="color: #c66a4d; margin: 4px 0 0 0; font-size: 14px; font-weight: 600;">Alltagshilfe • Betreuung • Organisation</p>
                                    </td>
                                    ${compLogo ? `<td valign="middle" align="right" style="width: 100px;"><img src="${compLogo}" alt="Logo" style="max-height: 60px; max-width: 100px; object-fit: contain; border-radius: 6px;" /></td>` : ''}
                                </tr>
                            </table>
                        </div>
                        <div style="padding: 35px 30px; font-size: 15px; line-height: 1.7; color: #1f2937; background-color: #ffffff;">
                            ${htmlMessage.replace(/(?:<br>|\s)*(?:👉\s*)?(?:&lt;|<)?\s*https?:\/\/(?:www\.)?ihre-seniorenassistenz\.com\/portal\/?\s*(?:&gt;|>)?/gi, '<br><table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 15px 0;"><tr><td align="center" bgcolor="#c66a4d" style="border-radius: 8px;"><a href="https://www.ihre-seniorenassistenz.com/portal" style="display: inline-block; padding: 12px 24px; color: #ffffff; text-decoration: none; font-weight: bold; font-family: Arial, sans-serif; font-size: 15px;">Zum Klienten-Portal</a></td></tr></table><br>')}
                            
                            <div style="background-color: #f8fafc; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 25px 0;">
                                <h3 style="margin-top: 0; color: #111827; font-size: 16px; margin-bottom: 12px;">Die gebuchten Termine:</h3>
                                <table cellpadding="0" cellspacing="0" style="font-size: 14px; color: #4b5563; width: 100%; border-collapse: collapse;">
                                    ${appsHtml}
                                </table>
                            </div>
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

                toastStore.success("Terminübersicht per E-Mail versendet!");
                close();
            } else if (method === 'whatsapp') {
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

<dialog bind:this={dialog} class="p-0 bg-transparent backdrop:bg-black/50 backdrop:backdrop-blur-sm w-full max-w-2xl mx-auto my-auto rounded-3xl" onclick={(e) => { if (e.target === dialog) close(); }}>
    <div class="bg-white rounded-3xl p-6 md:p-8 w-full relative shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
        <button aria-label="Schließen" title="Schließen" onclick={close} class="absolute top-5 right-5 w-10 h-10 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-full flex items-center justify-center transition-colors">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        
        <h2 class="text-xl sm:text-2xl font-bold text-neutral-900 mb-2 flex items-center gap-2"><span>✉️</span> Terminübersicht versenden</h2>
        <p class="text-sm text-neutral-500 mb-6">Wählen Sie die Termine, die Sie bestätigen möchten.</p>

        <form onsubmit={handleSend} class="space-y-4">
            <div class="flex gap-2 p-1 bg-neutral-100 rounded-lg">
                <button type="button" onclick={() => changeMethod('email')} class="flex-1 py-2 text-sm font-bold rounded-md transition-colors {method === 'email' ? 'bg-white shadow-sm text-indigo-600' : 'text-neutral-500 hover:text-neutral-700'}">✉️ E-Mail</button>
                <button type="button" onclick={() => changeMethod('whatsapp')} class="flex-1 py-2 text-sm font-bold rounded-md transition-colors {method === 'whatsapp' ? 'bg-white shadow-sm text-emerald-600' : 'text-neutral-500 hover:text-neutral-700'}">💬 WhatsApp</button>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <div class="flex items-center justify-between mb-1.5">
                        <label for="multi-rem-recipient" class="block text-sm font-semibold text-neutral-700">{method === 'email' ? 'E-Mail Adresse' : 'Handynummer'}</label>
                        {#if method === 'email'}
                            <button type="button" onclick={() => showCcBcc = !showCcBcc} class="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors">{showCcBcc ? '− CC / BCC' : '+ CC / BCC'}</button>
                        {/if}
                    </div>
                    <input id="multi-rem-recipient" type="text" bind:value={recipient} class="orga-input-clear py-3 sm:py-2.5 text-sm" required disabled={isSending} />
                </div>

                {#if method === 'email'}
                <div>
                    <label for="multi-rem-subject" class="block text-sm font-semibold text-neutral-700 mb-1.5">Betreff</label>
                    <input id="multi-rem-subject" type="text" bind:value={subject} class="orga-input-clear py-3 sm:py-2.5 text-sm" required disabled={isSending} />
                </div>
                {/if}
            </div>
            
            {#if method === 'email' && showCcBcc}
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-enter">
                    <div>
                        <label for="multi-rem-cc" class="block text-sm font-semibold text-neutral-700 mb-1.5">CC (Kopie)</label>
                        <input id="multi-rem-cc" type="text" bind:value={cc} class="orga-input-clear py-3 sm:py-2.5 text-sm" disabled={isSending} placeholder="z.B. angehoeriger@mail.de" />
                    </div>
                    <div>
                        <label for="multi-rem-bcc" class="block text-sm font-semibold text-neutral-700 mb-1.5">BCC (Blindkopie)</label>
                        <input id="multi-rem-bcc" type="text" bind:value={bcc} class="orga-input-clear py-3 sm:py-2.5 text-sm" disabled={isSending} placeholder="z.B. info@mail.de" />
                    </div>
                </div>
            {/if}

            <div class="p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
                <h3 class="font-bold text-indigo-900 text-sm mb-2">Zu bestätigende Termine wählen</h3>
                {#if availableAppointments.length === 0}
                    <p class="text-xs text-indigo-700 italic">Keine zukünftigen Termine gefunden.</p>
                {:else}
                    <div class="max-h-48 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-2">
                        {#each availableAppointments as app}
                            <label class="flex items-center gap-3 p-2 bg-white rounded-lg border border-indigo-100 cursor-pointer hover:border-indigo-300 transition-colors">
                                <input type="checkbox" checked={selectedAppointmentIds.includes(app.id)} onchange={() => handleToggle(app.id)} class="text-indigo-600 rounded focus:ring-indigo-500 w-4 h-4" />
                                <div class="flex-1 min-w-0">
                                    <p class="text-sm font-bold text-neutral-900">{new Date(app.appointment).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })} um {new Date(app.appointment).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr</p>
                                    <p class="text-xs text-neutral-500 truncate">{app.description || 'Termin'}</p>
                                </div>
                            </label>
                        {/each}
                    </div>
                {/if}
            </div>

            <div>
                <label for="multi-rem-message" class="block text-sm font-semibold text-neutral-700 mb-1.5">Nachricht (Wird automatisch generiert)</label>
                <textarea id="multi-rem-message" bind:value={message} rows="8" class="orga-input-clear py-3 sm:py-2.5 text-sm resize-none custom-scrollbar" required disabled={isSending}></textarea>
            </div>

            <div class="pt-4 flex flex-col-reverse sm:flex-row justify-end gap-3 border-t border-neutral-100 mt-6">
                <button type="button" onclick={close} class="orga-button-ghost w-full sm:w-auto py-3 sm:py-2.5" disabled={isSending}>Abbrechen</button>
                <button type="submit" class="orga-button-primary w-full sm:w-auto py-3 sm:py-2.5 {method === 'whatsapp' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30' : 'shadow-indigo-600/30'}" disabled={isSending}>
                    {isSending ? 'Wird verarbeitet...' : (method === 'email' ? 'E-Mail senden ✉️' : 'WhatsApp öffnen 💬')}
                </button>
            </div>
        </form>
    </div>
</dialog>