<script lang="ts">
  import type { MailConfig } from '$lib/services/mailConfigServiceStore';
  import type { MailConfigInput } from '$lib/services/mailConfigServiceStore';
  import { slide } from 'svelte/transition';
  import { Lock, X, AlertTriangle, Save, Loader2 } from 'lucide-svelte';

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
  class="fixed inset-0 h-dvh bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-0 sm:p-4"
  onclick={onClose}
  role="button"
  tabindex="0"
  onkeydown={(e) => e.key === 'Escape' && onClose()}
>
  <!-- Modal -->
  <div
    class="bg-white sm:rounded-3xl shadow-2xl max-w-xl w-full h-full sm:h-auto sm:max-h-[90%] overflow-hidden flex flex-col relative border border-neutral-100"
    onclick={(e) => e.stopPropagation()}
    onkeydown={(e) => e.stopPropagation()}
    role="dialog"
    tabindex="-1"
  >
    <!-- Header -->
    <div class="border-b border-neutral-100 p-6 md:p-8 shrink-0 relative">
      <button aria-label="Schließen" onclick={onClose} class="absolute top-6 right-6 w-12 h-12 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-full flex items-center justify-center transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-neutral-500 focus-visible:outline-none z-10">
        <X class="w-5 h-5" />
      </button>
      <div class="flex items-center gap-3">
        <div class="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shadow-inner shrink-0">
          <Lock class="w-6 h-6" />
        </div>
        <h2 class="text-xl sm:text-2xl font-black text-neutral-900">E-Mail Server-Settings</h2>
      </div>
      <p class="text-sm text-neutral-500 font-medium mt-3 pr-8 leading-relaxed">
        Konfigurieren Sie die zentralen SMTP/IMAP-Server. Die Zugangsdaten gelten firmenweit.
      </p>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8 bg-neutral-50/30">
      {#if error || saveError}
        <div transition:slide class="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl flex gap-3 shadow-sm">
          <AlertTriangle class="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <p class="text-sm font-bold text-rose-800">{error || saveError}</p>
        </div>
      {/if}

      <div class="space-y-5">
        <!-- Email Address -->
        <div>
          <label for="email" class="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">
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
          <h3 class="text-[11px] font-black text-brand-600 bg-brand-50 border border-brand-100 px-3 py-1.5 rounded-lg inline-block uppercase tracking-widest mb-4">SMTP (E-Mails versenden)</h3>

          <div class="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label for="smtpHost" class="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">
                Host *
              </label>
              <input
                id="smtpHost"
                type="text"
                bind:value={smtpHost}
                placeholder="smtp.ionos.de"
                disabled={isSaving}
                class="orga-input-clear w-full min-h-12"
              />
            </div>

            <div>
              <label for="smtpPort" class="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">
                Port *
              </label>
              <input
                id="smtpPort"
                type="number"
                bind:value={smtpPort}
                disabled={isSaving}
                class="orga-input-clear w-full min-h-12"
              />
            </div>
          </div>

          <div>
            <label for="smtpUser" class="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">
              Benutzer *
            </label>
            <input
              id="smtpUser"
              type="text"
              bind:value={smtpUser}
              placeholder="deine.mail@ionos.com"
              disabled={isSaving}
              class="orga-input-clear w-full mb-4 min-h-12"
            />
          </div>

          <div>
            <label for="smtpPassword" class="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">
              Passwort (Zentral) {currentConfig ? '(leer = behalten)' : '*'}
            </label>
            <input
              id="smtpPassword"
              type="password"
              bind:value={smtpPassword}
              placeholder="Passwort eingeben"
              disabled={isSaving}
              class="orga-input-clear w-full min-h-12"
            />
            <p class="text-[10px] font-medium text-neutral-400 mt-1.5 flex items-center gap-1"><Lock class="w-3 h-3" /> Wird verschlüsselt gespeichert</p>
          </div>
        </div>

        <!-- IMAP Section -->
        <div class="pt-6 border-t border-neutral-100">
          <h3 class="text-[11px] font-black text-brand-600 bg-brand-50 border border-brand-100 px-3 py-1.5 rounded-lg inline-block uppercase tracking-widest mb-4">IMAP (E-Mails abrufen)</h3>

          <div class="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label for="imapHost" class="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">
                Host *
              </label>
              <input
                id="imapHost"
                type="text"
                bind:value={imapHost}
                placeholder="imap.ionos.de"
                disabled={isSaving}
                class="orga-input-clear w-full min-h-12"
              />
            </div>

            <div>
              <label for="imapPort" class="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">
                Port *
              </label>
              <input
                id="imapPort"
                type="number"
                bind:value={imapPort}
                disabled={isSaving}
                class="orga-input-clear w-full min-h-12"
              />
            </div>
          </div>
        </div>

        <!-- Ionos defaults hint -->
        <div class="p-5 bg-brand-50 border border-brand-200 rounded-2xl shadow-inner">
          <p class="text-sm font-black text-brand-900 mb-3 flex items-center gap-2"><AlertTriangle class="w-4 h-4 text-brand-600" /> Ionos Standard-Einstellungen:</p>
          <ul class="text-sm font-medium text-brand-800 space-y-2">
            <li>• SMTP: smtp.ionos.de:587 (TLS)</li>
            <li>• IMAP: imap.ionos.de:993 (SSL)</li>
            <li>• Benutzer: Deine E-Mail-Adresse</li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="border-t border-neutral-100 p-4 sm:p-6 bg-white/95 backdrop-blur-md flex flex-col sm:flex-row gap-3 sm:gap-4 shrink-0 justify-end sticky bottom-0 z-20 pb-[max(env(safe-area-inset-bottom,0px),1rem)]">
      <button
        onclick={onClose}
        aria-label="Abbrechen"
        disabled={isSaving || isLoading}
        class="orga-button-ghost flex-1 sm:flex-none min-h-14 px-8"
      >
        Abbrechen
      </button>
      <button
        onclick={handleSave}
        aria-label="Einstellungen speichern"
        disabled={isSaving || isLoading}
        class="orga-button-primary shadow-brand-600/20 flex-1 sm:flex-none min-h-14 px-10"
      >
        {#if isSaving || isLoading}
          <Loader2 class="w-5 h-5 animate-spin" />
        {:else}
          <Save class="w-5 h-5" />
        {/if}
        {isSaving || isLoading ? 'Speichert...' : 'Speichern'}
      </button>
    </div>
  </div>
</div>
