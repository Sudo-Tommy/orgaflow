<!-- src/lib/components/clients/ClientDocumentSendModal.svelte -->
<script lang="ts">
    import { X, Send, Mail, CheckCircle2 } from 'lucide-svelte';
    import { buildPrioritizedContacts, type AvailableContact } from '$lib/services/contactPickerService';
    import { sendClientDocumentEmail } from './clientDocumentService';
    import { toastStore } from '$lib/services/toastService.svelte';
    import { autoGrow } from '$lib/actions/autoGrow';

    let { client } = $props<{ client: any }>();
    let dialog: HTMLDialogElement;
    let docFileName = $state('');
    let emailTo = $state('');
    let cc = $state('');
    let showCc = $state(false);
    let subject = $state('');
    let message = $state('');
    let isSending = $state(false);
    let contacts = $state<AvailableContact[]>([]);
    let selectedEmails = $state<string[]>([]);

    export function open(fileName: string) {
        docFileName = fileName;
        contacts = buildPrioritizedContacts(client)
            .filter(c => !!c.email)
            .sort((a, b) => a.name.localeCompare(b.name, 'de', { sensitivity: 'base' }));
        const first = contacts[0];
        selectedEmails = first ? [first.email] : [];
        emailTo = selectedEmails.join(', ');
        cc = '';
        showCc = false;
        const clientName = `${client?.name_first || ''} ${client?.name_last || ''}`.trim();
        subject = `Dokument: ${fileName} - ${clientName}`;
        updateTemplate(first ? [first] : []);
        dialog?.showModal();
    }

    export function close() { dialog?.close(); }

    function updateTemplate(active: AvailableContact[]) {
        const sal = active.length === 1 && active[0].salutation ? active[0].salutation : (active.length > 1 ? 'Sehr geehrte Damen und Herren,' : 'Guten Tag,');
        const cName = `${client?.name_first || ''} ${client?.name_last || ''}`.trim();
        message = `${sal}\n\nanbei erhalten Sie das Dokument "${docFileName}" zu ${cName}.\n\nMit freundlichen Grüßen\nIhre Seniorenassistenz`;
    }

    function toggleContact(c: AvailableContact) {
        selectedEmails = selectedEmails.includes(c.email) ? selectedEmails.filter(e => e !== c.email) : [...selectedEmails, c.email];
        emailTo = selectedEmails.join(', ');
        updateTemplate(contacts.filter(co => selectedEmails.includes(co.email)));
    }

    async function handleSend() {
        if (!emailTo.trim()) { toastStore.warning('Bitte mindestens einen Empfänger angeben.'); return; }
        isSending = true;
        try {
            await sendClientDocumentEmail(client, docFileName, emailTo, subject, message, cc);
            toastStore.success(`Dokument erfolgreich an ${emailTo} versendet.`);
            close();
        } catch (err: any) { toastStore.error(err?.message || 'Fehler beim Senden.'); }
        finally { isSending = false; }
    }
</script>

<dialog
    bind:this={dialog}
    class="zero-inner-scroll-modal p-0 bg-transparent backdrop:bg-slate-950/65 backdrop:backdrop-blur-md w-full max-w-lg mx-auto my-6 sm:my-10 rounded-3xl border-none outline-none shadow-2xl"
    onclick={(e) => { if (e.target === dialog) close(); }}
>
    <div class="p-5 sm:p-6 space-y-4 bg-white dark:bg-slate-900 text-neutral-900 dark:text-slate-100 rounded-3xl border border-neutral-100 dark:border-slate-800">
        <div class="flex items-center justify-between border-b dark:border-slate-800 pb-3">
            <h3 class="font-black text-sm flex items-center gap-2">
                <Mail class="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Dokument an Kontakte senden
            </h3>
            <button onclick={close} class="p-1 hover:bg-neutral-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"><X class="w-4 h-4" /></button>
        </div>

        <div class="p-2.5 bg-neutral-50 dark:bg-slate-800/60 rounded-xl text-xs flex items-center gap-2 border dark:border-slate-700">
            <span class="text-base">📄</span>
            <span class="font-bold truncate flex-1 text-slate-800 dark:text-slate-200">{docFileName}</span>
        </div>

        <div>
            <div class="flex items-center justify-between mb-1.5">
                <span class="text-[11px] font-bold text-neutral-500 dark:text-slate-400 uppercase">Kontakte des Klienten</span>
                <button type="button" onclick={() => showCc = !showCc} class="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer">
                    {showCc ? '- CC verbergen' : '+ CC hinzufügen'}
                </button>
            </div>
            <div class="flex flex-wrap gap-1.5">
                {#each contacts as c}
                    <button
                        type="button"
                        onclick={() => toggleContact(c)}
                        class="px-2.5 py-1 text-xs rounded-xl border flex items-center gap-1.5 transition-all cursor-pointer {selectedEmails.includes(c.email) ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-700 dark:text-indigo-300 font-bold' : 'bg-white dark:bg-slate-800 border-neutral-200 dark:border-slate-700 text-neutral-600 dark:text-slate-300'}"
                    >
                        <span>{c.name}</span>
                        {#if c.directRole}<span class="text-[9px] px-1 py-0.2 bg-neutral-200/60 dark:bg-slate-700 rounded-md text-neutral-500 dark:text-slate-400">{c.directRole}</span>{/if}
                        {#if selectedEmails.includes(c.email)}<CheckCircle2 class="w-3 h-3 text-indigo-600 dark:text-indigo-400 shrink-0" />{/if}
                    </button>
                {/each}
            </div>
        </div>

        <div class="space-y-2 text-xs">
            <input type="text" bind:value={emailTo} placeholder="An: empfaenger@beispiel.de" class="w-full px-3 py-2 border rounded-xl dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
            {#if showCc}<input type="text" bind:value={cc} placeholder="CC: kopie@beispiel.de" class="w-full px-3 py-2 border rounded-xl dark:bg-slate-800 dark:border-slate-700 dark:text-white" />{/if}
            <input type="text" bind:value={subject} placeholder="Betreff" class="w-full px-3 py-2 border rounded-xl font-medium dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
            <textarea use:autoGrow bind:value={message} class="auto-grow w-full px-3 py-2 border rounded-xl dark:bg-slate-800 dark:border-slate-700 dark:text-white resize-none overflow-hidden min-h-24"></textarea>
        </div>

        <div class="flex justify-end gap-2 pt-2 border-t dark:border-slate-800">
            <button onclick={close} class="px-4 py-2 text-xs font-bold text-neutral-500 hover:bg-neutral-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer">Abbrechen</button>
            <button onclick={handleSend} disabled={isSending} class="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-50">
                <Send class="w-3.5 h-3.5" />
                <span>{isSending ? 'Wird gesendet...' : 'Jetzt senden'}</span>
            </button>
        </div>
    </div>
</dialog>
