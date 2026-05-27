<script lang="ts">
  import type { MailboxFolder } from '$lib/services/mailboxServiceStore';
  import { slide } from 'svelte/transition';
  import { Inbox, Send, Trash2, Settings, PenSquare, X, ChevronDown, Check, Folder } from 'lucide-svelte';

  interface Props {
    folders: MailboxFolder[];
    selectedFolderPath: string;
    totalUnread: number;
    onFolderSelect: (path: string) => void;
    onConfigClick: () => void;
    onComposeClick: () => void;
    isLoading: boolean;
    onCloseMenu?: () => void;
    isSuperAdmin?: boolean;
    users?: any[];
    selectedUserId?: string;
    onUserChange?: (userId: string) => void;
  }

  let { 
    folders, 
    selectedFolderPath, 
    totalUnread, 
    onFolderSelect, 
    onConfigClick, 
    onComposeClick,
    isLoading,
    onCloseMenu,
    isSuperAdmin = false,
    users = [],
    selectedUserId = '',
    onUserChange
  } = $props();

  let isUserDropdownOpen = $state(false);

  function getFolderIcon(path: string) {
      if (path === 'INBOX') return Inbox;
      if (path === 'Sent') return Send;
      if (path === 'Trash') return Trash2;
      return Folder;
  }
</script>

<!-- Invisible Backdrop for Custom Dropdown -->
{#if isUserDropdownOpen}
    <button type="button" class="fixed inset-0 z-40 cursor-default outline-none" aria-label="Dropdown schließen" onclick={() => isUserDropdownOpen = false}></button>
{/if}

<div class="h-full flex flex-col">
  <!-- Header -->
  <div class="p-4 sm:p-5 border-b border-neutral-100 bg-white shrink-0">
    <div class="flex items-center justify-between md:hidden mb-4">
      <h2 class="font-black text-xl text-neutral-900 flex items-center gap-2"><Inbox class="w-5 h-5 text-brand-600" /> Postfach</h2>
      <button aria-label="Menü schließen" onclick={onCloseMenu} class="w-10 h-10 -mr-2 flex items-center justify-center text-neutral-500 hover:bg-neutral-100 rounded-full transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-neutral-500 focus-visible:outline-none">
        <X class="w-5 h-5" />
      </button>
    </div>

    <!-- Superadmin Dropdown zum Wechseln der persönlichen Postfächer -->
    {#if isSuperAdmin && users && users.length > 0}
      <div class="mb-5 relative z-50">
        <!-- svelte-ignore a11y_label_has_associated_control -->
        <label id="user-filter-label" class="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">Postfach für Nutzer:</label>
        <button 
            type="button" 
            aria-labelledby="user-filter-label"
            aria-expanded={isUserDropdownOpen}
            onclick={() => isUserDropdownOpen = !isUserDropdownOpen}
            class="w-full bg-neutral-50 border border-neutral-200 hover:border-brand-300 rounded-xl px-4 min-h-12 text-sm flex items-center justify-between cursor-pointer transition-all shadow-sm focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none"
        >
            <span class="font-bold text-neutral-800 truncate">
                {selectedUserId === 'all' ? '-- Alle E-Mails im System --' : users.find(u => u.id === selectedUserId)?.name_first + ' ' + users.find(u => u.id === selectedUserId)?.name_last}
            </span>
            <ChevronDown class="w-4 h-4 text-neutral-400 transition-transform duration-300 {isUserDropdownOpen ? 'rotate-180' : ''}" />
        </button>
        
        {#if isUserDropdownOpen}
            <div transition:slide={{ duration: 200 }} class="absolute left-0 right-0 mt-2 bg-white border border-neutral-200 rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto custom-scrollbar">
                <button type="button" class="w-full text-left px-4 py-3 min-h-12 text-sm hover:bg-neutral-50 transition-colors border-b border-neutral-100 flex items-center justify-between focus-visible:bg-neutral-50 focus-visible:outline-none" onclick={() => { onUserChange?.('all'); isUserDropdownOpen = false; }}>
                    <span class="font-bold text-neutral-600">-- Alle E-Mails im System --</span>
                    {#if selectedUserId === 'all'}<Check class="w-4 h-4 text-brand-600" />{/if}
                </button>
                {#each users as u}
                    <button type="button" class="w-full text-left px-4 py-3 min-h-12 text-sm hover:bg-neutral-50 transition-colors border-b border-neutral-100 last:border-b-0 flex items-center justify-between focus-visible:bg-neutral-50 focus-visible:outline-none" onclick={() => { onUserChange?.(u.id); isUserDropdownOpen = false; }}>
                        <span class="font-bold text-neutral-900">{u.name_first} {u.name_last}</span> 
                        {#if selectedUserId === u.id}<Check class="w-4 h-4 text-brand-600" />{/if}
                    </button>
                {/each}
            </div>
        {/if}
      </div>
    {/if}

    <div class="flex flex-col gap-3 mb-2 md:mb-4">
       <!-- UX-Optimierung: "Neue Mail" Button auf Mobile ausblenden (FAB in MailList übernimmt das) -->
      <div class="hidden md:flex gap-2 mb-1">
        <button
          onclick={onComposeClick}
          disabled={isLoading}
          class="orga-button-primary w-full shadow-brand-600/20 min-h-14"
        >
          <PenSquare class="w-5 h-5" />
          <span class="text-sm font-bold">Neue Mail</span>
        </button>
      </div>

      <button
        onclick={onConfigClick}
        class="w-full px-4 min-h-12 text-sm font-bold text-neutral-600 hover:text-brand-700 hover:bg-brand-50 rounded-xl flex items-center gap-3 transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none"
      >
        <Settings class="w-4 h-4" />
        Einstellungen
      </button>
    </div>
  </div>

  <!-- Unread count -->
  {#if totalUnread > 0}
    <div transition:slide class="px-5 py-4 bg-brand-50/50 border-b border-brand-100 shadow-inner shrink-0">
      <p class="text-[11px] font-black text-brand-800 uppercase tracking-widest">{totalUnread} ungelesene Mails</p>
    </div>
  {/if}

  <!-- Folders -->
  <div class="flex-1 overflow-y-auto min-h-0">
    {#if isLoading}
      <div class="p-8 text-center text-sm font-medium text-neutral-400 flex flex-col items-center gap-3"><div class="w-6 h-6 border-2 border-neutral-200 border-t-neutral-400 rounded-full animate-spin"></div> Lädt...</div>
    {:else if folders.length === 0}
      <div class="p-8 text-center text-sm font-medium text-neutral-400">Keine Ordner gefunden</div>
    {:else}
      <nav class="py-2">
        {#each folders as folder (folder.id)}
          {@const FolderIcon = getFolderIcon(folder.folder_path)}
          <button
            onclick={() => onFolderSelect(folder.folder_path)}
            class={`w-full px-5 py-3.5 text-left text-sm hover:bg-neutral-50 transition-all flex items-center justify-between group focus-visible:outline-none focus-visible:bg-neutral-50 ${
              selectedFolderPath === folder.folder_path ? 'bg-brand-50 border-l-4 border-brand-600 text-brand-900 font-bold shadow-sm' : 'border-l-4 border-transparent text-neutral-700 font-medium'
            }`}
          >
            <div class="flex items-center gap-3 flex-1 min-w-0">
              <FolderIcon class="w-5 h-5 shrink-0 {selectedFolderPath === folder.folder_path ? 'text-brand-600' : 'text-neutral-400 group-hover:text-brand-500 transition-colors'}" />
              <div class="min-w-0">
                <p class="truncate">{folder.folder_name}</p>
                <p class="text-[10px] text-neutral-500 mt-0.5">{folder.total_count || 0} E-Mails</p>
              </div>
            </div>
            {#if folder.unread_count > 0}
              <span class="ml-2 px-2.5 py-0.5 bg-rose-500 text-white text-[10px] font-bold rounded-full shrink-0 shadow-sm">
                {folder.unread_count}
              </span>
            {/if}
          </button>
        {/each}
      </nav>
    {/if}
  </div>
</div>
