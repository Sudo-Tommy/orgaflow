<script lang="ts">
  import type { MailboxMessage } from '$lib/services/emailService.svelte';

  interface Props {
    emails: MailboxMessage[];
    selectedEmailId: string | null;
    currentPage: number;
    totalPages: number;
    isLoading: boolean;
    folderName: string;
    isMobileDetailOpen?: boolean;
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
    isMobileDetailOpen = false,
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

</script>

<div class="h-full flex flex-col relative overflow-hidden">
  <!-- Header -->
  <div class="p-3 sm:p-4 border-b border-neutral-100 shrink-0 flex items-center justify-between gap-3 bg-white sticky top-0 z-10">
    <div class="flex items-center gap-3 min-w-0">
        <div class="flex-1 min-w-0">
          <h2 class="text-lg font-bold text-neutral-900 truncate">{folderName}</h2>
          <p class="text-xs font-semibold text-neutral-500">{emails.length} E-Mail{emails.length !== 1 ? 's' : ''}</p>
        </div>
    </div>
  </div>

  <!-- Email list -->
  <div class="flex-1 overflow-y-auto pb-24">
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
                <!-- UX-Optimierung: CSS Line-Clamp statt JS Truncate für flüssigeren Umbruch auf Mobile (break-words korrigiert) -->
                <p class="text-xs text-neutral-400 line-clamp-2 mt-1 whitespace-normal wrap-break-word leading-relaxed">{email.body_text?.replace(/<[^>]*>?/gm, '') || email.body_html?.replace(/<[^>]*>?/gm, '') || ''}</p>
              </div>
            </div>
          </button>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Pagination -->
  {#if totalPages > 1}
    <!-- Auf Desktop als Leiste behalten -->
    <div class="hidden md:flex border-t border-neutral-100 bg-neutral-50/50 p-3 items-center justify-between shrink-0">
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

  <!-- Mobile Left-Thumb Actions (Pagination FABs) -->
  {#if totalPages > 1 && !isMobileDetailOpen}
  <div class="md:hidden absolute bottom-6 left-4 flex flex-col gap-3 z-40 pb-[env(safe-area-inset-bottom,0px)]">
    <button class="w-14 h-14 bg-white text-neutral-700 border border-neutral-200 rounded-full shadow-lg flex items-center justify-center text-xl hover:text-indigo-600 active:scale-95 transition-transform disabled:opacity-50" onclick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} aria-label="Vorherige Seite" title="Vorherige Seite">
      ◀️
    </button>
    <button class="w-14 h-14 bg-white text-neutral-700 border border-neutral-200 rounded-full shadow-lg flex items-center justify-center text-xl hover:text-indigo-600 active:scale-95 transition-transform disabled:opacity-50" onclick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} aria-label="Nächste Seite" title="Nächste Seite">
      ▶️
    </button>
  </div>
  {/if}

  <!-- Mobile Right-Thumb Actions (Menu & Compose FABs) -->
  {#if !isMobileDetailOpen}
    <div class="md:hidden absolute bottom-6 right-4 flex flex-col gap-3 z-40 pb-[env(safe-area-inset-bottom,0px)]">
      <button class="w-14 h-14 bg-white text-neutral-700 border border-neutral-200 rounded-full shadow-lg flex items-center justify-center text-xl hover:text-indigo-600 active:scale-95 transition-transform" onclick={onToggleMenu} aria-label="Ordner" title="Ordner wechseln">
        📁
      </button>
      <button class="w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg shadow-indigo-600/40 flex items-center justify-center text-xl hover:bg-indigo-700 active:scale-95 transition-transform" onclick={onComposeClick} aria-label="Neue E-Mail" title="Neue E-Mail verfassen">
        ✏️
      </button>
    </div>
  {/if}
</div>
