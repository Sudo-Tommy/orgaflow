<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    import { sendEmail } from "$lib/services/emailService";
    import { toastStore } from "$lib/services/toastService.svelte";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import AppointmentDetailModal from "./AppointmentDetailModal.svelte";

    // svelte-ignore non_reactive_update
    let dialog: HTMLDialogElement;
    // svelte-ignore non_reactive_update
    let detailModal: ReturnType<typeof AppointmentDetailModal>;
    let request = $state<any>(null);
    let status = $state<'accepted' | 'denied' | 'propose'>('accepted');
    
    let emailTo = $state("");
    let emailSubject = $state("");
    let emailText = $state("");
    let isEmailSending = $state(false);
    
    let attachments = $state<File[]>([]);
    let fileInput: HTMLInputElement;

    let propDate = $state("");
    let propTime = $state("");

    let availableContacts = $state<any[]>([]);
    let showContactDropdown = $state(false);
    let selectedContactRefs = $state<any[]>([]);

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
    }

    // Calendar State
    let currentDate = $state(new Date());
    let selectedDate = $state<Date | null>(null);

    let calendarDays = $derived.by(() => {
        const y = currentDate.getFullYear();
        const m = currentDate.getMonth();
        const firstDay = new Date(y, m, 1);
        let startDay = firstDay.getDay() || 7; // 1 = Mo, 7 = So
        startDay -= 1;

        const days = [];
        const prevLastDay = new Date(y, m, 0).getDate();
        for (let i = startDay - 1; i >= 0; i--) {
            days.push({ date: new Date(y, m - 1, prevLastDay - i), isCurrentMonth: false });
        }
        const lastDay = new Date(y, m + 1, 0).getDate();
        for (let i = 1; i <= lastDay; i++) {
            days.push({ date: new Date(y, m, i), isCurrentMonth: true });
        }
        const remaining = 42 - days.length;
        for (let i = 1; i <= remaining; i++) {
            days.push({ date: new Date(y, m + 1, i), isCurrentMonth: false });
        }
        return days;
    });

    let companyApps = $derived.by(() => {
        const apps = orgaStore.appointments?.data || [];
        if (!request?.company) return apps;

        return apps.filter((a: any) => {
            // Termine strikt nach der Firma des zugewiesenen Mitarbeiters filtern
            const uCompId = a.expand?.user?.company;
            if (!uCompId) return false;
            
            if (Array.isArray(uCompId)) return uCompId.includes(request.company);
            if (typeof uCompId === 'string') {
                if (uCompId.startsWith('[')) {
                    try { return JSON.parse(uCompId).includes(request.company); } catch {}
                }
                return uCompId === request.company || uCompId.includes(request.company);
            }
            return false;
        });
    });

    let occupiedData = $derived.by(() => {
        const counts: Record<string, number> = {};
        const times: Record<string, string[]> = {};
        
        companyApps.forEach((r: any) => {
            if (r.appointment) {
                const dObj = new Date(r.appointment as string);
                if (isNaN(dObj.getTime())) return;
                const d = new Date(dObj.getTime() - dObj.getTimezoneOffset() * 60000).toISOString().split('T')[0];
                
                const isBlocked = (r.description && r.description.includes('[BLOCK]'));
                if (isBlocked) {
                    counts[d] = (counts[d] || 0) + 100;
                } else {
                    counts[d] = (counts[d] || 0) + 1;
                }

                if (!isBlocked) {
                    const tStr = dObj.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
                    if (!times[d]) times[d] = [];
                    if (!times[d].includes(tStr)) times[d].push(tStr);
                }
            }
        });

        for (const key in times) {
            times[key].sort();
        }

        const busy: string[] = [];
        for (const [d, count] of Object.entries(counts)) {
            if (count >= 4) busy.push(d); // Threshold
        }
        return { busy, times };
    });

    let occupiedDates = $derived(occupiedData.busy);
    let occupiedTimesByDate = $derived(occupiedData.times);

    function nextMonth() {
        currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    }
    
    function prevMonth() {
        currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    }

    export function open(req: any, newStatus: 'accepted' | 'denied', toEmail: string) {
        request = req;
        status = newStatus;
        emailTo = toEmail;
        
        availableContacts = buildAvailableContacts();
        selectedContactRefs = [];
        if (emailTo) {
            const matched = availableContacts.find(c => c.email === emailTo);
            if (matched) selectedContactRefs = [matched];
        }

        emailSubject = status === 'accepted' ? 'Ihre Terminanfrage wurde bestätigt' : 'Rückmeldung zu Ihrer Terminanfrage';
        
        const savedTemplate = localStorage.getItem(`req_reply_template_${status}`);
        if (savedTemplate) {
            emailText = savedTemplate.replace(/\{\{name\}\}/g, req.sender_name);
        } else {
            emailText = status === 'accepted' 
                ? `Guten Tag ${req.sender_name},\n\nwir freuen uns, Ihnen mitteilen zu können, dass wir Ihren Terminwunsch bestätigen können. Wir werden zum vereinbarten Zeitpunkt für Sie da sein.\n\nBei Rückfragen stehen wir Ihnen jederzeit gerne zur Verfügung.`
                : `Guten Tag ${req.sender_name},\n\nvielen Dank für Ihre Anfrage. Leider können wir Ihren Terminwunsch zu diesem Zeitpunkt so nicht realisieren. Wir melden uns zeitnah noch einmal persönlich bei Ihnen, um eine Alternative zu finden.`;
        }
        
        attachments = [];
        dialog?.showModal();
    }

    export function close() {
        dialog?.close();
    }

    function saveAsTemplate() {
        // Wir ersetzen den aktuellen Namen durch {{name}}, um es generisch zu speichern
        const template = emailText.replace(new RegExp(request?.sender_name || '', 'g'), '{{name}}');
        localStorage.setItem(`req_reply_template_${status}`, template);
        toastStore.success("Text als Standard-Vorlage für künftige Antworten gespeichert.");
    }

    function handleFileSelect(e: Event) {
        const input = e.target as HTMLInputElement;
        if (input.files) {
            attachments = [...attachments, ...Array.from(input.files)];
        }
        input.value = '';
    }

    function removeAttachment(index: number) {
        attachments = attachments.filter((_, i) => i !== index);
    }

    function fileToBase64(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                const result = reader.result as string;
                resolve(result.split(',')[1]);
            };
            reader.onerror = error => reject(error);
        });
    }

    async function handleSend(e: Event) {
        e.preventDefault();
        if (!emailTo || !emailSubject || !emailText) {
            toastStore.warning('Bitte füllen Sie alle Pflichtfelder aus.');
            return;
        }

        if (status === 'propose' && (!propDate || !propTime)) {
            toastStore.warning('Bitte legen Sie ein Datum und eine Uhrzeit für den Vorschlag fest.');
            return;
        }

        isEmailSending = true;

        try {
            const user = pb.authStore.model;
            const userName = user ? `${user.name_first || ''} ${user.name_last || ''}`.trim() : 'Ihre Seniorenassistenz';
            const userEmail = user?.email || 'info@ihre-seniorenassistenz.com';
            const userPhone = user?.handy || user?.tel || '0151 57515432';

            let compName = 'Ihre Seniorenassistenz';
            let compStreet = 'Dreyhauptstraße 2';
            let compCity = '06108 Halle (Saale)';
            let compWeb = 'www.ihre-seniorenassistenz.com';
            if (user && user.company) {
                const cId = Array.isArray(user.company) ? user.company[0] : user.company;
                const comp = orgaStore.company?.data?.find((c: any) => c.id === cId);
                if (comp) {
                    compName = comp.name || compName;
                    compStreet = `${comp.street || ''} ${comp.housenr || ''}`.trim() || compStreet;
                    compCity = `${comp.zip || ''} ${comp.city || ''}`.trim() || compCity;
                    compWeb = comp.website || compWeb;
                }
            }

            const textEmail = `${emailText.trim()}\n\n--\n${userName}\n${compName}\n${compStreet}, ${compCity}\nTelefon: ${userPhone}\nE-Mail: ${userEmail}\nWeb: ${compWeb}`;

            let reqDate = request?.date ? new Date(request.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Kein Datum';
            let reqTime = request?.time ? new Date(request.time).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) + ' Uhr' : 'Keine Uhrzeit';
            const reqAnliegen = request?.request_text ? request.request_text.split('--- Kontaktdaten ---')[0].trim() : '';

            if (status === 'propose') {
                reqDate = new Date(propDate).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
                reqTime = propTime + ' Uhr';
            }
            
            const cardTitle = status === 'propose' ? 'Unser Alternativvorschlag:' : (status === 'accepted' ? 'Ihr neuer Termin:' : 'Ihre ursprüngliche Anfrage:');

            const htmlEmail = `
                <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #374151; max-width: 650px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                    <div style="background-color: #fdf8f6; padding: 25px 30px; border-bottom: 3px solid #c66a4d;">
                        <h1 style="color: #954028; margin: 0; font-size: 24px; letter-spacing: -0.5px;">${compName}</h1>
                        <p style="color: #c66a4d; margin: 4px 0 0 0; font-size: 14px; font-weight: 500;">Alltagshilfe • Betreuung • Organisation</p>
                    </div>
                    <div style="padding: 30px; font-size: 15px; line-height: 1.6; color: #1f2937; background-color: #ffffff;">
                        ${emailText.trim().replace(/\n/g, '<br>')}
                        
                        <div style="background-color: #f8fafc; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 25px 0;">
                            <h3 style="margin-top: 0; color: #111827; font-size: 16px; margin-bottom: 12px;">${cardTitle}</h3>
                            <table cellpadding="0" cellspacing="0" style="font-size: 14px; color: #4b5563; width: 100%;">
                                <tr>
                                    <td style="padding: 4px 0; width: 80px;"><strong>Datum:</strong></td>
                                    <td style="padding: 4px 0;">${reqDate}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 4px 0;"><strong>Uhrzeit:</strong></td>
                                    <td style="padding: 4px 0;">${reqTime}</td>
                                </tr>
                                <tr>
                                    <td colspan="2" style="padding-top: 12px;"><strong>Anliegen:</strong><br><div style="margin-top: 4px; padding: 10px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 6px;">${reqAnliegen.replace(/\n/g, '<br>')}</div></td>
                                </tr>
                            </table>
                        </div>
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
                                        <strong>${compName}</strong><br>
                                        ${compStreet}<br>
                                        ${compCity}<br><br>
                                    📞 <a href="tel:${userPhone}" style="color: #c66a4d; text-decoration: none;">${userPhone}</a><br>
                                    ✉️ <a href="mailto:${userEmail}" style="color: #c66a4d; text-decoration: none;">${userEmail}</a><br>
                                        🌐 <a href="${compWeb.startsWith('http') ? compWeb : 'https://' + compWeb}" style="color: #c66a4d; text-decoration: none;">${compWeb}</a>
                                </td>
                            </tr>
                        </table>
                    </div>
                </div>
            `;

            const attachmentPayload = await Promise.all(attachments.map(async (file) => ({
                filename: file.name,
                content: await fileToBase64(file),
                encoding: 'base64'
            })));

            await sendEmail({
                to: emailTo,
                subject: emailSubject,
                text: textEmail,
                html: htmlEmail,
                attachments: attachmentPayload.length > 0 ? attachmentPayload : undefined
            });

        try {
            if (pb.authStore.model) {
                await pb.collection('mailbox_messages').create({
                    user: pb.authStore.model.id,
                    folder: 'Sent',
                    from_address: `${userName} <${userEmail}>`,
                    to_address: emailTo,
                    subject: emailSubject,
                    body_text: textEmail,
                    body_html: htmlEmail,
                    date: new Date().toISOString(),
                    is_read: true
                });
            }
        } catch (e) { console.warn("E-Mail konnte nicht im Postfach gespeichert werden", e); }

            toastStore.success("E-Mail wurde erfolgreich versendet!");
            close();
        } catch (err: any) {
            console.error(err);
            toastStore.error("Fehler beim Senden der E-Mail: " + err.message);
        } finally {
            isEmailSending = false;
        }
    }
</script>

<dialog bind:this={dialog} class="p-0 bg-transparent backdrop:bg-black/50 backdrop:backdrop-blur-sm w-full max-w-2xl mx-auto my-auto rounded-3xl" onclick={(e) => { if (e.target === dialog) close(); }}>
    <div class="bg-white rounded-3xl p-6 md:p-8 w-full relative shadow-2xl">
        <button aria-label="Schließen" title="Schließen" onclick={close} class="absolute top-5 right-5 w-10 h-10 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-full flex items-center justify-center transition-colors">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        
        <h2 class="text-2xl font-bold text-neutral-900 mb-2 flex items-center gap-2"><span>✉️</span> E-Mail Antwort ({status === 'accepted' ? 'Zusage' : 'Absage'})</h2>
        <p class="text-sm text-neutral-500 mb-6">Passen Sie die Nachricht an oder nutzen Sie Ihre Vorlage.</p>

        <form onsubmit={handleSend} class="space-y-4">
            <div>
                <label for="reply-to" class="block text-sm font-bold text-neutral-700 mb-1.5">Empfänger (An)</label>
                <div class="flex flex-col sm:flex-row gap-2">
                    <input id="reply-to" type="text" bind:value={emailTo} class="orga-input-clear w-full flex-1 py-3 sm:py-2.5 text-sm" placeholder="mail@beispiel.de, zweite@mail.de" required disabled={isEmailSending} />
                    
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
            <div>
                <label for="reply-subject" class="block text-sm font-bold text-neutral-700 mb-1.5">Betreff</label>
                <input id="reply-subject" type="text" bind:value={emailSubject} class="orga-input-clear py-3 sm:py-2.5 text-sm" required disabled={isEmailSending} />
            </div>
            <div>
                {#if status === 'propose'}
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50 border border-blue-200 rounded-xl mb-4 animate-enter">
                        <div class="md:col-span-2">
                            <h3 class="font-bold text-blue-900 text-sm mb-1">Alternativtermin festlegen</h3>
                            <p class="text-xs text-blue-700">Wählen Sie im Kalender einen passenden Termin aus. Die Daten werden automatisch an die E-Mail angehängt.</p>
                        </div>
                        
                        <!-- Kalender -->
                        <div class="orga-card-white p-4 border border-blue-200 shadow-sm bg-white">
                            <div class="flex items-center justify-between mb-4">
                                <h3 class="text-sm font-bold text-brand-950">Wunschdatum *</h3>
                                <div class="flex items-center gap-2 bg-neutral-50 rounded-lg border border-neutral-100 p-1 shadow-sm">
                                    <button type="button" onclick={prevMonth} class="w-6 h-6 flex items-center justify-center hover:bg-neutral-200 rounded text-brand-700 font-bold transition-colors">◀</button>
                                    <span class="text-xs font-bold text-brand-950 w-20 text-center">{currentDate.toLocaleString('de-DE', {month:'short', year:'numeric'})}</span>
                                    <button type="button" onclick={nextMonth} class="w-6 h-6 flex items-center justify-center hover:bg-neutral-200 rounded text-brand-700 font-bold transition-colors">▶</button>
                                </div>
                            </div>
                            <div class="grid grid-cols-7 gap-1 text-center mb-2">
                                {#each ['Mo','Di','Mi','Do','Fr','Sa','So'] as day}<div class="text-[10px] font-bold text-brand-600/80 uppercase tracking-wider py-1">{day}</div>{/each}
                            </div>
                            <div class="grid grid-cols-7 gap-1">
                                {#each calendarDays as day}
                                    {@const isPast = day.date.getTime() < new Date().setHours(0,0,0,0)}
                                    {@const dateStr = new Date(day.date.getTime() - day.date.getTimezoneOffset() * 60000).toISOString().split('T')[0]}
                                    {@const isOccupied = occupiedDates.includes(dateStr)}
                                    {@const dayTimes = occupiedTimesByDate[dateStr] || []}
                                    <button type="button" disabled={isPast || isOccupied} onclick={() => { selectedDate = day.date; propDate = dateStr; }} class="aspect-square flex flex-col items-center justify-start pt-1 rounded-lg text-xs font-bold transition-all border shadow-sm {
                                        isPast ? 'opacity-40 cursor-not-allowed bg-neutral-100 border-neutral-200 text-neutral-400' : 
                                        (isOccupied ? 'bg-rose-50 text-rose-400 border-rose-200/50 cursor-not-allowed' : 'bg-white cursor-pointer hover:bg-brand-50 hover:text-brand-800 hover:border-brand-300 text-neutral-700')
                                    } {!day.isCurrentMonth && !isOccupied && !isPast ? 'opacity-60 text-neutral-500' : ''} {selectedDate && day.date.getTime() === selectedDate.getTime() && !isOccupied && !isPast ? 'bg-brand-600! text-white! border-brand-700! shadow-md scale-105' : ''}">
                                        <span class={isOccupied ? 'line-through decoration-rose-400 decoration-2' : ''}>{day.date.getDate()}</span>
                                        {#if isOccupied}
                                            <span class="text-[7px] font-black uppercase tracking-normal mt-0.5 text-rose-500 truncate max-w-full px-0.5 leading-none">Belegt</span>
                                        {:else if dayTimes.length > 0 && !isPast}
                                            <div class="flex flex-col gap-px mt-0.5 items-center w-full px-0">
                                                {#each dayTimes.slice(0, 2) as t}
                                                <span class="text-[7px] leading-tight font-bold line-through {selectedDate && day.date.getTime() === selectedDate.getTime() ? 'text-brand-200 decoration-brand-200' : 'text-rose-500 decoration-rose-500 opacity-70'}">{t}</span>
                                                {/each}
                                                {#if dayTimes.length > 2}
                                                    <span class="text-[7px] leading-tight font-bold {selectedDate && day.date.getTime() === selectedDate.getTime() ? 'text-brand-100' : 'text-rose-500'}">...</span>
                                                {/if}
                                            </div>
                                        {/if}
                                    </button>
                                {/each}
                            </div>
                        </div>
                        
                        <!-- Uhrzeit & Hinweise -->
                        <div class="flex flex-col gap-4">
                            <div>
                                <label for="prop-time" class="block text-sm font-semibold text-blue-800 mb-1.5">Neue Uhrzeit *</label>
                                <input id="prop-time" type="time" bind:value={propTime} class="orga-input-clear py-2 text-sm bg-white border-blue-200" required disabled={isEmailSending} />
                            </div>
                            {#if selectedDate}
                                {@const selDateStr = new Date(selectedDate!.getTime() - selectedDate!.getTimezoneOffset() * 60000).toISOString().split('T')[0]}
                                {@const dayApps = companyApps.filter((a: any) => {
                                    if (!a.appointment) return false;
                                    const dObj = new Date(a.appointment as string);
                                    if(isNaN(dObj.getTime())) return false;
                                    const dStr = new Date(dObj.getTime() - dObj.getTimezoneOffset() * 60000).toISOString().split('T')[0];
                                    return dStr === selDateStr;
                                }).sort((a: any, b: any) => new Date(a.appointment as string).getTime() - new Date(b.appointment as string).getTime())}
                                
                                {#if dayApps.length > 0}
                                    <div class="mt-3 bg-white border border-blue-200 rounded-xl overflow-hidden shadow-sm flex flex-col animate-enter">
                                        <div class="p-2.5 bg-blue-50 border-b border-blue-100 text-xs text-blue-900 font-bold flex items-center justify-between gap-2">
                                            <div class="flex items-center gap-2"><span class="text-sm">⚠️</span> Folgende Termine sind belegt:</div>
                                        </div>
                                        <div class="max-h-35 overflow-y-auto custom-scrollbar p-2 flex flex-col gap-2 bg-blue-50/30">
                                            {#each dayApps as app}
                                                <button type="button" onclick={() => detailModal?.open(app.id)} class="text-left w-full bg-white p-2 rounded-lg border border-blue-100 hover:border-blue-400 hover:shadow-md transition-all flex justify-between items-center gap-3 group">
                                                    <span class="text-xs font-bold {app.description?.includes('[BLOCK]') ? 'text-rose-600' : 'text-blue-700'} whitespace-nowrap">{new Date(app.appointment as string).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr</span>
                                                    <span class="text-xs text-neutral-700 font-medium line-clamp-1 flex-1">{app.description?.replace('[BLOCK]', '🚫 Blockiert:') || 'Ohne Beschreibung'}</span>
                                                    <span class="opacity-0 group-hover:opacity-100 text-blue-600 text-[10px] uppercase tracking-wider font-bold transition-opacity whitespace-nowrap bg-blue-50 px-2 py-1 rounded">Öffnen</span>
                                                </button>
                                            {/each}
                                        </div>
                                    </div>
                                {/if}
                            {/if}
                            <div class="mt-auto p-3 bg-white/50 rounded-xl border border-blue-100 text-xs text-blue-700 flex gap-2 items-start"><span class="text-base leading-none">💡</span><p>Wählen Sie hier direkt einen passenden Termin, den der Klient nur noch bestätigen muss.</p></div>
                        </div>
                    </div>
                {/if}
                <div class="flex items-center justify-between mb-1.5">
                    <label for="reply-text" class="block text-sm font-bold text-neutral-700">Nachricht</label>
                    <button type="button" onclick={saveAsTemplate} class="text-xs font-bold text-brand-600 hover:text-brand-800 transition-colors" title="Als Standard für zukünftige Antworten speichern">Als Vorlage speichern</button>
                </div>
                <textarea id="reply-text" bind:value={emailText} rows="6" class="orga-input-clear py-3 sm:py-2.5 text-sm resize-y custom-scrollbar" required disabled={isEmailSending}></textarea>
                <p class="text-[10px] text-neutral-400 mt-1">Die Termindaten des Klienten werden automatisch unten an die E-Mail angehängt.</p>
            </div>
            
            <div class="pt-2">
                <input type="file" bind:this={fileInput} multiple class="hidden" onchange={handleFileSelect} disabled={isEmailSending} />
                <button type="button" onclick={() => fileInput.click()} class="flex items-center gap-2 text-sm font-bold text-neutral-600 hover:text-brand-600 transition-colors px-4 py-2 bg-neutral-50 hover:bg-brand-50 border border-neutral-200 hover:border-brand-200 rounded-xl" disabled={isEmailSending}>
                    <span class="text-lg">📎</span> Dokumente / Dateien anhängen
                </button>
            </div>

            {#if attachments.length > 0}
                <div class="flex flex-wrap gap-2 pt-2">
                    {#each attachments as file, i}
                            <div class="flex items-center gap-2 bg-neutral-100 text-neutral-700 px-3 py-1.5 rounded-lg text-sm border border-neutral-200 shadow-sm animate-enter">
                                <span class="truncate max-w-50 font-medium">📎 {file.name}</span>
                            <button type="button" onclick={() => removeAttachment(i)} class="text-rose-500 hover:text-rose-700 font-bold ml-1" disabled={isEmailSending} title="Anhang entfernen">✕</button>
                        </div>
                    {/each}
                </div>
            {/if}

            <div class="pt-4 flex flex-col-reverse sm:flex-row justify-end gap-3 border-t border-neutral-100 mt-6">
                <button type="button" onclick={close} class="orga-button-ghost w-full sm:w-auto py-3 sm:py-2.5" disabled={isEmailSending}>Abbrechen</button>
                <button type="submit" class="orga-button-primary shadow-brand-600/20 w-full sm:w-auto py-3 sm:py-2.5" disabled={isEmailSending}>
                    {isEmailSending ? 'Wird gesendet...' : 'E-Mail senden ✉️'}
                </button>
            </div>
        </form>
    </div>
</dialog>

<AppointmentDetailModal bind:this={detailModal} />