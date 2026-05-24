<script lang="ts">
  import type { MailboxFolder } from '$lib/services/mailboxService.svelte';

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
    selectedUserEmail?: string;
    onUserChange?: (email: string) => void;
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
    selectedUserEmail = '',
    onUserChange
  } = $props();
</script>

<div class="h-full flex flex-col">
  <!-- Header -->
  <div class="p-4 sm:p-5 border-b border-neutral-100 bg-white">
    <div class="flex items-center justify-between md:hidden mb-4">
      <h2 class="font-bold text-lg text-neutral-900">Postfach</h2>
      <button aria-label="Menü schließen" onclick={onCloseMenu} class="p-2 -mr-2 text-neutral-500 hover:bg-neutral-100 rounded-lg transition-colors"><svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
    </div>

    <!-- Superadmin Dropdown zum Wechseln der Postfächer -->
    {#if isSuperAdmin && users && users.length > 0}
      <div class="mb-4">
        <label for="mail-user-filter" class="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">Postfach für Nutzer:</label>
        <select id="mail-user-filter" value={selectedUserEmail} onchange={(e) => onUserChange?.(e.currentTarget.value)} class="w-full bg-neutral-50 border border-neutral-200 text-sm font-semibold text-neutral-700 rounded-lg px-2 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer">
            <option value="all">Alle E-Mails (Firma)</option>
            {#each users as u}
                {#if u.email}<option value={u.email}>{u.name_first} {u.name_last}</option>{/if}
            {/each}
        </select>
      </div>
    {/if}

    <div class="flex flex-col gap-2 mb-2 md:mb-4">
       <!-- UX-Optimierung: "Neue Mail" Button auf Mobile ausblenden (FAB in MailList übernimmt das) -->
      <div class="hidden md:flex gap-2 mb-2">
        <button
          onclick={onComposeClick}
          disabled={isLoading}
          class="orga-button-primary w-full shadow-indigo-600/20 py-2.5 px-4"
        >
          <span class="text-lg">✏️</span>
          <span class="text-sm font-medium">Neue Mail</span>
        </button>
      </div>

      <button
        onclick={onConfigClick}
        class="w-full px-3 py-2.5 text-sm font-semibold text-neutral-600 hover:text-indigo-700 hover:bg-indigo-50/50 rounded-lg flex items-center gap-2 transition-colors"
      >
        <span class="text-base">⚙️</span>
        Einstellungen
      </button>
    </div>
  </div>

  <!-- Unread count -->
  {#if totalUnread > 0}
    <div class="px-4 py-3 bg-indigo-50/50 border-b border-indigo-100">
      <p class="text-xs font-bold text-indigo-800 uppercase tracking-wider">{totalUnread} ungelesene Mails</p>
    </div>
  {/if}

  <!-- Folders -->
  <div class="flex-1 overflow-y-auto">
    {#if isLoading}
      <div class="p-4 text-center text-sm text-neutral-500">Lädt...</div>
    {:else if folders.length === 0}
      <div class="p-4 text-center text-sm text-neutral-500">Keine Ordner gefunden</div>
    {:else}
      <nav class="py-2">
        {#each folders as folder (folder.id)}
          <button
            onclick={() => onFolderSelect(folder.folder_path)}
            class={`w-full px-4 py-3 text-left text-sm hover:bg-neutral-50 transition-colors flex items-center justify-between group ${
              selectedFolderPath === folder.folder_path ? 'bg-indigo-50/50 border-l-4 border-indigo-600 text-indigo-900 font-bold' : 'border-l-4 border-transparent text-neutral-700'
            }`}
          >
            <div class="flex items-center gap-3 flex-1 min-w-0">
              <span class="text-base shrink-0">📥</span>
              <div class="min-w-0">
                <p class="font-medium truncate">{folder.folder_name}</p>
                <p class="text-[10px] text-neutral-500 mt-0.5">{folder.total_count || 0} E-Mails</p>
              </div>
            </div>
            {#if folder.unread_count > 0}
              <span class="ml-2 px-2 py-0.5 bg-rose-500 text-white text-[10px] font-bold rounded-full shrink-0 shadow-sm">
                {folder.unread_count}
              </span>
            {/if}
          </button>
        {/each}
      </nav>
    {/if}
  </div>
</div>
