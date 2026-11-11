<script lang="ts">
  import type { MailConfig, MailConfigInput } from '$lib/services/mailConfigServiceStore.svelte';
  import { X, Settings, AlertCircle, Save, Loader2, CheckCircle2 } from 'lucide-svelte';

  interface Props {
    currentConfig: MailConfig | null;
    isLoading: boolean;
    error: string | null;
    onSave: (input: MailConfigInput) => Promise<void>;
    onClose: () => void;
  }

  let { currentConfig, isLoading, error, onSave, onClose }: Props = $props();

  let dialog = $state<HTMLDialogElement | null>(null);
  let smtpHost = $state('');
  let smtpPort = $state(587);
  let smtpUser = $state('');
  let smtpPassword = $state('');
  let imapHost = $state('');
  let imapPort = $state(993);
  let emailAddress = $state('');
  let saveError = $state<string | null>(null);
  let isSaving = $state(false);

  $effect(() => {
    dialog?.showModal();
  });

  $effect(() => {
    if (currentConfig) {
      smtpHost = currentConfig.smtp_host || '';
      smtpPort = currentConfig.smtp_port || 587;
      smtpUser = currentConfig.smtp_user || '';
      imapHost = currentConfig.imap_host || '';
      imapPort = currentConfig.imap_port || 993;
      emailAddress = currentConfig.email_address || '';
    }
  });

  async function handleSubmit(e: Event) {
    e.preventDefault();
    saveError = null;

    if (!emailAddress.trim() || !smtpHost.trim() || !smtpUser.trim()) {
      saveError = 'Bitte füllen Sie alle erforderlichen Felder aus.';
      return;
    }

    if (!currentConfig && !smtpPassword.trim()) {
      saveError = 'Bitte geben Sie ein Kennwort für das Postfach an.';
      return;
    }

    isSaving = true;

    try {
      const payload: MailConfigInput = {
        smtp_host: smtpHost.trim(),
        smtp_port: Number(smtpPort) || 587,
        smtp_user: smtpUser.trim(),
        smtp_password: smtpPassword.trim(),
        imap_host: imapHost.trim(),
        imap_port: Number(imapPort) || 993,
        email_address: emailAddress.trim()
      };

      await onSave(payload);
      onClose();
    } catch (err: any) {
      saveError = err?.message || 'Fehler beim Speichern der Konfiguration.';
    } finally {
      isSaving = false;
    }
  }
</script>

<dialog
  bind:this={dialog}
  class="zero-inner-scroll-modal fixed inset-0 m-auto w-full max-w-xl bg-transparent p-3 sm:p-6 border-none outline-none backdrop:bg-slate-950/70 backdrop:backdrop-blur-xs animate-enter z-50 overflow-visible"
  onclick={(e) => { if (e.target === dialog) onClose(); }}
  oncancel={(e) => { e.preventDefault(); onClose(); }}
>
  <div class="w-full bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col my-auto sm:my-8 overflow-hidden">
    <!-- Header -->
    <div class="p-4 sm:p-5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0">
      <div class="flex items-center gap-2.5">
        <div class="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
          <Settings class="w-5 h-5" />
        </div>
        <div>
          <h2 class="text-base sm:text-lg font-bold text-slate-900 dark:text-white">E-Mail-Postfach konfigurieren</h2>
          <p class="text-xs text-slate-500 dark:text-slate-400">SMTP- und IMAP-Zugangsdaten für den Postversand</p>
        </div>
      </div>
      <button
        type="button"
        onclick={onClose}
        class="min-h-[44px] min-w-[44px] inline-flex items-center justify-center p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        aria-label="Schließen"
      >
        <X class="w-5 h-5" />
      </button>
    </div>

    <!-- Feedback Message -->
    {#if error || saveError}
      <div class="mx-4 sm:mx-6 mt-4 p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300">
        <AlertCircle class="w-4 h-4 shrink-0 mt-0.5" />
        <span>{saveError || error}</span>
      </div>
    {/if}

    <!-- Formular Body -->
    <form onsubmit={handleSubmit} class="p-4 sm:p-6 space-y-4">
      <!-- E-Mail Adresse -->
      <div>
        <label for="cfg-email" class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
          E-Mail-Adresse:
        </label>
        <input
          id="cfg-email"
          type="email"
          bind:value={emailAddress}
          required
          placeholder="beispiel@ihre-domain.de"
          class="w-full min-h-[44px] px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
        />
      </div>

      <!-- SMTP-Server & Port -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div class="sm:col-span-2">
          <label for="cfg-smtp-host" class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Ausgangsserver (SMTP Host):
          </label>
          <input
            id="cfg-smtp-host"
            type="text"
            bind:value={smtpHost}
            required
            placeholder="smtp.ihre-domain.de"
            class="w-full min-h-[44px] px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>
        <div>
          <label for="cfg-smtp-port" class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            SMTP Port:
          </label>
          <input
            id="cfg-smtp-port"
            type="number"
            bind:value={smtpPort}
            required
            placeholder="587"
            class="w-full min-h-[44px] px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>
      </div>

      <!-- IMAP-Server & Port -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div class="sm:col-span-2">
          <label for="cfg-imap-host" class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Eingangsserver (IMAP Host):
          </label>
          <input
            id="cfg-imap-host"
            type="text"
            bind:value={imapHost}
            required
            placeholder="imap.ihre-domain.de"
            class="w-full min-h-[44px] px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>
        <div>
          <label for="cfg-imap-port" class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            IMAP Port:
          </label>
          <input
            id="cfg-imap-port"
            type="number"
            bind:value={imapPort}
            required
            placeholder="993"
            class="w-full min-h-[44px] px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>
      </div>

      <!-- Benutzername & Passwort -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label for="cfg-user" class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Benutzername / Login:
          </label>
          <input
            id="cfg-user"
            type="text"
            bind:value={smtpUser}
            required
            placeholder="login@ihre-domain.de"
            class="w-full min-h-[44px] px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>
        <div>
          <label for="cfg-password" class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Passwort:
          </label>
          <input
            id="cfg-password"
            type="password"
            bind:value={smtpPassword}
            placeholder={currentConfig ? '•••••••••••• (unverändert)' : 'Postfach-Kennwort'}
            class="w-full min-h-[44px] px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>
      </div>

      <!-- Footer Buttons -->
      <div class="pt-4 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-end gap-3 shrink-0">
        <button
          type="button"
          onclick={onClose}
          disabled={isSaving}
          class="min-h-[44px] px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
        >
          Abbrechen
        </button>

        <button
          type="submit"
          disabled={isSaving}
          class="orga-button-primary min-h-[44px] px-6 py-2.5 text-xs font-bold inline-flex items-center gap-2 shadow-sm cursor-pointer active:scale-95 transition-all disabled:opacity-50"
        >
          {#if isSaving}
            <Loader2 class="w-4 h-4 animate-spin" />
            <span>Wird gespeichert...</span>
          {:else}
            <Save class="w-4 h-4 stroke-[2.5]" />
            <span>Konfiguration speichern</span>
          {/if}
        </button>
      </div>
    </form>
  </div>
</dialog>
