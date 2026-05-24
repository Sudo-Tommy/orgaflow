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
    let compLogo = '';
    if (user && user.company) {
        const cId = Array.isArray(user.company) ? user.company[0] : user.company;
        const comp = orgaStore.company?.data?.find((c: any) => c.id === cId);
        if (comp) {
            compName = comp.name || compName;
            compStreet = `${comp.street || ''} ${comp.housenr || ''}`.trim() || compStreet;
            compCity = `${comp.zip || ''} ${comp.city || ''}`.trim() || compCity;
            compWeb = comp.website || compWeb;
            if (comp.logo) {
                const logoFilename = Array.isArray(comp.logo) ? comp.logo[0] : comp.logo;
                const logoUrl = pb.files.getURL(comp, logoFilename);
                compLogo = logoUrl.startsWith('http') ? logoUrl.replace(/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?/, 'https://www.ihre-seniorenassistenz.com') : `https://www.ihre-seniorenassistenz.com${logoUrl}`;
            }
        }
    }

    const textEmail = `${body.trim()}\n\n--\n${userName}\n${compName}\n${compStreet}, ${compCity}\nTelefon: ${userPhone}\nE-Mail: ${userEmail}\nWeb: ${compWeb}`;

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
                ${body.trim().replace(/\n/g, '<br>')}
            </div>
            <div style="background-color: #f8fafc; padding: 30px; border-top: 1px solid #e5e7eb;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size: 14px; color: #4b5563;">
                    <tr>
                        <td valign="top" style="padding-bottom: 20px;">
                            <strong style="color: #111827; font-size: 16px;">${userName}</strong><br>
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
                                        <div style="margin-bottom: 4px;">📞 <a href="tel:${userPhone}" style="color: #c66a4d; text-decoration: none; font-weight: 500;">${userPhone}</a></div>
                                        <div style="margin-bottom: 4px;">✉️ <a href="mailto:${userEmail}" style="color: #c66a4d; text-decoration: none; font-weight: 500;">${userEmail}</a></div>
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
  class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-0 sm:p-4"
  onclick={onClose}
  role="button"
  tabindex="0"
  onkeydown={(e) => e.key === 'Escape' && onClose()}
>
  <!-- Modal -->
  <div
    class="bg-white sm:rounded-3xl shadow-2xl max-w-2xl w-full h-dvh sm:h-auto sm:max-h-[90dvh] overflow-hidden flex flex-col relative"
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
              <button type="button" onclick={addAllToBcc} class="orga-button-ghost flex-1 sm:flex-none shrink-0 py-3 sm:py-2 px-3 text-xs bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm whitespace-nowrap hover:bg-indigo-100 transition-colors" disabled={isSending} title="Rundmail an alle (BCC)">
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
            <div class="flex items-center justify-between gap-2 bg-neutral-100 text-neutral-700 px-3 py-1.5 rounded-lg text-sm border border-neutral-200 shadow-sm animate-enter max-w-full">
              <span class="truncate flex-1 min-w-0 font-medium">📎 {file.name}</span>
              <button type="button" onclick={() => removeAttachment(i)} class="shrink-0 text-rose-500 hover:text-rose-700 font-bold ml-1" disabled={isSending} title="Anhang entfernen">✕</button>
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
  <div class="border-t border-neutral-100 p-4 sm:p-6 md:p-8 bg-white/95 backdrop-blur-md flex flex-wrap sm:flex-nowrap justify-between items-center gap-2 sm:gap-4 shrink-0 sticky bottom-0 z-20 pb-[max(env(safe-area-inset-bottom,0px),1rem)]">
    <!-- UX: Ergonomische Daumen-Leiste für Aktionen auf Mobile -->
    <div class="w-auto flex-1 sm:flex-none">
      <input type="file" id="file-upload" multiple class="hidden" onchange={handleFileSelect} disabled={isSending} />
      <button type="button" onclick={() => document.getElementById('file-upload')?.click()} aria-label="Datei anhängen" class="w-full sm:w-auto flex items-center justify-center gap-2 text-xs sm:text-sm font-bold text-neutral-600 hover:text-indigo-600 transition-colors px-4 py-3 sm:py-2.5 bg-white hover:bg-indigo-50 border border-neutral-200 hover:border-indigo-200 rounded-xl shadow-sm active:scale-95" disabled={isSending}>
        <span class="text-lg">📎</span> <span class="hidden sm:inline">Datei anhängen</span>
      </button>
    </div>
    <div class="flex flex-row gap-2 sm:gap-3 w-full sm:w-auto mt-2 sm:mt-0 order-last sm:order-0">
      <button onclick={onClose} aria-label="Abbrechen" disabled={isSending} class="orga-button-ghost flex-1 sm:flex-none py-3 sm:py-2.5 px-4 sm:px-6 active:scale-95 text-xs sm:text-sm flex justify-center items-center gap-1.5">
        <span class="sm:hidden text-lg">❌</span>
        <span class="hidden sm:inline">Abbrechen</span>
      </button>
      <button onclick={handleSend} aria-label="E-Mail senden" disabled={isSending} class="orga-button-primary shadow-indigo-600/20 flex-1 sm:flex-none py-3 sm:py-2.5 px-4 sm:px-6 active:scale-95 text-xs sm:text-sm flex justify-center items-center gap-1.5">
        {#if isSending}<div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>{/if}
        <span class="sm:hidden text-lg">{isSending ? '' : '📤'}</span>
        <span class="hidden sm:inline">{isSending ? 'Sendet...' : 'Senden'}</span>
      </button>
    </div>
  </div>
  </div>
</div>
