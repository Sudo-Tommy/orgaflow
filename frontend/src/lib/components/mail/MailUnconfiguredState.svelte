<script lang="ts">
  import { Settings } from 'lucide-svelte';

  interface Props {
    onConfigure: () => void;
  }

  let { onConfigure }: Props = $props();
</script>

<div class="flex-1 flex items-center justify-center bg-slate-50/50 dark:bg-slate-950/40 p-6">
  <div class="text-center max-w-md bg-white dark:bg-slate-800 p-8 sm:p-12 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl">
    <div class="w-16 h-16 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-inner">
      <Settings class="w-8 h-8" />
    </div>
    <h2 class="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mb-2">E-Mail-Postfach einrichten</h2>
    <p class="text-slate-500 dark:text-slate-400 text-sm font-medium mb-6 leading-relaxed">
      Hinterlegen Sie Ihre SMTP- und IMAP-Zugangsdaten, um E-Mails direkt in OrgaFlow zu empfangen und zu versenden.
    </p>
    <button
      type="button"
      onclick={onConfigure}
      class="orga-button-primary w-full min-h-[44px] justify-center text-sm font-bold shadow-sm cursor-pointer active:scale-98 transition-transform"
    >
      Postfach jetzt konfigurieren
    </button>
  </div>
</div>
