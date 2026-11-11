<script lang="ts">
  import { getEmailService, type MailboxMessage } from '$lib/services/emailServiceStore.svelte';
  import { pb } from '$lib/services/pocketbase';
  import { formatMessageToHtml } from '$lib/services/emailQuoteFormatter';
  import { 
    ArrowLeft, 
    Reply, 
    Forward, 
    Trash2, 
    Paperclip, 
    Download, 
    Mail, 
    Calendar,
    RefreshCw
  } from 'lucide-svelte';

  interface Props {
    emailId: string;
    onDelete: () => void;
    onReply: () => void;
    onForward?: () => void;
    onBack?: () => void;
  }

  let { emailId, onDelete, onReply, onForward, onBack }: Props = $props();

  const emailService = getEmailService();
  let email = $state<MailboxMessage | null>(null);
  let isLoading = $state(false);
  let iframeEl = $state<HTMLIFrameElement | null>(null);
  let iframeHeight = $state(620);

  $effect(() => {
    if (emailId) {
      loadEmail(emailId);
    } else {
      email = null;
    }
  });

  async function loadEmail(id: string) {
    isLoading = true;
    try {
      email = await emailService.getEmail(id);
    } catch (err) {
      console.error('[Mail Detail] Fehler beim Laden der E-Mail:', err);
    } finally {
      isLoading = false;
    }
  }

  function adjustIframeHeight() {
    if (!iframeEl || !iframeEl.contentWindow?.document?.body) return;
    try {
      const doc = iframeEl.contentWindow.document;
      const h = Math.max(doc.body.scrollHeight, doc.documentElement.scrollHeight, 520);
      iframeHeight = h + 32;
      const detailsList = doc.querySelectorAll('details');
      detailsList.forEach(d => {
        if (!d.dataset.listenerAttached) {
          d.dataset.listenerAttached = 'true';
          d.addEventListener('toggle', () => {
            setTimeout(() => {
              const updatedH = Math.max(doc.body.scrollHeight, doc.documentElement.scrollHeight, 520);
              iframeHeight = updatedH + 32;
            }, 30);
          });
        }
      });
    } catch {}
  }

  function formatDate(dateStr?: string) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('de-DE', {
      weekday: 'short',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function getAttachmentUrl(filename: string): string {
    if (!email) return '#';
    return pb.files.getURL(email, filename, { download: true });
  }

  let providerInfo = $derived.by(() => {
    if (!email) return null;
    const from = (email.from_address || '').toLowerCase();
    const msgId = (email.message_id || '').toLowerCase();
    const isGoogle = from.includes('gmail.com') || from.includes('googlemail.com') || msgId.includes('gmail') || msgId.includes('google');
    return { name: isGoogle ? 'Google Mail' : 'IONOS', isGoogle };
  });

  let renderedSrcDoc = $derived.by(() => {
    if (!email) return '';
    const content = email.body_html || `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; line-height: 1.7; color: #1e293b; padding: 24px;">${formatMessageToHtml(email.body_text || '')}</div>`;
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:0;padding:16px 8px;background:transparent;font-family:'Segoe UI',system-ui,sans-serif;} details summary::-webkit-details-marker{display:none;}</style></head><body>${content}</body></html>`;
  });
</script>

<div class="flex-1 flex flex-col bg-white dark:bg-slate-900 sm:rounded-r-3xl">
  {#if isLoading}
    <div class="flex-1 flex items-center justify-center p-12 text-slate-400 dark:text-slate-500 flex-col gap-3">
      <RefreshCw class="w-8 h-8 animate-spin text-indigo-600" />
      <span class="text-sm font-medium">Nachricht wird geöffnet...</span>
    </div>
  {:else if !email}
    <div class="flex-1 flex items-center justify-center p-12 text-slate-400 dark:text-slate-500 flex-col gap-3">
      <Mail class="w-12 h-12 opacity-30 stroke-[1.5]" />
      <p class="text-sm font-bold text-slate-700 dark:text-slate-300">Keine E-Mail ausgewählt</p>
    </div>
  {:else}
    <!-- Obere Aktionsleiste wie in Gmail (Zurück zur Liste, Antworten, Weiterleiten, Löschen) -->
    <div class="px-4 sm:px-6 py-3 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2 bg-slate-50/60 dark:bg-slate-900/80">
      <div class="flex items-center gap-2">
        {#if onBack}
          <button
            type="button"
            onclick={onBack}
            class="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 inline-flex items-center gap-2 transition-colors cursor-pointer shadow-2xs"
          >
            <ArrowLeft class="w-4 h-4" />
            <span>Zurück zur Liste</span>
          </button>
        {/if}

        <button
          type="button"
          onclick={onReply}
          class="orga-button-primary min-h-[40px] px-4 py-1.5 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
        >
          <Reply class="w-4 h-4 stroke-[2.5]" />
          <span>Antworten</span>
        </button>

        {#if onForward}
          <button
            type="button"
            onclick={onForward}
            class="min-h-[40px] px-3.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Forward class="w-4 h-4 text-slate-500" />
            <span class="hidden sm:inline">Weiterleiten</span>
          </button>
        {/if}
      </div>

      <button
        type="button"
        onclick={onDelete}
        class="min-h-[40px] px-3.5 py-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900/60 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
        title="E-Mail löschen"
      >
        <Trash2 class="w-4 h-4" />
        <span class="hidden sm:inline">Löschen</span>
      </button>
    </div>

    <!-- Detail Header (Betreff, Von, An, Datum, Anhänge) -->
    <div class="border-b border-slate-200/80 dark:border-slate-800 px-4 sm:px-6 py-4 bg-white dark:bg-slate-900 space-y-3">
      <h1 class="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white leading-tight break-words">
        {email.subject || '(Kein Betreff)'}
      </h1>

      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400">
        <div class="space-y-0.5 min-w-0">
          <p class="font-bold text-slate-900 dark:text-slate-200 truncate flex items-center gap-1.5 flex-wrap">
            <span class="text-slate-400 dark:text-slate-500 font-normal">Von:</span>
            <span>{email.from_address}</span>
            {#if email.folder === 'Sent' && providerInfo}
              <span class="px-2 py-0.5 text-[10px] font-bold rounded-full {
                providerInfo.isGoogle 
                  ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800' 
                  : 'bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800'
              }">
                {providerInfo.name}
              </span>
            {/if}
          </p>
          <p class="text-slate-500 dark:text-slate-400 truncate flex items-center gap-1.5">
            <span class="text-slate-400 dark:text-slate-500 font-normal">An:</span>
            <span>{email.to_address}</span>
          </p>
        </div>

        <div class="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium shrink-0 flex items-center gap-1">
          <Calendar class="w-3.5 h-3.5 text-slate-400" />
          <span>{formatDate(email.date)}</span>
        </div>
      </div>

      {#if email.attachments && email.attachments.length > 0}
        <div class="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80 flex flex-wrap items-center gap-2">
          <div class="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 mr-1">
            <Paperclip class="w-3.5 h-3.5 text-indigo-500" />
            <span>{email.attachments.length} Anhang/Anhänge:</span>
          </div>
          {#each email.attachments as file (file)}
            <a
              href={getAttachmentUrl(file)}
              target="_blank"
              rel="noopener noreferrer"
              class="min-h-[34px] inline-flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-2xs hover:text-indigo-600 transition-colors"
            >
              <Download class="w-3 h-3 text-slate-400" />
              <span class="truncate max-w-48">{file}</span>
            </a>
          {/each}
        </div>
      {/if}
    </div>

    <!-- E-Mail Inhalt in voller Höhe ohne inneren Scrollbalken -->
    <div class="flex-1 bg-slate-50/40 dark:bg-slate-900/40 p-2 sm:p-4">
      <iframe
        bind:this={iframeEl}
        onload={adjustIframeHeight}
        srcdoc={renderedSrcDoc}
        style="height: {iframeHeight}px;"
        class="w-full border-none bg-white rounded-2xl shadow-xs"
        title="E-Mail Inhalt"
        sandbox="allow-same-origin allow-popups"
      ></iframe>
    </div>
  {/if}
</div>
