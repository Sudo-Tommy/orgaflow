<script lang="ts">
    import { pb } from '$lib/services/pocketbase';
    import { rbacService } from '$lib/services/rbacService.svelte';
    import { autoGrow } from '$lib/actions/autoGrow';
    import { onMount } from 'svelte';
    import { sendComposedEmail } from '$lib/services/emailComposerSender';
    
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
    
    let isSuperAdmin = $derived(pb.authStore.isSuperuser || pb.authStore.model?.role === 'superadmin' || pb.authStore.model?.role === 'developer' || rbacService.isOwner);

    onMount(async () => {
        try {
            const [clients, contacts, users, insurancies, homes] = await Promise.all([
                pb.collection('clients').getFullList({ fields: 'name_first,name_last,email', requestKey: null }).catch(()=>[]),
                pb.collection('contacts').getFullList({ fields: 'name_first,name_last,email', requestKey: null }).catch(()=>[]),
                pb.collection('users').getFullList({ fields: 'name_first,name_last,email', requestKey: null }).catch(()=>[]),
                pb.collection('insurancies').getFullList({ fields: 'name,email', requestKey: null }).catch(()=>[]),
                pb.collection('retirement_homes').getFullList({ fields: 'name,email', requestKey: null }).catch(()=>[])
            ]);

            const all = [...clients, ...contacts, ...users, ...insurancies, ...homes]
                .filter(record => record.email)
                .map(record => ({
                    name: `${record.name_first || ''} ${record.name_last || ''}`.trim() || record.name || 'Unbekannt',
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
        input.value = '';
    }

    function removeAttachment(index: number) {
        attachments = attachments.filter((_, i) => i !== index);
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
            await sendComposedEmail({
                to,
                cc: cc || undefined,
                bcc: bcc || undefined,
                subject,
                message,
                attachments,
                currentUser: pb.authStore.model
            });

            successMsg = 'Ihre E-Mail wurde erfolgreich versendet!';
            to = '';
            cc = '';
            bcc = '';
            subject = '';
            message = '';
            attachments = [];
            showCcBcc = false;
            
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

<div class="orga-card-white p-6 flex flex-col">
    <h2 class="text-lg font-bold text-neutral-800 dark:text-neutral-100 mb-6 flex items-center gap-2">
        <span>✉️</span> Neue E-Mail verfassen
    </h2>
    
    {#if successMsg}
        <div class="mb-6 p-4 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800 rounded-xl text-sm font-semibold animate-enter flex items-center gap-2">
            <span>✅</span> {successMsg}
        </div>
    {/if}
    
    {#if errorMsg}
        <div class="mb-6 p-4 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800 rounded-xl text-sm font-semibold animate-enter flex items-center gap-2">
            <span>❌</span> {errorMsg}
        </div>
    {/if}
    
    <form onsubmit={handleSend} class="space-y-5">
        <div class="grid grid-cols-1 gap-5">
            <div>
                <div class="flex items-center justify-between mb-1.5">
                    <label for="to" class="block text-sm font-bold text-neutral-700 dark:text-neutral-300">Empfänger (Kommagetrennt für mehrere)</label>
                    <button type="button" onclick={() => showCcBcc = !showCcBcc} class="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 transition-colors cursor-pointer">{showCcBcc ? '− CC / BCC ausblenden' : '+ CC / BCC hinzufügen'}</button>
                </div>
                <div class="flex flex-col sm:flex-row gap-2">
                    <input type="text" id="to" bind:value={to} list="contact-list" class="orga-input-clear w-full flex-1 py-3 sm:py-2" placeholder="klient@beispiel.de, kollege@beispiel.de" disabled={isSending} />
                    <div class="flex gap-2">
                        <select 
                            class="orga-input-clear flex-1 sm:flex-none sm:w-auto bg-neutral-50 dark:bg-slate-800 cursor-pointer sm:max-w-48 text-sm font-medium py-3 sm:py-2"
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
                            <button type="button" onclick={addAllToBcc} class="orga-button-ghost flex-1 sm:flex-none py-3 sm:py-2 px-3 text-xs bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 shadow-sm whitespace-nowrap hover:bg-indigo-100 transition-colors cursor-pointer" disabled={isSending} title="Rundmail an alle (BCC)">
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
                        <label for="cc" class="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">CC (Kopie)</label>
                        <input type="text" id="cc" bind:value={cc} list="contact-list" class="orga-input-clear w-full py-3 sm:py-2" placeholder="z.B. kollege@beispiel.de" disabled={isSending} />
                    </div>
                    <div>
                        <label for="bcc" class="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">BCC (Blindkopie)</label>
                        <input type="text" id="bcc" bind:value={bcc} list="contact-list" class="orga-input-clear w-full py-3 sm:py-2" placeholder="z.B. privat@beispiel.de" disabled={isSending} />
                    </div>
                </div>
            {/if}
            
            <div>
                <label for="subject" class="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">Betreff</label>
                <input type="text" id="subject" bind:value={subject} class="orga-input-clear w-full py-3 sm:py-2" placeholder="Terminbestätigung..." required disabled={isSending} />
            </div>
        </div>
        
        <div>
            <label for="message" class="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">Nachricht</label>
            <textarea id="message" bind:value={message} use:autoGrow rows="6" class="orga-input-clear w-full py-3 sm:py-2 auto-grow" placeholder="Guten Tag..." required disabled={isSending}></textarea>
            
            {#if attachments.length > 0}
                <div class="flex flex-wrap gap-2 mt-3">
                    {#each attachments as file, i}
                        <div class="flex items-center gap-2 bg-neutral-100 dark:bg-slate-800 text-neutral-700 dark:text-neutral-200 px-3 py-1.5 rounded-lg text-sm border border-neutral-200 dark:border-slate-700 shadow-sm animate-enter">
                            <span class="truncate max-w-50 font-medium">📎 {file.name}</span>
                            <button type="button" onclick={() => removeAttachment(i)} class="text-rose-500 hover:text-rose-700 font-bold ml-1 cursor-pointer" disabled={isSending} title="Anhang entfernen">✕</button>
                        </div>
                    {/each}
                </div>
            {/if}
        </div>
        
        <div class="pt-2 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div class="w-full md:w-auto">
                <input type="file" id="file-upload" multiple class="hidden" onchange={handleFileSelect} disabled={isSending} />
                <button type="button" onclick={() => document.getElementById('file-upload')?.click()} class="w-full md:w-auto flex items-center justify-center gap-2 text-sm font-bold text-neutral-600 dark:text-neutral-300 hover:text-indigo-600 transition-colors px-4 py-3 md:py-2.5 bg-neutral-50 dark:bg-slate-800 hover:bg-indigo-50 border border-neutral-200 dark:border-slate-700 hover:border-indigo-200 rounded-xl shadow-sm cursor-pointer" disabled={isSending}>
                    <span class="text-lg">📎</span> Datei anhängen
                </button>
            </div>
            
            <button type="submit" class="orga-button-primary w-full md:w-auto cursor-pointer" disabled={isSending}>
                {#if isSending}
                    <div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                    Wird gesendet...
                {:else}
                    <span>Nachricht senden</span>
                {/if}
            </button>
        </div>
    </form>
</div>