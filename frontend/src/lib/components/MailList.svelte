<script lang="ts">
  import type { MailboxMessage } from '$lib/services/emailService.svelte';

  interface Props {
    emails: MailboxMessage[];
    selectedEmailId: string | null;
    currentPage: number;
    totalPages: number;
    isLoading: boolean;
    folderName: string;
    onEmailSelect: (id: string) => void;
    onPageChange: (page: number) => void;
    onToggleMenu: () => void;
    onComposeClick: () => void;
  }

  let { 
    emails, 
    selectedEmailId, 
    currentPage, 
    totalPages, 
    isLoading, 
    folderName,
    onEmailSelect,
    onPageChange,
    onToggleMenu,
    onComposeClick
  } = $props();

  function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = diff / (1000 * 60 * 60);
    
    if (hours < 1) return 'Eben';
    if (hours < 24) return `vor ${Math.floor(hours)}h`;
    if (diff < 7 * 24 * 60 * 60 * 1000) {
      return date.toLocaleDateString('de-DE', { weekday: 'short' });
    }
    return date.toLocaleDateString('de-DE');
  }

  function truncateText(text: string, length: number = 50) {
    return text.length > length ? text.substring(0, length) + '...' : text;
  }
</script>

<div class="h-full flex flex-col">
  <!-- Header -->
  <div class="p-3 sm:p-4 border-b border-neutral-100 shrink-0 flex items-center justify-between gap-3 bg-white sticky top-0 z-10">
    <div class="flex items-center gap-3 min-w-0">
        <button class="md:hidden p-2 -ml-2 text-neutral-500 hover:text-indigo-600 hover:bg-neutral-50 rounded-lg transition-colors" onclick={onToggleMenu} aria-label="Menü öffnen">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
        <div class="flex-1 min-w-0">
          <h2 class="text-lg font-bold text-neutral-900 truncate">{folderName}</h2>
          <p class="text-xs font-semibold text-neutral-500">{emails.length} E-Mail{emails.length !== 1 ? 's' : ''}</p>
        </div>
    </div>
    <button class="md:hidden orga-button-primary py-1.5 px-3 text-xs shadow-indigo-600/20 shrink-0 flex items-center gap-1.5" onclick={onComposeClick}>
      <span class="text-sm leading-none">✏️</span> Neu
    </button>
  </div>

  <!-- Email list -->
  <div class="flex-1 overflow-y-auto">
    {#if isLoading}
      <div class="p-4 text-center text-sm text-neutral-500">Lädt...</div>
    {:else if emails.length === 0}
      <div class="p-4 text-center text-sm text-neutral-500">Keine E-Mails</div>
    {:else}
      <div class="divide-y divide-neutral-100">
        {#each emails as email (email.id)}
          <button
            onclick={() => onEmailSelect(email.id)}
            class={`w-full p-4 text-left hover:bg-neutral-50/80 transition-colors border-l-4 ${
              selectedEmailId === email.id
                ? 'bg-indigo-50/50 border-indigo-500'
                : email.is_read
                  ? 'border-transparent'
                  : 'border-indigo-400 bg-indigo-50/30'
            }`}
          >
            <div class="flex items-start gap-3">
              {#if !email.is_read}
                <div class="w-2.5 h-2.5 rounded-full bg-indigo-600 mt-1.5 shrink-0 shadow-sm"></div>
              {:else}
                <div class="w-2.5 h-2.5 shrink-0"></div>
              {/if}
              <div class="flex-1 min-w-0">
                <div class="flex items-baseline gap-2 justify-between">
                  <p class={`text-sm truncate max-w-[70%] ${email.is_read ? 'font-medium text-neutral-700' : 'font-bold text-neutral-900'}`}>
                    {email.folder === 'Sent' ? `An: ${email.to_address?.split('<')[0] || email.to_address}` : (email.from_address?.split('<')[0] || email.from_address)}
                  </p>
                  <span class="text-[10px] text-neutral-400 shrink-0">{formatDate(email.date)}</span>
                </div>
                <p class={`text-sm truncate mt-0.5 ${email.is_read ? 'text-neutral-500' : 'text-neutral-800 font-semibold'}`}>
                  {email.subject || '(Kein Betreff)'}
                </p>
                <p class="text-xs text-neutral-400 truncate mt-1">{truncateText(email.body_text || email.body_html || '', 60)}</p>
              </div>
            </div>
          </button>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Pagination -->
  {#if totalPages > 1}
    <div class="border-t border-neutral-100 bg-neutral-50/50 p-3 flex items-center justify-between shrink-0">
      <button
        onclick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        class="p-1.5 hover:bg-white border border-transparent hover:border-neutral-200 shadow-sm disabled:shadow-none disabled:opacity-50 rounded-lg transition-colors"
        aria-label="Vorherige Seite"
      >
        <span class="text-sm">◀️</span>
      </button>
      <span class="text-xs font-bold text-neutral-500">{currentPage} / {totalPages}</span>
      <button
        onclick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        class="p-1.5 hover:bg-white border border-transparent hover:border-neutral-200 shadow-sm disabled:shadow-none disabled:opacity-50 rounded-lg transition-colors"
        aria-label="Nächste Seite"
      >
        <span class="text-sm">▶️</span>
      </button>
    </div>
  {/if}
</div>
