<script lang="ts">
  import type { MailConfig } from '$lib/services/mailConfigService.svelte';
  import type { MailConfigInput } from '$lib/services/mailConfigService.svelte';

  interface Props {
    currentConfig: MailConfig | null;
    isLoading: boolean;
    error: string | null;
    onSave: (input: MailConfigInput) => Promise<void>;
    onClose: () => void;
  }

  let { currentConfig, isLoading, error, onSave, onClose } = $props();

  let smtpHost = $state('');
  let smtpPort = $state(587);
  let smtpUser = $state('');
  let smtpPassword = $state(''); // Never show stored password
  let imapHost = $state('');
  let imapPort = $state(993);
  let emailAddress = $state('');
  let saveError = $state<string | null>(null);
  let isSaving = $state(false);

  $effect.pre(() => {
    if (currentConfig) {
      smtpHost = currentConfig.smtp_host || '';
      smtpPort = currentConfig.smtp_port || 587;
      smtpUser = currentConfig.smtp_user || '';
      imapHost = currentConfig.imap_host || '';
      imapPort = currentConfig.imap_port || 993;
      emailAddress = currentConfig.email_address || '';
    }
  });

  async function handleSave() {
    saveError = null;

    // Basic validation
    if (!smtpHost || !smtpUser || !emailAddress || !imapHost) {
      saveError = 'Alle Felder sind erforderlich';
      return;
    }

    if (!smtpPassword && !currentConfig) {
      saveError = 'SMTP-Passwort ist erforderlich';
      return;
    }

    isSaving = true;

    try {
      const payload: any = {
        smtp_host: smtpHost.trim(),
        smtp_port: smtpPort,
        smtp_user: smtpUser.trim(),
        imap_host: imapHost.trim(),
        imap_port: imapPort,
        email_address: emailAddress.trim()
      };
      if (smtpPassword) {
          payload.smtp_password = smtpPassword.trim();
      }
      await onSave(payload);
    } catch (err) {
      saveError = err instanceof Error ? err.message : 'Fehler beim Speichern';
    } finally {
      isSaving = false;
    }
  }
</script>

<!-- Modal backdrop -->
<div
  class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
  onclick={onClose}
  role="button"
  tabindex="0"
  onkeydown={(e) => e.key === 'Escape' && onClose()}
>
  <!-- Modal -->
  <div
    class="bg-white rounded-3xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-hidden flex flex-col relative"
    onclick={(e) => e.stopPropagation()}
    onkeydown={(e) => e.stopPropagation()}
    role="dialog"
    tabindex="-1"
  >
    <!-- Header -->
    <div class="border-b border-neutral-100 p-6 md:p-8 shrink-0 relative">
      <button aria-label="Schließen" onclick={onClose} class="absolute top-6 right-6 w-10 h-10 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-full flex items-center justify-center transition-colors z-10"><svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
      <div class="flex items-center gap-3">
        <span class="text-2xl">🔒</span>
        <h2 class="text-2xl font-bold text-neutral-900">E-Mail Server-Settings</h2>
      </div>
      <p class="text-sm text-neutral-500 mt-2 pr-8">
        Konfigurieren Sie die zentralen SMTP/IMAP-Server. Die Zugangsdaten gelten firmenweit.
      </p>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8">
      {#if error || saveError}
        <div class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
          <span class="text-xl shrink-0 mt-0.5">⚠️</span>
          <p class="text-sm font-bold text-red-800">{error || saveError}</p>
        </div>
      {/if}

      <div class="space-y-5">
        <!-- Email Address -->
        <div>
          <label for="email" class="block text-sm font-semibold text-neutral-700 mb-1.5">
            E-Mail-Adresse *
          </label>
          <input
            id="email"
            type="email"
            bind:value={emailAddress}
            placeholder="deine.mail@ionos.com"
            disabled={isSaving}
            class="orga-input-clear w-full"
          />
        </div>

        <!-- SMTP Section -->
        <div class="pt-6 border-t border-neutral-100">
          <h3 class="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-4">SMTP (E-Mails versenden)</h3>

          <div class="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label for="smtpHost" class="block text-sm font-semibold text-neutral-700 mb-1.5">
                Host *
              </label>
              <input
                id="smtpHost"
                type="text"
                bind:value={smtpHost}
                placeholder="smtp.ionos.de"
                disabled={isSaving}
                class="orga-input-clear w-full"
              />
            </div>

            <div>
              <label for="smtpPort" class="block text-sm font-semibold text-neutral-700 mb-1.5">
                Port *
              </label>
              <input
                id="smtpPort"
                type="number"
                bind:value={smtpPort}
                disabled={isSaving}
                class="orga-input-clear w-full"
              />
            </div>
          </div>

          <div>
            <label for="smtpUser" class="block text-sm font-semibold text-neutral-700 mb-1.5">
              Benutzer *
            </label>
            <input
              id="smtpUser"
              type="text"
              bind:value={smtpUser}
              placeholder="deine.mail@ionos.com"
              disabled={isSaving}
              class="orga-input-clear w-full mb-4"
            />
          </div>

          <div>
            <label for="smtpPassword" class="block text-sm font-semibold text-neutral-700 mb-1.5">
              Passwort (Zentral) {currentConfig ? '(leer = behalten)' : '*'}
            </label>
            <input
              id="smtpPassword"
              type="password"
              bind:value={smtpPassword}
              placeholder="Passwort eingeben"
              disabled={isSaving}
              class="orga-input-clear w-full"
            />
            <p class="text-xs text-neutral-400 mt-1">Wird verschlüsselt gespeichert</p>
          </div>
        </div>

        <!-- IMAP Section -->
        <div class="pt-6 border-t border-neutral-100">
          <h3 class="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-4">IMAP (E-Mails abrufen)</h3>

          <div class="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label for="imapHost" class="block text-sm font-semibold text-neutral-700 mb-1.5">
                Host *
              </label>
              <input
                id="imapHost"
                type="text"
                bind:value={imapHost}
                placeholder="imap.ionos.de"
                disabled={isSaving}
                class="orga-input-clear w-full"
              />
            </div>

            <div>
              <label for="imapPort" class="block text-sm font-semibold text-neutral-700 mb-1.5">
                Port *
              </label>
              <input
                id="imapPort"
                type="number"
                bind:value={imapPort}
                disabled={isSaving}
                class="orga-input-clear w-full"
              />
            </div>
          </div>
        </div>

        <!-- Ionos defaults hint -->
        <div class="p-4 bg-indigo-50 border border-indigo-200 rounded-xl">
          <p class="text-sm font-bold text-indigo-900 mb-2">Ionos Standard-Einstellungen:</p>
          <ul class="text-xs font-medium text-indigo-800 space-y-1">
            <li>• SMTP: smtp.ionos.de:587 (TLS)</li>
            <li>• IMAP: imap.ionos.de:993 (SSL)</li>
            <li>• Benutzer: Deine E-Mail-Adresse</li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="border-t border-neutral-100 p-6 md:p-8 bg-neutral-50/50 flex flex-col-reverse sm:flex-row gap-3 shrink-0 justify-end">
      <button
        onclick={onClose}
        disabled={isSaving || isLoading}
        class="orga-button-ghost w-full sm:w-auto"
      >
        Abbrechen
      </button>
      <button
        onclick={handleSave}
        disabled={isSaving || isLoading}
        class="orga-button-primary w-full sm:w-auto shadow-indigo-600/20"
      >
        {isSaving || isLoading ? 'Wird gespeichert...' : 'Speichern'}
      </button>
    </div>
  </div>
</div>
