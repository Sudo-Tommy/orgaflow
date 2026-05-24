<script lang="ts">
  import { getEmailService, type MailboxMessage } from '$lib/services/emailService.svelte';

  interface Props {
    emailId: string;
    onDelete: () => void;
    onReply: () => void;
    onBack?: () => void;
  }

  let { emailId, onDelete, onReply, onBack } = $props();

  const emailService = getEmailService();
  let email = $state<MailboxMessage | null>(null);
  let isLoading = $state(false);

  // Load email on mount
  async function loadEmail() {
    isLoading = true;
    try {
      email = await emailService.getEmail(emailId);
    } catch (err) {
      console.error('[Mail Detail] Load error:', err);
    } finally {
      isLoading = false;
    }
  }

  $effect.pre(() => {
    loadEmail();
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
</script>

<div class="h-full flex flex-col">
  {#if isLoading}
    <div class="flex-1 flex items-center justify-center">
      <div class="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
    </div>
  {:else if !email}
    <div class="flex-1 flex items-center justify-center">
      <p class="text-neutral-500 font-medium">E-Mail nicht gefunden</p>
    </div>
  {:else}
    <!-- Header -->
    <div class="border-b border-neutral-100 p-4 sm:p-6 bg-white shrink-0">
      <div class="flex items-start gap-3 mb-2">
        <div class="flex-1 min-w-0">
          <h2 class="text-xl sm:text-2xl font-bold text-neutral-900 mb-2 leading-tight">{email.subject || '(Kein Betreff)'}</h2>
          <div class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-sm text-neutral-600">
            <div class="min-w-0">
              <p class="font-bold text-neutral-900 truncate">{email.from_address}</p>
              <p class="text-xs truncate text-neutral-500">an {email.to_address}</p>
            </div>
            <p class="text-xs sm:text-sm text-neutral-500 sm:ml-auto shrink-0">{formatDate(email.date)}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Body -->
    <div class="flex-1 bg-white relative">
      <iframe 
          srcdoc={email.body_html || `<div style="font-family: sans-serif; padding: 20px;">${email.body_text?.replace(/\n/g, '<br>') || ''}</div>`} 
          class="absolute inset-0 w-full h-full border-none" 
          title="E-Mail Inhalt" 
          sandbox="allow-same-origin allow-popups"
      ></iframe>
    </div>

    <!-- Footer with actions -->
    <div class="border-t border-neutral-100 p-3 sm:p-4 bg-white/95 backdrop-blur-md flex flex-wrap gap-2 shrink-0 justify-between sm:justify-start sticky bottom-0 z-10 pb-[max(env(safe-area-inset-bottom,0px),0.75rem)]">
      <button
        onclick={onBack}
        aria-label="Zurück zur Übersicht"
        class="md:hidden flex-1 orga-button-ghost py-3 px-3 text-xs font-bold bg-white border border-neutral-200 shadow-sm flex items-center justify-center gap-1.5 text-neutral-700 hover:text-indigo-600 hover:border-indigo-200 active:scale-95"
      >
      <span class="text-xl leading-none">◀️</span>
      </button>
      <button
        onclick={onReply}
        aria-label="Antworten"
        class="flex-1 sm:flex-none orga-button-ghost py-3 sm:py-2.5 px-3 text-xs font-bold bg-white border border-neutral-200 shadow-sm flex items-center justify-center gap-1.5 text-neutral-700 hover:text-indigo-600 hover:border-indigo-200 active:scale-95"      
      >
        <span class="text-xl sm:text-lg leading-none">↩️</span>
        <span class="hidden sm:inline">Antworten</span>
      </button>
      <button
        onclick={onDelete}
        aria-label="Nachricht löschen"
        class="flex-1 sm:flex-none orga-button-ghost py-3 sm:py-2.5 px-3 text-xs font-bold bg-white border border-neutral-200 shadow-sm flex items-center justify-center gap-1.5 text-rose-600 hover:text-rose-700 hover:border-rose-200 hover:bg-rose-50 active:scale-95"
      >
        <span class="text-xl sm:text-lg leading-none">🗑️</span>
        <span class="hidden sm:inline">Löschen</span>
      </button>
    </div>
  {/if}
</div>
