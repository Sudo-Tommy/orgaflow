<script lang="ts">
  import type { MailboxMessage } from '$lib/services/emailServiceStore.svelte';
  import { Paperclip, Star, Trash2, Reply, MailOpen } from 'lucide-svelte';

  interface Props {
    email: MailboxMessage;
    isSelected: boolean;
    isChecked?: boolean;
    onSelect: () => void;
    onToggleCheck?: () => void;
    onToggleStar?: () => void;
    onDelete?: () => void;
    onReply?: () => void;
    onToggleRead?: () => void;
  }

  let {
    email,
    isSelected,
    isChecked = false,
    onSelect,
    onToggleCheck,
    onToggleStar,
    onDelete,
    onReply,
    onToggleRead
  }: Props = $props();

  let isUnread = $derived(!email.is_read);

  function formatDate(dateStr?: string) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    }
    if (date.getFullYear() === now.getFullYear()) {
      return date.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
    }
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });
  }

  function cleanSnippet(text?: string): string {
    if (!text) return '';
    return text
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]*>?/gm, ' ')
      .replace(/(?:>\s*){2,}/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function formatAddressDisplay(mail: MailboxMessage): string {
    if (mail.folder === 'Sent') {
      const rawTo = mail.to_address || '';
      const cleanName = rawTo.split('<')[0].replace(/["']/g, '').trim();
      const firstPart = cleanName || rawTo.split('@')[0] || 'Empfänger';
      return `An: ${firstPart}`;
    }
    const rawFrom = mail.from_address || '';
    const cleanFrom = rawFrom.split('<')[0].replace(/["']/g, '').trim();
    return cleanFrom || rawFrom || 'Unbekannt';
  }

  function getFolderBadge(mail: MailboxMessage): string | null {
    if (mail.folder === 'INBOX') return 'Posteingang';
    if (mail.folder === 'Sent' && (mail.subject || '').toLowerCase().startsWith('re:')) return 'Posteingang';
    return null;
  }

  let folderBadge = $derived(getFolderBadge(email));
  let snippetText = $derived(cleanSnippet(email.body_text || email.body_html));
</script>

<div
  class="group relative flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 min-h-[46px] border-b border-slate-100 dark:border-slate-800/80 transition-colors cursor-pointer select-none {
    isChecked
      ? 'bg-indigo-50/90 dark:bg-indigo-950/60'
      : isSelected
        ? 'bg-indigo-50/70 dark:bg-indigo-950/50'
        : isUnread
          ? 'bg-white dark:bg-slate-900 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800/70'
          : 'bg-slate-50/40 dark:bg-slate-900/40 hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
  }"
  onclick={onSelect}
  onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(); } }}
  role="button"
  tabindex="0"
>
  <!-- Checkbox & Stern (wie in Bild 3 links) -->
  <div class="flex items-center gap-1.5 shrink-0" onclick={(e) => e.stopPropagation()} role="presentation">
    <input
      type="checkbox"
      checked={isChecked}
      onchange={() => onToggleCheck?.()}
      aria-label="E-Mail auswählen"
      class="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
    />
    <button
      type="button"
      onclick={() => onToggleStar?.()}
      aria-label="Als wichtig markieren"
      class="p-1 rounded-lg text-slate-400 hover:text-amber-400 transition-colors cursor-pointer"
    >
      <Star class="w-4 h-4 {email.is_starred ? 'fill-amber-400 text-amber-400' : ''}" />
    </button>
  </div>

  <!-- Empfänger / Absender Spalte (feste Breite auf Desktop wie Gmail) -->
  <div class="w-28 sm:w-44 md:w-48 shrink-0 flex items-center gap-1.5 min-w-0 pr-2">
    {#if isUnread}
      <span class="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400 shrink-0" title="Ungelesen"></span>
    {/if}
    <span class="text-xs sm:text-sm truncate {isUnread ? 'font-extrabold text-slate-900 dark:text-white' : 'font-medium text-slate-700 dark:text-slate-200'}">
      {formatAddressDisplay(email)}
    </span>
  </div>

  <!-- Betreff + Ordner-Badge + grauer Textausschnitt in EINER Zeile (Bild 3) -->
  <div class="flex-1 min-w-0 flex items-center gap-2 overflow-hidden">
    {#if folderBadge}
      <span class="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-bold rounded bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-200 shrink-0 leading-none">
        {folderBadge}
      </span>
    {/if}

    <div class="truncate text-xs sm:text-sm flex-1 min-w-0">
      <span class="{isUnread ? 'font-extrabold text-slate-900 dark:text-white' : 'font-semibold text-slate-800 dark:text-slate-200'}">
        {email.subject || '(Kein Betreff)'}
      </span>
      {#if snippetText}
        <span class="text-slate-400 dark:text-slate-500 font-normal">
          &nbsp;-&nbsp;{snippetText}
        </span>
      {/if}
    </div>
  </div>

  <!-- Rechte Seite: Anhang-Icon & Datum (oder Hover-Schnellaktionen) -->
  <div class=" flex items-center gap-2 shrink-0 ml-2">
    {#if email.attachments && email.attachments.length > 0}
      <span title="{email.attachments.length} Anhang/Anhänge" class="text-slate-400 dark:text-slate-500">
        <Paperclip class="w-3.5 h-3.5" />
      </span>
    {/if}

    <!-- Schnellaktionen bei Hover auf großen Bildschirmen -->
    <div
      class="hidden md:group-hover:flex items-center gap-1 bg-white/95 dark:bg-slate-800/95 px-1.5 py-0.5 rounded-lg shadow-xs border border-slate-200/80 dark:border-slate-700"
      onclick={(e) => e.stopPropagation()}
      role="presentation"
    >
      {#if onReply}
        <button
          type="button"
          onclick={onReply}
          title="Direkt antworten"
          class="p-1 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 rounded cursor-pointer"
        >
          <Reply class="w-3.5 h-3.5" />
        </button>
      {/if}
      {#if onToggleRead}
        <button
          type="button"
          onclick={onToggleRead}
          title={isUnread ? 'Als gelesen markieren' : 'Als ungelesen markieren'}
          class="p-1 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 rounded cursor-pointer"
        >
          <MailOpen class="w-3.5 h-3.5" />
        </button>
      {/if}
      {#if onDelete}
        <button
          type="button"
          onclick={onDelete}
          title="Löschen"
          class="p-1 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 rounded cursor-pointer"
        >
          <Trash2 class="w-3.5 h-3.5" />
        </button>
      {/if}
    </div>

    <span class="text-[11px] sm:text-xs md:group-hover:hidden text-right min-w-[48px] {isUnread ? 'font-bold text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 font-medium'}">
      {formatDate(email.date)}
    </span>
  </div>
</div>
