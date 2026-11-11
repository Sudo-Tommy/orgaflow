<script lang="ts">
  import type { MailboxFolder } from '$lib/services/mailboxServiceStore.svelte';
  import { 
    Inbox, 
    Send, 
    Trash2, 
    Star, 
    Folder, 
    Settings, 
    PenSquare, 
    RefreshCw, 
    X, 
    Mail, 
    Users,
    Megaphone
  } from 'lucide-svelte';

  interface Props {
    folders: MailboxFolder[];
    selectedFolderPath: string;
    totalUnread: number;
    onFolderSelect: (path: string) => void;
    onConfigClick: () => void;
    onComposeClick: () => void;
    onMassMailClick?: () => void;
    onSyncClick?: () => void;
    isLoading: boolean;
    isSyncing?: boolean;
    onCloseMenu?: () => void;
    isSuperAdmin?: boolean;
    users?: any[];
    selectedUserEmail?: string;
    onUserChange?: (email: string) => void;
  }

  let { 
    folders = [], 
    selectedFolderPath = 'INBOX', 
    totalUnread = 0, 
    onFolderSelect, 
    onConfigClick, 
    onComposeClick,
    onMassMailClick,
    onSyncClick,
    isLoading = false,
    isSyncing = false,
    onCloseMenu,
    isSuperAdmin = false,
    users = [],
    selectedUserEmail = '',
    onUserChange
  }: Props = $props();

  const sortedUsers = $derived(
    [...users].filter(u => u.email).sort((a, b) => {
      const nameA = (`${a.name_first || ''} ${a.name_last || ''}`.trim() || a.email || '').toLowerCase();
      const nameB = (`${b.name_first || ''} ${b.name_last || ''}`.trim() || b.email || '').toLowerCase();
      return nameA.localeCompare(nameB, 'de', { sensitivity: 'base' });
    })
  );

  function getFolderIcon(folderPath: string) {
    const p = folderPath.toLowerCase();
    if (p === 'inbox') return Inbox;
    if (p === 'sent' || p.includes('gesendet')) return Send;
    if (p === 'starred' || p.includes('markiert')) return Star;
    if (p === 'trash' || p.includes('papierkorb')) return Trash2;
    return Folder;
  }
</script>

<div class="h-full flex flex-col py-4 px-3 space-y-4">
  <!-- Mobile Header -->
  <div class="flex items-center justify-between lg:hidden px-1">
    <div class="flex items-center gap-2">
      <Mail class="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
      <h2 class="font-bold text-base text-slate-900 dark:text-white">Postfach</h2>
    </div>
    <button 
      type="button"
      aria-label="Menü schließen" 
      onclick={onCloseMenu} 
      class="min-h-[40px] min-w-[40px] inline-flex items-center justify-center p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
    >
      <X class="w-5 h-5" />
    </button>
  </div>

  <!-- Prominente Buttons: "Schreiben" & "Massenmail" -->
  <div class="px-1 space-y-2">
    <button
      type="button"
      onclick={onComposeClick}
      disabled={isLoading}
      class="w-full min-h-[48px] py-2.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white font-bold text-sm shadow-md shadow-indigo-500/20 flex items-center gap-2.5 transition-all active:scale-98 cursor-pointer"
    >
      <PenSquare class="w-4 h-4 stroke-[2.2]" />
      <span>Schreiben</span>
    </button>

    {#if onMassMailClick}
      <button
        type="button"
        onclick={onMassMailClick}
        class="w-full min-h-[42px] py-2 px-3.5 rounded-xl bg-violet-50 hover:bg-violet-100 dark:bg-violet-950/40 dark:hover:bg-violet-900/50 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-2xs active:scale-98"
        title="Personalisierte Einzel-E-Mails an Betreuer, Klienten &amp; Partner"
      >
        <Megaphone class="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
        <span>Massenmail (Akquise)</span>
      </button>
    {/if}
  </div>

  <!-- Ordner-Navigation im Gmail-Pill-Stil -->
  <nav class="space-y-1 flex-1">
    {#if isLoading && folders.length === 0}
      <div class="p-6 text-center text-xs font-medium text-slate-400 flex flex-col items-center gap-2">
        <RefreshCw class="w-5 h-5 animate-spin text-indigo-500" />
        <span>Wird geladen...</span>
      </div>
    {:else}
      {#each folders as folder (folder.id || folder.folder_path)}
        {@const IconComponent = getFolderIcon(folder.folder_path)}
        {@const isSelected = selectedFolderPath === folder.folder_path}
        <button
          type="button"
          onclick={() => onFolderSelect(folder.folder_path)}
          class="w-full min-h-[42px] px-4 py-2 text-left text-xs sm:text-sm rounded-full transition-all flex items-center justify-between group cursor-pointer {
            isSelected 
              ? 'bg-indigo-100/90 dark:bg-indigo-950/90 text-indigo-950 dark:text-indigo-200 font-extrabold shadow-2xs' 
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800/70 font-medium'
          }"
        >
          <div class="flex items-center gap-3 min-w-0">
            <IconComponent class="w-4 h-4 shrink-0 {isSelected ? 'text-indigo-600 dark:text-indigo-400 stroke-[2.5]' : 'text-slate-500 dark:text-slate-400'}" />
            <span class="truncate">{folder.folder_name}</span>
          </div>
          
          <div class="flex items-center gap-1 shrink-0 ml-2">
            {#if folder.unread_count > 0}
              <span class="text-xs font-black text-indigo-700 dark:text-indigo-300">
                {folder.unread_count}
              </span>
            {:else if folder.total_count > 0}
              <span class="text-[11px] text-slate-400 dark:text-slate-500 font-semibold">
                {folder.total_count}
              </span>
            {/if}
          </div>
        </button>
      {/each}
    {/if}
  </nav>

  <!-- Postfach-Auswahl & Konto-Aktionen unten -->
  <div class="pt-3 border-t border-slate-200/80 dark:border-slate-800 space-y-2.5 px-1">
    {#if isSuperAdmin && sortedUsers.length > 0}
      <div>
        <label for="mail-user-filter" class="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
          <Users class="w-3 h-3 text-indigo-500" />
          <span>Postfach:</span>
        </label>
        <select 
          id="mail-user-filter" 
          value={selectedUserEmail} 
          onchange={(e) => onUserChange?.(e.currentTarget.value)} 
          class="w-full min-h-[40px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 rounded-xl px-2.5 py-1.5 shadow-2xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 cursor-pointer"
        >
          <option value="all">Alle Postfächer (Firma)</option>
          {#each sortedUsers as u (u.id || u.email)}
            <option value={u.email}>{u.name_first || ''} {u.name_last || ''}</option>
          {/each}
        </select>
      </div>
    {/if}

    <div class="flex items-center gap-1.5">
      {#if onSyncClick}
        <button
          type="button"
          onclick={onSyncClick}
          disabled={isSyncing || isLoading}
          title="Postfach synchronisieren"
          class="flex-1 min-h-[40px] px-2.5 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
        >
          <RefreshCw class="w-3.5 h-3.5 {isSyncing ? 'animate-spin text-indigo-600' : ''}" />
          <span>Abrufen</span>
        </button>
      {/if}

      <button
        type="button"
        onclick={onConfigClick}
        title="Postfach-Konto einrichten"
        class="flex-1 min-h-[40px] px-2.5 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
      >
        <Settings class="w-3.5 h-3.5" />
        <span>Konto</span>
      </button>
    </div>
  </div>
</div>
