<script lang="ts">
  import type { MailboxMessage } from '$lib/services/emailServiceStore.svelte';
  import MailListRow from './mail/MailListRow.svelte';
  import MailListToolbar from './mail/MailListToolbar.svelte';
  import { RefreshCw, Mail, PenSquare } from 'lucide-svelte';

  interface Props {
    emails: MailboxMessage[];
    selectedEmailId: string | null;
    currentPage: number;
    totalPages: number;
    pageSize?: number;
    isLoading: boolean;
    folderName: string;
    onEmailSelect: (id: string) => void;
    onPageChange: (page: number) => void;
    onToggleMenu: () => void;
    onComposeClick: () => void;
    onMarkAllRead?: () => void;
    onRefresh?: () => void;
    onBulkDelete?: (ids: string[]) => void;
    onBulkMarkRead?: (ids: string[], isRead: boolean) => void;
    onToggleStar?: (id: string) => void;
    onDeleteEmail?: (id: string) => void;
    onReplyEmail?: (id: string) => void;
  }

  let { 
    emails = [], 
    selectedEmailId = null, 
    currentPage = 1, 
    totalPages = 1, 
    pageSize = 25,
    isLoading = false, 
    folderName = 'Posteingang',
    onEmailSelect,
    onPageChange,
    onToggleMenu,
    onComposeClick,
    onMarkAllRead,
    onRefresh,
    onBulkDelete,
    onBulkMarkRead,
    onToggleStar,
    onDeleteEmail,
    onReplyEmail
  }: Props = $props();

  let searchQuery = $state('');
  let dateFilter = $state<'all' | 'today' | 'week' | 'month'>('all');
  let hasAttachmentOnly = $state(false);
  let unreadOnly = $state(false);
  let checkedIds = $state<string[]>([]);

  let filteredEmails = $derived.by(() => {
    const q = searchQuery.trim().toLowerCase();
    const now = Date.now();

    return emails.filter(e => {
      if (unreadOnly && e.is_read) return false;
      if (hasAttachmentOnly && (!e.attachments || e.attachments.length === 0)) return false;

      if (dateFilter !== 'all' && e.date) {
        const mailTime = new Date(e.date).getTime();
        const diffDays = (now - mailTime) / (1000 * 60 * 60 * 24);
        if (dateFilter === 'today' && diffDays > 1) return false;
        if (dateFilter === 'week' && diffDays > 7) return false;
        if (dateFilter === 'month' && diffDays > 31) return false;
      }

      if (!q) return true;
      return (
        (e.subject || '').toLowerCase().includes(q) ||
        (e.from_address || '').toLowerCase().includes(q) ||
        (e.to_address || '').toLowerCase().includes(q) ||
        (e.body_text || '').toLowerCase().includes(q)
      );
    });
  });

  let dynamicTotalPages = $derived(Math.max(1, Math.ceil(filteredEmails.length / pageSize)));
  let visiblePage = $derived(Math.min(currentPage, dynamicTotalPages));

  let visibleEmails = $derived.by(() => {
    const start = (visiblePage - 1) * pageSize;
    return filteredEmails.slice(start, start + pageSize);
  });

  let unreadCount = $derived(emails.filter(e => !e.is_read).length);
  let allVisibleChecked = $derived(
    visibleEmails.length > 0 && visibleEmails.every(e => checkedIds.includes(e.id))
  );

  function toggleCheck(id: string) {
    if (checkedIds.includes(id)) {
      checkedIds = checkedIds.filter(i => i !== id);
    } else {
      checkedIds = [...checkedIds, id];
    }
  }

  function toggleSelectAll() {
    if (allVisibleChecked) {
      const visibleSet = new Set(visibleEmails.map(e => e.id));
      checkedIds = checkedIds.filter(id => !visibleSet.has(id));
    } else {
      const merged = new Set([...checkedIds, ...visibleEmails.map(e => e.id)]);
      checkedIds = Array.from(merged);
    }
  }

  function clearFilters() {
    searchQuery = '';
    dateFilter = 'all';
    hasAttachmentOnly = false;
    unreadOnly = false;
  }

  function handleBulkDeleteClick() {
    if (!checkedIds.length) return;
    onBulkDelete?.(checkedIds);
    checkedIds = [];
  }

  function handleBulkMarkReadClick(read: boolean) {
    if (!checkedIds.length) return;
    onBulkMarkRead?.(checkedIds, read);
    checkedIds = [];
  }
</script>

<div class="flex-1 flex flex-col w-full bg-white dark:bg-slate-900 sm:rounded-r-3xl">
  <MailListToolbar
    {folderName}
    bind:searchQuery
    bind:dateFilter
    bind:hasAttachmentOnly
    bind:unreadOnly
    selectedCount={checkedIds.length}
    allChecked={allVisibleChecked}
    totalFiltered={filteredEmails.length}
    currentPage={visiblePage}
    totalPages={dynamicTotalPages}
    {pageSize}
    {isLoading}
    {unreadCount}
    {onToggleMenu}
    onToggleSelectAll={toggleSelectAll}
    {onRefresh}
    {onMarkAllRead}
    onBulkDelete={handleBulkDeleteClick}
    onBulkMarkRead={handleBulkMarkReadClick}
    {onPageChange}
    onClearFilters={clearFilters}
  />

  <!-- E-Mail-Zeilen im vollen Seitenfluss (Zero-Inner-Scroll) -->
  <div class="flex-1 flex flex-col">
    {#if isLoading && emails.length === 0}
      <div class="p-12 text-center text-xs font-medium text-slate-400 dark:text-slate-500 flex flex-col items-center gap-3">
        <RefreshCw class="w-6 h-6 animate-spin text-indigo-500" />
        <span>E-Mails werden geladen...</span>
      </div>
    {:else if visibleEmails.length === 0}
      <div class="p-14 text-center text-slate-400 dark:text-slate-500 flex flex-col items-center">
        <Mail class="w-10 h-10 mb-3 opacity-30 stroke-[1.5]" />
        <p class="text-sm font-bold text-slate-700 dark:text-slate-200">Keine E-Mails gefunden</p>
        <p class="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-xs">
          {searchQuery || dateFilter !== 'all' || hasAttachmentOnly || unreadOnly
            ? 'Für diese Filterkriterien gibt es keine passenden Nachrichten.'
            : 'In diesem Ordner befinden sich aktuell keine Nachrichten.'}
        </p>
        <button
          type="button"
          onclick={onComposeClick}
          class="mt-4 orga-button-primary px-4 py-2 text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
        >
          <PenSquare class="w-4 h-4" />
          <span>Neue E-Mail schreiben</span>
        </button>
      </div>
    {:else}
      {#each visibleEmails as email (email.id)}
        <MailListRow
          {email}
          isSelected={selectedEmailId === email.id}
          isChecked={checkedIds.includes(email.id)}
          onSelect={() => onEmailSelect(email.id)}
          onToggleCheck={() => toggleCheck(email.id)}
          onToggleStar={() => onToggleStar?.(email.id)}
          onDelete={() => onDeleteEmail?.(email.id)}
          onReply={() => onReplyEmail?.(email.id)}
          onToggleRead={() => onBulkMarkRead?.([email.id], !email.is_read)}
        />
      {/each}
    {/if}
  </div>
</div>
