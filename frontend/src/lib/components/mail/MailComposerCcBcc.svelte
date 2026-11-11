<script lang="ts">
  interface Props {
    cc: string;
    bcc: string;
  }

  let { cc = $bindable(), bcc = $bindable() }: Props = $props();
</script>

<div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
  <div>
    <label for="compose-cc" class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
      Kopie (CC):
    </label>
    <input
      id="compose-cc"
      type="email"
      bind:value={cc}
      placeholder="kopie@beispiel.de"
      class="w-full min-h-[44px] px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
    />
  </div>
  <div>
    <label for="compose-bcc" class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
      Blindkopie (BCC):
    </label>
    <input
      id="compose-bcc"
      type="email"
      bind:value={bcc}
      placeholder="blindkopie@beispiel.de"
      class="w-full min-h-[44px] px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
    />
  </div>
</div>
