<script lang="ts">
  import type { MailboxMessage } from '$lib/types/mail';
  import { Paperclip, ChevronLeft, ChevronRight, PenSquare, Folder, Trash2, Forward, MailOpen, Mail as MailIcon, Square, CheckSquare, RotateCw, Search, X, Star } from 'lucide-svelte';

  interface Props {
    emails: MailboxMessage[];
    selectedEmailId: string | null;
    selectedEmailIds: string[];
    currentPage: number;
    totalPages: number;
    isLoading: boolean;
    folderName: string;
    isMobileDetailOpen?: boolean;
    onEmailSelect: (id: string) => void;
    onPageChange: (page: number) => void;
    onToggleMenu: () => void;
    onComposeClick: () => void;
    onToggleSelect: (id: string) => void;
    onToggleSelectAll: () => void;
    onBulkDelete: () => void;
    onBulkForward: () => void;
    onBulkMarkRead: () => void;
    onBulkMarkUnread: () => void;
    searchQuery: string; // Bindable
    onToggleRead?: (id: string) => void;
    onDeleteSingle: (id: string) => void; // ARCHITEKTUR-FIX: Pflichtfeld
    onToggleStar?: (id: string) => void;
  }

  let { 
    emails,
    selectedEmailId,
    selectedEmailIds,
    currentPage, 
    totalPages, 
    isLoading, 
    folderName,
    isMobileDetailOpen = false,
    onEmailSelect,
    onPageChange,
    onToggleMenu,
    onComposeClick,
    onToggleSelect,
    onToggleSelectAll,
    onBulkDelete,
    onBulkForward,
    onBulkMarkRead,
    onBulkMarkUnread,
    searchQuery = $bindable(),
    onToggleRead,
    onDeleteSingle,
    onToggleStar
  } = $props();

  function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = diff / (1000 * 60 * 60);
    
    if (hours < 1) return 'Eben';
    if (hours < 24) return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }); // Show time for same day
    if (diff < 7 * 24 * 60 * 60 * 1000) {
      return date.toLocaleDateString('de-DE', { weekday: 'short' });
    }
    return date.toLocaleDateString('de-DE');
  }

  function getInitials(address: string) {
    return address?.split('<')[0].trim().charAt(0).toUpperCase() || '?';
  }

  let allSelected = $derived(emails.length > 0 && selectedEmailIds.length === emails.length);
  let someSelected = $derived(selectedEmailIds.length > 0 && selectedEmailIds.length < emails.length);
</script>

<div class="h-full flex flex-col relative overflow-hidden">
  <!-- Google-Style Toolbar with Search -->
  <div class="px-2 py-2 border-b border-neutral-100 shrink-0 flex flex-col bg-white sticky top-0 z-20">
    <div class="flex items-center justify-between min-h-12 px-2">
    <div class="flex items-center gap-1 sm:gap-2">
      <!-- Select All Checkbox -->
      <button 
        onclick={onToggleSelectAll}
        class="p-2 hover:bg-neutral-100 rounded-md transition-colors text-neutral-500"
        title="Alle auswählen"
      >
        {#if allSelected}
          <CheckSquare class="w-5 h-5 text-brand-600" />
        {:else}
          <Square class="w-5 h-5" />
        {/if}
      </button>

      {#if selectedEmailIds.length > 0}
        <div class="flex items-center gap-1 border-l border-neutral-200 ml-1 pl-1">
          <button onclick={onBulkDelete} class="p-2 hover:bg-rose-50 hover:text-rose-600 rounded-md transition-colors text-neutral-600" title="Löschen">
            <Trash2 class="w-5 h-5" />
          </button>
          <button onclick={onBulkForward} class="p-2 hover:bg-brand-50 hover:text-brand-600 rounded-md transition-colors text-neutral-600" title="Weiterleiten">
            <Forward class="w-5 h-5" />
          </button>
          <button onclick={onBulkMarkRead} class="p-2 hover:bg-neutral-100 rounded-md transition-colors text-neutral-600" title="Als gelesen markieren">
            <MailOpen class="w-5 h-5" />
          </button>
        </div>
        <span class="hidden sm:inline text-xs font-bold text-neutral-500 ml-2">{selectedEmailIds.length} ausgewählt</span>
      {:else}
        <button onclick={() => window.location.reload()} class="p-2 hover:bg-neutral-100 rounded-md transition-colors text-neutral-500" title="Aktualisieren">
          <RotateCw class="w-4 h-4" />
        </button>
        <div class="ml-2">
          <h2 class="text-sm font-black text-neutral-900 truncate leading-none">{folderName}</h2>
          <p class="text-[10px] font-bold text-neutral-400 mt-0.5 uppercase tracking-wider">{emails.length} Mails</p>
        </div>
      {/if}
    </div>
    </div>

    <!-- Compact Search Bar -->
    <div class="px-2 pb-1">
        <div class="relative group">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 group-focus-within:text-brand-500 transition-colors" />
            <input 
                type="text" 
                bind:value={searchQuery}
                placeholder="In Mails suchen..."
                class="w-full bg-neutral-100 border-none rounded-lg py-2 pl-9 pr-8 text-sm focus:ring-2 focus:ring-brand-500/20 transition-all"
            />
            {#if searchQuery}
                <button onclick={() => searchQuery = ""} class="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-neutral-200 rounded-full text-neutral-400">
                    <X class="w-3 h-3" />
                </button>
            {/if}
        </div>
    </div>
  </div>

  <!-- Email list -->
  <div class="flex-1 overflow-y-auto pb-24 min-h-0">
    {#if isLoading}
      <div class="p-8 text-center text-sm font-medium text-neutral-400 flex justify-center"><div class="w-6 h-6 border-2 border-neutral-200 border-t-neutral-400 rounded-full animate-spin"></div></div>
    {:else if emails.length === 0}
      <div class="p-12 text-center text-sm font-medium text-neutral-400 flex flex-col items-center"><div class="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mb-3"><Folder class="w-5 h-5 text-neutral-400" /></div> Ordner ist leer</div>
    {:else}
      <div class="divide-y divide-neutral-100">
        {#each emails as email (email.id)}
          <div
            class={`group flex items-center gap-0 px-2 sm:px-4 py-1.5 sm:py-2 transition-all border-l-4 cursor-pointer relative animate-enter ${
              selectedEmailId === email.id
                ? 'bg-brand-50/80 border-brand-500'
                : selectedEmailIds.includes(email.id)
                ? 'bg-brand-50/40 border-brand-300'
                : email.is_read
                  ? 'border-transparent hover:bg-neutral-50'
                  : 'border-brand-500 bg-white shadow-[inset_4px_0_0_0_var(--color-brand-500)]'
            }`}
          >
            <!-- Checkbox Area -->
            <button 
              onclick={(e: MouseEvent) => { e.stopPropagation(); onToggleSelect(email.id); }}
              class="p-2 -ml-2 rounded-md transition-colors text-neutral-300 hover:text-neutral-500 group-hover:opacity-100 {selectedEmailIds.includes(email.id) ? 'opacity-100 text-brand-600' : 'sm:opacity-0'}"
            >
              {#if selectedEmailIds.includes(email.id)}
                <CheckSquare class="w-5 h-5" />
              {:else}
                <Square class="w-5 h-5" />
              {/if}
            </button>

            <!-- Sender Initial Avatar -->
            <div class={`hidden sm:flex w-8 h-8 rounded-full items-center justify-center text-xs font-bold shrink-0 mr-3 transition-opacity ${selectedEmailIds.includes(email.id) ? 'opacity-0' : 'opacity-100'} ${email.is_read ? 'bg-neutral-100 text-neutral-500' : 'bg-brand-100 text-brand-700'}`}>
                {getInitials(email.from_address)}
            </div>

            <!-- Content Area -->
            <div 
              class="flex-1 min-w-0 ml-1"
              onclick={() => onEmailSelect(email.id)}
              role="button"
              tabindex="0"
              onkeydown={(e: KeyboardEvent) => e.key === 'Enter' && onEmailSelect(email.id)}
            >
                <div class="flex items-baseline gap-2 justify-between mb-0.5">
                  <p class={`text-xs sm:text-sm truncate max-w-[60%] ${email.is_read ? 'font-medium text-neutral-500' : 'font-bold text-neutral-900'}`}>
                    {email.folder === 'Sent' ? `An: ${email.to_address?.split('<')[0] || email.to_address}` : (email.from_address?.split('<')[0] || email.from_address)}
                  </p>
                  <div class="flex items-center gap-1.5 shrink-0 group-hover:invisible transition-all">
                    {#if email.attachments}
                      {@const attachmentsList = Array.isArray(email.attachments) ? email.attachments : [email.attachments]}
                      {#if attachmentsList.length > 0}
                          <Paperclip class="w-3 h-3 text-neutral-400" />
                      {/if}
                    {/if}
                    <span class="text-[10px] font-bold text-neutral-400">{formatDate(email.date)}</span>
                  </div>
                </div>
                <p class={`text-xs sm:text-sm truncate ${email.is_read ? 'text-neutral-500' : 'text-neutral-900 font-bold'}`}>
                  {email.subject || '(Kein Betreff)'}
                </p>
                <p class="text-[11px] sm:text-xs text-neutral-400 line-clamp-1 mt-0.5 whitespace-normal wrap-break-word">{email.body_text?.replace(/<[^>]*>?/gm, '') || email.body_html?.replace(/<[^>]*>?/gm, '') || ''}</p>
            </div>

            <!-- Quick Hover Actions (Gmail Style) -->
            <div class="absolute right-4 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-1 bg-white/95 backdrop-blur-sm pl-2 rounded-l-lg shadow-[-20px_0_20px_-10px_rgba(255,255,255,1)]">
                <button onclick={(e: MouseEvent) => { e.stopPropagation(); onToggleStar?.(email.id); }} class="p-2 hover:bg-neutral-100 rounded-full {email.is_starred ? 'text-amber-500' : 'text-neutral-400'}" title="Markieren">
                  <Star class="w-4 h-4 {email.is_starred ? 'fill-current' : ''}" />
                </button>
                <button onclick={(e: MouseEvent) => { e.stopPropagation(); onToggleRead?.(email.id); }} class="p-2 hover:bg-neutral-100 rounded-full text-neutral-500" title={email.is_read ? "Als ungelesen markieren" : "Als gelesen markieren"}>
                    {#if email.is_read}<MailIcon class="w-4 h-4" />{:else}<MailOpen class="w-4 h-4" />{/if}
                </button>
                <button onclick={(e: MouseEvent) => { e.stopPropagation(); onDeleteSingle(email.id); }} class="p-2 hover:bg-rose-50 hover:text-rose-600 rounded-full text-neutral-500" title="Löschen">
                    <Trash2 class="w-4 h-4" />
                </button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Pagination -->
  {#if totalPages > 1}
    <!-- Auf Desktop als Leiste behalten -->
    <div class="hidden md:flex border-t border-neutral-100 bg-neutral-50/80 p-4 items-center justify-between shrink-0">
      <button
        onclick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        class="w-10 h-10 flex items-center justify-center bg-white border border-neutral-200 hover:border-neutral-300 hover:text-brand-600 shadow-sm disabled:shadow-none disabled:opacity-50 disabled:pointer-events-none rounded-xl transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none"
        aria-label="Vorherige Seite"
      >
        <ChevronLeft class="w-4 h-4" />
      </button>
      <span class="text-[11px] font-black tracking-widest uppercase text-neutral-500">{currentPage} / {totalPages}</span>
      <button
        onclick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        class="w-10 h-10 flex items-center justify-center bg-white border border-neutral-200 hover:border-neutral-300 hover:text-brand-600 shadow-sm disabled:shadow-none disabled:opacity-50 disabled:pointer-events-none rounded-xl transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none"
        aria-label="Nächste Seite"
      >
        <ChevronRight class="w-4 h-4" />
      </button>
    </div>
  {/if}

  <!-- Mobile Left-Thumb Actions (Pagination FABs) -->
  {#if totalPages > 1 && !isMobileDetailOpen}
  <div class="md:hidden absolute bottom-6 left-4 flex flex-col gap-3 z-40 pb-[env(safe-area-inset-bottom,0px)]">
    <button class="w-14 h-14 bg-white text-neutral-700 border border-neutral-200 rounded-full shadow-lg flex items-center justify-center hover:text-brand-600 active:scale-95 transition-all disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none" onclick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} aria-label="Vorherige Seite" title="Vorherige Seite">
      <ChevronLeft class="w-6 h-6" />
    </button>
    <button class="w-14 h-14 bg-white text-neutral-700 border border-neutral-200 rounded-full shadow-lg flex items-center justify-center hover:text-brand-600 active:scale-95 transition-all disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none" onclick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} aria-label="Nächste Seite" title="Nächste Seite">
      <ChevronRight class="w-6 h-6" />
    </button>
  </div>
  {/if}

  <!-- Mobile Right-Thumb Actions (Menu & Compose FABs) -->
  {#if !isMobileDetailOpen}
    <div class="md:hidden absolute bottom-6 right-4 flex flex-col gap-3 z-40 pb-[env(safe-area-inset-bottom,0px)]">
      <button class="w-14 h-14 bg-white text-neutral-700 border border-neutral-200 rounded-full shadow-lg flex items-center justify-center hover:text-brand-600 active:scale-95 transition-all focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none" onclick={onToggleMenu} aria-label="Ordner" title="Ordner wechseln">
        <Folder class="w-6 h-6" />
      </button>
      <button class="w-14 h-14 bg-brand-600 text-white rounded-full shadow-lg shadow-brand-600/40 flex items-center justify-center hover:bg-brand-700 active:scale-95 transition-all focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none" onclick={onComposeClick} aria-label="Neue E-Mail" title="Neue E-Mail verfassen">
        <PenSquare class="w-6 h-6" />
      </button>
    </div>
  {/if}
</div>
