<script lang="ts">
  import type { SendEmailInput } from '$lib/services/emailServiceStore.svelte';
  import { pb } from '$lib/services/pocketbase';
  import { autoGrow } from '$lib/actions/autoGrow';
  import { onMount } from 'svelte';
  import { X, Send, AlertCircle, Loader2, Eye, Edit3 } from 'lucide-svelte';
  import MailAttachmentSection from './mail/MailAttachmentSection.svelte';
  import MailComposerSenderSelect from './mail/MailComposerSenderSelect.svelte';
  import MailComposerCcBcc from './mail/MailComposerCcBcc.svelte';
  import { loadSystemContacts, loadAvailableSenders, type MailSenderOption } from './mail/mailComposerHelper';
  import { orgaStore } from '$lib/stores/orgaStore.svelte';
  import { resolveCompanyData, resolveUserData, wrapOrgaFlowEmailHtml } from '$lib/services/emailCompanyService';

  interface Props {
    initialData?: any;
    onSend: (input: SendEmailInput) => Promise<void>;
    onClose: () => void;
  }

  let { initialData = null, onSend, onClose }: Props = $props();

  let dialog: HTMLDialogElement;
  let to = $state('');
  let cc = $state('');
  let bcc = $state('');
  let showCcBcc = $state(false);
  let subject = $state('');
  let body = $state('');
  let body_html = $state<string | undefined>(undefined);
  let quote_html = $state<string | undefined>(undefined);
  let isSending = $state(false);
  let showPreview = $state(false);
  let error = $state<string | null>(null);
  let attachments = $state<File[]>([]);
  let systemContacts = $state<{ name: string; email: string }[]>([]);
  let availableSenders = $state<MailSenderOption[]>([]);
  let selectedProvider = $state<'ionos' | 'google'>('ionos');
  let fromName = $state('Ihre Seniorenassistenz');

  $effect(() => {
    if (initialData) {
      to = Array.isArray(initialData.to) ? initialData.to.join(', ') : (initialData.to || '');
      subject = initialData.subject || '';
      body = initialData.body || '';
      body_html = initialData.body_html || initialData.bodyHtml;
      quote_html = initialData.quoteHtml || initialData.quote_html;
      if (initialData.provider) selectedProvider = initialData.provider;
      if (initialData.fromName) fromName = initialData.fromName;
      if (initialData.attachments && Array.isArray(initialData.attachments)) {
        attachments = [...initialData.attachments];
      }
    }
  });

  let previewHtml = $derived.by(() => {
    const compData = resolveCompanyData(orgaStore);
    const chosenSender = availableSenders.find(s => s.id === selectedProvider);
    const userData = resolveUserData(undefined, undefined, chosenSender?.email);
    return wrapOrgaFlowEmailHtml({
      bodyContent: body_html || body || 'Hier steht Ihre Nachricht...',
      quoteHtml: quote_html,
      userData,
      compData: { ...compData, compName: fromName.trim() || compData.compName }
    });
  });

  onMount(async () => {
    dialog?.showModal();
    const compData = resolveCompanyData(orgaStore);
    if (compData?.compName) fromName = compData.compName;

    const [contacts, senders] = await Promise.all([
      loadSystemContacts(),
      loadAvailableSenders(pb.authStore.model?.id)
    ]);
    systemContacts = contacts;
    availableSenders = senders;
    if (senders.length > 0 && !initialData?.provider) selectedProvider = senders[0].id;
  });

  function handleClose() {
    dialog?.close();
    onClose();
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();
    error = null;
    if (!to.trim()) { error = 'Bitte geben Sie mindestens einen Empfänger an.'; return; }
    if (!subject.trim()) { error = 'Bitte geben Sie einen Betreff ein.'; return; }

    isSending = true;
    try {
      const chosenSender = availableSenders.find(s => s.id === selectedProvider);
      await onSend({
        to: to.trim(),
        cc: cc.trim() || undefined,
        bcc: bcc.trim() || undefined,
        subject: subject.trim(),
        body: body.trim(),
        body_html,
        quote_html,
        attachments: attachments.length > 0 ? attachments : undefined,
        provider: selectedProvider,
        fromAddress: chosenSender?.email,
        fromName: fromName.trim() || 'Ihre Seniorenassistenz'
      });
      handleClose();
    } catch (err: any) {
      error = err?.message || 'Fehler beim Versenden der E-Mail.';
    } finally {
      isSending = false;
    }
  }
</script>

<dialog
  bind:this={dialog}
  class="zero-inner-scroll-modal p-0 bg-transparent backdrop:bg-slate-950/70 backdrop:backdrop-blur-md w-full max-w-2xl mx-auto my-6 sm:my-10 rounded-3xl border-none shadow-2xl"
  onclick={(e) => { if (e.target === dialog) handleClose(); }}
  oncancel={(e) => { e.preventDefault(); handleClose(); }}
>
  <div class="w-full bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col">
    <div class="p-4 sm:p-5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-900 rounded-t-3xl shrink-0">
      <div class="flex items-center gap-3">
        <h2 class="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">Neue E-Mail verfassen</h2>
        <button
          type="button"
          onclick={() => showPreview = !showPreview}
          class="px-3 py-1 rounded-full text-xs font-bold border transition-colors inline-flex items-center gap-1.5 cursor-pointer {showPreview ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50'}"
        >
          {#if showPreview}
            <Edit3 class="w-3.5 h-3.5" /> <span>Text bearbeiten</span>
          {:else}
            <Eye class="w-3.5 h-3.5" /> <span>Briefbogen-Vorschau</span>
          {/if}
        </button>
      </div>
      <button type="button" onclick={handleClose} class="min-h-[40px] min-w-[40px] inline-flex items-center justify-center p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer" aria-label="Schließen">
        <X class="w-5 h-5" />
      </button>
    </div>

    <form onsubmit={handleSubmit} class="p-4 sm:p-6 space-y-4">
      {#if error}
        <div class="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-center gap-2">
          <AlertCircle class="w-4 h-4 shrink-0" /> <span>{error}</span>
        </div>
      {/if}

      <MailComposerSenderSelect {availableSenders} bind:selectedProvider bind:fromName />

      <div>
        <div class="flex items-center justify-between mb-1">
          <label for="compose-to" class="block text-xs font-bold text-slate-700 dark:text-slate-300">Empfänger (An):</label>
          <button type="button" onclick={() => showCcBcc = !showCcBcc} class="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer">
            {showCcBcc ? 'CC / BCC verbergen' : 'CC / BCC hinzufügen'}
          </button>
        </div>
        <input id="compose-to" type="email" list="contact-list" bind:value={to} required placeholder="name@beispiel.de" class="w-full min-h-[44px] px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
        <datalist id="contact-list">
          {#each systemContacts as c (c.email)}
            <option value={c.email}>{c.name} ({c.email})</option>
          {/each}
        </datalist>
      </div>

      {#if showCcBcc}
        <MailComposerCcBcc bind:cc bind:bcc />
      {/if}

      <div>
        <label for="compose-subject" class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Betreff:</label>
        <input id="compose-subject" type="text" bind:value={subject} required placeholder="Worum geht es?" class="w-full min-h-[44px] px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
      </div>

      {#if showPreview}
        <div class="space-y-1.5">
          <span class="block text-xs font-bold text-emerald-700 dark:text-emerald-400">Live-Vorschau (genau so kommt Ihre E-Mail beim Empfänger an):</span>
          <div class="p-3 bg-slate-100 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-900">
            {@html previewHtml}
          </div>
        </div>
      {:else}
        <div>
          <label for="compose-body" class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Nachricht (wird automatisch in den OrgaFlow-Briefbogen eingebettet):</label>
          <textarea id="compose-body" bind:value={body} use:autoGrow rows="6" required placeholder="Schreiben Sie Ihre Nachricht hier..." class="w-full p-3.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 auto-grow"></textarea>
        </div>
      {/if}

      <MailAttachmentSection
        {attachments}
        onAdd={(newFiles) => attachments = [...attachments, ...newFiles]}
        onRemove={(idx) => attachments = attachments.filter((_, i) => i !== idx)}
        disabled={isSending}
      />

      <div class="pt-4 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-end gap-3 shrink-0">
        <button type="button" onclick={handleClose} disabled={isSending} class="min-h-[44px] px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer">Abbrechen</button>
        <button type="submit" disabled={isSending} class="orga-button-primary min-h-[44px] px-6 py-2.5 text-xs font-bold inline-flex items-center gap-2 shadow-sm cursor-pointer active:scale-95 transition-all disabled:opacity-50">
          {#if isSending}
            <Loader2 class="w-4 h-4 animate-spin" /> <span>Wird gesendet...</span>
          {:else}
            <Send class="w-4 h-4 stroke-[2.5]" /> <span>Jetzt im Briefbogen senden</span>
          {/if}
        </button>
      </div>
    </form>
  </div>
</dialog>
