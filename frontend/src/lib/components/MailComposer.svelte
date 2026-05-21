<script lang="ts">
  import { getMailConfigService } from '$lib/services/mailConfigService.svelte';
  import type { SendEmailInput } from '$lib/services/emailService.svelte';
  import { pb } from '$lib/services/pocketbase';
  import { onMount } from 'svelte';
  import { orgaStore } from "$lib/stores/orgaStore.svelte";

  interface Props {
    initialData?: any;
    onSend: (input: SendEmailInput) => Promise<void>;
    onClose: () => void;
  }

  let { initialData = null, onSend, onClose } = $props();

  const mailConfigService = getMailConfigService();

  let to = $state('');
  let cc = $state('');
  let bcc = $state('');
  let showCcBcc = $state(false);
  let subject = $state('');
  let body = $state('');
  let isSending = $state(false);
  let error = $state<string | null>(null);
  let attachments = $state<File[]>([]);

  let systemContacts = $state<{name: string, email: string}[]>([]);
  let isSuperAdmin = $derived(pb.authStore.isSuperuser || pb.authStore.model?.role === 'superadmin');

  $effect.pre(() => {
    if (initialData) {
      to = initialData.to || '';
      subject = initialData.subject || '';
      body = initialData.body || '';
    }
  });

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
    } catch (err) {
      console.error(err);
    }
  });

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
    
    error = `✅ Erfolgreich ${allEmails.length} Empfänger als BCC (Blindkopie) eingefügt!`;
    setTimeout(() => { if (error?.includes('Erfolgreich')) error = null; }, 5000);
  }

  async function handleSend() {
    // Validate
    if (!to.trim() && !cc.trim() && !bcc.trim()) {
      error = 'Mindestens ein Empfänger (An, CC oder BCC) ist erforderlich';
      return;
    }
    if (!subject.trim()) {
      error = 'Betreff ist erforderlich';
      return;
    }

    isSending = true;
    error = null;

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

    const textEmail = `${body.trim()}\n\n--\n${userName}\n${compName}\n${compStreet}, ${compCity}\nTelefon: ${userPhone}\nE-Mail: ${userEmail}\nWeb: ${compWeb}`;

    const htmlEmail = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #374151; max-width: 650px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <div style="background-color: #fdf8f6; padding: 25px 30px; border-bottom: 3px solid #c66a4d;">
                <h1 style="color: #954028; margin: 0; font-size: 24px; letter-spacing: -0.5px;">${compName}</h1>
                <p style="color: #c66a4d; margin: 4px 0 0 0; font-size: 14px; font-weight: 500;">Alltagshilfe • Betreuung • Organisation</p>
            </div>
            <div style="padding: 30px; font-size: 15px; line-height: 1.6; color: #1f2937; background-color: #ffffff;">
                ${body.trim().replace(/\n/g, '<br>')}
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

    try {
      await onSend({
        to: to.trim(),
        cc: cc.trim() || undefined,
        bcc: bcc.trim() || undefined,
        subject: subject.trim(),
        body: textEmail,
        body_html: htmlEmail,
        attachments: attachments.length > 0 ? attachments : undefined
      });
    } catch (err) {
      error = err instanceof Error ? err.message : 'Fehler beim Versenden';
    } finally {
      isSending = false;
    }
  }
</script>

<!-- Modal backdrop -->
<div
  class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
  onclick={onClose}
  role="button"
  tabindex="0"
  onkeydown={(e) => e.key === 'Escape' && onClose()}
>
  <!-- Modal -->
  <div
    class="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col relative"
    onclick={(e) => e.stopPropagation()}
    onkeydown={(e) => e.stopPropagation()}
    role="dialog"
    tabindex="-1"
  >
    <!-- Header -->
    <div class="border-b border-neutral-100 p-5 sm:p-8 shrink-0 relative">
      <button aria-label="Schließen" onclick={onClose} class="absolute top-4 sm:top-6 right-4 sm:right-6 w-10 h-10 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-full flex items-center justify-center transition-colors z-10"><svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
      <div class="flex items-center gap-3 pr-10">
        <span class="text-2xl">✉️</span>
        <h2 class="text-xl sm:text-2xl font-bold text-neutral-900 truncate">Neue E-Mail</h2>
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto custom-scrollbar p-5 sm:p-8">
      {#if error}
        <div class="mb-4 p-4 {error.includes('✅') ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'} border rounded-lg flex gap-3">
          <span class="text-xl shrink-0 mt-0.5">{error.includes('✅') ? '✅' : '⚠️'}</span>
          <p class="text-sm font-semibold">{error.replace('✅ ', '')}</p>
        </div>
      {/if}

      <div class="space-y-4">
        <!-- To field -->
        <div>
          <div class="flex items-center justify-between mb-1">
            <label for="to" class="block text-sm font-bold text-neutral-700">An *</label>
            <button type="button" onclick={() => showCcBcc = !showCcBcc} class="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors">{showCcBcc ? '− CC / BCC ausblenden' : '+ CC / BCC hinzufügen'}</button>
          </div>
        <div class="flex flex-col sm:flex-row gap-2">
          <input
            id="to"
            type="text"
            bind:value={to}
            list="contact-list"
            placeholder="klient@beispiel.de"
            class="orga-input-clear w-full flex-1 py-3 sm:py-2"
            disabled={isSending}
          />
          <div class="flex gap-2">
            <select 
              class="orga-input-clear flex-1 sm:flex-none sm:w-auto bg-neutral-50 cursor-pointer sm:max-w-48 text-sm font-medium py-3 sm:py-2"
              onchange={(e) => {
                  const val = (e.currentTarget as HTMLSelectElement).value;
                  if(val) addRecipient(val);
                  (e.currentTarget as HTMLSelectElement).value = "";
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
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 animate-enter">
            <!-- CC field -->
            <div>
              <label for="cc" class="block text-sm font-bold text-neutral-700 mb-1.5">CC (Kopie)</label>
              <input
                id="cc"
                type="email"
                bind:value={cc}
                placeholder="kollege@beispiel.de"
                class="orga-input-clear w-full py-3 sm:py-2"
                disabled={isSending}
              />
            </div>

            <!-- BCC field -->
            <div>
              <label for="bcc" class="block text-sm font-bold text-neutral-700 mb-1.5">BCC (Blindkopie)</label>
              <input
                id="bcc"
                type="email"
                bind:value={bcc}
                placeholder="privat@beispiel.de"
                class="orga-input-clear w-full py-3 sm:py-2"
                disabled={isSending}
              />
            </div>
          </div>
        {/if}

        <!-- Subject -->
        <div>
          <label for="subject" class="block text-sm font-bold text-neutral-700 mb-1.5">Betreff *</label>
          <input
            id="subject"
            type="text"
            bind:value={subject}
            placeholder="Betreff eingeben"
            class="orga-input-clear w-full py-3 sm:py-2"
            disabled={isSending}
          />
        </div>

        <!-- Body -->
        <div>
          <label for="body" class="block text-sm font-bold text-neutral-700 mb-1.5">Nachricht</label>
          <textarea
            id="body"
            bind:value={body}
            placeholder="Schreibe hier deine Nachricht..."
            rows="8"
            class="orga-input-clear w-full py-3 sm:py-2 resize-none custom-scrollbar min-h-40"
            disabled={isSending}
          ></textarea>
        </div>

    {#if attachments.length > 0}
      <div class="flex flex-wrap gap-2 pt-2">
        {#each attachments as file, i}
          <div class="flex items-center gap-2 bg-neutral-100 text-neutral-700 px-3 py-1.5 rounded-lg text-sm border border-neutral-200 shadow-sm animate-enter">
            <span class="truncate max-w-50 font-medium">📎 {file.name}</span>
            <button type="button" onclick={() => removeAttachment(i)} class="text-rose-500 hover:text-rose-700 font-bold ml-1" disabled={isSending} title="Anhang entfernen">✕</button>
          </div>
        {/each}
      </div>
    {/if}

        {#if mailConfigService.config}
          <div class="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100">
            <p class="text-xs text-indigo-900">
              <span class="font-medium">Von:</span> {mailConfigService.config.email_address}
            </p>
          </div>
        {/if}
      </div>
    </div>

    <!-- Footer -->
  <div class="border-t border-neutral-100 p-5 sm:p-8 bg-neutral-50/50 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 shrink-0">
    <div class="w-full md:w-auto">
      <input type="file" id="file-upload" multiple class="hidden" onchange={handleFileSelect} disabled={isSending} />
      <button type="button" onclick={() => document.getElementById('file-upload')?.click()} class="w-full md:w-auto flex items-center justify-center gap-2 text-sm font-bold text-neutral-600 hover:text-indigo-600 transition-colors px-4 py-3 md:py-2.5 bg-white hover:bg-indigo-50 border border-neutral-200 hover:border-indigo-200 rounded-xl shadow-sm" disabled={isSending}>
        <span class="text-lg">📎</span> Datei anhängen
      </button>
    </div>
    <div class="flex flex-col-reverse md:flex-row gap-3 w-full md:w-auto">
      <button onclick={onClose} disabled={isSending} class="orga-button-ghost w-full md:w-auto py-3 md:py-2.5 px-6">
        Abbrechen
      </button>
      <button onclick={handleSend} disabled={isSending} class="orga-button-primary shadow-indigo-600/20 w-full md:w-auto py-3 md:py-2.5 px-6">
        {isSending ? 'Wird gesendet...' : 'Senden'}
      </button>
    </div>
  </div>
  </div>
</div>
