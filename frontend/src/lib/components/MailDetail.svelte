<script lang="ts">
  import { getEmailService } from '$lib/services/emailServiceStore';
  import type { MailboxMessage } from '$lib/types/mail'; // ARCHITEKTUR-FIX: MailboxMessage aus zentraler Datei
  import { pb } from '$lib/services/pocketbase';
  import { ArrowLeft, Reply, Forward, Trash2, Paperclip, Eye, Loader2, Star, MoreVertical, Printer } from 'lucide-svelte';
  import PdfPreviewModal from "$lib/components/PdfPreviewModal.svelte";

  interface Props {
    emailId: string;
    onDelete: (id: string) => void; // ARCHITEKTUR-FIX: Explizite Typisierung
    onReply: (id: string) => void; // ARCHITEKTUR-FIX: Explizite Typisierung
    onForward: (id: string) => void; // ARCHITEKTUR-FIX: Explizite Typisierung
    onBack?: () => void;
  }

  let { emailId, onDelete, onReply, onForward, onBack }: Props = $props(); // ARCHITEKTUR-FIX: $props() ohne Typargument

  const emailService = getEmailService();
  let email = $state<MailboxMessage | null>(null);
  let isLoading = $state(false);
  let isStarred = $state(false);

  // ARCHITEKTUR-FIX: Behebung von const_tag_invalid_placement durch reaktives Derived
  let attachmentsList = $derived.by(() => {
    if (!email?.attachments) return [];
    return Array.isArray(email.attachments) ? email.attachments : [email.attachments];
  });

  let pdfPreviewModal: ReturnType<typeof PdfPreviewModal>;

  // Load email on mount
  async function loadEmail() {
    isLoading = true;
    try {
      email = await emailService.getEmail(emailId);
      if (email) isStarred = email.is_starred || false;
    } catch (err) {
      console.error('[Mail Detail] Load error:', err);
    } finally {
      isLoading = false;
    }
  }

  // ARCHITEKTUR-FIX: Reagiert auf ID-Wechsel und hält isStarred synchron
  $effect(() => {
    if (emailId) {
      loadEmail();
    }
  });

  // Synchronisiert den lokalen Status, falls sich das E-Mail-Objekt im Service ändert
  $effect(() => {
    if (email) isStarred = email.is_starred || false;
  });

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function previewAttachment(attachment: string) {
    if (email) {
      const url = pb.files.getURL(email, attachment);
      pdfPreviewModal?.open(url, 'Anhang Vorschau', attachment);
    }
  }

  function handlePrint() {
    window.print();
  }
</script>

<div class="h-full flex flex-col">
  {#if isLoading}
    <div class="flex-1 flex items-center justify-center">
      <Loader2 class="w-8 h-8 text-brand-500 animate-spin" />
    </div>
  {:else if !email}
    <div class="flex-1 flex items-center justify-center">
      <p class="text-neutral-400 font-bold">E-Mail nicht gefunden</p>
    </div>
  {:else}
    <!-- Google-Style Action Toolbar -->
    <div class="border-b border-neutral-100 p-2 sm:p-3 bg-white shrink-0 flex items-center justify-between sticky top-0 z-30 shadow-sm">
      <div class="flex items-center gap-1 sm:gap-2">
        <button onclick={onBack} class="p-2 hover:bg-neutral-100 rounded-full transition-colors text-neutral-600" title="Zurück">
          <ArrowLeft class="w-5 h-5" />
        </button>
        <div class="w-px h-6 bg-neutral-200 mx-1"></div>
        <button onclick={() => onReply(emailId)} class="p-2 hover:bg-neutral-100 rounded-full transition-colors text-neutral-600" title="Antworten">
          <Reply class="w-5 h-5" />
        </button>
        <button onclick={() => onForward(emailId)} class="p-2 hover:bg-neutral-100 rounded-full transition-colors text-neutral-600" title="Weiterleiten">
          <Forward class="w-5 h-5" />
        </button>
        <button onclick={() => onDelete(emailId)} class="p-2 hover:bg-rose-50 hover:text-rose-600 rounded-full transition-colors text-neutral-600" title="Löschen">
          <Trash2 class="w-5 h-5" />
        </button>
      </div>
      
      <div class="flex items-center gap-1">
        <button onclick={handlePrint} class="p-2 hover:bg-neutral-100 rounded-full transition-colors text-neutral-500" title="Drucken">
          <Printer class="w-5 h-5" />
        </button>
        <button 
          onclick={() => emailService.toggleStar(emailId)} 
          class="p-2 hover:bg-neutral-100 rounded-full transition-colors {isStarred ? 'text-amber-500' : 'text-neutral-400'}"
        >
          <Star class="w-5 h-5 {isStarred ? 'fill-current' : ''}" />
        </button>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto custom-scrollbar bg-white flex flex-col">
      <!-- Message Content Header -->
      <div class="p-5 sm:p-8 shrink-0">
        <h2 class="text-xl sm:text-3xl font-bold text-neutral-900 mb-8 leading-tight">{email.subject || '(Kein Betreff)'}</h2>
        
        <div class="min-w-0">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold shrink-0">
              {email.from_address?.charAt(0).toUpperCase() || '?'}
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex flex-wrap items-baseline justify-between gap-x-4">
                <p class="font-bold text-neutral-900 text-sm sm:text-base">{email.from_address}</p>
                <p class="text-[11px] text-neutral-500 font-bold uppercase tracking-tighter">{formatDate(email.date)}</p>
              </div>
              <p class="text-[11px] font-medium truncate text-neutral-400 mt-0.5">an {email.to_address}</p>
            </div>
          </div>
        </div>
      </div>

      {#if attachmentsList.length > 0}
        <div class="px-5 sm:px-8 py-5 bg-neutral-50/50 border-b border-neutral-100 flex flex-wrap gap-3 shrink-0">
          <span class="text-[10px] font-black text-neutral-400 uppercase tracking-widest w-full mb-1">Anhänge ({attachmentsList.length})</span>
          {#each attachmentsList as attachment}
            <button type="button" onclick={() => previewAttachment(attachment)} class="flex items-center gap-3 px-4 min-h-12 bg-white border border-neutral-200 rounded-xl text-sm font-bold text-neutral-700 hover:text-brand-600 hover:border-brand-300 hover:shadow-sm transition-all active:scale-95 group focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none cursor-pointer">
              <div class="w-8 h-8 rounded-lg bg-neutral-100 group-hover:bg-brand-50 text-neutral-500 group-hover:text-brand-600 flex items-center justify-center transition-colors shrink-0">
                <Paperclip class="w-4 h-4" />
              </div>
              <span class="truncate max-w-50">{attachment}</span>
              <Eye class="w-4 h-4 ml-1 opacity-40 group-hover:opacity-100 transition-opacity shrink-0" />
            </button>
          {/each}
        </div>
      {/if}

    <!-- Body -->
    <div class="flex-1 bg-white relative min-h-0">
      <iframe 
          srcdoc={email.body_html || `<div style="font-family: 'Inter', system-ui, sans-serif; padding: 32px; color: #374151; line-height: 1.6; font-size: 15px;">${email.body_text?.replace(/\n/g, '<br>') || ''}</div>`} 
          class="absolute inset-0 w-full h-full border-none" 
          title="E-Mail Inhalt" 
          sandbox="allow-same-origin allow-popups"
      ></iframe>
    </div>
    </div>
  {/if}

  <PdfPreviewModal bind:this={pdfPreviewModal} />
</div>
