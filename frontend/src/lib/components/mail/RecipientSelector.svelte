<script lang="ts">
  import { onMount } from 'svelte';
  import { pb } from '$lib/services/pocketbase';
  import { orgaStore } from '$lib/stores/orgaStore.svelte';
  import type { MailRecipient, RecipientRole } from '$lib/types/mail';
  import { Search, CheckSquare, Square, AlertCircle, Clock, ShieldCheck, UserCheck } from 'lucide-svelte';

  interface Props {
    selectedIds: string[];
    onSelectionChange: (ids: string[]) => void;
  }

  let { selectedIds = $bindable([]), onSelectionChange }: Props = $props();

  let searchQuery = $state('');
  let activeRoleFilter = $state<string>('all');
  let lastContactedMap = $state<Record<string, string>>({});
  let isLoadingLogs = $state(false);

  onMount(async () => {
    isLoadingLogs = true;
    try {
      const logs = await pb.collection('mail_logs').getFullList({
        sort: '-gesendet_am',
        fields: 'empfaenger_id,gesendet_am,status'
      });
      const map: Record<string, string> = {};
      for (const log of logs) {
        if (log.empfaenger_id && !map[log.empfaenger_id] && log.status === 'gesendet') {
          const d = new Date(log.gesendet_am);
          map[log.empfaenger_id] = d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
        }
      }
      lastContactedMap = map;
    } catch {}
    isLoadingLogs = false;
  });

  // Alle Kontakte & Klienten aggregieren und typisieren
  let allRecipients = $derived.by(() => {
    const list: MailRecipient[] = [];

    // 1. Kontakte
    const contacts = orgaStore.contacts?.data || [];
    for (const c of contacts) {
      let role: RecipientRole = 'partner';
      const cName = (c.company_name || '').toLowerCase();
      if (cName.includes('betreu') || cName.includes('kanzlei') || cName.includes('amtsgericht')) {
        role = 'betreuer';
      }

      list.push({
        id: c.id,
        anrede: c.salutation || '',
        vorname: c.name_first || '',
        nachname: c.name_last || '',
        email: c.email || '',
        rolle: role,
        organisation: c.company_name || '',
        opt_out: Boolean(c.opt_out),
        last_contacted: lastContactedMap[c.id],
        originType: 'contact'
      });
    }

    // 2. Klienten
    const clients = orgaStore.clients?.data || [];
    for (const cl of clients) {
      list.push({
        id: cl.id,
        anrede: cl.salutation || '',
        vorname: cl.name_first || '',
        nachname: cl.name_last || '',
        email: cl.email || '',
        rolle: 'klient',
        organisation: '',
        opt_out: Boolean(cl.opt_out || (cl.mailing_list === false)),
        last_contacted: lastContactedMap[cl.id],
        originType: 'client'
      });
    }

    // Alphabetische Sortierung (sprachsensitiv nach Nachname / Firmenname)
    return list.sort((a, b) => {
      const nameA = (`${a.nachname} ${a.vorname}`.trim() || a.organisation || a.email).toLowerCase();
      const nameB = (`${b.nachname} ${b.vorname}`.trim() || b.organisation || b.email).toLowerCase();
      return nameA.localeCompare(nameB, 'de', { sensitivity: 'base' });
    });
  });

  // Filterung nach Rolle & Suche
  let filteredRecipients = $derived.by(() => {
    let result = allRecipients;

    if (activeRoleFilter !== 'all') {
      result = result.filter(r => r.rolle === activeRoleFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(r => 
        r.nachname.toLowerCase().includes(q) ||
        r.vorname.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.organisation.toLowerCase().includes(q)
      );
    }

    return result;
  });

  let selectableRecipients = $derived(filteredRecipients.filter(r => r.email && !r.opt_out));

  function toggleRecipient(id: string) {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter(x => x !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  }

  function selectAll() {
    const idsToAdd = selectableRecipients.map(r => r.id);
    const set = new Set([...selectedIds, ...idsToAdd]);
    onSelectionChange(Array.from(set));
  }

  function deselectAll() {
    const toRemove = new Set(filteredRecipients.map(r => r.id));
    onSelectionChange(selectedIds.filter(id => !toRemove.has(id)));
  }

  const roleChips = [
    { id: 'all', label: 'Alle' },
    { id: 'betreuer', label: 'Gesetzl. Betreuer' },
    { id: 'klient', label: 'Klienten' },
    { id: 'angehoeriger', label: 'Angehörige' },
    { id: 'partner', label: 'Partner & Kanzleien' }
  ];
</script>

<div class="space-y-3.5">
  <!-- Filter-Chips -->
  <div class="flex items-center gap-1.5 flex-wrap">
    {#each roleChips as chip}
      <button
        type="button"
        onclick={() => activeRoleFilter = chip.id}
        class="min-h-9 px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer {activeRoleFilter === chip.id ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'}"
      >
        {chip.label}
      </button>
    {/each}
  </div>

  <!-- Suchleiste & Massenauswahl-Buttons -->
  <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
    <div class="relative flex-1">
      <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        type="text"
        bind:value={searchQuery}
        placeholder="Empfänger suchen (Name, Mail, Organisation)..."
        class="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
    </div>
    <div class="flex items-center gap-2 shrink-0">
      <button
        type="button"
        onclick={selectAll}
        class="min-h-9 px-3 py-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition-colors cursor-pointer"
      >
        Gefilterte wählen ({selectableRecipients.length})
      </button>
      <button
        type="button"
        onclick={deselectAll}
        class="min-h-9 px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded-xl transition-colors cursor-pointer"
      >
        Abwählen
      </button>
    </div>
  </div>

  <!-- Empfänger-Liste (Zero-Inner-Scroll konform, entfaltet sich dynamisch) -->
  <div class="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
    {#if filteredRecipients.length === 0}
      <div class="p-8 text-center text-xs font-medium text-slate-400">
        Keine passenden Kontakte gefunden.
      </div>
    {:else}
      {#each filteredRecipients as rec (rec.id)}
        {@const isDisabled = !rec.email || rec.opt_out}
        {@const isSelected = selectedIds.includes(rec.id)}
        <label
          class="flex items-center justify-between gap-3 p-3 sm:px-4 transition-colors {isDisabled ? 'opacity-40 bg-slate-50/50 dark:bg-slate-950/40 cursor-not-allowed' : 'hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 cursor-pointer'} {isSelected && !isDisabled ? 'bg-indigo-50/60 dark:bg-indigo-950/40' : ''}"
        >
          <div class="flex items-center gap-3 min-w-0 flex-1">
            <input
              type="checkbox"
              disabled={isDisabled}
              checked={isSelected}
              onchange={() => toggleRecipient(rec.id)}
              class="w-4 h-4 text-indigo-600 rounded-md border-slate-300 focus:ring-indigo-500 disabled:opacity-50 cursor-pointer"
            />
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                  {rec.anrede} {rec.vorname} {rec.nachname}
                </span>
                {#if rec.organisation}
                  <span class="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium truncate">
                    {rec.organisation}
                  </span>
                {/if}
                <span class="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full {rec.rolle === 'betreuer' ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300' : rec.rolle === 'klient' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}">
                  {rec.rolle}
                </span>
              </div>
              <div class="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                {rec.email || '⚠️ Keine E-Mail-Adresse hinterlegt'}
              </div>
            </div>
          </div>

          <div class="shrink-0 text-right text-xs">
            {#if rec.opt_out}
              <span class="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-2 py-0.5 rounded-lg">
                <AlertCircle class="w-3.5 h-3.5" /> Abgemeldet
              </span>
            {:else if rec.last_contacted}
              <span class="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                <Clock class="w-3.5 h-3.5 text-slate-400" /> Zuletzt: {rec.last_contacted}
              </span>
            {:else}
              <span class="text-[11px] text-slate-400">Noch nicht angeschrieben</span>
            {/if}
          </div>
        </label>
      {/each}
    {/if}
  </div>
</div>
