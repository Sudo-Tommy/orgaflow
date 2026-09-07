<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    import { sendEmail } from "$lib/services/emailService"; // FIX: No change needed, this is the utility file
    import { googleCalendarService, type GoogleCalendarStatus } from "$lib/services/googleCalendarService";
    import { toastStore } from "$lib/services/toastService.svelte";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import { buildPrioritizedContacts } from "$lib/services/contactPickerService";
    import { Paperclip, X, Eye, Check, ChevronDown, Plus, Minus, Bold, Italic, Underline } from 'lucide-svelte';
    import PdfPreviewModal from "$lib/components/PdfPreviewModal.svelte"; // Import the modal

    // svelte-ignore non_reactive_update
    let dialog: HTMLDialogElement;
    let googleStatus = $state<GoogleCalendarStatus | null>(null);
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
    let generatedBody = $state<string | null>(null);

    let availableContacts = $state<any[]>([]);
    let showContactDropdown = $state(false);
    let selectedContactRefs = $state<any[]>([]);
    let futureAppointments = $state<any[]>([]);
    let selectedFutureAppIds = $state<string[]>([]);
    let includeFutureApps = $state(false);
    let attachments = $state<File[]>([]);
    let pdfPreviewModal = $state<ReturnType<typeof PdfPreviewModal>>();
    let isGenerating = $state(false);
    let textareaRef = $state<HTMLTextAreaElement | null>(null);

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

    async function toggleClientDocumentAttachment(record: any, filename: string) {
        if (isSending) return;

        const isCurrentlyAttached = attachments.some(a => a.name === filename);

        if (isCurrentlyAttached) {
            // Remove the attachment
            attachments = attachments.filter(a => a.name !== filename);
            toastStore.info(`Anhang "${filename}" entfernt.`);
        } else {
            // Add the attachment
            try {
                const url = pb.files.getURL(record, filename);
                const response = await fetch(url);
                if (!response.ok) throw new Error();
                const blob = await response.blob();
                // We create a File object so it seamlessly fits into the existing attachments logic
                const file = new File([blob], filename, { type: blob.type || 'application/octet-stream' });
                attachments = [...attachments, file];
                toastStore.success(`Anhang "${filename}" hinzugefügt.`);
            } catch (e) {
                toastStore.error("Dokument konnte nicht geladen werden.");
            }
        }
    }

    function previewClientDocument(record: any, filename: string) {
        if (pdfPreviewModal) {
            pdfPreviewModal.open(pb.files.getURL(record, filename), filename, filename);
        }
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

    function buildAvailableContacts(targetClient?: any) {
        return buildPrioritizedContacts(targetClient);
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
            const emailsCount = recipient.split(',').map(e => e.trim()).filter(Boolean).length;
            if (method === 'email' && emailsCount > 1) {
                newSalutation = "Sehr geehrte Damen und Herren,";
            } else {
            const recipientRecord = client?.expand?.caregiver || client;
            newSalutation = recipientRecord?.salutation === 'Herr' ? `Sehr geehrter Herr ${recipientRecord.name_last},` : 
                            (recipientRecord?.salutation === 'Frau' ? `Sehr geehrte Frau ${recipientRecord.name_last},` : 
                            `Guten Tag ${recipientRecord?.name_first || ''} ${recipientRecord?.name_last || ''},`.trim());
            }
        }
        
        const isClientOnly = selectedContactRefs.length > 0 ? selectedContactRefs.every(c => c.isClient) : (client?.expand?.caregiver ? false : true);
        const clientName = `${client?.name_first || ''} ${client?.name_last || ''}`.trim();
        const isPast = appointment?.appointment && new Date(appointment.appointment) < new Date();
        
        const baseText = isPast
            ? (isClientOnly ? `hiermit erhalten Sie eine Nachricht zu unserem gemeinsamen Termin vom ${appDate}.` : `hiermit erhalten Sie eine Nachricht zu unserem Termin mit ${clientName} vom ${appDate}.`)
            : (isClientOnly ? `hiermit möchten wir Sie an unseren gemeinsamen Termin am ${appDate} um ${appTime} erinnern.` : `hiermit möchten wir Sie an unseren Termin mit ${clientName} am ${appDate} um ${appTime} erinnern.`);
            
        if (generatedBody) {
            message = `${newSalutation}\n\n${generatedBody}`;
        } else {
            message = `${newSalutation}\n\n${baseText}\n\n\n👉 https://www.ihre-seniorenassistenz.com/portal\n\n`;
        }
    }

    function applyFormat(type: 'bold' | 'italic' | 'underline') {
        if (!textareaRef) return;
        const isWa = method === 'whatsapp';
        
        let startTag = '', endTag = '';
        if (type === 'bold') { startTag = isWa ? '*' : '<b>'; endTag = isWa ? '*' : '</b>'; }
        else if (type === 'italic') { startTag = isWa ? '_' : '<i>'; endTag = isWa ? '_' : '</i>'; }
        else if (type === 'underline') { startTag = isWa ? '' : '<u>'; endTag = isWa ? '' : '</u>'; }
        if (!startTag) return; // Not supported in WhatsApp

        const start = textareaRef.selectionStart;
        const end = textareaRef.selectionEnd;
        const selectedText = message.substring(start, end);
        message = message.substring(0, start) + startTag + selectedText + endTag + message.substring(end);
        setTimeout(() => { textareaRef?.focus(); textareaRef?.setSelectionRange(start + startTag.length, end + startTag.length); }, 10);
    }

    export function open(app: any, cl: any) {
        appointment = app;
        client = cl;
        
        // Automatische Vorwahl der Methode: Hat der Klient kein E-Mail, aber eine Handynummer, wird direkt WhatsApp vorgeschlagen
        const caregiver = cl?.expand?.caregiver;
        let emails = [];
        if (caregiver?.email) emails.push(caregiver.email);
        else if (cl?.email) emails.push(cl.email);
        if (cl?.mailing_list && Array.isArray(cl.mailing_list)) {
            emails = [...emails, ...cl.mailing_list];
        }
        const emailStr = [...new Set(emails)].filter(Boolean).join(", ");
        const phoneStr = caregiver?.handy || caregiver?.phone || cl?.handy || cl?.phone || "";
        method = emailStr ? 'email' : (phoneStr ? 'whatsapp' : 'email');
        recipient = method === 'email' ? emailStr : phoneStr;
        
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

        const targetClient = client || app.expand?.client?.[0] || app.expand?.client || (app.client && orgaStore.clients?.data?.find(c => c.id === (Array.isArray(app.client) ? app.client[0] : app.client)));
        availableContacts = buildAvailableContacts(targetClient);
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
        // clientFileDocs = []; // Nicht mehr benötigt, da direkt client.documents verwendet wird
        attachments = [];

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

        googleCalendarService.getStatus().then(s => googleStatus = s).catch(() => {});

        dialog?.showModal();
    }

    export function close() {
        dialog?.close();
        appointment = null;
        client = null;
    }

    function changeMethod(newMethod: 'email' | 'whatsapp') {
        method = newMethod;
        if (method === 'email') {
            let emails = [];
            if (client?.expand?.caregiver?.email) emails.push(client.expand.caregiver.email);
            else if (client?.email) emails.push(client.email);
            if (client?.mailing_list && Array.isArray(client.mailing_list)) emails = [...emails, ...client.mailing_list];
            recipient = [...new Set(emails)].filter(Boolean).join(", ");
        } else {
            recipient = client?.expand?.caregiver?.handy || client?.expand?.caregiver?.phone || client?.handy || client?.phone || "";
        }
        selectedContactRefs = [];
        if (recipient) {
            const isEmail = method === 'email';
            const matched = availableContacts.find(c => (isEmail ? c.email : c.phone) === recipient);
            if (matched) selectedContactRefs = [matched];
        }
        updateMessage();
    }

    async function generateAiMessage() {
        isGenerating = true;
        generatedBody = null;
        try {
            const isClientOnly = selectedContactRefs.length > 0 ? selectedContactRefs.every(c => c.isClient) : (client?.expand?.caregiver ? false : true);
            const clientNameStr = client ? `${client.name_first || ''} ${client.name_last || ''}`.trim() : 'unserem Klienten';
            
            const recipientContext = isClientOnly 
                ? "Die Nachricht richtet sich direkt an den Klienten selbst (z.B. 'an unseren gemeinsamen Termin zur Begleitung bei...')."
                : `Die Nachricht richtet sich an einen Betreuer oder Angehörigen. Erwähne den Termin in Bezug auf den Klienten (z.B. 'an unseren gemeinsamen Termin zur Begleitung unserer Klientin Frau/Herr ${client?.name_last || clientNameStr} bei...').`;

            const internalNotes = appointment?.internal_notes || appointment?.notes || "";
            const internalNotesContext = internalNotes ? `\nInterne Notizen: ${internalNotes}` : "";

            const prompt = `Du bist ein professioneller Assistent für eine Seniorenassistenz. Formuliere eine prägnante Terminerinnerung.

Kontext des Termins:
Datum: ${appDate}
Uhrzeit (Beginn des Termins): ${appTime}
Anliegen: ${appDesc}
Ort des Termins (NICHT der Treffpunkt): ${appLocation || 'Beim Klienten zu Hause'}${internalNotesContext}

Empfänger-Kontext:
${recipientContext}
Wichtige Regel zum Treffpunkt: Sofern in den internen Notizen nicht ausdrücklich ein anderer Treffpunkt vereinbart wurde, treffen wir uns IMMER beim Klienten zu Hause.

Anweisungen an dich:
1. Erinnere freundlich an den Termin am ${appDate} um ${appTime} Uhr.
2. Berechne eine logische und absolut fehlerfreie Ankunftszeit (Treffpunktzeit) bei der Klientin / dem Klienten. Beachte zwingend diese Reihenfolge:
   - WICHTIGSTE REGEL (PRIORITÄT 1): Wenn in den internen Notizen eine Abholzeit, ein Taxi oder ein Fahrdienst mit einer bestimmten Uhrzeit erwähnt wird (z.B. "Taxi 07:15"), MUSST du deine Ankunft logischerweise VOR diese Abholzeit legen (ca. 15-30 Minuten VOR dem Taxi), damit du rechtzeitig vor Ort bist, um die Abfahrt zu begleiten! Beziehe dich bei der Berechnung dann NICHT mehr auf den Terminbeginn, sondern NUR auf die Taxi-/Abfahrtszeit.
   - Regel A: Wenn im Kontext ein Rollstuhl erwähnt wird (hoher Vorbereitungsaufwand), setze die Ankunftszeit 1 Stunde VOR der Termin-Uhrzeit an.
   - Regel B: Wenn der Pflegedienst den Klienten vorbereitet (startklar macht), genügt ein kurzer Puffer von 15 Minuten vorab.
   - Regel C: In allen anderen Standardfällen (ohne Taxi/Fahrdienst) plane einen entspannten Vorbereitungspuffer von 30 Minuten VOR dem eigentlichen Termin ein.
   Erwähne diese berechnete Ankunftszeit freundlich und konkret im Einleitungstext (z.B. "Um ausreichend Zeit für die Vorbereitung zu haben, werde ich bereits um [berechnete Uhrzeit] Uhr bei Ihnen sein.").
3. Erstelle eine Sektion "Kleine Checkliste vorab:" mit 3-5 relevanten, sehr spezifischen Hinweisen für den Klienten oder Pflegedienst. Überlege tiefgreifend, was bei diesem konkreten Anliegen fachlich, körperlich oder organisatorisch wichtig ist (z.B. bei Podologie keine Thrombosestrümpfe; bei körperlichen Untersuchungen wie MRT, EKG oder Mammografie zweiteilige, leicht an- und auszuziehende Kleidung wählen; an notwendige Hilfsmittel wie Rollator denken; bei längeren Wartezeiten ein Getränk einpacken). Beziehe auch zwingend alle Informationen aus den internen Notizen mit ein.
4. Formatiere die Checkliste AUSSCHLIESSLICH exakt in diesem Format (mit Leerzeichen, eckigen Klammern und Bindestrich):
Kleine Checkliste vorab:
   [ ] - Liegt die Versichertenkarte bereit?
   [ ] - [Dein spezifischer Hinweis 1]
   [ ] - [Dein spezifischer Hinweis 2]
5. Verwende absolut KEINERLEI Sonderzeichen wie *, _, # oder • (außer dem "   [ ] - " in der Checkliste). Der gesamte Text muss reiner, unformatierter Text sein.
6. Vermeide redundante, offensichtliche Floskeln, außer der zwingend zu nennenden berechneten Ankunftszeit. Halte den Text stattdessen kurz und informativ.
7. Füge nach der Checkliste in einem neuen Absatz diesen Satz hinzu: "Ihre Termine können Sie auch jederzeit im Klienten-Portal einsehen: https://www.ihre-seniorenassistenz.com/portal"
8. Schließe ab mit:\n"Mit freundlichen Grüßen\nIhre Seniorenassistenz"

WICHTIG: Beginne NICHT mit einer Anrede ("Sehr geehrte..."), da diese schon vorhanden ist. Beginne direkt mit dem ersten Satz, kleingeschrieben (z.B. "gerne möchte ich...").`;

            const microserviceUrl = import.meta.env.DEV ? 'http://localhost:3000' : '';
            const res = await fetch(`${microserviceUrl}/api/emails/ai/transcribe`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${pb.authStore.token}`
                },
                body: JSON.stringify({
                    prompt: prompt,
                    inputText: "Generiere die Nachricht basierend auf dem Prompt."
                })
            });

            const data = await res.json();
            if (!res.ok || data.error) throw new Error(data.error || "Server-Fehler bei der KI-Anfrage.");

            generatedBody = data.text;
            updateMessage();
        } catch (err: any) {
            toastStore.error(err.message || "KI-Vorschlag konnte nicht generiert werden.");
        } finally {
            isGenerating = false;
        }
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

                let attachmentPayload;
                if (attachments.length > 0) {
                    attachmentPayload = await Promise.all(attachments.map(async (file) => ({
                        filename: file.name,
                        content: await fileToBase64(file),
                        encoding: 'base64'
                    })));
                }

                const textEmail = `${message.trim()}\n${reportText}\n${futureAppsText}\n--\n${finalUserName}\n${compName}\n${compStreet}, ${compCity}\nTelefon: ${finalUserPhone}\nE-Mail: ${finalUserEmail}\nWeb: ${compWeb}`;

                const htmlEmail = `
                    <div style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; color: #374151; max-width: 650px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);">
                        <div style="background-color: #fdf8f6; padding: 30px; border-bottom: 3px solid #458893;">
                            <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td valign="middle">
                                        <h1 style="color: #20565d; margin: 0; font-size: 24px; letter-spacing: -0.5px; font-weight: 800;">${compName}</h1>
                                        <p style="color: #458893; margin: 4px 0 0 0; font-size: 14px; font-weight: 600;">Alltagshilfe • Betreuung • Organisation</p>
                                    </td>
                                ${compLogo ? `<td valign="middle" align="right" style="width: 100px;"><img src="${compLogo}" alt="Logo" width="100" style="max-height: 60px; max-width: 100px; object-fit: contain; border-radius: 6px;" /></td>` : ''}
                                </tr>
                            </table>
                        </div>
                        <div style="padding: 35px 30px; font-size: 15px; line-height: 1.7; color: #1f2937; background-color: #ffffff;">
                            ${message.trim().replace(/\n/g, '<br>').replace(/(?:<br>|\s)*(?:👉\s*)?(?:&lt;|<)?\s*https?:\/\/(?:www\.)?ihre-seniorenassistenz\.com\/portal\/?\s*(?:&gt;|>)?/gi, '<br><table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 15px 0;"><tr><td align="center" bgcolor="#458893" style="border-radius: 8px;"><a href="https://www.ihre-seniorenassistenz.com/portal" style="display: inline-block; padding: 12px 24px; color: #ffffff; text-decoration: none; font-weight: bold; font-family: Arial, sans-serif; font-size: 15px;">Zum Klienten-Portal</a></td></tr></table><br>')}
                            
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
                                        <span style="color: #458893; font-weight: 600; font-size: 13px;">Ihre Ansprechperson</span>
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
                                                    <div style="margin-bottom: 4px;">📞 <a href="tel:${finalUserPhone}" style="color: #458893; text-decoration: none; font-weight: 500;">${finalUserPhone}</a></div>
                                                    <div style="margin-bottom: 4px;">✉️ <a href="mailto:${finalUserEmail}" style="color: #458893; text-decoration: none; font-weight: 500;">${finalUserEmail}</a></div>
                                                    <div>🌐 <a href="${compWeb.startsWith('http') ? compWeb : 'https://' + compWeb}" style="color: #458893; text-decoration: none; font-weight: 500;">${compWeb.replace(/^https?:\/\//, '')}</a></div>
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
                    html: htmlEmail,
                    attachments: attachmentPayload
                });

            try {
                if (pb.authStore.model) {
                    let fullTo = recipient;
                    if (cc) fullTo += `, CC: ${cc}`;
                    if (bcc) fullTo += `, BCC: ${bcc}`;
                    
                    const mailboxFormData = new FormData();
                    mailboxFormData.append('send_by', pb.authStore.model.id);
                    mailboxFormData.append('user', pb.authStore.model.id);
                    if (companyId) mailboxFormData.append('company', companyId);
                    mailboxFormData.append('folder', 'Sent');
                    mailboxFormData.append('from_address', `${finalUserName} <${finalUserEmail}>`);
                    mailboxFormData.append('to_address', fullTo);
                    mailboxFormData.append('subject', subject);
                    mailboxFormData.append('body_text', textEmail);
                    mailboxFormData.append('body_html', htmlEmail);
                    mailboxFormData.append('date', new Date().toISOString());
                    mailboxFormData.append('is_read', 'true');
                    
                    for (const file of attachments) {
                        mailboxFormData.append('attachments', file);
                    }
                    
                    await pb.collection('mailbox_messages').create(mailboxFormData);
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
                <button type="button" onclick={() => changeMethod('email')} class="flex-1 py-2 text-sm font-bold rounded-md transition-colors {method === 'email' ? 'bg-white shadow-sm text-brand-600' : 'text-neutral-500 hover:text-neutral-700'}">✉️ E-Mail</button>
                <button type="button" onclick={() => changeMethod('whatsapp')} class="flex-1 py-2 text-sm font-bold rounded-md transition-colors {method === 'whatsapp' ? 'bg-white shadow-sm text-emerald-600' : 'text-neutral-500 hover:text-neutral-700'}">💬 WhatsApp</button>
            </div>

            {#if method === 'email' && googleStatus?.connected}
                <div class="flex items-center gap-2.5 p-3 rounded-xl bg-blue-50/80 border border-blue-200/90 text-xs text-blue-950 shadow-xs">
                    <span class="text-base shrink-0">✉️</span>
                    <div class="flex-1 min-w-0 leading-relaxed">
                        <span class="font-bold text-blue-900">Versand via Google Mail (OAuth2):</span>
                        <span class="text-blue-700 ml-1">Wird direkt von <strong>{googleStatus.googleEmail}</strong> versendet und in Google Mail unter <em>„Gesendet“</em> abgelegt.</span>
                    </div>
                </div>
            {/if}

            <div>
                <div class="flex items-center justify-between mb-1">
                    <label for="rem-recipient" class="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider">{method === 'email' ? 'E-Mail Adresse *' : 'Handynummer *'}</label>
                    {#if method === 'email'}
                        <button type="button" onclick={() => showCcBcc = !showCcBcc} class="text-xs font-bold text-brand-600 hover:text-brand-800 transition-colors flex items-center gap-1 bg-brand-50 px-2.5 py-1 rounded-lg">
                            {#if showCcBcc}<Minus class="w-3.5 h-3.5" /> CC / BCC ausblenden{:else}<Plus class="w-3.5 h-3.5" /> CC / BCC hinzufügen{/if}
                        </button>
                    {/if}
                </div>
                <div class="flex flex-col sm:flex-row gap-2 mt-1.5">
                    <input id="rem-recipient" type="text" bind:value={recipient} class="orga-input-clear min-h-12 flex-1" required disabled={isSending} />
                <div class="relative flex-1 sm:flex-none sm:w-64 z-50">
                    <button type="button" aria-expanded={showContactDropdown} onclick={() => showContactDropdown = !showContactDropdown} disabled={isSending} class="w-full bg-white border border-neutral-200 hover:border-brand-300 rounded-xl px-4 min-h-12 text-sm flex items-center justify-between cursor-pointer transition-all shadow-sm focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none disabled:opacity-50">
                        <span class="font-bold text-neutral-800 truncate">Adressbuch</span>
                        <ChevronDown class="w-4 h-4 text-neutral-400 transition-transform duration-300 {showContactDropdown ? 'rotate-180' : ''}" />
                    </button>
                    {#if showContactDropdown}
                        <button type="button" class="fixed inset-0 z-40 cursor-default outline-none w-full h-full" aria-label="Dropdown schließen" onclick={() => showContactDropdown = false} tabindex="-1"></button>
                        <div class="absolute right-0 sm:left-0 mt-2 bg-white border border-neutral-200 rounded-xl shadow-2xl overflow-hidden max-h-72 overflow-y-auto custom-scrollbar w-72 sm:w-full z-50 p-1.5">
                            {#if availableContacts.some(c => c.isDirect && (method === 'email' ? c.email : c.phone))}
                                <div class="px-2 py-1 text-[11px] font-black text-brand-700 bg-brand-50 rounded-md mb-1 uppercase tracking-wider flex items-center justify-between">
                                    <span>⭐ Direkte Klienten-Kontakte</span>
                                </div>
                                {#each availableContacts.filter(c => c.isDirect && (method === 'email' ? c.email : c.phone)) as c}
                                    <label class="w-full text-left px-3 py-2 min-h-11 hover:bg-brand-50/60 bg-brand-50/25 transition-colors rounded-lg flex flex-col cursor-pointer border border-brand-100/70 mb-1">
                                        <div class="flex items-center justify-between">
                                            <span class="font-bold text-xs text-neutral-900 truncate">{c.name}</span>
                                            <input type="checkbox" checked={recipient.includes(method === 'email' ? c.email : c.phone)} onchange={(e) => toggleRecipient(c, e.currentTarget.checked)} class="w-4 h-4 text-brand-600 border-neutral-300 rounded focus:ring-brand-500" />
                                        </div>
                                        <span class="text-[10px] text-brand-600 font-semibold truncate mt-0.5">{method === 'email' ? c.email : c.phone}</span>
                                    </label>
                                {/each}
                                <div class="border-t border-neutral-200 my-1.5"></div>
                                <div class="px-2 py-1 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                                    <span>Weitere Adressbuch-Kontakte</span>
                                </div>
                            {/if}
                            {#each availableContacts.filter(c => !c.isDirect && (method === 'email' ? c.email : c.phone)) as c}
                                <label class="w-full text-left px-3 py-2 min-h-11 hover:bg-neutral-50 transition-colors rounded-lg flex flex-col cursor-pointer">
                                    <div class="flex items-center justify-between">
                                        <span class="font-medium text-xs text-neutral-800 truncate">{c.name}</span>
                                        <input type="checkbox" checked={recipient.includes(method === 'email' ? c.email : c.phone)} onchange={(e) => toggleRecipient(c, e.currentTarget.checked)} class="w-4 h-4 text-brand-600 border-neutral-300 rounded focus:ring-brand-500" />
                                    </div>
                                    <span class="text-[10px] text-neutral-500 font-medium truncate mt-0.5">{method === 'email' ? c.email : c.phone}</span>
                                </label>
                            {/each}
                            {#if availableContacts.filter(c => method === 'email' ? c.email : c.phone).length === 0}
                                <p class="text-xs text-neutral-500 p-4 text-center font-medium">Keine {method === 'email' ? 'E-Mails' : 'Nummern'} gefunden</p>
                            {/if}
                        </div>
                    {/if}
                </div>
                </div>
            </div>
            
            {#if method === 'email' && showCcBcc}
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-enter">
                    <div>
                        <label for="rem-cc" class="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">CC (Kopie)</label>
                        <input id="rem-cc" type="text" bind:value={cc} class="orga-input-clear min-h-12" disabled={isSending} placeholder="z.B. angehoeriger@mail.de" />
                    </div>
                    <div>
                        <label for="rem-bcc" class="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">BCC (Blindkopie)</label>
                        <input id="rem-bcc" type="text" bind:value={bcc} class="orga-input-clear min-h-12" disabled={isSending} placeholder="z.B. info@mail.de" />
                    </div>
                </div>
            {/if}

            {#if method === 'email'}
                <div>
                    <label for="rem-subject" class="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">Betreff *</label>
                    <input id="rem-subject" type="text" bind:value={subject} class="orga-input-clear min-h-12" required disabled={isSending} />
                </div>

                <div class="p-4 bg-brand-50 border border-brand-100 rounded-xl animate-enter">
                    <h3 class="font-bold text-brand-900 text-sm mb-1">Sichtbare Termindaten anpassen</h3>
                    <p class="text-xs text-brand-700 mb-4">Ändern Sie die Daten nur für diese E-Mail, ohne den Original-Termin zu überschreiben.</p>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label for="rem-app-date" class="block text-[11px] font-bold text-brand-800 uppercase tracking-wider mb-1.5">Datum</label>
                            <input id="rem-app-date" type="text" bind:value={appDate} class="orga-input-clear min-h-12 text-sm bg-white border-brand-200 focus:ring-brand-500" disabled={isSending} />
                        </div>
                        <div>
                            <label for="rem-app-time" class="block text-[11px] font-bold text-brand-800 uppercase tracking-wider mb-1.5">Uhrzeit</label>
                            <input id="rem-app-time" type="text" bind:value={appTime} class="orga-input-clear min-h-12 text-sm bg-white border-brand-200 focus:ring-brand-500" disabled={isSending} />
                        </div>
                    </div>
                    <div class="mb-4">
                        <label for="rem-app-location" class="block text-[11px] font-bold text-brand-800 uppercase tracking-wider mb-1.5">Ort</label>
                        <textarea id="rem-app-location" bind:value={appLocation} rows="2" class="orga-input-clear min-h-12 py-3 text-sm resize-none custom-scrollbar bg-white border-brand-200 focus:ring-brand-500" disabled={isSending}></textarea>
                    </div>
                    <div>
                        <label for="rem-app-desc" class="block text-[11px] font-bold text-brand-800 uppercase tracking-wider mb-1.5">Anliegen / Beschreibung</label>
                        <textarea id="rem-app-desc" bind:value={appDesc} rows="2" class="orga-input-clear min-h-12 py-3 text-sm resize-none custom-scrollbar bg-white border-brand-200 focus:ring-brand-500" disabled={isSending}></textarea>
                    </div>
                </div>
            {/if}

            <div>
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <label for="rem-message" class="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Nachricht *</label>
                    <div class="flex items-center justify-end gap-2">
                        <div class="flex items-center gap-1 bg-white border border-neutral-200 rounded-lg p-0.5 shadow-sm">
                            <button type="button" onclick={() => applyFormat('bold')} class="w-7 h-7 flex items-center justify-center hover:bg-neutral-100 text-neutral-700 rounded text-xs font-bold transition-colors" title="Fett (Bold)"><Bold class="w-3.5 h-3.5"/></button>
                            <button type="button" onclick={() => applyFormat('italic')} class="w-7 h-7 flex items-center justify-center hover:bg-neutral-100 text-neutral-700 rounded text-xs italic transition-colors font-serif" title="Kursiv (Italic)"><Italic class="w-3.5 h-3.5"/></button>
                            {#if method === 'email'}<button type="button" onclick={() => applyFormat('underline')} class="w-7 h-7 flex items-center justify-center hover:bg-neutral-100 text-neutral-700 rounded text-xs underline transition-colors" title="Unterstrichen (Underline)"><Underline class="w-3.5 h-3.5"/></button>{/if}
                        </div>
                        <button type="button" onclick={generateAiMessage} disabled={isSending || isGenerating} class="text-xs font-bold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 px-3 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-sm disabled:opacity-50">
                            {#if isGenerating}
                                <div class="w-3 h-3 border-2 border-brand-200 border-t-brand-700 rounded-full animate-spin"></div> KI schreibt...
                            {:else}
                                <span>✨</span> KI-Vorschlag
                            {/if}
                        </button>
                    </div>
                </div>
                <textarea id="rem-message" bind:this={textareaRef} bind:value={message} rows="8" class="orga-input-clear min-h-48 py-4 text-sm resize-none custom-scrollbar" required disabled={isSending || isGenerating}></textarea>
            </div>

            {#if appReport}
                <div class="pt-4 mt-2 border-t border-neutral-100">
                    <div class="flex items-center justify-between mb-3">
                        <h3 class="text-sm font-bold text-neutral-900 flex items-center gap-2"><span>📝</span> Besuchsbericht anhängen</h3>
                        <label class="flex items-center gap-2 text-sm font-semibold text-neutral-700 cursor-pointer">
                            <input type="checkbox" bind:checked={includeReport} class="w-5 h-5 text-brand-600 rounded focus:ring-brand-500" disabled={isSending} />
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
                            <input type="checkbox" bind:checked={includeFutureApps} class="w-5 h-5 text-brand-600 rounded focus:ring-brand-500" disabled={isSending} />
                            Anhängen
                        </label>
                    </div>
                    
                    {#if includeFutureApps}
                        <div class="space-y-2 max-h-48 overflow-y-auto custom-scrollbar p-1 pr-2">
                            {#each futureAppointments as app}
                                <label class="flex items-start gap-3 p-3 bg-white rounded-xl border border-neutral-200 cursor-pointer hover:border-brand-300 transition-colors shadow-sm focus-within:ring-2 focus-within:ring-brand-500/20">
                                    <input type="checkbox" checked={selectedFutureAppIds.includes(app.id)} onchange={() => {
                                        if(selectedFutureAppIds.includes(app.id)) selectedFutureAppIds = selectedFutureAppIds.filter(id => id !== app.id);
                                        else selectedFutureAppIds = [...selectedFutureAppIds, app.id];
                                    }} class="w-5 h-5 mt-0.5 text-brand-600 rounded focus:ring-brand-500" disabled={isSending} />
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

            {#if method === 'email'}
                <div class="pt-4 mt-2 border-t border-neutral-100">
                    <div class="flex items-center justify-between mb-3">
                        <h3 class="text-sm font-bold text-neutral-900 flex items-center gap-2"><Paperclip class="w-4 h-4 text-neutral-400" /> Anhänge hinzufügen</h3>
                        <input type="file" id="reminder-file-upload" multiple class="hidden" onchange={handleFileSelect} disabled={isSending} />
                        <button type="button" onclick={() => document.getElementById('reminder-file-upload')?.click()} class="text-xs font-bold text-brand-600 hover:text-brand-800 transition-colors flex items-center gap-1 bg-brand-50 px-2 py-1.5 rounded-md" disabled={isSending}>
                            Datei wählen
                        </button>
                    </div>

                    {#if client?.documents && client.documents.length > 0}
                        <div class="mb-4">
                            <p class="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2">Aus Klienten-Akte übernehmen:</p>
                            <div class="flex flex-wrap gap-2">
                                {#each client.documents as docName}
                                    {@const isAttached = attachments.some(a => a.name === docName)}
                                    <div class="flex items-center bg-white border border-neutral-200 rounded-lg text-xs font-bold transition-all shadow-sm {isAttached ? 'border-brand-300 bg-brand-50' : ''}">
                                        <button 
                                            type="button" 
                                            onclick={() => toggleClientDocumentAttachment(client, docName)} 
                                            disabled={isSending} 
                                            class="flex items-center gap-2 px-3 py-1.5 text-neutral-600 hover:text-brand-600 transition-colors"
                                        >
                                            {#if isAttached}
                                                <Check class="w-3 h-3 text-brand-600" />
                                            {:else}
                                                <Paperclip class="w-3 h-3" />
                                            {/if}
                                            <span class="truncate max-w-37.5">{docName}</span>
                                        </button>
                                        <button 
                                            type="button" 
                                            onclick={() => previewClientDocument(client, docName)} 
                                            class="px-2 py-1.5 text-neutral-400 hover:text-neutral-600 transition-colors border-l border-neutral-100" 
                                            title="Vorschau"
                                        >
                                            <Eye class="w-3 h-3" />
                                        </button>
                                    </div>
                                {/each}
                            </div>
                        </div>
                    {/if}
                    
                    {#if attachments.length > 0}
                        <div class="flex flex-wrap gap-2">
                            {#each attachments as file, i}
                                <div class="flex items-center justify-between gap-2 bg-neutral-50 text-neutral-700 px-3 py-1.5 rounded-lg text-xs border border-neutral-200 shadow-sm max-w-full">
                                    <span class="truncate flex-1 font-bold">{file.name}</span>
                                    <button type="button" onclick={() => removeAttachment(i)} class="shrink-0 text-neutral-400 hover:text-rose-600 transition-colors" disabled={isSending}><X class="w-3.5 h-3.5" /></button>
                                </div>
                            {/each}
                        </div>
                    {/if}
                </div>
            {/if}

            <div class="pt-4 flex flex-col-reverse sm:flex-row justify-end gap-3 border-t border-neutral-100 mt-6">
                <button type="button" onclick={close} class="orga-button-ghost w-full sm:w-auto py-3 sm:py-2.5" disabled={isSending}>Abbrechen</button>
                <button type="submit" class="orga-button-primary w-full sm:w-auto py-3 sm:py-2.5 {method === 'whatsapp' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30' : 'shadow-brand-600/30'}" disabled={isSending}>
                    {isSending ? 'Wird verarbeitet...' : (method === 'email' ? 'E-Mail senden ✉️' : 'WhatsApp öffnen 💬')}
                </button>
            </div>
        </form>
    </div>
</dialog>

<PdfPreviewModal bind:this={pdfPreviewModal} />