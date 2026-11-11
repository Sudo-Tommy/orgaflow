<script lang="ts">
  import { onMount } from 'svelte';
  import { pb } from '$lib/services/pocketbase';
  import { orgaStore } from '$lib/stores/orgaStore.svelte';
  import { toastStore } from '$lib/services/toastService.svelte';
  import { confirmStore } from '$lib/services/confirmService.svelte';
  import type { MailRecipient, MailTemplate } from '$lib/types/mail';
  import { Mail, Send, Eye, Users, FileText, X } from 'lucide-svelte';
  import RecipientSelector from './RecipientSelector.svelte';
  import MassMailEditorTab from './MassMailEditorTab.svelte';
  import MassMailPreview from './MassMailPreview.svelte';
  import MascotOwl from './MascotOwl.svelte';
  import { sendMassMailStream } from './massMailSender';

  let isOpen = $state(false);
  let dialog = $state<HTMLDialogElement | null>(null);
  let activeTab = $state<'recipients' | 'editor' | 'preview'>('recipients');

  let selectedRecipientIds = $state<string[]>([]);
  let templates = $state<MailTemplate[]>([]);
  let selectedTemplateId = $state<string>('');
  let subject = $state('');
  let bodyTemplate = $state('');

  let isSending = $state(false);
  let isTestSending = $state(false);
  let progressCurrent = $state(0);
  let progressTotal = $state(0);
  let progressRecipient = $state('');
  let progressStatus = $state<'idle' | 'working' | 'success' | 'error'>('idle');
  let progressMessage = $state('');

  $effect(() => {
    if (isOpen) dialog?.showModal();
    else dialog?.close();
  });

  onMount(async () => {
    await loadTemplates();
  });

  async function loadTemplates() {
    try {
      const res = await pb.collection('mail_templates').getFullList({ sort: 'titel' });
      templates = res as unknown as MailTemplate[];
      if (templates.length > 0 && !selectedTemplateId) {
        applyTemplate(templates[0]);
      }
    } catch {}
  }

  function applyTemplate(tpl: MailTemplate) {
    selectedTemplateId = tpl.id;
    subject = tpl.betreff;
    bodyTemplate = tpl.inhalt;
  }

  export function open() {
    isOpen = true;
    activeTab = 'recipients';
    progressStatus = 'idle';
    progressMessage = '';
  }

  export function close() {
    if (isSending) return;
    isOpen = false;
  }

  async function startSending(isTest = false) {
    if (!isTest && selectedRecipientIds.length === 0) {
      toastStore.warning('Bitte wählen Sie mindestens einen Empfänger aus.');
      return;
    }
    if (!subject.trim() || !bodyTemplate.trim()) {
      toastStore.warning('Bitte Betreff und Textinhalt ausfüllen.');
      return;
    }

    if (!isTest) {
      const confirmed = await confirmStore.ask(
        `Möchten Sie diese personalisierte E-Mail wirklich an ${selectedRecipientIds.length} Empfänger senden? Jede E-Mail wird einzeln zugestellt.`,
        'Massen-E-Mail versenden',
        'Jetzt versenden',
        'Abbrechen'
      );
      if (!confirmed) return;
    }

    if (isTest) isTestSending = true;
    else isSending = true;

    progressStatus = 'working';
    progressCurrent = 0;
    progressTotal = isTest ? 1 : selectedRecipientIds.length;
    progressMessage = isTest ? 'Sende Test-Mail an Admin...' : 'Starte Versand-Engine...';

    try {
      await sendMassMailStream({
        token: pb.authStore.token,
        recipientIds: selectedRecipientIds,
        subject,
        bodyTemplate,
        templateId: selectedTemplateId,
        isTest,
        onProgress: (ev) => {
          progressCurrent = ev.current;
          progressTotal = ev.total;
          progressRecipient = ev.recipient;
          if (ev.status === 'fehler') {
            progressMessage = `Fehler bei ${ev.recipient}: ${ev.errorMessage || 'Unbekannt'}`;
          } else {
            progressMessage = `Sende Mail ${ev.current} von ${ev.total} (${ev.recipient || 'Admin'})...`;
          }
        }
      });
      progressStatus = 'success';
      progressMessage = isTest ? 'Test-Mail erfolgreich zugestellt!' : 'Alle E-Mails erfolgreich versendet!';
      toastStore.success(progressMessage);
    } catch (err: any) {
      progressStatus = 'error';
      progressMessage = `Fehler beim Versand: ${err.message}`;
      toastStore.error(progressMessage);
    } finally {
      isSending = false;
      isTestSending = false;
    }
  }

  let previewRecipients = $derived.by(() => {
    const list: MailRecipient[] = [];
    for (const id of selectedRecipientIds) {
      const c = (orgaStore.contacts?.data || []).find((x: any) => x.id === id);
      if (c) {
        list.push({
          id: c.id, anrede: c.salutation || '', vorname: c.name_first || '',
          nachname: c.name_last || '', email: c.email || '', rolle: 'betreuer',
          organisation: c.company_name || '', opt_out: false, originType: 'contact'
        });
        continue;
      }
      const cl = (orgaStore.clients?.data || []).find((x: any) => x.id === id);
      if (cl) {
        list.push({
          id: cl.id, anrede: cl.salutation || '', vorname: cl.name_first || '',
          nachname: cl.name_last || '', email: cl.email || '', rolle: 'klient',
          organisation: '', opt_out: false, originType: 'client'
        });
      }
    }
    return list;
  });
</script>

{#if isOpen}
  <dialog
    bind:this={dialog}
    class="fixed inset-0 z-50 m-0 w-screen h-screen max-w-none max-h-none bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
  >
    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-enter">
      <!-- Header -->
      <div class="px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/70 dark:bg-slate-950/40">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-xs">
            <Mail class="w-5 h-5" />
          </div>
          <div>
            <h2 class="text-base sm:text-lg font-black text-slate-900 dark:text-white">Kapazitäten- &amp; Akquise-Mailer</h2>
            <p class="text-xs text-slate-500">Personalisierte Einzel-E-Mails an Betreuer, Klienten &amp; Partner</p>
          </div>
        </div>
        <button type="button" onclick={close} disabled={isSending} class="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl cursor-pointer disabled:opacity-40">
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Tabs -->
      <div class="px-5 sm:px-6 pt-3 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 shrink-0">
        <button type="button" onclick={() => activeTab = 'recipients'} class="py-2.5 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer {activeTab === 'recipients' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500'}">
          <Users class="w-4 h-4" /> <span>Empfänger ({selectedRecipientIds.length})</span>
        </button>
        <button type="button" onclick={() => activeTab = 'editor'} class="py-2.5 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer {activeTab === 'editor' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500'}">
          <FileText class="w-4 h-4" /> <span>Vorlage &amp; Inhalt</span>
        </button>
        <button type="button" onclick={() => activeTab = 'preview'} class="py-2.5 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer {activeTab === 'preview' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500'}">
          <Eye class="w-4 h-4" /> <span>Live-Vorschau</span>
        </button>
      </div>

      <!-- Tab Content -->
      <div class="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
        {#if activeTab === 'recipients'}
          <RecipientSelector bind:selectedIds={selectedRecipientIds} onSelectionChange={(ids) => selectedRecipientIds = ids} />
        {:else if activeTab === 'editor'}
          <MassMailEditorTab
            {templates}
            bind:selectedTemplateId
            bind:subject
            bind:bodyTemplate
            onTemplateChange={(id) => {
              const t = templates.find(x => x.id === id);
              if (t) applyTemplate(t);
            }}
          />
        {:else if activeTab === 'preview'}
          <MassMailPreview recipients={previewRecipients} {subject} {bodyTemplate} />
        {/if}

        {#if progressStatus !== 'idle'}
          <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center gap-4">
            <MascotOwl state={progressStatus} size="sm" />
            <div class="flex-1 w-full space-y-1.5 text-center sm:text-left">
              <div class="flex justify-between text-xs font-bold">
                <span class="text-slate-800 dark:text-slate-200">{progressMessage}</span>
                {#if progressTotal > 0}
                  <span class="text-indigo-600 dark:text-indigo-400 font-mono">{Math.round((progressCurrent / progressTotal) * 100)}%</span>
                {/if}
              </div>
              <div class="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                <div class="bg-indigo-600 h-full transition-all duration-300 rounded-full" style="width: {progressTotal > 0 ? (progressCurrent / progressTotal) * 100 : 0}%"></div>
              </div>
            </div>
          </div>
        {/if}
      </div>

      <!-- Footer Buttons -->
      <div class="px-5 sm:px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 flex items-center justify-between shrink-0 flex-wrap gap-2">
        <button type="button" onclick={() => startSending(true)} disabled={isSending || isTestSending} class="min-h-11 px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer disabled:opacity-40">
          <span>📬 Test-Mail an mich</span>
        </button>

        <div class="flex items-center gap-2">
          <button type="button" onclick={close} disabled={isSending} class="min-h-11 px-4 py-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-xs font-bold rounded-xl cursor-pointer">
            Abbrechen
          </button>
          <button type="button" onclick={() => startSending(false)} disabled={isSending || isTestSending || selectedRecipientIds.length === 0} class="min-h-11 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-40 active:scale-95">
            <Send class="w-4 h-4" />
            <span>An {selectedRecipientIds.length} Empfänger senden</span>
          </button>
        </div>
      </div>
    </div>
  </dialog>
{/if}
