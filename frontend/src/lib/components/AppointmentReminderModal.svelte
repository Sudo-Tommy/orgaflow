<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    import { sendEmail } from "$lib/services/emailService";
    import { toastStore } from "$lib/services/toastService.svelte";

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
        subject = `Terminerinnerung: ${dateStr}`;
        
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
        
        const salutation = cl?.salutation === 'Herr' ? `Sehr geehrter Herr ${cl.name_last},` : 
                          (cl?.salutation === 'Frau' ? `Sehr geehrte Frau ${cl.name_last},` : 
                          `Guten Tag ${cl?.name_first || ''} ${cl?.name_last || ''},`.trim());

        message = `${salutation}\n\nhiermit möchten wir Sie an unseren gemeinsamen Termin am ${dateStr} um ${timeStr} Uhr erinnern.\n\nIhre Termine können Sie auch jederzeit im Klienten-Portal einsehen:\n👉 https://www.ihre-seniorenassistenz.com/portal\n\nWir freuen uns auf Sie!`;
        
        dialog?.showModal();
    }

    export function close() {
        dialog?.close();
        appointment = null;
        client = null;
    }

    // Wenn man den Reiter zwischen E-Mail/WhatsApp wechselt, wird der Empfänger automatisch getauscht
    $effect(() => {
        if (method === 'email') {
            recipient = client?.email || "";
        } else {
            recipient = client?.handy || client?.phone || "";
        }
    });

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

                const textEmail = `${message.trim()}\n\n--\n${finalUserName}\nIhre Seniorenassistenz\nDreyhauptstraße 2, 06108 Halle (Saale)\nTelefon: ${finalUserPhone}\nE-Mail: ${finalUserEmail}\nWeb: www.ihre-seniorenassistenz.com`;

                const htmlEmail = `
                    <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #374151; max-width: 650px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                        <div style="background-color: #fdf8f6; padding: 25px 30px; border-bottom: 3px solid #c66a4d;">
                            <h1 style="color: #954028; margin: 0; font-size: 24px; letter-spacing: -0.5px;">Ihre Seniorenassistenz</h1>
                            <p style="color: #c66a4d; margin: 4px 0 0 0; font-size: 14px; font-weight: 500;">Alltagshilfe • Betreuung • Organisation</p>
                        </div>
                        <div style="padding: 30px; font-size: 15px; line-height: 1.6; color: #1f2937; background-color: #ffffff;">
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
                        </div>
                        <div style="background-color: #f8fafc; padding: 25px 30px; border-top: 1px solid #e5e7eb;">
                            <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 13px; color: #4b5563;">
                                <tr>
                                    <td style="padding-bottom: 15px;">
                                        <strong style="color: #111827; font-size: 16px;">${finalUserName}</strong><br>
                                        <span style="color: #c66a4d;">Ihre Ansprechperson</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="line-height: 1.6;">
                                        <strong>Ihre Seniorenassistenz</strong><br>
                                        Dreyhauptstraße 2<br>
                                        06108 Halle (Saale)<br><br>
                                        📞 <a href="tel:${finalUserPhone}" style="color: #c66a4d; text-decoration: none;">${finalUserPhone}</a><br>
                                        ✉️ <a href="mailto:${finalUserEmail}" style="color: #c66a4d; text-decoration: none;">${finalUserEmail}</a><br>
                                        🌐 <a href="https://www.ihre-seniorenassistenz.com" style="color: #c66a4d; text-decoration: none;">www.ihre-seniorenassistenz.com</a>
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

                toastStore.success("Erinnerung per E-Mail versendet!");
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
        
        <h2 class="text-xl sm:text-2xl font-bold text-neutral-900 mb-2 flex items-center gap-2"><span>⏰</span> Termin-Erinnerung</h2>
        <p class="text-sm text-neutral-500 mb-6">Senden Sie eine kurze Erinnerung an den Klienten.</p>

        <form onsubmit={handleSend} class="space-y-4">
            <!-- Toggle E-Mail vs WhatsApp -->
            <div class="flex gap-2 p-1 bg-neutral-100 rounded-lg">
                <button type="button" onclick={() => method = 'email'} class="flex-1 py-2 text-sm font-bold rounded-md transition-colors {method === 'email' ? 'bg-white shadow-sm text-indigo-600' : 'text-neutral-500 hover:text-neutral-700'}">✉️ E-Mail</button>
                <button type="button" onclick={() => method = 'whatsapp'} class="flex-1 py-2 text-sm font-bold rounded-md transition-colors {method === 'whatsapp' ? 'bg-white shadow-sm text-emerald-600' : 'text-neutral-500 hover:text-neutral-700'}">💬 WhatsApp</button>
            </div>

            <div>
                <div class="flex items-center justify-between mb-1.5">
                    <label for="rem-recipient" class="block text-sm font-semibold text-neutral-700">{method === 'email' ? 'E-Mail Adresse' : 'Handynummer'}</label>
                    {#if method === 'email'}
                        <button type="button" onclick={() => showCcBcc = !showCcBcc} class="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors">{showCcBcc ? '− CC / BCC ausblenden' : '+ CC / BCC hinzufügen'}</button>
                    {/if}
                </div>
                <input id="rem-recipient" type="text" bind:value={recipient} class="orga-input-clear py-3 sm:py-2.5 text-sm" required disabled={isSending} />
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

            <div class="pt-4 flex flex-col-reverse sm:flex-row justify-end gap-3 border-t border-neutral-100 mt-6">
                <button type="button" onclick={close} class="orga-button-ghost w-full sm:w-auto py-3 sm:py-2.5" disabled={isSending}>Abbrechen</button>
                <button type="submit" class="orga-button-primary w-full sm:w-auto py-3 sm:py-2.5 {method === 'whatsapp' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30' : 'shadow-indigo-600/30'}" disabled={isSending}>
                    {isSending ? 'Wird verarbeitet...' : (method === 'email' ? 'E-Mail senden ✉️' : 'WhatsApp öffnen 💬')}
                </button>
            </div>
        </form>
    </div>
</dialog>