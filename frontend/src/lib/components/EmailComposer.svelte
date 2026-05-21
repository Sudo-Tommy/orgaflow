<script lang="ts">
    import { pb } from '$lib/services/pocketbase';
    import { sendEmail } from '$lib/services/emailService';
    import { onMount } from 'svelte';
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    
    let to = $state('');
    let cc = $state('');
    let bcc = $state('');
    let showCcBcc = $state(false);
    let subject = $state('');
    let message = $state('');
    
    let isSending = $state(false);
    let successMsg = $state('');
    let errorMsg = $state('');
    
    let attachments = $state<File[]>([]);

    let systemContacts = $state<{name: string, email: string}[]>([]);
    
    let isSuperAdmin = $derived(pb.authStore.isSuperuser || pb.authStore.model?.role === 'superadmin');

    onMount(async () => {
        try {
            const [clients, contacts, users] = await Promise.all([
                pb.collection('clients').getFullList({ fields: 'name_first,name_last,email', requestKey: null }).catch(()=>[]),
                pb.collection('contacts').getFullList({ fields: 'name_first,name_last,email', requestKey: null }).catch(()=>[]),
                pb.collection('users').getFullList({ fields: 'name_first,name_last,email', requestKey: null }).catch(()=>[])
            ]);

            const all = [...clients, ...contacts, ...users]
                .filter(record => record.email)
                .map(record => ({
                    name: `${record.name_first || ''} ${record.name_last || ''}`.trim() || 'Unbekannt',
                    email: record.email
                }));

            systemContacts = Array.from(new Map(all.map(item => [item.email, item])).values());
        } catch (error) {
            console.error("Konnte Adressbuch nicht laden:", error);
        }
    });

    function addRecipient(email: string) {
        if (to) {
            const currentEmails = to.split(',').map(e => e.trim());
            if (!currentEmails.includes(email)) to += `, ${email}`;
        } else {
            to = email;
        }
    }

    function addAllToBcc() {
        showCcBcc = true;
        const allEmails = systemContacts.map(c => c.email).filter(e => e);
        const currentBcc = bcc ? bcc.split(',').map(e => e.trim()).filter(e => e) : [];
        const combined = Array.from(new Set([...currentBcc, ...allEmails]));
        bcc = combined.join(', ');
        
        const myEmail = pb.authStore.model?.email || '';
        if (!to && myEmail) to = myEmail;
        
        successMsg = `${allEmails.length} Empfänger wurden sicher als Blindkopie (BCC) eingefügt!`;
        setTimeout(() => { successMsg = ''; }, 5000);
    }

    function handleFileSelect(e: Event) {
        const input = e.target as HTMLInputElement;
        if (input.files) {
            attachments = [...attachments, ...Array.from(input.files)];
        }
        input.value = ''; // Reset für erneute Auswahl
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
                resolve(result.split(',')[1]); // Nur den Base64-Teil ohne "data:..." Präfix zurückgeben
            };
            reader.onerror = error => reject(error);
        });
    }
    
    async function handleSend(e: Event) {
        e.preventDefault();
        if ((!to && !cc && !bcc) || !subject || !message) {
            errorMsg = 'Bitte geben Sie einen Empfänger, Betreff und eine Nachricht an.';
            return;
        }
        
        isSending = true;
        errorMsg = '';
        successMsg = '';
        
        try {
            // 1. Daten des eingeloggten Nutzers abrufen
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

            // 2. Wunderschöne HTML-Mail (Header, Body, Footer) zusammenbauen
            const htmlEmail = `
                <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #374151; max-width: 650px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                    <div style="background-color: #fdf8f6; padding: 25px 30px; border-bottom: 3px solid #c66a4d;">
                        <h1 style="color: #954028; margin: 0; font-size: 24px; letter-spacing: -0.5px;">${compName}</h1>
                        <p style="color: #c66a4d; margin: 4px 0 0 0; font-size: 14px; font-weight: 500;">Alltagshilfe • Betreuung • Organisation</p>
                    </div>
                    <div style="padding: 30px; font-size: 15px; line-height: 1.6; color: #1f2937; background-color: #ffffff;">
                        ${message.replace(/\n/g, '<br>')}
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
            
            // 3. Fallback für einfache Text-Clients
            const textEmail = `${message}\n\n--\n${userName}\n${compName}\n${compStreet}, ${compCity}\nTelefon: ${userPhone}\nE-Mail: ${userEmail}\nWeb: ${compWeb}`;

            // 4. Anhänge vorbereiten
            const attachmentPayload = await Promise.all(attachments.map(async (file) => ({
                filename: file.name,
                content: await fileToBase64(file),
                encoding: 'base64'
            })));

            await sendEmail({
                to,
                cc: cc || undefined,
                bcc: bcc || undefined,
                subject,
                text: textEmail,
                html: htmlEmail,
                attachments: attachmentPayload.length > 0 ? attachmentPayload : undefined
            });
            
            try {
                if (pb.authStore.model) {
                    let fullTo = to;
                    if (cc) fullTo += `, CC: ${cc}`;
                    if (bcc) fullTo += `, BCC: ${bcc}`;
                    
                    await pb.collection('mailbox_messages').create({
                        user: pb.authStore.model.id,
                        folder: 'Sent',
                        from_address: `${userName} <${userEmail}>`,
                        to_address: fullTo,
                        subject: subject,
                        body_text: textEmail,
                        body_html: htmlEmail,
                        date: new Date().toISOString(),
                        is_read: true
                    });
                }
            } catch (e) { console.warn("E-Mail konnte nicht im Postfach gespeichert werden", e); }

            successMsg = 'Ihre E-Mail wurde erfolgreich versendet!';
            to = '';
            cc = '';
            bcc = '';
            subject = '';
            message = '';
            attachments = [];
            showCcBcc = false;
            
            // Erfolgsmeldung nach 5 Sekunden ausblenden
            setTimeout(() => {
                successMsg = '';
            }, 5000);
        } catch (err: any) {
            errorMsg = err.message || 'Es ist ein Fehler aufgetreten.';
        } finally {
            isSending = false;
        }
    }
</script>

<div class="orga-card-white p-6 flex flex-col h-full">
    <h2 class="text-lg font-bold text-neutral-800 mb-6 flex items-center gap-2">
        <span>✉️</span> Neue E-Mail verfassen
    </h2>
    
    {#if successMsg}
        <div class="mb-6 p-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-sm font-semibold animate-enter flex items-center gap-2">
            <span>✅</span> {successMsg}
        </div>
    {/if}
    
    {#if errorMsg}
        <div class="mb-6 p-4 bg-rose-50 text-rose-800 border border-rose-200 rounded-xl text-sm font-semibold animate-enter flex items-center gap-2">
            <span>❌</span> {errorMsg}
        </div>
    {/if}
    
    <form onsubmit={handleSend} class="space-y-5 flex-1 flex flex-col">
        <div class="grid grid-cols-1 gap-5">
            <div>
                <div class="flex items-center justify-between mb-1.5">
                    <label for="to" class="block text-sm font-bold text-neutral-700">Empfänger (Kommagetrennt für mehrere)</label>
                    <button type="button" onclick={() => showCcBcc = !showCcBcc} class="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors">{showCcBcc ? '− CC / BCC ausblenden' : '+ CC / BCC hinzufügen'}</button>
                </div>
            <div class="flex flex-col sm:flex-row gap-2">
                <input type="text" id="to" bind:value={to} list="contact-list" class="orga-input-clear w-full flex-1 py-3 sm:py-2" placeholder="klient@beispiel.de, kollege@beispiel.de" disabled={isSending} />
                <div class="flex gap-2">
                    <select 
                        class="orga-input-clear flex-1 sm:flex-none sm:w-auto bg-neutral-50 cursor-pointer sm:max-w-48 text-sm font-medium py-3 sm:py-2"
                        onchange={(e) => {
                            const val = (e.target as HTMLSelectElement).value;
                            if(val) addRecipient(val);
                            (e.target as HTMLSelectElement).value = "";
                        }}
                        disabled={isSending}
                    >
                        <option value="">+ Adressbuch</option>
                        {#each systemContacts as contact}
                            <option value={contact.email}>{contact.name} ({contact.email})</option>
                        {/each}
                    </select>
                {#if isSuperAdmin}
                    <button type="button" onclick={addAllToBcc} class="orga-button-ghost flex-1 sm:flex-none py-3 sm:py-2 px-3 text-xs bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm whitespace-nowrap hover:bg-indigo-100 transition-colors" disabled={isSending} title="Rundmail an alle (BCC)">
                        📢 An Alle
                    </button>
                {/if}
                </div>
                </div>
                <datalist id="contact-list">
                    {#each systemContacts as contact}
                        <option value={contact.email}>{contact.name}</option>
                    {/each}
                </datalist>
            </div>
            
            {#if showCcBcc}
                <div class="grid grid-cols-1 md:grid-cols-2 gap-5 animate-enter">
                    <div>
                        <label for="cc" class="block text-sm font-bold text-neutral-700 mb-1.5">CC (Kopie)</label>
                        <input type="text" id="cc" bind:value={cc} list="contact-list" class="orga-input-clear w-full py-3 sm:py-2" placeholder="z.B. kollege@beispiel.de" disabled={isSending} />
                    </div>
                    <div>
                        <label for="bcc" class="block text-sm font-bold text-neutral-700 mb-1.5">BCC (Blindkopie)</label>
                        <input type="text" id="bcc" bind:value={bcc} list="contact-list" class="orga-input-clear w-full py-3 sm:py-2" placeholder="z.B. privat@beispiel.de" disabled={isSending} />
                    </div>
                </div>
            {/if}
            
            <div>
                <label for="subject" class="block text-sm font-bold text-neutral-700 mb-1.5">Betreff</label>
                <input type="text" id="subject" bind:value={subject} class="orga-input-clear w-full py-3 sm:py-2" placeholder="Terminbestätigung..." required disabled={isSending} />
            </div>
        </div>
        
        <div class="flex-1 flex flex-col">
            <label for="message" class="block text-sm font-bold text-neutral-700 mb-1.5">Nachricht</label>
            <textarea id="message" bind:value={message} class="orga-input-clear flex-1 min-h-40 resize-none w-full py-3 sm:py-2" placeholder="Guten Tag..." required disabled={isSending}></textarea>
            
            <!-- Dateianhänge Vorschau -->
            {#if attachments.length > 0}
                <div class="flex flex-wrap gap-2 mt-3">
                    {#each attachments as file, i}
                        <div class="flex items-center gap-2 bg-neutral-100 text-neutral-700 px-3 py-1.5 rounded-lg text-sm border border-neutral-200 shadow-sm animate-enter">
                            <span class="truncate max-w-50 font-medium">📎 {file.name}</span>
                            <button type="button" onclick={() => removeAttachment(i)} class="text-rose-500 hover:text-rose-700 font-bold ml-1" disabled={isSending} title="Anhang entfernen">✕</button>
                        </div>
                    {/each}
                </div>
            {/if}
        </div>
        
        <div class="pt-2 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div class="w-full md:w-auto">
                <!-- Verstecktes Dateifeld, wird über den Button getriggert -->
                <input type="file" id="file-upload" multiple class="hidden" onchange={handleFileSelect} disabled={isSending} />
                <button type="button" onclick={() => document.getElementById('file-upload')?.click()} class="w-full md:w-auto flex items-center justify-center gap-2 text-sm font-bold text-neutral-600 hover:text-indigo-600 transition-colors px-4 py-3 md:py-2.5 bg-neutral-50 hover:bg-indigo-50 border border-neutral-200 hover:border-indigo-200 rounded-xl shadow-sm" disabled={isSending}>
                    <span class="text-lg">📎</span> Datei anhängen
                </button>
            </div>
            
            <button type="submit" class="orga-button-primary w-full md:w-auto" disabled={isSending}>
                {#if isSending}
                    <svg class="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Wird gesendet...
                {:else}
                    <span>Nachricht senden</span>
                {/if}
            </button>
        </div>
    </form>
</div>