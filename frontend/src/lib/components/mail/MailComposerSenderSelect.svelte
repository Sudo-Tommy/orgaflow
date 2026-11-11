<script lang="ts">
  import type { MailSenderOption } from './mailComposerHelper';

  interface Props {
    availableSenders: MailSenderOption[];
    selectedProvider: 'ionos' | 'google';
    fromName: string;
  }

  let { availableSenders, selectedProvider = $bindable(), fromName = $bindable() }: Props = $props();
</script>

<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
  <div>
    <div class="flex items-center justify-between mb-1">
      <label for="compose-sender" class="block text-xs font-bold text-slate-700 dark:text-slate-300">
        Absender-Konto:
      </label>
      <span class="px-2 py-0.5 text-[10px] font-bold rounded-full {
        selectedProvider === 'google' 
          ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800' 
          : 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300 border border-sky-200 dark:border-sky-800'
      }">
        {selectedProvider === 'google' ? 'Google Mail' : 'IONOS (Standard)'}
      </span>
    </div>
    <select
      id="compose-sender"
      bind:value={selectedProvider}
      class="w-full min-h-[44px] px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
    >
      {#each availableSenders as s (s.id)}
        <option value={s.id}>{s.label}</option>
      {/each}
    </select>
  </div>

  <div>
    <div class="flex items-center justify-between mb-1">
      <label for="compose-from-name" class="block text-xs font-bold text-slate-700 dark:text-slate-300">
        Absendername (Anzeige):
      </label>
      <span class="text-[10px] text-slate-400">z. B. Firma</span>
    </div>
    <input
      id="compose-from-name"
      type="text"
      bind:value={fromName}
      placeholder="Ihre Seniorenassistenz"
      class="w-full min-h-[44px] px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
    />
  </div>
</div>
