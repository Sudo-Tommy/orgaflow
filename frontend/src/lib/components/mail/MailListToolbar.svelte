<script lang="ts">
  import { Search, Menu, RefreshCw, ChevronLeft, ChevronRight, CheckCheck, Trash2, MailOpen, Paperclip, Calendar, SlidersHorizontal, X } from 'lucide-svelte';

  interface Props {
    folderName: string;
    searchQuery: string;
    dateFilter: 'all' | 'today' | 'week' | 'month';
    hasAttachmentOnly: boolean;
    unreadOnly: boolean;
    selectedCount: number;
    allChecked: boolean;
    totalFiltered: number;
    currentPage: number;
    totalPages: number;
    pageSize: number;
    isLoading: boolean;
    unreadCount: number;
    onToggleMenu: () => void;
    onToggleSelectAll: () => void;
    onRefresh?: () => void;
    onMarkAllRead?: () => void;
    onBulkDelete?: () => void;
    onBulkMarkRead?: (read: boolean) => void;
    onPageChange: (page: number) => void;
    onClearFilters: () => void;
  }

  let {
    folderName,
    searchQuery = $bindable(''),
    dateFilter = $bindable('all'),
    hasAttachmentOnly = $bindable(false),
    unreadOnly = $bindable(false),
    selectedCount = 0,
    allChecked = false,
    totalFiltered = 0,
    currentPage = 1,
    totalPages = 1,
    pageSize = 25,
    isLoading = false,
    unreadCount = 0,
    onToggleMenu,
    onToggleSelectAll,
    onRefresh,
    onMarkAllRead,
    onBulkDelete,
    onBulkMarkRead,
    onPageChange,
    onClearFilters
  }: Props = $props();

  let rangeStart = $derived(totalFiltered === 0 ? 0 : (currentPage - 1) * pageSize + 1);
  let rangeEnd = $derived(Math.min(totalFiltered, currentPage * pageSize));
  let hasActiveFilters = $derived(dateFilter !== 'all' || hasAttachmentOnly || unreadOnly || searchQuery.trim().length > 0);
</script>

<div class="border-b border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 sm:px-5 py-3 space-y-2.5">
  <!-- Zeile 1: Große Gmail-Suchleiste (Bild 3) -->
  <div class="flex items-center gap-2 sm:gap-3">
    <button type="button" onclick={onToggleMenu} class="lg:hidden min-h-[42px] min-w-[42px] inline-flex items-center justify-center p-2 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shrink-0" aria-label="Menü öffnen">
      <Menu class="w-5 h-5" />
    </button>

    <div class="relative flex-1 max-w-2xl">
      <Search class="w-4 h-4 sm:w-5 sm:h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      <input
        type="search"
        placeholder="In E-Mails suchen ({folderName})..."
        bind:value={searchQuery}
        class="w-full min-h-[44px] pl-11 pr-10 py-2 bg-slate-100/90 dark:bg-slate-800/90 border border-transparent focus:border-indigo-500/40 focus:bg-white dark:focus:bg-slate-900 rounded-full text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
      />
      {#if searchQuery}
        <button type="button" onclick={() => searchQuery = ''} class="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer" aria-label="Suche löschen">
          <X class="w-4 h-4" />
        </button>
      {/if}
    </div>
  </div>

  <!-- Zeile 2: Filter-Chips wie in Bild 3 ("Beliebiger Zeitraum", "Mit Anhang", "Ungelesen") -->
  <div class="flex flex-wrap items-center gap-2">
    <div class="relative inline-flex items-center">
      <Calendar class="w-3.5 h-3.5 absolute left-3 text-slate-500 dark:text-slate-400 pointer-events-none" />
      <select
        aria-label="Zeitraum filtern"
        bind:value={dateFilter}
        class="min-h-[34px] pl-8 pr-7 py-1 text-xs font-bold rounded-lg border transition-colors cursor-pointer {dateFilter !== 'all' ? 'bg-indigo-50 dark:bg-indigo-950/70 border-indigo-400 text-indigo-700 dark:text-indigo-300' : 'bg-white dark:bg-slate-800/80 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}"
      >
        <option value="all">Beliebiger Zeitraum</option>
        <option value="today">Heute</option>
        <option value="week">Letzte 7 Tage</option>
        <option value="month">Letzte 30 Tage</option>
      </select>
    </div>

    <button
      type="button"
      onclick={() => hasAttachmentOnly = !hasAttachmentOnly}
      class="min-h-[34px] px-3 py-1 text-xs font-bold rounded-lg border inline-flex items-center gap-1.5 transition-colors cursor-pointer {hasAttachmentOnly ? 'bg-indigo-50 dark:bg-indigo-950/70 border-indigo-400 text-indigo-700 dark:text-indigo-300' : 'bg-white dark:bg-slate-800/80 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}"
    >
      <Paperclip class="w-3.5 h-3.5" /> <span>Mit Anhang</span>
    </button>

    <button
      type="button"
      onclick={() => unreadOnly = !unreadOnly}
      class="min-h-[34px] px-3 py-1 text-xs font-bold rounded-lg border inline-flex items-center gap-1.5 transition-colors cursor-pointer {unreadOnly ? 'bg-indigo-50 dark:bg-indigo-950/70 border-indigo-400 text-indigo-700 dark:text-indigo-300' : 'bg-white dark:bg-slate-800/80 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}"
    >
      <SlidersHorizontal class="w-3.5 h-3.5" /> <span>Nur Ungelesene</span>
    </button>

    {#if hasActiveFilters}
      <button type="button" onclick={onClearFilters} class="min-h-[34px] px-2.5 py-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer">
        Filter zurücksetzen
      </button>
    {/if}
  </div>

  <!-- Zeile 3: Aktionsleiste links + Seitennavigation rechts ("1–25 von 127 < >") -->
  <div class="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/80">
    <div class="flex items-center gap-2">
      <label class="inline-flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer" title="Alle auf dieser Seite auswählen">
        <input type="checkbox" checked={allChecked} onchange={onToggleSelectAll} class="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
      </label>

      {#if selectedCount > 0}
        <div class="flex items-center gap-1.5 pl-1">
          <span class="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 mr-1">{selectedCount} gewählt</span>
          {#if onBulkMarkRead}
            <button type="button" onclick={() => onBulkMarkRead(true)} class="min-h-[34px] px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 cursor-pointer" title="Als gelesen markieren">
              <MailOpen class="w-3.5 h-3.5" /> <span class="hidden sm:inline">Gelesen</span>
            </button>
          {/if}
          {#if onBulkDelete}
            <button type="button" onclick={onBulkDelete} class="min-h-[34px] px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-xs font-bold text-rose-600 dark:text-rose-300 inline-flex items-center gap-1.5 cursor-pointer" title="Ausgewählte löschen">
              <Trash2 class="w-3.5 h-3.5" /> <span class="hidden sm:inline">Löschen</span>
            </button>
          {/if}
        </div>
      {:else}
        {#if onRefresh}
          <button type="button" onclick={onRefresh} disabled={isLoading} class="p-2 rounded-full text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50" title="Aktualisieren" aria-label="Postfach aktualisieren">
            <RefreshCw class="w-4 h-4 {isLoading ? 'animate-spin text-indigo-500' : ''}" />
          </button>
        {/if}
        {#if onMarkAllRead && unreadCount > 0}
          <button type="button" onclick={onMarkAllRead} class="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 transition-colors cursor-pointer" title="Alle als gelesen markieren">
            <CheckCheck class="w-4 h-4 text-indigo-500" /> <span class="hidden sm:inline">Alle gelesen</span>
          </button>
        {/if}
      {/if}
    </div>

    <div class="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-semibold">
      <span>{rangeStart}–{rangeEnd} von {totalFiltered}</span>
      <div class="flex items-center gap-0.5">
        <button type="button" onclick={() => onPageChange(currentPage - 1)} disabled={currentPage <= 1} aria-label="Vorherige Seite" class="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer">
          <ChevronLeft class="w-4 h-4" />
        </button>
        <button type="button" onclick={() => onPageChange(currentPage + 1)} disabled={currentPage >= totalPages} aria-label="Nächste Seite" class="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer">
          <ChevronRight class="w-4 h-4" />
        </button>
      </div>
    </div>
  </div>
</div>
