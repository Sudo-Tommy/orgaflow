<script lang="ts">
  import { getMailConfigService } from '$lib/services/mailConfigServiceStore';
  import type { SendEmailInput } from '$lib/types/mail';
  import { pb } from '$lib/services/pocketbase';
  import { onMount } from 'svelte';
  import { orgaStore } from "$lib/stores/orgaStore.svelte";
  import { slide } from 'svelte/transition';
  import { X, Mail, Paperclip, Send, Loader2, Plus, Minus, ChevronDown, Check, Users } from 'lucide-svelte';

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
  let successMsg = $state<string | null>(null); // ARCHITEKTUR-FIX: successMsg deklariert
  let attachments = $state<File[]>([]);

  let isContactDropdownOpen = $state(false);
  let systemContacts = $state<{name: string, email: string}[]>([]);
  let isSuperAdmin = $derived(pb.authStore.isSuperuser || pb.authStore.model?.role === 'superadmin');

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
    const currentEmails = to.split(',').map(e => e.trim()).filter(e => e);
    if (!currentEmails.includes(email)) {
      currentEmails.push(email);
      to = currentEmails.join(', ');
    }
    isContactDropdownOpen = false;
  }

  function removeRecipient(email: string) {
    if (to.includes(email)) {
      to = to.split(',').map(e => e.trim()).filter(e => e !== email).join(', ');
    }
    isContactDropdownOpen = false;
  }

  function addAllToBcc() {
    showCcBcc = true;
    const allEmails = systemContacts.map(c => c.email).filter(e => e);
    const currentBcc = bcc ? bcc.split(',').map(e => e.trim()).filter(e => e) : [];
    const combined = Array.from(new Set([...currentBcc, ...allEmails]));
    bcc = combined.join(', ');
    
    const myEmail = pb.authStore.model?.email || '';
    if (!to && myEmail) to = myEmail;
    
    successMsg = `✅ Erfolgreich ${allEmails.length} Empfänger als BCC (Blindkopie) eingefügt!`;
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

  // ARCHITEKTUR-FIX: InitialData nur einmalig beim Öffnen des Composers setzen
  $effect.pre(() => {
    if (initialData && !to && !subject && !body && attachments.length === 0) { // Only set if composer is empty
      to = initialData.to || '';
      subject = initialData.subject || '';
      body = initialData.body || '';
      if (initialData.attachments) {
        attachments = [...initialData.attachments];
      }
    }
  });

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
            <div style="background-color: #fdf8f6; padding: 30px; border-bottom: 3px solid var(--color-brand-500);">
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
                            <span style="color: var(--color-brand-500); font-weight: 600; font-size: 13px;">Ihre Ansprechperson</span>
                        </td>
                    </tr>
                    <tr>
                        <td valign="top">
                            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size: 13px; color: #4b5563; line-height: 1.6;">
                                <tr>
                                    <td width="50%" valign="top" style="padding-right: 15px; border-right: 1px solid var(--color-neutral-200);">
                                        <strong style="color: #374151; font-size: 14px;">${compName}</strong><br>
                                        ${compStreet}<br>
                                        ${compCity}
                                    </td>
                                    <td width="50%" valign="top" style="padding-left: 20px;">
                                        <div style="margin-bottom: 4px;">📞 <a href="tel:${userPhone}" style="color: var(--color-brand-500); text-decoration: none; font-weight: 500;">${userPhone}</a></div>
                                        <div style="margin-bottom: 4px;">✉️ <a href="mailto:${userEmail}" style="color: var(--color-brand-500); text-decoration: none; font-weight: 500;">${userEmail}</a></div>
                                        <div>🌐 <a href="${compWeb.startsWith('http') ? compWeb : 'https://' + compWeb}" style="color: var(--color-brand-500); text-decoration: none; font-weight: 500;">${compWeb.replace(/^https?:\/\//, '')}</a></div>
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
  class="fixed inset-0 h-dvh bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-0 sm:p-4"
  onclick={onClose}
  role="button"
  tabindex="0"
  onkeydown={(e) => e.key === 'Escape' && onClose()}
>
  <!-- Modal -->
  <div
    class="bg-white sm:rounded-3xl shadow-2xl max-w-2xl w-full h-full sm:h-auto sm:max-h-[90%] overflow-hidden flex flex-col relative border border-neutral-100"
    onclick={(e) => e.stopPropagation()}
    onkeydown={(e) => e.stopPropagation()}
    role="dialog"
    tabindex="-1"
  >
    <!-- Header -->
    <div class="border-b border-neutral-100 p-5 sm:p-8 shrink-0 relative min-h-24">
      <button aria-label="Schließen" onclick={onClose} class="absolute top-4 sm:top-6 right-4 sm:right-6 w-12 h-12 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-full flex items-center justify-center transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-neutral-500 focus-visible:outline-none z-10">
        <X class="w-5 h-5" />
      </button>
      <div class="flex items-center gap-3 pr-10 min-h-12">
        <div class="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shadow-inner shrink-0">
          <Mail class="w-6 h-6" />
        </div>
        <h2 class="text-xl sm:text-2xl font-black text-neutral-900 truncate">Neue E-Mail</h2>
      </div>
    </div>

    <!-- Invisible Backdrop for Custom Dropdown -->
    {#if isContactDropdownOpen}
        <button type="button" class="fixed inset-0 z-40 cursor-default outline-none" aria-label="Dropdown schließen" onclick={() => isContactDropdownOpen = false}></button>
    {/if}

    <!-- Content -->
    <div class="flex-1 overflow-y-auto custom-scrollbar p-5 sm:p-8 bg-neutral-50/30">
      {#if error || successMsg}
        <div transition:slide class="mb-6 p-4 {successMsg ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'} border rounded-2xl flex gap-3 shadow-sm">
          <span class="text-xl shrink-0 mt-0.5">{successMsg ? '✅' : '❌'}</span>
          <p class="text-sm font-semibold">{successMsg ? successMsg.replace('✅ ', '') : error?.replace('❌ ', '')}</p>
        </div>
      {/if}

      <div class="space-y-5">
        <!-- To field -->
        <div class="relative z-50">
          <div class="flex items-center justify-between mb-1">
            <label for="to" class="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">An *</label>
            <button type="button" onclick={() => showCcBcc = !showCcBcc} class="text-xs font-bold text-brand-600 hover:text-brand-800 transition-colors flex items-center gap-1 bg-brand-50 px-2.5 py-1 rounded-lg">
              {#if showCcBcc}<Minus class="w-3.5 h-3.5" /> CC / BCC ausblenden{:else}<Plus class="w-3.5 h-3.5" /> CC / BCC hinzufügen{/if}
            </button>
          </div>
        <div class="flex flex-col sm:flex-row gap-2">
          <input
            id="to"
            type="text"
            bind:value={to}
            placeholder="klient@beispiel.de"
            class="orga-input-clear w-full flex-1 min-h-12"
            disabled={isSending}
          />
          <div class="flex gap-2">
            <div class="relative flex-1 sm:flex-none sm:w-48 z-50">
              <button 
                  type="button" 
                  aria-label="Adressbuch öffnen"
                  aria-expanded={isContactDropdownOpen}
                  onclick={() => isContactDropdownOpen = !isContactDropdownOpen}
                  disabled={isSending}
                  class="w-full bg-white border border-neutral-200 hover:border-brand-300 rounded-xl px-4 min-h-12 text-sm flex items-center justify-between cursor-pointer transition-all shadow-sm focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none disabled:opacity-50"
              >
                  <span class="font-bold text-neutral-800 truncate">Adressbuch</span>
                  <ChevronDown class="w-4 h-4 text-neutral-400 transition-transform duration-300 {isContactDropdownOpen ? 'rotate-180' : ''}" />
              </button>
              
              {#if isContactDropdownOpen}
                  <div transition:slide={{ duration: 200 }} class="absolute right-0 sm:left-0 mt-2 bg-white border border-neutral-200 rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto custom-scrollbar w-64 sm:w-full z-50">
                      {#each systemContacts as contact}
                          <button type="button" class="w-full text-left px-4 py-3 min-h-12 text-sm hover:bg-neutral-50 transition-colors border-b border-neutral-100 last:border-b-0 flex flex-col focus-visible:bg-neutral-50 focus-visible:outline-none" onclick={() => addRecipient(contact.email)}>
                              <span class="font-bold text-neutral-900 truncate">{contact.name}</span> 
                              <span class="text-[10px] text-neutral-500 font-medium truncate">{contact.email}</span> {#if to.includes(contact.email)}<Check class="w-4 h-4 text-brand-600 ml-auto" />{/if}
                          </button>
                      {/each}
                  </div>
              {/if}
            </div>
          {#if isSuperAdmin}
              <button type="button" onclick={addAllToBcc} class="orga-button-ghost flex-1 sm:flex-none shrink-0 min-h-12 px-4 text-xs bg-brand-50 text-brand-700 border-brand-200 shadow-sm whitespace-nowrap hover:bg-brand-100 transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none" disabled={isSending} title="Rundmail an alle (BCC)">
                  <Users class="w-4 h-4" /> An Alle
              </button>
          {/if}
          </div>
        </div>
        </div>

        {#if showCcBcc}
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 animate-enter">
            <!-- CC field -->
            <div>
              <label for="cc" class="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">CC (Kopie)</label>
              <input
                id="cc"
                type="email"
                bind:value={cc}
                placeholder="kollege@beispiel.de"
                class="orga-input-clear w-full min-h-12"
                disabled={isSending}
              />
            </div>

            <!-- BCC field -->
            <div>
              <label for="bcc" class="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">BCC (Blindkopie)</label>
              <input
                id="bcc"
                type="email"
                bind:value={bcc}
                placeholder="privat@beispiel.de"
                class="orga-input-clear w-full min-h-12"
                disabled={isSending}
              />
            </div>
          </div>
        {/if}

        <!-- Subject -->
        <div>
          <label for="subject" class="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">Betreff *</label>
          <input
            id="subject"
            type="text"
            bind:value={subject}
            placeholder="Betreff eingeben"
            class="orga-input-clear w-full min-h-12"
            disabled={isSending}
          />
        </div>

        <!-- Body -->
        <div>
          <label for="body" class="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">Nachricht</label>
          <textarea
            id="body"
            bind:value={body}
            placeholder="Schreibe hier deine Nachricht..."
            rows="10"
            class="orga-input-clear w-full py-4 resize-none custom-scrollbar min-h-48 leading-relaxed bg-white"
            disabled={isSending}
          ></textarea>
        </div>

    {#if attachments.length > 0}
      <div class="flex flex-wrap gap-3 pt-2">
        {#each attachments as file, i}
            <div transition:slide class="flex items-center justify-between gap-3 bg-white text-neutral-700 px-4 min-h-12 rounded-xl text-sm border border-neutral-200 shadow-sm max-w-full group">
              <Paperclip class="w-4 h-4 text-neutral-400 shrink-0 mr-1" />
              <span class="truncate flex-1 min-w-0 font-bold">{file.name}</span>
              <button type="button" onclick={() => removeAttachment(i)} class="shrink-0 text-neutral-400 hover:text-rose-600 transition-colors" disabled={isSending} aria-label="Anhang entfernen" title="Anhang entfernen">
                <X class="w-4 h-4" />
              </button>
          </div>
        {/each}
      </div>
    {/if}

        {#if mailConfigService.config}
          <div class="p-4 bg-neutral-50 rounded-xl border border-neutral-100 shadow-inner">
            <p class="text-xs text-neutral-600">
              <span class="font-bold">Von:</span> {mailConfigService.config.email_address}
            </p>
          </div>
        {/if}
      </div>
    </div>

    <!-- Footer -->
  <div class="border-t border-neutral-100 p-4 sm:p-6 bg-white/95 backdrop-blur-md flex flex-wrap sm:flex-nowrap justify-between items-center gap-3 sm:gap-4 shrink-0 sticky bottom-0 z-20 pb-[max(env(safe-area-inset-bottom,0px),1rem)]">
    <!-- UX: Ergonomische Daumen-Leiste für Aktionen auf Mobile -->
    <div class="w-auto flex-1 sm:flex-none">
      <input type="file" id="file-upload" multiple class="hidden" onchange={handleFileSelect} disabled={isSending} />
      <button type="button" onclick={() => document.getElementById('file-upload')?.click()} aria-label="Datei anhängen" class="w-full sm:w-auto flex items-center justify-center gap-2 text-sm font-bold text-neutral-600 hover:text-brand-600 transition-all min-h-14 px-6 bg-white hover:bg-brand-50 border border-neutral-200 hover:border-brand-200 rounded-2xl shadow-sm active:scale-95 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none" disabled={isSending}>
        <Paperclip class="w-5 h-5" /> <span class="hidden sm:inline">Datei anhängen</span>
      </button>
    </div>
    <div class="flex flex-row gap-3 w-full sm:w-auto mt-2 sm:mt-0 order-last sm:order-0">
      <button onclick={onClose} aria-label="Abbrechen" disabled={isSending} class="orga-button-ghost flex-1 sm:flex-none min-h-14 px-8 bg-white">
        Abbrechen
      </button>
      <button onclick={handleSend} aria-label="E-Mail senden" disabled={isSending} class="orga-button-primary shadow-brand-600/20 flex-1 sm:flex-none min-h-14 px-10">
        {#if isSending}
          <Loader2 class="w-5 h-5 animate-spin" />
        {:else}
          <Send class="w-5 h-5" />
        {/if}
        {isSending ? 'Sendet...' : 'Senden'}
      </button>
    </div>
  </div>
  </div>
</div>
